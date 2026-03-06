// ═══════════════════════════════════════════════════════
// NAVIGATE UI — Info panel, actions, interactions
// ═══════════════════════════════════════════════════════

// ── Location tap handler ──
function handleLocationTap(locId) {
    try { tg?.HapticFeedback?.impactOccurred('light'); } catch(e) { console.warn('[NAVIGATE] haptic:', e); }

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
            questsEl.innerHTML = '📜 <b>Missões:</b> ' +
                locQuests.map(q => `<span>${q.t}</span>`).join(', ');
            questsEl.style.display = '';
        } else {
            questsEl.style.display = 'none';
        }

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
            // Explored + has map: safe direct travel
            noteEl.innerHTML = `🕐 <b>${edgeDist} turno${edgeDist !== 1 ? 's' : ''}</b> de viagem`;
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
        noteEl.textContent = `⛔ Não há caminho direto — ${wDist} turno${wDist !== 1 ? 's' : ''} de distância`;
        noteEl.style.display = 'block';
        noteEl.style.color = '';
    } else {
        noteEl.textContent = '⛔ Local inacessível';
        noteEl.style.display = 'block';
        noteEl.style.color = '';
    }

    // Close: tap outside panel or use bottom bar / Telegram back button

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

        // Match the curved jitter from renderConnectionPaths
        const seed = (aCoords.col * 31 + aCoords.row * 17 + bCoords.col * 13 + bCoords.row * 7);
        const mx = (aPx.x + bPx.x) / 2;
        const my = (aPx.y + bPx.y) / 2;
        const dx = bPx.x - aPx.x;
        const dy = bPx.y - aPx.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const perpX = -dy / len;
        const perpY = dx / len;
        const jitterAmt = (seededRandom(seed) - 0.5) * 8;
        const midX = mx + perpX * jitterAmt;
        const midY = my + perpY * jitterAmt;

        const pathD = `M${aPx.x},${aPx.y} Q${midX},${midY} ${bPx.x},${bPx.y}`;
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
