// ═══════════════════════════════════════════════════════
// NAVIGATE UI — Info panel, actions, interactions
// ═══════════════════════════════════════════════════════

// ── Haptic helper (differentiated by context) ──
function _haptic(type) {
    try {
        if (!tg?.HapticFeedback) return;
        if (type === 'tap') tg.HapticFeedback.impactOccurred('light');
        else if (type === 'open') tg.HapticFeedback.impactOccurred('medium');
        else if (type === 'travel') tg.HapticFeedback.impactOccurred('heavy');
        else if (type === 'warn') tg.HapticFeedback.notificationOccurred('warning');
        else if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
        else if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
        else tg.HapticFeedback.impactOccurred('light');
    } catch(e) { /* silent */ }
}

// ── Location tap handler ──
function handleLocationTap(locId) {
    _haptic('tap');
    closeQuickList();

    S.selectedLoc = locId;
    const locData = S.locations[locId];
    if (!locData) {
        console.warn('[NAVIGATE] No data for location:', locId);
        return;
    }

    const panel = document.getElementById('info-panel');
    const isCurrent = locId === S.currentLoc;
    const connected = isConnected(S.currentLoc, locId);
    const discoveredSet = new Set(S.discoveredLocs || []);
    const isExplored = discoveredSet.has(locId);
    const hasMapCoverage = S.mapCoverage.has(locId);
    const isKnownMapped = !isExplored && hasMapCoverage;
    const isKnownUnmapped = !isExplored && !hasMapCoverage;

    // Header — unmapped locations show ??? instead of name
    if (isKnownUnmapped) {
        document.getElementById('info-icon').textContent = '🌫️';
        document.getElementById('info-title').textContent = '???';
    } else {
        document.getElementById('info-icon').textContent = locData.i || '📍';
        document.getElementById('info-title').textContent = locData.n || 'Desconhecido';
    }

    // Danger badge
    const dangerEl = document.getElementById('info-danger');
    const danger = locData.d || 0;
    if (isExplored) {
        // Explored: show danger symbols
        const dangerSymbols = getDangerLabel(danger);
        if (dangerSymbols) {
            dangerEl.textContent = dangerSymbols;
            dangerEl.style.borderColor = getDangerColor(danger);
            dangerEl.style.color = getDangerColor(danger);
            dangerEl.style.display = '';
        } else {
            dangerEl.style.display = 'none';
        }
    } else if (isKnownMapped) {
        // Known with map: mysterious danger hint
        if (danger >= 5) {
            dangerEl.textContent = '💀 ???';
            dangerEl.style.borderColor = '#8a4a3a';
            dangerEl.style.color = '#8a4a3a';
            dangerEl.style.display = '';
        } else if (danger >= 3) {
            dangerEl.textContent = '⚠️ ???';
            dangerEl.style.borderColor = '#8a6a3a';
            dangerEl.style.color = '#8a6a3a';
            dangerEl.style.display = '';
        } else {
            dangerEl.style.display = 'none';
        }
    } else {
        // Unmapped: no danger info
        dangerEl.style.display = 'none';
    }

    // Biome
    const biomeInfo = BIOME_INFO[locData.b] || BIOME_INFO.plains;
    const biomeLabel = biomeInfo.label || locData.b;
    if (isKnownUnmapped) {
        document.getElementById('info-biome').textContent = '🌫️ Região Desconhecida';
    } else {
        document.getElementById('info-biome').textContent =
            `${locData.s ? '🏘️ Assentamento' : '🌍 Região'} — ${biomeLabel}`;
    }

    // Description
    if (isExplored) {
        document.getElementById('info-desc').textContent = locData.ds || '';
    } else if (isKnownMapped) {
        document.getElementById('info-desc').textContent =
            'Você ouviu relatos sobre este lugar, mas nunca esteve lá...';
    } else {
        document.getElementById('info-desc').textContent =
            'Névoa densa... Sem um mapa, é impossível distinguir o que há aqui.';
    }

    // Tags (weighted distance, connections, danger hint)
    const tagsEl = document.getElementById('info-stats');
    const wDist = weightedDistance(S.currentLoc, locId, connectionGraph);
    const connCount = (connectionGraph[locId] || []).length;

    let tagsHtml = '';
    if (!isCurrent && wDist >= 0) {
        tagsHtml += `<span class="info-tag">🕐 ${wDist} turno${wDist !== 1 ? 's' : ''}</span>`;
    }
    if (isExplored) {
        tagsHtml += `<span class="info-tag">🔗 ${connCount} rota${connCount !== 1 ? 's' : ''}</span>`;
    }

    // Mysterious danger hints
    if (isExplored) {
        const playerLv = S.charData?.lv || 1;
        if (danger > playerLv + 2) {
            tagsHtml += `<span class="info-tag info-tag-danger">💀 Um arrepio percorre sua espinha...</span>`;
        } else if (danger > playerLv) {
            tagsHtml += `<span class="info-tag info-tag-warn">⚠️ Algo inquietante paira no ar</span>`;
        }
    } else if (isKnownMapped) {
        tagsHtml += `<span class="info-tag">🌫️ Inexplorado</span>`;
    } else {
        tagsHtml += `<span class="info-tag">🌫️ Sem Mapa</span>`;
    }

    tagsEl.innerHTML = tagsHtml;

    // Quests/Dungeons — only show for explored locations
    const questsEl = document.getElementById('info-quests');
    const dungeonsEl = document.getElementById('info-dungeons');

    if (isExplored) {
        const locQuests = S.quests.filter(q => q.loc === locId);
        if (locQuests.length > 0) {
            const shown = locQuests.slice(0, 3);
            const extra = locQuests.length - shown.length;
            let qHtml = '📜 <b>Missões:</b> ' + shown.map(q => `<span>${q.t}</span>`).join(', ');
            if (extra > 0) qHtml += ` <span style="opacity:0.6">... +${extra} mais</span>`;
            questsEl.innerHTML = qHtml;
            questsEl.style.display = '';
        } else {
            questsEl.style.display = 'none';
        }

        const locDungeons = S.dungeons[locId] || [];
        if (locDungeons.length > 0) {
            const shown = locDungeons.slice(0, 3);
            const extra = locDungeons.length - shown.length;
            let dHtml = '🏰 <b>Masmorras:</b> ' + shown.map(d =>
                `<span>${d.done ? '✅' : '⭐'} ${d.n}</span>`
            ).join(', ');
            if (extra > 0) dHtml += ` <span style="opacity:0.6">... +${extra} mais</span>`;
            dungeonsEl.innerHTML = dHtml;
            dungeonsEl.style.display = '';
        } else {
            dungeonsEl.style.display = 'none';
        }
    } else {
        questsEl.style.display = 'none';
        dungeonsEl.style.display = 'none';
    }

    // Action buttons
    const actionsEl = document.getElementById('info-actions');
    actionsEl.innerHTML = '';

    // Note area
    const noteEl = document.getElementById('info-note');

    if (isCurrent) {
        noteEl.style.display = 'none';
        const exploreBtn = createActionBtn(
            '🔍 Explorar',
            'info-btn-explore',
            () => finishNavigation('explore')
        );
        actionsEl.appendChild(exploreBtn);

        if (S.canCamp) {
            const campBtn = createActionBtn(
                '🏕️ Acampar',
                'info-btn-camp',
                () => finishNavigation('camp')
            );
            actionsEl.appendChild(campBtn);
        }
    } else if (connected) {
        const edgeDist = getConnectionDistance(S.currentLoc, locId);

        if (isExplored) {
            // Explored + has map: safe direct travel + encounter risk hint
            const danger = locData.d || 0;
            let riskHint = '';
            if (danger >= 7) riskHint = ' · <span style="color:#8a2a2a">☠️ Perigo extremo</span>';
            else if (danger >= 5) riskHint = ' · <span style="color:#8a4a3a">⚠️ Alta chance de encontros</span>';
            else if (danger >= 3) riskHint = ' · <span style="color:#8a6a3a">⚠️ Encontros prováveis</span>';
            noteEl.innerHTML = `🕐 <b>${edgeDist} turno${edgeDist !== 1 ? 's' : ''}</b> de viagem${riskHint}`;
            noteEl.style.display = 'block';
            noteEl.style.color = '';
            const travelBtn = createActionBtn(
                `🚶 Viajar para ${locData.n || 'lá'} (${edgeDist}🕐)`,
                'info-btn-travel',
                () => finishNavigation('travel', locId)
            );
            actionsEl.appendChild(travelBtn);
        } else if (isKnownMapped) {
            // Has map but never visited: expedition with map
            noteEl.innerHTML = `⚠️ <b>Primeira Expedição</b> — ${edgeDist} turno${edgeDist !== 1 ? 's' : ''}, encontros e riscos no caminho`;
            noteEl.style.display = 'block';
            noteEl.style.color = '#c4953a';
            const travelBtn = createActionBtn(
                `🧭 Expedição para ${locData.n || 'lá'} (${edgeDist}🕐) ⚠️`,
                'info-btn-travel info-btn-risky',
                () => finishNavigation('travel', locId, { firstVisit: true })
            );
            actionsEl.appendChild(travelBtn);
        } else {
            // No map, never visited: blind expedition
            noteEl.innerHTML = `⚠️ <b>Expedição às Cegas</b> — ${edgeDist} turno${edgeDist !== 1 ? 's' : ''}, sem mapa, alta chance de se perder`;
            noteEl.style.display = 'block';
            noteEl.style.color = '#c4953a';
            const travelBtn = createActionBtn(
                `🧭 Expedição (${edgeDist}🕐 Sem Mapa) ⚠️⚠️`,
                'info-btn-travel info-btn-risky',
                () => finishNavigation('travel', locId, { noMap: true, firstVisit: true })
            );
            actionsEl.appendChild(travelBtn);
        }
    } else if (wDist > 0) {
        // Show route hint via BFS path
        const routePath = bfsPath(S.currentLoc, locId);
        let routeHint = '';
        if (routePath && routePath.length > 2) {
            const via = routePath.slice(1, -1).map(id => {
                const ld2 = S.locations[id];
                return ld2?.n || id;
            });
            const viaStr = via.length <= 3
                ? via.join(' → ')
                : via.slice(0, 2).join(' → ') + ` → ... (${via.length} paradas)`;
            routeHint = `\n🗺️ Rota: ${viaStr}`;
        }
        noteEl.innerHTML = `⛔ Não há caminho direto — <b>${wDist} turno${wDist !== 1 ? 's' : ''}</b> de distância${routeHint}`;
        noteEl.style.display = 'block';
        noteEl.style.color = '';
    } else {
        noteEl.textContent = '⛔ Local inacessível';
        noteEl.style.display = 'block';
        noteEl.style.color = '';
    }

    // Open panel
    panel.classList.add('open');
    _haptic('open');

    // Update cycle buttons
    _updateCycleButtons();

    // Smooth pan to selected location + highlight
    if (typeof panToLocationSmooth === 'function') panToLocationSmooth(locId);
    highlightSelected(locId);
    _updateOffscreenIndicator();
}

// ── Create action button ──
function createActionBtn(text, className, onClick) {
    const btn = document.createElement('button');
    btn.className = `info-btn ${className}`;
    btn.textContent = text;
    if (onClick) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });
    }
    return btn;
}

// ── Close info panel ──
function closeInfoPanel() {
    const panel = document.getElementById('info-panel');
    panel.classList.remove('open');
    S.selectedLoc = null;
    clearHighlight();
}

// ── Highlight selected location ──
function highlightSelected(locId) {
    clearHighlight();

    const svg = document.getElementById('map-svg');
    const groups = svg.querySelectorAll('.loc-node');
    for (const g of groups) {
        if (g.getAttribute('data-loc') === locId) {
            g.classList.add('selected');
            const coords = LOCATION_COORDS[locId];
            if (coords) {
                const { x, y } = hexToPixel(coords.col, coords.row);
                const ring = createSVG('circle', {
                    cx: x, cy: y,
                    r: HEX_RADIUS + 5,
                    fill: 'none',
                    stroke: '#c4953a',
                    'stroke-width': 2,
                    'stroke-opacity': 0.6,
                    class: 'selection-ring',
                });
                svg.appendChild(ring);
            }
        }
    }

    // Highlight path from current to selected
    if (locId !== S.currentLoc) {
        highlightPath(S.currentLoc, locId);
    }
}

// ── Clear all highlights ──
function clearHighlight() {
    const svg = document.getElementById('map-svg');
    svg.querySelectorAll('.selection-ring').forEach(r => r.remove());
    svg.querySelectorAll('.path-highlight').forEach(h => h.remove());
}

// ── Highlight BFS path between two locations (curved, matching connection paths) ──
function highlightPath(fromId, toId) {
    const pathIds = bfsPath(fromId, toId);
    if (!pathIds || pathIds.length < 2) return;

    const svg = document.getElementById('map-svg');

    for (let i = 0; i < pathIds.length - 1; i++) {
        const aCoords = LOCATION_COORDS[pathIds[i]];
        const bCoords = LOCATION_COORDS[pathIds[i + 1]];
        if (!aCoords || !bCoords) continue;

        const aPx = hexToPixel(aCoords.col, aCoords.row);
        const bPx = hexToPixel(bCoords.col, bCoords.row);
        const seed = (aCoords.col * 31 + aCoords.row * 17 + bCoords.col * 13 + bCoords.row * 7);
        const pathD = _buildRoadPath(aPx, bPx, seed);

        const highlight = createSVG('path', {
            d: pathD,
            fill: 'none',
            stroke: '#c4953a',
            'stroke-width': 3,
            'stroke-opacity': 0.5,
            'stroke-linecap': 'round',
            class: 'path-highlight',
        });
        svg.appendChild(highlight);
    }
}

// ── Travel animation (path drawing + marker movement) ──
function animateTravel(fromId, toId, onComplete) {
    const pathIds = bfsPath(fromId, toId);
    if (!pathIds || pathIds.length < 2) { onComplete(); return; }

    const svg = document.getElementById('map-svg');
    const travelGroup = createSVG('g', { class: 'travel-anim-group' });
    svg.appendChild(travelGroup);

    // Build full path segments
    const segments = [];
    let totalLen = 0;
    for (let i = 0; i < pathIds.length - 1; i++) {
        const aC = LOCATION_COORDS[pathIds[i]];
        const bC = LOCATION_COORDS[pathIds[i + 1]];
        if (!aC || !bC) continue;
        const aP = hexToPixel(aC.col, aC.row);
        const bP = hexToPixel(bC.col, bC.row);
        const seed = (aC.col * 31 + aC.row * 17 + bC.col * 13 + bC.row * 7);
        const dx = bP.x - aP.x, dy = bP.y - aP.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const pathD = _buildRoadPath(aP, bP, seed);
        segments.push({ pathD, ax: aP.x, ay: aP.y, bx: bP.x, by: bP.y, len });
        totalLen += len;
    }

    // Draw animated path (stroke-dashoffset reveal)
    for (const seg of segments) {
        const pathD = seg.pathD;
        const p = createSVG('path', {
            d: pathD,
            class: 'travel-path-anim',
            'stroke-dasharray': `${seg.len * 1.5}`,
            'stroke-dashoffset': `${seg.len * 1.5}`,
        });
        p.style.animation = `travelPathDraw ${(seg.len / totalLen) * 1.5}s ease forwards`;
        p.style.animationDelay = `${(segments.indexOf(seg) / segments.length) * 1.5}s`;
        travelGroup.appendChild(p);
    }

    // Animate marker along path
    const markerCoords = LOCATION_COORDS[fromId];
    if (markerCoords) {
        const startP = hexToPixel(markerCoords.col, markerCoords.row);
        const marker = createSVG('circle', {
            cx: startP.x, cy: startP.y, r: 5,
            fill: '#c4953a', class: 'travel-marker',
        });
        travelGroup.appendChild(marker);

        let elapsed = 0;
        const duration = 2000; // 2s total
        const startTime = performance.now();

        function moveMarker(now) {
            elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            // Interpolate through segments
            const targetLen = t * totalLen;
            let accum = 0;
            for (const seg of segments) {
                if (accum + seg.len >= targetLen || seg === segments[segments.length - 1]) {
                    const segT = Math.min((targetLen - accum) / seg.len, 1);
                    // Interpolate along the actual SVG path curve
                    const pt = _pointOnPath(seg.pathD, segT);
                    const px = pt.x;
                    const py = pt.y;
                    marker.setAttribute('cx', px);
                    marker.setAttribute('cy', py);
                    break;
                }
                accum += seg.len;
            }
            if (t < 1) {
                requestAnimationFrame(moveMarker);
            } else {
                marker.classList.add('travel-marker-bounce');
                // Fog reveal burst at destination
                const destC = LOCATION_COORDS[toId];
                if (destC) {
                    const dp = hexToPixel(destC.col, destC.row);
                    const burst = createSVG('circle', {
                        cx: dp.x, cy: dp.y, r: 0,
                        class: 'fog-reveal-burst',
                    });
                    travelGroup.appendChild(burst);
                }
                setTimeout(() => {
                    travelGroup.remove();
                    onComplete();
                }, 800);
            }
        }
        requestAnimationFrame(moveMarker);
    } else {
        setTimeout(() => { travelGroup.remove(); onComplete(); }, 1500);
    }
}

// ── BFS path (returns array of location IDs, cached) ──
const _bfsCache = {};
function bfsPath(fromId, toId) {
    if (fromId === toId) return [fromId];
    const key = `${fromId}|${toId}`;
    if (_bfsCache[key]) return _bfsCache[key];
    const visited = new Set([fromId]);
    const queue = [[fromId, [fromId]]];
    while (queue.length > 0) {
        const [current, path] = queue.shift();
        const neighbors = connectionGraph[current] || [];
        for (const nb of neighbors) {
            if (nb === toId) {
                const result = [...path, nb];
                _bfsCache[key] = result;
                return result;
            }
            if (!visited.has(nb)) {
                visited.add(nb);
                queue.push([nb, [...path, nb]]);
            }
        }
    }
    _bfsCache[key] = null;
    return null;
}

// ── Swipe-to-dismiss info panel (drag down to close) ──
function setupSwipeDismiss() {
    const panel = document.getElementById('info-panel');
    if (!panel) return;
    let startY = 0, currentY = 0, dragging = false;
    const threshold = 60; // px to trigger dismiss

    panel.addEventListener('touchstart', e => {
        // Only capture if touching the handle area (top 40px)
        const rect = panel.getBoundingClientRect();
        const touchY = e.touches[0].clientY - rect.top;
        if (touchY > 50) return; // ignore touches below handle
        startY = e.touches[0].clientY;
        currentY = startY;
        dragging = true;
        panel.classList.add('dragging');
    }, { passive: true });

    panel.addEventListener('touchmove', e => {
        if (!dragging) return;
        currentY = e.touches[0].clientY;
        const dy = currentY - startY;
        if (dy > 0) {
            // Only allow dragging downward
            panel.style.transform = `translateY(${dy}px)`;
        }
    }, { passive: true });

    panel.addEventListener('touchend', () => {
        if (!dragging) return;
        dragging = false;
        panel.classList.remove('dragging');
        const dy = currentY - startY;
        if (dy > threshold) {
            // Dismiss
            panel.style.transform = '';
            closeInfoPanel();
            _haptic('tap');
        } else {
            // Snap back
            panel.style.transform = '';
        }
    });

    panel.addEventListener('touchcancel', () => {
        dragging = false;
        panel.classList.remove('dragging');
        panel.style.transform = '';
    });
}

// ── Hover tooltip (desktop only — shows name + distance without opening panel) ──
function setupHoverTooltip() {
    const vp = document.getElementById('map-viewport');
    const tt = document.getElementById('map-tooltip');
    if (!tt) return;
    const ttName = tt.querySelector('.tt-name');
    const ttDist = tt.querySelector('.tt-dist');

    vp.addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') { tt.style.display = 'none'; return; }
        const loc = e.target.closest?.('.loc-node');
        if (!loc) { tt.style.display = 'none'; return; }
        const locId = loc.getAttribute('data-loc');
        const ld = S.locations[locId];
        if (!ld?.n) { tt.style.display = 'none'; return; }
        const fog = loc.classList.contains('known_unmapped') ? 'unmapped' : '';
        ttName.textContent = fog === 'unmapped' ? '???' : ld.n;
        const wDist = locId !== S.currentLoc ? weightedDistance(S.currentLoc, locId, connectionGraph) : -1;
        ttDist.textContent = wDist > 0 ? `${wDist}🕐` : '';
        tt.style.display = 'block';
        // Position near cursor
        const vpR = vp.getBoundingClientRect();
        let tx = e.clientX - vpR.left + 12;
        let ty = e.clientY - vpR.top - 28;
        if (tx + 120 > vpR.width) tx = e.clientX - vpR.left - 120;
        if (ty < 0) ty = e.clientY - vpR.top + 16;
        tt.style.left = tx + 'px';
        tt.style.top = ty + 'px';
    });
    vp.addEventListener('pointerleave', () => { tt.style.display = 'none'; });
}

// ── Off-screen indicator (arrow pointing to current location when off viewport) ──
function _updateOffscreenIndicator() {
    const osi = document.getElementById('offscreen-indicator');
    if (!osi) return;
    const vp = document.getElementById('map-viewport');
    const coords = LOCATION_COORDS[S.currentLoc];
    if (!coords) { osi.style.display = 'none'; return; }
    const { x, y } = hexToPixel(coords.col, coords.row);
    // Screen position of current loc
    const sx = x * S.zoom + S.panX;
    const sy = y * S.zoom + S.panY;
    const vpW = vp.clientWidth, vpH = vp.clientHeight;
    const margin = 40;
    // Check if off-screen
    if (sx >= -margin && sx <= vpW + margin && sy >= -margin && sy <= vpH + margin) {
        osi.style.display = 'none';
        return;
    }
    // Calculate position on viewport edge
    const cx = vpW / 2, cy = vpH / 2;
    const dx = sx - cx, dy = sy - cy;
    const angle = Math.atan2(dy, dx);
    const edgePad = 30;
    let ex = cx + Math.cos(angle) * (vpW / 2 - edgePad);
    let ey = cy + Math.sin(angle) * (vpH / 2 - edgePad);
    ex = Math.max(edgePad, Math.min(vpW - edgePad, ex));
    ey = Math.max(edgePad, Math.min(vpH - edgePad, ey));
    // Arrow character based on angle
    const deg = angle * 180 / Math.PI;
    let arrow = '→';
    if (deg > -22 && deg <= 22) arrow = '→';
    else if (deg > 22 && deg <= 67) arrow = '↘';
    else if (deg > 67 && deg <= 112) arrow = '↓';
    else if (deg > 112 && deg <= 157) arrow = '↙';
    else if (deg > 157 || deg <= -157) arrow = '←';
    else if (deg > -157 && deg <= -112) arrow = '↖';
    else if (deg > -112 && deg <= -67) arrow = '↑';
    else arrow = '↗';
    osi.querySelector('.osi-arrow').textContent = arrow;
    osi.querySelector('.osi-label').textContent = S.locations[S.currentLoc]?.n || '';
    osi.style.left = ex + 'px';
    osi.style.top = ey + 'px';
    osi.style.display = 'block';
}

// ── Biome legend toggle ──
let _legendOpen = false;
function toggleLegendExpand() {
    _legendOpen = !_legendOpen;
    const panel = document.getElementById('legend-biomes');
    const toggle = document.querySelector('.legend-toggle');
    if (!panel) return;
    if (_legendOpen) {
        // Populate biomes
        panel.innerHTML = '';
        for (const [biome, info] of Object.entries(BIOME_INFO)) {
            const item = document.createElement('span');
            item.className = 'legend-item';
            item.innerHTML = `<span class="legend-dot" style="background:${info.hexFill}"></span> ${info.label}`;
            panel.appendChild(item);
        }
        panel.classList.add('open');
        if (toggle) toggle.textContent = '▲';
    } else {
        panel.classList.remove('open');
        if (toggle) toggle.textContent = '▼';
    }
}

// ── Long-press path preview (500ms hold shows BFS path, release clears) ──
function setupLongPress() {
    const vp = document.getElementById('map-viewport');
    if (!vp) return;
    let _lpTimer = null, _lpLocId = null;
    function _clearPreview() {
        document.querySelectorAll('#map-svg .path-preview').forEach(p => p.remove());
        _lpLocId = null;
    }
    vp.addEventListener('pointerdown', e => {
        const loc = e.target.closest?.('.loc-node');
        if (!loc) return;
        const locId = loc.getAttribute('data-loc');
        if (!locId || locId === S.currentLoc) return;
        _lpTimer = setTimeout(() => {
            _lpLocId = locId;
            _showPathPreview(locId);
            _haptic('tap');
        }, 500);
    });
    vp.addEventListener('pointermove', () => { if (_lpTimer) { clearTimeout(_lpTimer); _lpTimer = null; } });
    vp.addEventListener('pointerup', () => { clearTimeout(_lpTimer); _lpTimer = null; _clearPreview(); });
    vp.addEventListener('pointercancel', () => { clearTimeout(_lpTimer); _lpTimer = null; _clearPreview(); });
}

function _showPathPreview(toId) {
    const pathIds = bfsPath(S.currentLoc, toId);
    if (!pathIds || pathIds.length < 2) return;
    const svg = document.getElementById('map-svg');
    for (let i = 0; i < pathIds.length - 1; i++) {
        const aC = LOCATION_COORDS[pathIds[i]];
        const bC = LOCATION_COORDS[pathIds[i + 1]];
        if (!aC || !bC) continue;
        const aP = hexToPixel(aC.col, aC.row);
        const bP = hexToPixel(bC.col, bC.row);
        const seed = (aC.col * 31 + aC.row * 17 + bC.col * 13 + bC.row * 7);
        const pathD = _buildRoadPath(aP, bP, seed);
        svg.appendChild(createSVG('path', { d: pathD, class: 'path-preview' }));
    }
}

// ── Cycle adjacent locations (◂ ▸ arrows in info panel) ──
function _setupCycleButtons() {
    const prevBtn = document.getElementById('cycle-prev');
    const nextBtn = document.getElementById('cycle-next');
    if (!prevBtn || !nextBtn) return;
    prevBtn.addEventListener('click', e => { e.stopPropagation(); _cycleLocation(-1); });
    nextBtn.addEventListener('click', e => { e.stopPropagation(); _cycleLocation(1); });
}

// Build the cycleable list: ALL known locations sorted by distance (closest first)
function _getCycleList() {
    const knownSet = new Set(S.knownLocs);
    const locs = S.knownLocs.filter(id => id !== S.currentLoc && LOCATION_COORDS[id]);
    // Sort by weighted distance (BFS hops), then alphabetically
    locs.sort((a, b) => {
        const da = weightedDistance(S.currentLoc, a, connectionGraph);
        const db = weightedDistance(S.currentLoc, b, connectionGraph);
        // Unreachable (-1) goes last
        const sa = da < 0 ? 999 : da;
        const sb = db < 0 ? 999 : db;
        if (sa !== sb) return sa - sb;
        const na = S.locations[a]?.n || '';
        const nb = S.locations[b]?.n || '';
        return na.localeCompare(nb);
    });
    return locs;
}

function _cycleLocation(dir) {
    const list = _getCycleList();
    if (list.length === 0) return;
    const curIdx = list.indexOf(S.selectedLoc);
    let nextIdx;
    if (curIdx === -1) {
        nextIdx = dir > 0 ? 0 : list.length - 1;
    } else {
        nextIdx = (curIdx + dir + list.length) % list.length;
    }
    handleLocationTap(list[nextIdx]);
    _haptic('tap');
}

function _updateCycleButtons() {
    const prevBtn = document.getElementById('cycle-prev');
    const nextBtn = document.getElementById('cycle-next');
    if (!prevBtn || !nextBtn) return;
    const list = _getCycleList();
    const hasMultiple = list.length > 1;
    prevBtn.disabled = !hasMultiple;
    nextBtn.disabled = !hasMultiple;
}

// ── Quick-list of known locations ──
function openQuickList() {
    const ql = document.getElementById('quick-list');
    const items = document.getElementById('ql-items');
    if (!ql || !items) return;
    items.innerHTML = '';
    const discoveredSet = new Set(S.discoveredLocs || []);
    // Build sorted list: current first, then by distance
    const locs = S.knownLocs
        .filter(id => LOCATION_COORDS[id])
        .map(id => {
            const ld = S.locations[id] || {};
            const isExp = discoveredSet.has(id);
            const isMapped = S.mapCoverage.has(id);
            const dist = id === S.currentLoc ? -1 : weightedDistance(S.currentLoc, id, connectionGraph);
            return { id, ld, isExp, isMapped, dist };
        })
        .sort((a, b) => {
            if (a.id === S.currentLoc) return -1;
            if (b.id === S.currentLoc) return 1;
            return (a.dist < 0 ? 999 : a.dist) - (b.dist < 0 ? 999 : b.dist);
        });

    for (const loc of locs) {
        const div = document.createElement('div');
        div.className = 'ql-item';
        const isCurr = loc.id === S.currentLoc;
        const name = loc.isExp || loc.isMapped ? (loc.ld.n || loc.id) : '???';
        const icon = loc.isExp || loc.isMapped ? (loc.ld.i || '📍') : '🌫️';

        let badges = '';
        if (isCurr) badges += '<span class="ql-badge">Aqui</span>';
        const locQuests = (S.quests || []).filter(q => q.loc === loc.id);
        if (locQuests.length > 0) badges += `<span class="ql-badge">📜${locQuests.length}</span>`;
        const locDungeons = (S.dungeons || {})[loc.id] || [];
        if (locDungeons.length > 0) badges += `<span class="ql-badge">🏰${locDungeons.length}</span>`;

        div.innerHTML = `<span class="ql-item-icon">${icon}</span>` +
            `<span class="ql-item-name${isCurr ? ' current' : ''}">${name}</span>` +
            (badges ? `<span class="ql-item-badges">${badges}</span>` : '') +
            (loc.dist > 0 ? `<span class="ql-item-dist">${loc.dist}🕐</span>` : '');
        div.addEventListener('click', () => {
            closeQuickList();
            handleLocationTap(loc.id);
        });
        items.appendChild(div);
    }
    ql.classList.add('open');
    closeInfoPanel();
}

function closeQuickList() {
    const ql = document.getElementById('quick-list');
    if (ql) ql.classList.remove('open');
}

// ── Gesture tutorial (first-visit only, auto-dismiss) ──
function showGestureTutorial() {
    if (localStorage.getItem('valdoria_nav_tutorial')) return;
    const gt = document.getElementById('gesture-tutorial');
    if (!gt) return;
    gt.classList.add('visible');
    // Auto-dismiss after 4s
    const dismiss = () => {
        gt.classList.remove('visible');
        localStorage.setItem('valdoria_nav_tutorial', '1');
    };
    gt.addEventListener('click', dismiss, { once: true });
    setTimeout(() => { if (gt.classList.contains('visible')) dismiss(); }, 4000);
}

// ── Init hover tooltip + off-screen indicator + swipe dismiss + new features ──
function _initUIExtras() {
    setupHoverTooltip();
    setupSwipeDismiss();
    setupLongPress();
    _setupCycleButtons();
    const wr = document.getElementById('map-wrapper');
    if (wr) {
        const observer = new MutationObserver(_updateOffscreenIndicator);
        observer.observe(wr, { attributes: true, attributeFilter: ['style'] });
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initUIExtras);
} else {
    _initUIExtras();
}
