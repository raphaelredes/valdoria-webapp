/* ═══════════════════════════════════════════════════════════════
   GAME HUB — Immersive Dialogue Renderer
   Renders NPC speech with typewriter animation, mood-based
   visual effects, and staggered choice reveal.
   ═══════════════════════════════════════════════════════════════ */

// ── Mood Constants ───────────────────────────────────────────

const MOOD_ICONS = {
    happy: '\u{1F60A}', angry: '\u{1F620}', sad: '\u{1F614}',
    busy: '\u{1F610}', neutral: '\u{1F5E3}'
};
const MOOD_LABELS = {
    happy: 'Amig\u00e1vel', angry: 'Irritado', sad: 'Melanc\u00f3lico',
    busy: 'Ocupado', neutral: ''
};
const MOOD_GRADIENTS = {
    happy:   'radial-gradient(ellipse at 50% 0%, #3a3225 0%, var(--v-bg) 70%)',
    angry:   'radial-gradient(ellipse at 50% 0%, #352028 0%, var(--v-bg) 70%)',
    sad:     'radial-gradient(ellipse at 50% 0%, #2a2a30 0%, var(--v-bg) 70%)',
    busy:    'radial-gradient(ellipse at 50% 0%, #302c30 0%, var(--v-bg) 70%)',
    neutral: 'radial-gradient(ellipse at 50% 0%, #352f38 0%, var(--v-bg) 70%)',
};

// ── Typewriter State ─────────────────────────────────────────

let _twInterval = null;
let _twCallback = null;
let _twElement = null;
let _twFullText = '';

// ── Main Render Function ─────────────────────────────────────

/**
 * Render a dialogue screen with immersive NPC speech animation.
 * Called from renderScreen() when screen.dialogue is present.
 * @param {Object} screen - Screen data with .dialogue metadata
 */
function renderDialogue(screen) {
    const contentEl = document.getElementById('content');
    const buttonsEl = document.getElementById('buttons');
    if (!contentEl) return;

    const d = screen.dialogue;
    const mood = d.mood || 'neutral';
    const moodClass = 'dlg-mood-' + mood;

    // Clear previous content
    contentEl.innerHTML = '';

    // Build dialogue card
    const card = document.createElement('div');
    card.className = 'dlg-card ' + moodClass;

    // Speaker header
    const header = document.createElement('div');
    header.className = 'dlg-header';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'dlg-mood-icon';
    iconSpan.textContent = MOOD_ICONS[mood] || MOOD_ICONS.neutral;

    const speakerSpan = document.createElement('span');
    speakerSpan.className = 'dlg-speaker';
    speakerSpan.textContent = d.speaker || '';

    header.appendChild(iconSpan);
    header.appendChild(speakerSpan);

    const moodLabel = MOOD_LABELS[mood];
    if (moodLabel) {
        const labelSpan = document.createElement('span');
        labelSpan.className = 'dlg-mood-label';
        labelSpan.textContent = moodLabel;
        header.appendChild(labelSpan);
    }

    card.appendChild(header);

    // Speech body
    const body = document.createElement('div');
    body.className = 'dlg-body';
    card.appendChild(body);

    // Skip hint
    const skipHint = document.createElement('div');
    skipHint.className = 'dlg-skip-hint';
    skipHint.textContent = 'Toque para pular \u25B8';
    card.appendChild(skipHint);

    contentEl.appendChild(card);

    // Extract dialogue text (remove format_msg header)
    const dialogueText = extractDialogueText(screen.text || '');

    // Hide buttons initially
    if (buttonsEl) {
        buttonsEl.style.opacity = '0';
        buttonsEl.style.pointerEvents = 'none';
    }

    // Apply mood ambient gradient
    applyMoodAmbient(mood);

    // Start typewriter animation
    typewriterDialogue(body, dialogueText, function () {
        skipHint.style.display = 'none';
        revealChoices();
    });

    // Skip on tap
    card.addEventListener('click', function () {
        skipTypewriter();
        skipHint.style.display = 'none';
    }, { once: true });
}

// ── Typewriter ───────────────────────────────────────────────

function typewriterDialogue(el, text, onDone) {
    // Clear any previous typewriter
    if (_twInterval) {
        clearInterval(_twInterval);
        _twInterval = null;
    }

    _twElement = el;
    _twFullText = text;
    _twCallback = onDone;

    let i = 0;
    el.innerHTML = '';
    const span = document.createElement('span');
    el.appendChild(span);
    const cursor = document.createElement('span');
    cursor.className = 'dlg-cursor';
    el.appendChild(cursor);

    _twInterval = setInterval(function () {
        if (i >= text.length) {
            clearInterval(_twInterval);
            _twInterval = null;
            cursor.remove();
            if (_twCallback) {
                _twCallback();
                _twCallback = null;
            }
            return;
        }
        span.textContent += text[i];
        i++;
    }, 20); // 50 chars/sec
}

function skipTypewriter() {
    if (!_twInterval) return;
    clearInterval(_twInterval);
    _twInterval = null;
    if (_twElement && _twFullText) {
        // Preserve pre-line formatting
        _twElement.textContent = _twFullText;
    }
    if (_twCallback) {
        _twCallback();
        _twCallback = null;
    }
}

// ── Choice Reveal ────────────────────────────────────────────

function revealChoices() {
    const buttonsEl = document.getElementById('buttons');
    if (!buttonsEl) return;

    const rows = buttonsEl.querySelectorAll('.btn-row');
    rows.forEach(function (row, i) {
        row.style.opacity = '0';
        row.style.transform = 'translateY(6px)';
        row.style.transition = 'opacity 0.25s ease, transform 0.25s ease';

        setTimeout(function () {
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
        }, 80 + i * 80);
    });

    buttonsEl.style.opacity = '1';
    buttonsEl.style.pointerEvents = '';
}

// ── Text Extraction ──────────────────────────────────────────

/**
 * Extract dialogue text from format_msg output.
 * format_msg adds: header line (NPC NAME [rep]), divider (═══), then body.
 * We strip the header and dividers to get just the NPC speech.
 */
function extractDialogueText(rawText) {
    const lines = rawText.split('\n');
    let bodyStart = 0;

    // Skip header lines: all-caps, divider chars, or empty
    for (let i = 0; i < lines.length && i < 6; i++) {
        const t = lines[i].trim();
        if (!t || /^[═━⚜💎\u2550\u2501]+$/.test(t)) {
            bodyStart = i + 1;
            continue;
        }
        // All-caps header (NPC NAME)
        const stripped = t.replace(/[\[\]\(\)⭐✨💀⚔️🛡️\s]/g, '');
        if (stripped.length > 2 && stripped === stripped.toUpperCase() && !/[a-z]/.test(stripped)) {
            bodyStart = i + 1;
            continue;
        }
        break;
    }

    return lines.slice(bodyStart).join('\n').trim();
}

// ── Mood Ambient ─────────────────────────────────────────────

function applyMoodAmbient(mood) {
    const g = MOOD_GRADIENTS[mood] || MOOD_GRADIENTS.neutral;
    document.body.style.background = g;
    document.body.style.backgroundAttachment = 'fixed';
}

function clearMoodAmbient() {
    document.body.style.background = '';
    document.body.style.backgroundAttachment = '';
}
