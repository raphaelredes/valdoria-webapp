/* ═══════════════════════════════════════════════════════════════
   GAME HUB — Universal Screen Renderer
   Converts server JSON screen data into DOM elements.
   Supports text (HTML), buttons (2-per-row grid), images,
   footer navigation, and transition detection.
   ═══════════════════════════════════════════════════════════════ */

const LONG_BTN_THRESHOLD = 24; // chars — buttons longer get full width
const HERO_KEYWORDS = ['PARTIR', 'JOGAR', 'AVENTURA', 'CONFIRMAR', 'INICIAR'];

/**
 * Render a screen JSON object from the server.
 * @param {Object} screen - {text, buttons, footer, image_url, timer, transition,
 *                           toast, alert, waiting_for_text, text_placeholder}
 */
function renderScreen(screen) {
    if (!screen) return;

    S.currentScreen = screen;
    if (typeof cacheScreen === 'function') cacheScreen(screen);

    const screenEl = document.getElementById('screen');
    const loadingEl = document.getElementById('loading');
    const footerEl = document.getElementById('footer');

    // Hide loading, show screen
    loadingEl.style.display = 'none';
    screenEl.style.display = '';

    // Banner image
    const bannerEl = document.getElementById('banner');
    const bannerImg = document.getElementById('banner-img');
    if (screen.image_url) {
        const imgUrl = screen.image_url.startsWith('/') ? S.apiBase + screen.image_url : screen.image_url;
        bannerImg.src = imgUrl;
        bannerImg.onerror = () => { bannerEl.style.display = 'none'; };
        bannerEl.style.display = '';
    } else {
        bannerEl.style.display = 'none';
    }

    // Text content (server sends trusted HTML)
    const contentEl = document.getElementById('content');
    contentEl.innerHTML = screen.text || '';

    // Buttons
    const buttonsEl = document.getElementById('buttons');
    buttonsEl.innerHTML = '';
    renderButtons(buttonsEl, screen.buttons || []);

    // Text input field (bank amounts, NPC AI chat, tickets)
    renderTextInput(screen);

    // Footer
    if (screen.footer && (screen.footer.quick || screen.footer.nav)) {
        footerEl.style.display = '';
        renderFooter(screen.footer);
        // Show Telegram back button when there's navigation
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.BackButton.show();
        }
    } else {
        footerEl.style.display = 'none';
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.BackButton.hide();
        }
    }

    // Hide error overlay if visible
    hideError();
}

/**
 * Render content buttons into a container.
 * Arranges in 2-per-row grid, with long buttons getting full width.
 */
function renderButtons(container, rows) {
    for (const row of rows) {
        if (!row || !row.length) continue;

        const rowEl = document.createElement('div');
        rowEl.className = 'btn-row';

        // Determine columns
        const hasLong = row.some(b => (b.text || '').length > LONG_BTN_THRESHOLD);
        const isHeroRow = row.length === 1 && HERO_KEYWORDS.some(k => (row[0].text || '').toUpperCase().includes(k));

        if (row.length === 1 || hasLong) {
            rowEl.classList.add('cols-1');
        } else if (row.length === 2) {
            rowEl.classList.add('cols-2');
        } else {
            rowEl.classList.add('cols-3');
        }

        for (const btn of row) {
            const el = createButton(btn, isHeroRow);
            rowEl.appendChild(el);
        }

        container.appendChild(rowEl);
    }
}

/**
 * Create a single button element.
 */
function createButton(btn, forceHero = false) {
    // Transition button (opens another WebApp via transition API)
    if (btn.transition) {
        const el = document.createElement('button');
        el.className = 'btn-hero';
        el.textContent = btn.text || '';
        const target = typeof btn.transition === 'string' ? btn.transition : btn.transition.to;
        if (target) {
            el.onclick = () => requestTransition(target);
        } else {
            // Legacy fallback: screen-level transition
            el.onclick = () => {
                const screen = S.currentScreen;
                if (screen && screen.transition) handleTransition(screen.transition);
            };
        }
        return el;
    }

    // URL button (external link)
    if (btn.url) {
        const el = document.createElement('button');
        el.className = 'btn-action btn-link';
        el.textContent = btn.text || '';
        el.onclick = () => {
            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.openLink(btn.url);
            } else {
                window.open(btn.url, '_blank');
            }
        };
        return el;
    }

    // Main menu button — close WebApp and return to Telegram
    if (btn.cb === 'main_menu') {
        const el = document.createElement('button');
        el.className = 'btn-action';
        el.textContent = btn.text || '';
        el.onclick = () => {
            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.close();
            }
        };
        return el;
    }

    // Regular callback button
    const el = document.createElement('button');
    const isHero = forceHero || HERO_KEYWORDS.some(k => (btn.text || '').toUpperCase().includes(k));
    el.className = isHero ? 'btn-hero' : 'btn-action';
    el.textContent = btn.text || '';
    if (btn.cb) {
        el.onclick = () => doAction(btn.cb);
    }
    return el;
}

/**
 * Show or hide the text input field based on server signal.
 */
function renderTextInput(screen) {
    const wrap = document.getElementById('text-input-wrap');
    const inputEl = document.getElementById('text-input');
    const sendBtn = document.getElementById('text-send');
    if (!wrap) return;

    if (!screen.waiting_for_text) {
        wrap.style.display = 'none';
        return;
    }

    wrap.style.display = '';
    inputEl.placeholder = screen.text_placeholder || 'Digite aqui...';
    inputEl.value = '';

    const submitText = () => {
        const val = inputEl.value.trim();
        if (!val) return;
        wrap.style.display = 'none';
        doText(val);
    };

    sendBtn.onclick = submitText;
    inputEl.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitText();
        }
    };

    // Focus after a short delay (mobile keyboard)
    setTimeout(() => inputEl.focus(), 150);
}

/**
 * Render the fixed footer (nav row + quick access row).
 */
function renderFooter(footer) {
    const quickEl = document.getElementById('footer-quick');
    const navEl = document.getElementById('footer-nav');

    quickEl.innerHTML = '';
    navEl.innerHTML = '';

    if (footer.quick && footer.quick.length) {
        quickEl.style.display = '';
        for (const btn of footer.quick) {
            const el = document.createElement('button');
            el.className = 'btn-footer';
            el.textContent = btn.text || '';
            if (btn.cb) {
                el.onclick = () => doAction(btn.cb);
            } else if (btn.url) {
                el.onclick = () => {
                    if (window.Telegram && Telegram.WebApp) Telegram.WebApp.openLink(btn.url);
                    else window.open(btn.url, '_blank');
                };
            }
            quickEl.appendChild(el);
        }
    } else {
        quickEl.style.display = 'none';
    }

    if (footer.nav && footer.nav.length) {
        navEl.style.display = '';
        for (const btn of footer.nav) {
            const el = document.createElement('button');
            el.className = 'btn-footer';
            el.textContent = btn.text || '';
            if (btn.cb) {
                el.onclick = () => doAction(btn.cb);
            }
            navEl.appendChild(el);
        }
    } else {
        navEl.style.display = 'none';
    }
}
