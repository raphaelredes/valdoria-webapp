/* ── explore-pathfinding.js ──
 * A* pathfinding, BFS reachable hexes, path preview + reachable highlight rendering.
 * Depends on: explore-core.js (S, COLS, ROWS, IMPASSABLE, getNeighbors, hexDist, isDifficultTerrain),
 *             explore-iso.js (hexToScreen, HEX_W, HEX_H),
 *             explore-renderer.js (scheduleRender, CV_GOLD).
 * Fallbacks: _getHexDist / _getNeighbors if globals missing (load explore-core before this file).
 */

/* ── State ── */
var _currentPath = null;        /* Array<{col,row}> or null */
var _pathScreenCoords = null;   /* cached [{x,y},...] for current path */
var _reachableMap = null;       /* Map<'col,row', cost> or null */
var _pathMaxLen = 8;            /* max A* path length */

/* ── Helpers ── */

/** Offset coords to cube coords for A* heuristic */
function _offsetToCube(col, row) {
  var q = col - (row - (row & 1)) / 2;
  var r = row;
  return { q: q, r: r, s: -q - r };
}

/** Cube hex distance (matches explore-core.js hexDist — Red Blob Games / Amit Patel). */
function _hexDistHeuristic(c1, r1, c2, r2) {
  var a = _offsetToCube(c1, r1);
  var b = _offsetToCube(c2, r2);
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
}

var _hexDistFallbackWarned = false;
var _neighborsFallbackWarned = false;

/** Prefer global hexDist from explore-core.js; same cube math if missing (e.g. script order). */
function _getHexDist(c1, r1, c2, r2) {
  if (typeof hexDist === 'function') {
    return hexDist(c1, r1, c2, r2);
  }
  if (!_hexDistFallbackWarned) {
    console.warn('[EXPLORE:PATH] hexDist missing — using cube heuristic (ensure explore-core.js loads before pathfinding)');
    _hexDistFallbackWarned = true;
  }
  return _hexDistHeuristic(c1, r1, c2, r2);
}

/* Duplicated from explore-core EVEN_OFFSETS / ODD_OFFSETS for emergency fallback only */
var _PF_EVEN = [[-1, -1], [0, -1], [-1, 0], [1, 0], [-1, 1], [0, 1]];
var _PF_ODD = [[0, -1], [1, -1], [-1, 0], [1, 0], [0, 1], [1, 1]];

function _getNeighbors(col, row) {
  if (typeof getNeighbors === 'function') {
    return getNeighbors(col, row);
  }
  if (typeof COLS !== 'number' || typeof ROWS !== 'number') {
    return [];
  }
  if (!_neighborsFallbackWarned) {
    console.warn('[EXPLORE:PATH] getNeighbors missing — using offset fallback (ensure explore-core.js loads before pathfinding)');
    _neighborsFallbackWarned = true;
  }
  var offsets = row % 2 === 0 ? _PF_EVEN : _PF_ODD;
  var out = [];
  for (var i = 0; i < offsets.length; i++) {
    var c = col + offsets[i][0];
    var r = row + offsets[i][1];
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
      out.push([c, r]);
    }
  }
  return out;
}

/** Movement cost for a tile. Returns Infinity if impassable or hidden fog. */
function _tileCost(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return Infinity;
  var tile = S.grid[row] && S.grid[row][col] ? S.grid[row][col] : '.';
  /* Treat encounter/event chars as their base passable tile */
  var baseTile = tile.match(/[0-9@EC]/) ? '.' : tile;
  if (IMPASSABLE.has(baseTile)) return Infinity;
  /* Fog check — cannot path through unrevealed hexes */
  var fogKey = col + ',' + row;
  var fog = S.fogState[fogKey];
  if (fog !== 'visible' && fog !== 'dim') return Infinity;
  /* Difficult terrain costs 2, normal costs 1 */
  if (typeof isDifficultTerrain === 'function' && isDifficultTerrain(baseTile, S.biome)) return 2;
  return 1;
}

/* ── A* Pathfinding ── */

/**
 * A* pathfinding from (startCol, startRow) to (goalCol, goalRow).
 * Returns array of {col, row} from start to goal (inclusive), or null if no path.
 * Cost: 1 normal, 2 difficult terrain. Cannot traverse IMPASSABLE or unrevealed fog.
 * Max path length: _pathMaxLen hexes.
 */
function findPath(startCol, startRow, goalCol, goalRow) {
  /* Trivial case */
  if (startCol === goalCol && startRow === goalRow) return [{ col: startCol, row: startRow }];

  /* Quick reject — if goal is impassable or too far */
  var goalCost = _tileCost(goalCol, goalRow);
  if (goalCost === Infinity) {
    console.info('[EXPLORE:PATH] findPath rejected — goal impassable or hidden (%d,%d)', goalCol, goalRow);
    return null;
  }
  var hDist = _getHexDist(startCol, startRow, goalCol, goalRow);
  if (hDist > _pathMaxLen) {
    console.info('[EXPLORE:PATH] findPath rejected — hex dist %d exceeds max %d', hDist, _pathMaxLen);
    return null;
  }

  var startKey = startCol + ',' + startRow;
  var goalKey = goalCol + ',' + goalRow;

  /* Open set — simple array-based priority queue (small grid, fine for 11x13) */
  var open = [{ col: startCol, row: startRow, key: startKey }];
  var gScore = {};
  gScore[startKey] = 0;
  var fScore = {};
  fScore[startKey] = hDist;
  var cameFrom = {};
  var closedSet = {};

  while (open.length > 0) {
    /* Find node with lowest fScore */
    var bestIdx = 0;
    for (var oi = 1; oi < open.length; oi++) {
      if ((fScore[open[oi].key] || Infinity) < (fScore[open[bestIdx].key] || Infinity)) {
        bestIdx = oi;
      }
    }
    var current = open[bestIdx];
    open.splice(bestIdx, 1);

    if (current.key === goalKey) {
      /* Reconstruct path */
      var path = [{ col: goalCol, row: goalRow }];
      var traceKey = goalKey;
      while (cameFrom[traceKey]) {
        var prev = cameFrom[traceKey];
        path.push({ col: prev.col, row: prev.row });
        traceKey = prev.col + ',' + prev.row;
      }
      path.reverse();
      console.info('[EXPLORE:PATH] findPath OK (%d,%d)->(%d,%d) len=%d cost=%d',
        startCol, startRow, goalCol, goalRow, path.length, gScore[goalKey]);
      return path;
    }

    closedSet[current.key] = true;

    /* Expand neighbors */
    var neighbors = _getNeighbors(current.col, current.row);
    for (var ni = 0; ni < neighbors.length; ni++) {
      var nc = neighbors[ni][0];
      var nr = neighbors[ni][1];
      var nKey = nc + ',' + nr;

      if (closedSet[nKey]) continue;

      var moveCost = _tileCost(nc, nr);
      if (moveCost === Infinity) continue;

      var tentativeG = (gScore[current.key] || 0) + moveCost;

      /* Enforce max path length by checking g-score (approximation) */
      if (tentativeG > _pathMaxLen * 2) continue;

      if (gScore[nKey] !== undefined && tentativeG >= gScore[nKey]) continue;

      cameFrom[nKey] = { col: current.col, row: current.row };
      gScore[nKey] = tentativeG;
      var h = _getHexDist(nc, nr, goalCol, goalRow);
      fScore[nKey] = tentativeG + h;

      /* Add to open if not already present */
      var inOpen = false;
      for (var oj = 0; oj < open.length; oj++) {
        if (open[oj].key === nKey) { inOpen = true; break; }
      }
      if (!inOpen) {
        open.push({ col: nc, row: nr, key: nKey });
      }
    }
  }

  console.info('[EXPLORE:PATH] findPath FAIL — no path (%d,%d)->(%d,%d)', startCol, startRow, goalCol, goalRow);
  return null;
}

/* ── BFS Reachable ── */

/**
 * BFS to find all reachable hexes within a movement budget.
 * Returns Map<'col,row', cost> with the minimum cost to reach each hex.
 * @param {number} startCol
 * @param {number} startRow
 * @param {number} budget — max movement points (default 6)
 */
function findReachable(startCol, startRow, budget) {
  if (typeof budget !== 'number' || budget <= 0) budget = 6;

  var startKey = startCol + ',' + startRow;
  var visited = new Map();
  visited.set(startKey, 0);

  /* BFS with cost — use array as queue */
  var queue = [{ col: startCol, row: startRow, cost: 0 }];
  var qi = 0; /* queue index for efficient dequeue */

  while (qi < queue.length) {
    var node = queue[qi++];
    var neighbors = _getNeighbors(node.col, node.row);

    for (var ni = 0; ni < neighbors.length; ni++) {
      var nc = neighbors[ni][0];
      var nr = neighbors[ni][1];
      var nKey = nc + ',' + nr;

      var moveCost = _tileCost(nc, nr);
      if (moveCost === Infinity) continue;

      var newCost = node.cost + moveCost;
      if (newCost > budget) continue;

      var existing = visited.get(nKey);
      if (existing !== undefined && existing <= newCost) continue;

      visited.set(nKey, newCost);
      queue.push({ col: nc, row: nr, cost: newCost });
    }
  }

  console.info('[EXPLORE:BFS] findReachable (%d,%d) budget=%d found=%d hexes',
    startCol, startRow, budget, visited.size);
  return visited;
}

/* ── Path Preview API ── */

/**
 * Set the current path preview. Pass null to clear.
 * @param {Array<{col,row}>|null} path
 */
function setPathPreview(path) {
  _currentPath = path;
  _pathScreenCoords = null; /* invalidate cache */
  if (path && path.length > 0) {
    _cachePathCoords();
  }
  if (typeof scheduleRender === 'function') scheduleRender();
}

/** Get the current path preview */
function getPathPreview() {
  return _currentPath;
}

/**
 * Set reachable hexes highlight. Pass null to clear.
 * @param {Map<string,number>|null} reachableMap — from findReachable()
 */
function setReachableHighlight(reachableMap) {
  _reachableMap = reachableMap;
  if (typeof scheduleRender === 'function') scheduleRender();
}

/** Clear all pathfinding visuals */
function clearPathfinding() {
  _currentPath = null;
  _pathScreenCoords = null;
  _reachableMap = null;
  if (typeof scheduleRender === 'function') scheduleRender();
}

/* ── Internal: cache screen coords for path ── */
function _cachePathCoords() {
  if (!_currentPath || _currentPath.length === 0) {
    _pathScreenCoords = null;
    return;
  }
  _pathScreenCoords = [];
  for (var i = 0; i < _currentPath.length; i++) {
    var hex = _currentPath[i];
    var pos = typeof hexToScreen === 'function' ? hexToScreen(hex.col, hex.row) : { x: 0, y: 0 };
    var tile = S.grid[hex.row] && S.grid[hex.row][hex.col] ? S.grid[hex.row][hex.col] : '.';
    var baseTile = tile.match(/[0-9@EC]/) ? '.' : tile;
    var h = (typeof TILE_HEIGHT !== 'undefined' ? (TILE_HEIGHT[baseTile] || 1) : 1) *
            (typeof UNIT_PX !== 'undefined' ? UNIT_PX : 7);
    _pathScreenCoords.push({ x: pos.x, y: pos.y - h });
  }
}

/* ── Compute path total cost ── */
function _pathTotalCost(path) {
  if (!path || path.length < 2) return 0;
  var total = 0;
  for (var i = 1; i < path.length; i++) {
    total += _tileCost(path[i].col, path[i].row);
  }
  return total;
}

/* ── Rendering: Path Preview ── */

/**
 * Draw path preview arrows + waypoints on canvas.
 * Called from renderFrame (explore-renderer.js).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} timestamp — from requestAnimationFrame
 */
function drawPathPreview(ctx, timestamp) {
  if (!_currentPath || _currentPath.length < 2) return;
  if (!_pathScreenCoords || _pathScreenCoords.length < 2) {
    _cachePathCoords();
    if (!_pathScreenCoords || _pathScreenCoords.length < 2) return;
  }

  /* Performance tier check */
  if (typeof _renderDetail !== 'undefined' && _renderDetail < 1) return;

  var t = (timestamp || 0) * 0.001;
  var totalCost = _pathTotalCost(_currentPath);

  ctx.save();

  /* Draw dashed line segments between path hexes */
  for (var i = 0; i < _pathScreenCoords.length - 1; i++) {
    var from = _pathScreenCoords[i];
    var to = _pathScreenCoords[i + 1];
    var nextHex = _currentPath[i + 1];
    var stepCost = _tileCost(nextHex.col, nextHex.row);
    var isDifficult = stepCost >= 2;

    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = isDifficult ? 'rgba(220, 160, 50, 0.55)' : 'rgba(196, 149, 58, 0.45)';
    ctx.lineWidth = isDifficult ? 2.5 : 2;
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  ctx.setLineDash([]);

  /* Draw waypoint dots at each path hex (except start) */
  for (var j = 1; j < _pathScreenCoords.length; j++) {
    var pt = _pathScreenCoords[j];
    var pathHex = _currentPath[j];
    var isLast = j === _pathScreenCoords.length - 1;
    var hexCost = _tileCost(pathHex.col, pathHex.row);
    var isDiff = hexCost >= 2;

    if (isLast) {
      /* Destination: larger pulsing circle */
      var pulse = 0.5 + Math.sin(t * 3.0) * 0.15;
      var radius = 6 + Math.sin(t * 2.5) * 1.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(196, 149, 58, ' + pulse.toFixed(2) + ')';
      ctx.fill();

      /* Draw total cost label at destination */
      ctx.font = 'bold 12px MedievalSharp, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillText('' + totalCost, pt.x + 0.5, pt.y - radius - 3 + 0.5);
      ctx.fillStyle = 'rgba(212, 200, 176, 0.85)';
      ctx.fillText('' + totalCost, pt.x, pt.y - radius - 3);
    } else {
      /* Intermediate waypoint: small dot */
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = isDiff ? 'rgba(220, 160, 50, 0.5)' : 'rgba(196, 149, 58, 0.4)';
      ctx.fill();
    }
  }

  /* Draw small directional arrow at each segment midpoint */
  for (var k = 0; k < _pathScreenCoords.length - 1; k++) {
    var segFrom = _pathScreenCoords[k];
    var segTo = _pathScreenCoords[k + 1];
    var midX = (segFrom.x + segTo.x) / 2;
    var midY = (segFrom.y + segTo.y) / 2;
    var angle = Math.atan2(segTo.y - segFrom.y, segTo.x - segFrom.x);
    var arrowSize = 4;

    ctx.beginPath();
    ctx.moveTo(
      midX + Math.cos(angle) * arrowSize,
      midY + Math.sin(angle) * arrowSize
    );
    ctx.lineTo(
      midX + Math.cos(angle + 2.5) * arrowSize * 0.6,
      midY + Math.sin(angle + 2.5) * arrowSize * 0.6
    );
    ctx.lineTo(
      midX + Math.cos(angle - 2.5) * arrowSize * 0.6,
      midY + Math.sin(angle - 2.5) * arrowSize * 0.6
    );
    ctx.closePath();
    ctx.fillStyle = 'rgba(196, 149, 58, 0.5)';
    ctx.fill();
  }

  ctx.restore();
}

/* ── Rendering: Reachable Hex Highlights ── */

/**
 * Draw a flat-top hex outline at screen coords (cx, cy).
 * Uses HEX_W and HEX_H with a small inset.
 */
function _drawHexOutline(ctx, cx, cy) {
  ctx.beginPath();
  for (var i = 0; i < 6; i++) {
    var angle = Math.PI / 3 * i - Math.PI / 6; /* flat-top hex */
    var hx = cx + (HEX_W / 2 - 2) * Math.cos(angle);
    var hy = cy + (HEX_H / 2 - 2) * Math.sin(angle);
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
}

/**
 * Draw reachable hex highlights on canvas.
 * Called from renderFrame (explore-renderer.js).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} timestamp — from requestAnimationFrame
 */
function drawReachableHighlight(ctx, timestamp) {
  if (!_reachableMap || _reachableMap.size === 0) return;

  /* Performance tier check — skip entirely on lite devices */
  if (typeof _renderDetail !== 'undefined' && _renderDetail < 1) return;

  var t = (timestamp || 0) * 0.001;
  /* Pulse alpha oscillation: 0.10 to 0.20 over 2 seconds */
  var pulseAlpha = 0.15 + Math.sin(t * Math.PI) * 0.05;

  ctx.save();
  ctx.lineWidth = 1.5;

  var playerKey = S.playerCol + ',' + S.playerRow;
  var iter = _reachableMap.entries();
  var entry = iter.next();

  while (!entry.done) {
    var key = entry.value[0];
    /* Skip player's own hex */
    if (key !== playerKey) {
      var parts = key.split(',');
      var hCol = parseInt(parts[0], 10);
      var hRow = parseInt(parts[1], 10);

      var pos = typeof hexToScreen === 'function' ? hexToScreen(hCol, hRow) : null;
      if (pos) {
        var tile = S.grid[hRow] && S.grid[hRow][hCol] ? S.grid[hRow][hCol] : '.';
        var baseTile = tile.match(/[0-9@EC]/) ? '.' : tile;
        var h = (typeof TILE_HEIGHT !== 'undefined' ? (TILE_HEIGHT[baseTile] || 1) : 1) *
                (typeof UNIT_PX !== 'undefined' ? UNIT_PX : 7);
        var drawY = pos.y - h;

        /* Check if hex has a random encounter — use red border */
        var hasEncounter = _hexHasEncounter(hCol, hRow);

        if (hasEncounter) {
          ctx.strokeStyle = 'rgba(200, 50, 30, ' + (pulseAlpha + 0.05).toFixed(3) + ')';
        } else {
          ctx.strokeStyle = 'rgba(196, 149, 58, ' + pulseAlpha.toFixed(3) + ')';
        }

        _drawHexOutline(ctx, pos.x, drawY);
        ctx.stroke();
      }
    }
    entry = iter.next();
  }

  ctx.restore();
}

/** Check if a hex has a random encounter at its position */
function _hexHasEncounter(col, row) {
  if (!S.randomEncounters || S.randomEncounters.length === 0) return false;
  /* Random encounters are triggered on step, not positional — check encounter tiles instead */
  var tile = S.grid[row] && S.grid[row][col] ? S.grid[row][col] : '.';
  return tile === 'E' || tile === '@';
}
