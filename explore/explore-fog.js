// ═══════════════════════════════════════════════════════
// FOG OF WAR — Solid black, proximity-based visibility
// ═══════════════════════════════════════════════════════

let _fogCanvas = null;
let _fogCtx = null;
let _fogReveals = []; // Active reveal animations {cx, cy, progress, maxRadius}

function initFog(width, height) {
    _fogCanvas = document.createElement('canvas');
    _fogCanvas.width = width;
    _fogCanvas.height = height;
    _fogCtx = _fogCanvas.getContext('2d');
}

function resizeFog(width, height) {
    if (_fogCanvas) {
        _fogCanvas.width = width;
        _fogCanvas.height = height;
    }
}

// Mark hexes as explored in fogState (permanent — survives movement)
function revealFogAt(cx, cy, radius, fogState, grid, animate) {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const dist = hexDist(c, r, cx, cy);
            const key = `${c},${r}`;
            if (dist <= radius) {
                if (fogState[key] !== 'visible' && animate) {
                    const center = hexToScreen(c, r);
                    _fogReveals.push({
                        x: center.x,
                        y: center.y,
                        progress: 0,
                        maxRadius: HEX_W * 0.6,
                    });
                }
                fogState[key] = 'visible';
            } else if (dist <= radius + 1 && fogState[key] !== 'visible') {
                fogState[key] = 'dim';
            }
        }
    }
}

// Update reveal animations, return true if any are active
function updateFogAnimations(dt) {
    if (_fogReveals.length === 0) return false;
    for (let i = _fogReveals.length - 1; i >= 0; i--) {
        _fogReveals[i].progress += dt * 2.5;
        if (_fogReveals[i].progress >= 1) {
            _fogReveals.splice(i, 1);
        }
    }
    return _fogReveals.length > 0;
}

// Draw fog overlay — solid black with proximity-based holes
function drawFogOverlay(mainCtx, canvasW, canvasH, fogState) {
    if (!_fogCtx) return;

    // Scale fog canvas buffer properly
    _fogCtx.setTransform(1, 0, 0, 1, 0, 0);
    _fogCtx.clearRect(0, 0, _fogCanvas.width, _fogCanvas.height);
    _fogCtx.scale(_dpr, _dpr);

    // Fill entirely with solid black
    _fogCtx.fillStyle = '#000000';
    _fogCtx.fillRect(0, 0, canvasW, canvasH);

    // Punch holes based on proximity to CURRENT player position + exploration state
    _fogCtx.globalCompositeOperation = 'destination-out';

    const playerC = S.playerCol;
    const playerR = S.playerRow;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const key = `${c},${r}`;
            const state = fogState[key];
            if (!state || state === 'hidden') continue;

            const distToPlayer = hexDist(c, r, playerC, playerR);
            const center = hexToScreen(c, r);
            const tile = S.grid[r] && S.grid[r][c] ? S.grid[r][c] : '.';
            const h = (TILE_HEIGHT[tile] || 1) * UNIT_PX;
            const vy = center.y - h * 0.3;

            let opacity, gradRadius;

            if (distToPlayer === 0) {
                // Player's hex — fully clear
                opacity = 1;
                gradRadius = HEX_W * 0.7;
            } else if (distToPlayer === 1) {
                // Adjacent — clear
                opacity = 0.95;
                gradRadius = HEX_W * 0.6;
            } else if (distToPlayer === 2 && state === 'visible') {
                // 2 hexes away — dim if explored
                opacity = 0.3;
                gradRadius = HEX_W * 0.45;
            } else if (state === 'visible') {
                // Explored but far — barely visible silhouette
                opacity = 0.12;
                gradRadius = HEX_W * 0.35;
            } else if (state === 'dim') {
                // Edge of exploration — faint hint
                opacity = 0.06;
                gradRadius = HEX_W * 0.3;
            } else {
                continue;
            }

            const grad = _fogCtx.createRadialGradient(center.x, vy, 0, center.x, vy, gradRadius);
            grad.addColorStop(0, `rgba(0,0,0,${opacity})`);
            grad.addColorStop(0.6, `rgba(0,0,0,${opacity * 0.6})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            _fogCtx.fillStyle = grad;
            _fogCtx.fillRect(center.x - gradRadius, vy - gradRadius, gradRadius * 2, gradRadius * 2);
        }
    }

    // Animated reveals (expanding glow during movement)
    for (const rev of _fogReveals) {
        const currentR = rev.maxRadius * rev.progress;
        const grad = _fogCtx.createRadialGradient(rev.x, rev.y, 0, rev.x, rev.y, currentR);
        grad.addColorStop(0, `rgba(0,0,0,${0.7 * rev.progress})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        _fogCtx.fillStyle = grad;
        _fogCtx.fillRect(rev.x - currentR, rev.y - currentR, currentR * 2, currentR * 2);
    }

    _fogCtx.globalCompositeOperation = 'source-over';

    // Draw the fog mask onto the main canvas (at native resolution)
    mainCtx.save();
    mainCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset to pixel coords
    mainCtx.drawImage(_fogCanvas, 0, 0);
    mainCtx.restore();
}
