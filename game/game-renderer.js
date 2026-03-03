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
 * @param {Object} screen - {text, buttons, footer, image_url, timer, transition, toast, alert}
 */
function renderScreen(screen) {
    if (!screen) return;

    S.currentScreen = screen;

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
        bannerImg.src = screen.image_url.startsWith('/') ? S.apiBase + screen.image_url : screen.image_url;
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

    // Footer
    if (screen.footer) {
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
        const isHero = row.length === 1 && HERO_KEYWORDS.some(k => (b => (b.text || '').toUpperCase().includes(k))(row[0]));

        if (row.length === 1 || hasLong) {
            rowEl.classList.add('cols-1');
        } else if (row.length === 2) {
            rowEl.classList.add('cols-2');
        } else {
            rowEl.classList.add('cols-3');
        }

        for (const btn of row) {
            const el = createButton(btn, isHero && row.length === 1);
            rowEl.appendChild(el);
        }

        container.appendChild(rowEl);
    }
}

/**
 * Create a single button element.
 */
function createButton(btn, forceHero = false) {
    // Transition button (opens another WebApp)
    if (btn.transition) {
        const el = document.createElement('button');
        el.className = 'btn-hero';
        el.textContent = btn.text || '';
        el.onclick = () => {
            const screen = S.currentScreen;
            if (screen && screen.transition) {
                handleTransition(screen.transition);
            }
        };
        return el;
    }

    // URL button (external link)
    if (btn.url) {
        const el = document.createElement('a');
        el.className = 'btn-link';
        el.textContent = btn.text || '';
        el.href = '#';
        el.onclick = (e) => {
            e.preventDefault();
            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.openLink(btn.url);
            } else {
                window.open(btn.url, '_blank');
            }
        };
        return el;
    }

    // Regular callback button
    const el = document.createElement('button');
    const isHero = forceHero || HERO_KEYWORDS.some(k => (btn.text || '').toUpperCase().includes(k));
    el.className = isHero ? 'btn-hero' : 'btn-action';
    el.textContent = btn.text || '';
    el.onclick = () => doAction(btn.cb);
    return el;
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
            el.className = 'btn-action';
            el.textContent = btn.text || '';
            if (btn.cb) el.onclick = () => doAction(btn.cb);
            if (btn.url) el.onclick = () => {
                if (window.Telegram && Telegram.WebApp) Telegram.WebApp.openLink(btn.url);
                else window.open(btn.url, '_blank');
            };
            quickEl.appendChild(el);
        }
    } else {
        quickEl.style.display = 'none';
    }

    if (footer.nav && footer.nav.length) {
        navEl.style.display = '';
        for (const btn of footer.nav) {
            const el = document.createElement('button');
            el.className = 'btn-action';
            el.textContent = btn.text || '';
            if (btn.cb) el.onclick = () => doAction(btn.cb);
            navEl.appendChild(el);
        }
    } else {
        navEl.style.display = 'none';
    }
}
