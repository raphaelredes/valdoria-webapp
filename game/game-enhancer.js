/* ═══════════════════════════════════════════════════════════════
   GAME HUB — Content Enhancer
   Transforms Telegram-style text formatting into native WebApp
   CSS components (progress bars, dividers, stat badges).
   Zero server changes — purely client-side post-processing.
   ═══════════════════════════════════════════════════════════════ */

/* ─── No Scrollbars (mandatory) ─── */
// (CSS-only rule — included in game.css)

const _COLOR_SQUARES = new Set(['🟩', '🟨', '🟧', '🟥', '🟦', '🟪']);

/**
 * Enhance server HTML with styled CSS components.
 * @param {string} html — raw HTML from server response
 * @returns {string} — enhanced HTML
 */
function enhanceContent(html) {
    if (!html) return '';

    // Remove invisible width rulers (Braille blank U+2800 sequences)
    html = html.replace(/[\u2800]{5,}/g, '');

    // Process line by line
    const lines = html.split('\n');
    const out = [];

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const t = raw.trim();

        // Empty lines → preserve spacing
        if (!t) { out.push(''); continue; }

        // ── Header divider: ⚜️ ════════════ ⚜️ ──
        if (/⚜️\s*[═]{4,}\s*⚜️/.test(t)) {
            out.push('<div class="v-divider"><span>⚜️</span></div>');
            continue;
        }

        // ── Footer divider: 💎 ━━━━━━━━━━ 💎 ──
        if (/💎\s*[━]{4,}\s*💎/.test(t)) {
            out.push('<div class="v-divider v-divider-sm"></div>');
            continue;
        }

        // ── Plain separator: ━━━━━━━━━━ (no emoji) ──
        if (/^[━]{6,}$/.test(t)) {
            out.push('<div class="v-divider v-divider-sm"></div>');
            continue;
        }

        // ── Resource bars (HP, MP, XP, HD) ──
        const bar = _tryBar(t);
        if (bar) { out.push(bar); continue; }

        // ── Stats line: 🛡️ 15 | ⚔️ +5 | 🗡️ d8+3 ──
        if (/^🛡/.test(t) && t.includes('|') && /[⚔👁]/.test(t)) {
            out.push(_statsBadges(t));
            continue;
        }

        // ── Gold / Items: 💰 480 GP | 🎒 14 Itens (may be in <i>) ──
        if (/💰/.test(t) && /🎒/.test(t) && t.includes('|')) {
            out.push(_resourceBadges(t));
            continue;
        }

        // Default: keep line unchanged
        out.push(raw);
    }

    return out.join('\n');
}

// ─── Bar Enhancement ───────────────────────────────────────────

function _tryBar(line) {
    // Quick reject: must start with a square emoji or 🎲
    if (!/^(?:🎲\s?)?[🟩🟨🟧🟥🟦🟪⬛]/u.test(line)) return null;

    // HD bar: 🎲 {squares}  HD {n}/{max} ({die})
    if (line.startsWith('🎲')) {
        const m = line.match(
            /^🎲\s*((?:[🟩🟨🟧🟥🟦🟪⬛])+)\s+HD\s+(\S+)\/(\S+)\s*(\([^)]+\))?/u
        );
        if (m) {
            const pct = _barPct(m[1]);
            const suffix = m[4] ? ' ' + m[4] : '';
            return _barHtml('hd', '🎲', m[2], m[3], pct, suffix);
        }
    }

    // General bar: {squares}  {icon} {value}/{max} {XP?} {effects?}
    const m = line.match(
        /^((?:[🟩🟨🟧🟥🟦🟪⬛])+)\s+(.+?)\s+([\d,.kKmM]+)\/([\d,.kKmM]+)(\s+XP)?(.*)$/u
    );
    if (!m) return null;

    const [, squares, rawIcon, cur, max, xpSuffix, rest] = m;
    const icon = rawIcon.trim();
    const pct = _barPct(squares);
    const type = _barType(icon, xpSuffix, squares);
    const suffix = (xpSuffix || '').trim();
    const effects = (rest || '').trim();

    return _barHtml(type, icon, cur.trim(), max.trim(), pct, suffix, effects);
}

/** Count filled vs total squares → percentage. */
function _barPct(squares) {
    let colored = 0, total = 0;
    for (const c of squares) {
        if (_COLOR_SQUARES.has(c)) { colored++; total++; }
        else if (c === '⬛') total++;
    }
    return total > 0 ? Math.round((colored / total) * 100) : 0;
}

/** Detect bar type from icon and square colors. */
function _barType(icon, xpSuffix, squares) {
    if (icon.includes('❤')) {
        // HP bar — color varies by health %
        if (squares.includes('🟥')) return 'hp-crit';
        if (squares.includes('🟨') || squares.includes('🟧')) return 'hp-warn';
        return 'hp';
    }
    if (icon.includes('✨') && xpSuffix) return 'xp';
    if (icon.includes('✨')) return 'xp';
    return 'mp'; // 💧 ⭕ 🔥 🎵 🌙 — all resource bars
}

/** Build bar HTML. */
function _barHtml(type, icon, cur, max, pct, suffix, effects) {
    const label = suffix ? `${cur}/${max} ${suffix}` : `${cur}/${max}`;
    let h = '<div class="v-bar">'
        + `<span class="v-bar-icon">${icon}</span>`
        + '<div class="v-bar-track">'
        + `<div class="v-bar-fill ${type}" style="width:${pct}%"></div>`
        + '</div>'
        + `<span class="v-bar-label">${label}</span>`
        + '</div>';
    if (effects) {
        h += `<div class="v-bar-extra">${effects}</div>`;
    }
    return h;
}

// ─── Stats Line Enhancement ────────────────────────────────────

function _statsBadges(line) {
    const parts = line.split('|').map(s => s.trim()).filter(Boolean);
    const badges = parts.map(p => `<span class="v-stat-badge">${p}</span>`).join('');
    return `<div class="v-stat-row">${badges}</div>`;
}

// ─── Gold / Items Enhancement ──────────────────────────────────

function _resourceBadges(line) {
    // Strip outer <i> tags (format_msg wraps footer text in italic)
    let inner = line.replace(/^<i>/, '').replace(/<\/i>$/, '');
    const parts = inner.split('|').map(s => s.trim()).filter(Boolean);
    const badges = parts.map(p => `<span class="v-resource-badge">${p}</span>`).join('');
    return `<div class="v-resource-row">${badges}</div>`;
}
