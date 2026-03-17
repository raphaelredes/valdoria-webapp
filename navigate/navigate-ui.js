// ═══════════════════════════════════════════════════════
// NAVIGATE UI — Info panel, actions, interactions
// ═══════════════════════════════════════════════════════

// ── Cached weighted distance — avoids repeated Dijkstra on same currentLoc ──
var _distCache = {};
var _distCacheLoc = null;
function cachedDist(fromId, toId) {
    if (fromId === toId) return 0;
    if (_distCacheLoc !== fromId) { _distCache = {}; _distCacheLoc = fromId; }
    const key = toId;
    if (_distCache[key] !== undefined) return _distCache[key];
    const d = weightedDistance(fromId, toId, connectionGraph);
    _distCache[key] = d;
    return d;
}

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
    } catch(e) { console.warn('[NAVIGATE] Haptic:', e); }
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

    // Danger badge — visual diamond pip meter
    const dangerEl = document.getElementById('info-danger');
    const danger = locData.d || 0;
    if (isExplored && danger > 0) {
        const DANGER_PIPS_MAX = 5;
        const pips = Math.min(DANGER_PIPS_MAX, Math.ceil(danger / 2));
        let html = '<span class="danger-meter" role="img" aria-label="Perigo: ' + pips + ' de ' + DANGER_PIPS_MAX + '">';
        for (let i = 0; i < 5; i++) {
            const cls = i < pips ? 'danger-pip filled-' + (i + 1) : 'danger-pip empty';
            html += '<span class="' + cls + '"></span>';
        }
        html += '</span>';
        dangerEl.innerHTML = html;
        dangerEl.style.borderColor = 'transparent';
        dangerEl.style.display = '';
    } else if (isKnownMapped) {
        if (danger >= 5) {
            dangerEl.innerHTML = '<span class="danger-meter" role="img" aria-label="Perigo desconhecido: alto"><span class="danger-pip filled-4"></span><span class="danger-pip filled-5"></span><span class="danger-pip empty"></span></span> ???';
            dangerEl.style.borderColor = '#8a4a3a';
            dangerEl.style.color = '#8a4a3a';
            dangerEl.style.display = '';
        } else if (danger >= 3) {
            dangerEl.innerHTML = '<span class="danger-meter" role="img" aria-label="Perigo desconhecido: moderado"><span class="danger-pip filled-2"></span><span class="danger-pip filled-3"></span><span class="danger-pip empty"></span></span> ???';
            dangerEl.style.borderColor = '#8a6a3a';
            dangerEl.style.color = '#8a6a3a';
            dangerEl.style.display = '';
        } else {
            dangerEl.style.display = 'none';
        }
    } else {
        dangerEl.style.display = 'none';
    }

    // Toggle header-meta row visibility (danger + cycle)
    const headerMeta = document.getElementById('info-header-meta');
    const cycleList = _getCycleList();
    const showMeta = (dangerEl.style.display !== 'none') || (cycleList.length > 1);
    headerMeta.style.display = showMeta ? '' : 'none';

    // Weighted distance and connections (used by biome inline + tags)
    const wDist = cachedDist(S.currentLoc, locId);
    const connCount = (connectionGraph[locId] || []).length;

    // Biome + inline meta (distance, routes)
    const biomeInfo = BIOME_INFO[locData.b] || BIOME_INFO.plains;
    const biomeLabel = biomeInfo.label || locData.b;
    const biomeEl = document.getElementById('info-biome');
    const biomeColors = {
        plains: '#8aaa5a', forest: '#5aaa4a', swamp: '#6a9a5a',
        cave: '#7a7a9a', graveyard: '#8a6a6a', desert: '#caa85a',
        mountain: '#8a8a9a', snow: '#9abacc', volcanic: '#cc6a3a'
    };
    if (isKnownUnmapped) {
        biomeEl.innerHTML = '🌫️ Região Desconhecida';
        biomeEl.style.color = '';
    } else {
        let biomeHtml = `${locData.s ? '🏘️ Assentamento' : '🌍 Região'} — ${biomeLabel}`;
        if (!isCurrent && wDist >= 0) {
            biomeHtml += ` <span class="meta-sep">·</span> 🕐 ${wDist} turno${wDist !== 1 ? 's' : ''}`;
        }
        if (isExplored) {
            biomeHtml += ` <span class="meta-sep">·</span> 🔗 ${connCount} rota${connCount !== 1 ? 's' : ''}`;
        }
        biomeEl.innerHTML = biomeHtml;
        biomeEl.style.color = biomeColors[locData.b] || '#a09484';
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

    // Tags (danger hints — distance/routes now inline with biome)
    const tagsEl = document.getElementById('info-stats');

    let tagsHtml = '';
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
            if (danger >= 7) riskHint = ' · <span style="color:#cc4040">☠️ Perigo extremo</span>';
            else if (danger >= 5) riskHint = ' · <span style="color:#cc8844">⚠️ Alta chance de encontros</span>';
            else if (danger >= 3) riskHint = ' · <span style="color:#aa9a5a">⚠️ Encontros prováveis</span>';
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
        // Show route hint via BFS path with total turn cost
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
            routeHint = `\n🗺️ Rota: ${viaStr} · <b>${wDist} turno${wDist !== 1 ? 's' : ''} total</b>`;
        }
        noteEl.innerHTML = `⛔ Não há caminho direto — <b>${wDist} turno${wDist !== 1 ? 's' : ''}</b> de distância${routeHint}`;
        noteEl.style.display = 'block';
        noteEl.style.color = '';
    } else {
        // Fully inaccessible — explain why
        const hasAnyConn = (connectionGraph[locId] || []).length > 0;
        if (!hasAnyConn) {
            noteEl.innerHTML = '⛔ <b>Local Isolado</b> — Nenhuma rota conhecida leva até aqui';
        } else if (isKnownUnmapped) {
            noteEl.innerHTML = '⛔ <b>Sem Rota</b> — Adquira um mapa para revelar caminhos ocultos';
        } else {
            noteEl.innerHTML = '⛔ <b>Inacessível</b> — Explore locais vizinhos para descobrir novas rotas';
        }
        noteEl.style.display = 'block';
        noteEl.style.color = '#8a4a3a';
    }

    // Open panel in peek mode (compact), swipe up for full
    panel.classList.remove('full');
    panel.classList.add('open', 'peek');
    document.getElementById('map-viewport').classList.add('panel-open');
    _haptic('open');
    // Check if content overflows in full mode
    requestAnimationFrame(() => {
        panel.classList.toggle('scrollable', panel.scrollHeight > panel.clientHeight + 8);
    });

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
    panel.classList.remove('open', 'peek', 'full');
    document.getElementById('map-viewport').classList.remove('panel-open');
    S.selectedLoc = null;
    clearHighlight();
}

// ── Highlight selected location ──
function highlightSelected(locId) {
    clearHighlight();

    const svg = document.getElementById('map-svg');
    const node = svg.querySelector(`.loc-node[data-loc="${locId}"]`);
    if (node) {
        node.classList.add('selected');
        const coords = LOCATION_COORDS[locId];
        if (coords) {
            const { x, y } = hexToPixel(coords.col, coords.row);
            svg.appendChild(createSVG('circle', {
                cx: x, cy: y,
                r: HEX_RADIUS + 5,
                fill: 'none',
                stroke: '#c4953a',
                'stroke-width': 2,
                'stroke-opacity': 0.6,
                class: 'selection-ring',
            }));
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
    const frag = document.createDocumentFragment();

    let cumTurns = 0;
    for (let i = 0; i < pathIds.length - 1; i++) {
        const aCoords = LOCATION_COORDS[pathIds[i]];
        const bCoords = LOCATION_COORDS[pathIds[i + 1]];
        if (!aCoords || !bCoords) continue;

        const aPx = hexToPixel(aCoords.col, aCoords.row);
        const bPx = hexToPixel(bCoords.col, bCoords.row);
        const seed = (aCoords.col * 31 + aCoords.row * 17 + bCoords.col * 13 + bCoords.row * 7);
        const pathD = _buildRoadPath(aPx, bPx, seed);

        // Path line with animated dash
        frag.appendChild(createSVG('path', {
            d: pathD,
            fill: 'none',
            stroke: '#c4953a',
            'stroke-width': 4,
            'stroke-opacity': 0.5,
            'stroke-linecap': 'round',
            'stroke-dasharray': '8 4',
            class: 'path-highlight',
        }));

        // Direction arrow at midpoint
        const midPt = _pointOnPath(pathD, 0.5);
        const preP = _pointOnPath(pathD, 0.45);
        const angle = Math.atan2(midPt.y - preP.y, midPt.x - preP.x) * 180 / Math.PI;
        frag.appendChild(createSVG('polygon', {
            points: '0,-4 8,0 0,4',
            transform: `translate(${midPt.x},${midPt.y}) rotate(${angle})`,
            class: 'path-arrow',
        }));

        // Turn cost label at waypoints (not first/last)
        const edgeDist = getConnectionDistance(pathIds[i], pathIds[i + 1]);
        cumTurns += edgeDist;
        if (i < pathIds.length - 2) {
            // Label at intermediate waypoint
            const wp = bPx;
            frag.appendChild(createSVG('rect', {
                x: wp.x - 10, y: wp.y - 18, width: 20, height: 12, rx: 2,
                class: 'path-turn-bg',
            }));
            const lbl = createSVG('text', {
                x: wp.x, y: wp.y - 9,
                class: 'path-turn-label',
            });
            lbl.textContent = cumTurns + 'T';
            frag.appendChild(lbl);
        }
    }
    svg.appendChild(frag);
}

// ── Travel marker — Hooded traveler silhouette (SVG) ──
function _createTravelerMarker() {
    var g = createSVG('g', { class: 'travel-marker-group' });
    var fig = createSVG('g', { class: 'traveler-figure' });

    // Ground shadow
    fig.appendChild(createSVG('ellipse', {
        cx: 0, cy: 2, rx: 8, ry: 3.5,
        fill: 'rgba(0,0,0,0.3)'
    }));
    // Legs
    fig.appendChild(createSVG('line', {
        x1: -1.2, y1: -6, x2: -1.5, y2: 0,
        stroke: 'rgba(20,16,14,0.85)', 'stroke-width': 2, 'stroke-linecap': 'round'
    }));
    fig.appendChild(createSVG('line', {
        x1: 1.2, y1: -6, x2: 1.5, y2: 0,
        stroke: 'rgba(20,16,14,0.85)', 'stroke-width': 2, 'stroke-linecap': 'round'
    }));
    // Body torso
    fig.appendChild(createSVG('ellipse', {
        cx: 0, cy: -12, rx: 3.8, ry: 6.5,
        fill: 'rgba(20,16,14,0.85)'
    }));
    // Cloak
    fig.appendChild(createSVG('path', {
        d: 'M-2.5,-17 Q-5.5,-11 -4.5,-4 Q-3.5,-8 -2.5,-6 Z',
        fill: 'rgba(30,24,20,0.80)', class: 'traveler-cloak'
    }));
    // Backpack
    fig.appendChild(createSVG('ellipse', {
        cx: -3.2, cy: -13, rx: 2.8, ry: 3.2,
        fill: 'rgba(30,24,20,0.80)', transform: 'rotate(-11 -3.2 -13)'
    }));
    // Head
    fig.appendChild(createSVG('circle', {
        cx: 0, cy: -19, r: 3,
        fill: 'rgba(20,16,14,0.85)'
    }));
    // Hood (pointed medieval)
    fig.appendChild(createSVG('path', {
        d: 'M-3.2,-19 Q-1,-26 1.2,-21.5 Q2.2,-18 3.2,-17 L-3.2,-17 Z',
        fill: 'rgba(30,24,20,0.80)'
    }));
    // Staff
    fig.appendChild(createSVG('line', {
        x1: 4.5, y1: -21, x2: 6.5, y2: 1,
        stroke: 'rgba(60,45,30,0.8)', 'stroke-width': 1.6, 'stroke-linecap': 'round'
    }));
    // Staff knob
    fig.appendChild(createSVG('circle', {
        cx: 4.5, cy: -21.5, r: 1.3,
        fill: 'rgba(80,65,45,0.7)'
    }));
    // Rim light (gold edge)
    fig.appendChild(createSVG('path', {
        d: 'M3.2,-17 Q4.2,-12 3.8,-6',
        stroke: 'rgba(196,149,58,0.45)', 'stroke-width': 1.4, fill: 'none',
        'stroke-linecap': 'round'
    }));
    // Gold glow ring at feet
    fig.appendChild(createSVG('ellipse', {
        cx: 0, cy: 1, rx: 10, ry: 4.5,
        fill: 'none', stroke: 'rgba(196,149,58,0.3)', 'stroke-width': 1.8,
        class: 'traveler-glow-ring'
    }));

    g.appendChild(fig);
    return g;
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
        const marker = _createTravelerMarker();
        marker.setAttribute('transform', 'translate(' + startP.x + ',' + startP.y + ')');
        travelGroup.appendChild(marker);
        var _prevTravelX = startP.x;

        let elapsed = 0;
        const duration = Math.max(1500, Math.min(4000, pathIds.length * 800)); // proportional to hops
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
                    marker.setAttribute('transform', 'translate(' + px + ',' + py + ')');
                    // Flip figure based on travel direction
                    if (px < _prevTravelX - 0.5) {
                        marker.querySelector('.traveler-figure').setAttribute('transform', 'scale(-0.85,0.85)');
                    } else if (px > _prevTravelX + 0.5) {
                        marker.querySelector('.traveler-figure').setAttribute('transform', 'scale(0.85,0.85)');
                    }
                    _prevTravelX = px;
                    // Pulse waypoint marker when passing through
                    if (segT > 0.95 && seg !== segments[segments.length - 1]) {
                        const wpNode = document.querySelector('.loc-node[data-loc="' + pathIds[segments.indexOf(seg) + 1] + '"]');
                        if (wpNode && !wpNode._pulsed) {
                            wpNode._pulsed = true;
                            wpNode.style.transition = 'transform 0.2s ease';
                            wpNode.style.transform = 'scale(1.2)';
                            setTimeout(() => { wpNode.style.transform = ''; }, 200);
                        }
                    }
                    break;
                }
                accum += seg.len;
            }
            if (t < 1) {
                requestAnimationFrame(moveMarker);
            } else {
                marker.classList.add('travel-marker-arrive');
                // Gold arrival glow
                var arrGlow = createSVG('circle', { cx: 0, cy: 0, r: 3, class: 'travel-arrive-glow' });
                marker.appendChild(arrGlow);
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
                    _clearPathCache();
                    onComplete();
                }, 800);
            }
        }
        requestAnimationFrame(moveMarker);
    } else {
        setTimeout(() => { travelGroup.remove(); _clearPathCache(); onComplete(); }, 1500);
    }
}

// ── BFS path (returns array of location IDs, cached) ──
var _bfsCache = {};
function invalidateBfsCache() {
    for (const k in _bfsCache) delete _bfsCache[k];
}
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
    const threshold = 60;

    panel.addEventListener('touchstart', e => {
        const rect = panel.getBoundingClientRect();
        const touchY = e.touches[0].clientY - rect.top;
        if (touchY > 50) return;
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
            panel.style.transform = `translateY(${dy}px)`;
        } else if (dy < -20 && panel.classList.contains('peek')) {
            // Swipe up: expand from peek to full
            panel.style.transform = '';
            panel.classList.remove('peek');
            panel.classList.add('full');
            dragging = false;
            panel.classList.remove('dragging');
            _haptic('tap');
            // Scroll content to top when expanding
            const scrollArea = panel.querySelector('.info-content-scroll');
            if (scrollArea) scrollArea.scrollTop = 0;
        }
    }, { passive: true });

    panel.addEventListener('touchend', () => {
        if (!dragging) return;
        dragging = false;
        panel.classList.remove('dragging');
        const dy = currentY - startY;
        if (dy > threshold) {
            panel.style.transform = '';
            closeInfoPanel();
            _haptic('tap');
        } else {
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

    let _ttRAF = 0;
    vp.addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') { tt.style.display = 'none'; return; }
        if (_ttRAF) return; // throttle: max 1 update per animation frame
        _ttRAF = requestAnimationFrame(() => {
            _ttRAF = 0;
            const loc = e.target.closest?.('.loc-node');
            if (!loc) { tt.style.display = 'none'; return; }
            const locId = loc.getAttribute('data-loc');
            const ld = S.locations[locId];
            if (!ld?.n) { tt.style.display = 'none'; return; }
            const fog = loc.classList.contains('known_unmapped') ? 'unmapped' : '';
            ttName.textContent = fog === 'unmapped' ? '???' : ld.n;
            const wDist = locId !== S.currentLoc ? cachedDist(S.currentLoc, locId) : -1;
            ttDist.textContent = wDist > 0 ? `${wDist}🕐` : '';
            tt.style.display = 'block';
            const vpR = vp.getBoundingClientRect();
            const ttW = tt.offsetWidth || 120;
            let tx = e.clientX - vpR.left + 12;
            let ty = e.clientY - vpR.top - 28;
            if (tx + ttW > vpR.width) tx = e.clientX - vpR.left - ttW;
            if (ty < 0) ty = e.clientY - vpR.top + 16;
            tt.style.left = tx + 'px';
            tt.style.top = ty + 'px';
        });
    }, { passive: true });
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
var _legendOpen = false;
function toggleLegendExpand() {
    _haptic('tap');
    _legendOpen = !_legendOpen;
    const panel = document.getElementById('legend-biomes');
    const toggle = document.querySelector('.legend-toggle');
    if (!panel) return;
    if (toggle) toggle.classList.toggle('open', _legendOpen);
    if (_legendOpen) {
        // Populate biomes
        panel.innerHTML = '';
        for (const [, info] of Object.entries(BIOME_INFO).sort((a, b) => a[1].label.localeCompare(b[1].label))) {
            const item = document.createElement('span');
            item.className = 'legend-item';
            item.innerHTML = `<span class="legend-dot" style="background:${info.hexFill}"></span> ${info.label}`;
            panel.appendChild(item);
        }
        panel.classList.remove('entering'); void panel.offsetWidth; panel.classList.add('open', 'entering');
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
    let _lpTimer = null, _lpStartX = 0, _lpStartY = 0;

    function _clearTooltip() {
        document.querySelectorAll('.lp-tooltip').forEach(t => t.remove());
    }

    vp.addEventListener('pointerdown', e => {
        const loc = e.target.closest?.('.loc-node');
        if (!loc) return;
        const locId = loc.getAttribute('data-loc');
        if (!locId || locId === S.currentLoc) return;
        _lpStartX = e.clientX; _lpStartY = e.clientY;
        _lpTimer = setTimeout(() => {
            _showQuickTooltip(locId, e.clientX, e.clientY);
            _haptic('tap');
        }, 500);
    });
    vp.addEventListener('pointermove', e => {
        if (_lpTimer) {
            const dx = e.clientX - _lpStartX, dy = e.clientY - _lpStartY;
            if (dx * dx + dy * dy > 400) { clearTimeout(_lpTimer); _lpTimer = null; }
        }
    }, { passive: true });
    vp.addEventListener('pointerup', () => { clearTimeout(_lpTimer); _lpTimer = null; _clearTooltip(); });
    vp.addEventListener('pointercancel', () => { clearTimeout(_lpTimer); _lpTimer = null; _clearTooltip(); });
}

function _showQuickTooltip(locId, cx, cy) {
    document.querySelectorAll('.lp-tooltip').forEach(t => t.remove());
    const ld = S.locations[locId];
    if (!ld) return;
    const discoveredSet = new Set(S.discoveredLocs || []);
    const isExp = discoveredSet.has(locId);
    const name = isExp ? (ld.n || locId) : '???';
    const biome = BIOME_INFO[ld.b] || BIOME_INFO.plains;
    const wDist = cachedDist(S.currentLoc, locId);
    const danger = ld.d || 0;

    const tt = document.createElement('div');
    tt.className = 'lp-tooltip';

    let dangerHtml = '';
    if (isExp && danger > 0) {
        const pips = Math.min(5, Math.ceil(danger / 2));
        const colors = ['#6aaa3a', '#caaa3a', '#cc8a2a', '#cc4a2a', '#aa2a2a'];
        dangerHtml = '<span class="lp-tooltip-danger">';
        for (let i = 0; i < 5; i++) {
            const bg = i < pips ? colors[Math.min(i, colors.length - 1)] : 'transparent';
            const border = i < pips ? bg : 'rgba(112,66,20,0.3)';
            dangerHtml += '<span class="lp-tooltip-pip" style="background:' + bg + ';border:1px solid ' + border + '"></span>';
        }
        dangerHtml += '</span>';
    }

    tt.innerHTML = '<div class="lp-tooltip-name">' + name + '</div>' +
        '<div class="lp-tooltip-meta">' + biome.label +
        (wDist > 0 ? ' \u00b7 ' + wDist + ' turno' + (wDist !== 1 ? 's' : '') : '') +
        dangerHtml + '</div>';

    const vpRect = document.getElementById('map-viewport').getBoundingClientRect();
    let tx = cx - vpRect.left + 12;
    let ty = cy - vpRect.top - 50;
    if (tx + 180 > vpRect.width) tx = cx - vpRect.left - 180;
    if (ty < 0) ty = cy - vpRect.top + 16;
    tt.style.left = tx + 'px';
    tt.style.top = ty + 'px';
    document.getElementById('map-viewport').appendChild(tt);
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
    const locs = S.knownLocs.filter(id => id !== S.currentLoc && LOCATION_COORDS[id]);
    // Sort by weighted distance (BFS hops), then alphabetically
    locs.sort((a, b) => {
        const da = cachedDist(S.currentLoc, a);
        const db = cachedDist(S.currentLoc, b);
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
    // Cycle counter
    var counter = document.getElementById('cycle-counter');
    if (!counter && hasMultiple) {
        counter = document.createElement('span');
        counter.id = 'cycle-counter';
        counter.className = 'cycle-counter';
        var row = prevBtn.parentElement;
        if (row) row.insertBefore(counter, nextBtn);
    }
    if (counter) {
        if (hasMultiple) {
            var idx = list.indexOf(_selectedLoc);
            counter.textContent = (idx + 1) + '/' + list.length;
            counter.style.display = '';
        } else {
            counter.style.display = 'none';
        }
    }
}

// ── Quick-list of known locations ──
function openQuickList() {
    const ql = document.getElementById('quick-list');
    const items = document.getElementById('ql-items');
    if (!ql || !items) return;
    items.innerHTML = '';
    const discoveredSet = new Set(S.discoveredLocs || []);

    // Restore sort preference
    let sortMode = localStorage.getItem('valdoria_ql_sort') || 'dist';

    // Build location data
    const locs = S.knownLocs
        .filter(id => LOCATION_COORDS[id])
        .map(id => {
            const ld = S.locations[id] || {};
            const isExp = discoveredSet.has(id);
            const isMapped = S.mapCoverage.has(id);
            const dist = id === S.currentLoc ? -1 : cachedDist(S.currentLoc, id);
            return { id, ld, isExp, isMapped, dist };
        });

    function sortLocs(mode) {
        if (mode === 'name') {
            locs.sort((a, b) => {
                if (a.id === S.currentLoc) return -1;
                if (b.id === S.currentLoc) return 1;
                const na = (a.isExp || a.isMapped) ? (a.ld.n || '') : 'zzz';
                const nb = (b.isExp || b.isMapped) ? (b.ld.n || '') : 'zzz';
                return na.localeCompare(nb);
            });
        } else {
            locs.sort((a, b) => {
                if (a.id === S.currentLoc) return -1;
                if (b.id === S.currentLoc) return 1;
                return (a.dist < 0 ? 999 : a.dist) - (b.dist < 0 ? 999 : b.dist);
            });
        }
    }

    // Sort bar
    const sortBar = document.createElement('div');
    sortBar.className = 'ql-sort-bar';
    const btnDist = document.createElement('button');
    btnDist.type = 'button';
    btnDist.className = 'ql-sort-btn' + (sortMode === 'dist' ? ' active' : '');
    btnDist.textContent = 'Por Dist\u00e2ncia';
    const btnName = document.createElement('button');
    btnName.type = 'button';
    btnName.className = 'ql-sort-btn' + (sortMode === 'name' ? ' active' : '');
    btnName.textContent = 'Por Nome';
    btnDist.addEventListener('click', () => { sortMode = 'dist'; localStorage.setItem('valdoria_ql_sort', 'dist'); btnDist.classList.add('active'); btnName.classList.remove('active'); renderItems(); });
    btnName.addEventListener('click', () => { sortMode = 'name'; localStorage.setItem('valdoria_ql_sort', 'name'); btnName.classList.add('active'); btnDist.classList.remove('active'); renderItems(); });
    sortBar.appendChild(btnDist);
    sortBar.appendChild(btnName);
    items.appendChild(sortBar);

    function renderItems() {
        // Remove all items except sort bar
        const existing = items.querySelectorAll('.ql-item');
        existing.forEach(el => el.remove());

        sortLocs(sortMode);

        for (const loc of locs) {
            const div = document.createElement('div');
            div.className = 'ql-item';
            const isCurr = loc.id === S.currentLoc;
            if (isCurr) div.classList.add('ql-item-current');
            const name = loc.isExp || loc.isMapped ? (loc.ld.n || loc.id) : '???';
            const icon = loc.isExp || loc.isMapped ? (loc.ld.i || '\ud83d\udccd') : '\ud83c\udf2b\ufe0f';

            // Biome dot
            const biome = BIOME_INFO[loc.ld.b] || BIOME_INFO.plains;
            const biomeDot = '<span class="ql-biome-dot" style="background:' + (biome.hexFill || '#6a8a5a') + '"></span>';

            // Status icon
            let statusIcon = '';
            if (isCurr) statusIcon = '<span class="ql-status-icon">\ud83d\udccd</span>';
            else if (loc.isExp) statusIcon = '<span class="ql-status-icon">\u2713</span>';
            else if (loc.isMapped) statusIcon = '<span class="ql-status-icon">\ud83d\udc41</span>';
            else statusIcon = '<span class="ql-status-icon">?</span>';

            // Danger pips (mini)
            let dangerHtml = '';
            const danger = loc.ld.d || 0;
            if (loc.isExp && danger > 0) {
                const pips = Math.min(5, Math.ceil(danger / 2));
                const colors = ['#5a9a3a', '#9a9a2a', '#cc7a2a', '#cc3a2a', '#8a1a1a'];
                dangerHtml = '<span class="ql-danger-pips">';
                for (let i = 0; i < pips; i++) {
                    dangerHtml += '<span class="ql-danger-pip" style="background:' + colors[Math.min(i, colors.length - 1)] + '"></span>';
                }
                dangerHtml += '</span>';
            }

            let badges = '';
            if (isCurr) badges += '<span class="ql-badge">Aqui</span>';
            const locQuests = (S.quests || []).filter(q => q.loc === loc.id);
            if (locQuests.length > 0) badges += '<span class="ql-badge">\ud83d\udcdc' + locQuests.length + '</span>';
            const locDungeons = (S.dungeons || {})[loc.id] || [];
            if (locDungeons.length > 0) badges += '<span class="ql-badge">\ud83c\udff0' + locDungeons.length + '</span>';

            div.innerHTML = biomeDot + statusIcon +
                '<span class="ql-item-name' + (isCurr ? ' current' : '') + '">' + name + '</span>' +
                dangerHtml +
                (badges ? '<span class="ql-item-badges">' + badges + '</span>' : '') +
                (loc.dist > 0 ? '<span class="ql-item-dist">' + loc.dist + '\ud83d\udd50</span>' : '');
            div.addEventListener('click', () => {
                closeQuickList();
                if (loc.id !== S.currentLoc) {
                    highlightPath(S.currentLoc, loc.id);
                    if (typeof panToLocationSmooth === 'function') panToLocationSmooth(loc.id);
                }
                const CYCLE_TAP_DELAY = 350;
            setTimeout(() => handleLocationTap(loc.id), CYCLE_TAP_DELAY);
            });
            items.appendChild(div);
        }
    }
    renderItems();
    ql.classList.add('open');
    closeInfoPanel();
}

function closeQuickList() {
    const ql = document.getElementById('quick-list');
    if (ql) ql.classList.remove('open');
}

// ── Gesture tutorial (first-visit only, auto-dismiss) ──
function showGestureTutorial() {
    if (localStorage.getItem('valdoria_nav_tutorial_v2')) return;
    const gt = document.getElementById('gesture-tutorial');
    if (!gt) return;
    gt.classList.add('visible');
    // Auto-dismiss after 6s (more hints to read now)
    const dismiss = () => {
        gt.classList.remove('visible');
        localStorage.setItem('valdoria_nav_tutorial_v2', '1');
    };
    gt.addEventListener('click', dismiss, { once: true });
    const TUTORIAL_AUTO_DISMISS_MS = 12000;
    setTimeout(() => { if (gt.classList.contains('visible')) dismiss(); }, TUTORIAL_AUTO_DISMISS_MS);
}

// ── Init hover tooltip + off-screen indicator + swipe dismiss + new features ──
function _initUIExtras() {
    setupHoverTooltip();
    setupSwipeDismiss();
    setupLongPress();
    _setupCycleButtons();
    // Off-screen indicator updated directly from apply() in navigate-map.js (no MutationObserver needed)
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initUIExtras);
} else {
    _initUIExtras();
}
