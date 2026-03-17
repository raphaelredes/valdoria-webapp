// ═══════════════════════════════════════════════════════
// NAVIGATE CANVAS ICONS — Biome icons + marker rendering
// All icon drawing uses Canvas 2D primitives
// ═══════════════════════════════════════════════════════

// ── Icon cache (offscreen canvases) ──
var _cvIconCache = {};

function _cvGetIcon(biome, locName, sz, isSett) {
    var key = (isSett ? 'S_' : 'B_') + biome + '_' + (locName || '').substring(0, 10) + '_' + sz;
    if (_cvIconCache[key]) return _cvIconCache[key];
    var pad = 4;
    var oc = document.createElement('canvas');
    oc.width = sz * 4 + pad * 2;
    oc.height = sz * 4 + pad * 2;
    var ctx = oc.getContext('2d');
    ctx.translate(oc.width / 2, oc.height / 2 + sz * 0.3);
    if (isSett) _cvDrawSettlementIcon(ctx, 0, 0, sz);
    else _cvDrawBiomeIcon(ctx, 0, 0, biome, sz, locName);
    _cvIconCache[key] = oc;
    return oc;
}

// ═══════════════════════════════════════════════════════
// SETTLEMENT ICON (castle)
// ═══════════════════════════════════════════════════════

function _cvDrawSettlementIcon(ctx, x, y, sz) {
    var bw = sz * 0.9, bh = sz * 0.7;
    var tw = sz * 0.35, th = sz * 1.2;
    var sw = 0.5, so = 0.55;
    // Left tower
    _cvRect(ctx, x-bw-tw/2, y-th, tw, th, INK_DARK, 0.12, INK_DARK, sw, so);
    // Left tower roof
    ctx.beginPath();
    ctx.moveTo(x-bw-tw/2-2, y-th); ctx.lineTo(x-bw, y-th-sz*0.45); ctx.lineTo(x-bw+tw/2+2, y-th);
    ctx.closePath();
    ctx.globalAlpha = 0.10; ctx.fillStyle = INK_DARK; ctx.fill();
    ctx.globalAlpha = so; ctx.strokeStyle = INK_DARK; ctx.lineWidth = sw*0.9; ctx.stroke();
    // Left crenellations
    for (var c = 0; c < 3; c++) {
        _cvRect(ctx, x-bw-tw/2 + c * (tw/3), y-th-1.5, tw/4, 1.5, INK_DARK, 0.18, null, 0, 0);
    }
    // Right tower
    _cvRect(ctx, x+bw-tw/2, y-th, tw, th, INK_DARK, 0.12, INK_DARK, sw, so);
    // Right tower roof
    ctx.beginPath();
    ctx.moveTo(x+bw-tw/2-2, y-th); ctx.lineTo(x+bw, y-th-sz*0.45); ctx.lineTo(x+bw+tw/2+2, y-th);
    ctx.closePath();
    ctx.globalAlpha = 0.10; ctx.fillStyle = INK_DARK; ctx.fill();
    ctx.globalAlpha = so; ctx.strokeStyle = INK_DARK; ctx.lineWidth = sw*0.9; ctx.stroke();
    // Right crenellations
    for (var c2 = 0; c2 < 3; c2++) {
        _cvRect(ctx, x+bw-tw/2 + c2 * (tw/3), y-th-1.5, tw/4, 1.5, INK_DARK, 0.18, null, 0, 0);
    }
    // Center keep
    _cvRect(ctx, x-bw*0.4, y-bh, bw*0.8, bh, INK_DARK, 0.14, INK_DARK, sw*0.9, so);
    // Wall
    _cvLine(ctx, x-bw+tw/2, y-bh*0.6, x+bw-tw/2, y-bh*0.6, INK_DARK, 0.3, 0.35);
    // Gate arch
    ctx.beginPath();
    ctx.moveTo(x-2, y); ctx.lineTo(x-2, y-bh*0.5);
    ctx.quadraticCurveTo(x, y-bh*0.7, x+2, y-bh*0.5);
    ctx.lineTo(x+2, y);
    ctx.globalAlpha = 0.12; ctx.fillStyle = INK_DARK; ctx.fill();
    ctx.globalAlpha = so; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.3; ctx.stroke();
    // Flag
    _cvLine(ctx, x, y-bh, x, y-bh-sz*0.4, INK_DARK, 0.25, 0.5);
    ctx.beginPath();
    ctx.moveTo(x, y-bh-sz*0.4); ctx.lineTo(x+sz*0.3, y-bh-sz*0.3); ctx.lineTo(x, y-bh-sz*0.2);
    ctx.closePath();
    ctx.globalAlpha = 0.18; ctx.fillStyle = INK_DARK; ctx.fill();
    ctx.globalAlpha = 0.4; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.2; ctx.stroke();
}

// ═══════════════════════════════════════════════════════
// BIOME ICONS (19 types)
// ═══════════════════════════════════════════════════════

function _cvDrawBiomeIcon(ctx, x, y, biome, sz, locName) {
    var nm = (locName || '').toLowerCase();
    var _sw = 0.5, _so = 0.55;

    // Fort
    if (nm.includes('forte') || nm.includes('fortaleza') || nm.includes('basti')) {
        _cvRect(ctx, x-sz*0.6, y-sz*0.3, sz*1.2, sz*0.5, INK_DARK, 0.12, INK_DARK, _sw, _so);
        _cvRect(ctx, x-sz*0.25, y-sz*1.1, sz*0.5, sz*1.3, INK_DARK, 0.14, INK_DARK, _sw, _so);
        for (var c = 0; c < 3; c++) {
            _cvRect(ctx, x-sz*0.25 + c * sz*0.18, y-sz*1.2, sz*0.12, sz*0.12, INK_DARK, 0.18, null, 0, 0);
        }
        _cvLine(ctx, x, y-sz*1.1, x, y-sz*1.5, INK_DARK, 0.25, 0.5);
        ctx.beginPath();
        ctx.moveTo(x, y-sz*1.5); ctx.lineTo(x+sz*0.35, y-sz*1.4); ctx.lineTo(x, y-sz*1.3); ctx.closePath();
        ctx.globalAlpha = 0.15; ctx.fillStyle = INK_DARK; ctx.fill();
        ctx.globalAlpha = 0.4; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.2; ctx.stroke();
        return;
    }
    // Ruins
    if (nm.includes('ru\u00edna') || nm.includes('ruinas') || nm.includes('ru\u00ednas')) {
        _cvLine(ctx, x-sz*0.5, y+2, x-sz*0.5, y-sz*0.8, INK_DARK, 0.6, _so);
        _cvLine(ctx, x+sz*0.5, y+2, x+sz*0.5, y-sz*0.5, INK_DARK, 0.5, _so);
        ctx.beginPath();
        ctx.moveTo(x-sz*0.5, y-sz*0.6);
        ctx.quadraticCurveTo(x, y-sz*1.2, x+sz*0.3, y-sz*0.5);
        ctx.setLineDash([2, 1.5]);
        ctx.globalAlpha = 0.45; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.35; ctx.stroke();
        ctx.setLineDash([]);
        for (var i = 0; i < 4; i++) {
            _cvCircle(ctx, x + (srand(i*17)-0.5)*sz, y+1+srand(i*23)*2, 0.6, INK_DARK, 0.25, null, 0, 0);
        }
        return;
    }
    // Tunnel/passage
    if (nm.includes('passagem') || nm.includes('t\u00fanel') || nm.includes('portal')) {
        ctx.beginPath();
        ctx.moveTo(x-sz*0.7, y+2);
        ctx.quadraticCurveTo(x-sz*0.7, y-sz*0.6, x, y-sz*0.8);
        ctx.quadraticCurveTo(x+sz*0.7, y-sz*0.6, x+sz*0.7, y+2);
        ctx.globalAlpha = 0.15; ctx.fillStyle = INK_DARK; ctx.fill();
        ctx.globalAlpha = _so; ctx.strokeStyle = INK_DARK; ctx.lineWidth = _sw; ctx.stroke();
        for (var si = 0; si < 3; si++) {
            var sy = y + 1 - si * 2;
            var sww = sz * (0.5 - si * 0.1);
            _cvLine(ctx, x-sww, sy, x+sww, sy, INK_DARK, 0.4, 0.3);
        }
        return;
    }
    // Tower
    if (nm.includes('torre') || nm.includes('farol')) {
        _cvRect(ctx, x-sz*0.2, y-sz*1.3, sz*0.4, sz*1.5, INK_DARK, 0.12, INK_DARK, _sw, _so);
        ctx.beginPath();
        ctx.moveTo(x-sz*0.35, y-sz*1.3); ctx.lineTo(x, y-sz*1.7); ctx.lineTo(x+sz*0.35, y-sz*1.3); ctx.closePath();
        ctx.globalAlpha = 0.10; ctx.fillStyle = INK_DARK; ctx.fill();
        ctx.globalAlpha = _so; ctx.strokeStyle = INK_DARK; ctx.lineWidth = _sw*0.9; ctx.stroke();
        return;
    }
    // Camp
    if (nm.includes('acampamento') || nm.includes('tribo') || nm.includes('ninho')) {
        ctx.beginPath();
        ctx.moveTo(x-sz*0.7, y+2); ctx.lineTo(x, y-sz*0.9); ctx.lineTo(x+sz*0.7, y+2); ctx.closePath();
        ctx.globalAlpha = 0.12; ctx.fillStyle = INK_DARK; ctx.fill();
        ctx.globalAlpha = _so; ctx.strokeStyle = INK_DARK; ctx.lineWidth = _sw; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x-sz*0.2, y+2); ctx.lineTo(x, y-sz*0.2); ctx.lineTo(x+sz*0.2, y+2); ctx.closePath();
        ctx.globalAlpha = 0.15; ctx.fillStyle = INK_DARK; ctx.fill();
        ctx.globalAlpha = 0.4; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.25; ctx.stroke();
        var fx = x + sz * 0.8, fy = y + 1;
        ctx.beginPath();
        ctx.moveTo(fx-1.5, fy); ctx.quadraticCurveTo(fx, fy-3, fx+1.5, fy);
        ctx.globalAlpha = 0.5; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.5; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(fx, fy-3); ctx.quadraticCurveTo(fx+1, fy-5, fx-0.5, fy-6);
        ctx.globalAlpha = 0.3; ctx.strokeStyle = INK; ctx.lineWidth = 0.3; ctx.stroke();
        return;
    }
    // Mountain pass
    if (nm.includes('passo') || nm.includes('desfiladeiro')) {
        _cvLine(ctx, x-sz*1.2, y+2, x-sz*0.3, y-sz*1.0, INK_DARK, 0.55, _so);
        _cvLine(ctx, x-sz*0.3, y-sz*1.0, x-sz*0.1, y-sz*0.2, INK_DARK, 0.4, _so);
        _cvLine(ctx, x+sz*0.1, y-sz*0.2, x+sz*0.4, y-sz*1.1, INK_DARK, 0.55, _so);
        _cvLine(ctx, x+sz*0.4, y-sz*1.1, x+sz*1.2, y+2, INK_DARK, 0.4, _so);
        ctx.beginPath();
        ctx.moveTo(x-sz*0.1, y-sz*0.2);
        ctx.quadraticCurveTo(x, y, x+sz*0.1, y-sz*0.2);
        ctx.globalAlpha = 0.4; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.4; ctx.stroke();
        ctx.setLineDash([1.5, 1.5]);
        _cvLine(ctx, x, y+3, x, y-sz*0.1, INK_DARK, 0.4, 0.3);
        ctx.setLineDash([]);
        return;
    }
    // Field
    if (nm.includes('campo') || nm.includes('plan\u00edcie') || nm.includes('pradaria')) {
        for (var fi = -1; fi <= 1; fi++) {
            var gx = x + fi * sz * 0.5;
            var gh = sz * 0.8 + Math.abs(fi) * sz * 0.2;
            var lean = fi * 1.5;
            ctx.beginPath();
            ctx.moveTo(gx, y+2); ctx.quadraticCurveTo(gx+lean*0.3, y-gh*0.5, gx+lean, y-gh);
            ctx.globalAlpha = _so; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.35; ctx.lineCap = 'round'; ctx.stroke();
            _cvEllipse(ctx, gx+lean, y-gh-1, 0.8, 1.8, INK_DARK, 0.18, INK_DARK, 0.2, 0.4);
        }
        ctx.beginPath();
        ctx.moveTo(x-sz, y+2); ctx.quadraticCurveTo(x, y+1, x+sz, y+2);
        ctx.globalAlpha = 0.3; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.3; ctx.stroke();
        return;
    }
    // Crater
    if (nm.includes('cratera') || nm.includes('vulc\u00e3')) {
        _cvEllipse(ctx, x, y-sz*0.2, sz*0.8, sz*0.4, INK_DARK, 0.14, INK_DARK, _sw, _so);
        _cvEllipse(ctx, x, y-sz*0.2, sz*0.5, sz*0.25, INK_DARK, 0.15, null, 0, 0);
        for (var si2 = 0; si2 < 3; si2++) {
            var sx = x + (si2-1)*sz*0.3;
            ctx.beginPath();
            ctx.moveTo(sx, y-sz*0.5);
            ctx.quadraticCurveTo(sx+(si2-1)*1.5, y-sz*1.0, sx-(si2-1)*0.5, y-sz*1.4);
            ctx.globalAlpha = 0.3; ctx.strokeStyle = INK; ctx.lineWidth = 0.35; ctx.stroke();
        }
        return;
    }
    // Frozen
    if (nm.includes('congelado') || nm.includes('ermo') || nm.includes('gelo') || nm.includes('gelado')) {
        for (var ii = -1; ii <= 1; ii++) {
            var ix = x + ii * sz * 0.4;
            var ih = sz * (0.8 + Math.abs(ii) * 0.3);
            _cvPolygon(ctx, [[ix-sz*0.15, y+1], [ix, y-ih], [ix+sz*0.15, y+1]], INK_LIGHT, 0.15, INK_LIGHT, 0.5, 0.5);
        }
        var ffy = y + 3;
        for (var a = 0; a < 3; a++) {
            var ang = a * Math.PI / 3;
            _cvLine(ctx, x - Math.cos(ang)*sz*0.3, ffy - Math.sin(ang)*sz*0.3,
                    x + Math.cos(ang)*sz*0.3, ffy + Math.sin(ang)*sz*0.3, INK_LIGHT, 0.3, 0.3);
        }
        return;
    }
    // Cemetery
    if (nm.includes('cemit\u00e9rio') || nm.includes('catacumba') || nm.includes('necr\u00f3pole')) {
        ctx.beginPath();
        ctx.moveTo(x-sz*0.6, y+3); ctx.quadraticCurveTo(x, y+1, x+sz*0.6, y+3);
        ctx.globalAlpha = 0.35; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.25; ctx.stroke();
        _cvLine(ctx, x, y+2, x, y-sz*1.3, INK_DARK, 0.7, _so);
        _cvLine(ctx, x-sz*0.5, y-sz*0.6, x+sz*0.5, y-sz*0.6, INK_DARK, 0.6, _so);
        return;
    }

    // ── Biome fallbacks ──
    switch (biome) {
        case 'forest':
            for (var ti = -1; ti <= 1; ti++) {
                var tx = x + ti * sz * 0.5, tsz = sz * (ti === 0 ? 0.7 : 0.5);
                _cvLine(ctx, tx, y+2, tx, y-sz*0.8, INK_DARK, 0.4, _so);
                _cvCircle(ctx, tx, y-sz*(ti===0?1.2:1.0), tsz, INK_DARK, 0.14, INK_DARK, 0.4, _so);
            }
            break;
        case 'mountain':
            _cvPolygon(ctx, [[x-sz, y+3], [x-sz*0.2, y-sz*1.3], [x-sz*0.2, y+3]], INK_DARK, 0.14, null, 0, 0);
            _cvLine(ctx, x-sz, y+3, x-sz*0.2, y-sz*1.3, INK_DARK, 0.65, _so);
            _cvLine(ctx, x-sz*0.2, y-sz*1.3, x+sz, y+3, INK_DARK, _sw, _so);
            _cvLine(ctx, x+sz*0.2, y+1, x+sz*0.6, y-sz*0.7, INK_DARK, 0.4, _so);
            _cvLine(ctx, x+sz*0.6, y-sz*0.7, x+sz, y+1, INK_DARK, 0.3, 0.45);
            break;
        case 'swamp':
            for (var wi = 0; wi < 3; wi++) {
                var wy = y - 2 + wi * 2.5;
                ctx.beginPath();
                ctx.moveTo(x-sz, wy); ctx.quadraticCurveTo(x, wy-1.5, x+sz, wy);
                ctx.globalAlpha = 0.4; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.3; ctx.stroke();
            }
            ctx.beginPath();
            ctx.moveTo(x-1, y+2); ctx.lineTo(x, y-sz*0.6); ctx.lineTo(x+1, y+2);
            ctx.globalAlpha = _so; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.35; ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y+1); ctx.quadraticCurveTo(x-2.5, y+2, x-3, y+3);
            ctx.globalAlpha = 0.4; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.2; ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y+1); ctx.quadraticCurveTo(x+2.5, y+2, x+3, y+3);
            ctx.globalAlpha = 0.4; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.2; ctx.stroke();
            break;
        case 'cave':
            ctx.beginPath();
            ctx.moveTo(x-sz*1.1, y+3); ctx.lineTo(x-sz*0.8, y-sz*0.3); ctx.lineTo(x-sz*0.4, y-sz*0.9);
            ctx.lineTo(x, y-sz*1.2); ctx.lineTo(x+sz*0.3, y-sz*0.8); ctx.lineTo(x+sz*0.7, y-sz*0.2);
            ctx.lineTo(x+sz*1.1, y+3);
            ctx.globalAlpha = 0.10; ctx.fillStyle = INK_DARK; ctx.fill();
            ctx.globalAlpha = _so; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.4; ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x-sz*0.5, y+3);
            ctx.quadraticCurveTo(x-sz*0.5, y-sz*0.3, x, y-sz*0.5);
            ctx.quadraticCurveTo(x+sz*0.5, y-sz*0.3, x+sz*0.5, y+3);
            ctx.globalAlpha = 0.15; ctx.fillStyle = INK_DARK; ctx.fill();
            ctx.globalAlpha = _so; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.35; ctx.stroke();
            break;
        case 'desert':
            ctx.beginPath();
            ctx.moveTo(x-sz*1.2, y+2); ctx.quadraticCurveTo(x-sz*0.3, y-sz*0.5, x+sz*0.4, y+2);
            ctx.globalAlpha = _so; ctx.strokeStyle = INK_DARK; ctx.lineWidth = _sw; ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x-sz*0.3, y+2); ctx.quadraticCurveTo(x+sz*0.5, y-sz*0.3, x+sz*1.2, y+2);
            ctx.globalAlpha = 0.45; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.35; ctx.stroke();
            for (var di = 0; di < 3; di++) {
                var wx = x + (di-1)*sz*0.6, wwy = y + 3 + di*0.5;
                _cvLine(ctx, wx-2, wwy, wx+3, wwy, INK_DARK, 0.2, 0.2);
            }
            break;
        case 'graveyard':
            ctx.beginPath();
            ctx.moveTo(x-sz*0.6, y+3); ctx.quadraticCurveTo(x, y+1, x+sz*0.6, y+3);
            ctx.globalAlpha = 0.4; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.25; ctx.stroke();
            _cvLine(ctx, x, y+2, x, y-sz*1.3, INK_DARK, 0.7, _so);
            _cvLine(ctx, x-sz*0.5, y-sz*0.6, x+sz*0.5, y-sz*0.6, INK_DARK, 0.6, _so);
            break;
        case 'volcanic':
            _cvPolygon(ctx, [[x-sz*0.9, y+3], [x-1.5, y-sz], [x+1.5, y-sz], [x+sz*0.9, y+3]],
                INK_DARK, 0.12, INK_DARK, _sw, _so);
            ctx.beginPath();
            ctx.moveTo(x-2, y-sz); ctx.quadraticCurveTo(x, y-sz+2, x+2, y-sz);
            ctx.globalAlpha = 0.18; ctx.fillStyle = INK_DARK; ctx.fill();
            ctx.globalAlpha = 0.45; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.3; ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y-sz); ctx.quadraticCurveTo(x+2, y-sz-3, x-1, y-sz-6);
            ctx.globalAlpha = 0.25; ctx.strokeStyle = INK; ctx.lineWidth = 0.3; ctx.stroke();
            break;
        case 'snow':
            _cvPolygon(ctx, [[x-sz*0.15, y+1], [x, y-sz], [x+sz*0.15, y+1]],
                INK_LIGHT, 0.12, INK_LIGHT, 0.3, 0.45);
            _cvPolygon(ctx, [[x-sz*0.5, y+1], [x-sz*0.3, y-sz*0.6], [x-sz*0.15, y+1]],
                INK_LIGHT, 0.08, INK_LIGHT, 0.25, 0.4);
            _cvPolygon(ctx, [[x+sz*0.15, y+1], [x+sz*0.35, y-sz*0.5], [x+sz*0.55, y+1]],
                INK_LIGHT, 0.08, INK_LIGHT, 0.25, 0.4);
            break;
        default:
            // Signpost
            _cvLine(ctx, x, y+3, x, y-sz*1.0, INK_DARK, _sw, _so);
            ctx.beginPath();
            ctx.moveTo(x, y-sz*0.7); ctx.lineTo(x+sz*0.6, y-sz*0.8);
            ctx.lineTo(x+sz*0.6, y-sz*0.5); ctx.lineTo(x, y-sz*0.4); ctx.closePath();
            ctx.globalAlpha = 0.14; ctx.fillStyle = INK_DARK; ctx.fill();
            ctx.globalAlpha = _so; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.3; ctx.stroke();
    }
}

// ═══════════════════════════════════════════════════════
// MARKER RENDERING (main loop)
// ═══════════════════════════════════════════════════════

function _cvDrawMarkers(ctx, fogState) {
    var currentAdj = new Set();
    for (var ei = 0; ei < CONNECTION_EDGES.length; ei++) {
        var a = CONNECTION_EDGES[ei][0], b = CONNECTION_EDGES[ei][1];
        if (a === S.currentLoc) currentAdj.add(b);
        if (b === S.currentLoc) currentAdj.add(a);
    }
    var R = 22;

    for (var locId in LOCATION_COORDS) {
        var fog = fogState[locId];
        if (fog === 'hidden') continue;
        var coords = LOCATION_COORDS[locId];
        var pos = hexToPixel(coords.col, coords.row);
        var x = pos.x, y = pos.y;
        var ld = S.locations[locId];
        var isCurr = locId === S.currentLoc;
        var isExp = fog === 'explored';
        var biome = ld ? (ld.b || 'plains') : 'plains';
        var name = ld ? (ld.n || '') : '';
        var isSett = ld ? (ld.s || false) : false;

        // Reveal fade-in
        var alpha = _cvRevealAlpha[locId] != null ? _cvRevealAlpha[locId] : 1;
        ctx.save();
        ctx.globalAlpha = alpha;

        if (isCurr) {
            // Current location — pulsing ring
            var pulseA = 0.3 + 0.1 * Math.sin((_bannerSwayTime || 0) * 0.003);
            _cvCircle(ctx, x, y, R + 4, null, 0, '#c4953a', 1.5, pulseA);
            // Breathing scale — just draw normally (subtle)
            var iconOc = _cvGetIcon(biome, name, 9, isSett);
            ctx.drawImage(iconOc, x - iconOc.width/2, y + 4 - iconOc.height/2);
        } else if (isExp) {
            var iconOc2 = _cvGetIcon(biome, name, isSett ? 9 : 8, isSett);
            ctx.drawImage(iconOc2, x - iconOc2.width/2, y + (isSett ? 4 : 2) - iconOc2.height/2);
        } else if (fog === 'known_mapped') {
            ctx.globalAlpha = alpha * 0.45;
            var iconOc3 = _cvGetIcon(biome, name, 7, isSett);
            ctx.drawImage(iconOc3, x - iconOc3.width/2, y + 2 - iconOc3.height/2);
            // Pulsing discover ring
            var discAlpha = 0.2 + 0.15 * Math.sin((_bannerSwayTime || 0) * 0.004 + coords.col);
            _cvCircle(ctx, x, y, R - 4, null, 0, '#c4953a', 1.2, discAlpha);
        } else if (fog === 'known_unmapped') {
            ctx.globalAlpha = alpha * 0.3;
            _cvCircle(ctx, x, y, 2.5, INK_DARK, 0.35, null, 0, 0);
            _cvText(ctx, '?', x, y + 1, '6px ' + _cvFontFamily, INK_DARK, 0.5, 'center');
        } else {
            // Frontier
            ctx.globalAlpha = alpha * 0.2;
            _cvCircle(ctx, x, y, 1.5, INK_DARK, 0.2, null, 0, 0);
        }

        ctx.globalAlpha = alpha;

        // Danger ring
        if ((isExp || fog === 'known_mapped') && ld && ld.d > 0) {
            var dc = getDangerColor(ld.d);
            var dOp = isExp ? 0.4 : 0.25;
            if (isExp) {
                _cvCircle(ctx, x, y, R - 2, null, 0, dc, 1.5, dOp);
            } else {
                ctx.setLineDash([3, 2]);
                _cvCircle(ctx, x, y, R - 2, null, 0, dc, 1.5, dOp);
                ctx.setLineDash([]);
            }
        }

        // Quest glow ring
        if (isExp && !isCurr) {
            var locQ = (S.quests || []).filter(function(q) { return q.loc === locId; });
            if (locQ.length > 0) {
                var qAlpha = 0.2 + 0.1 * Math.sin((_bannerSwayTime || 0) * 0.003 + coords.row);
                _cvCircle(ctx, x, y, R - 1, null, 0, '#c4953a', 2, qAlpha);
            }
        }

        // Danger aura (high danger)
        if (isExp && (ld ? ld.d : 0) >= 5) {
            var daAlpha = 0.08 + 0.07 * Math.sin((_bannerSwayTime || 0) * 0.002 + coords.col * 2);
            _cvCircle(ctx, x, y, R + 2, null, 0, getDangerColor(ld.d), 3, daAlpha);
        }

        // Labels
        var showBadges = typeof _zoomIdx === 'undefined' || _zoomIdx >= 1;
        if (isExp || isCurr) {
            var lines = _wrapLabel(name, 14);
            var fontSize = isSett ? 10.5 : 9;
            var fontW = isSett ? '700 ' : '';
            var fontColor = isSett ? '#c4953a' : INK;
            for (var li = 0; li < lines.length; li++) {
                _cvText(ctx, lines[li], x, y + R + 10 + li * 10,
                    fontW + fontSize + 'px ' + _cvFontFamily, fontColor, 1, 'center');
            }
            // Underline flourish
            var lastLine = lines[lines.length - 1];
            var lw = lastLine.length * 3.5;
            var uy = y + R + 14 + (lines.length - 1) * 10;
            var fColor = isSett ? '#c4953a' : INK;
            var fOp = isSett ? 0.35 : 0.2;
            _cvLine(ctx, x - lw, uy, x + lw, uy, fColor, isSett ? 0.5 : 0.3, fOp);
        } else if (fog === 'known_mapped') {
            var lines2 = _wrapLabel(name, 14);
            var fs2 = isSett ? 10 : 9;
            var fc2 = isSett ? '#c4953a' : INK;
            for (var li2 = 0; li2 < lines2.length; li2++) {
                _cvText(ctx, lines2[li2], x, y + R + 8 + li2 * 10,
                    fs2 + 'px ' + _cvFontFamily, fc2, 0.4, 'center');
            }
        }

        // Quest badge (mini scroll)
        if (isExp && showBadges) {
            var locQuests = (S.quests || []).filter(function(q) { return q.loc === locId; });
            if (locQuests.length > 0) {
                var qx = x + R * 0.6, qy = y - R * 0.7;
                _cvRect(ctx, qx - 5, qy - 4, 10, 8, PARCHMENT, 0.9, INK_DARK, 0.5, 0.6);
                _cvEllipse(ctx, qx, qy - 4, 5.5, 1.2, PARCHMENT, 1, INK_DARK, 0.4, 0.5);
                if (locQuests.length > 1) {
                    _cvText(ctx, '' + locQuests.length, qx, qy, '700 6px ' + _cvFontFamily, INK_DARK, 0.7, 'center');
                } else {
                    _cvLine(ctx, qx - 3, qy - 1, qx + 3, qy - 1, INK_DARK, 0.3, 0.4);
                    _cvLine(ctx, qx - 3, qy + 1, qx + 2, qy + 1, INK_DARK, 0.3, 0.4);
                }
            }
        }

        // Dungeon indicators
        if (isExp && showBadges) {
            var locDg = (S.dungeons || {})[locId] || [];
            if (locDg.length > 0) {
                var ddx = x + R * 0.65, ddy = y + R * 0.5;
                var anyPending = false;
                for (var di2 = 0; di2 < locDg.length; di2++) { if (!locDg[di2].done) { anyPending = true; break; } }
                if (anyPending) {
                    // Star
                    var sr = 4, ir = 1.8;
                    ctx.beginPath();
                    for (var si3 = 0; si3 < 5; si3++) {
                        var outerA = (si3 * 72 - 90) * Math.PI / 180;
                        var innerA = ((si3 * 72 + 36) - 90) * Math.PI / 180;
                        if (si3 === 0) ctx.moveTo(ddx + Math.cos(outerA) * sr, ddy + Math.sin(outerA) * sr);
                        else ctx.lineTo(ddx + Math.cos(outerA) * sr, ddy + Math.sin(outerA) * sr);
                        ctx.lineTo(ddx + Math.cos(innerA) * ir, ddy + Math.sin(innerA) * ir);
                    }
                    ctx.closePath();
                    ctx.globalAlpha = 0.6; ctx.fillStyle = '#c4953a'; ctx.fill();
                    ctx.globalAlpha = 0.5; ctx.strokeStyle = INK_DARK; ctx.lineWidth = 0.4; ctx.stroke();
                } else {
                    // Checkmark
                    ctx.beginPath();
                    ctx.moveTo(ddx - 3, ddy); ctx.lineTo(ddx - 1, ddy + 2.5); ctx.lineTo(ddx + 3, ddy - 2.5);
                    ctx.globalAlpha = 0.7; ctx.strokeStyle = '#6a8a5a'; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.stroke();
                }
            }
        }

        ctx.restore();
    }
}
