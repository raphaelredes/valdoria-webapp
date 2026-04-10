/* hub-biome-art.js — Renders static travel scene frames into region card canvases */
/* Reuses TRAVEL_CONFIG, _generateFeatures, _drawSilhouette, _drawTerrainLayer from explore-travel.js */

(function() {
'use strict';

/* Detect perf tier to skip expensive gradients on lite devices */
var _hbaDetail = (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('perf-lite')) ? 0 : 1;

/* Render a static frame of the travel scene into a card canvas */
function renderCardScene(canvas, biome) {
  if (!canvas || !canvas.getContext) return;
  if (typeof TRAVEL_CONFIG === 'undefined' || typeof _generateFeatures === 'undefined') {
    console.warn('[HUB] explore-travel.js not loaded, skipping card art');
    return;
  }

  var cfg = TRAVEL_CONFIG[biome] || TRAVEL_CONFIG.forest;
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var w = canvas.clientWidth;
  var h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  /* Sky gradient */
  if (_hbaDetail >= 1) {
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, cfg.bg[0]);
    grad.addColorStop(0.45, cfg.bg[1]);
    grad.addColorStop(0.7, cfg.ground);
    grad.addColorStop(1, cfg.ground);
    ctx.fillStyle = grad;
  } else {
    /* lite: flat sky color (use mid bg as approximation) */
    ctx.fillStyle = cfg.bg[1];
  }
  ctx.fillRect(0, 0, w, h);

  /* Horizon glow (skipped on lite) */
  if (cfg.horizonGlow && _hbaDetail >= 1) {
    var cy = h * 0.48;
    var glow = ctx.createRadialGradient(w * 0.5, cy, 0, w * 0.5, cy, w * 0.8);
    glow.addColorStop(0, 'rgba(' + cfg.horizonGlow + ',0.08)');
    glow.addColorStop(0.5, 'rgba(' + cfg.horizonGlow + ',0.03)');
    glow.addColorStop(1, 'rgba(' + cfg.horizonGlow + ',0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, cy - h * 0.3, w, h * 0.6);
  }

  /* Far terrain layer */
  var farFeatures = _generateFeatures(cfg.silhouette, w, 6);
  _drawTerrainLayer(ctx, farFeatures, w, h, 0.42, cfg.farColor, 0, cfg.silhouette);

  /* Mid terrain layer */
  var midFeatures = _generateFeatures(cfg.silhouette, w, 5);
  _drawTerrainLayer(ctx, midFeatures, w, h, 0.58, cfg.midColor, w * 0.3, cfg.silhouette);

  /* Ground fill */
  var groundY = h * 0.72;
  ctx.fillStyle = cfg.ground;
  ctx.fillRect(0, groundY, w, h - groundY);

  /* Ground line */
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(w, groundY);
  ctx.stroke();

  /* Subtle vignette (skipped on lite) */
  if (_hbaDetail >= 1) {
    var cx = w / 2, cyV = h / 2;
    var outerR = Math.sqrt(cx * cx + cyV * cyV);
    var vig = ctx.createRadialGradient(cx, cyV, outerR * 0.4, cx, cyV, outerR);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(0.7, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }
}

/* Init all card canvases */
function initCards() {
  var cards = document.querySelectorAll('.region-art-canvas');
  for (var i = 0; i < cards.length; i++) {
    var cvs = cards[i];
    var biome = cvs.getAttribute('data-biome');
    if (biome) renderCardScene(cvs, biome);
  }
}

window.HubBiomeArt = {
  renderCard: renderCardScene,
  initCards: initCards
};

})();
