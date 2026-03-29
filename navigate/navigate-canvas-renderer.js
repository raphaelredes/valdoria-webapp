// ═══════════════════════════════════════════════════════
// NAVIGATE CANVAS RENDERER — Canvas 2D overlay engine
// Replaces SVG overlay for roads, markers, particles, etc.
// ═══════════════════════════════════════════════════════

// ── Canvas Color Constants (match valdoria-design.css tokens) ──
var CV_GOLD = '#c4953a';
var CV_GOLD_30 = 'rgba(196,149,58,0.3)';
var CV_BANNER_RED = '#7b2020';
var CV_TEXT = '#d4c8b0';
var CV_DANGER_HIGH = '#cc4040';
var CV_DANGER_MED = '#cc6633';
var CV_DANGER_LOW = '#4a8a4a';
var CV_BIOME_VOLCANIC = '#d46030';
var CV_BIOME_SNOW = '#c8d8e8';
var CV_BIOME_FOREST = '#6aaa4a';
var CV_BIOME_SWAMP = '#5a7a4a';
var CV_BIOME_DESERT = '#c4a060';
var CV_BIOME_GRAVEYARD = '#7a6a7a';
var CV_BIOME_CAVE = '#5a6a8a';
var CV_BIOME_MOUNTAIN = '#8a8a9a';

// ── Canvas elements ──
var _mapCanvas = null, _mapCtx = null;
var _staticCanvas = null, _staticCtx = null;  // offscreen for static layers
var _animFrame = null, _lastFrameTime = 0;
var _cvInited = false;

// ── Dirty flags ──
var _dirtyStatic = true;

// ── Performance tier ──
var _cvDetail = 2;  // 0=lite, 1=medium, 2=full

// ── Animation state ──
var _antMarchOffset = 0;
var _bannerSwayTime = 0;
var _shimmerPhase = 0;
var _selPulsePhase = 0;

// ── Fog state cache ref ──
var _cvFogState = null;

// ── Active road segments (for ant march animation) ──
var _activeRoadSegs = [];

// ── Previous fog state for reveal animations ──
var _cvPrevFogState = null;
var _cvRevealAlpha = {};  // locId -> alpha (0→1 fade-in)

// ── Font ──
var _cvFontFamily = "'Cinzel', serif";

// ═══════════════════════════════════════════════════════
// DRAWING HELPERS
// ═══════════════════════════════════════════════════════

function _cvCircle(ctx, cx, cy, r, fill, fOp, stroke, sW, sOp) {
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0.1, r), 0, Math.PI * 2);
    if (fill && fill !== 'none' && fill !== 'transparent') {
        ctx.globalAlpha = fOp != null ? fOp : 1;
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke && stroke !== 'none') {
        ctx.globalAlpha = sOp != null ? sOp : 1;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = sW || 1;
        ctx.stroke();
    }
}

function _cvLine(ctx, x1, y1, x2, y2, color, w, op) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.globalAlpha = op != null ? op : 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = w || 1;
    ctx.stroke();
}

function _cvRect(ctx, x, y, w, h, fill, fOp, stroke, sW, sOp) {
    if (fill && fill !== 'none') {
        ctx.globalAlpha = fOp != null ? fOp : 1;
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, w, h);
    }
    if (stroke && stroke !== 'none') {
        ctx.globalAlpha = sOp != null ? sOp : 1;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = sW || 1;
        ctx.strokeRect(x, y, w, h);
    }
}

function _cvEllipse(ctx, cx, cy, rx, ry, fill, fOp, stroke, sW, sOp) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
    if (fill && fill !== 'none') {
        ctx.globalAlpha = fOp != null ? fOp : 1;
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke && stroke !== 'none') {
        ctx.globalAlpha = sOp != null ? sOp : 1;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = sW || 1;
        ctx.stroke();
    }
}

function _cvPolygon(ctx, points, fill, fOp, stroke, sW, sOp) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (var i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    if (fill && fill !== 'none') {
        ctx.globalAlpha = fOp != null ? fOp : 1;
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke && stroke !== 'none') {
        ctx.globalAlpha = sOp != null ? sOp : 1;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = sW || 1;
        ctx.stroke();
    }
}

function _cvText(ctx, text, x, y, font, color, op, align) {
    ctx.globalAlpha = op != null ? op : 1;
    ctx.font = font || ('9px ' + _cvFontFamily);
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color || INK;
    ctx.fillText(text, x, y);
}

// ═══════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════

function initCanvasRenderer() {
    _mapCanvas = document.getElementById('map-canvas');
    if (!_mapCanvas) return;
    _mapCtx = _mapCanvas.getContext('2d');

    // Performance tier
    var tier = window._valdoriaPerformanceTier || 'full';
    _cvDetail = tier === 'lite' ? 0 : tier === 'medium' ? 1 : 2;

    // Offscreen canvas for static layers
    _staticCanvas = document.createElement('canvas');
    _staticCanvas.width = SVG_W || 733;
    _staticCanvas.height = SVG_H || 720;
    _staticCtx = _staticCanvas.getContext('2d');

    // Initial render
    _cvFogState = computeFogState(true);
    _dirtyStatic = true;
    _cvInitParticles();
    _cvInited = true;

    // Start render loop
    _lastFrameTime = performance.now();
    _cvRenderFrame(performance.now());
}

// ═══════════════════════════════════════════════════════
// RENDER LOOP
// ═══════════════════════════════════════════════════════

function _cvRenderFrame(now) {
    var dt = (now - _lastFrameTime) / 1000;
    _lastFrameTime = now;
    if (dt > 0.1) dt = 0.1;  // cap

    var ctx = _mapCtx;
    if (!ctx) { _animFrame = requestAnimationFrame(_cvRenderFrame); return; }

    // Update animations
    _antMarchOffset = (_antMarchOffset + dt * 12) % 20;
    _bannerSwayTime = now;
    _shimmerPhase = now * 0.001;
    _selPulsePhase = now * 0.003;

    // Update particles
    if (_cvDetail >= 1) _cvUpdateParticles(dt);

    // Update reveal fade-ins
    for (var rid in _cvRevealAlpha) {
        if (_cvRevealAlpha[rid] < 1) {
            _cvRevealAlpha[rid] = Math.min(1, _cvRevealAlpha[rid] + dt * 1.5);
            _dirtyStatic = true;
        }
    }

    // Re-render static layers if dirty
    if (_dirtyStatic) {
        _cvRenderStatic();
        _dirtyStatic = false;
    }

    // Clear main canvas and composite
    var w = _mapCanvas.width, h = _mapCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // Static layers (cached)
    ctx.drawImage(_staticCanvas, 0, 0);

    // Animated layers
    ctx.save();
    if (_cvDetail >= 2) _cvDrawShimmer(ctx, now);
    if (_cvDetail >= 1) _cvDrawParticles(ctx);
    _cvDrawBanner(ctx, now);
    _cvDrawActiveRoads(ctx, now);
    _cvDrawSelection(ctx, now);
    _cvDrawDiscoveryParticles(ctx, now);
    _cvDrawDiscoveryRings(ctx, now);
    if (_cvTravelState) _cvDrawTravel(ctx, now);
    ctx.restore();

    _animFrame = requestAnimationFrame(_cvRenderFrame);
}

function _cvRenderStatic() {
    var ctx = _staticCtx;
    var w = _staticCanvas.width, h = _staticCanvas.height;
    ctx.clearRect(0, 0, w, h);

    var fogState = _cvFogState || computeFogState();

    ctx.save();
    _cvDrawRoads(ctx, fogState);
    _cvDrawBreadcrumb(ctx);
    _cvDrawDistanceRings(ctx);
    _cvDrawMarkers(ctx, fogState);
    ctx.restore();
}

// ═══════════════════════════════════════════════════════
// ROADS
// ═══════════════════════════════════════════════════════

function _cvRoadSegment(ctx, aPx, bPx, seed) {
    // Same geometry as _buildRoadPath but draws to Canvas directly
    var dx = bPx.x - aPx.x, dy = bPx.y - aPx.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    var px = -dy / len, py = dx / len;

    var pts = [];
    for (var i = 1; i <= 3; i++) {
        var t = i / 4;
        var bx = aPx.x + dx * t;
        var by = aPx.y + dy * t;
        var off = (srand(seed + i * 37) - 0.5) * Math.min(len * 0.15, 18);
        var tOff = (srand(seed + i * 53) - 0.5) * 4;
        pts.push({ x: bx + px * off + (dx/len) * tOff, y: by + py * off + (dy/len) * tOff });
    }

    // M p0 C p1,p1 p2 S p3 p4
    ctx.moveTo(aPx.x, aPx.y);
    ctx.bezierCurveTo(pts[0].x, pts[0].y, pts[0].x, pts[0].y, pts[1].x, pts[1].y);
    // S command: reflected control = 2*p2 - last_ctrl
    var rx = 2 * pts[1].x - pts[0].x, ry = 2 * pts[1].y - pts[0].y;
    ctx.bezierCurveTo(rx, ry, pts[2].x, pts[2].y, bPx.x, bPx.y);
}

function _cvDrawRoads(ctx, fogState) {
    var buckets = {
        active:   { w: 3.0, op: 0.75, dash: null },
        explored: { w: 2.4, op: 0.55, dash: null },
        partial:  { w: 1.8, op: 0.30, dash: [5, 4] },
        frontier: { w: 1.2, op: 0.10, dash: [2, 4] },
        fog:      { w: 1.0, op: 0.08, dash: [2, 4] },
    };
    var segs = { active: [], explored: [], partial: [], frontier: [], fog: [] };
    _activeRoadSegs = [];

    for (var ei = 0; ei < CONNECTION_EDGES.length; ei++) {
        var aId = CONNECTION_EDGES[ei][0], bId = CONNECTION_EDGES[ei][1];
        var af = fogState[aId], bf = fogState[bId];
        if (af === 'hidden' && bf === 'hidden') continue;
        var ac = LOCATION_COORDS[aId], bc = LOCATION_COORDS[bId];
        if (!ac || !bc) continue;

        var aPx = hexToPixel(ac.col, ac.row), bPx = hexToPixel(bc.col, bc.row);
        var bothExp = af === 'explored' && bf === 'explored';
        var anyExp = af === 'explored' || bf === 'explored';
        var isActive = (aId === S.currentLoc || bId === S.currentLoc) && bothExp;

        var seed = ac.col * 31 + ac.row * 17 + bc.col * 13 + bc.row * 7;
        var bucket;
        if (isActive) { bucket = 'active'; _activeRoadSegs.push({ aPx: aPx, bPx: bPx, seed: seed }); }
        else if (af === 'frontier' || bf === 'frontier') bucket = 'frontier';
        else if (bothExp) bucket = 'explored';
        else if (anyExp) bucket = 'partial';
        else bucket = 'fog';

        segs[bucket].push({ aPx: aPx, bPx: bPx, seed: seed, aId: aId, bId: bId, anyExp: anyExp, bothExp: bothExp });
    }

    // Draw each bucket
    var order = ['fog', 'frontier', 'partial', 'explored', 'active'];
    for (var oi = 0; oi < order.length; oi++) {
        var key = order[oi];
        var list = segs[key];
        if (list.length === 0) continue;
        var b = buckets[key];

        ctx.save();
        ctx.strokeStyle = INK;
        ctx.lineWidth = b.w;
        ctx.globalAlpha = b.op;
        ctx.lineCap = 'round';
        if (b.dash) ctx.setLineDash(b.dash);
        else ctx.setLineDash([]);

        ctx.beginPath();
        for (var si = 0; si < list.length; si++) {
            _cvRoadSegment(ctx, list[si].aPx, list[si].bPx, list[si].seed);
        }
        ctx.stroke();
        ctx.restore();
    }

    // Distance labels
    var showLabels = _cvDetail >= 1 && (typeof _zoomIdx === 'undefined' || _zoomIdx >= 1);
    if (showLabels) {
        for (var oi2 = 0; oi2 < order.length; oi2++) {
            var list2 = segs[order[oi2]];
            for (var si2 = 0; si2 < list2.length; si2++) {
                var seg = list2[si2];
                if (!seg.anyExp) continue;
                var dist = getConnectionDistance(seg.aId, seg.bId);
                var pathD = _buildRoadPath(seg.aPx, seg.bPx, seg.seed);
                var mid = _pointOnPath(pathD, 0.5);
                var mx = mid.x + (srand(seg.seed + 99) - 0.5) * 4;
                var my = mid.y + (srand(seg.seed + 100) - 0.5) * 3;
                var zs = typeof _zoomIdx !== 'undefined' ? [0, 7.5, 9, 11][_zoomIdx] || 8 : 8;
                var lOp = seg.bothExp ? 0.45 : 0.25;
                _cvText(ctx, '' + dist, mx, my, '700 ' + zs + 'px ' + _cvFontFamily, INK, lOp, 'center');
            }
        }
    }
}

// ═══════════════════════════════════════════════════════
// ACTIVE ROAD ANIMATION (ant march)
// ═══════════════════════════════════════════════════════

function _cvDrawActiveRoads(ctx, now) {
    if (_activeRoadSegs.length === 0) return;
    ctx.save();
    ctx.lineCap = 'round';

    // Glow pass (medium+ only)
    if (_cvDetail >= 1) {
        ctx.strokeStyle = CV_GOLD;
        ctx.lineWidth = 8;
        ctx.globalAlpha = 0.12;
        ctx.setLineDash([]);
        ctx.beginPath();
        for (var g = 0; g < _activeRoadSegs.length; g++) {
            _cvRoadSegment(ctx, _activeRoadSegs[g].aPx, _activeRoadSegs[g].bPx, _activeRoadSegs[g].seed);
        }
        ctx.stroke();
    }

    // Main ant-march
    ctx.strokeStyle = CV_GOLD;
    ctx.lineWidth = 3.5;
    ctx.globalAlpha = 0.50;
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = -_antMarchOffset;
    ctx.beginPath();
    for (var i = 0; i < _activeRoadSegs.length; i++) {
        _cvRoadSegment(ctx, _activeRoadSegs[i].aPx, _activeRoadSegs[i].bPx, _activeRoadSegs[i].seed);
    }
    ctx.stroke();
    ctx.restore();
}

// ═══════════════════════════════════════════════════════
// DISTANCE RINGS
// ═══════════════════════════════════════════════════════

function _cvDrawDistanceRings(ctx) {
    if (_cvDetail < 1) return;
    var coords = LOCATION_COORDS[S.currentLoc];
    if (!coords) return;
    var cp = hexToPixel(coords.col, coords.row);

    // Calculate px per turn from nearby edges
    var pxPerTurn = _cachedPxPerTurn;
    if (!pxPerTurn) {
        var conns = connectionGraph[S.currentLoc] || [];
        var sum = 0, cnt = 0;
        for (var i = 0; i < conns.length; i++) {
            var nc = LOCATION_COORDS[conns[i]];
            if (!nc) continue;
            var np = hexToPixel(nc.col, nc.row);
            var d = getConnectionDistance(S.currentLoc, conns[i]);
            if (d > 0) {
                sum += Math.sqrt(Math.pow(np.x - cp.x, 2) + Math.pow(np.y - cp.y, 2)) / d;
                cnt++;
            }
        }
        pxPerTurn = cnt > 0 ? sum / cnt : 45;
        _cachedPxPerTurn = pxPerTurn;
    }

    ctx.save();
    for (var n = 1; n <= 3; n++) {
        var r = pxPerTurn * n;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, r, 0, Math.PI * 2);
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.6;
        ctx.globalAlpha = 0.08;
        ctx.stroke();

        // Label
        _cvText(ctx, n + 'T', cp.x + r + 4, cp.y, '7px ' + _cvFontFamily, INK, 0.25, 'left');
    }
    ctx.setLineDash([]);
    ctx.restore();
}

// ═══════════════════════════════════════════════════════
// BREADCRUMB TRAIL
// ═══════════════════════════════════════════════════════

function _cvDrawBreadcrumb(ctx) {
    var discovered = S.discoveredLocs || [];
    if (discovered.length < 2) return;

    ctx.save();
    ctx.strokeStyle = CV_GOLD;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.15;
    ctx.lineCap = 'round';
    ctx.setLineDash([]);

    for (var i = 0; i < discovered.length - 1; i++) {
        var aC = LOCATION_COORDS[discovered[i]];
        var bC = LOCATION_COORDS[discovered[i + 1]];
        if (!aC || !bC) continue;
        var aP = hexToPixel(aC.col, aC.row);
        var bP = hexToPixel(bC.col, bC.row);
        var seed = (aC.col * 31 + aC.row * 17 + bC.col * 13 + bC.row * 7);
        ctx.beginPath();
        _cvRoadSegment(ctx, aP, bP, seed);
        ctx.stroke();
    }

    // Footprint dots (medium+ only — micro-detail)
    if (_cvDetail >= 1) {
    ctx.globalAlpha = 0.11;
    ctx.fillStyle = CV_GOLD;
    for (var j = 0; j < discovered.length; j++) {
        var c = LOCATION_COORDS[discovered[j]];
        if (!c) continue;
        var p = hexToPixel(c.col, c.row);
        ctx.beginPath();
        ctx.arc(p.x + 3, p.y + 8, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x - 2, p.y + 10, 1.0, 0, Math.PI * 2);
        ctx.fill();
    }
    }
    ctx.restore();
}

// ═══════════════════════════════════════════════════════
// PLAYER BANNER (pole + flag)
// ═══════════════════════════════════════════════════════

function _cvDrawBanner(ctx, now) {
    var coords = LOCATION_COORDS[S.currentLoc];
    if (!coords) return;
    var p = hexToPixel(coords.col, coords.row);
    var x = p.x, baseY = p.y - 3;
    var poleH = 28;
    var topY = baseY - poleH;

    ctx.save();

    // Ground glow (all tiers)
    _cvCircle(ctx, x, p.y, 6, CV_GOLD, 0.10, null, 0, 0);

    // Outer beacon ring (pulsing)
    var beaconAlpha = 0.12 + 0.10 * Math.sin(now * 0.003);
    ctx.beginPath();
    ctx.arc(x, p.y, 20, 0, Math.PI * 2);
    ctx.strokeStyle = CV_GOLD;
    ctx.lineWidth = 2;
    ctx.globalAlpha = beaconAlpha;
    ctx.stroke();

    // Inner glow (medium+ only)
    if (_cvDetail >= 1) {
        var glow = ctx.createRadialGradient(x, p.y, 2, x, p.y, 16);
        glow.addColorStop(0, 'rgba(196,149,58,0.25)');
        glow.addColorStop(1, 'rgba(196,149,58,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, p.y, 16, 0, Math.PI * 2);
        ctx.fill();
    }

    // Pole
    ctx.globalAlpha = 1;
    _cvLine(ctx, x, baseY, x, topY, INK_DARK, 1.2, 1);

    // Flag with subtle wave (larger)
    var fw = 16, fh = 12;
    var waveAmt = _cvDetail >= 1 ? Math.sin(now * 0.002) * 1.5 : 0;
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x + fw, topY + 1 + waveAmt * 0.3);
    ctx.bezierCurveTo(x + fw + 1, topY + fh * 0.35 + waveAmt, x + fw - 1, topY + fh * 0.65 - waveAmt * 0.5, x + fw, topY + fh);
    ctx.lineTo(x, topY + fh);
    ctx.closePath();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = CV_BANNER_RED;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = INK_DARK;
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Gold diamond ornament at pole tip (full detail only)
    if (_cvDetail >= 2) {
        ctx.beginPath();
        ctx.moveTo(x, topY - 4);
        ctx.lineTo(x + 2.5, topY - 1);
        ctx.lineTo(x, topY + 2);
        ctx.lineTo(x - 2.5, topY - 1);
        ctx.closePath();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = CV_GOLD;
        ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = INK_DARK;
        ctx.lineWidth = 0.3;
        ctx.stroke();
    }

    ctx.restore();
}

// ═══════════════════════════════════════════════════════
// PARTICLE SYSTEM
// ═══════════════════════════════════════════════════════

var _cvParticles = [];
var _cvClouds = [];
var CV_MAX_PARTICLES = 40;

var CV_BIOME_PARTICLES = {
    volcanic: { type: 'rise',   color: CV_BIOME_VOLCANIC, count: 3, sMin: 1.5, sMax: 3 },
    snow:     { type: 'fall',   color: CV_BIOME_SNOW, count: 3, sMin: 1,   sMax: 2.5 },
    forest:   { type: 'pulse',  color: CV_BIOME_FOREST, count: 3, sMin: 1.5, sMax: 2.5 },
    swamp:    { type: 'breath', color: CV_BIOME_SWAMP, count: 2, sMin: 3,   sMax: 5 },
    desert:   { type: 'drift',  color: CV_BIOME_DESERT, count: 2, sMin: 1,   sMax: 2 },
    graveyard:{ type: 'pulse',  color: CV_BIOME_GRAVEYARD, count: 2, sMin: 2,   sMax: 3.5 },
    cave:     { type: 'pulse',  color: CV_BIOME_CAVE, count: 2, sMin: 1.5, sMax: 2.5 },
    mountain: { type: 'drift',  color: CV_BIOME_MOUNTAIN, count: 2, sMin: 1,   sMax: 2 },
};

function _cvInitParticles() {
    _cvParticles = [];
    _cvClouds = [];
    if (_cvDetail < 1) return;

    var discoveredSet = new Set(S.discoveredLocs || []);
    var pCount = 0;
    var maxP = _cvDetail >= 2 ? CV_MAX_PARTICLES : Math.floor(CV_MAX_PARTICLES * 0.5);

    for (var locId in LOCATION_COORDS) {
        if (pCount >= maxP) break;
        if (!discoveredSet.has(locId)) continue;
        var ld = S.locations[locId];
        if (!ld) continue;
        var biome = ld.b || 'plains';
        var cfg = CV_BIOME_PARTICLES[biome];
        if (!cfg) continue;
        var coords = LOCATION_COORDS[locId];
        var p = hexToPixel(coords.col, coords.row);

        for (var ci = 0; ci < cfg.count && pCount < maxP; ci++) {
            _cvParticles.push({
                x: p.x + (Math.random() - 0.5) * 24,
                y: p.y + (Math.random() - 0.5) * 20,
                r: cfg.sMin + Math.random() * (cfg.sMax - cfg.sMin),
                color: cfg.color,
                type: cfg.type,
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 1.0,
                baseX: p.x + (Math.random() - 0.5) * 24,
                baseY: p.y + (Math.random() - 0.5) * 20,
            });
            pCount++;
        }
    }

    // Clouds (3-4 large ellipses)
    if (_cvDetail >= 2) {
        var cw = SVG_W || 733, ch = SVG_H || 720;
        for (var ic = 0; ic < 4 && pCount < maxP; ic++) {
            _cvClouds.push({
                x: Math.random() * cw,
                y: 40 + Math.random() * (ch - 80),
                rx: 30 + Math.random() * 40,
                ry: 8 + Math.random() * 12,
                speed: 0.3 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2,
            });
            pCount++;
        }
    }
}

function _cvUpdateParticles(dt) {
    for (var i = 0; i < _cvParticles.length; i++) {
        var p = _cvParticles[i];
        p.phase += dt * p.speed;
        switch (p.type) {
            case 'rise':
                p.y = p.baseY - (p.phase % 6) * 3;
                p.opacity = 0.4 * (1 - (p.phase % 6) / 6);
                break;
            case 'fall':
                p.y = p.baseY + (p.phase % 6) * 3;
                p.opacity = 0.4 * (1 - (p.phase % 6) / 6);
                break;
            case 'pulse':
                p.opacity = 0.15 + 0.25 * Math.abs(Math.sin(p.phase));
                break;
            case 'breath':
                p.opacity = 0.1 + 0.2 * Math.abs(Math.sin(p.phase * 0.5));
                p.r += Math.sin(p.phase) * 0.02;
                break;
            case 'drift':
                p.x = p.baseX + Math.sin(p.phase) * 8;
                p.opacity = 0.15 + 0.15 * Math.abs(Math.sin(p.phase * 0.7));
                break;
        }
    }
    // Clouds drift
    for (var j = 0; j < _cvClouds.length; j++) {
        var c = _cvClouds[j];
        c.x += c.speed * dt * 3;
        if (c.x - c.rx > (SVG_W || 733)) c.x = -c.rx;
    }
}

function _cvDrawParticles(ctx) {
    ctx.save();
    for (var i = 0; i < _cvParticles.length; i++) {
        var p = _cvParticles[i];
        ctx.globalAlpha = (p.opacity || 0.2) * 0.7;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
    }
    // Clouds
    for (var j = 0; j < _cvClouds.length; j++) {
        var c = _cvClouds[j];
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = CV_TEXT;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// ═══════════════════════════════════════════════════════
// FOG SHIMMER
// ═══════════════════════════════════════════════════════

function _cvDrawShimmer(ctx, now) {
    var explored = new Set(S.discoveredLocs || []);
    var fogState = _cvFogState || {};
    ctx.save();
    for (var locId in fogState) {
        if (fogState[locId] !== 'explored') continue;
        var conns = connectionGraph[locId] || [];
        for (var ci = 0; ci < conns.length; ci++) {
            var nb = conns[ci];
            if (fogState[nb] === 'explored') continue;
            var coords = LOCATION_COORDS[locId];
            if (!coords) continue;
            var p = hexToPixel(coords.col, coords.row);
            var shimAlpha = 0.10 + 0.06 * Math.sin(now * 0.001 + coords.col * 3 + coords.row * 7);

            // Soft glow backdrop (medium+ only)
            if (_cvDetail >= 1) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, HEX_RADIUS + 10, 0, Math.PI * 2);
                ctx.setLineDash([]);
                ctx.strokeStyle = CV_GOLD;
                ctx.lineWidth = 5;
                ctx.globalAlpha = 0.04 + 0.03 * Math.sin(now * 0.001 + coords.col * 3 + coords.row * 7);
                ctx.stroke();
            }

            // Main shimmer ring
            ctx.beginPath();
            ctx.arc(p.x, p.y, HEX_RADIUS + 8, 0, Math.PI * 2);
            ctx.setLineDash([12, 8]);
            ctx.strokeStyle = CV_GOLD;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = shimAlpha;
            ctx.stroke();
            break;  // One shimmer per location
        }
    }
    ctx.setLineDash([]);

    // Boundary glow — soft wide pass along fog edges (medium+ only)
    if (_cvDetail >= 1) {
        var bSegs = [];
        for (var bLocId in fogState) {
            if (fogState[bLocId] !== 'explored') continue;
            var bConns = connectionGraph[bLocId] || [];
            for (var bci = 0; bci < bConns.length; bci++) {
                if (fogState[bConns[bci]] === 'explored') continue;
                var bCoords = LOCATION_COORDS[bLocId];
                var nbCoords = LOCATION_COORDS[bConns[bci]];
                if (bCoords && nbCoords) {
                    var bP = hexToPixel(bCoords.col, bCoords.row);
                    var nbP = hexToPixel(nbCoords.col, nbCoords.row);
                    var mx = (bP.x + nbP.x) / 2, my = (bP.y + nbP.y) / 2;
                    bSegs.push([bP.x, bP.y, mx, my]);
                }
                break;
            }
        }
        if (bSegs.length > 0) {
            var bGlowAlpha = 0.03 + 0.02 * Math.sin(now * 0.002);
            ctx.strokeStyle = CV_GOLD;
            ctx.lineWidth = 8;
            ctx.globalAlpha = bGlowAlpha;
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (var gi = 0; gi < bSegs.length; gi++) {
                ctx.moveTo(bSegs[gi][0], bSegs[gi][1]);
                ctx.lineTo(bSegs[gi][2], bSegs[gi][3]);
            }
            ctx.stroke();
        }
    }
    ctx.restore();
}

// ═══════════════════════════════════════════════════════
// SELECTION + PATH HIGHLIGHT
// ═══════════════════════════════════════════════════════

var _cvSelLoc = null;
var _cvSelPathIds = null;
var _cvSelBurst = null;

function cvSetSelection(locId) {
    _cvSelLoc = locId;
    if (locId) {
        var coords = LOCATION_COORDS[locId];
        if (coords) {
            var bp = hexToPixel(coords.col, coords.row);
            _cvSelBurst = { x: bp.x, y: bp.y, t: performance.now() };
        }
    }
    if (locId && locId !== S.currentLoc) {
        _cvSelPathIds = bfsPath(S.currentLoc, locId);
    } else {
        _cvSelPathIds = null;
    }
}

function cvClearSelection() {
    _cvSelLoc = null;
    _cvSelPathIds = null;
}

// Discovery particle system
var _cvDiscoveryParticles = [];

function _cvSpawnDiscoveryParticles(x, y) {
    var count = _cvDetail >= 2 ? 12 : (_cvDetail >= 1 ? 8 : 4);
    var t = performance.now();
    for (var i = 0; i < count; i++) {
        var angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
        var speed = 0.5 + Math.random() * 1.0;
        _cvDiscoveryParticles.push({
            x: x, y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 0.8,
            size: 1.5 + Math.random() * 1.5,
            born: t
        });
    }
}

function _cvDrawDiscoveryParticles(ctx, now) {
    if (_cvDiscoveryParticles.length === 0) return;
    var alive = [];
    ctx.save();
    for (var i = 0; i < _cvDiscoveryParticles.length; i++) {
        var dp = _cvDiscoveryParticles[i];
        var age = now - dp.born;
        if (age > 1200) continue;
        var progress = age / 1200;
        dp.x += dp.vx;
        dp.y += dp.vy;
        dp.vy -= 0.01;
        var alpha = dp.alpha * (1 - progress);
        ctx.beginPath();
        ctx.arc(dp.x, dp.y, dp.size * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = CV_GOLD;
        ctx.globalAlpha = alpha;
        ctx.fill();
        alive.push(dp);
    }
    ctx.restore();
    _cvDiscoveryParticles = alive;
}

// Discovery reveal rings (golden expanding ring on new locations)
function _cvDrawDiscoveryRings(ctx, now) {
    for (var revLocId in _cvRevealAlpha) {
        if (_cvRevealAlpha[revLocId] < 1) {
            var rCoords = LOCATION_COORDS[revLocId];
            if (rCoords) {
                var rP = hexToPixel(rCoords.col, rCoords.row);
                var revProgress = _cvRevealAlpha[revLocId];
                var ringR = revProgress * 25;
                var ringAlpha = (1 - revProgress) * 0.5;
                ctx.save();
                ctx.beginPath();
                ctx.arc(rP.x, rP.y, ringR, 0, Math.PI * 2);
                ctx.strokeStyle = CV_GOLD;
                ctx.lineWidth = 2;
                ctx.globalAlpha = ringAlpha;
                ctx.stroke();
                ctx.restore();
            }
        }
    }
}

// Trigger dramatic fog reveal for a newly discovered location
function cvTriggerReveal(locId) {
    _cvRevealAlpha[locId] = 0;
    _dirtyStatic = true;
    var coords = LOCATION_COORDS[locId];
    if (coords) {
        var rp = hexToPixel(coords.col, coords.row);
        _cvSpawnDiscoveryParticles(rp.x, rp.y);
    }
}

// Danger-color lookup for path segments
function _cvDangerColor(danger) {
    if (danger >= 7) return CV_DANGER_HIGH;
    if (danger >= 5) return CV_DANGER_MED;
    if (danger >= 3) return CV_GOLD;
    return CV_DANGER_LOW;
}

function _cvDrawSelection(ctx, now) {
    if (!_cvSelLoc) return;
    var coords = LOCATION_COORDS[_cvSelLoc];
    if (!coords) return;
    var p = hexToPixel(coords.col, coords.row);

    ctx.save();

    // Selection burst animation (expands and fades, 400ms)
    if (_cvSelBurst) {
        var elapsed = now - _cvSelBurst.t;
        if (elapsed < 400) {
            var progress = elapsed / 400;
            var burstR = progress * 30;
            var burstAlpha = (1 - progress) * 0.35;
            ctx.beginPath();
            ctx.arc(_cvSelBurst.x, _cvSelBurst.y, burstR, 0, Math.PI * 2);
            ctx.strokeStyle = CV_GOLD;
            ctx.lineWidth = 2.5 - progress * 1.5;
            ctx.globalAlpha = burstAlpha;
            ctx.stroke();
            if (_cvDetail >= 1) {
                ctx.beginPath();
                ctx.arc(_cvSelBurst.x, _cvSelBurst.y, burstR * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = CV_GOLD;
                ctx.globalAlpha = burstAlpha * 0.3;
                ctx.fill();
            }
        } else {
            _cvSelBurst = null;
        }
    }

    // Selection ring (pulsing) — colored by destination danger
    var destLd = S.locations ? S.locations[_cvSelLoc] : null;
    var destDanger = destLd ? (destLd.d || 0) : 0;
    var selColor = _cvDangerColor(destDanger);
    var pulseAlpha = 0.5 + 0.3 * Math.sin(now * 0.004);
    ctx.beginPath();
    ctx.arc(p.x, p.y, HEX_RADIUS + 8, 0, Math.PI * 2);
    ctx.strokeStyle = selColor;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = pulseAlpha;
    ctx.stroke();

    // Scale-up glow indicator (medium+ only)
    if (_cvDetail >= 1) {
        var scaleAlpha = 0.12 + 0.06 * Math.sin(now * 0.003);
        ctx.beginPath();
        ctx.arc(p.x, p.y, HEX_RADIUS + 2, 0, Math.PI * 2);
        ctx.fillStyle = selColor;
        ctx.globalAlpha = scaleAlpha;
        ctx.fill();
    }

    // Path highlight — each segment colored by destination node danger
    if (_cvSelPathIds && _cvSelPathIds.length >= 2) {
        ctx.lineCap = 'round';
        ctx.setLineDash([8, 4]);
        ctx.lineDashOffset = -_antMarchOffset;

        for (var i = 0; i < _cvSelPathIds.length - 1; i++) {
            var aC = LOCATION_COORDS[_cvSelPathIds[i]];
            var bC = LOCATION_COORDS[_cvSelPathIds[i + 1]];
            if (!aC || !bC) continue;
            var aP = hexToPixel(aC.col, aC.row);
            var bP = hexToPixel(bC.col, bC.row);
            var seed = (aC.col * 31 + aC.row * 17 + bC.col * 13 + bC.row * 7);

            // Determine danger color for this segment (based on destination node)
            var segLocId = _cvSelPathIds[i + 1];
            var segLd = S.locations ? S.locations[segLocId] : null;
            var segDanger = segLd ? (segLd.d || 0) : 0;
            var segColor = _cvDangerColor(segDanger);

            // Medium/Full: gradient from source danger to dest danger along the segment
            if (_cvDetail >= 1) {
                var srcLocId = _cvSelPathIds[i];
                var srcLd = S.locations ? S.locations[srcLocId] : null;
                var srcDanger = srcLd ? (srcLd.d || 0) : 0;
                var srcColor = _cvDangerColor(srcDanger);
                var grad = ctx.createLinearGradient(aP.x, aP.y, bP.x, bP.y);
                grad.addColorStop(0, srcColor);
                grad.addColorStop(1, segColor);
                ctx.strokeStyle = grad;
            } else {
                // Lite: flat color (no gradient)
                ctx.strokeStyle = segColor;
            }

            // Glow pass (medium/full only)
            if (_cvDetail >= 1) {
                ctx.lineWidth = 8;
                ctx.globalAlpha = 0.15;
                ctx.beginPath();
                _cvRoadSegment(ctx, aP, bP, seed);
                ctx.stroke();
            }
            ctx.lineWidth = 4;
            ctx.globalAlpha = 0.55;
            ctx.beginPath();
            _cvRoadSegment(ctx, aP, bP, seed);
            ctx.stroke();

            // Direction arrow at midpoint (medium+ only — expensive transform)
            if (_cvDetail >= 1) {
            var pathD = _buildRoadPath(aP, bP, seed);
            var midPt = _pointOnPath(pathD, 0.5);
            var preP = _pointOnPath(pathD, 0.45);
            var angle = Math.atan2(midPt.y - preP.y, midPt.x - preP.x);
            ctx.save();
            ctx.translate(midPt.x, midPt.y);
            ctx.rotate(angle);
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = segColor;
            ctx.beginPath();
            ctx.moveTo(0, -4);
            ctx.lineTo(8, 0);
            ctx.lineTo(0, 4);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            }
        }
    }
    ctx.setLineDash([]);
    ctx.restore();
}

// ═══════════════════════════════════════════════════════
// TRAVEL ANIMATION
// ═══════════════════════════════════════════════════════

var _cvTravelState = null;

function cvStartTravel(fromId, toId, onComplete) {
    var pathIds = bfsPath(fromId, toId);
    if (!pathIds || pathIds.length < 2) { if (onComplete) onComplete(); return; }

    var segments = [];
    var totalLen = 0;
    for (var i = 0; i < pathIds.length - 1; i++) {
        var aC = LOCATION_COORDS[pathIds[i]];
        var bC = LOCATION_COORDS[pathIds[i + 1]];
        if (!aC || !bC) continue;
        var aP = hexToPixel(aC.col, aC.row);
        var bP = hexToPixel(bC.col, bC.row);
        var seed = (aC.col * 31 + aC.row * 17 + bC.col * 13 + bC.row * 7);
        var dx = bP.x - aP.x, dy = bP.y - aP.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        var pathD = _buildRoadPath(aP, bP, seed);
        segments.push({ pathD: pathD, aP: aP, bP: bP, seed: seed, len: len, locId: pathIds[i + 1] });
        totalLen += len;
    }

    // Phase-based timing: each segment gets travel time + waypoint pause (except last)
    var msPerSeg = Math.max(600, Math.min(1200, 3000 / Math.max(1, pathIds.length)));
    var wpPause = 200;
    var phases = [];
    for (var j = 0; j < segments.length; j++) {
        phases.push({ type: 'move', segIdx: j, duration: msPerSeg });
        if (j < segments.length - 1) {
            phases.push({ type: 'pause', segIdx: j, duration: wpPause });
        }
    }
    var totalDur = 0;
    for (var k = 0; k < phases.length; k++) totalDur += phases[k].duration;

    _cvTravelState = {
        segments: segments,
        totalLen: totalLen,
        startTime: performance.now(),
        duration: totalDur,
        phases: phases,
        onComplete: onComplete,
        pathProgress: 0,
        waypointPulse: 0,
    };
}

function _cvDrawTravel(ctx, now) {
    var ts = _cvTravelState;
    if (!ts) return;
    var elapsed = now - ts.startTime;

    // Determine current phase (move or waypoint pause)
    var phaseElapsed = elapsed;
    var currentPhase = null;
    var phaseLocalT = 0;
    for (var pi = 0; pi < ts.phases.length; pi++) {
        if (phaseElapsed <= ts.phases[pi].duration) {
            currentPhase = ts.phases[pi];
            phaseLocalT = Math.min(1, phaseElapsed / ts.phases[pi].duration);
            break;
        }
        phaseElapsed -= ts.phases[pi].duration;
    }

    if (!currentPhase) {
        var cb = ts.onComplete;
        _cvTravelState = null;
        if (cb) cb();
        return;
    }

    ctx.save();
    ctx.strokeStyle = CV_GOLD;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.6;
    ctx.lineCap = 'round';
    ctx.setLineDash([]);

    // Draw completed segments
    var completedUpTo = currentPhase.segIdx;
    if (currentPhase.type === 'pause') completedUpTo = currentPhase.segIdx + 1;
    for (var i = 0; i < Math.min(completedUpTo, ts.segments.length); i++) {
        var seg = ts.segments[i];
        ctx.beginPath();
        _cvRoadSegment(ctx, seg.aP, seg.bP, seg.seed);
        ctx.stroke();
    }

    // Draw current segment + find marker position
    var markerPt = null;
    if (currentPhase.type === 'move') {
        var seg2 = ts.segments[currentPhase.segIdx];
        // Ease-in-out
        var easeT = phaseLocalT < 0.5 ? 2 * phaseLocalT * phaseLocalT : 1 - Math.pow(-2 * phaseLocalT + 2, 2) / 2;
        ctx.beginPath();
        _cvRoadSegment(ctx, seg2.aP, seg2.bP, seg2.seed);
        ctx.stroke();
        markerPt = _pointOnPath(seg2.pathD, easeT);
    } else {
        // Pause at waypoint
        var pauseSeg = ts.segments[currentPhase.segIdx];
        markerPt = { x: pauseSeg.bP.x, y: pauseSeg.bP.y };
        ts.waypointPulse = phaseLocalT;
    }

    // Draw traveler marker
    if (markerPt) {
        if (currentPhase.type === 'pause') {
            var pulseR = 8 + ts.waypointPulse * 12;
            var pulseOp = 0.4 * (1 - ts.waypointPulse);
            _cvCircle(ctx, markerPt.x, markerPt.y, pulseR, null, 0, CV_GOLD, 1.5, pulseOp);
        }
        _cvCircle(ctx, markerPt.x, markerPt.y, 5, CV_BANNER_RED, 0.85, INK_DARK, 1.5, 0.8);
        _cvCircle(ctx, markerPt.x, markerPt.y, 10, null, 0, CV_GOLD_30, 1.8, 0.5);
    }

    ctx.setLineDash([]);
    ctx.restore();
}

// ═══════════════════════════════════════════════════════
// HIT TESTING
// ═══════════════════════════════════════════════════════

var _cvHitRadius = 22;

function cvHitTest(canvasX, canvasY) {
    var fogState = _cvFogState || {};
    var closest = null, minDist = _cvHitRadius;

    for (var locId in LOCATION_COORDS) {
        var fog = fogState[locId];
        if (fog === 'hidden') continue;
        var coords = LOCATION_COORDS[locId];
        var p = hexToPixel(coords.col, coords.row);
        var dx = canvasX - p.x, dy = canvasY - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
            closest = locId;
            minDist = dist;
        }
    }
    return closest;
}

// ═══════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════

function canvasSetDirty() {
    _dirtyStatic = true;
    _cvFogState = computeFogState(true);
}

function canvasUpdateFont(fontFamily) {
    _cvFontFamily = fontFamily || "'Cinzel', serif";
    _dirtyStatic = true;
}

function canvasStop() {
    if (_animFrame) cancelAnimationFrame(_animFrame);
    _animFrame = null;
}
