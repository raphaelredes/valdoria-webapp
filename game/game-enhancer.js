/* ═══════════════════════════════════════════════════════════════
   GAME HUB — Content Enhancer v3
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

// v3: Section headers, attribute pairs, combat formulas, ally cards
const _RE_SECTION_HDR  = /^(📊|⚔️|📖|🌟|⚠️|📜)\s+(ATRIBUTOS|COMBATE|FEITOS|HABILIDADES)/i;
const _RE_ATTR_PAIR    = /^[💪⚡🧱🧠🦉🎭].*\([+-]\d+\).*\|.*\([+-]\d+\)/;
const _RE_COMBAT_FORMULA = /^[🛡🎯💥📋].*└/;
const _RE_COMBAT_STAT  = /^📋.*Prof/;
const _RE_DEAD_ALLY    = /^💀\s/;
const _RE_ALLY_IDENT   = /^(?:⚔️|🧙‍♂️|🗡️|⚕️|🛡️|🏹|🪓|🎻|🌿|🙏|🔮|👁️|👤)\s/;
const _RE_ALLY_LEVEL   = /^Lvl\s+\d+\s+\S/;

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

        // v3: Dead ally (💀 Name — Caído + Lvl line)
        if (_RE_DEAD_ALLY.test(t)) {
            const result = _consumeDeadAlly(lines, i);
            blocks.push(result.block);
            i = result.next; continue;
        }

        // v3: Ally identity + bars card (class icon + name, then Lvl, then bars)
        if (_RE_ALLY_IDENT.test(t) && i + 1 < lines.length && _RE_ALLY_LEVEL.test(lines[i + 1].trim())) {
            const result = _consumeAllyCard(lines, i);
            blocks.push(result.block);
            i = result.next; continue;
        }

        // v3: Section header (📊 ATRIBUTOS, ⚔️ COMBATE, 📖 FEITOS)
        if (_RE_SECTION_HDR.test(t)) {
            const titleClean = t.replace(/<\/?b>/g, '');
            blocks.push({ type: 'section_hdr', text: titleClean });
            i++; continue;
        }

        // v3: Attribute pair (💪 FOR: 8 (-1) | ⚡ DES: 14 (+2))
        if (_RE_ATTR_PAIR.test(t)) {
            blocks.push({ type: 'attr_pair', text: t });
            i++; continue;
        }

        // v3: Combat formula (🛡️ DEF: 15  └ 10 + 2(DEX) + 0(Itens))
        if (_RE_COMBAT_FORMULA.test(t)) {
            blocks.push({ type: 'combat_formula', text: t });
            i++; continue;
        }

        // v3: Combat stat without formula (📋 Prof.: +2)
        if (_RE_COMBAT_STAT.test(t)) {
            blocks.push({ type: 'combat_formula', text: t });
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
    let i = startIdx;
    let timeLine = null;

    if (existingBlocks.length > 0) {
        const prev = existingBlocks[existingBlocks.length - 1];
        if (prev.type === 'text' && /<b>.*<\/b>/.test(prev.text.trim()) && /\d/.test(prev.text)) {
            timeLine = prev.text.trim().replace(/<\/?b>/g, '');
            existingBlocks.pop();
        }
    }

    i++; // skip first divider

    let titleLines = [];
    while (i < lines.length) {
        const t = lines[i].trim();
        if (_RE_HEADER_DIV.test(t)) {
            i++;
            break;
        }
        if (t) titleLines.push(t);
        i++;
    }

    let title = titleLines.join(' ').replace(/<\/?b>/g, '').replace(/<\/?i>/g, '').trim();

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
    let i = startIdx + 1;
    const allies = [];

    while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) { i++; break; }
        if (t.includes('❤️') || t.includes(':')) {
            allies.push(t);
        } else {
            break;
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
        if (!t) { i++; break; }
        bodyLines.push(t);
        i++;
    }

    return {
        block: { type: 'notification', title: titleLine, body: bodyLines },
        next: i
    };
}

// ── v3: Ally card consumer (icon + name → Lvl line → bars) ────

function _consumeAllyCard(lines, startIdx) {
    const nameLine = lines[startIdx].trim();
    const lvlLine = lines[startIdx + 1].trim();
    let i = startIdx + 2;
    const bars = [];

    // Consume subsequent bar lines (HP, MP, XP)
    while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) { i++; continue; } // skip blank lines between bars
        if (_RE_BAR_START.test(t)) {
            const bar = _tryBar(t);
            if (bar) { bars.push(bar); i++; continue; }
        }
        break; // non-bar, non-blank line ends the card
    }

    return {
        block: { type: 'ally_card', name: nameLine, level: lvlLine, bars: bars },
        next: i
    };
}

// ── v3: Dead ally consumer (💀 Name — Caído + optional Lvl line) ──

function _consumeDeadAlly(lines, startIdx) {
    const deadLine = lines[startIdx].trim();
    let i = startIdx + 1;
    let lvlLine = '';

    // Check if next line is a Lvl line
    if (i < lines.length) {
        const t = lines[i].trim();
        if (_RE_ALLY_LEVEL.test(t)) {
            lvlLine = t;
            i++;
        }
    }

    return {
        block: { type: 'ally_dead', text: deadLine, level: lvlLine },
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

        // v3: Group consecutive attr_pair blocks into an attribute grid
        if (b.type === 'attr_pair') {
            let rows = '';
            while (i < blocks.length && (blocks[i].type === 'attr_pair' || blocks[i].type === 'spacer')) {
                if (blocks[i].type === 'attr_pair') rows += _renderAttrPair(blocks[i]);
                i++;
            }
            out.push(`<div class="v-attr-grid">${rows}</div>`);
            continue;
        }

        // v3: Group consecutive combat_formula blocks into a combat card
        if (b.type === 'combat_formula') {
            let formulas = '';
            while (i < blocks.length && (blocks[i].type === 'combat_formula' || blocks[i].type === 'spacer')) {
                if (blocks[i].type === 'combat_formula') formulas += _renderCombatLine(blocks[i]);
                i++;
            }
            out.push(`<div class="v-combat-block">${formulas}</div>`);
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
            // v3: New block types
            case 'section_hdr':
                out.push(_renderSectionHeader(b));
                break;
            case 'ally_card':
                out.push(_renderAllyCard(b));
                break;
            case 'ally_dead':
                out.push(_renderAllyDead(b));
                break;
            case 'text':
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

// ── v3: Section header renderer ────────────────────────────────

function _renderSectionHeader(b) {
    const text = b.text.replace(/<\/?b>/g, '');
    // Extract leading emoji
    const iconMatch = text.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u);
    const icon = iconMatch ? iconMatch[0].trim() : '';
    const label = icon ? text.slice(iconMatch[0].length).trim() : text.trim();
    return `<div class="v-section-hdr"><span class="v-section-icon">${icon}</span><span class="v-section-label">${label}</span></div>`;
}

// ── v3: Attribute pair renderer ────────────────────────────────

function _renderAttrPair(b) {
    const text = b.text.replace(/<\/?code>/g, '');
    const parts = text.split('|').map(s => s.trim());
    let h = '<div class="v-attr-row">';
    for (const part of parts) {
        // Extract: icon + LABEL: val (+mod)
        const m = part.match(/^(.+?)\s*(\w+):\s*(\d+)\s*\(([+-]\d+)\)/);
        if (m) {
            const [, icon, label, val, mod] = m;
            h += `<div class="v-attr-cell">`
                + `<span class="v-attr-icon">${icon.trim()}</span>`
                + `<span class="v-attr-label">${label}</span>`
                + `<span class="v-attr-val">${val}</span>`
                + `<span class="v-attr-mod">${mod}</span>`
                + `</div>`;
        } else {
            h += `<div class="v-attr-cell"><span class="v-attr-label">${part}</span></div>`;
        }
    }
    h += '</div>';
    return h;
}

// ── v3: Combat formula renderer ────────────────────────────────

function _renderCombatLine(b) {
    const text = b.text.replace(/<\/?code>/g, '');
    // Split on └ to get main stat and formula
    const splitIdx = text.indexOf('└');
    if (splitIdx >= 0) {
        const main = text.slice(0, splitIdx).trim();
        const formula = text.slice(splitIdx + 1).trim();
        return `<div class="v-combat-line">`
            + `<div class="v-combat-main">${main}</div>`
            + `<div class="v-combat-detail">${formula}</div>`
            + `</div>`;
    }
    // No formula breakdown (e.g., 📋 Prof.: +2)
    return `<div class="v-combat-line"><div class="v-combat-main">${text}</div></div>`;
}

// ── v3: Ally card renderer ─────────────────────────────────────

function _renderAllyCard(b) {
    let h = '<div class="v-ally-card">';
    h += `<div class="v-ally-name">${b.name}</div>`;
    h += `<div class="v-ally-level">${b.level}</div>`;
    if (b.bars.length) {
        h += `<div class="v-bar-group">${b.bars.join('')}</div>`;
    }
    h += '</div>';
    return h;
}

// ── v3: Dead ally renderer ─────────────────────────────────────

function _renderAllyDead(b) {
    let h = '<div class="v-ally-card v-ally-card--dead">';
    h += `<div class="v-ally-name">${b.text}</div>`;
    if (b.level) {
        h += `<div class="v-ally-level">${b.level}</div>`;
    }
    h += '</div>';
    return h;
}

// ── Escape helper ──────────────────────────────────────────────

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
