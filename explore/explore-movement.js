// ═══════════════════════════════════════════════════════
// PLAYER MOVEMENT — animation, dust particles, ripple
// ═══════════════════════════════════════════════════════

let _moving = false;
let _moveStart = 0;
const MOVE_DURATION = 280;

let _moveFrom = { x: 0, y: 0 };
let _moveTo = { x: 0, y: 0 };
let _moveFromHex = { col: 0, row: 0 };
let _moveToHex = { col: 0, row: 0 };

// Current interpolated player screen position
let playerScreenX = 0;
let playerScreenY = 0;

// Effects
let _dustParticles = [];
let _ripples = [];

function isMoving() { return _moving; }

function startMovement(fromCol, fromRow, toCol, toRow) {
    if (_moving) return;
    _moving = true;
    _moveStart = performance.now();

    _moveFromHex = { col: fromCol, row: fromRow };
    _moveToHex = { col: toCol, row: toRow };

    const from = hexToScreen(fromCol, fromRow);
    const to = hexToScreen(toCol, toRow);

    // Offset by tile height
    const fromTile = S.grid[fromRow] && S.grid[fromRow][fromCol] ? S.grid[fromRow][fromCol] : '.';
    const toTile = S.grid[toRow] && S.grid[toRow][toCol] ? S.grid[toRow][toCol] : '.';
    const fromH = (TILE_HEIGHT[fromTile] || 1) * UNIT_PX;
    const toH = (TILE_HEIGHT[toTile] || 1) * UNIT_PX;

    _moveFrom = { x: from.x, y: from.y - fromH };
    _moveTo = { x: to.x, y: to.y - toH };

    playerScreenX = _moveFrom.x;
    playerScreenY = _moveFrom.y;

    // Spawn dust at departure
    spawnDust(_moveFrom.x, _moveFrom.y, _moveTo.x, _moveTo.y);
}

function updateMovement(timestamp) {
    if (!_moving) return false;

    const elapsed = timestamp - _moveStart;
    let t = Math.min(1, elapsed / MOVE_DURATION);

    // Cubic-bezier approximation (spring overshoot)
    const ease = cubicBezierApprox(t);

    playerScreenX = _moveFrom.x + (_moveTo.x - _moveFrom.x) * ease;
    playerScreenY = _moveFrom.y + (_moveTo.y - _moveFrom.y) * ease;

    // Hop arc: parabolic rise at midpoint
    playerScreenY -= Math.sin(t * Math.PI) * 8;

    if (t >= 1) {
        _moving = false;
        playerScreenX = _moveTo.x;
        playerScreenY = _moveTo.y;
        // Spawn arrival ripple
        spawnRipple(_moveTo.x, _moveTo.y);
        // Trigger post-move logic
        if (typeof onMoveComplete === 'function') {
            onMoveComplete(_moveToHex.col, _moveToHex.row);
        }
    }

    return true;
}

// Approximate cubic-bezier(0.34, 1.4, 0.64, 1) — spring overshoot
function cubicBezierApprox(t) {
    // Simple approximation: ease-out with slight overshoot
    const p = 1 - (1 - t);
    return 1 - Math.pow(1 - t, 2.5) + Math.sin(t * Math.PI) * 0.08;
}

// Dust particle system
function spawnDust(fromX, fromY, toX, toY) {
    const dx = fromX - toX;
    const dy = fromY - toY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ndx = dx / len;
    const ndy = dy / len;

    for (let i = 0; i < 6; i++) {
        const angle = Math.atan2(ndy, ndx) + (Math.random() - 0.5) * 1.5;
        const speed = 15 + Math.random() * 25;
        _dustParticles.push({
            x: fromX,
            y: fromY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: 1.8 + Math.random() * 0.8,
            size: 1.5 + Math.random() * 2.5,
            color: Math.random() > 0.5 ? 'rgba(196,149,58,' : 'rgba(180,170,150,',
        });
    }
}

// Ripple effect at arrival
function spawnRipple(x, y) {
    _ripples.push({
        x, y,
        radius: 4,
        maxRadius: HEX_W * 0.6,
        alpha: 0.6,
        speed: 80,
    });
}

// Update all transient effects
function updateEffects(dt) {
    let active = false;

    // Dust particles
    for (let i = _dustParticles.length - 1; i >= 0; i--) {
        const p = _dustParticles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.life -= p.decay * dt;
        if (p.life <= 0) {
            _dustParticles.splice(i, 1);
        } else {
            active = true;
        }
    }

    // Ripples
    for (let i = _ripples.length - 1; i >= 0; i--) {
        const r = _ripples[i];
        r.radius += r.speed * dt;
        r.alpha -= 1.2 * dt;
        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
            _ripples.splice(i, 1);
        } else {
            active = true;
        }
    }

    return active;
}

// Draw all effects onto the canvas
function drawEffects(ctx) {
    // Dust
    for (const p of _dustParticles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (p.life * 0.7).toFixed(2) + ')';
        ctx.fill();
    }

    // Ripples (hex-shaped expanding ring)
    for (const r of _ripples) {
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(196,149,58,${r.alpha.toFixed(2)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// Draw 2.5D player miniature (tabletop RPG style)
function drawPlayerToken(ctx, timestamp) {
    const t = (timestamp || 0) * 0.001;
    const breathe = Math.sin(t * 2.5) * 1.5; // Subtle breathing animation
    const px = playerScreenX;
    const py = playerScreenY + breathe;

    ctx.save();

    // Ground shadow (ellipse)
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(px, py + 2, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Cylindrical base (disc) ──
    const baseW = 9;  // Half-width of base ellipse
    const baseH = 4;  // Half-height of base ellipse (iso foreshortening)
    const baseDepth = 3; // Side depth of the base cylinder

    // Base cylinder side (darker)
    ctx.fillStyle = '#8a6d2a';
    ctx.beginPath();
    ctx.ellipse(px, py + baseDepth, baseW, baseH, 0, 0, Math.PI);
    ctx.lineTo(px - baseW, py);
    ctx.ellipse(px, py, baseW, baseH, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();

    // Base top face (gold)
    ctx.fillStyle = '#c4953a';
    ctx.beginPath();
    ctx.ellipse(px, py, baseW, baseH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a07828';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // ── Character body (simple humanoid silhouette) ──
    const bodyBase = py - 1;

    // Legs (two small trapezoids)
    ctx.fillStyle = '#3a3040';
    ctx.beginPath();
    ctx.moveTo(px - 3, bodyBase);
    ctx.lineTo(px - 4, bodyBase - 6);
    ctx.lineTo(px - 1.5, bodyBase - 6);
    ctx.lineTo(px - 1, bodyBase);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + 1, bodyBase);
    ctx.lineTo(px + 1.5, bodyBase - 6);
    ctx.lineTo(px + 4, bodyBase - 6);
    ctx.lineTo(px + 3, bodyBase);
    ctx.fill();

    // Torso (tapered rectangle)
    const torsoTop = bodyBase - 14;
    ctx.fillStyle = '#4a3a50';
    ctx.beginPath();
    ctx.moveTo(px - 4.5, bodyBase - 6);
    ctx.lineTo(px - 5, torsoTop + 2);
    ctx.lineTo(px + 5, torsoTop + 2);
    ctx.lineTo(px + 4.5, bodyBase - 6);
    ctx.closePath();
    ctx.fill();

    // Armor/clothing highlight
    ctx.fillStyle = '#5a4a60';
    ctx.beginPath();
    ctx.moveTo(px - 3, bodyBase - 6);
    ctx.lineTo(px - 3.5, torsoTop + 4);
    ctx.lineTo(px + 3.5, torsoTop + 4);
    ctx.lineTo(px + 3, bodyBase - 6);
    ctx.closePath();
    ctx.fill();

    // Shoulders (wider rectangles)
    ctx.fillStyle = '#4a3a50';
    ctx.fillRect(px - 6.5, torsoTop + 1, 13, 3);

    // Arms (small lines down from shoulders)
    ctx.strokeStyle = '#3a3040';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px - 6, torsoTop + 3);
    ctx.lineTo(px - 5.5, bodyBase - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + 6, torsoTop + 3);
    ctx.lineTo(px + 5.5, bodyBase - 4);
    ctx.stroke();

    // Head (circle)
    const headY = torsoTop - 1;
    ctx.fillStyle = '#d4b896'; // Skin tone
    ctx.beginPath();
    ctx.arc(px, headY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Hair/helmet (top half of head)
    ctx.fillStyle = '#3a2a20';
    ctx.beginPath();
    ctx.arc(px, headY - 0.5, 4.2, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    // ── Gold highlight ring around base ──
    const glowPulse = 1 + Math.sin(t * 3) * 0.15;
    ctx.strokeStyle = `rgba(196,149,58,${0.4 + Math.sin(t * 3) * 0.15})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(px, py + 1, baseW + 2 * glowPulse, (baseH + 1) * glowPulse, 0, 0, Math.PI * 2);
    ctx.stroke();

    // ── Class icon floating above head ──
    const icon = (S.charData && S.charData.ci) ? S.charData.ci : '⚔️';
    const iconFloat = Math.sin(t * 2) * 1.5;
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, px, headY - 9 + iconFloat);

    ctx.restore();
}

// Initialize player position to a hex
function initPlayerPosition(col, row) {
    const center = hexToScreen(col, row);
    const tile = S.grid[row] && S.grid[row][col] ? S.grid[row][col] : '.';
    const h = (TILE_HEIGHT[tile] || 1) * UNIT_PX;
    playerScreenX = center.x;
    playerScreenY = center.y - h;
}
