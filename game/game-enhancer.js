/* ═══════════════════════════════════════════════════════════════
   GAME HUB — Content Enhancer v2
   Two-pass block parser: tokenize lines → render semantic HTML.
   Transforms Telegram-style text into native WebApp components.
   Zero server changes — purely client-side post-processing.
   ═══════════════════════════════════════════════════════════════ */

const _COLOR_SQUARES = new Set(['🟩', '🟨', '🟧', '🟥', '🟦', '🟪']);

// Biome detection from location header icons
const _ICON_TO_BIOME = {
    '🏔': 'mountain', '⛰': 'mountain',
    '🌲': 'forest', '🌳': 'forest', '🍃': 'forest',
    '🐍': 'swamp', '🌿': 'swamp',
    '🌵': 'desert', '☀': 'desert',
    '❄': 'snow', '🏔️': 'mountain',
    '🌋': 'volcanic', '🔥': 'volcanic',
    '🕳': 'cave', '⛏': 'cave',
    '🏰': 'city', '🏘': 'city', '⛪': 'city',
    '🌾': 'plains', '🏕': 'plains',
    '🧭': 'exploration',
};

function _detectBiome(text) {
    if (!text) return '';
    for (const [icon, biome] of Object.entries(_ICON_TO_BIOME)) {
        if (text.includes(icon)) return biome;
    }
    return '';
}

// ── Pattern detectors ───────────────────────────────────────────

const _RE_HEADER_DIV   = /⚜️\s*[═]{4,}\s*⚜️/;
const _RE_FOOTER_DIV   = /💎\s*[━]{4,}\s*💎/;
const _RE_PLAIN_SEP    = /^[━]{6,}$/;
const _RE_DOTTED_SEP   = /^[┄]{6,}$/;
const _RE_BOLD_TITLE   = /^<b>.*<\/b>$/;
const _RE_CHAR_LINE    = /^👤\s/;
const _RE_CHAR_META    = /^(?:🏷️|💎)\s.*·/;
const _RE_STATS_LINE   = /^🛡/.test.bind(/^🛡/);
const _RE_RESOURCE     = /💰/.test.bind(/💰/);
const _RE_PARTY_HDR    = /^━\s*<b>.*GRUPO.*<\/b>\s*━/i;
const _RE_NOTIF        = /^📬/;
const _RE_SOCIAL_PULSE = /^👥\s/;
const _RE_BANNER_LINK  = /^<a\s+href="[^"]*">\s*\u200b?\s*<\/a>$/;
const _RE_FLAVOR_WRAP  = /^<i>[^<]+<\/i>$/;
const _RE_DEPARTURE    = /^📜\s*<i>/;
const _RE_BAR_START    = /^(?:🎲\s?)?[🟩🟨🟧🟥🟦🟪⬛]/u;
const _RE_SUBTITLE     = /^(?:\u{1F4CD}|\u{1F7E2}|\u{1F7E1}|\u{1F7E0}|\u{1F534}|\u26A0|\u{1F6A9})\uFE0F?\s/u;

function _isSubtitleLine(line) {
    return _RE_SUBTITLE.test(line);
}

/**
 * Enhance server HTML with styled CSS components.
 * @param {string} html — raw HTML from server response
 * @returns {string} — enhanced HTML with semantic blocks
 */
function enhanceContent(html) {
    if (!html) return '';

    // Strip invisible width rulers (Braille blank U+2800 sequences)
    html = html.replace(/[\u2800]{5,}/g, '');

    const lines = html.split('\n');
    const blocks = _tokenize(lines);
    return _render(blocks);
}

// ═══════════════════════════════════════════════════════════════
//  PASS 1 — Tokenize lines into typed blocks
// ═══════════════════════════════════════════════════════════════

function _tokenize(lines) {
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
        const t = lines[i].trim();

        // Empty line
        if (!t) {
            // Collapse consecutive blank lines
            if (blocks.length && blocks[blocks.length - 1].type === 'spacer') {
                i++; continue;
            }
            blocks.push({ type: 'spacer' });
            i++; continue;
        }

        // Banner link (<a href="...">​</a>) — strip entirely
        if (_RE_BANNER_LINK.test(t)) { i++; continue; }

        // Header block: [time] + divider + title + divider
        if (_RE_HEADER_DIV.test(t)) {
            const hdr = _consumeHeader(lines, i, blocks);
            if (hdr) { blocks.push(hdr.block); i = hdr.next; continue; }
        }

        // Footer divider (💎 ━━━ 💎)
        if (_RE_FOOTER_DIV.test(t)) {
            // Don't render — content after it (resources) is handled separately
            i++; continue;
        }

        // Plain separator (━━━━━━)
        if (_RE_PLAIN_SEP.test(t)) {
            blocks.push({ type: 'divider_sm' });
            i++; continue;
        }

        // Dotted separator (┄┄┄┄┄┄)
        if (_RE_DOTTED_SEP.test(t)) {
            blocks.push({ type: 'divider_dot' });
            i++; continue;
        }

        // Character identity block (2 lines: 👤 Name + 🏷️ Race)
        if (_RE_CHAR_LINE.test(t) && i + 1 < lines.length && _RE_CHAR_META.test(lines[i + 1].trim())) {
            blocks.push({ type: 'character', name: t, meta: lines[i + 1].trim() });
            i += 2; continue;
        }

        // Resource bars (HP, MP, XP, HD)
        if (_RE_BAR_START.test(t)) {
            const bar = _tryBar(t);
            if (bar) { blocks.push({ type: 'bar_html', html: bar }); i++; continue; }
        }

        // Stats line (🛡️ AC | ⚔️ +atk | 🗡️ dmg)
        if (/^🛡/.test(t) && t.includes('|') && /[⚔👁]/.test(t)) {
            blocks.push({ type: 'stats_html', html: _statsBadges(t) });
            i++; continue;
        }

        // Resource badges (💰 GP | 🎒 Itens)
        if (/💰/.test(t) && /🎒/.test(t) && t.includes('|')) {
            blocks.push({ type: 'resources_html', html: _resourceBadges(t) });
            i++; continue;
        }

        // Party header (━ GRUPO ━)
        if (_RE_PARTY_HDR.test(t)) {
            const party = _consumeParty(lines, i);
            blocks.push(party.block);
            i = party.next; continue;
        }

        // Notification block (📬 Novidades:)
        if (_RE_NOTIF.test(t)) {
            const notif = _consumeNotification(lines, i);
            blocks.push(notif.block);
            i = notif.next; continue;
        }

        // Social pulse (👥 ...)
        if (_RE_SOCIAL_PULSE.test(t)) {
            blocks.push({ type: 'social', text: t });
            i++; continue;
        }

        // Departure notice (📜 <i>Name partiu...</i>)
        if (_RE_DEPARTURE.test(t)) {
            blocks.push({ type: 'departure', text: t });
            i++; continue;
        }

        // Standalone flavor text (<i>...</i> wrapping entire line)
        if (_RE_FLAVOR_WRAP.test(t)) {
            const inner = t.replace(/^<i>/, '').replace(/<\/i>$/, '');
            blocks.push({ type: 'flavor', text: inner });
            i++; continue;
        }

        // Festival banner or any bold-only line (not consumed by header)
        if (_RE_BOLD_TITLE.test(t) && /⚜️/.test(t)) {
            // Standalone ⚜️ title not inside header block — render as location title
            const titleText = t.replace(/<\/?b>/g, '');
            blocks.push({ type: 'location_title', text: titleText });
            i++; continue;
        }

        // Default: plain text
        blocks.push({ type: 'text', text: lines[i] });
        i++;
    }

    return blocks;
}

// ── Header consumer ────────────────────────────────────────────

function _consumeHeader(lines, startIdx, existingBlocks) {
    // Pattern: [optional time line before] + ⚜️ ═══ ⚜️ + title + ⚜️ ═══ ⚜️ + [optional subtitle after]
    let i = startIdx;
    let timeLine = null;

    // Check if previous block was a text line that looks like a time string
    // (bold text with date/time info before the divider)
    if (existingBlocks.length > 0) {
        const prev = existingBlocks[existingBlocks.length - 1];
        if (prev.type === 'text' && /<b>.*<\/b>/.test(prev.text.trim()) && /\d/.test(prev.text)) {
            timeLine = prev.text.trim().replace(/<\/?b>/g, '');
            existingBlocks.pop(); // consume the time line retroactively
        }
    }

    i++; // skip first divider

    // Look for title line(s) and second divider
    let titleLines = [];
    while (i < lines.length) {
        const t = lines[i].trim();
        if (_RE_HEADER_DIV.test(t)) {
            i++; // skip second divider
            break;
        }
        if (t) titleLines.push(t);
        i++;
    }

    // Extract title text (strip HTML tags)
    let title = titleLines.join(' ').replace(/<\/?b>/g, '').replace(/<\/?i>/g, '').trim();

    // Check for subtitle line right after header (difficulty/danger info or location info)
    // Matches: "🟢 Normal · ⚠️ Perigo ▪▪▪", "📍 Local Atual: ...", etc.
    let subtitle = null;
    if (i < lines.length) {
        const next = lines[i].trim();
        if (next && _isSubtitleLine(next) && !_RE_HEADER_DIV.test(next) && !_RE_BAR_START.test(next)) {
            subtitle = next;
            i++;
        }
    }

    return {
        block: { type: 'header', time: timeLine, title: title, subtitle: subtitle },
        next: i
    };
}

// ── Party consumer ─────────────────────────────────────────────

function _consumeParty(lines, startIdx) {
    let i = startIdx + 1; // skip the header line
    const allies = [];

    while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) { i++; break; } // blank line ends the party block
        // Ally lines typically have : and ❤️
        if (t.includes('❤️') || t.includes(':')) {
            allies.push(t);
        } else {
            break; // non-ally line ends the block
        }
        i++;
    }

    return {
        block: { type: 'party', allies: allies },
        next: i
    };
}

// ── Notification consumer ──────────────────────────────────────

function _consumeNotification(lines, startIdx) {
    const titleLine = lines[startIdx].trim();
    let i = startIdx + 1;
    const bodyLines = [];

    while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) { i++; break; } // blank line ends notification
        bodyLines.push(t);
        i++;
    }

    return {
        block: { type: 'notification', title: titleLine, body: bodyLines },
        next: i
    };
}

// ═══════════════════════════════════════════════════════════════
//  PASS 2 — Render blocks to styled HTML
// ═══════════════════════════════════════════════════════════════

function _render(blocks) {
    const out = [];
    let i = 0;

    while (i < blocks.length) {
        const b = blocks[i];

        // Group consecutive bar_html blocks into a single bar-group container
        if (b.type === 'bar_html') {
            let barHtml = '';
            while (i < blocks.length && (blocks[i].type === 'bar_html' || blocks[i].type === 'spacer')) {
                if (blocks[i].type === 'bar_html') barHtml += blocks[i].html;
                i++;
            }
            out.push(`<div class="v-bar-group">${barHtml}</div>`);
            continue;
        }

        switch (b.type) {
            case 'header':
                out.push(_renderHeader(b));
                break;
            case 'location_title':
                out.push(`<div class="v-location-header"><h2>${_esc(b.text)}</h2></div>`);
                break;
            case 'character':
                out.push(_renderCharacter(b));
                break;
            case 'stats_html':
            case 'resources_html':
                out.push(b.html);
                break;
            case 'flavor':
                out.push(`<div class="v-flavor">${b.text}</div>`);
                break;
            case 'party':
                out.push(_renderParty(b));
                break;
            case 'notification':
                out.push(_renderNotification(b));
                break;
            case 'social':
                out.push(`<div class="v-social-pulse">${b.text}</div>`);
                break;
            case 'departure':
                out.push(`<div class="v-departure">${b.text}</div>`);
                break;
            case 'divider_sm':
                out.push('<div class="v-divider v-divider-sm"></div>');
                break;
            case 'divider_dot':
                out.push('<div class="v-divider v-divider-dot"></div>');
                break;
            case 'spacer':
                out.push('<div class="v-spacer"></div>');
                break;
            case 'text':
                // Wrap non-empty text in section
                if (b.text.trim()) {
                    out.push(`<div class="v-section">${b.text}</div>`);
                }
                break;
        }
        i++;
    }

    return out.join('\n');
}

// ── Block renderers ────────────────────────────────────────────

function _renderHeader(b) {
    const title = _esc(b.title || '');
    const biome = _detectBiome(b.title || '');
    const biomeAttr = biome ? ` data-biome="${biome}"` : '';

    // Extract leading emoji icon from title
    const iconMatch = title.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u);
    const icon = iconMatch ? iconMatch[0] : '';
    const titleText = icon ? title.slice(icon.length).replace(/^\s*[—\-:]\s*/, '').trim() : title;

    let h = `<div class="v-location-header"${biomeAttr}>`;
    if (b.time) {
        h += `<div class="v-time-bar">${_esc(b.time)}</div>`;
    }
    if (icon) {
        h += `<span class="v-location-icon">${icon}</span>`;
    }
    if (titleText) {
        h += `<h2>${titleText}</h2>`;
    }
    if (b.subtitle) {
        h += `<div class="v-location-subtitle">${b.subtitle}</div>`;
    }
    h += '</div>';
    return h;
}

function _renderCharacter(b) {
    // name line: "👤 <b>Wilzen</b> Lv.8 Bárbaro" → keep HTML for bold
    // meta line: "🏷️ <i>Dwarf · Masculino</i>" → strip tags
    const metaClean = b.meta.replace(/<\/?[bi]>/g, '').replace(/^(?:🏷️|💎)\s*/, '');
    return (
        `<div class="v-char-card">`
        + `<div class="v-char-name">${b.name}</div>`
        + `<div class="v-char-meta">${metaClean}</div>`
        + `</div>`
    );
}

function _renderParty(b) {
    let h = '<div class="v-party-block">';
    h += '<div class="v-party-header">Grupo</div>';
    for (const ally of b.allies) {
        h += `<div class="v-ally-row">${ally}</div>`;
    }
    h += '</div>';
    return h;
}

function _renderNotification(b) {
    let h = '<div class="v-notification">';
    h += `<div class="v-notif-title">${b.title}</div>`;
    if (b.body.length) {
        h += `<div class="v-notif-body">${b.body.join('<br>')}</div>`;
    }
    h += '</div>';
    return h;
}

// ── Escape helper (strips only ⚜️ decorators, keeps safe chars) ──

function _esc(text) {
    return text.replace(/⚜️\s*/g, '').trim();
}

// ═══════════════════════════════════════════════════════════════
//  BAR ENHANCEMENT (preserved from v1)
// ═══════════════════════════════════════════════════════════════

function _tryBar(line) {
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

function _barPct(squares) {
    let colored = 0, total = 0;
    for (const c of squares) {
        if (_COLOR_SQUARES.has(c)) { colored++; total++; }
        else if (c === '⬛') total++;
    }
    return total > 0 ? Math.round((colored / total) * 100) : 0;
}

function _barType(icon, xpSuffix, squares) {
    if (icon.includes('❤')) {
        if (squares.includes('🟥')) return 'hp-crit';
        if (squares.includes('🟨') || squares.includes('🟧')) return 'hp-warn';
        return 'hp';
    }
    if (icon.includes('✨') && xpSuffix) return 'xp';
    if (icon.includes('✨')) return 'xp';
    return 'mp';
}

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

// ═══════════════════════════════════════════════════════════════
//  STATS & RESOURCE BADGES (preserved from v1)
// ═══════════════════════════════════════════════════════════════

function _statsBadges(line) {
    const parts = line.split('|').map(s => s.trim()).filter(Boolean);
    const badges = parts.map(p => `<span class="v-stat-badge">${p}</span>`).join('');
    return `<div class="v-stat-row">${badges}</div>`;
}

function _resourceBadges(line) {
    let inner = line.replace(/^<i>/, '').replace(/<\/i>$/, '');
    const parts = inner.split('|').map(s => s.trim()).filter(Boolean);
    const badges = parts.map(p => `<span class="v-resource-badge">${p}</span>`).join('');
    return `<div class="v-resource-row">${badges}</div>`;
}
