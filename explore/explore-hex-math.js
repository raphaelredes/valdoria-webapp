/**
 * Hex math primitives (axial + cube coordinates) — Red Blob Games canonical.
 *
 * #7 (hexmap modernization): the current explore system stores hexes in
 * odd-r offset (col, row) which requires par/impar branching for neighbors
 * and distance. These helpers provide the modern axial/cube representation
 * so future features (line-of-sight, ranged AOE, teleport, rotation) can
 * use vector math without branching.
 *
 * Existing getNeighbors / hexDist in explore-core.js are unchanged — this
 * file is additive. New code should prefer axial; legacy code can stay.
 *
 * Layout assumption: ODD-R offset (rows with odd index shifted +0.5).
 * This matches explore-iso.js hexToScreen.
 *
 * References:
 *   https://www.redblobgames.com/grids/hexagons/
 *   https://www.redblobgames.com/grids/hexagons/implementation.html
 */

/* ── Coordinate conversions ── */

/**
 * Odd-r offset (col, row) → axial (q, r).
 * Returns {q, r}.
 */
function offsetToAxial(col, row) {
    var q = col - (row - (row & 1)) / 2;
    var r = row;
    return { q: q, r: r };
}

/**
 * Axial (q, r) → odd-r offset (col, row).
 * Returns {col, row}.
 */
function axialToOffset(q, r) {
    var col = q + (r - (r & 1)) / 2;
    var row = r;
    return { col: col, row: row };
}

/**
 * Axial (q, r) → cube (x, y, z). Third coordinate is derived: s = -q-r.
 * Returns {x, y, z}.
 */
function axialToCube(q, r) {
    return { x: q, y: -q - r, z: r };
}

/**
 * Cube (x, y, z) → axial (q, r).
 * Returns {q, r}.
 */
function cubeToAxial(x, y, z) {
    return { q: x, r: z };
}

/* ── Distance ── */

/**
 * Axial distance between two hexes — no branching, no par/impar.
 * Returns integer distance in hexes.
 */
function axialDistance(q1, r1, q2, r2) {
    return (Math.abs(q1 - q2)
          + Math.abs(q1 + r1 - q2 - r2)
          + Math.abs(r1 - r2)) / 2;
}

/**
 * Cube distance — same result as axial but exposed for callers that
 * already have cube coordinates.
 */
function cubeDistance(x1, y1, z1, x2, y2, z2) {
    return (Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(z1 - z2)) / 2;
}

/* ── Neighbors (no par/impar branching) ── */

/** Axial neighbor directions — pointy-top hex. */
var AXIAL_DIRECTIONS = [
    { q: +1, r:  0 }, { q: +1, r: -1 }, { q:  0, r: -1 },
    { q: -1, r:  0 }, { q: -1, r: +1 }, { q:  0, r: +1 }
];

/**
 * Get the 6 axial neighbors of a hex — no par/impar switch needed.
 * Returns an array of {q, r}.
 */
function axialNeighbors(q, r) {
    var out = [];
    for (var i = 0; i < 6; i++) {
        var d = AXIAL_DIRECTIONS[i];
        out.push({ q: q + d.q, r: r + d.r });
    }
    return out;
}

/* ── Line drawing (for ranged skills, LOS) ── */

/**
 * Round fractional cube coordinates to the nearest integer hex.
 * Used by pixelToAxial and axial lerp to snap back to grid cells.
 */
function cubeRound(fx, fy, fz) {
    var rx = Math.round(fx);
    var ry = Math.round(fy);
    var rz = Math.round(fz);
    var xDiff = Math.abs(rx - fx);
    var yDiff = Math.abs(ry - fy);
    var zDiff = Math.abs(rz - fz);
    if (xDiff > yDiff && xDiff > zDiff) {
        rx = -ry - rz;
    } else if (yDiff > zDiff) {
        ry = -rx - rz;
    } else {
        rz = -rx - ry;
    }
    return { x: rx, y: ry, z: rz };
}

/** Linear interpolation between two axial points — returns fractional cube. */
function axialLerp(q1, r1, q2, r2, t) {
    var a = axialToCube(q1, r1);
    var b = axialToCube(q2, r2);
    return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t
    };
}

/**
 * Draw a line of hexes between two axial points. Returns an array of
 * {q, r} spanning from the start to the end (both inclusive). Useful
 * for line-of-sight checks and ranged spell paths.
 */
function axialLineDraw(q1, r1, q2, r2) {
    var n = axialDistance(q1, r1, q2, r2);
    if (n === 0) return [{ q: q1, r: r1 }];
    var results = [];
    for (var i = 0; i <= n; i++) {
        var frac = axialLerp(q1, r1, q2, r2, 1.0 * i / n);
        var rounded = cubeRound(frac.x, frac.y, frac.z);
        results.push(cubeToAxial(rounded.x, rounded.y, rounded.z));
    }
    return results;
}

/* ── Expose globals (no module system — this loads before explore-core) ── */
window.ValdoriaHexMath = {
    offsetToAxial: offsetToAxial,
    axialToOffset: axialToOffset,
    axialToCube: axialToCube,
    cubeToAxial: cubeToAxial,
    axialDistance: axialDistance,
    cubeDistance: cubeDistance,
    axialNeighbors: axialNeighbors,
    cubeRound: cubeRound,
    axialLerp: axialLerp,
    axialLineDraw: axialLineDraw,
    AXIAL_DIRECTIONS: AXIAL_DIRECTIONS
};
