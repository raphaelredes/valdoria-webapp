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
    { key: 'plains',    name: 'Portões de Valdoria',     x: 0.46, y: 0.5, biome: 'plains',    tier: 0, ico: '', isOrigin: true,
      mapKey: null,
      desc: 'Os grandes portões da cidade. Aldric vigia a entrada. Ponto de partida de toda jornada.' },
    // ─── PLAINS interior (Sudoeste/Sudeste) ──────
    { key: 'green_fields',   name: 'Campos Verdes',       x: 0.34, y: 0.68, biome: 'plains',  tier: 1, ico: '',
      mapKey: 'Mapa das Planícies',
      desc: 'Vastas planícies onde o vento sopra livre. Lar de coelhos... e bandidos.' },
    { key: 'orc_tribe',      name: 'Acampamento Orc',     x: 0.5, y: 0.74, biome: 'plains',  tier: 3, ico: '',
      mapKey: 'Mapa das Planícies',
      desc: 'Tendas de couro grosseiro e fogueiras. Tambores de guerra ecoam.' },
    { key: 'bandit_fortress', name: 'Forte dos Bandidos', x: 0.66, y: 0.66, biome: 'plains',  tier: 5, ico: '',
      mapKey: 'Mapa das Planícies',
      desc: 'Fortaleza improvisada de madeira e pedra. Base de saqueadores.' },
    // ─── FOREST (Norte) ───────────────────────────
    { key: 'forest',    name: 'Floresta dos Sussurros',  x: 0.55, y: 0.24, biome: 'forest',   tier: 2, ico: '',
      mapKey: 'Mapa da Floresta',
      desc: 'Árvores antigas que bloqueiam a luz do sol. Sombras com vida.' },
    { key: 'goblin_nest',     name: 'Ninho de Goblins',  x: 0.4, y: 0.3, biome: 'forest',   tier: 2, ico: '',
      mapKey: 'Mapa da Floresta',
      desc: 'Clareira cheia de armadilhas e lixo. O cheiro é terrível.' },
    { key: 'elven_ruins',     name: 'Ruínas Élficas',    x: 0.72, y: 0.16, biome: 'forest',   tier: 4, ico: '',
      mapKey: 'Mapa da Floresta',
      desc: 'Restos de uma antiga civilização élfica. A magia ainda pulsa.' },
    // ─── CAVE / UNDERGROUND (Oeste) ──────────────
    { key: 'cave',      name: 'Passagem Subterrânea',    x: 0.22, y: 0.56, biome: 'cave',     tier: 3, ico: '',
      mapKey: 'Mapa das Montanhas',
      desc: 'Túnel escuro sob as colinas. Ecos estranhos das profundezas.' },
    { key: 'troll_cave', name: 'Caverna do Troll',       x: 0.1, y: 0.34, biome: 'cave',     tier: 5, ico: '',
      mapKey: 'Mapa das Montanhas',
      desc: 'Abertura escura na rocha. Ossos enormes na entrada.' },
    // ─── SWAMP (Leste) ───────────────────────────
    { key: 'swamp',     name: 'Pântano Nebuloso',         x: 0.66, y: 0.4, biome: 'swamp',   tier: 3, ico: '',
      mapKey: 'Mapa do Pântano',
      desc: 'Águas paradas e névoa eterna. Cuidado onde pisa.' },
    { key: 'deep_swamp', name: 'Pântano Profundo',        x: 0.82, y: 0.5, biome: 'swamp',   tier: 5, ico: '',
      mapKey: 'Mapa do Pântano',
      desc: 'Águas negras e árvores mortas. Criaturas anciãs espreitam.' },
    // ─── MOUNTAIN (Noroeste) ──────────────────────
    { key: 'mountain',  name: 'Picos de Pedra',           x: 0.2, y: 0.16, biome: 'mountain', tier: 4, ico: '',
      mapKey: 'Mapa das Montanhas',
      desc: 'Montanhas íngremes e vento cortante. Harpias fazem ninhos.' },
    { key: 'dragon_pass', name: 'Passo do Dragão',        x: 0.34, y: 0.1, biome: 'mountain', tier: 6, ico: '',
      mapKey: 'Mapa das Montanhas',
      desc: 'Passagem estreita entre picos vulcânicos. Fumaça sobe do vale.' },
    { key: 'korthag',   name: 'Korthag (Vila Mineira)',   x: 0.07, y: 0.07, biome: 'mountain', tier: 3, ico: '', settlement: true, discoverable: true,
      mapKey: null,
      desc: 'Vila mineradora encravada nos picos. Fornalhas ardem dia e noite.' },
    // ─── DESERT (Sudeste) ─────────────────────────
    { key: 'desert',    name: 'Deserto Dourado',          x: 0.62, y: 0.86, biome: 'desert',   tier: 4, ico: '',
      mapKey: 'Mapa do Deserto',
      desc: 'Dunas sem fim sob um sol impiedoso. Água vale mais que ouro.' },
    // ─── GRAVEYARD (Sul) ──────────────────────────
    { key: 'graveyard', name: 'Cemitério Antigo',         x: 0.34, y: 0.9, biome: 'graveyard', tier: 3, ico: '',
      mapKey: 'Mapa do Pântano',
      desc: 'Lápides cobertas de musgo. Mortos não descansam em paz.' },
    { key: 'ancestral_graveyard', name: 'Cemitério Ancestral', x: 0.18, y: 0.86, biome: 'graveyard', tier: 5, ico: '',
      mapKey: 'Mapa do Pântano',
      desc: 'Mausoléus antigos da aristocracia esquecida. Magia necromântica residual.' },
    // ─── UNDERGROUND DEEP (Oeste profundo) ───────
    { key: 'underground_caverns', name: 'Cavernas Subterrâneas', x: 0.07, y: 0.7, biome: 'cave', tier: 5, ico: '',
      mapKey: 'Mapa das Montanhas',
      desc: 'Sistema de túneis profundos. Pedra esculpida pelo tempo.' },
    { key: 'crystal_depths', name: 'Profundezas de Cristal', x: 0.06, y: 0.52, biome: 'cave', tier: 7, ico: '',
      mapKey: 'Mapa das Montanhas',
      desc: 'Cavernas iluminadas por cristais luminescentes. Magia ancestral pulsa nas paredes.' },
    // ─── SNOW (Norte distante) ────────────────────
    { key: 'snow',      name: 'Ermo Congelado',           x: 0.5, y: 0.05, biome: 'snow',     tier: 5, ico: '',
      mapKey: 'Mapa do Ermo Gelado',
      desc: 'Tudo é branco e mortal. O frio penetra até a alma.' },
    // ─── VOLCANIC (Leste extremo) ─────────────────
    { key: 'volcanic',  name: 'Cratera Vulcânica',        x: 0.9, y: 0.66, biome: 'volcanic', tier: 8, ico: '',
      mapKey: 'Mapa Vulcânico',
      desc: 'Rios de lava e cinzas. O calor derrete metal. Lar de dragões?' },
    { key: 'valkrest',  name: 'Valkrest (Acampamento)',   x: 0.92, y: 0.4, biome: 'volcanic', tier: 5, ico: '', settlement: true, discoverable: true,
      mapKey: null,
      desc: 'Acampamento fortificado de aventureiros veteranos. Tendas resistem ao calor.' }
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
    ['crystal_depths', 'mountain']            // Profundezas → Picos (passagem alta)
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
    try {
      var _im = new Image();
      _im.onload = function(){
        _cartWorldMap = _im;
        var cbs = _cartWorldMapCbs; _cartWorldMapCbs = [];
        cbs.forEach(function(cb){ try { cb(); } catch(_){} });
      };
      _im.onerror = function(){ _cartWorldMap = null; };
      _im.src = '/shared/img/map/world-map.webp';
    } catch(_e){ _cartWorldMap = null; }
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
    _drawBiomeArtCore(ctx, b, w, h);
    _drawBiomeAtmosphere(ctx, b, w, h);
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
  // rgba(26,21,16,0.92) (marrom 92%) → dava pra ver o mapa por baixo e saber o
  // TAMANHO total já no nível 1. Agora preto opaco esconde a extensão do mapa até
  // o jogador descobrir os limites (igual o fundo preto do zoom-out).
  var CART_FOG_COLOR = 'rgba(0,0,0,1)';
  // falloff smoothstep: 0 (revelado) até r0; 255 (névoa cheia) após r1; gradiente no meio.
  function _cartFogFalloff(dist, r0, r1){
    if (dist <= r0) return 0;
    if (dist >= r1) return 255;
    var t = (dist - r0) / (r1 - r0);
    t = t * t * (3 - 2 * t);   // smoothstep (borda macia, igual ao upscale bilinear)
    return Math.round(t * 255);
  }
  // distância ponto→segmento em coords normalizadas (clareira ao longo das estradas)
  function _cartDistToSeg(px, py, ax, ay, bx, by){
    var dx = bx - ax, dy = by - ay;
    var len2 = dx*dx + dy*dy;
    var t = len2 > 0 ? ((px-ax)*dx + (py-ay)*dy) / len2 : 0;
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    var cx = ax + t*dx, cy = ay + t*dy;
    var ex = px - cx, ey = py - cy;
    return Math.sqrt(ex*ex + ey*ey);
  }
  // Constrói o canvas de névoa S×S (cacheado pelo consumer; só muda quando known/coords/S mudam).
  // knownArr = array de keys conhecidas; biomes = RB (coords resolvidas do editor).
  function _buildCartFog(S, knownArr, biomes){
    if (typeof document === 'undefined' || !knownArr) return null;
    var lite = (typeof window !== 'undefined' && window._valdoriaPerformanceTier === 'lite');
    var RES = lite ? 48 : 72;                       // resolução da máscara (bilinear suaviza)
    var isK = function(key){ return knownArr.indexOf(key) >= 0 || key === 'plains'; };
    var locs = [];
    biomes.forEach(function(b){ if (isK(b.key) || b.isOrigin) locs.push([b.x, b.y]); });
    if (!locs.length) locs.push([0.42, 0.55]);      // origem (Portões de Valdoria) fallback
    var roads = [];
    CART_PATHS.forEach(function(p){
      if (!isK(p[0]) || !isK(p[1])) return;         // estrada só revela se AMBAS as pontas conhecidas
      var a = biomes.find(function(bb){ return bb.key === p[0]; });
      var b = biomes.find(function(bb){ return bb.key === p[1]; });
      if (a && b) roads.push([a.x, a.y, b.x, b.y]);
    });
    var LOC_R0 = 0.055, LOC_R1 = 0.16;              // clareira ao redor de cada local
    var ROAD_R0 = 0.018, ROAD_R1 = 0.052;           // faixa ao longo das estradas
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
        if (a > 0 && roads.length) {                // estradas só importam onde ainda há névoa
          var dr = Infinity;
          for (var m = 0; m < roads.length; m++) {
            var ds = _cartDistToSeg(nx, ny, roads[m][0], roads[m][1], roads[m][2], roads[m][3]);
            if (ds < dr) dr = ds;
          }
          var ar = _cartFogFalloff(dr, ROAD_R0, ROAD_R1);
          if (ar < a) a = ar;                       // revelado se perto de local OU estrada
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
    fctx.globalCompositeOperation = 'source-in';    // mantém o alpha da máscara, troca RGB
    fctx.fillStyle = CART_FOG_COLOR;
    fctx.fillRect(0, 0, fog.width, fog.height);
    return fog;
  }

  // === _drawCartNode ===
  function _drawCartNode(ctx, b, w, h, isHover){
    // === Node hand-drawn (Fase 6.5) ============================================
    // Pencil-style: pin dot pequeno + nome inline. SEM filled circle, SEM emoji.
    // O biome ART já tem o pictograma temático (montanha, vulcão, etc).
    // Hover: anel adicional + label maior.
    var bx = b.x * w, by = b.y * h;
    var isOrigin = b.isOrigin;
    ctx.save();
    // P-mapa sessão #73 (user: "o nome e nível dos locais deve sumir e aparecer SÓ com
    // o mouse em cima do local"): o label (pill nome + nível) só é desenhado no HOVER.
    // Por padrão o mapa mostra APENAS as imagens dos locais (loc-art) — nada de labels
    // poluindo a visão. A descrição aparece no tooltip (também só no hover).
    if (!isHover) { ctx.restore(); return; }
    // P-mapa sessão #73 (user): SEM círculo marrom / anel. O local é só a IMAGEM
    // (loc-art, desenhada por _drawLocArt com hover-zoom) + o label do nome abaixo.
    // A DESCRIÇÃO aparece no tooltip ao passar o mouse. Removidos: pin dot + anel
    // externo + anel duplo de origem + anel tracejado de hover.
    // Label do bioma — P3 sessão #73: pill ESCURO + texto claro/dourado, legível
    // sobre o world-map medieval. Antes era backplate cream (PAPER_BG) do mapa-
    // pergaminho ANTIGO — destoava do fundo escuro e deixava o range de nível
    // (texto INK_MED escuro, SEM backplate) quase ilegível sobre o mapa.
    var labelText = b.name;
    ctx.font = (isHover ? 'bold 11px' : '10px') + ' serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var tw = ctx.measureText(labelText).width;
    // 2026-05-05 v10: sem "Tier N" — só range de nível recomendado. Origem (tier 0)
    // sem badge (cidade segura).
    var hasLvl = (typeof b.tier === 'number' && b.tier > 0);
    var lvlRange = !hasLvl ? '' :
                   (b.tier <= 1) ? 'nv 1–2' :
                   (b.tier <= 3) ? 'nv 2–4' :
                   (b.tier <= 5) ? 'nv 4–7' :
                   (b.tier <= 7) ? 'nv 7–10' : 'nv 10+';
    var lvlW = 0;
    if (hasLvl) { ctx.font = 'italic 8px serif'; lvlW = ctx.measureText(lvlRange).width; ctx.font = (isHover ? 'bold 11px' : '10px') + ' serif'; }
    var pillW = Math.max(tw, lvlW) + 12;
    var pillH = hasLvl ? 27 : 16;
    var pillX = bx - pillW / 2, pillY = by + 21;
    // Pill escuro semi-transparente (lê em QUALQUER parte do world-map)
    ctx.fillStyle = 'rgba(26,21,16,0.82)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 5);
    else ctx.rect(pillX, pillY, pillW, pillH);
    ctx.fill();
    // Borda dourada sutil (origem mais forte; hover mais grosso)
    ctx.strokeStyle = isOrigin ? 'rgba(196,149,58,0.85)' : 'rgba(196,149,58,0.42)';
    ctx.lineWidth = isHover ? 0.9 : 0.6;
    ctx.stroke();
    // Nome do local (claro; origem dourada)
    ctx.fillStyle = isOrigin ? '#e8c45a' : '#e6dcc4';
    ctx.fillText(labelText, bx, pillY + 3);
    // Range de nível (dourado, DENTRO do pill — agora legível)
    if (hasLvl) {
      ctx.font = 'italic 8px serif';
      ctx.fillStyle = 'rgba(196,149,58,0.92)';
      ctx.fillText(lvlRange, bx, pillY + 16);
    }
    ctx.restore();
  }

  // === _drawPlayerPin ===
  function _drawPlayerPin(ctx, b, w, h){
    // Sessão #74 (user): SEM o label "Você está aqui" + IMAGEM de estandarte fincado
    // (player-pin.webp) marcando a posição do personagem. A BASE do estandarte crava no
    // node (posição) e a flâmula se ergue acima. Desenhado APÓS o fog → sempre visível.
    var bx = b.x * w, by = b.y * h;
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

  // === _drawCartCompass ===
  function _drawCartCompass(ctx, w, h){
    // Top-right (era bottom-right, mas conflitava com zoom controls)
    var cx = w - 40, cy = 40;
    var R = 22;
    ctx.save();
    ctx.translate(cx, cy);
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
  function createWorldCart(cfg){
    cfg = cfg || {};
    var _baseCache = null;
    var _locArt = null;       // {key: Image|false}
    var _locCoords = {};      // override {key:{x,y,scale}} do editor (server)
    var _coordsLoaded = false, _coordsFetching = false;  // P-mapa #73: carrega coords c/ retry (race apiBase)
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
          && _baseCache._dpr === dpr && _baseCache._mapReady === mapReady) {
        return _baseCache;
      }
      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
      var bc = cv.getContext('2d', { alpha: false });
      bc.scale(dpr, dpr);
      var _mapReady = _drawWorldMapBg(bc, w, h);
      cv._w = w; cv._h = h; cv._dpr = dpr; cv._mapReady = _mapReady;
      _baseCache = cv;
      return cv;
    }

    // Fog of war (sessão #74): cache por-instância do canvas de névoa. Invalida quando
    // a assinatura (S arredondado + lista de known ordenada) muda OU quando as coords do
    // editor chegam (_fogCache=null no callback de coords). known===null (exploração) →
    // SEM névoa (o mapa sandbox mostra tudo; só a cidade tem descoberta progressiva).
    var _fogCache = null;
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
        im.onerror = function () { _locArt[b.key] = false; };
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
      var _isCity = (b.key === 'plains' || b.biome === 'plains');
      if (!ic || ic === false || !ic.complete || !ic.naturalWidth) {
        // 2026-06-21 (user): a CIDADE (origem/plains) mostra SÓ a imagem OpenAI
        // (plains.webp). NÃO cair no castelo VETORIAL procedural — ele dava um FLASH
        // do desenho antigo antes da webp carregar (e em file://). Nada é desenhado;
        // o redraw assíncrono (_onLoad) pinta a webp quando chega. Demais biomas
        // mantêm o pictograma fallback.
        if (!_isCity) _drawBiomeArt(ctx, b, w, h);
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
      catch (_) { if (!_isCity) _drawBiomeArt(ctx, b, w, h); }
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
      ctx.translate(_offX, _offY);
      // Visibility: known=null → mostra TODOS (exploração); array → filtra + "?" (cidade).
      var known = (typeof cfg.getKnownLocations === 'function') ? cfg.getKnownLocations() : null;
      var hover = view.hoverNode || null;
      var hoverKey = hover ? hover.key : null;
      function _pathEndKnown(key){ return known === null || known.indexOf(key) >= 0 || key === 'plains'; }
      _ensureLocArt();
      // P5 sessão #73: RB = biomes com as coords do EDITOR → ícones/nodes/labels/rotas/
      // pin/hit-test TODOS no MESMO lugar (antes só o ícone usava editor; o resto usava
      // CART_BIOMES, por isso ícone e rota apareciam separados).
      var RB = CART_BIOMES.map(_resolved);
      RB.forEach(function(b){
        if (known === null || known.indexOf(b.key) >= 0 || b.isOrigin) _drawLocArt(ctx, b, _S, _S, hoverKey === b.key);
      });
      CART_PATHS.forEach(function(p){
        if (_pathEndKnown(p[0]) && _pathEndKnown(p[1])) _drawCartPath(ctx, p[0], p[1], _S, _S, RB);
      });
      // P-mapa sessão #74 (user: "fog of war igual a exploração — tampando os locais
      // que o personagem ainda não foi ou nem soube que existe"): NÉVOA por cima do não-
      // conhecido. Depois das estradas + ícones (clareiras revelam o conhecido), antes
      // dos labels/pin (ficam por cima). known===null (exploração) → _ensureCartFog null.
      var _fog = _ensureCartFog(_S, known, RB);
      if (_fog) ctx.drawImage(_fog, 0, 0, _S, _S);
      RB.forEach(function(b){
        // P-mapa sessão #73 (user): NÃO mostra locais não-descobertos (nem o "?").
        // Só aparece o que o personagem JÁ descobriu (known_locations) ou a origem —
        // antes desenhava _drawUnknownLocation (silhueta tracejada + "?") pra todos.
        if (known === null || known.indexOf(b.key) >= 0 || b.isOrigin) _drawCartNode(ctx, b, _S, _S, hoverKey === b.key);
      });
      var pk = (typeof cfg.getPlayerBiomeKey === 'function') ? cfg.getPlayerBiomeKey() : null;
      var pn = pk && RB.find(function(b){ return b.key === pk; });
      if (pn) _drawPlayerPin(ctx, pn, _S, _S);
      var qf = (typeof cfg.getQuestFocus === 'function') ? cfg.getQuestFocus() : null;
      if (qf && qf.key && typeof cfg.drawQuestHalo === 'function') {
        var qn = RB.find(function(b){ return b.key === qf.key; });
        if (qn) cfg.drawQuestHalo(ctx, qn, _S, _S, qf.title || 'Missão');
      }
      ctx.restore();
      // Bússola — screen-space (top-right, NÃO pan/zooma).
      _drawCartCompass(ctx, w, h);
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
      var known = (typeof cfg.getKnownLocations === 'function') ? cfg.getKnownLocations() : null;
      var best = null, bestD = Infinity;
      for (var i = 0; i < CART_BIOMES.length; i++) {
        var b = CART_BIOMES[i];
        if (!(known === null || known.indexOf(b.key) >= 0 || b.isOrigin)) continue;
        var rb = _resolved(b);  // P5 sessão #73: coords do editor (igual ao render)
        var bx = _offX + rb.x * _S;
        var by = _offY + rb.y * _S;
        // P-mapa sessão #73 (user: "efeitos do mouse SÓ na imagem"): raio de hit =
        // metade da largura REAL da imagem do local (MESMA conta do _drawLocArt: iw =
        // scale% * _S), não um círculo fixo maior. Mínimo de tap-target pra toque no
        // smartphone (~56px) e desktop (~24px) — usabilidade sem estourar a imagem.
        var _ov = _locCoords[b.key] || {};
        var imgHalf = (((typeof _ov.scale === 'number' ? _ov.scale : 5) / 100) * _S) / 2;  // default 5 (igual ao _drawLocArt)
        var radius = isTouch ? Math.max(imgHalf, 28) : Math.max(imgHalf, 12);
        var rsq = radius * radius;
        var dx = wx - bx, dy = wy - by;
        var d = dx*dx + dy*dy;
        if (d <= rsq && d < bestD) { best = b; bestD = d; }
      }
      return best;
    }

    return {
      draw: draw,
      findNodeAt: findNodeAt,
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

  // P-mapa sessão #73 (user: "Bioma: forest" deve estar em PT-BR): traduz a chave de
  // bioma (ASCII canonical) pro nome PT-BR exibido no popup do mapa.
  var _BIOME_PT = {
    plains: 'Planície', forest: 'Floresta', swamp: 'Pântano', mountain: 'Montanha',
    desert: 'Deserto', cave: 'Caverna', graveyard: 'Cemitério', snow: 'Ermo Gelado',
    volcanic: 'Vulcânico'
  };
  function biomePT(key){ return _BIOME_PT[key] || key; }

  // === Export to global namespace ===
  window.CartShared = {
    INK_DARK: INK_DARK, INK_MED: INK_MED, INK_LIGHT: INK_LIGHT,
    INK_FAINT: INK_FAINT, PAPER_BG: PAPER_BG, PAPER_DARK: PAPER_DARK,
    SEA_INK: SEA_INK, SEA_FAINT: SEA_FAINT,
    CART_BIOMES: CART_BIOMES, CART_PATHS: CART_PATHS,
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
    _drawCartCompass: _drawCartCompass,
    _drawUnknownLocation: _drawUnknownLocation  // 2026-05-04: locais não-descobertos
  };
})();