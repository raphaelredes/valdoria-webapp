// ═══════════════════════════════════════════════════════
// CANVAS RENDERER — main render loop, tile drawing, camera
// ═══════════════════════════════════════════════════════

let _canvas = null;
let _ctx = null;
let _dpr = 1;
let _canvasLogicalW = 0;
let _canvasLogicalH = 0;

let _needsRender = true;
let _rafId = null;
let _lastTimestamp = 0;

// Static tile layer (cached for performance)
let _staticCanvas = null;
let _staticCtx = null;
let _staticDirty = true;

function initRenderer() {
    _canvas = document.getElementById('iso-map');
    if (!_canvas) return;
    _ctx = _canvas.getContext('2d');
    _dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Get viewport dimensions (between HUD and bottom bar)
    const viewport = document.getElementById('map-viewport');
    const vpW = viewport ? viewport.clientWidth : 390;
    const vpH = viewport ? viewport.clientHeight : 700;

    // Calculate hex size to fit viewport width (no horizontal scroll)
    const size = calcHexSizeForViewport(vpW, vpH, COLS, ROWS);
    _canvasLogicalW = size.w;
    _canvasLogicalH = size.h;

    _canvas.width = Math.round(size.w * _dpr);
    _canvas.height = Math.round(size.h * _dpr);
    _canvas.style.width = size.w + 'px';
    _canvas.style.height = size.h + 'px';
    _ctx.scale(_dpr, _dpr);

    // Static tile cache
    _staticCanvas = document.createElement('canvas');
    _staticCanvas.width = _canvas.width;
    _staticCanvas.height = _canvas.height;
    _staticCtx = _staticCanvas.getContext('2d');
    _staticCtx.scale(_dpr, _dpr);
    _staticDirty = true;

    // Fog init
    initFog(_canvas.width, _canvas.height);

    // Click handler on canvas
    _canvas.addEventListener('click', handleCanvasClick);

    // Start render loop
    scheduleRender();
}

function scheduleRender() {
    _needsRender = true;
    if (!_rafId) {
        _rafId = requestAnimationFrame(renderLoop);
    }
}

function renderLoop(timestamp) {
    const dt = Math.min(0.05, (timestamp - _lastTimestamp) / 1000); // Cap dt
    _lastTimestamp = timestamp;

    const movingActive = updateMovement(timestamp);
    const effectsActive = updateEffects(dt);
    const fogActive = updateFogAnimations(dt);
    const particlesActive = typeof updateParticles === 'function' ? updateParticles(dt) : false;

    const flashActive = _hexFlashes.length > 0;
    const hasAnimations = movingActive || effectsActive || fogActive || particlesActive || flashActive;

    if (_needsRender || hasAnimations) {
        renderFrame(timestamp);
        _needsRender = false;
    }

    if (hasAnimations) {
        _rafId = requestAnimationFrame(renderLoop);
    } else {
        _rafId = null;
    }
}

function renderFrame(timestamp) {
    _ctx.clearRect(0, 0, _canvasLogicalW, _canvasLogicalH);

    // 1. Background (matches #map-viewport CSS)
    _ctx.fillStyle = '#1a1520';
    _ctx.fillRect(0, 0, _canvasLogicalW, _canvasLogicalH);

    // 2. Draw static tiles (cached unless dirty)
    if (_staticDirty) {
        renderStaticTiles(timestamp);
        _staticDirty = false;
    }
    // Draw cached static layer
    _ctx.drawImage(_staticCanvas, 0, 0, _canvasLogicalW, _canvasLogicalH);

    // 3. Adjacent hex highlights (dynamic — depends on player position)
    drawAdjacentHighlights(_ctx);

    // 4. Dynamic tile decorations (water waves, lava glow)
    drawAnimatedTiles(_ctx, timestamp);

    // 5. POI markers (bounce animation)
    drawPOIMarkers(_ctx, timestamp);

    // 6. Exit portal glow
    drawExitPortalGlow(_ctx, timestamp);

    // 7. Effects (dust, ripples)
    drawEffects(_ctx);

    // 7.5 POI discovery flash
    drawHexFlashes(_ctx, timestamp);

    // 8. Player token
    drawPlayerToken(_ctx, timestamp);

    // 9. Ambient particles
    if (typeof drawParticles === 'function') {
        drawParticles(_ctx, timestamp);
    }

    // 10. Fog of war (drawn last, on top of everything)
    drawFogOverlay(_ctx, _canvasLogicalW, _canvasLogicalH, S.fogState);
}

// Render all static tiles to the cache canvas
function renderStaticTiles(timestamp) {
    _staticCtx.clearRect(0, 0, _canvasLogicalW, _canvasLogicalH);

    const biome = S.biome || 'forest';
    const colors = BIOME_COLORS[biome] || BIOME_COLORS.forest;

    // Draw back-to-front (painter's algorithm)
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            drawTile(_staticCtx, col, row, biome, colors, 0);
        }
    }
}

// Draw a single tile: top face + side faces + static decorations
function drawTile(ctx, col, row, biome, colors, timestamp) {
    let tile = S.grid[row] && S.grid[row][col] ? S.grid[row][col] : '.';

    // Convert special tiles to base for color lookup
    const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
    const color = colors[baseTile] || colors['.'] || '#3a3a3a';
    const height = (TILE_HEIGHT[baseTile] || 1);
    const heightPx = height * UNIT_PX;

    const center = hexToScreen(col, row);
    const cx = center.x;
    const cy = center.y;

    // Top face vertices (shifted up by height)
    const topVerts = hexTopVertices(cx, cy - heightPx);

    // Side faces (only for tiles with height > 0)
    if (heightPx > 0) {
        // Left side face (darker)
        const leftVerts = hexLeftSideVertices(cx, cy - heightPx, heightPx);
        fillPoly(ctx, leftVerts, darken(color, 0.55));

        // Right side face (slightly less dark)
        const rightVerts = hexRightSideVertices(cx, cy - heightPx, heightPx);
        fillPoly(ctx, rightVerts, darken(color, 0.7));

        // Front bottom face (darkest)
        const frontVerts = hexFrontSideVertices(cx, cy - heightPx, heightPx);
        fillPoly(ctx, frontVerts, darken(color, 0.45));
    }

    // Top face fill
    fillPoly(ctx, topVerts, color);

    // Subtle top-face shading (light from top-left)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(topVerts[0].x, topVerts[0].y);
    for (let i = 1; i < topVerts.length; i++) {
        ctx.lineTo(topVerts[i].x, topVerts[i].y);
    }
    ctx.closePath();
    ctx.clip();

    // Light gradient across top face
    const grad = ctx.createLinearGradient(cx - HEX_W / 2, cy - heightPx - HEX_H / 2, cx + HEX_W / 2, cy - heightPx + HEX_H / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.08)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.02)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - HEX_W / 2, cy - heightPx - HEX_H / 2, HEX_W, HEX_H);

    // Static decorations (trees, rocks, etc. — not animated ones)
    if (baseTile !== 'w' && baseTile !== 'W' && baseTile !== 'L') {
        drawTileDecoration(ctx, cx, cy - heightPx, baseTile, biome, col, row, 0);
    }

    ctx.restore();

    // Wall brick pattern on side faces
    if (baseTile === '#' && heightPx > 0) {
        drawWallDecoration(ctx, cx, cy - heightPx, heightPx, col, row);
    }

    // Tile edge outline (subtle)
    ctx.beginPath();
    ctx.moveTo(topVerts[0].x, topVerts[0].y);
    for (let i = 1; i < topVerts.length; i++) {
        ctx.lineTo(topVerts[i].x, topVerts[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
}

// Draw animated tile decorations (water, lava — skip static cache)
function drawAnimatedTiles(ctx, timestamp) {
    const biome = S.biome || 'forest';
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const tile = S.grid[row] && S.grid[row][col] ? S.grid[row][col] : '.';
            const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
            if (baseTile === 'w' || baseTile === 'W' || baseTile === 'L') {
                const center = hexToScreen(col, row);
                const h = (TILE_HEIGHT[baseTile] || 0) * UNIT_PX;
                // Clip to top face
                const topVerts = hexTopVertices(center.x, center.y - h);
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(topVerts[0].x, topVerts[0].y);
                for (let i = 1; i < topVerts.length; i++) ctx.lineTo(topVerts[i].x, topVerts[i].y);
                ctx.closePath();
                ctx.clip();
                drawTileDecoration(ctx, center.x, center.y - h, baseTile, biome, col, row, timestamp);
                ctx.restore();
            }
        }
    }
}

// Draw highlight on valid adjacent hexes (gold=normal, amber=difficult, red=hazard)
function drawAdjacentHighlights(ctx) {
    const neighbors = getNeighbors(S.playerCol, S.playerRow);
    for (const [c, r] of neighbors) {
        const tile = S.grid[r] && S.grid[r][c] ? S.grid[r][c] : '.';
        if (IMPASSABLE.has(tile)) continue;
        const key = `${c},${r}`;
        if (S.fogState[key] === 'hidden') continue;

        const center = hexToScreen(c, r);
        const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
        const h = (TILE_HEIGHT[baseTile] || 1) * UNIT_PX;
        const topVerts = hexTopVertices(center.x, center.y - h);

        // Determine highlight color by terrain type
        const difficult = isDifficultTerrain(baseTile, S.biome);
        const nearLava = getNeighbors(c, r).some(([nc, nr]) => {
            const t = S.grid[nr] && S.grid[nr][nc] ? S.grid[nr][nc] : '.';
            return t === 'L';
        });

        let glowR, glowG, glowB;
        if (nearLava) {
            glowR = 200; glowG = 60; glowB = 40;   // Red — hazard
        } else if (difficult && !isRanger()) {
            glowR = 220; glowG = 160; glowB = 40;   // Amber — difficult
        } else {
            glowR = 196; glowG = 149; glowB = 58;   // Gold — normal
        }

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(topVerts[0].x, topVerts[0].y);
        for (let i = 1; i < topVerts.length; i++) ctx.lineTo(topVerts[i].x, topVerts[i].y);
        ctx.closePath();

        const grad = ctx.createRadialGradient(center.x, center.y - h, 0, center.x, center.y - h, HEX_W * 0.5);
        grad.addColorStop(0, `rgba(${glowR},${glowG},${glowB},0.18)`);
        grad.addColorStop(1, `rgba(${glowR},${glowG},${glowB},0)`);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = `rgba(${glowR},${glowG},${glowB},0.35)`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
    }
}

// Draw POI markers
function drawPOIMarkers(ctx, timestamp) {
    for (const poi of S.pois) {
        if (S.poisResolved.has(poi.id)) continue;
        const key = `${poi.col},${poi.row}`;
        if (S.fogState[key] !== 'visible') continue;

        const center = hexToScreen(poi.col, poi.row);
        const tile = S.grid[poi.row] && S.grid[poi.row][poi.col] ? S.grid[poi.row][poi.col] : '.';
        const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
        const h = (TILE_HEIGHT[baseTile] || 1) * UNIT_PX;
        drawPOIMarker(ctx, center.x, center.y - h, poi.icon, timestamp);
    }
}

// Draw exit portal
function drawExitPortalGlow(ctx, timestamp) {
    const key = `${S.exitCol},${S.exitRow}`;
    if (S.fogState[key] !== 'visible') return;

    const center = hexToScreen(S.exitCol, S.exitRow);
    const tile = S.grid[S.exitRow] && S.grid[S.exitRow][S.exitCol] ? S.grid[S.exitRow][S.exitCol] : '.';
    const baseTile = tile === 'E' ? '.' : tile;
    const h = (TILE_HEIGHT[baseTile] || 1) * UNIT_PX;
    drawExitDecoration(ctx, center.x, center.y - h, timestamp);
}

// Draw hex flash effects (POI discovery golden pulse)
function drawHexFlashes(ctx, timestamp) {
    for (let idx = _hexFlashes.length - 1; idx >= 0; idx--) {
        const f = _hexFlashes[idx];
        const elapsed = timestamp - f.start;
        if (elapsed > f.duration) { _hexFlashes.splice(idx, 1); continue; }
        const alpha = 0.4 * (1 - elapsed / f.duration);
        const center = hexToScreen(f.col, f.row);
        const tile = S.grid[f.row] && S.grid[f.row][f.col] ? S.grid[f.row][f.col] : '.';
        const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
        const h = (TILE_HEIGHT[baseTile] || 1) * UNIT_PX;
        const topVerts = hexTopVertices(center.x, center.y - h);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(topVerts[0].x, topVerts[0].y);
        for (let v = 1; v < topVerts.length; v++) ctx.lineTo(topVerts[v].x, topVerts[v].y);
        ctx.closePath();
        ctx.fillStyle = `rgba(196, 149, 58, ${alpha})`;
        ctx.fill();
        ctx.restore();
    }
}

// Handle canvas click
function handleCanvasClick(e) {
    if (isMoving()) return;

    const rect = _canvas.getBoundingClientRect();

    // getBoundingClientRect() already accounts for parent scroll position
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Scale from CSS pixels to canvas logical coordinates
    const scaleX = _canvasLogicalW / rect.width;
    const scaleY = _canvasLogicalH / rect.height;
    const canvasX = sx * scaleX;
    const canvasY = sy * scaleY;

    const hex = screenToHex(canvasX, canvasY, S.grid, ROWS, COLS);
    if (hex.col < 0 || hex.row < 0) return;

    // Check adjacency and passability
    if (!isAdjacent(S.playerCol, S.playerRow, hex.col, hex.row)) return;
    const tile = S.grid[hex.row] && S.grid[hex.row][hex.col] ? S.grid[hex.row][hex.col] : '.';
    if (IMPASSABLE.has(tile)) return;

    // Trigger movement
    movePlayerCanvas(hex.col, hex.row);
}

// Move player via canvas system
function movePlayerCanvas(col, row) {
    const tile = S.grid[row] && S.grid[row][col] ? S.grid[row][col] : '.';
    const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;

    // Difficult terrain check (D&D 5e)
    const difficult = isDifficultTerrain(baseTile, S.biome);
    const ranger = isRanger();
    const isProne = hasCondition('prone');

    if ((difficult && !ranger) || isProne) {
        setMoveDuration(MOVE_DURATION_DIFFICULT);
    } else {
        setMoveDuration(MOVE_DURATION_NORMAL);
    }

    startMovement(S.playerCol, S.playerRow, col, row);

    // Update state
    S.playerCol = col;
    S.playerRow = row;
    S.visited.add(`${col},${row}`);

    // Clear prone after movement (consumes the condition)
    if (isProne) {
        S.conditions = S.conditions.filter(c => c.type !== 'prone');
        updateConditionHUD();
    }

    // Terrain toast feedback
    if (difficult) {
        if (ranger) {
            showTerrainToast('🏹 Terreno Natural', 'ranger');
        } else {
            showTerrainToast('🥾 Terreno Difícil', 'difficult');
        }
    }

    // Haptic
    try { if (tg) tg.HapticFeedback.impactOccurred('light'); } catch(e) { console.warn('[EXPLORE] haptic:', e); }

    // Start rendering
    scheduleRender();
    if (!_rafId) {
        _rafId = requestAnimationFrame(renderLoop);
    }
}

// Called by movement system when animation completes
function onMoveComplete(col, row) {
    // Reveal fog
    revealFogAt(col, row, S.visibility, S.fogState, S.grid, true);
    _staticDirty = true;
    scheduleRender();
    if (!_rafId) {
        _rafId = requestAnimationFrame(renderLoop);
    }

    updateStepCounter();
    if (typeof updateLocationInfo === 'function') updateLocationInfo();
    tickConditions();
    updateAtmosphere();
    scrollCanvasToPlayer(true);

    // Environmental hazard check (priority over POI/exit)
    const hazard = checkHazard(col, row);
    if (hazard) {
        setTimeout(() => showHazardCheck(hazard), 200);
        return;
    }

    // Check POI
    const poi = S.pois.find(p => p.col === col && p.row === row && !S.poisResolved.has(p.id));
    if (poi) {
        setTimeout(() => showPOI(poi), 100);
        return;
    }

    // Check exit
    if (col === S.exitCol && row === S.exitRow) {
        setTimeout(() => showPortalOverlay(), 200);
        return;
    }

    // Random encounter (night + storm increase chance)
    const encChance = 0.08 + (S.dangerLevel * 0.03) + (S._nightEncounterBonus || 0) + (S._weatherEncounterMod || 0);
    if (Math.random() < encChance && S.randomEncounters.length > 0) {
        const enc = S.randomEncounters.shift();
        setTimeout(() => showRandomEncounter(enc), 300);
        return;
    }

    // Check if player is surrounded (no valid moves)
    const neighbors = getNeighbors(col, row);
    const hasValidMove = neighbors.some(([c, r]) => {
        const t = S.grid[r] && S.grid[r][c] ? S.grid[r][c] : '.';
        return !IMPASSABLE.has(t);
    });
    if (!hasValidMove) {
        showTerrainToast('🚫 Sem caminhos disponíveis!', 'damage');
    }

    // Flavor event (ambient mini-event between POIs)
    if (typeof checkFlavorEvent === 'function') {
        checkFlavorEvent();
    }

    // Log base move (no special event on this hex)
    logMoveEvent([{type:'move'}]);
    saveState();
}

// Scroll viewport to center on the player's current hex position
function scrollCanvasToPlayer(smooth) {
    const viewport = document.getElementById('map-viewport');
    if (!viewport) return;
    const center = hexToScreen(S.playerCol, S.playerRow);
    const tile = S.grid[S.playerRow] && S.grid[S.playerRow][S.playerCol] ? S.grid[S.playerRow][S.playerCol] : '.';
    const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
    const h = (TILE_HEIGHT[baseTile] || 1) * UNIT_PX;

    const targetX = center.x - viewport.clientWidth / 2;
    const targetY = (center.y - h) - viewport.clientHeight / 2;

    viewport.scrollTo({
        left: Math.max(0, targetX),
        top: Math.max(0, targetY),
        behavior: smooth ? 'smooth' : 'instant',
    });
}

// Mark static cache as dirty (forces redraw)
function invalidateStatic() {
    _staticDirty = true;
    scheduleRender();
}

// ═══════════════════════════════════════════════════════
// ATMOSPHERE — Day/Night Cycle + Weather Effects
// ═══════════════════════════════════════════════════════
const _DAY_PHASES = {
    dawn:  { icon: '🌅', label: 'Amanhecer' },
    day:   { icon: '☀️', label: 'Dia' },
    dusk:  { icon: '🌅', label: 'Entardecer' },
    night: { icon: '🌙', label: 'Noite' },
};
const _WEATHER_INFO = {
    s: { icon: '☀️', label: 'Limpo' },
    r: { icon: '🌧️', label: 'Chuva', css: 'weather-rain' },
    f: { icon: '🌫️', label: 'Névoa', css: 'weather-fog' },
    t: { icon: '⛈️', label: 'Tempestade', css: 'weather-storm' },
};

function getCurrentHour() {
    const moves = S.visited ? S.visited.size : 0;
    return ((S.startHour || 8) + Math.floor(moves / 15)) % 24;
}

function getDayPhase() {
    const h = getCurrentHour();
    if (h >= 6 && h < 10) return 'dawn';
    if (h >= 10 && h < 17) return 'day';
    if (h >= 17 && h < 20) return 'dusk';
    return 'night';
}

function updateAtmosphere() {
    const phase = getDayPhase();
    const phaseInfo = _DAY_PHASES[phase];
    const wCode = S.weather || 's';
    const wInfo = _WEATHER_INFO[wCode] || _WEATHER_INFO.s;

    // Update HUD badges
    const timeBadge = document.getElementById('badge-time');
    const weatherBadge = document.getElementById('badge-weather');
    if (timeBadge) timeBadge.textContent = phaseInfo.icon;
    if (weatherBadge) weatherBadge.textContent = wInfo.icon;

    // Apply day/night CSS class to viewport
    const vp = document.getElementById('map-viewport');
    if (vp) {
        vp.classList.remove('phase-dawn', 'phase-day', 'phase-dusk', 'phase-night');
        vp.classList.add('phase-' + phase);
    }

    // Apply weather overlay CSS
    const wo = document.getElementById('weather-overlay');
    if (wo) {
        wo.classList.remove('weather-rain', 'weather-fog', 'weather-storm');
        if (wInfo.css) wo.classList.add(wInfo.css);
    }

    // Mechanical effects: night → encounter chance + fog radius
    S._nightEncounterBonus = phase === 'night' ? 0.10 : 0;
    S._weatherVisibilityMod = wCode === 'f' ? -1 : 0;
    S._weatherEncounterMod = wCode === 't' ? 0.05 : 0;
}
