// ═══════════════════════════════════════════════════════════════
// SHARED FETCH UTILITIES — Timeout + Retry + JSON safety
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
 * Check if an error is transient (worth retrying).
 * @param {Error} e
 * @param {number} httpStatus - 0 if no response
 * @returns {boolean}
 */
function _isTransient(e, httpStatus) {
    if (!httpStatus) return true; // network error, timeout
    if (httpStatus === 429 || httpStatus >= 500) return true;
    if (e && e.message && e.message.includes('HTML ao inv')) return true; // tunnel error page
    return false;
}

/**
 * Fetch JSON with timeout. Throws on error.
 * @param {string} url
 * @param {RequestInit} opts
 * @param {number} timeoutMs
 * @returns {Promise<any>}
 */
async function fetchJSON(url, opts = {}, timeoutMs = 15000) {
    const r = await fetchT(url, opts, timeoutMs);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const text = await r.text();
    if (text.trimStart().startsWith('<')) {
        throw new Error('Resposta inesperada do servidor (HTML ao invés de JSON).');
    }
    try { return JSON.parse(text); }
    catch (e) { throw new Error('Invalid JSON response'); }
}

/**
 * Fetch JSON with automatic retry + exponential backoff.
 * Retries on: timeout, network error, 429, 5xx, HTML tunnel pages.
 * @param {string} url
 * @param {RequestInit} opts
 * @param {object} retryCfg - { maxRetries: 3, timeoutMs: 15000 }
 * @returns {Promise<any>}
 */
async function fetchJSONRetry(url, opts = {}, retryCfg = {}) {
    const maxRetries = retryCfg.maxRetries || 3;
    const timeoutMs = retryCfg.timeoutMs || 15000;
    let lastErr;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fetchJSON(url, opts, timeoutMs);
        } catch (e) {
            lastErr = e;
            const status = e.message && e.message.match(/HTTP (\d+)/);
            const code = status ? parseInt(status[1]) : 0;
            if (attempt < maxRetries && _isTransient(e, code)) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
                const jitter = Math.random() * 500;
                await new Promise(r => setTimeout(r, delay + jitter));
                continue;
            }
            throw e;
        }
    }
    throw lastErr;
}
