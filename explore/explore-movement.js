// ═══════════════════════════════════════════════════════
// PLAYER MOVEMENT — animation, dust particles, ripple
// ═══════════════════════════════════════════════════════

let _moving = false;
let _moveStart = 0;
let _moveDuration = 280;
const MOVE_DURATION_NORMAL = 280;
const MOVE_DURATION_DIFFICULT = 500;
const MOVE_DURATION_FAST = 160;
const MOVE_DURATION_CAUTIOUS = 450;

// Get movement duration based on travel pace + terrain + exhaustion
function getMoveDuration(isDifficult) {
    // D&D 5e: Exhaustion level 2+ halves speed, level 5 = can't move
    const exhMult = typeof getExhaustionSpeedMultiplier === 'function'
        ? getExhaustionSpeedMultiplier() : 1.0;
    if (exhMult === 0) return 99999; // Can't move at all (level 5)

    if (isDifficult) {
        // Difficult terrain: pace affects less (always slow-ish)
        let dBase;
        if (S.travelPace === 'fast') dBase = 380;
        else if (S.travelPace === 'cautious') dBase = 600;
        else dBase = MOVE_DURATION_DIFFICULT;
        return Math.round(dBase * exhMult);
    }
    let base;
    if (S.travelPace === 'fast') base = MOVE_DURATION_FAST;
    else if (S.travelPace === 'cautious') base = MOVE_DURATION_CAUTIOUS;
    else base = MOVE_DURATION_NORMAL;
    return Math.round(base * exhMult);
}

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
    playerScreenY -= Math.sin(t * Math.PI) * 14;

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

    // Biome-aware dust colors
    const _dustColors = {
        forest: ['rgba(100,90,70,','rgba(140,110,80,'],
        plains: ['rgba(200,160,80,','rgba(220,180,100,'],
        desert: ['rgba(210,170,80,','rgba(230,190,100,'],
        cave: ['rgba(120,110,100,','rgba(150,140,120,'],
        graveyard: ['rgba(100,95,90,','rgba(130,120,110,'],
        volcanic: ['rgba(180,100,50,','rgba(200,120,60,'],
        mountain: ['rgba(160,155,150,','rgba(180,175,165,'],
        swamp: ['rgba(80,100,60,','rgba(110,120,80,'],
    };
    const _dCols = _dustColors[typeof S !== 'undefined' && S.biome ? S.biome : 'cave'] || _dustColors.cave;
    for (let i = 0; i < 6; i++) {
        const angle = Math.atan2(ndy, ndx) + (Math.random() - 0.5) * 1.5;
        const speed = 15 + Math.random() * 25;
        _dustParticles.push({
            x: fromX,
            y: fromY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3,
            ay: 1.5,
            life: 1.0,
            decay: 1.8 + Math.random() * 0.8,
            size: 1.5 + Math.random() * 2.5,
            color: _dCols[i % _dCols.length],
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
        if (p.ay) p.vy += p.ay * dt; // gravity settling
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

// Draw player miniature — hooded traveler silhouette (generic, class-agnostic)

// ═══════════════════════════════════════════════════════
// CAMPFIRE VISUAL — animated fire near player during rest
// ═══════════════════════════════════════════════════════
let _campfireActive = false;
let _campfireParticles = [];

function setCampfireActive(active) {
    _campfireActive = active;
    if (!active) _campfireParticles = [];
}

function drawCampfire(ctx, timestamp) {
    if (!_campfireActive) return;
    const t = (timestamp || 0) * 0.001;
    const s = HEX_W / 55;
    // Position: offset from player (right side)
    const fx = playerScreenX + 12 * s;
    const fy = playerScreenY + 2 * s;

    ctx.save();

    // Warm glow (larger radius)
    const glowR = (14 + Math.sin(t * 4) * 3) * s;
    const glow = ctx.createRadialGradient(fx, fy - 4 * s, 0, fx, fy - 4 * s, glowR);
    glow.addColorStop(0, 'rgba(255, 140, 40, 0.15)');
    glow.addColorStop(0.6, 'rgba(255, 100, 20, 0.06)');
    glow.addColorStop(1, 'rgba(255, 60, 10, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(fx, fy - 4 * s, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Wood logs (small X shape)
    ctx.strokeStyle = 'rgba(60, 30, 10, 0.9)';
    ctx.lineWidth = 1.5 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(fx - 4 * s, fy + 1 * s);
    ctx.lineTo(fx + 4 * s, fy - 1 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx - 3.5 * s, fy - 1 * s);
    ctx.lineTo(fx + 3.5 * s, fy + 1 * s);
    ctx.stroke();

    // Fire — flickering flame shapes
    for (let i = 0; i < 3; i++) {
        const phase = t * (5 + i) + i * 2.1;
        const flicker = Math.sin(phase) * 1.5 * s;
        const h = (6 + Math.sin(phase * 0.7) * 2) * s;
        const ox = (i - 1) * 2.2 * s + flicker * 0.3;

        // Outer flame (orange)
        ctx.fillStyle = i === 1 ? 'rgba(255, 120, 20, 0.7)' : 'rgba(255, 80, 10, 0.5)';
        ctx.beginPath();
        ctx.moveTo(fx + ox - 1.8 * s, fy);
        ctx.quadraticCurveTo(fx + ox - 0.5 * s + flicker, fy - h, fx + ox, fy - h - 1.5 * s);
        ctx.quadraticCurveTo(fx + ox + 0.5 * s - flicker, fy - h, fx + ox + 1.8 * s, fy);
        ctx.closePath();
        ctx.fill();

        // Inner flame (yellow-white core, only center)
        if (i === 1) {
            ctx.fillStyle = 'rgba(255, 220, 100, 0.6)';
            ctx.beginPath();
            ctx.moveTo(fx + ox - 0.8 * s, fy);
            ctx.quadraticCurveTo(fx + ox + flicker * 0.5, fy - h * 0.7, fx + ox, fy - h * 0.6);
            ctx.quadraticCurveTo(fx + ox - flicker * 0.5, fy - h * 0.7, fx + ox + 0.8 * s, fy);
            ctx.closePath();
            ctx.fill();
        }
    }

    // Sparks (small particles rising)
    if (Math.random() < 0.3 && _campfireParticles.length < 6) {
        _campfireParticles.push({
            x: fx + (Math.random() - 0.5) * 4 * s,
            y: fy - 2 * s,
            vx: (Math.random() - 0.5) * 0.3 * s,
            vy: -0.6 * s - Math.random() * 0.3 * s,
            life: 1.0
        });
    }
    for (let i = _campfireParticles.length - 1; i >= 0; i--) {
        const p = _campfireParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.025;
        if (p.life <= 0) { _campfireParticles.splice(i, 1); continue; }
        ctx.fillStyle = `rgba(255, ${Math.floor(140 + p.life * 80)}, 40, ${p.life * 0.6})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.8 * s * p.life, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawPlayerToken(ctx, timestamp) {
    const t = (timestamp || 0) * 0.001;
    const breathe = Math.sin(t * 2.5) * 1.5;
    const px = playerScreenX;
    const py = playerScreenY + breathe;
    // Scale factor based on hex width (designed at HEX_W=55 baseline)
    const s = HEX_W / 55;

    ctx.save();

    // ── Ground shadow ──
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(px, py + 2 * s, 10 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Colors (dark silhouette like the travel animation)
    const bodyColor = 'rgba(20,16,14,0.85)';
    const cloakColor = 'rgba(30,24,20,0.80)';

    // Subtle sway
    const sway = Math.sin(t * 0.8) * 0.4 * s;

    ctx.save();
    ctx.translate(px + sway, py);

    // ── Legs (slight idle shift) ──
    const legShift = Math.sin(t * 1.2) * 0.8 * s;
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2.2 * s;
    ctx.lineCap = 'round';
    // Back leg
    ctx.beginPath();
    ctx.moveTo(-1.2 * s, -6 * s);
    ctx.lineTo(-1.2 * s - legShift * 0.4, 0);
    ctx.stroke();
    // Front leg
    ctx.beginPath();
    ctx.moveTo(1.2 * s, -6 * s);
    ctx.lineTo(1.2 * s + legShift * 0.4, 0);
    ctx.stroke();

    // ── Body (torso ellipse) ──
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, -12 * s, 3.8 * s, 6.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Cloak (flowing behind, animated) ──
    const cloakWave = Math.sin(t * 3) * 1.8 * s;
    ctx.fillStyle = cloakColor;
    ctx.beginPath();
    ctx.moveTo(-2.5 * s, -17 * s);
    ctx.quadraticCurveTo(-5.5 * s - cloakWave, -11 * s, -4.5 * s - cloakWave * 1.2, -4 * s);
    ctx.quadraticCurveTo(-3.5 * s, -8 * s, -2.5 * s, -6 * s);
    ctx.closePath();
    ctx.fill();

    // ── Backpack (small bump on back) ──
    ctx.fillStyle = cloakColor;
    ctx.beginPath();
    ctx.ellipse(-3.2 * s, -13 * s, 2.8 * s, 3.2 * s, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // ── Head ──
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, -19 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();

    // ── Hood (pointed, medieval) ──
    ctx.fillStyle = cloakColor;
    ctx.beginPath();
    ctx.moveTo(-3.2 * s, -19 * s);
    ctx.quadraticCurveTo(-1 * s, -26 * s, 1.2 * s, -21.5 * s);
    ctx.quadraticCurveTo(2.2 * s, -18 * s, 3.2 * s, -17 * s);
    ctx.lineTo(-3.2 * s, -17 * s);
    ctx.closePath();
    ctx.fill();

    // ── Staff (walking stick, slight sway) ──
    const staffTilt = Math.sin(t * 1.5) * 1 * s;
    ctx.strokeStyle = 'rgba(60,45,30,0.8)';
    ctx.lineWidth = 1.6 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(4.5 * s + staffTilt, -21 * s);
    ctx.lineTo(6.5 * s - staffTilt * 0.5, 1 * s);
    ctx.stroke();

    // Staff top knob
    ctx.fillStyle = 'rgba(80,65,45,0.7)';
    ctx.beginPath();
    ctx.arc(4.5 * s + staffTilt, -21.5 * s, 1.3 * s, 0, Math.PI * 2);
    ctx.fill();

    // ── Rim light (golden edge highlight) ──
    ctx.strokeStyle = 'rgba(196,149,58,0.2)';
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(3.2 * s, -17 * s);
    ctx.quadraticCurveTo(4.2 * s, -12 * s, 3.8 * s, -6 * s);
    ctx.stroke();

    ctx.restore(); // undo translate

    // ── Gold ring around feet (pulsing, context-aware) ──
    const ringW = 12 * s;
    const ringH = 6 * s;
    const glowPulse = 1 + Math.sin(t * 3) * 0.12;
    const ringAlpha = 0.45 + Math.sin(t * 3) * 0.15;
    // Night: warm orange glow; Low HP: red warning
    let _rR = 196, _rG = 149, _rB = 58;
    if (typeof S !== 'undefined' && S.dayPhase === 'night') { _rR = 255; _rG = 190; _rB = 90; }
    if (typeof S !== 'undefined' && S.dayPhase === 'dusk') { _rR = 220; _rG = 150; _rB = 70; }
    if (typeof getHPPercent === 'function' && getHPPercent() <= 25) { _rR = 210; _rG = 70; _rB = 60; }
    ctx.strokeStyle = `rgba(${_rR},${_rG},${_rB},${ringAlpha.toFixed(2)})`;
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.ellipse(px, py + 1, (ringW + 2) * glowPulse, (ringH + 1) * glowPulse, 0, 0, Math.PI * 2);
    ctx.stroke();

    // ── Direction indicator (subtle arrow on the ring) ──
    const arrowDist = (ringW + 5) * s;
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
