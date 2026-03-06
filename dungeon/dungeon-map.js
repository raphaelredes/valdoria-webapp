// ═══════════════════════════════════════════════════════════════
// DUNGEON MAP — SVG node map rendering (Slay-the-Spire style)
// ═══════════════════════════════════════════════════════════════

const NS = 'http://www.w3.org/2000/svg';
const NODE_R = 20;      // Node circle radius
const COL_W = 80;       // Horizontal spacing between columns
const ROW_H = 90;       // Vertical spacing between rows
const MAP_PAD = 40;     // Padding around map

function renderDungeonMap() {
    const svg = document.getElementById('map-svg');
    if (!svg) return;

    // Layout nodes vertically (bottom = entrance, top = boss)
    layoutNodes();

    // Calculate SVG dimensions
    let maxCol = 0, maxRow = 0;
    for (const n of S.nodes) {
        if (n.col > maxCol) maxCol = n.col;
        if (n.row > maxRow) maxRow = n.row;
    }
    const svgW = (maxCol + 1) * COL_W + MAP_PAD * 2;
    const svgH = (maxRow + 1) * ROW_H + MAP_PAD * 2;

    svg.setAttribute('width', svgW);
    svg.setAttribute('height', svgH);
    svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
    svg.innerHTML = '';

    // Defs
    const defs = _svg('defs');
    // Glow filter for current node
    const glowFilter = _svg('filter', { id: 'node-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' });
    glowFilter.appendChild(_svg('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: '4', result: 'blur' }));
    glowFilter.appendChild(_svg('feFlood', { 'flood-color': '#c4953a', 'flood-opacity': '0.4', result: 'color' }));
    glowFilter.appendChild(_svg('feComposite', { in: 'color', in2: 'blur', operator: 'in', result: 'glow' }));
    const merge = _svg('feMerge');
    merge.appendChild(_svg('feMergeNode', { in: 'glow' }));
    merge.appendChild(_svg('feMergeNode', { in: 'SourceGraphic' }));
    glowFilter.appendChild(merge);
    defs.appendChild(glowFilter);
    svg.appendChild(defs);

    // Background
    svg.appendChild(_svg('rect', {
        x: 0, y: 0, width: svgW, height: svgH,
        fill: 'none',
    }));

    // Draw paths first (behind nodes)
    const pathGroup = _svg('g', { class: 'paths-layer' });
    for (const [fromId, toId] of S.paths) {
        const fromNode = S.nodes.find(n => n.id === fromId);
        const toNode = S.nodes.find(n => n.id === toId);
        if (!fromNode || !toNode) continue;

        const fx = nodeX(fromNode), fy = nodeY(fromNode);
        const tx = nodeX(toNode), ty = nodeY(toNode);

        // Determine path state
        let pathClass = 'path-line path-locked';
        if (fromNode.visited && toNode.visited) {
            pathClass = 'path-line path-visited';
        } else if ((fromNode.current && toNode.available) || (toNode.current && fromNode.available)) {
            pathClass = 'path-line path-available';
        } else if (fromNode.visited || toNode.visited) {
            pathClass = 'path-line path-available';
        }

        // Slight curve for organic feel
        const mx = (fx + tx) / 2 + (Math.sin(fromId * 3 + toId) * 8);
        const my = (fy + ty) / 2;

        pathGroup.appendChild(_svg('path', {
            d: `M${fx},${fy} Q${mx},${my} ${tx},${ty}`,
            class: pathClass,
        }));
    }
    svg.appendChild(pathGroup);

    // Draw nodes
    const nodeGroup = _svg('g', { class: 'nodes-layer' });
    for (const node of S.nodes) {
        const x = nodeX(node);
        const y = nodeY(node);
        const icon = NODE_ICONS[node.type] || NODE_ICONS.empty;

        // Node state class
        let stateClass = 'node-locked';
        if (node.current) stateClass = 'node-current';
        else if (node.visited) stateClass = 'node-visited';
        else if (node.available) stateClass = 'node-available';

        const g = _svg('g', {
            class: `node-group ${stateClass}`,
            'data-id': node.id,
        });

        // Background circle
        g.appendChild(_svg('circle', {
            cx: x, cy: y, r: NODE_R,
            class: 'node-bg',
            fill: '#25202a',
            stroke: '#4a3a50',
            'stroke-width': 1.5,
        }));

        // Icon
        const iconEl = _svg('text', {
            x: x, y: y, class: 'node-icon',
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
        });
        iconEl.textContent = icon;
        g.appendChild(iconEl);

        // Check mark for visited
        if (node.visited && !node.current) {
            const check = _svg('text', {
                x: x + NODE_R - 2, y: y - NODE_R + 4,
                class: 'node-check',
            });
            check.textContent = '\u2713'; // ✓
            g.appendChild(check);
        }

        // Label below
        if (node.label) {
            const label = _svg('text', {
                x: x, y: y + NODE_R + 14,
                class: 'node-label',
            });
            label.textContent = node.label;
            g.appendChild(label);
        }

        // Glow filter for current
        if (node.current) {
            g.setAttribute('filter', 'url(#node-glow)');
        }

        // Click handler
        if (node.available || node.current) {
            g.addEventListener('click', (e) => {
                e.stopPropagation();
                if (node.available) handleNodeTap(node.id);
            });
        }

        nodeGroup.appendChild(g);
    }
    svg.appendChild(nodeGroup);

    // Auto-scroll to current node
    scrollToCurrentNode();
}

// ── Layout: assign row/col if not set by server ──
function layoutNodes() {
    // If server provides col/row, use them
    const hasLayout = S.nodes.some(n => n.row !== undefined && n.col !== undefined);
    if (hasLayout) return;

    // Auto-layout: BFS from entrance, place in layers
    const nodeMap = {};
    for (const n of S.nodes) nodeMap[n.id] = n;

    const adj = {};
    for (const n of S.nodes) adj[n.id] = [];
    for (const [a, b] of S.paths) {
        if (adj[a]) adj[a].push(b);
        if (adj[b]) adj[b].push(a);
    }

    // Find entrance (first node or type === 'entrance')
    const entrance = S.nodes.find(n => n.type === 'entrance') || S.nodes[0];
    if (!entrance) return;

    const visited = new Set();
    const queue = [{ id: entrance.id, row: 0 }];
    visited.add(entrance.id);
    const layers = {}; // row -> [nodeIds]

    while (queue.length > 0) {
        const { id, row } = queue.shift();
        if (!layers[row]) layers[row] = [];
        layers[row].push(id);

        for (const nb of (adj[id] || [])) {
            if (!visited.has(nb)) {
                visited.add(nb);
                queue.push({ id: nb, row: row + 1 });
            }
        }
    }

    // Assign row/col (reversed: entrance at bottom)
    const maxRow = Math.max(...Object.keys(layers).map(Number));
    for (const [rowStr, ids] of Object.entries(layers)) {
        const row = maxRow - parseInt(rowStr); // Flip so entrance is at bottom
        const totalCols = ids.length;
        for (let i = 0; i < ids.length; i++) {
            const node = nodeMap[ids[i]];
            if (node) {
                node.row = row;
                node.col = i - (totalCols - 1) / 2 + 2; // Center horizontally
            }
        }
    }
}

function nodeX(node) { return MAP_PAD + (node.col || 0) * COL_W + COL_W / 2; }
function nodeY(node) { return MAP_PAD + (node.row || 0) * ROW_H + ROW_H / 2; }

function scrollToCurrentNode() {
    const current = S.nodes.find(n => n.current);
    if (!current) return;

    const mapEl = document.getElementById('dungeon-map');
    const y = nodeY(current);
    const viewH = mapEl.clientHeight;

    requestAnimationFrame(() => {
        mapEl.scrollTop = Math.max(0, y - viewH / 2);
    });
}

// ── SVG helper ──
function _svg(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    if (attrs) {
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    }
    return el;
}

// ── Room transition animation ──
function animateNodeTransition(fromId, toId, onComplete) {
    const fromNode = S.nodes.find(n => n.id === fromId);
    const toNode = S.nodes.find(n => n.id === toId);
    if (!fromNode || !toNode) { onComplete(); return; }

    const svg = document.getElementById('map-svg');
    const fx = nodeX(fromNode), fy = nodeY(fromNode);
    const tx = nodeX(toNode), ty = nodeY(toNode);

    // Animate path lighting up
    const mx = (fx + tx) / 2 + (Math.sin(fromId * 3 + toId) * 8);
    const my = (fy + ty) / 2;
    const pathD = `M${fx},${fy} Q${mx},${my} ${tx},${ty}`;
    const len = Math.sqrt((tx - fx) ** 2 + (ty - fy) ** 2) * 1.2;

    const pathAnim = _svg('path', {
        d: pathD,
        stroke: '#c4953a', 'stroke-width': 3,
        'stroke-linecap': 'round', fill: 'none',
        'stroke-dasharray': len, 'stroke-dashoffset': len,
        'stroke-opacity': 0.8,
    });
    pathAnim.style.transition = `stroke-dashoffset 0.6s ease`;
    svg.appendChild(pathAnim);

    requestAnimationFrame(() => {
        pathAnim.setAttribute('stroke-dashoffset', '0');
    });

    // Move marker
    const marker = _svg('circle', {
        cx: fx, cy: fy, r: 6,
        fill: '#c4953a', opacity: '0.8',
    });
    svg.appendChild(marker);

    const duration = 600;
    const start = performance.now();

    function step(now) {
        const t = Math.min((now - start) / duration, 1);
        const u = 1 - t;
        const px = u * u * fx + 2 * u * t * mx + t * t * tx;
        const py = u * u * fy + 2 * u * t * my + t * t * ty;
        marker.setAttribute('cx', px);
        marker.setAttribute('cy', py);
        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            setTimeout(() => {
                pathAnim.remove();
                marker.remove();
                onComplete();
            }, 200);
        }
    }
    requestAnimationFrame(step);
}
