// ═══════════════════════════════════════════════════════
// NAVIGATE UI — Info panel, actions, interactions
// ═══════════════════════════════════════════════════════

// ── Location tap handler ──
function handleLocationTap(locId) {
    try { tg?.HapticFeedback?.impactOccurred('light'); } catch(e) {}

    S.selectedLoc = locId;
    const locData = S.locations[locId];
    if (!locData) {
        console.warn('[NAVIGATE] No data for location:', locId);
        return;
    }

    const panel = document.getElementById('info-panel');
    const isCurrent = locId === S.currentLoc;
    const connected = isConnected(S.currentLoc, locId);

    // Header
    document.getElementById('info-icon').textContent = locData.i || '📍';
    document.getElementById('info-title').textContent = locData.n || 'Desconhecido';

    // Danger badge
    const dangerEl = document.getElementById('info-danger');
    const danger = locData.d || 0;
    dangerEl.textContent = `${getDangerLabel(danger)} (Nv.${danger})`;
    dangerEl.style.borderColor = getDangerColor(danger);
    dangerEl.style.color = getDangerColor(danger);

    // Biome
    const biomeInfo = BIOME_INFO[locData.b] || BIOME_INFO.plains;
    const biomeLabel = biomeInfo.label || locData.b;
    document.getElementById('info-biome').textContent =
        `${locData.s ? '🏘️ Assentamento' : '🌍 Região'} — ${biomeLabel}`;

    // Description
    document.getElementById('info-desc').textContent = locData.ds || '';

    // Stats (distance, connections)
    const statsEl = document.getElementById('info-stats');
    const dist = bfsDistance(S.currentLoc, locId, connectionGraph);
    const connCount = (locData.c || []).length;

    let statsHtml = '';
    if (!isCurrent) {
        statsHtml += `<span>📏 ${dist >= 0 ? dist + ' etapa' + (dist !== 1 ? 's' : '') : '???'}</span>`;
    }
    statsHtml += `<span>🔗 ${connCount} rota${connCount !== 1 ? 's' : ''}</span>`;

    // Danger comparison with player level
    const playerLv = S.charData?.lv || 1;
    if (danger > playerLv + 2) {
        statsHtml += `<span style="color:#aa4444">💀 Muito acima do nível</span>`;
    } else if (danger > playerLv) {
        statsHtml += `<span style="color:#aa8833">⚠️ Acima do nível</span>`;
    }

    statsEl.innerHTML = statsHtml;

    // Quests at this location
    const questsEl = document.getElementById('info-quests');
    const locQuests = S.quests.filter(q => q.loc === locId);
    if (locQuests.length > 0) {
        questsEl.innerHTML = '📜 <b>Missões:</b> ' +
            locQuests.map(q => `<span>${q.t}</span>`).join(', ');
        questsEl.style.display = '';
    } else {
        questsEl.style.display = 'none';
    }

    // Dungeons at this location
    const dungeonsEl = document.getElementById('info-dungeons');
    const locDungeons = S.dungeons[locId] || [];
    if (locDungeons.length > 0) {
        dungeonsEl.innerHTML = '🏰 <b>Masmorras:</b> ' +
            locDungeons.map(d =>
                `<span>${d.done ? '✅' : '⭐'} ${d.n}</span>`
            ).join(', ');
        dungeonsEl.style.display = '';
    } else {
        dungeonsEl.style.display = 'none';
    }

    // Action buttons
    const actionsEl = document.getElementById('info-actions');
    actionsEl.innerHTML = '';

    if (isCurrent) {
        // At current location: Explore + Camp
        const exploreBtn = createActionBtn(
            `🔍 Explorar ${locData.s ? '' : locData.n.split(' ')[0]}`,
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
        // Connected location: Travel
        const travelBtn = createActionBtn(
            `🚶 Viajar (${dist} etapa${dist !== 1 ? 's' : ''})`,
            'info-btn-travel',
            () => finishNavigation('travel', locId)
        );
        actionsEl.appendChild(travelBtn);
    } else if (dist > 0) {
        // Not directly connected but reachable
        const infoBtn = createActionBtn(
            `📏 ${dist} etapas de distância`,
            'info-btn-close',
            null
        );
        infoBtn.style.opacity = '0.6';
        infoBtn.style.cursor = 'default';
        actionsEl.appendChild(infoBtn);
    }

    // Close button
    const closeBtn = createActionBtn('✕', 'info-btn-close', closeInfoPanel);
    actionsEl.appendChild(closeBtn);

    // Open panel
    panel.classList.add('open');

    // Highlight selected location on map
    highlightSelected(locId);
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
    // Clear previous highlights
    clearHighlight();

    // Add highlight class to selected hex group
    const svg = document.getElementById('map-svg');
    const groups = svg.querySelectorAll('.loc-hex');
    for (const g of groups) {
        if (g.getAttribute('data-loc') === locId) {
            g.classList.add('selected');
            // Add selection ring
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

    // Highlight the path from current to selected
    if (locId !== S.currentLoc) {
        highlightPath(S.currentLoc, locId);
    }
}

// ── Clear all highlights ──
function clearHighlight() {
    const svg = document.getElementById('map-svg');
    // Remove selection rings
    const rings = svg.querySelectorAll('.selection-ring');
    rings.forEach(r => r.remove());

    // Remove path highlights
    const highlights = svg.querySelectorAll('.path-highlight');
    highlights.forEach(h => h.remove());
}

// ── Highlight BFS path between two locations ──
function highlightPath(fromId, toId) {
    const path = bfsPath(fromId, toId);
    if (!path || path.length < 2) return;

    const svg = document.getElementById('map-svg');

    for (let i = 0; i < path.length - 1; i++) {
        const aCoords = LOCATION_COORDS[path[i]];
        const bCoords = LOCATION_COORDS[path[i + 1]];
        if (!aCoords || !bCoords) continue;

        const aPx = hexToPixel(aCoords.col, aCoords.row);
        const bPx = hexToPixel(bCoords.col, bCoords.row);

        const line = createSVG('line', {
            x1: aPx.x, y1: aPx.y,
            x2: bPx.x, y2: bPx.y,
            stroke: '#c4953a',
            'stroke-width': 3,
            'stroke-opacity': 0.5,
            'stroke-linecap': 'round',
            class: 'path-highlight',
        });
        svg.appendChild(line);
    }
}

// ── BFS path (returns array of location IDs) ──
function bfsPath(fromId, toId) {
    if (fromId === toId) return [fromId];
    const visited = new Set([fromId]);
    const queue = [[fromId, [fromId]]];
    while (queue.length > 0) {
        const [current, path] = queue.shift();
        const neighbors = connectionGraph[current] || [];
        for (const nb of neighbors) {
            if (nb === toId) return [...path, nb];
            if (!visited.has(nb)) {
                visited.add(nb);
                queue.push([nb, [...path, nb]]);
            }
        }
    }
    return null;
}
