// ═══════════════════════════════════════════════════════════════
// SHARED FETCH UTILITIES — Timeout + JSON safety for all WebApps
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch with timeout. Returns the Response or throws on timeout/network error.
 * @param {string} url
 * @param {RequestInit} opts
 * @param {number} timeoutMs - default 15000 (15s)
 * @returns {Promise<Response>}
 */
async function fetchT(url, opts = {}, timeoutMs = 15000) {
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), timeoutMs);
    try {
        const r = await fetch(url, { ...opts, signal: ac.signal });
        clearTimeout(tid);
        return r;
    } catch (e) {
        clearTimeout(tid);
        if (e.name === 'AbortError') throw new Error('Request timeout (' + timeoutMs + 'ms)');
        throw e;
    }
}

/**
 * Fetch JSON with timeout. Returns parsed JSON or null on error.
 * @param {string} url
 * @param {RequestInit} opts
 * @param {number} timeoutMs
 * @returns {Promise<any|null>}
 */
async function fetchJSON(url, opts = {}, timeoutMs = 15000) {
    const r = await fetchT(url, opts, timeoutMs);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const text = await r.text();
    try { return JSON.parse(text); }
    catch (e) { throw new Error('Invalid JSON response'); }
}
