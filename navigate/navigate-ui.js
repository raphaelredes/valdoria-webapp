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

    // Danger badge (mysterious — no numeric levels)
    const dangerEl = document.getElementById('info-danger');
    const danger = locData.d || 0;
    const dangerSymbols = getDangerLabel(danger);
    if (dangerSymbols) {
        dangerEl.textContent = dangerSymbols;
        dangerEl.style.borderColor = getDangerColor(danger);
        dangerEl.style.color = getDangerColor(danger);
        dangerEl.style.display = '';
    } else {
        dangerEl.style.display = 'none';
    }

    // Biome
    const biomeInfo = BIOME_INFO[locData.b] || BIOME_INFO.plains;
    const biomeLabel = biomeInfo.label || locData.b;
    document.getElementById('info-biome').textContent =
        `${locData.s ? '🏘️ Assentamento' : '🌍 Região'} — ${biomeLabel}`;

    // Description
    document.getElementById('info-desc').textContent = locData.ds || '';

    // Tags (distance, connections, danger hint)
    const tagsEl = document.getElementById('info-stats');
    const dist = bfsDistance(S.currentLoc, locId, connectionGraph);
    const connCount = (connectionGraph[locId] || []).length;

    let tagsHtml = '';
    if (!isCurrent && dist >= 0) {
        tagsHtml += `<span class="info-tag">📏 ${dist} etapa${dist !== 1 ? 's' : ''}</span>`;
    }
    tagsHtml += `<span class="info-tag">🔗 ${connCount} rota${connCount !== 1 ? 's' : ''}</span>`;

    // Mysterious danger hint
    const playerLv = S.charData?.lv || 1;
    if (danger > playerLv + 2) {
        tagsHtml += `<span class="info-tag info-tag-danger">💀 Um arrepio percorre sua espinha...</span>`;
    } else if (danger > playerLv) {
        tagsHtml += `<span class="info-tag info-tag-warn">⚠️ Algo inquietante paira no ar</span>`;
    }

    tagsEl.innerHTML = tagsHtml;

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

    // Note area (for non-connected locations)
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
        // Risk warning when traveling without a map
        if (S.hasMap === 0) {
            noteEl.innerHTML = '⚠️ <b>Sem Mapa</b> — chance de se perder na viagem';
            noteEl.style.display = 'block';
            noteEl.style.color = '#c4953a';
            const travelBtn = createActionBtn(
                '🚶 Viajar (Sem Mapa) ⚠️',
                'info-btn-travel info-btn-risky',
                () => finishNavigation('travel', locId)
            );
            actionsEl.appendChild(travelBtn);
        } else {
            noteEl.style.display = 'none';
            const travelBtn = createActionBtn(
                '🚶 Viajar para ' + (locData.n || 'lá'),
                'info-btn-travel',
                () => finishNavigation('travel', locId)
            );
            actionsEl.appendChild(travelBtn);
        }
    } else if (dist > 0) {
        noteEl.textContent = `⛔ Não há caminho direto — ${dist} etapa${dist !== 1 ? 's' : ''} de distância`;
        noteEl.style.display = 'block';
        noteEl.style.color = '';
    } else {
        noteEl.textContent = '⛔ Local inacessível';
        noteEl.style.display = 'block';
        noteEl.style.color = '';
    }

    // Close button (always last)
    const closeBtn = createActionBtn('Fechar', 'info-btn-close', closeInfoPanel);
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
    clearHighlight();

    const svg = document.getElementById('map-svg');
    const groups = svg.querySelectorAll('.loc-hex');
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
