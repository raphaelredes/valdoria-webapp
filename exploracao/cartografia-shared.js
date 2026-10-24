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

    // Destino Badge abaixo do nó
    ctx.font = '700 8.5px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;
    ctx.fillText('DESTINO', 0, r2 + 6);

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

        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '700 13px Cinzel, serif';
        ctx.fillStyle = (provPct >= 100) ? '#fde047' : '#f4d896';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 6;
        ctx.fillText((curProv.icon || '📍') + ' ' + curProv.name.toUpperCase(), _S / 2, 28);
        ctx.font = 'italic 10px Georgia, serif';
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

        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '700 13px Cinzel, serif';
        ctx.fillStyle = (worldPct >= 100) ? '#fde047' : '#f4d896';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 6;
        ctx.fillText('🌍 CONTINENTE DE VALDÓRIA', _S / 2, 28);
        ctx.font = 'italic 10px Georgia, serif';
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