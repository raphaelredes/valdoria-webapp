/* === simuladores/cartografia-shared.js (Fase 7.3 - 2026-04-30) =====
   Pencil/hand-drawn map drawing functions used by both cidade.html and
   exploracao.html cartografia. Single source of truth - change here,
   both simuladores reflect.

   Exports via window.CartShared namespace:
     - INK_DARK, INK_MED, INK_LIGHT, INK_FAINT, PAPER_BG, PAPER_DARK
     - SEA_INK, SEA_FAINT
     - CART_BIOMES, CART_PATHS (data - 9 biomes + 11 paths)
     - _cartSeedRand (seeded random)
     - _hatchArea, _wavyLine (helpers)
     - _drawBiomeArt(ctx, b, w, h) (9 pictogramas pencil)
     - _drawCartPath(ctx, fromKey, toKey, w, h, biomes)
     - _drawCartNode(ctx, b, w, h, isHover)
     - _drawPlayerPin(ctx, b, w, h)
     - _drawCartCompass(ctx, w, h) (top-right rose)
     - _drawParchmentBase(ctx, w, h) (optional)
   ============================================================== */
(function(){
  "use strict";

  // === Pencil-style ink palette ===
  var INK_DARK   = '#3a2410';
  var INK_MED    = '#5a3e10';
  var INK_LIGHT  = '#8a6420';
  var INK_FAINT  = 'rgba(80,50,20,0.30)';
  var PAPER_BG   = '#e6c890';
  var PAPER_DARK = '#c4a060';
  var SEA_INK    = '#4a6080';
  var SEA_FAINT  = 'rgba(74,96,128,0.45)';

  // === CART_BIOMES ===
  // 2026-05-04: REWRITE BASEADO em src/game/world/map_data.py (WORLD_MAP).
  // 19 locais oficiais + sistema de descoberta progressiva. Posições
  // orgânicas (NUNCA alinhadas) inspiradas no antigo mapa do mundo.
  // 'biome' alinha com pictograma; 'discoverable' = só visível após
  // settlement_discovery; 'mapKey' = item Mapa Regional que revela.
  var CART_BIOMES = [
    // ═══════════════════════════════════════════════════════════════
    // POSIÇÕES v11 (2026-06-21, user "nunca deixe hexágonos de 2+ mapas juntos") —
    // re-espalhados com SEPARAÇÃO MÍNIMA 0.141 (≥0.125), espalhados topo↔baixo, sem
    // nenhum par de ícones encostando. Preflight check_cartografia_node_spacing trava
    // regressão. NOTA: o override DEV (map_locations_coords.json) VENCE estes defaults
    // — manter os dois espelhados (foi atualizado junto). v10 (2026-05-05): min 0.15.
    // Layout radial em torno do hub central, com regiões geográficas:
    //   HUB: plains (0.42, 0.55)
    //   ─── NORTE ───────  forest, goblin_nest, elven_ruins, snow
    //   ─── NW ──────────  mountain, dragon_pass, korthag
    //   ─── W ───────────  cave, troll_cave, crystal_depths, underground_caverns
    //   ─── SW ──────────  green_fields, ancestral_graveyard
    //   ─── S ───────────  graveyard
    //   ─── SE ──────────  orc_tribe, bandit_fortress
    //   ─── E ───────────  swamp, deep_swamp, desert, volcanic, valkrest
    // ═══════════════════════════════════════════════════════════════
    // ─── HUB CENTRAL (origem) ─────────────────────
    { key: 'plains',    name: 'Portões de Valdoria',     x: 0.50, y: 0.55, biome: 'plains',    tier: 0, ico: '', isOrigin: true, isSanctuary: true,
      mapKey: null,
      desc: 'Os grandes portões da cidade. Aldric vigia a entrada. Ponto de partida de toda jornada. Refúgio seguro com muralhas consagradas.' },
    // ─── PLAINS interior (Sudoeste/Sudeste) ──────
    { key: 'green_fields',   name: 'Campos Verdes',       x: 0.36, y: 0.46, biome: 'plains',  tier: 1, ico: '',
      mapKey: 'Mapa das Planícies',
      desc: 'Vastas planícies onde o vento sopra livre. Lar de coelhos... e bandidos.' },
    { key: 'orc_tribe',      name: 'Acampamento Orc',     x: 0.64, y: 0.58, biome: 'plains',  tier: 3, ico: '',
      mapKey: 'Mapa das Planícies',
      desc: 'Tendas de couro grosseiro e fogueiras. Tambores de guerra ecoam.' },
    { key: 'bandit_fortress', name: 'Forte dos Bandidos', x: 0.50, y: 0.68, biome: 'plains',  tier: 5, ico: '',
      mapKey: 'Mapa das Planícies',
      desc: 'Fortaleza improvisada de madeira e pedra. Base de saqueadores.' },
    // ─── FOREST (Norte) ───────────────────────────
    { key: 'forest',    name: 'Floresta dos Sussurros',  x: 0.48, y: 0.35, biome: 'forest',   tier: 2, ico: '',
      mapKey: 'Mapa da Floresta',
      desc: 'Árvores antigas que bloqueiam a luz do sol. Sombras com vida.' },
    { key: 'goblin_nest',     name: 'Ninho de Goblins',  x: 0.36, y: 0.22, biome: 'forest',   tier: 2, ico: '',
      mapKey: 'Mapa da Floresta',
      desc: 'Clareira cheia de armadilhas e lixo. O cheiro é terrível.' },
    { key: 'elven_ruins',     name: 'Ruínas Élficas',    x: 0.50, y: 0.20, biome: 'forest',   tier: 4, ico: '', isSanctuary: true,
      mapKey: 'Mapa da Floresta',
      desc: 'Restos de uma antiga civilização élfica. A magia ainda pulsa em santuário protegido por círculos rúnicos.' },
    // ─── CAVE / UNDERGROUND (Oeste) ──────────────
    { key: 'cave',      name: 'Passagem Subterrânea',    x: 0.22, y: 0.45, biome: 'cave',     tier: 3, ico: '',
      mapKey: 'Mapa das Montanhas',
      desc: 'Túnel escuro sob as colinas. Ecos estranhos das profundezas.' },
    { key: 'troll_cave', name: 'Caverna do Troll',       x: 0.08, y: 0.47, biome: 'cave',     tier: 5, ico: '',
      mapKey: 'Mapa das Montanhas',
      desc: 'Abertura escura na rocha. Ossos enormes na entrada.' },
    // ─── SWAMP (Leste) ───────────────────────────
    { key: 'swamp',     name: 'Pântano Nebuloso',         x: 0.74, y: 0.46, biome: 'swamp',   tier: 3, ico: '',
      mapKey: 'Mapa do Pântano',
      desc: 'Águas paradas e névoa eterna. Cuidado onde pisa.' },
    { key: 'deep_swamp', name: 'Pântano Profundo',        x: 0.89, y: 0.40, biome: 'swamp',   tier: 5, ico: '',
      mapKey: 'Mapa do Pântano',
      desc: 'Águas negras e árvores mortas. Criaturas anciãs espreitam.' },
    // ─── MOUNTAIN (Noroeste) ──────────────────────
    { key: 'mountain',  name: 'Picos de Pedra',           x: 0.22, y: 0.32, biome: 'mountain', tier: 4, ico: '',
      mapKey: 'Mapa das Montanhas',
      desc: 'Montanhas íngremes e vento cortante. Harpias fazem ninhos.' },
    { key: 'dragon_pass', name: 'Passo do Dragão',        x: 0.24, y: 0.12, biome: 'mountain', tier: 6, ico: '',
      mapKey: 'Mapa das Montanhas',
      desc: 'Passagem estreita entre picos vulcânicos. Fumaça sobe do vale.' },
    { key: 'korthag',   name: 'Korthag (Vila Mineira)',   x: 0.12, y: 0.22, biome: 'mountain', tier: 3, ico: '', settlement: true, discoverable: true, isSanctuary: true,
      mapKey: null,
      desc: 'Vila mineradora encravada nos picos. Fornalhas ardem dia e noite em cidadela segura.' },
    // ─── DESERT (Sudeste) ─────────────────────────
    { key: 'desert',    name: 'Deserto Dourado',          x: 0.38, y: 0.78, biome: 'desert',   tier: 4, ico: '',
      mapKey: 'Mapa do Deserto',
      desc: 'Dunas sem fim sob um sol impiedoso. Água vale mais que ouro.' },
    // ─── GRAVEYARD (Sul) ──────────────────────────
    { key: 'graveyard', name: 'Cemitério Antigo',         x: 0.56, y: 0.86, biome: 'graveyard', tier: 3, ico: '',
      mapKey: 'Mapa do Pântano',
      desc: 'Lápides cobertas de musgo. Mortos não descansam em paz.' },
    { key: 'ancestral_graveyard', name: 'Cemitério Ancestral', x: 0.24, y: 0.86, biome: 'graveyard', tier: 5, ico: '',
      mapKey: 'Mapa do Pântano',
      desc: 'Mausoléus antigos da aristocracia esquecida. Magia necromântica residual.' },
    // ─── UNDERGROUND DEEP (Oeste profundo) ───────
    { key: 'underground_caverns', name: 'Cavernas Subterrâneas', x: 0.22, y: 0.58, biome: 'cave', tier: 5, ico: '',
      mapKey: 'Mapa das Montanhas',
      desc: 'Sistema de túneis profundos. Pedra esculpida pelo tempo.' },
    { key: 'crystal_depths', name: 'Profundezas de Cristal', x: 0.08, y: 0.61, biome: 'cave', tier: 7, ico: '', isSanctuary: true,
      mapKey: 'Mapa das Montanhas',
      desc: 'Cavernas iluminadas por cristais luminescentes. Magia ancestral pulsa em refúgio protegido.' },
    // ─── SNOW (Norte distante) ────────────────────
    { key: 'snow',      name: 'Ermo Congelado',           x: 0.66, y: 0.10, biome: 'snow',     tier: 5, ico: '',
      mapKey: 'Mapa do Ermo Gelado',
      desc: 'Tudo é branco e mortal. O frio penetra até a alma.' },
    // ─── VOLCANIC (Leste extremo) ─────────────────
    { key: 'volcanic',  name: 'Cratera Vulcânica',        x: 0.80, y: 0.64, biome: 'volcanic', tier: 8, ico: '',
      mapKey: 'Mapa Vulcânico',
      desc: 'Rios de lava e cinzas. O calor derrete metal. Lar de dragões?' },
    { key: 'valkrest',  name: 'Valkrest (Acampamento)',   x: 0.92, y: 0.70, biome: 'volcanic', tier: 5, ico: '', settlement: true, discoverable: true, isSanctuary: true,
      mapKey: null,
      desc: 'Acampamento fortificado de aventureiros veteranos com defesas sólidas e refúgio seguro.' },
    // ─── 6 NOVOS BIOMAS (WORLD-1) ─────────────────
    // COAST (Leste/Sudeste)
    { key: 'salty_coast', name: 'Costa Salgada', x: 0.90, y: 0.54, biome: 'coast', tier: 4, ico: '',
      mapKey: 'Mapa da Costa',
      desc: 'Penhascos fustigados por ondas impiedosas, cavernas de maré e destroços de embarcações naufragadas. O sal impregna a brisa marinha.' },
    // DARK MOUNTAIN (Noroeste profundo)
    { key: 'black_peaks', name: 'Montanhas Negras', x: 0.05, y: 0.33, biome: 'dark_mountain', tier: 6, ico: '',
      mapKey: 'Mapa das Montanhas',
      desc: 'Picos escarpados de rocha obsidiana e ardósia escura. O ar é pesado com enxofre antigo e as gargantas vertiginosas ecoam ventos uivantes.' },
    // ELDRITCH SWAMP (Leste profundo)
    { key: 'eldritch_mire', name: 'Pântano Eldritch', x: 0.76, y: 0.30, biome: 'eldritch_swamp', tier: 7, ico: '',
      mapKey: 'Mapa do Pântano',
      desc: 'Águas lodosas tingidas de fosforescência púrpura e árvores retorcidas cujas raízes sangram seiva espessa. Entidades ancestrais sussurram na névoa.' },
    // BADLANDS (Sudeste árido)
    { key: 'ashen_badlands', name: 'Terras Devastadas', x: 0.76, y: 0.78, biome: 'badlands', tier: 5, ico: '',
      mapKey: 'Mapa das Planícies',
      desc: 'Cânions profundos e platôs ressequidos de terra vermelha rachada. Nenhuma árvore sobrevive aqui, apenas carcaças de monstros e poeira sufocante.' },
    // ANCIENT FOREST (Norte ancestral)
    { key: 'elder_woods', name: 'Bosque Ancestral', x: 0.64, y: 0.25, biome: 'ancient_forest', tier: 5, ico: '',
      mapKey: 'Mapa da Floresta',
      desc: 'Árvores titânicas cujos troncos abraçam ruínas milenares anteriores à fundação de Valdória. A magia primordial vibra em cada folha prateada.' },
    // FROZEN ABYSS (Norte extremo)
    { key: 'glacial_rift', name: 'Abismo Glacial', x: 0.44, y: 0.07, biome: 'frozen_abyss', tier: 8, ico: '',
      mapKey: 'Mapa do Ermo Gelado',
      desc: 'Uma imensa fenda de gelo azul eterno onde o frio congela o sangue em instantes. Ecos de feras colossais presas nas profundezas ressoam pelas geleiras.' }
  ];

  // === CART_PATHS ===
  // 2026-05-04: BASEADO em WORLD_MAP.connections (map_data.py).
  // Trajetos NUNCA retos — _drawCartPath usa Bezier curvada.
  var CART_PATHS = [
    // Hub
    ['plains', 'green_fields'], ['plains', 'forest'], ['plains', 'swamp'],
    ['plains', 'desert'], ['plains', 'cave'],
    // Plains internas
    ['green_fields', 'orc_tribe'], ['green_fields', 'mountain'],
    ['green_fields', 'bandit_fortress'], ['bandit_fortress', 'desert'],
    // Forest
    ['forest', 'goblin_nest'], ['forest', 'elven_ruins'], ['forest', 'snow'],
    ['elven_ruins', 'snow'],
    // Cave
    ['cave', 'graveyard'], ['cave', 'korthag'],
    // Graveyard / Swamp
    ['graveyard', 'swamp'], ['swamp', 'deep_swamp'], ['deep_swamp', 'volcanic'],
    // Mountain
    ['mountain', 'troll_cave'], ['mountain', 'snow'],
    ['mountain', 'dragon_pass'], ['mountain', 'korthag'],
    ['dragon_pass', 'volcanic'], ['dragon_pass', 'valkrest'],
    // Volcanic
    ['desert', 'volcanic'], ['volcanic', 'valkrest'],
    // 2026-05-04 — locais canonical adicionais (FIXED_MAPS):
    ['graveyard', 'ancestral_graveyard'],     // Cemitério Antigo → Ancestral
    ['ancestral_graveyard', 'deep_swamp'],    // ancestral conecta a deep_swamp
    ['cave', 'underground_caverns'],          // Passagem → Cavernas Subterrâneas
    ['underground_caverns', 'crystal_depths'], // Cavernas → Profundezas de Cristal
    ['crystal_depths', 'mountain'],           // Profundezas → Picos (passagem alta)
    // ── Rotas dos 6 novos biomas (WORLD-1) ──
    ['desert', 'salty_coast'],
    ['volcanic', 'salty_coast'],
    ['ashen_badlands', 'salty_coast'],
    ['mountain', 'black_peaks'],
    ['korthag', 'black_peaks'],
    ['troll_cave', 'black_peaks'],
    ['deep_swamp', 'eldritch_mire'],
    ['valkrest', 'eldritch_mire'],
    ['bandit_fortress', 'ashen_badlands'],
    ['desert', 'ashen_badlands'],
    ['volcanic', 'ashen_badlands'],
    ['elven_ruins', 'elder_woods'],
    ['snow', 'elder_woods'],
    ['snow', 'glacial_rift'],
    ['elder_woods', 'glacial_rift']
  ];

  // === _cartSeedRand ===
  function _cartSeedRand(seed){
    var s = seed;
    return function(){
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  // === _hatchArea ===
  function _hatchArea(ctx, x, y, w, h, angle, spacing, color, lineW){
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = color || INK_FAINT;
    ctx.lineWidth = lineW || 0.6;
    ctx.translate(x + w/2, y + h/2);
    ctx.rotate(angle || 0);
    var diag = Math.sqrt(w*w + h*h);
    for (var i = -diag/2; i <= diag/2; i += spacing) {
      ctx.beginPath();
      ctx.moveTo(i, -diag/2);
      ctx.lineTo(i, diag/2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // === _wavyLine ===
  function _wavyLine(ctx, points, jitter, seed){
    if (points.length < 2) return;
    var rng = _cartSeedRand(seed || 1);
    ctx.beginPath();
    ctx.moveTo(points[0][0] + (rng()-0.5)*jitter, points[0][1] + (rng()-0.5)*jitter);
    for (var i = 1; i < points.length; i++) {
      var p = points[i];
      var prev = points[i-1];
      var midX = (prev[0] + p[0]) / 2 + (rng()-0.5)*jitter;
      var midY = (prev[1] + p[1]) / 2 + (rng()-0.5)*jitter;
      ctx.quadraticCurveTo(midX, midY, p[0] + (rng()-0.5)*jitter, p[1] + (rng()-0.5)*jitter);
    }
  }

  // === _drawOrganicBlob ===
  // Mancha orgânica baseada em pétalas Bezier (NÃO círculo perfeito).
  // 6-9 pontos de borda com raio variável + curvas suaves entre eles.
  // Usado pra manchas de água, café, vinho, oxidação — formas naturais.
  function _drawOrganicBlob(ctx, cx, cy, baseRadius, color, alpha, seed){
    var rng = _cartSeedRand(seed || (cx * 1000 + cy));
    var nPts = 6 + Math.floor(rng() * 4);
    var angles = [];
    for (var i = 0; i < nPts; i++) {
      angles.push((i / nPts) * Math.PI * 2 + (rng() - 0.5) * 0.5);
    }
    var pts = angles.map(function(a){
      var r = baseRadius * (0.65 + rng() * 0.7);
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    });
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var k = 0; k < pts.length; k++) {
      var p = pts[k];
      var pn = pts[(k + 1) % pts.length];
      var mx = (p[0] + pn[0]) / 2 + (rng() - 0.5) * baseRadius * 0.18;
      var my = (p[1] + pn[1]) / 2 + (rng() - 0.5) * baseRadius * 0.18;
      ctx.quadraticCurveTo(p[0], p[1], mx, my);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return rng;
  }

  // === _drawAgedStain ===
  // Mancha envelhecida MULTI-CAMADA (água, café, vinho).
  // 1) Halo difuso grande (fade out)
  // 2) Blob orgânico médio (corpo da mancha)
  // 3) Anel de capilaridade escuro (coffee-ring effect — borda mais escura)
  // 4) Salpicos pequenos ao redor (3-6 micro-blobs)
  function _drawAgedStain(ctx, cx, cy, size, baseColor, edgeColor, seed){
    var rng = _cartSeedRand(seed || (cx + cy * 13));
    // Performance tier guard: lite usa flat blob (skip halo/ring gradients)
    var _renderDetail = (window._renderDetail !== undefined) ? window._renderDetail : 2;
    if (_renderDetail < 1) {
      ctx.save();
      ctx.fillStyle = baseColor;
      ctx.globalAlpha = 0.1;
      ctx.beginPath();
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    // 1) Halo gradient suave (fade) — 2026-05-04 v3: alpha 0.05-0.09 (mt sutil)
    // (_renderDetail >= 1 garantido pelo early-return acima — marker pra preflight)
    var halo = (_renderDetail >= 1) ? ctx.createRadialGradient(cx, cy, size * 0.3, cx, cy, size * 1.3) : null;
    if (!halo) return;
    halo.addColorStop(0, baseColor);
    halo.addColorStop(0.6, baseColor);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.fillStyle = halo;
    ctx.globalAlpha = 0.05 + rng() * 0.04;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 2) Blob orgânico (corpo) — 2026-05-04 v3: alpha 0.08-0.13 (suave)
    _drawOrganicBlob(ctx, cx, cy, size * 0.85, baseColor, 0.08 + rng() * 0.05, seed);
    // 3) Coffee-ring: borda de capilaridade — 2026-05-04 v3: alpha 0.35 → 0.18
    var ringInner = size * 0.7, ringOuter = size * 0.92;
    // (_renderDetail >= 1 garantido pelo early-return — marker pra preflight)
    var ring = (_renderDetail >= 1) ? ctx.createRadialGradient(cx, cy, ringInner, cx, cy, ringOuter) : null;
    if (!ring) return;
    ring.addColorStop(0, 'rgba(0,0,0,0)');
    ring.addColorStop(0.5, edgeColor);
    ring.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.fillStyle = ring;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(cx, cy, ringOuter, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 4) Salpicos pequenos — 2026-05-04 v3: alpha 0.10-0.20 (mais discretos)
    var nSplats = 2 + Math.floor(rng() * 3);
    for (var s = 0; s < nSplats; s++) {
      var ang = rng() * Math.PI * 2;
      var dist = size * (1.0 + rng() * 0.6);
      var sx = cx + Math.cos(ang) * dist;
      var sy = cy + Math.sin(ang) * dist;
      var ssz = 0.8 + rng() * (size * 0.06);
      _drawOrganicBlob(ctx, sx, sy, ssz, baseColor, 0.10 + rng() * 0.10, seed + s * 7);
    }
  }

  // === _drawCrease ===
  // Dobra/vinco no papel — linha hesitante com sombra adjacente
  function _drawCrease(ctx, x1, y1, x2, y2, seed){
    var rng = _cartSeedRand(seed || 1);
    ctx.save();
    // Linha principal da dobra (hesitante)
    ctx.strokeStyle = 'rgba(80,50,20,0.16)';
    ctx.lineWidth = 0.6;
    var steps = Math.max(20, Math.round(Math.hypot(x2 - x1, y2 - y1) / 8));
    ctx.beginPath();
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var x = x1 + (x2 - x1) * t + (rng() - 0.5) * 1.2;
      var y = y1 + (y2 - y1) * t + (rng() - 0.5) * 1.2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Sombra paralela (capilaridade da dobra)
    ctx.strokeStyle = 'rgba(60,40,12,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    var dx = (x2 - x1) / steps, dy = (y2 - y1) / steps;
    var nx = -dy / Math.hypot(dx, dy), ny = dx / Math.hypot(dx, dy);
    for (var j = 0; j <= steps; j++) {
      var t2 = j / steps;
      var px = x1 + (x2 - x1) * t2 + nx * 1.5 + (rng() - 0.5) * 1.2;
      var py = y1 + (y2 - y1) * t2 + ny * 1.5 + (rng() - 0.5) * 1.2;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  // === _drawScorchedEdge ===
  // Borda chamuscada — gradient escuro + chamas irregulares no contorno
  function _drawScorchedEdge(ctx, w, h, intensity){
    intensity = intensity || 0.42;
    // Performance tier guard: lite usa overlay flat escuro (skip radial gradient)
    var _renderDetail = (window._renderDetail !== undefined) ? window._renderDetail : 2;
    if (_renderDetail < 1) {
      ctx.save();
      ctx.fillStyle = 'rgba(40,20,10,' + (intensity * 0.5) + ')';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      return;
    }
    // 1) Gradient radial nas bordas
    var grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.min(w, h) * 0.85);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.7, 'rgba(40,20,10,' + (intensity * 0.4) + ')');
    grad.addColorStop(1, 'rgba(40,20,10,' + intensity + ')');
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    // 2) Chamuscado irregular nos cantos (4 manchas escuras orgânicas)
    var corners = [[0, 0], [w, 0], [0, h], [w, h]];
    corners.forEach(function(c, i){
      var seed = 100 + i * 7;
      var rng = _cartSeedRand(seed);
      var size = 30 + rng() * 25;
      _drawOrganicBlob(ctx, c[0], c[1], size, 'rgba(28,14,6,0.5)', 0.55, seed);
    });
  }

  // User sessão #69: mapa-múndi medieval desenhado à mão (WebP gerado via OpenAI
  // low) como BASE da cartografia — o mapa procedural anterior era "tosco". Preload
  // no init; desenhado em _drawWorldMapBg quando pronto. Os marcadores/caminhos dos
  // biomas + ícones OpenAI dos locais continuam desenhados POR CIMA.
  //
  // 2026-06-03 (sessão #72 — fix mapa stale): o mapa do JOGO (cidade "Partir para
  // aventura") agora renderiza o MESMO mapa do editor (/exploracao/map-editor):
  // world-map.webp como fundo do canvas + ícones de local (OpenAI) nas coords
  // salvas (/api/exploracao/map-coords). _onWorldMapLoad permite o consumer
  // invalidar a base-cache + redraw quando a imagem chega assíncrona.
    var _cartWorldMap = null;
  var _cartWorldMapCbs = [];
  (function(){
    var url = '/shared/img/map/world-map.webp?v=20261023_v4';
    function _onSuccess(im) {
      _cartWorldMap = im;
      var cbs = _cartWorldMapCbs; _cartWorldMapCbs = [];
      cbs.forEach(function(cb){ try { cb(); } catch(_){} });
    }
    function _onError() {
      if (url.indexOf('../shared/') === -1 && url.indexOf('/shared/') !== -1) {
        var relUrl = url.replace('/shared/', '../shared/');
        var fallbackIm = new Image();
        fallbackIm.onload = function(){ _onSuccess(fallbackIm); };
        fallbackIm.onerror = function(){ _cartWorldMap = null; };
        fallbackIm.src = relUrl;
      } else {
        _cartWorldMap = null;
      }
    }
    function _plainLoad(targetUrl) {
      var im = new Image();
      im.onload = function(){ _onSuccess(im); };
      im.onerror = _onError;
      im.src = targetUrl;
    }

    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        caches.open('valdoria-cartography-v2').then(function(cache){
          return cache.match(url).then(function(match){
            if (match) {
              return match.blob().then(function(blob){
                var blobUrl = URL.createObjectURL(blob);
                var im = new Image();
                im.onload = function(){ _onSuccess(im); };
                im.onerror = function(){ _plainLoad(url); };
                im.src = blobUrl;
              });
            } else {
              return fetch(url, { cache: 'force-cache' }).then(function(resp){
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                try { cache.put(url, resp.clone()); } catch(_){}
                return resp.blob();
              }).then(function(blob){
                var blobUrl = URL.createObjectURL(blob);
                var im = new Image();
                im.onload = function(){ _onSuccess(im); };
                im.onerror = function(){ _plainLoad(url); };
                im.src = blobUrl;
              });
            }
          });
        }).catch(function(){ _plainLoad(url); });
      } else {
        _plainLoad(url);
      }
    } catch(_e){ _plainLoad(url); }
  })();

  // === worldMapReady / _onWorldMapLoad ===
  // worldMapReady() → true quando a imagem do mapa carregou (segura pra blit).
  // _onWorldMapLoad(cb) → chama cb agora se já pronto, senão enfileira pra quando
  // carregar (consumer usa pra invalidar cache + redraw). Idempotente.
  function worldMapReady(){
    return !!(_cartWorldMap && _cartWorldMap.complete && _cartWorldMap.naturalWidth);
  }
  function _onWorldMapLoad(cb){
    if (typeof cb !== 'function') return;
    if (worldMapReady()) { try { cb(); } catch(_){} return; }
    _cartWorldMapCbs.push(cb);
  }

  // === Player pin image (sessão #74) ===
  // User: "remova a mensagem 'Você está aqui' do mapa / gere uma imagem low no OPENAI
  // pra ser o pin pra mostrar onde o personagem está". Estandarte/flâmula dourada
  // (gen_player_pin.py → gpt-image-2 low + rembg + WebP RGBA). Carregado module-level
  // com registry de redraw (igual ao world-map). _drawPlayerPin desenha a imagem;
  // fallback X (SEM o label "Você está aqui") se a imagem não carregar (ex.: file://).
  var _playerPin = null;
  var _playerPinCbs = [];
  (function(){
    try {
      var _pp = new Image();
      _pp.onload = function(){
        _playerPin = _pp;
        var cbs = _playerPinCbs; _playerPinCbs = [];
        cbs.forEach(function(cb){ try { cb(); } catch(_){} });
      };
      _pp.onerror = function(){ _playerPin = false; };
      _pp.src = '/shared/img/map/player-pin.webp';
    } catch(_e){ _playerPin = false; }
  })();
  function _playerPinReady(){ return !!(_playerPin && _playerPin.complete && _playerPin.naturalWidth); }
  function _onPlayerPinLoad(cb){
    if (typeof cb !== 'function') return;
    if (_playerPinReady()) { try { cb(); } catch(_){} return; }
    if (_playerPin !== false) _playerPinCbs.push(cb);
  }

  // === _cartWorldMapRect ===
  // Retângulo (em px de canvas) onde o world-map é renderizado. A imagem é QUADRADA
  // (1024×1024) e o editor a desenha num stage QUADRADO, então todo coord normalizado
  // (0..1) vive sobre um QUADRADO de lado S centrado no canvas.
  // P5 sessão #73: CONTAIN (S=min) em vez de cover (S=max). Em viewport RETRATO o
  // cover cortava as bordas L/R → locais nas pontas (korthag 0.11, crystal 0.85)
  // ficavam FORA da tela e o jogador não via o mapa inteiro (user report + img).
  // Contain mostra o MAPA INTEIRO + TODOS os locais de uma vez (letterbox escuro
  // topo/baixo, preenchido pelo backdrop). Coords 0..1 do editor mapeiam sobre o
  // MESMO quadrado → alinhamento pixel-perfect editor↔jogo. Escala UNIFORME, sem distorção.
  function _cartWorldMapRect(w, h){
    var S = Math.min(w, h);
    return { x: (w - S) / 2, y: (h - S) / 2, s: S };
  }

  // === _drawWorldMapBg ===
  // Desenha o world-map.webp como FUNDO do canvas (cover) + véu sépia leve pra
  // integrar com a UI dourada medieval. Se a imagem ainda não carregou, pinta um
  // fundo escuro neutro (NÃO o pergaminho procedural antigo — esse foi removido do
  // path da cartografia do jogo; ver tombstone em cidade/index.html). Quando a
  // imagem chegar, o consumer redesenha (via _onWorldMapLoad).
  function _drawWorldMapBg(ctx, w, h){
    // P-mapa sessão #73 (user: "toda área que não seja a do mapa ficar preta"): fundo
    // PRETO em todo o canvas. Antes o véu sépia cobria 0,0,w,h e tingia o letterbox de
    // marrom — agora o véu cobre SÓ o retângulo do mapa, deixando o resto preto puro.
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    if (worldMapReady()) {
      var r = _cartWorldMapRect(w, h);
      ctx.drawImage(_cartWorldMap, r.x, r.y, r.s, r.s);
      ctx.fillStyle = 'rgba(42,30,18,0.12)';   // véu sépia leve (medieval) — SÓ sobre o mapa
      ctx.fillRect(r.x, r.y, r.s, r.s);
      return true;
    }
    return false;
  }

  // === _drawParchmentBase ===
  function _drawParchmentBase(ctx, w, h){
    // Se o mapa medieval carregou, ele É a base (cobre o canvas, object-fit cover);
    // senão cai no pergaminho procedural (fallback seguro). Veil sépia leve integra
    // com a UI dourada.
    if (_cartWorldMap && _cartWorldMap.complete && _cartWorldMap.naturalWidth) {
      var _iw = _cartWorldMap.naturalWidth, _ih = _cartWorldMap.naturalHeight;
      var _sc = Math.max(w / _iw, h / _ih);
      var _dw = _iw * _sc, _dh = _ih * _sc;
      ctx.drawImage(_cartWorldMap, (w - _dw) / 2, (h - _dh) / 2, _dw, _dh);
      ctx.fillStyle = 'rgba(42,30,18,0.12)';
      ctx.fillRect(0, 0, w, h);
      return;
    }
    // 1. Base flat sepia (sem gradient) — fallback procedural
    ctx.fillStyle = PAPER_BG;
    ctx.fillRect(0, 0, w, h);
    // 2. Aged blotches ORGÂNICOS (não círculos toscos — formas Bezier irregulares
    //    com pétalas + capilaridade + salpicos). 2026-05-04: substitui ctx.arc plano.
    var rng = _cartSeedRand(42);
    for (var bi = 0; bi < 6; bi++) {
      var bx = rng() * w, by = rng() * h;
      var blotchSize = 28 + rng() * 50;
      _drawOrganicBlob(ctx, bx, by, blotchSize, PAPER_DARK, 0.16 + rng() * 0.12, 42 + bi * 13);
    }
    ctx.globalAlpha = 1;
    // 3. Paper grain (pontos pequenos espalhados, look graphite)
    for (var gi = 0; gi < 320; gi++) {
      var gx = rng() * w, gy = rng() * h;
      var ga = 0.05 + rng() * 0.10;
      ctx.fillStyle = 'rgba(60,40,12,' + ga.toFixed(3) + ')';
      ctx.fillRect(gx, gy, 0.8, 0.8);
    }
    // 4. Manchas de tinta antigas (12 pontos densos)
    for (var si = 0; si < 12; si++) {
      var sx = rng() * w, sy = rng() * h;
      var clusterN = 6 + Math.floor(rng()*8);
      for (var sj = 0; sj < clusterN; sj++) {
        var ox = (rng() - 0.5) * 14;
        var oy = (rng() - 0.5) * 14;
        var sa = 0.08 + rng()*0.18;
        ctx.fillStyle = 'rgba(40,20,4,' + sa.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(sx + ox, sy + oy, 0.6 + rng()*1.2, 0, Math.PI*2);
        ctx.fill();
      }
    }
    // 5. Dobras (3 linhas wavy quase imperceptíveis)
    ctx.strokeStyle = 'rgba(80,50,20,0.12)';
    ctx.lineWidth = 0.6;
    for (var fi = 0; fi < 3; fi++) {
      var fy = (0.25 + fi*0.30) * h + (rng()-0.5)*40;
      ctx.beginPath();
      var fx = 0;
      while (fx < w) {
        var fyy = fy + Math.sin(fx*0.04 + fi)*1.5 + (rng()-0.5)*0.8;
        if (fx === 0) ctx.moveTo(fx, fyy);
        else ctx.lineTo(fx, fyy);
        fx += 6;
      }
      ctx.stroke();
    }
    // 6. Hatching diagonal nos cantos (vinheta sem gradient)
    var cornerSz = Math.min(w, h) * 0.30;
    _hatchArea(ctx, 0, 0, cornerSz, cornerSz, Math.PI/4, 6, 'rgba(60,35,12,0.18)', 0.5);
    _hatchArea(ctx, w-cornerSz, 0, cornerSz, cornerSz, -Math.PI/4, 6, 'rgba(60,35,12,0.18)', 0.5);
    _hatchArea(ctx, 0, h-cornerSz, cornerSz, cornerSz, -Math.PI/4, 6, 'rgba(60,35,12,0.18)', 0.5);
    _hatchArea(ctx, w-cornerSz, h-cornerSz, cornerSz, cornerSz, Math.PI/4, 6, 'rgba(60,35,12,0.18)', 0.5);
  }

  // === _drawBiomeAtmosphere v13 (2026-05-06) — AAA POLISH AMPLIFIED ========
  // User reportou v12: "polish dos pictogram não senti diferença". v13:
  // alphas duplicados (de 0.10 → 0.25), particles 2× mais numerous, light
  // rays mais largos e contrastantes, frame circular de aura, halos atrás
  // dos pictogramas pra leitura clara.
  function _drawBiomeAtmosphere(ctx, b, w, h) {
    var bx = b.x * w, by = b.y * h;
    var biome = b.biome || b.key;
    ctx.save();
    ctx.translate(bx, by);
    var rng = _cartSeedRand(b.key.charCodeAt(0) * 200 + b.key.length * 7);

    // ─── HALO de fundo circular (dá depth + frame visual a TODOS) ───
    // Cria glow-frame radial que separa o pictograma do mapa around.
    // ANTES da arte (renderizado primeiro pra não cobrir). Aplicado via
    // composite. v13: agora 0.18 (era invisible).
    ctx.save();
    var haloColor = (biome === 'volcanic' || biome === 'desert') ? INK_DARK : INK_LIGHT;
    ctx.fillStyle = haloColor;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.fill();
    // Halo mais escuro nas bordas
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = INK_DARK;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ─── GROUND SHADOW grande elíptica (volume 3D claro v13) ────────
    var hasGroundShadow = (biome !== 'volcanic' && biome !== 'graveyard'
                          && biome !== 'snow' && biome !== 'cave');
    if (hasGroundShadow) {
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.25;  // v13: 0.10 → 0.25 (2.5× mais visível)
      ctx.beginPath();
      ctx.ellipse(0, 24, 32, 5, 0, 0, Math.PI * 2);  // 28×3.5 → 32×5 (mais largo)
      ctx.fill();
      // Sombra interna mais escura
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.ellipse(0, 24, 22, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ─── LIGHT RAY accent — agora 3 raios paralelos (era 1) ─────────
    var lightBiomes = { plains:1, green_fields:1, desert:1, snow:1, volcanic:1 };
    if (lightBiomes[biome] || lightBiomes[b.key]) {
      ctx.save();
      ctx.fillStyle = INK_LIGHT;
      // Raio 1 (mais largo, mais opaco)
      ctx.globalAlpha = 0.22;  // v13: 0.10 → 0.22
      ctx.beginPath();
      ctx.moveTo(-34, -32);
      ctx.lineTo(-26, -36);
      ctx.lineTo(2, 26);
      ctx.lineTo(-8, 26);
      ctx.closePath();
      ctx.fill();
      // Raio 2 (mais fino, atrás)
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      ctx.moveTo(-22, -34);
      ctx.lineTo(-18, -36);
      ctx.lineTo(8, 22);
      ctx.lineTo(2, 22);
      ctx.closePath();
      ctx.fill();
      // Raio 3 (mais lateral)
      ctx.globalAlpha = 0.10;
      ctx.beginPath();
      ctx.moveTo(-38, -22);
      ctx.lineTo(-32, -28);
      ctx.lineTo(-4, 28);
      ctx.lineTo(-12, 28);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // ─── BIOME-SPECIFIC PARTICLES (v13 amplified — 2x mais numerous) ───
    if (biome === 'forest' || b.key === 'goblin_nest' || b.key === 'elven_ruins') {
      // Folhas caindo MAIS (10 silhuetas — era 5)
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.6;  // v13: 0.4 → 0.6
      for (var fl = 0; fl < 10; fl++) {
        var fx = -32 + rng() * 64;
        var fy = -28 + rng() * 22;
        var rot = rng() * Math.PI;
        var siz = 1.2 + rng() * 0.8;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, siz, siz * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Veia central da folha
        ctx.beginPath();
        ctx.moveTo(-siz, 0); ctx.lineTo(siz, 0);
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    } else if (biome === 'swamp' || b.key === 'deep_swamp') {
      // Mist 5 layers (era 3) com opacidade maior
      ctx.fillStyle = INK_LIGHT;
      ctx.globalAlpha = 0.32;  // v13: 0.18 → 0.32
      [-22, -14, -6, 2, 12].forEach(function(my) {
        ctx.beginPath();
        ctx.ellipse(0, my, 32, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      // Bolhas (era 3, agora 8)
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.7;
      for (var bb = 0; bb < 8; bb++) {
        var bbx = -14 + rng() * 28;
        var bby = 6 + rng() * 18;
        ctx.beginPath();
        ctx.arc(bbx, bby, 0.6 + rng() * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (biome === 'volcanic' || b.key === 'volcanic') {
      // Cinzas (era 9, agora 18)
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.75;  // v13: 0.55 → 0.75
      for (var as = 0; as < 18; as++) {
        var asx = -36 + rng() * 72;
        var asy = -36 + rng() * 60;
        ctx.beginPath();
        ctx.arc(asx, asy, 0.5 + rng() * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Brasas brilhantes (NEW v13 — pontos lighter pra contraste)
      ctx.fillStyle = INK_LIGHT;
      ctx.globalAlpha = 0.65;
      for (var br = 0; br < 6; br++) {
        var brx = -28 + rng() * 56;
        var bry = -12 + rng() * 32;
        ctx.beginPath();
        ctx.arc(brx, bry, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Heat shimmer (linhas onduladas verticais)
      ctx.strokeStyle = INK_LIGHT;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 0.4;
      [-22, -8, 8, 22].forEach(function(hsx) {
        ctx.beginPath();
        ctx.moveTo(hsx, 18);
        ctx.bezierCurveTo(hsx + 1, 12, hsx - 1, 8, hsx, 0);
        ctx.bezierCurveTo(hsx + 0.5, -6, hsx - 0.5, -10, hsx, -16);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    } else if (biome === 'snow' || b.key === 'snow') {
      // Flocos de neve (asteriscos pequenos)
      ctx.strokeStyle = INK_DARK;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 0.3;
      for (var sf = 0; sf < 12; sf++) {
        var sfx = -32 + rng() * 64;
        var sfy = -32 + rng() * 56;
        var sz = 0.8 + rng() * 0.6;
        // Cruz vertical+horizontal
        ctx.beginPath();
        ctx.moveTo(sfx - sz, sfy); ctx.lineTo(sfx + sz, sfy);
        ctx.moveTo(sfx, sfy - sz); ctx.lineTo(sfx, sfy + sz);
        // Diagonais
        ctx.moveTo(sfx - sz * 0.7, sfy - sz * 0.7); ctx.lineTo(sfx + sz * 0.7, sfy + sz * 0.7);
        ctx.moveTo(sfx - sz * 0.7, sfy + sz * 0.7); ctx.lineTo(sfx + sz * 0.7, sfy - sz * 0.7);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (biome === 'desert' || b.key === 'desert') {
      // Wind streaks horizontais (linhas curvas)
      ctx.strokeStyle = INK_LIGHT;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 0.4;
      for (var ws = 0; ws < 6; ws++) {
        var wsy = -28 + ws * 8;
        var wsx0 = -30 + rng() * 6;
        ctx.beginPath();
        ctx.moveTo(wsx0, wsy);
        ctx.bezierCurveTo(wsx0 + 10, wsy - 1, wsx0 + 22, wsy + 1, wsx0 + 32, wsy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (biome === 'graveyard' || b.key === 'graveyard' || b.key === 'ancestral_graveyard') {
      // Mist baixa + corvos pretos (silhuetas em V)
      ctx.fillStyle = INK_LIGHT;
      ctx.globalAlpha = 0.20;
      ctx.beginPath();
      ctx.ellipse(0, 18, 32, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // 2 corvos voando
      ctx.strokeStyle = INK_DARK;
      ctx.lineWidth = 0.6;
      ctx.lineCap = 'round';
      [[-18, -22], [12, -26]].forEach(function(c) {
        var cx = c[0], cy = c[1];
        // Asas em M (V invertido)
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy + 1);
        ctx.quadraticCurveTo(cx - 1, cy - 1.5, cx, cy);
        ctx.quadraticCurveTo(cx + 1, cy - 1.5, cx + 3, cy + 1);
        ctx.stroke();
      });
    } else if (biome === 'mountain' || b.key === 'dragon_pass') {
      // Águia voando + névoa baixa
      ctx.strokeStyle = INK_DARK;
      ctx.lineWidth = 0.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(8, -22);
      ctx.quadraticCurveTo(11, -25, 14, -22);
      ctx.quadraticCurveTo(17, -25, 20, -22);
      ctx.stroke();
      // Nuvem baixa
      ctx.fillStyle = INK_LIGHT;
      ctx.globalAlpha = 0.20;
      ctx.beginPath();
      ctx.arc(-18, -10, 3, 0, Math.PI * 2);
      ctx.arc(-14, -11, 3.5, 0, Math.PI * 2);
      ctx.arc(-10, -9, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (biome === 'cave' || b.key === 'troll_cave' || b.key === 'underground_caverns'
               || b.key === 'crystal_depths') {
      // Pó de pedra subindo (pequenos pontos translúcidos)
      ctx.fillStyle = INK_LIGHT;
      ctx.globalAlpha = 0.4;
      for (var ds = 0; ds < 8; ds++) {
        var dsx = -22 + rng() * 44;
        var dsy = -18 + rng() * 36;
        ctx.beginPath();
        ctx.arc(dsx, dsy, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Sparkle de cristal pra crystal_depths
      if (b.key === 'crystal_depths') {
        ctx.strokeStyle = INK_LIGHT;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.7;
        for (var sp = 0; sp < 5; sp++) {
          var spx = -18 + rng() * 36;
          var spy = -10 + rng() * 24;
          var sps = 1.5;
          ctx.beginPath();
          ctx.moveTo(spx, spy - sps); ctx.lineTo(spx, spy + sps);
          ctx.moveTo(spx - sps, spy); ctx.lineTo(spx + sps, spy);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    } else if (b.key === 'orc_tribe' || b.key === 'bandit_fortress') {
      // Smoke do fogo (3 puffs pequenos subindo)
      ctx.fillStyle = INK_LIGHT;
      ctx.globalAlpha = 0.30;
      var smX = (b.key === 'orc_tribe') ? 18 : 4;
      var smY = (b.key === 'orc_tribe') ? 8 : -16;
      for (var sm = 0; sm < 3; sm++) {
        ctx.beginPath();
        ctx.arc(smX + sm, smY - sm * 4, 1.5 + sm * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (b.key === 'korthag') {
      // Mais smoke da fornalha (puffs altos)
      ctx.fillStyle = INK_LIGHT;
      ctx.globalAlpha = 0.30;
      for (var ks = 0; ks < 3; ks++) {
        ctx.beginPath();
        ctx.arc(2 + ks * 2, -22 - ks * 4, 2 + ks * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (b.key === 'green_fields') {
      // Pólen flutuando (4 pontos dourados translúcidos)
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.35;
      for (var pl = 0; pl < 5; pl++) {
        var plx = -28 + rng() * 56;
        var ply = -20 + rng() * 24;
        ctx.beginPath();
        ctx.arc(plx, ply, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (b.key === 'valkrest') {
      // Cinzas leves (acampamento próximo do vulcão)
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.40;
      for (var vs = 0; vs < 5; vs++) {
        var vsx = -26 + rng() * 52;
        var vsy = -22 + rng() * 18;
        ctx.beginPath();
        ctx.arc(vsx, vsy, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ─── HATCHING AMBIENTE direcional (sombra NE pra todos) ─────────
    // Pequena hachura diagonal no canto superior direito como
    // sombra atmosférica de luz vinda do canto inferior esquerdo
    ctx.strokeStyle = INK_DARK;
    ctx.lineWidth = 0.25;
    ctx.globalAlpha = 0.18;
    for (var hh = 0; hh < 5; hh++) {
      var hhy = -28 + hh * 2;
      ctx.beginPath();
      ctx.moveTo(20 + hh * 1.5, hhy);
      ctx.lineTo(28 + hh * 1.5, hhy + 8);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // === _drawBiomeArt — wrapper AAA POLISH v12 (2026-05-06) ============
  // Wrapper que chama o pictograma core + atmospheric polish layer.
  // User pediu "AAA polish dos 22 pictogramas". Polish é shared (uma
  // função que adiciona elementos baseados no biome/key) — alimenta
  // todos os pictogramas existentes sem editar cada um individualmente.
  function _drawBiomeArt(ctx, b, w, h) {
    // Deprecated legacy vector drawing: no-op to prevent legacy map artwork from rendering
    return;
  }

  // === _drawBiomeArtCore (renamed do antigo _drawBiomeArt) ===========
  function _drawBiomeArtCore(ctx, b, w, h){
    // === Biome Art hand-drawn (Fase 6.5 — 2026-04-30) ========================
    // Pencil/ink pictogramas estilo cartografia antiga — line-only, single
    // sépia color, hatching pra shading. SEM gradients, SEM shadows, SEM glow.
    var bx = b.x * w, by = b.y * h;
    ctx.save();
    ctx.translate(bx, by);
    ctx.strokeStyle = INK_DARK;
    ctx.fillStyle = INK_DARK;
    ctx.lineWidth = 0.9;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var rng = _cartSeedRand(b.key.charCodeAt(0) * 100 + b.key.length);
    var r = 50; // raio art reduzido (mais limpo)
    var i, x, y, sz;

    // ─── PICTOGRAMAS PROFISSIONAIS AAA (REWRITE 2026-05-04) ───────────
    // USER REQUEST: "está parecendo desenho infantil, faça melhorias
    // profundas e profissionais". Reescrita completa com:
    // - Volume real via cross-hatching diagonal mestre + finos
    // - Perspectiva 3/4 onde apropriado (castelos, torres, vulcão)
    // - Hierarquia visual (1 elemento dominante + secundários)
    // - Texturas: blocos de pedra, folhagem, água ondulante, neve granular
    // - Proporções autênticas Frà Mauro / Atlas Catalão (1375-1459)
    // ──────────────────────────────────────────────────────────────────

    // === PER-KEY UNIQUE PICTOGRAMS v10 (2026-05-05) ==================
    // User feedback: "nenhum desenho deve ser repetido". Locais não-genéricos
    // (orc_tribe, bandit_fortress, goblin_nest, elven_ruins, troll_cave,
    // deep_swamp, dragon_pass, korthag, ancestral_graveyard, valkrest,
    // green_fields, underground_caverns, crystal_depths) ganham pictograma
    // próprio inequívoco. Os 9 biomas base mantêm seus pictogramas existentes
    // (plains/forest/cave/swamp/mountain/desert/graveyard/snow/volcanic).
    // Cada um termina com `return` pra evitar fall-through ao biome generic.
    // =================================================================

    // ─── GREEN_FIELDS (Campos Verdes) — fardos de trigo + moinho ─────
    if (b.key === 'green_fields') {
      ctx.lineWidth = 0.8;
      // Linhas onduladas do solo (campos)
      for (var gf = 0; gf < 4; gf++) {
        var gy_ = 8 + gf * 4;
        ctx.beginPath();
        ctx.moveTo(-30, gy_);
        ctx.bezierCurveTo(-15, gy_ - 1.5, 0, gy_ + 1.5, 15, gy_ - 0.8);
        ctx.bezierCurveTo(22, gy_ + 1, 28, gy_ - 0.5, 30, gy_);
        ctx.stroke();
      }
      // 3 fardos de trigo (cones com cordilha)
      [[-14, 4], [10, 6], [-2, 10]].forEach(function(s){
        var sx = s[0], sy = s[1];
        ctx.beginPath();
        ctx.moveTo(sx - 3, sy + 4);
        ctx.lineTo(sx, sy - 6);
        ctx.lineTo(sx + 3, sy + 4);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx - 2.5, sy + 1); ctx.lineTo(sx + 2.5, sy + 1);
        ctx.moveTo(sx - 2, sy + 2.5); ctx.lineTo(sx + 2, sy + 2.5);
        ctx.stroke();
      });
      // MOINHO (torre cônica + 4 pás cruz)
      var mwX = 18, mwY = -10;
      ctx.beginPath();
      ctx.moveTo(mwX - 5, mwY + 12);
      ctx.lineTo(mwX - 3, mwY - 4);
      ctx.lineTo(mwX + 3, mwY - 4);
      ctx.lineTo(mwX + 5, mwY + 12);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath(); ctx.arc(mwX, mwY - 4, 1, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 0.7;
      [[0, -10], [0, 10], [-10, 0], [10, 0]].forEach(function(p){
        ctx.beginPath();
        ctx.moveTo(mwX, mwY - 4);
        ctx.lineTo(mwX + p[0], mwY - 4 + p[1]);
        ctx.stroke();
        var ang_ = Math.atan2(p[1], p[0]);
        var px_ = mwX + p[0] * 0.85, py_ = mwY - 4 + p[1] * 0.85;
        ctx.save();
        ctx.translate(px_, py_);
        ctx.rotate(ang_);
        ctx.beginPath(); ctx.rect(-3, -1.2, 6, 2.4); ctx.stroke();
        ctx.restore();
      });
      ctx.restore(); return;
    }

    // ─── ORC_TRIBE (Acampamento Orc) — tendas + totem caveira + tambor ─
    if (b.key === 'orc_tribe') {
      ctx.lineWidth = 0.85;
      var tents = [[-16, 8, 0.95], [12, 6, 1.0], [-2, 12, 0.85]];
      tents.forEach(function(t){
        var tx = t[0], ty = t[1], sc = t[2];
        ctx.beginPath();
        ctx.moveTo(tx - 7 * sc, ty + 6);
        ctx.lineTo(tx, ty - 10 * sc);
        ctx.lineTo(tx + 7 * sc, ty + 6);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tx - 1, ty - 11 * sc); ctx.lineTo(tx + 1, ty - 13 * sc);
        ctx.moveTo(tx + 1, ty - 11 * sc); ctx.lineTo(tx - 1, ty - 13 * sc);
        ctx.stroke();
        ctx.fillStyle = INK_DARK;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(tx - 1.5, ty + 6);
        ctx.lineTo(tx, ty - 2);
        ctx.lineTo(tx + 1.5, ty + 6);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      // TOTEM CENTRAL — caveira em poste alto
      var tmX = 0, tmY = -6;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tmX, tmY + 16); ctx.lineTo(tmX, tmY - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tmX, tmY - 8, 3.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = INK_DARK;
      ctx.beginPath();
      ctx.arc(tmX - 1.2, tmY - 8.5, 0.7, 0, Math.PI * 2);
      ctx.arc(tmX + 1.2, tmY - 8.5, 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(tmX, tmY - 6, 1.5, 0, Math.PI);
      ctx.stroke();
      ctx.lineWidth = 0.5;
      [-5, 5].forEach(function(off){
        ctx.beginPath();
        ctx.moveTo(tmX + off, tmY - 4);
        ctx.lineTo(tmX + off * 1.5, tmY + 1);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(tmX + off * 1.5, tmY + 1, 0.6, 0, Math.PI * 2); ctx.fill();
      });
      // FOGUEIRA pequena
      var fX = 18, fY = 12;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(fX - 2, fY + 2); ctx.lineTo(fX, fY - 4); ctx.lineTo(fX + 2, fY + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fX - 1.2, fY + 1); ctx.lineTo(fX, fY - 2); ctx.lineTo(fX + 1.2, fY + 1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fX - 3, fY + 4); ctx.lineTo(fX + 3, fY + 4);
      ctx.moveTo(fX - 2, fY + 3); ctx.lineTo(fX + 2, fY + 5);
      ctx.stroke();
      ctx.restore(); return;
    }

    // ─── BANDIT_FORTRESS — paliçada + torre + bandeira pirata ────────
    if (b.key === 'bandit_fortress') {
      ctx.lineWidth = 0.8;
      var pX = -22;
      for (var pp = 0; pp < 12; pp++) {
        var sx_ = pX + pp * 4;
        ctx.beginPath();
        ctx.moveTo(sx_, 14); ctx.lineTo(sx_, -2);
        ctx.lineTo(sx_ + 1.5, -4); ctx.lineTo(sx_ + 3, -2);
        ctx.lineTo(sx_ + 3, 14);
        ctx.stroke();
      }
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-22, 6); ctx.lineTo(26, 6);
      ctx.stroke();
      ctx.lineWidth = 0.9;
      var twX = 4, twY = -16;
      ctx.beginPath();
      ctx.moveTo(twX - 4, 0); ctx.lineTo(twX - 5, twY + 8);
      ctx.moveTo(twX + 4, 0); ctx.lineTo(twX + 5, twY + 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(twX - 7, twY + 2, 14, 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(twX - 8, twY + 2);
      ctx.lineTo(twX, twY - 4);
      ctx.lineTo(twX + 8, twY + 2);
      ctx.closePath();
      ctx.stroke();
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(twX, twY - 4); ctx.lineTo(twX, twY - 14);
      ctx.stroke();
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.rect(twX, twY - 14, 8, 5);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = PAPER_BG;
      ctx.beginPath();
      ctx.arc(twX + 4, twY - 11.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 0.4;
      ctx.strokeStyle = PAPER_BG;
      ctx.beginPath();
      ctx.moveTo(twX + 2.5, twY - 9.5); ctx.lineTo(twX + 5.5, twY - 12.5);
      ctx.moveTo(twX + 5.5, twY - 9.5); ctx.lineTo(twX + 2.5, twY - 12.5);
      ctx.stroke();
      ctx.strokeStyle = INK_DARK;
      ctx.lineWidth = 0.8;
      [[-22, 0], [25, 0]].forEach(function(p){
        ctx.beginPath();
        ctx.moveTo(p[0], p[1] - 4); ctx.lineTo(p[0] + 0.5, p[1] - 8);
        ctx.lineTo(p[0] + 1, p[1] - 5); ctx.lineTo(p[0] + 0.5, p[1] - 6.5);
        ctx.stroke();
      });
      ctx.restore(); return;
    }

    // ─── GOBLIN_NEST — gravetos cruzados + armadilhas + crânio ───────
    if (b.key === 'goblin_nest') {
      ctx.lineWidth = 0.7;
      var nX = 0, nY = 6;
      for (var ng = 0; ng < 8; ng++) {
        var ang = (ng / 8) * Math.PI * 2;
        var ax = nX + Math.cos(ang) * 7;
        var ay = nY + Math.sin(ang) * 4;
        var bx2 = nX + Math.cos(ang + 0.7) * 11;
        var by2 = nY + Math.sin(ang + 0.7) * 6;
        ctx.beginPath();
        ctx.moveTo(ax, ay); ctx.lineTo(bx2, by2);
        ctx.stroke();
      }
      ctx.fillStyle = INK_DARK;
      ctx.beginPath();
      ctx.ellipse(nX, nY, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      [[-18, 12], [16, 14]].forEach(function(t){
        var tx = t[0], ty = t[1];
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.ellipse(tx, ty, 4, 1.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        for (var sp = 0; sp < 4; sp++) {
          var spx = tx - 2.5 + sp * 1.5;
          ctx.beginPath();
          ctx.moveTo(spx, ty); ctx.lineTo(spx, ty - 3);
          ctx.stroke();
          ctx.fillStyle = INK_DARK;
          ctx.beginPath();
          ctx.moveTo(spx - 0.7, ty - 2.5);
          ctx.lineTo(spx, ty - 4);
          ctx.lineTo(spx + 0.7, ty - 2.5);
          ctx.closePath();
          ctx.fill();
        }
      });
      ctx.lineWidth = 0.4;
      for (var sc_ = 0; sc_ < 6; sc_++) {
        var scAng = rng() * Math.PI * 2;
        var scR = 16 + rng() * 8;
        var scx = Math.cos(scAng) * scR;
        var scy = Math.sin(scAng) * scR * 0.6 + 2;
        ctx.beginPath();
        ctx.moveTo(scx, scy); ctx.lineTo(scx + 1.5, scy + 0.8);
        ctx.moveTo(scx + 0.7, scy - 0.3); ctx.lineTo(scx + 2.2, scy + 0.5);
        ctx.stroke();
      }
      var skX = -22, skY = -2;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(skX, skY + 12); ctx.lineTo(skX, skY - 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(skX, skY - 4, 1.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = INK_DARK;
      ctx.beginPath();
      ctx.arc(skX - 0.6, skY - 4.3, 0.4, 0, Math.PI * 2);
      ctx.arc(skX + 0.6, skY - 4.3, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore(); return;
    }

    // ─── ELVEN_RUINS — arco ogival + pilar caído + runas ────────────
    if (b.key === 'elven_ruins') {
      ctx.lineWidth = 0.85;
      var arcX = -2, arcBottom = 14;
      ctx.beginPath();
      ctx.moveTo(arcX - 7, arcBottom);
      ctx.lineTo(arcX - 7, arcBottom - 8);
      ctx.bezierCurveTo(arcX - 6, arcBottom - 18, arcX - 1, arcBottom - 22, arcX, arcBottom - 24);
      ctx.bezierCurveTo(arcX + 1, arcBottom - 22, arcX + 6, arcBottom - 18, arcX + 7, arcBottom - 8);
      ctx.lineTo(arcX + 7, arcBottom);
      ctx.stroke();
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(arcX - 5, arcBottom);
      ctx.lineTo(arcX - 5, arcBottom - 6);
      ctx.bezierCurveTo(arcX - 4, arcBottom - 14, arcX - 0.5, arcBottom - 18, arcX, arcBottom - 20);
      ctx.bezierCurveTo(arcX + 0.5, arcBottom - 18, arcX + 4, arcBottom - 14, arcX + 5, arcBottom - 6);
      ctx.lineTo(arcX + 5, arcBottom);
      ctx.stroke();
      ctx.lineWidth = 0.85;
      [-7, 7].forEach(function(off){
        ctx.beginPath();
        ctx.moveTo(arcX + off - 1.2, arcBottom - 8);
        ctx.lineTo(arcX + off + 1.2, arcBottom - 8);
        ctx.stroke();
      });
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-26, 10);
      ctx.lineTo(-15, 14);
      ctx.lineTo(-15, 16);
      ctx.lineTo(-26, 12);
      ctx.closePath();
      ctx.stroke();
      ctx.lineWidth = 0.3;
      for (var pli = 0; pli < 3; pli++) {
        ctx.beginPath();
        ctx.moveTo(-23 + pli * 3, 11); ctx.lineTo(-23 + pli * 3, 13);
        ctx.stroke();
      }
      ctx.lineWidth = 0.6;
      var runas = [[16, 12], [20, 8], [12, 16], [22, 14]];
      runas.forEach(function(r_){
        var rx = r_[0], ry = r_[1];
        ctx.beginPath();
        ctx.moveTo(rx - 1.5, ry); ctx.lineTo(rx, ry - 2); ctx.lineTo(rx + 1.5, ry);
        ctx.moveTo(rx, ry - 2); ctx.lineTo(rx, ry + 1.5);
        ctx.stroke();
      });
      ctx.lineWidth = 0.5;
      var leaves = [[-18, -4], [10, -6], [-8, -8], [22, -2]];
      leaves.forEach(function(l){
        ctx.beginPath();
        ctx.ellipse(l[0], l[1], 1.5, 0.7, 0.4, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore(); return;
    }

    // ─── TROLL_CAVE — caverna larga + olhos no escuro + clava + ossos ─
    if (b.key === 'troll_cave') {
      ctx.lineWidth = 0.95;
      var cvX = 0, cvY = 6;
      ctx.beginPath();
      ctx.moveTo(cvX - 16, cvY + 8);
      ctx.bezierCurveTo(cvX - 18, cvY - 4, cvX - 8, cvY - 14, cvX, cvY - 14);
      ctx.bezierCurveTo(cvX + 8, cvY - 14, cvX + 18, cvY - 4, cvX + 16, cvY + 8);
      ctx.stroke();
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(cvX - 13, cvY + 7);
      ctx.bezierCurveTo(cvX - 15, cvY - 3, cvX - 7, cvY - 12, cvX, cvY - 12);
      ctx.bezierCurveTo(cvX + 7, cvY - 12, cvX + 15, cvY - 3, cvX + 13, cvY + 7);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = PAPER_BG;
      ctx.beginPath();
      ctx.arc(cvX - 3, cvY - 4, 0.9, 0, Math.PI * 2);
      ctx.arc(cvX + 3, cvY - 4, 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 0.6;
      ctx.fillStyle = INK_DARK;
      ctx.beginPath();
      ctx.moveTo(cvX - 12, cvY + 11); ctx.lineTo(cvX - 4, cvY + 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cvX - 12, cvY + 11, 1.2, 0, Math.PI * 2);
      ctx.arc(cvX - 4, cvY + 12, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cvX + 4, cvY + 11); ctx.lineTo(cvX + 12, cvY + 13);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cvX + 4, cvY + 11, 1.2, 0, Math.PI * 2);
      ctx.arc(cvX + 12, cvY + 13, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cvX + 14, cvY + 11, 2.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cvX + 13.2, cvY + 10.5, 0.5, 0, Math.PI * 2);
      ctx.arc(cvX + 14.8, cvY + 10.5, 0.5, 0, Math.PI * 2);
      ctx.fill();
      // Clava gigante
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(cvX - 18, cvY + 14);
      ctx.lineTo(cvX - 22, cvY - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cvX - 22, cvY - 7, 3, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      [-3, 3].forEach(function(dx){
        [-3, 3].forEach(function(dy){
          ctx.beginPath();
          ctx.moveTo(cvX - 22 + dx, cvY - 7 + dy);
          ctx.lineTo(cvX - 22 + dx * 1.6, cvY - 7 + dy * 1.6);
          ctx.stroke();
        });
      });
      ctx.lineWidth = 0.5;
      [-4, 0, 5].forEach(function(sX_){
        ctx.beginPath();
        ctx.moveTo(cvX + sX_ - 1, cvY - 12);
        ctx.lineTo(cvX + sX_, cvY - 9);
        ctx.lineTo(cvX + sX_ + 1, cvY - 12);
        ctx.stroke();
      });
      ctx.restore(); return;
    }

    // ─── DEEP_SWAMP — árvore morta retorcida + crocodilo + fogo-fátuo ─
    if (b.key === 'deep_swamp') {
      ctx.lineWidth = 0.8;
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.rect(-30, 8, 60, 14);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.4;
      for (var w_ = 0; w_ < 4; w_++) {
        var wy = 11 + w_ * 3;
        ctx.beginPath();
        ctx.moveTo(-28, wy);
        ctx.bezierCurveTo(-15, wy - 1, 0, wy + 1, 15, wy - 0.5);
        ctx.bezierCurveTo(22, wy + 1, 28, wy - 0.3, 30, wy);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      var trX = -8, trY = 8;
      ctx.beginPath();
      ctx.moveTo(trX, trY);
      ctx.bezierCurveTo(trX + 2, trY - 8, trX - 2, trY - 14, trX + 1, trY - 22);
      ctx.stroke();
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(trX + 1, trY - 16);
      ctx.lineTo(trX - 6, trY - 20);
      ctx.lineTo(trX - 8, trY - 24);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(trX + 0.5, trY - 18);
      ctx.lineTo(trX + 7, trY - 21);
      ctx.lineTo(trX + 9, trY - 25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(trX, trY - 12);
      ctx.lineTo(trX - 5, trY - 13);
      ctx.lineTo(trX - 7, trY - 11);
      ctx.stroke();
      // Crocodilo
      ctx.lineWidth = 0.85;
      var crX = 12, crY = 14;
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(crX - 10, crY);
      ctx.lineTo(crX - 8, crY - 0.8);
      ctx.lineTo(crX, crY - 1.2);
      ctx.lineTo(crX + 6, crY - 0.5);
      ctx.lineTo(crX + 7, crY + 0.5);
      ctx.lineTo(crX + 4, crY + 1);
      ctx.lineTo(crX - 8, crY + 1);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(crX - 10, crY);
      ctx.lineTo(crX - 16, crY - 1);
      ctx.lineTo(crX - 18, crY + 0.5);
      ctx.lineTo(crX - 14, crY + 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = PAPER_BG;
      ctx.beginPath();
      ctx.arc(crX + 4, crY - 1.3, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK_DARK;
      ctx.beginPath();
      ctx.arc(crX + 4, crY - 1.3, 0.25, 0, Math.PI * 2);
      ctx.fill();
      // Will-o-wisp
      ctx.lineWidth = 0.5;
      var wpX = -18, wpY = 4;
      ctx.beginPath();
      ctx.arc(wpX, wpY, 1.5, 0, Math.PI * 2);
      ctx.stroke();
      for (var wr_ = 0; wr_ < 6; wr_++) {
        var wrAng = (wr_ / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(wpX + Math.cos(wrAng) * 2.5, wpY + Math.sin(wrAng) * 2.5);
        ctx.lineTo(wpX + Math.cos(wrAng) * 4, wpY + Math.sin(wrAng) * 4);
        ctx.stroke();
      }
      ctx.lineWidth = 0.4;
      [[-22, 16], [22, 18], [4, 19]].forEach(function(lp){
        ctx.beginPath();
        ctx.ellipse(lp[0], lp[1], 1.5, 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore(); return;
    }

    // ─── DRAGON_PASS — desfiladeiro + fumaça + garra ─────────────────
    if (b.key === 'dragon_pass') {
      ctx.lineWidth = 0.9;
      var pkLX = -18, pkRX = 18, pkBase = 16, pkTop = -16;
      ctx.beginPath();
      ctx.moveTo(pkLX - 12, pkBase);
      ctx.lineTo(pkLX - 4, pkTop + 4);
      ctx.lineTo(pkLX, pkTop);
      ctx.lineTo(pkLX + 5, pkTop + 6);
      ctx.lineTo(pkLX + 8, pkBase);
      ctx.closePath();
      ctx.stroke();
      ctx.lineWidth = 0.3;
      for (var hL = 0; hL < 6; hL++) {
        ctx.beginPath();
        ctx.moveTo(pkLX + hL * 1.2, pkTop + 4 + hL * 1.5);
        ctx.lineTo(pkLX + 4 + hL * 1.2, pkBase - 1);
        ctx.stroke();
      }
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(pkRX + 12, pkBase);
      ctx.lineTo(pkRX + 4, pkTop + 4);
      ctx.lineTo(pkRX, pkTop);
      ctx.lineTo(pkRX - 5, pkTop + 6);
      ctx.lineTo(pkRX - 8, pkBase);
      ctx.closePath();
      ctx.stroke();
      ctx.lineWidth = 0.3;
      for (var hR = 0; hR < 6; hR++) {
        ctx.beginPath();
        ctx.moveTo(pkRX - hR * 1.2, pkTop + 4 + hR * 1.5);
        ctx.lineTo(pkRX - 4 - hR * 1.2, pkBase - 1);
        ctx.stroke();
      }
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(-3, pkBase);
      ctx.lineTo(-2, 0);
      ctx.lineTo(2, 0);
      ctx.lineTo(3, pkBase);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.5;
      for (var sm = 0; sm < 3; sm++) {
        var smY_ = -4 - sm * 6;
        var smX_ = sm * 0.8 - 1;
        ctx.beginPath();
        ctx.arc(smX_ - 2, smY_, 2.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(smX_ + 1.5, smY_ - 1, 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.lineWidth = 0.7;
      var clX = -6, clY = 18;
      [-3, 0, 3].forEach(function(off){
        ctx.beginPath();
        ctx.moveTo(clX + off, clY + 2); ctx.lineTo(clX + off, clY - 1);
        ctx.stroke();
        ctx.fillStyle = INK_DARK;
        ctx.beginPath();
        ctx.moveTo(clX + off - 0.7, clY - 1);
        ctx.lineTo(clX + off, clY - 3);
        ctx.lineTo(clX + off + 0.7, clY - 1);
        ctx.closePath();
        ctx.fill();
      });
      ctx.beginPath();
      ctx.arc(clX, clY + 2, 4, 0, Math.PI);
      ctx.stroke();
      ctx.restore(); return;
    }

    // ─── KORTHAG (Vila Mineira) — casas pedra + fornalha + picaretas ─
    if (b.key === 'korthag') {
      ctx.lineWidth = 0.8;
      var khouses = [[-14, 8, 1.0], [10, 6, 1.05], [-2, 12, 0.85]];
      khouses.forEach(function(h){
        var hx = h[0], hy = h[1], sc = h[2];
        ctx.beginPath();
        ctx.rect(hx - 6 * sc, hy - 1, 12 * sc, 7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(hx - 7 * sc, hy - 1);
        ctx.lineTo(hx - 4 * sc, hy - 4);
        ctx.lineTo(hx + 4 * sc, hy - 4);
        ctx.lineTo(hx + 7 * sc, hy - 1);
        ctx.stroke();
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(hx - 4 * sc, hy - 4); ctx.lineTo(hx, hy - 2);
        ctx.moveTo(hx + 4 * sc, hy - 4); ctx.lineTo(hx, hy - 2);
        ctx.stroke();
        ctx.lineWidth = 0.8;
        ctx.fillStyle = INK_DARK;
        ctx.fillRect(hx - 1, hy + 0.5, 1.5, 1.5);
      });
      ctx.lineWidth = 1;
      var fnX = 0, fnY = -2;
      ctx.beginPath();
      ctx.rect(fnX - 4, fnY - 2, 8, 8);
      ctx.stroke();
      ctx.fillStyle = INK_DARK;
      ctx.beginPath();
      ctx.moveTo(fnX - 2, fnY + 6);
      ctx.lineTo(fnX - 2, fnY + 3);
      ctx.bezierCurveTo(fnX - 2, fnY + 1, fnX + 2, fnY + 1, fnX + 2, fnY + 3);
      ctx.lineTo(fnX + 2, fnY + 6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.rect(fnX + 1, fnY - 12, 3, 10);
      ctx.stroke();
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(fnX + 1, fnY - 14, 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(fnX + 4, fnY - 17, 2.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(fnX, fnY - 20, 3, 0, Math.PI * 2);
      ctx.stroke();
      // Picaretas cruzadas
      ctx.lineWidth = 0.7;
      var pkX = -22, pkY = -8;
      ctx.beginPath();
      ctx.moveTo(pkX - 4, pkY + 5); ctx.lineTo(pkX + 4, pkY - 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pkX + 3, pkY - 5);
      ctx.lineTo(pkX + 6, pkY - 4);
      ctx.lineTo(pkX + 5, pkY - 7);
      ctx.lineTo(pkX + 2, pkY - 8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(pkX + 4, pkY + 5); ctx.lineTo(pkX - 4, pkY - 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pkX - 3, pkY - 5);
      ctx.lineTo(pkX - 6, pkY - 4);
      ctx.lineTo(pkX - 5, pkY - 7);
      ctx.lineTo(pkX - 2, pkY - 8);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 0.4;
      var orX = 22, orY = 14;
      [[0, 0], [-2, 1], [2, 1], [-1, -2], [1, -2]].forEach(function(o){
        ctx.beginPath();
        ctx.arc(orX + o[0], orY + o[1], 1, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore(); return;
    }

    // ─── ANCESTRAL_GRAVEYARD — mausoléu colunado + sarcófago ─────────
    if (b.key === 'ancestral_graveyard') {
      ctx.lineWidth = 0.85;
      var msX = 0, msBase = 14;
      for (var st_ = 0; st_ < 3; st_++) {
        ctx.beginPath();
        ctx.rect(msX - 16 + st_ * 1, msBase - st_ * 1.5, 32 - st_ * 2, 1.5);
        ctx.stroke();
      }
      [-12, -4, 4, 12].forEach(function(cx){
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(msX + cx - 1.5, msBase - 4);
        ctx.lineTo(msX + cx - 1.5, -2);
        ctx.lineTo(msX + cx + 1.5, -2);
        ctx.lineTo(msX + cx + 1.5, msBase - 4);
        ctx.closePath();
        ctx.stroke();
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(msX + cx - 0.5, msBase - 5); ctx.lineTo(msX + cx - 0.5, -2);
        ctx.moveTo(msX + cx + 0.5, msBase - 5); ctx.lineTo(msX + cx + 0.5, -2);
        ctx.stroke();
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.rect(msX + cx - 2.2, -3.5, 4.4, 1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.rect(msX + cx - 2.2, msBase - 4, 4.4, 1.5);
        ctx.stroke();
      });
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(msX - 14, -3.5);
      ctx.lineTo(msX, -10);
      ctx.lineTo(msX + 14, -3.5);
      ctx.closePath();
      ctx.stroke();
      ctx.lineWidth = 0.3;
      for (var fh = 0; fh < 4; fh++) {
        ctx.beginPath();
        ctx.moveTo(msX - 10 + fh * 5, -4);
        ctx.lineTo(msX - 7 + fh * 5, -7);
        ctx.stroke();
      }
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(msX, -10); ctx.lineTo(msX, -14);
      ctx.moveTo(msX - 1.5, -12.5); ctx.lineTo(msX + 1.5, -12.5);
      ctx.stroke();
      // Sarcófago
      var scX = 0, scY = 18;
      ctx.beginPath();
      ctx.rect(scX - 8, scY - 1, 16, 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(scX - 7, scY); ctx.lineTo(scX + 7, scY);
      ctx.stroke();
      ctx.fillStyle = INK_DARK;
      ctx.beginPath();
      ctx.rect(scX - 0.5, scY - 0.5, 1, 2);
      ctx.rect(scX - 1.2, scY + 0.2, 2.4, 0.6);
      ctx.fill();
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.ellipse(-22, 18, 3, 1.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      [-22 - 1.5, -22, -22 + 1.5].forEach(function(fx){
        ctx.beginPath();
        ctx.arc(fx, 17.5, 0.5, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore(); return;
    }

    // ─── UNDERGROUND_CAVERNS — túnel + estalactites + plataforma + escada ─
    if (b.key === 'underground_caverns') {
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-22, 16); ctx.lineTo(-22, -16);
      ctx.lineTo(-16, -14); ctx.lineTo(-14, -10); ctx.lineTo(-12, -8);
      ctx.lineTo(-10, -4); ctx.lineTo(-12, 0); ctx.lineTo(-10, 4);
      ctx.lineTo(-12, 8); ctx.lineTo(-10, 12); ctx.lineTo(-12, 16);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(22, 16); ctx.lineTo(22, -16);
      ctx.lineTo(16, -14); ctx.lineTo(14, -10); ctx.lineTo(12, -8);
      ctx.lineTo(10, -4); ctx.lineTo(12, 0); ctx.lineTo(10, 4);
      ctx.lineTo(12, 8); ctx.lineTo(10, 12); ctx.lineTo(12, 16);
      ctx.closePath();
      ctx.stroke();
      ctx.lineWidth = 0.6;
      [-14, -7, 7, 14].forEach(function(stX){
        ctx.beginPath();
        ctx.moveTo(stX - 1.5, -16);
        ctx.lineTo(stX, -10);
        ctx.lineTo(stX + 1.5, -16);
        ctx.stroke();
      });
      [-10, 0, 12].forEach(function(stX){
        ctx.beginPath();
        ctx.moveTo(stX - 1.2, 14);
        ctx.lineTo(stX, 10);
        ctx.lineTo(stX + 1.2, 14);
        ctx.stroke();
      });
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.rect(-6, 4, 12, 1.5);
      ctx.stroke();
      ctx.fillStyle = INK_DARK;
      ctx.fillRect(-6, 4.2, 12, 0.5);
      ctx.lineWidth = 0.4;
      ctx.setLineDash([0.8, 0.6]);
      ctx.beginPath();
      ctx.moveTo(-4, 4); ctx.lineTo(-4, -8);
      ctx.moveTo(4, 4); ctx.lineTo(4, -8);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-1, 4); ctx.lineTo(0, 0); ctx.lineTo(1, 4);
      ctx.stroke();
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(15, -10); ctx.lineTo(17, 14);
      ctx.moveTo(19, -10); ctx.lineTo(20, 14);
      ctx.stroke();
      for (var dg = 0; dg < 5; dg++) {
        var dgY = -8 + dg * 5;
        ctx.beginPath();
        ctx.moveTo(15.5 + dg * 0.4, dgY);
        ctx.lineTo(19 + dg * 0.4, dgY);
        ctx.stroke();
      }
      ctx.restore(); return;
    }

    // ─── CRYSTAL_DEPTHS — cluster luminescente + glow rays ───────────
    if (b.key === 'crystal_depths') {
      ctx.lineWidth = 0.8;
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.ellipse(0, 4, 26, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.ellipse(0, 4, 26, 18, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 0.7;
      var crystals = [
        { x: -4, y: 6, h: 10, w: 2, ang: 0 },
        { x: 2, y: 4, h: 14, w: 2.5, ang: 0.1 },
        { x: 8, y: 8, h: 8, w: 1.8, ang: -0.2 },
        { x: -10, y: 10, h: 6, w: 1.5, ang: 0.3 },
        { x: 0, y: 12, h: 4, w: 2.2, ang: 0 }
      ];
      crystals.forEach(function(cr){
        ctx.fillStyle = PAPER_BG;
        ctx.save();
        ctx.translate(cr.x, cr.y);
        ctx.rotate(cr.ang);
        ctx.beginPath();
        ctx.moveTo(0, -cr.h);
        ctx.lineTo(cr.w * 0.6, -cr.h + 2);
        ctx.lineTo(cr.w, 0);
        ctx.lineTo(cr.w * 0.6, 2);
        ctx.lineTo(-cr.w * 0.6, 2);
        ctx.lineTo(-cr.w, 0);
        ctx.lineTo(-cr.w * 0.6, -cr.h + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(0, -cr.h); ctx.lineTo(0, 2);
        ctx.stroke();
        ctx.lineWidth = 0.7;
        ctx.restore();
      });
      ctx.lineWidth = 0.4;
      for (var gr_ = 0; gr_ < 12; gr_++) {
        var grAng = (gr_ / 12) * Math.PI * 2;
        var grX = Math.cos(grAng) * 14;
        var grY = Math.sin(grAng) * 9 + 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(grAng) * 8, Math.sin(grAng) * 5 + 4);
        ctx.lineTo(grX, grY);
        ctx.stroke();
      }
      ctx.lineWidth = 0.5;
      [[-22, -2], [22, 2], [-18, 18]].forEach(function(c){
        ctx.fillStyle = PAPER_BG;
        ctx.beginPath();
        ctx.moveTo(c[0], c[1] - 2);
        ctx.lineTo(c[0] + 1, c[1]);
        ctx.lineTo(c[0], c[1] + 2);
        ctx.lineTo(c[0] - 1, c[1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore(); return;
    }

    // ─── VALKREST — paliçada + tendas + bandeira águia + fogueira ────
    if (b.key === 'valkrest') {
      ctx.lineWidth = 0.85;
      ctx.lineWidth = 0.6;
      for (var ps = 0; ps < 14; ps++) {
        var psAng = -Math.PI * 0.85 + ps * (Math.PI * 1.7 / 14);
        var psR = 22;
        var psX = Math.cos(psAng) * psR;
        var psY = Math.sin(psAng) * psR * 0.55 + 8;
        ctx.beginPath();
        ctx.moveTo(psX, psY + 4);
        ctx.lineTo(psX, psY - 3);
        ctx.lineTo(psX + 0.6, psY - 5);
        ctx.lineTo(psX + 1.2, psY - 3);
        ctx.lineTo(psX + 1.2, psY + 4);
        ctx.stroke();
      }
      ctx.lineWidth = 0.85;
      var t1X = -8, t1Y = 6;
      ctx.beginPath();
      ctx.moveTo(t1X - 8, t1Y + 6);
      ctx.lineTo(t1X - 6, t1Y - 8);
      ctx.lineTo(t1X + 6, t1Y - 8);
      ctx.lineTo(t1X + 8, t1Y + 6);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(t1X - 6, t1Y - 8); ctx.lineTo(t1X + 6, t1Y - 8);
      ctx.stroke();
      ctx.fillStyle = INK_DARK;
      ctx.beginPath();
      ctx.moveTo(t1X - 2, t1Y + 6);
      ctx.lineTo(t1X - 2, t1Y - 4);
      ctx.lineTo(t1X + 2, t1Y - 4);
      ctx.lineTo(t1X + 2, t1Y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(t1X - 6, t1Y - 8); ctx.lineTo(t1X - 12, t1Y + 6);
      ctx.moveTo(t1X + 6, t1Y - 8); ctx.lineTo(t1X + 12, t1Y + 6);
      ctx.stroke();
      ctx.lineWidth = 0.85;
      var t2X = 12, t2Y = 8;
      ctx.beginPath();
      ctx.moveTo(t2X - 5, t2Y + 4);
      ctx.lineTo(t2X - 4, t2Y - 5);
      ctx.lineTo(t2X + 4, t2Y - 5);
      ctx.lineTo(t2X + 5, t2Y + 4);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = INK_DARK;
      ctx.beginPath();
      ctx.moveTo(t2X - 1.2, t2Y + 4);
      ctx.lineTo(t2X - 1.2, t2Y - 2);
      ctx.lineTo(t2X + 1.2, t2Y - 2);
      ctx.lineTo(t2X + 1.2, t2Y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, 4); ctx.lineTo(0, -16);
      ctx.stroke();
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(10, -15);
      ctx.lineTo(11, -10);
      ctx.lineTo(0, -10);
      ctx.closePath();
      ctx.stroke();
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(2, -13); ctx.lineTo(5, -14); ctx.lineTo(7, -13); ctx.lineTo(9, -14);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(5, -14); ctx.lineTo(5, -12);
      ctx.stroke();
      ctx.fillStyle = INK_DARK;
      ctx.beginPath();
      ctx.arc(5, -14.5, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 0.6;
      var vfX = 0, vfY = 16;
      ctx.beginPath();
      ctx.moveTo(vfX - 3, vfY + 1);
      ctx.lineTo(vfX - 1, vfY - 3);
      ctx.lineTo(vfX, vfY - 1);
      ctx.lineTo(vfX + 1, vfY - 3);
      ctx.lineTo(vfX + 3, vfY + 1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(vfX - 4, vfY + 2); ctx.lineTo(vfX + 4, vfY + 2);
      ctx.moveTo(vfX - 3, vfY + 1); ctx.lineTo(vfX + 3, vfY + 3);
      ctx.stroke();
      ctx.restore(); return;
    }
    // === END PER-KEY UNIQUE PICTOGRAMS ===========================

    if (b.biome === 'plains' || b.key === 'plains') {
      // 2026-06-21 (user "exclua o desenho vetorial da cidade"): o CASTELO VETORIAL
      // procedural da cidade foi REMOVIDO. A cartografia mostra SÓ a imagem OpenAI
      // (plains.webp via _drawLocArt). Este pictograma causava o "desenho antigo"
      // que o user via (flash antes da webp carregar / file://). Não desenha nada.
      ctx.restore(); return;
      // [CASTELO DE VALDORIA legado abaixo — código morto, mantido só como referência]
      // muralha com crenelações + portão arqueado + 3 casas no entorno.
      // Look: vista 3/4 medieval, elementos com volume via hatching.
      // Casas pequenas atrás (3 com telhado triangular)
      ctx.lineWidth = 0.7;
      var houses = [[-22, 14, 0.85], [22, 12, 0.9], [-26, 4, 0.75]];
      houses.forEach(function(h){
        var hx = h[0], hy = h[1], sc = h[2];
        // Corpo
        ctx.beginPath();
        ctx.rect(hx - 4*sc, hy - 2*sc, 8*sc, 5*sc);
        ctx.stroke();
        // Telhado
        ctx.beginPath();
        ctx.moveTo(hx - 5*sc, hy - 2*sc);
        ctx.lineTo(hx, hy - 6*sc);
        ctx.lineTo(hx + 5*sc, hy - 2*sc);
        ctx.closePath();
        ctx.stroke();
        // Janela
        ctx.fillStyle = INK_DARK;
        ctx.beginPath();
        ctx.rect(hx - 0.8, hy - 0.5, 1.6, 1.6);
        ctx.fill();
      });
      ctx.lineWidth = 0.9;
      // MURALHA frontal (com volume — face frontal + topo em 3/4)
      ctx.fillStyle = PAPER_BG;
      ctx.beginPath();
      ctx.rect(-18, 4, 36, 12);
      ctx.fill();
      ctx.stroke();
      // Crenelações no topo da muralha
      for (var cn = 0; cn < 9; cn++) {
        var cnx = -18 + cn * 4;
        ctx.beginPath();
        ctx.rect(cnx, 2, 2, 2);
        ctx.fillStyle = PAPER_BG;
        ctx.fill();
        ctx.stroke();
      }
      // Hatching vertical na muralha (textura de pedra)
      ctx.lineWidth = 0.35;
      for (var sx_ = -16; sx_ < 18; sx_ += 4) {
        ctx.beginPath();
        ctx.moveTo(sx_, 4); ctx.lineTo(sx_, 16);
        ctx.stroke();
      }
      ctx.lineWidth = 0.9;
      // Portão arco
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(-3, 16);
      ctx.lineTo(-3, 10);
      ctx.bezierCurveTo(-3, 6, 3, 6, 3, 10);
      ctx.lineTo(3, 16);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      // 2 TORRES LATERAIS (com volume)
      [[-20, 14], [20, 14]].forEach(function(t){
        var tx = t[0], ty = t[1];
        // Corpo da torre (face frontal)
        ctx.fillStyle = PAPER_BG;
        ctx.beginPath();
        ctx.rect(tx - 4, ty - 16, 8, 20);
        ctx.fill();
        ctx.stroke();
        // Lado em sombra (paralelogramo direito)
        ctx.beginPath();
        ctx.moveTo(tx + 4, ty - 16);
        ctx.lineTo(tx + 6, ty - 14);
        ctx.lineTo(tx + 6, ty + 4);
        ctx.lineTo(tx + 4, ty + 4);
        ctx.closePath();
        ctx.fillStyle = INK_DARK;
        ctx.globalAlpha = 0.18;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
        // Telhado cônico
        ctx.beginPath();
        ctx.moveTo(tx - 5, ty - 16);
        ctx.lineTo(tx, ty - 23);
        ctx.lineTo(tx + 5, ty - 16);
        ctx.closePath();
        ctx.stroke();
        // Janela
        ctx.fillStyle = INK_DARK;
        ctx.beginPath();
        ctx.rect(tx - 0.8, ty - 11, 1.6, 2.5);
        ctx.fill();
      });
      // TORRE CENTRAL alta (Donjon) com VOLUME
      var ttx = 0, tty = 0;
      // Corpo principal (frontal)
      ctx.fillStyle = PAPER_BG;
      ctx.beginPath();
      ctx.rect(ttx - 5, tty - 22, 10, 26);
      ctx.fill();
      ctx.stroke();
      // Lado em sombra
      ctx.beginPath();
      ctx.moveTo(ttx + 5, tty - 22);
      ctx.lineTo(ttx + 8, tty - 19);
      ctx.lineTo(ttx + 8, tty + 4);
      ctx.lineTo(ttx + 5, tty + 4);
      ctx.closePath();
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.22;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      // Crenelações no topo
      for (var ct = 0; ct < 4; ct++) {
        ctx.beginPath();
        ctx.rect(ttx - 5 + ct * 2.7, tty - 24, 1.8, 2);
        ctx.fillStyle = PAPER_BG;
        ctx.fill();
        ctx.stroke();
      }
      // Janelas (3 verticais)
      ctx.fillStyle = INK_DARK;
      for (var wd = 0; wd < 3; wd++) {
        ctx.beginPath();
        ctx.rect(ttx - 0.8, tty - 18 + wd * 5, 1.6, 2.5);
        ctx.fill();
      }
      // Bandeira do reino
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(ttx, tty - 24);
      ctx.lineTo(ttx, tty - 30);
      ctx.lineTo(ttx + 5, tty - 28);
      ctx.lineTo(ttx, tty - 27);
      ctx.stroke();
      ctx.lineWidth = 0.9;
    } else if (b.biome === 'forest' || b.key === 'forest') {
      // FLORESTA AAA — mistura: 4 carvalhos com canopy round + 3 pinheiros
      // altos + 1 árvore destacada + chão com sombras + 2 cogumelos.
      // Hierarquia: árvore central grande dominante.
      // Sombras no chão (manchas elípticas leves)
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.10;
      var groundShadows = [[-18, 18, 12], [4, 18, 14], [22, 18, 10]];
      groundShadows.forEach(function(s){
        ctx.beginPath();
        ctx.ellipse(s[0], s[1], s[2], s[2]*0.3, 0, 0, Math.PI*2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      // Pinheiros altos no fundo (3)
      var pines = [[-24, 14, 0.85], [16, 14, 0.95], [26, 16, 0.75]];
      pines.forEach(function(p){
        var px = p[0], py = p[1], sc = p[2];
        // Tronco com volume (2 linhas paralelas)
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(px - 0.8, py); ctx.lineTo(px - 0.8, py - 2*sc);
        ctx.moveTo(px + 0.8, py); ctx.lineTo(px + 0.8, py - 2*sc);
        ctx.stroke();
        ctx.lineWidth = 0.9;
        // 4 níveis de pinha com PREENCHIMENTO sutil
        for (var lv = 0; lv < 4; lv++) {
          var ly = py - lv*5*sc - 2*sc;
          var lw = (6 - lv*1.1) * sc;
          ctx.beginPath();
          ctx.moveTo(px - lw, ly);
          ctx.lineTo(px, ly - 5*sc);
          ctx.lineTo(px + lw, ly);
          ctx.closePath();
          ctx.fillStyle = PAPER_BG;
          ctx.fill();
          ctx.stroke();
        }
      });
      // Carvalhos (3 com canopy round texturada)
      var oaks = [[-12, 16, 1.1], [8, 16, 1.0], [-2, 18, 0.85]];
      oaks.forEach(function(o, oi){
        var ox = o[0], oy = o[1], sc = o[2];
        // Tronco (2 linhas + ramificação)
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(ox - 1, oy); ctx.lineTo(ox - 1, oy - 5*sc);
        ctx.moveTo(ox + 1, oy); ctx.lineTo(ox + 1, oy - 5*sc);
        ctx.stroke();
        // Canopy (cluster de bolhas — 3-5 círculos sobrepostos)
        ctx.lineWidth = 0.7;
        var cR = 5 * sc;
        ctx.fillStyle = PAPER_BG;
        ctx.beginPath();
        ctx.arc(ox, oy - 5*sc - cR, cR, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        // Bolhas adicionais (4) ao redor pra textura
        var bubbles = [[-cR*0.7, -cR*0.4, cR*0.6], [cR*0.7, -cR*0.4, cR*0.6],
                       [0, -cR*1.0, cR*0.5], [-cR*0.4, cR*0.2, cR*0.45], [cR*0.4, cR*0.2, cR*0.45]];
        bubbles.forEach(function(bub){
          ctx.beginPath();
          ctx.arc(ox + bub[0], oy - 5*sc - cR + bub[1], bub[2], 0, Math.PI*2);
          ctx.fillStyle = PAPER_BG;
          ctx.fill();
          ctx.stroke();
        });
        // Hatching diagonal do lado direito (sombra)
        ctx.lineWidth = 0.3;
        ctx.globalAlpha = 0.5;
        for (var hh2 = 0; hh2 < 4; hh2++) {
          ctx.beginPath();
          ctx.moveTo(ox + cR*0.2, oy - 5*sc - cR*1.4 + hh2*1.2);
          ctx.lineTo(ox + cR*1.2, oy - 5*sc - cR*0.5 + hh2*1.2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.lineWidth = 0.9;
      });
      // Cogumelos pequenos (2 detalhes)
      ctx.lineWidth = 0.6;
      [[-26, 22], [22, 22]].forEach(function(m){
        ctx.beginPath();
        ctx.moveTo(m[0], m[1]); ctx.lineTo(m[0], m[1] - 1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(m[0], m[1] - 1.5, 1.2, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = INK_DARK;
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      ctx.lineWidth = 0.9;
    } else if (b.biome === 'cave' || b.key === 'cave') {
      // CAVERNA REWRITE 2026-05-04 — montanha rochosa com entrada de
      // caverna em 3/4 vista, estalactites pendentes, escadinha de pedras
      // descendo, lanterna acesa pendurada, morcegos voando.
      // MONTANHA HOSPEDEIRA (cone irregular com volume)
      ctx.fillStyle = '#5a4836';
      ctx.globalAlpha = 0.30;
      ctx.beginPath();
      ctx.moveTo(-26, 22);
      ctx.lineTo(-20, 6);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-2, -16);
      ctx.lineTo(8, -10);
      ctx.lineTo(18, 0);
      ctx.lineTo(26, 22);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-26, 22);
      ctx.lineTo(-20, 6);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-2, -16);
      ctx.lineTo(8, -10);
      ctx.lineTo(18, 0);
      ctx.lineTo(26, 22);
      ctx.stroke();
      // Hatching denso na lateral direita (sombra da rocha)
      ctx.lineWidth = 0.3;
      ctx.globalAlpha = 0.5;
      for (var hc = 0; hc < 6; hc++) {
        ctx.beginPath();
        ctx.moveTo(2 + hc * 3, -6 + hc * 2);
        ctx.lineTo(20 + hc * 1, 22);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.9;
      // ENTRADA DA CAVERNA (arco GRANDE escuro com profundidade)
      // Performance tier guard: lite usa flat dark, medium/full usa gradient
      var _renderDetail = (window._renderDetail !== undefined) ? window._renderDetail : 2;
      var caveGrad;
      if (_renderDetail >= 1) {
        caveGrad = ctx.createRadialGradient(0, 8, 2, 0, 8, 14);
        caveGrad.addColorStop(0, 'rgba(0,0,0,0.95)');
        caveGrad.addColorStop(0.5, 'rgba(0,0,0,0.7)');
        caveGrad.addColorStop(1, 'rgba(20,15,10,0.45)');
      } else {
        caveGrad = 'rgba(0,0,0,0.85)'; // flat fallback
      }
      ctx.save();
      ctx.fillStyle = caveGrad;
      ctx.beginPath();
      ctx.moveTo(-9, 22);
      ctx.lineTo(-9, 8);
      ctx.bezierCurveTo(-9, -2, 9, -2, 9, 8);
      ctx.lineTo(9, 22);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Contorno da entrada (mais grosso + jitter hand-drawn)
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-9, 22);
      ctx.lineTo(-9.5, 14);
      ctx.lineTo(-9, 8);
      ctx.bezierCurveTo(-9, -1, 9, -1, 9, 8);
      ctx.lineTo(9.5, 14);
      ctx.lineTo(9, 22);
      ctx.stroke();
      ctx.lineWidth = 0.9;
      // ESTALACTITES PENDENTES (4, com perspectiva — frontal + lateral em sombra)
      var stals = [[-6, 1.0], [-2, 0.7], [2, 1.0], [6, 0.8]];
      stals.forEach(function(st){
        var stx = st[0], stsc = st[1];
        // Estalactite (triângulo invertido + linha lateral)
        ctx.fillStyle = '#3a2410';
        ctx.beginPath();
        ctx.moveTo(stx - 1.4*stsc, 1);
        ctx.lineTo(stx, 1 + 5*stsc);
        ctx.lineTo(stx + 1.4*stsc, 1);
        ctx.closePath();
        ctx.fill();
        // Sombra lateral
        ctx.fillStyle = INK_DARK;
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.moveTo(stx, 1);
        ctx.lineTo(stx, 1 + 5*stsc);
        ctx.lineTo(stx + 1.4*stsc, 1);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      // ESCADA DE PEDRAS na entrada (3 degraus)
      ctx.fillStyle = '#5a4836';
      ctx.globalAlpha = 0.7;
      [[-7, 16], [-5, 18], [-3, 20]].forEach(function(stp){
        ctx.beginPath();
        ctx.rect(stp[0], stp[1], 14, 1.8);
        ctx.fill();
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.9;
      // LANTERNA pendurada na entrada (luz amarela sutil)
      var lnx = -10, lny = 4;
      // Cabo
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(lnx, 2); ctx.lineTo(lnx, lny - 2);
      ctx.stroke();
      // Corpo da lanterna
      ctx.fillStyle = '#3a2410';
      ctx.beginPath();
      ctx.rect(lnx - 1.5, lny - 2, 3, 3);
      ctx.fill();
      // Luz emanando (radial)
      // Performance tier guard: lite usa flat amarelo, medium/full usa radial glow
      var _renderDetail = (window._renderDetail !== undefined) ? window._renderDetail : 2;
      if (_renderDetail >= 1) {
        var lampGrad = ctx.createRadialGradient(lnx, lny, 0.5, lnx, lny, 8);
        lampGrad.addColorStop(0, 'rgba(255,200,100,0.65)');
        lampGrad.addColorStop(1, 'rgba(255,200,100,0)');
        ctx.fillStyle = lampGrad;
      } else {
        ctx.fillStyle = 'rgba(255,200,100,0.25)'; // flat fallback (lite)
      }
      ctx.beginPath();
      ctx.arc(lnx, lny, 8, 0, Math.PI*2);
      ctx.fill();
      // Vidro da lanterna (point bright)
      ctx.fillStyle = '#ffd870';
      ctx.beginPath();
      ctx.arc(lnx, lny - 0.5, 0.6, 0, Math.PI*2);
      ctx.fill();
      ctx.lineWidth = 0.9;
      // 2 MORCEGOS voando saindo da caverna
      ctx.lineWidth = 0.5;
      ctx.fillStyle = INK_DARK;
      [[-14, -4], [12, -2]].forEach(function(bt){
        var btx = bt[0], bty = bt[1];
        // Asa direita
        ctx.beginPath();
        ctx.moveTo(btx, bty);
        ctx.quadraticCurveTo(btx + 1, bty - 1, btx + 2, bty);
        ctx.quadraticCurveTo(btx + 3.5, bty + 0.5, btx + 4, bty - 0.5);
        ctx.stroke();
        // Asa esquerda
        ctx.beginPath();
        ctx.moveTo(btx, bty);
        ctx.quadraticCurveTo(btx - 1, bty - 1, btx - 2, bty);
        ctx.quadraticCurveTo(btx - 3.5, bty + 0.5, btx - 4, bty - 0.5);
        ctx.stroke();
        // Corpo
        ctx.beginPath();
        ctx.arc(btx, bty + 0.3, 0.6, 0, Math.PI*2);
        ctx.fill();
      });
      ctx.lineWidth = 0.9;
      // Pedras avulsas na frente da entrada (textura)
      [[-14, 23, 3], [14, 22, 2.5]].forEach(function(rk){
        ctx.lineWidth = 0.6;
        ctx.fillStyle = '#5a4836';
        ctx.beginPath();
        ctx.moveTo(rk[0] - rk[2], rk[1]);
        ctx.lineTo(rk[0] - rk[2]*0.4, rk[1] - rk[2]*0.7);
        ctx.lineTo(rk[0] + rk[2]*0.5, rk[1] - rk[2]*0.6);
        ctx.lineTo(rk[0] + rk[2], rk[1] - rk[2]*0.1);
        ctx.lineTo(rk[0] + rk[2]*0.3, rk[1] + rk[2]*0.4);
        ctx.lineTo(rk[0] - rk[2]*0.4, rk[1] + rk[2]*0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 0.9;
      });
    } else if (b.key === 'swamp' || b.biome === 'swamp') {
      // PÂNTANO AAA — poças orgânicas (não elipses) + lily pads + árvore
      // morta com galhos torcidos detalhados + juncos altos + neblina sutil.
      // Poças orgânicas com hatching de água
      var pools2 = [[-15, -2, 11], [10, 4, 13], [-6, 14, 9], [18, 16, 8]];
      pools2.forEach(function(po, pi){
        // Forma irregular (Bezier)
        ctx.fillStyle = '#6a7a4a';
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.moveTo(po[0] - po[2], po[1]);
        ctx.bezierCurveTo(po[0] - po[2], po[1] - po[2]*0.5,
                          po[0] - po[2]*0.3, po[1] - po[2]*0.6,
                          po[0] + po[2]*0.5, po[1] - po[2]*0.4);
        ctx.bezierCurveTo(po[0] + po[2], po[1] - po[2]*0.2,
                          po[0] + po[2]*1.1, po[1] + po[2]*0.4,
                          po[0] + po[2]*0.4, po[1] + po[2]*0.5);
        ctx.bezierCurveTo(po[0] - po[2]*0.2, po[1] + po[2]*0.6,
                          po[0] - po[2]*1.1, po[1] + po[2]*0.3,
                          po[0] - po[2], po[1]);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 0.7;
        ctx.stroke();
        // Hatching de água (3 ondulações dentro)
        ctx.lineWidth = 0.4;
        for (var w_ = 0; w_ < 3; w_++) {
          var wy_ = po[1] - po[2]*0.2 + w_*po[2]*0.2;
          ctx.beginPath();
          ctx.moveTo(po[0] - po[2]*0.7, wy_);
          ctx.bezierCurveTo(po[0] - po[2]*0.3, wy_ + 0.6,
                            po[0] + po[2]*0.3, wy_ - 0.6,
                            po[0] + po[2]*0.7, wy_);
          ctx.stroke();
        }
        ctx.lineWidth = 0.9;
        // Lily pad (1 por poça, 50% chance)
        if (pi % 2 === 0) {
          var lpx = po[0] + (rng()-0.5)*po[2];
          var lpy = po[1] + (rng()-0.5)*po[2]*0.4;
          ctx.fillStyle = INK_DARK;
          ctx.globalAlpha = 0.55;
          ctx.beginPath();
          ctx.ellipse(lpx, lpy, 2, 1.3, rng()*Math.PI, 0, Math.PI*2);
          ctx.fill();
          // Notch da folha
          ctx.fillStyle = PAPER_BG;
          ctx.beginPath();
          ctx.moveTo(lpx, lpy);
          ctx.lineTo(lpx + 1, lpy + 0.5);
          ctx.lineTo(lpx + 1.5, lpy);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      });
      // ÁRVORE MORTA grande com galhos torcidos (estilo Burton)
      ctx.lineWidth = 1.1;
      // Tronco
      ctx.beginPath();
      ctx.moveTo(-22, 14);
      ctx.bezierCurveTo(-23, 6, -21, -2, -22, -10);
      ctx.stroke();
      // Galho principal direito
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-22, -2);
      ctx.bezierCurveTo(-19, -4, -16, -6, -14, -10);
      ctx.stroke();
      ctx.lineWidth = 0.5;
      // Sub-galhos do principal
      ctx.beginPath();
      ctx.moveTo(-17, -7); ctx.lineTo(-15, -10);
      ctx.moveTo(-19, -5); ctx.lineTo(-18, -8);
      ctx.stroke();
      // Galho esquerdo
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-22, -5);
      ctx.bezierCurveTo(-25, -7, -27, -9, -28, -12);
      ctx.stroke();
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-26, -10); ctx.lineTo(-27, -12);
      ctx.stroke();
      // Galhos finais no topo
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-22, -10); ctx.lineTo(-24, -13);
      ctx.moveTo(-22, -10); ctx.lineTo(-20, -14);
      ctx.moveTo(-22, -10); ctx.lineTo(-22, -14);
      ctx.stroke();
      ctx.lineWidth = 0.9;
      // Juncos altos (8 verticais variados)
      ctx.lineWidth = 0.5;
      for (var rd = 0; rd < 10; rd++) {
        var jx = (rng() - 0.5) * 60;
        var jy = (rng() - 0.5) * 50;
        var jh = 3 + rng() * 4;
        // Junco com leve curvatura
        ctx.beginPath();
        ctx.moveTo(jx, jy);
        ctx.quadraticCurveTo(jx + (rng()-0.5)*0.8, jy - jh*0.5, jx, jy - jh);
        ctx.stroke();
        // Topo (espigueta)
        ctx.beginPath();
        ctx.arc(jx, jy - jh, 0.4, 0, Math.PI*2);
        ctx.fillStyle = INK_DARK;
        ctx.fill();
      }
      ctx.lineWidth = 0.9;
      // Neblina sutil (3 linhas onduladas levíssimas)
      ctx.strokeStyle = INK_LIGHT;
      ctx.lineWidth = 0.4;
      ctx.globalAlpha = 0.4;
      for (var fg = 0; fg < 3; fg++) {
        var fy = -22 + fg * 4;
        ctx.beginPath();
        ctx.moveTo(-30, fy);
        ctx.bezierCurveTo(-15, fy - 1, 0, fy + 1, 15, fy - 0.5);
        ctx.bezierCurveTo(25, fy + 0.5, 30, fy - 1, 35, fy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = INK_DARK;
      ctx.lineWidth = 0.9;
    } else if (b.biome === 'mountain' || b.key === 'mountain') {
      // MONTANHAS AAA — 5 picos com VOLUME 3D real (lado claro + sombra
      // triangular hatched), pico central destacado, snowcaps com curva
      // detalhada, estrada serpenteando, hatching de rocha denso.
      var peakXs2 = [-22, -10, 0, 12, 22];
      var peakHts2 = [16, 22, 14, 20, 12];
      // Renderizar de trás pra frente (z-order)
      for (var pi2 = 0; pi2 < 5; pi2++) {
        var mx = peakXs2[pi2], mh = peakHts2[pi2], my = 14;
        // Lado claro (esquerdo) — preenchido com paper
        ctx.fillStyle = PAPER_BG;
        ctx.beginPath();
        ctx.moveTo(mx - mh*0.6, my);
        ctx.lineTo(mx, my - mh);
        ctx.lineTo(mx, my);
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = 0.85;
        ctx.stroke();
        // Lado em sombra (direito) — preenchimento + hatching denso
        ctx.beginPath();
        ctx.moveTo(mx, my - mh);
        ctx.lineTo(mx + mh*0.6, my);
        ctx.lineTo(mx, my);
        ctx.closePath();
        ctx.fillStyle = INK_DARK;
        ctx.globalAlpha = 0.20;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
        // Hatching denso no lado escuro (textura de rocha)
        ctx.lineWidth = 0.3;
        ctx.globalAlpha = 0.55;
        for (var hh3 = 0; hh3 < 5; hh3++) {
          var t2 = 0.2 + hh3*0.15;
          ctx.beginPath();
          ctx.moveTo(mx + 1, my - mh*(1-t2));
          ctx.lineTo(mx + mh*0.55, my - mh*0.05);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.lineWidth = 0.85;
        // Snowcap com curva detalhada (não zigzag — agora bezier)
        ctx.fillStyle = PAPER_BG;
        ctx.beginPath();
        ctx.moveTo(mx - mh*0.22, my - mh*0.55);
        ctx.bezierCurveTo(mx - mh*0.10, my - mh*0.62, mx + mh*0.10, my - mh*0.62, mx + mh*0.22, my - mh*0.55);
        ctx.lineTo(mx + mh*0.05, my - mh*0.85);
        ctx.lineTo(mx, my - mh);
        ctx.lineTo(mx - mh*0.05, my - mh*0.85);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Linha de detalhe na neve (textura)
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(mx - mh*0.18, my - mh*0.58);
        ctx.bezierCurveTo(mx - mh*0.08, my - mh*0.65, mx + mh*0.08, my - mh*0.65, mx + mh*0.18, my - mh*0.58);
        ctx.stroke();
        ctx.lineWidth = 0.9;
      }
      // Estrada serpenteante subindo o pico central
      ctx.strokeStyle = INK_MED;
      ctx.lineWidth = 0.7;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(-8, 16);
      ctx.bezierCurveTo(-6, 12, -3, 10, -1, 6);
      ctx.bezierCurveTo(1, 4, 0, 0, -1, -4);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = INK_DARK;
      ctx.lineWidth = 0.9;
    } else if (b.biome === 'desert' || b.key === 'desert') {
      // DESERTO AAA — pirâmide GIZA com textura de blocos, 2 menores em
      // escala, dunas onduladas com crests, sol com face medieval estilizada,
      // pequeno oásis com 2 palmeiras.
      // Dunas de fundo (3 ondas no horizonte com gradação)
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = 0.55;
      for (var dn = 0; dn < 3; dn++) {
        var dy_ = -18 + dn*4;
        ctx.beginPath();
        ctx.moveTo(-r, dy_);
        ctx.bezierCurveTo(-15, dy_ - 3, -5, dy_ + 1, 5, dy_ - 1);
        ctx.bezierCurveTo(15, dy_ + 2, 25, dy_ - 1, r*0.8, dy_);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Sol estilizado medieval (face sutil)
      ctx.lineWidth = 0.7;
      ctx.fillStyle = PAPER_BG;
      ctx.beginPath();
      ctx.arc(20, -22, 5, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
      // Raios alternados (longos+curtos, 12 total)
      for (var sr = 0; sr < 12; sr++) {
        var sa = sr * Math.PI / 6;
        var slen = sr % 2 === 0 ? 10 : 7;
        ctx.beginPath();
        ctx.moveTo(20 + Math.cos(sa) * 7, -22 + Math.sin(sa) * 7);
        ctx.lineTo(20 + Math.cos(sa) * slen, -22 + Math.sin(sa) * slen);
        ctx.stroke();
      }
      // Face do sol (olhos + boca sutil)
      ctx.fillStyle = INK_DARK;
      ctx.beginPath();
      ctx.arc(18.5, -23, 0.5, 0, Math.PI*2);
      ctx.arc(21.5, -23, 0.5, 0, Math.PI*2);
      ctx.fill();
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.arc(20, -21.5, 1.2, 0.2*Math.PI, 0.8*Math.PI);
      ctx.stroke();
      ctx.lineWidth = 0.9;
      // PIRÂMIDE PRINCIPAL (com textura de blocos de pedra)
      ctx.fillStyle = PAPER_BG;
      // Face frontal
      ctx.beginPath();
      ctx.moveTo(-12, 18);
      ctx.lineTo(-2, 0);
      ctx.lineTo(0, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Face lateral (sombra)
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(14, 18);
      ctx.lineTo(0, 18);
      ctx.closePath();
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.20;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      // Textura de blocos (linhas horizontais espaçadas em ambas as faces)
      ctx.lineWidth = 0.3;
      ctx.globalAlpha = 0.5;
      // Frontal (5 níveis)
      for (var bl = 1; bl <= 4; bl++) {
        var bly = 0 + bl * 4.5;
        var blx1 = -2 - (bl/4) * 10;
        var blx2 = 0 - (bl/4) * 0;
        ctx.beginPath();
        ctx.moveTo(blx1, bly); ctx.lineTo(blx2, bly);
        ctx.stroke();
      }
      // Lateral (sombra)
      for (var bl2 = 1; bl2 <= 4; bl2++) {
        var bly2 = 0 + bl2 * 4.5;
        var blx21 = -2 + (bl2/4) * 16;
        var blx22 = 0 + (bl2/4) * 0;
        ctx.beginPath();
        ctx.moveTo(blx21, bly2); ctx.lineTo(blx22, bly2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.9;
      // Pirâmide menor à direita (mesma técnica simplificada)
      ctx.fillStyle = PAPER_BG;
      ctx.beginPath();
      ctx.moveTo(8, 18); ctx.lineTo(14, 8); ctx.lineTo(15, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(14, 8); ctx.lineTo(22, 18); ctx.lineTo(15, 18);
      ctx.closePath();
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.20;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      // Oásis com palmeira (canto esquerdo)
      // Poça
      ctx.fillStyle = '#88a8c8';
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.ellipse(-26, 18, 5, 1.8, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.6;
      ctx.stroke();
      // 2 Palmeiras
      [[-28, 0.95], [-23, 0.85]].forEach(function(p){
        var px = p[0], sc = p[1];
        // Tronco curvado
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(px, 16);
        ctx.bezierCurveTo(px - 1*sc, 12, px + 1*sc, 8, px - 0.5*sc, 4);
        ctx.stroke();
        // Folhas (4 leques arqueados)
        ctx.lineWidth = 0.5;
        var leafs = [-1.2, -0.4, 0.4, 1.2];
        leafs.forEach(function(la){
          ctx.beginPath();
          ctx.moveTo(px - 0.5*sc, 4);
          ctx.bezierCurveTo(px - 0.5*sc + la*3*sc, 1, px - 0.5*sc + la*5*sc, 2, px - 0.5*sc + la*4*sc, 5);
          ctx.stroke();
        });
      });
      ctx.lineWidth = 0.9;
    } else if (b.biome === 'graveyard' || b.key === 'graveyard') {
      // CEMITÉRIO AAA — variedade de lápides (sarcófago, cruz celta, tumba
      // romana com inscrição), árvore retorcida grande, cripta no fundo,
      // caveira com sombra, neblina sutil.
      // Linha do chão com textura
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-r*1.1, 18); ctx.lineTo(r*1.1, 18);
      ctx.stroke();
      // Hatching no chão (relva curta)
      for (var gh_ = 0; gh_ < 14; gh_++) {
        var ghx = -r*1.1 + gh_ * (r*2.2/14) + (rng()-0.5)*1.5;
        ctx.beginPath();
        ctx.moveTo(ghx, 18); ctx.lineTo(ghx, 19 + rng()*1);
        ctx.stroke();
      }
      ctx.lineWidth = 0.85;
      // CRIPTA pequena no fundo (estilo mausoléu romano)
      ctx.fillStyle = PAPER_BG;
      // Base + colunas
      ctx.beginPath();
      ctx.rect(8, 6, 14, 12);
      ctx.fill();
      ctx.stroke();
      // 2 colunas
      ctx.lineWidth = 0.5;
      [10, 20].forEach(function(cx){
        ctx.beginPath();
        ctx.rect(cx - 0.8, 8, 1.6, 8);
        ctx.fillStyle = PAPER_BG;
        ctx.fill();
        ctx.stroke();
      });
      ctx.lineWidth = 0.85;
      // Fronton triangular
      ctx.fillStyle = PAPER_BG;
      ctx.beginPath();
      ctx.moveTo(8, 6); ctx.lineTo(15, 1); ctx.lineTo(22, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Lado em sombra (paralelogramo)
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.moveTo(22, 6); ctx.lineTo(24, 8); ctx.lineTo(24, 18); ctx.lineTo(22, 18);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      // Porta da cripta
      ctx.fillStyle = INK_DARK;
      ctx.beginPath();
      ctx.rect(13, 11, 4, 7);
      ctx.fill();
      // Lápides variadas
      // 1) Cruz Celta com círculo (à esquerda)
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(-22, 14); ctx.lineTo(-22, 4);
      ctx.moveTo(-25, 9); ctx.lineTo(-19, 9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-22, 9, 2.2, 0, Math.PI*2);
      ctx.stroke();
      // Base
      ctx.fillStyle = PAPER_BG;
      ctx.beginPath();
      ctx.rect(-25, 14, 6, 4);
      ctx.fill();
      ctx.stroke();
      // 2) Tumba romana com inscrição
      ctx.fillStyle = PAPER_BG;
      ctx.beginPath();
      ctx.moveTo(-15, 14);
      ctx.lineTo(-15, 5);
      ctx.bezierCurveTo(-15, 2, -10, 2, -10, 5);
      ctx.lineTo(-10, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Inscrição (linhas horizontais)
      ctx.lineWidth = 0.3;
      [7, 9, 11].forEach(function(iy){
        ctx.beginPath();
        ctx.moveTo(-14, iy); ctx.lineTo(-11, iy);
        ctx.stroke();
      });
      // R.I.P (linhas mais curtas no topo)
      ctx.lineWidth = 0.85;
      // 3) Sarcófago (à direita da cruz celta)
      ctx.fillStyle = PAPER_BG;
      ctx.beginPath();
      ctx.rect(-7, 8, 8, 10);
      ctx.fill();
      ctx.stroke();
      // Tampa em perspectiva
      ctx.beginPath();
      ctx.moveTo(-7, 8); ctx.lineTo(-5, 6); ctx.lineTo(3, 6); ctx.lineTo(1, 8);
      ctx.closePath();
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.20;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      // 4) Cruz simples menor (entre tumba e sarcófago)
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(2, 14); ctx.lineTo(2, 6);
      ctx.moveTo(0, 9); ctx.lineTo(4, 9);
      ctx.stroke();
      ctx.lineWidth = 0.85;
      // ÁRVORE RETORCIDA grande (canto direito-fundo)
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(28, 18);
      ctx.bezierCurveTo(27, 10, 30, 4, 28, -2);
      ctx.stroke();
      ctx.lineWidth = 0.7;
      // Galhos torcidos
      ctx.beginPath();
      ctx.moveTo(28, 4);
      ctx.bezierCurveTo(31, 2, 32, -2, 30, -5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(28, 0);
      ctx.bezierCurveTo(25, -2, 23, -4, 26, -7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(28, -2);
      ctx.lineTo(28, -6);
      ctx.moveTo(28, -2);
      ctx.lineTo(31, -6);
      ctx.moveTo(30, -5);
      ctx.lineTo(31, -8);
      ctx.stroke();
      ctx.lineWidth = 0.85;
      // Caveira no chão (canto esquerdo) com sombra
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.ellipse(-28, 17.5, 3.5, 1, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Crânio
      ctx.fillStyle = PAPER_BG;
      ctx.beginPath();
      ctx.arc(-28, 14, 3, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
      // Mandíbula
      ctx.beginPath();
      ctx.moveTo(-30, 16); ctx.lineTo(-26, 16);
      ctx.stroke();
      // Olhos (escuros profundos)
      ctx.fillStyle = INK_DARK;
      ctx.beginPath();
      ctx.arc(-29, 13.8, 0.8, 0, Math.PI*2);
      ctx.arc(-27, 13.8, 0.8, 0, Math.PI*2);
      ctx.fill();
      // Dentes (3 verticais)
      ctx.lineWidth = 0.3;
      [-29, -28, -27].forEach(function(dx){
        ctx.beginPath();
        ctx.moveTo(dx, 16); ctx.lineTo(dx, 16.8);
        ctx.stroke();
      });
      ctx.lineWidth = 0.85;
      // Wisps fantasmagóricos sutis
      ctx.strokeStyle = INK_LIGHT;
      ctx.lineWidth = 0.4;
      ctx.globalAlpha = 0.5;
      [[-12, -10], [4, -12], [20, -10]].forEach(function(wp){
        ctx.beginPath();
        ctx.moveTo(wp[0], wp[1] + 5);
        ctx.bezierCurveTo(wp[0] - 1.5, wp[1] + 1, wp[0] + 1.5, wp[1] - 2, wp[0], wp[1] - 5);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.strokeStyle = INK_DARK;
      ctx.lineWidth = 0.9;
    } else if (b.biome === 'snow' || b.key === 'snow') {
      // TUNDRA DO NORTE AAA — picos de gelo com brilho azulado, aurora
      // boreal acima, flocos de 6 pontas (não 4), pinheiro congelado
      // dominante, cobertura de neve hatching.
      // Aurora boreal (3 ondas curvas longas no topo)
      ctx.strokeStyle = '#88c8e8';
      ctx.lineWidth = 0.7;
      ctx.globalAlpha = 0.5;
      for (var au = 0; au < 3; au++) {
        var ay = -28 + au * 3;
        ctx.beginPath();
        ctx.moveTo(-30, ay);
        ctx.bezierCurveTo(-15, ay - 4, 0, ay + 4, 15, ay - 2);
        ctx.bezierCurveTo(20, ay - 1, 25, ay - 3, 30, ay);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = INK_DARK;
      // Picos de gelo (5) com VOLUME 3D azulado
      var icePeakXs2 = [-24, -12, 0, 12, 24];
      var icePeakHts2 = [12, 18, 11, 14, 9];
      for (var ip = 0; ip < 5; ip++) {
        var ix = icePeakXs2[ip], ih = icePeakHts2[ip], iy = 16;
        // Lado claro
        ctx.fillStyle = '#e0eef6';
        ctx.beginPath();
        ctx.moveTo(ix - ih*0.5, iy);
        ctx.lineTo(ix, iy - ih);
        ctx.lineTo(ix, iy);
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = 0.85;
        ctx.stroke();
        // Lado escuro azulado
        ctx.beginPath();
        ctx.moveTo(ix, iy - ih);
        ctx.lineTo(ix + ih*0.5, iy);
        ctx.lineTo(ix, iy);
        ctx.closePath();
        ctx.fillStyle = '#88a8c8';
        ctx.globalAlpha = 0.30;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
        // Reflexo no pico (highlight)
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(ix - ih*0.18, iy - ih*0.55);
        ctx.lineTo(ix, iy - ih*0.7);
        ctx.lineTo(ix - ih*0.05, iy - ih*0.85);
        ctx.lineTo(ix, iy - ih);
        ctx.lineTo(ix - ih*0.10, iy - ih*0.85);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Pinheiro congelado dominante
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-26, 22); ctx.lineTo(-26, 18);
      ctx.stroke();
      ctx.lineWidth = 0.6;
      ctx.fillStyle = '#e0eef6';
      for (var pl = 0; pl < 3; pl++) {
        var ply = 18 - pl*3;
        var plw = 4 - pl;
        ctx.beginPath();
        ctx.moveTo(-26 - plw, ply);
        ctx.lineTo(-26, ply - 3);
        ctx.lineTo(-26 + plw, ply);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.lineWidth = 0.9;
      // Flocos de neve com 6 PONTAS (estrelas dêndríticas reais)
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = INK_DARK;
      for (var ff = 0; ff < 8; ff++) {
        var fx = (rng() - 0.5) * 60;
        var fy = -20 + rng() * 30;
        var fsz = 1.4 + rng() * 1.2;
        for (var fa = 0; fa < 6; fa++) {
          var fang = fa * Math.PI / 3;
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(fx + Math.cos(fang) * fsz, fy + Math.sin(fang) * fsz);
          ctx.stroke();
          // Pequenos braços laterais (nas pontas)
          ctx.beginPath();
          ctx.moveTo(fx + Math.cos(fang) * fsz * 0.6, fy + Math.sin(fang) * fsz * 0.6);
          ctx.lineTo(fx + Math.cos(fang + 0.5) * fsz * 0.4, fy + Math.sin(fang + 0.5) * fsz * 0.4);
          ctx.moveTo(fx + Math.cos(fang) * fsz * 0.6, fy + Math.sin(fang) * fsz * 0.6);
          ctx.lineTo(fx + Math.cos(fang - 0.5) * fsz * 0.4, fy + Math.sin(fang - 0.5) * fsz * 0.4);
          ctx.stroke();
        }
      }
      ctx.lineWidth = 0.9;
    } else if (b.biome === 'volcanic' || b.key === 'volcanic') {
      // VULCÃO REWRITE 2026-05-04 — silhueta dramática estilo Mt. Doom
      // (Tolkien). Cone alto e robusto + cratera ampla pulsante + 4 lava
      // flows reais com bifurcação + nuvem de fumaça grande retorcida +
      // poças de lava ardendo no chão + brasas voando + pico secundário.
      // PICO SECUNDÁRIO atrás (vista profundidade)
      ctx.fillStyle = '#3a2818';
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.moveTo(-26, 18);
      ctx.lineTo(-18, -2);
      ctx.lineTo(-12, -8);
      ctx.lineTo(-8, -2);
      ctx.lineTo(-4, 18);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-26, 18);
      ctx.lineTo(-18, -2);
      ctx.lineTo(-12, -8);
      ctx.lineTo(-8, -2);
      ctx.lineTo(-4, 18);
      ctx.stroke();
      // CONE PRINCIPAL — silhueta dramática (lados levemente côncavos)
      ctx.fillStyle = '#5a3020';
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(-22, 22);
      ctx.bezierCurveTo(-18, 10, -12, -2, -7, -12); // lateral esquerda côncava
      ctx.lineTo(-4, -15);
      ctx.lineTo(4, -15);
      ctx.lineTo(7, -12);
      ctx.bezierCurveTo(12, -2, 18, 10, 22, 22); // lateral direita
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-22, 22);
      ctx.bezierCurveTo(-18, 10, -12, -2, -7, -12);
      ctx.lineTo(-4, -15);
      ctx.lineTo(4, -15);
      ctx.lineTo(7, -12);
      ctx.bezierCurveTo(12, -2, 18, 10, 22, 22);
      ctx.stroke();
      ctx.lineWidth = 0.9;
      // SOMBRA do lado direito (preenchimento + hatching)
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.30;
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(4, -15);
      ctx.lineTo(7, -12);
      ctx.bezierCurveTo(12, -2, 18, 10, 22, 22);
      ctx.lineTo(0, 22);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.3;
      ctx.globalAlpha = 0.6;
      for (var vh = 0; vh < 8; vh++) {
        ctx.beginPath();
        ctx.moveTo(2 + vh * 1.5, -10 + vh * 4);
        ctx.lineTo(20 - vh * 0.8, 22);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.9;
      // CRATERA ampla com BORDAS irregulares (não elipse perfeita)
      ctx.fillStyle = '#c84030';
      ctx.beginPath();
      ctx.moveTo(-7, -15);
      ctx.bezierCurveTo(-5, -17, 0, -17, 4, -16);
      ctx.bezierCurveTo(7, -15, 7, -13, 4, -12);
      ctx.bezierCurveTo(0, -11, -3, -12, -7, -13);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // GLOW VULCÂNICO grande (radial, alaranjado intenso)
      // Performance tier guard: lite usa flat alaranjado, medium/full usa radial
      var _renderDetail = (window._renderDetail !== undefined) ? window._renderDetail : 2;
      if (_renderDetail >= 1) {
        var lavaCoreGrad = ctx.createRadialGradient(-2, -14, 1, -2, -14, 14);
        lavaCoreGrad.addColorStop(0, 'rgba(255,200,100,0.8)');
        lavaCoreGrad.addColorStop(0.5, 'rgba(255,120,40,0.4)');
        lavaCoreGrad.addColorStop(1, 'rgba(255,80,0,0)');
        ctx.fillStyle = lavaCoreGrad;
      } else {
        ctx.fillStyle = 'rgba(255,150,60,0.4)'; // flat fallback (lite)
      }
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(-2, -14, 14, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // 4 LAVA FLOWS descendo (curvas naturais, com bifurcação no flow central)
      ctx.strokeStyle = '#e85020';
      ctx.lineWidth = 1.6;
      // Flow 1 — esquerda principal
      ctx.beginPath();
      ctx.moveTo(-5, -14);
      ctx.bezierCurveTo(-7, -8, -10, -2, -8, 6);
      ctx.bezierCurveTo(-10, 14, -14, 18, -16, 22);
      ctx.stroke();
      // Flow 2 — direita principal
      ctx.beginPath();
      ctx.moveTo(2, -14);
      ctx.bezierCurveTo(4, -6, 6, 0, 8, 8);
      ctx.bezierCurveTo(10, 14, 14, 18, 16, 22);
      ctx.stroke();
      // Flow 3 — central (bifurcação)
      ctx.beginPath();
      ctx.moveTo(-1, -14);
      ctx.bezierCurveTo(-2, -6, 0, 0, -1, 8);
      ctx.bezierCurveTo(-3, 14, -2, 20, 0, 22);
      ctx.stroke();
      // Bifurcação do flow 2
      ctx.beginPath();
      ctx.moveTo(8, 8);
      ctx.bezierCurveTo(11, 12, 13, 16, 12, 22);
      ctx.stroke();
      // POÇAS DE LAVA na base (3 ovais brilhantes)
      ctx.lineWidth = 0.6;
      [[-15, 22, 4], [0, 22.5, 5], [15, 22, 4]].forEach(function(lp){
        ctx.fillStyle = '#ff8030';
        ctx.beginPath();
        ctx.ellipse(lp[0], lp[1], lp[2], lp[2]*0.4, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#c84030';
        ctx.stroke();
        // Glow
        ctx.fillStyle = '#ffa040';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.ellipse(lp[0], lp[1], lp[2]*0.6, lp[2]*0.25, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      ctx.strokeStyle = INK_DARK;
      ctx.lineWidth = 0.9;
      // FUMAÇA grande retorcida (cone de fumaça subindo + se espalhando)
      ctx.fillStyle = '#4a3828';
      ctx.globalAlpha = 0.40;
      // Plume base (logo acima da cratera)
      ctx.beginPath();
      ctx.arc(-2, -19, 4, 0, Math.PI*2);
      ctx.arc(2, -22, 4.5, 0, Math.PI*2);
      ctx.arc(-3, -25, 5, 0, Math.PI*2);
      ctx.arc(4, -27, 4, 0, Math.PI*2);
      ctx.arc(-1, -30, 5.5, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 0.25;
      // Topo da fumaça (mais espalhada)
      ctx.beginPath();
      ctx.arc(-6, -33, 5, 0, Math.PI*2);
      ctx.arc(6, -33, 5, 0, Math.PI*2);
      ctx.arc(0, -35, 6, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Contorno da fumaça (linha sinuosa)
      ctx.strokeStyle = '#5a4838';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-5, -16);
      ctx.bezierCurveTo(-9, -22, -7, -28, -10, -34);
      ctx.bezierCurveTo(-6, -38, 0, -38, 6, -34);
      ctx.bezierCurveTo(10, -28, 8, -22, 5, -16);
      ctx.stroke();
      ctx.strokeStyle = INK_DARK;
      ctx.lineWidth = 0.9;
      // BRASAS voando (5 pontos brilhantes)
      ctx.fillStyle = '#ff8030';
      [[-8, -8], [6, -10], [10, -16], [-12, -14], [4, -22]].forEach(function(em){
        ctx.beginPath();
        ctx.arc(em[0], em[1], 0.9, 0, Math.PI*2);
        ctx.fill();
        // Glow
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(em[0], em[1], 2, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      // CRACKS/rachaduras no chão (irradiando do vulcão com glow vermelho)
      ctx.strokeStyle = '#c84030';
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = 0.7;
      [[-22, 25], [-25, 24], [22, 25], [25, 24], [-12, 26], [12, 26]].forEach(function(cr){
        ctx.beginPath();
        ctx.moveTo(cr[0], cr[1]);
        ctx.lineTo(cr[0] + (rng()-0.5)*4, cr[1] + 3);
        ctx.lineTo(cr[0] + (rng()-0.5)*5, cr[1] + 6);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.strokeStyle = INK_DARK;
      ctx.lineWidth = 0.9;
    }
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.restore();
  }

  // === _drawCartPath ===
  function _drawCartPath(ctx, fromKey, toKey, w, h, biomes){
    // === Estrada hand-drawn (Fase 6.5) ==========================================
    // Pencil-style: linha pontilhada simples sépia + dots de marcos a cada 25%.
    // SEM shadow, SEM dirt path larga, SEM dashed dourada (3D removido).
    var a = (biomes || CART_BIOMES).find(function(bb){ return bb.key === fromKey; });
    var b = (biomes || CART_BIOMES).find(function(bb){ return bb.key === toKey; });
    if (!a || !b) return;
    var ax = a.x * w, ay = a.y * h;
    var bx = b.x * w, by = b.y * h;
    var dx = bx - ax, dy = by - ay;
    var mx = (ax + bx) / 2, my = (ay + by) / 2;
    var cx = mx + (-dy * 0.15);
    var cy = my + (dx * 0.15);
    // P-mapa sessão #73 (user: "reforce o desenho do caminho entre os locais"):
    // estrada bem mais visível sobre o world-map — contorno escuro (legibilidade em
    // qualquer fundo) + tracejado claro/dourado por cima (a "estrada") + marcos
    // dourados. Antes era 1px sépia (INK_MED), quase invisível no mapa pintado.
    // P-mapa sessão #74 (user: "diminua o tamanho dos caminhos... os locais agora estão
    // com tamanho menor e as trilhas ficaram tão grandes que chegaram a tampar um dos
    // locais"): trilha AFINADA ~37% (era 3.2/1.6/dash[5,4]/dots1.4) p/ ficar proporcional
    // aos loc-art menores. Mantém contorno escuro + tracejado dourado, só mais fino —
    // continua bem mais legível que o 1px sépia original (não regride à invisibilidade).
    ctx.save();
    ctx.lineCap = 'round';
    // 1) Contorno escuro
    ctx.strokeStyle = 'rgba(20,14,8,0.55)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(cx, cy, bx, by);
    ctx.stroke();
    // 2) Tracejado claro dourado por cima
    ctx.strokeStyle = 'rgba(212,182,124,0.78)';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(cx, cy, bx, by);
    ctx.stroke();
    ctx.setLineDash([]);
    // 3) Marcos (pontinhos dourados ao longo da curva)
    ctx.fillStyle = 'rgba(196,149,58,0.92)';
    for (var t = 0.2; t < 1; t += 0.2) {
      var u = 1 - t;
      var px = u*u*ax + 2*u*t*cx + t*t*bx;
      var py = u*u*ay + 2*u*t*cy + t*t*by;
      ctx.beginPath();
      ctx.arc(px, py, 0.9, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  // === Fog of War (Low-Res Upscale) — sessão #74 ==============================
  // User (sessão #74): "faça com que no mapa também exista o efeito fog of war igual
  // a exploração, tampando os locais que o personagem ainda não foi ou nem ficou
  // sabendo que existe mesmo sem saber o nome do local". Porta a técnica IMMUTABLE
  // "Low-Res Upscale" (Riot/LoL) do explore-fog: máscara de baixa-res (alpha por
  // distância) → upscale bilinear (browser suaviza) → tint source-in. No mapa-mundo
  // NÃO há grid de hexágonos — o "revelado" é o conjunto de locais CONHECIDOS
  // (known_locations) + as ESTRADAS entre dois locais conhecidos (user: "locais +
  // estradas"). A névoa cobre o resto (terra incognita), escondendo a EXISTÊNCIA do
  // local — não só o nome. Mesmo FOG_COLOR do explore-fog (consistência).
  // #85 (user): não-descoberto = PRETO SÓLIDO (não escurecido). Antes era
  // Fog of war forte, denso e impenetravel (Ordem do Usuario 2026-10):
  // Lugares inexplorados e distantes ficam TOTALMENTE pretos (#000000 100% solido).
  // Tudo literalmente preto onde nao se consegue ver nada ate ser descoberto.
  var CART_FOG_COLOR = '#000000';

  // falloff smoothstep: 0 (100% revelado) ate r0; 255 (100% breu solido) apos r1; gradiente no meio.
  function _cartFogFalloff(dist, r0, r1){
    if (dist <= r0) return 0;
    if (dist >= r1) return 255;
    var t = (dist - r0) / (r1 - r0);
    t = t * t * (3 - 2 * t);   // smoothstep (borda macia, transicao organica)
    return Math.round(t * 255);
  }

  // distancia ponto->segmento em coords normalizadas (clareira ao longo das estradas)
  function _cartDistToSeg(px, py, ax, ay, bx, by){
    var dx = bx - ax, dy = by - ay;
    var len2 = dx*dx + dy*dy;
    var t = len2 > 0 ? ((px-ax)*dx + (py-ay)*dy) / len2 : 0;
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    var cx = ax + t*dx, cy = ay + t*dy;
    var ex = px - cx, ey = py - cy;
    return Math.sqrt(ex*ex + ey*ey);
  }

  // Constroi o canvas de nevoa S x S.
  // knownArr = array de keys conhecidas; biomes = nos da carta; isProvince = booleano.
  function _buildCartFog(S, knownArr, biomes, isProvince){
    if (typeof document === 'undefined' || !knownArr) return null;
    var lite = (typeof window !== 'undefined' && window._valdoriaPerformanceTier === 'lite');
    var RES = lite ? 56 : 84;                       // resolucao da mascara

    var locs = [];
    biomes.forEach(function(b){
      var isK = knownArr.indexOf(b.key) >= 0 || (!isProvince && (b.key === 'plains' || b.isOrigin));
      if (isK) locs.push([b.x, b.y]);
    });

    // Se eh provincia e o aventureiro nao conhece NENHUM local dela: TUDO 100% PRETO SOLIDO!
    if (isProvince && locs.length === 0) {
      var blackCanvas = document.createElement('canvas');
      blackCanvas.width = Math.max(1, Math.round(S));
      blackCanvas.height = Math.max(1, Math.round(S));
      var bctx = blackCanvas.getContext('2d');
      bctx.fillStyle = CART_FOG_COLOR;
      bctx.fillRect(0, 0, blackCanvas.width, blackCanvas.height);
      return blackCanvas;
    }

    if (!locs.length) locs.push([0.42, 0.55]);      // origem (Portoes de Valdoria) fallback apenas continente

    var roads = [];
    CART_PATHS.forEach(function(p){
      var aKnown = knownArr.indexOf(p[0]) >= 0 || (!isProvince && p[0] === 'plains');
      var bKnown = knownArr.indexOf(p[1]) >= 0 || (!isProvince && p[1] === 'plains');
      if (!aKnown || !bKnown) return;             // estrada so revela se AMBAS as pontas conhecidas
      var a = biomes.find(function(bb){ return bb.key === p[0]; });
      var b = biomes.find(function(bb){ return bb.key === p[1]; });
      if (a && b) roads.push([a.x, a.y, b.x, b.y]);
    });

    var LOC_R0 = isProvince ? 0.08 : 0.055, LOC_R1 = isProvince ? 0.18 : 0.15;  // clareira ao redor de cada local
    var ROAD_R0 = 0.016, ROAD_R1 = 0.048;                                       // faixa ao longo das estradas

    var mask = document.createElement('canvas');
    mask.width = RES; mask.height = RES;
    var mctx = mask.getContext('2d');
    var img = mctx.createImageData(RES, RES);
    var d = img.data;

    for (var j = 0; j < RES; j++) {
      var ny = (j + 0.5) / RES;
      for (var i = 0; i < RES; i++) {
        var nx = (i + 0.5) / RES;
        var dl = Infinity;
        for (var k = 0; k < locs.length; k++) {
          var ddx = nx - locs[k][0], ddy = ny - locs[k][1];
          var dd = Math.sqrt(ddx*ddx + ddy*ddy);
          if (dd < dl) dl = dd;
        }
        var a = _cartFogFalloff(dl, LOC_R0, LOC_R1);
        if (a > 0 && roads.length) {
          var dr = Infinity;
          for (var m = 0; m < roads.length; m++) {
            var ds = _cartDistToSeg(nx, ny, roads[m][0], roads[m][1], roads[m][2], roads[m][3]);
            if (ds < dr) dr = ds;
          }
          var ar = _cartFogFalloff(dr, ROAD_R0, ROAD_R1);
          if (ar < a) a = ar;
        }
        var idx = (j * RES + i) * 4;
        d[idx] = 0; d[idx+1] = 0; d[idx+2] = 0; d[idx+3] = a;
      }
    }
    mctx.putImageData(img, 0, 0);

    var fog = document.createElement('canvas');
    fog.width = Math.max(1, Math.round(S)); fog.height = Math.max(1, Math.round(S));
    var fctx = fog.getContext('2d');
    fctx.imageSmoothingEnabled = true; fctx.imageSmoothingQuality = 'high';  // upscale bilinear
    fctx.drawImage(mask, 0, 0, RES, RES, 0, 0, fog.width, fog.height);
    fctx.globalCompositeOperation = 'source-in';    // mantem o alpha da mascara, aplica cor solida preta
    fctx.fillStyle = CART_FOG_COLOR;
    fctx.fillRect(0, 0, fog.width, fog.height);
    return fog;
  }

  // === _drawCartNode ===
    // === Alfinetes de Aventureiro / Marcadores Pessoais de Mapa (D&D 5e / Baldur's Gate 3) ===
  function _getPinnedLocations() {
    try {
      var raw = localStorage.getItem('valdoria_pinned_locs');
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }
  function _isLocPinned(key) {
    if (!key) return false;
    var list = _getPinnedLocations();
    return list.indexOf(key) >= 0;
  }
  function _toggleLocPinned(key) {
    if (!key) return false;
    var list = _getPinnedLocations();
    var idx = list.indexOf(key);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(key);
    }
    try { localStorage.setItem('valdoria_pinned_locs', JSON.stringify(list)); } catch (_) {}
    return (list.indexOf(key) >= 0);
  }

  // === Anotações Pessoais de Viagem da Comitiva (D&D 5e Expedition Notes) ===
  function _getLocNotes() {
    try {
      var raw = localStorage.getItem('valdoria_loc_notes');
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }
  function _getLocNote(key) {
    if (!key) return '';
    var map = _getLocNotes();
    return map[key] || '';
  }
  function _setLocNote(key, text) {
    if (!key) return;
    var map = _getLocNotes();
    if (text && text.trim()) {
      map[key] = text.trim();
    } else {
      delete map[key];
    }
    try { localStorage.setItem('valdoria_loc_notes', JSON.stringify(map)); } catch (_) {}
  }

  // === Iluminação Atmosférica e Clima Dinâmico no Mapa ===
  function _drawCartAtmosphere(ctx, w, h) {
    var phase = (typeof window !== 'undefined' && window.S && window.S.dayPhase) ||
                (typeof window !== 'undefined' && window.CITY_MOCK_PLAYER && window.CITY_MOCK_PLAYER.dayPhase) || 'day';
    var weather = (typeof window !== 'undefined' && window.S && window.S.weather) || 's';

    if (phase === 'night') {
      ctx.save();
      ctx.fillStyle = 'rgba(8, 16, 32, 0.25)';
      ctx.fillRect(0, 0, w, h);
      var vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(4, 8, 20, 0.40)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    } else if (phase === 'dusk') {
      ctx.save();
      ctx.fillStyle = 'rgba(70, 30, 15, 0.15)';
      ctx.fillRect(0, 0, w, h);
      var vgDusk = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.8);
      vgDusk.addColorStop(0, 'rgba(0,0,0,0)');
      vgDusk.addColorStop(1, 'rgba(50, 15, 8, 0.30)');
      ctx.fillStyle = vgDusk;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    } else if (phase === 'dawn') {
      ctx.save();
      ctx.fillStyle = 'rgba(80, 50, 20, 0.10)';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (weather === 'r' || weather === 't') {
      ctx.save();
      var isStorm = (weather === 't');
      ctx.fillStyle = isStorm ? 'rgba(15, 25, 40, 0.28)' : 'rgba(25, 40, 55, 0.16)';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = isStorm ? 'rgba(140, 180, 220, 0.32)' : 'rgba(100, 130, 160, 0.18)';
      ctx.lineWidth = isStorm ? 1.2 : 0.8;
      var spacing = isStorm ? 18 : 28;
      ctx.beginPath();
      for (var rx = -h; rx < w; rx += spacing) {
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx + h * 0.5, h);
      }
      ctx.stroke();
      ctx.restore();
    } else if (weather === 'f') {
      ctx.save();
      ctx.fillStyle = 'rgba(35, 45, 55, 0.20)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(190, 205, 215, 0.08)';
      for (var fRow = 0; fRow < 5; fRow++) {
        var my = (fRow * (h / 5)) + 20;
        ctx.fillRect(0, my, w, 24);
      }
      ctx.restore();
    } else if (weather === 'snow') {
      ctx.save();
      ctx.fillStyle = 'rgba(40, 60, 80, 0.14)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(235, 245, 255, 0.35)';
      var rngSnow = _cartSeedRand(99);
      for (var sIdx = 0; sIdx < 40; sIdx++) {
        var sx = rngSnow() * w;
        var sy = rngSnow() * h;
        var sr = 1 + rngSnow() * 2;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // === D&D 5e Weather Forecast & Atmospheric Hazards ===
  function getWeatherDndInfo(code) {
    var w = code || 's';
    var data = {
      s: { name: 'Céu Limpo', icon: '☀️', hazardMod: 0, effect: 'Visibilidade aberta; marcha sem penalidades climáticas.' },
      r: { name: 'Chuva Contínua', icon: '🌧️', hazardMod: 2, effect: 'Terreno escorregadio (+2 CD em testes físicos de marcha). Dificuldade para acender fogueiras sem abrigo.' },
      t: { name: 'Tempestade com Raios', icon: '⛈️', hazardMod: 3, effect: 'Visibilidade obscurecida e ventania. Desvantagem em testes de Percepção auditiva/visual à distância (D&D 5e PHB p. 110).' },
      f: { name: 'Névoa Densa', icon: '🌫️', hazardMod: 2, effect: 'Visibilidade limitada. Desvantagem em testes de Percepção visual além de curta distância (D&D 5e PHB p. 183).' },
      snow: { name: 'Nevasca Boreal', icon: '❄️', hazardMod: 3, effect: 'Frio extremo e ventos congelantes. Risco de exaustão sem mantos pesados ou tochas.' }
    };
    return data[w] || data.s;
  }

  // === D&D 5e Barômetro & Ventos de Marcha (Fase 20) ===
  var _BIOME_PREVAILING_WINDS = {
    snow:     { deg: 0,   code: 'N',   speed: 35, name: 'Vento Boreal Uivante' },
    mountain: { deg: 315, code: 'NO',  speed: 28, name: 'Ventos de Altitude da Cordilheira' },
    coast:    { deg: 90,  code: 'L',   speed: 30, name: 'Brisa Oceânica de Leste' },
    desert:   { deg: 180, code: 'S',   speed: 22, name: 'Vento Quente de Siroco' },
    forest:   { deg: 45,  code: 'NE',  speed: 14, name: 'Brisa Silvestre Filtrada' },
    swamp:    { deg: 135, code: 'SE',  speed: 8,  name: 'Ar Estagnado com Miasmas' },
    plains:   { deg: 270, code: 'O',   speed: 18, name: 'Vento Aberto de Pradaria' },
    volcanic: { deg: 225, code: 'SO',  speed: 25, name: 'Lufadas Térmicas Vulcânicas' },
    cave:     { deg: 0,   code: 'N',   speed: 4,  name: 'Correntes de Ar Subterrâneas' },
    graveyard:{ deg: 135, code: 'SE',  speed: 10, name: 'Vento Fúnebre Sombrio' }
  };

  function getBarometerForecast(weatherCode, biomeKey) {
    var w = weatherCode || 's';
    var bKey = biomeKey || 'plains';
    var windDef = _BIOME_PREVAILING_WINDS[bKey] || _BIOME_PREVAILING_WINDS.plains;

    var pressureHpa = 1018;
    var status = 'Alta Pressão (Tempo Firme)';
    var forecast = 'Tempo aberto e estável nas próximas 12 horas.';

    if (w === 't') {
      pressureHpa = 992;
      status = 'Baixa Pressão Crítica (Tempestade Severa)';
      forecast = 'Queda rápida de pressão; tempestades elétricas e vendavais.';
    } else if (w === 'r') {
      pressureHpa = 1004;
      status = 'Baixa Pressão (Frente Chuvosa)';
      forecast = 'Precipitação contínua e ventos úmidos persistentes.';
    } else if (w === 'snow') {
      pressureHpa = 998;
      status = 'Baixa Pressão Boreal (Frente Ártica)';
      forecast = 'Nevasca intensa, gelo e queda acentuada de temperatura.';
    } else if (w === 'f') {
      pressureHpa = 1012;
      status = 'Pressão Neutra (Inversão Térmica)';
      forecast = 'Névoa espessa acumulada no solo; visibilidade reduzida.';
    }

    return {
      pressureHpa: pressureHpa,
      pressureStatus: status,
      windSpeedKmh: windDef.speed,
      windDirectionDeg: windDef.deg,
      windBearing: windDef.code,
      windDescription: windDef.name + ' (' + windDef.speed + ' km/h · ' + windDef.code + ')',
      forecast: forecast
    };
  }

  function calcWindImpact(travelBearingDeg, windBearingDeg, windSpeedKmh) {
    if (typeof travelBearingDeg !== 'number' || typeof windBearingDeg !== 'number') {
      return {
        relation: 'crosswind',
        label: '🌬️ Vento Lateral Neutro',
        speedMod: 1.0,
        color: '#d2be90',
        desc: 'Rajadas moderadas sem impacto na velocidade da comitiva.'
      };
    }

    // O vento sopra DE windBearingDeg, logo viaja PARA (windBearingDeg + 180) % 360
    var windFlowTowards = (windBearingDeg + 180) % 360;
    var diff = Math.abs(travelBearingDeg - windFlowTowards);
    if (diff > 180) diff = 360 - diff;

    if (diff <= 45) {
      return {
        relation: 'tailwind',
        label: '🍃 Vento a Favor (+10% Velocidade)',
        speedMod: 1.10,
        color: '#86efac',
        desc: 'O vento sopra pelas costas da comitiva, acelerando montarias e reduzindo o cansaço.'
      };
    } else if (diff >= 135) {
      return {
        relation: 'headwind',
        label: '💨 Vento Contrário (-10% Velocidade)',
        speedMod: 0.90,
        color: '#f87171',
        desc: 'Ventos frontais fustigam os aventureiros, desacelerando o passo e exigindo mais esforço.'
      };
    } else {
      return {
        relation: 'crosswind',
        label: '🌬️ Vento Lateral (Neutro)',
        speedMod: 1.0,
        color: '#93c5fd',
        desc: 'Vento cruzado lateral soprando pelos flancos da formação.'
      };
    }
  }

  // === D&D 5e Wilderness Encounter / Ambush Risk Assessment ===
  var DND_FORAGE_DATA = {
    forest: {
      rating: 'Abundante',
      dc: 10,
      color: '#86efac',
      water: 'Rios Cristalinos e Nascentes',
      notes: 'Água pura e caça farta. Batedores ou comitivas com antecedente Forasteiro sustentam o bando sem gastar rações.'
    },
    plains: {
      rating: 'Moderado',
      dc: 15,
      color: '#fde047',
      water: 'Riachos e Poços Rurais',
      notes: 'Fontes perenes perto de granjas e encostas. Caça veloz requer testes regulares de Sobrevivência.'
    },
    swamp: {
      rating: 'Abundante (Tóxico)',
      dc: 15,
      color: '#a3e635',
      water: 'Água Salobra / Miasmática',
      notes: 'Água turva exige fervura ou magia de Purificar Alimentos contra contaminação.'
    },
    desert: {
      rating: 'Crítico',
      dc: 20,
      color: '#f87171',
      water: 'Oásis Raros e Cactos',
      notes: 'Consumo duplo de água sob sol escaldante. Marchar sem odres cheios exige salvaguarda de CON contra exaustão.'
    },
    mountain: {
      rating: 'Escasso',
      dc: 20,
      color: '#fb923c',
      water: 'Neve e Gelo Perene',
      notes: 'Exige fogueira para derreter neve. Ventos cortantes reduzem caça a animais de penhasco.'
    }
  };

  function getBiomeForageSustainability(biomeKey) {
    var raw = (biomeKey || '').toLowerCase();
    if (raw.indexOf('floresta') >= 0 || raw.indexOf('forest') >= 0) return DND_FORAGE_DATA.forest;
    if (raw.indexOf('pantano') >= 0 || raw.indexOf('swamp') >= 0 || raw.indexOf('leste') >= 0) return DND_FORAGE_DATA.swamp;
    if (raw.indexOf('duna') >= 0 || raw.indexOf('desert') >= 0 || raw.indexOf('sul') >= 0) return DND_FORAGE_DATA.desert;
    if (raw.indexOf('cordilheira') >= 0 || raw.indexOf('mountain') >= 0 || raw.indexOf('ocidental') >= 0) return DND_FORAGE_DATA.mountain;
    return DND_FORAGE_DATA.plains;
  }

  var DND_REGIONAL_BESTIARY = {
    forest: {
      threats: ['🐺 Lobos da Floresta (ND 1/4)', '🕷️ Aranhas Gigantes (ND 1)', '🌿 Dríades Espinhosas (ND 2)'],
      apex: '🐻 Urso-Coruja Feroz (ND 3)',
      advice: 'Evite viajar fora das trilhas à noite. Tochas e armas de fogo mantêm feras afastadas.'
    },
    plains: {
      threats: ['🐗 Javalis Selvagens (ND 1/4)', '🏹 Salteadores da Estrada (ND 1/2)', '👹 Goblins Saqueadores (ND 1)'],
      apex: '🦁 Manticora Alada (ND 3)',
      advice: 'Mantenha batedores em pontos elevados para avistar poeira de saqueadores ao longe.'
    },
    swamp: {
      threats: ['🐊 Crocodilos do Lodo (ND 1/2)', '🧟 Carniçais Pantanosos (ND 1)', '🦎 Trogloditas Fétidos (ND 1)'],
      apex: '🐍 Hidra das Águas Negras (ND 5)',
      advice: 'Mantenha os olhos nas águas turvas e prepare salvaguardas contra veneno.'
    },
    mountain: {
      threats: ['🦅 Harpias das Encostas (ND 1)', '🪨 Gigantes da Colina (ND 5)', '👹 Ogros Montanheses (ND 2)'],
      apex: '🐉 Jovem Dragão Vermelho (ND 10)',
      advice: 'Cuidado com desfiladeiros estreitos favoráveis a emboscadas e quedas de rochas.'
    },
    desert: {
      threats: ['🦂 Escorpiões Gigantes (ND 3)', '💀 Múmias do Vale Seco (ND 3)', '🌪️ Serpentes de Areia (ND 1)'],
      apex: '🐛 Verme da Areia Colossal (ND 7)',
      advice: 'Viaje em ritmo furtivo durante a noite para escapar do calor e dos escorpiões solares.'
    },
    cave: {
      threats: ['🦇 Morcegos Gigantes (ND 1/4)', '🍄 Fungos Violetas (ND 1)', '🕷️ Aranhas Espectrais (ND 3)'],
      apex: '👁️ Observador das Profundezas (ND 8)',
      advice: 'Visão no Escuro ou lanternas de foco concentrado são indispensáveis.'
    }
  };

  function getBiomeBestiaryThreats(biomeKey) {
    var raw = (biomeKey || '').toLowerCase();
    if (raw.indexOf('floresta') >= 0 || raw.indexOf('forest') >= 0) return DND_REGIONAL_BESTIARY.forest;
    if (raw.indexOf('pantano') >= 0 || raw.indexOf('swamp') >= 0 || raw.indexOf('leste') >= 0) return DND_REGIONAL_BESTIARY.swamp;
    if (raw.indexOf('duna') >= 0 || raw.indexOf('desert') >= 0 || raw.indexOf('sul') >= 0) return DND_REGIONAL_BESTIARY.desert;
    if (raw.indexOf('cordilheira') >= 0 || raw.indexOf('mountain') >= 0 || raw.indexOf('ocidental') >= 0) return DND_REGIONAL_BESTIARY.mountain;
    if (raw.indexOf('caverna') >= 0 || raw.indexOf('cave') >= 0) return DND_REGIONAL_BESTIARY.cave;
    return DND_REGIONAL_BESTIARY.plains;
  }

  function getBiomeAltitude(biomeKey, tier) {
    var raw = (biomeKey || '').toLowerCase();
    var t = tier || 1;
    if (raw.indexOf('cordilheira') >= 0 || raw.indexOf('mountain') >= 0 || raw.indexOf('peaks') >= 0) {
      return { meters: 1800 + t * 250, isHighAltitude: true, label: '🏔️ Altitude Extrema (Ar Rarefeito · ' + (1800 + t * 250) + 'm)' };
    }
    if (raw.indexOf('colina') >= 0 || raw.indexOf('hills') >= 0) {
      return { meters: 600 + t * 80, isHighAltitude: false, label: '⛰️ Colinas Elevadas (' + (600 + t * 80) + 'm)' };
    }
    if (raw.indexOf('pantano') >= 0 || raw.indexOf('swamp') >= 0) {
      return { meters: 15, isHighAltitude: false, label: '🌊 Baixada Alagada (15m)' };
    }
    if (raw.indexOf('duna') >= 0 || raw.indexOf('desert') >= 0) {
      return { meters: 220, isHighAltitude: false, label: '🏜️ Planalto de Dunas (220m)' };
    }
    return { meters: 120 + t * 30, isHighAltitude: false, label: '🌾 Planície (' + (120 + t * 30) + 'm)' };
  }

  var TRAVEL_ROLES = {
    scout: {
      id: 'scout',
      name: 'Sentinela Atenta',
      icon: '👁️',
      summary: 'Prontidão Máxima: +5 na Percepção Passiva; evita surpresa em emboscadas inimigas (PHB p. 182).',
      riskMod: -10
    },
    navigator: {
      id: 'navigator',
      name: 'Guia da Rota',
      icon: '🧭',
      summary: 'Orientação Perfeita: Imunidade a desvios de rota sob névoa densa ou tempestades (PHB p. 182).',
      riskMod: -5
    },
    forager: {
      id: 'forager',
      name: 'Caçador Forrageador',
      icon: '🌿',
      summary: 'Sustento dos Ermos: Caça e água garantidas em marcha normal ou lenta sem gastar rações.',
      riskMod: 0
    },
    cartographer: {
      id: 'cartographer',
      name: 'Mestre Cartógrafo',
      icon: '📜',
      summary: 'Registro Preciso: Mapeia acidentes geográficos e anotações táticas ao longo da marcha.',
      riskMod: 0
    }
  };

  var DND_TERRAIN_DIFFICULTY = {
    plains: { costMult: 1, isDifficult: false, label: 'Estrada Firme (1×)', color: '#86efac' },
    forest: { costMult: 1, isDifficult: false, label: 'Trilha Florestal (1×)', color: '#86efac' },
    swamp: { costMult: 2, isDifficult: true, label: 'Terreno Difícil (2× · Lodo)', color: '#f87171' },
    desert: { costMult: 2, isDifficult: true, label: 'Terreno Difícil (2× · Dunas)', color: '#fb923c' },
    mountain: { costMult: 2, isDifficult: true, label: 'Terreno Difícil (2× · Encostas)', color: '#fb923c' },
    snow: { costMult: 2, isDifficult: true, label: 'Terreno Difícil (2× · Neve)', color: '#93c5fd' },
    graveyard: { costMult: 1, isDifficult: false, label: 'Solo Fúnebre (1×)', color: '#d2be90' },
    volcanic: { costMult: 2, isDifficult: true, label: 'Terreno Difícil (2× · Brasas)', color: '#f87171' },
    cave: { costMult: 2, isDifficult: true, label: 'Terreno Difícil (2× · Cavernas)', color: '#fb923c' }
  };

  function getBiomeTerrainDifficulty(biomeKey) {
    var raw = (biomeKey || '').toLowerCase();
    if (raw.indexOf('pantano') >= 0 || raw.indexOf('swamp') >= 0 || raw.indexOf('leste') >= 0) return DND_TERRAIN_DIFFICULTY.swamp;
    if (raw.indexOf('duna') >= 0 || raw.indexOf('desert') >= 0 || raw.indexOf('sul') >= 0) return DND_TERRAIN_DIFFICULTY.desert;
    if (raw.indexOf('cordilheira') >= 0 || raw.indexOf('mountain') >= 0 || raw.indexOf('ocidental') >= 0) return DND_TERRAIN_DIFFICULTY.mountain;
    if (raw.indexOf('floresta') >= 0 || raw.indexOf('forest') >= 0) return DND_TERRAIN_DIFFICULTY.forest;
    return DND_TERRAIN_DIFFICULTY.plains;
  }

  var TRANSPORT_MODES = {
    foot: {
      id: 'foot',
      name: 'A Pé (Infantaria)',
      icon: '🚶',
      speedMph: 3,
      speedMult: 1.0,
      riskMod: 0,
      summary: 'Infantaria: 3 milhas/hora · Carga padrão em mochilas e armas prontas.'
    },
    horse: {
      id: 'horse',
      name: 'Montaria (Cavalos)',
      icon: '🐎',
      speedMph: 4,
      speedMult: 1.33,
      riskMod: 0,
      summary: 'Montaria: +33% de velocidade em estradas · Reduz horas de viagem.'
    },
    wagon: {
      id: 'wagon',
      name: 'Caravana / Carroça',
      icon: '🛒',
      speedMph: 3,
      speedMult: 1.0,
      riskMod: -10,
      summary: 'Caravana: Tendas reforçadas e provisões protegidas (-10% no risco de emboscadas noturnas).'
    }
  };

  function calcForcedMarchRisk(hours, campCount) {
    var h = hours || 4;
    var cc = campCount || 0;
    if (h <= 8) {
      return { isForced: false, extraHours: 0, saveDC: 0, safeDays: 1, note: 'Marcha diária segura dentro do limite padrão de 8 horas.' };
    }
    if (cc > 0) {
      return { isForced: false, extraHours: 0, saveDC: 0, safeDays: Math.ceil(h / 8), note: 'Marcha fracionada em ' + Math.ceil(h / 8) + ' dias com ' + cc + ' acampamento(s). Risco de exaustão anulado!' };
    }
    var extra = h - 8;
    var dc = 10 + extra;
    return { isForced: true, extraHours: extra, saveDC: dc, exhaustionLevel: 1, note: 'Marcha de ' + h + 'h excede as 8h diárias. Salvaguarda de Constituição CD ' + dc + ' contra 1 Nível de Exaustão.' };
  }

  var MARCHING_FORMATIONS = {
    standard: {
      id: 'standard',
      name: 'Fila Indiana',
      icon: '🚶',
      summary: 'Equilibrada (PHB p. 182): batedor à frente, comitiva em linha com espaço para reagir.',
      riskMod: 0
    },
    defensive: {
      id: 'defensive',
      name: 'Formação Fechada',
      icon: '🛡️',
      summary: 'Defensiva: batedores recuados, escudos erguidos e retaguarda reforçada (-10% no risco de emboscada).',
      riskMod: -10
    },
    spread: {
      id: 'spread',
      name: 'Vanguarda Dispersa',
      icon: '🐾',
      summary: 'Dispersa: batedor 30 pés adiante (+5 na Percepção Passiva para detectar armadilhas e pistas antecipadamente).',
      riskMod: -5
    }
  };

  function calcEncounterRisk(biome, options) {
    if (!biome) return { riskPct: 0, label: '🟢 Zona Segura (0%)', color: '#a3e635' };
    if (biome.tier === 0 || biome.isOrigin) return { riskPct: 0, label: '🟢 Zona Segura (0% Risco de Emboscada)', color: '#a3e635' };

    var opts = options || {};
    var pace = opts.pace || 'normal';
    var isNight = !!opts.isNight;
    var weather = opts.weather || 's';
    var hours = opts.hours || 4;

    var baseTierRisk = (biome.tier === 1) ? 15 :
                       (biome.tier === 2) ? 25 :
                       (biome.tier === 3) ? 40 :
                       (biome.tier === 4) ? 55 : 70;

    var durationMod = (hours <= 4) ? -5 : (hours <= 8) ? 0 : (hours <= 16) ? 10 : 20;
    var campStance = opts.campStance || 'vigilant';
    var nightMod = isNight ? (campStance === 'stealth' ? 10 : 18) : 0;
    var paceMod = (pace === 'stealth') ? -25 : (pace === 'fast') ? 15 : 0;
    var weatherMod = (weather === 't' || weather === 'f') ? 8 : 0;
    var formation = opts.formation || 'standard';
    var formMod = (formation === 'defensive') ? -10 : (formation === 'spread') ? -5 : 0;
    var transport = opts.transport || 'foot';
    var transMod = (transport === 'wagon') ? -10 : 0;
    var travelRole = opts.travelRole || 'scout';
    var roleMod = (travelRole === 'scout') ? -10 : (travelRole === 'navigator') ? -5 : 0;

    var totalRisk = Math.max(0, Math.min(95, baseTierRisk + durationMod + nightMod + paceMod + weatherMod + formMod + transMod + roleMod));

    var label = '', color = '#a3e635';
    if (totalRisk <= 20) {
      label = '🟢 Baixo Risco (~' + totalRisk + '% Chance de Emboscada)';
      color = '#a3e635';
    } else if (totalRisk <= 45) {
      label = '🟡 Risco Moderado (~' + totalRisk + '% Chance de Emboscada)';
      color = '#fde047';
    } else if (totalRisk <= 70) {
      label = '🟠 Alto Risco (~' + totalRisk + '% Chance de Emboscada · Patrulhas Ativas)';
      color = '#fb923c';
    } else {
      label = '🔴 Risco Extremo (~' + totalRisk + '% Chance de Emboscada · Zona Mortal)';
      color = '#f87171';
    }

    return { riskPct: totalRisk, label: label, color: color };
  }

  function _drawCartNode(ctx, b, w, h, isHover, opts){
    opts = opts || {};
    var bx = b.x * w, by = b.y * h;
    var isOrigin = b.isOrigin;
    var hasRegionalMap = !!opts.hasRegionalMap;
    if (!hasRegionalMap && b.mapKey && opts.ownedMaps) {
      hasRegionalMap = opts.ownedMaps.indexOf(b.mapKey) >= 0;
    }

    // ── 1. Retículo de Foco com Lente Náutica e Emblema da Destinação ────
    var radius = isHover ? 20 : 14;
    ctx.save();

    var af = opts.activeFilter || 'all';
    if (af !== 'all') {
      var isMatch = false;
      if (af === 'settlements' && (b.settlement || b.isOrigin)) isMatch = true;
      else if (af === 'wilderness' && (!b.settlement && !b.isOrigin)) isMatch = true;
      else if (af === 'quests' && opts.hasActiveQuest) isMatch = true;
      else if (af === 'mapped' && hasRegionalMap) isMatch = true;
      else if (af === 'pinned' && (opts.isPinned || _isLocPinned(b.key))) isMatch = true;
      else if (af === 'notes' && !!_getLocNote(b.key)) isMatch = true;

      if (!isMatch) {
        ctx.globalAlpha = 0.22;
      } else {
        ctx.shadowColor = '#ffd685';
        ctx.shadowBlur = 10;
      }
    }

    // 1.1 Emblema / Miniatura da localidade dentro da lente náutica
    var ic = (opts.locArt && opts.locArt[b.key]) || null;
    if (ic && ic.complete && ic.naturalWidth) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, radius - 1.5, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(ic, bx - radius, by - radius, radius * 2, radius * 2);
      // Véu suave de integração sobre a miniatura
      ctx.fillStyle = isHover ? 'rgba(42, 30, 18, 0.05)' : 'rgba(42, 30, 18, 0.15)';
      ctx.fillRect(bx - radius, by - radius, radius * 2, radius * 2);
      ctx.restore();
    } else {
      // Iluminação interna suave do terreno caso a miniatura ainda esteja carregando
      ctx.beginPath();
      ctx.arc(bx, by, radius, 0, Math.PI * 2);
      ctx.fillStyle = isHover ? 'rgba(255, 214, 133, 0.22)' : 'rgba(255, 214, 133, 0.10)';
      ctx.fill();
    }

    // 1.2 Anel Dourado Cartográfico (Aro Náutico)
    ctx.beginPath();
    ctx.arc(bx, by, radius, 0, Math.PI * 2);
    ctx.lineWidth = isHover ? 2.2 : 1.4;
    ctx.strokeStyle = isHover ? '#ffd685' : (isOrigin ? 'rgba(232, 196, 90, 0.90)' : 'rgba(196, 149, 58, 0.75)');
    if (isHover) {
      ctx.shadowColor = 'rgba(196, 149, 58, 0.90)';
      ctx.shadowBlur = 12;
    }
    ctx.stroke();

    // 1.3 Anel Esmeralda para Áreas Mapeadas (Carta Regional de Corvus)
    if (hasRegionalMap) {
      ctx.beginPath();
      ctx.arc(bx, by, radius + 3, 0, Math.PI * 2);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(129, 199, 132, 0.90)';
      ctx.stroke();
    }

    // 1.4 Anel Duplo Nobre de Origem (Portões de Valdória)
    if (isOrigin) {
      ctx.beginPath();
      ctx.arc(bx, by, Math.max(4, radius - 4), 0, Math.PI * 2);
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = 'rgba(232, 196, 90, 0.85)';
      ctx.stroke();
    }

    // 1.4b Bastão e Ameias de Assentamento Seguro / Santuário (Korthag, Valkrest)
    if (b.settlement && !isOrigin) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, radius + 2.5, 0, Math.PI * 2);
      ctx.lineWidth = 1.3;
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(246, 173, 85, 0.95)';
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 1.5 Marcas de Mira Náutica (Astrolábio / Luneta Cartográfica)
    var tickLen = isHover ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(bx - radius - tickLen, by); ctx.lineTo(bx - radius + 1, by);
    ctx.moveTo(bx + radius - 1, by); ctx.lineTo(bx + radius + tickLen, by);
    ctx.moveTo(bx, by - radius - tickLen); ctx.lineTo(bx, by - radius + 1);
    ctx.moveTo(bx, by + radius - 1); ctx.lineTo(bx, by + radius + tickLen);
    ctx.strokeStyle = isHover ? '#ffd685' : 'rgba(196, 149, 58, 0.60)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 1.6 Selo de Contrato / Missão Ativa D&D 5e
    if (opts.hasActiveQuest) {
      ctx.save();
      var qx = bx + radius - 2;
      var qy = by - radius + 2;
      ctx.beginPath();
      ctx.arc(qx, qy, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#2b1f14';
      ctx.fill();
      ctx.strokeStyle = '#ffd685';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.font = '9px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📜', qx, qy);
      ctx.restore();
    }

    // 1.65 Marcador de Ameaça Tática D&D 5e (Tier >= 4)
    if (opts.layers && opts.layers.threats && b.tier >= 4) {
      ctx.save();
      var tx = bx + radius - 2, ty = by - radius + 2;
      ctx.beginPath();
      ctx.moveTo(tx, ty - 4);
      ctx.lineTo(tx + 4, ty);
      ctx.lineTo(tx, ty + 4);
      ctx.lineTo(tx - 4, ty);
      ctx.closePath();
      ctx.fillStyle = (b.tier >= 6) ? '#ef4444' : '#f97316';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }

    // 1.7 Alfinete de Aventureiro / Marcador Personalizado
    var locIsPinned = opts.isPinned || _isLocPinned(b.key);
    if (locIsPinned) {
      ctx.save();
      var px = bx - radius + 2;
      var py = by - radius + 2;
      ctx.beginPath();
      ctx.arc(px, py, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#2b1a0e';
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.font = '9px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📍', px, py);
      ctx.restore();
    }

    // 1.8 Marcador de Anotação Pessoal de Viagem (D&D 5e Expedition Note)
    var locHasNote = !!_getLocNote(b.key);
    if (locHasNote) {
      ctx.save();
      var nx = bx + radius - 2;
      var ny = by - radius + 2;
      ctx.beginPath();
      ctx.arc(nx, ny, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#2b1a0e';
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.0;
      ctx.stroke();
      ctx.font = '8px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📝', nx, ny);
      ctx.restore();
    }

    ctx.restore();

    // No modo Regional (onde há poucos nós), o rótulo é permanente; no Continente Geral, só abre sob hover
    if (!isHover && !opts.isRegional) return;

    ctx.save();
    var labelText = (locIsPinned ? '📍 ' : '') + (locHasNote ? '📝 ' : '') + (opts.hasActiveQuest ? '📜 ' : '') + b.name;
    ctx.font = (isHover ? 'bold 11px' : '10px') + ' serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var tw = ctx.measureText(labelText).width;
    var hasLvl = (typeof b.tier === 'number' && b.tier > 0);
    var lvlRange = !hasLvl ? '' :
                   (b.tier <= 1) ? 'Nível 1 a 2' :
                   (b.tier <= 3) ? 'Nível 2 a 4' :
                   (b.tier <= 5) ? 'Nível 4 a 7' :
                   (b.tier <= 7) ? 'Nível 7 a 10' : 'Nível 10+';
    var marcos = (typeof b.marcos === 'number') ? b.marcos : (b.tier || 1);
    var distMilhas = Math.max(6, marcos * 8);
    var horas = Math.max(2, Math.round(distMilhas / 3));
    var threatBadge = (b.tier >= 6) ? '💀 Letal' :
                      (b.tier >= 4) ? '⚔️ Difícil' :
                      (b.tier >= 2) ? '⚠️ Moderado' : '🛡️ Seguro';
    var sanctBadge = b.isSanctuary ? '🏛️ Refúgio' : '';
    var subText = hasLvl
      ? (isHover ? (lvlRange + ' · ~' + distMilhas + ' mi · ' + threatBadge + (sanctBadge ? ' · ' + sanctBadge : '')) : (sanctBadge ? lvlRange + ' · ' + sanctBadge : lvlRange))
      : (isHover ? ('~' + distMilhas + ' mi · ~' + horas + 'h · ' + threatBadge + (sanctBadge ? ' · ' + sanctBadge : '')) : (sanctBadge || ''));
    var subW = 0;
    if (subText) {
      ctx.font = 'italic 8px serif';
      subW = ctx.measureText(subText).width;
      ctx.font = (isHover ? 'bold 11px' : '10px') + ' serif';
    }
    var pillW = Math.max(tw, subW) + 14;
    var pillH = subText ? 27 : 16;
    var pillX = bx - pillW / 2;
    var pillY = by + radius + 4;
    ctx.fillStyle = 'rgba(28,20,13,0.92)';
    ctx.strokeStyle = isHover ? 'rgba(255,214,133,0.85)' : 'rgba(196,149,58,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 3);
    else ctx.rect(pillX, pillY, pillW, pillH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isHover ? '#ffd685' : '#e8c45a';
    ctx.fillText(labelText, bx, pillY + 2);
    if (subText) {
      ctx.font = 'italic 8px serif';
      ctx.fillStyle = 'rgba(218,194,148,0.78)';
      ctx.fillText(subText, bx, pillY + 14);
    }
    ctx.restore();
  }

  // === _drawUnknownRegionalNode ===
  // No Atlas Regional, locais ainda não descobertos são desenhados como pontos misteriosos ("?"),
  // permitindo ver a rede completa de estradas e aguçando a exploração estilo Witcher 3 / D&D 5e.
  function _drawUnknownRegionalNode(ctx, b, w, h, isHover){
    var bx = b.x * w, by = b.y * h;
    var radius = isHover ? 16 : 12;

    ctx.save();
    // 1. Lente circular tracejada
    ctx.beginPath();
    ctx.arc(bx, by, radius, 0, Math.PI * 2);
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = isHover ? 1.8 : 1.2;
    ctx.strokeStyle = isHover ? '#ffd685' : 'rgba(196, 149, 58, 0.70)';
    ctx.fillStyle = isHover ? 'rgba(38, 26, 15, 0.90)' : 'rgba(20, 14, 8, 0.80)';
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Glifo "?" em nanquim e ouro
    ctx.font = (isHover ? 'bold 14px' : 'bold 12px') + ' Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isHover ? '#ffd685' : '#c4953a';
    ctx.fillText('?', bx, by + 1);

    // 3. Rótulo discreto inferior
    var labelText = isHover ? 'Ponto Inexplorado' : 'Terra Incognita';
    ctx.font = 'italic 9px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var tw = ctx.measureText(labelText).width;
    var pillW = tw + 10, pillH = 15;
    var pillX = bx - pillW / 2, pillY = by + radius + 3;

    ctx.fillStyle = 'rgba(20, 14, 8, 0.88)';
    ctx.strokeStyle = isHover ? 'rgba(255, 214, 133, 0.6)' : 'rgba(196, 149, 58, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 3);
    else ctx.rect(pillX, pillY, pillW, pillH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isHover ? '#ffd685' : '#a09484';
    ctx.fillText(labelText, bx, pillY + 2);
    ctx.restore();
  }

  // === _drawPlayerPin ===
  function _drawPlayerPin(ctx, b, w, h){
    // Sessão #74 (user): SEM o label "Você está aqui" + IMAGEM de estandarte fincado
    // (player-pin.webp) marcando a posição do personagem. A BASE do estandarte crava no
    // node (posição) e a flâmula se ergue acima. Desenhado APÓS o fog → sempre visível.
    var bx = b.x * w, by = b.y * h;
    var phase = (typeof window !== 'undefined' && window.S && window.S.dayPhase) ||
                (typeof window !== 'undefined' && window.CITY_MOCK_PLAYER && window.CITY_MOCK_PLAYER.dayPhase) || 'day';

    // Iluminação Noturna D&D 5e: tocha/visão da comitiva projeta halo aquecido na escuridão
    if (phase === 'night') {
      ctx.save();
      var torchGrad = ctx.createRadialGradient(bx, by - 12, 4, bx, by - 12, 54);
      torchGrad.addColorStop(0, 'rgba(255, 215, 110, 0.40)');
      torchGrad.addColorStop(0.4, 'rgba(235, 160, 50, 0.18)');
      torchGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = torchGrad;
      ctx.beginPath();
      ctx.arc(bx, by - 12, 54, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (_playerPinReady()) {
      var PIN_H = 46;
      var PIN_W = PIN_H * (_playerPin.naturalWidth / _playerPin.naturalHeight);
      // Âncora: ponto da imagem (mastro/base) que fica exatamente sobre o node.
      var ANCHOR_X = 0.40, ANCHOR_Y = 0.88;
      ctx.save();
      // sombra sutil pra destacar o estandarte do fundo pintado do mapa
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 2;
      ctx.drawImage(_playerPin, bx - PIN_W * ANCHOR_X, by - PIN_H * ANCHOR_Y, PIN_W, PIN_H);
      ctx.restore();
      return;
    }
    // Fallback (imagem indisponível, ex.: file://): X marks the spot — SEM label.
    ctx.save();
    ctx.strokeStyle = INK_DARK;
    ctx.lineWidth = 1.4;
    var px = bx, py = by - 36;
    ctx.beginPath();
    ctx.moveTo(px - 5, py - 5); ctx.lineTo(px + 5, py + 5);
    ctx.moveTo(px - 5, py + 5); ctx.lineTo(px + 5, py - 5);
    ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI*2);
    ctx.stroke();
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(px, py + 7);
    ctx.lineTo(bx, by - 5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }


  // === Rota de Viagem Ativa e Breadcrumbs (D&D 5e / Baldur's Gate 3 Style) ===
  function _findRoutePath(startKey, endKey, edges) {
    if (!startKey || !endKey || startKey === endKey || !edges) return null;
    var queue = [[startKey]];
    var visited = {};
    visited[startKey] = true;
    while (queue.length > 0) {
      var path = queue.shift();
      var node = path[path.length - 1];
      if (node === endKey) return path;
      for (var i = 0; i < edges.length; i++) {
        var e = edges[i];
        var next = (e[0] === node) ? e[1] : (e[1] === node) ? e[0] : null;
        if (next && !visited[next]) {
          visited[next] = true;
          queue.push(path.concat([next]));
        }
      }
    }
    return null;
  }

  function _drawActiveRouteBreadcrumbs(ctx, pathKeys, w, h, biomes) {
    if (!pathKeys || pathKeys.length < 2 || !biomes) return;
    var t = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    var dashOffset = - (t / 40) % 20;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Halo dourado ou âmbar sob a rota traçada (aviso de ameaça ND alta)
    var hasMortalThreat = pathKeys.some(function(k){
      var node = biomes.find(function(b){ return b.key === k; });
      return node && typeof node.tier === 'number' && node.tier >= 4;
    });
    ctx.strokeStyle = hasMortalThreat ? 'rgba(248, 113, 113, 0.45)' : 'rgba(255, 200, 60, 0.45)';
    ctx.lineWidth = 5.0;
    for (var i = 0; i < pathKeys.length - 1; i++) {
      var a = biomes.find(function(b){ return b.key === pathKeys[i]; });
      var b = biomes.find(function(b){ return b.key === pathKeys[i+1]; });
      if (!a || !b) continue;
      var ax = a.x * w, ay = a.y * h;
      var bx = b.x * w, by = b.y * h;
      var dx = bx - ax, dy = by - ay;
      var cx = (ax + bx) / 2 + (-dy * 0.15);
      var cy = (ay + by) / 2 + (dx * 0.15);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(cx, cy, bx, by);
      ctx.stroke();
    }

    // 2. Trilha animada de breadcrumbs luminosos (estilo marcha D&D)
    ctx.strokeStyle = hasMortalThreat ? '#fca5a5' : '#ffe484';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = dashOffset;
    for (var j = 0; j < pathKeys.length - 1; j++) {
      var a2 = biomes.find(function(b){ return b.key === pathKeys[j]; });
      var b2 = biomes.find(function(b){ return b.key === pathKeys[j+1]; });
      if (!a2 || !b2) continue;
      var ax2 = a2.x * w, ay2 = a2.y * h;
      var bx2 = b2.x * w, by2 = b2.y * h;
      var dx2 = bx2 - ax2, dy2 = by2 - ay2;
      var cx2 = (ax2 + bx2) / 2 + (-dy2 * 0.15);
      var cy2 = (ay2 + by2) / 2 + (dx2 * 0.15);
      ctx.beginPath();
      ctx.moveTo(ax2, ay2);
      ctx.quadraticCurveTo(cx2, cy2, bx2, by2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 3. Marcadores de marcha pulsantes em cada nó da rota
    for (var k = 0; k < pathKeys.length; k++) {
      var node = biomes.find(function(b){ return b.key === pathKeys[k]; });
      if (node) {
        var nx = node.x * w, ny = node.y * h;
        ctx.beginPath();
        ctx.arc(nx, ny, 3.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 8;
        ctx.fill();
      }
    }

    // 4. Marcador de destino selecionado (concentric pulsing target ring no alvo final)
    if (pathKeys.length > 0) {
      var destNode = biomes.find(function(b){ return b.key === pathKeys[pathKeys.length - 1]; });
      if (destNode) {
        var dnx = destNode.x * w, dny = destNode.y * h;
        var pulse = 0.5 + 0.5 * Math.sin(t / 220);
        ctx.save();
        ctx.beginPath();
        ctx.arc(dnx, dny, 8 + pulse * 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, ' + (0.65 + pulse * 0.35) + ')';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();
      }
    }

    // 5. Acampamentos de Descanso Longo (D&D 5e Wilderness March)
    if (pathKeys.length >= 3) {
      for (var ci = 1; ci < pathKeys.length - 1; ci++) {
        var campNode = biomes.find(function(b){ return b.key === pathKeys[ci]; });
        if (campNode) {
          var cnx = campNode.x * w, cny = campNode.y * h;
          _drawCampsiteWaypoint(ctx, cnx, cny, 'Descanso Longo · 8h');
        }
      }
    } else if (pathKeys.length === 2) {
      var nA = biomes.find(function(b){ return b.key === pathKeys[0]; });
      var nB = biomes.find(function(b){ return b.key === pathKeys[1]; });
      if (nA && nB) {
        var distPx = Math.hypot((nB.x - nA.x) * w, (nB.y - nA.y) * h);
        if (distPx > 160) {
          var ax0 = nA.x * w, ay0 = nA.y * h;
          var bx0 = nB.x * w, by0 = nB.y * h;
          var dx0 = bx0 - ax0, dy0 = by0 - ay0;
          var cx0 = (ax0 + bx0) / 2 + (-dy0 * 0.15);
          var cy0 = (ay0 + by0) / 2 + (dx0 * 0.15);
          _drawCampsiteWaypoint(ctx, cx0, cy0, 'Acampamento · 8h');
        }
      }
    }
    ctx.restore();
  }

  // === Retículo de Destino Pulsante AAA (Fase 15 - 2026-05-19) ===
  function _drawSelectedTargetHalo(ctx, node, w, h) {
    if (!node || typeof node.x !== 'number') return;
    var bx = node.x * w, by = node.y * h;
    var t = Date.now() * 0.003;
    var pulse = 1.0 + Math.sin(t) * 0.12;
    var r1 = 26 * pulse;
    var r2 = 33 * pulse;

    ctx.save();
    ctx.translate(bx, by);

    // Halo circular dourado suave
    ctx.beginPath();
    ctx.arc(0, 0, r1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.75)';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.85)';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Anel externo pontilhado
    ctx.beginPath();
    ctx.arc(0, 0, r2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4 Corner brackets (retículo tático D&D)
    var bDist = r2 + 4;
    var arm = 5;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Top-left
    ctx.moveTo(-bDist, -bDist + arm);
    ctx.lineTo(-bDist, -bDist);
    ctx.lineTo(-bDist + arm, -bDist);
    // Top-right
    ctx.moveTo(bDist - arm, -bDist);
    ctx.lineTo(bDist, -bDist);
    ctx.lineTo(bDist, -bDist + arm);
    // Bottom-left
    ctx.moveTo(-bDist, bDist - arm);
    ctx.lineTo(-bDist, bDist);
    ctx.lineTo(-bDist + arm, bDist);
    // Bottom-right
    ctx.moveTo(bDist - arm, bDist);
    ctx.lineTo(bDist, bDist);
    ctx.lineTo(bDist, bDist - arm);
    ctx.stroke();

    // Destino Badge acima do nó (evita colisão com o pill de nome/nível abaixo)
    ctx.font = '700 8.5px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;
    ctx.fillText('✦ DESTINO ✦', 0, -bDist - 4);

    ctx.restore();
  }

  // === Retículo de Busca no Canvas (Fase 20 D&D 5e) ===
  function _nodeMatchesSearch(b, q) {
    if (!q || !b) return false;
    var name = (b.regionalName || b.name || '').toLowerCase();
    var key = (b.key || '').toLowerCase();
    var biomeName = (b.biome || '').toLowerCase();
    var prov = (window.CartShared && CartShared.getLocationProvince) ? (CartShared.getLocationProvince(b.key).name || '').toLowerCase() : '';
    return name.indexOf(q) >= 0 || key.indexOf(q) >= 0 || biomeName.indexOf(q) >= 0 || prov.indexOf(q) >= 0;
  }

  function _drawSearchMatchBeacon(ctx, node, w, h) {
    if (!node || typeof node.x !== 'number') return;
    var bx = node.x * w, by = node.y * h;
    var t = Date.now() * 0.004;
    var pulse = 1.0 + Math.sin(t) * 0.16;
    var r = 24 * pulse;

    ctx.save();
    ctx.translate(bx, by);

    // Halo ciano-dourado pulsante
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.85)';
    ctx.lineWidth = 2.0;
    ctx.shadowColor = '#67e8f9';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Anel externo pontilhado
    ctx.beginPath();
    ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.55)';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4 Corner brackets de retículo
    var bD = r + 4;
    var arm = 4.5;
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-bD, -bD + arm); ctx.lineTo(-bD, -bD); ctx.lineTo(-bD + arm, -bD);
    ctx.moveTo(bD - arm, -bD); ctx.lineTo(bD, -bD); ctx.lineTo(bD, -bD + arm);
    ctx.moveTo(-bD, bD - arm); ctx.lineTo(-bD, bD); ctx.lineTo(-bD + arm, bD);
    ctx.moveTo(bD - arm, bD); ctx.lineTo(bD, bD); ctx.lineTo(bD, bD - arm);
    ctx.stroke();

    ctx.restore();
  }

  function _drawCampsiteWaypoint(ctx, x, y, label) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y - 14, 11, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(28, 18, 10, 0.88)';
    ctx.strokeStyle = 'rgba(245, 175, 45, 0.9)';
    ctx.lineWidth = 1.3;
    ctx.shadowColor = 'rgba(255, 170, 0, 0.55)';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.stroke();

    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⛺', x, y - 14);

    if (label) {
      ctx.font = '700 8px Cinzel, serif';
      ctx.fillStyle = '#ffd685';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 4;
      ctx.fillText(label, x, y - 28);
    }
    ctx.restore();
  }

  // === _drawCartScaleBar (Escala Cartográfica Oficial D&D 5e) ===
  function _drawCartScaleBar(ctx, w, h, viewMode) {
    ctx.save();
    var isProv = (viewMode === 'province');
    var barW = isProv ? 68 : 84;
    var x0 = 16;
    var y0 = h - 68;
    var label = isProv ? '5 Marcos (~15 Milhas)' : '25 Marcos (~75 Milhas)';

    // Caixa de fundo translúcida estilo manuscrito
    ctx.fillStyle = 'rgba(24, 16, 9, 0.78)';
    ctx.strokeStyle = 'rgba(196, 149, 58, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x0 - 6, y0 - 18, barW + 12, 26, 4);
    else ctx.rect(x0 - 6, y0 - 18, barW + 12, 26);
    ctx.fill();
    ctx.stroke();

    // Régua milimétrica com terminais
    ctx.strokeStyle = '#ffd685';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + barW, y0);
    ctx.moveTo(x0, y0 - 4); ctx.lineTo(x0, y0 + 4);
    ctx.moveTo(x0 + barW / 2, y0 - 3); ctx.lineTo(x0 + barW / 2, y0 + 3);
    ctx.moveTo(x0 + barW, y0 - 4); ctx.lineTo(x0 + barW, y0 + 4);
    ctx.stroke();

    // Texto Cinzel ouro
    ctx.font = '700 8.5px Cinzel, serif';
    ctx.fillStyle = '#ffd685';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;
    ctx.fillText(label, x0, y0 - 6);
    ctx.restore();
  }

  // === 16-Wind Nautical Bearing Table & Astrolabe Functions (D&D 5e) ===
  var _BEARING_16 = [
    { code: 'N',   name: 'Norte' },
    { code: 'NNE', name: 'Norte-Nordeste' },
    { code: 'NE',  name: 'Nordeste' },
    { code: 'ENE', name: 'Leste-Nordeste' },
    { code: 'L',   name: 'Leste' },
    { code: 'ESE', name: 'Leste-Sudeste' },
    { code: 'SE',  name: 'Sudeste' },
    { code: 'SSE', name: 'Sul-Sudeste' },
    { code: 'S',   name: 'Sul' },
    { code: 'SSO', name: 'Sul-Sudoeste' },
    { code: 'SO',  name: 'Sudoeste' },
    { code: 'OSO', name: 'Oeste-Sudoeste' },
    { code: 'O',   name: 'Oeste' },
    { code: 'ONO', name: 'Oeste-Noroeste' },
    { code: 'NO',  name: 'Noroeste' },
    { code: 'NNO', name: 'Norte-Noroeste' }
  ];

  function calcDistanceBearing(p1, p2, isProvince) {
    if (!p1 || !p2) return null;
    var x1 = (typeof p1.x === 'number') ? p1.x : 0.5;
    var y1 = (typeof p1.y === 'number') ? p1.y : 0.5;
    var x2 = (typeof p2.x === 'number') ? p2.x : 0.5;
    var y2 = (typeof p2.y === 'number') ? p2.y : 0.5;
    var dx = x2 - x1;
    var dy = y2 - y1;
    var distNorm = Math.sqrt(dx * dx + dy * dy);
    var baseMiles = isProvince ? 45 : 150;
    var miles = Math.max(1, Math.round(distNorm * baseMiles));
    var km = Math.round(miles * 1.6);
    var leagues = +(miles / 3).toFixed(1);

    // dy cresce para baixo, logo -dy aponta para o Norte
    var rad = Math.atan2(dx, -dy);
    var deg = Math.round((rad * 180 / Math.PI + 360) % 360);
    var sector = Math.floor(((deg + 11.25) % 360) / 22.5);
    var bEntry = _BEARING_16[sector] || _BEARING_16[0];

    return {
      miles: miles,
      km: km,
      leagues: leagues,
      degrees: deg,
      bearingCode: bEntry.code,
      bearingName: bEntry.name,
      hoursFoot: +(miles / 3).toFixed(1),
      hoursHorse: +(miles / 4).toFixed(1),
      hoursWagon: +(miles / 2).toFixed(1)
    };
  }

  // === _drawCartRuler (Astrolábio de Medição & Régua Cartográfica D&D 5e) ===
  function _drawCartRuler(ctx, startPt, currPt, S, offX, offY, viewMode) {
    if (!startPt || !currPt) return;
    var sx = offX + startPt.x * S;
    var sy = offY + startPt.y * S;
    var ex = offX + currPt.x * S;
    var ey = offY + currPt.y * S;

    var isProv = (viewMode === 'province');
    var m = calcDistanceBearing(startPt, currPt, isProv);
    if (!m) return;

    ctx.save();

    // 1. Linha de medição principal dourada com glow e tracejado
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
    ctx.lineWidth = 2.0;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.9)';
    ctx.shadowBlur = 8;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Terminais: anel na origem e retículo no destino
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    ctx.strokeStyle = '#221508';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ex, ey, 7, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ex - 10, ey); ctx.lineTo(ex + 10, ey);
    ctx.moveTo(ex, ey - 10); ctx.lineTo(ex, ey + 10);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 3. Marcas de léguas ao longo da linha (ticks)
    var distPx = Math.sqrt((ex - sx) * (ex - sx) + (ey - sy) * (ey - sy));
    var steps = Math.min(10, Math.max(2, Math.floor(m.leagues)));
    if (distPx > 40 && steps > 1) {
      for (var i = 1; i < steps; i++) {
        var t = i / steps;
        var tx = sx + (ex - sx) * t;
        var ty = sy + (ey - sy) * t;
        var perpX = -(ey - sy) / distPx;
        var perpY = (ex - sx) / distPx;
        ctx.beginPath();
        ctx.moveTo(tx - perpX * 4, ty - perpY * 4);
        ctx.lineTo(tx + perpX * 4, ty + perpY * 4);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    // 4. Cartouche flutuante de medição próximo ao ponto médio
    var mx = (sx + ex) / 2;
    var my = (sy + ey) / 2;
    my -= 24;

    var boxW = 148;
    var boxH = 48;
    ctx.fillStyle = 'rgba(22, 14, 8, 0.90)';
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.75)';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(mx - boxW / 2, my - boxH / 2, boxW, boxH, 4);
    else ctx.rect(mx - boxW / 2, my - boxH / 2, boxW, boxH);
    ctx.fill();
    ctx.stroke();

    // Textos do cartouche
    ctx.textAlign = 'center';
    ctx.font = '700 9.5px Cinzel, serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('📏 ' + m.miles + ' Milhas (~' + m.leagues + ' Léguas · ' + m.km + ' km)', mx, my - 10);

    ctx.font = '8.5px Georgia, serif';
    ctx.fillStyle = '#f4d49a';
    ctx.fillText('🧭 Rumo: ' + m.bearingCode + ' (' + m.degrees + '°) · 🚶 ~' + m.hoursFoot + 'h', mx, my + 3);

    ctx.font = 'italic 7.5px Georgia, serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('🐎 ~' + m.hoursHorse + 'h montaria · 🛒 ~' + m.hoursWagon + 'h caravana', mx, my + 15);

    ctx.restore();
  }

  // === calcExpeditionRationsBudget (Orçamento de Provisões D&D 5e PHB p. 185) ===
  function calcExpeditionRationsBudget(travelHours, partySize, biomeKey, foragerSuccess) {
    var h = (typeof travelHours === 'number' && travelHours > 0) ? travelHours : 8;
    var size = (typeof partySize === 'number' && partySize > 0) ? partySize : 4;
    var days = Math.max(1, Math.ceil(h / 8));
    var bk = (biomeKey || 'plains').toLowerCase();
    var isArid = (bk === 'desert' || bk === 'dunas_do_sul' || bk === 'volcanic' || bk.indexOf('desert') >= 0 || bk.indexOf('dunas') >= 0);
    var isBoreal = (bk === 'boreal' || bk === 'snow' || bk === 'terras_altas_do_norte' || bk.indexOf('snow') >= 0);

    var rationsGross = days * size;
    var waterGallonsGross = days * size * (isArid ? 2 : 1);

    var forInfo = (typeof getBiomeForageSustainability === 'function') ? getBiomeForageSustainability(bk) : null;
    var dc = forInfo ? forInfo.dc : 15;

    var foragedRations = 0;
    var foragedWater = 0;
    var forageStatus = 'não_forrageado';

    if (foragerSuccess === true || (typeof foragerSuccess === 'number' && foragerSuccess >= dc)) {
      if (forInfo && forInfo.rating === 'Abundante') {
        foragedRations = rationsGross;
        foragedWater = waterGallonsGross;
        forageStatus = 'fartura_total';
      } else if (forInfo && (forInfo.rating === 'Boa' || forInfo.rating === 'Moderada')) {
        foragedRations = Math.ceil(rationsGross * 0.75);
        foragedWater = Math.ceil(waterGallonsGross * 0.75);
        forageStatus = 'sucesso_parcial';
      } else {
        foragedRations = Math.ceil(rationsGross * 0.25);
        foragedWater = isArid ? 0 : Math.ceil(waterGallonsGross * 0.25);
        forageStatus = 'escassez';
      }
    }

    var netRations = Math.max(0, rationsGross - foragedRations);
    var netWater = Math.max(0, waterGallonsGross - foragedWater);

    var verdict = '';
    if (forageStatus === 'fartura_total') {
      verdict = 'Forrageamento abundante supriu toda a comida e água fresca!';
    } else if (forageStatus === 'sucesso_parcial') {
      verdict = 'Forrageador garantiu caça e água fresca; exige apenas ' + netRations + ' rações da mochila.';
    } else if (isArid) {
      verdict = 'Calor escaldante do deserto dobra o consumo d\'água (2 gal/dia por integrante). Sem forrageamento viável!';
    } else if (isBoreal) {
      verdict = 'Clima gélido exige derreter neve em fogueiras; consumo de rações de inverno padrão mantido.';
    } else {
      verdict = 'Consumo padrão de 1 ração e 1 galão d\'água diários por integrante da comitiva (PHB p. 185).';
    }

    return {
      travelDays: days,
      partySize: size,
      isArid: isArid,
      isBoreal: isBoreal,
      rationsGross: rationsGross,
      waterGallonsGross: waterGallonsGross,
      foragedRations: foragedRations,
      foragedWater: foragedWater,
      netRations: netRations,
      netWater: netWater,
      forageStatus: forageStatus,
      forageDC: dc,
      verdict: verdict
    };
  }

  // === getWildernessHazardDetails (Matriz de Perigos Naturais D&D 5e DMG p. 110-112) ===
  function getWildernessHazardDetails(biomeKey) {
    var bk = (biomeKey || 'plains').toLowerCase();
    if (bk.indexOf('desert') >= 0 || bk.indexOf('dunas') >= 0) {
      return {
        name: 'Calor Extremo & Tempestade de Areia',
        dndRef: 'DMG p. 110 (Extreme Heat)',
        dcCheck: 'Salvaguarda de CON CD 10 (+1/h)',
        effect: 'Exaustão por desidratação sob sol acima de 40°C',
        mitigation: 'Consumo duplo d\'água (2 gal/dia) ou marcha noturna',
        icon: '☀️',
        color: '#f97316'
      };
    } else if (bk.indexOf('swamp') >= 0 || bk.indexOf('pantan') >= 0) {
      return {
        name: 'Lodo Movediço & Bruma Decomposta',
        dndRef: 'DMG p. 110 (Quicksand)',
        dcCheck: 'Salvaguarda de DES ou CON CD 12',
        effect: 'Velocidade reduzida pela metade e risco de febre das brumas',
        mitigation: 'Batedor com vara de sondagem (Sobrevivência 12+)',
        icon: '☣️',
        color: '#84cc16'
      };
    } else if (bk.indexOf('mountain') >= 0 || bk.indexOf('cordilheira') >= 0 || bk.indexOf('pass') >= 0) {
      return {
        name: 'Penhascos Farpados & Cascalho Solto',
        dndRef: 'DMG p. 110 (Rockslide)',
        dcCheck: 'Salvaguarda de DES CD 13',
        effect: '2d10 dano de contusão ou atraso de 2h na rota',
        mitigation: 'Cordas de escalada e Guia de Montanha',
        icon: '🧗',
        color: '#94a3b8'
      };
    } else if (bk.indexOf('boreal') >= 0 || bk.indexOf('snow') >= 0 || bk.indexOf('norte') >= 0) {
      return {
        name: 'Frio Extremo & Nevasca Cegante',
        dndRef: 'DMG p. 110 (Extreme Cold)',
        dcCheck: 'Salvaguarda de CON CD 12',
        effect: 'Nível de Exaustão sem agasalhos térmicos',
        mitigation: 'Trajes de pele de lobo e fogueira de acampamento',
        icon: '❄️',
        color: '#38bdf8'
      };
    } else if (bk.indexOf('forest') >= 0 || bk.indexOf('floresta') >= 0) {
      return {
        name: 'Cipós Farpados & Bruma Ilusória',
        dndRef: 'DMG p. 110 (Razorvine & Foraging)',
        dcCheck: 'Salvaguarda de SAB ou DES CD 11',
        effect: 'Perda temporária de orientação ou cortes de espinhos',
        mitigation: 'Navegador com Percepção Passiva 12+ ou Bússola',
        icon: '🌿',
        color: '#22c55e'
      };
    } else if (bk.indexOf('volcanic') >= 0 || bk.indexOf('cave') >= 0) {
      return {
        name: 'Fumaça Enxofrada & Crosta Frágil',
        dndRef: 'DMG p. 111 (Toxic Fumes)',
        dcCheck: 'Salvaguarda de CON CD 13',
        effect: 'Envenenado por 1h ou dano ígneo de 1d6',
        mitigation: 'Máscaras de pano embebidas e passo firme',
        icon: '🌋',
        color: '#ef4444'
      };
    }
    return {
      name: 'Exposição Aberta & Chuvas Repentinas',
      dndRef: 'DMG p. 106 (Wilderness Travel)',
      dcCheck: 'Salvaguarda de CON CD 10 sob temporal',
      effect: 'Encharcamento e terreno lamacento reduzindo velocidade',
      mitigation: 'Capas de viagem impermeáveis e marcha constante',
      icon: '🌾',
      color: '#eab308'
    };
  }

  // === calcEncounterTableBreakdown (Tabela de Acasos e Emboscadas D&D 5e DMG p. 86 / 110) ===
  function calcEncounterTableBreakdown(biomeKey, options) {
    options = options || {};
    var bk = (biomeKey || 'plains').toLowerCase();
    var pace = options.pace || 'normal';
    var isNight = !!options.isNight;
    var hasVision = !!(options.hasDarkvision || options.hasTorch);
    var partyRole = options.role || 'scout';

    var allB = CART_BIOMES || [];
    var node = allB.find(function(b){ return b.key === bk; }) || { tier: 1 };
    var tier = (typeof node.tier === 'number') ? node.tier : 1;

    // Risco base segundo DMG p. 86 (d20 roll threshold)
    var baseChance = (tier <= 0) ? 0 :
                     (tier <= 1) ? 10 :
                     (tier <= 3) ? 18 :
                     (tier <= 5) ? 28 : 42;

    var paceMod = (pace === 'stealth') ? 0.55 : (pace === 'fast' ? 1.30 : 1.0);
    var lightMod = (!isNight) ? 1.0 : (hasVision ? 1.20 : 1.60);
    var roleMod = (partyRole === 'scout') ? 0.85 : 1.0;

    var finalChance = Math.min(85, Math.max(0, Math.round(baseChance * paceMod * lightMod * roleMod)));
    var d20Threshold = Math.max(2, 21 - Math.round(finalChance / 5));

    var baseSurpriseDC = 10 + Math.min(10, tier * 2);
    if (pace === 'stealth') baseSurpriseDC -= 3;
    if (pace === 'fast') baseSurpriseDC += 4;
    if (isNight && !hasVision) baseSurpriseDC += 5;

    // Categorias de Encontro por Bioma
    var encTypes = [];
    if (bk.indexOf('desert') >= 0 || bk.indexOf('dunas') >= 0) {
      encTypes = [
        { label: 'Bandos de Nômades Salteadores', pct: '35%', desc: 'Guerreiros do deserto emboscando em desfiladeiros rochosos.', icon: '⚔️' },
        { label: 'Verme da Areia / Escorpião Gigante', pct: '30%', desc: 'Predador alfa subterrâneo atraído por vibrações na areia.', icon: '🦂' },
        { label: 'Caravana de Especiarias Sitiada', pct: '20%', desc: 'Mercadores perdidos precisando de água e escolta armada.', icon: '🐪' },
        { label: 'Monólito Arcano Submerso', pct: '15%', desc: 'Ruína de civilização esquecida com runas de teletransporte.', icon: '🏛️' }
      ];
    } else if (bk.indexOf('swamp') >= 0 || bk.indexOf('pantan') >= 0) {
      encTypes = [
        { label: 'Emboscada de Trogloditas & Homens-Lagarto', pct: '40%', desc: 'Ataque surpresa emergindo das águas escuras com dardos venenosos.', icon: '🦎' },
        { label: 'Fogo-Fátuo & Assombrações', pct: '25%', desc: 'Entidades ilusórias que atraem incautos para charcos profundos.', icon: '👻' },
        { label: 'Herborista Selvagem ou Eremita', pct: '20%', desc: 'Habitante do pântano oferecendo poções em troca de itens raros.', icon: '🧪' },
        { label: 'Ninho Submerso de Hidra Jovem', pct: '15%', desc: 'Monstro lendário guardando relicário encharcado.', icon: '🐉' }
      ];
    } else if (bk.indexOf('mountain') >= 0 || bk.indexOf('cordilheira') >= 0) {
      encTypes = [
        { label: 'Patrulha de Gigantes das Colinas / Ogros', pct: '35%', desc: 'Forças brutas arremessando rochedos das alturas.', icon: '🧌' },
        { label: 'Wyverns ou Harpias Aladas', pct: '30%', desc: 'Ataque aéreo vindo das correntes térmicas dos picos.', icon: '🦅' },
        { label: 'Batedores da Guarda de Korthag', pct: '20%', desc: 'Sentinelas anões patrulhando os passos montanhosos.', icon: '🛡️' },
        { label: 'Entrada de Mina Antiga Desmoronada', pct: '15%', desc: 'Filão de minério nobre com riscos de desabamento.', icon: '⛏️' }
      ];
    } else if (bk.indexOf('snow') >= 0 || bk.indexOf('boreal') >= 0) {
      encTypes = [
        { label: 'Matilha de Lobos Invernais', pct: '40%', desc: 'Predadores com sopro gélido flanqueando em meio à nevasca.', icon: '🐺' },
        { label: 'Gigante do Gelo Solitário', pct: '25%', desc: 'Guerreiro titânico vasculhando os ermos glaciais.', icon: '❄️' },
        { label: 'Caçadores Nômades da Tundra', pct: '20%', desc: 'Companhia de caça disposta a trocar peles e carne seca.', icon: '🏹' },
        { label: 'Caverna Glacial com Santuário Congelado', pct: '15%', desc: 'Refúgio natural com cristais de gelo perene.', icon: '🧊' }
      ];
    } else if (bk.indexOf('forest') >= 0 || bk.indexOf('floresta') >= 0) {
      encTypes = [
        { label: 'Bando de Goblins ou Aranhas Gigantes', pct: '35%', desc: 'Armadilhas de teia suspensas nas copas ancestrais.', icon: '🕷️' },
        { label: 'Entidade Feérica / Dríade Protetora', pct: '30%', desc: 'Guardiã do bosque exigindo respeito ou oferenda.', icon: '🧚' },
        { label: 'Caçadores Élficos em Rastreio', pct: '20%', desc: 'Arqueiros das ruínas trocando informações sobre a mata.', icon: '🏹' },
        { label: 'Círculo de Pedras Mágicas Ancestrais', pct: '15%', desc: 'Altar druídico que restaura pontos de magia ou vida.', icon: '🌿' }
      ];
    } else {
      encTypes = [
        { label: 'Salteadores de Estrada ou Bandidos', pct: '35%', desc: 'Bandidos de estrada buscando tributo de mercadorias.', icon: '⚔️' },
        { label: 'Caravana de Mercadores Ambulantes', pct: '30%', desc: 'Venda de provisões, tochas e consumíveis de estrada.', icon: '🛒' },
        { label: 'Patrulha da Guarnição de Valdória', pct: '20%', desc: 'Soldados assegurando as fronteiras da capital.', icon: '🛡️' },
        { label: 'Acampamento Abandonado com Rastros', pct: '15%', desc: 'Fogueira recente com pistas de eventos locais.', icon: '⛺' }
      ];
    }

    var advice = '';
    if (finalChance === 0) {
      advice = 'Percurso em território seguro sob vigilância régia (sem risco de emboscadas).';
    } else if (finalChance <= 15) {
      advice = 'Estrada pacífica. Vigilância padrão de sentinela é suficiente para uma marcha tranquila.';
    } else if (finalChance <= 30) {
      advice = 'Região moderadamente hostil. Mantenha armas a postos e batedor atento na vanguarda.';
    } else {
      advice = 'Perigo Crítico! Ritmo Furtivo e guarda de prontidão fortemente recomendados.';
    }

    return {
      tier: tier,
      baseChance: baseChance,
      finalChance: finalChance,
      d20Threshold: d20Threshold,
      surpriseDC: baseSurpriseDC,
      encounterTypes: encTypes,
      advice: advice
    };
  }

  // === _drawFocusPulseBeacon (Alvo Tático com Ondas Concêntricas D&D 5e / CRPG AAA) ===
  function _drawFocusPulseBeacon(ctx, node, w, h, elapsedSec) {
    if (!node || typeof node.x !== 'number') return;
    var bx = node.x * w, by = node.y * h;
    var t = Math.max(0, Math.min(2.5, elapsedSec || 0));
    var progress = t / 2.5; // 0.0 -> 1.0
    var alpha = Math.max(0, 1.0 - progress);

    ctx.save();
    ctx.translate(bx, by);

    // 1. Onda concêntrica expansiva 1
    var r1 = 14 + progress * 46;
    ctx.beginPath();
    ctx.arc(0, 0, r1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 215, 0, ' + (alpha * 0.9) + ')';
    ctx.lineWidth = 2.0;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 8;
    ctx.stroke();

    // 2. Onda concêntrica expansiva 2 (ligeiramente defasada)
    if (progress > 0.15) {
      var r2 = 14 + (progress - 0.15) * 42;
      var a2 = Math.max(0, 1.0 - (progress - 0.15) / 0.85);
      ctx.beginPath();
      ctx.arc(0, 0, r2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(245, 158, 11, ' + (a2 * 0.7) + ')';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    // 3. Mira tática em cruz (+)
    ctx.strokeStyle = 'rgba(255, 235, 150, ' + alpha + ')';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -26); ctx.lineTo(0, -12);
    ctx.moveTo(0, 12);  ctx.lineTo(0, 26);
    ctx.moveTo(-26, 0); ctx.lineTo(-12, 0);
    ctx.moveTo(12, 0);  ctx.lineTo(26, 0);
    ctx.stroke();

    // 4. Etiqueta de mira superior
    ctx.font = 'bold 8.5px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 215, 0, ' + alpha + ')';
    ctx.fillText('🎯 ALVO FOCADO', 0, -30);

    ctx.restore();
  }

  // === calcPartyEncumbranceImpact (Sobrecarga e Capacidade de Carga D&D 5e PHB p. 176) ===
  function calcPartyEncumbranceImpact(totalWeightLbs, partyStrengthSum, transportMode) {
    var str = (typeof partyStrengthSum === 'number' && partyStrengthSum > 0) ? partyStrengthSum : 52;
    var weight = (typeof totalWeightLbs === 'number' && totalWeightLbs >= 0) ? totalWeightLbs : 180;
    var mode = (transportMode || 'foot').toLowerCase();

    // Capacidades base segundo a regra variante D&D 5e (PHB p. 176)
    var mult = (mode === 'wagon') ? 8.0 : ((mode === 'horse') ? 2.5 : 1.0);
    var capLight = Math.round(str * 5 * mult);
    var capHeavy = Math.round(str * 10 * mult);
    var capMax = Math.round(str * 15 * mult);

    var tier = 'desimpedido';
    var speedPenalty = 0;
    var timeMultiplier = 1.0;
    var label = '🟢 Marcha Livre (Carga Leve)';
    var desc = 'Comitiva ágil com mochilas equilibradas. Deslocamento sem penalidades (PHB p. 176).';
    var color = '#86efac';

    if (weight > capMax) {
      tier = 'imobilizado';
      speedPenalty = -30;
      timeMultiplier = 999.0;
      label = '⛔ Carga Excessiva (Imobilizado)';
      desc = 'O peso ultrapassa a capacidade máxima da comitiva. Deslocamento reduzido a zero.';
      color = '#ef4444';
    } else if (weight > capHeavy) {
      tier = 'sobrecarga_pesada';
      speedPenalty = -20;
      timeMultiplier = 1.65;
      label = '🔴 Sobrecarga Severa (-20 pés)';
      desc = 'Desvantagem em testes de perícias físicas e salvaguardas. A marcha requer +65% de tempo.';
      color = '#f87171';
    } else if (weight > capLight) {
      tier = 'sobrecarga_leve';
      speedPenalty = -10;
      timeMultiplier = 1.25;
      label = '🟡 Sobrecarga Leve (-10 pés)';
      desc = 'Peso acima do ideal reduz o deslocamento em 10 pés. A marcha requer +25% de tempo.';
      color = '#fde047';
    }

    return {
      weightLbs: weight,
      partyStrength: str,
      transportMode: mode,
      capLight: capLight,
      capHeavy: capHeavy,
      capMax: capMax,
      tier: tier,
      speedPenaltyFt: speedPenalty,
      timeMultiplier: timeMultiplier,
      label: label,
      desc: desc,
      color: color
    };
  }

  // === calcRouteElevationProfile (Perfil Topográfico e Altimetria D&D 5e DMG p. 109) ===
  function calcRouteElevationProfile(routeKeys, options) {
    options = options || {};
    var RB = CART_BIOMES || [];
    var keys = (Array.isArray(routeKeys) && routeKeys.length) ? routeKeys : ['plains'];

    var steps = [];
    var minM = 99999, maxM = -99999;
    var totalAscent = 0, totalDescent = 0;
    var prevM = null;

    keys.forEach(function(k){
      var node = RB.find(function(b){ return b.key === k; }) || { key: k, name: k, biome: 'plains', tier: 1 };
      var alt = getBiomeAltitude(node.biome || node.key, node.tier);
      var m = alt ? alt.meters : 120;
      if (m < minM) minM = m;
      if (m > maxM) maxM = m;

      if (prevM !== null) {
        var delta = m - prevM;
        if (delta > 0) totalAscent += delta;
        else totalDescent += Math.abs(delta);
      }
      prevM = m;

      steps.push({
        key: k,
        name: node.regionalName || node.name,
        meters: m,
        isHighAltitude: !!(alt && alt.isHighAltitude)
      });
    });

    if (minM === 99999) minM = 120;
    if (maxM === -99999) maxM = 120;

    // Gerar sparkline ASCII do perfil topográfico
    var chars = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    var range = Math.max(1, maxM - minM);
    var sparkline = steps.map(function(s){
      var idx = Math.min(chars.length - 1, Math.floor(((s.meters - minM) / range) * chars.length));
      return chars[idx];
    }).join('');

    var exertionHours = +(totalAscent / 600).toFixed(1);
    var hasExtreme = steps.some(function(s){ return s.isHighAltitude || s.meters >= 2000; });

    return {
      steps: steps,
      minMeters: minM,
      maxMeters: maxM,
      totalAscent: totalAscent,
      totalDescent: totalDescent,
      ascentExertionHours: exertionHours,
      hasExtremeAltitude: hasExtreme,
      sparkline: sparkline,
      summary: minM + 'm ➔ ' + maxM + 'm (+Δh ' + totalAscent + 'm subida acumulada)'
    };
  }

  // === calcTransportComparison (Comparativo Instantâneo de Modos de Transporte D&D 5e) ===
  function calcTransportComparison(miles, pace) {
    var dist = (typeof miles === 'number' && miles > 0) ? miles : 15;
    var p = pace || 'normal';
    var speedMod = (p === 'fast') ? 1.33 : ((p === 'stealth') ? 0.67 : 1.0);

    var list = [
      { key: 'foot',  name: 'A Pé',        icon: '🚶', speedMph: 3.0, feature: 'Mochilas prontas e sentidos aguçados (PHB p. 181)' },
      { key: 'horse', name: 'Montaria',    icon: '🐎', speedMph: 4.0, feature: '+33% Velocidade em estradas; consome ração de forragem' },
      { key: 'wagon', name: 'Caravana',    icon: '🛒', speedMph: 3.0, feature: 'Carga pesada segura; -10% risco de emboscada noturna' },
      { key: 'boat',  name: 'Barco Fluvial', icon: '⛵', speedMph: 5.0, feature: 'Velocidade fluvial acelerada; sem fadiga de marcha' }
    ];

    return list.map(function(item){
      var h = +(dist / (item.speedMph * speedMod)).toFixed(1);
      var days = Math.max(1, Math.ceil(h / 8));
      return {
        key: item.key,
        name: item.name,
        icon: item.icon,
        speedMph: item.speedMph,
        hours: h,
        days: days,
        feature: item.feature
      };
    });
  }

  // === calcExpeditionSchedule (Cronograma de Viagem e Ciclo Dia/Noite D&D 5e) ===
  function calcExpeditionSchedule(travelHours, startHour, options) {
    options = options || {};
    var h = (typeof travelHours === 'number' && travelHours > 0) ? travelHours : 4;
    var curH = (typeof startHour === 'number' && startHour >= 0 && startHour < 24) ? Math.floor(startHour) : 8;

    function _formatHour(val) {
      var hh = Math.floor(val) % 24;
      var mm = Math.round((val - Math.floor(val)) * 60);
      return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
    }

    function _periodName(val) {
      var hh = Math.floor(val) % 24;
      if (hh >= 5 && hh < 8) return 'Alvorecer';
      if (hh >= 8 && hh < 12) return 'Manhã';
      if (hh >= 12 && hh < 14) return 'Meio-Dia';
      if (hh >= 14 && hh < 18) return 'Tarde';
      if (hh >= 18 && hh < 21) return 'Crepúsculo';
      return 'Noite Fechada';
    }

    var depStr = 'Dia 1, ' + _formatHour(curH) + ' (' + _periodName(curH) + ')';
    var camps = [];
    var currentDay = 1;
    var clock = curH;
    var remainingMarch = h;
    var nightMarchHours = 0;

    while (remainingMarch > 0) {
      var marchThisDay = Math.min(8, remainingMarch);
      for (var step = 0; step < marchThisDay; step++) {
        var ch = (clock + step) % 24;
        if (ch < 6 || ch >= 20) nightMarchHours++;
      }
      clock += marchThisDay;
      remainingMarch -= marchThisDay;

      if (remainingMarch > 0) {
        camps.push({
          day: currentDay,
          startHour: _formatHour(clock),
          period: _periodName(clock),
          duration: '8h de Descanso Longo'
        });
        currentDay++;
        clock = (clock + 8) % 24;
        if (clock < 6) clock = 7;
      }
    }

    var arrStr = 'Dia ' + currentDay + ', ' + _formatHour(clock) + ' (' + _periodName(clock) + ')';

    return {
      departureStr: depStr,
      arrivalStr: arrStr,
      totalDays: currentDay,
      travelHours: h,
      nightMarchHours: nightMarchHours,
      camps: camps,
      summary: depStr + ' ➔ ' + arrStr
    };
  }

  // === getExplorationStats (Dossiê de Exploração e Cartografia do Reino D&D 5e) ===
  function getExplorationStats(knownLocations, ownedMaps) {
    var known = Array.isArray(knownLocations) ? knownLocations : ['plains'];
    var maps = Array.isArray(ownedMaps) ? ownedMaps : [];

    var allB = CART_BIOMES || [];
    var totalBiomes = allB.length;
    var discoveredBiomes = allB.filter(function(b){
      return b.isOrigin || known.indexOf(b.key) >= 0 || (b.mapKey && maps.indexOf(b.mapKey) >= 0);
    }).length;
    var pctBiomes = Math.round((discoveredBiomes / totalBiomes) * 100);

    var totalProvs = (CART_PROVINCES || []).filter(function(p){ return p.id !== 'world'; }).length;
    var discProvs = (CART_PROVINCES || []).filter(function(p){
      if (p.id === 'world') return false;
      return isProvinceDiscovered(p.id, known, maps);
    }).length;
    var pctProvs = Math.round((discProvs / totalProvs) * 100);

    var allSanctuaries = allB.filter(function(b){ return b.isSanctuary; });
    var discSanctuaries = allSanctuaries.filter(function(b){
      return b.isOrigin || known.indexOf(b.key) >= 0;
    }).length;

    var totalMilesMapped = allB.filter(function(b){
      return b.isOrigin || known.indexOf(b.key) >= 0;
    }).reduce(function(acc, b){
      var marcos = (typeof b.marcos === 'number') ? b.marcos : (b.tier || 1);
      return acc + Math.max(6, marcos * 8);
    }, 0);

    var cartographerTitle = (pctBiomes >= 90) ? 'Mestre Supremo dos Ermos' :
                            (pctBiomes >= 70) ? 'Cartógrafo Real Veterano' :
                            (pctBiomes >= 45) ? 'Batedor Experiente de Estradas' :
                            (pctBiomes >= 20) ? 'Andarilho dos Caminhos' : 'Explorador Novato';

    return {
      totalBiomes: totalBiomes,
      discoveredBiomes: discoveredBiomes,
      biomePct: pctBiomes,
      totalProvinces: totalProvs,
      discoveredProvinces: discProvs,
      provincePct: pctProvs,
      totalSanctuaries: allSanctuaries.length,
      discoveredSanctuaries: discSanctuaries,
      totalMilesMapped: totalMilesMapped,
      cartographerTitle: cartographerTitle
    };
  }

  // === calcNavigationOrientationCheck (Testes de Orientação & Risco de se Perder - DMG p. 111) ===
  function calcNavigationOrientationCheck(biomeKey, options) {
    options = options || {};
    var bKey = (biomeKey || 'plains').toLowerCase();

    // CD Base por Terreno (DMG p. 111)
    var baseDC = 10;
    if (bKey === 'forest' || bKey === 'floresta' || bKey === 'swamp' || bKey === 'pantano' || bKey === 'hills' || bKey === 'colinas') {
      baseDC = 15;
    } else if (bKey === 'desert' || bKey === 'deserto' || bKey === 'mountain' || bKey === 'montanha' || bKey === 'snow' || bKey === 'tundra' || bKey === 'volcanic' || bKey === 'cave') {
      baseDC = 20;
    }

    var mod = 0;
    var factors = [];

    // Estradas ou trilhas batidas
    if (options.hasRoadOrTrail) {
      mod -= 5;
      factors.push('Trilha batida / estrada (-5 CD)');
    }

    // Carta topográfica regional possuída
    if (options.hasChartedMap) {
      mod -= 5;
      factors.push('Carta regional cartografada (-5 CD)');
    }

    // Ritmo de marcha (PHB p. 182)
    var pace = options.pace || 'normal';
    if (pace === 'fast') {
      mod += 5;
      factors.push('Marcha rápida com menor atenção a marcos (+5 CD)');
    }

    // Clima adverso
    var w = (options.weather || '').toLowerCase();
    if (w === 'storm' || w === 'tempestade' || w === 't' || w === 'fog' || w === 'nevoa' || w === 'n' || w === 'blizzard' || w === 'sandstorm') {
      mod += 5;
      factors.push('Clima ofuscante / névoa / tempestade (+5 CD)');
    }

    // Marcha noturna sem iluminação adequada
    if (options.isNight && !options.hasLight && !options.hasDarkvision) {
      mod += 5;
      factors.push('Escuridão total sem tocha ou visão no escuro (+5 CD)');
    }

    var finalDC = Math.max(5, Math.min(25, baseDC + mod));

    var rating = 'Moderado';
    var color = '#facc15';
    if (finalDC <= 10) {
      rating = 'Fácil';
      color = '#4ade80';
    } else if (finalDC <= 14) {
      rating = 'Moderado';
      color = '#facc15';
    } else if (finalDC <= 18) {
      rating = 'Desafiador';
      color = '#fb923c';
    } else if (finalDC <= 22) {
      rating = 'Severo';
      color = '#f87171';
    } else {
      rating = 'Extremo';
      color = '#c084fc';
    }

    var lostPenalty = 'Desvio de 1d6 milhas fora do rumo pretendido e perda de 1d4 horas para se reorientar (DMG p. 111).';

    return {
      baseDC: baseDC,
      finalDC: finalDC,
      difficultyRating: rating,
      color: color,
      factors: factors,
      lostPenalty: lostPenalty,
      summary: 'Sobrevivência CD ' + finalDC + ' (' + rating + ')'
    };
  }

  // === findNearestSanctuary (Localização do Refúgio / Santuário mais Próximo) ===
  function findNearestSanctuary(locKey) {
    var allB = CART_BIOMES || [];
    if (!allB.length) return null;

    var curLoc = allB.find(function(b){ return b.key === locKey; });
    var sanctuaries = allB.filter(function(b){
      return b.isSanctuary === true || b.settlement === true || b.isOrigin === true;
    });

    if (!sanctuaries.length) return null;

    var isCurrentSanctuary = curLoc && (curLoc.isSanctuary || curLoc.settlement || curLoc.isOrigin);

    var nearest = null;
    var minMiles = Infinity;
    var nearestMb = null;

    sanctuaries.forEach(function(sanc){
      if (curLoc && sanc.key === curLoc.key) return; // ignora o próprio local
      var mb = (curLoc && calcDistanceBearing) ? calcDistanceBearing(curLoc, sanc, false) : { miles: 12, bearingCode: 'N', bearingName: 'Norte' };
      if (mb && mb.miles < minMiles) {
        minMiles = mb.miles;
        nearest = sanc;
        nearestMb = mb;
      }
    });

    if (!nearest) {
      if (isCurrentSanctuary) {
        return {
          key: curLoc.key,
          name: curLoc.regionalName || curLoc.name,
          distanceMiles: 0,
          travelHours: 0,
          bearingCode: 'Local',
          bearingName: 'Aqui',
          isReachableInOneDay: true,
          isCurrentLocationSanctuary: true,
          retreatAdvice: 'A comitiva já se encontra abrigada dentro de um Santuário ou Assentamento seguro.'
        };
      }
      return null;
    }

    var distMiles = nearestMb ? nearestMb.miles : 15;
    var travelHours = Math.max(1, Math.round(distMiles / 3));
    var isOneDay = (travelHours <= 8);

    return {
      key: nearest.key,
      name: nearest.regionalName || nearest.name,
      distanceMiles: distMiles,
      travelHours: travelHours,
      bearingCode: nearestMb ? nearestMb.bearingCode : 'N',
      bearingName: nearestMb ? nearestMb.bearingName : 'Norte',
      isReachableInOneDay: isOneDay,
      isCurrentLocationSanctuary: !!isCurrentSanctuary,
      retreatAdvice: isOneDay
        ? 'Refúgio Seguro: Alcance de 1 dia de marcha sem pernoite em acampamento selvagem.'
        : 'Aviso de Retirada: Marcha demorada (>8h) exigirá acampamento na estrada; providencie vigília redobrada.'
    };
  }

  // === getTrailSpoorClues (Pistas de Trilha e Rastreamento D&D 5e - DMG p. 244) ===
  function getTrailSpoorClues(biomeKey, tier) {
    var bk = (biomeKey || 'plains').toLowerCase();
    var t = (typeof tier === 'number') ? tier : 1;

    var spoorTable = {
      plains: {
        spoorType: 'Pegadas & Capim Batido',
        clueText: 'Marcas de cascos fendidos e capim amassado indicam trânsito recente de patrulhas montadas ou bandos de salteadores.',
        baseDC: 10,
        creatureHint: 'Patrulhas Humanoides ou Bandidos'
      },
      forest: {
        spoorType: 'Galhos Rompidos & Arranhões',
        clueText: 'Galhos estalados na altura dos ombros e musgo raspado nos troncos denunciam passagem de feras predatórias de grande porte.',
        baseDC: 11,
        creatureHint: 'Ursos-Coruja, Lobos Terríveis ou Aranhas Gigantes'
      },
      swamp: {
        spoorType: 'Sulcos no Lodo & Miasma',
        clueText: 'Rastros sinuosos arrastados na lama fétida com bolhas de metano ascendendo continuamente à tona da água estagnada.',
        baseDC: 12,
        creatureHint: 'Lagartos Gigantes, Bruxas do Pântano ou Trogloditas'
      },
      mountain: {
        spoorType: 'Cascalho Solto & Ossadas',
        clueText: 'Lascas de pedra pontiagudas recém-quebradas na beirada do desfiladeiro e ossadas atiradas de grandes altitudes.',
        baseDC: 13,
        creatureHint: 'Harpies, Wyverns ou Gigantes das Colinas'
      },
      desert: {
        spoorType: 'Ondulações na Areia & Carcaças Secas',
        clueText: 'Sulcos largos serpenteando entre as dunas móveis e exoesqueletos quitinosos ressequidos pelo sol escaldante.',
        baseDC: 14,
        creatureHint: 'Vermes das Dunas, Escorpiões Gigantes ou Salteadores Nômades'
      },
      snow: {
        spoorType: 'Pegadas Congeladas & Penugem',
        clueText: 'Pegadas fundas na crosta de gelo com tufos de pelos esbranquiçados retidos nos espinhos congelados.',
        baseDC: 13,
        creatureHint: 'Lobos do Inverno, Yetis ou Ogros do Gelo'
      },
      graveyard: {
        spoorType: 'Terra Revolvida & Sudários',
        clueText: 'Montículos de terra úmida recém-remexida junto aos mausoléus e tiras rasgadas de mortalhas enroscadas nas cruzes.',
        baseDC: 12,
        creatureHint: 'Carniçais, Zumbis ou Cultistas Profanos'
      },
      cave: {
        spoorType: 'Saliva Ácida & Marcas de Garras',
        clueText: 'Gotejamento pegajoso corroendo a pedra calcária e marcas de unhas afiadas escavadas nas paredes rochosas.',
        baseDC: 13,
        creatureHint: 'Trogloditas, Troglobitas ou Aberrações das Profundezas'
      },
      volcanic: {
        spoorType: 'Cinzas Fumegantes & Escamas Calcinadas',
        clueText: 'Pegadas carbonizadas emanando vapores sulfúricos leves e fragmentos de casca vítrea calcinada na borda das fissuras.',
        baseDC: 14,
        creatureHint: 'Salamandras de Fogo, Elementais ou Cães do Inferno'
      }
    };

    var item = spoorTable[bk] || {
      spoorType: 'Vestígios dos Ermos',
      clueText: 'Sinais de circulação recente de andarilhos e bestas silvestres ao longo dos caminhos esquecidos.',
      baseDC: 11,
      creatureHint: 'Criaturas Selvagens Locais'
    };

    var finalDC = item.baseDC + Math.min(5, Math.max(0, t - 1));

    return {
      spoorType: item.spoorType,
      clueText: item.clueText,
      survivalDC: finalDC,
      creatureHint: item.creatureHint,
      dndRef: 'DMG p. 244 (Rastreamento)'
    };
  }

  // === calcExtremeWeatherExposure (Exposição Climática Extrema e Salvaguardas - DMG p. 110) ===
  function calcExtremeWeatherExposure(biomeKey, weatherCode, options) {
    options = options || {};
    var bk = (biomeKey || 'plains').toLowerCase();
    var w = (weatherCode || 's').toLowerCase();

    // 1. Frio Extremo (DMG p. 110: Tundra, Neve, Montanha em nevasca ou inverno)
    if (bk === 'snow' || bk === 'tundra' || bk === 'neve' || (bk === 'mountain' && (w === 'snow' || w === 'blizzard' || w === 'cold'))) {
      var hasWinterGear = !!options.hasWinterGear;
      var coldMitigation = hasWinterGear
        ? 'Agasalhos de inverno e peles espessas garantem imunidade contra o teste de frio extremo.'
        : 'Sem trajes térmicos: cada falha impõe 1 nível de Exaustão ao aventureiro.';
      return {
        hasHazard: true,
        hazardType: 'extreme_cold',
        title: '❄️ Frio Extremo (DMG p. 110)',
        dcCheck: 'Salvaguarda de Constituição CD 10 ao fim de cada hora',
        saveType: 'CON',
        dcValue: 10,
        isMitigated: hasWinterGear,
        exhaustionRisk: hasWinterGear ? 'Nenhum' : 'Alto',
        exhaustionColor: hasWinterGear ? '#4ade80' : '#f87171',
        waterMultiplier: 1,
        mitigationText: coldMitigation,
        tacticalAdvice: 'Acenda fogueiras nos descansos e utilize mantos forrados contra a hipotermia.',
        dndRef: 'DMG p. 110'
      };
    }

    // 2. Calor Extremo (DMG p. 110: Deserto, Vulcânico sob sol escaldante)
    if (bk === 'desert' || bk === 'deserto' || bk === 'volcanic' || bk === 'vulcanico' || w === 'hot' || w === 'heatwave') {
      var hasHeavyArmor = !!(options.hasHeavyArmor || options.hasMediumArmor);
      var heatDisadvNote = hasHeavyArmor ? ' (Desvantagem por armadura pesada/média)' : '';
      return {
        hasHazard: true,
        hazardType: 'extreme_heat',
        title: '☀️ Calor Escaldante (DMG p. 110)',
        dcCheck: 'Salvaguarda de Constituição CD 5 (+1 por hora adicional)' + heatDisadvNote,
        saveType: 'CON',
        dcValue: 5,
        isMitigated: false,
        exhaustionRisk: hasHeavyArmor ? 'Severo' : 'Moderado',
        exhaustionColor: hasHeavyArmor ? '#ef4444' : '#fb923c',
        waterMultiplier: 2,
        mitigationText: 'Consumo dobrado de água (2 galões/dia) e descanso em sombras nas horas mais quentes (11h-15h).',
        tacticalAdvice: 'Prefira marcha crepuscular ou noturna e evite armaduras de placas metálicas ao meio-dia.',
        dndRef: 'DMG p. 110'
      };
    }

    // 3. Ventos Fortes e Precipitação Torrencial (DMG p. 110)
    if (w === 'storm' || w === 'tempestade' || w === 't' || w === 'blizzard' || w === 'sandstorm') {
      return {
        hasHazard: true,
        hazardType: 'heavy_storm',
        title: '🌪️ Intempérie Severa (DMG p. 110)',
        dcCheck: 'Desvantagem em ataques à distância e Percepção visual/auditiva',
        saveType: 'None',
        dcValue: 0,
        isMitigated: false,
        exhaustionRisk: 'Baixo',
        exhaustionColor: '#facc15',
        waterMultiplier: 1,
        mitigationText: 'Tochas são apagadas; lanternas cobertas ou luz mágica são mandatórias.',
        tacticalAdvice: 'Mantenha a comitiva em formação fechada para evitar dispersão no vendaval.',
        dndRef: 'DMG p. 110'
      };
    }

    // Clima Temperado normal
    return {
      hasHazard: false,
      hazardType: 'temperate',
      title: 'Clima Temperado Estável',
      dcCheck: 'Nenhuma salvaguarda climática exigida',
      saveType: 'None',
      dcValue: 0,
      isMitigated: true,
      exhaustionRisk: 'Nenhum',
      exhaustionColor: '#4ade80',
      waterMultiplier: 1,
      mitigationText: 'Condições térmicas confortáveis para a marcha.',
      tacticalAdvice: 'Manter ritmo habitual de caminhada e hidratação padrão.',
      dndRef: 'DMG p. 110'
    };
  }

  // === calcMountLogistics (Capacidade de Carga, Forragem e Desgaste de Montarias - PHB p. 157) ===
  function calcMountLogistics(transportMode, partyWeightLbs, travelDays) {
    var mode = transportMode || 'foot';
    var days = Math.max(1, Math.round(travelDays || 1));
    var weight = Math.max(0, partyWeightLbs || 0);

    var specs = {
      foot: {
        name: 'Marcha a Pé (Sem Montaria)',
        carryCap: 0,
        pullCap: 0,
        fodderDailyCopper: 0,
        terrainBonus: 'Adaptabilidade total em encostas, matas densas e pântanos sem risco de lesão animal.',
        enduranceNote: 'A comitiva depende exclusivamente do próprio vigor físico dos aventureiros.'
      },
      horse: {
        name: 'Cavalos de Montaria (PHB p. 157)',
        carryCap: 480,
        pullCap: 2400,
        fodderDailyCopper: 5,
        terrainBonus: '+33% velocidade em estradas e planícies; terreno difícil reduz a velocidade à metade.',
        enduranceNote: 'Pode percorrer até 32 milhas em marcha rápida antes de exigir descanso e água para as montarias.'
      },
      wagon: {
        name: 'Carroça com Animais de Tração (PHB p. 157)',
        carryCap: 1200,
        pullCap: 2400,
        fodderDailyCopper: 10,
        terrainBonus: 'Capacidade máxima de transporte de mantimentos, armas e tesouros pesados da comitiva.',
        enduranceNote: 'Restrito a estradas, colinas suaves e planícies; intransponível em ravinas e lamaçal denso.'
      },
      boat: {
        name: 'Embarcação Fluvial / Bote a Remos (PHB p. 157)',
        carryCap: 1500,
        pullCap: 0,
        fodderDailyCopper: 0,
        terrainBonus: 'Ignora terreno difícil terrestre; velocidade contínua a favor do curso dos rios.',
        enduranceNote: 'Limitado a hidrovias e margens navegáveis; imune a custos de forragem animal.'
      }
    };

    var item = specs[mode] || specs.foot;
    var totalFodderCopper = item.fodderDailyCopper * days;
    var utilizationPct = (item.carryCap > 0 && weight > 0) ? Math.min(100, Math.round((weight / item.carryCap) * 100)) : 0;

    return {
      mode: mode,
      name: item.name,
      carryCapLbs: item.carryCap,
      pullCapLbs: item.pullCap,
      fodderDailyCopper: item.fodderDailyCopper,
      fodderTotalCopper: totalFodderCopper,
      fodderSummary: item.fodderDailyCopper > 0 ? (item.fodderDailyCopper + ' pc/dia (Total: ' + totalFodderCopper + ' peças de cobre)') : 'Isento de custo com forragem animal',
      terrainBonus: item.terrainBonus,
      enduranceNote: item.enduranceNote,
      utilizationPct: utilizationPct
    };
  }

  // === calcCampRestRecovery (Recuperação em Descanso Curto e Longo - PHB p. 186) ===
  function calcCampRestRecovery(restType, options) {
    options = options || {};
    var type = (restType === 'short') ? 'short' : 'long';
    var isSanctuary = !!options.isSanctuary;
    var stance = options.campStance || 'vigilant';

    if (type === 'short') {
      var cookBonus = options.hasCook
        ? 'Refeição Quente (Talento Chef / Utensílios de Cozinheiro): +1d8 PV adicionais recuperados por descanso curto.'
        : 'Alimentação de viagem padrão sem bônus culinário adicional.';
      var shortRisk = isSanctuary ? '0% (Santuário Consagrado)' : (stance === 'vigilant' ? '5% (Sentinela Alerta)' : '12% (Risco Selvagem)');
      return {
        restType: 'short',
        name: 'Descanso Curto (1 Hora - PHB p. 186)',
        hoursConsumed: 1,
        hpRecoveryDesc: 'Permite gastar Dados de Vida (d8/d10/d12 + modificador de CON) para recuperar Pontos de Vida.',
        hitDiceRecovery: 'Não recupera Dados de Vida (apenas gasta dados disponíveis).',
        resourcesRecovered: 'Recupera recursos de classe de recarga rápida (Ação Súbita, Retomar o Fôlego, Ki, Espaços de Bruxo).',
        exhaustionRecovery: 'Descanso curto não reduz níveis de exaustão.',
        interruptionRisk: shortRisk,
        cookBonus: cookBonus,
        isSanctuarySafe: isSanctuary,
        dndRef: 'PHB p. 186'
      };
    }

    // Descanso Longo (8h)
    var longRisk = isSanctuary
      ? '0% (Santuário Consagrado - Imunidade Total a Emboscadas)'
      : (stance === 'vigilant' ? '10% (Vigília Noturna Atenta)' : (stance === 'stealth' ? '15% (Acampamento Oculto)' : '25% (Sono Pleno Sem Vigília)'));
    return {
      restType: 'long',
      name: 'Descanso Longo (8 Horas - PHB p. 186)',
      hoursConsumed: 8,
      hpRecoveryDesc: 'Recupera 100% dos Pontos de Vida perdidos pela comitiva.',
      hitDiceRecovery: 'Recupera metade do total máximo de Dados de Vida dos aventureiros.',
      resourcesRecovered: 'Restaura todos os espaços de magia (círculos 1 a 9) e habilidades diárias.',
      exhaustionRecovery: 'Reduz 1 nível de exaustão (requer ração de comida e água diária consumidas - PHB p. 185).',
      interruptionRisk: longRisk,
      cookBonus: 'Descanso pleno em leito ou barraca de campanha aquecida.',
      isSanctuarySafe: isSanctuary,
      dndRef: 'PHB p. 186'
    };
  }

  // === getExpeditionWeatherTrend (Projeção Meteorológica da Marcha - DMG p. 109) ===
  function getExpeditionWeatherTrend(currentWeather, travelHours, biomeKey) {
    var h = (typeof travelHours === 'number' && travelHours > 0) ? travelHours : 8;
    var w = (currentWeather || 's').toLowerCase();
    var bk = (biomeKey || 'plains').toLowerCase();

    var weatherMap = {
      s: { name: 'Ensolarado / Céu Limpo', icon: '☀️' },
      c: { name: 'Céu Parcialmente Encoberto', icon: '⛅' },
      r: { name: 'Chuva Moderada', icon: '🌧️' },
      t: { name: 'Tempestade de Raios', icon: '⛈️' },
      f: { name: 'Nevoeiro Denso', icon: '🌫️' },
      w: { name: 'Ventos Cortantes', icon: '🌬️' }
    };

    var curObj = weatherMap[w] || weatherMap.s;
    var days = Math.max(1, Math.ceil(h / 8));
    var stages = [];

    stages.push({
      day: 1,
      hours: '1h - ' + Math.min(8, h) + 'h',
      name: curObj.name,
      icon: curObj.icon,
      condition: 'Condição atual observada na partida'
    });

    if (days >= 2) {
      var d2Obj = (bk === 'desert') ? weatherMap.s : ((bk === 'mountain' || bk === 'swamp') ? weatherMap.f : weatherMap.c);
      stages.push({
        day: 2,
        hours: '9h - ' + Math.min(16, h) + 'h',
        name: d2Obj.name,
        icon: d2Obj.icon,
        condition: 'Tendência barométrica regional'
      });
    }

    if (days >= 3) {
      var d3Obj = (bk === 'desert') ? weatherMap.w : ((bk === 'snow') ? weatherMap.w : weatherMap.r);
      stages.push({
        day: 3,
        hours: '17h - ' + Math.min(24, h) + 'h',
        name: d3Obj.name,
        icon: d3Obj.icon,
        condition: 'Clima dos confins do bioma'
      });
    }

    var outlook = (days === 1)
      ? 'Jornada curta: estabilidade térmica e climática mantida durante todo o percurso.'
      : ('Expedição de ' + days + ' dias: atente para variações barométricas entre os trechos de marcha.');

    return {
      totalDays: days,
      stages: stages,
      outlook: outlook,
      dndRef: 'DMG p. 109'
    };
  }

  // === calcHorizonVisibility (Alcance Visual e Linha de Visada no Horizonte - DMG p. 243) ===
  function calcHorizonVisibility(biomeKey, weatherCode, isNight, isElevated) {
    var bk = (biomeKey || 'plains').toLowerCase();
    var w = (weatherCode || 's').toLowerCase();

    // 1. Limitações Climáticas Severas (Névoa, Nevasca, Tempestade de Areia)
    if (w === 'f' || w === 'fog' || w === 'nevoa') {
      return {
        horizonMiles: 0.1,
        horizonKm: 0.2,
        viewDescription: 'Névoa Espessa: Visibilidade obstruída além de 300 pés (DMG p. 243).',
        visibilityRating: 'Ofuscada',
        color: '#94a3b8',
        dndRef: 'DMG p. 243'
      };
    }
    if (w === 'blizzard' || w === 'sandstorm') {
      return {
        horizonMiles: 0.2,
        horizonKm: 0.3,
        viewDescription: 'Vendaval Cegante: Partículas em suspensão limitam a visada a passos curtos.',
        visibilityRating: 'Severamente Reduzida',
        color: '#f87171',
        dndRef: 'DMG p. 243'
      };
    }
    if (w === 't' || w === 'storm' || w === 'tempestade' || w === 'r' || w === 'rain') {
      return {
        horizonMiles: 1.0,
        horizonKm: 1.6,
        viewDescription: 'Chuva Torrencial: Linha do horizonte encoberta por cortinas de água.',
        visibilityRating: 'Reduzida',
        color: '#60a5fa',
        dndRef: 'DMG p. 243'
      };
    }

    // 2. Noite sem iluminação mágica
    if (isNight) {
      return {
        horizonMiles: 1.0,
        horizonKm: 1.6,
        viewDescription: 'Noite Fechada: Silhuetas no horizonte apenas sob luar ou fogueiras distantes.',
        visibilityRating: 'Noturna',
        color: '#c084fc',
        dndRef: 'DMG p. 243'
      };
    }

    // 3. Dia Claro / Terreno (DMG p. 243: Nível do chão 2 mi, Colinas 10 mi, Montanhas 20-40 mi)
    if (bk === 'mountain' || bk === 'montanha' || isElevated) {
      return {
        horizonMiles: 30.0,
        horizonKm: 48.0,
        viewDescription: 'Pico Elevado: Visada espetacular alcançando marcos em províncias distantes (DMG p. 243).',
        visibilityRating: 'Máxima',
        color: '#38bdf8',
        dndRef: 'DMG p. 243'
      };
    }
    if (bk === 'hills' || bk === 'colinas') {
      return {
        horizonMiles: 10.0,
        horizonKm: 16.0,
        viewDescription: 'Cume de Colina: Desnível suave revela vales e estradas circunvizinhas.',
        visibilityRating: 'Excelente',
        color: '#4ade80',
        dndRef: 'DMG p. 243'
      };
    }
    if (bk === 'forest' || bk === 'floresta' || bk === 'cave') {
      return {
        horizonMiles: 0.5,
        horizonKm: 0.8,
        viewDescription: 'Dossel Fechado / Galhos: Visão de longa distância bloqueada pela vegetação densa.',
        visibilityRating: 'Contida',
        color: '#facc15',
        dndRef: 'DMG p. 243'
      };
    }
    if (bk === 'swamp' || bk === 'pantano') {
      return {
        horizonMiles: 1.0,
        horizonKm: 1.6,
        viewDescription: 'Pântano: Vapores estagnados e manguezais limitam o horizonte.',
        visibilityRating: 'Moderada',
        color: '#a3e635',
        dndRef: 'DMG p. 243'
      };
    }

    // Planície / Costa aberta padrão
    return {
      horizonMiles: 2.0,
      horizonKm: 3.2,
      viewDescription: 'Terreno Aberto / Planície: Visada clara até a curvatura do horizonte (DMG p. 243).',
      visibilityRating: 'Normal',
      color: '#ffd700',
      dndRef: 'DMG p. 243'
    };
  }

  // === calcRiverCrossingDifficulty (Perigos de Travessia e Vaus Fluviais - DMG p. 110) ===
  function calcRiverCrossingDifficulty(biomeKey, weatherCode) {
    var bk = (biomeKey || 'plains').toLowerCase();
    var w = (weatherCode || 's').toLowerCase();

    if (bk === 'swamp' || bk === 'pantano') {
      return {
        hasCrossing: true,
        crossingType: 'Lamaçal Movediço & Igarapé Fétido',
        athleticsDC: 13,
        vehicleRisk: 'Alto (risco de atolamento de carroças e montarias)',
        vehicleRiskColor: '#f87171',
        advice: 'Utilize varas de sondagem antes de avançar a comitiva na água turva.',
        dndRef: 'DMG p. 110'
      };
    }
    if (bk === 'coast' || bk === 'costa') {
      return {
        hasCrossing: true,
        crossingType: 'Canal de Maré & Arrebentação Litorânea',
        athleticsDC: 12,
        vehicleRisk: 'Moderado (maré alta inunda eixos de madeira)',
        vehicleRiskColor: '#facc15',
        advice: 'Aguarde o refluxo da maré baixa para travessia segura.',
        dndRef: 'DMG p. 110'
      };
    }
    if ((w === 'storm' || w === 'tempestade' || w === 't' || w === 'r' || w === 'rain') && (bk === 'forest' || bk === 'plains')) {
      return {
        hasCrossing: true,
        crossingType: 'Vau de Rio Transbordante & Correnteza Ágil',
        athleticsDC: 14,
        vehicleRisk: 'Severo (correnteza veloz arrasta carga solta e montarias)',
        vehicleRiskColor: '#ef4444',
        advice: 'Passe cordas guias atadas entre árvores firmes de ambas as margens.',
        dndRef: 'DMG p. 110'
      };
    }

    return {
      hasCrossing: false,
      crossingType: 'Vau Raso & Pontes Imperiais Firmes',
      athleticsDC: 0,
      vehicleRisk: 'Nenhum',
      vehicleRiskColor: '#4ade80',
      advice: 'Travessia plana sem impedimentos ou correntezas ameaçadoras.',
      dndRef: 'DMG p. 110'
    };
  }

  // === getConnectedLocations (Nós Vizinhos Conectados por Estradas) ===
  function getConnectedLocations(locKey) {
    var allP = CART_PATHS || [];
    var allB = CART_BIOMES || [];
    if (!locKey || !allP.length || !allB.length) return [];

    var connectedKeys = [];
    allP.forEach(function(edge){
      if (edge.from === locKey && connectedKeys.indexOf(edge.to) === -1) connectedKeys.push(edge.to);
      if (edge.to === locKey && connectedKeys.indexOf(edge.from) === -1) connectedKeys.push(edge.from);
    });

    var curLoc = allB.find(function(b){ return b.key === locKey; });

    return connectedKeys.map(function(k){
      var bObj = allB.find(function(b){ return b.key === k; }) || { key: k, name: k, biome: 'plains' };
      var mb = (curLoc && calcDistanceBearing) ? calcDistanceBearing(curLoc, bObj, false) : { miles: 12 };
      var miles = mb ? mb.miles : 12;
      var hours = Math.max(1, Math.round(miles / 3));
      var icon = bObj.settlement || bObj.isOrigin ? '🏛️' : (bObj.isSanctuary ? '🌀' : '📍');
      return {
        key: bObj.key,
        name: bObj.regionalName || bObj.name,
        biome: bObj.biome || bObj.key,
        miles: miles,
        hours: hours,
        isSanctuary: !!bObj.isSanctuary,
        isSettlement: !!bObj.settlement,
        icon: icon
      };
    });
  }

  // === calcCampWatchShifts (Escala de Vigília Noturna da Comitiva - PHB p. 186 / DMG p. 111) ===
  function calcCampWatchShifts(partySize, options) {
    options = options || {};
    var pSize = Math.max(1, partySize || 4);
    var startH = (typeof options.startHour === 'number') ? options.startHour : 20;

    var shifts = [
      {
        shiftIndex: 1,
        timeRange: '20:00 - 22:00',
        periodLabel: 'Primeira Vigília (Crepúsculo)',
        riskFactor: '5% (Baixo)',
        riskColor: '#4ade80',
        desc: 'Inspeção inicial do perímetro do acampamento e alimentação da fogueira.'
      },
      {
        shiftIndex: 2,
        timeRange: '22:00 - 00:00',
        periodLabel: 'Vigília da Meia-Noite (Silêncio)',
        riskFactor: '10% (Moderado)',
        riskColor: '#facc15',
        desc: 'Ronda silenciosa ao redor das barracas e checagem de montarias e arreios.'
      },
      {
        shiftIndex: 3,
        timeRange: '00:00 - 02:00',
        periodLabel: 'Vigília da Madrugada (Hora Sombria)',
        riskFactor: '18% (Crítico)',
        riskColor: '#ef4444',
        desc: 'Momento de maior atividade de predadores alfa e criaturas noturnas; vigilância atenta mandatória.'
      },
      {
        shiftIndex: 4,
        timeRange: '02:00 - 04:00',
        periodLabel: 'Vigília do Alvorecer (Neblina Matinal)',
        riskFactor: '8% (Moderado)',
        riskColor: '#fb923c',
        desc: 'Névoa baixa da manhã; preparo de brasas para o desjejum da comitiva.'
      }
    ];

    var tranceNote = options.hasTrance
      ? 'Aventureiros élficos necessitam de apenas 4h de transe meditativo e podem cobrir 2 turnos inteiros de vigília sem sofrer exaustão (PHB p. 23).'
      : 'Cada aventureiro cobre 1 turno de 2 horas de vigília leve durante o descanso longo de 8 horas (PHB p. 186).';

    return {
      totalShifts: 4,
      shiftDurationHours: 2,
      totalCampHours: 8,
      shifts: shifts,
      tranceNote: tranceNote,
      criticalShift: 'Turno 3 (Madrugada: 00h - 02h)',
      dndRef: 'PHB p. 186 / DMG p. 111'
    };
  }

  // === getBiomeHarvestableResources (Recursos Alquímicos e Coleta Selvagem - XGE p. 130) ===
  function getBiomeHarvestableResources(biomeKey, tier) {
    var bk = (biomeKey || 'plains').toLowerCase();
    var t = (typeof tier === 'number') ? tier : 1;

    var harvestTable = {
      plains: {
        primaryHerb: { name: 'Flor do Alvorecer', rarity: 'Comum', dndUse: 'Ingrediente base para Poções de Cura (PHB p. 153)', checkDC: 10 },
        secondaryMineral: { name: 'Argila Vermelha dos Vales', rarity: 'Comum', dndUse: 'Selagem hermética de frascos alquímicos e pomadas', checkDC: 11 }
      },
      forest: {
        primaryHerb: { name: 'Musgo Fantasma & Casca de Carvalho-de-Ferro', rarity: 'Incomum', dndUse: 'Emplastros curativos e Poções de Furtividade Menor', checkDC: 12 },
        secondaryMineral: { name: 'Resina Silvestre Cristalizada', rarity: 'Comum', dndUse: 'Acendedor de tochas impermeáveis e impermeabilizante', checkDC: 11 }
      },
      swamp: {
        primaryHerb: { name: 'Lótus Venenoso & Fungo de Miasma', rarity: 'Incomum', dndUse: 'Antídotos, Venenos Táticos e Resistência a Ácido', checkDC: 13 },
        secondaryMineral: { name: 'Turfa Sulfúrica Fétida', rarity: 'Comum', dndUse: 'Combustível de queima lenta e fumaça repelente de insetos', checkDC: 12 }
      },
      mountain: {
        primaryHerb: { name: 'Líquen dos Penhascos Gélidos', rarity: 'Incomum', dndUse: 'Cataplasmas contra fadiga de altitude e vigor muscular', checkDC: 13 },
        secondaryMineral: { name: 'Cristais de Quartzo Bruto & Hematita', rarity: 'Raro', dndUse: 'Aprimoramento de armas, runas e focos arcanos', checkDC: 14 }
      },
      desert: {
        primaryHerb: { name: 'Raiz de Cacto Escaldante', rarity: 'Incomum', dndUse: 'Extração de linfa hidratante e poção contra insolação', checkDC: 13 },
        secondaryMineral: { name: 'Salitre Cristalino das Dunas', rarity: 'Comum', dndUse: 'Conservação de rações de carne e misturas incendiárias', checkDC: 12 }
      },
      snow: {
        primaryHerb: { name: 'Cardo da Geada & Penugem Boreal', rarity: 'Incomum', dndUse: 'Poção de Resistência ao Frio e isolamento térmico', checkDC: 13 },
        secondaryMineral: { name: 'Gelo Fóssil das Profundezas', rarity: 'Incomum', dndUse: 'Reagente para refrigeração de unguentos e infusões arcanas', checkDC: 12 }
      },
      graveyard: {
        primaryHerb: { name: 'Beladona dos Sepulcros', rarity: 'Raro', dndUse: 'Unguentos necromânticos e proteção ritual contra espíritos', checkDC: 14 },
        secondaryMineral: { name: 'Pó de Lápide Antiga Consagrada', rarity: 'Incomum', dndUse: 'Componente ritual para afastar mortos-vivos errantes', checkDC: 13 }
      },
      cave: {
        primaryHerb: { name: 'Cogumelo Fosforescente', rarity: 'Comum', dndUse: 'Bioluminescência portátil e unguento para visão no escuro', checkDC: 11 },
        secondaryMineral: { name: 'Enxofre Profundo & Estalactite de Calcário', rarity: 'Incomum', dndUse: 'Pólvora, ácidos corrosivos e reagentes de alquimia', checkDC: 13 }
      },
      volcanic: {
        primaryHerb: { name: 'Flor de Enxofre Magmática', rarity: 'Raro', dndUse: 'Poção de Resistência a Fogo e Fogo Alquímico', checkDC: 15 },
        secondaryMineral: { name: 'Obsidiana Negra & Pedra-Pomes Ígnea', rarity: 'Raro', dndUse: 'Lâminas rituais afiadas e forja de alta temperatura', checkDC: 14 }
      }
    };

    var item = harvestTable[bk] || harvestTable.plains;

    return {
      biomeKey: bk,
      primaryHerb: item.primaryHerb,
      secondaryMineral: item.secondaryMineral,
      harvestNote: 'Coleta realizada com Kit de Herbalismo (Sabedoria) ou teste de Sobrevivência.',
      dndRef: 'XGE p. 130 (Herbalismo e Coleta)'
    };
  }


  // === calcPartyTravelRoles (Atribuição e Sinergia de Funções de Viagem - PHB p. 182-183) ===
  function calcPartyTravelRoles(rolesAssignment, options) {
    options = options || {};
    var pSize = Math.max(1, (typeof options.partySize === 'number') ? options.partySize : 4);
    var pace = options.pace || 'normal';

    var rolesList = [];
    if (Array.isArray(rolesAssignment)) {
      rolesList = rolesAssignment.slice();
    } else if (typeof rolesAssignment === 'string') {
      rolesList = [rolesAssignment];
    } else if (rolesAssignment && typeof rolesAssignment === 'object') {
      Object.keys(rolesAssignment).forEach(function(k){
        if (rolesAssignment[k]) rolesList.push(rolesAssignment[k]);
      });
    }
    if (rolesList.length === 0) rolesList = ['scout'];

    var hasScout = rolesList.indexOf('scout') >= 0;
    var hasNavigator = rolesList.indexOf('navigator') >= 0;
    var hasForager = rolesList.indexOf('forager') >= 0;
    var hasCartographer = rolesList.indexOf('cartographer') >= 0;

    var synergies = [];
    var warnings = [];

    if (hasScout) {
      synergies.push({
        role: 'scout',
        title: 'Sentinela Atenta',
        icon: '👁️',
        benefit: '+5 Percepção Passiva; evita condição de Surpreso contra emboscadas (PHB p. 182).'
      });
    } else {
      warnings.push({
        role: 'scout',
        title: 'Sem Batedor Dedicado',
        warning: 'Percepção Passiva basal: vulnerabilidade aumentada a emboscadas furtivas.'
      });
    }

    if (hasNavigator) {
      synergies.push({
        role: 'navigator',
        title: 'Guia de Rota',
        icon: '🧭',
        benefit: '+5 em testes de Sobrevivência para orientação; anula desorientação em tempestades.'
      });
    } else {
      warnings.push({
        role: 'navigator',
        title: 'Sem Guia de Rota',
        warning: 'Risco de desvio de rota sob névoa espessa ou temporais sem bússola.'
      });
    }

    if (hasForager) {
      if (pace === 'fast') {
        warnings.push({
          role: 'forager',
          title: 'Ritmo Rápido Incompatível',
          warning: 'Em ritmo rápido, forragear e caçar é inviável devido à velocidade acelerada (PHB p. 182).'
        });
      } else {
        synergies.push({
          role: 'forager',
          title: 'Caçador Forrageador',
          icon: '🌿',
          benefit: 'Reduz em 50% o consumo diário de rações empacotadas através de caça e coleta (DMG p. 111).'
        });
      }
    } else {
      warnings.push({
        role: 'forager',
        title: 'Sem Forrageador',
        warning: 'Consumo pleno de rações da mochila (1 ração/dia por aventureiro).'
      });
    }

    if (hasCartographer) {
      synergies.push({
        role: 'cartographer',
        title: 'Mestre Cartógrafo',
        icon: '📜',
        benefit: 'Registra cartas regionais; concede +2 em testes de navegação ao revisitar a rota.'
      });
    }

    var assignedCount = (hasScout ? 1 : 0) + (hasNavigator ? 1 : 0) + (hasForager ? 1 : 0) + (hasCartographer ? 1 : 0);
    var coverageRating = 'Básica';
    var coverageColor = '#facc15';
    if (assignedCount >= 3) {
      coverageRating = 'Exemplar';
      coverageColor = '#4ade80';
    } else if (assignedCount === 2) {
      coverageRating = 'Balanceada';
      coverageColor = '#86efac';
    } else if (assignedCount === 1) {
      coverageRating = 'Focalizada';
      coverageColor = '#fb923c';
    }

    return {
      partySize: pSize,
      rolesAssigned: rolesList,
      coverageRating: coverageRating,
      coverageColor: coverageColor,
      hasScout: hasScout,
      hasNavigator: hasNavigator,
      hasForager: hasForager,
      hasCartographer: hasCartographer,
      passivePerceptionBonus: hasScout ? 5 : 0,
      navigationBonus: hasNavigator ? 5 : 0,
      cartographyBonus: hasCartographer ? 2 : 0,
      rationCostMult: (hasForager && pace !== 'fast') ? 0.5 : 1.0,
      synergies: synergies,
      warnings: warnings,
      dndRef: 'PHB p. 182-183 (Atividades de Viagem da Comitiva)'
    };
  }

  // === calcForageYieldCheck (Capacidade de Coleta e Caça nos Ermos - DMG p. 111 / XGE p. 130) ===
  function calcForageYieldCheck(survivalBonus, biomeKey, options) {
    options = options || {};
    var sBonus = (typeof survivalBonus === 'number') ? survivalBonus : 3;
    var bk = (biomeKey || 'plains').toLowerCase();
    var pace = options.pace || 'normal';

    if (pace === 'fast') {
      return {
        biomeKey: bk,
        allowedByPace: false,
        dc: 0,
        fertilityLevel: 'Bloqueado por Ritmo',
        label: 'Ritmo Rápido Impede Coleta',
        desc: 'Aventureiros em marcha acelerada não conseguem forragear ou caçar no caminho (PHB p. 182).',
        expectedFoodLbs: 0,
        expectedWaterGal: 0,
        successChancePercent: 0,
        color: '#f87171',
        dndRef: 'PHB p. 182 / DMG p. 111'
      };
    }

    var dc = 15;
    var fertility = 'Moderada';
    var color = '#facc15';

    if (bk.indexOf('forest') >= 0 || bk.indexOf('swamp') >= 0 || bk.indexOf('rio') >= 0 || bk.indexOf('vale') >= 0) {
      dc = 10;
      fertility = 'Abundante';
      color = '#4ade80';
    } else if (bk.indexOf('plains') >= 0 || bk.indexOf('hills') >= 0 || bk.indexOf('colina') >= 0) {
      dc = 15;
      fertility = 'Moderada';
      color = '#a3e635';
    } else if (bk.indexOf('mountain') >= 0 || bk.indexOf('snow') >= 0 || bk.indexOf('cave') >= 0 || bk.indexOf('cordilheira') >= 0 || bk.indexOf('boreal') >= 0) {
      dc = 20;
      fertility = 'Escassa';
      color = '#fb923c';
    } else if (bk.indexOf('desert') >= 0 || bk.indexOf('dunas') >= 0 || bk.indexOf('volcanic') >= 0 || bk.indexOf('badlands') >= 0) {
      dc = 25;
      fertility = 'Quase Nula';
      color = '#ef4444';
    }

    var effectiveBonus = sBonus + (pace === 'stealth' ? 2 : 0);
    var target = dc - effectiveBonus;
    var successChance = Math.max(5, Math.min(95, Math.round(((21 - Math.max(1, target)) / 20) * 100)));

    var avgWisMod = Math.max(0, Math.floor(sBonus / 2));
    var expectedFood = +(3.5 + avgWisMod).toFixed(1);
    var expectedWater = +(3.5 + avgWisMod).toFixed(1);

    return {
      biomeKey: bk,
      allowedByPace: true,
      dc: dc,
      fertilityLevel: fertility,
      label: 'Fertilidade ' + fertility + ' (CD ' + dc + ')',
      desc: 'Teste de Sabedoria (Sobrevivência) CD ' + dc + ' para colher 1d6+' + avgWisMod + ' lbs de caça e ' + expectedWater + ' gal de água potável (DMG p. 111).',
      expectedFoodLbs: expectedFood,
      expectedWaterGal: expectedWater,
      successChancePercent: successChance,
      color: color,
      dndRef: 'DMG p. 111 (Forrageamento nos Ermos)'
    };
  }


  // === rollWildernessEncounterTable (Tabelas de Encontros dos Ermos - XGE p. 92-110 / DMG p. 85-87) ===
  function rollWildernessEncounterTable(biomeKey, tier, options) {
    options = options || {};
    var bk = (biomeKey || 'plains').toLowerCase();
    var t = Math.max(1, (typeof tier === 'number') ? tier : 1);

    var rollVal = (typeof options.roll === 'number') ? options.roll : (Math.floor(Math.random() * 100) + 1);
    var category = options.category;
    if (!category) {
      if (rollVal <= 40) category = 'combat';
      else if (rollVal <= 65) category = 'social';
      else if (rollVal <= 85) category = 'discovery';
      else category = 'hazard';
    }

    var tables = {
      plains: {
        combat: {
          title: 'Bando de Salteadores das Colinas',
          desc: 'Seis salteadores armados com bestas leves e lanças improvisadas surgem de uma depressão no terreno, exigindo pedágio ilegal da comitiva.',
          check: 'Sabedoria (Percepção) CD 12 para evitar surpresa ou Carisma (Intimidação) CD 13 para dispersá-los.',
          success: 'A comitiva percebe a emboscada com antecedência, assumindo posições táticas ou intimidando o bando a recuar sem combate.',
          failure: 'Inimigos ganham a rodada de surpresa ou forçam a comitiva a ceder 5 moedas de ouro para evitar confronto direto.'
        },
        social: {
          title: 'Caravana de Comerciantes de Grãos',
          desc: 'Duas carroças pesadas com escolta de mercenários descansam à beira da estrada. O mestre da caravana acena cordialmente aos viajantes.',
          check: 'Carisma (Persuasão) CD 11 para negociar notícias e mantimentos.',
          success: 'Comerciantes vendem rações frescas com 25% de desconto e compartilham rumores sobre as patrulhas da província (+2 na próxima orientação).',
          failure: 'Mercadores são receosos e apenas trocam saudações breves sem conceder descontos ou informações.'
        },
        discovery: {
          title: 'Marco Milenar da Primeira Dinastia',
          desc: 'Um monólito talhado em granito antigo ergue-se à margem da trilha, com inscrições imperiais indicando distâncias e fontes de água pura.',
          check: 'Inteligência (História) ou Sabedoria (Sobrevivência) CD 11.',
          success: 'O escriba da comitiva registra os marcos no diário cartográfico, concedendo vantagem no próximo teste de navegação na província.',
          failure: 'As inscrições estão desgastadas pelo tempo, servindo apenas como ponto de referência visual da rota.'
        },
        hazard: {
          title: 'Ravina Oculta sob Capim Alto',
          desc: 'Uma vala profunda escavada por enxurradas antigas corta a rota, disfarçada por vegetação densa rasteira.',
          check: 'Destreza (Acrobacia ou Cavalgar) CD 12.',
          success: 'Aventureiros e montarias transpõem a fenda com destreza, mantendo o ritmo de marcha inalterado.',
          failure: 'Uma montaria ou integrante da comitiva tropeça, sofrendo 1d6 de dano de concussão e atrasando a marcha em 30 minutos.'
        }
      },
      forest: {
        combat: {
          title: 'Matilha de Lobos Espreitadores',
          desc: 'Um bando de quatro lobos cinzentos com olhos famintos cerca a comitiva pelas sombras das árvores antigas.',
          check: 'Sabedoria (Percepção) CD 13 ou Sabedoria (Lidar com Animais) CD 14.',
          success: 'A sentinela detecta os animais antes do cerco; fogo de tochas e postura defensiva afugentam a matilha sem derramamento de sangue.',
          failure: 'Os lobos atacam os flancos da formação de marcha, forçando um combate surpresa.'
        },
        social: {
          title: 'Eremita Coletor de Raízes',
          desc: 'Um druida solitário com manto de musgo e cajado de freixo colhe ervas raras em uma clareira úmida.',
          check: 'Sabedoria (Sobrevivência ou Intuição) CD 12.',
          success: 'O eremita presenteia a comitiva com um unguento de ervas curativas (recupera 1 Dado de Vida adicional no próximo descanso curto).',
          failure: 'O eremita recolhe suas coisas desconfiado e some entre as folhagens sem trocar palavras.'
        },
        discovery: {
          title: 'Círculo Druídico dos Antigos',
          desc: 'Sete menires verticais dispostos em círculo em torno de um carvalho centenário irrompem com suave aura espiritual.',
          check: 'Inteligência (Arcanismo ou Religião) CD 12.',
          success: 'Aventureiros sentem uma paz revigorante; todos recebem +1 em todas as salvaguardas nas próximas 8 horas de jornada.',
          failure: 'O local é reconhecido como sagrado, proporcionando um repouso calmo sem distúrbios.'
        },
        hazard: {
          title: 'Barreira de Troncos e Espinheiro Cortante',
          desc: 'Árvores tombadas por vendaval recente formam um emaranhado denso recoberto por espinhos cortantes como lâminas.',
          check: 'Destreza CD 12 para transpor ou Força (Atletismo) CD 13 para abrir clareira com machado.',
          success: 'A comitiva abre caminho sem ferimentos e segue viagem sem demora.',
          failure: 'Espinhos rasgam vestimentas e mochilas; 1d10 de dano cortante dividido entre a comitiva e atraso de 1 hora.'
        }
      },
      swamp: {
        combat: {
          title: 'Trolls Anfíbios do Brejo',
          desc: 'Duas criaturas corpulentas cobertas de lodo e sanguessugas emergem silenciosamente das águas turvas empunhando clavas de madeira petrificada.',
          check: 'Sabedoria (Percepção) CD 13 para notar bolhas de ar na água.',
          success: 'A comitiva avista o rastro de bolhas a tempo de empunhar tochas e flechas incendiárias, mantendo distância.',
          failure: 'As criaturas saltam de emboscada puxando um membro da retaguarda em direção à água funda.'
        },
        social: {
          title: 'Pescadores de Enguias do Pântano',
          desc: 'Uma família de canoeiros ribeirinhos atraca em uma ilhota de raízes trançadas, defumando enguias em fogueira baixa.',
          check: 'Carisma (Persuasão) CD 11.',
          success: 'Pescadores indicam canais com águas navegáveis e fundura segura, reduzindo a dificuldade de terreno por 4 horas.',
          failure: 'Pescadores exigem moedas ou trocas pesadas para compartilhar quaisquer direções.'
        },
        discovery: {
          title: 'Capela Submersa das Águas Negras',
          desc: 'A torre sineira de uma antiga capela de pedra projeta-se acima do nível do lodo, com o sino ainda entoando notas fúnebres ao sabor do vento.',
          check: 'Sabedoria (Percepção) CD 13 ou Inteligência (História) CD 12.',
          success: 'Aventureiros recuperam um medalhão sagrado esquecido na cornija, que brilha com tênue luz mágica em presença de mortos-vivos.',
          failure: 'O interior da torre está tomado por lodo espesso e não permite exploração segura.'
        },
        hazard: {
          title: 'Bolsão de Gás Miasmático Inflamável',
          desc: 'A comitiva adentra um trecho onde a água borbulha com gás sulfúrico denso e sufocante.',
          check: 'Constituição CD 12 contra envenenamento.',
          success: 'Aventureiros cobrem o nariz com panos úmidos e apagam tochas a tempo, atravessando sem inalar o miasma.',
          failure: 'Membros da comitiva sofrem enjoo e tosse severa, ficando com a condição Envenenado por 1 hora.'
        }
      },
      mountain: {
        combat: {
          title: 'Patrulha de Caçadores Orcs dos Picos',
          desc: 'Cinco guerreiros orcs com armaduras de escamas de ferro e arcos compostos vigiam a garganta rochosa em posição elevada.',
          check: 'Sabedoria (Percepção) CD 14.',
          success: 'O batedor avista o brilho do metal nos penhascos superiores, permitindo à comitiva buscar cobertura ou traçar rota alternativa.',
          failure: 'Uma saraivada de flechas pesadas desce das escarpas rochosas contra a vanguarda.'
        },
        social: {
          title: 'Batedores da Guarda de Pedra',
          desc: 'Três guardas anões bem equipados com machados de batalha e cabras de montanha patrulham o desfiladeiro.',
          check: 'Carisma (Persuasão) CD 12.',
          success: 'Guardas fornecem salvo-conduto provincial e mapas parciais dos atalhos montanhosos (+3 em navegação na cordilheira).',
          failure: 'Guardas exigem inspeção detalhada de bagagens antes de liberar passagem pela estrada.'
        },
        discovery: {
          title: 'Santuário da Virgem dos Cumes',
          desc: 'Uma gruta esculpida na rocha com estátua consagrada à deusa dos ventos e bacia de água límpida de degelo.',
          check: 'Sabedoria (Religião) CD 11.',
          success: 'A comitiva enche cantis com água pura abençoada; beber dela concede vantagem contra efeitos de altitude por 24h.',
          failure: 'A água é extremamente gelada e serve apenas para consumo comum.'
        },
        hazard: {
          title: 'Desmoronamento de Pedras e Seixos',
          desc: 'Tremores de encosta soltam uma chuva de pedregulhos afiados sobre a trilha estreita de beira de abismo.',
          check: 'Destreza CD 13 para esquivar ou Força (Atletismo) CD 13 para erguer escudos.',
          success: 'Aventureiros protegem a si e às montarias sob fendas de rocha firme sem sofrer ferimentos.',
          failure: 'Pedregulhos atingem a comitiva, causando 2d8 de dano de concussão e bloqueando o caminho principal temporariamente.'
        }
      },
      desert: {
        combat: {
          title: 'Escorpião Gigante das Areias',
          desc: 'Uma monstruosidade com carapaça de quitina amarelada e ferrão venenoso irrompe de sob a duna de areia fofa.',
          check: 'Sabedoria (Percepção) CD 13.',
          success: 'O batedor nota a ondulação na areia antes do bote, permitindo ataques à distância imediatos.',
          failure: 'O ferrão golpeia a retaguarda com surpresa, forçando salvaguarda de CON CD 12 contra veneno.'
        },
        social: {
          title: 'Caravana de Mercadores Beduínos',
          desc: 'Quatro camelos conduzidos por andarilhos de mantos alvos cruzam as cristas das dunas em marcha lenta.',
          check: 'Carisma (Persuasão) CD 11.',
          success: 'Nômades trocam água fresca por mantimentos e indicam a localização do oásis mais próximo.',
          failure: 'A caravana mantém distância prudente com cimitarras desembainhadas, seguindo sem interagir.'
        },
        discovery: {
          title: 'Cúpula Soterrada de Arenito',
          desc: 'O vento forte descobre parcialmente o teto abobadado de um templo de arenito construído séculos antes da Grande Seca.',
          check: 'Inteligência (Investigação ou História) CD 12.',
          success: 'A comitiva encontra 2d10 moedas de prata imperiais e abrigo seguro com sombra fresca para descanso curto.',
          failure: 'A entrada está entulhada de areia e ameaça desabamento se for forçada.'
        },
        hazard: {
          title: 'Tempestade Súbita de Areia Vermelha',
          desc: 'Uma parede de poeira sufocante e ventos cortantes avança velozmente pela planície arenosa.',
          check: 'Sabedoria (Sobrevivência) CD 13 ou Constituição CD 12.',
          success: 'A comitiva arma toldos e agrupa montarias a tempo, aguardando o vendaval passar sem danos.',
          failure: 'Areia fina cega e sufoca os aventureiros; todos sofrem desvantagem em testes de Percepção pelas próximas 4 horas.'
        }
      },
      snow: {
        combat: {
          title: 'Matilha de Lobos da Neve',
          desc: 'Feras alvas de pelo espesso camufladas na nevasca correm em arco para isolar o integrante mais lento da marcha.',
          check: 'Sabedoria (Percepção) CD 13 sob neve.',
          success: 'A comitiva avista os rastros e fecha a formação de marcha com lanças erguidas, intimidando a matilha.',
          failure: 'A matilha ataca de surpresa buscando derrubar um aventureiro no chão congelado.'
        },
        social: {
          title: 'Caçadores de Focas em Trenó',
          desc: 'Dois caçadores em trenó puxado por cães nórdicos descansam ao abrigo de uma morena glacial.',
          check: 'Carisma (Persuasão) CD 11.',
          success: 'Caçadores ensinam técnicas de isolamento térmico e cedem gordura de foca para impermeabilizar botas (+2 contra frio).',
          failure: 'Caçadores limitam-se a acenar e seguir em frente velozmente na esteira da nevasca.'
        },
        discovery: {
          title: 'Monólito da Estrela Polar',
          desc: 'Uma torre de gelo translúcido contendo um cristal que brilha com luminescência azulada apontando para o polo norte magnético.',
          check: 'Inteligência (Arcanismo ou Natureza) CD 11.',
          success: 'A luz do cristal calibra os instrumentos da comitiva, garantindo rumo infalível durante o restante da viagem.',
          failure: 'O cristal é belo, mas seu brilho esfria rapidamente com a tempestade iminente.'
        },
        hazard: {
          title: 'Placa de Gelo Quebradiço sobre Fenda Glacial',
          desc: 'Uma ponte natural de neve oculta um abismo de gelo de 15 metros de profundidade.',
          check: 'Sabedoria (Percepção) CD 13 ou Destreza CD 13.',
          success: 'O guia identifica a fenda a tempo com a vara de sondagem, conduzindo o grupo em volta com segurança.',
          failure: 'O gelo cede sob o peso de um aventureiro; teste urgente de DES CD 13 para agarrar a borda da cordilheira.'
        }
      }
    };

    var biomeTable = tables[bk] || tables.plains;
    var enc = biomeTable[category] || biomeTable.combat;

    var catLabels = {
      combat: { name: 'Ameaça Hostil', icon: '⚔️', color: '#ef4444' },
      social: { name: 'Encontro Social', icon: '🗣️', color: '#60a5fa' },
      discovery: { name: 'Descoberta / Marco', icon: '🏛️', color: '#ffd700' },
      hazard: { name: 'Perigo Ambiental', icon: '⚠️', color: '#fb923c' }
    };

    var catMeta = catLabels[category] || catLabels.combat;

    return {
      biomeKey: bk,
      tier: t,
      category: category,
      categoryName: catMeta.name,
      categoryIcon: catMeta.icon,
      categoryColor: catMeta.color,
      title: enc.title,
      description: enc.desc,
      checkRequired: enc.check,
      successOutcome: enc.success,
      failureOutcome: enc.failure,
      dndRef: 'XGE p. 92-110 / DMG p. 85-87 (Tabelas de Encontros dos Ermos)'
    };
  }

  // === getProvinceLandmarks (Marcos Históricos e Cartográficos das Províncias - DMG p. 108) ===
  function getProvinceLandmarks(provinceId) {
    var pid = (provinceId || 'forest').toLowerCase();
    var landmarksData = {
      forest: [
        {
          id: 'forest_heart_tree',
          name: 'Árvore-Coração de Carvalho-de-Ferro',
          icon: '🌳',
          provinceId: 'forest',
          provinceName: 'Província das Grandes Florestas',
          locationDesc: 'Coração da mata densa, a 15 milhas ao norte de Aldeia do Carvalho.',
          lore: 'Carvalho colossal de mil anos cujas raízes abrigam entalhes rúnicos da Primeira Dinastia.',
          benefit: 'Ponto sagrado: vantagem em testes de Sobrevivência e repouso revigorante.',
          dndRef: 'DMG p. 108 (Wilderness Landmarks)'
        },
        {
          id: 'forest_leaf_fort',
          name: 'Ruínas do Forte das Folhas',
          icon: '🏰',
          provinceId: 'forest',
          provinceName: 'Província das Grandes Florestas',
          locationDesc: 'Planalto rochoso encoberto por trepadeiras na borda oriental.',
          lore: 'Antigo posto de patrulha dos guardas florestais com cisternas de água pura e mirante defensivo.',
          benefit: 'Refúgio fortificado: acampamento imune a ataques furtivos de flanco.',
          dndRef: 'DMG p. 108 (Wilderness Landmarks)'
        }
      ],
      desert: [
        {
          id: 'desert_three_palms',
          name: 'Oásis das Três Palmeiras',
          icon: '🌴',
          provinceId: 'desert',
          provinceName: 'Província das Dunas do Sul',
          locationDesc: 'Depressão rochosa cercada por dunas móveis a 18 milhas a sudoeste do entreposto.',
          lore: 'Nascente de água doce perene que sobreviveu à Grande Seca e serve de refúgio aos clãs nômades.',
          benefit: 'Sustento dos Ermos: reabastece 100% dos cantis e cantinas sem teste de forrageamento.',
          dndRef: 'DMG p. 108 (Wilderness Landmarks)'
        },
        {
          id: 'desert_wind_obelisk',
          name: 'Obelisco dos Ventos Sussurrantes',
          icon: '🗿',
          provinceId: 'desert',
          provinceName: 'Província das Dunas do Sul',
          locationDesc: 'Pilar solitário de arenito erguido sobre a crista da Grande Duna.',
          lore: 'Esculpido com canais ocos que assobiam em tons distintos antecipando tempestades de areia.',
          benefit: 'Previsão Barométrica: antecipa o clima dos próximos 2 dias com 100% de precisão.',
          dndRef: 'DMG p. 108 (Wilderness Landmarks)'
        }
      ],
      mountain: [
        {
          id: 'mountain_thunder_pass',
          name: 'Passo do Trovoada',
          icon: '⛰️',
          provinceId: 'mountain',
          provinceName: 'Província da Cordilheira Ocidental',
          locationDesc: 'Garganta natural estreita ladeada por muralhas de granito de 200m de altura.',
          lore: 'O único corredor transitável para carroças cruzando as escarpas rochosas em direção ao oeste.',
          benefit: 'Marco de Trânsito: reduz o tempo de travessia da cordilheira em 4 horas de marcha.',
          dndRef: 'DMG p. 108 (Wilderness Landmarks)'
        },
        {
          id: 'mountain_stone_sentinel',
          name: 'Torre do Sentinela de Pedra',
          icon: '🗼',
          provinceId: 'mountain',
          provinceName: 'Província da Cordilheira Ocidental',
          locationDesc: 'Pico agulhado encimado por farol de pedra talhado na rocha viva.',
          lore: 'Mirante dos antigos batedores da guarda que avista até 20 léguas de planície em dias claros.',
          benefit: 'Horizonte Estendido: revela todos os pontos de interesse no raio de 2 hexágonos.',
          dndRef: 'DMG p. 108 (Wilderness Landmarks)'
        }
      ],
      swamp: [
        {
          id: 'swamp_drowned_willow',
          name: 'Salgueiro dos Afogados',
          icon: '🌿',
          provinceId: 'swamp',
          provinceName: 'Província dos Pântanos do Leste',
          locationDesc: 'Ilhota de raízes gigantescas no centro do brejo profundo.',
          lore: 'Árvore colossal coberta de líquen fosforescente que oferece a única plataforma seca em 10 milhas.',
          benefit: 'Acampamento Seco: permite descanso longo sem risco de submergir no lodo fétido.',
          dndRef: 'DMG p. 108 (Wilderness Landmarks)'
        },
        {
          id: 'swamp_black_pillar',
          name: 'Pilar de Pedra-Negra Submerso',
          icon: '🪨',
          provinceId: 'swamp',
          provinceName: 'Província dos Pântanos do Leste',
          locationDesc: 'Obelisco de basalto parcialmente engolido pelo mangue perto das águas salobras.',
          lore: 'Inscrições druídicas alertam sobre os ninhos de répteis vorazes e canais de correnteza.',
          benefit: 'Aviso Hidrológico: anula risco de afundamento em atoleiros nos próximos 3 hexágonos.',
          dndRef: 'DMG p. 108 (Wilderness Landmarks)'
        }
      ],
      snow: [
        {
          id: 'snow_white_wolf_tomb',
          name: 'Túmulo do Lobo Branco',
          icon: '🐺',
          provinceId: 'snow',
          provinceName: 'Província das Terras Boreais',
          locationDesc: 'Colina de gelo eterno coroada por efígie de lobo esculpida em quartzo ártico.',
          lore: 'Tributo aos guias polares primitivos; oferendas deixadas aqui acalmam matilhas selvagens.',
          benefit: 'Graça Polar: matilhas de lobos não atacam a comitiva durante as próximas 24 horas.',
          dndRef: 'DMG p. 108 (Wilderness Landmarks)'
        },
        {
          id: 'snow_aurora_cliff',
          name: 'Penedo da Aurora Gélida',
          icon: '🌌',
          provinceId: 'snow',
          provinceName: 'Província das Terras Boreais',
          locationDesc: 'Paredão de granito negro voltado para o norte que espelha as cores do céu boreal.',
          lore: 'Ponto focal de energias arcanas onde viajantes contemplam o esplendor do firmamento.',
          benefit: 'Inspiração Celestial: cada aventureiro recupera 1 espaço de magia de 1º círculo ou 1 Dado de Vida.',
          dndRef: 'DMG p. 108 (Wilderness Landmarks)'
        }
      ]
    };

    if (pid.indexOf('desert') >= 0 || pid.indexOf('dunas') >= 0) return landmarksData.desert;
    if (pid.indexOf('mountain') >= 0 || pid.indexOf('cordilheira') >= 0) return landmarksData.mountain;
    if (pid.indexOf('swamp') >= 0 || pid.indexOf('pantan') >= 0) return landmarksData.swamp;
    if (pid.indexOf('snow') >= 0 || pid.indexOf('boreal') >= 0 || pid.indexOf('norte') >= 0) return landmarksData.snow;
    return landmarksData.forest;
  }


  // === calcCampDefensePerimeter (Perímetros Defensivos e Alarmes de Acampamento - DMG p. 120-123 / PHB p. 150-152, 211) ===
  function calcCampDefensePerimeter(defenseType, options) {
    options = options || {};
    var dt = (defenseType || 'none').toLowerCase();

    var defDefs = {
      none: {
        name: 'Sem Defesas Adicionais',
        icon: '⛺',
        stealthNegation: false,
        surpriseImmunity: false,
        ambushInterceptionPct: 0,
        coverBonus: 'Nenhuma cobertura instalada',
        desc: 'Acampamento básico montado no solo sem barreiras artificiais; a segurança noturna depende exclusivamente da Percepção Passiva basal das sentinelas.',
        color: '#94a3b8'
      },
      bells: {
        name: 'Cordas de Tropeço com Sininhos',
        icon: '🔔',
        stealthNegation: true,
        surpriseImmunity: true,
        ambushInterceptionPct: 35,
        coverBonus: 'Alarme auditivo (alcance 18m)',
        desc: 'Linhas de cânhamo esticadas a 15cm do solo ao redor do perímetro com pequenos guizos de latão (PHB p. 150); anula condição de Surpreso contra invasores terrestres.',
        color: '#facc15'
      },
      traps: {
        name: 'Perímetro de Armadilhas de Mandíbula',
        icon: '🪤',
        stealthNegation: true,
        surpriseImmunity: true,
        ambushInterceptionPct: 55,
        coverBonus: 'Terreno acidentado no perímetro',
        desc: 'Armadilhas de aço e estrepes ocultos nas trilhas de acesso (PHB p. 152 / DMG p. 122); causam 1d4+1 de dano perfurante e imobilizam invasores (CD 13 de Força).',
        color: '#fb923c'
      },
      alarm_spell: {
        name: 'Runa Mágica de Alarme',
        icon: '✨',
        stealthNegation: true,
        surpriseImmunity: true,
        ambushInterceptionPct: 80,
        coverBonus: 'Detecção invisível e mental',
        desc: 'Esfera ritual de proteção mágica em cubo de 6m (PHB p. 211); acorda imediatamente o conjurador por aviso mental sem produzir barulho exterior.',
        color: '#c084fc'
      },
      abatis: {
        name: 'Barricada de Troncos e Galhos (Abatis)',
        icon: '🛡️',
        stealthNegation: true,
        surpriseImmunity: false,
        ambushInterceptionPct: 45,
        coverBonus: '+2 na CA e Salvaguardas de Destreza (Meia Cobertura)',
        desc: 'Galhos pontiagudos entrelaçados formando trincheira improvisada (DMG p. 120); concede Meia Cobertura para sentinelas em vigília e dificulta a aproximação inimiga.',
        color: '#4ade80'
      }
    };

    var item = defDefs[dt] || defDefs.none;

    return {
      defenseType: dt,
      name: item.name,
      icon: item.icon,
      stealthNegation: item.stealthNegation,
      surpriseImmunity: item.surpriseImmunity,
      ambushInterceptionPct: item.ambushInterceptionPct,
      coverBonus: item.coverBonus,
      description: item.desc,
      color: item.color,
      dndRef: 'DMG p. 120-123 / PHB p. 150-152, 211'
    };
  }

  // === calcRouteObstacleOptions (Obstáculos Ambientais, Desvios e Reconhecimento - DMG p. 111-112) ===
  function calcRouteObstacleOptions(obstacleType, biomeKey, distMiles, options) {
    options = options || {};
    var ot = (obstacleType || 'rockslide').toLowerCase();
    var bk = (biomeKey || 'mountain').toLowerCase();
    var miles = (typeof distMiles === 'number') ? distMiles : 15;

    var obstacles = {
      rockslide: {
        title: 'Desmoronamento de Pedras no Desfiladeiro',
        desc: 'Escarpa de cascalho e blocos de granito desabaram sobre a passagem principal, bloqueando a passagem de montarias e carroças.',
        detourHours: 3.0,
        forcedCross: {
          skill: 'Força (Atletismo)',
          dc: 13,
          failureRisk: '1d10 de dano de concussão por deslizamento secundário e perda de 1 hora.'
        },
        scoutRecon: {
          skill: 'Sabedoria (Sobrevivência)',
          dc: 12,
          timeSpentMinutes: 45,
          benefit: 'Localiza trilha de cabras paralela acima do desmoronamento, poupando 2 horas de marcha.'
        }
      },
      bridge_collapse: {
        title: 'Ponte de Madeira Desabada sobre Despenhadeiro',
        desc: 'A ponte secular sobre a garganta cedeu após tempestades torrenciais, restando apenas pilares de sustentação distantes.',
        detourHours: 4.0,
        forcedCross: {
          skill: 'Destreza (Acrobacia)',
          dc: 13,
          failureRisk: 'Queda parcial amparada por corda; aventureiro sofre 1d6 de dano e perde equipamento menor.'
        },
        scoutRecon: {
          skill: 'Sabedoria (Percepção)',
          dc: 12,
          timeSpentMinutes: 30,
          benefit: 'Descobre vau raso a montante onde o leito rochoso permite travessia a pé sem risco.'
        }
      },
      swamp_flood: {
        title: 'Transbordamento de Miasma e Lamaçal Movediço',
        desc: 'A chuva ácida recente inundou a trilha principal com lodo fétido de fundura incerta e emanações sulfurosas.',
        detourHours: 3.5,
        forcedCross: {
          skill: 'Constituição',
          dc: 12,
          failureRisk: 'Condição Envenenado por 1 hora devido à inalação de vapores do mangue.'
        },
        scoutRecon: {
          skill: 'Sabedoria (Sobrevivência)',
          dc: 13,
          timeSpentMinutes: 40,
          benefit: 'Encontra caminho firme sobre raízes de salgueiro submersas, contornando os poços mais fundos.'
        }
      },
      sandstorm_chasm: {
        title: 'Cânion Entulhado por Tempestade de Areia',
        desc: 'Dunas de areia fina emparedaram o cânion, soterrando marcos de orientação e reduzindo a visibilidade a 3 metros.',
        detourHours: 4.0,
        forcedCross: {
          skill: 'Constituição',
          dc: 13,
          failureRisk: '1 nível de Exaustão por sufocamento e desgaste térmico sob areia em movimento.'
        },
        scoutRecon: {
          skill: 'Sabedoria (Sobrevivência)',
          dc: 12,
          timeSpentMinutes: 35,
          benefit: 'Lê as ondulações do vento nas cristas para guiar a comitiva pelo lado de barlavento.'
        }
      },
      ice_fissure: {
        title: 'Fenda Glacial Recém-Aberta',
        desc: 'Uma rachadura azulada de 12 metros de profundidade cortou o platô de gelo eterno sem aviso prévio.',
        detourHours: 3.0,
        forcedCross: {
          skill: 'Destreza (Acrobacia)',
          dc: 13,
          failureRisk: 'Escorregão na borda gélida causando 2d6 de dano de frio e atraso de 1 hora.'
        },
        scoutRecon: {
          skill: 'Sabedoria (Sobrevivência)',
          dc: 13,
          timeSpentMinutes: 30,
          benefit: 'Identifica uma ponte de gelo fóssil resistente o suficiente para suportar toda a comitiva.'
        }
      }
    };

    var obs = obstacles[ot] || obstacles.rockslide;

    return {
      obstacleType: ot,
      biomeKey: bk,
      distMiles: miles,
      title: obs.title,
      description: obs.desc,
      safeDetourHours: obs.detourHours,
      forcedCross: obs.forcedCross,
      scoutRecon: obs.scoutRecon,
      dndRef: 'DMG p. 111-112 (Obstáculos e Desvios de Rota)'
    };
  }


  // === calcTravelIllumination (Visão, Luz e Fontes de Iluminação Noturna - PHB p. 183) ===
  function calcTravelIllumination(timeOfDay, lightSource, hasDarkvision, options) {
    options = options || {};
    var tod = (timeOfDay || 'day').toLowerCase();
    var ls = (lightSource || 'none').toLowerCase();
    var darkvision = !!hasDarkvision;

    var lights = {
      none: {
        name: 'Sem Iluminação Artificial',
        icon: '🌑',
        brightRadiusFt: 0,
        dimRadiusFt: 0,
        stealthRisk: 'Nulo (Silhueta invisível na escuridão)',
        fuelDurationHours: 0
      },
      torch: {
        name: 'Tocha Resinosa',
        icon: '🪵',
        brightRadiusFt: 20,
        dimRadiusFt: 20,
        stealthRisk: 'Altíssimo (Chama aberta visível a milhas; +20% risco de emboscada)',
        fuelDurationHours: 1.0
      },
      hooded_lantern: {
        name: 'Lanterna Furta-Fogo (Coberta)',
        icon: '🏮',
        brightRadiusFt: 30,
        dimRadiusFt: 30,
        stealthRisk: 'Moderado (Tampa móvel permite abafar para foco de 1,5m em marcha furtiva)',
        fuelDurationHours: 6.0
      },
      bullseye_lantern: {
        name: 'Lanterna Direcional (Foco 18m)',
        icon: '🔦',
        brightRadiusFt: 60,
        dimRadiusFt: 60,
        stealthRisk: 'Direcional (Feixe longo direcionado para a frente da vanguarda)',
        fuelDurationHours: 6.0
      },
      magic_light: {
        name: 'Truque Luz Mágica (Arcana)',
        icon: '✨',
        brightRadiusFt: 20,
        dimRadiusFt: 20,
        stealthRisk: 'Alto (Brilho espectral sem fumaça, visível à distância)',
        fuelDurationHours: 999.0
      }
    };

    var light = lights[ls] || lights.none;

    var effectiveVision = 'Luz Plena (Visão Normal sem Penalidades)';
    var passiveMod = 0;
    var color = '#86efac';

    if (tod === 'day') {
      effectiveVision = 'Luz Plena (Luz Solar Natural · Visão Normal)';
      passiveMod = 0;
      color = '#86efac';
    } else if (ls !== 'none') {
      effectiveVision = 'Iluminação Artificial (' + light.brightRadiusFt + ' pés de Luz Plena + ' + light.dimRadiusFt + ' pés de Meia-Luz)';
      passiveMod = 0;
      color = '#facc15';
    } else if (darkvision) {
      effectiveVision = 'Visão no Escuro (Enxerga em Meia-Luz na escuridão plena; -5 Percepção Passiva visual)';
      passiveMod = -5;
      color = '#a78bfa';
    } else {
      effectiveVision = 'Escuridão Total (Condição Cego na escuridão; desvantagem e falha em testes de visão)';
      passiveMod = -10;
      color = '#f87171';
    }

    return {
      timeOfDay: tod,
      lightSource: ls,
      hasDarkvision: darkvision,
      lightName: light.name,
      lightIcon: light.icon,
      brightRadiusFt: light.brightRadiusFt,
      dimRadiusFt: light.dimRadiusFt,
      effectiveVision: effectiveVision,
      passivePerceptionMod: passiveMod,
      stealthRisk: light.stealthRisk,
      fuelDurationHours: light.fuelDurationHours,
      color: color,
      dndRef: 'PHB p. 183 (Visão e Iluminação em Marcha)'
    };
  }

  // === calcCampCookingBenefits (Culinária e Utensílios de Cozinheiro - XGE p. 133 / TCoE) ===
  function calcCampCookingBenefits(hasCookUtensils, cookCheckBonus, options) {
    options = options || {};
    var hasCook = !!hasCookUtensils;
    var cBonus = (typeof cookCheckBonus === 'number') ? cookCheckBonus : 3;
    var pSize = Math.max(1, (typeof options.partySize === 'number') ? options.partySize : 4);
    var foragedLbs = (typeof options.foragedLbs === 'number') ? options.foragedLbs : 0;

    if (!hasCook) {
      return {
        active: false,
        title: 'Sem Mestre Cuca na Comitiva',
        bonusHpPerDie: 0,
        rationsPreserved: 0,
        diseaseImmunity: false,
        summary: 'A comitiva alimenta-se de rações secas duras ou caça assada diretamente no espeto sem temperos ou conservantes especiais.',
        color: '#94a3b8',
        dndRef: 'XGE p. 133 (Utensílios de Cozinheiro)'
      };
    }

    var rationsPreserved = Math.min(4, Math.floor(foragedLbs / 2));
    if (rationsPreserved === 0) rationsPreserved = 1;

    return {
      active: true,
      title: 'Mestre Cuca da Comitiva (Utensílios de Cozinheiro)',
      bonusHpPerDie: 1,
      rationsPreserved: rationsPreserved,
      diseaseImmunity: true,
      cookCheckBonus: cBonus,
      summary: 'Refeição Quente e Nutritiva: Concede +1 PV adicional por Dado de Vida gasto no descanso curto; ferve e salga a carne de caça, eliminando o risco de parasitas da água e alimentos selvagens.',
      color: '#4ade80',
      dndRef: 'XGE p. 133 (Utensílios de Cozinheiro)'
    };
  }


  // === calcSurvivalGearSynergy (Ferramentas de Sobrevivência e Equipamento - XGE p. 78-85 / PHB p. 150-154) ===
  function calcSurvivalGearSynergy(inventoryItems, options) {
    options = options || {};
    var rawList = Array.isArray(inventoryItems) ? inventoryItems : [];
    var idList = rawList.map(function(item) {
      if (!item) return '';
      if (typeof item === 'string') return item.toLowerCase();
      return (item.id || item.key || '').toLowerCase();
    });

    var hasNavTools = idList.some(function(id) {
      return id.indexOf('navigator') >= 0 || id.indexOf('astrolabe') >= 0 || id.indexOf('sextant') >= 0 || id === 'navigators_tools';
    });
    var hasHerbalismKit = idList.some(function(id) {
      return id.indexOf('herbalism') >= 0 || id.indexOf('herbal') >= 0 || id === 'herbalism_kit';
    });
    var hasCartTools = idList.some(function(id) {
      return id.indexOf('cartographer') >= 0 || id.indexOf('map_tools') >= 0 || id === 'cartographers_tools';
    });
    var hasClimberKit = idList.some(function(id) {
      return id.indexOf('climber') >= 0 || id.indexOf('climbing') >= 0 || id.indexOf('rope') >= 0 || id === 'climbers_kit';
    });

    var synergies = [];
    if (hasNavTools) {
      synergies.push({
        id: 'nav_tools',
        name: 'Instrumentos de Navegador',
        icon: '🧭',
        benefit: '+3 em testes de navegação; imunidade a perder-se sob céu estrelado (XGE p. 83).'
      });
    }
    if (hasHerbalismKit) {
      synergies.push({
        id: 'herbalism_kit',
        name: 'Kit de Herbalismo',
        icon: '🌿',
        benefit: 'Identificação botânica precisa; dobra o rendimento na coleta de ervas medicinais (XGE p. 82).'
      });
    }
    if (hasCartTools) {
      synergies.push({
        id: 'cart_tools',
        name: 'Ferramentas de Cartógrafo',
        icon: '📜',
        benefit: 'Mapeamento topográfico; concede +1 em testes de iniciativa ao revisitar a região (XGE p. 80).'
      });
    }
    if (hasClimberKit) {
      synergies.push({
        id: 'climber_kit',
        name: 'Kit de Escalador & Cordas',
        icon: '🧗',
        benefit: 'Arreios e pitões; neutraliza o risco de queda mortal em encostas e gargantas rochosas (PHB p. 151).'
      });
    }

    var count = synergies.length;
    var readinessLabel = 'Improvisada (0/4 Ferramentas)';
    var color = '#94a3b8';
    if (count === 4) {
      readinessLabel = 'Expedição Completa (4/4 Ferramentas)';
      color = '#4ade80';
    } else if (count >= 2) {
      readinessLabel = 'Expedição Avançada (' + count + '/4 Ferramentas)';
      color = '#facc15';
    } else if (count === 1) {
      readinessLabel = 'Expedição Básica (1/4 Ferramenta)';
      color = '#fb923c';
    }

    return {
      toolsCount: count,
      gearScorePercent: Math.round((count / 4) * 100),
      expeditionReadinessLabel: readinessLabel,
      activeSynergies: synergies,
      hasNavTools: hasNavTools,
      hasHerbalismKit: hasHerbalismKit,
      hasCartTools: hasCartTools,
      hasClimberKit: hasClimberKit,
      color: color,
      dndRef: 'XGE p. 78-85 / PHB p. 150-154 (Ferramentas de Sobrevivência)'
    };
  }

  // === calcAltitudeExposure (Alta Altitude, Ar Rarefeito e Exaustão - DMG p. 110) ===
  function calcAltitudeExposure(altitudeFeet, hoursOfTravel, isAcclimated, options) {
    options = options || {};
    var alt = (typeof altitudeFeet === 'number') ? altitudeFeet : 2500;
    var hours = (typeof hoursOfTravel === 'number') ? hoursOfTravel : 4;
    var acclimated = !!isAcclimated;
    var meters = Math.round(alt * 0.3048);

    var isHigh = alt >= 10000;
    var conSaveDC = isHigh ? (10 + Math.max(0, Math.floor(hours - 1))) : 0;

    var riskLevel = 'Altitude Segura';
    var color = '#4ade80';
    var desc = 'Pressão atmosférica estável; respiração e vigor físico normais da comitiva.';

    if (isHigh) {
      if (acclimated) {
        riskLevel = 'Aclimatado ao Ar Rarefeito';
        color = '#60a5fa';
        desc = 'Aventureiros adaptados aos picos nevados (mais de 30 dias na cordilheira); imunidade à fadiga respiratória.';
      } else {
        riskLevel = 'Ar Rarefeito Severo (CD ' + conSaveDC + ' CON)';
        color = '#f87171';
        desc = 'Altitude de ' + alt + ' pés (~' + meters + 'm). Cada hora de marcha exige Salvaguarda de CON CD ' + conSaveDC + ' contra 1 nível de Exaustão (DMG p. 110).';
      }
    } else if (alt >= 5000) {
      riskLevel = 'Planalto Elevado (5.000 - 10.000 pés)';
      color = '#facc15';
      desc = 'Encostas montanhosas; ventos frios moderados sem necessidade de testes de exaustão por ar rarefeito.';
    }

    return {
      altitudeFeet: alt,
      altitudeMeters: meters,
      isHighAltitude: isHigh,
      isAcclimated: acclimated,
      conSaveDC: conSaveDC,
      riskLevel: riskLevel,
      description: desc,
      color: color,
      dndRef: 'DMG p. 110 (Alta Altitude e Ar Rarefeito)'
    };
  }


  // === calcMoonPhaseNavigation (Orientação Celeste e Fases Lunares - PHB p. 183 / DMG p. 111) ===
  function calcMoonPhaseNavigation(dayNumber, options) {
    options = options || {};
    var day = (typeof dayNumber === 'number') ? dayNumber : 14;
    var cycleDay = ((day - 1) % 28) + 1;

    var phaseId = 'full_moon';
    var phaseName = 'Lua Cheia';
    var icon = '🌕';
    var nightDesc = 'Meia-Luz natural contínua sobre os ermos; visibilidade estendida à noite sem necessidade de tochas abertas.';
    var navBonus = 2;
    var stealthBonus = 0;
    var encMod = -10;
    var color = '#facc15';

    if (cycleDay === 28) {
      phaseId = 'blood_moon';
      phaseName = 'Lua de Sangue (Eclipse Ancestral)';
      icon = '🩸';
      nightDesc = 'Luar avermelhado sinistro; aberrações e predadores noturnos entram em frenesi violento (+30% risco de emboscada).';
      navBonus = 0;
      stealthBonus = -2;
      encMod = 30;
      color = '#ef4444';
    } else if (cycleDay <= 3 || cycleDay >= 26) {
      phaseId = 'new_moon';
      phaseName = 'Lua Nova';
      icon = '🌑';
      nightDesc = 'Escuridão plena; céu velado sem reflexo lunar. Marcha furtiva facilitada (+2 Furtividade), porém fontes de luz são vitais.';
      navBonus = -2;
      stealthBonus = 2;
      encMod = 10;
      color = '#94a3b8';
    } else if (cycleDay <= 10) {
      phaseId = 'waxing_moon';
      phaseName = 'Quarto Crescente';
      icon = '🌓';
      nightDesc = 'Iluminação moderada no primeiro terço da noite; silhuetas visíveis a média distância.';
      navBonus = 0;
      stealthBonus = 0;
      encMod = 0;
      color = '#fde047';
    } else if (cycleDay <= 17) {
      phaseId = 'full_moon';
      phaseName = 'Lua Cheia';
      icon = '🌕';
      nightDesc = 'Meia-Luz natural prateada em toda a província; +2 em testes de orientação e navegação celestial.';
      navBonus = 2;
      stealthBonus = -1;
      encMod = -10;
      color = '#ffd700';
    } else {
      phaseId = 'waning_moon';
      phaseName = 'Quarto Minguante';
      icon = '🌗';
      nightDesc = 'Luar tardio na segunda metade da madrugada; sombras profundas no alvorecer.';
      navBonus = 0;
      stealthBonus = 1;
      encMod = 0;
      color = '#e2e8f0';
    }

    return {
      dayNumber: day,
      cycleDay: cycleDay,
      phaseId: phaseId,
      phaseName: phaseName,
      icon: icon,
      nightAmbientDesc: nightDesc,
      navigationBonus: navBonus,
      stealthBonus: stealthBonus,
      encounterRiskMod: encMod,
      color: color,
      dndRef: 'PHB p. 183 / DMG p. 111 (Orientação Celeste e Fases Lunares)'
    };
  }

  // === calcForcedMarchRiskTable (Tabela Progressiva de Marcha Forçada - PHB p. 181) ===
  function calcForcedMarchRiskTable(travelHours, conBonus, options) {
    options = options || {};
    var hours = (typeof travelHours === 'number') ? travelHours : 8;
    var conB = (typeof conBonus === 'number') ? conBonus : 2;

    var extraHours = Math.max(0, Math.ceil(hours - 8));
    if (extraHours === 0) {
      return {
        isForcedMarch: false,
        extraHours: 0,
        maxDC: 0,
        schedule: [],
        summary: 'Marcha dentro do limite padrão de 8 horas de viagem diária; comitiva avança sem fadiga excessiva.',
        color: '#4ade80',
        dndRef: 'PHB p. 181 (Marcha Forçada)'
      };
    }

    var schedule = [];
    for (var h = 1; h <= extraHours; h++) {
      var dc = 10 + h;
      var target = dc - conB;
      var failChance = Math.max(5, Math.min(95, Math.round((Math.max(1, target - 1) / 20) * 100)));
      schedule.push({
        extraHour: h,
        totalHour: 8 + h,
        conDC: dc,
        failureChancePercent: failChance,
        consequence: 'Salvaguarda de CON CD ' + dc + ' contra Exaustão Nível ' + h
      });
    }

    var maxDC = 10 + extraHours;

    return {
      isForcedMarch: true,
      extraHours: extraHours,
      maxDC: maxDC,
      schedule: schedule,
      summary: 'Marcha Forçada: ' + hours + 'h diárias excedem o limite em ' + extraHours + 'h. Salvaguardas progressivas de CON de CD 11 até CD ' + maxDC + '.',
      color: '#f87171',
      dndRef: 'PHB p. 181 (Marcha Forçada)'
    };
  }


  // === calcRoadSecurityAndToll (Segurança Viária, Patrulhas e Pedágios - DMG p. 112-114) ===
  function calcRoadSecurityAndToll(originKey, targetKey, options) {
    options = options || {};
    var oKey = (originKey || 'plains').toLowerCase();
    var tKey = (targetKey || 'floresta').toLowerCase();
    var pSize = Math.max(1, (typeof options.partySize === 'number') ? options.partySize : 4);
    var hasWarrant = !!(options.hasWarrant || options.isNoble);

    var pavedNodes = ['plains', 'floresta', 'posto_avancado', 'posto_sul', 'vale_aurora', 'vila_pescadores', 'cidade_capital'];
    var oPaved = pavedNodes.indexOf(oKey) >= 0;
    var tPaved = pavedNodes.indexOf(tKey) >= 0;

    var category = 'wilderness_offroad';
    var name = 'Ermos Desbravados (Sem Estrada)';
    var patrolRating = 'Nenhuma (Ermos Desprotegidos)';
    var patrolDesc = 'Ausência total de guarnições e vigilância civil; a comitiva depende inteiramente de suas próprias armas e sentinelas.';
    var tollPerPerson = 0;
    var riskRed = -15;
    var icon = '⚔️';
    var color = '#f87171';

    if (oPaved && tPaved) {
      category = 'paved_highway';
      name = 'Estrada Real Pavimentada';
      patrolRating = 'Alta (Guarnição Imperial Ativa)';
      patrolDesc = 'Patrulhas de lanceiros montados e guaritas regulares; salteadores evitam ataques abertos ao longo da via de pedra.';
      tollPerPerson = 2;
      riskRed = 15;
      icon = '🛡️';
      color = '#4ade80';
    } else if (oPaved || tPaved) {
      category = 'regional_trail';
      name = 'Trilha Regional Batida';
      patrolRating = 'Moderada (Patrulhas Ocasionais)';
      patrolDesc = 'Caminho de terra batida usado por comboios comerciais; rondas esporádicas de batedores provinciais.';
      tollPerPerson = 1;
      riskRed = 5;
      icon = '🚶';
      color = '#facc15';
    }

    var effectiveToll = hasWarrant ? 0 : (tollPerPerson * pSize);

    return {
      roadCategory: category,
      roadName: name,
      patrolRating: patrolRating,
      patrolDesc: patrolDesc,
      tollPerPersonSp: hasWarrant ? 0 : tollPerPerson,
      totalTollSp: effectiveToll,
      hasWarrant: hasWarrant,
      warrantNote: hasWarrant ? 'Salvo-conduto provincial ativo: isenção total de taxas e escolta cordial.' : 'Pedágio padrão de manutenção viária provincial.',
      riskReductionPct: riskRed,
      icon: icon,
      color: color,
      dndRef: 'DMG p. 112-114 (Vias Provinciais e Postos de Guarda)'
    };
  }

  // === calcForageComplication (Complicações de Forrageamento e Água Contaminada - DMG p. 110-111) ===
  function calcForageComplication(biomeKey, rollVal, options) {
    options = options || {};
    var bk = (biomeKey || 'plains').toLowerCase();
    var roll = (typeof rollVal === 'number') ? rollVal : 12;
    var hasKit = !!options.hasHerbalismKit;
    var hasCook = !!options.hasCook;

    if (roll >= 10) {
      return {
        hasComplication: false,
        title: 'Água e Provisões Puras',
        consequence: 'Nenhuma contaminação; água cristalina e caça saudável.',
        mitigation: 'Consumo seguro sem exigência de testes adicionais.',
        mitigatedByKit: false,
        color: '#4ade80',
        dndRef: 'DMG p. 110-111 (Forrageamento Seguro)'
      };
    }

    var complications = {
      swamp: {
        title: 'Bolsão de Água Estagnada com Miasma',
        consequence: 'Salvaguarda de CON CD 11 contra febre do pântano (1 nível de Exaustão persistente).',
        mitigation: 'Ferver a água ou usar Utensílios de Cozinheiro (XGE p. 133).'
      },
      forest: {
        title: 'Bagas Venenosas Mimetizadas',
        consequence: 'Condição Envenenado por 4 horas ao ingerir frutos de aparência comestível.',
        mitigation: 'Kit de Herbalismo (XGE p. 82) identifica e descarta os frutos tóxicos.'
      },
      desert: {
        title: 'Água Salobra Alcalina das Dunas',
        consequence: 'Desidratação acelerada; comitiva precisa de consumo duplo de água no dia seguinte.',
        mitigation: 'Destilação rústica por condensação sob lona.'
      },
      mountain: {
        title: 'Enxame de Parasitas das Rochas',
        consequence: 'Picadas dolorosas impedem a recuperação plena de dados de vida no descanso curto.',
        mitigation: 'Fumaça de resina de pinho afasta os insetos do acampamento.'
      },
      plains: {
        title: 'Água Turva com Sedimentos Argilosos',
        consequence: 'Desconforto gástrico; desvantagem na próxima salvaguarda de Constituição.',
        mitigation: 'Filtragem por tecido de linho impermeabilizado.'
      }
    };

    var comp = complications[bk] || complications.plains;
    var isMitigated = hasKit || hasCook;

    return {
      hasComplication: true,
      title: comp.title,
      consequence: isMitigated ? 'Neutralizado: Equipamento da comitiva purificou a colheita.' : comp.consequence,
      mitigation: comp.mitigation,
      mitigatedByKit: isMitigated,
      color: isMitigated ? '#a3e635' : '#f87171',
      dndRef: 'DMG p. 110-111 (Complicações de Forrageamento)'
    };
  }

  // === calcBeastsOfBurden (Animais de Carga, Montaria e Capacidade de Expedição - PHB p. 157, 181-182) ===
  function calcBeastsOfBurden(mountType, count, attachment, options) {
    options = options || {};
    var type = (mountType || 'none').toLowerCase();
    var num = Math.max(0, parseInt(count, 10) || (type === 'none' ? 0 : 1));
    var att = (attachment || 'pack_saddle').toLowerCase();
    var terrain = (options.biome || 'plains').toLowerCase();

    if (type === 'none' || num === 0) {
      return {
        mountType: 'none',
        mountName: 'Sem Montaria (Marcha a Pé)',
        count: 0,
        extraCapacityLbs: 0,
        fodderRequiredLbsPerDay: 0,
        grazingFeasible: true,
        speedBonusPct: 0,
        speedPenaltyPct: 0,
        speedNetPct: 0,
        forageBonusLbs: 0,
        icon: '🚶',
        color: '#94a3b8',
        notes: 'A comitiva se desloca inteiramente a pé, carregando apenas suas mochilas e mantimentos pessoais.',
        dndRef: 'PHB p. 181-182 (Marcha Terrestre a Pé)'
      };
    }

    var baseSpecs = {
      mule: { name: 'Mula de Carga', baseCapacity: 420, baseSpeedMod: 0, fodder: 10, costCp: 800, icon: '🫏' },
      draft_horse: { name: 'Cavalo de Tração', baseCapacity: 540, baseSpeedMod: 0, fodder: 15, costCp: 5000, icon: '🐎' },
      riding_horse: { name: 'Cavalo de Montaria', baseCapacity: 480, baseSpeedMod: 25, fodder: 15, costCp: 7500, icon: '🏇' },
      warhorse: { name: 'Cavalo de Guerra', baseCapacity: 540, baseSpeedMod: 20, fodder: 20, costCp: 40000, icon: '🛡️' },
      camel: { name: 'Camelo do Deserto', baseCapacity: 480, baseSpeedMod: 0, fodder: 10, costCp: 5000, icon: '🐫' },
      ox: { name: 'Boi de Puxa', baseCapacity: 540, baseSpeedMod: -15, fodder: 20, costCp: 1500, icon: '🐂' }
    };

    var spec = baseSpecs[type] || baseSpecs.mule;

    var attMult = 1.0;
    var attName = 'Alforje Simples';
    var speedModAtt = 0;
    if (att === 'cart') {
      attMult = 3.0;
      attName = 'Carroça de Carga (2 Rodas)';
      speedModAtt = -10;
    } else if (att === 'wagon') {
      attMult = 5.0;
      attName = 'Carroção de Carga Coberto (4 Rodas)';
      speedModAtt = -20;
    } else if (att === 'riding_saddle') {
      attMult = 0.8;
      attName = 'Sela de Montaria';
      speedModAtt = 10;
    } else {
      attMult = 1.0;
      attName = 'Sela de Carga Reforçada';
    }

    var terrainSpeedMod = 0;
    var grazing = true;
    if (terrain === 'swamp' || terrain === 'mountain') {
      if (att === 'cart' || att === 'wagon') {
        terrainSpeedMod = -30;
      } else {
        terrainSpeedMod = -10;
      }
    } else if (terrain === 'desert') {
      if (type !== 'camel') {
        grazing = false;
        terrainSpeedMod = -15;
      }
    } else if (terrain === 'snow' || terrain === 'tundra') {
      grazing = false;
      terrainSpeedMod = -15;
    }

    var totalExtraCap = Math.round(spec.baseCapacity * attMult * num);
    var totalFodder = spec.fodder * num;
    var netSpeed = spec.baseSpeedMod + speedModAtt + terrainSpeedMod;

    return {
      mountType: type,
      mountName: spec.name + (num > 1 ? ' (' + num + ' animais)' : ''),
      count: num,
      attachment: att,
      attachmentName: attName,
      extraCapacityLbs: totalExtraCap,
      fodderRequiredLbsPerDay: totalFodder,
      grazingFeasible: grazing,
      speedNetPct: netSpeed,
      forageBonusLbs: Math.round(totalExtraCap * 0.1),
      icon: spec.icon,
      color: netSpeed >= 0 ? '#4ade80' : '#facc15',
      notes: grazing ? 'Pastagem natural disponível ao longo do trajeto; animais podem pastar livremente.' : 'Vegetação escassa no bioma; a comitiva deve transportar ' + totalFodder + ' lbs de forragem por dia.',
      dndRef: 'PHB p. 157, 181-182 (Capacidade de Carga de Montarias)'
    };
  }

  // === calcWildernessTracking (Rastreamento nos Ermos e Identificação de Pegadas - DMG p. 244 / PHB p. 178) ===
  function calcWildernessTracking(biomeKey, hoursElapsed, options) {
    options = options || {};
    var bk = (biomeKey || 'plains').toLowerCase();
    var hours = Math.max(0, parseInt(hoursElapsed, 10) || 4);
    var weather = (options.weather || 'clear').toLowerCase();
    var isRanger = !!options.isRanger;

    var groundType = 'Terra ou relva comum';
    var baseDC = 15;
    var tracksType = 'Pegadas nítidas de comitiva de salteadores e lobos cinzentos';
    var icon = '🐾';

    if (bk === 'snow' || bk === 'tundra' || bk === 'swamp') {
      groundType = 'Neve fofa ou lamaçal úmido';
      baseDC = 10;
      tracksType = 'Valas profundas de pegadas lamacentas deixadas por troles ou ogros';
      icon = '👣';
    } else if (bk === 'mountain' || bk === 'caverna' || bk === 'highlands') {
      groundType = 'Rocha nua e cascalho solto';
      baseDC = 20;
      tracksType = 'Arranhões de garras em pedra e pedregulhos recém-deslocados';
      icon = '🪨';
    } else if (bk === 'desert') {
      groundType = 'Areia e dunas ventosas';
      baseDC = 15;
      tracksType = 'Ondulações serpenteantes e pegadas afundadas de nômades e basiliscos';
      icon = '🏜️';
    } else if (bk === 'forest' || bk === 'selva') {
      groundType = 'Húmus denso e folhagem quebrada';
      baseDC = 12;
      tracksType = 'Ramos partidos na altura dos ombros e pegadas de orcs batedores';
      icon = '🌿';
    }

    var daysElapsed = Math.floor(hours / 24);
    var timeMod = daysElapsed * 5;

    var weatherMod = 0;
    if (weather === 'rain' || weather === 'chuva_forte' || weather === 'nevasca') {
      weatherMod = 5;
    }

    var totalDC = baseDC + timeMod + weatherMod;
    if (isRanger) {
      totalDC = Math.max(5, totalDC - 5);
    }

    var freshDesc = hours <= 4 ? 'Vestígios extremamente frescos (< 4h atrás); o alvo está a pouca distância à frente.'
      : (hours <= 24 ? 'Vestígios de hoje (4-24h atrás); passadas ainda discerníveis no terreno.'
      : 'Rastro antigo (> ' + daysElapsed + ' dias atrás); marcas parcialmente desgastadas pelo vento e tempo.');

    return {
      biomeKey: bk,
      groundType: groundType,
      hoursElapsed: hours,
      baseDC: baseDC,
      timeModifier: timeMod,
      weatherModifier: weatherMod,
      trackingDC: totalDC,
      tracksDiscovered: tracksType,
      freshnessDesc: freshDesc,
      tacticalAdvantage: 'Sucesso no teste de Sobrevivência (CD ' + totalDC + ') concede surpresa tática ou impede emboscada no próximo encontro.',
      icon: icon,
      color: totalDC <= 12 ? '#4ade80' : (totalDC <= 16 ? '#facc15' : '#f87171'),
      dndRef: 'DMG p. 244 (Regras de Rastreamento) / PHB p. 178'
    };
  }

  // === calcSevereWeatherImpact (Deterioração Climática e Efeitos Ambientais Severos - DMG p. 109-110) ===
  function calcSevereWeatherImpact(weatherKey, biomeKey, options) {
    options = options || {};
    var wk = (weatherKey || 'clear').toLowerCase();
    var bk = (biomeKey || 'plains').toLowerCase();
    var hasColdGear = !!options.hasColdWeatherGear;
    var hasWater = !!options.hasAbundantWater;
    var hasGoggles = !!options.hasGogglesOrVeil;

    if (wk === 'clear' || wk === 'ensolarado' || wk === 'nublado') {
      return {
        severity: 'normal',
        weatherName: 'Tempo Estável e Ameno',
        savingThrowType: 'Nenhum',
        savingThrowDC: 0,
        percepPenalty: 0,
        speedPenaltyPct: 0,
        gearMitigation: 'Nenhum equipamento especial exigido.',
        isMitigated: true,
        ambientHazard: 'Condições climáticas ideais para marcha e acampamento.',
        icon: '☀️',
        color: '#4ade80',
        dndRef: 'DMG p. 109 (Condições Normais de Viagem)'
      };
    }

    var isExtremeCold = (wk === 'extreme_cold' || wk === 'nevasca' || wk === 'frio_extremo' || bk === 'snow' || bk === 'tundra');
    var isExtremeHeat = (wk === 'extreme_heat' || wk === 'calor_extremo' || wk === 'onda_calor' || (bk === 'desert' && (options.isMidday || wk === 'ensolarado')));
    var isHeavyStorm = (wk === 'heavy_storm' || wk === 'tempestade' || wk === 'chuva_forte' || wk === 'tormenta');
    var isSandstorm = (wk === 'sandstorm' || wk === 'tempestade_areia');

    if (isExtremeCold) {
      return {
        severity: 'extreme_cold',
        weatherName: 'Nevasca e Frio Extremo Congelante',
        savingThrowType: 'Salvaguarda de CON',
        savingThrowDC: 10,
        percepPenalty: -5,
        speedPenaltyPct: -50,
        gearMitigation: hasColdGear ? 'Agasalhos pesados de pele neutralizam a salvaguarda de frio.' : 'Exige Agasalho de Inverno (Cold Weather Gear, PHB p. 150) sob pena de 1 nível de Exaustão por hora.',
        isMitigated: hasColdGear,
        ambientHazard: 'Visibilidade contida a 15 pés (escuridão leve); fogueiras pequenas são extintas em minutos.',
        icon: '❄️',
        color: hasColdGear ? '#38bdf8' : '#f87171',
        dndRef: 'DMG p. 110 (Frio Extremo e Nevascas)'
      };
    }

    if (isExtremeHeat) {
      return {
        severity: 'extreme_heat',
        weatherName: 'Onda Escaldante e Calor Desértico Extremo',
        savingThrowType: 'Salvaguarda de CON (armadura média/pesada)',
        savingThrowDC: 10,
        percepPenalty: 0,
        speedPenaltyPct: -25,
        gearMitigation: hasWater ? 'Cantil duplo de água fresca supre o consumo obrigatório de 2 galões/dia.' : 'Consumo obrigatório de água dobrado; armaduras de metal impõem desvantagem no teste de Constituição contra Exaustão.',
        isMitigated: hasWater,
        ambientHazard: 'Miragens desérticas aumentam a CD de navegação em +5 para não se perder.',
        icon: '🔥',
        color: hasWater ? '#facc15' : '#f87171',
        dndRef: 'DMG p. 110 (Calor Extremo e Desidratação)'
      };
    }

    if (isHeavyStorm) {
      return {
        severity: 'heavy_storm',
        weatherName: 'Tempestade de Raios e Chuva Torrencial',
        savingThrowType: 'Salvaguarda de FOR/DES (terreno lamacento)',
        savingThrowDC: 12,
        percepPenalty: -5,
        speedPenaltyPct: -50,
        gearMitigation: 'Lonas impermeabilizadas e manto encerado protegem mantimentos e fardos de carga.',
        isMitigated: !!options.hasWaterproofTarp,
        ambientHazard: 'Desvantagem em testes de Percepção auditiva/visual; tochas abertas são apagadas de imediato; ataques à distância impossíveis.',
        icon: '⛈️',
        color: '#a855f7',
        dndRef: 'DMG p. 109-110 (Chuva Pesada e Ventos Fortes)'
      };
    }

    if (isSandstorm) {
      return {
        severity: 'sandstorm',
        weatherName: 'Tempestade de Areia Cortante',
        savingThrowType: 'Teste de Sobrevivência',
        savingThrowDC: 15,
        percepPenalty: -5,
        speedPenaltyPct: -50,
        gearMitigation: hasGoggles ? 'Véu protetor e óculos de montaria preservam a visão da comitiva.' : 'Partículas de areia causam cegueira temporária sem proteção ocular.',
        isMitigated: hasGoggles,
        ambientHazard: 'Cobre rastros instantaneamente; terreno difícil severo; abrigo sob rochas é obrigatório.',
        icon: '🌪️',
        color: '#fb923c',
        dndRef: 'DMG p. 109-110 (Tempestades de Areia nos Ermos)'
      };
    }

    return {
      severity: 'moderate',
      weatherName: 'Chuva Intermitente e Vento Úmido',
      savingThrowType: 'Nenhum',
      savingThrowDC: 0,
      percepPenalty: -2,
      speedPenaltyPct: -15,
      gearMitigation: 'Capas com capuz mantêm o grupo aquecido.',
      isMitigated: true,
      ambientHazard: 'Estradas barrentas com ligeira redução no ritmo de marcha.',
      icon: '🌧️',
      color: '#93c5fd',
      dndRef: 'DMG p. 109 (Precipitação Moderada)'
    };
  }

  // === calcCampDowntimeActivity (Atividades de Acampamento e Descanso nos Ermos - XGE p. 134 / DMG p. 128 / PHB p. 186) ===
  function calcCampDowntimeActivity(activityKey, options) {
    options = options || {};
    var ak = (activityKey || 'rest_only').toLowerCase();
    var hasTool = !!options.hasTool;
    var proficiency = !!options.hasProficiency;

    var activities = {
      rest_only: {
        title: 'Repouso Contemplativo Simples',
        category: 'descanso',
        requiredTool: 'Nenhum',
        dcCheck: 0,
        boonEffect: 'Recuperação canônica de Pontos de Vida e metade dos Dados de Vida gastos no descanso longo.',
        icon: '⛺',
        color: '#94a3b8'
      },
      herbalism_brew: {
        title: 'Preparo de Emplastros e Bálsamos',
        category: 'alquimia_cura',
        requiredTool: 'Kit de Herbalismo (XGE p. 82)',
        dcCheck: 12,
        boonEffect: 'Produz 1 Bálsamo Cicatrizante dos Ermos (+1d4 PV curados adicionais no despertar matinal para 2 aventureiros).',
        icon: '🌿',
        color: '#4ade80'
      },
      gear_maintenance: {
        title: 'Manutenção de Armaduras e Afiação de Lâminas',
        category: 'forja_oficina',
        requiredTool: 'Ferramentas de Ferreiro ou Coureiro (XGE p. 84)',
        dcCheck: 11,
        boonEffect: 'Armaduras reforçadas e armas brunidas concedem +1 no dano do primeiro golpe desferido no dia seguinte.',
        icon: '🔨',
        color: '#60a5fa'
      },
      trap_perimeter: {
        title: 'Camuflagem e Armadilhas de Alarme Perimetral',
        category: 'seguranca_tática',
        requiredTool: 'Ferramentas de Ladrão ou Armadilha de Caça (PHB p. 150)',
        dcCheck: 13,
        boonEffect: 'Perímetro protegido com fios de alerta; predadores e emboscadores ativam sinos e perdem qualquer chance de surpresa.',
        icon: '🪤',
        color: '#facc15'
      },
      cartography_study: {
        title: 'Mapeamento Topográfico e Anotações no Diário',
        category: 'navegacao_erudicao',
        requiredTool: 'Suprimentos de Calígrafo ou Ferramentas de Cartógrafo (XGE p. 80)',
        dcCheck: 12,
        boonEffect: 'Registros detalhados do relevo local; concede vantagem no próximo teste de Sobrevivência para orientação na rota.',
        icon: '📜',
        color: '#c084fc'
      },
      divine_communion: {
        title: 'Meditação e Comunhão com os Espíritos da Natureza',
        category: 'espiritual_adivinhacao',
        requiredTool: 'Símbolo Sagrado ou Foco Druídico (PHB p. 151)',
        dcCheck: 11,
        boonEffect: 'Presságio sensorial do tempo: revela a aproximação de frentes de tempestade ou nascentes de água nas próximas 12 horas.',
        icon: '✨',
        color: '#f472b6'
      }
    };

    var act = activities[ak] || activities.rest_only;
    var finalDC = act.dcCheck;
    if (proficiency) finalDC = Math.max(8, finalDC - 2);

    return {
      activityKey: ak,
      activityTitle: act.title,
      category: act.category,
      requiredTool: act.requiredTool,
      hasRequiredTool: hasTool,
      hasProficiency: proficiency,
      checkDC: finalDC,
      boonEffect: act.boonEffect,
      icon: act.icon,
      color: act.color,
      dndRef: 'XGE p. 134 (Atividades de Descanso) / DMG p. 128 / PHB p. 186'
    };
  }

  // === calcNavigationalOrientationCheck (Perder-se nos Ermos e Desorientação Espacial - DMG p. 111-112) ===
  function calcNavigationalOrientationCheck(navigatorSurvivalBonus, biomeKey, options) {
    options = options || {};
    var bk = (biomeKey || 'plains').toLowerCase();
    var bonus = (typeof navigatorSurvivalBonus === 'number') ? navigatorSurvivalBonus : 3;
    var pace = (options.pace || 'normal').toLowerCase();
    var weather = (options.weather || 'clear').toLowerCase();
    var hasMap = !!options.hasMap;
    var hasTools = !!options.hasNavTools;

    var baseDC = 10;
    var terrainName = 'Planície ou colinas abertas';
    var icon = '🧭';

    if (bk === 'forest' || bk === 'selva') {
      baseDC = 15;
      terrainName = 'Floresta densa de copa fechada (marcos celestes ocultos)';
      icon = '🌲';
    } else if (bk === 'swamp') {
      baseDC = 15;
      terrainName = 'Pântano brumoso e águas estagnadas sem trilhas fixas';
      icon = '🐊';
    } else if (bk === 'desert') {
      baseDC = 15;
      terrainName = 'Dunas mutáveis sob vento forte e miragens solares';
      icon = '🏜️';
    } else if (bk === 'mountain' || bk === 'cordilheira' || bk === 'highlands') {
      baseDC = 15;
      terrainName = 'Desfiladeiros labirínticos e gargantas rochosas estreitas';
      icon = '⛰️';
    } else if (bk === 'snow' || bk === 'tundra') {
      baseDC = 15;
      terrainName = 'Vastidão branca e neves eternas sem pontos de referência';
      icon = '❄️';
    }

    var weatherMod = 0;
    if (weather === 'fog' || weather === 'heavy_storm' || weather === 'sandstorm' || weather === 'nevasca') {
      weatherMod = 5;
    }

    var pacePenalty = 0;
    if (pace === 'fast') {
      pacePenalty = 5;
    }

    var toolsBonus = (hasMap ? 3 : 0) + (hasTools ? 2 : 0);
    var effectiveDC = Math.max(5, baseDC + weatherMod + pacePenalty - toolsBonus);

    var directions = ['Norte', 'Nordeste', 'Leste', 'Sudeste', 'Sul', 'Sudoeste', 'Oeste', 'Noroeste'];
    var driftIdx = Math.floor(Math.random() * directions.length);
    var driftDir = directions[driftIdx];
    var wanderHours = Math.floor(Math.random() * 5) + 2;

    var notes = '';
    if (effectiveDC <= 10) {
      notes = 'Navegação tranquila; marcos visíveis e orientação firme ao longo da rota.';
    } else if (effectiveDC <= 14) {
      notes = 'Orientação moderada; requer atenção regular do guia aos acidentes geográficos.';
    } else {
      notes = 'Alto risco de desorientação; falha no teste de Sobrevivência faz a comitiva vagar perdida.';
    }

    return {
      biomeKey: bk,
      terrainName: terrainName,
      baseDC: baseDC,
      weatherModifier: weatherMod,
      pacePenalty: pacePenalty,
      toolsBonus: toolsBonus,
      effectiveDC: effectiveDC,
      navigatorBonus: bonus,
      hasMap: hasMap,
      hasNavTools: hasTools,
      hasAdvantage: hasMap && hasTools,
      wanderHoursOnFailure: wanderHours,
      randomDriftDirection: driftDir,
      icon: icon,
      color: effectiveDC <= 11 ? '#4ade80' : (effectiveDC <= 15 ? '#facc15' : '#f87171'),
      notes: notes,
      dndRef: 'DMG p. 111-112 (Perder-se nos Ermos e Testes de Navegação)'
    };
  }

  // === calcCaravanEscortSynergy (Contratos de Escolta de Comboio e Guildas de Viagem - DMG p. 93, 114 / XGE p. 132) ===
  function calcCaravanEscortSynergy(caravanType, options) {
    options = options || {};
    var ct = (caravanType || 'merchant_convoy').toLowerCase();

    var caravans = {
      merchant_convoy: {
        name: 'Comboio Comercial da Guilda dos Mercadores',
        securityRating: 'Alta (12 Lanceiros Mercenários e Arqueiros)',
        stipendSilverPerDay: 8,
        speedModifierPct: -20,
        specialPerk: 'Rações de viagem e água limpa supridas pelo mestre de carga; acesso a compras de mantimentos nas paradas.',
        obligation: 'Defender as carroças de mercadorias contra salteadores e feras famintas em emboscadas de estrada.',
        icon: '📦',
        color: '#facc15'
      },
      pilgrim_procession: {
        name: 'Procissão Sagrada de Peregrinos de Aurora',
        securityRating: 'Moderada (Devotos Armados e Clérigos)',
        stipendSilverPerDay: 4,
        speedModifierPct: -15,
        specialPerk: 'Clérigos peregrinos realizam curas de ferimentos e purificação de enfermidades sem custo durante o repouso.',
        obligation: 'Liderar a vanguarda e manter a segurança de anciãos e noviços em travessias arriscadas.',
        icon: '🕊️',
        color: '#38bdf8'
      },
      royal_garrison_supply: {
        name: 'Caravana Militar de Suprimentos Régios',
        securityRating: 'Muito Alta (Guarnição de Infantaria Pesada da Coroa)',
        stipendSilverPerDay: 12,
        speedModifierPct: 0,
        specialPerk: 'Armeiros militares consertam armaduras amassadas e repõem virotes e flechas sem despesas adicionais.',
        obligation: 'Compor a guarda de flanco e obedecer à hierarquia tática dos sargentos de infantaria.',
        icon: '🛡️',
        color: '#4ade80'
      },
      dwarven_mining_cart: {
        name: 'Comitiva de Mineradores e Carretas de Forja Anã',
        securityRating: 'Alta (Guerreiros Anões com Cotas de Malha e Machados)',
        stipendSilverPerDay: 10,
        speedModifierPct: -25,
        specialPerk: 'Perícia anã em rochas: vantagem para superar desfiladeiros montanhosos e forja de campanha ativa.',
        obligation: 'Auxiliar na tração de carretas emperradas em passagens estreitas e combater horrores subterrâneos.',
        icon: '⛏️',
        color: '#fb923c'
      }
    };

    var c = caravans[ct] || caravans.merchant_convoy;

    return {
      caravanType: ct,
      caravanName: c.name,
      securityRating: c.securityRating,
      stipendSilverPerDay: c.stipendSilverPerDay,
      speedModifierPct: c.speedModifierPct,
      specialPerk: c.specialPerk,
      obligation: c.obligation,
      icon: c.icon,
      color: c.color,
      dndRef: 'DMG p. 93, 114 (Escoltas de Comboio e Caravanas Comerciais)'
    };
  }

  // === calcNaturalShelterSearch (Descoberta de Abrigos Naturais e Fortificação nos Ermos - DMG p. 111-112 / XGE p. 135) ===
  function calcNaturalShelterSearch(survivalBonus, biomeKey, options) {
    options = options || {};
    var bk = (biomeKey || 'plains').toLowerCase();
    var bonus = (typeof survivalBonus === 'number') ? survivalBonus : 3;
    var searchHours = Math.max(1, parseInt(options.searchHours, 10) || 1);
    var isScout = !!options.isScout;

    var baseDC = 14;
    if (bk === 'mountain' || bk === 'cordilheira' || bk === 'highlands') {
      baseDC = 12;
    } else if (bk === 'forest' || bk === 'selva') {
      baseDC = 13;
    } else if (bk === 'plains') {
      baseDC = 15;
    } else if (bk === 'desert' || bk === 'snow' || bk === 'tundra') {
      baseDC = 16;
    }

    var effectiveBonus = bonus + (searchHours >= 2 ? 2 : 0) + (isScout ? 3 : 0);
    var rollEstimate = 10 + effectiveBonus;
    var isSuccess = rollEstimate >= baseDC;

    var shelterType = 'exposed_clearing';
    var shelterName = 'Clareira Aberta Desabrigada';
    var ambushReduction = 0;
    var weatherProtection = 10;
    var icon = '⛺';
    var color = '#f87171';
    var desc = 'A comitiva acampa sob o céu aberto; fogueiras são visíveis a grande distância nos ermos.';

    if (isSuccess) {
      if (bk === 'mountain' || bk === 'cordilheira') {
        shelterType = 'natural_cave';
        shelterName = 'Gruta de Rocha Calcária Protegida';
        ambushReduction = -25;
        weatherProtection = 100;
        icon = '🪨';
        color = '#38bdf8';
        desc = 'Fissura profunda com piso seco e teto de pedra; bloqueia chuva pesada, ventos e olhares de salteadores.';
      } else if (bk === 'forest' || bk === 'selva') {
        shelterType = 'dense_canopy';
        shelterName = 'Copa de Coníferas Trançada';
        ambushReduction = -15;
        weatherProtection = 75;
        icon = '🌲';
        color = '#4ade80';
        desc = 'Galhos espessos entrelaçados formam um teto verde natural; camufla a luz do fogo de acampamento.';
      } else if (bk === 'swamp') {
        shelterType = 'rocky_overhang';
        shelterName = 'Montículo Seco com Saliência Rochosa';
        ambushReduction = -15;
        weatherProtection = 65;
        icon = '⛰️';
        color = '#a3e635';
        desc = 'Elevação drenada acima do nível da água estagnada; afasta umidade excessiva e miasmas rasteiros.';
      } else {
        shelterType = 'abandoned_cabin';
        shelterName = 'Cabana de Caçador Abandonada ou Abrigo de Pedra';
        ambushReduction = -20;
        weatherProtection = 90;
        icon = '🏚️';
        color = '#facc15';
        desc = 'Estrutura rústica abandonada; vigas reforçadas oferecem excelente refúgio durante o descanso longo.';
      }
    }

    return {
      biomeKey: bk,
      shelterType: shelterType,
      shelterName: shelterName,
      checkDC: baseDC,
      ambushReductionPct: ambushReduction,
      weatherProtectionPct: weatherProtection,
      isSuccess: isSuccess,
      searchHours: searchHours,
      description: desc,
      icon: icon,
      color: color,
      dndRef: 'DMG p. 111-112 (Abrigos Naturais nos Ermos) / XGE p. 135'
    };
  }

  // === calcWildernessHazardEncounter (Armadilhas Naturais dos Ermos: Areia Movediça, Sumidouros e Fendas - DMG p. 110-111) ===
  function calcWildernessHazardEncounter(biomeKey, options) {
    options = options || {};
    var bk = (biomeKey || 'plains').toLowerCase();
    var hasRope = !!options.hasRope;
    var hasPole = !!options.has10FtPole;
    var hasPitons = !!options.hasPitons;

    var hazardType = 'sinkhole';
    var hazardName = 'Sumidouro Oculto por Raízes e Musgo';
    var percepDC = 14;
    var escapeDC = 12;
    var dangerDesc = 'O solo cede repentinamente em uma dolina oculta de 20 pés (queda de 2d6 de dano de concussão).';
    var mitigation = 'Cajado de sondagem ou batedor em vanguarda alerta a comitiva antes do primeiro passo em falso.';
    var isMitigated = hasPole;
    var icon = '⚠️';
    var color = '#facc15';

    if (bk === 'swamp' || bk === 'desert') {
      hazardType = 'quicksand';
      hazardName = 'Sorvedouro de Areia Movediça ou Lama Fluida';
      percepDC = 15;
      escapeDC = 13;
      dangerDesc = 'Acomodação traiçoeira do solo: aventureiros que pisarem afundam 1d4+1 pés por turno até a submersão.';
      mitigation = 'Corda de cânhamo de 50 pés permite que os companheiros puxem o aventureiro preso com Atletismo CD 10.';
      isMitigated = hasRope;
      icon = '🕳️';
      color = '#fb923c';
    } else if (bk === 'mountain' || bk === 'cordilheira' || bk === 'snow' || bk === 'tundra') {
      hazardType = 'glacial_crevasse';
      hazardName = 'Fenda Glacial Traiçoeira ou Garganta Oculta';
      percepDC = 15;
      escapeDC = 13;
      dangerDesc = 'Fissura oculta por ponte de gelo frágil; ruptura arremessa a criatura em fenda estreita de rocha congelante.';
      mitigation = 'Pítons de ferro cravados e amarração de corda em linha de vida evitam quedas desastrosas na marcha.';
      isMitigated = hasPitons && hasRope;
      icon = '🏔️';
      color = '#38bdf8';
    } else if (bk === 'selva' || bk === 'forest') {
      hazardType = 'razorvine_thickets';
      hazardName = 'Espinheiros Lacerantes Selvagens';
      percepDC = 12;
      escapeDC = 11;
      dangerDesc = 'Trepadeiras com espinhos duros como aço; passagem desatenta corta roupas, lonas e causa ferimentos perfurantes.';
      mitigation = 'Machadinhas de caça e mantos de couro grosso desbravam passagem segura sem ferimentos.';
      isMitigated = !!options.hasMacheteOrAxe;
      icon = '🌿';
      color = '#4ade80';
    }

    return {
      biomeKey: bk,
      hazardType: hazardType,
      hazardName: hazardName,
      perceptionDC: percepDC,
      escapeCheckDC: escapeDC,
      dangerDescription: dangerDesc,
      mitigationGear: mitigation,
      isMitigated: isMitigated,
      icon: icon,
      color: isMitigated ? '#4ade80' : color,
      dndRef: 'DMG p. 110-111 (Armadilhas e Perigos Ambientais nos Ermos)'
    };
  }

  // === calcWaterCrossingOptions (Vaus Fluviais, Travessias Aquáticas e Navegação Fluvial - DMG p. 116-118 / PHB p. 155-157) ===
  function calcWaterCrossingOptions(riverKey, options) {
    options = options || {};
    var rk = (riverKey || 'shallow_ford').toLowerCase();
    var pSize = Math.max(1, (typeof options.partySize === 'number') ? options.partySize : 4);
    var hasRope = !!options.hasRope;
    var hasCarp = !!options.hasCarpenterTools;

    var modes = {
      shallow_ford: {
        name: 'Vau Raso Pedregoso',
        depthDesc: 'Água na altura dos joelhos; correnteza calma e leito de cascalho firme.',
        athleticsDC: 0,
        tollSilverCoins: 0,
        delayHours: 1,
        cargoDamageRiskPct: 5,
        recommendation: 'Ideal para travessia regular a pé e carroças com animais de tração.',
        icon: '🌊',
        color: '#4ade80'
      },
      deep_current: {
        name: 'Correnteza Profunda com Corredeiras',
        depthDesc: 'Água na altura do peito com fluxo violento; turbilhões e pedras submersas.',
        athleticsDC: 13,
        tollSilverCoins: 0,
        delayHours: 2,
        cargoDamageRiskPct: 40,
        recommendation: 'Arriscado; falha no teste de Atletismo arrasta o aventureiro rio abaixo.',
        icon: '🏊',
        color: '#f87171'
      },
      ferry_crossing: {
        name: 'Balsa de Corda Guiada da Província',
        depthDesc: 'Plataforma flutuante de madeira puxada por cabo de aço e operada por balseiro.',
        athleticsDC: 0,
        tollSilverCoins: 2 * pSize,
        delayHours: 0.5,
        cargoDamageRiskPct: 0,
        recommendation: 'Travessia 100% segura sem risco de perda de mantimentos mediante pagamento de pedágio.',
        icon: '⛴️',
        color: '#38bdf8'
      },
      raft_construction: {
        name: 'Construção de Jangada Rústica de Troncos',
        depthDesc: 'Troncos abatidos e amarrados com cipós ou cordas grossas pela própria comitiva.',
        athleticsDC: hasCarp ? 10 : 12,
        tollSilverCoins: 0,
        delayHours: 3,
        cargoDamageRiskPct: hasRope ? 10 : 25,
        recommendation: 'Exige machadinhas e cordas; permite transpor toda a carga em rios largos sem balsa.',
        icon: '🪵',
        color: '#facc15'
      },
      river_boat: {
        name: 'Navegação Fluvial em Barco de Quilha',
        depthDesc: 'Embarcação robusta a favor da correnteza fluvial; deslocamento rápido e estável.',
        athleticsDC: 10,
        tollSilverCoins: 10,
        delayHours: -2,
        cargoDamageRiskPct: 5,
        recommendation: 'Dobra a velocidade de viagem para destinos situados ao longo do mesmo rio.',
        icon: '⛵',
        color: '#c084fc'
      }
    };

    var m = modes[rk] || modes.shallow_ford;

    return {
      riverKey: rk,
      modeName: m.name,
      depthDescription: m.depthDesc,
      athleticsDC: m.athleticsDC,
      tollSilverCoins: m.tollSilverCoins,
      delayHours: m.delayHours,
      cargoDamageRiskPct: m.cargoDamageRiskPct,
      recommendation: m.recommendation,
      icon: m.icon,
      color: m.color,
      dndRef: 'DMG p. 116-118 (Travessias de Rios e Navegação Fluvial) / PHB p. 155-157'
    };
  }

  // === calcExplorationMilestoneBoon (Marcos Cartográficos de Exploração e Descobertas Regionais - DMG p. 108 / XGE p. 132) ===
  function calcExplorationMilestoneBoon(milestoneType, options) {
    options = options || {};
    var mt = (milestoneType || 'standing_stones').toLowerCase();

    var milestones = {
      standing_stones: {
        name: 'Círculo de Menires dos Primeiros Povos',
        historicalDesc: 'Monólitos ancestrais alinhados com as constelações; o ar vibra com energia elemental pura.',
        passiveBoon: 'Inspiração Primal: concede 1 dado de Inspiração a cada aventureiro da comitiva e vantagem em testes de Natureza/Arcanismo.',
        icon: '🪨✨',
        color: '#c084fc'
      },
      forgotten_tower: {
        name: 'Torre de Vigia da Antiga Aliança Imperial',
        historicalDesc: 'Baluarte de pedra erguido sobre a colina mais alta do setor; escadarias intactas conduzem ao terraço de observação.',
        passiveBoon: 'Visão Panorâmica: dissipa a névoa de guerra em 2 nós provinciais adjacentes no mapa do Diário.',
        icon: '🏰',
        color: '#38bdf8'
      },
      hermit_shrine: {
        name: 'Altar Rústico de Eremita Consagrado',
        historicalDesc: 'Santuário de madeira esculpida em torno de uma nascente de água cristalina pura.',
        passiveBoon: 'Bênção Restauradora: beber da água da nascente purifica venenos e remove 1 nível de Exaustão de um aventureiro.',
        icon: '⛲',
        color: '#4ade80'
      },
      ancient_battlefield: {
        name: 'Campo de Batalha Histórico dos Três Tronos',
        historicalDesc: 'Tumulares cobertos de vegetação, lanças enferrujadas e elmos memoriais cravados na encosta da colina.',
        passiveBoon: 'Resiliência Tática: a comitiva ganha +2 nas rolagens de Iniciativa no primeiro encontro de combate nas próximas 24 horas.',
        icon: '⚔️',
        color: '#facc15'
      },
      natural_geowonder: {
        name: 'Maravilha Geológica Natural de Valdória',
        historicalDesc: 'Monumento natural magnífico com cascatas esmeralda e cristais de calcita luminosos incrustados.',
        passiveBoon: 'Prestígio Cartográfico: o registro cartográfico minucioso do local rende moedas de ouro adicionais nas guildas acadêmicas.',
        icon: '💎',
        color: '#f472b6'
      }
    };

    var mile = milestones[mt] || milestones.standing_stones;

    return {
      milestoneType: mt,
      milestoneName: mile.name,
      historicalDesc: mile.historicalDesc,
      passiveBoon: mile.passiveBoon,
      icon: mile.icon,
      color: mile.color,
      dndRef: 'DMG p. 108 (Marcos de Exploração e Maravilhas Naturais) / XGE p. 132'
    };
  }

  // === calcCampFireConcealment (Fogueira de Acampamento, Visibilidade de Fumaça e Furtividade - DMG p. 112 / PHB p. 152) ===
  function calcCampFireConcealment(firePosture, options) {
    options = options || {};
    var fp = (firePosture || 'blazing_hearth').toLowerCase();

    var postures = {
      blazing_hearth: {
        name: 'Fogueira Aberta Ardente (Toras Grossas)',
        lightVisibilityMiles: 5,
        smokeVisibilityMiles: 8,
        encounterRiskModPct: 25,
        warmthBenefit: 'Calor pleno; +2 nas salvaguardas de Constituição matinais contra o frio.',
        cookingAllowed: true,
        desc: 'Fogo alto e calor confortável; atrai a atenção de salteadores e predadores famintos nos ermos.',
        icon: '🔥',
        color: '#f97316'
      },
      dakota_trench_fire: {
        name: 'Fogo Dakota Oculto em Trincheira',
        lightVisibilityMiles: 0.2,
        smokeVisibilityMiles: 0.5,
        encounterRiskModPct: 0,
        warmthBenefit: 'Calor concentrado em cava subterrânea; permite cozimento sem emissão de clarão ou fumaça.',
        cookingAllowed: true,
        desc: 'Técnica de sobrevivência de batedores; queima eficiente alimentada por túnel de ar no solo.',
        icon: '🕳️',
        color: '#4ade80'
      },
      cold_camp: {
        name: 'Acampamento Frio (Fogo Proibido)',
        lightVisibilityMiles: 0,
        smokeVisibilityMiles: 0,
        encounterRiskModPct: -15,
        warmthBenefit: 'Nenhum; a comitiva depende de cobertores e agasalhos pesados de inverno.',
        cookingAllowed: false,
        desc: 'Camuflagem noturna máxima; consumo estrito de rações secas de ferro sem emissão de luz ou cheiro.',
        icon: '❄️',
        color: '#38bdf8'
      },
      magic_flame: {
        name: 'Chama Mágica Alquímica sem Fumaça',
        lightVisibilityMiles: 1,
        smokeVisibilityMiles: 0,
        encounterRiskModPct: 5,
        warmthBenefit: 'Calor constante e limpo alimentado por pedra térmica ou magia de Chama Contínua.',
        cookingAllowed: true,
        desc: 'Brilho cálido que não gera fumaça nem consome madeira dos ermos.',
        icon: '✨',
        color: '#c084fc'
      }
    };

    var p = postures[fp] || postures.blazing_hearth;

    return {
      firePosture: fp,
      postureName: p.name,
      lightVisibilityMiles: p.lightVisibilityMiles,
      smokeVisibilityMiles: p.smokeVisibilityMiles,
      encounterRiskModPct: p.encounterRiskModPct,
      warmthBenefit: p.warmthBenefit,
      cookingAllowed: p.cookingAllowed,
      description: p.desc,
      icon: p.icon,
      color: p.color,
      dndRef: 'DMG p. 112 (Fogueiras de Acampamento e Visibilidade nos Ermos) / PHB p. 152'
    };
  }

  // === calcRegionalBountyNotice (Contratos de Caça a Recompensas Regionais - DMG p. 92, 131 / XGE p. 130) ===
  function calcRegionalBountyNotice(biomeKey, options) {
    options = options || {};
    var bk = (biomeKey || 'plains').toLowerCase();

    var notice = {
      contractTitle: 'Mandado de Caça: Bando de Salteadores da Trilha',
      targetName: 'Capitão Valik e Corsários da Estrada',
      threatCR: 'Desafio 3 (Grupo Médio)',
      rewardGoldCoins: 25,
      trackingClue: 'Vistos cobrando pedágio ilegal e atacando carroças perto do moinho velho.',
      dangerWarning: 'Inimigos utilizam bestas pesadas e armadilhas de abrolhos na estrada.',
      icon: '⚔️📜',
      color: '#facc15'
    };

    if (bk === 'forest' || bk === 'selva') {
      notice = {
        contractTitle: 'Recompensa de Abate: Urso-Coruja Alfa das Sombras',
        targetName: 'Urso-Coruja Alfa de Garras Negras',
        threatCR: 'Desafio 4 (Predador Feroz)',
        rewardGoldCoins: 35,
        trackingClue: 'Carcaças de cervos suspensas em galhos altos delimitam seu território.',
        dangerWarning: 'Ataques vorazes com bico e garras mutiladoras em área de emboscada.',
        icon: '🦉🐻',
        color: '#4ade80'
      };
    } else if (bk === 'swamp') {
      notice = {
        contractTitle: 'Contrato Sagrado: Coven de Bruxa do Charco',
        targetName: 'Mãe Grenda e Lacaios Afogados',
        threatCR: 'Desafio 5 (Conjuradora Sombria)',
        rewardGoldCoins: 50,
        trackingClue: 'Cânticos estranhos ecoam dos salgueiros retorcidos nas noites de lua minguante.',
        dangerWarning: 'Bruxaria de ilusão, névoas venenosas e mortos-vivos rastejantes.',
        icon: '🧙‍♀️',
        color: '#c084fc'
      };
    } else if (bk === 'mountain' || bk === 'cordilheira' || bk === 'snow' || bk === 'tundra') {
      notice = {
        contractTitle: 'Ordem de Extermínio: Troles das Gargantas de Rocha',
        targetName: 'Bando de Troles da Montanha (3 Criaturas)',
        threatCR: 'Desafio 6 (Ameaça Mortal)',
        rewardGoldCoins: 60,
        trackingClue: 'Ossadas de mulas e fardos mercantes destruídos bloqueiam a passagem alta.',
        dangerWarning: 'Regeneração acelerada; exige dano de fogo ou ácido para anular a cura.',
        icon: '🪨👹',
        color: '#f87171'
      };
    }

    return {
      biomeKey: bk,
      contractTitle: notice.contractTitle,
      targetName: notice.targetName,
      threatCR: notice.threatCR,
      rewardGoldCoins: notice.rewardGoldCoins,
      trackingClue: notice.trackingClue,
      dangerWarning: notice.dangerWarning,
      icon: notice.icon,
      color: notice.color,
      dndRef: 'DMG p. 92, 131 (Contratos de Caça e Recompensas Provinciais) / XGE p. 130'
    };
  }

  // === calcWildernessHarvestYield (Coleta de Recursos Naturais e Botânica Alquímica - XGE p. 130 / DMG p. 110-111) ===
  function calcWildernessHarvestYield(biomeKey, options) {
    options = options || {};
    var bk = (biomeKey || 'plains').toLowerCase();

    var harvest = {
      resourceName: 'Erva-doce dos Prados Dourados',
      resourceType: 'Flora Medicinal',
      gatheringDC: 11,
      checkType: 'Sobrevivência (Sabedoria) ou Natureza (Inteligência)',
      yieldDice: '1d4 + 1 doses',
      alchemicalEffect: 'Unguento curativo suave; concede +1 PV por dado de vida gasto durante descansos curtos.',
      marketValueGold: 4,
      icon: '🌿',
      color: '#a3e635'
    };

    if (bk === 'forest' || bk === 'selva') {
      harvest = {
        resourceName: 'Raiz de Mandrágora Prateada',
        resourceType: 'Flora Rara',
        gatheringDC: 13,
        checkType: 'Sobrevivência (Sabedoria) ou Natureza (Inteligência)',
        yieldDice: '1d3 doses',
        alchemicalEffect: 'Infusão revigorante que estabiliza exaustão e reduz 1 nível de fadiga ao amanhecer.',
        marketValueGold: 12,
        icon: '🌱',
        color: '#4ade80'
      };
    } else if (bk === 'swamp') {
      harvest = {
        resourceName: 'Cogumelo Fosforescente do Charco',
        resourceType: 'Fungo Alquímico',
        gatheringDC: 14,
        checkType: 'Sobrevivência (Sabedoria) ou Kit de Herbalismo',
        yieldDice: '1d4 doses',
        alchemicalEffect: 'Extrato antitóxico; confere vantagem em salvaguardas contra veneno por 8 horas.',
        marketValueGold: 15,
        icon: '🍄',
        color: '#c084fc'
      };
    } else if (bk === 'mountain' || bk === 'cordilheira') {
      harvest = {
        resourceName: 'Líquen Ígneo das Fendas Rochosas',
        resourceType: 'Mineral Botânico',
        gatheringDC: 14,
        checkType: 'Sobrevivência (Sabedoria) ou Atletismo (Força)',
        yieldDice: '1d4 doses',
        alchemicalEffect: 'Pasta térmica corporal; protege contra hipotermia extrema e ventanias glaciais.',
        marketValueGold: 16,
        icon: '🔥🪨',
        color: '#fb923c'
      };
    } else if (bk === 'desert' || bk === 'dunas') {
      harvest = {
        resourceName: 'Flor Suculenta da Miragem',
        resourceType: 'Flora Desértica',
        gatheringDC: 13,
        checkType: 'Sobrevivência (Sabedoria) ou Kit de Herbalismo',
        yieldDice: '1d4 doses',
        alchemicalEffect: 'Néctar hiper-hidratante; supre a necessidade diária de água de 1 aventureiro.',
        marketValueGold: 10,
        icon: '🌵',
        color: '#facc15'
      };
    } else if (bk === 'snow' || bk === 'tundra') {
      harvest = {
        resourceName: 'Flor de Gelo Perpétuo',
        resourceType: 'Flora Glacial',
        gatheringDC: 15,
        checkType: 'Sobrevivência (Sabedoria) ou Natureza (Inteligência)',
        yieldDice: '1d3 doses',
        alchemicalEffect: 'Bálsamo analgésico e redutor de queimaduras; neutraliza febres e calafrios intensos.',
        marketValueGold: 18,
        icon: '❄️🌸',
        color: '#38bdf8'
      };
    }

    return {
      biomeKey: bk,
      resourceName: harvest.resourceName,
      resourceType: harvest.resourceType,
      gatheringDC: harvest.gatheringDC,
      checkType: harvest.checkType,
      yieldDice: harvest.yieldDice,
      alchemicalEffect: harvest.alchemicalEffect,
      marketValueGold: harvest.marketValueGold,
      icon: harvest.icon,
      color: harvest.color,
      dndRef: 'XGE p. 130 (Kit de Herbalismo e Coleta) / DMG p. 110-111'
    };
  }

  // === calcCampNightWatchSchedule (Turnos de Vigília de Acampamento e Percepção Noturna - PHB p. 186 / DMG p. 112) ===
  function calcCampNightWatchSchedule(partyCount, lightCondition, options) {
    options = options || {};
    var members = partyCount || 4;
    if (members < 1) members = 1;
    var lc = (lightCondition || 'dim_firelight').toLowerCase();

    var shiftHours = 8 / members;
    var shiftDurationDesc = (Math.round(shiftHours * 10) / 10) + 'h por turno';

    var shifts = [];
    var names = ['1º Turno (Crepúsculo & Brasas)', '2º Turno (Noite Profunda)', '3º Turno (Hora das Bruxas)', '4º Turno (Alvorecer & Neblina)'];
    if (members === 2) {
      names = ['1ª Metade da Noite (Crepúsculo a Meia-Noite)', '2ª Metade da Noite (Meia-Noite ao Alvorecer)'];
    } else if (members === 3) {
      names = ['1º Turno (Anoitecer)', '2º Turno (Vigília da Meia-Noite)', '3º Turno (Madrugada ao Alvorecer)'];
    }

    for (var i = 0; i < members; i++) {
      shifts.push({
        shiftIndex: i + 1,
        shiftName: names[i] || ('Turno ' + (i + 1)),
        durationHours: shiftHours,
        riskDescriptor: (i === 1 || i === 2) ? 'Risco Elevado de Emboscada (Criaturas Noturnas)' : 'Vigília de Transição'
      });
    }

    var passivePerceptionMod = 0;
    var ambientNote = 'Iluminação suave de brasas: sentinela observa vultos a até 9 metros sem penalidade.';
    var icon = '🛡️🌙';
    var color = '#60a5fa';

    if (lc === 'pitch_dark') {
      passivePerceptionMod = -5;
      ambientNote = 'Escuridão total: sem tocha ou visão no escuro, aplica-se penalidade de -5 na Percepção Passiva (PHB p. 183).';
      icon = '🌑';
      color = '#94a3b8';
    } else if (lc === 'full_moon') {
      passivePerceptionMod = 0;
      ambientNote = 'Luar prateado pleno: penumbra aberta que revela silhuetas com nitidez nas clareiras.';
      icon = '🌕';
      color = '#e2e8f0';
    }

    return {
      partyMembersCount: members,
      shiftCount: members,
      shiftDurationHours: shiftHours,
      shiftDurationDesc: shiftDurationDesc,
      shifts: shifts,
      lightCondition: lc,
      passivePerceptionMod: passivePerceptionMod,
      ambientNote: ambientNote,
      icon: icon,
      color: color,
      dndRef: 'PHB p. 186 (Descanso Longo e Vigília) / DMG p. 112'
    };
  }

  // === calcTavernExplorationRumor (Boatos de Taverna, Intel de Exploração e Segredos dos Ermos - DMG p. 129-130 / XGE p. 130) ===
  function calcTavernExplorationRumor(biomeKey, spendingLevel, options) {
    options = options || {};
    var bk = (biomeKey || 'plains').toLowerCase();
    var sl = (spendingLevel || 'comfortable').toLowerCase();

    var bribeCostSilver = 10;
    if (sl === 'modest') bribeCostSilver = 3;
    else if (sl === 'lavish') bribeCostSilver = 30;

    var rumor = {
      rumorTitle: 'O Esconderijo do Bando da Masmorra Aberta',
      rumorStory: 'Tropeiros juram que contrabandistas usavam uma adega de pedra escondida sob um moinho em ruínas para fugir das patrulhas.',
      credibility: 'Confiável (Relato de Batedores Locais)',
      tacticalBenefit: 'Permite encontrar abrigo subterrâneo seguro para descanso longo sem risco de chuvas torrenciais.',
      dangerWarning: 'Possível presença de armadilhas de alçapão e abrolhos enferrujados nos degraus de acesso.',
      icon: '🍺📜',
      color: '#facc15'
    };

    if (bk === 'forest' || bk === 'selva') {
      rumor = {
        rumorTitle: 'O Carvalho Sussurrante das Ruínas Antigas',
        rumorStory: 'Caçadores dizem que um carvalho colossal milenar guarda uma clareira sagrada intocada por feras vorazes.',
        credibility: 'Confiável (Confirmado por Druidas)',
        tacticalBenefit: 'Clareira sagrada: descansos curtos recuperam 2 PV adicionais por dado de vida gasto.',
        dangerWarning: 'Perturbar raízes ancestrais atrai dríades protetoras em postura de combate.',
        icon: '🌳✨',
        color: '#4ade80'
      };
    } else if (bk === 'swamp') {
      rumor = {
        rumorTitle: 'O Navio Naufragado no Charco de Sangue',
        rumorStory: 'Um bardo jura que uma barcaça mercante naufragou no lodo carregando um baú com gemas e poções alquímicas.',
        credibility: 'Exagerado (Conto de Bardo de Taverna)',
        tacticalBenefit: 'Sucesso em Investigação CD 13 revela 2 doses de antídoto e 15 moedas de prata.',
        dangerWarning: 'Área infestada por sanguessugas gigantes e gás do pântano inflamável.',
        icon: '🛶☠️',
        color: '#c084fc'
      };
    } else if (bk === 'mountain' || bk === 'cordilheira') {
      rumor = {
        rumorTitle: 'O Covil do Draco de Chumbo no Pico Esbranquiçado',
        rumorStory: 'Mineiros relatam rugidos estrondosos e escamas cinzentas brilhando nas fendas altas acima da linha de neve.',
        credibility: 'Perigo Iminente (Alerta de Guarda Regional)',
        tacticalBenefit: 'Concede +2 na Iniciativa e impede surpresa no primeiro combate contra répteis gigantes da região.',
        dangerWarning: 'Terreno instável com risco crítico de desmoronamentos de pedras durante o confronto.',
        icon: '🏔️🐉',
        color: '#f87171'
      };
    } else if (bk === 'desert' || bk === 'dunas') {
      rumor = {
        rumorTitle: 'O Oásis Esmeralda das Miragens Errantes',
        rumorStory: 'Nômades juram que uma nascente de água cristalina surge entre dunas gêmeas sob a constelação da Serpente.',
        credibility: 'Lenda Antiga (Tradição Oral Nômade)',
        tacticalBenefit: 'Fornece suprimento ilimitado de água pura e remove 1 nível de exaustão de toda a comitiva.',
        dangerWarning: 'A ilusão requer teste de Sobrevivência CD 14 para não se desviar da rota planejada.',
        icon: '🏜️💧',
        color: '#38bdf8'
      };
    } else if (bk === 'snow' || bk === 'tundra') {
      rumor = {
        rumorTitle: 'O Monólito Rúnico do Andarilho Congelado',
        rumorStory: 'Batedores do norte afirmam que um menir talhado por anões antigos orienta viajantes em meio a nevascas.',
        credibility: 'Confiável (Marco Histórico Cartografado)',
        tacticalBenefit: 'Vantagem automática em salvaguardas de orientação geográfica contra se perder na tundra (DMG p. 111).',
        dangerWarning: 'Gelo quebradiço nas bordas da rocha exige cuidado ao transitar a pé.',
        icon: '🗿❄️',
        color: '#e2e8f0'
      };
    }

    return {
      biomeKey: bk,
      spendingLevel: sl,
      bribeCostSilver: bribeCostSilver,
      rumorTitle: rumor.rumorTitle,
      rumorStory: rumor.rumorStory,
      credibility: rumor.credibility,
      tacticalBenefit: rumor.tacticalBenefit,
      dangerWarning: rumor.dangerWarning,
      icon: rumor.icon,
      color: rumor.color,
      dndRef: 'DMG p. 129-130 (Reunir Informações e Boatos dos Ermos) / XGE p. 130'
    };
  }

  // === calcWildernessSustenanceRequirements (Consumo de Rações, Suprimento Hídrico, Desidratação e Inanição - PHB p. 185 / DMG p. 111) ===
  function calcWildernessSustenanceRequirements(partyCount, travelDays, biomeKey, climateTemp, options) {
    options = options || {};
    var members = partyCount || 4;
    if (members < 1) members = 1;
    var days = travelDays || 3;
    if (days < 1) days = 1;
    var bk = (biomeKey || 'plains').toLowerCase();
    var temp = (climateTemp || 'moderate').toLowerCase();

    var isHot = (bk === 'desert' || bk === 'dunas' || temp === 'scorching_heat' || temp === 'extreme_heat');
    var waterGallonsPerDay = isHot ? 2 : 1;
    var rationsPerDay = 1;

    var totalRationsNeeded = members * days * rationsPerDay;
    var totalWaterGallonsNeeded = members * days * waterGallonsPerDay;

    var conMod = (typeof options.conMod === 'number') ? options.conMod : 2;
    var starvationDays = Math.max(1, 3 + conMod);

    var dehydrationPenalty = 'CD 15 de Constituição após 1 dia com meia ração de água, ou ganho de 1 nível automático de exaustão sem água (DMG p. 111).';
    var starvationPenalty = 'Após ' + starvationDays + ' dias sem comida, ganho de 1 nível automático de exaustão a cada dia subsequente (PHB p. 185).';

    var gearDesc = isHot
      ? 'Barril de água em carroça ou múltiplos odres pesados de couro reforçado; prioridade vital no deserto.'
      : 'Cantis de viagem individuais e fardos de ração seca de viagem de ferro.';

    return {
      partyMembersCount: members,
      travelDays: days,
      biomeKey: bk,
      isExtremeHeat: isHot,
      rationsPerDayPerPerson: rationsPerDay,
      totalRationsNeeded: totalRationsNeeded,
      waterGallonsPerDayPerPerson: waterGallonsPerDay,
      totalWaterGallonsNeeded: totalWaterGallonsNeeded,
      starvationThresholdDays: starvationDays,
      dehydrationPenalty: dehydrationPenalty,
      starvationPenalty: starvationPenalty,
      gearRecommendation: gearDesc,
      icon: isHot ? '☀️💧' : '🍞🍶',
      color: isHot ? '#f59e0b' : '#38bdf8',
      dndRef: 'PHB p. 185 (Comida e Água) / DMG p. 111 (Desidratação e Inanição)'
    };
  }

  // === calcCartographicTriangulation (Triangulação de Marcos Topográficos e Ferramentas de Cartógrafo - XGE p. 79 / DMG p. 108) ===
  function calcCartographicTriangulation(sightRangeMiles, landmarkCount, terrainType, options) {
    options = options || {};
    var sight = (typeof sightRangeMiles === 'number') ? sightRangeMiles : 5;
    var count = (typeof landmarkCount === 'number') ? landmarkCount : 3;
    var tt = (terrainType || 'plains').toLowerCase();

    var accuracyGrade = 'Aproximada (1 Marco de Referência)';
    var orientationBonus = 1;
    var travelTimeReductionPct = 0;
    var color = '#94a3b8';
    var icon = '📐';

    if (count >= 3) {
      accuracyGrade = 'Precisa (3+ Marcos Geodésicos Triangulados)';
      orientationBonus = 5;
      travelTimeReductionPct = 15;
      color = '#38bdf8';
      icon = '📐🗺️';
    } else if (count === 2) {
      accuracyGrade = 'Satisfatória (2 Marcos em Linha de Visada)';
      orientationBonus = 3;
      travelTimeReductionPct = 10;
      color = '#4ade80';
      icon = '📐🧭';
    }

    var mapChartBenefit = (count >= 3)
      ? 'Redige carta topográfica com escala precisa; comitiva avança com vantagem em salvaguardas de navegação e corta 15% do tempo de marcha.'
      : ((count === 2)
        ? 'Traçado com vetor de rota confiável; bônus de +3 na orientação geográfica e -10% de desgaste na jornada.'
        : 'Esboço rústico; fornece referência elementar de direção com bônus modesto de +1.');

    return {
      sightRangeMiles: sight,
      landmarkCount: count,
      terrainType: tt,
      accuracyGrade: accuracyGrade,
      orientationBonus: orientationBonus,
      travelTimeReductionPct: travelTimeReductionPct,
      mapChartBenefit: mapChartBenefit,
      icon: icon,
      color: color,
      dndRef: 'XGE p. 79 (Ferramentas de Cartógrafo & Triangulação) / DMG p. 108'
    };
  }

  // === calcCampAlarmAndSentryAnimal (Cães de Guarda, Magia de Alarme e Sentinelas Aladas - PHB p. 157, 211, 240 / DMG p. 112) ===
  function calcCampAlarmAndSentryAnimal(wardType, options) {
    options = options || {};
    var wt = (wardType || 'alarm_spell').toLowerCase();

    var wards = {
      alarm_spell: {
        name: 'Magia Alarme Ritualística (PHB p. 211)',
        alertRadiusFeet: 20,
        detectionMechanism: 'Aviso mental silencioso ao conjurador ou badalar audível a 18 metros.',
        passivePerceptionBonus: 0,
        surpriseImmunity: true,
        cost: 'Componente ritualístico (sineta e fio de prata); dura 8 horas ininterruptas.',
        desc: 'Perímetro invisível que dispara ao menor toque de criatura minúscula a colossal.',
        icon: '🔔✨',
        color: '#c084fc'
      },
      guard_mastiff: {
        name: 'Mastim de Guarda Treinado (PHB p. 157)',
        alertRadiusFeet: 60,
        detectionMechanism: 'Olfato e audição aguçados com latidos vigorosos de aviso.',
        passivePerceptionBonus: 5,
        surpriseImmunity: true,
        cost: '25 po de adestramento militar; consome 1 libra de carne/ração por dia.',
        desc: 'Sentinela leal com vantagem em Percepção para farejar invasores ou vultos furtivos.',
        icon: '🐕',
        color: '#f59e0b'
      },
      familiar_scout: {
        name: 'Familiar Alado Coruja em Poleiro (PHB p. 240)',
        alertRadiusFeet: 120,
        detectionMechanism: 'Visão no escuro a 36 metros e conexão telepática instantânea.',
        passivePerceptionBonus: 5,
        surpriseImmunity: true,
        cost: '10 po em incenso e carvão (Magia Encontrar Familiar).',
        desc: 'Voo silencioso e visão noturna perfeita que detecta predadores nos galhos altos.',
        icon: '🦉👁️',
        color: '#38bdf8'
      },
      tripwire_bell: {
        name: 'Fios de Tropeço com Guizos de Cobre',
        alertRadiusFeet: 30,
        detectionMechanism: 'Tilintar estridente de guizos metálicos ao puxar o arame esticado.',
        passivePerceptionBonus: 2,
        surpriseImmunity: false,
        cost: '2 pp em carretel de arame e guizos mecânicos.',
        desc: 'Dispositivo mecânico engenhoso montado em torno da fogueira ou trilha de acesso.',
        icon: '🪤🛎️',
        color: '#94a3b8'
      }
    };

    var w = wards[wt] || wards.alarm_spell;

    return {
      wardType: wt,
      wardName: w.name,
      alertRadiusFeet: w.alertRadiusFeet,
      detectionMechanism: w.detectionMechanism,
      passivePerceptionBonus: w.passivePerceptionBonus,
      surpriseImmunity: w.surpriseImmunity,
      maintenanceCost: w.cost,
      description: w.desc,
      icon: w.icon,
      color: w.color,
      dndRef: 'PHB p. 157, 211, 240 (Vigília, Alarme e Animais de Guarda) / DMG p. 112'
    };
  }

  // === calcCampfireCookedMeal (Culinária de Acampamento, Utensílios de Cozinheiro e Banquetes - XGE p. 79 / TCoE p. 79) ===
  function calcCampfireCookedMeal(mealType, options) {
    options = options || {};
    var mt = (mealType || 'seasoned_forage_stew').toLowerCase();

    var meals = {
      iron_ration_gruel: {
        name: 'Papa Rústica de Rações de Ferro',
        prepDC: 8,
        costDesc: '1 ração de viagem e água fervente da fogueira.',
        culinaryBenefit: 'Refeição frugal; sacia a fome diária sem conceder benefícios extras de vitalidade.',
        desc: 'Alimento básico de marcha para manter a subsistência nos ermos.',
        icon: '🥣',
        color: '#94a3b8'
      },
      seasoned_forage_stew: {
        name: 'Ensopado de Caça e Ervas dos Ermos (XGE p. 79)',
        prepDC: 11,
        costDesc: '1 ração de viagem combinada com caça ou ervas forrageadas.',
        culinaryBenefit: 'Concede +1d4 de cura adicional por dado de vida gasto durante descansos curtos.',
        desc: 'Cozimento lento em caldeirão; temperos aromáticos revigoram os músculos fatigados.',
        icon: '🍲🌿',
        color: '#4ade80'
      },
      hearty_travelers_feast: {
        name: 'Banquete do Chef de Estrada (TCoE p. 79)',
        prepDC: 13,
        costDesc: 'Rações fartas, especiarias secas e sal gema de caravana.',
        culinaryBenefit: 'Cada membro da comitiva recebe 5 pontos de vida temporários ao término do descanso longo.',
        desc: 'Mesa aquecida e cheiro reconfortante que eleva o ânimo de todos os aventureiros.',
        icon: '🍖✨',
        color: '#f59e0b'
      },
      trail_hardened_pemmican: {
        name: 'Pemmican Alquímico de Marcha Forçada',
        prepDC: 12,
        costDesc: 'Carne desidratada compactada com gordura e frutos silvestres.',
        culinaryBenefit: 'Previne o ganho do 1º nível de exaustão decorrente de marcha forçada nas próximas 24 horas.',
        desc: 'Provimento compacto de alta caloria ideal para marchas velozes sob intempéries.',
        icon: '🥩🥾',
        color: '#38bdf8'
      }
    };

    var m = meals[mt] || meals.seasoned_forage_stew;

    return {
      mealType: mt,
      mealName: m.name,
      prepDC: m.prepDC,
      toolProficiency: 'Utensílios de Cozinheiro ou Sobrevivência',
      ingredientCostDesc: m.costDesc,
      culinaryBenefit: m.culinaryBenefit,
      description: m.desc,
      icon: m.icon,
      color: m.color,
      dndRef: 'XGE p. 79 (Utensílios de Cozinheiro) / TCoE p. 79 (Talento de Chef de Estrada)'
    };
  }

  // === calcCelestialStarNavigation (Navegação Noturna por Constelações e Astrolábio - PHB p. 154 / DMG p. 111) ===
  function calcCelestialStarNavigation(skyCondition, constellationKey, options) {
    options = options || {};
    var sc = (skyCondition || 'clear_stars').toLowerCase();
    var ck = (constellationKey || 'estrela_guia_do_norte').toLowerCase();

    var constellations = {
      estrela_guia_do_norte: {
        name: 'A Agulha Astral do Norte',
        omen: 'Rumo cardinal exato; revela o norte magnético sem oscilações em céu aberto.',
        icon: '⭐🧭',
        color: '#38bdf8'
      },
      constelacao_do_draco: {
        name: 'O Guardião Dracônico dos Picos',
        omen: 'Alinhamento com desfiladeiros montanhosos; previne desvios em gargantas rochosas.',
        icon: '🐉✨',
        color: '#f87171'
      },
      coroa_das_quatro_luas: {
        name: 'A Coroa Mística das Quatro Luas',
        omen: 'Ressonância arcana noturna; concede +1 na CD de salvaguardas de orientação de conjuradores.',
        icon: '👑🌙',
        color: '#c084fc'
      },
      cinturao_do_cacador: {
        name: 'O Cinturão do Caçador dos Ermos',
        omen: 'Trilha estelar de batedores; confere +2 em testes de Rastreamento diurno ao amanhecer.',
        icon: '🏹⭐',
        color: '#facc15'
      }
    };

    var c = constellations[ck] || constellations.estrela_guia_do_norte;

    var orientationModifier = 5;
    var skyDesc = 'Céu estrelado límpido: visibilidade celeste plena com astrolábio de latão.';
    if (sc === 'light_clouds') {
      orientationModifier = 2;
      skyDesc = 'Nebulosidade parcial: constelações visíveis intermitentemente entre aberturas de nuvens.';
    } else if (sc === 'overcast_storm') {
      orientationModifier = -5;
      skyDesc = 'Céu encoberto por tempestade: estrelas totalmente ocultas; orientação requer bússola ou marcos físicos.';
    }

    return {
      skyCondition: sc,
      constellationKey: ck,
      constellationName: c.name,
      orientationModifier: orientationModifier,
      celestialOmen: c.omen,
      skyDescription: skyDesc,
      toolUsed: 'Astrolábio e Cartas Celestes (Ferramentas de Navegador)',
      icon: c.icon,
      color: c.color,
      dndRef: 'PHB p. 154 (Ferramentas de Navegador e Astrolábio) / DMG p. 111 (Navegação Noturna)'
    };
  }

  // === calcWildernessTrailBlaze (Marcação de Trilhas, Moledros e Runas de Batedores - DMG p. 111-112 / PHB p. 178) ===
  function calcWildernessTrailBlaze(markerType, options) {
    options = options || {};
    var mt = (markerType || 'stone_cairn').toLowerCase();

    var markers = {
      stone_cairn: {
        name: 'Moledro de Pedras Empilhadas (Cairn)',
        durabilityDesc: 'Resiste a anos de intempéries, nevascas e ventos fortes.',
        navigationBonus: 5,
        stealthPenaltyDesc: 'Visível a 1 milha de distância; pode ser seguido por rastreadores inimigos.',
        returnBenefit: 'Comitiva viaja pela trilha sem risco de se perder no retorno (CD de navegação reduzida a 5).',
        desc: 'Pilha cônica de pedras empilhadas em encruzilhadas ou elevações de terreno.',
        icon: '🪨📍',
        color: '#facc15'
      },
      blazed_tree_notch: {
        name: 'Talho Profundo em Casca de Árvore',
        durabilityDesc: 'Permanece legível por vários meses até a regeneração da casca.',
        navigationBonus: 3,
        stealthPenaltyDesc: 'Requer inspeção visual próxima de caçadores ou batedores na mata.',
        returnBenefit: 'Batedores aliados avançam em ritmo rápido sem penalidade na percepção passiva.',
        desc: 'Cortes angulares feitos com machadinha na altura dos olhos em troncos espaçados.',
        icon: '🪓🌲',
        color: '#4ade80'
      },
      druidic_secret_sigil: {
        name: 'Runa Secreta Druídica / Marca de Ladinagem',
        durabilityDesc: 'Entalhe camuflado sob musgo ou líquen; dura indefinidamente.',
        navigationBonus: 4,
        stealthPenaltyDesc: 'Oculto a leigos; exige CD 15 de Investigação ou conhecimento da língua secreta.',
        returnBenefit: 'Sinalização segura contra emboscadas; indica atalhos camuflados entre raízes e rochas.',
        desc: 'Símbolos pictográficos discretos que revelam perigos e mananciais a iniciados.',
        icon: '🌿🔮',
        color: '#c084fc'
      },
      chalk_trail_glyph: {
        name: 'Glifo de Giz Alquímico em Cavernas',
        durabilityDesc: 'Fosforescência suave que brilha no escuro por 7 dias em galerias secas.',
        navigationBonus: 4,
        stealthPenaltyDesc: 'Brilho tênue detectável por monstros subterrâneos a curta distância.',
        returnBenefit: 'Impede desorientação em labirintos de fendas rochosas e passagens subterrâneas.',
        desc: 'Inscrições rápidas feitas com bastão de giz enriquecido com fósforo.',
        icon: '✨🕳️',
        color: '#38bdf8'
      }
    };

    var m = markers[mt] || markers.stone_cairn;

    return {
      markerType: mt,
      markerName: m.name,
      durabilityDesc: m.durabilityDesc,
      navigationBonus: m.navigationBonus,
      stealthPenaltyDesc: m.stealthPenaltyDesc,
      returnBenefit: m.returnBenefit,
      description: m.desc,
      icon: m.icon,
      color: m.color,
      dndRef: 'DMG p. 111-112 (Orientação e Marcação de Trilhas nos Ermos) / PHB p. 178'
    };
  }

  // === calcMountainAltitudeAcclimatization (Grandes Altitudes, Ar Rarefeito e Aclimação - DMG p. 110 / PHB p. 181) ===
  function calcMountainAltitudeAcclimatization(elevationFeet, isAcclimatized, options) {
    options = options || {};
    var elev = (typeof elevationFeet === 'number') ? elevationFeet : 11000;
    var acclim = !!isAcclimatized;

    var altitudeTier = 'Colinas e Vales (< 10.000 pés)';
    var forcedMarchHourMultiplier = 1;
    var constitutionDC = 0;
    var penaltyDesc = 'Respiração regular; sem penalidades metabólicas de ar rarefeito.';
    var icon = '⛰️';
    var color = '#4ade80';

    if (elev >= 20000) {
      altitudeTier = 'Pico Glacial Extremo (≥ 20.000 pés)';
      forcedMarchHourMultiplier = acclim ? 1 : 2;
      constitutionDC = 10;
      penaltyDesc = acclim
        ? 'Aclimatado ao ar rarefeito; ainda assim exige salvaguarda de Constituição CD 10 a cada hora de esforço ou ganho de 1 nível de exaustão (DMG p. 110).'
        : 'Ar hipóxico severo: 1 hora de viagem conta como 2 horas de marcha forçada e salvaguarda de Con CD 10 a cada hora contra exaustão.';
      icon = '🏔️❄️';
      color = '#f87171';
    } else if (elev >= 10000) {
      altitudeTier = 'Garganta de Alta Montanha (10.000 a 20.000 pés)';
      forcedMarchHourMultiplier = acclim ? 1 : 2;
      constitutionDC = 0;
      penaltyDesc = acclim
        ? 'Aclimatado (30+ dias na elevação): marcha normal sem duplicar desgaste de fadiga.'
        : 'Não aclimatado: cada hora de viagem conta como 2 horas para propósitos de marcha forçada e exaustão (DMG p. 110).';
      icon = '⛰️🌬️';
      color = '#facc15';
    }

    var gearRecommendation = (elev >= 20000)
      ? 'Agasalhos árticos pesados, cordas de seda de montanhismo, grampos de bota (crampons) e poção de resistência ao frio.'
      : ((elev >= 10000)
        ? 'Peles de inverno, corda reforçada de 15 metros, estacas de escalada e rações calóricas.'
        : 'Botas de caminhada robustas e agasalho comum de viagem.');

    return {
      elevationFeet: elev,
      altitudeTier: altitudeTier,
      isAcclimatized: acclim,
      forcedMarchHourMultiplier: forcedMarchHourMultiplier,
      constitutionDC: constitutionDC,
      altitudePenaltyDesc: penaltyDesc,
      gearRecommendation: gearRecommendation,
      icon: icon,
      color: color,
      dndRef: 'DMG p. 110 (Grandes Altitudes e Ar Rarefeito) / PHB p. 181'
    };
  }

  // === calcWildernessAcousticFootprint (Pegada Sonora, Eco em Desfiladeiros e Furtividade Auditiva - PHB p. 177 / DMG p. 105) ===
  function calcWildernessAcousticFootprint(travelNoiseType, biomeAcoustics, options) {
    options = options || {};
    var nt = (travelNoiseType || 'clanking_heavy_armor').toLowerCase();
    var ba = (biomeAcoustics || 'open_plains_road').toLowerCase();

    var noiseProfiles = {
      clanking_heavy_armor: {
        name: 'Placas Metálicas e Cota de Malha Tilintante',
        baselineFeet: 300,
        stealthModDesc: 'Desvantagem automática em testes de Furtividade (PHB p. 144).',
        ambushRiskPct: 35,
        desc: 'O choque ritmado do ferro ressoa a grandes distâncias alertando patrulhas e predadores.',
        icon: '🛡️🔔',
        color: '#f87171'
      },
      marching_horses_wagon: {
        name: 'Carroça Mercante e Ferraduras em Cascalho',
        baselineFeet: 600,
        stealthModDesc: 'Furtividade impossível; ruído contínuo de rodas rangentes e passos de tração.',
        ambushRiskPct: 45,
        desc: 'Comboio audível a centenas de metros; atrai salteadores de estrada.',
        icon: '🐎📦',
        color: '#fb923c'
      },
      muffled_boots_scouts: {
        name: 'Botas Acolchoadas e Manto de Batedor',
        baselineFeet: 25,
        stealthModDesc: 'Passos silenciosos; permite marcha com vantagem em testes de Furtividade.',
        ambushRiskPct: 0,
        desc: 'Passada leve que evita galhos secos e seixos soltos.',
        icon: '🥾🍃',
        color: '#4ade80'
      },
      spellcasting_verbal_components: {
        name: 'Entoação Mística de Componentes Verbais',
        baselineFeet: 60,
        stealthModDesc: 'Ressonância sonora mágica audível claramente a até 18 metros.',
        ambushRiskPct: 15,
        desc: 'Palavras de poder e cânticos de conjuração que reverberam no ar.',
        icon: '✨🗣️',
        color: '#c084fc'
      }
    };

    var p = noiseProfiles[nt] || noiseProfiles.clanking_heavy_armor;
    var baseFeet = p.baselineFeet;
    var multiplier = 1.0;
    var ambientEchoDesc = 'Acústica de terreno aberto regular.';

    if (ba === 'dense_forest_snow') {
      multiplier = 0.5;
      ambientEchoDesc = 'Foliagem densa e neve fofa amortecem as vibrações sonoras (-50% alcance auditivo).';
    } else if (ba === 'rocky_canyon_cave') {
      multiplier = 2.0;
      ambientEchoDesc = 'Paredões de rocha e fendas reverberam o som em eco estrondoso (+100% alcance auditivo).';
    } else if (ba === 'raging_gale_waterfall') {
      multiplier = 0.25;
      ambientEchoDesc = 'Vendaval uivante e rugido de corredeiras criam ruído branco mascarador.';
    }

    var adjustedAudibleFeet = Math.round(baseFeet * multiplier);

    return {
      travelNoiseType: nt,
      noiseName: p.name,
      biomeAcoustics: ba,
      baselineAudibleFeet: baseFeet,
      adjustedAudibleFeet: adjustedAudibleFeet,
      stealthModifier: p.stealthModDesc,
      ambientEchoDesc: ambientEchoDesc,
      ambushAlertRiskPct: Math.round(p.ambushRiskPct * multiplier),
      description: p.desc,
      icon: p.icon,
      color: p.color,
      dndRef: 'PHB p. 177 (Barulho e Percepção Auditiva) / DMG p. 105'
    };
  }

  // === calcEnvironmentalMirageEncounter (Miragens Térmicas, Luzes-Fátuas e Desorientação Sensorial - DMG p. 111-112 / PHB p. 178) ===
  function calcEnvironmentalMirageEncounter(biomeKey, weatherTemp, options) {
    options = options || {};
    var bk = (biomeKey || 'plains').toLowerCase();
    var wt = (weatherTemp || 'extreme_heat').toLowerCase();

    var mirage = {
      mirageTitle: 'Miragem de Oásis Térmico e Palmeiras Ilusórias',
      deceptionStory: 'O calor abrasador do sol do meio-dia faz o ar tremular nas dunas, projetando o reflexo vítreo de um lago fresco.',
      discernDC: 13,
      discernSkill: 'Investigação (Inteligência) ou Sobrevivência (Sabedoria)',
      misdirectionConsequence: 'Desvia a comitiva por 1d4 milhas em direção a bancos de areia escaldantes, consumindo 1 hora de marcha inútil.',
      tacticalAdvice: 'Use um cantil ou observe pássaros reais; a ausência de animais em voo revela a ilusão térmica.',
      icon: '🏜️💧',
      color: '#facc15'
    };

    if (bk === 'swamp') {
      mirage = {
        mirageTitle: 'Luzes-Fátuas e Falsos Lampiões do Charco',
        deceptionStory: 'Globos fosforescentes de fogo fátuo dançam na névoa espessa mimetizando tochas de uma estalagem ou batedores de socorro.',
        discernDC: 14,
        discernSkill: 'Sobrevivência (Sabedoria) ou Arcanismo (Inteligência)',
        misdirectionConsequence: 'Conduz viajantes direto a poços de lodo movediço (Salvaguarda de Destreza CD 12 ou afundamento).',
        tacticalAdvice: 'Luzes frias sem fumaça denunciam gases venenosos e espíritos errantes do pântano.',
        icon: '🏮🌫️',
        color: '#c084fc'
      };
    } else if (bk === 'snow' || bk === 'tundra') {
      mirage = {
        mirageTitle: 'Estruturas Fantasmas da Nevasca Branca',
        deceptionStory: 'A luz cegante refletida na neve associada ao vento polar distorce montículos de gelo em formato de cabanas de refúgio.',
        discernDC: 12,
        discernSkill: 'Sobrevivência (Sabedoria) ou Percepção (Sabedoria)',
        misdirectionConsequence: 'Gasta 2 horas contornando gretas de gelo quebradiço na tentativa de alcançar o abrigo inexistente.',
        tacticalAdvice: 'Óculos de fenda de madeira ou pele escura protegem a visão contra a cegueira branca da tundra.',
        icon: '❄️🛖',
        color: '#38bdf8'
      };
    } else if (bk === 'mountain' || bk === 'cordilheira') {
      mirage = {
        mirageTitle: 'Ecos Ilusórios e Sussurros das Fendas',
        deceptionStory: 'Rajadas de ar canalizadas pelas gargantas rochosas emitem uivos acústicos que soam idênticos a pedidos de socorro.',
        discernDC: 13,
        discernSkill: 'Percepção (Sabedoria) ou Sobrevivência (Sabedoria)',
        misdirectionConsequence: 'Atrai a comitiva para bordas escorregadias expostas a ventanias laterais de desfiladeiro.',
        tacticalAdvice: 'Verifique a direção do vento dominante antes de se deslocar em direção aos ruídos.',
        icon: '⛰️🗣️',
        color: '#f87171'
      };
    }

    return {
      biomeKey: bk,
      weatherTemp: wt,
      mirageTitle: mirage.mirageTitle,
      deceptionStory: mirage.deceptionStory,
      discernDC: mirage.discernDC,
      discernSkill: mirage.discernSkill,
      misdirectionConsequence: mirage.misdirectionConsequence,
      tacticalAdvice: mirage.tacticalAdvice,
      icon: mirage.icon,
      color: mirage.color,
      dndRef: 'DMG p. 111-112 (Miragens e Desorientação Sensorial nos Ermos) / PHB p. 178'
    };
  }

  // === calcWildernessChaseEscape (Fuga Tática, Perseguições nos Ermos e Desengajamento - DMG p. 252-254 / PHB p. 192) ===
  function calcWildernessChaseEscape(escapeTerrainType, partySpeedFt, options) {
    options = options || {};
    var ett = (escapeTerrainType || 'dense_thicket_escape').toLowerCase();
    var speed = (typeof partySpeedFt === 'number') ? partySpeedFt : 30;
    var conMod = (typeof options.conMod === 'number') ? options.conMod : 2;
    var dashLimitRounds = Math.max(1, 3 + conMod);

    var escapes = {
      dense_thicket_escape: {
        name: 'Fuga através de Espinheiros e Mata Fechada',
        checkDC: 12,
        checkSkill: 'Destreza (Acrobacia) ou Sobrevivência (Sabedoria)',
        complicationHazard: 'Galhos espinhosos retalham capas e montarias; falha causa 1d6 de dano perfurante e lentidão.',
        escapeAdvantage: 'Cobertura total contra projéteis e desvantagem para rastreadores visuais.',
        desc: 'Mergulho em matagais espessos onde predadores grandes não conseguem manter a velocidade.',
        icon: '🌿🏃',
        color: '#4ade80'
      },
      river_current_drift: {
        name: 'Salto e Deriva em Corredeira Fluvial Rápida',
        checkDC: 13,
        checkSkill: 'Força (Atletismo) para flutuar e controlar a descida',
        complicationHazard: 'Pedras submersas pontiagudas; falha causa 1d8 de dano de concussão e perda de fardos leves.',
        escapeAdvantage: 'A correnteza apaga instantaneamente todo rastro de odor e duplica o ritmo de fuga.',
        desc: 'Abandono da margem para deslizar pela força das águas correnteza abaixo.',
        icon: '🌊🏊',
        color: '#38bdf8'
      },
      rocky_scree_slide: {
        name: 'Deslizamento Controlado em Encosta de Cascalho',
        checkDC: 11,
        checkSkill: 'Destreza (Acrobacia) para manter o equilíbrio no declive',
        complicationHazard: 'Perda de equilíbrio; falha causa queda prostrada e deslizamento descontrolado.',
        escapeAdvantage: 'Poeira densa e pedras rolantes bloqueiam a perseguição imediata pela encosta.',
        desc: 'Descida rápida esquiando sobre seixos soltos para romper a linha de visão do inimigo.',
        icon: '🪨⛷️',
        color: '#facc15'
      },
      smokescreen_caltrop_drop: {
        name: 'Dispersão de Abrolhos e Cortina de Fumaça',
        checkDC: 10,
        checkSkill: 'Destreza (Prestidigitação) ou Uso de Equipamento Tático',
        complicationHazard: 'Vento contrário pode dissipar a cortina antes do tempo desejado.',
        escapeAdvantage: 'Terreno difícil automático com risco de dano nos pés das feras perseguidoras.',
        desc: 'Arremesso de bombas de fumaça alquímica e sacas de abrolhos na trilha estreita.',
        icon: '💨🪤',
        color: '#fb923c'
      }
    };

    var e = escapes[ett] || escapes.dense_thicket_escape;

    return {
      escapeTerrainType: ett,
      terrainName: e.name,
      checkDC: e.checkDC,
      checkSkill: e.checkSkill,
      dashLimitRounds: dashLimitRounds,
      partySpeedFt: speed,
      complicationHazard: e.complicationHazard,
      escapeAdvantage: e.escapeAdvantage,
      description: e.desc,
      icon: e.icon,
      color: e.color,
      dndRef: 'DMG p. 252-254 (Perseguições e Fugas nos Ermos) / PHB p. 192'
    };
  }

  // === calcRegionalLeylineNode (Linhas de Força Mística, Nós Arcanos e Solo Sobrenatural - TCoE p. 150-153 / DMG p. 109) ===
  function calcRegionalLeylineNode(leylineType, options) {
    options = options || {};
    var lt = (leylineType || 'leyline_restoration_node').toLowerCase();

    var nodes = {
      leyline_restoration_node: {
        title: 'Nó de Ressonância da Trama Astral',
        resonanceDesc: 'Convergência de correntes arcanas subterrâneas que vibram no ar como uma harpa de cristal.',
        spellcasterBoon: 'Durante descanso curto, conjuradores podem recuperar 1 espaço de magia de 1º círculo ou 2 pontos de feitiçaria.',
        campBenefit: 'Fogueiras e tochas queimam com chama azulada purificadora sem consumir combustível.',
        complication: 'Frequência mágica ressonante pode ser sentida por caçadores arcanos num raio de 2 milhas.',
        icon: '🔮⚡',
        color: '#c084fc'
      },
      wild_magic_surge_field: {
        title: 'Fenda de Magia Selvagem Caótica',
        resonanceDesc: 'A urdidura mágica está rompida; faíscas prismáticas brotam das rochas e do solo.',
        spellcasterBoon: 'Toda magia de 1º círculo ou superior conjurada aqui exige rolagem de d20 na Tabela de Surto Selvagem (PHB p. 103).',
        campBenefit: 'Descansos produzem sonhos proféticos desconexos; vantagem em 1 teste de iniciativa matinal.',
        complication: 'Resultados caóticos imprevistos podem atrair elementais errantes da tempestade.',
        icon: '🌀✨',
        color: '#f43f5e'
      },
      divine_sanctified_ground: {
        title: 'Solo Sagrado Consagrado (Hallowed Earth)',
        resonanceDesc: 'Solo abençoado por deidades solares antigas; emanando calor brando e paz celestial.',
        spellcasterBoon: 'Criaturas do tipo morto-vivo ou íncubo sofrem desvantagem em testes de resistência num raio de 18 metros.',
        campBenefit: 'Todos os aventureiros recebem vantagem em salvaguardas de Sabedoria contra medo e encantamento.',
        complication: 'Qualquer ato profano ou desecração encerra instantaneamente a bênção do local.',
        icon: '☀️🛡️',
        color: '#facc15'
      },
      shadowfell_dampening_veil: {
        title: 'Véu Umbral de Amortecimento Sombrio',
        resonanceDesc: 'Névoa gélida cinzenta onde cores parecem desbotadas e a luz natural projeta sombras alongadas.',
        spellcasterBoon: 'Magias de ilusão e necromancia recebem +1 na CD de salvaguarda; fontes de luz têm alcance reduzido pela metade.',
        campBenefit: 'Vantagem automática em testes de Furtividade para o acampamento permanecer camuflado na penumbra.',
        complication: 'Sensação gélida opressiva exige teste de Constituição CD 11 para evitar desânimo ao despertar.',
        icon: '🌑🌫️',
        color: '#64748b'
      }
    };

    var n = nodes[lt] || nodes.leyline_restoration_node;

    return {
      leylineType: lt,
      nodeTitle: n.title,
      magicalResonance: n.resonanceDesc,
      spellcasterBoon: n.spellcasterBoon,
      campAttunementBenefit: n.campBenefit,
      complicationWarning: n.complication,
      icon: n.icon,
      color: n.color,
      dndRef: 'TCoE p. 150-153 (Regiões Sobrenaturais e Nós Místicos) / DMG p. 109'
    };
  }

  // === calcWildernessWeatherForecast (Previsão Meteorológica, Artifício Druídico e Barometria - PHB p. 178, 236 / DMG p. 109) ===
  function calcWildernessWeatherForecast(biomeKey, curSeason, options) {
    options = options || {};
    var bk = (biomeKey || 'plains').toLowerCase();
    var season = (curSeason || 'autumn').toLowerCase();

    var forecast = {
      forecastOutlook: 'Céu Límpido com Brisas Amenas',
      barometricTrend: 'Pressão alta estável; vento fraco de sudeste.',
      hoursUntilShift: 18,
      proactivePreparation: 'Nenhuma precaução severa necessária; marcha sem desgaste climático.',
      foresightBonus: 'Vantagem em testes de Percepção visual ao ar livre nas próximas 24h.',
      icon: '☀️🌤️',
      color: '#facc15'
    };

    if (bk === 'desert' || bk === 'dunas') {
      forecast = {
        forecastOutlook: 'Tempestade de Areia e Vendaval Abrasador (Siroco)',
        barometricTrend: 'Queda súbita de pressão com aumento de temperatura.',
        hoursUntilShift: 4,
        proactivePreparation: 'Cobrir montarias, selar odres de água e acampar a sotavento de dunas altas.',
        foresightBonus: '+2 nas salvaguardas de Constituição contra exaustão por calor e desidratação.',
        icon: '🏜️🌪️',
        color: '#f59e0b'
      };
    } else if (bk === 'snow' || bk === 'tundra' || bk === 'montanha') {
      forecast = {
        forecastOutlook: 'Frente Polar e Nevasca com Rajadas de Granizo',
        barometricTrend: 'Pressão barométrica em queda livre com ventos cortantes do norte.',
        hoursUntilShift: 6,
        proactivePreparation: 'Coletar lenha seca extra, vestir agasalhos árticos e fixar estacas de abrigo.',
        foresightBonus: '+2 nas salvaguardas de Constituição contra hipotermia ao entardecer.',
        icon: '❄️🌨️',
        color: '#38bdf8'
      };
    } else if (bk === 'swamp') {
      forecast = {
        forecastOutlook: 'Névoa Miagmática Densa com Chuva Ácida Teimosa',
        barometricTrend: 'Ar saturado e estagnado; condensação de vapores pantanosos.',
        hoursUntilShift: 8,
        proactivePreparation: 'Impregnar mantas com graxa vegetal e preparar infusões antitóxicas.',
        foresightBonus: 'Imunidade a ser surpreendido por predadores rastejantes camuflados no nevoeiro.',
        icon: '🌫️🌧️',
        color: '#c084fc'
      };
    } else if (bk === 'forest' || bk === 'selva') {
      forecast = {
        forecastOutlook: 'Tempestade Elétrica com Chuvas Torrenciais de Copa',
        barometricTrend: 'Acúmulo de nuvens cúmulo-nimbo escuras sobre o dossel florestal.',
        hoursUntilShift: 5,
        proactivePreparation: 'Evitar árvores isoladas e estabelecer refúgio sob copas baixas protegidas.',
        foresightBonus: '+2 na orientação para encontrar cavernas secas antes da tempestade desabar.',
        icon: '⛈️⚡',
        color: '#4ade80'
      };
    }

    return {
      biomeKey: bk,
      curSeason: season,
      forecastOutlook: forecast.forecastOutlook,
      barometricTrend: forecast.barometricTrend,
      hoursUntilShift: forecast.hoursUntilShift,
      proactivePreparation: forecast.proactivePreparation,
      foresightBonus: forecast.foresightBonus,
      icon: forecast.icon,
      color: forecast.color,
      dndRef: 'PHB p. 236 (Artifício Druídico) / PHB p. 178 (Sobrevivência e Previsão Meteorológica) / DMG p. 109'
    };
  }

  // === calcAncientWaystoneAttunement (Círculos Rúnicos Antigos, Portais de Menires e Sintonização - DMG p. 135 / TCoE p. 150) ===
  function calcAncientWaystoneAttunement(waystoneId, options) {
    options = options || {};
    var wid = (waystoneId || 'portal_vale_aurora').toLowerCase();

    var portals = {
      portal_vale_aurora: {
        name: 'Portal dos Menires do Vale da Aurora',
        sigilSequence: 'Sol Nascente · Trigo Dourado · Cisne Astral',
        attunementDC: 12,
        transitCost: '1 dose de giz argênteo ou 5 moedas de prata em incenso aromático.',
        desc: 'Monólito de calcário esculpido por elfos antigos; emana calor suave e segurança.',
        icon: '🏛️✨',
        color: '#38bdf8'
      },
      portal_floresta_ancestral: {
        name: 'Círculo Megalítico das Raízes Primordiais',
        sigilSequence: 'Folha de Carvalho · Serpente Esmeralda · Lua Minguante',
        attunementDC: 13,
        transitCost: '1 gema polida de quartzo ou oferenda de seiva de mandrágora.',
        desc: 'Pilares de pedra cobertos por hera eterna; sintonizado com os espíritos druídicos.',
        icon: '🌳🔮',
        color: '#4ade80'
      },
      portal_pico_gelado: {
        name: 'Monólito Rúnico da Garganta do Vento Branco',
        sigilSequence: 'Floco de Gelo · Garra de Falcão · Estrela Polar',
        attunementDC: 14,
        transitCost: '1 essência ígnea menor ou 10 moedas de ouro em carvão vegetal purificado.',
        desc: 'Obelisco de granito azul cravado na rocha nua; ponto de salto entre cordilheiras.',
        icon: '🏔️⭐',
        color: '#c084fc'
      },
      portal_dunas_sol: {
        name: 'Arco do Sol Poente das Areias Vermelhas',
        sigilSequence: 'Escorpião de Ouro · Disco Solar · Miragem Alada',
        attunementDC: 13,
        transitCost: '1 frasco de óleo de lótus do deserto ou 10 po em especiarias raras.',
        desc: 'Pórtico de arenito preservado que conecta oásis distantes através dos desertos.',
        icon: '🏜️☀️',
        color: '#facc15'
      }
    };

    var p = portals[wid] || portals.portal_vale_aurora;

    return {
      waystoneId: wid,
      portalName: p.name,
      sigilSequence: p.sigilSequence,
      attunementDC: p.attunementDC,
      attunementSkill: 'Arcanismo (Inteligência) ou História (Inteligência)',
      transitCostDesc: p.transitCost,
      safeZoneRadiusFeet: 300,
      networkStatus: 'Sintonizado e Ativo no Atlas da Comitiva',
      description: p.desc,
      icon: p.icon,
      color: p.color,
      dndRef: 'DMG p. 135 (Círculos Rúnicos de Teletransporte) / TCoE p. 150'
    };
  }

  // === calcMonsterSpoorAndLairProximity (Rastros de Monstros, Proximidade de Covil e Efeitos Regionais - MM p. 8 / DMG p. 244) ===
  function calcMonsterSpoorAndLairProximity(biomeKey, creatureCategory, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var cat = (creatureCategory || 'apex_predator_draconic').toLowerCase();

    var spoor = {
      spoorTitle: 'Covil Dracônico Próximo & Efeitos Regionais (MM p. 8)',
      trackingSigns: 'Árvores chamuscadas e cheiro acre de enxofre em um raio de 3 milhas.',
      regionalLairEffect: 'Nevoeiro denso e cinzas flutuantes obscurecem a visão; pequenos animais fugiram da região.',
      detectionDC: 13,
      detectionSkill: 'Sobrevivência (Sabedoria) ou Natureza (Inteligência)',
      tacticalForeknowledge: 'Comitiva não pode ser surpreendida pelo predador e recebe +2 na iniciativa ao avistar o monstro.',
      dangerWarning: 'Aproximação direta da caverna principal aciona ações de covil na contagem de iniciativa 20.',
      icon: '🐉🔥',
      color: '#f87171'
    };

    if (cat === 'monstrosity_owlbear' || bk === 'forest' || bk === 'selva') {
      spoor = {
        spoorTitle: 'Território de Urso-Coruja Alfa & Marcas de Garra',
        trackingSigns: 'Troncos esfolados a 3 metros de altura e pelotas de ossos regurgitados em fendas de raízes.',
        regionalLairEffect: 'Carcaças de presas penduradas em galhos marcam a fronteira do território de caça.',
        detectionDC: 12,
        detectionSkill: 'Sobrevivência (Sabedoria) ou Percepção (Sabedoria)',
        tacticalForeknowledge: 'Identifica ângulo de emboscada aérea nos ramos altos; vantagem no primeiro teste de Percepção.',
        dangerWarning: 'A fera tem faro aguçado; acampar a favor do vento atrai ataque noturno imediato.',
        icon: '🦉🐻',
        color: '#4ade80'
      };
    } else if (cat === 'undead_coven' || bk === 'swamp') {
      spoor = {
        spoorTitle: 'Miasma Necrótico de Coven & Mãos Afogadas',
        trackingSigns: 'Água fétida estagnada e árvores mortas chorando seiva negra e viscosa.',
        regionalLairEffect: 'Plantas apodrecem num raio de 1 milha; névoas sussurrantes transmitem calafrios sobrenaturais.',
        detectionDC: 14,
        detectionSkill: 'Arcanismo (Inteligência) ou Religião (Inteligência)',
        tacticalForeknowledge: 'Revela imunidades a veneno dos lacaios mortos-vivos e orienta uso de dano radiante ou fogo.',
        dangerWarning: 'Mortos-vivos rastejantes emergem do lodo caso a comitiva faça paradas prolongadas.',
        icon: '🧙‍♀️💀',
        color: '#c084fc'
      };
    } else if (bk === 'desert' || bk === 'dunas') {
      spoor = {
        spoorTitle: 'Trilha de Verme das Areias & Tremores Sísmicos',
        trackingSigns: 'Sulcos profundos na areia e vibrações ritmadas perceptíveis no solo a cada poucos minutos.',
        regionalLairEffect: 'Redemoinhos de poeira e pequenos desmoronamentos de dunas cercam o covil subterrâneo.',
        detectionDC: 13,
        detectionSkill: 'Sobrevivência (Sabedoria) ou Investigação (Inteligência)',
        tacticalForeknowledge: 'Permite transitar pisando suavemente em rochas firmes, reduzindo chance de emboscada subterrânea.',
        dangerWarning: 'Caminhar com passos pesados nas areias moles atrai o monstro em 1d4 rodadas.',
        icon: '🐛🏜️',
        color: '#facc15'
      };
    }

    return {
      biomeKey: bk,
      creatureCategory: cat,
      spoorTitle: spoor.spoorTitle,
      trackingSigns: spoor.trackingSigns,
      regionalLairEffect: spoor.regionalLairEffect,
      detectionDC: spoor.detectionDC,
      detectionSkill: spoor.detectionSkill,
      tacticalForeknowledge: spoor.tacticalForeknowledge,
      dangerWarning: spoor.dangerWarning,
      icon: spoor.icon,
      color: spoor.color,
      dndRef: 'Monster Manual p. 8 (Covis e Efeitos Regionais) / DMG p. 244 / PHB p. 178'
    };
  }

  // === calcWildernessQuicksandHazard (Areia Movediça, Tremedais e Regras Canônicas de Resgate - DMG p. 110-111 / PHB p. 183) ===
  function calcWildernessQuicksandHazard(biomeKey, partyWeightClass, options) {
    options = options || {};
    var bk = (biomeKey || 'swamp').toLowerCase();
    var wc = (partyWeightClass || 'standard_scout').toLowerCase();

    var pitDepthFeet = (bk === 'swamp') ? 12 : 10;
    var spottingDC = 15;

    var sinkingFormula = 'Afunda 1d4 + 1 pés imediatamente e 1d4 pés no início de cada um dos seus turnos (DMG p. 110).';
    var escapeFormula = 'Teste de Força (Atletismo) CD 10 + quantidade de pés afundados; ou CD 10 se auxiliado por companheiros com corda.';

    var hazardName = (bk === 'swamp')
      ? 'Tremedal Traiçoeiro sob Folhagem Flutuante'
      : ((bk === 'desert' || bk === 'dunas')
        ? 'Poço de Areia Movediça Seca e Fina'
        : 'Lamaçal Movediço de Margem Fluvial');

    var rescueMitigation = (wc === 'heavy_armored_pack')
      ? 'Armaduras pesadas aceleram o pânico; soltar mochilas e utilizar corda de 15 metros ancorada em árvore firme.'
      : 'Vara de sondagem de 3 metros tocando o solo à frente detecta o tremedal automaticamente sem riscos.';

    return {
      biomeKey: bk,
      hazardName: hazardName,
      spottingDC: spottingDC,
      spottingSkill: 'Sabedoria (Percepção) ou Sobrevivência (Sabedoria)',
      pitDepthFeet: pitDepthFeet,
      sinkingFormula: sinkingFormula,
      escapeFormula: escapeFormula,
      rescueMitigation: rescueMitigation,
      icon: '🕳️⚠️',
      color: '#eab308',
      dndRef: 'DMG p. 110-111 (Areia Movediça e Tremedais) / PHB p. 183 (Sufocamento)'
    };
  }


  // === calcWaterSourcePurityAndPurification (Pureza de Fontes de Água Selvagem, Contaminação e Métodos de Purificação - DMG p. 111 / PHB p. 185, 270) ===
  function calcWaterSourcePurityAndPurification(biomeKey, waterCategory, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var wc = (waterCategory || 'flowing_river').toLowerCase();

    var hasPurifySpell = !!options.hasPurifySpell;
    var hasHerbalismKit = !!options.hasHerbalismKit;
    var canBoil = (options.canBoil !== undefined) ? !!options.canBoil : true;

    var purity = {
      purityStatus: 'Água Doce Corrente de Riacho',
      diseaseOrPoison: 'Baixa presença de sedimentos; risco leve de contaminação em água não tratada.',
      saveDC: 10,
      saveType: 'Constituição',
      purificationOutcome: 'Fervura de 5 minutos torna a água totalmente pura para cantis de viagem (DMG p. 111).',
      dailyGallonsYield: 'Abundante (riacho com fluxo ativo contínuo)',
      icon: '🌊🐟',
      color: '#38bdf8'
    };

    if (wc === 'pure_mountain_spring' || bk === 'montanha') {
      purity = {
        purityStatus: 'Potável & Cristalina (Nascente de Altitude)',
        diseaseOrPoison: 'Nenhum contaminante biológico ou químico detectado; água de degelo ou aquífero puro.',
        saveDC: 0,
        saveType: 'Constituição',
        purificationOutcome: 'Consumo seguro imediato sem necessidade de tratamento; hidratação perfeita para a comitiva.',
        dailyGallonsYield: '10d6 galões/hora (nascente ativa contínua)',
        icon: '💧✨',
        color: '#38bdf8'
      };
    } else if (wc === 'stagnant_swamp_mire' || bk === 'swamp' || bk === 'pantano') {
      var purifOutcomeSwamp = 'Ingestão crua exige Salvaguarda de Constituição CD 12; falha causa 1 nível de exaustão e Praga do Esgoto.';
      if (hasPurifySpell) {
        purifOutcomeSwamp = 'Purificação milagrosa instantânea via magia canônica *Purificar Alimentos e Bebidas* (PHB p. 270). Água 100% esterilizada.';
      } else if (canBoil) {
        purifOutcomeSwamp = 'Fervura prolongada por 10 minutos elimina 100% dos micróbios e parasitas biológicos (DMG p. 111).';
      } else if (hasHerbalismKit) {
        purifOutcomeSwamp = 'Filtro de carvão ativado e musgo esfagno reduz a CD da Salvaguarda para 8.';
      }

      purity = {
        purityStatus: 'Contaminada por Lodo e Parasitas (Miasma Pantanoso)',
        diseaseOrPoison: 'Praga do Esgoto (Sewer Plague - DMG p. 257) e disenteria pútrida.',
        saveDC: 12,
        saveType: 'Constituição',
        purificationOutcome: purifOutcomeSwamp,
        dailyGallonsYield: '3d6 galões de água tratada',
        icon: '🧪🦠',
        color: '#4ade80'
      };
    } else if (wc === 'volcanic_sulfur_pool' || bk === 'volcanic' || bk === 'vulcao') {
      var purifOutcomeVolc = 'Consumo tóxico sem tratamento; falha na Salvaguarda CD 14 inflige condição Envenenado e 2d6 dano de veneno.';
      if (hasPurifySpell) {
        purifOutcomeVolc = 'Magia divina *Purificar Alimentos e Bebidas* (PHB p. 270) neutraliza as toxinas minerais e enxofre por completo!';
      } else if (canBoil) {
        purifOutcomeVolc = 'AVISO: Fervura convencional NÃO remove enxofre ou metais pesados; a evaporação apenas concentra os venenos!';
      } else if (hasHerbalismKit) {
        purifOutcomeVolc = 'Kit de herbalismo com carvão ativo neutraliza parte dos metais pesados; CD de Salvaguarda reduzida para 10.';
      }

      purity = {
        purityStatus: 'Tóxica por Enxofre e Metais Pesados',
        diseaseOrPoison: 'Veneno Mineral Corrosivo (intoxicação gástrica e queimação química).',
        saveDC: 14,
        saveType: 'Constituição',
        purificationOutcome: purifOutcomeVolc,
        dailyGallonsYield: '1d6 galões após neutralização química',
        icon: '🌋☠️',
        color: '#f87171'
      };
    } else if (wc === 'blighted_shadow_bog') {
      var purifOutcomeBog = 'Fervura física é inútil contra mácula sobrenatural; beber sem purificação mágica drena 1d6 PV máximos da comitiva.';
      if (hasPurifySpell) {
        purifOutcomeBog = 'Magia divina *Purificar Alimentos e Bebidas* (PHB p. 270) dissipa a mácula profana da água.';
      }

      purity = {
        purityStatus: 'Necroticamente Maculada (Névoa Sombria e Cadavérica)',
        diseaseOrPoison: 'Miasma de Podridão Cadavérica e drenagem necrótica de tecidos.',
        saveDC: 15,
        saveType: 'Constituição',
        purificationOutcome: purifOutcomeBog,
        dailyGallonsYield: '2d4 galões purificados',
        icon: '💀🥀',
        color: '#c084fc'
      };
    }

    return {
      biomeKey: bk,
      waterCategory: wc,
      purityStatus: purity.purityStatus,
      diseaseOrPoison: purity.diseaseOrPoison,
      saveDC: purity.saveDC,
      saveType: purity.saveType,
      purificationOutcome: purity.purificationOutcome,
      dailyGallonsYield: purity.dailyGallonsYield,
      survivalTip: 'Em clima temperado, cada aventureiro consome 1 galão/dia; em calor extremo ou marcha acelerada no deserto, consome 2 galões/dia (PHB p. 185).',
      icon: purity.icon,
      color: purity.color,
      dndRef: 'DMG p. 111 (Contaminação de Água) / PHB p. 185 (Sustento de Viagem) / PHB p. 270 (Purificar Alimentos)'
    };
  }

  // === calcArborealBivouacShelter (Bivaque e Abrigo Arbóreo Suspenso contra Insetos e Predadores Terrestres - DMG p. 111 / PHB p. 153 / XGE p. 78) ===
  function calcArborealBivouacShelter(biomeKey, shelterType, options) {
    options = options || {};
    var bk = (biomeKey || 'floresta').toLowerCase();
    var st = (shelterType || 'suspended_hammock').toLowerCase();

    var bivouac = {
      shelterTitle: 'Rede Suspensa em Troncos Altos (DMG p. 111)',
      viability: 'Alta em florestas e biomas arborizados.',
      groundVerminImmunity: true,
      ambushDefenseModifier: '+2 na Percepção Passiva da vigília noturna; predadores terrestres sem escalada não conseguem surpreender os aventureiros.',
      riggingDC: 11,
      riggingSkill: 'Sabedoria (Sobrevivência) ou Destreza (Acrobacia)',
      weatherResistance: 'Excelente drenagem contra solo encharcado e lamaçal; requer lona contra chuvas fortes.',
      campRestAdvantage: 'Os aventureiros descansam suspensos com segurança, isolados da lama tóxica e de enxames de centopeias.',
      icon: '🪢🌲',
      color: '#4ade80'
    };

    if (st === 'ground_bedroll') {
      bivouac = {
        shelterTitle: 'Saco de Dormir no Solo (Acampamento Rasteiro Padrão)',
        viability: 'Universal em qualquer solo plano.',
        groundVerminImmunity: false,
        ambushDefenseModifier: 'Nenhum bônus tático; vulnerável a insetos rastejantes, sanguessugas e predadores terrestres furtivos.',
        riggingDC: 0,
        riggingSkill: 'Nenhum teste necessário',
        weatherResistance: 'Vulnerável a alagamentos rápidos, poças de lama e frio ascendente da terra.',
        campRestAdvantage: 'Descanso básico normal; em pântanos exige teste de Constituição contra febres transmitidas por vermes.',
        icon: '🏕️🛏️',
        color: '#94a3b8'
      };
    } else if (st === 'canopy_platform_blind') {
      bivouac = {
        shelterTitle: 'Plataforma Arbórea Camuflada nas Copas (PHB p. 153 / XGE p. 78)',
        viability: 'Alta em matas fechadas e selvas virgens; requer cordas de escalada e 1 hora de montagem.',
        groundVerminImmunity: true,
        ambushDefenseModifier: 'Camuflagem concede +5 no teste de Furtividade do acampamento e cobertura de três quartos (+5 CA) contra disparos do solo.',
        riggingDC: 14,
        riggingSkill: 'Sobrevivência (Sabedoria) ou Atletismo (Força)',
        weatherResistance: 'Abrigo coberto com folhagem espessa que amortece ventos e chuvas torrenciais.',
        campRestAdvantage: 'Refúgio tático com visão panorâmica de 360 graus para sentinelas vigiarem a mata ao redor.',
        icon: '🦅🌳',
        color: '#a855f7'
      };
    } else if (st === 'cliff_ledge_piton_hammock' || bk === 'montanha') {
      bivouac = {
        shelterTitle: 'Bivaque Suspenso em Paredão de Rocha com Pítons (PHB p. 153)',
        viability: 'Excelente em montanhas, cânions e escarpamentos rochosos verticais.',
        groundVerminImmunity: true,
        ambushDefenseModifier: 'Inacessível para predadores terrestres; apenas criaturas voadoras conseguem alcançar o bivaque.',
        riggingDC: 13,
        riggingSkill: 'Força (Atletismo) ou Uso de Kit de Escalador',
        weatherResistance: 'Protegido sob saliências rochosas contra neve e granizo; vulnerável a desmoronamento de pedregulhos.',
        campRestAdvantage: 'A comitiva repousa ancorada nos penhascos acima das névoas venenosas e pântanos dos vales.',
        icon: '🧗⛰️',
        color: '#38bdf8'
      };
    }

    return {
      biomeKey: bk,
      shelterType: st,
      shelterTitle: bivouac.shelterTitle,
      viability: bivouac.viability,
      groundVerminImmunity: bivouac.groundVerminImmunity,
      ambushDefenseModifier: bivouac.ambushDefenseModifier,
      riggingDC: bivouac.riggingDC,
      riggingSkill: bivouac.riggingSkill,
      weatherResistance: bivouac.weatherResistance,
      campRestAdvantage: bivouac.campRestAdvantage,
      icon: bivouac.icon,
      color: bivouac.color,
      dndRef: 'DMG p. 111 (Abrigos Naturais e Acampamento) / PHB p. 153 (Equipamento de Aventura) / XGE p. 78'
    };
  }


  // === calcWildernessSignalSmokeAndFlares (Sinais de Fumaça, Sinalizadores Alquímicos e Visibilidade Regional - DMG p. 112 / PHB p. 150) ===
  function calcWildernessSignalSmokeAndFlares(biomeKey, signalType, weatherCondition, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var st = (signalType || 'white_pine_smoke').toLowerCase();
    var wc = (weatherCondition || 'clear').toLowerCase();

    var baseMiles = 5;
    var signalTitle = 'Sinal de Fumaça Branca Densa (Agulhas de Pinho Úmidas)';
    var meaning = 'Acampamento amigo seguro / Ponto de encontro da comitiva desimpedido.';
    var hostileAttractionRisk = '+10% chance de patrulhas hostis investigarem a coluna de fumaça.';
    var icon = '💨🌲';
    var color = '#e2e8f0';

    if (st === 'black_pitch_smoke') {
      baseMiles = 8;
      signalTitle = 'Sinal de Fumaça Negra Oleosa (Piche e Resina Fóssil)';
      meaning = 'Alerta de perigo extremo / Bando de aventureiros cercado ou emboscada em andamento.';
      hostileAttractionRisk = '+25% de atração de saqueadores, orcs e feras atraídos por tumulto.';
      icon = '🔥⚠️';
      color = '#f87171';
    } else if (st === 'colored_alchemical_smoke') {
      baseMiles = 4;
      signalTitle = 'Fumaça Alquímica Esmeralda / Púrpura (Cobre & Enxofre Cifrado)';
      meaning = 'Código de batedores da guilda / Ponto de extração tática confirmado.';
      hostileAttractionRisk = '+15% de atração de sentinelas ou conjuradores curiosos.';
      icon = '🧪✨';
      color = '#c084fc';
    } else if (st === 'night_alchemist_flare') {
      baseMiles = 10;
      signalTitle = 'Sinalizador Pirotécnico Noturno (Fogo Alquímico / Faerie Fire)';
      meaning = 'Sinalizador celeste de socorro noturno visível em vales e montanhas.';
      hostileAttractionRisk = '+30% de atração de predadores alados em um raio de 10 milhas.';
      icon = '🎆🌙';
      color = '#facc15';
    }

    var visibilityMiles = baseMiles;
    var weatherModifier = 'Céu limpo: visibilidade de horizonte total.';
    if (wc === 'fog' || wc === 'rain' || wc === 'storm') {
      visibilityMiles = Math.max(1, Math.round(baseMiles * 0.4));
      weatherModifier = 'Precipitação ou nevoeiro espesso abafa a dispersão do sinal (alcance reduzido em 60%).';
    } else if (wc === 'wind' || wc === 'strong_wind') {
      visibilityMiles = Math.max(2, Math.round(baseMiles * 0.7));
      weatherModifier = 'Ventos cortantes dispersam a coluna de fumaça lateralmente (alcance reduzido em 30%).';
    }

    return {
      biomeKey: bk,
      signalType: st,
      signalTitle: signalTitle,
      meaning: meaning,
      visibilityMiles: visibilityMiles,
      weatherModifier: weatherModifier,
      hostileAttractionRisk: hostileAttractionRisk,
      icon: icon,
      color: color,
      dndRef: 'DMG p. 112 (Sinais e Fumaça de Acampamento) / PHB p. 150 (Equipamento de Sinalização)'
    };
  }

  // === calcPackAnimalConditioningAndLoad (Condicionamento de Animais de Carga, Carga Máxima e Terreno - PHB p. 155, 157, 161 / DMG p. 111) ===
  function calcPackAnimalConditioningAndLoad(biomeKey, mountType, loadPounds, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var mt = (mountType || 'pack_mule').toLowerCase();
    var load = (typeof loadPounds === 'number') ? loadPounds : 200;

    var animal = {
      animalName: 'Mula de Carga Fiel',
      carryingCapacityLbs: 420,
      baseSpeedFt: 40,
      terrainAdaptation: 'Passo Firme (+5 em testes contra terreno acidentado e cascalho solto de encostas).',
      dailyFeedWater: '1 lb de ração ou 2 horas de pastagem / 3 galões de água por dia.',
      icon: '🫏📦',
      color: '#ca8a04'
    };

    if (mt === 'draft_horse' || bk === 'plains') {
      animal = {
        animalName: 'Cavalo de Tração Robusto',
        carryingCapacityLbs: 540,
        baseSpeedFt: 40,
        terrainAdaptation: 'Força motriz excelente em estradas e planícies; sofre desvantagem em pântanos profundos e fendas rochosas.',
        dailyFeedWater: '2 lbs de aveia ou ração concentrada / 4 galões de água.',
        icon: '🐎🌾',
        color: '#a16207'
      };
    } else if (mt === 'desert_camel' || bk === 'desert' || bk === 'dunas') {
      animal = {
        animalName: 'Dromedário do Deserto',
        carryingCapacityLbs: 480,
        baseSpeedFt: 50,
        terrainAdaptation: 'Reserva biológica de água: suporta até 10 dias sem beber água antes de sofrer exaustão (PHB p. 157); ignora terreno difícil em areia fofa.',
        dailyFeedWater: 'Arbustos secos espinhosos / consumo abundante cíclico a cada 5 a 10 dias.',
        icon: '🐫🏜️',
        color: '#eab308'
      };
    } else if (mt === 'mountain_goat_giant' || bk === 'montanha') {
      animal = {
        animalName: 'Bode Gigante das Montanhas',
        carryingCapacityLbs: 510,
        baseSpeedFt: 40,
        terrainAdaptation: 'Escalador nato: ignora terreno difícil não-mágico de rochedos íngremes, paredões e gelo liso.',
        dailyFeedWater: 'Líquens de penhasco e arbustos alpinos / 2 galões de água de degelo.',
        icon: '🐐⛰️',
        color: '#38bdf8'
      };
    }

    var cap = animal.carryingCapacityLbs;
    var loadStatus = 'Carga Leve (Ágil)';
    var speedModifier = 'Velocidade total preservada (sem atraso na marcha do grupo).';

    if (load > cap * 1.5) {
      loadStatus = 'Sobrecarga Crítica (Heavily Encumbered)';
      speedModifier = 'Velocidade reduzida para 5 pés; desvantagem em testes e salvaguardas físicas.';
    } else if (load > cap) {
      loadStatus = 'Sobrecarga Pesada (Encumbered)';
      speedModifier = 'Velocidade reduzida em 10 pés (-20% no deslocamento diário da comitiva).';
    } else if (load > cap * 0.5) {
      loadStatus = 'Carga Moderada (Capacidade Padrão)';
      speedModifier = 'Ritmo padrão sustentado de 24 milhas/dia sem penalidades.';
    }

    return {
      biomeKey: bk,
      mountType: mt,
      animalName: animal.animalName,
      carryingCapacityLbs: cap,
      currentLoadLbs: load,
      loadStatus: loadStatus,
      speedModifier: speedModifier,
      terrainAdaptation: animal.terrainAdaptation,
      dailyFeedWater: animal.dailyFeedWater,
      icon: animal.icon,
      color: animal.color,
      dndRef: 'PHB p. 157, 161 (Animais de Carga e Tração) / DMG p. 111 (Marcha com Animais)'
    };
  }


  // === calcRockfallAndLandslideHazard (Desmoronamento, Queda de Rochas e Soterramento em Montanhas - DMG p. 110-111 / PHB p. 183) ===
  function calcRockfallAndLandslideHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'montanha').toLowerCase();
    var ht = (hazardType || 'loose_scree_slip').toLowerCase();

    var hazard = {
      hazardTitle: 'Cascalho Solto em Encosta Íngreme (Scree Slip)',
      saveDC: 12,
      saveType: 'Destreza (Acrobacia)',
      damageOrBurial: 'Deslize de 30 pés; 1d6 de dano contundente e atraso de 1 hora para os batedores subirem novamente.',
      excavationEffort: 'Sem soterramento de corpos; apenas recuperação de alforjes soltos.',
      mitigation: 'Corda com pítons ou cajado de caminhada concede vantagem na salvaguarda.',
      icon: '🪨⚠️',
      color: '#facc15'
    };

    if (ht === 'flash_rockfall') {
      hazard = {
        hazardTitle: 'Queda Repentina de Pedregulhos & Fragmentação',
        saveDC: 14,
        saveType: 'Destreza',
        damageOrBurial: '3d6 de dano de concussão e condição Caído (Prone); metade do dano com sucesso na salvaguarda.',
        excavationEffort: '1d4 minutos para desvencilhar membros do grupo sob pedras soltas.',
        mitigation: 'Sentinela com Percepção Passiva 14+ ouve estalos prévios na crista, permitindo abrigo sob saliências.',
        icon: '🪨💥',
        color: '#f87171'
      };
    } else if (ht === 'massive_landslide' || bk === 'montanha') {
      hazard = {
        hazardTitle: 'Desmoronamento Maciço de Encosta (DMG p. 110)',
        saveDC: 15,
        saveType: 'Força (Atletismo) ou Destreza (Acrobacia)',
        damageOrBurial: '4d6 de dano contundente e soterramento sob 1d4 pés de entulho (regras de Sufocamento - PHB p. 183).',
        excavationEffort: 'Exige 1d4 horas de escavação manual contínua; pás e picaretas reduzem o tempo pela metade.',
        mitigation: 'Evitar encostas de terra saturada por chuvas recentes ou contornar por cristas rochosas maciças.',
        icon: '⛰️🚨',
        color: '#ef4444'
      };
    } else if (ht === 'subterranean_cave_in') {
      hazard = {
        hazardTitle: 'Colapso de Teto Subterrâneo ou Fenda de Túnel',
        saveDC: 15,
        saveType: 'Destreza',
        damageOrBurial: '4d6 de dano de impacto e trilha bloqueada por toneladas de rocha desabada.',
        excavationEffort: '2d4 horas de escavação com picareta de minerador para reabrir passagem transitável.',
        mitigation: 'Conhecimento da Pedra (Stonecunning) anão ou kit de pedreiro identifica fraturas de abóbada antecipadamente.',
        icon: '⛏️🕳️',
        color: '#a855f7'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      damageOrBurial: hazard.damageOrBurial,
      excavationEffort: hazard.excavationEffort,
      mitigation: hazard.mitigation,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110-111 (Desmoronamentos e Queda de Pedras) / PHB p. 183 (Sufocamento)'
    };
  }

  // === calcCampfireFuelAndHeatConservation (Combustível de Acampamento, Lenha Seca e Conservação Térmica contra Frio Extremo - DMG p. 110 / PHB p. 150, 185) ===
  function calcCampfireFuelAndHeatConservation(biomeKey, fuelType, weatherCondition, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var ft = (fuelType || 'dry_hardwood').toLowerCase();
    var wc = (weatherCondition || 'clear').toLowerCase();

    var fuel = {
      fuelName: 'Lenha de Madeira Nobre Seca (Carvalho / Faia)',
      burnDurationHours: 6,
      thermalProtection: 'Calor radiante elevado e brasas duradouras; mantém a temperatura do acampamento estável.',
      smokeVisibility: 'Fumaça fina e cinzenta; visibilidade de até 2 milhas durante a queima noturna.',
      coldSaveBonus: '+2 nas Salvaguardas de Constituição contra frio extremo (DMG p. 110).',
      icon: '🪵🔥',
      color: '#f97316'
    };

    if (ft === 'damp_peat_moss' || bk === 'swamp') {
      fuel = {
        fuelName: 'Tijolos de Turfa e Musgo de Pântano Seco',
        burnDurationHours: 4,
        thermalProtection: 'Calor brando e constante; suficiente para secar vestimentas e ferver caldeirões.',
        smokeVisibility: 'Fumaça negra densa e acre; perceptível a até 5 milhas a favor do vento pelos batedores.',
        coldSaveBonus: '+1 nas Salvaguardas de Constituição contra hipotermia.',
        icon: '🧱💨',
        color: '#84cc16'
      };
    } else if (ft === 'scrub_brush_thorns' || bk === 'desert' || bk === 'dunas') {
      fuel = {
        fuelName: 'Gravetos de Arbustos Secos & Raízes Espinhosas',
        burnDurationHours: 2,
        thermalProtection: 'Chama viva e rápida mas de baixa durabilidade; requer alimentação constante a cada vigília da comitiva.',
        smokeVisibility: 'Fagulhas esparsas com fumaça esbranquiçada que se dissipa rapidamente no ar árido.',
        coldSaveBonus: '+0 (calor insuficiente sem cobertores de lã pesada).',
        icon: '🌿✨',
        color: '#eab308'
      };
    } else if (ft === 'alchemical_fire_coal') {
      fuel = {
        fuelName: 'Carvão Alquímico Tratado (Pedra Sulfúrica Incandescente)',
        burnDurationHours: 8,
        thermalProtection: 'Calor concentrado supremo; queima com fulgor estável mesmo sob vendavais e chuva torrencial.',
        smokeVisibility: 'Sem fumaça visível (zero colunas); perfeito para acampamentos furtivos em território hostil.',
        coldSaveBonus: '+4 nas Salvaguardas de Constituição; imunidade ao frio não-mágico moderado.',
        icon: '☄️🛡️',
        color: '#38bdf8'
      };
    }

    var shelterNotes = 'Trajes normais de viagem.';
    if (options.hasColdWeatherGear) {
      shelterNotes = 'Roupas de Inverno Acolchoadas (PHB p. 150) concedem sucesso automático contra frio moderado.';
    }
    if (options.hasWindbreakWall) {
      shelterNotes += ' Anteparo de pedras/troncos dobra o raio de calor refletido nos sacos de dormir.';
    }

    return {
      biomeKey: bk,
      fuelType: ft,
      fuelName: fuel.fuelName,
      burnDurationHours: fuel.burnDurationHours,
      thermalProtection: fuel.thermalProtection,
      smokeVisibility: fuel.smokeVisibility,
      coldSaveBonus: fuel.coldSaveBonus,
      shelterNotes: shelterNotes,
      icon: fuel.icon,
      color: fuel.color,
      dndRef: 'DMG p. 110 (Frio Extremo e Hipotermia) / PHB p. 150 (Equipamento de Inverno e Fogo)'
    };
  }


  // === calcRiverFordingAndRopeBridgeHazard (Travessia de Rios, Vadeamento e Cabos de Segurança - DMG p. 111 / PHB p. 182-183) ===
  function calcRiverFordingAndRopeBridgeHazard(biomeKey, crossingType, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var ct = (crossingType || 'shallow_gravel_ford').toLowerCase();

    var crossing = {
      crossingTitle: 'Vau de Cascalho Raso (Água até os Tornozelos)',
      athleticsDC: 10,
      currentHazard: 'Correnteza suave; opera como terreno difícil que consome metade do deslocamento ao atravessar.',
      ropeSafetyMitigation: 'Passagem desimpedida a pé; montarias e carroças cruzam sem risco de afogamento.',
      icon: '🌊🚶',
      color: '#38bdf8'
    };

    if (ct === 'rushing_mountain_rapids') {
      crossing = {
        crossingTitle: 'Corredeiras Glaciais Rápidas & Pedras Escorregadias',
        athleticsDC: 14,
        currentHazard: 'Correnteza violenta de degelo; falha no teste arrasta o aventureiro por 30 pés a jusante e inflige 1d6 dano de impacto.',
        ropeSafetyMitigation: 'Cabo guia de segurança ancorado por batedor de Força elevada concede vantagem no teste e impede arrasto pela correnteza.',
        icon: '🌊💥',
        color: '#0284c7'
      };
    } else if (ct === 'swollen_flood_river' || bk === 'swamp') {
      crossing = {
        crossingTitle: 'Rio Enchente Turbulentíssimo (DMG p. 111 / PHB p. 182)',
        athleticsDC: 16,
        currentHazard: 'Águas profundas e redemoinhos; nadar contra a correnteza exige teste a cada turno sob risco de afogamento (PHB p. 182).',
        ropeSafetyMitigation: 'Montagem de balsa improvisada ou travessia ancorada com cabos duplos de 15 metros entre árvores firmes.',
        icon: '🌊🚨',
        color: '#ef4444'
      };
    } else if (ct === 'chasm_rope_bridge_crossing' || bk === 'montanha') {
      crossing = {
        crossingTitle: 'Ponte Pênsil de Corda sobre Desfiladeiro',
        athleticsDC: 13,
        currentHazard: 'Oscilação severa ao vento sobre abismo de 100 pés; tábuas podres e risco de queda com sobrecarga.',
        ropeSafetyMitigation: 'Arnês com mosquetão preso ao cabo superior; impede queda fatal dos membros da comitiva em caso de tropeço.',
        icon: '🌉⛰️',
        color: '#f59e0b'
      };
    }

    return {
      biomeKey: bk,
      crossingType: ct,
      crossingTitle: crossing.crossingTitle,
      athleticsDC: crossing.athleticsDC,
      currentHazard: crossing.currentHazard,
      ropeSafetyMitigation: crossing.ropeSafetyMitigation,
      icon: crossing.icon,
      color: crossing.color,
      dndRef: 'DMG p. 111 (Travessia de Águas e Corredeiras) / PHB p. 182 (Natação e Terreno Difícil)'
    };
  }

  // === calcCampFortificationAndPerimeterDefense (Fortificações de Acampamento, Abrolhos e Armadilhas de Perímetro - PHB p. 150-151 / DMG p. 112) ===
  function calcCampFortificationAndPerimeterDefense(biomeKey, defenseType, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var dt = (defenseType || 'caltrop_and_ball_bearing_field').toLowerCase();

    var defense = {
      defenseTitle: 'Campo de Abrolhos e Esferas de Metal (PHB p. 150-151)',
      tacticalEffect: 'Invasores devem superar Salvaguarda de Destreza CD 15 ou sofrer 1 ponto de dano perfurante e ter sua velocidade reduzida em 10 pés.',
      detectionDC: 15,
      ambushSuppression: 'Inutiliza investidas rápidas frontais de saqueadores noturnos e feras na trilha principal de acesso.',
      icon: '⚙️🛑',
      color: '#94a3b8'
    };

    if (dt === 'sharpened_stake_barricade') {
      defense = {
        defenseTitle: 'Paliçada de Estacas Pontiagudas & Troncos Entrançados',
        tacticalEffect: 'Concede meio-abrigo (+2 na CA e testes de Destreza) contra ataques à distância e inflige 2d6 de dano perfurante em monstros que investirem contra as pontas.',
        detectionDC: 10,
        ambushSuppression: 'Bloqueia investidas de montarias e criaturas de porte Grande ao redor dos sacos de dormir da comitiva.',
        icon: '🪵🛡️',
        color: '#d97706'
      };
    } else if (dt === 'bell_and_string_tripwire') {
      defense = {
        defenseTitle: 'Fio de Desarme com Guizos de Latão e Conchas (PHB p. 152)',
        tacticalEffect: 'Disparo acústico ecoa a até 60 pés ao redor; acorda instantaneamente todos os membros adormecidos do grupo.',
        detectionDC: 14,
        ambushSuppression: 'Impossibilita ataques de surpresa noturnos pelo perímetro protegido.',
        icon: '🔔✨',
        color: '#eab308'
      };
    } else if (dt === 'trench_and_earthen_berm') {
      defense = {
        defenseTitle: 'Vala de Drenagem e Talude de Terra Escavada',
        tacticalEffect: 'Protege o centro do acampamento contra enxurradas repentinas e força invasores a subirem em terreno difícil.',
        detectionDC: 12,
        ambushSuppression: 'Invasores perdem metade do deslocamento para ultrapassar o fosso perimetral.',
        icon: '⛏️🧱',
        color: '#78716c'
      };
    }

    return {
      biomeKey: bk,
      defenseType: dt,
      defenseTitle: defense.defenseTitle,
      tacticalEffect: defense.tacticalEffect,
      detectionDC: defense.detectionDC,
      ambushSuppression: defense.ambushSuppression,
      icon: defense.icon,
      color: defense.color,
      dndRef: 'PHB p. 150-151 (Equipamento de Aventura: Abrolhos e Armadilhas) / DMG p. 112 (Acampamento em Território Hostil)'
    };
  }


  // === calcAvalancheAndGlacialCrevasseHazard (Avalanches de Neve, Fendas Glaciais e Soterramento - DMG p. 110 / RotF p. 10-11) ===
  function calcAvalancheAndGlacialCrevasseHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'montanha').toLowerCase();
    var ht = (hazardType || 'powder_snow_avalanche').toLowerCase();

    var hazard = {
      hazardTitle: 'Avalanche de Neve em Pó & Soterramento (DMG p. 110)',
      saveDC: 15,
      saveType: 'Força (Atletismo) ou Destreza (Acrobacia)',
      burialDepthFeet: '1d4 x 5 pés de neve compactada',
      warningRounds: 'Estrondo ouvido 1d10 rodadas antes do impacto (Percepção Passiva 10+).',
      rescueMitigation: 'Membros da comitiva soterrados têm minutos de ar = 1 + Mod. Constituição (mínimo 30 seg); cordão de avalanche colorido permite localização com Sobrevivência CD 10.',
      icon: '❄️🏔️',
      color: '#38bdf8'
    };

    if (ht === 'whiteout_blizzard') {
      hazard = {
        hazardTitle: 'Nevasca Branca Total (Visibilidade Nula & Frio Severo)',
        saveDC: 14,
        saveType: 'Constituição',
        burialDepthFeet: 'Sem soterramento direto; neve acumulada de 2 pés por hora.',
        warningRounds: 'Nuvens de chumbo vistas no horizonte 1 hora antes.',
        rescueMitigation: 'Deslocamento reduzido à metade; óculos de neve de osso ou proteção facial previnem cegueira temporária.',
        icon: '🌨️🌬️',
        color: '#7dd3fc'
      };
    } else if (ht === 'crevasse_snow_bridge' || bk === 'montanha') {
      hazard = {
        hazardTitle: 'Ponte de Neve Frágil sobre Fenda Glacial Profunda',
        saveDC: 15,
        saveType: 'Destreza',
        burialDepthFeet: 'Queda em fenda de 1d6 x 10 pés de profundidade',
        warningRounds: 'Vara de sondagem de 3 metros detecta oco na neve com Investigação CD 13.',
        rescueMitigation: 'Corda de segurança ancorada entre os aventureiros em cordada impede a queda no fundo do abismo de gelo.',
        icon: '🧊🕳️',
        color: '#0284c7'
      };
    } else if (ht === 'ice_shelf_calving') {
      hazard = {
        hazardTitle: 'Ruptura Repentina de Placa de Gelo Glacial',
        saveDC: 14,
        saveType: 'Destreza (Acrobacia)',
        burialDepthFeet: 'Blocos de gelo caídos de 20 pés de altura',
        warningRounds: 'Estalos secos e ecoantes ouvidos 2 rodadas antes.',
        rescueMitigation: 'Uso de grampos de escalada (crampons) e machado de gelo para fixação rápida em rocha sólida.',
        icon: '⛏️🧊',
        color: '#60a5fa'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      burialDepthFeet: hazard.burialDepthFeet,
      warningRounds: hazard.warningRounds,
      rescueMitigation: hazard.rescueMitigation,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110 (Perigos de Clima Severo e Avalanches) / PHB p. 183 (Sufocamento)'
    };
  }

  // === calcCampSanitizationAndPestRepellent (Higienização de Acampamento, Cinzas de Madeira e Repelente de Pragas - PHB p. 154 / XGE p. 78-79) ===
  function calcCampSanitizationAndPestRepellent(biomeKey, sanitizationType, options) {
    options = options || {};
    var bk = (biomeKey || 'swamp').toLowerCase();
    var st = (sanitizationType || 'herbal_smoke_fumigation').toLowerCase();

    var sanit = {
      sanitizationTitle: 'Fumigação com Ervas Secas (Sálvia, Zimbro e Artemísia)',
      diseaseResistanceBonus: '+2 nas Salvaguardas de Constituição contra febres do pântano e miasmas durante o descanso.',
      pestRepellentEffect: 'Fumaça aromática afasta mosquitos transmissores, mutucas e moscas de cadáver num raio de 40 pés.',
      restOptimization: 'Evita interrupções de sono por coceiras e picadas; recupera +1 PV adicional por Dado de Vida gasto em descansos curtos.',
      icon: '🌿💨',
      color: '#4ade80'
    };

    if (st === 'wood_ash_and_lime_spread') {
      sanit = {
        sanitizationTitle: 'Barreira de Cinzas de Fogueira e Cal Apagada',
        diseaseResistanceBonus: '+1 nas Salvaguardas contra infecções de feridas abertas.',
        pestRepellentEffect: 'Desidrata e repele sanguessugas, vermes da podridão, lesmas gigantes e centopeias rastejantes.',
        restOptimization: 'Garante que os sacos de dormir permaneçam livres de parasitas necrófagos durante a vigília.',
        icon: '🪵⚪',
        color: '#e2e8f0'
      };
    } else if (st === 'salt_and_brine_leech_rinse') {
      sanit = {
        sanitizationTitle: 'Banho de Salmoura Antisséptica para Botas e Pernas',
        diseaseResistanceBonus: 'Remove imediatamente qualquer sanguessuga aderida sem causar dano ou perda de sangue.',
        pestRepellentEffect: 'Neutraliza ovos de parasitas microscópicos de águas estagnadas antes que penetrem na pele.',
        restOptimization: 'Elimina a condição de irritação cutânea e restaura o ânimo dos membros da comitiva para o dia seguinte.',
        icon: '🧂💧',
        color: '#38bdf8'
      };
    } else if (st === 'sacred_water_consecration') {
      sanit = {
        sanitizationTitle: 'Aspersão de Água Benta Consagrada (PHB p. 151)',
        diseaseResistanceBonus: 'Imunidade a contaminações necróticas sobrenaturais e maldições menores de solo corrompido.',
        pestRepellentEffect: 'Mortos-vivos menores (esqueletos, zumbis rastejantes) evitam entrar na área consagrada de 30 pés.',
        restOptimization: 'Sono calmo e restaurador protegido por bênção divina; alivia pesadelos e estresse de viagem.',
        icon: '✨🕊️',
        color: '#facc15'
      };
    }

    return {
      biomeKey: bk,
      sanitizationType: st,
      sanitizationTitle: sanit.sanitizationTitle,
      diseaseResistanceBonus: sanit.diseaseResistanceBonus,
      pestRepellentEffect: sanit.pestRepellentEffect,
      restOptimization: sanit.restOptimization,
      icon: sanit.icon,
      color: sanit.color,
      dndRef: 'PHB p. 154 (Kits de Herbalismo e Medicina) / XGE p. 78-79 (Descanso e Cuidados nos Ermos) / DMG p. 111'
    };
  }


  // === calcSandstormAndAridHeatHazard (Tempestades de Areia, Haboob e Calor Extremo do Deserto - DMG p. 110, 112 / PHB p. 185) ===
  function calcSandstormAndAridHeatHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'desert').toLowerCase();
    var ht = (hazardType || 'whistling_haboob_sandstorm').toLowerCase();

    var hazard = {
      hazardTitle: 'Tempestade de Areia Haboob & Redemoinhos Cegantes (DMG p. 110)',
      saveDC: 15,
      saveType: 'Constituição',
      visibilityPenalty: 'Visibilidade reduzida a 5 pés (escuridão pesada); fogo de tochas extinto imediatamente.',
      abrasiveDamageOrBlindness: '1d4 de dano cortante abrasivo a cada 10 minutos sem proteção facial; desvantagem em testes visuais de Percepção.',
      hydrationDemand: 'Exige 2 galões de água por dia por aventureiro; marcha noturna reduz a demanda para 1 galão.',
      survivalAdvice: 'Ajoelhar-se junto aos camelos com mantas grossas estendidas e esperar a passagem da coluna de areia.',
      icon: '🌪️🏜️',
      color: '#f59e0b'
    };

    if (ht === 'superheated_dune_glare') {
      hazard = {
        hazardTitle: 'Ofuscamento Solar Extremo nas Dunas de Quartzo Branco',
        saveDC: 12,
        saveType: 'Constituição',
        visibilityPenalty: 'Reflexo solar cegante; desvantagem em ataques à distância e testes de Percepção.',
        abrasiveDamageOrBlindness: 'Falha causa cegueira temporária por 1d4 horas; mitigado por lenços kaffiyeh ou carvão sob as pálpebras.',
        hydrationDemand: 'Consumo contínuo de água; perda rápida de eletrólitos corporais.',
        survivalAdvice: 'Evitar caminhar entre 11h e 15h; adotar marcha no crepúsculo e sob luar.',
        icon: '☀️🔥',
        color: '#facc15'
      };
    } else if (ht === 'salt_crust_collapse') {
      hazard = {
        hazardTitle: 'Ruptura de Crosta de Sal sobre Lamaçal Cáustico',
        saveDC: 13,
        saveType: 'Destreza',
        visibilityPenalty: 'Solo aparentemente firme; impossível distinguir armadilha natural sem vara de sondagem.',
        abrasiveDamageOrBlindness: '2d6 de dano ácido por salmoura cáustica e botas de couro danificadas.',
        hydrationDemand: 'Água imprópria ao redor; risco de sede se os cantis forem danificados.',
        survivalAdvice: 'Batedores leves à frente amarrados em corda de segurança para testar o solo.',
        icon: '🧂⚠️',
        color: '#e2e8f0'
      };
    } else if (ht === 'extreme_solar_exhaustion' || bk === 'desert' || bk === 'dunas') {
      hazard = {
        hazardTitle: 'Onda de Calor Tórrido Acima de 40°C (DMG p. 110)',
        saveDC: 10,
        saveType: 'Constituição (+1 por hora adicional de marcha sem sombra)',
        visibilityPenalty: 'Miragens térmicas e distorções visuais no horizonte a mais de 60 pés.',
        abrasiveDamageOrBlindness: 'Falha acarreta 1 nível de exaustão acumulativa (armaduras médias e pesadas impõem desvantagem no teste).',
        hydrationDemand: 'Consumo obrigatório de 2 galões/dia; sem água a exaustão é automática sem teste de salvaguarda (PHB p. 185).',
        survivalAdvice: 'Montar tenda de lona suspensa durante o zênite solar e avançar exclusivamente em marcha noturna.',
        icon: '🌡️💀',
        color: '#ef4444'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      visibilityPenalty: hazard.visibilityPenalty,
      abrasiveDamageOrBlindness: hazard.abrasiveDamageOrBlindness,
      hydrationDemand: hazard.hydrationDemand,
      survivalAdvice: hazard.survivalAdvice,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110 (Calor Extremo e Tempestades de Areia) / PHB p. 185 (Consumo de Água nos Ermos)'
    };
  }

  // === calcWildernessAcousticSignalHorn (Trompas de Sinalização, Apitos de Caça e Comunicação Acústica - PHB p. 154 / DMG p. 105) ===
  function calcWildernessAcousticSignalHorn(biomeKey, hornType, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var ht = (hornType || 'brass_rally_horn').toLowerCase();

    var horn = {
      hornTitle: 'Trompa de Latão de Reagrupamento (PHB p. 154)',
      audibleRangeMiles: 2.0,
      tacticalMeaning: 'Reunião imediata da comitiva / Retorno urgente dos batedores ao acampamento.',
      stealthDisguise: 'Som metálico estrondoso artificial; +20% chance de alertar patrulhas inimigas na região.',
      tacticalBenefit: 'Batedores dispersos recebem o chamado e podem convergir em linha reta sem se perderem.',
      icon: '📯🛡️',
      color: '#f59e0b'
    };

    if (ht === 'bone_predator_whistle') {
      horn = {
        hornTitle: 'Apito Agudo de Osso de Caçador (Ultra-agudo)',
        audibleRangeMiles: 1.0,
        tacticalMeaning: 'Sinal de emboscada silenciosa / Comando para montarias e cães de guarda atacarem.',
        stealthDisguise: 'Inaudível para humanoides a mais de 300 pés; passa despercebido em matas fechadas.',
        tacticalBenefit: 'Permite coordenar pinças e flanqueamentos táticos sem revelar a posição dos batedores.',
        icon: '🦴🎯',
        color: '#94a3b8'
      };
    } else if (ht === 'iron_gong_or_war_drum' || bk === 'montanha') {
      horn = {
        hornTitle: 'Gongo de Ferro / Tambor de Guerra de Sentinela (DMG p. 105)',
        audibleRangeMiles: 3.0,
        tacticalMeaning: 'Alarme geral de invasão de acampamento / Chamado de reforço de vigílias.',
        stealthDisguise: 'Ressonância profunda que ecoa em desfiladeiros e vales por várias milhas.',
        tacticalBenefit: 'Acorda todos os companheiros em repouso no acampamento e desorienta invasores na rodada inicial.',
        icon: '🥁⚔️',
        color: '#dc2626'
      };
    } else if (ht === 'coded_birdcall_whistle') {
      horn = {
        hornTitle: 'Apito de Palheta de Pássaro Cifrado (Coruja / Falcão)',
        audibleRangeMiles: 0.2,
        tacticalMeaning: 'Mensagem cifrada pré-combinada entre patrulheiros ("Área limpa", "Inimigos à vista").',
        stealthDisguise: 'Sons idênticos à fauna local; exige teste de Sabedoria (Intuição) CD 15 para detectar artifício.',
        tacticalBenefit: 'Comunicação tática invisível sem elevar o risco de encontros hostis errantes.',
        icon: '🦉🎶',
        color: '#4ade80'
      };
    }

    return {
      biomeKey: bk,
      hornType: ht,
      hornTitle: horn.hornTitle,
      audibleRangeMiles: horn.audibleRangeMiles,
      tacticalMeaning: horn.tacticalMeaning,
      stealthDisguise: horn.stealthDisguise,
      tacticalBenefit: horn.tacticalBenefit,
      icon: horn.icon,
      color: horn.color,
      dndRef: 'PHB p. 154 (Instrumentos e Ferramentas) / DMG p. 105 (Alcance de Som e Ecos nos Ermos) / XGE p. 78'
    };
  }


  // === calcKarstSinkholeAndCavernHazard (Sumidouros Cársicos, Fissuras e Estalactites - DMG p. 110-111 / OotA p. 24) ===
  function calcKarstSinkholeAndCavernHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'colina').toLowerCase();
    var ht = (hazardType || 'concealed_karst_sinkhole').toLowerCase();

    var hazard = {
      hazardTitle: 'Sumidouro Cársico Camuflado por Raízes e Gramíneas',
      saveDC: 14,
      saveType: 'Destreza',
      depthAndImpact: 'Queda de 30 pés em cavidade cilíndrica; 3d6 de dano de impacto e aterrissagem em lodo úmido.',
      pioneerMitigation: 'Batedor utilizando vara de sondagem de 3 metros detecta a crosta oca antecipadamente sem risco de queda.',
      rescueDetails: 'Exige corda de 15 metros ancorada em rocha firme para içar o companheiro acidentado.',
      icon: '🕳️🌿',
      color: '#ca8a04'
    };

    if (ht === 'limestone_stalactite_fall') {
      hazard = {
        hazardTitle: 'Queda de Lanças de Estalactites Calcificadas',
        saveDC: 15,
        saveType: 'Destreza',
        depthAndImpact: '3d10 de dano perfurante por estalactites pontiagudas desprendidas do teto em fendas.',
        pioneerMitigation: 'Evitar ruídos sonoros estrondosos, trompas de guerra ou magias trovejantes sob tetos calcários instáveis.',
        rescueDetails: 'Primeiros socorros rápidos com Kit de Curativo (PHB p. 151) estancam perfurações de calcário.',
        icon: '🗡️🪨',
        color: '#f87171'
      };
    } else if (ht === 'chasm_sulfur_fissure' || bk === 'volcanic' || bk === 'vulcao') {
      hazard = {
        hazardTitle: 'Fissura Vulcânica Cársica com Gás Sulfídrico',
        saveDC: 13,
        saveType: 'Constituição',
        depthAndImpact: 'Condição Envenenado e 1d6 de dano de veneno por minuto de exposição continuada em depressões.',
        pioneerMitigation: 'Lenço umedecido sobre o nariz e boca concede vantagem na salvaguarda contra os vapores.',
        rescueDetails: 'Transportar a vítima imediatamente para áreas abertas ventiladas por correntes de ar puro.',
        icon: '🌋☠️',
        color: '#ef4444'
      };
    } else if (ht === 'subterranean_siphon_flushing') {
      hazard = {
        hazardTitle: 'Sifão Hidráulico Cársico em Enxurrada Repentina',
        saveDC: 15,
        saveType: 'Força (Atletismo)',
        depthAndImpact: 'Arrasto violento para galeria subterrânea alagada; risco de afogamento contínuo (PHB p. 182).',
        pioneerMitigation: 'Evitar acampar ou cruzar o fundo de dolinas secas durante tempestades repentinas nas cabeceiras.',
        rescueDetails: 'Cabo de segurança preso entre os aventureiros em cordada impede a sucção para o sifão.',
        icon: '🌊🕳️',
        color: '#0284c7'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      depthAndImpact: hazard.depthAndImpact,
      pioneerMitigation: hazard.pioneerMitigation,
      rescueDetails: hazard.rescueDetails,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110-111 (Abismos, Cavernas e Sumidouros) / PHB p. 182-183 (Queda e Sufocamento)'
    };
  }

  // === calcCampScentConcealmentAndWasteDisposal (Camuflagem de Odores de Acampamento, Valas Sanitárias e Descarte - DMG p. 111-112 / XGE p. 78) ===
  function calcCampScentConcealmentAndWasteDisposal(biomeKey, disposalMethod, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var dm = (disposalMethod || 'deep_earthen_latrine_burial').toLowerCase();

    var method = {
      methodTitle: 'Vala Sanitária Profunda Selada com Cal e Terra Fofa',
      scentSuppressionRange: 'Odor suprimido em 80%; reduz o rastro olfativo a um raio contido de apenas 30 pés.',
      predatorDeterrence: 'Predadores carnívoros e carniceiros não conseguem farejar os dejetos a favor do vento.',
      rationProtection: 'Protege os arredores dos sacos de dormir contra infestações de moscas de carne e besouros.',
      icon: '⛏️🌱',
      color: '#65a30d'
    };

    if (dm === 'charcoal_and_herb_pit') {
      method = {
        methodTitle: 'Cremação de Ossos e Restos de Refeição em Carvão com Ervas',
        scentSuppressionRange: 'Odor de gordura e sangue incinerado; substitui cheiro de carne por aroma de folhas queimadas.',
        predatorDeterrence: 'Evita que alcateias de lobos, ursos-coruja e carniçais rastreiem o grupo a milhas de distância.',
        rationProtection: 'Elimina sobras orgânicas expostas que atrairiam enxames rastejantes durante o sono da comitiva.',
        icon: '🔥🌿',
        color: '#f59e0b'
      };
    } else if (dm === 'predator_musk_perimeter_marking') {
      method = {
        methodTitle: 'Marcação Territorial Periférica com Almíscar de Predador Alfa',
        scentSuppressionRange: 'Cria barreira olfativa de feromônios animais pungentes ao longo da borda da mata.',
        predatorDeterrence: 'Feras comuns e predadores menores hesitam em invadir; impõe desvantagem em testes de moral animal.',
        rationProtection: 'Cavalos e mulas de carga permanecem calmos sabendo que o perímetro está resguardado.',
        icon: '🐾🛡️',
        color: '#eab308'
      };
    } else if (dm === 'clean_campsite_cache') {
      method = {
        methodTitle: 'Bolsa de Provisões Suspensa em Copa Alta (Bear Bag Technique)',
        scentSuppressionRange: 'Rações seladas em lona encerada e içadas a 5 metros do solo por galho resistente.',
        predatorDeterrence: 'Totalmente inacessível para predadores terrestres sem escalada e roedores rastejantes.',
        rationProtection: 'Segurança absoluta contra perda de comida por animais noturnos ou insetos carniceiros.',
        icon: '🪢🍖',
        color: '#38bdf8'
      };
    }

    return {
      biomeKey: bk,
      disposalMethod: dm,
      methodTitle: method.methodTitle,
      scentSuppressionRange: method.scentSuppressionRange,
      predatorDeterrence: method.predatorDeterrence,
      rationProtection: method.rationProtection,
      icon: method.icon,
      color: method.color,
      dndRef: 'DMG p. 111-112 (Acampamento Seguro e Odores) / PHB p. 150 (Mochilas e Alforjes) / XGE p. 78'
    };
  }

  // === calcWildernessFungalSporeAndYellowMoldHazard (Fungos Venenosos, Mofo Amarelo e Esporos nos Ermos - DMG p. 105 / OotA p. 23) ===
  function calcWildernessFungalSporeAndYellowMoldHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var ht = (hazardType || 'yellow_mold_colony').toLowerCase();

    var hazard = {
      hazardTitle: 'Colônia Traiçoeira de Mofo Amarelo em Troncos Úmidos',
      saveDC: 15,
      saveType: 'Constituição',
      sporeImpactAndDamage: 'Nuvem asfixiante de 10 pés; 2d10 de dano de veneno e condição Envenenado por 1 minuto (1d10 de veneno extra por turno).',
      pioneerMitigation: 'Destruir a colônia a distância com tochas ou magias ígneas; luz solar direta ou fogo limpam os esporos instantaneamente.',
      treatmentDetails: 'Magias como Purificar Alimentos ou Restauração Menor neutralizam os esporos e removem a condição Envenenado.',
      icon: '🍄☠️',
      color: '#eab308'
    };

    if (ht === 'hallucinogenic_timmask_puffballs') {
      hazard = {
        hazardTitle: 'Esporos Alucinógenos de Fungos Timmask do Brejo',
        saveDC: 13,
        saveType: 'Sabedoria',
        sporeImpactAndDamage: 'Condição Envenenado e estado de Confusão sensorial por 1 hora; o membro da comitiva se move em direções aleatórias.',
        pioneerMitigation: 'Batedor com máscara de pano embebida em vinagre ou óleo aromático possui vantagem na salvaguarda contra inalação.',
        rescueDetails: 'Manter o companheiro amarrado a uma corda guia curta até que as alucinações se dissipem completamente.',
        icon: '🍄🌀',
        color: '#c084fc'
      };
    } else if (ht === 'quagmire_suffocating_puffball' || bk === 'swamp' || bk === 'pantano') {
      hazard = {
        hazardTitle: 'Bolsas de Esporos Asfixiantes de Turfeira Negra',
        saveDC: 14,
        saveType: 'Constituição',
        sporeImpactAndDamage: 'Tosse sufocante incontrolável; condição Incapacitado por 1 rodada e deslocamento reduzido pela metade por 10 minutos.',
        pioneerMitigation: 'Caminhar com cautela ao redor de depressões lamacentas com cobertura fúngica musgosa visível.',
        treatmentDetails: 'Água fresca em abundância para gargarejo e ar puro removem a tosse persistente.',
        icon: '🌫️🕳️',
        color: '#a3e635'
      };
    } else if (ht === 'cavern_bioluminescent_acid_caps') {
      hazard = {
        hazardTitle: 'Cogumelos Ácidos Cáusticos de Subterrâneo',
        saveDC: 14,
        saveType: 'Destreza',
        sporeImpactAndDamage: 'Jato de seiva fúngica corrosiva em cone de 15 pés; 3d6 de dano de ácido e corrosão de tiras de couro.',
        pioneerMitigation: 'Disparar flechas em alvos brilhantes antes da aproximação do grupo detona as cápsulas de forma segura.',
        treatmentDetails: 'Lavar a pele com água com cal ou terra alcalina neutraliza a queimação ácida.',
        icon: '✨🧪',
        color: '#38bdf8'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      sporeImpactAndDamage: hazard.sporeImpactAndDamage,
      pioneerMitigation: hazard.pioneerMitigation,
      treatmentDetails: hazard.treatmentDetails || hazard.rescueDetails,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 105 (Mofo Amarelo e Fungos Perigosos) / PHB p. 182-183 (Condições de Envenenamento e Asfixia)'
    };
  }

  // === calcCampGroundInsulationAndSleepingPlatform (Estrados Suspensos, Esteiras de Casca e Isolamento Térmico do Solo - DMG p. 111 / XGE p. 78) ===
  function calcCampGroundInsulationAndSleepingPlatform(biomeKey, platformType, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var pt = (platformType || 'raised_bough_sleeping_platform').toLowerCase();

    var platform = {
      platformTitle: 'Estrado Elevado de Varas Trançadas sobre Forquilhas',
      thermalInsulation: 'Elevação de 25 cm do solo; bloqueia 85% da perda térmica corporal por condução com a terra gelada.',
      moistureProtection: 'Totalmente imune a poças d água superficiais formadas por orvalho noturno ou chuvas passageiras.',
      comfortAndExhaustionRecovery: 'Garante descanso profundo ininterrupto; aventureiros recuperam Dados de Vida com +1 PV adicional.',
      icon: '🪵🛏️',
      color: '#ca8a04'
    };

    if (pt === 'waterproof_bark_slat_mat') {
      platform = {
        platformTitle: 'Esteira de Casca de Bétula Impermeabilizada com Resina',
        thermalInsulation: 'Barreira impermeável flexível entre o manto de lã e o solo pedregoso ou arenoso.',
        moistureProtection: 'Bloqueia infiltração de umidade capilar do subsolo úmido ou neve compactada.',
        comfortAndExhaustionRecovery: 'Impede que os sacos de dormir amanheçam ensopados; previne exaustão por calafrios matinais.',
        icon: '🛶🌿',
        color: '#84cc16'
      };
    } else if (pt === 'pine_needle_thermal_mattress') {
      platform = {
        platformTitle: 'Colchão Espesso de Agulhas de Pinheiro e Folhagem Seca',
        thermalInsulation: 'Camada de 15 cm de matéria vegetal seca com microcâmaras de ar retendo o calor do corpo.',
        moistureProtection: 'Camada inferior absorve a umidade do chão preservando a face superior aquecida e seca.',
        comfortAndExhaustionRecovery: 'Concede vantagem na primeira salvaguarda de Constituição contra o frio matinal no despertar.',
        icon: '🌲🍂',
        color: '#10b981'
      };
    } else if (pt === 'suspended_jungle_hammock') {
      platform = {
        platformTitle: 'Bivaque em Rede Suspensa com Cobertura de Lona Encerada',
        thermalInsulation: 'Isolamento aéreo absoluto a 1,5 metro do chão em áreas alagadas de mangue ou mata densa.',
        moistureProtection: 'Inatingível por lençóis freáticos aflorantes, carrapatos, formigas carnívoras e cobras rastejantes.',
        comfortAndExhaustionRecovery: 'Permite sono relaxante e seguro mesmo sobre charcos lamacentos ou raízes salientes.',
        icon: '🪢🌴',
        color: '#06b6d4'
      };
    }

    return {
      biomeKey: bk,
      platformType: pt,
      platformTitle: platform.platformTitle,
      thermalInsulation: platform.thermalInsulation,
      moistureProtection: platform.moistureProtection,
      comfortAndExhaustionRecovery: platform.comfortAndExhaustionRecovery,
      icon: platform.icon,
      color: platform.color,
      dndRef: 'DMG p. 111-112 (Acampamento Seguro e Condições Adversas) / XGE p. 78 (Atividades de Acampamento e Descanso) / PHB p. 186'
    };
  }

  // === calcWildernessLightningAndConductiveRidgeHazard (Raios em Espinhaço, Tempestades Elétricas e Fogo de Santelmo - DMG p. 109-110 / PHB p. 183) ===
  function calcWildernessLightningAndConductiveRidgeHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'mountain').toLowerCase();
    var ht = (hazardType || 'direct_ridgeline_strike').toLowerCase();

    var hazard = {
      hazardTitle: 'Descarga Direta de Raio em Espinhaço Montanhoso Elevado',
      saveDC: 15,
      saveType: 'Destreza',
      strikeDamageAndSurge: 'Raio de eletricidade atmosférica colossal; 8d10 de dano elétrico em falha (metade no sucesso); atinge o ponto mais alto.',
      conductiveAttraction: 'Aventureiros com armaduras metálicas ou armas condutoras longas empunhadas sofrem desvantagem na salvaguarda.',
      pioneerWarningSign: 'Fogo de Santelmo: faíscas azuladas estalam nas pontas das lanças e cabelos se arrepiam 1 rodada antes do raio.',
      icon: '⚡🏔️',
      color: '#38bdf8'
    };

    if (ht === 'ground_current_surface_arc') {
      hazard = {
        hazardTitle: 'Arco de Correnteza Superficial em Laje Rocha Úmida',
        saveDC: 13,
        saveType: 'Constituição',
        strikeDamageAndSurge: 'Corrente residual de choque pelo chão encharcado; 3d10 de dano elétrico e condição Atordoado até o final do próximo turno.',
        pioneerWarningSign: 'Formigamento agudo nas solas das botas de montaria e cheiro penetrante de ozônio no ar.',
        conductiveAttraction: 'Manter ambos os pés juntos ou agachar sobre manta de lã seca isolante anula a condução do choque pelo solo.',
        icon: '⚡🪨',
        color: '#facc15'
      };
    } else if (ht === 'geomagnetic_compass_flux' || bk === 'desert' || bk === 'deserto') {
      hazard = {
        hazardTitle: 'Tempestade Magnética Ionizada com Desorientação de Bússola',
        saveDC: 14,
        saveType: 'Sabedoria (Sobrevivência)',
        strikeDamageAndSurge: 'Agulha de bússolas e pedras-guia giram freneticamente; marcha desvia em 45 graus com risco de perder a rota.',
        pioneerWarningSign: 'Céu noturno com auroras elétricas anômalas estalando em tons esmeralda e violeta sobre as dunas.',
        conductiveAttraction: 'Batedores que navegam por estrelas ou marcos geográficos proeminentes ignoram a anomalia eletromagnética.',
        icon: '🧭⚡',
        color: '#c084fc'
      };
    } else if (ht === 'supercell_ball_lightning' || bk === 'swamp' || bk === 'pantano') {
      hazard = {
        hazardTitle: 'Centelha Esférica Flutuante (Raio Globular Errático)',
        saveDC: 14,
        saveType: 'Destreza',
        strikeDamageAndSurge: 'Orbe plasmático que persegue massas de ferro; 4d10 de dano elétrico e cegueira temporária por clarão cegante.',
        pioneerWarningSign: 'Zumbido de baixa frequência vibrando no peito acompanhado por orbe luminoso descendo lentamente da nuvem.',
        conductiveAttraction: 'Permanecer imóvel sem movimentos bruscos permite que o globo passe sem detonar contra o grupo.',
        icon: '🔮⚡',
        color: '#e879f9'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      strikeDamageAndSurge: hazard.strikeDamageAndSurge,
      conductiveAttraction: hazard.conductiveAttraction,
      pioneerWarningSign: hazard.pioneerWarningSign,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 109-110 (Tempestades Severas, Raios e Ventos Fortes) / PHB p. 183 (Dano Elétrico)'
    };
  }

  // === calcCampLightningRodAndGroundingSafety (Para-raios de Acampamento, Aterramento e Segurança Elétrica - DMG p. 109-110 / XGE p. 78) ===
  function calcCampLightningRodAndGroundingSafety(biomeKey, protectionType, options) {
    options = options || {};
    var bk = (biomeKey || 'montanha').toLowerCase();
    var pt = (protectionType || 'improvised_picket_lightning_rod').toLowerCase();

    var protection = {
      protectionTitle: 'Para-raios Improvisado com Lança de Ferro e Cabo de Aterramento',
      safetyZoneRadius: 'Raio de segurança de 20 metros ao redor da haste; desvia descargas atmosféricas diretas para a rocha.',
      metalGearProtocol: 'Armaduras pesadas e escudos metálicos depositados a 15 metros das tendas sob lona encerada.',
      campsitePlacementSafety: 'Acampamento montado em depressão natural ou sela rochosa, nunca no cume ou topo do escarpado.',
      icon: '🛡️⚡',
      color: '#0284c7'
    };

    if (pt === 'grounding_cable_trench') {
      protection = {
        protectionTitle: 'Trincheira Periférica com Corrente de Ferro Aterrada em Fenda Úmida',
        safetyZoneRadius: 'Dispersa correntes elétricas que correm pela superfície molhada antes de atingirem os sacos de dormir.',
        metalGearProtocol: 'Equipamentos de metal condutor limpos e secos dentro de baús de madeira isolante.',
        campsitePlacementSafety: 'Sentinelas permanecem abrigadas sob fendas rochosas profundas sem contato direto com paredes molhadas.',
        icon: '⛏️⚡',
        color: '#38bdf8'
      };
    } else if (pt === 'insulated_wool_bivouac_mat') {
      protection = {
        protectionTitle: 'Isolamento de Acampamento com Esteiras Secas de Lã e Casca Grossa',
        safetyZoneRadius: 'Barreira dielétrica de 10 cm entre o corpo dos aventureiros e a terra carregada de estática.',
        metalGearProtocol: 'Armas de lâmina guardadas em bainhas de couro untado sem ponteiras expostas ao ar livre.',
        campsitePlacementSafety: 'Evita a proximidade de árvores isoladas altas que atuam como alvos primários de descargas elétricas.',
        icon: '🏕️🐑',
        color: '#a3e635'
      };
    } else if (pt === 'canyon_floor_shielding') {
      protection = {
        protectionTitle: 'Acampamento no Fundo de Desfiladeiro com Paredes Altas Naturais',
        safetyZoneRadius: 'Paredes do cânion 50 metros acima atraem qualquer descarga, criando cone de sombra elétrico perfeito.',
        metalGearProtocol: 'Vigilância redobrada contra enxurradas repentinas causadas pelas tempestades nas cabeceiras.',
        campsitePlacementSafety: 'Posicionamento sobre terraço de cascalho elevado a 3 metros do leito do rio seco.',
        icon: '⛰️🛡️',
        color: '#f59e0b'
      };
    }

    return {
      biomeKey: bk,
      protectionType: pt,
      protectionTitle: protection.protectionTitle,
      safetyZoneRadius: protection.safetyZoneRadius,
      metalGearProtocol: protection.metalGearProtocol,
      campsitePlacementSafety: protection.campsitePlacementSafety,
      icon: protection.icon,
      color: protection.color,
      dndRef: 'DMG p. 109-110 (Tempestades Severas e Aterramento) / XGE p. 78 (Segurança de Acampamento)'
    };
  }

  // === calcDenseFogAndVisualObscurementHazard (Nevoeiro Espesso, Cerração Cega e Brumas Feéricas - DMG p. 109 / PHB p. 183) ===
  function calcDenseFogAndVisualObscurementHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var ht = (hazardType || 'heavy_morning_valley_fog').toLowerCase();

    var hazard = {
      hazardTitle: 'Cerração Espessa de Baixada com Visibilidade Nula',
      saveDC: 14,
      saveType: 'Sabedoria (Percepção)',
      obscurementPenalty: 'Visibilidade limitada a 3 metros (Heavy Obscurement PHB p. 183); ataques à distância com desvantagem.',
      pioneerMitigation: 'Batedores amarrados por corda de guia de 6 metros avançam em fila indiana sem risco de separação.',
      navigationalGuidance: 'Bússolas e correntes de ar frio nas encostas indicam a saída da depressão de nevoeiro.',
      icon: '🌫️🌲',
      color: '#94a3b8'
    };

    if (ht === 'disorienting_fey_mist' || bk === 'swamp' || bk === 'pantano') {
      hazard = {
        hazardTitle: 'Brumas Feéricas Ilusórias e Encantamento Esmeralda',
        saveDC: 14,
        saveType: 'Sabedoria',
        obscurementPenalty: 'Condição Enfeitiçado e alucinações auditivas; aventureiros desviam a rota em 90 graus andando em círculos.',
        pioneerMitigation: 'Sinos de latão afinados ou canções de bardo quebram o torpor hipnótico das emanações feéricas.',
        navigationalGuidance: 'Seguir rastros de água corrente límpida que repelem as névoas encantadas da floresta.',
        icon: '✨🌫️',
        color: '#c084fc'
      };
    } else if (ht === 'toxic_peat_smolder_smoke') {
      hazard = {
        hazardTitle: 'Fumaça Sulfurosa de Turfeira em Combustão Lenta',
        saveDC: 13,
        saveType: 'Constituição',
        obscurementPenalty: 'Ardor ocular lacrimejante e 2d6 de dano de veneno por inalação prolongada de turfa queimada.',
        pioneerMitigation: 'Máscaras de tecido umedecidas em água e sal protegem os pulmões e mucosas dos viajantes.',
        navigationalGuidance: 'Subir para cristas expostas a favor do vento onde a fumaça rasteira não consegue alcançar.',
        icon: '🔥🌫️',
        color: '#f97316'
      };
    } else if (ht === 'bone_chill_rime_fog' || bk === 'snow' || bk === 'tundra' || bk === 'neve') {
      hazard = {
        hazardTitle: 'Nevoeiro de Geada e Cristais Glaciais em Suspensão',
        saveDC: 13,
        saveType: 'Constituição',
        obscurementPenalty: 'Cristais pontiagudos congelam cílios e barbas; 1 nível de exaustão por frio severo (PHB p. 185).',
        pioneerMitigation: 'Gordura de foca ou ungüento oleoso na face previne queimaduras de geada durante a marcha.',
        navigationalGuidance: 'Manter marcha cadenciada com paradas breves de aquecimento a cada 30 minutos.',
        icon: '❄️🌫️',
        color: '#38bdf8'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      obscurementPenalty: hazard.obscurementPenalty,
      pioneerMitigation: hazard.pioneerMitigation,
      navigationalGuidance: hazard.navigationalGuidance,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 109 (Cerração, Nevoeiro e Clima Severo) / PHB p. 183 (Visibilidade e Área Fortemente Obscurecida)'
    };
  }

  // === calcCampDrainageTrenchAndRunoffDiversion (Valas de Drenagem, Trincheiras e Escoamento de Chuva - DMG p. 111-112 / XGE p. 78) ===
  function calcCampDrainageTrenchAndRunoffDiversion(biomeKey, trenchType, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var tt = (trenchType || 'horseshoe_swale_trench').toLowerCase();

    var trench = {
      trenchTitle: 'Vala em Ferradura Escavada a Montante com Saída Livre',
      waterDiversionCapacity: 'Drena até 80 litros de enxurrada por minuto; contorna o perímetro externo das barracas.',
      mudAndSoakProtection: 'Impede que o solo sob as lonas se transforme em lamaçal pegajoso durante tempestades noturnas.',
      gearAndTentsSafety: 'Mochilas, arcas e sacos de dormir da comitiva permanecem 100% secos e isolados de enchentes.',
      icon: '⛏️🌊',
      color: '#0284c7'
    };

    if (tt === 'gravel_soakaway_sump') {
      trench = {
        trenchTitle: 'Poço de Absorção com Seixos Rolados e Gravetos Trançados',
        waterDiversionCapacity: 'Infiltração rápida da água empoçada no ponto mais baixo do terreno do acampamento.',
        mudAndSoakProtection: 'Elimina poças estagnadas que atrairiam mosquitos carniceiros e insetos do pântano.',
        gearAndTentsSafety: 'Sentinelas de vigília conseguem caminhar sem patinar na lama nas trocas de turno.',
        icon: '🪨💧',
        color: '#38bdf8'
      };
    } else if (tt === 'earth_berm_deflector') {
      trench = {
        trenchTitle: 'Talude de Terra Compactada com Troncos de Contenção',
        waterDiversionCapacity: 'Barreira física resistente contra enxurradas violentas descendo de encostas montanhosas.',
        mudAndSoakProtection: 'Bloqueia lamaçal denso e detritos rochosos carreados pelas águas pluviais rápidas.',
        gearAndTentsSafety: 'Garante estabilidade dos esteios das tendas e resguarda as fogueiras protegidas.',
        icon: '🪵🛡️',
        color: '#ca8a04'
      };
    } else if (tt === 'corduroy_timber_walkway') {
      trench = {
        trenchTitle: 'Trilho Elevado de Toras Roliças entre Tendas e Fogueira',
        waterDiversionCapacity: 'Passadiço suspenso 10 cm acima do solo saturado de água pluvial e lama.',
        mudAndSoakProtection: 'Calçados e capas de viagem permanecem limpos, evitando perda térmica nos pés dos aventureiros.',
        gearAndTentsSafety: 'Transporte seguro de caldeirões de ensopado e suprimentos sem risco de escorregões.',
        icon: '🪵🛤️',
        color: '#84cc16'
      };
    }

    return {
      biomeKey: bk,
      trenchType: tt,
      trenchTitle: trench.trenchTitle,
      waterDiversionCapacity: trench.waterDiversionCapacity,
      mudAndSoakProtection: trench.mudAndSoakProtection,
      gearAndTentsSafety: trench.gearAndTentsSafety,
      icon: trench.icon,
      color: trench.color,
      dndRef: 'DMG p. 111-112 (Acampamento Seguro e Chuvas Torrenciais) / XGE p. 78 (Engenharia de Acampamento)'
    };
  }

  // === calcWildernessGaleForceWindsAndFlightHazard (Ventanias Uivantes, Rajadas de Furacão e Projéteis Desviados - DMG p. 110 / XGE p. 134) ===
  function calcWildernessGaleForceWindsAndFlightHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'montanha').toLowerCase();
    var ht = (hazardType || 'gale_force_gusts').toLowerCase();

    var hazard = {
      hazardTitle: 'Ventania Uivante de Espinhaço com Rajadas de Furacão',
      saveDC: 14,
      saveType: 'Força',
      windForcePenalty: 'Desvantagem em ataques à distância e em Percepção auditiva; rajadas podem empurrar 15 pés e derrubar No Chão.',
      pioneerMitigation: 'Avançar agachado utilizando bordões e cajados cravados em fendas da rocha como pontos de apoio.',
      flightAndRangedImpact: 'Criaturas voadoras pequenas ou médias devem pousar ou caem; flechas e virotes desviam bruscamente.',
      icon: '🌬️🏔️',
      color: '#38bdf8'
    };

    if (ht === 'arid_dust_devil_vortex' || bk === 'desert' || bk === 'deserto') {
      hazard = {
        hazardTitle: 'Redemoinho de Areia Abrasiva e Poeira (Dust Devil)',
        saveDC: 13,
        saveType: 'Destreza',
        windForcePenalty: 'Vórtice giratório de cascalho; 2d8 de dano cortante e cegueira por 1 rodada por terra nos olhos.',
        pioneerMitigation: 'Óculos de proteção com fenda fina de couro e lenço facial umedecido bloqueiam a poeira rodopiante.',
        flightAndRangedImpact: 'Dissipa instantaneamente névoas, gases e nuvens de esporos na área de passagem do cone.',
        icon: '🌪️🏜️',
        color: '#f59e0b'
      };
    } else if (ht === 'coastal_squall_gale' || bk === 'coast' || bk === 'litoral') {
      hazard = {
        hazardTitle: 'Borrasca Costeira com Salpicos Marítimos e Vento Lateral',
        saveDC: 14,
        saveType: 'Força (Atletismo)',
        windForcePenalty: 'Rajadas marítimas violentas de 70 km/h que arrancam capas e dificultam a firmeza dos passos em falésias.',
        pioneerMitigation: 'Manter marcha afastada da beirada das escarpas com cordada unindo os companheiros.',
        flightAndRangedImpact: 'Navegação costeira e botes sofrem risco de emborcamento; exige manobra firme de leme.',
        icon: '🌊🌬️',
        color: '#0284c7'
      };
    } else if (ht === 'canyon_funnel_downdraft') {
      hazard = {
        hazardTitle: 'Corrente Descendente Afunilada em Garganta Rochosa',
        saveDC: 15,
        saveType: 'Constituição',
        windForcePenalty: 'Pressão barométrica severa e vento ensurdecedor; impõe a condição Surdo enquanto permanecer na garganta.',
        pioneerMitigation: 'Tampões de cera ou algodão nos ouvidos diminuem a dor de tímpano causada pelo assobio do vento.',
        flightAndRangedImpact: 'Criaturas em sobrevoo são arremessadas contra as paredes rochosas com 3d6 de concussão.',
        icon: '⛰️💨',
        color: '#a855f7'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      windForcePenalty: hazard.windForcePenalty,
      pioneerMitigation: hazard.pioneerMitigation,
      flightAndRangedImpact: hazard.flightAndRangedImpact,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110 (Ventos Fortes e Clima Extremo) / XGE p. 134 (Turbulência e Projéteis) / PHB p. 183'
    };
  }

  // === calcCampWindbreakPalisadeAndGuylineBracing (Paliçadas Corta-Vento, Estacas Cruzadas e Proteção de Fogo - DMG p. 111-112 / XGE p. 78) ===
  function calcCampWindbreakPalisadeAndGuylineBracing(biomeKey, bracingType, options) {
    options = options || {};
    var bk = (biomeKey || 'montanha').toLowerCase();
    var bt = (bracingType || 'interwoven_wattle_windbreak').toLowerCase();

    var bracing = {
      bracingTitle: 'Paliçada Corta-Vento de Galhos Trançados e Esteiras',
      windReductionEfficiency: 'Reduz a velocidade do vento na zona de dormir em 70%; impede que o calor da fogueira seja dispersado.',
      guylineStabilityRating: 'Tirantes de lona ancorados com estacas duplas cruzadas em ângulo de 45 graus suportando até 80 km/h.',
      firePreservationDetails: 'Anteparo de pedras e terra resguarda as brasas do caldeirão contra rajadas uivantes repentinas.',
      icon: '🪵🛡️',
      color: '#ca8a04'
    };

    if (bt === 'dakota_subterranean_fire_trench') {
      bracing = {
        bracingTitle: 'Fogueira em Trincheira Subterrânea Estilo Dakota',
        windReductionEfficiency: 'Queima em câmara escavada abaixo do nível do solo; 100% imune a ser apagada por ventos fortes.',
        guylineStabilityRating: 'Gera tiragem de ar subterrânea limpa com queima de alta eficiência e emissão mínima de fumaça visível.',
        firePreservationDetails: 'Permite cozinhar e ferver água mesmo no epicentro de vendavais sem espalhar fagulhas na mata.',
        icon: '🔥⛏️',
        color: '#ea580c'
      };
    } else if (bt === 'boulder_guyline_rock_anchors') {
      bracing = {
        bracingTitle: 'Ancoragem de Tendas com Rochedos e Lastro de 25 kg',
        windReductionEfficiency: 'Ideal para lajes de pedra nua onde estacas normais não penetram; lastro de pedras atadas com corda.',
        guylineStabilityRating: 'Elimina o risco de lonas rasgadas ou estacas arrancadas pelas rajadas noturnas em cumes.',
        firePreservationDetails: 'Mureta circular de pedras empilhadas em meia-lua foca a radiação térmica para o interior das barracas.',
        icon: '🪨🏕️',
        color: '#64748b'
      };
    } else if (bt === 'clay_ember_carrier_pot') {
      bracing = {
        bracingTitle: 'Vaso Cerâmico Térmico com Brasas Seladas em Cinza',
        windReductionEfficiency: 'Transporte e preservação de fogo protegido de tempestades; brasas vivas por até 12 horas consecutivas.',
        guylineStabilityRating: 'Permite reativar o acampamento matinal instantaneamente sem gastar pederneiras na ventania.',
        firePreservationDetails: 'Elimina o risco de a comitiva amanhecer congelada por falta de fogo em meio ao temporal.',
        icon: '🏺🔥',
        color: '#f59e0b'
      };
    }

    return {
      biomeKey: bk,
      bracingType: bt,
      bracingTitle: bracing.bracingTitle,
      windReductionEfficiency: bracing.windReductionEfficiency,
      guylineStabilityRating: bracing.guylineStabilityRating,
      firePreservationDetails: bracing.firePreservationDetails,
      icon: bracing.icon,
      color: bracing.color,
      dndRef: 'DMG p. 111-112 (Acampamento Seguro e Ventanias) / XGE p. 78 (Engenharia de Acampamento)'
    };
  }

  // === calcWildernessCausticBogAndMiasmaHazard (Pântanos Ácidos, Turfeiras Cáusticas e Miasma - DMG p. 110 / PHB p. 182-183) ===
  function calcWildernessCausticBogAndMiasmaHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'swamp').toLowerCase();
    var ht = (hazardType || 'corrosive_acidic_peat_sink').toLowerCase();

    var hazard = {
      hazardTitle: 'Turfeira Ácida Cáustica com Lodo Sulfuroso Corrosivo',
      saveDC: 14,
      saveType: 'Destreza',
      acidicImpactAndTrapping: 'Afundamento até os joelhos; 2d6 de dano de ácido por turno e velocidade 0 (escape CD 14 Força [Atletismo]).',
      pioneerMitigation: 'Batedores usando varas longas de sondagem para testar a consistência da turfa antes de apoiar o peso do corpo.',
      escapeAndCleansing: 'Lavar a pele com água corrente limpa e neutralizar tiras de couro com cinza fina de fogueira.',
      icon: '🧪🕳️',
      color: '#84cc16'
    };

    if (ht === 'stagnant_rotmire_gas_pocket') {
      hazard = {
        hazardTitle: 'Bolsão de Gás Mefítico Volátil de Pântano Podre',
        saveDC: 13,
        saveType: 'Destreza',
        acidicImpactAndTrapping: 'Fagulhas ou chamas abertas (tochas) detonam explosão de 3d6 de fogo em raio de 10 pés (metade no sucesso).',
        pioneerMitigation: 'Utilizar lanternas fechadas encapadas com vidro ou pedras luminescentes mágicas sem chama viva.',
        escapeAndCleansing: 'Avançar rapidamente por áreas bem ventiladas a favor do vento para evitar acúmulos gasosos.',
        icon: '💥🌫️',
        color: '#f97316'
      };
    } else if (ht === 'blood_leech_infested_shallows') {
      hazard = {
        hazardTitle: 'Vaus Pantanosos Infestados por Sanguessugas Carniceiras',
        saveDC: 13,
        saveType: 'Constituição',
        acidicImpactAndTrapping: 'Fixação parasitária nas pernas; perda de 1 Dado de Vida ou 1d6 de dano perfurante por hemorragia continuada.',
        pioneerMitigation: 'Pernilheiras de couro apertadas e untadas com sebo animal espesso repelem a fixação dos parasitas.',
        escapeAndCleansing: 'Aplicar sal grosso, vinagre ou brasa incandescente nas sanguessugas para desprendimento seguro.',
        icon: '🪱🩸',
        color: '#ef4444'
      };
    } else if (ht === 'quagmire_deep_crust_false_ground') {
      hazard = {
        hazardTitle: 'Falsa Crosta Musgosa Flutuante sobre Poço Lodoso',
        saveDC: 13,
        saveType: 'Destreza',
        acidicImpactAndTrapping: 'Rompimento da esteira vegetal; queda em água lodosa profunda de 4 metros com risco de sufocamento (PHB p. 183).',
        pioneerMitigation: 'Marcha em cordada de 3 metros ancorada em raízes grossas de mangue impede a submersão total do viajante.',
        escapeAndCleansing: 'Companheiros usam alavanca de galho resistente para resgatar o membro acidentado da lama densa.',
        icon: '🌿🕳️',
        color: '#10b981'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      acidicImpactAndTrapping: hazard.acidicImpactAndTrapping,
      pioneerMitigation: hazard.pioneerMitigation,
      escapeAndCleansing: hazard.escapeAndCleansing,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110 (Pântanos, Lodaçais e Terreno Difícil) / PHB p. 182-183 (Dano de Ácido e Condições)'
    };
  }

  // === calcCampBootDryingAndFootwearCare (Secagem de Calçados, Cuidados com Couro e Pé-de-Trincheira - DMG p. 111-112 / XGE p. 78) ===
  function calcCampBootDryingAndFootwearCare(biomeKey, careType, options) {
    options = options || {};
    var bk = (biomeKey || 'swamp').toLowerCase();
    var ct = (careType || 'heated_pebble_boot_drying').toLowerCase();

    var care = {
      careTitle: 'Secagem Interna de Botas com Seixos Aquecidos em Cinzas',
      dryingEfficiency: 'Calor residual constante absorve 100% da umidade interna do couro em 2 horas sem ressecar as costuras.',
      leatherPreservation: 'Evita rachaduras, encolhimento e endurecimento do couro causados pela exposição direta a chamas abertas.',
      trenchFootPrevention: 'Garante que os aventureiros comecem a marcha matinal com calçados secos, prevenindo podridão de trincheira.',
      icon: '🪨🥾',
      color: '#ca8a04'
    };

    if (ct === 'tallow_and_beeswax_waterproofing') {
      care = {
        careTitle: 'Impermeabilização com Sebo de Carneiro e Cera de Abelha',
        dryingEfficiency: 'Aplicação a quente nas costuras e linguetas de couro criando camada repelente a lama e águas ácidas.',
        leatherPreservation: 'Dobra a durabilidade das solas de montaria em terrenos pedregosos ou pantanosos abrasivos.',
        trenchFootPrevention: 'Impede a infiltração de umidade durante travessias rasas de vaus e atoleiros na jornada.',
        icon: '🕯️🛡️',
        color: '#eab308'
      };
    } else if (ct === 'suspended_drying_tripod_rack') {
      care = {
        careTitle: 'Tripé de Varal Elevado a Sotavento da Fogueira',
        dryingEfficiency: 'Circulação de ar morno contínuo secando meias de lã, panos de pé e mantos pesados sem queimar.',
        leatherPreservation: 'Mantém as peças afastadas do chão úmido e fora do alcance de fagulhas vivas da lenha.',
        trenchFootPrevention: 'Meias secas e higienizadas reduzem o atrito nos calcanhares, impedindo bolhas incapacitantes.',
        icon: '🪵🧺',
        color: '#f59e0b'
      };
    } else if (ct === 'sulfur_and_tallow_foot_powder') {
      care = {
        careTitle: 'Higienização de Pés com Pó de Enxofre e Amido Secante',
        dryingEfficiency: 'Ação antifúngica e antisséptica imediata eliminando micoses e escoriações provocadas por lodo salobro.',
        leatherPreservation: 'Evita proliferação de fungos e mofo nas palmilhas de feltro durante longas expedições de semanas.',
        trenchFootPrevention: 'Concede alívio tático e restauração de conforto; aventureiros acordam sem penalidades de marcha.',
        icon: '✨🦶',
        color: '#38bdf8'
      };
    }

    return {
      biomeKey: bk,
      careType: ct,
      careTitle: care.careTitle,
      dryingEfficiency: care.dryingEfficiency,
      leatherPreservation: care.leatherPreservation,
      trenchFootPrevention: care.trenchFootPrevention,
      icon: care.icon,
      color: care.color,
      dndRef: 'DMG p. 111-112 (Acampamento Seguro e Higiene de Marcha) / XGE p. 78 (Manutenção de Equipamento)'
    };
  }

  // === calcWildernessBeastLairAndTerritorialAmbushHazard (Ninhos de Feras, Teias Gigantes e Emboscadas Territoriais - DMG p. 105, 110 / MM p. 6) ===
  function calcWildernessBeastLairAndTerritorialAmbushHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var ht = (hazardType || 'predator_gorge_chokepoint_ambush').toLowerCase();

    var hazard = {
      hazardTitle: 'Garganta Estreita com Emboscada de Predador Alfa',
      saveDC: 15,
      saveType: 'Sabedoria (Percepção)',
      ambushDangerAndDamage: 'Ataque surpresa de emboscada; o predador salta das saliências superiores com vantagem e dano crítico potencial.',
      pioneerMitigation: 'Batedores avançam no topo das cristas para obter linha de visão desobstruída do desfiladeiro abaixo.',
      counterStrategy: 'Fechar formação em tartaruga com escudos erguidos para cima neutralizando o salto inicial.',
      icon: '🐾🗡️',
      color: '#f97316'
    };

    if (ht === 'spider_silk_web_choke_tunnel' || bk === 'swamp' || bk === 'pantano') {
      hazard = {
        hazardTitle: 'Túnel de Galhos Trançados com Teias de Aranha Gigante',
        saveDC: 13,
        saveType: 'Destreza',
        ambushDangerAndDamage: 'Teias viscosas (DMG p. 105); impõe a condição Contido e atrai aranhas monstruosas em 1 rodada.',
        pioneerMitigation: 'Tochas acesas na vanguarda queimam as teias rapidamente (causa 2d4 de dano de fogo à vegetação de teias).',
        counterStrategy: 'Lâminas cortantes com teste de Força CD 12 rasgam os fios grossos liberando os companheiros presos.',
        icon: '🕸️🕷️',
        color: '#a855f7'
      };
    } else if (ht === 'wyvern_roost_cliff_fall_zone' || bk === 'mountain' || bk === 'montanha') {
      hazard = {
        hazardTitle: 'Penhasco Sob Ninho de Serpes com Desabamento de Ossadas',
        saveDC: 14,
        saveType: 'Destreza',
        ambushDangerAndDamage: 'Carcaças e pedregulhos arremessados do alto do ninho causando 3d10 de concussão e risco de queda.',
        pioneerMitigation: 'Avançar colado às fendas da parede rochosa onde o ângulo de arremesso do ninho fica bloqueado.',
        counterStrategy: 'Manter arqueiros com virotes prontos para suprimir a serpe sentinela no momento da decolagem.',
        icon: '🦅🪨',
        color: '#ef4444'
      };
    } else if (ht === 'territorial_alpha_musk_scent_boundary') {
      hazard = {
        hazardTitle: 'Marcação Territorial de Urso-Coruja com Garras em Troncos',
        saveDC: 14,
        saveType: 'Sabedoria (Sobrevivência)',
        ambushDangerAndDamage: 'Invasão acidental de território de reprodução desencadeando fúria implacável e perseguição veloz.',
        pioneerMitigation: 'Identificar as marcas de arranhão a 3 metros de altura e o odor almiscarado antes de adentrar a ravina.',
        counterStrategy: 'Contornar o perímetro do covil contra o vento sem fazer ruídos ou disparar o alarme animal.',
        icon: '🐻🌲',
        color: '#eab308'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      ambushDangerAndDamage: hazard.ambushDangerAndDamage,
      pioneerMitigation: hazard.pioneerMitigation,
      counterStrategy: hazard.counterStrategy,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 105, 110 (Covis, Emboscadas e Armadilhas Naturais) / MM p. 6 / PHB p. 183'
    };
  }

  // === calcCampTripwireAlarmAndDefensiveSnare (Alarmes de Tropeço, Abátis de Estacas e Cercado Defensivo - DMG p. 111-112 / PHB p. 151-152) ===
  function calcCampTripwireAlarmAndDefensiveSnare(biomeKey, defenseType, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var dt = (defenseType || 'concealed_tripwire_tin_rattle').toLowerCase();

    var defense = {
      defenseTitle: 'Fio de Tropeço com Latas e Guizos Sonoros de Alerta',
      alarmPerimeterRange: 'Perímetro circular esticado a 15 metros ao redor do acampamento a 20 cm do solo.',
      surprisePreventionRating: 'Garante que invasores noturnos não consigam surpreender a comitiva; acorda sentinelas instantaneamente.',
      intruderDeterrence: 'O retinir metálico assusta predadores menores e revela a posição exata da incursão na escuridão.',
      icon: '🔔🏕️',
      color: '#38bdf8'
    };

    if (dt === 'sharpened_stake_abatis_perimeter') {
      defense = {
        defenseTitle: 'Cercado de Estacas Pontiagudas Endurecidas ao Fogo (Abátis)',
        alarmPerimeterRange: 'Barreira física densa de galhos grossos apontados a 45 graus contornando as tendas.',
        surprisePreventionRating: 'Terreno difícil intransponível para investidas rápidas; invasores que saltam sofrem 2d6 de dano perfurante.',
        intruderDeterrence: 'Força feras e bandidos a buscar passagens estreitas canalizando-os diretamente para o campo de tiro.',
        icon: '🪵⚔️',
        color: '#ca8a04'
      };
    } else if (dt === 'perimeter_deadfall_snare_loop') {
      defense = {
        defenseTitle: 'Laços de Gatilho com Tronco Suspenso em Trilhas de Acesso',
        alarmPerimeterRange: 'Armadilhas de laço dispostas nas 3 principais rotas de aproximação furtiva do acampamento.',
        surprisePreventionRating: 'Invasores que tropeçam no laço fazem salvaguarda de Destreza CD 13 ou ficam Contidos suspensos pela perna.',
        intruderDeterrence: 'Imobiliza batedores hostis silenciosamente antes que consigam lançar flechas contra as barracas.',
        icon: '🪢🌲',
        color: '#84cc16'
      };
    } else if (dt === 'crushed_dry_twig_scatter_carpet') {
      defense = {
        defenseTitle: 'Tapete de Gravetos Secos Estaladiços e Conchas Trituradas',
        alarmPerimeterRange: 'Faixa perimetral de 5 metros de largura ao redor do círculo de sacos de dormir.',
        surprisePreventionRating: 'Impõe desvantagem em testes de Destreza (Furtividade) de qualquer criatura que tente caminhar no escuro.',
        intruderDeterrence: 'O estalar de gravetos secos sob as patas quebra qualquer aproximação silenciosa a até 20 metros.',
        icon: '🍂👂',
        color: '#f59e0b'
      };
    }

    return {
      biomeKey: bk,
      defenseType: dt,
      defenseTitle: defense.defenseTitle,
      alarmPerimeterRange: defense.alarmPerimeterRange,
      surprisePreventionRating: defense.surprisePreventionRating,
      intruderDeterrence: defense.intruderDeterrence,
      icon: defense.icon,
      color: defense.color,
      dndRef: 'DMG p. 111-112 (Acampamento Seguro e Perímetros) / PHB p. 151-152 (Armadilhas e Alarmes) / XGE p. 78'
    };
  }

  // === calcWildernessThinIceAndFrigidWaterHazard (Gelo Fino, Água Frígida e Hipotermia - DMG p. 110-111 / PHB p. 185) ===
  function calcWildernessThinIceAndFrigidWaterHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'snow').toLowerCase();
    var ht = (hazardType || 'thin_ice_sheet_fracture').toLowerCase();

    var hazard = {
      hazardTitle: 'Fratura de Camada de Gelo Fino em Lago Congelado',
      saveDC: 13,
      saveType: 'Destreza',
      freezingImmersionAndExhaustion: 'Queda em água frígida abaixo de zero (DMG p. 110); CD 10 Constituição a cada minuto ou sofre 1 nível de Exaustão.',
      pioneerMitigation: 'Batedores avançam rastejando com o peso distribuído ou testam a espessura do gelo com machados a cada 2 metros.',
      rescueAndRewarming: 'Membros da comitiva lançam cordas com nós ou bastões longos para içar a vítima sem se aproximarem da borda quebradiça.',
      icon: '❄️🌊',
      color: '#38bdf8'
    };

    if (ht === 'subsurface_river_drag_current') {
      hazard = {
        hazardTitle: 'Correnteza Subterrânea Oculta Sob Placa Glacial',
        saveDC: 14,
        saveType: 'Força (Atletismo)',
        freezingImmersionAndExhaustion: 'Arrasto violento para baixo do teto de gelo espesso; risco iminente de sufocamento (PHB p. 183) e hipotermia fulminante.',
        pioneerMitigation: 'Marcha estritamente em cordada dupla ancorada com pítons de rocha nas margens sólidas do cânion.',
        rescueAndRewarming: 'Tracionar a corda guia imediatamente trazendo o companheiro de volta ao buraco de entrada.',
        icon: '🌊🕳️',
        color: '#0284c7'
      };
    } else if (ht === 'slush_and_rime_snowshoe_stick') {
      hazard = {
        hazardTitle: 'Atoleiro de Neve Úmida com Crosta Traiçoeira (Slush Bog)',
        saveDC: 13,
        saveType: 'Força',
        freezingImmersionAndExhaustion: 'Acúmulo de lodo de gelo nas botas; deslocamento reduzido em 3 metros e desvantagem em testes de Acrobacia.',
        pioneerMitigation: 'Raquetes de neve enceradas com gordura de baleia impedem a aderência da massa pastosa de gelo.',
        rescueAndRewarming: 'Parada tática rápida para raspar as crostas congeladas com facas de caça antes que endureçam como rocha.',
        icon: '🌨️🥾',
        color: '#94a3b8'
      };
    } else if (ht === 'crevasse_frazil_ice_slurry') {
      hazard = {
        hazardTitle: 'Fenda com Suspensão de Cristais Flutuantes (Gelo Frazil)',
        saveDC: 14,
        saveType: 'Constituição',
        freezingImmersionAndExhaustion: 'Pasta gelatinosa de cristais afiados; causa 2d6 de dano de frio por rodada e emperra engrenagens de bestas e bainhas.',
        pioneerMitigation: 'Contornar depressões glaciais com tonalidade cinza-azulada que indicam água em ponto de congelamento rápido.',
        rescueAndRewarming: 'Fricção rápida com tecidos secos e aquecimento com fogo mágico ou tochas para descongelar juntas e armas.',
        icon: '🧊☠️',
        color: '#7dd3fc'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      freezingImmersionAndExhaustion: hazard.freezingImmersionAndExhaustion,
      pioneerMitigation: hazard.pioneerMitigation,
      rescueAndRewarming: hazard.rescueAndRewarming,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110-111 (Gelo Fino e Água Frígida) / PHB p. 185, 291 (Exaustão e Hipotermia)'
    };
  }

  // === calcCampThermalReflectorAndHypothermiaCare (Muro Refletor de Calor, Cantis Quentes e Cuidados de Hipotermia - DMG p. 110-112 / XGE p. 78) ===
  function calcCampThermalReflectorAndHypothermiaCare(biomeKey, careType, options) {
    options = options || {};
    var bk = (biomeKey || 'snow').toLowerCase();
    var ct = (careType || 'radiant_heat_stone_reflector_wall').toLowerCase();

    var care = {
      careTitle: 'Muro Refletor de Pedras Chatas a Sotavento da Fogueira',
      thermalReflectorEfficiency: 'Reflete 80% do calor radiante direto para o interior das barracas, elevando a temperatura ambiente em 15°C.',
      hypothermiaReversalRating: 'Reverte o avanço de exaustão por frio extremo; membros da comitiva acordam totalmente descansados.',
      sleepComfortAndExhaustionMitigation: 'Permite sono relaxante mesmo sob nevascas intensas externas sem necessidade de vigília sobre o fogo.',
      icon: '🪨🔥',
      color: '#ea580c'
    };

    if (ct === 'boiled_water_bladder_warming') {
      care = {
        careTitle: 'Bolsas Térmicas de Água Fervente Aos Pés dos Sacos de Dormir',
        thermalReflectorEfficiency: 'Cantis de metal envoltos em feltro colocados na base da cama retêm calor corporal por 6 horas.',
        hypothermiaReversalRating: 'Elimina calafrios noturnos e restaura a circulação periférica em dedos dormentes ou congelados.',
        sleepComfortAndExhaustionMitigation: 'Aventureiros recuperam 1 nível de exaustão adicional ao completarem um Descanso Longo aquecidos.',
        icon: '🏺💧',
        color: '#f59e0b'
      };
    } else if (ct === 'rapid_stripped_rewarming_triage') {
      care = {
        careTitle: 'Triagem Rápida de Resgate com Roupas Secas e Fricção de Lã',
        thermalReflectorEfficiency: 'Remoção instantânea de mantos ensopados e isolamento em casulos de mantas secas compartilhadas.',
        hypothermiaReversalRating: 'Corta imediatamente a perda térmica por evaporação em vítimas que caíram em lagos gelados.',
        sleepComfortAndExhaustionMitigation: 'Estabiliza a temperatura do aventureiro resgatado sem risco de choque térmico letal.',
        icon: '🧣🏕️',
        color: '#38bdf8'
      };
    } else if (ct === 'herbal_spiced_tallow_broth') {
      care = {
        careTitle: 'Caldo de Gordura com Sal e Raízes Picantes de Montanha',
        thermalReflectorEfficiency: 'Aporte calórico denso que ativa a termogênese interna do organismo dos aventureiros cansados.',
        hypothermiaReversalRating: 'Concede vantagem na primeira salvaguarda de Constituição contra o frio ao retomar a marcha ao amanhecer.',
        sleepComfortAndExhaustionMitigation: 'Aquece o peito e garganta, impedindo tosse e rouquidão provocadas pela inalação de ar glacial.',
        icon: '🍲🌿',
        color: '#84cc16'
      };
    }

    return {
      biomeKey: bk,
      careType: ct,
      careTitle: care.careTitle,
      thermalReflectorEfficiency: care.thermalReflectorEfficiency,
      hypothermiaReversalRating: care.hypothermiaReversalRating,
      sleepComfortAndExhaustionMitigation: care.sleepComfortAndExhaustionMitigation,
      icon: care.icon,
      color: care.color,
      dndRef: 'DMG p. 110-112 (Acampamento no Frio Severo) / XGE p. 78 (Engenharia de Acampamento)'
    };
  }

  // === calcWildernessVolcanicFumaroleAndNoxiousGasHazard (Fumarolas Vulcânicas, Cinza Ácida e Gases Asfixiantes - DMG p. 110 / PHB p. 183) ===
  function calcWildernessVolcanicFumaroleAndNoxiousGasHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'volcanic').toLowerCase();
    var ht = (hazardType || 'sulfur_fumarole_vent_erup').toLowerCase();

    var hazard = {
      hazardTitle: 'Gêiser de Fumarola Sulfurosa Superaquecida',
      saveDC: 14,
      saveType: 'Destreza',
      fumaroleDamageAndAsphyxiation: 'Erupção repentina de vapor cáustico; 2d8 de fogo + 2d6 de veneno e condição Envenenado por 1 minuto.',
      pioneerMitigation: 'Batedores atentos detectam silvo de pressão e crostas amarelas de enxofre desviando a marcha em 10 metros.',
      respiratoryCleansing: 'Afastar o companheiro atingido para o cume ventilado e irrigar queimaduras com água fresca sem cinzas.',
      icon: '🌋💨',
      color: '#ef4444'
    };

    if (ht === 'dense_acidic_ash_fall') {
      hazard = {
        hazardTitle: 'Chuva Densa de Cinzas Vulcânicas Abrasivas e Ácidas',
        saveDC: 13,
        saveType: 'Constituição',
        fumaroleDamageAndAsphyxiation: 'Irritação grave de olhos e pulmões; desvantagem em Percepção visual e tosse seca com microfissuras pulmonares.',
        pioneerMitigation: 'Óculos de proteção vedados com graxa e máscaras faciais de linho úmido evitam a inalação de partículas de vidro vulcânico.',
        respiratoryCleansing: 'Lavagem ocular com água salina morna e descanso em tenda vedada sem pó de cinza.',
        icon: '🌫️🔥',
        color: '#f97316'
      };
    } else if (ht === 'subterranean_magma_crust_radiance') {
      hazard = {
        hazardTitle: 'Crosta Fina de Basalto Sobre Lago Magmático Oculto',
        saveDC: 14,
        saveType: 'Constituição',
        fumaroleDamageAndAsphyxiation: 'Calor extremo irradiado pelo chão derretendo solas de bota; 1d10 de fogo por minuto e risco de Exaustão (DMG p. 110).',
        pioneerMitigation: 'Avançar pisando estritamente em cristas de rocha escura resfriada com reforço de placas de ferro nos calçados.',
        respiratoryCleansing: 'Descanso tático imediato com consumo dobrado de água para compensar a desidratação fulminante.',
        icon: '🪨🔥',
        color: '#ea580c'
      };
    } else if (ht === 'carbon_monoxide_depression_pocket') {
      hazard = {
        hazardTitle: 'Bolsão Invisível de Monóxido em Depressão de Cratera',
        saveDC: 15,
        saveType: 'Constituição',
        fumaroleDamageAndAsphyxiation: 'Gás pesado inodoro acumulado no fundo de fendas; queda Inconsciente por asfixia súbita (PHB p. 183).',
        pioneerMitigation: 'Observar a ausência de insetos e tochas que se apagam subitamente ao aproximar da borda da cavidade.',
        respiratoryCleansing: 'Içamento rápido com corda para terreno elevado ventilado e massagem torácica vigorosa.',
        icon: '☠️🕳️',
        color: '#71717a'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      fumaroleDamageAndAsphyxiation: hazard.fumaroleDamageAndAsphyxiation,
      pioneerMitigation: hazard.pioneerMitigation,
      respiratoryCleansing: hazard.respiratoryCleansing,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110 (Terrenos Vulcânicos e Gases) / PHB p. 183 (Dano de Fogo, Veneno e Asfixia)'
    };
  }

  // === calcCampAshFiltrationAndVentilationSeal (Filtros de Carvão, Vedação de Cinzas e Chaminé com Tiragem - DMG p. 111-112 / XGE p. 78) ===
  function calcCampAshFiltrationAndVentilationSeal(biomeKey, filtrationType, options) {
    options = options || {};
    var bk = (biomeKey || 'volcanic').toLowerCase();
    var ft = (filtrationType || 'activated_charcoal_breathing_veil').toLowerCase();

    var filtration = {
      filtrationTitle: 'Máscaras Faciais com Pó de Carvão Ativado e Vinagre',
      gasFiltrationEfficiency: 'Filtra 90% dos vapores de enxofre e partículas de cinza; concede vantagem em salvaguardas respiratórias.',
      tentSealingAndAshProtection: 'Permite que a comitiva descanse sem inalar poeira ácida mesmo durante erupções moderadas a sotavento.',
      sentryEyeAndLungCare: 'Sentinelas de vigília mantêm clareza pulmonar e foco visual nas trocas noturnas de turno.',
      icon: '😷🌿',
      color: '#84cc16'
    };

    if (ft === 'wet_clay_tent_flap_sealing') {
      filtration = {
        filtrationTitle: 'Vedação Hermética de Barracas com Argila Úmida e Cinza',
        gasFiltrationEfficiency: 'Barreira física contínua aplicada nas saias das lonas impedindo que o pó fino de basalto invada os sacos de dormir.',
        tentSealingAndAshProtection: 'Preserva provisões, cantis de água e mantas térmicas 100% livres de poeira tóxica abrasiva.',
        sentryEyeAndLungCare: 'Evita abrasão de córnea e irritações alérgicas nos olhos dos aventureiros enquanto dormem.',
        icon: '🏕️🧱',
        color: '#ca8a04'
      };
    } else if (ft === 'elevated_baffle_smoke_chimney') {
      filtration = {
        filtrationTitle: 'Chaminé Defletora de Pedras com Tiragem Superior Positiva',
        gasFiltrationEfficiency: 'Captura ar puro das correntes elevadas a 2 metros do solo enquanto gases pesados sulfídricos passam rente ao chão.',
        tentSealingAndAshProtection: 'Ventilação contínua e fresca no interior dos abrigos de pedra sem entrada de fumaça sufocante.',
        sentryEyeAndLungCare: 'Garante oxigenação ideal durante o sono da comitiva, prevenindo náuseas e dores de cabeça matinais.',
        icon: '🪵💨',
        color: '#38bdf8'
      };
    } else if (ft === 'eye_rinse_saline_flask') {
      filtration = {
        filtrationTitle: 'Estação de Limpeza Ocular com Cantil Salino Estéril',
        gasFiltrationEfficiency: 'Lavagem imediata de poeira vulcânica acumulada nos cantos dos olhos dos sentinelas após ventanias de cinza.',
        tentSealingAndAshProtection: 'Prevenção ativa de conjuntivite abrasiva e microarranhões na esclera ocular.',
        sentryEyeAndLungCare: 'Mantém a Percepção visual dos vigias em 100% de acuidade sem penalidades no turno da madrugada.',
        icon: '💧👁️',
        color: '#06b6d4'
      };
    }

    return {
      biomeKey: bk,
      filtrationType: ft,
      filtrationTitle: filtration.filtrationTitle,
      gasFiltrationEfficiency: filtration.gasFiltrationEfficiency,
      tentSealingAndAshProtection: filtration.tentSealingAndAshProtection,
      sentryEyeAndLungCare: filtration.sentryEyeAndLungCare,
      icon: filtration.icon,
      color: filtration.color,
      dndRef: 'DMG p. 111-112 (Acampamento em Terreno Vulcânico) / XGE p. 78 (Engenharia e Higiene de Acampamento)'
    };
  }

  // === calcWildernessExtremeHeatAndSunstrokeHazard (Calor Extremo, Insolação e Miragens nos Ermos - DMG p. 110 / PHB p. 185) ===
  function calcWildernessExtremeHeatAndSunstrokeHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'desert').toLowerCase();
    var ht = (hazardType || 'blistering_sunstroke_exposure').toLowerCase();

    var hazard = {
      hazardTitle: 'Insolação Tórrida sob Zênite Escaldante',
      saveDC: 12,
      saveType: 'Constituição',
      heatstrokeDamageAndExhaustion: 'Calor acima de 38°C (100°F); salvaguarda horária de CON (CD 5 + 1 por hora adicional) ou sofre 1 nível de Exaustão (DMG p. 110).',
      pioneerMitigation: 'Batedores recomendam descanso nas 4 horas de pico solar e marcha noturna fresca com mantas de linho leve.',
      hydrationAndCoolingCare: 'Consumo mínimo obrigatório de 8 litros de água fresca por aventureiro ao dia para evitar desidratação crítica.',
      icon: '☀️🔥',
      color: '#f59e0b'
    };

    if (ht === 'shimmering_desert_mirage_delusion') {
      hazard = {
        hazardTitle: 'Miragem Refrativa e Desorientação Espacial',
        saveDC: 13,
        saveType: 'Sabedoria',
        heatstrokeDamageAndExhaustion: 'Ondulações térmicas no horizonte simulam oásis inexistentes; teste de Percepção/Investigação para não desviar 1d4 horas da rota.',
        pioneerMitigation: 'Batedores com bússola solar e marcos de azimute ignoram distorções visuais e mantêm a comitiva no rumo correto.',
        hydrationAndCoolingCare: 'Umedecer panos sobre a fronte dos aventureiros afetados e recalibrar a rota com mapas celestes.',
        icon: '🏜️✨',
        color: '#eab308'
      };
    } else if (ht === 'superheated_abrasive_sandstorm') {
      hazard = {
        hazardTitle: 'Tempestade de Areia Cortante e Vento Férvido',
        saveDC: 13,
        saveType: 'Constituição',
        heatstrokeDamageAndExhaustion: 'Ventos abrasivos a mais de 60 km/h; visão pesadamente obscurecida, terreno difícil e risco de cegueira temporária por fagulhas de sílica.',
        pioneerMitigation: 'Envolver rosto e olhos com keffiyeh de tecido duplo e buscar abrigo imediato a sotavento de dunas altas ou cânions.',
        hydrationAndCoolingCare: 'Limpeza dos condutos oculares e nasais com gotas de água purificada e repouso agachado em grupo.',
        icon: '🌪️⏳',
        color: '#d97706'
      };
    } else if (ht === 'water_source_parched_alkali_well') {
      hazard = {
        hazardTitle: 'Poço de Oásis Alcalino e Água Salobra Tóxica',
        saveDC: 14,
        saveType: 'Sabedoria',
        heatstrokeDamageAndExhaustion: 'Água aparentemente potável saturada de sais minerais cáusticos; teste de Sobrevivência CD 14 ou sofre 2d8 de veneno e Envenenado.',
        pioneerMitigation: 'Especialistas em sobrevivência examinam crostas brancas de sal na borda do poço antes de permitir que os companheiros bebam.',
        hydrationAndCoolingCare: 'Filtração por carvão vegetal e areia fina seguida de fervura ou uso de Destiladores Solares de acampamento.',
        icon: '☠️💧',
        color: '#84cc16'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      heatstrokeDamageAndExhaustion: hazard.heatstrokeDamageAndExhaustion,
      pioneerMitigation: hazard.pioneerMitigation,
      hydrationAndCoolingCare: hazard.hydrationAndCoolingCare,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110 (Calor Extremo e Insolação) / PHB p. 185 (Exaustão e Necessidades Hídricas)'
    };
  }

  // === calcCampSolarStillAndShadeCanopy (Toldos Térmicos, Destiladores Solares e Condensação de Umidade - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampSolarStillAndShadeCanopy(biomeKey, canopyType, options) {
    options = options || {};
    var bk = (biomeKey || 'desert').toLowerCase();
    var ct = (canopyType || 'double_layered_thermal_shade_canopy').toLowerCase();

    var canopy = {
      canopyTitle: 'Toldo Duplo de Tecido Claro com Vão de Ventilação Térmica',
      thermalReductionAndShadeEffect: 'Reduz a temperatura ambiente sob o abrigo em até 10°C (20°F), eliminando a necessidade de salvaguardas horárias de calor.',
      moistureYieldAndSolarStill: 'Barreira refletiva branca suspensa a 30 cm do solo que canaliza brisas refrescantes sob a lona de repouso.',
      campRestAndExhaustionRecovery: 'Permite descanso curto ou longo revigorante com remoção padrão de Exaustão sem desgaste sob o sol a pino.',
      icon: '⛺☀️',
      color: '#38bdf8'
    };

    if (ct === 'deep_sand_trench_shaded_shelter') {
      canopy = {
        canopyTitle: 'Trincheira Escavada em Areia com Cobertura Refletiva',
        thermalReductionAndShadeEffect: 'Aproveita a temperatura até 15°C mais fria das camadas de solo a 60 cm de profundidade nas dunas.',
        moistureYieldAndSolarStill: 'Protege a comitiva e os fardos contra radiação infravermelha direta e tempestades de poeira rasteiras.',
        campRestAndExhaustionRecovery: 'Concede sono tranquilo para os sentinelas e montarias fora de serviço mesmo ao meio-dia.',
        icon: '🕳️🏕️',
        color: '#ca8a04'
      };
    } else if (ct === 'dew_condensation_solar_still_battery') {
      canopy = {
        canopyTitle: 'Bateria de Destiladores Solares e Coletores de Umidade',
        thermalReductionAndShadeEffect: 'Fosso circular com lona esticada e pedra central condensando vapor vegetal e umidade subterrânea em tigela limpa.',
        moistureYieldAndSolarStill: 'Produz de 4 a 8 litros de água destilada pura e fria por ciclo de descanso longo sem gastar magias.',
        campRestAndExhaustionRecovery: 'Abastece os cantis dos aventureiros e previne penalidades por desidratação na marcha seguinte.',
        icon: '💧☀️',
        color: '#06b6d4'
      };
    } else if (ct === 'subterranean_root_water_cache') {
      canopy = {
        canopyTitle: 'Poço de Capilaridade Radicular com Filtro de Cascalho',
        thermalReductionAndShadeEffect: 'Escavação rente a arbustos desérticos captando umidade retida por raízes profundas.',
        moistureYieldAndSolarStill: 'Filtração lenta e natural fornecendo água mineral límpida sem teor alcalino perigoso.',
        campRestAndExhaustionRecovery: 'Garante hidratação segura para montarias, animais de carga e todos os membros do grupo.',
        icon: '🌱🪨',
        color: '#84cc16'
      };
    }

    return {
      biomeKey: bk,
      canopyType: ct,
      canopyTitle: canopy.canopyTitle,
      thermalReductionAndShadeEffect: canopy.thermalReductionAndShadeEffect,
      moistureYieldAndSolarStill: canopy.moistureYieldAndSolarStill,
      campRestAndExhaustionRecovery: canopy.campRestAndExhaustionRecovery,
      icon: canopy.icon,
      color: canopy.color,
      dndRef: 'DMG p. 111 (Abastecimento Hídrico nos Ermos) / XGE p. 78 (Engenharia de Acampamento e Sobrevivência)'
    };
  }

  // === calcWildernessRockfallAndAvalancheHazard (Deslizamentos de Rochas, Avalanches e Tálus Íngremes - DMG p. 110 / PHB p. 182) ===
  function calcWildernessRockfallAndAvalancheHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'mountain').toLowerCase();
    var ht = (hazardType || 'scree_slope_rockfall_barrage').toLowerCase();

    var hazard = {
      hazardTitle: 'Deslizamento de Seixos e Chuva de Pedregulhos em Garganta',
      saveDC: 13,
      saveType: 'Destreza',
      rockfallDamageAndBurial: 'Queda repentina de rochas soltas; 3d10 de concussão e condição Caído, sendo parcialmente soterrado (PHB p. 182).',
      pioneerMitigation: 'Batedores examinam encostas instáveis e conduzem a comitiva em fila espaçada a 15 metros entre cada aventureiro.',
      clearingAndRescue: 'Teste de Força (Atletismo) CD 13 para escavar companheiros presos e estancar contusões com talas e gelo.',
      icon: '🪨💥',
      color: '#f97316'
    };

    if (ht === 'high_altitude_snow_avalanche') {
      hazard = {
        hazardTitle: 'Avalanche Massiva de Neve e Detritos em Encosta Íngreme',
        saveDC: 15,
        saveType: 'Força',
        rockfallDamageAndBurial: 'Muralha de neve compacta a 100 km/h; 8d10 de concussão (metade no sucesso), soterramento e risco de asfixia (DMG p. 110).',
        pioneerMitigation: 'Evitar gritos, estalos de chicote ou sons altos na base de cornijas nevadas e cruzar antes do degelo do meio-dia.',
        clearingAndRescue: 'Sondagem de emergência com varas compridas e escavação cooperativa rápida nos primeiros 5 minutos vitais.',
        icon: '❄️🏔️',
        color: '#38bdf8'
      };
    } else if (ht === 'unstable_ledge_cliffside_collapse') {
      hazard = {
        hazardTitle: 'Colapso de Cornija Rochosa em Trilha de Desfiladeiro',
        saveDC: 14,
        saveType: 'Destreza',
        rockfallDamageAndBurial: 'Rompimento da beirada do penhasco; queda vertical de 9 a 18 metros (3d6 a 6d6 de concussão) se não reagir a tempo.',
        pioneerMitigation: 'Batedores ancoram cordas guias com pitões cravados na rocha firme ao longo de todo o trecho fraturado.',
        clearingAndRescue: 'Içamento do membro da comitiva com roldanas de escalada e uso de bandagens compressivas contra fraturas.',
        icon: '🧗‍♂️⚡',
        color: '#ef4444'
      };
    } else if (ht === 'karst_chasm_gravel_sink') {
      hazard = {
        hazardTitle: 'Sumidouro Cárstico Oculto sob Camada de Cascalho',
        saveDC: 13,
        saveType: 'Destreza',
        rockfallDamageAndBurial: 'Abatimento repentino do chão de cascalho em funil subterrâneo; 2d8 de concussão e retenção até a cintura.',
        pioneerMitigation: 'Sondagem do solo à frente com bastão de caminhada de ferro antes de apoiar o peso do corpo na marcha.',
        clearingAndRescue: 'Lançamento de laço com corda de cânhamo e tração firme de dois aventureiros ancorados em terreno plano.',
        icon: '🕳️🪨',
        color: '#a8a29e'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      rockfallDamageAndBurial: hazard.rockfallDamageAndBurial,
      pioneerMitigation: hazard.pioneerMitigation,
      clearingAndRescue: hazard.clearingAndRescue,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110 (Avalanches e Quedas de Rochas) / PHB p. 182 (Dano de Queda e Soterramento)'
    };
  }

  // === calcCampRetainingWallAndPitonAnchoring (Muretas de Pedra Seca, Barricadas Defletoras e Ancoragem com Pitões - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampRetainingWallAndPitonAnchoring(biomeKey, defenseType, options) {
    options = options || {};
    var bk = (biomeKey || 'mountain').toLowerCase();
    var dt = (defenseType || 'dry_stone_deflector_retaining_wall').toLowerCase();

    var defense = {
      defenseTitle: 'Mureta de Pedra Seca em Cunha Defletora a Montante',
      retainingEfficiencyAndDeflection: 'Barreira angular de blocos de granito que desvia rochas rolantes e enxurradas de cascalho para as laterais do acampamento.',
      anchoringAndStructuralStability: 'Estrutura sem argamassa que drena água de degelo sem acumular pressão hidrostática perigosa.',
      campSafetyAndRestGuards: 'Garante repouso tranquilo para os aventureiros que dormem nas tendas sem risco de impactos noturnos.',
      icon: '🧱🪨',
      color: '#ca8a04'
    };

    if (dt === 'forged_steel_piton_crevice_anchoring') {
      defense = {
        defenseTitle: 'Ancoragem com Pitões de Aço Forjado em Fissuras de Rocha',
        retainingEfficiencyAndDeflection: 'Estacas de ferro temperado marteladas em fendas vivas segurando cabos de sustentação das lonas.',
        anchoringAndStructuralStability: 'Resiste a vendavais de montanha de até 80 km/h sem afrouxamento ou perda de tensão nas cordas.',
        campSafetyAndRestGuards: 'Impede que barracas sejam arrancadas para abismos enquanto os sentinelas vigiam os cumes vizinhos.',
        icon: '🔩🏕️',
        color: '#94a3b8'
      };
    } else if (dt === 'scree_catch_net_wire_barrier') {
      defense = {
        defenseTitle: 'Rede de Retenção de Cascalho com Trança de Arame e Estacas',
        retainingEfficiencyAndDeflection: 'Malha flexível fixada 5 metros acima das barracas retendo pequenos fragmentos e pedriscos soltos.',
        anchoringAndStructuralStability: 'Amortece a energia cinética de detritos que se desprendem espontaneamente durante o resfriamento noturno.',
        campSafetyAndRestGuards: 'Elimina barulhos intermitentes de pedras caindo nas lonas, facilitando a recuperação de magias no sono.',
        icon: '🕸️⛰️',
        color: '#38bdf8'
      };
    } else if (dt === 'overhang_cave_natural_boulder_baffle') {
      defense = {
        defenseTitle: 'Aproveitamento de Enseada Rochosa com Monólito Defletor',
        retainingEfficiencyAndDeflection: 'Seleção de abrigo sob teto natural de rocha sólida protegido por grande pedra estática à frente.',
        anchoringAndStructuralStability: 'Cobertura natural 100% impenetrável contra pedras em queda livre e avalanches laterais.',
        campSafetyAndRestGuards: 'Concede cobertura total para toda a comitiva e fogueira oculta sem assinatura de fumaça exposta.',
        icon: '🏔️🛡️',
        color: '#10b981'
      };
    }

    return {
      biomeKey: bk,
      defenseType: dt,
      defenseTitle: defense.defenseTitle,
      retainingEfficiencyAndDeflection: defense.retainingEfficiencyAndDeflection,
      anchoringAndStructuralStability: defense.anchoringAndStructuralStability,
      campSafetyAndRestGuards: defense.campSafetyAndRestGuards,
      icon: defense.icon,
      color: defense.color,
      dndRef: 'DMG p. 111 (Acampamento em Montanha) / XGE p. 78 (Engenharia de Abrigos e Defesas de Acampamento)'
    };
  }

  // === calcWildernessFlashFloodAndRiverRapidHazard (Trombas d'Água, Corredeiras Violentas e Vaus Traiçoeiros - DMG p. 110, 112 / PHB p. 182-183) ===
  function calcWildernessFlashFloodAndRiverRapidHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'river').toLowerCase();
    var ht = (hazardType || 'canyon_flash_flood_surge').toLowerCase();

    var hazard = {
      hazardTitle: 'Tromba d\'Água Súbita e Enxurrada em Cânion Fluvial',
      saveDC: 14,
      saveType: 'Força',
      floodDamageAndSweeping: 'Onda de cheia repentina trazendo lama e galhos a 40 km/h; 2d10 de concussão e arrasto de 18 metros a jusante com risco de perda de carga.',
      pioneerMitigation: 'Batedores identificam rugido grave a montante e coloração barrenta da água, escalando as margens para terra alta em 1 minuto.',
      waterRescueAndDrying: 'Lançamento de corda com nó de laço para resgatar membros arrastados e secagem imediata de alforjes em fogueira.',
      icon: '🌊⚡',
      color: '#0284c7'
    };

    if (ht === 'whitewater_rapids_cross_hazard') {
      hazard = {
        hazardTitle: 'Corredeiras Violentas com Rochas Submersas e Vórtices',
        saveDC: 13,
        saveType: 'Destreza',
        floodDamageAndSweeping: 'Turbulência de classe IV entre pedregulhos afiados; 2d6 de concussão, condição Caído e teste contra afogamento se submerso (PHB p. 183).',
        pioneerMitigation: 'Mapeamento de banco de seixos calmo a 50 metros e uso de bastão de apoio para manter três pontos de contato na travessia.',
        waterRescueAndDrying: 'Aventureiros em terra firme seguram corda esticada na transversal para ancorar quem cruza a vau.',
        icon: '🚣‍♂️💥',
        color: '#06b6d4'
      };
    } else if (ht === 'slimy_slippery_ford_stepping') {
      hazard = {
        hazardTitle: 'Vau de Lajes Escorregadias e Algas Fluviais',
        saveDC: 12,
        saveType: 'Destreza',
        floodDamageAndSweeping: 'Lajes polidas sob água rasa de 60 cm; queda súbita e perda de 1 turno com risco de ser levado pela correnteza.',
        pioneerMitigation: 'Batedores amarram tiras de corda de cânhamo ao redor das solas das botas para tração antiderrapante.',
        waterRescueAndDrying: 'Apoio mútuo de braços dados entre dois aventureiros corpulentos garantindo estabilidade na marcha.',
        icon: '🦶💧',
        color: '#10b981'
      };
    } else if (ht === 'undertow_submerged_syphon_whirlpool') {
      hazard = {
        hazardTitle: 'Redemoinho de Sucção Subaquática e Fenda Sifão',
        saveDC: 14,
        saveType: 'Força',
        floodDamageAndSweeping: 'Sucção para cavidade submersa na curva côncava do rio; condição Agarrado e asfixia por água se não desengajar em 2 rodadas.',
        pioneerMitigation: 'Reconhecimento prévio de espuma circular e redemoinhos superficiais contornando a curva pelo lado convexo de praia rasa.',
        waterRescueAndDrying: 'Tração imediata com gancho de escalada e reanimação cardiopulmonar à beira da margem.',
        icon: '🌀🏊‍♂️',
        color: '#6366f1'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      floodDamageAndSweeping: hazard.floodDamageAndSweeping,
      pioneerMitigation: hazard.pioneerMitigation,
      waterRescueAndDrying: hazard.waterRescueAndDrying,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110, 112 (Rios e Trombas d\'Água) / PHB p. 182-183 (Afogamento e Correntezas)'
    };
  }

  // === calcCampFloodClearanceAndRopeTraverse (Cota de Segurança contra Cheias, Tirolesas e Jangadas de Troncos - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampFloodClearanceAndRopeTraverse(biomeKey, techniqueType, options) {
    options = options || {};
    var bk = (biomeKey || 'river').toLowerCase();
    var tt = (techniqueType || 'high_ground_flood_clearance_perch').toLowerCase();

    var tech = {
      defenseTitle: 'Cota Elevada de Acampamento Fora da Faixa de Inundação',
      floodClearanceEfficiency: 'Posicionamento das barracas no mínimo 8 metros acima da cota normal do leito fluvial em terraço rochoso firme.',
      traverseAndCargoSecurity: 'Garante que subidas repentinas do rio durante tempestades na cabeceira passem longe dos sacos de dormir.',
      campRestAndSafetyGuards: 'Proporciona sono despreocupado para a comitiva com sentinelas monitorando o murmúrio das águas à distância.',
      icon: '🏕️⛰️',
      color: '#10b981'
    };

    if (tt === 'tyrolean_rope_traverse_rigging') {
      tech = {
        defenseTitle: 'Tirolesa Estaiada com Corda Dupla e Nós Prusik',
        floodClearanceEfficiency: 'Cabo mestre de seda trançada tensionado entre duas árvores maciças através da garganta do rio.',
        traverseAndCargoSecurity: 'Permite transporte aéreo seguro de provisões, baús e aventureiros a 4 metros acima das correntezas furiosas.',
        campRestAndSafetyGuards: 'Mantém equipamentos secos e prontos para uso, sem risco de calçados ensopados ou perdas materiais.',
        icon: '🧗‍♀️🪢',
        color: '#38bdf8'
      };
    } else if (tt === 'lashed_log_pontoon_raft') {
      tech = {
        defenseTitle: 'Jangada de Troncos Descascados com Estabilizadores Laterais',
        floodClearanceEfficiency: 'Plataforma flutuante com seis vigas leves amarradas em nós de barcaça suportando até 800 kg de carga.',
        traverseAndCargoSecurity: 'Transbordo estável de animais de carga e armaduras pesadas impulsionado por varas de bambu em vau largo.',
        campRestAndSafetyGuards: 'Pode ser ancorada na margem à noite servindo como píer de lavagem de suprimentos e pesca.',
        icon: '🪵🚣',
        color: '#ca8a04'
      };
    } else if (tt === 'wax_sealed_dry_storage_rig') {
      tech = {
        defenseTitle: 'Sacos Estanques Impermeabilizados com Resina e Sebo em Galhos Altos',
        floodClearanceEfficiency: 'Envoltórios de couro engraxado pendurados em galhos elevados acima do alcance de enxurradas e caranguejos fluviais.',
        traverseAndCargoSecurity: 'Proteção absoluta para pergaminhos, grimórios, rações de viagem e tochas contra umidade noturna.',
        campRestAndSafetyGuards: 'Garante fogo rápido pela manhã e pão de viagem seco para o café da comitiva.',
        icon: '🎒🛡️',
        color: '#f59e0b'
      };
    }

    return {
      biomeKey: bk,
      techniqueType: tt,
      defenseTitle: tech.defenseTitle,
      floodClearanceEfficiency: tech.floodClearanceEfficiency,
      traverseAndCargoSecurity: tech.traverseAndCargoSecurity,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Acampamento Ribanceiro) / XGE p. 78 (Engenharia Fluvial e Travessias)'
    };
  }

  // === calcWildernessRazorvineAndChokingBrierHazard (Vinha Cortante, Cipós Constritores e Espinheiros Venenosos - DMG p. 110 / PHB p. 183) ===
  function calcWildernessRazorvineAndChokingBrierHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var ht = (hazardType || 'tangled_razorvine_hedge').toLowerCase();

    var hazard = {
      hazardTitle: 'Emaranhado Denso de Vinhas Cortantes (Razorvine)',
      saveDC: 11,
      saveType: 'Destreza',
      vineDamageAndEntanglement: 'Cipós com garras afiadas como lâminas; 1d10 de dano cortante (2d10 em ritmo rápido) e rasgo em vestes de viagem (DMG p. 110).',
      pioneerMitigation: 'Batedores identificam bordas triangulares luzidias nas folhas e abrem trilha segura com golpes cadenciados de facão.',
      woundCareAndClearing: 'Aplicação imediata de pomada de calêndula e compressas limpas para estancar sangramentos superficiais.',
      icon: '🌿🗡️',
      color: '#84cc16'
    };

    if (ht === 'constricting_choking_creeper') {
      hazard = {
        hazardTitle: 'Cipó Constritor Asfixiante Oculto em Copa Baixa',
        saveDC: 13,
        saveType: 'Força',
        vineDamageAndEntanglement: 'Vinha predatória que laça o pescoço da retaguarda; 2d6 de concussão, condição Agarrado e asfixia progressiva se não cortada (PHB p. 183).',
        pioneerMitigation: 'Vigilância de sentinelas voltada para galhos suspensos e teste de Percepção para notar movimentos sem vento.',
        woundCareAndClearing: 'Golpe cortante certeiro de companheiro adjacente e massagem na traqueia do aventureiro resgatado.',
        icon: '🪴🐍',
        color: '#15803d'
      };
    } else if (ht === 'toxic_sleepthorn_thicket') {
      hazard = {
        hazardTitle: 'Bosque de Espinheiros Tóxicos Torporíficos',
        saveDC: 12,
        saveType: 'Constituição',
        vineDamageAndEntanglement: 'Agulhas vegetais impregnadas com seiva narcótica; 1d6 de perfuração e condição Envenenado por 1 hora com letargia motora.',
        pioneerMitigation: 'Uso de luvas grossas de lona encerada e botas de cano alto ao cruzar capoeiras fechadas.',
        woundCareAndClearing: 'Extração dos espinhos com pinça de ferro e infusão amarga de ervas estimulantes no acampamento.',
        icon: '🥀💤',
        color: '#a855f7'
      };
    } else if (ht === 'barbed_root_carpet_creepers') {
      hazard = {
        hazardTitle: 'Tapete de Raízes Farpadas e Abrolhos Vegetais',
        saveDC: 12,
        saveType: 'Destreza',
        vineDamageAndEntanglement: 'Raízes pontiagudas ocultas sob serapilheira; deslocamento reduzido à metade e 1d4 de perfuração a cada 1,5 m de avanço sem cuidado.',
        pioneerMitigation: 'Avanço cuidadoso pisando sobre troncos caídos e pedras firmes em cadência lenta de marcha.',
        woundCareAndClearing: 'Desinfecção de ferimentos plantares com álcool alquímico para evitar tétano e infecções nos ermos.',
        icon: '🌱⚠️',
        color: '#ca8a04'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      vineDamageAndEntanglement: hazard.vineDamageAndEntanglement,
      pioneerMitigation: hazard.pioneerMitigation,
      woundCareAndClearing: hazard.woundCareAndClearing,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110 (Razorvine e Perigos Vegetais) / PHB p. 183 (Dano Cortante e Asfixia)'
    };
  }

  // === calcCampClearingMacheteAndProtectiveGaiters (Roçagem de Perímetro, Perneiras de Couro e Anel de Cal - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampClearingMacheteAndProtectiveGaiters(biomeKey, clearanceType, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var ct = (clearanceType || 'heavy_machete_perimeter_clearing').toLowerCase();

    var tech = {
      defenseTitle: 'Roçagem Perimetral Ampla com Facão Pesado e Queima de Raízes',
      clearanceEfficiencyAndProtection: 'Abertura de faixa desimpedida de 6 metros ao redor das barracas, removendo trepadeiras agressivas e arbustos densos.',
      gaitersAndPersonalSafety: 'Elimina pontos cegos de emboscada vegetal e impede que vinhas invasoras alcancem os sacos de dormir.',
      campRestAndSafetyGuards: 'Garante linha de visão desobstruída para os sentinelas noturnos vigiarem a mata circundante.',
      icon: '🪓🏕️',
      color: '#16a34a'
    };

    if (ct === 'reinforced_leather_gaiters_greaves') {
      tech = {
        defenseTitle: 'Perneiras de Couro Cru Reforçado e Grevas com Sebo',
        clearanceEfficiencyAndProtection: 'Proteção física estendida do tornozelo ao joelho imune a cortes de vinhas e espinhos pontiagudos.',
        gaitersAndPersonalSafety: 'Concede vantagem em salvaguardas de Destreza e Constituição contra plantas carnívoras e cipós cortantes.',
        campRestAndSafetyGuards: 'Permite que os guardas patrulhem o entorno do acampamento sem receio de ferimentos nos pés e pernas.',
        icon: '🥾🛡️',
        color: '#ca8a04'
      };
    } else if (ct === 'quicklime_ash_root_barrier_ring') {
      tech = {
        defenseTitle: 'Anel Defensivo de Cal Virgem e Cinza Cauterizante',
        clearanceEfficiencyAndProtection: 'Cordão contínuo de cinzas alcalinas polvilhado ao redor da área de repouso desidratando brotos rastejantes.',
        gaitersAndPersonalSafety: 'Barreira química que impede a aproximação de gavinhas constritoras subterrâneas durante a madrugada.',
        campRestAndSafetyGuards: 'Proporciona sono seguro para todos os membros do grupo sem risco de intrusões botânicas silenciosas.',
        icon: '⚪🌿',
        color: '#e2e8f0'
      };
    } else if (ct === 'pruning_hook_canopy_inspection') {
      tech = {
        defenseTitle: 'Vara de Podar com Gancho Curvo para Varredura Aérea',
        clearanceEfficiencyAndProtection: 'Inspeção meticulosa dos galhos suspensos acima das barracas, derrubando cipós parasitas e favos venenosos.',
        gaitersAndPersonalSafety: 'Neutraliza o risco de desabamento de galhos podres ou botes verticais de cipós asfixiantes.',
        campRestAndSafetyGuards: 'Assegura um dossel limpo e seguro para ancoragem de redes e lonas impermeáveis de chuva.',
        icon: '🪝🌳',
        color: '#38bdf8'
      };
    }

    return {
      biomeKey: bk,
      clearanceType: ct,
      defenseTitle: tech.defenseTitle,
      clearanceEfficiencyAndProtection: tech.clearanceEfficiencyAndProtection,
      gaitersAndPersonalSafety: tech.gaitersAndPersonalSafety,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Segurança de Acampamento) / XGE p. 78 (Engenharia de Terreno e Ferramentas)'
    };
  }

  // === calcWildernessParasiteSwarmAndVectorHazard (Enxames de Insetos, Parasitas Hematófagos e Vetores de Doença - DMG p. 110, 257 / PHB p. 183) ===
  function calcWildernessParasiteSwarmAndVectorHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'swamp').toLowerCase();
    var ht = (hazardType || 'blood_mosquito_cloud_vector').toLowerCase();

    var hazard = {
      hazardTitle: 'Nuvem Densa de Mosquitos de Brejo e Vetores de Febre',
      saveDC: 12,
      saveType: 'Constituição',
      parasiteDamageAndInfection: 'Milhares de insetos ferroando simultaneamente; 2d4 de perfuração e risco de contrair Febre do Pântano (DMG p. 257).',
      pioneerMitigation: 'Batedores utilizam capuzes de malha fina e orientam a comitiva a evitar lagoas estagnadas sob o crepúsculo.',
      leechRemovalAndSanitizing: 'Aplicação de pasta de vinagre com sal para aliviar coceiras e banho com água fervida para desinfecção cutânea.',
      icon: '🦟🩸',
      color: '#ef4444'
    };

    if (ht === 'submerged_mud_leech_cluster') {
      hazard = {
        hazardTitle: 'Infestação Oculta de Sanguessugas de Lama em Vau',
        saveDC: 13,
        saveType: 'Sabedoria',
        parasiteDamageAndInfection: 'Anelídeos hematófagos fixados nos membros inferiores; 1d6 de dano de sangramento sem dor e fraqueza muscular gradual.',
        pioneerMitigation: 'Vistoria obrigatória a cada travessia de mangue com meias amarradas firmes por fora das calças.',
        leechRemovalAndSanitizing: 'Uso de ponta de faca aquecida na brasa ou punhado de sal mineral para descolar os parasitas sem rasgar a pele.',
        icon: '🪱💧',
        color: '#854d0e'
      };
    } else if (ht === 'burrowing_ground_hornet_nest') {
      hazard = {
        hazardTitle: 'Enxame de Maribondos da Terra em Solo Escavado',
        saveDC: 13,
        saveType: 'Destreza',
        parasiteDamageAndInfection: 'Ataque furioso ao pisar em ninho subterrâneo; 2d8 de veneno e condição Envenenado por 10 minutos (PHB p. 183).',
        pioneerMitigation: 'Sentinelas de vanguarda reconhecem montículos de terra batida com zumbido ativo e sinalizam desvio imediato.',
        leechRemovalAndSanitizing: 'Compressas geladas de barro úmido com folhas maceradas de tanchagem para neutralizar o veneno.',
        icon: '🐝⚡',
        color: '#f59e0b'
      };
    } else if (ht === 'decaying_bark_rot_grub_larvae') {
      hazard = {
        hazardTitle: 'Larvas Putrefatas de Tronco Caído (Rot Grubs)',
        saveDC: 14,
        saveType: 'Destreza',
        parasiteDamageAndInfection: 'Larvas necrófagas que saltam ao tocar cascas podres; enterram na carne causando 1d6 de dano por turno até queimadas com fogo.',
        pioneerMitigation: 'Batedores proíbem sentar em troncos umedecidos sem antes raspar a casca com o cutelo de sobrevivência.',
        leechRemovalAndSanitizing: 'Cauterização instantânea com tocha acesa na ferida nos primeiros 6 segundos para exterminar as larvas.',
        icon: '🐛🔥',
        color: '#71717a'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      parasiteDamageAndInfection: hazard.parasiteDamageAndInfection,
      pioneerMitigation: hazard.pioneerMitigation,
      leechRemovalAndSanitizing: hazard.leechRemovalAndSanitizing,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110, 257 (Doenças e Enxames dos Ermos) / PHB p. 183 (Dano de Perfuração e Veneno)'
    };
  }

  // === calcCampSmokeSmudgePotAndCitronellaRepellent (Defumadores Aromáticos, Telas Mosquiteiras e Unguentos Repelentes - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampSmokeSmudgePotAndCitronellaRepellent(biomeKey, repellentType, options) {
    options = options || {};
    var bk = (biomeKey || 'swamp').toLowerCase();
    var rt = (repellentType || 'smoke_smudge_pot_brazier').toLowerCase();

    var tech = {
      defenseTitle: 'Defumadores de Folhas de Pinho, Artemísia e Citronela',
      repellentEfficiencyAndArea: 'Brasas lentas em vasos de barro gerando névoa aromática que repele 100% dos insetos em raio de 9 metros.',
      nettingAndBeddingSafety: 'Fumaça suave e agradável que purifica o ar do acampamento sem irritar as vias aéreas da comitiva.',
      campRestAndSafetyGuards: 'Assegura noite inteira de descanso revigorante sem interrupções por zumbidos ou picadas hematófagas.',
      icon: '🏺💨',
      color: '#10b981'
    };

    if (rt === 'waxed_gauze_netting_hammock') {
      tech = {
        defenseTitle: 'Telas Mosquiteiras de Gaze Encerada e Camas Suspensas',
        repellentEfficiencyAndArea: 'Envoltório completo de tecido poroso impermeabilizado com cera vegetal suspenso entre troncos firmes.',
        nettingAndBeddingSafety: 'Barreira física intransponível contra parasitas voadores e rastejantes a 1 metro de distância do solo úmido.',
        campRestAndSafetyGuards: 'Mantém os aventureiros e guardas protegidos enquanto dormem, preservando vigor pleno para a marcha.',
        icon: '🕸️🛏️',
        color: '#38bdf8'
      };
    } else if (rt === 'camphor_tallow_sulfur_salve') {
      tech = {
        defenseTitle: 'Unguento Repelente de Cânfora, Sebo e Flor de Enxofre',
        repellentEfficiencyAndArea: 'Pomada oleosa aplicada nas juntas, canelas e nuca dos membros da comitiva antes das rondas de vigília.',
        nettingAndBeddingSafety: 'Concede vantagem em todas as salvaguardas contra vetores infecciosos e mascara o odor de suor humano.',
        campRestAndSafetyGuards: 'Sentinelas realizam patrulhas perimetrais confortáveis mesmo nas margens pantanosas mais densas.',
        icon: '🧴🌿',
        color: '#ca8a04'
      };
    } else if (rt === 'salt_flask_heated_blade_station') {
      tech = {
        defenseTitle: 'Estação de Desparasitação com Cantil Salino e Lâmina Quente',
        repellentEfficiencyAndArea: 'Mesa de cuidados táticos montada perto do fogo para inspeção e remoção anatômica de sanguessugas e carrapatos.',
        nettingAndBeddingSafety: 'Extração segura e estéril impedindo regurgitação de toxinas ou infecções bacterianas secundárias.',
        campRestAndSafetyGuards: 'Garante que todos os aventureiros iniciem o descanso longo com o corpo 100% limpo e higienizado.',
        icon: '🧂🗡️',
        color: '#f59e0b'
      };
    }

    return {
      biomeKey: bk,
      repellentType: rt,
      defenseTitle: tech.defenseTitle,
      repellentEfficiencyAndArea: tech.repellentEfficiencyAndArea,
      nettingAndBeddingSafety: tech.nettingAndBeddingSafety,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Higiene de Acampamento) / XGE p. 78 (Engenharia de Terreno e Repelentes)'
    };
  }

  // === calcWildernessWildMagicAndArcaneFalloutHazard (Magia Selvagem, Zonas de Magia Morta e Resíduos Mágicos - DMG p. 109, 136 / TCoE p. 150) ===
  function calcWildernessWildMagicAndArcaneFalloutHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'arcane').toLowerCase();
    var ht = (hazardType || 'wild_magic_eldritch_distortion').toLowerCase();

    var hazard = {
      hazardTitle: 'Fenda de Magia Selvagem e Distorção Étnica Flutuante',
      saveDC: 13,
      saveType: 'Sabedoria',
      arcaneFalloutAndSurge: 'Oscilação repentina no tecido mágico; 2d8 de dano de força e risco de efeito caótico imprevisível da tabela de magia selvagem (TCoE p. 150).',
      pioneerMitigation: 'Batedores atentos notam arrepios na nuca e cabelos eriçados, contornando bolsas de ar cintilante a 20 metros.',
      arcaneCleansingAndGrounding: 'Canalizar o excesso de carga telúrica cravando lâminas de aço no solo úmido e beber água destilada.',
      icon: '✨🔮',
      color: '#c084fc'
    };

    if (ht === 'dead_magic_sinkhole_void') {
      hazard = {
        hazardTitle: 'Zona de Magia Morta e Vazio Antimagia Natural',
        saveDC: 13,
        saveType: 'Inteligência',
        arcaneFalloutAndSurge: 'Apagamento completo de auras mágicas e itens encantados; teste de Arcanismo para não desorientar bússolas e runas (DMG p. 136).',
        pioneerMitigation: 'Navegação baseada estritamente em marcos estelares e bússolas mecânicas magnéticas de bronze.',
        arcaneCleansingAndGrounding: 'Avançar em linha reta até ultrapassar a bolha neutra e reenergizar talismãs em fogueiras convencionais.',
        icon: '🕳️🚫',
        color: '#94a3b8'
      };
    } else if (ht === 'fey_glimmer_hallucination_mist') {
      hazard = {
        hazardTitle: 'Bruma de Poeira Feérica e Alucinações Ópticas',
        saveDC: 12,
        saveType: 'Sabedoria',
        arcaneFalloutAndSurge: 'Vapores bioluminescentes coloridos; condição Enfeitiçado por 10 minutos e desorientação de rota por miragens celestes.',
        pioneerMitigation: 'Amarrar lenços umedecidos em vinagre sobre o nariz e manter a comitiva atada por corda guia de caminhada.',
        arcaneCleansingAndGrounding: 'Estapear as bochechas dos companheiros enfeitiçados e focar a atenção na chama firme de uma tocha acesa.',
        icon: '🧚‍♀️🌌',
        color: '#e879f9'
      };
    } else if (ht === 'desecrated_battlefield_radiation') {
      hazard = {
        hazardTitle: 'Solo Profanado de Antigo Campo de Guerra Arcano',
        saveDC: 13,
        saveType: 'Constituição',
        arcaneFalloutAndSurge: 'Radiação necrótica residual; impede recuperação natural de PV em descanso curto e impõe 1d6 de dano necrótico por hora (DMG p. 110).',
        pioneerMitigation: 'Especialistas religiosos reconhecem ossadas petrificadas e guiam o grupo por encostas ventiladas de pedra viva.',
        arcaneCleansingAndGrounding: 'Aspersão de água benta sobre a sola das botas e orações de proteção antes de cruzar valas de combate.',
        icon: '☠️⚡',
        color: '#f43f5e'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      arcaneFalloutAndSurge: hazard.arcaneFalloutAndSurge,
      pioneerMitigation: hazard.pioneerMitigation,
      arcaneCleansingAndGrounding: hazard.arcaneCleansingAndGrounding,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 109, 136 (Zonas Mágicas e Terreno Profanado) / TCoE p. 150 (Perigos Sobrenaturais)'
    };
  }

  // === calcCampGlyphicWardsAndChalkCirclePerimeter (Círculo de Sal e Prata, Aterramento Arcano e Incenso Consagrado - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampGlyphicWardsAndChalkCirclePerimeter(biomeKey, wardType, options) {
    options = options || {};
    var bk = (biomeKey || 'arcane').toLowerCase();
    var wt = (wardType || 'consecrated_silver_salt_chalk_ring').toLowerCase();

    var tech = {
      defenseTitle: 'Círculo de Giz Consagrado, Sal Grosso e Prata Triturada',
      wardEfficiencyAndContainment: 'Traçado contínuo ao redor das barracas que bloqueia oscilações de magia selvagem e alerta sobre intrusões incorpóreas.',
      groundingAndArcaneStability: 'Mantém a integridade mental dos conjuradores durante o sono, permitindo descanso pleno sem pesadelos mágicos.',
      campRestAndSafetyGuards: 'Proporciona sono tranquilo e seguro para toda a comitiva com sentinelas protegidos contra encantos e possessões.',
      icon: '⭕🧂',
      color: '#e2e8f0'
    };

    if (wt === 'cold_iron_ley_grounding_spikes') {
      tech = {
        defenseTitle: 'Estacas de Ferro Frio e Cobre para Aterramento de Linhas de Ley',
        wardEfficiencyAndContainment: 'Quatro estacas cravadas nos pontos cardeais canalizando surtos arcanos e eletrostática mágica para a terra profunda.',
        groundingAndArcaneStability: 'Neutraliza 100% de centelhas espontâneas e faíscas cósmicas que poderiam incendiar as lonas das barracas.',
        campRestAndSafetyGuards: 'Assegura estabilidade para foco arcano, preparação de magias matinais e alívio de fadiga mágica.',
        icon: '🔩⚡',
        color: '#38bdf8'
      };
    } else if (wt === 'amethyst_pendulum_resonance_chime') {
      tech = {
        defenseTitle: 'Carrilhão de Ametistas e Pêndulo de Ressonância Planar',
        wardEfficiencyAndContainment: 'Pêndulo suspenso na entrada do acampamento vibrando e tilintando sinos de prata diante de distorções no éter.',
        groundingAndArcaneStability: 'Alarme místico antecipado que acorda instantaneamente os guardas 3 rodadas antes de uma fenda planar se abrir.',
        campRestAndSafetyGuards: 'Elimina o fator surpresa em ataques de criaturas etéreas ou flutuações anômalas de mana.',
        icon: '🔔🔮',
        color: '#c084fc'
      };
    } else if (wt === 'blessed_frankincense_censer_brazier') {
      tech = {
        defenseTitle: 'Braseiro Purificador com Resina de Olíbano e Sálvia Branca',
        wardEfficiencyAndContainment: 'Fumaça sagrada que dissolve miasmas de profanação e concede +1 em salvaguardas mentais a todos no acampamento.',
        groundingAndArcaneStability: 'Restaura o equilíbrio espiritual dos aventureiros, purificando a aura do local para descanso longo eficiente.',
        campRestAndSafetyGuards: 'Garante recuperação regular de pontos de vida mesmo quando acampando nas cercanias de ruínas amaldiçoadas.',
        icon: '💨🔥',
        color: '#ca8a04'
      };
    }

    return {
      biomeKey: bk,
      wardType: wt,
      defenseTitle: tech.defenseTitle,
      wardEfficiencyAndContainment: tech.wardEfficiencyAndContainment,
      groundingAndArcaneStability: tech.groundingAndArcaneStability,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Proteções Sobrenaturais) / XGE p. 78 (Engenharia de Terreno e Rituais de Vigília)'
    };
  }

  // === calcWildernessBlizzardAndWhiteoutHazard (Nevasca Ártica, Vento Branco e Cegueira Glacial - DMG p. 110 / PHB p. 185) ===
  function calcWildernessBlizzardAndWhiteoutHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'snow').toLowerCase();
    var ht = (hazardType || 'raging_arctic_blizzard_whiteout').toLowerCase();

    var hazard = {
      hazardTitle: 'Nevasca Ártica e Desorientação Total de Vento Branco (Whiteout)',
      saveDC: 13,
      saveType: 'Constituição',
      blizzardDamageAndDisorientation: 'Vendaval a -20°C com neve horizontal; visibilidade nula, salvaguarda horária contra 1 nível de Exaustão e congelamento (DMG p. 110).',
      pioneerMitigation: 'Batedores amarram a comitiva em corda mestra de segurança e mantêm ritmo lento com bastões de sondagem.',
      frostbiteAndRewarming: 'Descongelar extremidades em contato pele a pele sem fricção e ingerir caldos quentes gordurosos no abrigo.',
      icon: '❄️🌪️',
      color: '#38bdf8'
    };

    if (ht === 'crevasse_snow_bridge_collapse') {
      hazard = {
        hazardTitle: 'Colapso de Ponte de Neve Sobre Fenda de Geleira',
        saveDC: 14,
        saveType: 'Destreza',
        blizzardDamageAndDisorientation: 'Camada fina de neve cedendo sob os pés; queda de 6 a 15 metros em fenda gélida (2d6 a 5d6 de concussão) e aprisionamento em gelo azul.',
        pioneerMitigation: 'Sondagem contínua com vara de freixo e avanço em zigue-zague guiado pelo batedor experiente em relevo glacial.',
        frostbiteAndRewarming: 'Içamento do companheiro com polias de escalada e uso imediato de mantas térmicas de lã espessa.',
        icon: '🕳️🧊',
        color: '#0284c7'
      };
    } else if (ht === 'wind_driven_ice_shard_barrage') {
      hazard = {
        hazardTitle: 'Chuva de Agulhas e Cristais de Gelo Impulsionados por Vendaval',
        saveDC: 12,
        saveType: 'Destreza',
        blizzardDamageAndDisorientation: 'Rajadas de gelo afiado a 70 km/h; 1d8 cortante + 1d6 de frio e risco de laceração de córneas desprotegidas.',
        pioneerMitigation: 'Uso de óculos de osso com fendas estreitas de visão e capuzes de pele com borda de pelo de carcaju.',
        frostbiteAndRewarming: 'Proteção do rosto a sotavento e aplicação de bálsamo seboso sobre queimaduras de frio superficiais.',
        icon: '🌨️🗡️',
        color: '#06b6d4'
      };
    } else if (ht === 'extreme_hypothermia_numbness') {
      hazard = {
        hazardTitle: 'Letargia Criogênica e Hipotermia Periférica Severa',
        saveDC: 13,
        saveType: 'Constituição',
        blizzardDamageAndDisorientation: 'Perda de calor corporal por imersão ou umidade; desvantagem em testes de perícia e salvaguardas físicas por dormência motora.',
        pioneerMitigation: 'Troca obrigatória de meias úmidas na pausa de marcha e consumo regular de gordura e chás secos.',
        frostbiteAndRewarming: 'Repouso imediato em saco de dormir duplo com garrafas de pedra quente junto à virilha e axilas.',
        icon: '🥶🩸',
        color: '#818cf8'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      blizzardDamageAndDisorientation: hazard.blizzardDamageAndDisorientation,
      pioneerMitigation: hazard.pioneerMitigation,
      frostbiteAndRewarming: hazard.frostbiteAndRewarming,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110 (Frio Extremo e Nevascas) / PHB p. 185 (Exaustão e Hipotermia)'
    };
  }

  // === calcCampSnowTrenchQuinzheeAndFurBedding (Trincheiras de Neve Quinzhee, Fogueira Dakota e Peles de Rena - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampSnowTrenchQuinzheeAndFurBedding(biomeKey, shelterType, options) {
    options = options || {};
    var bk = (biomeKey || 'snow').toLowerCase();
    var st = (shelterType || 'compacted_quinzhee_dome_shelter').toLowerCase();

    var tech = {
      defenseTitle: 'Cúpula Quinzhee de Neve Compactada e Escavação Térmica',
      thermalInsulationEfficiency: 'Blocos de neve sinterizada com vão de ar que mantêm +2°C interno mesmo sob temperatura exterior de -30°C.',
      fireAndVentilationSecurity: 'Chaminé estreita perfurada no topo permitindo exaustão de ar viciado e velas de sebo sem perda térmica.',
      campRestAndSafetyGuards: 'Suspende 100% das salvaguardas de frio extremo e garante descanso longo revigorante para a comitiva.',
      icon: '🏕️❄️',
      color: '#38bdf8'
    };

    if (st === 'subterranean_dakota_fire_hole') {
      tech = {
        defenseTitle: 'Fogueira Subterrânea Dakota com Túnel de Tiragem Oculto',
        thermalInsulationEfficiency: 'Dois poços interligados no solo congelado que maximizam a queima de lenha seca com quase zero fumaça visível.',
        fireAndVentilationSecurity: 'Concentra o calor diretamente nos caldeirões de ensopado sem aquecer nem derreter as paredes de neve do abrigo.',
        campRestAndSafetyGuards: 'Permite cocção de rações quentes e derretimento de neve potável em total furtividade térmica noturna.',
        icon: '🔥🕳️',
        color: '#f97316'
      };
    } else if (st === 'caribou_fur_pelt_spruce_bedding') {
      tech = {
        defenseTitle: 'Estrado Isolante de Ramos de Abeto e Peles de Rena Duplas',
        thermalInsulationEfficiency: 'Camada de 30 cm de ramagens coníferas sob peles espessas com fibras ocas bloqueando a condução do gelo.',
        fireAndVentilationSecurity: 'Mantém os sacos de dormir perfeitamente secos e isolados contra umidade por condensação no solo.',
        campRestAndSafetyGuards: 'Proporciona conforto postural para os aventureiros recuperarem dados de vida e níveis de exaustão.',
        icon: '🦌🌲',
        color: '#10b981'
      };
    } else if (st === 'blizzard_tether_rope_lifeline') {
      tech = {
        defenseTitle: 'Linha de Vida Guia com Corda Tensionada entre Tendas e Vigília',
        thermalInsulationEfficiency: 'Cabo mestre de seda esticado entre a porta do abrigo e o ponto de sentinela a sotavento da crista.',
        fireAndVentilationSecurity: 'Permite trocas de turno cegas em meio a vendavais de neve sem risco de o vigia se desorientar no escuro.',
        campRestAndSafetyGuards: 'Elimina acidentes de sentinelas desgarrados e garante segurança absoluta nas rondas noturnas.',
        icon: '🪢🏔️',
        color: '#ca8a04'
      };
    }

    return {
      biomeKey: bk,
      shelterType: st,
      defenseTitle: tech.defenseTitle,
      thermalInsulationEfficiency: tech.thermalInsulationEfficiency,
      fireAndVentilationSecurity: tech.fireAndVentilationSecurity,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Acampamento no Gelo) / XGE p. 78 (Engenharia de Terreno e Abrigos de Inverno)'
    };
  }

  // === calcWildernessHighAltitudeHypoxiaAndThinAirHazard (Rarefação de Oxigênio, Hipóxia e Mal da Altitude - DMG p. 110 / PHB p. 183) ===
  function calcWildernessHighAltitudeHypoxiaAndThinAirHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'mountain').toLowerCase();
    var ht = (hazardType || 'acute_mountain_sickness_hypoxia').toLowerCase();

    var hazard = {
      hazardTitle: 'Mal da Montanha Agudo e Hipóxia em Ar Rarefeito',
      saveDC: 12,
      saveType: 'Constituição',
      altitudeDamageAndHypoxia: 'Altitude acima de 3.000 metros (10.000 pés); salvaguarda horária de CON ou sofre 1 nível de Exaustão por falta de oxigênio (DMG p. 110).',
      pioneerMitigation: 'Batedores conduzem ritmo cadenciado com paradas de 10 minutos a cada hora para equalização pulmonar da comitiva.',
      oxygenRecoveryAndAcclimatization: 'Inalação de vapores de cânfora e repouso deitado com a cabeça elevada em relação ao tórax.',
      icon: '🏔️🫁',
      color: '#38bdf8'
    };

    if (ht === 'thermal_updraft_cliff_vertigo') {
      hazard = {
        hazardTitle: 'Correntes Térmicas Ascendentes e Vertigem de Precipício',
        saveDC: 13,
        saveType: 'Sabedoria',
        altitudeDamageAndHypoxia: 'Rajadas súbitas de ar quente que sobem do vale criando vertigem visual; perda de equilíbrio e condição Caído à beira do abismo.',
        pioneerMitigation: 'Caminhar encostado na parede de rocha interior mantendo corda de retinida presa aos arreios dos companheiros.',
        oxygenRecoveryAndAcclimatization: 'Sentar imediatamente contra a rocha firme, fixar o olhar em ponto estático no chão e respirar fundo.',
        icon: '🧗‍♀️🌪️',
        color: '#ca8a04'
      };
    } else if (ht === 'gravitational_pocket_distortion') {
      hazard = {
        hazardTitle: 'Bolso Anômalo de Microgravidade em Crista Planar',
        saveDC: 13,
        saveType: 'Destreza',
        altitudeDamageAndHypoxia: 'Flutuação gravitacional imprevisível; saltos descontrolados, deslocamento reduzido à metade e risco de queda vertical de 6 metros.',
        pioneerMitigation: 'Uso de botas de solado pesado de chumbo e fixação contínua de mosquetões em cabos de segurança de aço.',
        oxygenRecoveryAndAcclimatization: 'Tração de recolhimento por companheiros ancorados e redistribuição uniforme do peso dos alforjes.',
        icon: '🌌⚖️',
        color: '#c084fc'
      };
    } else if (ht === 'alpine_solar_uv_retina_burn') {
      hazard = {
        hazardTitle: 'Radiação Ultravioleta Alpina e Cegueira da Neve',
        saveDC: 12,
        saveType: 'Constituição',
        altitudeDamageAndHypoxia: 'Reflexão solar intensa em altitude com ar fino; queimação de córnea, lacrimejamento e desvantagem em Percepção visual.',
        pioneerMitigation: 'Aplicação de carvão vegetal moído sob as órbitas oculares e uso de máscaras de couro com frestas de visão.',
        oxygenRecoveryAndAcclimatization: 'Lavagem dos olhos com compressas de chá de camomila frio e descanso em ambiente totalmente escurecido.',
        icon: '☀️👁️',
        color: '#f59e0b'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      altitudeDamageAndHypoxia: hazard.altitudeDamageAndHypoxia,
      pioneerMitigation: hazard.pioneerMitigation,
      oxygenRecoveryAndAcclimatization: hazard.oxygenRecoveryAndAcclimatization,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110 (Grande Altitude e Hipóxia) / PHB p. 183 (Asfixia e Exaustão)'
    };
  }

  // === calcCampAcclimatizationBivouacAndOxygenTrap (Bivaques de Aclimatação, Inaladores de Musgo e Redes Suspensas - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampAcclimatizationBivouacAndOxygenTrap(biomeKey, acclimatizationType, options) {
    options = options || {};
    var bk = (biomeKey || 'mountain').toLowerCase();
    var at = (acclimatizationType || 'staged_altitude_bivouac_terrace').toLowerCase();

    var tech = {
      defenseTitle: 'Bivaque Escavado de Aclimatação em Terraço Protegido',
      altitudeAdaptationEfficiency: 'Abrigo intermediário a sotavento que reduz pela metade o tempo biológico de adaptação à altitude da comitiva.',
      oxygenAndWindShieldProtection: 'Nicho natural escavado que bloqueia 100% das rajadas de cume e preserva a pressão de ar interior.',
      campRestAndSafetyGuards: 'Permite descanso curto ou longo restaurador sem penalidades respiratórias para conjuradores e guerreiros.',
      icon: '🏕️⛰️',
      color: '#10b981'
    };

    if (at === 'alpine_moss_oxygen_inhaler') {
      tech = {
        defenseTitle: 'Inalador de Tecido com Musgo Esponjoso e Essência de Menta',
        altitudeAdaptationEfficiency: 'Dispositivo facial leve que umedece o ar rarefeito e dilata os brônquios pulmonares durante o sono.',
        oxygenAndWindShieldProtection: 'Concede vantagem em todas as salvaguardas de Constituição contra hipóxia e fadiga de cume.',
        campRestAndSafetyGuards: 'Sentinelas de vigília mantêm clareza mental e acuidade auditiva perfeita durante os turnos noturnos.',
        icon: '🌿🫁',
        color: '#38bdf8'
      };
    } else if (at === 'portaledge_cliff_suspension_hammock') {
      tech = {
        defenseTitle: 'Redes Tubulares Suspensas em Parede de Rocha (Portaledge)',
        altitudeAdaptationEfficiency: 'Plataforma rígida de alumínio e lona ancorada em fissuras de rocha viva com três pitões de redundância.',
        oxygenAndWindShieldProtection: 'Permite acampar em paredes verticais de desfiladeiros sem depender de terrenos planos inexistentes.',
        campRestAndSafetyGuards: 'Aventureiros dormem atados por cintos de escalada com zero risco de rolamento ou quedas noturnas.',
        icon: '🧗‍♂️🛏️',
        color: '#ca8a04'
      };
    } else if (at === 'tundra_ginseng_mineral_broth') {
      tech = {
        defenseTitle: 'Caldo Energético de Raiz de Ginseng da Tundra e Sal Mineral',
        altitudeAdaptationEfficiency: 'Infusão fervida rica em eletrólitos e adaptógenos naturais que estimula a oxigenação celular.',
        oxygenAndWindShieldProtection: 'Previne dores de cabeça matinais, retenção anômala de fluidos e náuseas provocadas pelo ar fino.',
        campRestAndSafetyGuards: 'Restaura o vigor dos membros do grupo para reiniciar a escalada ao amanhecer com energia plena.',
        icon: '🍵🌱',
        color: '#84cc16'
      };
    }

    return {
      biomeKey: bk,
      acclimatizationType: at,
      defenseTitle: tech.defenseTitle,
      altitudeAdaptationEfficiency: tech.altitudeAdaptationEfficiency,
      oxygenAndWindShieldProtection: tech.oxygenAndWindShieldProtection,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Acampamento em Altitude) / XGE p. 78 (Engenharia de Terreno e Aclimatação)'
    };
  }

  // === calcWildernessSeismicTremorAndEarthFissureHazard (Tremores Sísmicos, Fissuras Tectônicas e Liquefação de Solo - DMG p. 110, 284 / PHB p. 183) ===
  function calcWildernessSeismicTremorAndEarthFissureHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'mountain').toLowerCase();
    var ht = (hazardType || 'sudden_tectonic_ground_fissure').toLowerCase();

    var hazard = {
      hazardTitle: 'Fratura Tectônica Repentina e Fissura de Solo',
      saveDC: 13,
      saveType: 'Destreza',
      seismicDamageAndDisruption: 'Rompimento abrupto do terreno abrindo fenda de até 6 metros de profundidade; 2d6 de concussão e risco de soterramento pelas bordas instáveis (DMG p. 284).',
      pioneerMitigation: 'Batedores atentos notam rachaduras em zigue-zague e pássaros fugindo em revoada, saltando para rocha firme lateral.',
      rescueAndStabilization: 'Lançamento de escada de corda reforçada com ganchos de fixação e tração por aventureiros na borda segura.',
      icon: '⚡🪨',
      color: '#ea580c'
    };

    if (ht === 'shockwave_soil_liquefaction') {
      hazard = {
        hazardTitle: 'Onda de Choque Sísmica e Liquefação Arenosa',
        saveDC: 13,
        saveType: 'Destreza',
        seismicDamageAndDisruption: 'Vibração harmônica que transforma areia e cascalho em lama movediça temporária; condição Caído e afundamento até os joelhos.',
        pioneerMitigation: 'Avanço estrito sobre leitos de lajes rochosas contínuas ou raízes largas de árvores ancestrais.',
        rescueAndStabilization: 'Distribuição do peso com tábuas transversais de apoio para puxar pernas presas sem esforço excessivo.',
        icon: '🌊🪨',
        color: '#ca8a04'
      };
    } else if (ht === 'chasm_edge_rock_churn_collapse') {
      hazard = {
        hazardTitle: 'Desabamento de Paredões por Vibração de Falha Geológica',
        saveDC: 14,
        saveType: 'Destreza',
        seismicDamageAndDisruption: 'Queda massiva de blocos desprendidos pelo tremor em desfiladeiros estreitos; 3d8 de concussão e obstrução de trilha.',
        pioneerMitigation: 'Reconhecimento de estrondos subterrâneos e busca imediata de saliências em abóbada côncava segura.',
        rescueAndStabilization: 'Uso de pés-de-cabra e alavancas de ferro para remover pedras sobre companheiros atingidos.',
        icon: '🪨💥',
        color: '#ef4444'
      };
    } else if (ht === 'subterranean_fault_noxious_vent') {
      hazard = {
        hazardTitle: 'Fuga de Gases Pesados Inflamáveis de Fissura Profunda',
        saveDC: 12,
        saveType: 'Constituição',
        seismicDamageAndDisruption: 'Emissão rápida de bolsões de gás aprisionados no manto rochoso; 2d6 de veneno, tosse sufocante e perigo de ignição com tochas acesas.',
        pioneerMitigation: 'Extinção instantânea de chamas abertas e avanço com toalhas molhadas sobre o nariz contra o vento.',
        rescueAndStabilization: 'Retirada do intoxicado para terreno elevado e aplicação de sais estimulantes para reanimação.',
        icon: '💨☠️',
        color: '#84cc16'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      seismicDamageAndDisruption: hazard.seismicDamageAndDisruption,
      pioneerMitigation: hazard.pioneerMitigation,
      rescueAndStabilization: hazard.rescueAndStabilization,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110, 284 (Fissuras de Solo e Terremotos) / PHB p. 183 (Dano de Queda e Soterramento)'
    };
  }

  // === calcCampFlexibleGuylineAndSeismicBufferPlatform (Amortecedores Sísmicos de Toras, Pêndulos de Alarme e Estaiamento Elástico - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampFlexibleGuylineAndSeismicBufferPlatform(biomeKey, bufferType, options) {
    options = options || {};
    var bk = (biomeKey || 'mountain').toLowerCase();
    var bt = (bufferType || 'log_roller_buffer_cribbing').toLowerCase();

    var tech = {
      defenseTitle: 'Plataforma de Toras Cruzadas com Roletes e Coxins Amortecedores',
      seismicDampingEfficiency: 'Estrado elevado sobre camadas de toras redondas e cascalho que dissipa 90% da aceleração sísmica horizontal.',
      guylineElasticityAndSecurity: 'Impede o colapso estrutural das barracas e protege instrumentos frágeis e poções contra quebras.',
      campRestAndSafetyGuards: 'Garante que tremores de terra noturnos não derrubem as tendas nem interrompam o sono da comitiva.',
      icon: '🪵🛡️',
      color: '#10b981'
    };

    if (bt === 'elastic_tendon_guyline_bracing') {
      tech = {
        defenseTitle: 'Estaiamento com Laços de Couro Cru e Molas de Tendão',
        seismicDampingEfficiency: 'Cabos de ancoragem flexíveis que se expandem e contraem com as oscilações do solo sem arrancar as estacas.',
        guylineElasticityAndSecurity: 'Mantém a tensão perfeita das lonas mesmo durante deformações dinâmicas da superfície rochosa.',
        campRestAndSafetyGuards: 'Evita que estacas sejam ejetadas como projéteis perigosos em direção aos leitos dos aventureiros.',
        icon: '🪢⛺',
        color: '#38bdf8'
      };
    } else if (bt === 'bronze_rattle_pendulum_detector') {
      tech = {
        defenseTitle: 'Pêndulo Sismográfico com Haste Telúrica e Chocalho de Bronze',
        seismicDampingEfficiency: 'Dispositivo mecânico enterrado que amplifica microvibrações primárias de ondas P precedendo o tremor principal.',
        guylineElasticityAndSecurity: 'Alerta sonoro estridente que acorda os sentinelas com 30 segundos de antecedência para evacuação segura.',
        campRestAndSafetyGuards: 'Elimina o pânico noturno e permite que todos alcancem terreno aberto antes do choque destrutivo.',
        icon: '🔔🪨',
        color: '#ca8a04'
      };
    } else if (bt === 'seismic_relief_buffer_trenches') {
      tech = {
        defenseTitle: 'Valetas Perimetrais de Alívio e Absorção de Fraturas de Solo',
        seismicDampingEfficiency: 'Trincheiras rasas escavadas em anel concêntrico que interceptam e redirecionam rachaduras de superfície.',
        guylineElasticityAndSecurity: 'Impede que fendas tectônicas se propaguem por baixo da fogueira ou dos sacos de dormir.',
        campRestAndSafetyGuards: 'Preserva a integridade do piso central do acampamento e garante estabilidade para fardos pesados.',
        icon: '⛏️🏕️',
        color: '#f59e0b'
      };
    }

    return {
      biomeKey: bk,
      bufferType: bt,
      defenseTitle: tech.defenseTitle,
      seismicDampingEfficiency: tech.seismicDampingEfficiency,
      guylineElasticityAndSecurity: tech.guylineElasticityAndSecurity,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Estabilidade de Acampamento) / XGE p. 78 (Engenharia de Terreno e Proteção Sísmica)'
    };
  }

  // === calcWildernessCoastalReefAndTidalSurgeHazard (Recifes Ocultos, Correntes de Retorno e Ressacas Costeiras - DMG p. 110, 118 / PHB p. 182-183) ===
  function calcWildernessCoastalReefAndTidalSurgeHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'coastal').toLowerCase();
    var ht = (hazardType || 'rip_current_undertow_surge').toLowerCase();

    var hazard = {
      hazardTitle: 'Corrente de Retorno Violenta e Ressaca de Arrebentação',
      saveDC: 14,
      saveType: 'Força',
      coastalDamageAndSweeping: 'Fluxo oceânico veloz puxando para o largo a 15 km/h; arrasto de 30 metros mar adentro e risco de afogamento em mar agitado (PHB p. 183).',
      pioneerMitigation: 'Batedores identificam faixa de água calma e sem ondas entre arrebentações e orientam nadar paralelo à praia.',
      rescueAndStabilization: 'Lançamento de boia de cortiça com cabo de retinida e nado diagonal para escapar do canal de sucção.',
      icon: '🌊🏊‍♂️',
      color: '#0284c7'
    };

    if (ht === 'jagged_coral_shoal_puncture') {
      hazard = {
        hazardTitle: 'Recifes de Coral Farpado e Rochedos Submersos',
        saveDC: 13,
        saveType: 'Destreza',
        coastalDamageAndSweeping: 'Lâminas calcárias afiadas sob lâmina d\'água de 1 metro; 2d8 de dano cortante/perfurante e infecção bacteriana marinha nas lacerações.',
        pioneerMitigation: 'Navegação atenta usando vara de sondagem de proa e óculos de lentes âmbar para enxergar formações de coral.',
        rescueAndStabilization: 'Cauterização com compressas de vinagre aquecido para neutralizar toxinas de anêmonas e curativo compressivo.',
        icon: '🪸⛵',
        color: '#06b6d4'
      };
    } else if (ht === 'tidal_blowhole_geyser_blast') {
      hazard = {
        hazardTitle: 'Geiser de Pressão Marítima em Soprador de Falésia',
        saveDC: 13,
        saveType: 'Destreza',
        coastalDamageAndSweeping: 'Jato súbito de espuma e ar comprimido por caverna marinha; 2d10 de concussão e arremesso de 6 metros contra rochedos de granito.',
        pioneerMitigation: 'Sentinelas ouvem o silvo cavernoso de pressão prévia e conduzem a marcha a 10 metros da borda de fendas litorâneas.',
        rescueAndStabilization: 'Tracionamento de companheiros caídos com cordas de escalada e inspeção contra fraturas de costela.',
        icon: '💨🌊',
        color: '#38bdf8'
      };
    } else if (ht === 'corrosive_salt_spray_encrustation') {
      hazard = {
        hazardTitle: 'Maresia Salina Corrosiva e Salmoura Incrustante',
        saveDC: 12,
        saveType: 'Constituição',
        coastalDamageAndSweeping: 'Névoa oceânica hipersalina constante; corrosão de lâminas de ferro, desvantagem em Percepção visual e queimação ocular.',
        pioneerMitigation: 'Envolver armas e couros em capas engraxadas com sebo de baleia e uso de lenços protetores no rosto.',
        rescueAndStabilization: 'Lavagem dos olhos e juntas de armaduras com água doce de cantil seguida de polimento imediato com graxa.',
        icon: '🧂🛡️',
        color: '#94a3b8'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      coastalDamageAndSweeping: hazard.coastalDamageAndSweeping,
      pioneerMitigation: hazard.pioneerMitigation,
      rescueAndStabilization: hazard.rescueAndStabilization,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110, 118 (Ressacas e Ambientes Costeiros) / PHB p. 182-183 (Afogamento e Dano de Impacto)'
    };
  }

  // === calcCampTideLineClearanceAndAnchorGrapnel (Cota de Maré Alta, Ancoragem com Fateixas e Proteção Contra Maresia - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampTideLineClearanceAndAnchorGrapnel(biomeKey, defenseType, options) {
    options = options || {};
    var bk = (biomeKey || 'coastal').toLowerCase();
    var dt = (defenseType || 'high_tide_driftwood_clearance').toLowerCase();

    var tech = {
      defenseTitle: 'Cota de Segurança Acima da Marca de Maré Equinocial',
      tideClearanceEfficiency: 'Acampamento montado a no mínimo 6 metros acima do limite de sargaços e conchas deixados pela maré cheia.',
      grapnelAnchoringAndVesselSecurity: 'Garante que marés de sizígia noturnas ou ondas de ressaca passem a dezenas de metros das barracas e mantimentos.',
      campRestAndSafetyGuards: 'Proporciona sono tranquilo para a comitiva sem risco de despertar em meio a inundações de água salgada.',
      icon: '🏕️🌊',
      color: '#10b981'
    };

    if (dt === 'iron_grapnel_shock_hawser_mooring') {
      tech = {
        defenseTitle: 'Ancoragem de Barcos com Fateixa de Ferro e Cabo de Retinida',
        tideClearanceEfficiency: 'Fateixa de quatro garras cravada em rocha firme com mola elástica de cabo náutico amortecendo puxões da maré.',
        grapnelAnchoringAndVesselSecurity: 'Impede que botes, canoas ou fardos flutuantes sejam arrastados para alto-mar durante o fluxo das marés.',
        campRestAndSafetyGuards: 'Mantém a rota de fuga aquática sempre preservada e ancorada a poucos passos do acampamento.',
        icon: '⚓🪢',
        color: '#0284c7'
      };
    } else if (dt === 'driftwood_breakwater_palisade') {
      tech = {
        defenseTitle: 'Quebra-Mar Provisório de Troncos Flutuantes Encalhados',
        tideClearanceEfficiency: 'Paliçada baixa de troncos pesados empilhados em meia-lua amortecendo a força das ondas de arrebentação.',
        grapnelAnchoringAndVesselSecurity: 'Protege a praia de descanso contra respingos diretos de espuma marinha e ventos costeiros cortantes.',
        campRestAndSafetyGuards: 'Permite acender fogueira protegida a sotavento dos troncos para aquecer as rações da comitiva.',
        icon: '🪵🛡️',
        color: '#ca8a04'
      };
    } else if (dt === 'armor_desalination_fish_oil_station') {
      tech = {
        defenseTitle: 'Estação de Dessalinização com Água Doce e Óleo Protetor',
        tideClearanceEfficiency: 'Ponto de manutenção de armaduras com enxágue de água doce de riacho e engraxe com óleo de peixe estéril.',
        grapnelAnchoringAndVesselSecurity: 'Neutraliza 100% da ação oxidante do salitre sobre cotas de malha, placas e componentes metálicos delicados.',
        campRestAndSafetyGuards: 'Preserva o valor de CA e integridade dos equipamentos de batalha dos aventureiros para o dia seguinte.',
        icon: '🧴🗡️',
        color: '#f59e0b'
      };
    }

    return {
      biomeKey: bk,
      defenseType: dt,
      defenseTitle: tech.defenseTitle,
      tideClearanceEfficiency: tech.tideClearanceEfficiency,
      grapnelAnchoringAndVesselSecurity: tech.grapnelAnchoringAndVesselSecurity,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Acampamento Costeiro) / XGE p. 78 (Engenharia Náutica e Manutenção de Equipamento)'
    };
  }

  // === calcWildernessSubterraneanGasAndChokeDampHazard (Gases Asfixiantes de Subsolo, Grisou e Galerias Hipóxicas - DMG p. 105, 110 / PHB p. 183) ===
  function calcWildernessSubterraneanGasAndChokeDampHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'underdark').toLowerCase();
    var ht = (hazardType || 'choke_damp_carbon_dioxide_pocket').toLowerCase();

    var hazard = {
      hazardTitle: 'Bolsão de Gás Asfixiante e Depressão Hipóxica (Choke Damp)',
      saveDC: 14,
      saveType: 'Constituição',
      subterraneanDamageAndSuffocation: 'Gás carbônico pesado e inodoro acumulado em poços baixos; extingue tochas instantaneamente e causa sufocamento (PHB p. 183).',
      pioneerMitigation: 'Batedores avançam com tocha erguida na ponta de vara de 3 metros e testam depressões de solo antes de permitir descida da comitiva.',
      rescueAndStabilization: 'Içamento imediato da vítima com cabos de escalada para galeria arejada e aplicação de respiração assistida.',
      icon: '☠️💨',
      color: '#64748b'
    };

    if (ht === 'fire_damp_methane_flammable_surge') {
      hazard = {
        hazardTitle: 'Grisou Inflamável e Bolsão de Metano Explosivo (Fire Damp)',
        saveDC: 13,
        saveType: 'Destreza',
        subterraneanDamageAndSuffocation: 'Acúmulo de gás inflamável em veios de carvão; qualquer fagulha detona explosão de 3d6 de fogo e concussão em raio de 6 metros.',
        pioneerMitigation: 'Avanço estrito com lanternas de segurança de malha de latão, apagando qualquer tocha de resina ou fogo exposto.',
        rescueAndStabilization: 'Abafamento rápido com mantas umedecidas, dispersão de areia e tratamento de queimaduras com unguentos medicinais.',
        icon: '💥🔥',
        color: '#f97316'
      };
    } else if (ht === 'stink_damp_sulfur_rotten_egg_miasma') {
      hazard = {
        hazardTitle: 'Miasma Sulfuroso Tóxico e Névoa Corrosiva (Stink Damp)',
        saveDC: 13,
        saveType: 'Constituição',
        subterraneanDamageAndSuffocation: 'Névoa fétida de sulfeto com odor de ovos podres; 2d6 de dano de veneno e condição Envenenado com náuseas severas.',
        pioneerMitigation: 'Uso de máscaras de tecido com carvão ativado e vinagre, acelerando a passagem sem inalar o miasma estagnado.',
        rescueAndStabilization: 'Desintoxicação com infusão de carvão medicinal e lavagem das vias aéreas com água potável morna.',
        icon: '🤢🧪',
        color: '#84cc16'
      };
    } else if (ht === 'afterdamp_toxic_carbon_monoxide_drift') {
      hazard = {
        hazardTitle: 'Névoa Traiçoeira de Monóxido e Ar Estagnado (After Damp)',
        saveDC: 14,
        saveType: 'Constituição',
        subterraneanDamageAndSuffocation: 'Monóxido imperceptível que induz sonolência, fraqueza muscular e colapso respiratório sem qualquer aviso.',
        pioneerMitigation: 'Monitoramento constante da lucidez do sentinela da vanguarda e observação de pequenos animais de alerta.',
        rescueAndStabilization: 'Remoção forçada e urgente para corrente de ar fresco na boca da galeria e administração de tônicos revigorantes.',
        icon: '💤🌫️',
        color: '#a855f7'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      subterraneanDamageAndSuffocation: hazard.subterraneanDamageAndSuffocation,
      pioneerMitigation: hazard.pioneerMitigation,
      rescueAndStabilization: hazard.rescueAndStabilization,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 105, 110 (Perigos Subterrâneos e Gases) / PHB p. 183 (Sufocamento e Asfixia)'
    };
  }

  // === calcCampUndergroundVentilationAndDavySafetyLamp (Lâmpadas de Segurança Davy, Ventilação Forçada e Gaiolas Sentinela - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampUndergroundVentilationAndDavySafetyLamp(biomeKey, defenseType, options) {
    options = options || {};
    var bk = (biomeKey || 'underdark').toLowerCase();
    var dt = (defenseType || 'davy_flame_safety_wire_gauze_lantern').toLowerCase();

    var tech = {
      defenseTitle: 'Lanterna de Segurança Tipo Davy com Malha Antichama de Latão',
      ventilationAndGasNeutralization: 'Malha de latão dissipa o calor da chama interna impedindo a ignição de gases inflamáveis externos.',
      warningSensorsAndToxinAlert: 'A chama ganha auréola azulada característica ao detectar grisou, concedendo aviso prévio de 5 minutos.',
      campRestAndSafetyGuards: 'Permite iluminação segura no bivaque subterrâneo sem risco de detonação de bolsões gasosos vizinhos.',
      icon: '🏮🛡️',
      color: '#f59e0b'
    };

    if (dt === 'bellows_and_canvas_air_duct_flue') {
      tech = {
        defenseTitle: 'Sistema de Ventilação com Folerola de Foles e Conduto de Lona',
        ventilationAndGasNeutralization: 'Linha tubular de lona encerada bombeando ar fresco de chaminé natural para a câmara do acampamento.',
        warningSensorsAndToxinAlert: 'Expulsa ativamente bolsas de ar estagnado e gases densos para longe da área de repouso.',
        campRestAndSafetyGuards: 'Garante suprimento contínuo de oxigênio permitindo descanso longo completo sem penalidades de sufocamento.',
        icon: '💨⛺',
        color: '#06b6d4'
      };
    } else if (dt === 'canary_cage_sentinel_early_warning') {
      tech = {
        defenseTitle: 'Gaiola Sentinela de Alerta com Pequena Ave / Roedor',
        ventilationAndGasNeutralization: 'Sentinela biológico de resposta rápida para detecção de concentrações letais de monóxido inodoro.',
        warningSensorsAndToxinAlert: 'Inquietação ou silêncio da criatura acorda as sentinelas de vigília antes do ar atingir níveis tóxicos para a comitiva.',
        campRestAndSafetyGuards: 'Concede vantagem em testes para evitar surpresas por bolsões gasosos invasivos durante as vigílias noturnas.',
        icon: '🐦🔔',
        color: '#eab308'
      };
    } else if (dt === 'limestone_slaked_acid_gas_scrubber') {
      tech = {
        defenseTitle: 'Filtro Neutralizador de Leito de Cal e Carvão Ativo',
        ventilationAndGasNeutralization: 'Barreira passiva de recipientes rasos com cal viva e carvão triturado que absorve vapores ácidos e sulfeto.',
        warningSensorsAndToxinAlert: 'Reação com vapores ácidos efervesce suavemente alertando sobre o aumento de acidez no ar circundante.',
        campRestAndSafetyGuards: 'Mantém o ar ao redor das mantas de dormir neutro, prevenindo corrosão de tecidos e queimação pulmonar.',
        icon: '🪨🧪',
        color: '#10b981'
      };
    }

    return {
      biomeKey: bk,
      defenseType: dt,
      defenseTitle: tech.defenseTitle,
      ventilationAndGasNeutralization: tech.ventilationAndGasNeutralization,
      warningSensorsAndToxinAlert: tech.warningSensorsAndToxinAlert,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Acampamento Subterrâneo) / XGE p. 78 (Ferramentas de Mineração e Segurança)'
    };
  }

  // === calcWildernessSubmergedCavesAndKarstSiphonHazard (Sifões Cársticos, Sucção Subaquática e Cegueira por Sedimento - DMG p. 110, 116 / PHB p. 182-183) ===
  function calcWildernessSubmergedCavesAndKarstSiphonHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'underdark').toLowerCase();
    var ht = (hazardType || 'submerged_karst_siphon_undertow').toLowerCase();

    var hazard = {
      hazardTitle: 'Sifão Cárstico Submerso com Sucção para Sumidouro',
      saveDC: 14,
      saveType: 'Força',
      karstDamageAndDrowningRisk: 'Garganta estreita de rocha calcária puxando a água a 20 km/h; arrasto involuntário de 18 metros e risco de afogamento (PHB p. 183).',
      pioneerMitigation: 'Batedores ancoram cabo guia de cânhamo em rocha seca e realizam teste de correnteza com flutuadores de cortiça.',
      rescueAndStabilization: 'Tracionamento com roldanas de escalada, desobstrução das vias aéreas e drenagem pulmonar inclinada.',
      icon: '🕳️🌊',
      color: '#0ea5e9'
    };

    if (ht === 'stalactite_submerged_fang_constriction') {
      hazard = {
        hazardTitle: 'Galeria Subaquática Estreita com Estalactites Farpadas',
        saveDC: 13,
        saveType: 'Destreza',
        karstDamageAndDrowningRisk: 'Fenda submersa de 60 cm entre agulhas calcárias pontiagudas; 2d8 de dano perfurante e risco de prender alforjes na rocha.',
        pioneerMitigation: 'Desmonte preventivo das mochilas, conduzindo os fardos empurrados à frente em fila indiana lenta.',
        rescueAndStabilization: 'Corte imediato de correias travadas com faca de mergulho e aplicação de tala subaquática para membros contundidos.',
        icon: '🦷💧',
        color: '#0284c7'
      };
    } else if (ht === 'turbid_silt_blackout_disorientation') {
      hazard = {
        hazardTitle: 'Cegueira Submersa Total por Nuvem de Silte (Silt Out)',
        saveDC: 13,
        saveType: 'Sabedoria',
        karstDamageAndDrowningRisk: 'Fundo lamacento revolvido anulando a visão a zero; desvantagem severa em orientação e risco agudo de pânico claustrofóbico.',
        pioneerMitigation: 'Natação suspensa sem bater pernas no leito e marcha tátil com mão ininterruptamente segura ao cabo guia.',
        rescueAndStabilization: 'Sinalização por toques codificados na corda guia e pausa de 3 minutos para assentamento do sedimento.',
        icon: '🌫️🤿',
        color: '#64748b'
      };
    } else if (ht === 'hypothermic_groundwater_cramp') {
      hazard = {
        hazardTitle: 'Choque Térmico em Lençol Freático Glacial e Cãibra Muscular',
        saveDC: 13,
        saveType: 'Constituição',
        karstDamageAndDrowningRisk: 'Água a 4°C provocando espasmos musculares severos, 1 nível de exaustão e incapacidade temporária de nadar.',
        pioneerMitigation: 'Untar o corpo com banha animal isolante e uso de trajes de couro ajustados com costuras vedadas.',
        rescueAndStabilization: 'Fricção enérgica com panos secos na primeira bolsa de ar respirável e consumo imediato de caldo quente.',
        icon: '🥶🏊',
        color: '#38bdf8'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      karstDamageAndDrowningRisk: hazard.karstDamageAndDrowningRisk,
      pioneerMitigation: hazard.pioneerMitigation,
      rescueAndStabilization: hazard.rescueAndStabilization,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110, 116 (Masmorras Alagadas e Cavernas) / PHB p. 182-183 (Natação e Asfixia)'
    };
  }

  // === calcCampSpelunkingLineAndBuoyantPouchStation (Carretéis de Linha Guia, Bolsas Flutuantes e Redes Suspensas - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampSpelunkingLineAndBuoyantPouchStation(biomeKey, defenseType, options) {
    options = options || {};
    var bk = (biomeKey || 'underdark').toLowerCase();
    var dt = (defenseType || 'braided_guide_line_reel_and_anchor_pitons').toLowerCase();

    var tech = {
      defenseTitle: 'Carretel de Linha Guia Trançada com Pitões de Fixação',
      lineNavigationEfficiency: 'Cabo fosforescente ininterrupto cravado com pitões a cada 5 metros conectando a margem ao acampamento seguro.',
      buoyancyAndWaterproofingSecurity: 'Garante navegação e retorno infalíveis mesmo sob cegueira total por lama ou falha de iluminação.',
      campRestAndSafetyGuards: 'Permite que sentinelas orientem saídas de emergência ordenadas caso a galeria comece a encher d\'água.',
      icon: '🪢📍',
      color: '#10b981'
    };

    if (dt === 'buoyant_oilskin_pack_and_float_bladders') {
      tech = {
        defenseTitle: 'Bolsas Flutuadoras Estanques com Bexigas Infladas e Piche',
        lineNavigationEfficiency: 'Alforjes e caixas de suprimentos selados com lona encerada e flutuadores laterais que boiam sem esforço.',
        buoyancyAndWaterproofingSecurity: 'Protege rações, pergaminhos e mapas de cartografia contra qualquer infiltração de água salobra.',
        campRestAndSafetyGuards: 'Garante que os mantimentos e equipamentos permaneçam 100% secos e operacionais após travessias submersas.',
        icon: '🎒🫧',
        color: '#06b6d4'
      };
    } else if (dt === 'suspended_hammock_above_flash_water') {
      tech = {
        defenseTitle: 'Rede Suspensa com Esticadores Acima da Linha de Inundação',
        lineNavigationEfficiency: 'Bivaque elevado montado a 2 metros de altura atado em fendas do teto calcário por esticadores de aço.',
        buoyancyAndWaterproofingSecurity: 'Mantém o leito de repouso dos membros da comitiva completamente livre de enchentes repentinas da maré cárstica.',
        campRestAndSafetyGuards: 'Proporciona descanso longo confortável e protegido contra a umidade gelada do solo cavernoso.',
        icon: '🛏️🧗',
        color: '#ca8a04'
      };
    } else if (dt === 'sealed_tallow_torch_and_tinder_canister') {
      tech = {
        defenseTitle: 'Estojo Estanque de Flandres com Tochas de Sebo Impermeáveis',
        lineNavigationEfficiency: 'Tochas resinadas pré-untadas e pederneiras acondicionadas em cilindros metálicos lacrados com cera de abelha.',
        buoyancyAndWaterproofingSecurity: 'Garante acendimento instantâneo de fogueira em menos de 1 minuto logo após emergir de trechos alagados.',
        campRestAndSafetyGuards: 'Restaura a visibilidade e o calor corporal da comitiva rapidamente, prevenindo hipotermia.',
        icon: '🔥🥫',
        color: '#f97316'
      };
    }

    return {
      biomeKey: bk,
      defenseType: dt,
      defenseTitle: tech.defenseTitle,
      lineNavigationEfficiency: tech.lineNavigationEfficiency,
      buoyancyAndWaterproofingSecurity: tech.buoyancyAndWaterproofingSecurity,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Bivaque em Caverna) / XGE p. 78 (Equipamento de Mergulho e Espeleologia)'
    };
  }

  // === calcWildernessDesertNocturnalFreezingAndShiftingDunesHazard (Queda Térmica Noturna, Dunas Movediças e Crosta Cáustica - DMG p. 110 / PHB p. 182-183) ===
  function calcWildernessDesertNocturnalFreezingAndShiftingDunesHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'desert').toLowerCase();
    var ht = (hazardType || 'nocturnal_desert_hypothermia_drop').toLowerCase();

    var hazard = {
      hazardTitle: 'Queda Térmica Noturna Brutal e Hipotermia de Duna',
      saveDC: 13,
      saveType: 'Constituição',
      desertDamageAndExposure: 'Despencamento brusco de 45°C diurnos para -5°C noturnos; calafrios intensos e 1 nível de exaustão por frio extremo (DMG p. 110).',
      pioneerMitigation: 'Batedores escavam valas rasas na areia ainda morna e distribuem mantas térmicas antes do anoitecer completo.',
      rescueAndStabilization: 'Fogueira protegida entre lajes de pedra, isolamento do solo com esteiras e infusão quente de raízes calóricas.',
      icon: '🥶🏜️',
      color: '#0284c7'
    };

    if (ht === 'shifting_sand_slipface_engulfment') {
      hazard = {
        hazardTitle: 'Desmoronamento de Crista de Duna e Soterramento Arenoso',
        saveDC: 13,
        saveType: 'Destreza',
        desertDamageAndExposure: 'Crista instável de duna cedendo sob o peso da marcha; 2d6 de concussão e soterramento sob 1 metro de areia fina.',
        pioneerMitigation: 'Marcha espaçada em 5 metros contornando pela face firme de barlavento com bastões de sondagem.',
        rescueAndStabilization: 'Desenterro urgente com pás de campanha e limpeza das vias aéreas com compressas úmidas de cantil.',
        icon: '⏳🧗',
        color: '#d97706'
      };
    } else if (ht === 'sand_viper_burrow_ambush') {
      hazard = {
        hazardTitle: 'Ninho Subterrâneo de Víboras das Areias Camufladas',
        saveDC: 13,
        saveType: 'Sabedoria',
        desertDamageAndExposure: 'Serpentes peçonhentas sob a camada superficial da areia morna; 2d6 de dano de veneno e condição Envenenado por 1 hora.',
        pioneerMitigation: 'Vanguarda bate bastões no solo arenoso para afugentar rastejantes e veste perneiras de couro reforçado.',
        rescueAndStabilization: 'Aplicação imediata de antídoto de ervas do deserto e imobilização do membro atingido.',
        icon: '🐍🌵',
        color: '#84cc16'
      };
    } else if (ht === 'dry_salt_pan_crust_collapse') {
      hazard = {
        hazardTitle: 'Rompimento de Crosta de Salitre e Lama Cáustica',
        saveDC: 14,
        saveType: 'Destreza',
        desertDamageAndExposure: 'Salinas secas com crosta quebradiça que esconde lodo salgado cáustico; 2d4 de dano corrosivo e aprisionamento até a cintura.',
        pioneerMitigation: 'Identificação do brilho salino frouxo e desvio da comitiva por afloramentos rochosos firmes.',
        rescueAndStabilization: 'Lançamento de laço com corda de escalada para extração horizontal e enxágue com água fresca potável.',
        icon: '🧂⚠️',
        color: '#cbd5e1'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      desertDamageAndExposure: hazard.desertDamageAndExposure,
      pioneerMitigation: hazard.pioneerMitigation,
      rescueAndStabilization: hazard.rescueAndStabilization,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110 (Frio Extremo e Desertos) / PHB p. 182-183 (Exaustão e Salvaguardas)'
    };
  }

  // === calcCampDesertThermalTrenchAndReflectiveWall (Trincheiras Térmicas, Muros Refletores e Faldas de Areia - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampDesertThermalTrenchAndReflectiveWall(biomeKey, defenseType, options) {
    options = options || {};
    var bk = (biomeKey || 'desert').toLowerCase();
    var dt = (defenseType || 'subterranean_sand_trench_thermal_bivouac').toLowerCase();

    var tech = {
      defenseTitle: 'Bivaque em Trincheira Térmica de Areia Aquecida',
      thermalEfficiencyAndShielding: 'Vala escavada a 50 cm retendo o calor acumulado no solo arenoso durante o dia com forro isolante.',
      windbreakAndCreatureDefenses: 'Garante que o vento cortante da noite desértica passe por cima das cabeças sem atingir os cobertores.',
      campRestAndSafetyGuards: 'Permite sono restaurador completo sem necessidade de queimar madeira escassa durante as madrugadas gélidas.',
      icon: '🏕️🌡️',
      color: '#10b981'
    };

    if (dt === 'reflective_stone_hearth_radiant_wall') {
      tech = {
        defenseTitle: 'Muro Refletor de Arenito e Fogueira Radiante',
        thermalEfficiencyAndShielding: 'Paredão semicircular de lajes de arenito polido rebatendo 80% do calor da fogueira para a área de descanso.',
        windbreakAndCreatureDefenses: 'Bloqueia rajadas de vento carregadas de poeira que poderiam apagar as brasas ou sufocar a vigília.',
        campRestAndSafetyGuards: 'Mantém o abrigo aquecido por até 6 horas após a queima das últimas brasas de arbustos do deserto.',
        icon: '🧱🔥',
        color: '#f59e0b'
      };
    } else if (dt === 'wool_felt_insulation_camel_hair_blankets') {
      tech = {
        defenseTitle: 'Cobertores Espessos de Lã de Camelo e Feltro Batido',
        thermalEfficiencyAndShielding: 'Camadas densas de fibra animal repelindo o frio gélido do ar noturno sem retenção de umidade corporal.',
        windbreakAndCreatureDefenses: 'Protegem os aventureiros contra picadas de insetos noturnos e escorpiões atraídos pelo calor.',
        campRestAndSafetyGuards: 'Evitam qualquer penalidade de exaustão noturna decorrente de temperaturas negativas no deserto.',
        icon: '🧶🐫',
        color: '#06b6d4'
      };
    } else if (dt === 'sand_skirt_tent_weighted_with_rocks') {
      tech = {
        defenseTitle: 'Tendas com Faldas de Areia e Lastro de Pedras de Duna',
        thermalEfficiencyAndShielding: 'Abas laterais das barracas enterradas sob 20 cm de areia impedindo correntes de convecção gelada.',
        windbreakAndCreatureDefenses: 'Vedação total do perímetro contra invasão de víboras da areia, escorpiões e aranhas das dunas.',
        campRestAndSafetyGuards: 'Proporciona isolamento acústico e térmico hermético para o descanso longo dos companheiros de comitiva.',
        icon: '⛺🪨',
        color: '#ca8a04'
      };
    }

    return {
      biomeKey: bk,
      defenseType: dt,
      defenseTitle: tech.defenseTitle,
      thermalEfficiencyAndShielding: tech.thermalEfficiencyAndShielding,
      windbreakAndCreatureDefenses: tech.windbreakAndCreatureDefenses,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Acampamento no Deserto) / XGE p. 78 (Equipamento de Proteção e Sobrevivência)'
    };
  }

  // === calcWildernessSwampQuicksandAndSporeBloomHazard (Lamaçal Sugador, Esporos Tóxicos e Sanguessugas - DMG p. 110-111 / PHB p. 182-183) ===
  function calcWildernessSwampQuicksandAndSporeBloomHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'swamp').toLowerCase();
    var ht = (hazardType || 'quicksand_muck_sinkhole_submersion').toLowerCase();

    var hazard = {
      hazardTitle: 'Lamaçal Sugador e Areia Movediça Pantanosa',
      saveDC: 14,
      saveType: 'Força',
      swampDamageAndEntrapment: 'Bolsão de lodo profundo coberto por folhiço podre; afunda 1d4+1 pés na entrada e mais 1d4 pés por tentativa sem apoio até risco de asfixia (DMG p. 110).',
      pioneerMitigation: 'Batedores avançam sondando o leito com varas de 3 metros e pisam exclusivamente em touceiras de juncos firmes.',
      rescueAndStabilization: 'Projeção de pranchas de madeira para distribuir peso, laço com cabo de escalada e tração horizontal lenta.',
      icon: '🪵🕳️',
      color: '#713f12'
    };

    if (ht === 'toxic_spore_puffball_burst') {
      hazard = {
        hazardTitle: 'Nuvem de Esporos Fúngicos Tóxicos e Mofo Amarelo',
        saveDC: 13,
        saveType: 'Constituição',
        swampDamageAndEntrapment: 'Fungos esféricos que estouram com o impacto de passos; nuvem fétida de 3 metros infligindo 2d6 de dano de veneno e condição Envenenado por 1 hora.',
        pioneerMitigation: 'Marcha com lenços embebidos em vinagre cobrindo o nariz e desvio visual de colônias de cogumelos intumescidos.',
        rescueAndStabilization: 'Aplicação de compressa de musgo adstringente nas vias respiratórias e chá desintoxicante de menta selvagem.',
        icon: '🍄☣️',
        color: '#84cc16'
      };
    } else if (ht === 'swamp_gas_ignition_pocket') {
      hazard = {
        hazardTitle: 'Bolsão de Metano Pantanoso com Ignição Fulminante',
        saveDC: 13,
        saveType: 'Destreza',
        swampDamageAndEntrapment: 'Acúmulo de gás inflamável rente à lâmina d\'água; qualquer chama exposta gera labareda em cone de 4,5 metros causando 2d8 de fogo e cegueira temporária.',
        pioneerMitigation: 'Uso de lanternas cegas mantidas a 2 metros de altura e atenção ao borbulhamento gasoso contínuo na superfície.',
        rescueAndStabilization: 'Mergulho rápido no lodo úmido para conter chamas e pomada de gordura de peixe em queimaduras.',
        icon: '🔥🫧',
        color: '#f97316'
      };
    } else if (ht === 'parasitic_swamp_leech_infestation') {
      hazard = {
        hazardTitle: 'Infestação de Sanguessugas Parasitárias Gigantes',
        saveDC: 12,
        saveType: 'Constituição',
        swampDamageAndEntrapment: 'Anelídeos hematófagos em águas turvas que drenam sangue pelas frestas de botas; perda contínua de 1d4 de dano de sangramento se não removidas.',
        pioneerMitigation: 'Vedação de calçados com piche vegetal e polainas embebidas em infusão de folhas amargas de tabaco.',
        rescueAndStabilization: 'Descolamento térmico com ponta de adaga incandescente e esterilização das mordidas com sal grosso.',
        icon: '🪱🩸',
        color: '#991b1b'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      swampDamageAndEntrapment: hazard.swampDamageAndEntrapment,
      pioneerMitigation: hazard.pioneerMitigation,
      rescueAndStabilization: hazard.rescueAndStabilization,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110-111 (Areia Movediça e Perigos de Charco) / PHB p. 182-183 (Asfixia e Terreno Difícil)'
    };
  }

  // === calcCampSwampStiltPlatformAndMudshoeStation (Palafitas Elevadas, Raquetes de Lama e Bacias de Filtragem - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampSwampStiltPlatformAndMudshoeStation(biomeKey, defenseType, options) {
    options = options || {};
    var bk = (biomeKey || 'swamp').toLowerCase();
    var dt = (defenseType || 'log_stilt_raised_platform_shelter').toLowerCase();

    var tech = {
      defenseTitle: 'Plataforma Elevada de Palafitas com Troncos Trançados',
      groundIsolationAndBuoyancy: 'Bivaque montado a 1,5 metro de altura sobre esteios cravados em solo firme, longe da lama pútrida e inundações.',
      verminAndMiasmaRepulsion: 'Impede o rastejo de víboras d\'água, sanguessugas e quelônios carnívoros no piso de descanso.',
      campRestAndSafetyGuards: 'Permite sono longo confortável e seco em meio a alagados sem risco de acordar submerso em lodo.',
      icon: '🛖🪵',
      color: '#10b981'
    };

    if (dt === 'willow_mudshoe_and_swamp_skis_station') {
      tech = {
        defenseTitle: 'Estação de Raquetes de Salgueiro e Pranchas para Lamaçal',
        groundIsolationAndBuoyancy: 'Aparatos de madeira flexível atados às solas aumentando a área de contato e impedindo afundamento no charco.',
        verminAndMiasmaRepulsion: 'Garante mobilidade ágil de sentinelas ao redor do acampamento para vigília sem tropeços ou sucção.',
        campRestAndSafetyGuards: 'Permite deslocamento tático e resgate rápido de aventureiros sem perda de velocidade em terreno lamacento.',
        icon: '🎿🌱',
        color: '#06b6d4'
      };
    } else if (dt === 'smudge_pot_citronella_smoke_barrier') {
      tech = {
        defenseTitle: 'Defumadores Periféricos com Sebo e Ervas Repelentes',
        groundIsolationAndBuoyancy: 'Névoa contínua de zimbro e folhas resinosas cobrindo um raio de 12 metros ao redor da plataforma.',
        verminAndMiasmaRepulsion: 'Repugna 99% dos mosquitos transmissores de maleita e enxames parasitários do pântano.',
        campRestAndSafetyGuards: 'Garante que os companheiros de comitiva recuperem pontos de vida sem febres infecciosas durante o descanso.',
        icon: '💨🏺',
        color: '#eab308'
      };
    } else if (dt === 'peat_moss_charcoal_water_filtration_basin') {
      tech = {
        defenseTitle: 'Bacia Filtrante Portátil com Turfa e Carvão Ativo',
        groundIsolationAndBuoyancy: 'Sistema mecânico de três estágios que decanta lama e remove cheiro de enxofre da água do pântano.',
        verminAndMiasmaRepulsion: 'Elimina larvas e parasitas de água estagnada tornando o suprimento potável e cristalino.',
        campRestAndSafetyGuards: 'Abastece todos os cantis da comitiva com água pura prevenindo disenteria e desidratação.',
        icon: '🪨🚰',
        color: '#ca8a04'
      };
    }

    return {
      biomeKey: bk,
      defenseType: dt,
      defenseTitle: tech.defenseTitle,
      groundIsolationAndBuoyancy: tech.groundIsolationAndBuoyancy,
      verminAndMiasmaRepulsion: tech.verminAndMiasmaRepulsion,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Bivaque em Pântano) / XGE p. 78 (Equipamento de Proteção e Sobrevivência)'
    };
  }

  // === calcWildernessDenseForestDeadfallAndAllergenicPollenHazard (Queda de Troncos Podres, Pólen Alucinógeno e Raízes Ocultas - DMG p. 110-111 / PHB p. 182-183) ===
  function calcWildernessDenseForestDeadfallAndAllergenicPollenHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var ht = (hazardType || 'rotten_canopy_deadfall_widowmaker').toLowerCase();

    var hazard = {
      hazardTitle: 'Queda Súbita de Tronco Podre do Dossel (Widowmaker)',
      saveDC: 14,
      saveType: 'Destreza',
      forestDamageAndEntanglement: 'Tronco pesado de 200 kg descolando da copa com o vento; 3d8 de concussão e soterramento sob galhos secos (DMG p. 110).',
      pioneerMitigation: 'Batedores examinam a copa das árvores em busca de galhos soltos ou fungos necróticos antes de permitir a passagem do grupo.',
      rescueAndStabilization: 'Alavancagem do tronco com varas de freixo, tração horizontal e aplicação de talas em fraturas.',
      icon: '🪵🌲',
      color: '#b45309'
    };

    if (ht === 'hallucinogenic_forest_pollen_cloud') {
      hazard = {
        hazardTitle: 'Névoa de Pólen Alucinógeno e Esporos Dourados',
        saveDC: 13,
        saveType: 'Constituição',
        forestDamageAndEntanglement: 'Pólen denso suspenso em clareiras sem vento; alucinações visuais, 2d6 de dano psíquico/veneno e condição Envenenado.',
        pioneerMitigation: 'Uso de máscaras de linho embebidas em vinagre ou óleo balsâmico e contorno de clareiras muito floridas.',
        rescueAndStabilization: 'Infusão desintoxicante de raiz de gengibre selvagem e compressas frias sobre os olhos e fronte.',
        icon: '🌸🌫️',
        color: '#d946ef'
      };
    } else if (ht === 'snaring_mangrove_root_tripwire') {
      hazard = {
        hazardTitle: 'Labirinto de Raízes Retorcidas e Fendas Ocultas',
        saveDC: 13,
        saveType: 'Destreza',
        forestDamageAndEntanglement: 'Maranhado de raízes aéreas sob musgo úmido; queda brusca causando 1d8 de concussão e torção severa no tornozelo.',
        pioneerMitigation: 'Marcha ritmada com bastões de apoio e perneiras reforçadas com tiras de couro de cervo.',
        rescueAndStabilization: 'Imobilização da articulação com tala flexível de casca de bétula e massagem com arnica da floresta.',
        icon: '🌿🥾',
        color: '#65a30d'
      };
    } else if (ht === 'predatory_army_ant_swarm_trail') {
      hazard = {
        hazardTitle: 'Coluna de Formigas-Correição Predatórias Carnívoras',
        saveDC: 13,
        saveType: 'Destreza',
        forestDamageAndEntanglement: 'Milhares de mandíbulas afiadas cobrindo o solo; 2d6 de perfuração e ácido com risco de pânico na comitiva.',
        pioneerMitigation: 'Detecção do farfalhar contínuo no folhiço e contorno por troncos suspensos sem tocar no solo da trilha.',
        rescueAndStabilization: 'Lavagem rápida com água limpa, dispersão de cinzas frias e bálsamo refrescante nas picadas.',
        icon: '🐜🍂',
        color: '#dc2626'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      forestDamageAndEntanglement: hazard.forestDamageAndEntanglement,
      pioneerMitigation: hazard.pioneerMitigation,
      rescueAndStabilization: hazard.rescueAndStabilization,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110-111 (Florestas e Queda de Troncos) / PHB p. 182-183 (Asfixia e Terreno Difícil)'
    };
  }

  // === calcCampForestCanopyHammockAndDeadfallClearingStation (Redes de Dossel, Desbaste de Galhos e Valetas Protetoras - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampForestCanopyHammockAndDeadfallClearingStation(biomeKey, defenseType, options) {
    options = options || {};
    var bk = (biomeKey || 'forest').toLowerCase();
    var dt = (defenseType || 'cleared_canopy_safety_perimeter').toLowerCase();

    var tech = {
      defenseTitle: 'Desbaste Preventivo de Galhos Suspensos e Zona Livre',
      canopySecurityAndElevation: 'Inspeção e remoção de galhos secos da copa acima das barracas antes do assentamento do acampamento.',
      creatureRepulsionAndInsulation: 'Elimina 100% do risco de esmagamento súbito por queda de madeira morta durante vendavais noturnos.',
      campRestAndSafetyGuards: 'Garante tranquilidade total aos membros da comitiva durante o repouso sob a copa florestal.',
      icon: '🪓🌳',
      color: '#10b981'
    };

    if (dt === 'treetop_suspended_canvas_hammock_rig') {
      tech = {
        defenseTitle: 'Redes Suspensas em Árvores Vigorosas com Toldo Triangular',
        canopySecurityAndElevation: 'Bivaque elevado a 3 metros do solo ancorado em troncos sadios com fitas largas que não machucam a casca.',
        creatureRepulsionAndInsulation: 'Mantém os aventureiros completamente isolados de predadores terrestres, fungos e umidade do húmus.',
        campRestAndSafetyGuards: 'Permite sono longo aquecido e seco sem contato com solo encharcado ou enxames rastejantes.',
        icon: '🏕️🧗',
        color: '#06b6d4'
      };
    } else if (dt === 'citronella_wood_chip_perimeter_trench') {
      tech = {
        defenseTitle: 'Valeta Periférica com Cavacos Aromáticos e Piche Vegetal',
        canopySecurityAndElevation: 'Sulco contínuo escavado ao redor do acampamento preenchido com lascas de pinho e resina repelente.',
        creatureRepulsionAndInsulation: 'Barra a passagem de formigas-correição, centopeias gigantes e carrapatos da floresta densa.',
        campRestAndSafetyGuards: 'Evita picadas noturnas e preserva os suprimentos de viagem intactos na área de cozinha.',
        icon: '🛡️🌿',
        color: '#ca8a04'
      };
    } else if (dt === 'tree_sap_amber_filtration_and_tallow_station') {
      tech = {
        defenseTitle: 'Estação de Calafetagem com Seiva de Pinheiro e Sebo',
        canopySecurityAndElevation: 'Ponto de fogo seguro para derretimento de resina vegetal e impermeabilização de lonas e botas.',
        creatureRepulsionAndInsulation: 'Produz tochas resinosas aromáticas que mantêm o perímetro iluminado e afastam feras noturnas.',
        campRestAndSafetyGuards: 'Mantém as botas e capas dos aventureiros impermeáveis e prontas para a marcha do dia seguinte.',
        icon: '🍯🔥',
        color: '#f59e0b'
      };
    }

    return {
      biomeKey: bk,
      defenseType: dt,
      defenseTitle: tech.defenseTitle,
      canopySecurityAndElevation: tech.canopySecurityAndElevation,
      creatureRepulsionAndInsulation: tech.creatureRepulsionAndInsulation,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Bivaque em Floresta) / XGE p. 78 (Equipamento de Acampamento e Ferramentas)'
    };
  }

  // === calcWildernessGlacialCrevasseAndPermafrostHazard (Fendas Glaciais Ocultas, Ventos Catabáticos e Seracs - DMG p. 110-111 / PHB p. 182-183) ===
  function calcWildernessGlacialCrevasseAndPermafrostHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'arctic').toLowerCase();
    var ht = (hazardType || 'hidden_snow_bridge_crevasse_collapse').toLowerCase();

    var hazard = {
      hazardTitle: 'Colapso de Ponte de Neve e Queda em Fenda Glacial (Crevasse)',
      saveDC: 14,
      saveType: 'Destreza',
      glacialDamageAndExposure: 'Ponte de neve frágil desmoronando sob o peso da marcha; queda de 4d6 de concussão e risco de hipotermia grave no gelo azul profundo (DMG p. 110).',
      pioneerMitigation: 'Batedores avançam encordoados a cada 5 metros e sondam o leito com bastões de ponta de aço endurecido.',
      rescueAndStabilization: 'Sistema de polias 3:1 ancorado em parafusos tubulares de gelo e resgate com arnês de escalada.',
      icon: '❄️🕳️',
      color: '#38bdf8'
    };

    if (ht === 'permafrost_frost_heave_shear') {
      hazard = {
        hazardTitle: 'Fissura de Cisalhamento por Permafrost e Expansão de Gelo',
        saveDC: 13,
        saveType: 'Destreza',
        glacialDamageAndExposure: 'Placas de rocha e gelo rachando subitamente sob tensão térmica; 2d6 de perfuração e piso com terreno muito difícil.',
        pioneerMitigation: 'Avanço disperso observando elevações de solo e uso de grampos de ferro nas solas das botas de neve.',
        rescueAndStabilization: 'Fixação de talas acolchoadas em fraturas e aplicação de unguento aquecedor de banha animal.',
        icon: '🧊⚡',
        color: '#0284c7'
      };
    } else if (ht === 'katabatic_gale_chill_factor') {
      hazard = {
        hazardTitle: 'Vento Catabático Descendente e Sensação Térmica Extrema',
        saveDC: 13,
        saveType: 'Constituição',
        glacialDamageAndExposure: 'Rajada polar a 80 km/h baixando a sensação térmica para -30°C; 2d6 de frio e 1 nível de exaustão em 10 minutos.',
        pioneerMitigation: 'Abrigo imediato a sotavento de morenas de pedra e uso de anoraks de pele dupla com capuz ajustado.',
        rescueAndStabilization: 'Aquecimento gradual do tronco com pedras polidas quentes e ingestão de caldo gorduroso fervente.',
        icon: '💨🥶',
        color: '#7dd3fc'
      };
    } else if (ht === 'glacial_serac_tower_topple') {
      hazard = {
        hazardTitle: 'Tombamento de Torre de Gelo Instável (Serac)',
        saveDC: 14,
        saveType: 'Destreza',
        glacialDamageAndExposure: 'Pináculo de gelo azul de 15 metros colapsando sob calor solar; 3d10 de concussão e risco de soterramento.',
        pioneerMitigation: 'Travessia em silêncio absoluto nas primeiras horas da alvorada e contorno largo da base de blocos suspensos.',
        rescueAndStabilization: 'Desenterro urgente com pás de campanha e administração de essências revigorantes.',
        icon: '🏔️⚠️',
        color: '#bae6fd'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      glacialDamageAndExposure: hazard.glacialDamageAndExposure,
      pioneerMitigation: hazard.pioneerMitigation,
      rescueAndStabilization: hazard.rescueAndStabilization,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110-111 (Frio Extremo e Gelo Frágil) / PHB p. 182-183 (Asfixia e Hipotermia)'
    };
  }

  // === calcCampGlacialSnowBlockShelterAndIceScrewStation (Domo de Blocos de Neve, Parafusos de Gelo e Esteiras de Pele - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampGlacialSnowBlockShelterAndIceScrewStation(biomeKey, defenseType, options) {
    options = options || {};
    var bk = (biomeKey || 'arctic').toLowerCase();
    var dt = (defenseType || 'compacted_snow_block_igloo_shelter').toLowerCase();

    var tech = {
      defenseTitle: 'Domo de Blocos de Neve Compacta com Entrada em Túnel',
      thermalRetentionAndInsulation: 'Abrigo com túnel rebaixado retendo ar aquecido a 5°C mesmo com nevasca polar externa a -25°C.',
      anchoringStabilityAndGaleDefense: 'Domo espiral autoportante que dissipa a força do vento e impede qualquer colapso mecânico.',
      campRestAndSafetyGuards: 'Permite sono longo restaurador completo e confortável sem penalidades de frio extremo.',
      icon: '🛖❄️',
      color: '#10b981'
    };

    if (dt === 'tubular_ice_screw_and_belay_anchors') {
      tech = {
        defenseTitle: 'Ancoragem de Estais com Parafusos Tubulares de Aço no Gelo',
        thermalRetentionAndInsulation: 'Parafusos rosqueados a 20 cm no gelo vivo suportando 1.500 kg de tração contra rajadas furiosas.',
        anchoringStabilityAndGaleDefense: 'Garante que barracas e equipamentos pesados permaneçam imóveis durante ventanias catabáticas.',
        campRestAndSafetyGuards: 'Elimina o risco de a comitiva acordar com abrigos arrancados ou equipamentos espalhados na nevasca.',
        icon: '🔩⚓',
        color: '#06b6d4'
      };
    } else if (dt === 'reindeer_fur_underlay_raised_snow_bench') {
      tech = {
        defenseTitle: 'Bancada Elevada de Sono com Esteira de Pele de Rena',
        thermalRetentionAndInsulation: 'Plataforma esculpida acima da entrada de ar frio forrada com camadas duplas de pelos ocos isolantes.',
        anchoringStabilityAndGaleDefense: 'Bloqueia 100% da perda de calor corporal por condução para o assoalho de gelo da geleira.',
        campRestAndSafetyGuards: 'Garante que os aventureiros recuperem todos os dados de vida sem calafrios ou dormência muscular.',
        icon: '🦌🧶',
        color: '#ca8a04'
      };
    } else if (dt === 'blubber_lamp_and_snow_melt_trough') {
      tech = {
        defenseTitle: 'Lâmpada de Gordura de Foca com Calha para Degelo',
        thermalRetentionAndInsulation: 'Chama suave sem fumaça que eleva a temperatura interna e derrete neve pura para consumo.',
        anchoringStabilityAndGaleDefense: 'Abastecimento ininterrupto de água potável líquida sem dependência de lenha escassa no ártico.',
        campRestAndSafetyGuards: 'Mantém a comitiva hidratada e aquecida durante todo o período de vigília noturna.',
        icon: '🪔💧',
        color: '#f59e0b'
      };
    }

    return {
      biomeKey: bk,
      defenseType: dt,
      defenseTitle: tech.defenseTitle,
      thermalRetentionAndInsulation: tech.thermalRetentionAndInsulation,
      anchoringStabilityAndGaleDefense: tech.anchoringStabilityAndGaleDefense,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Bivaque Ártico) / XGE p. 78 (Equipamento de Exploração e Sobrevivência)'
    };
  }

  // === calcWildernessRockyCanyonWindTunnelAndSpallingHazard (Rajadas Venturi em Cânion, Estilhaçamento Térmico e Encostas de Seixos - DMG p. 110-111 / PHB p. 182-183) ===
  function calcWildernessRockyCanyonWindTunnelAndSpallingHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'canyon').toLowerCase();
    var ht = (hazardType || 'wind_tunnel_canyon_funnel_gale').toLowerCase();

    var hazard = {
      hazardTitle: 'Efeito Venturi e Rajadas Funil em Garganta Rochosa',
      saveDC: 14,
      saveType: 'Força',
      canyonDamageAndDisplacement: 'Corrente de ar comprimida superando 90 km/h; deslocamento forçado de 6 metros, perda de equilíbrio e 2d10 de concussão contra paredões rochosos (DMG p. 110).',
      pioneerMitigation: 'Batedores avançam rastejando junto a canaletas do piso e ancoram cabos de segurança em fendas de arenito.',
      rescueAndStabilization: 'Tracionamento com laços de escalada, fixação de ataduras compressivas em contusões e abrigo em reentrâncias.',
      icon: '💨🏜️',
      color: '#d97706'
    };

    if (ht === 'thermal_spalling_rock_burst_shrapnel') {
      hazard = {
        hazardTitle: 'Estilhaçamento Térmico de Arenito e Projéteis de Rocha',
        saveDC: 13,
        saveType: 'Destreza',
        canyonDamageAndDisplacement: 'Lajes rochosas que estalam e partem sob choque térmico sol-sombra, disparando lascas afiadas como estilhaços a 2d8 de corte/perfuração.',
        pioneerMitigation: 'Marcha com escudos erguidos em ângulo oblíquo e uso de capuzes de couro acolchoados sob o elmo.',
        rescueAndStabilization: 'Remoção cautelosa de farpas de pedra com pinças de cirurgião de campo e aplicação de bálsamo adstringente.',
        icon: '🪨💥',
        color: '#b45309'
      };
    } else if (ht === 'canyon_flash_resonance_scree_slide') {
      hazard = {
        hazardTitle: 'Deslizamento de Seixos por Ressonância Acústica (Scree Slide)',
        saveDC: 13,
        saveType: 'Destreza',
        canyonDamageAndDisplacement: 'Encosta instável de cascalho solto que despenca sob vibração sonora; rolamento de 15 metros com 2d6 de concussão.',
        pioneerMitigation: 'Travessia em silêncio absoluto com passos diagonais leves apoiados em bordões de ponta dupla.',
        rescueAndStabilization: 'Içamento por corda guia reforçada e alinhamento de membros com talas de madeira rígida.',
        icon: '⏳🏔️',
        color: '#ca8a04'
      };
    } else if (ht === 'poisonous_canyon_centipede_nest') {
      hazard = {
        hazardTitle: 'Ninho de Lacraias Gigantes de Fenda de Basalto',
        saveDC: 13,
        saveType: 'Constituição',
        canyonDamageAndDisplacement: 'Artrópodes predatórios rastejando de fissuras escuras; picadas múltiplas de 2d6 de veneno e condição Envenenado por 1 hora.',
        pioneerMitigation: 'Inspeção prévia das frestas rochosas com fumaça de enxofre antes de apoiar apoios manuais.',
        rescueAndStabilization: 'Lavagem imediata com água salgada morna e aplicação de unguento neutralizador de toxinas de insetos.',
        icon: '🐛🪨',
        color: '#dc2626'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      canyonDamageAndDisplacement: hazard.canyonDamageAndDisplacement,
      pioneerMitigation: hazard.pioneerMitigation,
      rescueAndStabilization: hazard.rescueAndStabilization,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110-111 (Cânions e Ventos Fortes) / PHB p. 182-183 (Concussão e Terreno Difícil)'
    };
  }

  // === calcCampCanyonRockOverhangAndWindbreakStation (Abrigos Naturais de Rocha, Muros Defletores e Faixas de Cal - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampCanyonRockOverhangAndWindbreakStation(biomeKey, defenseType, options) {
    options = options || {};
    var bk = (biomeKey || 'canyon').toLowerCase();
    var dt = (defenseType || 'natural_rock_overhang_bivouac_station').toLowerCase();

    var tech = {
      defenseTitle: 'Bivaque Sob Abrigo Natural de Rocha com Teto Inclinado',
      overheadProtectionAndWindbreak: 'Reentrância em abóbada de pedra que protege contra queda de rochas do alto e amortece correntes de ar.',
      creatureDefenseAndAnchorSecurity: 'Posicionamento tático de sentinelas na boca da caverna com visão total do desfiladeiro.',
      campRestAndSafetyGuards: 'Garante descanso longo protegido e confortável sem risco de ser atingido por desabamentos do topo do cânion.',
      icon: '⛺🪨',
      color: '#10b981'
    };

    if (dt === 'dry_stone_baffle_windbreak_wall') {
      tech = {
        defenseTitle: 'Mureta Seca Defletora de Vento com Lajes de Basalto',
        overheadProtectionAndWindbreak: 'Barreira em ziguezague de pedras encaixadas reduzindo o fluxo direto do vento de garganta em 75%.',
        creatureDefenseAndAnchorSecurity: 'Impede que fagulhas da fogueira ou mantas dos membros da comitiva sejam dispersadas por rajadas.',
        campRestAndSafetyGuards: 'Permite acender fogo seguro para cozimento e manter o calor concentrado no interior do abrigo.',
        icon: '🧱💨',
        color: '#06b6d4'
      };
    } else if (dt === 'expansion_bolt_rock_anchor_guyline') {
      tech = {
        defenseTitle: 'Estaiamento de Precisão com Parafusos Expansivos na Rocha',
        overheadProtectionAndWindbreak: 'Ancoragem com cunhas de aço cravadas em fendas da rocha firme suportando 1.200 kg de tração contínua.',
        creatureDefenseAndAnchorSecurity: 'Garante que toldos e redes permaneçam perfeitamente esticados mesmo sob ventos ciclônicos de cânion.',
        campRestAndSafetyGuards: 'Elimina o perigo de barracas colapsarem durante vendavais repentinos na calada da noite.',
        icon: '🔩🛡️',
        color: '#ca8a04'
      };
    } else if (dt === 'crevice_scorpion_barrier_chalk_line') {
      tech = {
        defenseTitle: 'Faixa Perimétrica de Cal Virgem e Cinza Sulfurosa',
        overheadProtectionAndWindbreak: 'Trilha alcalina contínua traçada ao redor dos leitos criando barreira cáustica intransponível.',
        creatureDefenseAndAnchorSecurity: 'Impede a aproximação de lacraias gigantes, escorpiões da fenda e víboras das pedras durante o sono.',
        campRestAndSafetyGuards: 'Garante que os aventureiros descansem sem preocupação com picadas peçonhentas no bivaque.',
        icon: '⚪🦂',
        color: '#f59e0b'
      };
    }

    return {
      biomeKey: bk,
      defenseType: dt,
      defenseTitle: tech.defenseTitle,
      overheadProtectionAndWindbreak: tech.overheadProtectionAndWindbreak,
      creatureDefenseAndAnchorSecurity: tech.creatureDefenseAndAnchorSecurity,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Bivaque em Cânion) / XGE p. 78 (Equipamento de Montanhismo e Ferramentas)'
    };
  }

  // === calcWildernessSteppeGrassFireAndWindstormHazard (Queimadas em Grama Seca, Redemoinhos de Poeira e Debandada - DMG p. 110-111 / PHB p. 182-183) ===
  function calcWildernessSteppeGrassFireAndWindstormHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'steppe').toLowerCase();
    var ht = (hazardType || 'wildfire_grass_inferno_surge').toLowerCase();

    var hazard = {
      hazardTitle: 'Parede de Fogo Rápido em Grama Seca (Grass Fire)',
      saveDC: 14,
      saveType: 'Destreza',
      steppeDamageAndDisruption: 'Labaredas rasteiras impulsionadas a 40 km/h; calor abrasador de 3d8 de fogo e risco de asfixia por fumaça densa (DMG p. 110).',
      pioneerMitigation: 'Batedores iniciam contra-fogo preventivo a sotavento e conduzem a comitiva para solo já calcinado.',
      rescueAndStabilization: 'Abafamento com mantas de couro úmidas, compressas de terra fria em queimaduras e hidratação imediata.',
      icon: '🔥🌾',
      color: '#ea580c'
    };

    if (ht === 'blinding_dust_devil_whirlwind') {
      hazard = {
        hazardTitle: 'Redemoinho de Poeira Cortante e Areia Fina (Dust Devil)',
        saveDC: 13,
        saveType: 'Destreza',
        steppeDamageAndDisruption: 'Vórtice térmico rotativo arremessando cascalho; 2d6 de corte/concussão e condição Cego por 1 minuto.',
        pioneerMitigation: 'Uso de óculos com fendas protetoras de osso ou couro e postura agachada de costas para a rajada.',
        rescueAndStabilization: 'Lavagem ocular abundante com água filtrada e colírio de infusão calmante de camomila.',
        icon: '🌪️🏜️',
        color: '#d97706'
      };
    } else if (ht === 'hidden_badger_and_marmot_burrow_tangle') {
      hazard = {
        hazardTitle: 'Campo Minado de Tocas de Marmotas e Texugos',
        saveDC: 13,
        saveType: 'Destreza',
        steppeDamageAndDisruption: 'Galerias subterrâneas frágeis sob pastagens; afundamento súbito causando 1d8 de concussão e risco de fratura em montarias.',
        pioneerMitigation: 'Marcha em fila indiana com guia a pé sondando o terreno com vara flexível antes da passagem das montarias.',
        rescueAndStabilization: 'Imobilização com talas de bambu e ataduras de linho, poupando a pata do animal acidentado.',
        icon: '🕳️🦡',
        color: '#78716c'
      };
    } else if (ht === 'stampeding_bison_herd_avalanche') {
      hazard = {
        hazardTitle: 'Debandada de Manada de Bisões em Pânico Cego',
        saveDC: 14,
        saveType: 'Destreza',
        steppeDamageAndDisruption: 'Centenas de cascos pesados cruzando a planície; 4d10 de concussão/atropelamento em cone massivo de 30 metros.',
        pioneerMitigation: 'Vigília com percepção acústica de tremores no chão e acendimento de archotes de fumaça negra para desviar o rebanho.',
        rescueAndStabilization: 'Socorro emergencial com talas torácicas e elixires restauradores para aventureiros pisoteados.',
        icon: '🦬💨',
        color: '#b45309'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      steppeDamageAndDisruption: hazard.steppeDamageAndDisruption,
      pioneerMitigation: hazard.pioneerMitigation,
      rescueAndStabilization: hazard.rescueAndStabilization,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110-111 (Fogo nos Ermos e Estepes) / PHB p. 182-183 (Sufocamento e Atropelamento)'
    };
  }

  // === calcCampSteppeYurtShelterAndFirebreakStation (Tendas Yurt Nômades, Faixas Aceiro e Mantas de Couro - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampSteppeYurtShelterAndFirebreakStation(biomeKey, defenseType, options) {
    options = options || {};
    var bk = (biomeKey || 'steppe').toLowerCase();
    var dt = (defenseType || 'nomadic_circular_yurt_felt_shelter').toLowerCase();

    var tech = {
      defenseTitle: 'Tenda Yurt Nômade Circular com Armação Flexível de Vime',
      aerodynamicWindResistance: 'Estrutura circular autoportante sem arestas que dissipa ventos de até 100 km/h sem tombar.',
      firebreakSecurityAndComfort: 'Cobertura de feltro de lã impermeabilizada que barra o ar gélido noturno e respingos de chuva.',
      campRestAndSafetyGuards: 'Permite sono longo aquecido e repousante para toda a comitiva mesmo no meio de vendavais de estepe.',
      icon: '⛺🌀',
      color: '#10b981'
    };

    if (dt === 'plowed_perimeter_firebreak_trench') {
      tech = {
        defenseTitle: 'Faixa Aceiro Perimétrica Roçada e Escavada',
        aerodynamicWindResistance: 'Trincheira limpa de 4 metros sem qualquer palha ou grama seca ao redor do acampamento.',
        firebreakSecurityAndComfort: 'Impede 100% que labaredas de fogo rasteiro cheguem às coberturas e mantimentos do grupo.',
        campRestAndSafetyGuards: 'Garante vigília segura contra queimadas noturnas trazidas repentinamente por mudanças de vento.',
        icon: '🛡️🌾',
        color: '#06b6d4'
      };
    } else if (dt === 'wet_leather_dousing_flaps_station') {
      tech = {
        defenseTitle: 'Estação de Mantas de Couro Úmidas e Bolsas Extintoras',
        aerodynamicWindResistance: 'Posto de contenção rápida com couros pesados embebidos em água prontos para abafar fagulhas.',
        firebreakSecurityAndComfort: 'Neutraliza fagulhas incandescentes sopradas pelo vento antes de formarem novos focos no acampamento.',
        campRestAndSafetyGuards: 'Mantém a área das barracas e depósitos de ração protegida de centelhas durante a noite inteira.',
        icon: '🧤💧',
        color: '#ca8a04'
      };
    } else if (dt === 'central_brazier_deflected_vent_chimney') {
      tech = {
        defenseTitle: 'Braseiro Central com Coifa e Defletor Aerodinâmico',
        aerodynamicWindResistance: 'Fogareiro embutido com tiragem regulável que aquece uniformemente o interior da tenda.',
        firebreakSecurityAndComfort: 'Elimina risco de intoxicação por monóxido de carbono e previne faíscas soltas no feltro.',
        campRestAndSafetyGuards: 'Proporciona ambiente agradável para recuperação completa dos aventureiros após marchas extenuantes.',
        icon: '🔥🛖',
        color: '#f59e0b'
      };
    }

    return {
      biomeKey: bk,
      defenseType: dt,
      defenseTitle: tech.defenseTitle,
      aerodynamicWindResistance: tech.aerodynamicWindResistance,
      firebreakSecurityAndComfort: tech.firebreakSecurityAndComfort,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Bivaque em Estepe) / XGE p. 78 (Equipamento de Proteção e Sobrevivência)'
    };
  }

  // === calcWildernessMangroveSwampAndTidalMudflatHazard (Manguezais de Maré, Peixes-Pedra e Gaiolas de Raízes - DMG p. 110-111 / PHB p. 182-183) ===
  function calcWildernessMangroveSwampAndTidalMudflatHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'swamp').toLowerCase();
    var ht = (hazardType || 'anaerobic_black_mudflat_sink_trap').toLowerCase();

    var hazard = {
      hazardTitle: 'Lodo Negro Anaeróbico de Maré Baixa e Sucção Pútrida',
      saveDC: 14,
      saveType: 'Força',
      mangroveDamageAndTrapping: 'Lamaçal salino profundo de sucção a vácuo; perda total de deslocamento e risco crítico de submersão na maré enchente (DMG p. 110).',
      pioneerMitigation: 'Batedores avançam exclusivamente pelas raízes escora de mangue vermelho e usam pranchas de bambu para cruzar canais.',
      rescueAndStabilization: 'Tracionamento com laços e cabos estaiados em troncos firmes, seguido de lavagem das feridas com água doce morna.',
      icon: '🦀🪵',
      color: '#475569'
    };

    if (ht === 'submerged_stonefish_and_stingray_spine') {
      hazard = {
        hazardTitle: 'Ferrão Oculto de Peixe-Pedra e Arraia de Lama Salobra',
        saveDC: 13,
        saveType: 'Constituição',
        mangroveDamageAndTrapping: 'Espinho peçonhento na vasa da maré baixa; 2d8 de veneno/perfuração, dor lancinante e condição Envenenado por 24 horas.',
        pioneerMitigation: 'Marcha arrastando os pés na lama para afugentar peixes bentônicos e botas de sola chapeada com madeira dura.',
        rescueAndStabilization: 'Imersão imediata do membro atingido em água a 45°C para neutralizar o veneno proteico e extração da farpa.',
        icon: '🐟⚠️',
        color: '#dc2626'
      };
    } else if (ht === 'tide_surge_mangrove_root_cage_trap') {
      hazard = {
        hazardTitle: 'Subida Súbita de Maré e Gaiola de Raízes Aéreas',
        saveDC: 13,
        saveType: 'Destreza',
        mangroveDamageAndTrapping: 'Água subindo 2 metros em minutos enquanto raízes retorcidas prendem botas e fardos; 2d6 de concussão e risco de afogamento.',
        pioneerMitigation: 'Monitoramento rigoroso das tábuas de maré lunares e navegação exclusiva por canais principais com canoas leves.',
        rescueAndStabilization: 'Corte ágil de raízes com facões de mato pesados e flutuação de companheiros com bexigas de ar infladas.',
        icon: '🌊🌿',
        color: '#0284c7'
      };
    } else if (ht === 'stagnant_salt_marsh_gas_burst') {
      hazard = {
        hazardTitle: 'Erupção de Gás Sulfídrico em Esteira de Algas Podres',
        saveDC: 13,
        saveType: 'Constituição',
        mangroveDamageAndTrapping: 'Névoa fétida de sulfeto sob lâmina d\'água agitada; 2d6 de dano de veneno e desvantagem em testes de resistência física.',
        pioneerMitigation: 'Máscaras de pano embebidas em água salgada limpa e travessia rápida sem apoiar bastões no lodo podre.',
        rescueAndStabilization: 'Remoção urgente para praia aberta com brisa marinha e inalação de vapores de resina balsâmica.',
        icon: '☣️🫧',
        color: '#84cc16'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      mangroveDamageAndTrapping: hazard.mangroveDamageAndTrapping,
      pioneerMitigation: hazard.pioneerMitigation,
      rescueAndStabilization: hazard.rescueAndStabilization,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110-111 (Pântanos Salgados e Marés) / PHB p. 182-183 (Asfixia e Terreno Difícil)'
    };
  }

  // === calcCampMangroveStiltPlatformAndOutriggerStation (Plataformas em Forquilha, Pirogas de Balancim e Coletor de Chuva - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampMangroveStiltPlatformAndOutriggerStation(biomeKey, defenseType, options) {
    options = options || {};
    var bk = (biomeKey || 'swamp').toLowerCase();
    var dt = (defenseType || 'stilted_mangrove_timber_platform_deck').toLowerCase();

    var tech = {
      defenseTitle: 'Plataforma Elevada em Forquilhas de Mangue Vermelho',
      stiltElevationAndTidalSecurity: 'Piso de toras montado 2 metros acima da maré alta máxima apoiado na copa de raízes escora imputrescíveis.',
      mooringAndWaterHarvestingDefenses: 'Isolamento completo contra a lama cáustica, marés de sizígia e rastejantes carnívoros do manguezal.',
      campRestAndSafetyGuards: 'Permite repouso longo seco e confortável sem risco de inundação da área dos sacos de dormir.',
      icon: '🛖🌊',
      color: '#10b981'
    };

    if (dt === 'outrigger_pirogue_tied_mooring_boom') {
      tech = {
        defenseTitle: 'Amarração de Pirogas Fluviais com Balancim Estabilizador',
        stiltElevationAndTidalSecurity: 'Canoas leves com hastes estabilizadoras amarradas com cabo de folga na lateral da plataforma.',
        mooringAndWaterHarvestingDefenses: 'Rota de fuga e transporte de equipamentos sempre flutuando e pronta para uso imediato em emergências.',
        campRestAndSafetyGuards: 'Garante evacuação ordenada da comitiva caso o nível da maré suba além das previsões astronômicas.',
        icon: '🛶⚓',
        color: '#06b6d4'
      };
    } else if (dt === 'elevated_fire_hearth_sand_box') {
      tech = {
        defenseTitle: 'Caixa de Fogo Elevada com Cama de Areia e Argila Seca',
        stiltElevationAndTidalSecurity: 'Bandeja suspensa de madeira revestida com 10 cm de areia e cascalho de conchas para fogueira contínua.',
        mooringAndWaterHarvestingDefenses: 'Permite cozinhar e manter fumaça repelente sem queimar o assoalho de madeira da plataforma.',
        campRestAndSafetyGuards: 'Mantém o bivaque aquecido e livre de mosquitos transmissores de febres estuarinas durante a noite.',
        icon: '🔥📦',
        color: '#ca8a04'
      };
    } else if (dt === 'brackish_water_solar_still_and_rain_tarps') {
      tech = {
        defenseTitle: 'Toldos Coletores de Chuva e Destilador de Água Salobra',
        stiltElevationAndTidalSecurity: 'Lonas côncavas limpas captando água pluvial direcionada para barris de carvalho estéreis.',
        mooringAndWaterHarvestingDefenses: 'Abastecimento diário de até 30 litros de água doce cristalina em pleno ambiente de salmoura marinha.',
        campRestAndSafetyGuards: 'Garante que os aventureiros mantenham hidratação impecável prevenindo intoxicações por água salgada.',
        icon: '🌧️🚰',
        color: '#f59e0b'
      };
    }

    return {
      biomeKey: bk,
      defenseType: dt,
      defenseTitle: tech.defenseTitle,
      stiltElevationAndTidalSecurity: tech.stiltElevationAndTidalSecurity,
      mooringAndWaterHarvestingDefenses: tech.mooringAndWaterHarvestingDefenses,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Bivaque Estuarino) / XGE p. 78 (Equipamento Náutico e Sobrevivência)'
    };
  }

  // === calcWildernessVolcanicHighlandTephraAndLavaBombHazard (Bombas de Lava, Plumas de Dióxido de Enxofre e Gêiseres Ácidos - DMG p. 110-111 / PHB p. 182-183) ===
  function calcWildernessVolcanicHighlandTephraAndLavaBombHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'volcanic').toLowerCase();
    var ht = (hazardType || 'incandescent_lava_bomb_barrage').toLowerCase();

    var hazard = {
      hazardTitle: 'Chuva de Bombas de Lava Incandescente e Ejetos Balísticos',
      saveDC: 14,
      saveType: 'Destreza',
      volcanicDamageAndEjection: 'Projéteis de magma semifundido em trajetória parabólica a 120 km/h; 4d6 de fogo e 2d6 de concussão com estilhaços em raio de 4,5 metros (DMG p. 110).',
      pioneerMitigation: 'Batedores observam rastros de fumaça ascendente na caldeira e orientam corrida imediata para a base de esporões de basalto maciço.',
      rescueAndStabilization: 'Resfriamento com água limpa, desbridamento cauteloso de tecidos queimados e curativo com unguento estéril de banha animal.',
      icon: '🌋☄️',
      color: '#dc2626'
    };

    if (ht === 'toxic_sulfur_dioxide_plume_drift') {
      hazard = {
        hazardTitle: 'Pluma Rasteira de Dióxido de Enxofre e Cinza Escaldante',
        saveDC: 13,
        saveType: 'Constituição',
        volcanicDamageAndEjection: 'Névoa pesada e corrosiva descendo a encosta; 2d6 de dano de ácido/veneno e 1 nível de exaustão por tosse asfixiante.',
        pioneerMitigation: 'Uso de máscaras faciais de linho embebidas em vinagre fraco e marcha rápida pelas cristas elevadas contra o vento.',
        rescueAndStabilization: 'Lavagem das vias aéreas com soro morno de cantil e inalação de vapores de infusão emoliente.',
        icon: '☣️🌋',
        color: '#eab308'
      };
    } else if (ht === 'brittle_lava_crust_breakthrough') {
      hazard = {
        hazardTitle: 'Rompimento de Crosta Fina de Basalto e Tubo Magmático Oco',
        saveDC: 14,
        saveType: 'Destreza',
        volcanicDamageAndEjection: 'Piso de lava vítrea cedendo sob o peso da marcha; 3d8 de dano de fogo imediato e perda de calçados pela temperatura de 400°C.',
        pioneerMitigation: 'Sondagem sistemática do solo com bastões longos de ponta de ferro e avanço exclusivo por cordões de lava encordoada espessa.',
        rescueAndStabilization: 'Aplicação de compressas frias de lama mineral e imobilização do membro com talas de madeira rígida.',
        icon: '🕳️🔥',
        color: '#ea580c'
      };
    } else if (ht === 'hot_acid_geyser_blowout') {
      hazard = {
        hazardTitle: 'Sopro Súbito de Gêiser Hidrotermal e Água Ácida Fervente',
        saveDC: 13,
        saveType: 'Destreza',
        volcanicDamageAndEjection: 'Erupção hidrotermal repentina de vapor e ácido a 15 metros de altura; 2d10 de fogo/ácido em raio de 3 metros.',
        pioneerMitigation: 'Identificação de eflorescências de enxofre cristalizado no chão e audição de silvos de pressão subterrânea.',
        rescueAndStabilization: 'Neutralização tópica com pasta de cinza vegetal pura e irrigação abundante com água potável.',
        icon: '💨🧪',
        color: '#f97316'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      volcanicDamageAndEjection: hazard.volcanicDamageAndEjection,
      pioneerMitigation: hazard.pioneerMitigation,
      rescueAndStabilization: hazard.rescueAndStabilization,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110-111 (Ambientes Vulcânicos e Calor Extremo) / PHB p. 182-183 (Asfixia e Fogo)'
    };
  }

  // === calcCampVolcanicBasaltOverhangAndTephraTrenchStation (Bivaques sob Marquise de Basalto, Defletores de Cinza e Lastro de Pedra-Pomes - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampVolcanicBasaltOverhangAndTephraTrenchStation(biomeKey, defenseType, options) {
    options = options || {};
    var bk = (biomeKey || 'volcanic').toLowerCase();
    var dt = (defenseType || 'reinforced_basalt_shelf_bivouac').toLowerCase();

    var tech = {
      defenseTitle: 'Bivaque Sob Marquise de Basalto Maciço Colunar',
      overheadMagmaProtection: 'Abóbada de rocha vulcânica densa suportando impacto balístico de bombas e desviando chuva de cinzas incandescentes.',
      respiratoryAndThermalInsulation: 'Permite posicionamento de sentinelas em frestas laterais com ângulo total de visão da encosta.',
      campRestAndSafetyGuards: 'Garante repouso longo imune a desabamentos causados por tremores vulcânicos ou fragmentos de magma.',
      icon: '🛖🌋',
      color: '#10b981'
    };

    if (dt === 'angled_tephra_deflector_screen_trench') {
      tech = {
        defenseTitle: 'Trincheira com Defletores Inclinados de Cinza e Escória',
        overheadMagmaProtection: 'Valeta escavada com telas de couro cru inclinadas a 45° que fazem escorregar cinzas e pedregulhos quentes.',
        respiratoryAndThermalInsulation: 'Mantém a área das barracas livre de acúmulo de peso de cinza que poderia colapsar as coberturas.',
        campRestAndSafetyGuards: 'Permite vigília desobstruída e evacuação veloz mesmo sob precipitação contínua de tephra vulcânica.',
        icon: '🛡️🪨',
        color: '#06b6d4'
      };
    } else if (dt === 'airtight_vinegar_sponge_breathing_kit') {
      tech = {
        defenseTitle: 'Estação de Filtros de Esponja com Vinagre e Carvão Ativo',
        overheadMagmaProtection: 'Aparatos respiratórios individuais com dupla camada de esponja que retêm cinzas microscópicas e enxofre.',
        respiratoryAndThermalInsulation: 'Protege as vias aéreas da comitiva contra edema pulmonar e queimaduras químicas durante o sono.',
        campRestAndSafetyGuards: 'Garante que os aventureiros acordem recuperados sem tosses debilitantes ou dores torácicas.',
        icon: '🤿🌿',
        color: '#ca8a04'
      };
    } else if (dt === 'thermal_isolation_pumice_stone_layer') {
      tech = {
        defenseTitle: 'Lastro Isolante de Pedra-Pomes Térmica sob os Leitos',
        overheadMagmaProtection: 'Camada de 15 cm de rocha porosa sob os colchonetes bloqueando 95% do calor irradiado pelo solo magmático.',
        respiratoryAndThermalInsulation: 'Impede a combustão espontânea de mantas e alforjes em contato com lajes basálticas superaquecidas.',
        campRestAndSafetyGuards: 'Proporciona sono confortável em temperatura estável sem risco de queimaduras por condução térmica.',
        icon: '🧱🌡️',
        color: '#f59e0b'
      };
    }

    return {
      biomeKey: bk,
      defenseType: dt,
      defenseTitle: tech.defenseTitle,
      overheadMagmaProtection: tech.overheadMagmaProtection,
      respiratoryAndThermalInsulation: tech.respiratoryAndThermalInsulation,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Bivaque Vulcânico) / XGE p. 78 (Equipamento de Proteção e Sobrevivência)'
    };
  }

  // === calcWildernessAcidMarshAndCorrosiveSlimeHazard (Lamaçais Cáusticos de Alúmen, Névoa Ácida e Utriculárias Carnívoras - DMG p. 110-111 / PHB p. 182-183) ===
  function calcWildernessAcidMarshAndCorrosiveSlimeHazard(biomeKey, hazardType, options) {
    options = options || {};
    var bk = (biomeKey || 'swamp').toLowerCase();
    var ht = (hazardType || 'corrosive_alum_mud_immersion').toLowerCase();

    var hazard = {
      hazardTitle: 'Imersão em Lodo Cáustico de Alúmen e Ácido Sulfúrico',
      saveDC: 14,
      saveType: 'Destreza',
      acidDamageAndCorrosion: 'Lamaçal salino ácido de pH extremo sob crosta fétida; 2d8 de dano ácido imediato e risco de corrosão de armaduras não mágicas (-1 CA se não lavada com água potável) (DMG p. 110).',
      pioneerMitigation: 'Batedores testam o solo com tiras de tornassol vegetal e sondam a consistência com bastões graduados de teca.',
      rescueAndStabilization: 'Polvilhamento imediato com pó de giz neutralizador, lavagem abundante com água pura e ataduras de linho ungido.',
      icon: '🧪🕳️',
      color: '#84cc16'
    };

    if (ht === 'fuming_acid_mist_inversion') {
      hazard = {
        hazardTitle: 'Inversão Térmica de Névoa Ácida Sulfurosa e Vapores',
        saveDC: 13,
        saveType: 'Constituição',
        acidDamageAndCorrosion: 'Nuvem ácida rasteira condensada na alvorada; queimação brônquica aguda, 2d6 de dano de ácido/veneno e 1 nível de exaustão.',
        pioneerMitigation: 'Uso de máscaras de couro seladas com banha animal e esponjas umedecidas em solução alcalina fraca.',
        rescueAndStabilization: 'Colírio de água doce com infusão de mel de acácia e inalação de vapores emolientes de camomila.',
        icon: '🌫️☣️',
        color: '#a3e635'
      };
    } else if (ht === 'dissolving_peat_sinkhole_collapse') {
      hazard = {
        hazardTitle: 'Colapso de Turfeira Oca Dissolvida por Ácido',
        saveDC: 13,
        saveType: 'Destreza',
        acidDamageAndCorrosion: 'Solo turfoso carcomido pela acidez subterrânea que cede em funis; 2d6 de concussão e 2d6 de ácido por respingos na queda.',
        pioneerMitigation: 'Marcha espaçada em 6 metros com distribuição de peso em esteios transversais de bambu.',
        rescueAndStabilization: 'Içamento por corda encerada resistente a corrosão e imobilização de fraturas com talas limpas.',
        icon: '🕳️⚠️',
        color: '#65a30d'
      };
    } else if (ht === 'carnivorous_acidic_bladderwort_trap') {
      hazard = {
        hazardTitle: 'Colônia de Utriculárias Carnívoras Gigantes Aquáticas',
        saveDC: 13,
        saveType: 'Força',
        acidDamageAndCorrosion: 'Vesículas vegetais que sugam membros de viajantes injetando enzimas digestivas cáusticas; 2d6 de dano de ácido/perfuração e aprisionamento.',
        pioneerMitigation: 'Identificação visual de vesículas translúcidas flutuantes e corte preventivo com foices compridas.',
        rescueAndStabilization: 'Desativação enzimática com álcool destilado puro e curativo compressivo com pasta adstringente.',
        icon: '🌱🩸',
        color: '#4d7c0f'
      };
    }

    return {
      biomeKey: bk,
      hazardType: ht,
      hazardTitle: hazard.hazardTitle,
      saveDC: hazard.saveDC,
      saveType: hazard.saveType,
      acidDamageAndCorrosion: hazard.acidDamageAndCorrosion,
      pioneerMitigation: hazard.pioneerMitigation,
      rescueAndStabilization: hazard.rescueAndStabilization,
      icon: hazard.icon,
      color: hazard.color,
      dndRef: 'DMG p. 110-111 (Pântanos Ácidos e Terreno Corrosivo) / PHB p. 182-183 (Asfixia e Dano Ácido)'
    };
  }

  // === calcCampAcidMarshCorduroyCausewayAndLimestoneBed (Calçadas de Pranchões, Leito de Calcário e Bancadas de Graxa - DMG p. 111 / XGE p. 78 / PHB p. 150) ===
  function calcCampAcidMarshCorduroyCausewayAndLimestoneBed(biomeKey, defenseType, options) {
    options = options || {};
    var bk = (biomeKey || 'swamp').toLowerCase();
    var dt = (defenseType || 'corduroy_waxed_pine_log_causeway').toLowerCase();

    var tech = {
      defenseTitle: 'Calçada de Pranchões de Pinho Encerado (Corduroy)',
      acidIsolationAndGroundSupport: 'Piso contínuo de meias-toras de pinho amarradas e untadas com sebo, isolando 100% da lama ácida cáustica.',
      chemicalNeutralizationAndEquipmentSafety: 'Elimina o contato das solas de couro e mantimentos com o lodo corrosivo do charco.',
      campRestAndSafetyGuards: 'Permite circulação ágil e segura no acampamento sem risco de dissolução de botas ou equipamentos.',
      icon: '🪵🛡️',
      color: '#10b981'
    };

    if (dt === 'crushed_limestone_neutralizing_bed') {
      tech = {
        defenseTitle: 'Leito Neutralizador de Calcário Triturado e Cal',
        acidIsolationAndGroundSupport: 'Camada de 10 cm de brita calcária espalhada sob as tendas neutralizando quimicamente vapores e respingos ácidos.',
        chemicalNeutralizationAndEquipmentSafety: 'Cria microambiente de pH neutro que impede corrosão de metais e queimação na pele dos aventureiros.',
        campRestAndSafetyGuards: 'Garante que os membros da comitiva durmam sem inalar eflúvios cáusticos durante a noite inteira.',
        icon: '🪨🧪',
        color: '#06b6d4'
      };
    } else if (dt === 'elevated_limestone_mound_bivouac') {
      tech = {
        defenseTitle: 'Bivaque em Montículo Calcário Natural Elevado',
        acidIsolationAndGroundSupport: 'Assentamento sobre crista natural de rocha carbonática que drena enxurradas ácidas para longe das coberturas.',
        chemicalNeutralizationAndEquipmentSafety: 'Solo sólido e quimicamente básico imune a afundamentos em turfas carcomidas pelo ácido.',
        campRestAndSafetyGuards: 'Proporciona descanso restaurador estável e seco com visão tática de aproximação de predadores anfíbios.',
        icon: '⛰️⛺',
        color: '#ca8a04'
      };
    } else if (dt === 'greased_leather_gear_preservation_station') {
      tech = {
        defenseTitle: 'Bancada de Conservação com Sebo Animal e Cera de Abelha',
        acidIsolationAndGroundSupport: 'Ponto de manutenção intensiva com graxa pesada que impermeabiliza armaduras, arreios e bainhas.',
        chemicalNeutralizationAndEquipmentSafety: 'Cria película hidrofóbica que repele respingos ácidos e previne ferrugem e corrosão galvânica.',
        campRestAndSafetyGuards: 'Preserva a integridade e bônus de CA dos equipamentos de combate para a jornada seguinte.',
        icon: '🧴🗡️',
        color: '#f59e0b'
      };
    }

    return {
      biomeKey: bk,
      defenseType: dt,
      defenseTitle: tech.defenseTitle,
      acidIsolationAndGroundSupport: tech.acidIsolationAndGroundSupport,
      chemicalNeutralizationAndEquipmentSafety: tech.chemicalNeutralizationAndEquipmentSafety,
      campRestAndSafetyGuards: tech.campRestAndSafetyGuards,
      icon: tech.icon,
      color: tech.color,
      dndRef: 'DMG p. 111 (Bivaque em Charco Ácido) / XGE p. 78 (Equipamento de Proteção e Sobrevivência)'
    };
  }

  // === formatExpeditionItinerary (Resumo Imersivo D&D 5e para Prancheta) ===
  function formatExpeditionItinerary(originInput, targetInput, routeKeys, options) {
    options = options || {};
    var RB = CART_BIOMES;

    function _resolveNode(inp) {
      if (!inp) return null;
      if (typeof inp === 'object' && inp.name) return inp;
      var k = (typeof inp === 'string') ? inp : inp.key;
      return RB.find(function(b){ return b.key === k; }) || { key: k, name: k, biome: 'plains' };
    }

    var orig = _resolveNode(originInput) || { key: 'plains', name: 'Portões de Valdória', biome: 'plains' };
    var targ = _resolveNode(targetInput) || { key: 'floresta', name: 'Destino da Marcha', biome: 'forest' };
    var origProv = getLocationProvince(orig.key);
    var targProv = getLocationProvince(targ.key);
    var isProv = !!options.isProvince;

    var mb = calcDistanceBearing(orig, targ, isProv);
    var miles = mb ? mb.miles : 15;
    var km = mb ? mb.km : 24;
    var leagues = mb ? mb.leagues : 5.0;
    var bearingStr = mb ? (mb.bearingCode + ' (' + mb.degrees + '° - ' + mb.bearingName + ')') : 'Norte';

    var paceKey = options.pace || 'normal';
    var formKey = options.formation || 'standard';
    var transKey = options.transport || 'foot';
    var roleKey = options.role || 'scout';
    var campKey = options.campStance || 'vigilant';

    var formObj = MARCHING_FORMATIONS[formKey] || MARCHING_FORMATIONS.standard;
    var transObj = TRANSPORT_MODES[transKey] || TRANSPORT_MODES.foot;
    var roleObj = TRAVEL_ROLES[roleKey] || TRAVEL_ROLES.scout;
    var dndInfo = getBiomeDndInfo(targ.biome || targ.key);
    var forageInfo = getBiomeForageSustainability(targ.biome || targ.key);
    var bestiaryInfo = getBiomeBestiaryThreats(targ.biome || targ.key);
    var altInfo = getBiomeAltitude(targ.biome || targ.key, targ.tier);
    var baroInfo = getBarometerForecast(options.weather || 's', targ.biome || targ.key);
    var windImp = mb ? calcWindImpact(mb.degrees, baroInfo.windDirectionDeg, baroInfo.windSpeedKmh) : null;

    // Ajuste de horas de marcha com velocidade de transporte e ritmo
    var speedMod = (paceKey === 'fast') ? 1.33 : ((paceKey === 'stealth') ? 0.67 : 1.0);
    var travelHours = +(miles / (transObj.speedMph * speedMod)).toFixed(1);
    var campCount = Math.max(0, Math.floor((travelHours - 1) / 8));

    // Nomes da rota
    var routeStepsNames = [];
    if (Array.isArray(routeKeys) && routeKeys.length) {
      routeStepsNames = routeKeys.map(function(k){
        var n = RB.find(function(b){ return b.key === k; });
        return n ? n.name : k;
      });
    } else {
      routeStepsNames = [orig.name, targ.name];
    }

    var campText = (campCount > 0)
      ? (campCount + ' Acampamento(s) com Descanso Longo (8h cada) · Postura: ' + (campKey === 'vigilant' ? '🛡️ Vigília Atenta' : (campKey === 'stealth' ? '🕯️ Acampamento Oculto' : '⛺ Repouso Pleno')))
      : 'Marcha Direta sem necessidade de pernoite na estrada';

    var forcedMarchWarning = (travelHours > 8 && campCount === 0)
      ? ('⚠️ ALERTA DE MARCHA FORÇADA (PHB p. 181): Salvaguarda de CON CD ' + (10 + Math.floor(travelHours - 8)) + ' contra Exaustão Nível 1.')
      : 'Marcha dentro do limite diário padrão (sem risco de exaustão).';

    var ratBudget = calcExpeditionRationsBudget(travelHours, options.partySize || 4, targ.biome || targ.key, options.foragerSuccess);
    var hazardInfo = getWildernessHazardDetails(targ.biome || targ.key);

    var out = [];
    out.push('📜 ITINERÁRIO DE EXPEDIÇÃO · LENDAS DE VALDORIA');
    out.push('═══════════════════════════════════════════════════════════');
    out.push('📍 Origem:     ' + orig.name + ' (' + biomePT(orig.biome || orig.key) + ' · ' + origProv.name + ')');
    out.push('🎯 Destino:    ' + targ.name + ' (' + biomePT(targ.biome || targ.key) + ' · ' + targProv.name + ')');
    out.push('🧭 Rumo:       ' + bearingStr);
    out.push('📏 Distância:  ~' + miles + ' Milhas (~' + leagues + ' Léguas · ~' + km + ' km)');
    out.push('🗺️ Rota:       ' + routeStepsNames.join(' ➔ '));
    out.push('');
    out.push('⚙️ PARÂMETROS DA MARCHA (D&D 5e):');
    out.push('• Modo de Transporte: ' + transObj.name + ' (' + transObj.speedMph + ' milhas/h)');
    out.push('• Ritmo da Comitiva:  ' + (paceKey === 'fast' ? '⚡ Rápido (30 mi/dia)' : (paceKey === 'stealth' ? '🐾 Furtivo (18 mi/dia)' : '🚶 Normal (24 mi/dia)')));
    out.push('• Ordem de Marcha:    ' + formObj.name + ' (' + formObj.desc + ')');
    out.push('• Função de Viagem:   ' + roleObj.name + ' (' + roleObj.desc + ')');
    out.push('• Vigília Selvagem:   ' + campText);
    out.push('');
    out.push('⏳ LOGÍSTICA & SOBREVIVÊNCIA:');
    out.push('• Duração Estimada:   ' + travelHours + ' Horas de Viagem');
    var elevProfile = calcRouteElevationProfile(routeKeys || [orig.key, targ.key]);
    var encImpact = calcPartyEncumbranceImpact(options.weightLbs || 180, options.partyStrengthSum || 52, transKey);
    out.push('• Custo do Terreno:   ' + (targ.difficulty || dndInfo.terrain));
    var expSched = calcExpeditionSchedule(travelHours, options.startHour || 8);
    out.push('• Topografia/Relevo:  ' + (altInfo ? (altInfo.badge + ' ' + altInfo.label + ' (' + altInfo.meters + 'm)') : 'Relevo Normal'));
    out.push('• Perfil Altimétrico: ' + elevProfile.summary + ' [' + elevProfile.sparkline + ']');
    out.push('• Cronograma 5e:      ' + expSched.summary + ' (' + expSched.totalDays + ' dia' + (expSched.totalDays > 1 ? 's' : '') + ')');
    out.push('• Carga da Comitiva:  ' + encImpact.label);
    out.push('• Barômetro Local:    ' + baroInfo.pressureHpa + ' hPa (' + baroInfo.pressureStatus + ')');
    out.push('• Dinâmica do Vento:  ' + baroInfo.windDescription + (windImp ? (' · ' + windImp.label) : ''));
    out.push('• Provisões Mínimas:  ' + ratBudget.netRations + ' Ração(ões) / ' + ratBudget.netWater + ' Galões d\'Água (' + ratBudget.partySize + ' integrantes, ' + ratBudget.travelDays + ' dia' + (ratBudget.travelDays > 1 ? 's' : '') + ')');
    out.push('• Sobrevivência 5e:   ' + ratBudget.verdict);
    var encBreakdown = calcEncounterTableBreakdown(targ.biome || targ.key, { pace: paceKey });
    out.push('• Tabela de Acasos:    Risco de Encontro ' + encBreakdown.finalChance + '% (d20 ≥ ' + encBreakdown.d20Threshold + ')');
    out.push('• Encontro Provável:   ' + encBreakdown.encounterTypes[0].icon + ' ' + encBreakdown.encounterTypes[0].label + ' (' + encBreakdown.encounterTypes[0].pct + ')');
    out.push('• Salvaguarda Alerta:  Percepção Passiva CD ' + encBreakdown.surpriseDC + ' contra emboscada');
    out.push('• Perigo Selvagem:    ' + hazardInfo.icon + ' ' + hazardInfo.name + ' (' + hazardInfo.dndRef + ')');
    out.push('• Efeito do Terreno:  ' + hazardInfo.effect + ' · ' + hazardInfo.dcCheck);
    out.push('• Mitigação Tática:   ' + hazardInfo.mitigation);
    out.push('• Estado de Marcha:   ' + forcedMarchWarning);
    out.push('');
    out.push('⚔️ AMEAÇAS & RECURSOS DO BIOMA:');
    out.push('• Terreno & Riscos:   ' + dndInfo.hazard);
    out.push('• Salvaguardas 5e:    ' + dndInfo.saves);
    out.push('• Fauna/Predadores:   ' + (bestiaryInfo ? (bestiaryInfo.threats.join(', ') + ' · Predador Alfa: ' + bestiaryInfo.apex) : 'Fauna Comum'));
    out.push('• Forrageamento D&D:  ' + (forageInfo ? (forageInfo.rating + ' (Sobrevivência CD ' + forageInfo.dc + ') · Água: ' + forageInfo.water) : 'Padrão'));
    var navCheck = calcNavigationOrientationCheck(targ.biome || targ.key, {
      hasRoadOrTrail: isProv || targ.settlement,
      hasChartedMap: options.hasChartedMap,
      pace: paceKey,
      weather: options.weather,
      isNight: options.isNight
    });
    var nearSanc = findNearestSanctuary(targ.key);
    var spoorClue = getTrailSpoorClues(targ.biome || targ.key, targ.tier);
    out.push('• Orientação & Rumo:  ' + navCheck.summary + ' (' + navCheck.lostPenalty + ')');
    if (nearSanc) {
      out.push('• Refúgio Próximo:    ' + nearSanc.name + ' (' + nearSanc.distanceMiles + ' mi a ' + nearSanc.bearingCode + ', ~' + nearSanc.travelHours + 'h)');
    }
    if (spoorClue) {
      out.push('• Pistas de Rastreio: ' + spoorClue.spoorType + ' · Sobrevivência CD ' + spoorClue.survivalDC + ' (' + spoorClue.creatureHint + ')');
    }
    var weatherExpo = calcExtremeWeatherExposure(targ.biome || targ.key, options.weather, {
      hasWinterGear: options.hasWinterGear,
      hasHeavyArmor: options.hasHeavyArmor
    });
    var mountLog = calcMountLogistics(transKey, 180, miles / 24);
    if (weatherExpo.hasHazard) {
      out.push('• Exposição Climática: ' + weatherExpo.title + ' · ' + weatherExpo.dcCheck);
    }
    if (mountLog.mode !== 'foot') {
      out.push('• Logística Montaria:  ' + mountLog.name + ' · Forragem: ' + mountLog.fodderSummary);
    }
    var restRec = calcCampRestRecovery(horasViagem > 8 ? 'long' : 'short', {
      isSanctuary: !!targ.isSanctuary,
      campStance: campKey
    });
    out.push('• Repouso & Acampamento: ' + restRec.name + ' · Risco de Interrupção: ' + restRec.interruptionRisk);
    var horizon = calcHorizonVisibility(targ.biome || targ.key, options.weather, options.isNight, altInfo && altInfo.elevationMeters > 300);
    out.push('• Alcance no Horizonte: ' + horizon.horizonMiles + ' mi (' + horizon.viewDescription + ')');
    var harvestRes = getBiomeHarvestableResources(targ.biome || targ.key, targ.tier);
    out.push('• Coleta de Recursos: ' + harvestRes.primaryHerb.name + ' (' + harvestRes.primaryHerb.dndUse + ')');
    out.push('═══════════════════════════════════════════════════════════');

    return out.join('\n');
  }

  // === _drawCartCompass ===
  function _isCompassAt(mx, my, w, h) {
    if (typeof mx !== 'number' || typeof my !== 'number') return false;
    var cx = w - 40, cy = 40;
    var dx = mx - cx, dy = my - cy;
    return (dx * dx + dy * dy) <= (26 * 26);
  }

  function _drawCartCompass(ctx, w, h, isHovered, isPulsing, targetBearing){
    // Top-right (era bottom-right, mas conflitava com zoom controls)
    var cx = w - 40, cy = 40;
    var R = 22;
    ctx.save();
    ctx.translate(cx, cy);
    if (isPulsing) {
      ctx.beginPath();
      ctx.arc(0, 0, R + 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.95)';
      ctx.lineWidth = 2.4;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 12;
      ctx.stroke();
    }
    if (isHovered) {
      ctx.beginPath();
      ctx.arc(0, 0, R + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.75)';
      ctx.lineWidth = 1.6;
      ctx.shadowColor = 'rgba(255, 200, 60, 0.85)';
      ctx.shadowBlur = 8;
      ctx.stroke();

      ctx.save();
      ctx.font = 'bold 8.5px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      var compassText = (typeof targetBearing === 'number')
        ? '🧭 Rumo ao Destino (' + Math.round(targetBearing) + '°)'
        : '🧭 Rosa dos Ventos [N]';
      ctx.fillText(compassText, 0, R + 14);
      ctx.restore();
    }
    ctx.strokeStyle = INK_DARK;
    // Anel externo
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI*2);
    ctx.stroke();
    // Anel interno
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, R-4, 0, Math.PI*2);
    ctx.stroke();
    // Tickmarks (16 directions, cardeais maiores)
    for (var ti = 0; ti < 16; ti++) {
      var tang = ti / 16 * Math.PI * 2;
      var t1 = R - 1;
      var t2 = (ti % 4 === 0) ? R - 7 : R - 3;
      ctx.lineWidth = (ti % 4 === 0) ? 1.0 : 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(tang) * t1, Math.sin(tang) * t1);
      ctx.lineTo(Math.cos(tang) * t2, Math.sin(tang) * t2);
      ctx.stroke();
    }
    // Cardinal star (4 pontas grandes — outline only)
    ctx.lineWidth = 0.9;
    for (var si = 0; si < 4; si++) {
      var ang = si * Math.PI/2 - Math.PI/2;  // N=top
      var len = R - 3;
      var w2 = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang - 0.18) * w2, Math.sin(ang - 0.18) * w2);
      ctx.lineTo(Math.cos(ang) * len,        Math.sin(ang) * len);
      ctx.lineTo(Math.cos(ang + 0.18) * w2, Math.sin(ang + 0.18) * w2);
      ctx.closePath();
      ctx.stroke();
      // Half-shading (lado direito, hatching)
      var halfP1x = Math.cos(ang + 0.18) * w2;
      var halfP1y = Math.sin(ang + 0.18) * w2;
      var halfP2x = Math.cos(ang) * len;
      var halfP2y = Math.sin(ang) * len;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(halfP1x, halfP1y);
      ctx.lineTo(halfP2x, halfP2y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(60,35,12,0.40)';
      ctx.fill();
    }
    // Diagonal points (NE/SE/SW/NW) — menores, outline
    ctx.lineWidth = 0.6;
    for (var di = 0; di < 4; di++) {
      var dang = di * Math.PI/2 - Math.PI/4;
      var dlen = R - 8;
      var dw = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(dang - 0.18) * dw, Math.sin(dang - 0.18) * dw);
      ctx.lineTo(Math.cos(dang) * dlen,       Math.sin(dang) * dlen);
      ctx.lineTo(Math.cos(dang + 0.18) * dw, Math.sin(dang + 0.18) * dw);
      ctx.closePath();
      ctx.stroke();
    }

    // Ponteiro de Destino do Astrolábio Dourado (D&D 5e)
    if (targetBearing && typeof targetBearing.degrees === 'number') {
      var tAng = (targetBearing.degrees * Math.PI / 180) - Math.PI / 2;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      var arrowLen = R - 2;
      var arrowTipX = Math.cos(tAng) * arrowLen;
      var arrowTipY = Math.sin(tAng) * arrowLen;
      var perpX = -Math.sin(tAng) * 2.8;
      var perpY = Math.cos(tAng) * 2.8;
      ctx.lineTo(arrowTipX * 0.55 + perpX, arrowTipY * 0.55 + perpY);
      ctx.lineTo(arrowTipX, arrowTipY);
      ctx.lineTo(arrowTipX * 0.55 - perpX, arrowTipY * 0.55 - perpY);
      ctx.closePath();
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }

    // Centro: círculo pequeno
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI*2);
    ctx.fillStyle = INK_DARK;
    ctx.fill();
    // N letter
    ctx.font = 'bold 9px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK_DARK;
    ctx.fillText('N', 0, -R - 5);

    // Badge com rumo sob a bússola se houver destino ou hover
    if (targetBearing || isHovered) {
      ctx.save();
      var badgeText = targetBearing ? (targetBearing.degrees + '° ' + targetBearing.bearingCode) : 'Norte 0°';
      ctx.font = '700 8px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = targetBearing ? '#fde047' : '#ffd685';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 4;
      ctx.fillText(badgeText, 0, R + 13);
      ctx.restore();
    }

    ctx.restore();
  }


  // === _drawAgedParchment ===
  // PERGAMINHO VELHO MANCHADO — wear effects orgânicos AAA (2026-05-04).
  // User pediu manchas que NÃO sejam círculos toscos. Usa _drawAgedStain
  // (multi-camada com coffee-ring + salpicos), creases orgânicas, scorched
  // edge irregular. Estilo "mapa do tesouro 1450" — bem usado, autêntico.
  function _drawAgedParchment(ctx, w, h){
    var rng = _cartSeedRand(57);
    // 1) Base sépia escurecida (cor do estilo #4)
    ctx.fillStyle = '#d8b878';
    ctx.fillRect(0, 0, w, h);
    // 2) Variação tonal MUITO SUTIL — 2026-05-04 v3: USER pediu "bem mais
    //    sutis, suaves". Raio 22-50 → 14-26 (menor). Alpha 0.08-0.15 →
    //    0.04-0.07 (quase imperceptível, só dá vida ao papel).
    for (var i = 0; i < 6; i++) {
      var bx = rng() * w, by = rng() * h;
      _drawOrganicBlob(ctx, bx, by, 14 + rng() * 12, '#b08050', 0.04 + rng() * 0.03, 200 + i * 11);
    }
    // 3) Manchas de vinho/café envelhecidas — 2026-05-04 v3: tamanho
    //    6-18 → 3-9 (bem pequenas). Alphas reduzidos no _drawAgedStain.
    //    Mais variedade de cores/tons pra parecer natural.
    var stainColors = [
      ['#6a3818', '#3a1808'], // vinho escuro
      ['#8a5028', '#4a2818'], // café
      ['#7a4020', '#3a1810'], // vinho médio
      ['#92583a', '#502818'], // café claro
      ['#6a3818', '#3a1808'], // vinho repete
      ['#7a4020', '#3a1810']  // vinho médio repete
    ];
    for (var s = 0; s < 6; s++) {
      var sx = rng() * w, sy = rng() * h;
      // size 3-9 (bem pequenas — só dão "personalidade" ao papel)
      var ssz = 3 + rng() * 6;
      var c = stainColors[s % stainColors.length];
      _drawAgedStain(ctx, sx, sy, ssz, c[0], c[1], 300 + s * 23);
    }
    // 4) Manchas de tinta antigas (clusters de pontos densos)
    for (var ki = 0; ki < 10; ki++) {
      var kx = rng() * w, ky = rng() * h;
      var clusterN = 4 + Math.floor(rng() * 6);
      for (var kj = 0; kj < clusterN; kj++) {
        var ox = (rng() - 0.5) * 12;
        var oy = (rng() - 0.5) * 12;
        var ka = 0.10 + rng() * 0.20;
        ctx.fillStyle = 'rgba(40,20,4,' + ka.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(kx + ox, ky + oy, 0.5 + rng() * 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // 5) Paper grain (textura de fibras) — Perf #5 (cartografia-perf.md): conta
    //    escalada por tier (lite ~152, full 380). Fator estável na sessão → mesma
    //    seed gera os N primeiros grains determinísticos (pixel-identical por tier).
    var _grainN = Math.round(380 * (window._valdoriaMinLoadFactor || 1));
    for (var gi = 0; gi < _grainN; gi++) {
      var gx = rng() * w, gy = rng() * h;
      var ga = 0.04 + rng() * 0.10;
      ctx.fillStyle = 'rgba(60,40,12,' + ga.toFixed(3) + ')';
      ctx.fillRect(gx, gy, 0.8, 0.8);
    }
    // 6) Dobras (creases) orgânicas — 3 horizontais + 1 diagonal
    _drawCrease(ctx, 0, h * 0.32, w, h * 0.34, 91);
    _drawCrease(ctx, 0, h * 0.66, w, h * 0.64, 92);
    _drawCrease(ctx, w * 0.45, 0, w * 0.55, h, 93);
    // NOTA: Scorched edges é uma função separada (_drawScorchedEdge) —
    // chamada APÓS o conteúdo (biome art + paths + nodes) pra ficar
    // por cima como vinheta. Evita escurecer demais o conteúdo central.
  }

  // === _drawUnknownLocation ===
  // 2026-05-04 USER REQUEST: locais não-descobertos aparecem como
  // INSINUAÇÃO no mapa — círculo tracejado com "?" no centro. Sugere
  // que existe algo ali, mas o jogador precisa de mapa do Cartógrafo
  // Corvus (na Praça Central) ou descoberta natural pra revelar.
  function _drawUnknownLocation(ctx, b, w, h){
    var bx = b.x * w, by = b.y * h;
    ctx.save();
    // Círculo tracejado discreto
    ctx.strokeStyle = INK_LIGHT;
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.arc(bx, by, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // "?" no centro (italic, sutil)
    ctx.fillStyle = INK_MED;
    ctx.globalAlpha = 0.65;
    ctx.font = 'italic 14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', bx, by);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // === WORLD-CART ENGINE — fonte ÚNICA do mapa (cidade + exploração) =========
  // 2026-06-04 (sessão #73 — P1 unificação): antes o ORQUESTRADOR do mapa vivia
  // DUPLICADO em cada HTML — cidade evoluiu pro world-map.webp + ícones OpenAI;
  // exploração ficou no renderizador antigo (pergaminho/pictograma) → os mapas
  // divergiram. Agora o renderizador COMPLETO (fundo world-map cover + ícones nas
  // coords do editor + nodes/paths/pin/bússola, com pan/zoom) é UMA função aqui.
  // Cada HTML cria sua instância (createWorldCart) com o seu config e chama
  // .draw(view) / .findNodeAt(view,...). Mudou aqui → cidade E exploração refletem.
  //
  //   cfg = {
  //     apiBase,                              // base p/ GET /api/exploracao/map-coords
  //     getKnownLocations(): string[]|null,   // null = mostra TODOS (exploração);
  //                                           // array = filtra + "?" nos ocultos (cidade)
  //     getPlayerBiomeKey(): string|null,     // bioma do player (pin "VOCÊ ESTÁ AQUI")
  //     getQuestFocus(): {key,title}|null,    // halo dourado de missão (opcional)
  //     drawQuestHalo(ctx,node,w,h,title),    // desenha o halo (opcional; cidade só)
  //     onAsyncRedraw(),                      // chamado quando imagem/coords chegam (redraw)
  //   }
  //   view = { ctx, w, h, dpr, panX, panY, zoom, hoverNode }
  var _lastOffscreenComitivaBadge = null;

  function _drawOffScreenComitivaChevron(ctx, w, h, targetX, targetY, locName) {
    var margin = 32;
    var topMargin = 58;
    var bottomMargin = 45;
    var cx = Math.max(margin, Math.min(w - margin, targetX));
    var cy = Math.max(topMargin, Math.min(h - bottomMargin, targetY));
    var angle = Math.atan2(targetY - cy, targetX - cx);

    ctx.save();
    ctx.translate(cx, cy);

    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(25, 18, 10, 0.88)';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#ffd700';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.65)';
    ctx.shadowBlur = 8;
    ctx.stroke();

    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(11, -5);
    ctx.lineTo(11, 5);
    ctx.closePath();
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    ctx.restore();

    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📍', 0, 0);

    ctx.font = '700 8.5px Cinzel, serif';
    ctx.fillStyle = '#fde047';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;
    var labelY = (cy < h / 2) ? 22 : -20;
    ctx.fillText('COMITIVA', 0, labelY);

    ctx.restore();
    return { x: cx, y: cy, active: true };
  }

  function createWorldCart(cfg){
    cfg = cfg || {};
    var _baseCache = null;
    var _locArt = null;       // {key: Image|false}
    var _locCoords = {};      // override {key:{x,y,scale}} do editor (server)
    var _coordsLoaded = false, _coordsFetching = false;
    var _viewMode = 'world'; // 'world' | 'province'
    var _activeProvId = 'world';
    var _provImgs = {};
    var _provLoaded = {};
    // Preload das 8 cartas regionais do Atlas de Províncias (persistem em cache e com multi-path fallback)
    (function(){
      var vHash = (typeof window !== 'undefined' && window.VBUNDLE_HASH) ? ('?v=' + window.VBUNDLE_HASH) : ('?v=' + Date.now());
      CART_PROVINCES.forEach(function(prov){
        if (prov.id === 'world') return;
        var paths = [
          '/shared/img/map/provinces/' + prov.id + '.webp' + vHash,
          './shared/img/map/provinces/' + prov.id + '.webp' + vHash,
          '../shared/img/map/provinces/' + prov.id + '.webp' + vHash,
          '../valdoria-webapp/shared/img/map/provinces/' + prov.id + '.webp' + vHash
        ];
        var pathIdx = 0;
        var im = new Image();
        im.onload = function(){
          _provLoaded[prov.id] = true;
          if (_viewMode === 'province' && _activeProvId === prov.id) { _baseCache = null; _onLoad(); }
        };
        im.onerror = function(){
          pathIdx++;
          if (pathIdx < paths.length) {
            im.src = paths[pathIdx];
          } else {
            _provLoaded[prov.id] = false;
          }
        };
        im.src = paths[0];
        _provImgs[prov.id] = im;
      });
    })();  // P-mapa #73: carrega coords c/ retry (race apiBase)
    var _apiBase = (cfg.apiBase || '');
    var _onLoad = (typeof cfg.onAsyncRedraw === 'function') ? cfg.onAsyncRedraw : function(){};

    // Quando a imagem do world-map chega assíncrona: invalida a base-cache desta
    // instância + redesenha (fundo escuro → mapa real). Registrado 1× por instância.
    _onWorldMapLoad(function(){ _baseCache = null; _onLoad(); });
    // Sessão #74: redraw quando a imagem do pin (estandarte) carregar async (não
    // toca a base-cache; o pin é desenhado por cima, depois do fog).
    _onPlayerPinLoad(function(){ _onLoad(); });

    // Perf #1 (cartografia-perf.md): base estática (world-map cover + véu sépia) num
    // canvas offscreen → blit barato por frame. Invalida só em dims/dpr/mapReady.
    function _ensureBase(view){
      var w = view.w, h = view.h, dpr = view.dpr || 1;
      var mapReady = worldMapReady();
      if (_baseCache && _baseCache._w === w && _baseCache._h === h
          && _baseCache._dpr === dpr && _baseCache._mapReady === mapReady
          && _baseCache._viewMode === _viewMode && _baseCache._prov === _activeProvId) {
        return _baseCache;
      }
      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
      var bc = cv.getContext('2d', { alpha: false });
      bc.scale(dpr, dpr);
      var _mapReady = false;
      if (_viewMode === 'province' && _activeProvId !== 'world') {
        bc.fillStyle = '#000';
        bc.fillRect(0, 0, w, h);
        var pim = _provImgs[_activeProvId];
        if (pim && pim.complete && pim.naturalWidth) {
          var r = _cartWorldMapRect(w, h);
          bc.drawImage(pim, r.x, r.y, r.s, r.s);
          bc.fillStyle = 'rgba(42,30,18,0.12)';   // véu sépia leve (medieval)
          bc.fillRect(r.x, r.y, r.s, r.s);
          _mapReady = true;
        } else {
          _drawParchmentBase(bc, w, h);
        }
      } else {
        _mapReady = _drawWorldMapBg(bc, w, h);
      }
      cv._w = w; cv._h = h; cv._dpr = dpr; cv._mapReady = _mapReady; cv._viewMode = _viewMode; cv._prov = _activeProvId;
      _baseCache = cv;
      return cv;
    }

    // Fog of war (sessão #74): cache por-instância do canvas de névoa. Invalida quando
    // a assinatura (S arredondado + lista de known ordenada) muda OU quando as coords do
    // editor chegam (_fogCache=null no callback de coords). known===null (exploração) →
    // SEM névoa (o mapa sandbox mostra tudo; só a cidade tem descoberta progressiva).
    var _fogCache = null;
    var _provFogCache = {};
    var _discoveryAnim = null;
    var _rulerActive = false;
    var _rulerStart = null;
    var _rulerCurrent = null;
    var _rulerLocked = false;
    var _searchQuery = ''; // { nodeKey, startTime, duration, onComplete }
    var _cartLayers = { roads: true, settlements: true, threats: true, notes: true };
    var _focusPulseKey = null;
    var _focusPulseTime = 0;

    function _ensureProvFog(S, known, regNodes, provId){
      if (known === null || !Array.isArray(known)) return null;
      var sig = Math.round(S) + '|' + known.slice().sort().join(',') + '|' + provId;
      if (_provFogCache[provId] && _provFogCache[provId].sig === sig) return _provFogCache[provId].canvas;
      var canvas = _buildCartFog(S, known, regNodes, true);
      _provFogCache[provId] = { sig: sig, canvas: canvas };
      return canvas;
    }
    function _ensureCartFog(S, known, biomes){
      if (known === null || !Array.isArray(known)) return null;
      var sig = Math.round(S) + '|' + known.slice().sort().join(',');
      if (_fogCache && _fogCache.sig === sig) return _fogCache.canvas;
      var canvas = _buildCartFog(S, known, biomes);
      _fogCache = { sig: sig, canvas: canvas };
      return canvas;
    }

    // Ícones OpenAI dos locais (mesma fonte do editor: /api/exploracao/map-coords).
    // Fallback total: ícone faltando → arte procedural do bioma (sem regressão). Lazy 1×.
    function _ensureLocArt(){
      // P-mapa sessão #73 (FIX race): os coords do editor carregam num GUARD SEPARADO do
      // loc-art, com apiBase LAZY (fallback pro global) e RETRY a cada draw até carregar.
      // Bug: se createWorldCart rodava ANTES de window._VALDORIA_API_BASE existir,
      // _apiBase ficava '' → o fetch dos coords salvos era pulado e os locais ficavam no
      // DEFAULT (≠ map-editor). Agora lê o apiBase atual e retenta — locais sempre nas
      // posições salvas no editor, independente da ordem de init.
      if (!_coordsLoaded && !_coordsFetching) {
        var _ab = _apiBase || (typeof window !== 'undefined' && (window._VALDORIA_API_BASE || window._API_BASE)) || '';
        var cbase = ('' + _ab).replace(/\/$/, '');
        if (cbase) {
          _coordsFetching = true;
          try {
            fetch(cbase + '/api/exploracao/map-coords', { cache: 'no-store' })
              .then(function (r) { return r.ok ? r.json() : null; })
              .then(function (j) { _coordsFetching = false; if (j && j.coords) { _locCoords = j.coords; _coordsLoaded = true; _fogCache = null; _onLoad(); } })
              .catch(function () { _coordsFetching = false; });
          } catch (_) { _coordsFetching = false; }
        }
      }
      if (_locArt !== null) return;
      _locArt = {};
      CART_BIOMES.forEach(function (b) {
        var im = new Image();
        im.onload = function () { try { _onLoad(); } catch (_) { } };
        im.onerror = function () {
          if (im.src && im.src.indexOf('../shared/') === -1 && im.src.indexOf('/shared/') !== -1) {
            im.src = im.src.replace('/shared/', '../shared/');
          } else {
            _locArt[b.key] = false;
          }
        };
        im.src = '/shared/img/map/locations/' + b.key + '.webp';
        _locArt[b.key] = im;
      });
    }

    // cx/cy/iw chegam no espaço da Stage 2 (quadrado S × offset já aplicados).
    // P5 sessão #73: coords do EDITOR (_locCoords, salvas em /api/exploracao/map-coords)
    // p/ TODOS os elementos — não só o ícone. Retorna o biome com x/y do editor quando
    // salvos; senão o default de CART_BIOMES. Antes só o ÍCONE usava editor e o resto
    // (node/label/rota/pin/hit-test) usava CART_BIOMES → ícones e rotas em lugares
    // DIFERENTES (user: "locais em lugares diferentes das rotas desenhadas no mapa").
    function _resolved(b){
      var ov = _locCoords[b.key];
      if (!ov || typeof ov.x !== 'number' || typeof ov.y !== 'number') return b;
      var c = {}; for (var k in b) { c[k] = b[k]; } c.x = ov.x; c.y = ov.y; return c;
    }
    function _drawLocArt(ctx, b, w, h, isHover){
      var ic = _locArt && _locArt[b.key];
      if (!ic || ic === false || !ic.complete || !ic.naturalWidth) {
        // Nunca renderiza o mapa procedural/vetorial legado (_drawBiomeArt).
        // Nada é desenhado enquanto a imagem carrega; o _onLoad pinta a WebP quando pronta.
        return;
      }
      var ov = _locCoords[b.key] || {};
      var cx = (typeof ov.x === 'number' ? ov.x : b.x) * w;
      var cy = (typeof ov.y === 'number' ? ov.y : b.y) * h;
      var iw = ((typeof ov.scale === 'number' ? ov.scale : 5) / 100) * w;  // default 5 (= seed/editor/_DEFAULT_SCALE; evita ícone 2x p/ local sem override)
      // P5 sessão #73: zoom pequeno + glow dourado no HOVER/seleção (user pediu "efeito
      // de zoom ao passar o mouse / clicar no local que deseja ir"). +18%, instant
      // (o hover já dispara redraw). O popup de viagem (P2) complementa no clique.
      if (isHover) iw *= 1.18;
      var ih = iw * (ic.naturalHeight / ic.naturalWidth);
      try {
        if (isHover) { ctx.save(); ctx.shadowColor = 'rgba(196,149,58,0.75)'; ctx.shadowBlur = 14; }
        ctx.drawImage(ic, cx - iw / 2, cy - ih / 2, iw, ih);
        if (isHover) ctx.restore();
      }
      catch (_) { }
    }

    // Orquestrador — FUNDO world-map.webp (cover, sob pan/zoom) + ícones/nodes/paths/
    // pin (Stage 2, no quadrado cover S) + bússola screen-space (fixa). Espelha o
    // _drawCart histórico da cidade (cartografia-perf.md / fix pan sessão #72).
    function draw(view){
      var ctx = view.ctx;
      if (!ctx) return;
      var w = view.w, h = view.h;
      ctx.save();
      // P-mapa sessão #73 (user: "área que não seja a do mapa ficar preta"): backdrop
      // PRETO — letterbox + revelado em pan/zoom além das bordas do world-map.
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      var _mr = _cartWorldMapRect(w, h);
      var _S = _mr.s, _offX = _mr.x, _offY = _mr.y;
      ctx.save();
      ctx.translate(view.panX || 0, view.panY || 0);
      ctx.scale(view.zoom || 1, view.zoom || 1);
      var _base = _ensureBase(view);
      ctx.drawImage(_base, 0, 0, w, h);
      _drawCartAtmosphere(ctx, w, h);
      ctx.translate(_offX, _offY);

      var known = (typeof cfg.getKnownLocations === 'function') ? cfg.getKnownLocations() :
                  ((typeof window !== 'undefined' && window.CITY_MOCK_PLAYER && window.CITY_MOCK_PLAYER.known_locations) || null);
      var hover = view.hoverNode || null;
      var hoverKey = hover ? hover.key : null;
      var ownedMaps = (typeof cfg.getOwnedMaps === 'function') ? cfg.getOwnedMaps() :
                      ((typeof window !== 'undefined' && window.CITY_MOCK_PLAYER && (window.CITY_MOCK_PLAYER.owned_maps || window.CITY_MOCK_PLAYER.maps_owned)) || []);
      var pk = (typeof cfg.getPlayerBiomeKey === 'function') ? cfg.getPlayerBiomeKey() : null;
      _ensureLocArt();

      if (_viewMode === 'province' && _activeProvId !== 'world') {
        // === MODO REGIONAL DE PROVÍNCIA (1:1 Nativo, Alta Nitidez, Sem Zoom Blur) ===
        var curProv = CART_PROVINCES.find(function(p){ return p.id === _activeProvId; }) || CART_PROVINCES[1];
        var regNodes = [];
        CART_BIOMES.forEach(function(b){
          if (_LOCATION_TO_PROVINCE[b.key] === _activeProvId) {
            var rc = (curProv.regionalCoords && curProv.regionalCoords[b.key]) || { rx: b.x, ry: b.y };
            var resolvedNode = Object.assign({}, b, { x: rc.rx, y: rc.ry, regionalName: rc.name, marcos: rc.marcos });
            regNodes.push(resolvedNode);
          }
        });

        // 1. Fog of War na Província (cobre áreas ainda não exploradas salvo se possuir o mapa de Corvus)
        var provMapOwned = curProv.mapKey && ownedMaps && (ownedMaps.indexOf(curProv.mapKey) >= 0);
        if (known !== null && !provMapOwned) {
          var provFog = _ensureProvFog(_S, known, regNodes, _activeProvId);
          if (provFog) {
            ctx.drawImage(provFog, 0, 0, _S, _S);
          }
        }

        // 2. Desenhar rotas regionais (só reveladas se ambas as pontas forem conhecidas ou possuir o mapa)
        if (_cartLayers.roads) {
          (curProv.regionalPaths || []).forEach(function(p){
            var p0Known = (known === null || known.indexOf(p[0]) >= 0 || provMapOwned);
            var p1Known = (known === null || known.indexOf(p[1]) >= 0 || provMapOwned);
            if (p0Known && p1Known) {
              _drawCartPath(ctx, p[0], p[1], _S, _S, regNodes);
            }
          });
        }

        // 3. Desenhar nós da província (SOMENTE locais descobertos; Ordem do Usuario: NUNCA desenhar Terra Incognita)
        var qf = (typeof cfg.getQuestFocus === 'function') ? cfg.getQuestFocus() : null;
        if (_searchQuery) {
          regNodes.forEach(function(b){
            var isDiscovered = (known === null || known.indexOf(b.key) >= 0 || b.isOrigin || provMapOwned);
            if (isDiscovered && _nodeMatchesSearch(b, _searchQuery)) {
              _drawSearchMatchBeacon(ctx, b, _S, _S);
            }
          });
        }
        if (_focusPulseKey && (Date.now() - _focusPulseTime < 2500)) {
          var pulseRegNode = regNodes.find(function(b){ return b.key === _focusPulseKey; });
          if (pulseRegNode) {
            _drawFocusPulseBeacon(ctx, pulseRegNode, _S, _S, (Date.now() - _focusPulseTime) / 1000);
          }
        }
        regNodes.forEach(function(b){
          var isDiscovered = (known === null || known.indexOf(b.key) >= 0 || b.isOrigin || provMapOwned);
          var hasMap = b.mapKey && ownedMaps && (ownedMaps.indexOf(b.mapKey) >= 0);
          if (isDiscovered || hasMap) {
            var hasQ = !!(qf && qf.key === b.key);
            var isPin = _isLocPinned(b.key);
            _drawCartNode(ctx, b, _S, _S, hoverKey === b.key, { hasRegionalMap: hasMap, ownedMaps: ownedMaps, locArt: _locArt, isRegional: true, hasActiveQuest: hasQ, isPinned: isPin, activeFilter: view.activeFilter, layers: _cartLayers });
          }
          // Locais inexplorados ficam 100% ocultos sob o Fog of War preto solido, sem qualquer icone ou texto.
        });

        // Rota de Viagem Ativa e Breadcrumbs (D&D 5e / Baldur's Gate 3 Style)
        var activeTarget = hoverKey || (typeof window !== 'undefined' && window._cartCurrentLocBiome && window._cartCurrentLocBiome.key);
        if (activeTarget && curProv.regionalPaths && curProv.regionalPaths.length) {
          var startK = (pk && regNodes.some(function(b){ return b.key === pk; })) ? pk : (regNodes.length ? regNodes[0].key : null);
          if (startK && startK !== activeTarget) {
            var route = _findRoutePath(startK, activeTarget, curProv.regionalPaths);
            if (route) {
              _drawActiveRouteBreadcrumbs(ctx, route, _S, _S, regNodes);
            }
          }
        }
        if (activeTarget) {
          var targetNode = regNodes.find(function(b){ return b.key === activeTarget; });
          if (targetNode && targetNode.key !== pk) {
            _drawSelectedTargetHalo(ctx, targetNode, _S, _S);
          }
        }

        // Pin do aventureiro se estiver na província
        var pn = pk && regNodes.find(function(b){ return b.key === pk; });
        if (pn) _drawPlayerPin(ctx, pn, _S, _S);

        // Indicador de Missão / Quest Halo dentro da província
        var qf = (typeof cfg.getQuestFocus === 'function') ? cfg.getQuestFocus() : null;
        if (qf && qf.key && typeof cfg.drawQuestHalo === 'function') {
          var qn = regNodes.find(function(b){ return b.key === qf.key; });
          if (qn) cfg.drawQuestHalo(ctx, qn, _S, _S, qf.title || 'Missão');
        }

        // Cartouche superior elegante com o nome da província e progresso de mapeamento
        var totalProvLocs = curProv.locKeys ? curProv.locKeys.length : regNodes.length;
        var discProvLocs = curProv.locKeys ? curProv.locKeys.filter(function(k){
          return (known === null || known.indexOf(k) >= 0 || (k === 'plains') || provMapOwned);
        }).length : regNodes.length;
        var provPct = Math.round((discProvLocs / Math.max(1, totalProvLocs)) * 100);
        var provProgressText = (provPct >= 100)
          ? '⭐ Território 100% Cartografado'
          : '🗺️ Mapeado: ' + discProvLocs + '/' + totalProvLocs + ' Locais (' + provPct + '%)';

        var provTitleFont = (_S < 380) ? '700 11px Cinzel, serif' : '700 12.5px Cinzel, serif';
        var provSubFont = (_S < 380) ? 'italic 9px Georgia, serif' : 'italic 10px Georgia, serif';
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = provTitleFont;
        ctx.fillStyle = (provPct >= 100) ? '#fde047' : '#f4d896';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 6;
        ctx.fillText((curProv.icon || '📍') + ' ' + curProv.name.toUpperCase(), _S / 2, 28);
        ctx.font = provSubFont;
        ctx.fillStyle = (provPct >= 100) ? '#fde047' : '#d2be90';
        ctx.fillText(provProgressText, _S / 2, 42);
        ctx.restore();
      } else {
        // === MODO CONTINENTE GERAL ===
        function _pathEndKnown(key){ return known === null || known.indexOf(key) >= 0 || key === 'plains'; }
        var RB = CART_BIOMES.map(_resolved);

        // 1. Fog of War Continental sobre regiões inexploradas
        if (known !== null) {
          var worldFog = _ensureCartFog(_S, known, RB);
          if (worldFog) {
            ctx.drawImage(worldFog, 0, 0, _S, _S);
          }
        }

        // 2. Estradas conhecidas
        if (_cartLayers.roads) {
          CART_PATHS.forEach(function(p){
            if (_pathEndKnown(p[0]) && _pathEndKnown(p[1])) _drawCartPath(ctx, p[0], p[1], _S, _S, RB);
          });
        }

        // Rota Continental Ativa e Breadcrumbs (D&D 5e Style)
        var activeTargetWorld = hoverKey || (typeof window !== 'undefined' && window._cartCurrentLocBiome && window._cartCurrentLocBiome.key);
        if (activeTargetWorld && CART_PATHS && CART_PATHS.length) {
          var startKW = (pk && RB.some(function(b){ return b.key === pk; })) ? pk : 'plains';
          if (startKW && startKW !== activeTargetWorld) {
            var routeW = _findRoutePath(startKW, activeTargetWorld, CART_PATHS);
            if (routeW) {
              _drawActiveRouteBreadcrumbs(ctx, routeW, _S, _S, RB);
            }
          }
        }
        if (activeTargetWorld) {
          var targetNodeW = RB.find(function(b){ return b.key === activeTargetWorld; });
          if (targetNodeW && targetNodeW.key !== pk) {
            _drawSelectedTargetHalo(ctx, targetNodeW, _S, _S);
          }
        }
        var qf = (typeof cfg.getQuestFocus === 'function') ? cfg.getQuestFocus() : null;
        if (_searchQuery) {
          RB.forEach(function(b){
            if ((known === null || known.indexOf(b.key) >= 0 || b.isOrigin) && _nodeMatchesSearch(b, _searchQuery)) {
              _drawSearchMatchBeacon(ctx, b, _S, _S);
            }
          });
        }
        if (_focusPulseKey && (Date.now() - _focusPulseTime < 2500)) {
          var pulseNode = RB.find(function(b){ return b.key === _focusPulseKey; });
          if (pulseNode) {
            _drawFocusPulseBeacon(ctx, pulseNode, _S, _S, (Date.now() - _focusPulseTime) / 1000);
          }
        }
        RB.forEach(function(b){
          if (known === null || known.indexOf(b.key) >= 0 || b.isOrigin) {
            var hasMap = b.mapKey && ownedMaps && (ownedMaps.indexOf(b.mapKey) >= 0);
            var hasQ = !!(qf && qf.key === b.key);
            var isPin = _isLocPinned(b.key);
            _drawCartNode(ctx, b, _S, _S, hoverKey === b.key, { hasRegionalMap: hasMap, ownedMaps: ownedMaps, locArt: _locArt, hasActiveQuest: hasQ, isPinned: isPin, activeFilter: view.activeFilter, layers: _cartLayers });
          }
        });
        var pn = pk && RB.find(function(b){ return b.key === pk; });
        if (pn) _drawPlayerPin(ctx, pn, _S, _S);
        if (qf && qf.key && typeof cfg.drawQuestHalo === 'function') {
          var qn = RB.find(function(b){ return b.key === qf.key; });
          if (qn) cfg.drawQuestHalo(ctx, qn, _S, _S, qf.title || 'Missão');
        }

        // Cartouche superior elegante no Modo Continente
        var totalWorld = CART_BIOMES.length;
        var discWorld = (known !== null) ? CART_BIOMES.filter(function(b){
          return known.indexOf(b.key) >= 0 || b.isOrigin || b.key === 'plains';
        }).length : totalWorld;
        var worldPct = Math.round((discWorld / totalWorld) * 100);
        var worldProgressText = (worldPct >= 100)
          ? '⭐ Continente Totalmente Mapeado (100%)'
          : '🗺️ Atlas Geral: ' + discWorld + '/' + totalWorld + ' Locais Conhecidos (' + worldPct + '%)';

        var worldTitleFont = (_S < 380) ? '700 11px Cinzel, serif' : '700 12.5px Cinzel, serif';
        var worldSubFont = (_S < 380) ? 'italic 9px Georgia, serif' : 'italic 10px Georgia, serif';
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = worldTitleFont;
        ctx.fillStyle = (worldPct >= 100) ? '#fde047' : '#f4d896';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 6;
        ctx.fillText('🌍 CONTINENTE DE VALDÓRIA', _S / 2, 28);
        ctx.font = worldSubFont;
        ctx.fillStyle = (worldPct >= 100) ? '#fde047' : '#d2be90';
        ctx.fillText(worldProgressText, _S / 2, 42);
        ctx.restore();
      }

      // === Animação de Descoberta Ativa (Golden Pulse + Revelação da Névoa) ===
      if (_discoveryAnim && _discoveryAnim.nodeKey) {
        var activeNodes = (_viewMode === 'province' && typeof regNodes !== 'undefined') ? regNodes : CART_BIOMES.map(_resolved);
        var targetNode = activeNodes.find(function(n){ return n.key === _discoveryAnim.nodeKey; });
        if (targetNode) {
          var elapsed = Date.now() - _discoveryAnim.startTime;
          var dur = _discoveryAnim.duration || 2400;
          if (elapsed < dur) {
            var prog = elapsed / dur;
            var tx = targetNode.x * _S, ty = targetNode.y * _S;
            ctx.save();
            // Pulso 1: onda de choque dourada expandindo
            var r1 = 14 + prog * 70;
            var a1 = Math.max(0, (1 - prog) * 0.95);
            ctx.beginPath();
            ctx.arc(tx, ty, r1, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 214, 133, ' + a1 + ')';
            ctx.lineWidth = Math.max(1, 3.5 * (1 - prog * 0.6));
            ctx.stroke();

            // Pulso 2: anel interno atrasado
            if (prog > 0.22) {
              var p2 = (prog - 0.22) / 0.78;
              var r2 = 12 + p2 * 45;
              var a2 = Math.max(0, (1 - p2) * 0.75);
              ctx.beginPath();
              ctx.arc(tx, ty, r2, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(196, 149, 58, ' + a2 + ')';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            ctx.restore();
          } else {
            var cb = _discoveryAnim.onComplete;
            _discoveryAnim = null;
            if (typeof cb === 'function') { try { cb(); } catch(_){} }
          }
        }
      }
      ctx.restore();
      // Azimute para o destino ativo (Astrolábio D&D 5e)
      var _activeBearing = null;
      var _bearingTarget = hoverKey || (typeof window !== 'undefined' && window._cartCurrentLocBiome && window._cartCurrentLocBiome.key);
      if (_bearingTarget) {
        var _plNodeForBearing = (_viewMode === 'province' && typeof regNodes !== 'undefined')
          ? (pk && regNodes.find(function(b){ return b.key === pk; }))
          : (pk && (typeof RB !== 'undefined' ? RB.find(function(b){ return b.key === pk; }) : null));
        var _tgtNodeForBearing = (_viewMode === 'province' && typeof regNodes !== 'undefined')
          ? regNodes.find(function(b){ return b.key === _bearingTarget; })
          : (typeof RB !== 'undefined' ? RB.find(function(b){ return b.key === _bearingTarget; }) : null);
        if (_plNodeForBearing && _tgtNodeForBearing && _plNodeForBearing.key !== _tgtNodeForBearing.key) {
          _activeBearing = calcDistanceBearing(_plNodeForBearing, _tgtNodeForBearing, _viewMode === 'province');
        }
      }

      // Régua Cartográfica / Astrolábio de Medição (quando ativa)
      if (_rulerActive && _rulerStart && _rulerCurrent) {
        _drawCartRuler(ctx, _rulerStart, _rulerCurrent, _S, _offX, _offY, _viewMode);
      }

      // Bússola — screen-space (top-right, NÃO pan/zooma).
      var _isCompHov = (typeof view.hoverMx === 'number') && _isCompassAt(view.hoverMx, view.hoverMy, w, h);
      _drawCartCompass(ctx, w, h, _isCompHov, !!view.isCompassPulsing, _activeBearing);
      // Escala Cartográfica D&D 5e — screen-space (bottom-left).
      _drawCartScaleBar(ctx, w, h, _viewMode);

      // Indicador de Borda da Comitiva quando fora da tela (Baldur's Gate 3 / CRPG AAA Tracker)
      _lastOffscreenComitivaBadge = null;
      var _activePlNode = (_viewMode === 'province' && _activeProvId !== 'world')
        ? (pk && regNodes.find(function(b){ return b.key === pk; }))
        : (pk && (typeof RB !== 'undefined' ? RB.find(function(b){ return b.key === pk; }) : null));
      if (_activePlNode) {
        var _apBx = _activePlNode.x * _S, _apBy = _activePlNode.y * _S;
        var _apScrX = (_apBx + _offX) * (view.zoom || 1) + (view.panX || 0);
        var _apScrY = (_apBy + _offY) * (view.zoom || 1) + (view.panY || 0);
        if (_apScrX < 15 || _apScrX > w - 15 || _apScrY < 15 || _apScrY > h - 15) {
          _lastOffscreenComitivaBadge = _drawOffScreenComitivaChevron(ctx, w, h, _apScrX, _apScrY, _activePlNode.regionalName || _activePlNode.name);
        }
      }

      ctx.restore();
    }

    // Hit-test — converte tela→mundo (revert pan/zoom) e mapeia no quadrado cover S.
    function findNodeAt(view, mx, my){
      var wx = (mx - (view.panX || 0)) / (view.zoom || 1);
      var wy = (my - (view.panY || 0)) / (view.zoom || 1);
      var _mr = _cartWorldMapRect(view.w, view.h);
      var _S = _mr.s, _offX = _mr.x, _offY = _mr.y;
      var isTouch = (typeof window !== 'undefined' && (('ontouchstart' in window) || (navigator && navigator.maxTouchPoints > 0)));
      // P-mapa sessão #73: só locais descobertos (ou origem) são clicáveis — os
      // não-descobertos não aparecem no mapa, então também não respondem ao tap/hover
      // (assim o popup "Local Desconhecido" não acontece mais).
      var known = (typeof cfg.getKnownLocations === 'function') ? cfg.getKnownLocations() :
                  ((typeof window !== 'undefined' && window.CITY_MOCK_PLAYER && window.CITY_MOCK_PLAYER.known_locations) || null);
      var ownedMaps = (typeof cfg.getOwnedMaps === 'function') ? cfg.getOwnedMaps() :
                      ((typeof window !== 'undefined' && window.CITY_MOCK_PLAYER && (window.CITY_MOCK_PLAYER.owned_maps || window.CITY_MOCK_PLAYER.maps_owned)) || []);
      var best = null, bestD = Infinity;
      var activeNodes = CART_BIOMES;
      if (_viewMode === 'province' && _activeProvId !== 'world') {
        var curProv = CART_PROVINCES.find(function(p){ return p.id === _activeProvId; });
        activeNodes = CART_BIOMES.filter(function(b){ return _LOCATION_TO_PROVINCE[b.key] === _activeProvId; });
      }
      // No modo Continente, permite também hit na área central das províncias descobertas
      if (_viewMode === 'world') {
        for (var pi = 0; pi < CART_PROVINCES.length; pi++) {
          var pr = CART_PROVINCES[pi];
          if (pr.id === 'world') continue;
          if (!isProvinceDiscovered(pr.id, known, ownedMaps)) continue;
          var pcx = _offX + (pr.cx || 0.5) * _S;
          var pcy = _offY + (pr.cy || 0.5) * _S;
          var pdx = wx - pcx, pdy = wy - pcy;
          var provR = Math.max(36, _S * 0.08);
          if (pdx*pdx + pdy*pdy <= provR * provR) {
            var firstNode = CART_BIOMES.find(function(b){ return _LOCATION_TO_PROVINCE[b.key] === pr.id; });
            if (firstNode) {
              best = firstNode;
              bestD = pdx*pdx + pdy*pdy;
            }
          }
        }
      }

      for (var i = 0; i < activeNodes.length; i++) {
        var b = activeNodes[i];
        var curProv = CART_PROVINCES.find(function(p){ return p.id === _activeProvId; });
        var provMapOwned = curProv && curProv.mapKey && ownedMaps && (ownedMaps.indexOf(curProv.mapKey) >= 0);
        var isDiscovered = (known === null || known.indexOf(b.key) >= 0 || b.isOrigin || provMapOwned);
        // Lugares sob o Fog of War preto solido nao respondem a toque/clique
        if (!isDiscovered) continue;
        var rb = _resolved(b);
        if (_viewMode === 'province' && _activeProvId !== 'world') {
          var curProv = CART_PROVINCES.find(function(p){ return p.id === _activeProvId; });
          var rc = (curProv && curProv.regionalCoords && curProv.regionalCoords[b.key]) || { rx: rb.x, ry: rb.y };
          rb = Object.assign({}, b, { x: rc.rx, y: rc.ry });
        }
        var bx = _offX + rb.x * _S;
        var by = _offY + rb.y * _S;
        // P-mapa sessão #73 (user: "efeitos do mouse SÓ na imagem"): raio de hit =
        // metade da largura REAL da imagem do local (MESMA conta do _drawLocArt: iw =
        // scale% * _S), não um círculo fixo maior. Mínimo de tap-target pra toque no
        // smartphone (~56px) e desktop (~24px) — usabilidade sem estourar a imagem.
        var _ov = _locCoords[b.key] || {};
        var imgHalf = (((typeof _ov.scale === 'number' ? _ov.scale : 5) / 100) * _S) / 2;  // default 5 (igual ao _drawLocArt)
        var radius = isTouch ? Math.max(imgHalf, 28) : Math.max(imgHalf, 22);
        var rsq = radius * radius;
        var dx = wx - bx, dy = wy - by;
        var d = dx*dx + dy*dy;
        // Hit no retículo ou na caixa de rótulo logo abaixo do nó
        var inLabel = (Math.abs(dx) <= Math.max(radius, 40) && dy >= 0 && dy <= (radius + 24));
        if ((d <= rsq || inLabel) && d < bestD) { best = b; bestD = d; }
      }
      return best;
    }

    function getNodePos(key, w, h){
      var _mr = _cartWorldMapRect(w, h);
      if (_viewMode === 'province' && _activeProvId) {
        var curProv = CART_PROVINCES.find(function(p){ return p.id === _activeProvId; });
        if (curProv && curProv.regionalCoords && curProv.regionalCoords[key]) {
          var rc = curProv.regionalCoords[key];
          return {
            x: _mr.x + rc.rx * _mr.s,
            y: _mr.y + rc.ry * _mr.s,
            rawX: rc.rx,
            rawY: rc.ry
          };
        }
      }
      var RB = CART_BIOMES.map(_resolved);
      var b = RB.find(function(item){ return item.key === key; });
      if (!b) {
        b = RB.find(function(item){ return item.isOrigin || item.key === 'plains'; }) || RB[0];
      }
      if (!b) return null;
      var bx = (typeof b.x === 'number' ? b.x : 0.5);
      var by = (typeof b.y === 'number' ? b.y : 0.5);
      return {
        x: _mr.x + bx * _mr.s,
        y: _mr.y + by * _mr.s,
        rawX: bx,
        rawY: by
      };
    }

    function focusProvince(provId, w, h){
      var prov = CART_PROVINCES.find(function(p){ return p.id === provId; }) || CART_PROVINCES[0];
      var _mr = _cartWorldMapRect(w, h);
      var _S = _mr.s;
      var targetZoom = prov.zoom || 1.0;
      var cx = _mr.x + (prov.cx || 0.5) * _S;
      var cy = _mr.y + (prov.cy || 0.5) * _S;
      var panX = (w / 2) - (cx * targetZoom);
      var panY = (h / 2) - (cy * targetZoom);
      return { panX: panX, panY: panY, zoom: targetZoom, province: prov };
    }

    function openProvince(provId){
      if (!provId || provId === 'world') return closeProvince();
      var prov = CART_PROVINCES.find(function(p){ return p.id === provId; });
      if (!prov) return closeProvince();
      var known = (typeof cfg.getKnownLocations === 'function') ? cfg.getKnownLocations() :
                  ((typeof window !== 'undefined' && window.CITY_MOCK_PLAYER && window.CITY_MOCK_PLAYER.known_locations) || null);
      var ownedMaps = (typeof cfg.getOwnedMaps === 'function') ? cfg.getOwnedMaps() :
                      ((typeof window !== 'undefined' && window.CITY_MOCK_PLAYER && (window.CITY_MOCK_PLAYER.owned_maps || window.CITY_MOCK_PLAYER.maps_owned)) || []);
      if (!isProvinceDiscovered(provId, known, ownedMaps)) {
        return closeProvince();
      }
      _viewMode = 'province';
      _activeProvId = provId;
      _baseCache = null;
      _onLoad();
      return { panX: 0, panY: 0, zoom: 1.0, province: prov, mode: 'province' };
    }

    function closeProvince(){
      _viewMode = 'world';
      _activeProvId = 'world';
      _baseCache = null;
      _onLoad();
      return { panX: 0, panY: 0, zoom: 1.0, province: CART_PROVINCES[0], mode: 'world' };
    }

    function getViewMode(){
      return {
        mode: _viewMode,
        provinceId: _activeProvId,
        province: CART_PROVINCES.find(function(p){ return p.id === _activeProvId; }) || CART_PROVINCES[0]
      };
    }

    return {
      draw: draw,
      findNodeAt: findNodeAt,
      getNodePos: getNodePos,
      focusProvince: focusProvince,
      openProvince: openProvince,
      closeProvince: closeProvince,
      getViewMode: getViewMode,
      toggleRuler: function(enable, originPt){
        if (typeof enable === 'boolean') _rulerActive = enable;
        else _rulerActive = !_rulerActive;
        if (!_rulerActive) {
          _rulerStart = null;
          _rulerCurrent = null;
          _rulerLocked = false;
        } else if (originPt && typeof originPt.x === 'number') {
          _rulerStart = { x: originPt.x, y: originPt.y, name: originPt.name || originPt.key };
          _rulerCurrent = _rulerStart;
          _rulerLocked = false;
        }
        _onLoad();
        return _rulerActive;
      },
      isRulerActive: function(){ return _rulerActive; },
      setRulerPoints: function(startPt, currPt){
        _rulerStart = startPt;
        _rulerCurrent = currPt;
        _onLoad();
      },
      clearRuler: function(){
        _rulerStart = null;
        _rulerCurrent = null;
        _rulerLocked = false;
        _onLoad();
      },
      setSearchQuery: function(q){
        _searchQuery = (q || '').toLowerCase().trim();
        _onLoad();
      },
      getSearchQuery: function(){
        return _searchQuery;
      },
      getLayers: function(){
        return Object.assign({}, _cartLayers);
      },
      setLayer: function(k, v){
        if (typeof _cartLayers[k] !== 'undefined') {
          _cartLayers[k] = !!v;
          _onLoad();
        }
      },
      setFocusPulse: function(key){
        _focusPulseKey = key;
        _focusPulseTime = Date.now();
        _onLoad();
      },
      getFocusPulse: function(){
        if (!_focusPulseKey) return null;
        if (Date.now() - _focusPulseTime > 2500) {
          _focusPulseKey = null;
          return null;
        }
        return { key: _focusPulseKey, elapsed: (Date.now() - _focusPulseTime) / 1000 };
      },
      handleRulerClick: function(mx, my, view, hoverNode){
        if (!_rulerActive) return false;
        var w = view.w, h = view.h;
        var wx = (mx - (view.panX || 0)) / (view.zoom || 1);
        var wy = (my - (view.panY || 0)) / (view.zoom || 1);
        var _mr = _cartWorldMapRect(w, h);
        var _S = _mr.s, _offX = _mr.x, _offY = _mr.y;

        var pt = null;
        if (hoverNode && typeof hoverNode.x === 'number') {
          pt = { x: hoverNode.x, y: hoverNode.y, name: hoverNode.name || hoverNode.key };
        } else {
          var nx = Math.max(0, Math.min(1, (wx - _offX) / _S));
          var ny = Math.max(0, Math.min(1, (wy - _offY) / _S));
          pt = { x: nx, y: ny };
        }

        if (!_rulerStart) {
          _rulerStart = pt;
          _rulerCurrent = pt;
          _rulerLocked = false;
        } else if (!_rulerLocked) {
          _rulerCurrent = pt;
          _rulerLocked = true;
        } else {
          _rulerStart = pt;
          _rulerCurrent = pt;
          _rulerLocked = false;
        }
        _onLoad();
        return true;
      },
      handleRulerMove: function(mx, my, view, hoverNode){
        if (!_rulerActive || !_rulerStart || _rulerLocked) return false;
        var w = view.w, h = view.h;
        var wx = (mx - (view.panX || 0)) / (view.zoom || 1);
        var wy = (my - (view.panY || 0)) / (view.zoom || 1);
        var _mr = _cartWorldMapRect(w, h);
        var _S = _mr.s, _offX = _mr.x, _offY = _mr.y;

        if (hoverNode && typeof hoverNode.x === 'number') {
          _rulerCurrent = { x: hoverNode.x, y: hoverNode.y, name: hoverNode.name || hoverNode.key };
        } else {
          var nx = Math.max(0, Math.min(1, (wx - _offX) / _S));
          var ny = Math.max(0, Math.min(1, (wy - _offY) / _S));
          _rulerCurrent = { x: nx, y: ny };
        }
        _onLoad();
        return true;
      },
      isCompassAt: function(mx, my, w, h){ return _isCompassAt(mx, my, w, h); },
      getOffscreenComitivaBadge: function(){ return _lastOffscreenComitivaBadge; },
      triggerDiscoveryAnimation: function(nodeKey, onComplete){
        var node = CART_BIOMES.find(function(b){ return b.key === nodeKey; });
        if (!node) { if (onComplete) onComplete(); return; }
        var provId = _LOCATION_TO_PROVINCE[nodeKey];
        if (provId && _viewMode === 'province' && _activeProvId !== provId) {
          openProvince(provId);
        }
        _discoveryAnim = {
          nodeKey: nodeKey,
          startTime: Date.now(),
          duration: 2400,
          onComplete: onComplete
        };
        _fogCache = null;
        _provFogCache = {};
        _onLoad();
        
        var startT = Date.now();
        function loopAnim(){
          if (!_discoveryAnim) return;
          _onLoad();
          if (Date.now() - startT < 2400) {
            if (typeof requestAnimationFrame === 'function') requestAnimationFrame(loopAnim);
          } else {
            var done = _discoveryAnim && _discoveryAnim.onComplete;
            _discoveryAnim = null;
            _onLoad();
            if (typeof done === 'function') { try { done(); } catch(_){} }
          }
        }
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(loopAnim);
      },
      invalidateBase: function(){ _baseCache = null; },
      ensureLocArt: _ensureLocArt
    };
  }

  // === Popup loc-art (P2 sessão #73) — IMAGEM do local no popup de viagem ======
  // _openCartLocationPopup (cidade + exploração) mostrava biome.ico (emoji). User
  // pediu a IMAGEM de cada local (mesma .webp do mapa). Single source aqui → os dois
  // popups usam CartShared.locArtHtml(biome). Fallback pro emoji se a imagem faltar
  // ou em file:// (onerror → clpImgFallback troca a img pelo span do emoji).
  function clpImgFallback(img){
    try {
      img.style.display = 'none';
      var s = img.nextElementSibling;
      if (s) s.style.display = '';
    } catch (_e) {}
  }
  function locArtHtml(biome){
    if (!biome) return '';
    var key = biome.key || '';
    var ico = biome.ico || '';
    return '<img class="clp-loc-img" alt="" src="/shared/img/map/locations/' + key + '.webp" '
      + 'onerror="CartShared.clpImgFallback(this)">'
      + '<span class="clp-loc-emoji" style="display:none">' + ico + '</span>';
  }

  // === CART_PROVINCES (Hierarquia das 8 Províncias Canônicas de Valdória) ===
  var CART_PROVINCES = [
    {
      id: 'world',
      name: 'Continente Geral',
      icon: '🌍',
      zoom: 1.0,
      cx: 0.50,
      cy: 0.50,
      mapKey: null,
      desc: 'Visão de todo o continente conhecido de Valdória e suas fronteiras.',
      tier: 'Tier 1 a 4 (Níveis 1-20)',
      terrain: 'Continente de Valdória',
      winds: 'Ventos Continentais',
      hazard: 'Terras Ermas & Fronteiras Selvagens',
      locKeys: ['plains', 'green_fields', 'orc_tribe', 'bandit_fortress', 'forest', 'goblin_nest', 'elven_ruins', 'mountain', 'dragon_pass', 'korthag', 'cave', 'troll_cave', 'underground_caverns', 'crystal_depths', 'swamp', 'deep_swamp', 'desert', 'graveyard', 'ancestral_graveyard', 'snow', 'volcanic', 'valkrest', 'salty_coast', 'black_peaks', 'eldritch_mire', 'ashen_badlands', 'elder_woods', 'glacial_rift'],
      regionalCoords: {},
      regionalPaths: []
    },
    {
      id: 'plains',
      name: 'Planícies Centrais',
      icon: '🌾',
      zoom: 1.0,
      cx: 0.50,
      cy: 0.55,
      mapKey: 'Mapa das Planícies',
      desc: 'Coração comercial e agrícola do reino. Campos dourados e grandes portões de pedra.',
      tier: 'Tier 1 (Níveis 1-4)',
      terrain: 'Pradarias & Estradas Imperiais',
      winds: 'Vento de Pradaria (O · 18 km/h)',
      hazard: 'Bandidos de Estrada & Tempestades',
      locKeys: ['plains', 'green_fields', 'orc_tribe', 'bandit_fortress', 'ashen_badlands'],
      regionalCoords: {
        plains: { rx: 0.50, ry: 0.50, name: 'Portões de Valdória', marcos: 0 },
        green_fields: { rx: 0.28, ry: 0.36, name: 'Campos Verdes', marcos: 1 },
        orc_tribe: { rx: 0.74, ry: 0.38, name: 'Acampamento Orc', marcos: 3 },
        bandit_fortress: { rx: 0.46, ry: 0.76, name: 'Forte dos Bandidos', marcos: 2 },
        ashen_badlands: { rx: 0.76, ry: 0.74, name: 'Terras Devastadas', marcos: 4 }
      },
      regionalPaths: [
        ['plains', 'green_fields'],
        ['green_fields', 'orc_tribe'],
        ['green_fields', 'bandit_fortress'],
        ['bandit_fortress', 'ashen_badlands']
      ]
    },
    {
      id: 'forest',
      name: 'Grandes Florestas',
      icon: '🌲',
      zoom: 1.0,
      cx: 0.50,
      cy: 0.28,
      mapKey: 'Mapa da Floresta',
      desc: 'Matas ancestrais densas, arcos élficos de pedra e bosques imemoriais.',
      tier: 'Tier 1-2 (Níveis 3-6)',
      terrain: 'Floresta Antiga & Vales Silvestres',
      winds: 'Brisa Silvestre (NE · 14 km/h)',
      hazard: 'Névoas Ilusórias & Teias de Aranha',
      locKeys: ['forest', 'goblin_nest', 'elven_ruins', 'elder_woods'],
      regionalCoords: {
        forest: { rx: 0.38, ry: 0.48, name: 'Floresta dos Sussurros', marcos: 2 },
        goblin_nest: { rx: 0.26, ry: 0.26, name: 'Ninho de Goblins', marcos: 2 },
        elven_ruins: { rx: 0.64, ry: 0.28, name: 'Ruínas Élficas', marcos: 3 },
        elder_woods: { rx: 0.74, ry: 0.66, name: 'Bosque Ancestral', marcos: 4 }
      },
      regionalPaths: [
        ['forest', 'goblin_nest'],
        ['forest', 'elven_ruins'],
        ['elven_ruins', 'elder_woods'],
        ['forest', 'elder_woods']
      ]
    },
    {
      id: 'swamp',
      name: 'Pântanos do Leste',
      icon: '🐍',
      zoom: 1.0,
      cx: 0.78,
      cy: 0.42,
      mapKey: 'Mapa do Pântano',
      desc: 'Águas estagnadas escuras, cabanas sobre palafitas e névoas com vapores esmeralda.',
      tier: 'Tier 2 (Níveis 5-8)',
      terrain: 'Pântanos Traiçoeiros & Cemitérios',
      winds: 'Ar Estagnado com Miasmas (SE · 8 km/h)',
      hazard: 'Lama Movediça & Vapores Venenosos',
      locKeys: ['swamp', 'deep_swamp', 'graveyard', 'ancestral_graveyard', 'eldritch_mire'],
      regionalCoords: {
        swamp: { rx: 0.30, ry: 0.36, name: 'Pântano Nebuloso', marcos: 3 },
        deep_swamp: { rx: 0.72, ry: 0.40, name: 'Pântano Profundo', marcos: 4 },
        graveyard: { rx: 0.40, ry: 0.74, name: 'Cemitério Antigo', marcos: 3 },
        ancestral_graveyard: { rx: 0.20, ry: 0.82, name: 'Cemitério Ancestral', marcos: 5 },
        eldritch_mire: { rx: 0.76, ry: 0.74, name: 'Pântano Eldritch', marcos: 5 }
      },
      regionalPaths: [
        ['swamp', 'deep_swamp'],
        ['swamp', 'graveyard'],
        ['graveyard', 'ancestral_graveyard'],
        ['deep_swamp', 'eldritch_mire']
      ]
    },
    {
      id: 'mountain',
      name: 'Cordilheira Ocidental',
      icon: '🏔️',
      zoom: 1.0,
      cx: 0.20,
      cy: 0.38,
      mapKey: 'Mapa das Montanhas',
      desc: 'Picos escarpados de granito, forjas mineiras de Korthag e galerias subterrâneas.',
      tier: 'Tier 2-3 (Níveis 6-10)',
      terrain: 'Cordilheira Escarpada & Minas Profundas',
      winds: 'Ventos de Altitude (NO · 28 km/h)',
      hazard: 'Desmoronamentos, Frio & Ar Rarefeito',
      locKeys: ['mountain', 'korthag', 'dragon_pass', 'black_peaks', 'cave', 'troll_cave', 'underground_caverns', 'crystal_depths'],
      regionalCoords: {
        mountain: { rx: 0.48, ry: 0.36, name: 'Picos de Pedra', marcos: 3 },
        korthag: { rx: 0.26, ry: 0.26, name: 'Korthag (Vila Mineira)', marcos: 3 },
        dragon_pass: { rx: 0.74, ry: 0.22, name: 'Passo do Dragão', marcos: 5 },
        black_peaks: { rx: 0.16, ry: 0.44, name: 'Montanhas Negras', marcos: 4 },
        cave: { rx: 0.38, ry: 0.60, name: 'Passagem Subterrânea', marcos: 3 },
        troll_cave: { rx: 0.18, ry: 0.68, name: 'Caverna do Troll', marcos: 4 },
        underground_caverns: { rx: 0.58, ry: 0.72, name: 'Cavernas Subterrâneas', marcos: 4 },
        crystal_depths: { rx: 0.32, ry: 0.84, name: 'Profundezas de Cristal', marcos: 6 }
      },
      regionalPaths: [
        ['mountain', 'korthag'],
        ['mountain', 'dragon_pass'],
        ['mountain', 'black_peaks'],
        ['mountain', 'cave'],
        ['cave', 'troll_cave'],
        ['cave', 'underground_caverns'],
        ['underground_caverns', 'crystal_depths'],
        ['crystal_depths', 'mountain']
      ]
    },
    {
      id: 'desert',
      name: 'Dunas do Sul',
      icon: '🌵',
      zoom: 1.0,
      cx: 0.42,
      cy: 0.80,
      mapKey: 'Mapa do Deserto',
      desc: 'Mares de areia dourada, cânions profundos de arenito e mausoléus antigos.',
      tier: 'Tier 2-3 (Níveis 6-10)',
      terrain: 'Dunas Escaldantes & Cânions de Arenito',
      winds: 'Vento Quente de Siroco (S · 22 km/h)',
      hazard: 'Calor Extremo, Sede & Tempestades de Areia',
      locKeys: ['desert'],
      regionalCoords: {
        desert: { rx: 0.50, ry: 0.50, name: 'Deserto Dourado', marcos: 3 }
      },
      regionalPaths: []
    },
    {
      id: 'coast',
      name: 'Litoral da Tormenta',
      icon: '🌊',
      zoom: 1.0,
      cx: 0.88,
      cy: 0.52,
      mapKey: 'Mapa da Costa',
      desc: 'Costões rochosos fustigados por ondas oceânicas e enseadas de navegadores.',
      tier: 'Tier 1-2 (Níveis 3-7)',
      terrain: 'Costões Rochosos & Enseadas Marítimas',
      winds: 'Brisa Oceânica (L · 30 km/h)',
      hazard: 'Ressacas Violentas & Piratas',
      locKeys: ['salty_coast'],
      regionalCoords: {
        salty_coast: { rx: 0.50, ry: 0.50, name: 'Costa Salgada', marcos: 3 }
      },
      regionalPaths: []
    },
    {
      id: 'snow',
      name: 'Ermo Boreal',
      icon: '❄️',
      zoom: 1.0,
      cx: 0.52,
      cy: 0.10,
      mapKey: 'Mapa do Ermo Gelado',
      desc: 'Geleiras azuis eternas, fendas no gelo e montanhas congeladas ao norte.',
      tier: 'Tier 3 (Níveis 8-12)',
      terrain: 'Tundra Boreal & Geleiras Eternas',
      winds: 'Vento Boreal Uivante (N · 35 km/h)',
      hazard: 'Frio Extremo, Fendas de Gelo & Nevascas',
      locKeys: ['snow', 'glacial_rift'],
      regionalCoords: {
        snow: { rx: 0.38, ry: 0.46, name: 'Ermo Congelado', marcos: 4 },
        glacial_rift: { rx: 0.68, ry: 0.56, name: 'Abismo Glacial', marcos: 6 }
      },
      regionalPaths: [
        ['snow', 'glacial_rift']
      ]
    },
    {
      id: 'volcanic',
      name: 'Terras de Fogo',
      icon: '🌋',
      zoom: 1.0,
      cx: 0.80,
      cy: 0.70,
      mapKey: 'Mapa Vulcânico',
      desc: 'A grande caldeira ativa, fendas de lava incandescente e platôs de basalto.',
      tier: 'Tier 3-4 (Níveis 10-16)',
      terrain: 'Caldeira Vulcânica & Platôs de Basalto',
      winds: 'Lufadas Térmicas Vulcânicas (SO · 25 km/h)',
      hazard: 'Rios de Lava, Vapores de Enxofre & Brasas',
      locKeys: ['volcanic', 'valkrest'],
      regionalCoords: {
        volcanic: { rx: 0.42, ry: 0.48, name: 'Cratera Vulcânica', marcos: 5 },
        valkrest: { rx: 0.74, ry: 0.56, name: 'Valkrest (Acampamento)', marcos: 5 }
      },
      regionalPaths: [
        ['volcanic', 'valkrest']
      ]
    }
  ];

  var _LOCATION_TO_PROVINCE = {
    plains: 'plains', green_fields: 'plains', orc_tribe: 'plains', bandit_fortress: 'plains', ashen_badlands: 'plains',
    forest: 'forest', goblin_nest: 'forest', elven_ruins: 'forest', elder_woods: 'forest',
    cave: 'mountain', underground_caverns: 'mountain', crystal_depths: 'mountain', mountain: 'mountain', troll_cave: 'mountain', dragon_pass: 'mountain', korthag: 'mountain', black_peaks: 'mountain',
    swamp: 'swamp', deep_swamp: 'swamp', graveyard: 'swamp', ancestral_graveyard: 'swamp', eldritch_mire: 'swamp',
    desert: 'desert',
    salty_coast: 'coast',
    snow: 'snow', glacial_rift: 'snow',
    volcanic: 'volcanic', valkrest: 'volcanic'
  };

  // Regra de Visibilidade de Províncias (Ordem do Usuário 2026-10):
  // Uma província regional só é revelada se o aventureiro tiver descoberto
  // pelo menos 1 local pertencente a ela, ou possuir a carta geográfica regional.
  function isProvinceDiscovered(provId, known, ownedMaps) {
    if (!provId || provId === 'world') return true;
    var p = CART_PROVINCES.find(function(pr){ return pr.id === provId; });
    if (!p) return false;
    if (p.mapKey && ownedMaps && ownedMaps.indexOf(p.mapKey) >= 0) return true;
    var knownArr = known || [];
    if (provId === 'plains') return true; // Hub de partida (Portões de Valdória)
    if (!p.locKeys || !p.locKeys.length) return false;
    for (var i = 0; i < p.locKeys.length; i++) {
      if (knownArr.indexOf(p.locKeys[i]) >= 0) return true;
    }
    return false;
  }

  function getDiscoveredProvinces(known, ownedMaps) {
    return CART_PROVINCES.filter(function(p){
      return isProvinceDiscovered(p.id, known, ownedMaps);
    });
  }

  function getLocationProvince(locKey){
    var pId = _LOCATION_TO_PROVINCE[locKey] || 'plains';
    return CART_PROVINCES.find(function(p){ return p.id === pId; }) || CART_PROVINCES[1];
  }

  // P-mapa sessão #73 (user: "Bioma: forest" deve estar em PT-BR): traduz a chave de
  // bioma (ASCII canonical) pro nome PT-BR exibido no popup do mapa.
  var _BIOME_PT = {
    plains: 'Planície', forest: 'Floresta', swamp: 'Pântano', mountain: 'Montanha',
    desert: 'Deserto', cave: 'Caverna', graveyard: 'Cemitério', snow: 'Ermo Gelado',
    volcanic: 'Vulcânico'
  };
  function biomePT(key){ return _BIOME_PT[key] || key; }

  // Informações de Terreno e Riscos Naturais D&D 5e (PHB p. 181-182 / DMG p. 108-112)
  var _BIOME_DND_INFO = {
    plains: {
      terrain: 'Terreno Firme · Estradas Imperiais',
      hazard: 'Perigos: Vento cortante, tempestades repentinas ou valas ocultas no capim alto.',
      saves: 'Salvaguardas D&D 5e: DES CD 12 (Obstáculos), CON CD 11 (Tempestades).',
      foraging: 'Forrageamento D&D 5e: Abundante · Sobrevivência CD 10 (Ervas e água doce).'
    },
    forest: {
      terrain: 'Terreno Denso · Trilhas da Floresta Antiga',
      hazard: 'Perigos: Galhos baixos espinhosos, raízes escorregadias e névoas alucinógenas.',
      saves: 'Salvaguardas D&D 5e: DES CD 13 (Galhos), SAB CD 12 (Névoa), FOR CD 13 (Teias).',
      foraging: 'Forrageamento D&D 5e: Fértil · Sobrevivência CD 10 (Frutos silvestres e caça menor).'
    },
    swamp: {
      terrain: 'Terreno Difícil (Custo ×2) · Pântano Traiçoeiro',
      hazard: 'Perigos: Lamaçal movediço, miasmas pútridos e enxames de sanguessugas.',
      saves: 'Salvaguardas D&D 5e: CON CD 13 (Miasma Tóxico), FOR CD 14 (Lodo Movediço).',
      foraging: 'Forrageamento D&D 5e: Traiçoeiro · Sobrevivência CD 14 (Água requer fervura e filtragem).'
    },
    mountain: {
      terrain: 'Terreno Acidentado · Cordilheira Escarpada',
      hazard: 'Perigos: Queda de rochas, desfiladeiros vertiginosos e ar rarefeito gélido.',
      saves: 'Salvaguardas D&D 5e: DES CD 14 (Desmoronamento), CON CD 13 (Exaustão/Frio).',
      foraging: 'Forrageamento D&D 5e: Escasso · Sobrevivência CD 15 (Raízes amargas e líquens).'
    },
    desert: {
      terrain: 'Terreno Árido · Dunas Escaldantes',
      hazard: 'Perigos: Calor extremo de dia, miragens traiçoeiras e tempestades de areia cortante.',
      saves: 'Salvaguardas D&D 5e: CON CD 14 (Desidratação), SAB CD 13 (Miragens).',
      foraging: 'Forrageamento D&D 5e: Crítico · Sobrevivência CD 17 (Cactos raros e água subterrânea).'
    },
    snow: {
      terrain: 'Terreno Gélido · Tundra e Neves Eternas',
      hazard: 'Perigos: Frio penetrante, gelo fino quebradiço e nevascas ofuscantes.',
      saves: 'Salvaguardas D&D 5e: CON CD 14 (Frio Extremo), SOB CD 13 (Orientação).',
      foraging: 'Forrageamento D&D 5e: Severo · Sobrevivência CD 16 (Gelo para derreter, escassez de caça).'
    },
    graveyard: {
      terrain: 'Terreno Funesto · Terras Amaldiçoadas',
      hazard: 'Perigos: Eflúvios necromânticos, sepulcros profanados e calafrios espectrais.',
      saves: 'Salvaguardas D&D 5e: SAB CD 13 (Pavor/Aura), CON CD 14 (Corrupção Profana).'
      , foraging: 'Forrageamento D&D 5e: Impossível · Água estagnada e vegetação necrosada.'
    },
    volcanic: {
      terrain: 'Terreno Vulcânico · Caldeira de Brasas',
      hazard: 'Perigos: Vapores de enxofre, solo incandescente e fumaça asfixiante.',
      saves: 'Salvaguardas D&D 5e: CON CD 14 (Gases Tóxicos), DES CD 13 (Brasas Soltas).'
      , foraging: 'Forrageamento D&D 5e: Impossível · Solo calcinado e fontes de água ácidas/ferventes.'
    },
    cave: {
      terrain: 'Terreno Subterrâneo · Cavernas Profundas',
      hazard: 'Perigos: Escuridão absoluta, estalagmites pontiagudas e abismos sem fundo.',
      saves: 'Salvaguardas D&D 5e: DES CD 13 (Terreno Irregular), SAB CD 12 (Orientação no Escuro).'
      , foraging: 'Forrageamento D&D 5e: Especial · Sobrevivência CD 15 (Fungos luminescentes e goteiras puras).'
    }
  };
  function getBiomeDndInfo(key){
    return _BIOME_DND_INFO[key] || {
      terrain: 'Terreno Silvestre',
      hazard: 'Perigos naturais e criaturas hostis nas estradas ermas.',
      saves: 'Salvaguarda D&D 5e: CON CD 12.'
    };
  }

  // === Export to global namespace ===
  window.CartShared = {
    INK_DARK: INK_DARK, INK_MED: INK_MED, INK_LIGHT: INK_LIGHT,
    INK_FAINT: INK_FAINT, PAPER_BG: PAPER_BG, PAPER_DARK: PAPER_DARK,
    SEA_INK: SEA_INK, SEA_FAINT: SEA_FAINT,
    CART_BIOMES: CART_BIOMES, CART_PATHS: CART_PATHS, CART_PROVINCES: CART_PROVINCES, getLocationProvince: getLocationProvince, isProvinceDiscovered: isProvinceDiscovered, getDiscoveredProvinces: getDiscoveredProvinces,
    _cartSeedRand: _cartSeedRand,
    _hatchArea: _hatchArea, _wavyLine: _wavyLine,
    _drawParchmentBase: _drawParchmentBase,
    _drawWorldMapBg: _drawWorldMapBg,              // 2026-06-03: world-map.webp como fundo (cover)
    _cartWorldMapRect: _cartWorldMapRect,          // 2026-06-03: rect cover → mapeia coords do editor
    worldMapReady: worldMapReady,                  // 2026-06-03: imagem do mapa carregou?
    _onWorldMapLoad: _onWorldMapLoad,              // 2026-06-03: invalida cache + redraw quando carregar
    createWorldCart: createWorldCart,              // 2026-06-04 (sessão #73): motor ÚNICO do mapa (cidade+exploração)
    locArtHtml: locArtHtml, clpImgFallback: clpImgFallback,  // P2 sessão #73: imagem do local no popup de viagem
    biomePT: biomePT,                              // P-mapa sessão #73: bioma key -> PT-BR no popup
    getBiomeDndInfo: getBiomeDndInfo,              // Informações de Terreno e Riscos Naturais D&D 5e
    getBiomeForageSustainability: getBiomeForageSustainability, // Forrageamento e Sustentabilidade de Água D&D 5e
    MARCHING_FORMATIONS: MARCHING_FORMATIONS,      // Ordens de Marcha Táticas D&D 5e
    getBiomeBestiaryThreats: getBiomeBestiaryThreats, // Bestiário Regional e Fauna D&D 5e
    getBiomeAltitude: getBiomeAltitude,            // Perfil Topográfico e Altitude D&D 5e
    TRAVEL_ROLES: TRAVEL_ROLES,                    // Funções de Viagem da Comitiva (PHB p. 182)
    getBiomeTerrainDifficulty: getBiomeTerrainDifficulty, // Custo de Movimento e Terreno Difícil (PHB p. 182)
    TRANSPORT_MODES: TRANSPORT_MODES,              // Modos de Transporte D&D 5e (A Pé, Montaria, Caravana)
    calcForcedMarchRisk: calcForcedMarchRisk,      // Cálculo de Marcha Forçada e Salvaguarda contra Exaustão
    getBarometerForecast: getBarometerForecast,
    calcWindImpact: calcWindImpact,
    calcExpeditionRationsBudget: calcExpeditionRationsBudget,
    getWildernessHazardDetails: getWildernessHazardDetails,
    calcEncounterTableBreakdown: calcEncounterTableBreakdown,
    _drawFocusPulseBeacon: _drawFocusPulseBeacon,
    calcPartyEncumbranceImpact: calcPartyEncumbranceImpact,
    calcRouteElevationProfile: calcRouteElevationProfile,
    calcTransportComparison: calcTransportComparison,
    calcExpeditionSchedule: calcExpeditionSchedule,
    getExplorationStats: getExplorationStats,
    calcNavigationOrientationCheck: calcNavigationOrientationCheck,
    findNearestSanctuary: findNearestSanctuary,
    getTrailSpoorClues: getTrailSpoorClues,
    calcExtremeWeatherExposure: calcExtremeWeatherExposure,
    calcMountLogistics: calcMountLogistics,
    calcCampRestRecovery: calcCampRestRecovery,
    getExpeditionWeatherTrend: getExpeditionWeatherTrend,
    calcHorizonVisibility: calcHorizonVisibility,
    calcRiverCrossingDifficulty: calcRiverCrossingDifficulty,
    getConnectedLocations: getConnectedLocations,
    calcCampWatchShifts: calcCampWatchShifts,
    getBiomeHarvestableResources: getBiomeHarvestableResources,
    calcPartyTravelRoles: calcPartyTravelRoles,
    calcForageYieldCheck: calcForageYieldCheck,
    rollWildernessEncounterTable: rollWildernessEncounterTable,
    getProvinceLandmarks: getProvinceLandmarks,
    calcCampDefensePerimeter: calcCampDefensePerimeter,
    calcRouteObstacleOptions: calcRouteObstacleOptions,
    calcTravelIllumination: calcTravelIllumination,
    calcCampCookingBenefits: calcCampCookingBenefits,
    calcSurvivalGearSynergy: calcSurvivalGearSynergy,
    calcAltitudeExposure: calcAltitudeExposure,
    calcMoonPhaseNavigation: calcMoonPhaseNavigation,
    calcForcedMarchRiskTable: calcForcedMarchRiskTable,
    calcRoadSecurityAndToll: calcRoadSecurityAndToll,
    calcForageComplication: calcForageComplication,
    calcBeastsOfBurden: calcBeastsOfBurden,
    calcWildernessTracking: calcWildernessTracking,
    calcSevereWeatherImpact: calcSevereWeatherImpact,
    calcCampDowntimeActivity: calcCampDowntimeActivity,
    calcNavigationalOrientationCheck: calcNavigationalOrientationCheck,
    calcCaravanEscortSynergy: calcCaravanEscortSynergy,
    calcNaturalShelterSearch: calcNaturalShelterSearch,
    calcWildernessHazardEncounter: calcWildernessHazardEncounter,
    calcWaterCrossingOptions: calcWaterCrossingOptions,
    calcExplorationMilestoneBoon: calcExplorationMilestoneBoon,
    calcCampFireConcealment: calcCampFireConcealment,
    calcRegionalBountyNotice: calcRegionalBountyNotice,
    calcWildernessHarvestYield: calcWildernessHarvestYield,
    calcCampNightWatchSchedule: calcCampNightWatchSchedule,
    calcTavernExplorationRumor: calcTavernExplorationRumor,
    calcWildernessSustenanceRequirements: calcWildernessSustenanceRequirements,
    calcCartographicTriangulation: calcCartographicTriangulation,
    calcCampAlarmAndSentryAnimal: calcCampAlarmAndSentryAnimal,
    calcCampfireCookedMeal: calcCampfireCookedMeal,
    calcCelestialStarNavigation: calcCelestialStarNavigation,
    calcWildernessTrailBlaze: calcWildernessTrailBlaze,
    calcMountainAltitudeAcclimatization: calcMountainAltitudeAcclimatization,
    calcWildernessAcousticFootprint: calcWildernessAcousticFootprint,
    calcEnvironmentalMirageEncounter: calcEnvironmentalMirageEncounter,
    calcWildernessChaseEscape: calcWildernessChaseEscape,
    calcRegionalLeylineNode: calcRegionalLeylineNode,
    calcWildernessWeatherForecast: calcWildernessWeatherForecast,
    calcAncientWaystoneAttunement: calcAncientWaystoneAttunement,
    calcMonsterSpoorAndLairProximity: calcMonsterSpoorAndLairProximity,
    calcWildernessQuicksandHazard: calcWildernessQuicksandHazard,
    calcWaterSourcePurityAndPurification: calcWaterSourcePurityAndPurification,
    calcArborealBivouacShelter: calcArborealBivouacShelter,
    calcWildernessSignalSmokeAndFlares: calcWildernessSignalSmokeAndFlares,
    calcPackAnimalConditioningAndLoad: calcPackAnimalConditioningAndLoad,
    calcRockfallAndLandslideHazard: calcRockfallAndLandslideHazard,
    calcCampfireFuelAndHeatConservation: calcCampfireFuelAndHeatConservation,
    calcRiverFordingAndRopeBridgeHazard: calcRiverFordingAndRopeBridgeHazard,
    calcCampFortificationAndPerimeterDefense: calcCampFortificationAndPerimeterDefense,
    calcAvalancheAndGlacialCrevasseHazard: calcAvalancheAndGlacialCrevasseHazard,
    calcCampSanitizationAndPestRepellent: calcCampSanitizationAndPestRepellent,
    calcSandstormAndAridHeatHazard: calcSandstormAndAridHeatHazard,
    calcWildernessAcousticSignalHorn: calcWildernessAcousticSignalHorn,
    calcKarstSinkholeAndCavernHazard: calcKarstSinkholeAndCavernHazard,
    calcCampScentConcealmentAndWasteDisposal: calcCampScentConcealmentAndWasteDisposal,
    calcWildernessFungalSporeAndYellowMoldHazard: calcWildernessFungalSporeAndYellowMoldHazard,
    calcCampGroundInsulationAndSleepingPlatform: calcCampGroundInsulationAndSleepingPlatform,
    calcWildernessLightningAndConductiveRidgeHazard: calcWildernessLightningAndConductiveRidgeHazard,
    calcCampLightningRodAndGroundingSafety: calcCampLightningRodAndGroundingSafety,
    calcDenseFogAndVisualObscurementHazard: calcDenseFogAndVisualObscurementHazard,
    calcCampDrainageTrenchAndRunoffDiversion: calcCampDrainageTrenchAndRunoffDiversion,
    calcWildernessGaleForceWindsAndFlightHazard: calcWildernessGaleForceWindsAndFlightHazard,
    calcCampWindbreakPalisadeAndGuylineBracing: calcCampWindbreakPalisadeAndGuylineBracing,
    calcWildernessCausticBogAndMiasmaHazard: calcWildernessCausticBogAndMiasmaHazard,
    calcCampBootDryingAndFootwearCare: calcCampBootDryingAndFootwearCare,
    calcWildernessBeastLairAndTerritorialAmbushHazard: calcWildernessBeastLairAndTerritorialAmbushHazard,
    calcCampTripwireAlarmAndDefensiveSnare: calcCampTripwireAlarmAndDefensiveSnare,
    calcWildernessThinIceAndFrigidWaterHazard: calcWildernessThinIceAndFrigidWaterHazard,
    calcCampThermalReflectorAndHypothermiaCare: calcCampThermalReflectorAndHypothermiaCare,
    calcWildernessVolcanicFumaroleAndNoxiousGasHazard: calcWildernessVolcanicFumaroleAndNoxiousGasHazard,
    calcCampAshFiltrationAndVentilationSeal: calcCampAshFiltrationAndVentilationSeal,
    calcWildernessExtremeHeatAndSunstrokeHazard: calcWildernessExtremeHeatAndSunstrokeHazard,
    calcCampSolarStillAndShadeCanopy: calcCampSolarStillAndShadeCanopy,
    calcWildernessRockfallAndAvalancheHazard: calcWildernessRockfallAndAvalancheHazard,
    calcCampRetainingWallAndPitonAnchoring: calcCampRetainingWallAndPitonAnchoring,
    calcWildernessFlashFloodAndRiverRapidHazard: calcWildernessFlashFloodAndRiverRapidHazard,
    calcCampFloodClearanceAndRopeTraverse: calcCampFloodClearanceAndRopeTraverse,
    calcWildernessRazorvineAndChokingBrierHazard: calcWildernessRazorvineAndChokingBrierHazard,
    calcCampClearingMacheteAndProtectiveGaiters: calcCampClearingMacheteAndProtectiveGaiters,
    calcWildernessParasiteSwarmAndVectorHazard: calcWildernessParasiteSwarmAndVectorHazard,
    calcCampSmokeSmudgePotAndCitronellaRepellent: calcCampSmokeSmudgePotAndCitronellaRepellent,
    calcWildernessWildMagicAndArcaneFalloutHazard: calcWildernessWildMagicAndArcaneFalloutHazard,
    calcCampGlyphicWardsAndChalkCirclePerimeter: calcCampGlyphicWardsAndChalkCirclePerimeter,
    calcWildernessBlizzardAndWhiteoutHazard: calcWildernessBlizzardAndWhiteoutHazard,
    calcCampSnowTrenchQuinzheeAndFurBedding: calcCampSnowTrenchQuinzheeAndFurBedding,
    calcWildernessSeismicTremorAndEarthFissureHazard: calcWildernessSeismicTremorAndEarthFissureHazard,
    calcCampFlexibleGuylineAndSeismicBufferPlatform: calcCampFlexibleGuylineAndSeismicBufferPlatform,
    calcWildernessCoastalReefAndTidalSurgeHazard: calcWildernessCoastalReefAndTidalSurgeHazard,
    calcCampTideLineClearanceAndAnchorGrapnel: calcCampTideLineClearanceAndAnchorGrapnel,
    calcWildernessSubterraneanGasAndChokeDampHazard: calcWildernessSubterraneanGasAndChokeDampHazard,
    calcCampUndergroundVentilationAndDavySafetyLamp: calcCampUndergroundVentilationAndDavySafetyLamp,
    calcWildernessSubmergedCavesAndKarstSiphonHazard: calcWildernessSubmergedCavesAndKarstSiphonHazard,
    calcCampSpelunkingLineAndBuoyantPouchStation: calcCampSpelunkingLineAndBuoyantPouchStation,
    calcWildernessDesertNocturnalFreezingAndShiftingDunesHazard: calcWildernessDesertNocturnalFreezingAndShiftingDunesHazard,
    calcCampDesertThermalTrenchAndReflectiveWall: calcCampDesertThermalTrenchAndReflectiveWall,
    calcWildernessSwampQuicksandAndSporeBloomHazard: calcWildernessSwampQuicksandAndSporeBloomHazard,
    calcCampSwampStiltPlatformAndMudshoeStation: calcCampSwampStiltPlatformAndMudshoeStation,
    calcWildernessDenseForestDeadfallAndAllergenicPollenHazard: calcWildernessDenseForestDeadfallAndAllergenicPollenHazard,
    calcCampForestCanopyHammockAndDeadfallClearingStation: calcCampForestCanopyHammockAndDeadfallClearingStation,
    calcWildernessGlacialCrevasseAndPermafrostHazard: calcWildernessGlacialCrevasseAndPermafrostHazard,
    calcCampGlacialSnowBlockShelterAndIceScrewStation: calcCampGlacialSnowBlockShelterAndIceScrewStation,
    calcWildernessRockyCanyonWindTunnelAndSpallingHazard: calcWildernessRockyCanyonWindTunnelAndSpallingHazard,
    calcCampCanyonRockOverhangAndWindbreakStation: calcCampCanyonRockOverhangAndWindbreakStation,
    calcWildernessSteppeGrassFireAndWindstormHazard: calcWildernessSteppeGrassFireAndWindstormHazard,
    calcCampSteppeYurtShelterAndFirebreakStation: calcCampSteppeYurtShelterAndFirebreakStation,
    calcWildernessMangroveSwampAndTidalMudflatHazard: calcWildernessMangroveSwampAndTidalMudflatHazard,
    calcCampMangroveStiltPlatformAndOutriggerStation: calcCampMangroveStiltPlatformAndOutriggerStation,
    calcWildernessVolcanicHighlandTephraAndLavaBombHazard: calcWildernessVolcanicHighlandTephraAndLavaBombHazard,
    calcCampVolcanicBasaltOverhangAndTephraTrenchStation: calcCampVolcanicBasaltOverhangAndTephraTrenchStation,
    calcWildernessAcidMarshAndCorrosiveSlimeHazard: calcWildernessAcidMarshAndCorrosiveSlimeHazard,
    calcCampAcidMarshCorduroyCausewayAndLimestoneBed: calcCampAcidMarshCorduroyCausewayAndLimestoneBed,
    calcWildernessHighAltitudeHypoxiaAndThinAirHazard: calcWildernessHighAltitudeHypoxiaAndThinAirHazard,
    calcCampAcclimatizationBivouacAndOxygenTrap: calcCampAcclimatizationBivouacAndOxygenTrap,
    _drawSearchMatchBeacon: _drawSearchMatchBeacon,
    _nodeMatchesSearch: _nodeMatchesSearch,
    getWeatherDndInfo: getWeatherDndInfo,          // Clima e Efeitos Ambientais D&D 5e
    calcEncounterRisk: calcEncounterRisk,          // Avaliação de Risco de Emboscada na Estrada D&D 5e
    getPinnedLocations: _getPinnedLocations,
    isLocPinned: _isLocPinned,
    toggleLocPinned: _toggleLocPinned,
    _drawCartAtmosphere: _drawCartAtmosphere,
    _drawAgedParchment: _drawAgedParchment,        // 2026-05-04: estilo #4 AAA (legado — só fallback explore)
    _drawOrganicBlob: _drawOrganicBlob,            // helper exposto
    _drawAgedStain: _drawAgedStain,                // helper exposto
    _drawCrease: _drawCrease,                      // helper exposto
    _drawScorchedEdge: _drawScorchedEdge,          // helper exposto
    _drawBiomeArt: _drawBiomeArt,
    _drawCartPath: _drawCartPath,
    _buildCartFog: _buildCartFog,                  // 2026-06-04 (sessão #74): fog of war Low-Res Upscale
    _drawCartNode: _drawCartNode,
    _drawPlayerPin: _drawPlayerPin,
    calcDistanceBearing: calcDistanceBearing,
    formatExpeditionItinerary: formatExpeditionItinerary,
    _BEARING_16: _BEARING_16,
    _drawCartRuler: _drawCartRuler,
    _drawCartCompass: _drawCartCompass,
    _drawCartScaleBar: _drawCartScaleBar,
    _drawCampsiteWaypoint: _drawCampsiteWaypoint,
    isCompassAt: _isCompassAt,
    getLocNote: _getLocNote,
    setLocNote: _setLocNote,
    _findRoutePath: _findRoutePath,
    _drawActiveRouteBreadcrumbs: _drawActiveRouteBreadcrumbs,
    _drawUnknownLocation: _drawUnknownLocation  // 2026-05-04: locais não-descobertos
  };
})();