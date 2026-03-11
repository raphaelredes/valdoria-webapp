// =====================================================
// FOG OF WAR -- Navigate-style warm brown fog with organic edges
// Inspired by the world map (navigate) fog system
// =====================================================

let _fogCanvas = null;
let _fogCtx = null;
let _fogReveals = []; // Active reveal animations {cx, cy, progress, maxRadius}

const FOG_COLOR = '#2a2420'; // Warm dark brown (matches medieval theme)

// Deterministic pseudo-random (same seed = same result, no flicker)
function _fogSrand(seed) {
    let x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
}

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

// Mark hexes as explored in fogState (permanent)
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

// =====================================================
// MAIN FOG RENDER -- Navigate-style with organic edges
// =====================================================
function drawFogOverlay(mainCtx, canvasW, canvasH, fogState) {
    if (!_fogCtx) return;

    _fogCtx.setTransform(1, 0, 0, 1, 0, 0);
    _fogCtx.clearRect(0, 0, _fogCanvas.width, _fogCanvas.height);
    _fogCtx.scale(_dpr, _dpr);

    // -- STEP 1: Fill with warm brown fog --
    _fogCtx.globalCompositeOperation = 'source-over';
    _fogCtx.fillStyle = FOG_COLOR;
    _fogCtx.fillRect(0, 0, canvasW, canvasH);

    // -- STEP 2: Collect reveal points --
    const playerC = S.playerCol;
    const playerR = S.playerRow;
    const reveals = [];

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

            let radius, strength, flatZone;

            if (distToPlayer === 0) {
                radius = HEX_W * 1.1;
                strength = 1.0;
                flatZone = 0.55;
            } else if (distToPlayer === 1) {
                radius = HEX_W * 0.9;
                strength = 0.97;
                flatZone = 0.5;
            } else if (distToPlayer === 2 && state === 'visible') {
                radius = HEX_W * 0.7;
                strength = 0.6;
                flatZone = 0.35;
            } else if (state === 'visible') {
                radius = HEX_W * 0.55;
                strength = 0.35;
                flatZone = 0.25;
            } else if (state === 'dim') {
                radius = HEX_W * 0.4;
                strength = 0.15;
                flatZone = 0.15;
            } else {
                continue;
            }

            reveals.push({ x: center.x, y: vy, radius, strength, flatZone });
        }
    }

    // -- STEP 3: Punch reveal holes with radial gradients --
    _fogCtx.globalCompositeOperation = 'destination-out';

    for (const { x, y, radius, strength, flatZone } of reveals) {
        const grad = _fogCtx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `rgba(0,0,0,${strength})`);
        grad.addColorStop(flatZone, `rgba(0,0,0,${strength})`);
        grad.addColorStop(flatZone + 0.2, `rgba(0,0,0,${strength * 0.4})`);
        grad.addColorStop(flatZone + 0.35, `rgba(0,0,0,${strength * 0.08})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        _fogCtx.fillStyle = grad;
        _fogCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    // -- STEP 4: Animated reveals (expanding glow during movement) --
    for (const rev of _fogReveals) {
        const currentR = rev.maxRadius * rev.progress;
        const grad = _fogCtx.createRadialGradient(rev.x, rev.y, 0, rev.x, rev.y, currentR);
        grad.addColorStop(0, `rgba(0,0,0,${0.7 * rev.progress})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        _fogCtx.fillStyle = grad;
        _fogCtx.fillRect(rev.x - currentR, rev.y - currentR, currentR * 2, currentR * 2);
    }

    // -- STEP 5: Organic edge splotches (prevent perfect circles) --
    _fogCtx.globalCompositeOperation = 'destination-out';
    for (let ri = 0; ri < reveals.length; ri++) {
        const { x, y, radius, strength, flatZone } = reveals[ri];
        if (strength < 0.3) continue; // Only strong reveals get organic edges
        const edgeR = radius * (flatZone + 0.25);
        const nBlobs = Math.floor(8 + strength * 6);

        for (let j = 0; j < nBlobs; j++) {
            const angle = _fogSrand(x * 100 + y * 200 + j * 37) * Math.PI * 2;
            const dist = edgeR * (0.8 + _fogSrand(y * 300 + x * 400 + j * 53) * 0.5);
            const bx = x + Math.cos(angle) * dist;
            const by = y + Math.sin(angle) * dist;
            const blobR = 1.5 + _fogSrand(x * 500 + j * 71) * 3;
            const blobAlpha = strength * 0.12;

            _fogCtx.fillStyle = `rgba(0,0,0,${blobAlpha})`;
            _fogCtx.beginPath();
            const nPts = 5 + Math.floor(_fogSrand(j * 97 + x) * 3);
            for (let k = 0; k < nPts; k++) {
                const a = (k / nPts) * Math.PI * 2;
                const wobble = blobR * (0.4 + _fogSrand(j * 100 + k * 41 + x) * 0.8);
                const px = bx + Math.cos(a) * wobble;
                const py = by + Math.sin(a) * wobble;
                if (k === 0) _fogCtx.moveTo(px, py);
                else _fogCtx.lineTo(px, py);
            }
            _fogCtx.closePath();
            _fogCtx.fill();
        }
    }

    // -- STEP 6: Parchment texture on fog (medieval feel) --
    _fogCtx.globalCompositeOperation = 'source-atop';

    // Fine stipple dots
    _fogCtx.fillStyle = 'rgba(58, 40, 16, 0.04)';
    for (let i = 0; i < 150; i++) {
        const nx = _fogSrand(i * 73 + 11) * canvasW;
        const ny = _fogSrand(i * 79 + 17) * canvasH;
        const cr = 0.3 + _fogSrand(i * 83) * 0.5;
        _fogCtx.beginPath();
        _fogCtx.arc(nx, ny, cr, 0, Math.PI * 2);
        _fogCtx.fill();
    }

    // Crosshatch lines
    _fogCtx.strokeStyle = 'rgba(58, 40, 16, 0.03)';
    _fogCtx.lineWidth = 0.5;
    for (let i = 0; i < 25; i++) {
        const sx = _fogSrand(i * 113 + 7) * canvasW;
        const sy = _fogSrand(i * 127 + 13) * canvasH;
        const angle = _fogSrand(i * 137 + 19) * Math.PI;
        const len = 4 + _fogSrand(i * 149) * 8;
        _fogCtx.beginPath();
        _fogCtx.moveTo(sx, sy);
        _fogCtx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
        _fogCtx.stroke();
    }

    _fogCtx.globalCompositeOperation = 'source-over';

    // -- Draw fog onto main canvas --
    mainCtx.save();
    mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    mainCtx.drawImage(_fogCanvas, 0, 0);
    mainCtx.restore();
}
