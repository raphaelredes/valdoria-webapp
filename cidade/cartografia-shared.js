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
    // 1) Halo gradient suave (fade)
    var halo = ctx.createRadialGradient(cx, cy, size * 0.3, cx, cy, size * 1.6);
    halo.addColorStop(0, baseColor);
    halo.addColorStop(0.6, baseColor);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.fillStyle = halo;
    ctx.globalAlpha = 0.15 + rng() * 0.08;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 2) Blob orgânico (corpo)
    _drawOrganicBlob(ctx, cx, cy, size * 0.85, baseColor, 0.20 + rng() * 0.10, seed);
    // 3) Coffee-ring: borda mais escura (anel de capilaridade)
    var ringInner = size * 0.7, ringOuter = size * 0.92;
    var ring = ctx.createRadialGradient(cx, cy, ringInner, cx, cy, ringOuter);
    ring.addColorStop(0, 'rgba(0,0,0,0)');
    ring.addColorStop(0.5, edgeColor);
    ring.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.fillStyle = ring;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(cx, cy, ringOuter, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 4) Salpicos pequenos
    var nSplats = 3 + Math.floor(rng() * 4);
    for (var s = 0; s < nSplats; s++) {
      var ang = rng() * Math.PI * 2;
      var dist = size * (1.0 + rng() * 0.6);
      var sx = cx + Math.cos(ang) * dist;
      var sy = cy + Math.sin(ang) * dist;
      var ssz = 1 + rng() * (size * 0.08);
      _drawOrganicBlob(ctx, sx, sy, ssz, baseColor, 0.18 + rng() * 0.15, seed + s * 7);
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

    if (b.key === 'plains') {
      // Pictograma: 3 colinas onduladas + tufos de grama (pequenos n)
      // Colinas (3 arcos baixos)
      ctx.beginPath();
      for (i = 0; i < 3; i++) {
        x = (i - 1) * 18;
        y = 8;
        ctx.moveTo(x - 12, y);
        ctx.quadraticCurveTo(x, y - 6, x + 12, y);
      }
      ctx.stroke();
      // Tufos de grama — letrinha "u" estilizada
      for (i = 0; i < 8; i++) {
        x = (rng() - 0.5) * r * 1.6;
        y = (rng() - 0.5) * r * 1.4;
        ctx.beginPath();
        ctx.moveTo(x - 1.5, y); ctx.lineTo(x - 1.5, y - 2);
        ctx.moveTo(x + 1.5, y); ctx.lineTo(x + 1.5, y - 2);
        ctx.quadraticCurveTo(x, y, x - 1.5, y);
        ctx.stroke();
      }
      // Pontos esparsos (terra)
      for (i = 0; i < 14; i++) {
        x = (rng() - 0.5) * r * 1.6;
        y = (rng() - 0.5) * r * 1.4;
        ctx.beginPath();
        ctx.arc(x, y, 0.5, 0, Math.PI*2);
        ctx.fill();
      }
    } else if (b.key === 'forest') {
      // Pictograma: cluster de 8 pinheiros estilizados (^^^ stack)
      // Cada árvore = tronco curto + 2-3 carets verticais (estilo pinha)
      var trees = [
        [-22, 8, 1.0], [-10, 12, 0.85], [4, 10, 1.0], [18, 14, 0.9],
        [-18, -6, 0.8], [-4, -2, 1.0], [12, -4, 0.85], [22, 0, 0.9]
      ];
      trees.forEach(function(t){
        var tx = t[0] + (rng()-0.5)*2;
        var ty = t[1] + (rng()-0.5)*2;
        var sc = t[2];
        // Tronco curto
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx, ty + 2*sc);
        ctx.stroke();
        // 3 níveis de "pinha" (^ empilhados)
        for (var lv = 0; lv < 3; lv++) {
          var ly = ty - lv*5*sc;
          var lw = (5 - lv*1.2) * sc;
          ctx.beginPath();
          ctx.moveTo(tx - lw, ly);
          ctx.lineTo(tx, ly - 4*sc);
          ctx.lineTo(tx + lw, ly);
          ctx.stroke();
        }
      });
    } else if (b.key === 'cave') {
      // Pictograma: arco da entrada + estalactites + rochas ao lado
      // Arco da caverna (semi-círculo na ponta)
      ctx.beginPath();
      ctx.moveTo(-14, 14);
      ctx.lineTo(-14, 0);
      ctx.bezierCurveTo(-14, -12, 14, -12, 14, 0);
      ctx.lineTo(14, 14);
      ctx.stroke();
      // Estalactites internas (3 triângulos pequenos do topo)
      for (i = 0; i < 4; i++) {
        x = -8 + i * 5;
        ctx.beginPath();
        ctx.moveTo(x - 1.5, -6);
        ctx.lineTo(x, -2);
        ctx.lineTo(x + 1.5, -6);
        ctx.stroke();
      }
      // Hatching dentro do arco (escuridão)
      _hatchArea(ctx, -13, -6, 26, 18, Math.PI/4, 3, INK_DARK, 0.4);
      // Rochas ao lado da entrada (ovais com hatch)
      var rocks = [[-22, 18, 6], [22, 16, 5], [-26, -2, 4], [24, -8, 5]];
      rocks.forEach(function(rk){
        ctx.beginPath();
        ctx.ellipse(rk[0], rk[1], rk[2], rk[2]*0.7, 0, 0, Math.PI*2);
        ctx.stroke();
        // Hatching diagonal
        ctx.beginPath();
        ctx.moveTo(rk[0] - rk[2]*0.4, rk[1]);
        ctx.lineTo(rk[0] + rk[2]*0.4, rk[1] - rk[2]*0.3);
        ctx.stroke();
      });
    } else if (b.key === 'swamp') {
      // Pictograma: 4 poças (elipses outline) + árvore morta + juncos
      // Poças (elipses outline com hatching wave dentro)
      var pools = [[-15, -4, 9], [10, 2, 11], [-8, 14, 8], [18, 16, 7]];
      pools.forEach(function(po){
        ctx.beginPath();
        ctx.ellipse(po[0], po[1], po[2], po[2]*0.45, 0, 0, Math.PI*2);
        ctx.stroke();
        // 2 linhas wave dentro (água)
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(po[0]-po[2]*0.6, po[1]);
        ctx.quadraticCurveTo(po[0], po[1]+1, po[0]+po[2]*0.6, po[1]);
        ctx.stroke();
        ctx.lineWidth = 0.9;
      });
      // Árvore morta (linha vertical com galhos)
      ctx.beginPath();
      ctx.moveTo(-22, 12); ctx.lineTo(-22, -10);
      ctx.moveTo(-22, -2); ctx.lineTo(-28, -8);
      ctx.moveTo(-22, -5); ctx.lineTo(-16, -10);
      ctx.moveTo(-22, -8); ctx.lineTo(-26, -13);
      ctx.stroke();
      // Juncos (pequenos | espalhados)
      for (i = 0; i < 12; i++) {
        var jx = (rng() - 0.5) * r * 1.5;
        var jy = (rng() - 0.5) * r * 1.4;
        ctx.beginPath();
        ctx.moveTo(jx, jy); ctx.lineTo(jx, jy - 3 - rng()*3);
        ctx.stroke();
      }
    } else if (b.key === 'mountain') {
      // Pictograma: 5 picos (^) com hatching diagonal pra sombra + linha snowcap
      var peakXs = [-22, -10, 0, 12, 22];
      var peakHts = [16, 22, 14, 20, 12];
      for (i = 0; i < 5; i++) {
        var mx = peakXs[i];
        var mh = peakHts[i];
        var my = 14;
        // Triângulo outline
        ctx.beginPath();
        ctx.moveTo(mx - mh*0.6, my);
        ctx.lineTo(mx, my - mh);
        ctx.lineTo(mx + mh*0.6, my);
        ctx.stroke();
        // Snowcap (linha zigzag perto do topo)
        ctx.beginPath();
        ctx.moveTo(mx - mh*0.22, my - mh*0.55);
        ctx.lineTo(mx - mh*0.10, my - mh*0.50);
        ctx.lineTo(mx, my - mh*0.65);
        ctx.lineTo(mx + mh*0.10, my - mh*0.50);
        ctx.lineTo(mx + mh*0.22, my - mh*0.55);
        ctx.stroke();
        // Hatching diagonal no lado direito (sombra)
        ctx.lineWidth = 0.4;
        for (var hh = 0; hh < 3; hh++) {
          var t = 0.3 + hh*0.18;
          ctx.beginPath();
          ctx.moveTo(mx + mh*0.05, my - mh*(1-t));
          ctx.lineTo(mx + mh*0.50, my - mh*0.05);
          ctx.stroke();
        }
        ctx.lineWidth = 0.9;
      }
    } else if (b.key === 'desert') {
      // Pictograma: pirâmide outline + dunas (curvas) + sol (raios) + cactus
      // Pirâmide grande (triângulo outline + linha do meio = aresta)
      ctx.beginPath();
      ctx.moveTo(-12, 18);
      ctx.lineTo(-2, 0);
      ctx.lineTo(14, 18);
      ctx.lineTo(-12, 18);
      ctx.stroke();
      // Aresta da pirâmide
      ctx.beginPath();
      ctx.moveTo(-2, 0); ctx.lineTo(0, 18);
      ctx.stroke();
      // Hatching no lado direito (sombra)
      ctx.lineWidth = 0.4;
      for (i = 0; i < 4; i++) {
        var t = 0.2 + i*0.18;
        ctx.beginPath();
        ctx.moveTo(0 + i*0.5, 18*t);
        ctx.lineTo(14 - i*1.2, 18 - i*0.5);
        ctx.stroke();
      }
      ctx.lineWidth = 0.9;
      // Pirâmide menor à direita
      ctx.beginPath();
      ctx.moveTo(8, 18); ctx.lineTo(15, 8); ctx.lineTo(22, 18);
      ctx.stroke();
      // Dunas (3 curvas onduladas atrás)
      ctx.lineWidth = 0.7;
      for (i = 0; i < 3; i++) {
        var dy = -16 + i*4;
        ctx.beginPath();
        ctx.moveTo(-r, dy);
        ctx.quadraticCurveTo(-15, dy-4, 0, dy);
        ctx.quadraticCurveTo(15, dy+4, r*0.8, dy-2);
        ctx.stroke();
      }
      ctx.lineWidth = 0.9;
      // Sol (círculo + raios)
      ctx.beginPath();
      ctx.arc(20, -20, 5, 0, Math.PI*2);
      ctx.stroke();
      for (i = 0; i < 8; i++) {
        var ang = i * Math.PI/4;
        ctx.beginPath();
        ctx.moveTo(20 + Math.cos(ang)*7, -20 + Math.sin(ang)*7);
        ctx.lineTo(20 + Math.cos(ang)*10, -20 + Math.sin(ang)*10);
        ctx.stroke();
      }
      // Cactus (haste vertical + 1 braço)
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-25, 20); ctx.lineTo(-25, 8);
      ctx.moveTo(-25, 13); ctx.lineTo(-29, 13); ctx.lineTo(-29, 9);
      ctx.stroke();
      ctx.lineWidth = 0.9;
    } else if (b.key === 'graveyard') {
      // Pictograma: cerca + 6 lápides outline (cruz/arco/rect) + árvore seca
      // Linha do chão
      ctx.beginPath();
      ctx.moveTo(-r*1.1, 18); ctx.lineTo(r*1.1, 18);
      ctx.stroke();
      // Lápides
      var gStyles = ['cross', 'arch', 'rect', 'cross', 'arch', 'rect'];
      for (i = 0; i < 6; i++) {
        var gx = -20 + i * 8;
        var gy = 4;
        var gh = 10;
        var style = gStyles[i];
        if (style === 'cross') {
          ctx.beginPath();
          ctx.moveTo(gx, gy + gh); ctx.lineTo(gx, gy - 4);
          ctx.moveTo(gx - 2.5, gy - 1); ctx.lineTo(gx + 2.5, gy - 1);
          ctx.stroke();
        } else if (style === 'arch') {
          ctx.beginPath();
          ctx.moveTo(gx - 2, gy + gh); ctx.lineTo(gx - 2, gy - 2);
          ctx.bezierCurveTo(gx - 2, gy - 6, gx + 2, gy - 6, gx + 2, gy - 2);
          ctx.lineTo(gx + 2, gy + gh);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.rect(gx - 2, gy - 4, 4, gh + 4);
          ctx.stroke();
        }
      }
      // Árvore seca (canto direito)
      ctx.beginPath();
      ctx.moveTo(22, 18); ctx.lineTo(22, -2);
      ctx.moveTo(22, 4); ctx.lineTo(28, -3);
      ctx.moveTo(22, 0); ctx.lineTo(16, -6);
      ctx.moveTo(22, -2); ctx.lineTo(25, -8);
      ctx.stroke();
      // Caveira pequena no canto esquerdo (pictograma simples)
      ctx.beginPath();
      ctx.arc(-26, 8, 3, 0, Math.PI*2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-27, 8, 0.6, 0, Math.PI*2);
      ctx.arc(-25, 8, 0.6, 0, Math.PI*2);
      ctx.fill();
    } else if (b.key === 'snow') {
      // Pictograma: 5 picos com snowcap + flocos (asteriscos) espalhados
      var icePeakXs = [-22, -10, 2, 14, 24];
      var icePeakHts = [14, 20, 12, 16, 10];
      for (i = 0; i < icePeakXs.length; i++) {
        var ix = icePeakXs[i];
        var ih = icePeakHts[i];
        var iy = 16;
        ctx.beginPath();
        ctx.moveTo(ix - ih*0.5, iy);
        ctx.lineTo(ix, iy - ih);
        ctx.lineTo(ix + ih*0.5, iy);
        ctx.stroke();
        // Snowcap (zigzag perto do topo)
        ctx.beginPath();
        ctx.moveTo(ix - ih*0.18, iy - ih*0.55);
        ctx.lineTo(ix, iy - ih*0.7);
        ctx.lineTo(ix + ih*0.18, iy - ih*0.55);
        ctx.stroke();
      }
      // Flocos de neve (asteriscos *)
      ctx.lineWidth = 0.7;
      for (i = 0; i < 8; i++) {
        x = (rng() - 0.5) * r * 1.5;
        y = -r * 0.6 + rng() * r * 0.5;
        sz = 1.6 + rng() * 1.3;
        ctx.beginPath();
        ctx.moveTo(x - sz, y); ctx.lineTo(x + sz, y);
        ctx.moveTo(x, y - sz); ctx.lineTo(x, y + sz);
        ctx.moveTo(x - sz*0.7, y - sz*0.7); ctx.lineTo(x + sz*0.7, y + sz*0.7);
        ctx.moveTo(x - sz*0.7, y + sz*0.7); ctx.lineTo(x + sz*0.7, y - sz*0.7);
        ctx.stroke();
      }
      ctx.lineWidth = 0.9;
    } else if (b.key === 'volcanic') {
      // Pictograma: cone do vulcão outline + cratera + fumaça (espirais) +
      // lava streams (linhas wavy descendo)
      // Cone outline
      ctx.beginPath();
      ctx.moveTo(-22, 18);
      ctx.lineTo(-6, -10);
      ctx.lineTo(6, -10);
      ctx.lineTo(22, 18);
      ctx.stroke();
      // Cratera (linha curva no topo)
      ctx.beginPath();
      ctx.moveTo(-6, -10);
      ctx.quadraticCurveTo(0, -7, 6, -10);
      ctx.stroke();
      // Lava streams (3 linhas wavy do topo até a base)
      ctx.lineWidth = 1.1;
      for (i = 0; i < 3; i++) {
        var lx = (i - 1) * 4;
        ctx.beginPath();
        ctx.moveTo(lx, -8);
        ctx.bezierCurveTo(lx + 1, -2, lx - 1, 4, lx + 2, 16);
        ctx.stroke();
      }
      ctx.lineWidth = 0.9;
      // Hatching no lado direito do cone (sombra)
      ctx.lineWidth = 0.4;
      for (i = 0; i < 4; i++) {
        var t = 0.2 + i*0.2;
        ctx.beginPath();
        ctx.moveTo(0, -10 + t*2);
        ctx.lineTo(20 - i*1.5, 18 - i);
        ctx.stroke();
      }
      ctx.lineWidth = 0.9;
      // Fumaça (3 espirais saindo do topo)
      ctx.lineWidth = 0.7;
      for (i = 0; i < 3; i++) {
        var sx = (i - 1) * 6;
        var sy = -14 - i*4;
        ctx.beginPath();
        ctx.moveTo(sx, -10);
        ctx.quadraticCurveTo(sx - 4, sy + 4, sx, sy);
        ctx.quadraticCurveTo(sx + 4, sy - 2, sx, sy - 4);
        ctx.stroke();
      }
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
    // 2) Variação tonal sutil — 6 lavagens grandes orgânicas
    for (var i = 0; i < 6; i++) {
      var bx = rng() * w, by = rng() * h;
      _drawOrganicBlob(ctx, bx, by, 40 + rng() * 60, '#b08050', 0.10 + rng() * 0.08, 200 + i * 11);
    }
    // 3) Manchas de vinho/café envelhecidas (4 grandes com coffee-ring)
    var stainColors = [
      ['#6a3818', '#3a1808'], // vinho escuro
      ['#8a5028', '#4a2818'], // café
      ['#7a4020', '#3a1810'], // vinho médio
      ['#92583a', '#502818']  // café claro
    ];
    for (var s = 0; s < 4; s++) {
      var sx = rng() * w, sy = rng() * h;
      var ssz = 18 + rng() * 28;
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