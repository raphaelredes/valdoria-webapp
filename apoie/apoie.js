'use strict';

// ── Config ──
const WORKER_URL = 'https://valdoria-apoie.lendas-de-valdoria.workers.dev';
const BOT_USERNAME = 'LendasDeValdoriaBOT';

// ── State ──
let selectedAmount = 0; // em centavos
let telegramUser = null;

// ── Tier Data (espelho de contribution_data.py) ──
const TIERS = [
    { id: 'supporter', name: 'Apoiador', icon: '\u{1F91D}', min: 100, max: 499, gold: 50, items: ['1x Poção de Cura'], exclusive: null, exclusiveImg: null, title: null },
    { id: 'copper', name: 'Patrono de Cobre', icon: '\u{1F7E4}', min: 500, max: 1499, gold: 200, items: ['2x Poção de Cura'], exclusive: null, exclusiveImg: null, title: '\u{1F7E4} Patrono de Cobre' },
    { id: 'silver', name: 'Patrono de Prata', icon: '\u26AA', min: 1500, max: 2999, gold: 750, items: ['3x Poção de Cura'], exclusive: '\u{1F48D} Anel do Patrono', exclusiveImg: 'img/items/anel_patrono.webp', title: '\u26AA Patrono de Prata' },
    { id: 'gold', name: 'Patrono de Ouro', icon: '\u{1F7E1}', min: 3000, max: 4999, gold: 2000, items: ['5x Poção de Cura'], exclusive: '\u{1F458} Manto do Benfeitor', exclusiveImg: 'img/items/manto_benfeitor.webp', title: '\u{1F7E1} Patrono de Ouro' },
    { id: 'platinum', name: 'Patrono de Platina', icon: '\u{1F48E}', min: 5000, max: 999999, gold: 5000, items: ['5x Poção de Cura Superior'], exclusive: '\u{1F5E1}\uFE0F Lâmina da Generosidade', exclusiveImg: 'img/items/lamina_generosidade.webp', title: '\u{1F48E} Patrono de Platina' },
];

function getTier(centavos) {
    return TIERS.find(t => centavos >= t.min && centavos <= t.max) || null;
}

function formatBrl(centavos) {
    return 'R$ ' + (centavos / 100).toFixed(2).replace('.', ',');
}

// ── Amount Selection ──
function selectAmount(centavos) {
    selectedAmount = centavos;
    document.querySelectorAll('.ap-amount-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.amount) === centavos);
    });
    document.getElementById('custom-amount').value = '';
    updatePreview();
}

function onCustomAmount(input) {
    const val = parseFloat(input.value);
    if (val && val >= 1) {
        selectedAmount = Math.round(val * 100);
    } else {
        selectedAmount = 0;
    }
    document.querySelectorAll('.ap-amount-btn').forEach(btn => btn.classList.remove('active'));
    updatePreview();
}

function updatePreview() {
    const preview = document.getElementById('tier-preview');
    const btn = document.getElementById('btn-generate');

    if (selectedAmount < 100) {
        preview.innerHTML = '<div style="font-size:13px;color:var(--v-text-dim)">Selecione um valor para ver as recompensas</div>';
        btn.disabled = true;
        return;
    }

    const tier = getTier(selectedAmount);
    if (!tier) {
        preview.innerHTML = '<div style="font-size:13px;color:var(--v-text-dim)">Valor abaixo do mínimo (R$ 1,00)</div>';
        btn.disabled = true;
        return;
    }

    let html = '<div class="ap-tier-preview-title">' + tier.icon + ' ' + tier.name + ' \u2014 ' + formatBrl(selectedAmount) + '</div>';
    html += '<div class="ap-tier-preview-list">';
    html += '\u{1F4B0} +' + tier.gold.toLocaleString() + ' GP<br>';
    tier.items.forEach(item => { html += '\u{1F392} ' + item + '<br>'; });
    if (tier.exclusive) {
        html += '<strong>' + tier.exclusive + '</strong> (exclusivo)<br>';
        if (tier.exclusiveImg) html += '<img class="ap-item-thumb" src="' + tier.exclusiveImg + '" alt="' + tier.exclusive.replace(/<[^>]*>/g, '') + '" style="margin:6px auto;display:block">';
    }
    if (tier.title) html += '\u{1F3C5} Título: ' + tier.title;
    html += '</div>';

    preview.innerHTML = html;
    btn.disabled = false;
}

// ── Telegram Login ──
window.onTelegramAuth = function (user) {
    telegramUser = user;
    const status = document.getElementById('tg-status');
    const name = user.first_name + (user.last_name ? ' ' + user.last_name : '');
    status.innerHTML = '<div class="ap-tg-badge">\u2705 Conectado como ' + escapeHtml(name) + '</div>';
    const widget = document.getElementById('tg-widget');
    if (widget) widget.style.display = 'none';
};

function loadTelegramWidget() {
    const container = document.getElementById('tg-widget');
    if (!container) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?23';
    script.setAttribute('data-telegram-login', BOT_USERNAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-userpic', 'true');
    container.appendChild(script);

    const status = document.getElementById('tg-status');
    status.innerHTML = '<div class="ap-tg-badge ap-tg-badge-anon" style="margin-top:12px">' +
        '\u{1F464} Sem login = doação anônima. Para recompensas no jogo, entre com Telegram.</div>';
}

// ── PIX Generation ──
async function generatePix() {
    if (selectedAmount < 100) return;

    const btn = document.getElementById('btn-generate');
    const resultDiv = document.getElementById('qr-result');
    btn.disabled = true;
    btn.innerHTML = '<span class="ap-spinner"></span>Gerando...';

    try {
        const body = { amount_brl: selectedAmount };
        if (telegramUser) {
            body.telegram_user = telegramUser;
        }

        const resp = await fetch(WORKER_URL + '/api/donate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || 'Erro ao gerar PIX');
        }

        const data = await resp.json();
        showQrResult(data);
    } catch (e) {
        console.error('[APOIE] Erro ao gerar PIX', e);
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div class="ap-qr-result" style="border-color:var(--v-danger)">' +
            '<div style="color:var(--v-danger);font-size:14px;margin-bottom:8px">\u274C ' + escapeHtml(e.message) + '</div>' +
            '<div style="font-size:12px;color:var(--v-text-dim)">Verifique sua conexão e tente novamente.</div></div>';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Gerar QR Code PIX';
    }
}

function showQrResult(data) {
    const resultDiv = document.getElementById('qr-result');
    resultDiv.style.display = 'block';

    let html = '<div class="ap-qr-result">';
    html += '<div class="ap-qr-wrapper"><div id="qr-container"></div></div>';
    html += '<div style="font-size:12px;color:var(--v-text-dim);margin:8px 0">Aponte a câmera do app do banco para o QR acima</div>';
    html += '<div class="ap-qr-amount">' + escapeHtml(data.amount_display) + '</div>';
    html += '<div class="ap-qr-info">';
    if (data.key_type && data.key_display) {
        html += 'Chave PIX (' + escapeHtml(data.key_type) + '): ' + escapeHtml(data.key_display) + '<br>';
    }
    html += 'Referencia: <strong>' + escapeHtml(data.txid) + '</strong>';
    if (!data.linked) {
        html += '<br><em>Guarde este código para vincular ao bot</em>';
    }
    html += '</div>';
    html += '<div class="ap-code-box" id="brcode-text">' + escapeHtml(data.brcode) + '</div>';
    html += '<button class="ap-btn-copy" onclick="copyBrcode()">Copiar Código PIX</button>';
    if (data.linked) {
        html += '<div class="ap-qr-note">\u2705 Vinculado a sua conta Telegram. Recompensas serao entregues automaticamente após verificação.</div>';
    } else {
        html += '<div class="ap-qr-note">\u{1F464} Doacao anonima. Para receber recompensas no jogo, use o comando <strong>/apoiar ' + escapeHtml(data.txid) + '</strong> no bot do Telegram.</div>';
    }
    html += '</div>';

    resultDiv.innerHTML = html;
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

    try {
        new QRCode(document.getElementById('qr-container'), {
            text: data.brcode,
            width: 200,
            height: 200,
            colorDark: '#2a2420',
            colorLight: '#f5f0e0',
            correctLevel: QRCode.CorrectLevel.M,
        });
    } catch (e) {
        console.error('[APOIE] Erro QR', e);
        document.getElementById('qr-container').innerHTML =
            '<div style="color:var(--v-danger);font-size:12px;padding:20px">Erro ao gerar QR. Use o código abaixo.</div>';
    }

    window._currentBrcode = data.brcode;
}

function copyBrcode() {
    if (!window._currentBrcode) return;
    const btn = document.querySelector('.ap-btn-copy');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window._currentBrcode).then(() => showCopied(btn)).catch(() => fallbackCopy(btn));
    } else {
        fallbackCopy(btn);
    }
}

function fallbackCopy(btn) {
    const ta = document.createElement('textarea');
    ta.value = window._currentBrcode;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showCopied(btn); } catch { btn.textContent = 'Erro ao copiar'; }
    document.body.removeChild(ta);
}

function showCopied(btn) {
    btn.textContent = 'Copiado!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copiar Código PIX'; btn.classList.remove('copied'); }, 2000);
}

// ── Goals ──
async function loadGoals() {
    const container = document.getElementById('goals-list');
    let goals;
    try {
        const resp = await fetch(WORKER_URL + '/api/goals').catch(() => null);
        if (resp && resp.ok) {
            goals = await resp.json();
        } else {
            const local = await fetch('goals.json');
            goals = await local.json();
        }
    } catch {
        const local = await fetch('goals.json');
        goals = await local.json();
    }

    container.innerHTML = goals.map(g => {
        const pct = g.target_brl > 0 ? Math.min(100, Math.round((g.current_brl / g.target_brl) * 100)) : 0;
        const current = formatBrl(g.current_brl);
        const target = formatBrl(g.target_brl);
        return '<div class="ap-goal-card' + (g.completed ? ' ap-completed' : '') + ' ap-reveal">' +
            '<div class="ap-goal-header">' +
            '<span class="ap-goal-icon">' + g.icon + '</span>' +
            '<span class="ap-goal-name">' + escapeHtml(g.name) + '</span>' +
            '</div>' +
            '<div class="ap-goal-desc">' + escapeHtml(g.desc) + '</div>' +
            '<div class="ap-progress-track">' +
            '<div class="ap-progress-fill" data-pct="' + pct + '"></div>' +
            '</div>' +
            '<div class="ap-progress-info">' +
            '<span class="ap-progress-pct">' + pct + '%</span>' +
            '<span class="ap-progress-amounts">' + current + ' / ' + target + '</span>' +
            '</div></div>';
    }).join('');

    // Re-observe newly created elements
    observeReveals();
}

// ── Live Stats ──
async function loadStats() {
    try {
        const resp = await fetch(WORKER_URL + '/api/stats').catch(() => null);
        if (!resp || !resp.ok) return;
        const data = await resp.json();
        const supEl = document.getElementById('stat-supporters');
        const raisedEl = document.getElementById('stat-raised');
        if (supEl && data.total_supporters != null) {
            supEl.dataset.count = data.total_supporters;
        }
        if (raisedEl && data.total_raised_brl != null) {
            raisedEl.dataset.count = data.total_raised_brl;
            raisedEl.dataset.prefix = 'R$ ';
            raisedEl.dataset.divide = '100';
        }
    } catch (e) {
        console.warn('[APOIE] Stats load failed', e);
    }
}

// ── Counter Animation ──
function animateCounter(el, target, duration) {
    duration = duration || 2000;
    const prefix = el.dataset.prefix || '';
    const divide = parseFloat(el.dataset.divide) || 1;
    const start = performance.now();

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.round(easeOutCubic(progress) * target);
        const display = divide > 1 ? (value / divide).toFixed(2).replace('.', ',') : value.toLocaleString('pt-BR');
        el.textContent = prefix + display;
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ── Scroll Reveal System (IntersectionObserver) ──
let _revealObserver = null;

function observeReveals() {
    if (!_revealObserver) {
        _revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('ap-visible');

                    // Animate progress bars
                    const fill = entry.target.querySelector('.ap-progress-fill');
                    if (fill) {
                        fill.style.width = fill.dataset.pct + '%';
                    }

                    // Animate impact bars
                    const impBar = entry.target.querySelector('.ap-impact-bar');
                    if (impBar) {
                        impBar.style.setProperty('--bar-width', impBar.dataset.pct + '%');
                        impBar.classList.add('ap-bar-animated');
                    }

                    // Animate impact percentage counters
                    const impPct = entry.target.querySelector('.ap-impact-pct');
                    if (impPct) {
                        const text = impPct.textContent.trim();
                        const match = text.match(/(\d+)/);
                        if (match) {
                            const target = parseInt(match[1]);
                            const prefix = text.startsWith('~') ? '~' : '';
                            const suffix = '%';
                            animateCounter(impPct, target, 1500);
                            impPct.dataset.count = target;
                            impPct.dataset.prefix = prefix;
                            impPct.textContent = prefix + '0' + suffix;
                        }
                    }

                    // Animate counters
                    const counter = entry.target.querySelector('[data-count]');
                    if (counter) {
                        const target = parseInt(counter.dataset.count);
                        if (target > 0) animateCounter(counter, target);
                    }

                    _revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
    }

    // Stagger delays for sibling reveals
    document.querySelectorAll('.ap-story-grid, .ap-impact-grid, .ap-tiers-grid, .ap-goals-list, .ap-timeline').forEach(container => {
        const children = container.querySelectorAll('.ap-reveal:not(.ap-visible)');
        children.forEach((child, i) => {
            child.style.setProperty('--ap-delay', (i * 0.12) + 's');
        });
    });

    document.querySelectorAll('.ap-reveal:not(.ap-visible)').forEach(el => {
        _revealObserver.observe(el);
    });
}

// ── Navbar Scroll Effect ──
function setupNavbar() {
    const nav = document.getElementById('ap-nav');
    const backTop = document.getElementById('back-top');
    const scrollHint = document.getElementById('scroll-hint');
    if (!nav) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const y = window.scrollY;
                nav.classList.toggle('ap-nav-scrolled', y > 60);
                if (backTop) backTop.classList.toggle('visible', y > 400);
                if (scrollHint) scrollHint.style.opacity = Math.max(0, 1 - y / 300);
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    // Active link tracking
    const sections = ['hero', 'story', 'tiers', 'goals', 'donate'];
    const links = document.querySelectorAll('.ap-nav-link');

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                links.forEach(link => {
                    const href = link.getAttribute('href');
                    link.classList.toggle('active', href === '#' + id);
                });
            }
        });
    }, { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' });

    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) sectionObserver.observe(el);
    });
}

// ── Parallax Scroll ──
function setupParallax() {
    const layers = document.querySelectorAll('.ap-parallax-layer');
    if (!layers.length) return;

    // Skip parallax on reduced motion or mobile (performance)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(max-width: 600px)').matches) return;

    const speeds = [0.1, 0.3, 0.5, 0.65]; // sky, castle, forest, mist
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const y = window.scrollY;
                layers.forEach((layer, i) => {
                    const speed = speeds[i] || 0.3;
                    layer.style.transform = 'translateY(' + (y * speed) + 'px)';
                });
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

// ── Soundtrack Player ──
const _AP_AUDIO_BASE = 'https://raphaelredes.github.io/valdoria-webapp/shared/audio/';
const _AP_TRACKS = {
    'Taverna':   ['tavern_ambient.mp3','tavern_ambient_2.mp3','tavern_ambient_3.mp3','tavern_ambient_4.mp3','tavern_ambient_5.mp3','tavern_ambient_6.mp3','tavern_ambient_7.mp3','tavern_ambient_8.mp3'],
    'Cidade':    ['city_day.mp3','city_day_2.mp3','city_day_3.mp3','city_day_4.mp3','city_day_5.mp3','city_day_6.mp3','city_day_7.mp3','city_day_8.mp3'],
    'Floresta':  ['forest_explore.mp3','forest_explore_2.mp3','forest_explore_3.mp3','forest_explore_4.mp3','forest_explore_5.mp3','forest_explore_6.mp3','forest_explore_7.mp3','forest_explore_8.mp3'],
    'Combate':   ['combat_tense.mp3','combat_tense_2.mp3','combat_tense_3.mp3','combat_tense_4.mp3','combat_tense_5.mp3','combat_tense_6.mp3','combat_tense_7.mp3','combat_tense_8.mp3'],
    'Deserto':   ['desert_wind.mp3','desert_wind_2.mp3','desert_wind_3.mp3','desert_wind_4.mp3','desert_wind_5.mp3','desert_wind_6.mp3','desert_wind_7.mp3','desert_wind_8.mp3'],
    'Masmorra':  ['dungeon_dark.mp3','dungeon_dark_2.mp3','dungeon_dark_3.mp3','dungeon_dark_4.mp3','dungeon_dark_5.mp3','dungeon_dark_6.mp3','dungeon_dark_7.mp3','dungeon_dark_8.mp3'],
    'Pantano':   ['swamp_mist.mp3','swamp_mist_2.mp3','swamp_mist_3.mp3','swamp_mist_4.mp3','swamp_mist_5.mp3','swamp_mist_6.mp3','swamp_mist_7.mp3','swamp_mist_8.mp3'],
    'Montanha':  ['mountain_wind.mp3','mountain_wind_2.mp3','mountain_wind_3.mp3','mountain_wind_4.mp3','mountain_wind_5.mp3','mountain_wind_6.mp3','mountain_wind_7.mp3','mountain_wind_8.mp3'],
    'Neve':      ['snow_silence.mp3','snow_silence_2.mp3','snow_silence_3.mp3','snow_silence_4.mp3','snow_silence_5.mp3','snow_silence_6.mp3','snow_silence_7.mp3','snow_silence_8.mp3'],
    'Prologo':   ['prologue_theme.mp3','prologue_theme_2.mp3','prologue_theme_3.mp3','prologue_theme_4.mp3','prologue_theme_5.mp3','prologue_theme_6.mp3','prologue_theme_7.mp3','prologue_theme_8.mp3'],
    'Boss':      ['boss_battle.mp3','boss_battle_2.mp3','boss_battle_3.mp3','boss_battle_4.mp3','boss_battle_5.mp3','boss_battle_6.mp3','boss_battle_7.mp3','boss_battle_8.mp3'],
};


const _apAllTracks = [];
for (const [name, files] of Object.entries(_AP_TRACKS)) {
    for (const f of files) _apAllTracks.push({ name: name, file: f });
}

let _apAudio = null;
let _apPlaying = false;
let _apLastFile = '';
let _apRafId = null;
let _apPreloadedTrack = null;
let _apPreloadedAudio = null;

function _apPickRandom() {
    let pool = _apAllTracks;
    let pick;
    do { pick = pool[Math.floor(Math.random() * pool.length)]; }
    while (pick.file === _apLastFile && pool.length > 1);
    _apLastFile = pick.file;
    return pick;
}

function _apPreloadOne() {
    if (_apPreloadedAudio) return;
    var track = _apPickRandom();
    _apPreloadedTrack = track;
    var audio = new Audio(_AP_AUDIO_BASE + track.file);
    audio.preload = 'auto';
    audio.volume = 0.25;
    _apPreloadedAudio = audio;
    audio.addEventListener('error', function() {
        _apPreloadedAudio = null;
        _apPreloadedTrack = null;
    });
}

function togglePlayer() {
    if (_apPlaying && _apAudio) {
        _apAudio.pause();
        _apPlaying = false;
        _apUpdateUI();
        return;
    }
    if (_apAudio && _apAudio.paused && _apAudio.src && _apAudio.currentTime > 0) {
        _apAudio.play().catch(function(){});
        _apPlaying = true;
        _apUpdateUI();
        _apAnimateBar();
        return;
    }
    if (_apPreloadedAudio && _apPreloadedTrack) {
        _apUsePreloaded();
    } else {
        _apPlayRandom();
    }
}

function _apPlayRandom() {
    var track = _apPickRandom();
    _apTrackHistory = [track];
    _apHistoryIdx = 0;
    _apPlayTrack(track);
}

function _apUsePreloaded() {
    var track = _apPreloadedTrack;
    var audio = _apPreloadedAudio;
    _apPreloadedTrack = null;
    _apPreloadedAudio = null;
    _apDestroyAudio();
    _apCurrentTrack = track;
    _apLastFile = track.file;
    _apAudio = audio;
    _apTrackHistory = [track];
    _apHistoryIdx = 0;
    var _errorCount = 0;
    audio.onended = function() {
        if (audio !== _apAudio) return;
        _apNextTrack();
    };
    audio.onerror = function() {
        if (audio !== _apAudio) return;
        _errorCount++;
        console.warn('[APOIE] Audio error:', track.file, '(attempt ' + _errorCount + ')');
        if (_errorCount < 3) {
            setTimeout(function() {
                if (audio === _apAudio) _apNextTrack();
            }, 1000);
        } else {
            console.error('[APOIE] Too many audio errors, stopping player');
            _apPlaying = false;
            _apUpdateUI();
        }
    };
    audio.play().then(function() {
        if (audio !== _apAudio) return;
        _apPlaying = true;
        document.getElementById('ap-track-name').textContent = '\u266B ' + track.name;
        _apUpdateUI();
        _apAnimateBar();
    }).catch(function(e) {
        console.warn('[APOIE] Preloaded play blocked, falling back:', e.message);
        _apPlayRandom();
    });
}

function _apUpdateUI() {
    document.getElementById('ap-icon-play').style.display = _apPlaying ? 'none' : 'block';
    document.getElementById('ap-icon-pause').style.display = _apPlaying ? 'block' : 'none';
    var btn = document.getElementById('ap-play-btn');
    if (btn) btn.classList.toggle('playing', _apPlaying);
    var wave = document.getElementById('ap-wave');
    if (wave) wave.classList.toggle('active', _apPlaying);
    if (!_apPlaying) {
        document.getElementById('ap-track-name').textContent = 'Toque para ouvir';
    }
}

function _apAnimateBar() {
    if (_apRafId) cancelAnimationFrame(_apRafId);
    function tick() {
        if (!_apAudio || !_apPlaying) { _apRafId = null; return; }
        var pct = _apAudio.duration ? (_apAudio.currentTime / _apAudio.duration * 100) : 0;
        var bar = document.getElementById('ap-progress-bar');
        if (bar) bar.style.width = pct + '%';
        _apRafId = requestAnimationFrame(tick);
    }
    _apRafId = requestAnimationFrame(tick);
}


// ── Track Navigation (Next/Previous) ──
let _apTrackHistory = [];
let _apHistoryIdx = -1;
let _apCurrentTrack = null;

function _apNextTrack() {
    if (!_apPlaying && !_apAudio) return;
    // If we have forward history, use it
    if (_apHistoryIdx < _apTrackHistory.length - 1) {
        _apHistoryIdx++;
        _apPlayTrack(_apTrackHistory[_apHistoryIdx]);
    } else {
        // Pick a new random track
        var track = _apPickRandom();
        _apTrackHistory.push(track);
        _apHistoryIdx = _apTrackHistory.length - 1;
        _apPlayTrack(track);
    }
}

function _apPrevTrack() {
    if (!_apPlaying && !_apAudio) return;
    // If less than 3s played, go to previous track
    if (_apAudio && _apAudio.currentTime > 3) {
        _apAudio.currentTime = 0;
        return;
    }
    if (_apHistoryIdx > 0) {
        _apHistoryIdx--;
        _apPlayTrack(_apTrackHistory[_apHistoryIdx]);
    } else if (_apAudio) {
        _apAudio.currentTime = 0;
    }
}

function _apDestroyAudio() {
    if (_apAudio) {
        _apAudio.onended = null;
        _apAudio.onerror = null;
        _apAudio.pause();
        try { _apAudio.src = ''; _apAudio.load(); } catch(e) {}
        _apAudio = null;
    }
    if (_apPreloadedAudio) {
        try { _apPreloadedAudio.src = ''; _apPreloadedAudio.load(); } catch(e) {}
        _apPreloadedAudio = null;
        _apPreloadedTrack = null;
    }
}

function _apPlayTrack(track) {
    _apDestroyAudio();
    _apCurrentTrack = track;
    _apLastFile = track.file;
    var audio = new Audio(_AP_AUDIO_BASE + track.file);
    audio.volume = 0.25;
    _apAudio = audio;
    var _errorCount = 0;
    audio.onended = function() {
        if (audio !== _apAudio) return;
        _apNextTrack();
    };
    audio.onerror = function() {
        if (audio !== _apAudio) return;
        _errorCount++;
        console.warn('[APOIE] Audio error:', track.file, '(attempt ' + _errorCount + ')');
        if (_errorCount < 3) {
            setTimeout(function() {
                if (audio === _apAudio) _apNextTrack();
            }, 1000);
        } else {
            console.error('[APOIE] Too many audio errors, stopping player');
            _apPlaying = false;
            _apUpdateUI();
        }
    };
    audio.play().then(function() {
        if (audio !== _apAudio) return;
        _apPlaying = true;
        document.getElementById('ap-track-name').textContent = '\u266B ' + track.name;
        _apUpdateUI();
        _apAnimateBar();
    }).catch(function(e) {
        console.warn('[APOIE] Play blocked:', e.message);
    });
}

// ── Utility ──
function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function showToast(msg, type, duration) {
    type = type || '';
    duration = duration || 3000;
    const container = document.getElementById('ap-toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'ap-toast' + (type ? ' ap-toast-' + type : '');
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('ap-toast-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}



// ── Timeline fill animation ──
function setupTimelineAnimation() {
    const timeline = document.querySelector('.ap-timeline');
    if (!timeline) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('ap-timeline-active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });
    observer.observe(timeline);
}
// ── Cookie Consent ──
function checkCookieConsent() {
    var consent = localStorage.getItem('valdoria_cookies');
    if (!consent) {
        var banner = document.getElementById('cookie-banner');
        if (banner) banner.style.display = 'block';
        return false;
    }
    return consent === 'accepted';
}

function acceptCookies() {
    localStorage.setItem('valdoria_cookies', 'accepted');
    var banner = document.getElementById('cookie-banner');
    if (banner) {
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(100%)';
        banner.style.transition = 'opacity 0.3s, transform 0.3s';
        setTimeout(function() { banner.style.display = 'none'; }, 300);
    }
    loadTelegramWidget();
}

function rejectCookies() {
    localStorage.setItem('valdoria_cookies', 'rejected');
    var banner = document.getElementById('cookie-banner');
    if (banner) {
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(100%)';
        banner.style.transition = 'opacity 0.3s, transform 0.3s';
        setTimeout(function() { banner.style.display = 'none'; }, 300);
    }
}

// ── Init ──
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
document.addEventListener('DOMContentLoaded', () => {
    window.scrollTo(0, 0);
    var cookiesOk = checkCookieConsent();
    if (cookiesOk) loadTelegramWidget();
    loadGoals();
    loadStats();
    setupNavbar();
    setupParallax();
    observeReveals();
    setupTimelineAnimation();

    // Preload first audio track after critical content
    setTimeout(_apPreloadOne, 3000);

    // Cinematic hero entrance
    requestAnimationFrame(() => {
        const hero = document.querySelector('.ap-cinematic');
        if (hero) {
            setTimeout(() => hero.classList.add('ap-scene-ready'), 100);
        }
    });
});
