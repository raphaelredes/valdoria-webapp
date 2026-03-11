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

// Hex hover/tap reveal effect
let _hoveredHex = null;     // {col, row, time} — currently hovered hex
let _tapRevealHexes = [];

// Event sprites revealed on the map (NPCs, objects, dangers)
let _eventSprites = [];
const EVENT_SPRITE_TYPES = {
    // NPC encounters
    npc: { draw: '_drawNPCSprite', color: '#c4953a' },
    npc_friendly: { draw: '_drawNPCSprite', color: '#5a9a5a' },
    // Discoveries & searches
    discovery: { draw: '_drawObjectSprite', color: '#c4953a' },
    search: { draw: '_drawObjectSprite', color: '#8a7a5a' },
    // Dangers & hazards
    danger: { draw: '_drawDangerSprite', color: '#c44a2a' },
    hazard: { draw: '_drawDangerSprite', color: '#c44a2a' },
    trap: { draw: '_drawTrapSprite', color: '#8a4a2a' },
    // Mystery & ambient
    mystery: { draw: '_drawMysterySprite', color: '#6a5aaa' },
    ambient: { draw: '_drawAmbientSprite', color: '#5a8a6a' },
    // Combat encounter
    encounter: { draw: '_drawEnemySprite', color: '#aa3a2a' },
};

function revealEventSprite(col, row, type, icon) {
    // Prevent duplicate at same position
    if (_eventSprites.find(s => s.col === col && s.row === row)) return;
    _eventSprites.push({
        col, row, type: type || 'discovery',
        icon: icon || null,
        revealTime: performance.now(),
        alpha: 0 // fade in
    });
    scheduleRender();
}

function clearEventSprite(col, row) {
    _eventSprites = _eventSprites.filter(s => !(s.col === col && s.row === row));
    scheduleRender();
}

// Floating text system (onomatopeias, damage numbers, status)
let _floatingTexts = [];

function spawnFloatingText(col, row, text, color, type) {
    const center = hexToScreen(col, row);
    const tile = S.grid[row] && S.grid[row][col] ? S.grid[row][col] : '.';
    const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
    const h = (TILE_HEIGHT[baseTile] || 1) * UNIT_PX;
    _floatingTexts.push({
        x: center.x + (Math.random() - 0.5) * 10,
        y: center.y - h - 8,
        text: text,
        color: color || '#d4c8b0',
        type: type || 'flavor',
        birth: performance.now(),
        duration: 3000,
        vy: -0.4, // float upward speed
    });
    scheduleRender();
}

function _drawFloatingTexts(ctx, timestamp) {
    const now = performance.now();
    _floatingTexts = _floatingTexts.filter(ft => (now - ft.birth) < ft.duration);
    for (const ft of _floatingTexts) {
        const age = now - ft.birth;
        const t = age / ft.duration;
        // Ease: fast rise then slow
        const yOff = ft.vy * age * (1 - t * 0.5);
        const alpha = t < 0.15 ? t / 0.15 : t < 0.5 ? 1.0 : 1.0 - ((t - 0.5) / 0.5) * ((t - 0.5) / 0.5);
        const scale = 1 + t * 0.15;

        ctx.save();
        ctx.globalAlpha = alpha * 0.85;
        ctx.translate(ft.x, ft.y + yOff);
        ctx.scale(scale, scale);

        // Text shadow
        ctx.font = ft.type === 'damage' ? 'bold 13px MedievalSharp, serif'
                 : ft.type === 'big' ? 'bold 14px MedievalSharp, serif'
                 : '13px MedievalSharp, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillText(ft.text, 0.5, 0.5);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, 0, 0);

        ctx.restore();
    }
}   // [{col, row, startTime}] — tapped hexes with fading outline

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

    // Minimap init
    initMinimap();

    // Terrain tooltip (long press)
    initTerrainTooltip();

    // Click handler on canvas
    _canvas.addEventListener('click', handleCanvasClick);

    // Hex hover reveal (mouse)
    _canvas.addEventListener('mousemove', (e) => {
        const rect = _canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const scaleX = _canvasLogicalW / rect.width;
        const scaleY = _canvasLogicalH / rect.height;
        const hex = screenToHex(sx * scaleX, sy * scaleY, S.grid, ROWS, COLS);
        if (hex.col >= 0 && hex.row >= 0) {
            _hoveredHex = { col: hex.col, row: hex.row, time: performance.now() };
        } else {
            _hoveredHex = null;
        }
    });
    _canvas.addEventListener('mouseleave', () => { _hoveredHex = null; });

    // Hex tap reveal (touch — shows hex outline briefly on any touch)
    _canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const rect = _canvas.getBoundingClientRect();
        const sx = touch.clientX - rect.left;
        const sy = touch.clientY - rect.top;
        const scaleX = _canvasLogicalW / rect.width;
        const scaleY = _canvasLogicalH / rect.height;
        const hex = screenToHex(sx * scaleX, sy * scaleY, S.grid, ROWS, COLS);
        if (hex.col >= 0 && hex.row >= 0) {
            _tapRevealHexes.push({ col: hex.col, row: hex.row, startTime: performance.now() });
            // Also reveal neighbors for context
            const neighbors = getNeighbors(hex.col, hex.row);
            for (const n of neighbors) {
                if (n.col >= 0 && n.col < COLS && n.row >= 0 && n.row < ROWS) {
                    _tapRevealHexes.push({ col: n.col, row: n.row, startTime: performance.now() });
                }
            }
        }
    }, { passive: true });

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
    const weatherActive = typeof updateWeatherParticles === 'function' ? updateWeatherParticles(dt) : false;

    const flashActive = _hexFlashes.length > 0;
    const tapActive = _tapFeedbacks.length > 0;
    const hasAnimations = movingActive || effectsActive || fogActive || particlesActive || flashActive || tapActive;

    renderFrame(timestamp);
    _needsRender = false;

    // Only keep loop running if there are active animations or pulsing highlights
    // Adjacent highlight pulse needs continuous animation when player can move
    const idleAnims = !S.inEvent && !S.lockMovement;
    if (hasAnimations || weatherActive || idleAnims) {
        _rafId = requestAnimationFrame(renderLoop);
    } else {
        _rafId = null; // Sleep until scheduleRender() wakes us
    }
}


// Ambient tile lighting — drawn on static cache for zero per-frame cost
function _drawAmbientLighting(ctx) {
    if (!S.grid || !S.fogState) return;
    const ROWS_L = S.grid.length;
    const COLS_L = S.grid[0] ? S.grid[0].length : 0;

    for (let r = 0; r < ROWS_L; r++) {
        for (let c = 0; c < COLS_L; c++) {
            const tile = S.grid[r][c];
            if (tile === '#' || tile === 'D') continue; // Skip walls/doors

            const fogKey = c + ',' + r;
            if (S.fogState[fogKey] !== 'visible' && S.fogState[fogKey] !== 'dim') continue;

            // Check adjacent tiles for glow sources
            const nbrs = typeof getNeighbors === 'function' ? getNeighbors(c, r) : [];
            let glowColor = null;
            let glowAlpha = 0;

            for (const [nc, nr] of nbrs) {
                if (nr < 0 || nr >= ROWS_L || nc < 0 || nc >= COLS_L) continue;
                const adjTile = S.grid[nr][nc];
                if (adjTile === 'L') {
                    glowColor = '200,50,0'; glowAlpha = Math.max(glowAlpha, 0.08);
                } else if (adjTile === 'R') {
                    if (!glowColor || glowAlpha < 0.06) {
                        glowColor = '196,149,58'; glowAlpha = Math.max(glowAlpha, 0.06);
                    }
                } else if (adjTile === 'W' || adjTile === 'w') {
                    if (!glowColor || glowAlpha < 0.04) {
                        glowColor = '40,100,180'; glowAlpha = Math.max(glowAlpha, 0.04);
                    }
                }
            }

            // Torch proximity glow
            if (S.torches) {
                for (const torch of S.torches) {
                    const dist = typeof hexDist === 'function' ? hexDist(c, r, torch.col, torch.row) : 99;
                    if (dist <= (torch.radius || 2)) {
                        glowColor = '220,160,50';
                        glowAlpha = Math.max(glowAlpha, 0.07 * (1 - dist / 3));
                    }
                }
            }

            if (!glowColor || glowAlpha <= 0) continue;

            const pos = typeof hexToScreen === 'function' ? hexToScreen(c, r) : null;
            if (!pos) continue;
            const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, HEX_W * 0.8);
            grad.addColorStop(0, 'rgba(' + glowColor + ',' + glowAlpha + ')');
            grad.addColorStop(1, 'rgba(' + glowColor + ',0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, HEX_W * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function renderFrame(timestamp) {
    _ctx.clearRect(0, 0, _canvasLogicalW, _canvasLogicalH);

    // 1. Background (matches #map-viewport CSS)
    _ctx.fillStyle = '#1e1a16';
    _ctx.fillRect(0, 0, _canvasLogicalW, _canvasLogicalH);

    // 2. Draw static tiles (cached unless dirty)
    if (_staticDirty) {
        renderStaticTiles(timestamp);
        
    // ── Ambient tile lighting (glow near lava, ruins, water) ──
    _drawAmbientLighting(_staticCtx);

_staticDirty = false;
    }
    // Draw cached static layer
    _ctx.drawImage(_staticCanvas, 0, 0, _canvasLogicalW, _canvasLogicalH);

    // 3. Adjacent hex highlights (dynamic — depends on player position, pulsing)
    drawAdjacentHighlights(_ctx, timestamp);

    // 4. Dynamic tile decorations (water waves, lava glow)
    drawAnimatedTiles(_ctx, timestamp);

    // 5. POI markers (bounce animation)
    drawPOIMarkers(_ctx, timestamp);

    // 6. Exit portal glow
    drawExitPortalGlow(_ctx, timestamp);

    // 6.3. Event sprites (NPCs, objects, dangers revealed on player step)
    _drawEventSprites(_ctx, timestamp);

    // 6.5. Visited hex trail markers
    drawVisitedTrail(_ctx, timestamp);

    // 6.6. Roaming danger markers (enemy patrols)
    _drawDangerMarkers(_ctx, timestamp);

    // 7. Effects (dust, ripples)
    drawEffects(_ctx);

    // 7.5 POI discovery flash
    drawHexFlashes(_ctx, timestamp);

    // 7.6 Tap feedback ripple
    drawTapFeedback(_ctx, timestamp);

    // 7.65 Hex hover/tap outline reveal
    drawHexHoverEffect(_ctx, timestamp);



    // 8. Player token (with direction indicator)
    drawPlayerToken(_ctx, timestamp);

    // 9. Ambient particles
    if (typeof drawParticles === 'function') {
        drawParticles(_ctx, timestamp);
    }

    // 9.5 Weather particles (rain, storm)
    if (typeof drawWeatherParticles === 'function') {
        drawWeatherParticles(_ctx, timestamp);
    }

    // 9.7. Floating text (onomatopeias, status)
    _drawFloatingTexts(_ctx, timestamp);

    // 10. Fog of war (drawn last, on top of everything)

        // ── TORCH FLAMES (animated) ──
        if (S.torches && S.torches.length > 0) {
            for (const torch of S.torches) {
                const fogKey = `${torch.col},${torch.row}`;
                const fogSt = S.fogState[fogKey];
                if (fogSt !== 'visible' && fogSt !== 'dim') continue;
                const tPos = hexToScreen(torch.col, torch.row);
                const sx = (tPos.x - _cameraOffsetX) * _zoomLevel;
                const sy = (tPos.y - _cameraOffsetY) * _zoomLevel;
                _ctx.save();
                _ctx.translate(sx, sy);
                _ctx.scale(_zoomLevel, _zoomLevel);
                drawTorchOnWall(_ctx, 0, 0, timestamp);
                _ctx.restore();
            }
        }

        // ── TRAP MARKS (visible traps only) ──
        if (S.traps && S.traps.length > 0) {
            for (const trap of S.traps) {
                if (trap.triggered || trap.hidden) continue;
                const fogKey = `${trap.col},${trap.row}`;
                const fogSt = S.fogState[fogKey];
                if (fogSt !== 'visible') continue;
                const tPos = hexToScreen(trap.col, trap.row);
                const sx = (tPos.x - _cameraOffsetX) * _zoomLevel;
                const sy = (tPos.y - _cameraOffsetY) * _zoomLevel;
                _ctx.save();
                _ctx.translate(sx, sy);
                _ctx.scale(_zoomLevel, _zoomLevel);
                drawTrapMark(_ctx, 0, 0, trap.col, trap.row);
                _ctx.restore();
            }
        }

        // ── SECRET WALL HINTS ──
        if (S.secretPassages && S.secretPassages.length > 0) {
            for (const sp of S.secretPassages) {
                if (sp.revealed) continue;
                const fogKey = `${sp.col},${sp.row}`;
                const fogSt = S.fogState[fogKey];
                if (fogSt !== 'visible') continue;
                // Only show hint if player is within 2 hexes
                const dist = hexDist(sp.col, sp.row, S.playerCol, S.playerRow);
                if (dist > 2) continue;
                const sPos = hexToScreen(sp.col, sp.row);
                const sx = (sPos.x - _cameraOffsetX) * _zoomLevel;
                const sy = (sPos.y - _cameraOffsetY) * _zoomLevel;
                _ctx.save();
                _ctx.translate(sx, sy);
                _ctx.scale(_zoomLevel, _zoomLevel);
                drawSecretWallHint(_ctx, 0, 0);
                _ctx.restore();
            }
        }

    
        // ── CHEST ICONS (visible, unopened) ──
        if (S.chests && S.chests.length > 0) {
            for (const chest of S.chests) {
                if (chest.opened) continue;
                const fogKey = chest.col + ',' + chest.row;
                const fogSt = S.fogState[fogKey];
                if (fogSt !== 'visible') continue;
                const cPos = hexToScreen(chest.col, chest.row);
                const sx = (cPos.x - _cameraOffsetX) * _zoomLevel;
                const sy = (cPos.y - _cameraOffsetY) * _zoomLevel;
                _ctx.save();
                _ctx.translate(sx, sy);
                _ctx.scale(_zoomLevel, _zoomLevel);
                // Draw treasure chest icon
                _ctx.fillStyle = 'rgba(160,120,50,0.9)';
                _ctx.fillRect(-5, -3, 10, 6);
                _ctx.fillStyle = 'rgba(196,149,58,0.9)';
                _ctx.fillRect(-6, -4, 12, 2);
                _ctx.fillStyle = 'rgba(120,80,30,0.8)';
                _ctx.fillRect(-1, -1, 2, 2);
                _ctx.restore();
            }
        }

        // ── SAFE ROOM MARKER ──
        if (S.safeRooms && S.safeRooms.length > 0) {
            for (const sr of S.safeRooms) {
                if (sr.discovered) continue;
                const fogKey = sr.col + ',' + sr.row;
                if (S.fogState[fogKey] !== 'visible') continue;
                const sPos = hexToScreen(sr.col, sr.row);
                const sx = (sPos.x - _cameraOffsetX) * _zoomLevel;
                const sy = (sPos.y - _cameraOffsetY) * _zoomLevel;
                _ctx.save();
                _ctx.translate(sx, sy);
                _ctx.scale(_zoomLevel, _zoomLevel);
                // Subtle safe glow
                const grad = _ctx.createRadialGradient(0, 0, 0, 0, 0, HEX_W * 0.5);
                grad.addColorStop(0, 'rgba(100,180,100,0.12)');
                grad.addColorStop(1, 'rgba(100,180,100,0)');
                _ctx.fillStyle = grad;
                _ctx.beginPath();
                _ctx.arc(0, 0, HEX_W * 0.5, 0, Math.PI * 2);
                _ctx.fill();
                _ctx.restore();
            }
        }

    drawFogOverlay(_ctx, _canvasLogicalW, _canvasLogicalH, S.fogState);

    // 10.5 Fog reveal golden flash (on top of fog for dramatic effect)
    drawFogRevealFlash(_ctx, timestamp);

    // 11. Minimap (only redraws when dirty)
    drawMinimap();

    // 12.5 Movement cost preview for adjacent hexes
    _drawMoveCostIndicators(timestamp);

    // 13. Atmospheric vignette (darkens edges for depth)
    _drawVignette(_ctx, _canvasLogicalW, _canvasLogicalH);

    // 13.5. Day/night tint overlay (time-of-day atmosphere)
    _drawDayNightTint(_ctx, _canvasLogicalW, _canvasLogicalH, timestamp);

    // 12. Smooth camera follow during movement
    if (isMoving()) {
        _smoothCameraFollow();
    }
}

// Atmospheric vignette — subtle darkening at canvas edges
function _drawVignette(ctx, w, h) {
    const cx = w / 2, cy = h / 2;
    const outerR = Math.max(w, h) * 0.75;
    const grad = ctx.createRadialGradient(cx, cy, outerR * 0.5, cx, cy, outerR);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
}

// Day/night tint — subtle color overlay based on time of day
function _drawDayNightTint(ctx, w, h, timestamp) {
    const phase = typeof getDayPhase === 'function' ? getDayPhase() : 'day';
    if (phase === 'day') return; // No tint during daylight

    let r, g, b, alpha;
    switch (phase) {
        case 'dawn':
            r = 255; g = 180; b = 100; alpha = 0.06; break;
        case 'dusk':
            r = 180; g = 80; b = 40; alpha = 0.12; break;
        case 'night':
            r = 20; g = 30; b = 60; alpha = 0.22; break;
        default: return;
    }

    // Slight flicker at night (torch influence)
    if (phase === 'night') {
        const flicker = Math.sin((timestamp || 0) * 0.003) * 0.02;
        alpha += flicker;
    }

    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fillRect(0, 0, w, h);
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

    // Second pass: ambient occlusion (shadow on tiles next to taller neighbors)
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            _drawHeightShadow(_staticCtx, col, row);
        }
    }

    // Third pass: soft edge blending between different terrain types
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const tile = S.grid[row] && S.grid[row][col] ? S.grid[row][col] : '.';
            const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
            if (baseTile === 'W' || baseTile === 'L') continue;

            const center = hexToScreen(col, row);
            const h = (TILE_HEIGHT[baseTile] || 1) * UNIT_PX;
            const cx = center.x;
            const cy = center.y - h;

            // Check neighbors for different terrain
            const nbs = typeof getNeighbors === 'function' ? getNeighbors(col, row) : [];
            let hasDiffNeighbor = false;
            for (const [nc, nr] of nbs) {
                if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
                const nTile = S.grid[nr] && S.grid[nr][nc] ? S.grid[nr][nc] : '.';
                const nBase = nTile.match(/[0-9@E]/) ? '.' : nTile;
                if (nBase !== baseTile && nBase !== 'W' && nBase !== 'L') {
                    hasDiffNeighbor = true;
                    break;
                }
            }
            if (!hasDiffNeighbor) continue;

            // Soft radial fade at edges (blend with neighbors)
            const blendGrad = _staticCtx.createRadialGradient(cx, cy, HEX_W * 0.25, cx, cy, HEX_W * 0.5);
            blendGrad.addColorStop(0, 'rgba(0,0,0,0)');
            blendGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
            blendGrad.addColorStop(1, 'rgba(0,0,0,0.06)');
            _staticCtx.fillStyle = blendGrad;
            _staticCtx.beginPath();
            _staticCtx.arc(cx, cy, HEX_W * 0.5, 0, Math.PI * 2);
            _staticCtx.fill();
        }
    }
}

// Ambient occlusion — darken tiles adjacent to taller neighbors
function _drawHeightShadow(ctx, col, row) {
    const tile = S.grid[row] && S.grid[row][col] ? S.grid[row][col] : '.';
    const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
    const height = TILE_HEIGHT[baseTile] || 1;

    // Check neighbors for height difference
    const neighbors = typeof getNeighbors === 'function' ? getNeighbors(col, row) : [];
    let maxDiff = 0;
    for (const [nc, nr] of neighbors) {
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        const nt = S.grid[nr] && S.grid[nr][nc] ? S.grid[nr][nc] : '.';
        const nBase = nt.match(/[0-9@E]/) ? '.' : nt;
        const nHeight = TILE_HEIGHT[nBase] || 1;
        maxDiff = Math.max(maxDiff, nHeight - height);
    }

    if (maxDiff < 0.8) return; // Only shadow when significant height difference

    const shadow = Math.min(0.12, maxDiff * 0.04);
    const center = hexToScreen(col, row);
    const heightPx = height * UNIT_PX;
    const topVerts = hexTopVertices(center.x, center.y - heightPx);

    ctx.beginPath();
    ctx.moveTo(topVerts[0].x, topVerts[0].y);
    for (let i = 1; i < topVerts.length; i++) ctx.lineTo(topVerts[i].x, topVerts[i].y);
    ctx.closePath();
    ctx.fillStyle = `rgba(0,0,0,${shadow})`;
    ctx.fill();
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
    // Skip vegetation (T, g) in wind biomes — rendered dynamically with wind animation
    const isWindVeg = WIND_BIOMES.has(biome) && (baseTile === 'T' || baseTile === 'g');
    if (baseTile !== 'w' && baseTile !== 'W' && baseTile !== 'L' && !isWindVeg) {
        drawTileDecoration(ctx, cx, cy - heightPx, baseTile, biome, col, row, 0);
    }

    ctx.restore();

    // Wall brick pattern on side faces
    if (baseTile === '#' && heightPx > 0) {
        drawWallDecoration(ctx, cx, cy - heightPx, heightPx, col, row);
    }

    // No permanent tile borders — terrain blends seamlessly
    // Hex outlines only appear on hover/tap (drawn in drawHexHoverEffect)
}

// Draw animated tile decorations (water, lava, wind-animated vegetation)
function drawAnimatedTiles(ctx, timestamp) {
    const biome = S.biome || 'forest';
    const isWindy = WIND_BIOMES.has(biome);
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const tile = S.grid[row] && S.grid[row][col] ? S.grid[row][col] : '.';
            const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
            const center = hexToScreen(col, row);

            if (baseTile === 'w' || baseTile === 'W' || baseTile === 'L') {
                const h = (TILE_HEIGHT[baseTile] || 0) * UNIT_PX;
                const topVerts = hexTopVertices(center.x, center.y - h);
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(topVerts[0].x, topVerts[0].y);
                for (let i = 1; i < topVerts.length; i++) ctx.lineTo(topVerts[i].x, topVerts[i].y);
                ctx.closePath();
                ctx.clip();
                drawTileDecoration(ctx, center.x, center.y - h, baseTile, biome, col, row, timestamp);
                ctx.restore();
            } else if (isWindy && (baseTile === 'T' || baseTile === 'g')) {
                // Wind-animated vegetation (moved from static cache)
                const hPx = (TILE_HEIGHT[baseTile] || 1) * UNIT_PX;
                const topVerts = hexTopVertices(center.x, center.y - hPx);
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(topVerts[0].x, topVerts[0].y);
                for (let i = 1; i < topVerts.length; i++) ctx.lineTo(topVerts[i].x, topVerts[i].y);
                ctx.closePath();
                ctx.clip();
                if (baseTile === 'T') {
                    drawTreeDecorationWind(ctx, center.x, center.y - hPx, biome, col, row, timestamp);
                } else {
                    drawGrassDecorationWind(ctx, center.x, center.y - hPx, col, row, biome, timestamp);
                }
                ctx.restore();
            }
        }
    }
}

// Draw highlight on valid adjacent hexes (gold=normal, amber=difficult, red=hazard)
// Pulsing animation for better touch-target visibility
function drawAdjacentHighlights(ctx, timestamp) {
    const pulse = 0.5 + Math.sin((timestamp || 0) * 0.008) * 0.3; // 0.2-0.8, ~785ms period
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

        // Soft radial glow (no hex border visible)
        const fillAlpha = 0.12 + pulse * 0.14;
        const glowRadius = HEX_W * 0.55;
        const grad = ctx.createRadialGradient(center.x, center.y - h, 0, center.x, center.y - h, glowRadius);
        grad.addColorStop(0, `rgba(${glowR},${glowG},${glowB},${fillAlpha})`);
        grad.addColorStop(0.5, `rgba(${glowR},${glowG},${glowB},${fillAlpha * 0.5})`);
        grad.addColorStop(0.8, `rgba(${glowR},${glowG},${glowB},${fillAlpha * 0.15})`);
        grad.addColorStop(1, `rgba(${glowR},${glowG},${glowB},0)`);
        ctx.fillStyle = grad;
        ctx.fill();

        // Subtle hex outline stroke for touch target clarity
        ctx.strokeStyle = `rgba(${glowR},${glowG},${glowB},${(fillAlpha * 0.5).toFixed(2)})`;
        ctx.lineWidth = 1 + pulse * 0.5;
        ctx.beginPath();
        ctx.moveTo(topVerts[0].x, topVerts[0].y);
        for (let vi = 1; vi < topVerts.length; vi++) ctx.lineTo(topVerts[vi].x, topVerts[vi].y);
        ctx.closePath();
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
        drawPOIMarker(ctx, center.x, center.y - h, poi.icon, timestamp, poi.type);
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
    if (IMPASSABLE.has(tile)) {
        if (typeof handleTileInteraction === 'function') {
            handleTileInteraction(hex.col, hex.row, tile);
        }
        return;
    }

    // Update player facing toward clicked hex
    if (typeof playerFacing !== 'undefined') {
        const _fc = hexToScreen(hex.col, hex.row);
        const _fp = hexToScreen(S.playerCol, S.playerRow);
        playerFacing = Math.atan2(_fc.y - _fp.y, _fc.x - _fp.x);
    }

    // Visual tap feedback
    spawnTapFeedback(hex.col, hex.row);

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

    // Exhaustion level 5: speed = 0 (D&D 5e PHB)
    if (S.exhaustion >= 5) {
        showTerrainToast('Exaust\u00e3o extrema! Voc\u00ea n\u00e3o consegue se mover.', 'damage');
        return;
    }
    // Conditions that prevent movement (Restrained, Stunned, Incapacitated)
    if (typeof conditionPreventsMovement === 'function' && conditionPreventsMovement()) {
        showTerrainToast('Voc\u00ea n\u00e3o consegue se mover!', 'condition');
        return;
    }

    // Exhaustion level 2: speed halved (all terrain = difficult)
    const exhHalf = S.exhaustion >= 2;
    if ((difficult && !ranger) || isProne || exhHalf) {
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
    if (difficult || S._weatherDifficultAll) {
        if (ranger && difficult) {
            showTerrainToast('Terreno Natural', 'ranger');
        } else if (S._weatherDifficultAll && !difficult) {
            // Weather made it difficult
        } else {
            showTerrainToast('Terreno Difícil', 'difficult');
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
    if (typeof _checkForageActivity === 'function') _checkForageActivity();

    // Weather mechanical effects (DMG Ch.5)
    if (typeof _checkWeatherEffects === 'function') _checkWeatherEffects();
    updateAtmosphere();
    updateMinimap();
    // Haptic feedback for each step
    try { if (typeof tg !== 'undefined' && tg) tg.HapticFeedback.selectionChanged(); } catch(e) {}
    if (typeof _resetExploreButton === 'function') _resetExploreButton();
    if (typeof updatePaceUI === 'function') updatePaceUI();
    scrollCanvasToPlayer(true);

    // Roaming danger marker collision (priority)
    if (typeof _checkDangerMarkerCollision === 'function' && _checkDangerMarkerCollision()) return;
    // Move danger markers after player moves
    if (typeof _moveDangerMarkers === 'function') _moveDangerMarkers();

    // Environmental hazard check (priority over POI/exit)
    const hazard = checkHazard(col, row);
    if (hazard) {
        revealEventSprite(col, row, 'hazard');
        spawnFloatingText(col, row, 'crack!', '#c44a2a', 'big');
        setTimeout(() => showHazardNarration(hazard), 200);
        return;
    }

    // Trap check (chance-based, detected via PP)
    if (typeof checkTrap === 'function') {
        const trap = checkTrap(col, row);
        if (trap) {
            revealEventSprite(col, row, 'trap');
            spawnFloatingText(col, row, 'clank!', '#8a4a2a', 'big');
            setTimeout(() => showTrapEvent(trap), 200);
            return;
        }
    }

    // Check POI
    
        // PRIORITY 2.5: Trap check (D&D 5e)
        if (typeof checkTrapAtPosition === 'function') {
            const trap = checkTrapAtPosition(col, row);
            if (trap) {
                showTrapEvent(trap);
                saveState();
                return;
            }
        }
        // Check for chests
        if (typeof checkChestAtPosition === 'function') {
            const chest = checkChestAtPosition(col, row);
            if (chest) showChestEvent(chest);
        }
        // Check for safe rooms
        if (typeof checkSafeRoom === 'function') checkSafeRoom(col, row);
        // Environmental hazards (lava proximity)
        if (typeof checkEnvironmentalHazards === 'function') checkEnvironmentalHazards(col, row);
        // Environmental storytelling flavor text (D&D exploration ambiance)
        if (typeof checkFlavorText === 'function') checkFlavorText(col, row);

const poi = S.pois.find(p => p.col === col && p.row === row && !S.poisResolved.has(p.id));
    if (poi) {
        const spriteType = {dis:'discovery',sea:'search',dan:'danger',mys:'mystery',npc:'npc'}[poi.type] || 'discovery';
        revealEventSprite(col, row, spriteType, poi.icon);
        const poiSounds = {dis:'*brilho*', sea:'intrigante...', dan:'PERIGO!', mys:'misterioso...', npc:'alguem!'};
        const poiColors = {dis:'#c4953a', sea:'#8a9a5a', dan:'#c44a2a', mys:'#8a6aaa', npc:'#5a9a6a'};
        spawnFloatingText(col, row, poiSounds[poi.type] || '!', poiColors[poi.type] || '#c4953a', 'big');
        setTimeout(() => showPOI(poi), 100);
        return;
    }

    // Check exit
    if (col === S.exitCol && row === S.exitRow) {
        // Golden glow pulse to signal portal discovery
        if (typeof flashScreen === 'function') flashScreen('rgba(196,149,58,0.2)');
        spawnFloatingText(col, row, 'portal...', '#c4953a', 'big');
        try { if (typeof tg !== 'undefined' && tg) tg.HapticFeedback.notificationOccurred('success'); } catch(e) {}
        setTimeout(() => showPortalOverlay(), 800);
        return;
    }

    // Random encounter (night + storm increase chance)
    const encChance = 0.08 + (S.dangerLevel * 0.03) + (S._nightEncounterBonus || 0) + (S._weatherEncounterMod || 0);
    if (Math.random() < encChance && S.randomEncounters.length > 0) {
        // Stealth activity: chance to avoid encounter entirely
        if (typeof _checkStealthAvoid === 'function' && _checkStealthAvoid()) {
            // Encounter avoided — continue moving
        } else {
            const enc = S.randomEncounters.shift();
            // Watch activity: grants advantage on first encounter
            if (typeof _checkWatchAdvantage === 'function') _checkWatchAdvantage();
            revealEventSprite(col, row, 'encounter');
            spawnFloatingText(col, row, 'shh...', '#aa3a2a', 'big');
            setTimeout(() => showRandomEncounter(enc), 300);
            return;
        }
    }

    // Ambient event — atmospheric moment without choices (10% chance if available)
    if (S.ambientEvents && S.ambientEvents.length > 0 && Math.random() < 0.10) {
        const ambient = S.ambientEvents.shift();
        revealEventSprite(col, row, 'ambient');
        spawnFloatingText(col, row, '...', '#8a9a6a', 'flavor');
        setTimeout(() => showAmbientEvent(ambient), 200);
        return;
    }

    // Check if player is surrounded (no valid moves)
    const neighbors = getNeighbors(col, row);
    const hasValidMove = neighbors.some(([c, r]) => {
        const t = S.grid[r] && S.grid[r][c] ? S.grid[r][c] : '.';
        return !IMPASSABLE.has(t);
    });
    if (!hasValidMove) {
        showTerrainToast('Sem caminhos disponíveis!', 'damage');
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

// Draw footprint trail on visited hexes
function drawVisitedTrail(ctx, timestamp) {
    if (!S.visited || S.visited.size === 0) return;
    const pulse = 0.4 + Math.sin((timestamp || 0) * 0.002) * 0.15;

    // Build ordered path for breadcrumb line
    const visitedArr = Array.from(S.visited);
    const points = [];

    for (let vi = 0; vi < visitedArr.length; vi++) {
        const key = visitedArr[vi];
        const [c, r] = key.split(',').map(Number);
        if (S.fogState[key] !== 'visible') continue;

        const tile = S.grid[r] && S.grid[r][c] ? S.grid[r][c] : '.';
        const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
        const center = hexToScreen(c, r);
        const h = (TILE_HEIGHT[baseTile] || 1) * UNIT_PX;
        const x = center.x;
        const y = center.y - h;

        // Fade: older hexes are dimmer
        const age = visitedArr.length - vi;
        const fadeFactor = Math.max(0.15, 1.0 - age * 0.03);

        points.push({ x, y, c, r, fadeFactor, age });
    }

    // Breadcrumb path line connecting visited hexes
    if (points.length > 1) {
        ctx.save();
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const segAlpha = 0.08 * Math.min(prev.fadeFactor, curr.fadeFactor);
            ctx.strokeStyle = `rgba(196,149,58,${segAlpha})`;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(curr.x, curr.y);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Footprints on each visited hex (boot-shaped)
    for (const p of points) {
        if (p.c === S.playerCol && p.r === S.playerRow) continue;

        // Direction toward next hex (or random if no next)
        const idx = points.indexOf(p);
        const next = points[idx + 1];
        const angle = next
            ? Math.atan2(next.y - p.y, next.x - p.x) + Math.PI / 2
            : (p.c * 7 + p.r * 13) % 6 * 0.5;

        const alpha = Math.min(0.2, pulse * 0.18 * p.fadeFactor);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);

        // Boot-shaped footprints (darker, more visible)
        ctx.fillStyle = `rgba(40,30,15,${alpha})`;
        // Left boot
        ctx.beginPath();
        ctx.ellipse(-2, -0.5, 1, 2, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-2, -2.8, 0.7, 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Right boot
        ctx.beginPath();
        ctx.ellipse(2, 0.5, 1, 2, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(2, -1.8, 0.7, 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // No direction arrows — footprints alone are sufficient
}

// Tap feedback effect — ripple on hex touch
let _tapFeedbacks = [];
function spawnTapFeedback(col, row) {
    const center = hexToScreen(col, row);
    const tile = S.grid[row] && S.grid[row][col] ? S.grid[row][col] : '.';
    const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
    const h = (TILE_HEIGHT[baseTile] || 1) * UNIT_PX;
    _tapFeedbacks.push({
        x: center.x,
        y: center.y - h,
        radius: 3,
        maxRadius: HEX_W * 0.4,
        alpha: 0.6,
        start: performance.now(),
    });
}

// Draw soft glow on hover/tap (no hex outlines)
function drawHexHoverEffect(ctx, timestamp) {
    // Mouse hover — soft radial glow
    if (_hoveredHex) {
        const { x, y } = hexToScreen(_hoveredHex.col, _hoveredHex.row);
        const tile = S.grid[_hoveredHex.row] && S.grid[_hoveredHex.row][_hoveredHex.col] ? S.grid[_hoveredHex.row][_hoveredHex.col] : '.';
        const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
        const h = (TILE_HEIGHT[baseTile] || 1) * UNIT_PX;
        const age = timestamp - (_hoveredHex.time || timestamp);
        const fadeIn = Math.min(1, age / 200);
        const grad = ctx.createRadialGradient(x, y - h, 0, x, y - h, HEX_W * 0.45);
        grad.addColorStop(0, `rgba(196,149,58,${0.18 * fadeIn})`);
        grad.addColorStop(0.6, `rgba(196,149,58,${0.06 * fadeIn})`);
        grad.addColorStop(1, 'rgba(196,149,58,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y - h, HEX_W * 0.45, 0, Math.PI * 2);
        ctx.fill();
    }

    // Tap reveals — soft glow with fade out
    const TAP_DURATION = 800;
    const now = timestamp;
    _tapRevealHexes = _tapRevealHexes.filter(h => (now - h.startTime) < TAP_DURATION);
    for (const h of _tapRevealHexes) {
        const { x, y } = hexToScreen(h.col, h.row);
        const tile = S.grid[h.row] && S.grid[h.row][h.col] ? S.grid[h.row][h.col] : '.';
        const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
        const ht = (TILE_HEIGHT[baseTile] || 1) * UNIT_PX;
        const age = now - h.startTime;
        const fadeOut = 1 - (age / TAP_DURATION);
        const alpha = 0.15 * fadeOut * fadeOut;
        const grad = ctx.createRadialGradient(x, y - ht, 0, x, y - ht, HEX_W * 0.4);
        grad.addColorStop(0, `rgba(196,149,58,${alpha})`);
        grad.addColorStop(0.7, `rgba(196,149,58,${alpha * 0.3})`);
        grad.addColorStop(1, 'rgba(196,149,58,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y - ht, HEX_W * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================
// EVENT SPRITES — NPCs, objects, dangers on map
// ============================================

function _drawEventSprites(ctx, timestamp) {
    for (const sprite of _eventSprites) {
        const key = sprite.col + ',' + sprite.row;
        if (S.fogState[key] !== 'visible') continue;

        // Fade in (per-type: danger fast, NPC slow)
        const _spriteFade = {danger:200,trap:250,encounter:300,enemy:250,hazard:200,
            search:350,discovery:400,ambient:450,mystery:500,npc:600};
        const age = timestamp - sprite.revealTime;
        sprite.alpha = Math.min(1, age / (_spriteFade[sprite.type] || 500));
        if (sprite.alpha <= 0) continue;

        const center = hexToScreen(sprite.col, sprite.row);
        const tile = S.grid[sprite.row] && S.grid[sprite.row][sprite.col] ? S.grid[sprite.row][sprite.col] : '.';
        const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
        const h = (TILE_HEIGHT[baseTile] || 1) * UNIT_PX;
        const cx = center.x;
        const cy = center.y - h;

        ctx.save();
        ctx.globalAlpha = sprite.alpha;

        const info = EVENT_SPRITE_TYPES[sprite.type] || EVENT_SPRITE_TYPES.discovery;
        // Dispatch to drawing function
        switch (info.draw) {
            case '_drawNPCSprite':    _drawNPCSprite(ctx, cx, cy, info.color, timestamp, sprite); break;
            case '_drawObjectSprite': _drawObjectSprite(ctx, cx, cy, info.color, timestamp, sprite); break;
            case '_drawDangerSprite': _drawDangerSprite(ctx, cx, cy, info.color, timestamp, sprite); break;
            case '_drawTrapSprite':   _drawTrapSprite(ctx, cx, cy, info.color, timestamp, sprite); break;
            case '_drawMysterySprite':_drawMysterySprite(ctx, cx, cy, info.color, timestamp, sprite); break;
            case '_drawAmbientSprite':_drawAmbientSprite(ctx, cx, cy, info.color, timestamp, sprite); break;
            case '_drawEnemySprite':  _drawEnemySprite(ctx, cx, cy, info.color, timestamp, sprite); break;
            default: _drawObjectSprite(ctx, cx, cy, info.color, timestamp, sprite); break;
        }

        ctx.restore();
    }
}

// NPC silhouette — hooded figure
function _drawNPCSprite(ctx, cx, cy, color, ts, sprite) {
    const bob = Math.sin(ts * 0.002) * 1.5;
    const y = cy - 6 + bob;
    // Shadow on ground
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body (cloak)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, y - 8);
    ctx.quadraticCurveTo(cx + 5, y - 2, cx + 4, y + 4);
    ctx.lineTo(cx - 4, y + 4);
    ctx.quadraticCurveTo(cx - 5, y - 2, cx, y - 8);
    ctx.closePath();
    ctx.fill();
    // Head
    ctx.beginPath();
    ctx.arc(cx, y - 9, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    // Hood highlight
    ctx.beginPath();
    ctx.arc(cx, y - 9, 3, Math.PI * 1.1, Math.PI * 1.9);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    // Subtle glow at feet
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8);
    glow.addColorStop(0, color.replace(')', ',0.15)').replace('rgb', 'rgba'));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
}

// Object/discovery — small chest/artifact
function _drawObjectSprite(ctx, cx, cy, color, ts, sprite) {
    const pulse = Math.sin(ts * 0.003) * 0.5 + 0.5;
    const y = cy - 2;
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1, 4, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Small chest/crate
    ctx.fillStyle = '#5a4a2a';
    ctx.fillRect(cx - 4, y - 3, 8, 5);
    // Lid
    ctx.fillStyle = '#6a5a3a';
    ctx.fillRect(cx - 4.5, y - 4, 9, 2);
    // Metal band
    ctx.fillStyle = color;
    ctx.fillRect(cx - 0.5, y - 4, 1, 5);
    // Sparkle
    const sparkAlpha = 0.3 + pulse * 0.4;
    ctx.fillStyle = 'rgba(255,235,180,' + sparkAlpha + ')';
    ctx.beginPath();
    ctx.arc(cx + 2, y - 5, 1, 0, Math.PI * 2);
    ctx.fill();
}

// Danger — skull/warning
function _drawDangerSprite(ctx, cx, cy, color, ts, sprite) {
    const flash = Math.sin(ts * 0.004) * 0.3 + 0.7;
    const y = cy - 4;
    // Red glow
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
    glow.addColorStop(0, 'rgba(200,50,30,' + (0.12 * flash) + ')');
    glow.addColorStop(1, 'rgba(200,50,30,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
    // Skull shape
    ctx.fillStyle = '#d8d0c0';
    ctx.beginPath();
    ctx.arc(cx, y - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    // Jaw
    ctx.fillRect(cx - 2.5, y + 1, 5, 2);
    // Eye sockets
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx - 1.5, y - 2.5, 1, 0, Math.PI * 2);
    ctx.arc(cx + 1.5, y - 2.5, 1, 0, Math.PI * 2);
    ctx.fill();
}

// Trap — jaw trap on ground
function _drawTrapSprite(ctx, cx, cy, color, ts, sprite) {
    const y = cy - 1;
    // Faint ground mark
    ctx.strokeStyle = 'rgba(140,80,40,0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(cx, y, 4, 0, Math.PI * 2);
    ctx.stroke();
    // Trap jaws
    ctx.strokeStyle = '#7a6a4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Left jaw
    ctx.moveTo(cx - 4, y);
    ctx.lineTo(cx - 2, y - 3);
    ctx.lineTo(cx, y);
    // Right jaw
    ctx.moveTo(cx, y);
    ctx.lineTo(cx + 2, y - 3);
    ctx.lineTo(cx + 4, y);
    ctx.stroke();
    // Center pin
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, y, 1, 0, Math.PI * 2);
    ctx.fill();
}

// Mystery — glowing orb
function _drawMysterySprite(ctx, cx, cy, color, ts, sprite) {
    const pulse = Math.sin(ts * 0.002) * 0.4 + 0.6;
    const y = cy - 6;
    const bob = Math.sin(ts * 0.0015) * 2;
    // Outer glow
    const glow = ctx.createRadialGradient(cx, y + bob, 1, cx, y + bob, 9);
    glow.addColorStop(0, 'rgba(120,100,200,' + (0.25 * pulse) + ')');
    glow.addColorStop(0.5, 'rgba(120,100,200,' + (0.08 * pulse) + ')');
    glow.addColorStop(1, 'rgba(120,100,200,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, y + bob, 9, 0, Math.PI * 2);
    ctx.fill();
    // Inner orb
    const orbGrad = ctx.createRadialGradient(cx - 1, y + bob - 1, 0, cx, y + bob, 3.5);
    orbGrad.addColorStop(0, 'rgba(200,190,255,' + (0.7 * pulse) + ')');
    orbGrad.addColorStop(0.6, 'rgba(140,120,220,' + (0.5 * pulse) + ')');
    orbGrad.addColorStop(1, 'rgba(100,80,180,' + (0.2 * pulse) + ')');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(cx, y + bob, 3.5, 0, Math.PI * 2);
    ctx.fill();
}

// Ambient — small nature detail (butterfly, bird, mushroom)
function _drawAmbientSprite(ctx, cx, cy, color, ts, sprite) {
    const y = cy - 3;
    const flutter = Math.sin(ts * 0.006) * 2;
    // Small creature — bird on branch
    ctx.fillStyle = color;
    // Body
    ctx.beginPath();
    ctx.ellipse(cx + flutter * 0.3, y - 2, 2.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.beginPath();
    ctx.arc(cx + 2 + flutter * 0.3, y - 3, 1.2, 0, Math.PI * 2);
    ctx.fill();
    // Wing
    const wingSpread = Math.sin(ts * 0.008) * 0.5 + 0.5;
    ctx.beginPath();
    ctx.moveTo(cx + flutter * 0.3, y - 2.5);
    ctx.quadraticCurveTo(cx - 2, y - 5 - wingSpread * 2, cx - 3, y - 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.6;
    ctx.stroke();
}

// Enemy — dark menacing silhouette
function _drawEnemySprite(ctx, cx, cy, color, ts, sprite) {
    const sway = Math.sin(ts * 0.003) * 1;
    const y = cy - 5;
    // Dark aura
    const aura = ctx.createRadialGradient(cx, cy - 2, 2, cx, cy - 2, 12);
    aura.addColorStop(0, 'rgba(60,20,20,0.2)');
    aura.addColorStop(1, 'rgba(60,20,20,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 12, 0, Math.PI * 2);
    ctx.fill();
    // Shadow on ground
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body — hunched figure
    ctx.fillStyle = '#2a1a1a';
    ctx.beginPath();
    ctx.moveTo(cx + sway, y - 6);
    ctx.quadraticCurveTo(cx + 6, y, cx + 5, y + 6);
    ctx.lineTo(cx - 5, y + 6);
    ctx.quadraticCurveTo(cx - 6, y, cx + sway, y - 6);
    ctx.closePath();
    ctx.fill();
    // Eyes
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx - 1.5 + sway * 0.5, y - 4, 0.8, 0, Math.PI * 2);
    ctx.arc(cx + 1.5 + sway * 0.5, y - 4, 0.8, 0, Math.PI * 2);
    ctx.fill();
}

function drawTapFeedback(ctx, timestamp) {
    for (let i = _tapFeedbacks.length - 1; i >= 0; i--) {
        const f = _tapFeedbacks[i];
        const elapsed = timestamp - f.start;
        const duration = 600;
        if (elapsed > duration) { _tapFeedbacks.splice(i, 1); continue; }
        const t = elapsed / duration;
        const radius = f.radius + (f.maxRadius - f.radius) * t;
        const alpha = f.alpha * (1 - t);

        ctx.strokeStyle = `rgba(196,149,58,${alpha.toFixed(2)})`;
        ctx.lineWidth = 2 * (1 - t * 0.5);
        ctx.beginPath();
        ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Smooth camera follow during movement animation (lerp toward player)
function _smoothCameraFollow() {
    const viewport = document.getElementById('map-viewport');
    if (!viewport) return;

    const targetX = playerScreenX - viewport.clientWidth / 2;
    const targetY = playerScreenY - viewport.clientHeight / 2;

    const curX = viewport.scrollLeft;
    const curY = viewport.scrollTop;

    // Lerp factor — smooth tracking
    const lerp = 0.16;
    const newX = curX + (targetX - curX) * lerp;
    const newY = curY + (targetY - curY) * lerp;

    viewport.scrollLeft = Math.max(0, newX);
    viewport.scrollTop = Math.max(0, newY);
}

// ═══════════════════════════════════════════════════════
// PLAYER DYNAMIC LIGHTING — torch glow based on day phase
// ═══════════════════════════════════════════════════════
function drawPlayerLight(ctx, timestamp) {
    const phase = getDayPhase();
    let radius, r, g, b, alpha;

    switch (phase) {
        case 'dawn':
            radius = HEX_W * 2; r = 255; g = 180; b = 80; alpha = 0.07; break;
        case 'day':
            radius = HEX_W * 1.5; r = 255; g = 240; b = 200; alpha = 0.03; break;
        case 'dusk':
            radius = HEX_W * 2.2; r = 255; g = 140; b = 50; alpha = 0.1; break;
        case 'night':
            radius = HEX_W * 3; r = 255; g = 160; b = 60; alpha = 0.16; break;
    }

    // Torch flicker at night/dusk
    if (phase === 'night' || phase === 'dusk') {
        const flicker = Math.sin(timestamp * 0.005) * 0.025 + Math.sin(timestamp * 0.013) * 0.015;
        alpha += flicker;
        radius += Math.sin(timestamp * 0.007) * 4;
    }

    const grad = ctx.createRadialGradient(playerScreenX, playerScreenY, 0, playerScreenX, playerScreenY, radius);
    grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
    grad.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.5})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(playerScreenX, playerScreenY, radius, 0, Math.PI * 2);
    ctx.fill();
}

// ═══════════════════════════════════════════════════════
// FOG REVEAL FLASH — golden burst when new hexes are discovered
// ═══════════════════════════════════════════════════════
function drawFogRevealFlash(ctx, timestamp) {
    if (!_fogReveals || _fogReveals.length === 0) return;

    for (const rev of _fogReveals) {
        const t = rev.progress;
        if (t <= 0 || t >= 1) continue;

        // Golden expanding burst
        const radius = HEX_W * 0.8 * t;
        const alpha = 0.35 * (1 - t);

        const grad = ctx.createRadialGradient(rev.x, rev.y, 0, rev.x, rev.y, radius);
        grad.addColorStop(0, `rgba(255,220,150,${alpha})`);
        grad.addColorStop(0.5, `rgba(196,149,58,${alpha * 0.4})`);
        grad.addColorStop(1, 'rgba(196,149,58,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(rev.x, rev.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core
        if (t < 0.3) {
            const coreAlpha = 0.5 * (1 - t / 0.3);
            ctx.fillStyle = `rgba(255,240,200,${coreAlpha})`;
            ctx.beginPath();
            ctx.arc(rev.x, rev.y, HEX_W * 0.15, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ═══════════════════════════════════════════════════════
// TERRAIN TOOLTIP — long press shows terrain info
// ═══════════════════════════════════════════════════════
const TERRAIN_NAMES = {
    '.': 'Terreno Aberto', 'T': 'Floresta', 'g': 'Vegetação', 'w': 'Água Rasa',
    'W': 'Água Profunda', 'r': 'Rochas', 'R': 'Ruínas', 'M': 'Montanha',
    'p': 'Trilha', 'b': 'Ossadas', '#': 'Muro', 's': 'Areia',
    'm': 'Lama', 'i': 'Gelo', 'v': 'Solo Vulcânico', 'L': 'Lava',
};
let _longPressTimer = null;
let _longPressPos = null;

function initTerrainTooltip() {
    if (!_canvas) return;
    _canvas.addEventListener('touchstart', _onTooltipTouchStart, { passive: true });
    _canvas.addEventListener('touchend', _onTooltipTouchEnd);
    _canvas.addEventListener('touchmove', _onTooltipTouchMove, { passive: true });
}

function _onTooltipTouchStart(e) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    _longPressPos = { x: touch.clientX, y: touch.clientY };
    _longPressTimer = setTimeout(() => _showTerrainTooltip(touch), 500);
}

function _onTooltipTouchEnd() {
    clearTimeout(_longPressTimer);
    _longPressTimer = null;
    _hideTerrainTooltip();
}

function _onTooltipTouchMove(e) {
    if (!_longPressPos) return;
    const touch = e.touches[0];
    const dx = touch.clientX - _longPressPos.x;
    const dy = touch.clientY - _longPressPos.y;
    if (dx * dx + dy * dy > 100) { // moved > 10px
        clearTimeout(_longPressTimer);
        _longPressTimer = null;
        _hideTerrainTooltip();
    }
}

function _showTerrainTooltip(touch) {
    const rect = _canvas.getBoundingClientRect();
    const sx = touch.clientX - rect.left;
    const sy = touch.clientY - rect.top;
    const scaleX = _canvasLogicalW / rect.width;
    const scaleY = _canvasLogicalH / rect.height;
    const hex = screenToHex(sx * scaleX, sy * scaleY, S.grid, ROWS, COLS);
    if (hex.col < 0 || hex.row < 0) return;

    const key = `${hex.col},${hex.row}`;
    if (S.fogState[key] === 'hidden') return;

    const tile = S.grid[hex.row] && S.grid[hex.row][hex.col] ? S.grid[hex.row][hex.col] : '.';
    const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
    const name = TERRAIN_NAMES[baseTile] || 'Desconhecido';
    const difficult = typeof isDifficultTerrain === 'function' && isDifficultTerrain(baseTile, S.biome);
    const impass = IMPASSABLE.has(tile);

    let label = name;
    if (impass) label += ' · Intransitável';
    else if (difficult) label += ' · Difícil';

    const tooltip = document.getElementById('terrain-tooltip');
    if (!tooltip) return;
    tooltip.textContent = label;
    tooltip.style.display = 'block';

    // Position near touch, above finger
    const viewport = document.getElementById('map-viewport');
    const vpRect = viewport ? viewport.getBoundingClientRect() : rect;
    tooltip.style.left = Math.min(touch.clientX - vpRect.left, vpRect.width - 120) + 'px';
    tooltip.style.top = (touch.clientY - vpRect.top - 40) + 'px';
}

function _hideTerrainTooltip() {
    const tooltip = document.getElementById('terrain-tooltip');
    if (tooltip) tooltip.style.display = 'none';
}

// ═══════════════════════════════════════════════════════
// MINIMAP — small overview in top-right corner
// ═══════════════════════════════════════════════════════
let _minimapCanvas = null;
let _minimapCtx = null;
let _minimapDirty = true;

// Minimap states: 'compact' (default), 'expanded', 'hidden'
let _minimapState = 'compact';

function initMinimap() {
    _minimapCanvas = document.getElementById('minimap');
    if (!_minimapCanvas) return;
    _minimapCtx = _minimapCanvas.getContext('2d');
    _minimapDirty = true;

    // Restore saved state
    if (S.minimapState) _minimapState = S.minimapState;
    _applyMinimapState();

    // Click to cycle: compact → expanded → hidden → compact
    _minimapCanvas.addEventListener('click', (e) => {
        e.stopPropagation();
        if (_minimapState === 'compact') _minimapState = 'expanded';
        else if (_minimapState === 'expanded') _minimapState = 'hidden';
        else _minimapState = 'compact';
        S.minimapState = _minimapState;
        _applyMinimapState();
        _minimapDirty = true;
    });
}

function _applyMinimapState() {
    if (!_minimapCanvas) return;
    _minimapCanvas.classList.remove('minimap-expanded', 'minimap-hidden');
    if (_minimapState === 'expanded') _minimapCanvas.classList.add('minimap-expanded');
    else if (_minimapState === 'hidden') _minimapCanvas.classList.add('minimap-hidden');
}

// Auto-reposition minimap when player is near top-right
function _updateMinimapPosition() {
    if (!_minimapCanvas || _minimapState === 'hidden') return;
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    const cw = canvas.clientWidth;
    // Player screen position relative to viewport
    const nearTopRight = playerScreenX > cw - 100 && playerScreenY < 120;
    if (nearTopRight) {
        _minimapCanvas.classList.add('minimap-bottom');
    } else {
        _minimapCanvas.classList.remove('minimap-bottom');
    }
}

function updateMinimap() { _minimapDirty = true; _updateMinimapPosition(); }

function drawMinimap() {
    if (!_minimapCanvas || !_minimapCtx || !_minimapDirty) return;
    _minimapDirty = false;

    const w = _minimapCanvas.width;
    const h = _minimapCanvas.height;
    const ctx = _minimapCtx;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1e1a16';
    ctx.fillRect(0, 0, w, h);

    const cellW = w / COLS;
    const cellH = h / ROWS;
    const biome = S.biome || 'forest';
    const colors = BIOME_COLORS[biome] || BIOME_COLORS.forest;
    const vis = S.visibility || 3;

    // Draw grid cells with distance-based fog
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const key = `${col},${row}`;
            const fog = S.fogState[key];
            if (!fog || fog === 'hidden') continue;

            const tile = S.grid[row] && S.grid[row][col] ? S.grid[row][col] : '.';
            const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
            const color = colors[baseTile] || colors['.'] || '#3a3a3a';

            const dist = hexDist(col, row, S.playerCol, S.playerRow);
            let alpha;
            if (fog === 'dim') {
                alpha = 0.08;
            } else if (dist <= 1) {
                alpha = 1;
            } else if (dist <= vis) {
                alpha = 0.7 - (dist - 1) * 0.15;
            } else if (dist <= vis + 2) {
                alpha = 0.12;
            } else {
                alpha = 0.05;
            }

            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.fillRect(col * cellW, row * cellH, cellW + 0.5, cellH + 0.5);
        }
    }
    ctx.globalAlpha = 1;

    // Exit marker (green) — only if within visible range
    const exitKey = `${S.exitCol},${S.exitRow}`;
    const exitDist = hexDist(S.exitCol, S.exitRow, S.playerCol, S.playerRow);
    if (S.fogState[exitKey] === 'visible' && exitDist <= vis + 1) {
        ctx.globalAlpha = exitDist <= vis ? 0.9 : 0.4;
        ctx.fillStyle = '#4ad680';
        ctx.beginPath();
        ctx.arc(S.exitCol * cellW + cellW / 2, S.exitRow * cellH + cellH / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // Visited trail on minimap (subtle golden dots)
    if (S.visited) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#c4953a';
        const visitedArr = Array.from(S.visited);
        for (let i = 0; i < visitedArr.length; i++) {
            const [vc, vr] = visitedArr[i].split(',').map(Number);
            if (vc === S.playerCol && vr === S.playerRow) continue;
            const fade = Math.max(0.15, 1 - (visitedArr.length - i) * 0.04);
            ctx.globalAlpha = 0.25 * fade;
            ctx.fillRect(vc * cellW + 0.5, vr * cellH + 0.5, cellW - 1, cellH - 1);
        }
        ctx.globalAlpha = 1;
    }

    // POI markers (type-colored) — only if within visible range
    const poiTypeColors = {dis:'#c4953a', sea:'#8a9a5a', dan:'#c44a2a', mys:'#8a6aaa', npc:'#5a9a6a'};
    for (const poi of S.pois) {
        if (S.poisResolved.has(poi.id)) continue;
        const key = `${poi.col},${poi.row}`;
        if (S.fogState[key] !== 'visible') continue;
        const poiDist = hexDist(poi.col, poi.row, S.playerCol, S.playerRow);
        if (poiDist > vis + 1) continue;
        ctx.globalAlpha = poiDist <= vis ? 0.9 : 0.4;
        ctx.fillStyle = poiTypeColors[poi.type] || '#fff';
        ctx.beginPath();
        ctx.arc(poi.col * cellW + cellW / 2, poi.row * cellH + cellH / 2, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Player marker (gold with glow)
    const px = S.playerCol * cellW + cellW / 2;
    const py = S.playerRow * cellH + cellH / 2;
    ctx.fillStyle = 'rgba(196,149,58,0.4)';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c4953a';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
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
    dawn:  { icon: '', label: 'Amanhecer' },
    day:   { icon: '', label: 'Dia' },
    dusk:  { icon: '', label: 'Entardecer' },
    night: { icon: '', label: 'Noite' },
};
const _WEATHER_INFO = {
    s: { icon: '', label: 'Limpo' },
    r: { icon: '', label: 'Chuva', css: 'weather-rain' },
    f: { icon: '', label: 'Névoa', css: 'weather-fog' },
    t: { icon: '', label: 'Tempestade', css: 'weather-storm' },
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

    // Initialize weather particles if available
    if (typeof initWeatherParticles === 'function') {
        initWeatherParticles(wCode);
    }

    // Mechanical effects: night + weather
    S._nightEncounterBonus = phase === 'night' ? 0.10 : 0;

    // Weather mechanical effects (DMG Ch.5)
    S._weatherVisibilityMod = 0;
    S._weatherEncounterMod = 0;
    S._weatherDifficultAll = false;
    S._weatherCONSaveDC = 0;
    S._weatherLightningChance = 0;

    if (wCode === 'f') {
        S._weatherVisibilityMod = -1;  // Fog: -1 visibility
    } else if (wCode === 'r') {
        S._weatherVisibilityMod = -1;  // Heavy rain: -1 visibility
        S._weatherDifficultAll = true;  // Mud = difficult terrain
    } else if (wCode === 't') {
        S._weatherVisibilityMod = -2;   // Storm: -2 visibility
        S._weatherEncounterMod = 0.05;  // More encounters
        S._weatherDifficultAll = true;   // Storm = difficult terrain
        S._weatherLightningChance = 0.05; // 5% lightning per step in open terrain
    }

    // Extreme temperature (desert/volcanic biomes)
    const extremeHeat = S.biome === 'desert' || S.biome === 'volcanic';
    S._weatherCONSaveDC = extremeHeat ? 10 : (wCode === 't' ? 12 : 0);

    // Weather transition: change weather every 15-20 steps
    _checkWeatherTransition();
}

// Weather transition system (DMG Ch.5)
let _weatherStepCounter = 0;
let _weatherTransitionThreshold = 15 + Math.floor(Math.random() * 6); // 15-20

function _checkWeatherTransition() {
    _weatherStepCounter++;
    if (_weatherStepCounter < _weatherTransitionThreshold) return;
    _weatherStepCounter = 0;
    _weatherTransitionThreshold = 15 + Math.floor(Math.random() * 6);

    // Weather transition table (weighted by biome)
    const transitions = {
        s: ['s', 's', 'r', 'f'],       // Sunny: likely stays, can rain or fog
        r: ['r', 's', 't', 'f'],       // Rain: can clear, worsen to storm, or fog
        f: ['f', 's', 'r'],            // Fog: likely clears
        t: ['t', 'r', 's'],            // Storm: can persist, weaken to rain, or clear
    };
    const current = S.weather || 's';
    const options = transitions[current] || transitions.s;
    const next = options[Math.floor(Math.random() * options.length)];

    if (next !== current) {
        S.weather = next;
        const wInfo = _WEATHER_INFO[next] || _WEATHER_INFO.s;
        const narrations = {
            s: 'As nuvens se dissipam. O c\u00e9u clareia.',
            r: 'Gotas come\u00e7am a cair. A chuva se intensifica.',
            f: 'Uma n\u00e9voa densa come\u00e7a a se formar ao redor.',
            t: 'Trov\u00f5es ecoam ao longe. Uma tempestade se aproxima!',
        };
        if (typeof showTerrainToast === 'function') {
            showTerrainToast(`${wInfo.icon} ${narrations[next] || wInfo.label}`, 'flavor');
        }
        // Re-apply atmosphere visuals
        const wCode = next;
        const wo = document.getElementById('weather-overlay');
        if (wo) {
            wo.classList.remove('weather-rain', 'weather-fog', 'weather-storm');
            if (wInfo.css) wo.classList.add(wInfo.css);
        }
        if (typeof initWeatherParticles === 'function') initWeatherParticles(wCode);

        // Update mechanical effects
        S._weatherVisibilityMod = wCode === 'f' ? -1 : (wCode === 'r' ? -1 : (wCode === 't' ? -2 : 0));
        S._weatherDifficultAll = wCode === 'r' || wCode === 't';
        S._weatherEncounterMod = wCode === 't' ? 0.05 : 0;
        S._weatherLightningChance = wCode === 't' ? 0.05 : 0;

        if (typeof saveState === 'function') saveState();
    }
}


// ═══════════════════════════════════════════════════════
// MOVEMENT COST PREVIEW (on adjacent hexes)
// ═══════════════════════════════════════════════════════
function _drawMoveCostIndicators(timestamp) {
    if (!S.grid || !S.grid.length) return;
    if (typeof isMoving === 'function' && isMoving()) return;

    const neighbors = typeof getNeighbors === 'function' ? getNeighbors(S.playerCol, S.playerRow) : [];
    const IMPASSABLE_SET = typeof IMPASSABLE !== 'undefined' ? IMPASSABLE : new Set(['#', 'W', 'L']);
    const DIFFICULT_SET = typeof DIFFICULT !== 'undefined' ? DIFFICULT : new Set(['~', 'S', 'r', 'H']);

    for (const [c, r] of neighbors) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        const tile = S.grid[r] && S.grid[r][c] ? S.grid[r][c] : '.';
        const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;
        if (IMPASSABLE_SET.has(baseTile)) continue;

        const isDifficult = DIFFICULT_SET.has(baseTile);
        const cost = isDifficult ? 2 : 1;
        // Exhaustion level 2+ = always difficult terrain
        const exhHalf = S.exhaustion >= 2;
        const effectiveCost = exhHalf && !isDifficult ? 2 : cost;

        const center = hexToScreen(c, r);
        const height = (typeof TILE_HEIGHT !== 'undefined' ? TILE_HEIGHT[baseTile] : 1) || 1;
        const heightPx = height * (typeof UNIT_PX !== 'undefined' ? UNIT_PX : 3);

        // Draw cost badge on hex
        const bx = center.x;
        const by = center.y - heightPx - 6;

        _ctx.save();
        _ctx.globalAlpha = 0.7;
        const label = effectiveCost > 1 ? (effectiveCost + '') : '';
        if (label) {
            // Difficult terrain indicator
            _ctx.font = '9px MedievalSharp, serif';
            const tw = _ctx.measureText(label).width;
            _ctx.fillStyle = 'rgba(42,36,32,0.85)';
            _ctx.beginPath();
            _ctx.roundRect(bx - tw/2 - 4, by - 6, tw + 8, 13, 3);
            _ctx.fill();
            _ctx.strokeStyle = 'rgba(220,160,40,0.6)';
            _ctx.lineWidth = 0.5;
            _ctx.stroke();
            _ctx.fillStyle = '#dca028';
            _ctx.textAlign = 'center';
            _ctx.textBaseline = 'middle';
            _ctx.fillText(label, bx, by + 1);
        }

        // Hazard warning icon for known hazards
        const hasHazard = S._hazardsTriggered && !S._hazardsTriggered.has(c + ',' + r) &&
            typeof HAZARD_TILES !== 'undefined' && HAZARD_TILES && HAZARD_TILES[baseTile];
        if (hasHazard) {
            _ctx.font = '10px serif';
            _ctx.fillStyle = '#c44';
            _ctx.textAlign = 'center';
            _ctx.textBaseline = 'middle';
            _ctx.fillText('\u26a0', bx, by - (label ? 12 : 0));
        }

        _ctx.restore();
    }
}


// ═══════════════════════════════════════════════════════
// ROAMING DANGER MARKERS (enemy patrols)
// ═══════════════════════════════════════════════════════
let _dangerMarkers = [];
let _dangerMarkersInit = false;

function _initDangerMarkers() {
    if (_dangerMarkersInit) return;
    _dangerMarkersInit = true;
    const count = Math.min(3, Math.max(1, S.dangerLevel - 1)); // 0 at danger 1, 1-3 at higher
    if (count <= 0) return;

    _dangerMarkers = [];
    for (let i = 0; i < count; i++) {
        // Place marker at random walkable hex far from player
        let col, row, attempts = 0;
        do {
            col = Math.floor(Math.random() * COLS);
            row = Math.floor(Math.random() * ROWS);
            attempts++;
        } while (attempts < 50 && (
            !S.grid[row] || !S.grid[row][col] ||
            IMPASSABLE.has(S.grid[row][col]) ||
            (typeof hexDist === 'function' && hexDist(col, row, S.playerCol, S.playerRow) < 4)
        ));
        if (attempts >= 50) continue;
        _dangerMarkers.push({ col, row, icon: '\u2620', moveTimer: 0 });
    }
}

function _moveDangerMarkers() {
    for (const m of _dangerMarkers) {
        m.moveTimer++;
        if (m.moveTimer < 2) continue; // Move every 2 player steps
        m.moveTimer = 0;

        const neighbors = typeof getNeighbors === 'function' ? getNeighbors(m.col, m.row) : [];
        const valid = neighbors.filter(([c, r]) => {
            if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
            const t = S.grid[r] && S.grid[r][c] ? S.grid[r][c] : '.';
            return !IMPASSABLE.has(t);
        });
        if (valid.length === 0) continue;

        // Bias toward player (50% chance to move closer)
        if (Math.random() < 0.5 && typeof hexDist === 'function') {
            valid.sort((a, b) =>
                hexDist(a[0], a[1], S.playerCol, S.playerRow) -
                hexDist(b[0], b[1], S.playerCol, S.playerRow)
            );
            m.col = valid[0][0];
            m.row = valid[0][1];
        } else {
            const pick = valid[Math.floor(Math.random() * valid.length)];
            m.col = pick[0];
            m.row = pick[1];
        }
    }
}

function _checkDangerMarkerCollision() {
    for (let i = _dangerMarkers.length - 1; i >= 0; i--) {
        const m = _dangerMarkers[i];
        if (m.col === S.playerCol && m.row === S.playerRow) {
            // Player walked into danger marker = forced encounter
            _dangerMarkers.splice(i, 1);
            if (S.randomEncounters && S.randomEncounters.length > 0) {
                const enc = S.randomEncounters.shift();
                if (typeof showTerrainToast === 'function') {
                    showTerrainToast('\u2620 Patrulha inimiga! Encontro inevit\u00e1vel!', 'danger');
                }
                setTimeout(() => {
                    if (typeof showRandomEncounter === 'function') showRandomEncounter(enc);
                }, 500);
                return true;
            }
        }
    }
    return false;
}

function _drawDangerMarkers(ctx, timestamp) {
    if (!_dangerMarkersInit) _initDangerMarkers();

    const pulse = 0.6 + Math.sin((timestamp || 0) * 0.004) * 0.4;
    for (const m of _dangerMarkers) {
        const key = `${m.col},${m.row}`;
        // Only draw if hex is visible (not in fog)
        if (S.fogState[key] === 'hidden') continue;

        const center = hexToScreen(m.col, m.row);
        const baseTile = (S.grid[m.row] && S.grid[m.row][m.col]) || '.';
        const height = (typeof TILE_HEIGHT !== 'undefined' ? TILE_HEIGHT[baseTile] : 1) || 1;
        const heightPx = height * (typeof UNIT_PX !== 'undefined' ? UNIT_PX : 3);

        ctx.save();
        ctx.globalAlpha = pulse * 0.8;

        // Red pulsing glow circle
        const gx = center.x;
        const gy = center.y - heightPx - 4;
        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 8);
        grad.addColorStop(0, 'rgba(200,40,40,0.5)');
        grad.addColorStop(1, 'rgba(200,40,40,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(gx, gy, 8, 0, Math.PI * 2);
        ctx.fill();

        // Skull icon
        ctx.globalAlpha = 0.7 + pulse * 0.3;
        ctx.font = '10px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#c44';
        ctx.fillText('\u2620', gx, gy);

        ctx.restore();
    }
}
