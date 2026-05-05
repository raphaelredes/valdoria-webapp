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
  var CART_BIOMES = [
    { key: 'plains',    name: 'Planície de Valdoria',  x: 0.36, y: 0.58, color: '#a8c878', accent: '#7da855', tier: 1,  ico: '🌾', isOrigin: true,
      desc: 'Cidade de Valdoria. Origem do aventureiro. Verdes campos e estradas.' },
    { key: 'forest',    name: 'Floresta dos Lobos',    x: 0.54, y: 0.34, color: '#508e46', accent: '#2e5e2a', tier: 2,  ico: '🌲',
      desc: 'Lobos cinzentos rondam. Árvores antigas. Caminhos sinuosos.' },
    { key: 'cave',      name: 'Caverna dos Ecos',      x: 0.20, y: 0.44, color: '#6a5a4a', accent: '#3e3428', tier: 3,  ico: '🏔️',
      desc: 'Minérios e cristais. Sons ecoam pelas câmaras subterrâneas.' },
    { key: 'swamp',     name: 'Pântano Sussurrante',   x: 0.64, y: 0.55, color: '#5a6b3a', accent: '#3a4a22', tier: 4,  ico: '🌫️',
      desc: 'Águas turvas. Venenos raros. Sussurros entre os juncos.' },
    { key: 'mountain',  name: 'Montanha Gelada',       x: 0.20, y: 0.22, color: '#8a8a9a', accent: '#5a5a6a', tier: 5,  ico: '⛰️',
      desc: 'Picos cobertos de neve. Metais raros. Escalada perigosa.' },
    { key: 'desert',    name: 'Deserto de Khass',      x: 0.78, y: 0.70, color: '#dcb45a', accent: '#a08840', tier: 6,  ico: '🏜️',
      desc: 'Dunas infinitas. Sol implacável. Tesouros enterrados.' },
    { key: 'graveyard', name: 'Cemitério Esquecido',   x: 0.42, y: 0.80, color: '#5a4a5a', accent: '#3a2a3a', tier: 6,  ico: '💀',
      desc: 'Mortos-vivos vagam. Tumbas centenárias. Maldições antigas.' },
    { key: 'snow',      name: 'Tundra do Norte',       x: 0.50, y: 0.22, color: '#c8d4e0', accent: '#88a0b8', tier: 7,  ico: '❄️',
      desc: 'Frio extremo. Lobos de gelo. Aurora boreal eterna.' },
    { key: 'volcanic',  name: 'Vulcão Adormecido',     x: 0.78, y: 0.34, color: '#c84030', accent: '#8a2010', tier: 8,  ico: '🌋',
      desc: 'Lava sob a crosta. Cristais de fogo. Drakhul dorme aqui.' }
  ];

  // === CART_PATHS ===
  var CART_PATHS = [
    ['plains', 'forest'],
    ['plains', 'cave'],
    ['plains', 'swamp'],
    ['plains', 'graveyard'],
    ['forest', 'mountain'],
    ['forest', 'snow'],
    ['cave', 'mountain'],
    ['swamp', 'graveyard'],
    ['swamp', 'volcanic'],
    ['desert', 'volcanic'],
    ['snow', 'mountain']
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
    // 1) Halo gradient suave (fade) — 2026-05-04 v3: alpha 0.05-0.09 (mt sutil)
    var halo = ctx.createRadialGradient(cx, cy, size * 0.3, cx, cy, size * 1.3);
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
    var ring = ctx.createRadialGradient(cx, cy, ringInner, cx, cy, ringOuter);
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

  // === _drawParchmentBase ===
  function _drawParchmentBase(ctx, w, h){
    // 1. Base flat sepia (sem gradient)
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

  // === _drawBiomeArt ===
  function _drawBiomeArt(ctx, b, w, h){
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

    if (b.key === 'plains') {
      // CASTELO DE VALDORIA — torre central alta + 2 torres laterais +
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
    } else if (b.key === 'forest') {
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
    } else if (b.key === 'cave') {
      // CAVERNA AAA — entrada arqueada GRANDE em 3/4 + estalactites
      // detalhadas + 2 cristais com sombra + rochas com textura de fratura.
      // Profundidade visível através do arco.
      // Profundidade interna (gradient escuro)
      var caveGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 18);
      caveGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
      caveGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
      ctx.save();
      ctx.fillStyle = caveGrad;
      ctx.beginPath();
      ctx.moveTo(-15, 14);
      ctx.lineTo(-15, -2);
      ctx.bezierCurveTo(-15, -14, 15, -14, 15, -2);
      ctx.lineTo(15, 14);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Arco da entrada (contorno)
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-15, 14);
      ctx.lineTo(-15, -2);
      ctx.bezierCurveTo(-15, -14, 15, -14, 15, -2);
      ctx.lineTo(15, 14);
      ctx.stroke();
      // Estalactites detalhadas (5 com tamanhos variados — alpha forte)
      var stals = [[-9, 0.85], [-5, 0.6], [-1, 0.95], [4, 0.7], [9, 0.85]];
      stals.forEach(function(st){
        var stx = st[0], stsc = st[1];
        ctx.fillStyle = INK_DARK;
        ctx.beginPath();
        ctx.moveTo(stx - 1.5*stsc, -8);
        ctx.lineTo(stx, -2 - 2*stsc);
        ctx.lineTo(stx + 1.5*stsc, -8);
        ctx.closePath();
        ctx.fill();
        // Detail line
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(stx - 0.5*stsc, -7); ctx.lineTo(stx + 0.5*stsc, -3.5*stsc);
        ctx.stroke();
      });
      ctx.lineWidth = 0.9;
      // Estalagmites no chão (3 menores)
      [[-7, 0.7], [3, 0.9], [9, 0.7]].forEach(function(sm){
        var smx = sm[0], smsc = sm[1];
        ctx.fillStyle = INK_DARK;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(smx - 1.5*smsc, 14);
        ctx.lineTo(smx, 14 - 5*smsc);
        ctx.lineTo(smx + 1.5*smsc, 14);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      // 2 CRISTAIS BRILHANTES nas rochas laterais (prismas hexagonais)
      [[-22, 8], [22, 6]].forEach(function(cr){
        var crx = cr[0], cry = cr[1];
        // Glow azulado sutil
        ctx.fillStyle = '#88a8c8';
        ctx.globalAlpha = 0.30;
        ctx.beginPath();
        ctx.arc(crx, cry, 6, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Prisma (3 facetas — frontal + 2 laterais)
        ctx.lineWidth = 0.7;
        ctx.fillStyle = PAPER_BG;
        ctx.beginPath();
        ctx.moveTo(crx, cry - 4);
        ctx.lineTo(crx - 2, cry - 1);
        ctx.lineTo(crx - 1.5, cry + 3);
        ctx.lineTo(crx + 1.5, cry + 3);
        ctx.lineTo(crx + 2, cry - 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Linha vertical mestre
        ctx.beginPath();
        ctx.moveTo(crx, cry - 4); ctx.lineTo(crx, cry + 3);
        ctx.stroke();
        // Reflexo highlight
        ctx.fillStyle = PAPER_BG;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(crx, cry - 4);
        ctx.lineTo(crx - 0.6, cry - 1);
        ctx.lineTo(crx, cry + 0);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      ctx.lineWidth = 0.9;
      // Rochas ao redor com TEXTURA de fratura (5 rochas, formas irregulares)
      var rocks2 = [[-25, 18, 5], [25, 18, 6], [-26, 0, 4], [26, -2, 4]];
      rocks2.forEach(function(rk){
        ctx.lineWidth = 0.7;
        // Forma irregular (poligonal — não elipse)
        ctx.fillStyle = PAPER_BG;
        ctx.beginPath();
        ctx.moveTo(rk[0] - rk[2], rk[1] + rk[2]*0.3);
        ctx.lineTo(rk[0] - rk[2]*0.6, rk[1] - rk[2]*0.6);
        ctx.lineTo(rk[0] + rk[2]*0.4, rk[1] - rk[2]*0.7);
        ctx.lineTo(rk[0] + rk[2], rk[1] - rk[2]*0.1);
        ctx.lineTo(rk[0] + rk[2]*0.7, rk[1] + rk[2]*0.6);
        ctx.lineTo(rk[0] - rk[2]*0.4, rk[1] + rk[2]*0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Linhas de fratura (2-3 internas)
        ctx.lineWidth = 0.35;
        ctx.beginPath();
        ctx.moveTo(rk[0] - rk[2]*0.3, rk[1] - rk[2]*0.4);
        ctx.lineTo(rk[0] + rk[2]*0.2, rk[1] + rk[2]*0.3);
        ctx.moveTo(rk[0] + rk[2]*0.4, rk[1] - rk[2]*0.2);
        ctx.lineTo(rk[0] + rk[2]*0.6, rk[1] + rk[2]*0.3);
        ctx.stroke();
        ctx.lineWidth = 0.9;
      });
    } else if (b.key === 'swamp') {
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
    } else if (b.key === 'mountain') {
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
    } else if (b.key === 'desert') {
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
    } else if (b.key === 'graveyard') {
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
    } else if (b.key === 'snow') {
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
    } else if (b.key === 'volcanic') {
      // VULCÃO ADORMECIDO AAA — cone com VOLUME (lado claro + sombra),
      // cratera elíptica com lava preenchida, lava streams curvas
      // descendo, fumaça com volume real, cracks no chão.
      // Cone — lado claro
      ctx.fillStyle = '#a85040';
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.moveTo(-22, 18);
      ctx.lineTo(-6, -10);
      ctx.lineTo(0, -10);
      ctx.lineTo(0, 18);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-22, 18);
      ctx.lineTo(-6, -10);
      ctx.lineTo(0, -10);
      ctx.lineTo(0, 18);
      ctx.stroke();
      // Cone — lado em sombra (direito)
      ctx.fillStyle = INK_DARK;
      ctx.globalAlpha = 0.30;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(6, -10);
      ctx.lineTo(22, 18);
      ctx.lineTo(0, 18);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(6, -10);
      ctx.lineTo(22, 18);
      ctx.lineTo(0, 18);
      ctx.stroke();
      // Hatching denso no lado escuro
      ctx.lineWidth = 0.3;
      ctx.globalAlpha = 0.55;
      for (var hl = 0; hl < 6; hl++) {
        var t3 = 0.15 + hl*0.14;
        ctx.beginPath();
        ctx.moveTo(0 + 1, -10 + t3*4);
        ctx.lineTo(20 - hl*1.5, 18 - hl*0.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.9;
      // Cratera elíptica com LAVA preenchida (vermelho real)
      ctx.fillStyle = '#c84030';
      ctx.beginPath();
      ctx.ellipse(0, -10, 6, 1.8, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.ellipse(0, -10, 6, 1.8, 0, 0, Math.PI*2);
      ctx.stroke();
      // Glow lava (radial)
      var lavaGrad = ctx.createRadialGradient(0, -10, 1, 0, -10, 8);
      lavaGrad.addColorStop(0, 'rgba(255,160,80,0.7)');
      lavaGrad.addColorStop(1, 'rgba(255,160,80,0)');
      ctx.fillStyle = lavaGrad;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(0, -10, 8, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Lava streams DESCENDO (3 curvas com spread no final)
      ctx.strokeStyle = '#c84030';
      ctx.lineWidth = 1.3;
      [-1, 0, 1].forEach(function(li){
        var lx = li * 4;
        ctx.beginPath();
        ctx.moveTo(lx, -8);
        ctx.bezierCurveTo(lx + 1, -2, lx - 1, 4, lx + 2, 16);
        ctx.stroke();
        // Spread no final
        ctx.beginPath();
        ctx.arc(lx + 2, 16, 1.5, 0, Math.PI*2);
        ctx.fillStyle = '#c84030';
        ctx.fill();
      });
      ctx.strokeStyle = INK_DARK;
      ctx.lineWidth = 0.9;
      // Fumaça com VOLUME (3 plumes orgânicas grandes)
      ctx.lineWidth = 0.6;
      ctx.fillStyle = INK_LIGHT;
      ctx.globalAlpha = 0.35;
      [[-3, -16], [0, -19], [3, -17]].forEach(function(sm, smi){
        var smx = sm[0], smy = sm[1];
        // Plume orgânica (ovais sobrepostas)
        ctx.beginPath();
        ctx.arc(smx, smy, 3 + smi * 0.5, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(smx + 1, smy - 3, 2.5 + smi * 0.5, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(smx - 1, smy - 5 - smi, 2 + smi * 0.4, 0, Math.PI*2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      // Contorno da fumaça (linha externa)
      ctx.strokeStyle = INK_LIGHT;
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(-5, -14);
      ctx.bezierCurveTo(-7, -18, -3, -22, 0, -25);
      ctx.bezierCurveTo(3, -22, 7, -18, 5, -14);
      ctx.stroke();
      ctx.strokeStyle = INK_DARK;
      ctx.lineWidth = 0.9;
      // Cracks/rachaduras no chão ao redor
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-22, 19); ctx.lineTo(-25, 22); ctx.lineTo(-23, 25);
      ctx.moveTo(22, 19); ctx.lineTo(25, 22); ctx.lineTo(23, 25);
      ctx.moveTo(-15, 22); ctx.lineTo(-12, 25);
      ctx.moveTo(15, 22); ctx.lineTo(12, 25);
      ctx.stroke();
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
    // Linha pontilhada principal
    ctx.save();
    ctx.strokeStyle = INK_MED;
    ctx.lineWidth = 1.0;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(cx, cy, bx, by);
    ctx.stroke();
    ctx.setLineDash([]);
    // Marcos (4 pontinhos pequenos ao longo da curva)
    ctx.fillStyle = INK_DARK;
    for (var t = 0.2; t < 1; t += 0.2) {
      var u = 1 - t;
      var px = u*u*ax + 2*u*t*cx + t*t*bx;
      var py = u*u*ay + 2*u*t*cy + t*t*by;
      ctx.beginPath();
      ctx.arc(px, py, 1, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
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
    // Pin location (círculo preto pequeno = "X marks the spot")
    ctx.fillStyle = INK_DARK;
    ctx.beginPath();
    ctx.arc(bx, by, 2.5, 0, Math.PI*2);
    ctx.fill();
    // Anel externo (mostra área clicável + hover state)
    ctx.strokeStyle = isHover ? INK_DARK : (isOrigin ? INK_MED : INK_LIGHT);
    ctx.lineWidth = isHover ? 1.6 : (isOrigin ? 1.0 : 0.7);
    ctx.beginPath();
    ctx.arc(bx, by, 18, 0, Math.PI*2);
    ctx.stroke();
    // Se origin, anel duplo
    if (isOrigin) {
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(bx, by, 22, 0, Math.PI*2);
      ctx.stroke();
    }
    // Hover: ring extra
    if (isHover) {
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(bx, by, 24, 0, Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Label do bioma (nome completo em Cinzel)
    // Background de papel atrás (esconde linhas do mapa)
    var labelText = b.name;
    ctx.font = (isHover ? 'bold 11px' : '10px') + ' serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var tw = ctx.measureText(labelText).width;
    // Backplate (retângulo papel)
    ctx.fillStyle = PAPER_BG;
    ctx.globalAlpha = 0.92;
    ctx.fillRect(bx - tw/2 - 3, by + 22, tw + 6, 13);
    ctx.globalAlpha = 1;
    // Borda fina do label
    ctx.strokeStyle = INK_LIGHT;
    ctx.lineWidth = 0.4;
    ctx.strokeRect(bx - tw/2 - 3, by + 22, tw + 6, 13);
    // Texto do label
    ctx.fillStyle = INK_DARK;
    ctx.fillText(labelText, bx, by + 24);
    // Tier badge embaixo (T1, T2, etc)
    if (b.tier) {
      ctx.font = 'italic 8px serif';
      ctx.fillStyle = INK_MED;
      ctx.fillText('Tier ' + b.tier, bx, by + 37);
    }
    ctx.restore();
  }

  // === _drawPlayerPin ===
  function _drawPlayerPin(ctx, b, w, h){
    // === Pin do jogador hand-drawn (Fase 6.5) ================================
    // Pencil-style: X marks the spot acima do node + flecha apontando + label
    // backplate papel. SEM emoji, SEM gold dashed, SEM cor vermelha forte.
    var bx = b.x * w, by = b.y * h;
    ctx.save();
    ctx.strokeStyle = INK_DARK;
    ctx.lineWidth = 1.4;
    // X marks the spot (cruz X) acima do node
    var px = bx, py = by - 36;
    ctx.beginPath();
    ctx.moveTo(px - 5, py - 5); ctx.lineTo(px + 5, py + 5);
    ctx.moveTo(px - 5, py + 5); ctx.lineTo(px + 5, py - 5);
    ctx.stroke();
    // Círculo ao redor do X
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI*2);
    ctx.stroke();
    // Linha conectando X ao node (flecha pontilhada)
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(px, py + 7);
    ctx.lineTo(bx, by - 5);
    ctx.stroke();
    ctx.setLineDash([]);
    // Label "VÓS ESTAIS AQUI" abaixo do node (Cinzel italic bold)
    ctx.font = 'bold italic 9px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var labelText = 'Você está aqui';
    var tw = ctx.measureText(labelText).width;
    // Backplate papel pra contraste
    ctx.fillStyle = PAPER_BG;
    ctx.globalAlpha = 0.95;
    ctx.fillRect(bx - tw/2 - 4, by + 50, tw + 8, 13);
    ctx.globalAlpha = 1;
    // Borda do label
    ctx.strokeStyle = INK_DARK;
    ctx.lineWidth = 0.6;
    ctx.strokeRect(bx - tw/2 - 4, by + 50, tw + 8, 13);
    // Texto
    ctx.fillStyle = INK_DARK;
    ctx.fillText(labelText, bx, by + 52);
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
    // 5) Paper grain (textura de fibras)
    for (var gi = 0; gi < 380; gi++) {
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

  // === Export to global namespace ===
  window.CartShared = {
    INK_DARK: INK_DARK, INK_MED: INK_MED, INK_LIGHT: INK_LIGHT,
    INK_FAINT: INK_FAINT, PAPER_BG: PAPER_BG, PAPER_DARK: PAPER_DARK,
    SEA_INK: SEA_INK, SEA_FAINT: SEA_FAINT,
    CART_BIOMES: CART_BIOMES, CART_PATHS: CART_PATHS,
    _cartSeedRand: _cartSeedRand,
    _hatchArea: _hatchArea, _wavyLine: _wavyLine,
    _drawParchmentBase: _drawParchmentBase,
    _drawAgedParchment: _drawAgedParchment,        // 2026-05-04: estilo #4 AAA
    _drawOrganicBlob: _drawOrganicBlob,            // helper exposto
    _drawAgedStain: _drawAgedStain,                // helper exposto
    _drawCrease: _drawCrease,                      // helper exposto
    _drawScorchedEdge: _drawScorchedEdge,          // helper exposto
    _drawBiomeArt: _drawBiomeArt,
    _drawCartPath: _drawCartPath,
    _drawCartNode: _drawCartNode,
    _drawPlayerPin: _drawPlayerPin,
    _drawCartCompass: _drawCartCompass
  };
})();