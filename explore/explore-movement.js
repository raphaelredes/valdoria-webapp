// ═══════════════════════════════════════════════════════
// PLAYER MOVEMENT — animation, dust particles, ripple
// ═══════════════════════════════════════════════════════

let _moving = false;
let _moveStart = 0;
let _moveDuration = 280;
const MOVE_DURATION_NORMAL = 280;
const MOVE_DURATION_DIFFICULT = 500;

function setMoveDuration(ms) { _moveDuration = ms; }

let _moveFrom = { x: 0, y: 0 };
let _moveTo = { x: 0, y: 0 };
let _moveFromHex = { col: 0, row: 0 };
let _moveToHex = { col: 0, row: 0 };

// Current interpolated player screen position
let playerScreenX = 0;
let playerScreenY = 0;

// Player facing direction (angle in radians, 0=right, PI/2=down)
let playerFacing = Math.PI / 2; // default: facing down

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

    // Update facing direction based on movement vector
    const dx = _moveTo.x - _moveFrom.x;
    const dy = _moveTo.y - _moveFrom.y;
    playerFacing = Math.atan2(dy, dx);

    // Spawn dust at departure
    spawnDust(_moveFrom.x, _moveFrom.y, _moveTo.x, _moveTo.y);
}

function updateMovement(timestamp) {
    if (!_moving) return false;

    const elapsed = timestamp - _moveStart;
    let t = Math.min(1, elapsed / _moveDuration);

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

// Draw player miniature — scaled proportional to hex size
function drawPlayerToken(ctx, timestamp) {
    const t = (timestamp || 0) * 0.001;
    const breathe = Math.sin(t * 2.5) * 2;
    const px = playerScreenX;
    const py = playerScreenY + breathe;
    // Scale factor based on hex width (designed at HEX_W=55 baseline)
    const s = HEX_W / 55;

    ctx.save();

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(px, py + 3 * s, 14 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Cylindrical base (disc) ──
    const baseW = 13 * s;
    const baseH = 7 * s;
    const baseDepth = 4 * s;

    // Base cylinder side
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
    ctx.lineWidth = 1 * s;
    ctx.stroke();

    // ── Character body ──
    const bodyBase = py - 2 * s;

    // Legs
    ctx.fillStyle = '#3a3040';
    ctx.beginPath();
    ctx.moveTo(px - 4 * s, bodyBase);
    ctx.lineTo(px - 5.5 * s, bodyBase - 9 * s);
    ctx.lineTo(px - 2 * s, bodyBase - 9 * s);
    ctx.lineTo(px - 1.5 * s, bodyBase);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + 1.5 * s, bodyBase);
    ctx.lineTo(px + 2 * s, bodyBase - 9 * s);
    ctx.lineTo(px + 5.5 * s, bodyBase - 9 * s);
    ctx.lineTo(px + 4 * s, bodyBase);
    ctx.fill();

    // Torso
    const torsoTop = bodyBase - 20 * s;
    ctx.fillStyle = '#4a3a50';
    ctx.beginPath();
    ctx.moveTo(px - 6 * s, bodyBase - 9 * s);
    ctx.lineTo(px - 7 * s, torsoTop + 3 * s);
    ctx.lineTo(px + 7 * s, torsoTop + 3 * s);
    ctx.lineTo(px + 6 * s, bodyBase - 9 * s);
    ctx.closePath();
    ctx.fill();

    // Armor highlight
    ctx.fillStyle = '#5a4a60';
    ctx.beginPath();
    ctx.moveTo(px - 4 * s, bodyBase - 9 * s);
    ctx.lineTo(px - 5 * s, torsoTop + 5 * s);
    ctx.lineTo(px + 5 * s, torsoTop + 5 * s);
    ctx.lineTo(px + 4 * s, bodyBase - 9 * s);
    ctx.closePath();
    ctx.fill();

    // Shoulders
    ctx.fillStyle = '#4a3a50';
    ctx.fillRect(px - 9 * s, torsoTop + 1 * s, 18 * s, 4 * s);

    // Arms
    ctx.strokeStyle = '#3a3040';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(px - 8.5 * s, torsoTop + 4 * s);
    ctx.lineTo(px - 7.5 * s, bodyBase - 5 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + 8.5 * s, torsoTop + 4 * s);
    ctx.lineTo(px + 7.5 * s, bodyBase - 5 * s);
    ctx.stroke();

    // Head
    const headY = torsoTop - 2 * s;
    ctx.fillStyle = '#d4b896';
    ctx.beginPath();
    ctx.arc(px, headY, 6 * s, 0, Math.PI * 2);
    ctx.fill();

    // Hair/helmet
    ctx.fillStyle = '#3a2a20';
    ctx.beginPath();
    ctx.arc(px, headY - 1 * s, 6.5 * s, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    // ── Gold ring around base (pulsing) ──
    const glowPulse = 1 + Math.sin(t * 3) * 0.12;
    const ringAlpha = 0.45 + Math.sin(t * 3) * 0.15;
    ctx.strokeStyle = `rgba(196,149,58,${ringAlpha.toFixed(2)})`;
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.ellipse(px, py + 1, (baseW + 3) * glowPulse, (baseH + 2) * glowPulse, 0, 0, Math.PI * 2);
    ctx.stroke();

    // ── Direction indicator (subtle arrow on the ring) ──
    const arrowDist = (baseW + 6) * s;
    const arrowX = px + Math.cos(playerFacing) * arrowDist * 0.7;
    const arrowY = py + 1 + Math.sin(playerFacing) * arrowDist * 0.4;
    const arrowSize = 3 * s;
    ctx.fillStyle = `rgba(196,149,58,${(ringAlpha * 0.8).toFixed(2)})`;
    ctx.beginPath();
    ctx.moveTo(
        arrowX + Math.cos(playerFacing) * arrowSize,
        arrowY + Math.sin(playerFacing) * arrowSize * 0.5
    );
    ctx.lineTo(
        arrowX + Math.cos(playerFacing + 2.3) * arrowSize * 0.6,
        arrowY + Math.sin(playerFacing + 2.3) * arrowSize * 0.3
    );
    ctx.lineTo(
        arrowX + Math.cos(playerFacing - 2.3) * arrowSize * 0.6,
        arrowY + Math.sin(playerFacing - 2.3) * arrowSize * 0.3
    );
    ctx.closePath();
    ctx.fill();

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
