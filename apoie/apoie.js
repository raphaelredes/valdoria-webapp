/* apoie.js — sessao #23 v9 (2026-05-22): redesign AAA pedido pelo user.
 * Mantém player musica existente, melhora donation com slider + input direto,
 * delega Telegram OAuth pra tg-oauth-custom.js (substitui widget bugado).
 */
'use strict';

const WORKER_URL = '';  // same-origin (apoie.lendasdevaldoria.com.br)
const BOT_USERNAME = 'LendasDeValdoriaBOT';

// UI feedback durations (per CLAUDE.md Human Reading Time)
const COPY_FEEDBACK_MS = 2000;  // duracao do toast "Copiado!" — confirmacao visual

let selectedAmount = 0;
let telegramUser = null;

// Tiers (canonical em contribution_data.py)
const TIERS = [
    {id:'supporter',name:'Apoiador',icon:'',color:'#9c8d6a',min:100,max:499,gold:50,items:['1× Poção de Cura'],exclusive:null,exclusiveImg:null,title:null},
    {id:'copper',name:'Patrono de Cobre',icon:'',color:'#b87333',min:500,max:1499,gold:200,items:['2× Poção de Cura'],exclusive:null,exclusiveImg:null,title:'Patrono de Cobre'},
    {id:'silver',name:'Patrono de Prata',icon:'',color:'#c0c0c0',min:1500,max:2999,gold:750,items:['3× Poção de Cura'],exclusive:'Anel do Patrono',exclusiveImg:'img/items/anel_patrono.webp',title:'Patrono de Prata'},
    {id:'gold',name:'Patrono de Ouro',icon:'',color:'#c4953a',min:3000,max:4999,gold:2000,items:['5× Poção de Cura'],exclusive:'Manto do Benfeitor',exclusiveImg:'img/items/manto_benfeitor.webp',title:'Patrono de Ouro'},
    {id:'platinum',name:'Patrono de Platina',icon:'',color:'#7dd3fc',min:5000,max:999999,gold:5000,items:['5× Poção de Cura Superior'],exclusive:'Lâmina da Generosidade',exclusiveImg:'img/items/lamina_generosidade.webp',title:'Patrono de Platina'},
];

function getTier(centavos) {
    return TIERS.find(t => centavos >= t.min && centavos <= t.max) || null;
}

function formatBrl(centavos) {
    var reais = centavos / 100;
    var s = reais.toFixed(2);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return 'R$ ' + parts.join(',');
}

// === Donation amount (slider + input syncados) ===
function setAmount(centavos) {
    centavos = Math.max(0, Math.floor(centavos));
    if (centavos > 100000) centavos = 100000;  // cap R$ 1000
    selectedAmount = centavos;

    var slider = document.getElementById('amount-slider');
    var input = document.getElementById('custom-amount');
    var display = document.getElementById('slider-display');

    if (slider && parseInt(slider.value, 10) !== centavos) {
        slider.value = String(Math.min(centavos, parseInt(slider.max, 10)));
    }
    if (input && document.activeElement !== input) {
        input.value = (centavos / 100).toFixed(2);
    }
    if (display) display.textContent = formatBrl(centavos);

    document.querySelectorAll('.ap-amount-btn').forEach(function(btn) {
        var v = parseInt(btn.dataset.amount, 10);
        btn.classList.toggle('active', v === centavos);
    });

    updatePreview();
    updateSliderOrbPosition();

    var btn = document.getElementById('btn-generate');
    if (btn) btn.disabled = centavos < 100;
}

// Sessao #24 v16: posiciona o orb realistic v5 que e o thumb do slider.
// Slider thumb nativo e transparent; orb DOM e o visual real.
function updateSliderOrbPosition() {
    var slider = document.getElementById('amount-slider');
    var orb = document.getElementById('amount-slider-thumb-orb');
    if (!slider || !orb) return;
    var min = parseFloat(slider.min) || 0;
    var max = parseFloat(slider.max) || 100;
    var val = parseFloat(slider.value) || 0;
    var pct = max > min ? (val - min) / (max - min) : 0;
    var trackWidth = slider.offsetWidth;
    if (!trackWidth) return;
    // Sessao #26 v4: thumb nativo + orb container = 40px (casados).
    // Centro do thumb fica em [20, trackWidth - 20].
    var thumbHalf = 20;
    var orbX = pct * (trackWidth - 2 * thumbHalf) + thumbHalf;
    orb.style.left = orbX + 'px';
}

function selectAmount(centavos) { setAmount(centavos); }

function onSliderInput(slider) {
    setAmount(parseInt(slider.value, 10));
}

function onCustomAmount(input) {
    var raw = (input.value || '').replace(',', '.').trim();
    var reais = parseFloat(raw);
    if (isNaN(reais) || reais < 0) reais = 0;
    setAmount(Math.round(reais * 100));
}

function updatePreview() {
    var preview = document.getElementById('tier-preview');
    var btn = document.getElementById('btn-generate');
    if (!preview) return;

    if (selectedAmount < 100) {
        preview.innerHTML = '<div class="ap-tier-preview-empty">' +
            '<span class="ap-tier-preview-icon">✦</span>' +
            'Selecione um valor (mínimo R$ 1,00) para ver as recompensas' +
            '</div>';
        if (btn) btn.disabled = true;
        return;
    }

    var tier = getTier(selectedAmount);
    if (!tier) {
        preview.innerHTML = '<div class="ap-tier-preview-empty">Valor fora do range.</div>';
        if (btn) btn.disabled = true;
        return;
    }

    var html = '<div class="ap-tier-preview-card" style="--tier-color:' + tier.color + '">' +
        '<div class="ap-tier-preview-header">' +
            '<span class="ap-tier-preview-tier-icon" style="color:' + tier.color + '">' + tier.icon + '</span>' +
            '<div class="ap-tier-preview-info">' +
                '<div class="ap-tier-preview-label">Você se tornará</div>' +
                '<div class="ap-tier-preview-name">' + tier.name + '</div>' +
            '</div>' +
            '<div class="ap-tier-preview-amount">' + formatBrl(selectedAmount) + '</div>' +
        '</div>' +
        '<div class="ap-tier-preview-divider"></div>' +
        '<div class="ap-tier-preview-rewards">' +
            '<div class="ap-tier-preview-reward"><b>+' + tier.gold.toLocaleString('pt-BR') + '</b> Valdoritas</div>' +
            tier.items.map(function(it) { return '<div class="ap-tier-preview-reward">' + it + '</div>'; }).join('');

    if (tier.exclusive) {
        html += '<div class="ap-tier-preview-reward ap-tier-preview-exclusive">' +
            (tier.exclusiveImg ? '<img src="' + tier.exclusiveImg + '" alt="" class="ap-tier-preview-itemimg" onerror="this.style.display=\'none\'">' : '') +
            '<span><b>' + tier.exclusive + '</b> <em>(item exclusivo)</em></span>' +
            '</div>';
    }
    if (tier.title) {
        html += '<div class="ap-tier-preview-reward">Título: <b>' + tier.title + '</b></div>';
    }
    html += '</div>' +
        '<div class="ap-tier-preview-footer">✦ Recompensas entregues a TODOS personagens do seu Telegram</div>' +
        '</div>';

    preview.innerHTML = html;
    if (btn) btn.disabled = false;
}

// === Donor Identification (via tg-oauth-custom.js / ApAuth) ===
// O modulo ApAuth gerencia tres provedores: telegram (deep-link), google (Identity Services),
// email (modal fallback). Callback recebe um objeto compativel com o legado onTelegramAuth.
// O proprio modulo ja renderiza o badge "Conectado como X" — nao precisamos duplicar aqui.
window.onTelegramAuth = function(user) {
    telegramUser = user || null;
    // ApAuth gerencia o badge sozinho; nao tocamos no DOM aqui.
};

// === Generate PIX ===
async function generatePix() {
    if (selectedAmount < 100) return;
    var btn = document.getElementById('btn-generate');
    var resultDiv = document.getElementById('qr-result');
    btn.disabled = true;
    btn.innerHTML = '<span class="ap-spinner"></span>Gerando QR Code…';

    try {
        var body = { amount_brl: selectedAmount };
        // Identification — multi-provider via ApAuth
        var identity = (window.ApAuth && typeof window.ApAuth.getIdentity === 'function')
            ? window.ApAuth.getIdentity()
            : null;
        if (identity) {
            if (identity.provider === 'telegram') {
                // Backward compat: send telegram_user object com id REAL quando verificado
                body.telegram_user = {
                    id: identity.telegram_user_id || undefined,
                    first_name: identity.telegram_first_name
                        || ((identity.name || '').split(' ')[0] || identity.name),
                    last_name: identity.telegram_last_name
                        || ((identity.name || '').split(' ').slice(1).join(' ')),
                    username: identity.telegram_username
                        ? identity.telegram_username.replace(/^@/, '')
                        : '',
                };
            }
            body.donor_identity = {
                provider: identity.provider,
                name: identity.name,
                email: identity.email || '',
                telegram_user_id: identity.telegram_user_id || null,
                telegram_username: identity.telegram_username || '',
                verified: !!identity.verified,
            };
        } else if (telegramUser) {
            body.telegram_user = telegramUser;
        }

        var resp = await fetchT(WORKER_URL + '/api/donate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!resp.ok) {
            var err = await resp.json().catch(function() { return {}; });
            throw new Error(err.error || 'Erro ao gerar PIX');
        }
        var data = await resp.json();
        showQrResult(data);
    } catch (e) {
        console.error('[APOIE] Erro ao gerar PIX', e);
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div class="ap-qr-result" style="border-color:var(--v-danger,#e05555)">' +
            '<div style="color:#e05555;font-size:14px;margin-bottom:8px">' + vEsc(e.message) + '</div>' +
            '<div style="font-size:12px;color:var(--v-text-dim,#a09484)">Verifique sua conexão e tente novamente.</div>' +
            '</div>';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Gerar QR Code PIX';
    }
}

function showQrResult(data) {
    var resultDiv = document.getElementById('qr-result');
    resultDiv.style.display = 'block';

    var html = '<div class="ap-qr-result">' +
        '<div class="ap-qr-title">✦ QR Code PIX Gerado</div>' +
        '<div class="ap-qr-amount">' + vEsc(data.amount_display) + '</div>' +
        '<div class="ap-qr-wrapper"><div id="qr-container"></div></div>' +
        '<div style="font-size:12px;color:var(--v-text-dim,#a09484);margin:8px 0;text-align:center">' +
        'Aponte a câmera do app do banco para o QR acima' +
        '</div>';

    if (data.key_type && data.key_display) {
        html += '<div class="ap-qr-info">Chave PIX (' + vEsc(data.key_type) + '): <b>' + vEsc(data.key_display) + '</b></div>';
    }

    html += '<div class="ap-qr-info">Referência: <b>' + vEsc(data.txid) + '</b></div>' +
        '<div class="ap-code-box" id="brcode-text">' + vEsc(data.brcode) + '</div>' +
        '<button class="ap-btn-copy" onclick="copyBrcode()">Copiar Código PIX</button>';

    if (data.linked) {
        html += '<div class="ap-qr-note ap-qr-note-ok">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:6px"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>' +
            'Vinculado a sua conta. Recompensas serao entregues automaticamente apos verificacao.</div>';
    } else {
        // Anonima: oferecer vinculacao pos-PIX via deep-link com o TXID
        var tgLink = 'https://t.me/' + BOT_USERNAME + '?start=apoiar_' + encodeURIComponent(data.txid);
        html += '<div class="ap-qr-note ap-qr-note-link">' +
            '<div style="margin-bottom:8px"><b>Quer vincular esta doacao ao seu personagem?</b></div>' +
            '<div style="font-size:12px;color:var(--v-text-dim,#a09484);margin-bottom:10px">' +
            'Apos pagar o PIX, abra o bot e confirme — recompensas no jogo em ate 24h.' +
            '</div>' +
            '<a class="ap-btn-tg-link" href="' + tgLink + '" target="_blank" rel="noopener">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-3px;margin-right:6px"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>' +
            'Abrir bot e vincular agora' +
            '</a>' +
            '<div style="font-size:11px;color:var(--v-text-dim,#a09484);margin-top:8px">' +
            'Ou no bot, envie: <code>/apoiar ' + vEsc(data.txid) + '</code>' +
            '</div></div>';
    }

    html += '<button class="ap-qr-new-btn" onclick="resetDonation()">↺ Nova Doação</button>' +
        '</div>';

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
            '<div style="color:#e05555;font-size:12px;padding:20px">Erro ao gerar QR. Use o código abaixo.</div>';
    }

    window._currentBrcode = data.brcode;
}

function resetDonation() {
    var qr = document.getElementById('qr-result');
    if (qr) { qr.style.display = 'none'; qr.innerHTML = ''; }
    window.scrollTo({ top: document.getElementById('donate').offsetTop - 60, behavior: 'smooth' });
}

function copyBrcode() {
    if (!window._currentBrcode) return;
    var btn = document.querySelector('.ap-btn-copy');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window._currentBrcode)
            .then(function() { showCopied(btn); })
            .catch(function() { fallbackCopy(btn); });
    } else {
        fallbackCopy(btn);
    }
}

function fallbackCopy(btn) {
    var ta = document.createElement('textarea');
    ta.value = window._currentBrcode;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showCopied(btn); } catch { btn.textContent = 'Erro ao copiar'; }
    document.body.removeChild(ta);
}

function showCopied(btn) {
    if (!btn) return;
    btn.textContent = '✓ Copiado!';
    btn.classList.add('copied');
    setTimeout(function() { btn.textContent = 'Copiar Código PIX'; btn.classList.remove('copied'); }, COPY_FEEDBACK_MS);
}

// === Goals + Stats + Donors ===
async function loadGoals() {
    var container = document.getElementById('goals-list');
    if (!container) return;
    var goals;
    try {
        var resp = await fetchT(WORKER_URL + '/api/goals').catch(function() { return null; });
        if (resp && resp.ok) {
            goals = await resp.json();
        } else {
            var local = await fetchT('goals.json');
            if (!local.ok) throw new Error('HTTP ' + local.status);
            goals = await local.json();
        }
    } catch {
        var local2 = await fetchT('goals.json');
        goals = await local2.json();
    }

    container.innerHTML = goals.map(function(g) {
        var pct = g.target_brl > 0 ? Math.min(100, Math.round((g.current_brl / g.target_brl) * 100)) : 0;
        return '<div class="ap-goal-card' + (g.completed ? ' ap-completed' : '') + ' ap-reveal">' +
            '<div class="ap-goal-header">' +
                '<span class="ap-goal-icon">' + g.icon + '</span>' +
                '<span class="ap-goal-name">' + vEsc(g.name) + '</span>' +
                (g.completed ? '<span class="ap-goal-check">✓</span>' : '') +
            '</div>' +
            '<div class="ap-goal-desc">' + vEsc(g.desc) + '</div>' +
            '<div class="ap-progress-track"><div class="ap-progress-fill" data-pct="' + pct + '"></div></div>' +
            '<div class="ap-progress-info">' +
                '<span class="ap-progress-pct">' + pct + '%</span>' +
                '<span class="ap-progress-amounts">' + formatBrl(g.current_brl) + ' / ' + formatBrl(g.target_brl) + '</span>' +
            '</div></div>';
    }).join('');
    observeReveals();
}

async function loadStats() {
    try {
        var resp = await fetchT(WORKER_URL + '/api/stats').catch(function() { return null; });
        if (!resp || !resp.ok) return;
        var data = await resp.json();
        var supEl = document.getElementById('stat-supporters');
        var raisedEl = document.getElementById('stat-raised');
        if (supEl && data.total_supporters != null) {
            supEl.dataset.count = data.total_supporters;
            if (data.total_supporters > 0) animateCounter(supEl, data.total_supporters);
        }
        if (raisedEl && data.total_raised_brl != null) {
            raisedEl.dataset.count = data.total_raised_brl;
            raisedEl.dataset.prefix = 'R$ ';
            raisedEl.dataset.divide = '100';
            if (data.total_raised_brl > 0) animateCounter(raisedEl, data.total_raised_brl);
        }
        // Global progress bar (header)
        var progressFill = document.getElementById('global-progress-fill');
        var progressLabel = document.getElementById('global-progress-label');
        var target = 200000;  // R$ 2000 default
        if (progressFill && data.total_raised_brl != null) {
            var pct = Math.min(100, Math.round((data.total_raised_brl / target) * 100));
            progressFill.style.width = pct + '%';
        }
        if (progressLabel && data.total_raised_brl != null) {
            progressLabel.textContent = formatBrl(data.total_raised_brl) + ' / ' + formatBrl(target);
        }
    } catch (e) {
        console.warn('[APOIE] Stats load failed', e);
    }
}

async function loadRecentDonors() {
    var container = document.getElementById('donors-list');
    if (!container) return;
    try {
        var resp = await fetchT(WORKER_URL + '/api/recent').catch(function() { return null; });
        if (!resp || !resp.ok) {
            container.innerHTML = '<div class="ap-donors-empty">Carregando...</div>';
            return;
        }
        var donors = await resp.json();
        if (!donors || !donors.length) {
            container.innerHTML = '<div class="ap-donors-empty">' +
                '<span class="ap-donors-empty-icon">✦</span>' +
                'Seja o primeiro aventureiro a apoiar Valdoria!<br>' +
                '<small>Sua contribuição abre o caminho para muitas outras.</small>' +
                '</div>';
            return;
        }
        var tierIcon = {supporter:'',copper:'',silver:'',gold:'',platinum:''};
        var tierColor = {supporter:'#9c8d6a',copper:'#b87333',silver:'#c0c0c0',gold:'#c4953a',platinum:'#7dd3fc'};
        container.innerHTML = donors.map(function(d, i) {
            var tier = d.tier || 'supporter';
            return '<div class="ap-donor-card ap-reveal" data-tier="' + tier + '" style="animation-delay:' + (i * 0.05) + 's">' +
                '<div class="ap-donor-initial" style="color:' + (tierColor[tier] || '#c4953a') + '">' + vEsc(d.initial || '?') + '</div>' +
                '<div class="ap-donor-info">' +
                    '<div class="ap-donor-tier" style="color:' + (tierColor[tier] || '#c4953a') + '">' +
                        (d.tier_icon || tierIcon[tier] || '✦') + ' ' + vEsc(d.tier_name || 'Apoiador') +
                    '</div>' +
                    '<div class="ap-donor-amount">' + vEsc(d.amount_display || '—') + '</div>' +
                '</div></div>';
        }).join('');
    } catch (e) {
        console.warn('[APOIE] Recent donors load failed', e);
        container.innerHTML = '<div class="ap-donors-empty">Erro ao carregar.</div>';
    }
}

function animateCounter(el, target, duration) {
    duration = duration || 1500;
    var prefix = el.dataset.prefix || '';
    var divide = parseFloat(el.dataset.divide) || 1;
    var start = performance.now();
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function tick(now) {
        var elapsed = now - start;
        var progress = Math.min(elapsed / duration, 1);
        var value = Math.round(easeOutCubic(progress) * target);
        var display = divide > 1
            ? formatBrl(value)
            : value.toLocaleString('pt-BR');
        el.textContent = divide > 1 ? display : (prefix + display);
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// === Reveal on scroll ===
var _revealObserver = null;
function observeReveals() {
    if (!_revealObserver) {
        _revealObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('ap-visible');
                    var fill = entry.target.querySelector('.ap-progress-fill');
                    if (fill) fill.style.width = fill.dataset.pct + '%';
                    var impBar = entry.target.querySelector('.ap-impact-bar');
                    if (impBar) {
                        impBar.style.setProperty('--bar-width', impBar.dataset.pct + '%');
                        impBar.classList.add('ap-bar-animated');
                    }
                    var counter = entry.target.querySelector('[data-count]');
                    if (counter) {
                        var target = parseInt(counter.dataset.count, 10);
                        if (target > 0) animateCounter(counter, target);
                    }
                    _revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
    }
    document.querySelectorAll('.ap-reveal:not(.ap-visible)').forEach(function(el) {
        _revealObserver.observe(el);
    });
}

// === Nav scroll + back-to-top ===
function setupNavbar() {
    var nav = document.getElementById('ap-nav');
    var backTop = document.getElementById('back-top');
    var scrollHint = document.getElementById('scroll-hint');
    if (!nav) return;
    var ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(function() {
                var y = window.scrollY;
                nav.classList.toggle('ap-nav-scrolled', y > 60);
                if (backTop) {
                    // Sessao #24 v14: botao topo aparece apenas PERTO DO FIM da pagina.
                    // Threshold: ultimos 800px (suficiente p/ ver botoes/forms relevantes)
                    // OU se rolou >80% (caso pagina seja curta).
                    var docH = Math.max(
                        document.documentElement.scrollHeight,
                        document.body.scrollHeight
                    );
                    var winH = window.innerHeight;
                    var scrolled = y + winH;
                    var nearEnd = (docH - scrolled) <= 800;
                    var pastEighty = (scrolled / docH) >= 0.80;
                    backTop.classList.toggle('visible', nearEnd || pastEighty);
                }
                if (scrollHint) scrollHint.style.opacity = Math.max(0, 1 - y / 300);
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    var sections = ['cenario-section', 'story', 'how', 'tiers', 'goals', 'donate'];
    var links = document.querySelectorAll('.ap-nav-link');
    var sectionObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                var id = entry.target.id;
                links.forEach(function(link) {
                    var href = link.getAttribute('href');
                    link.classList.toggle('active', href === '#' + id);
                });
            }
        });
    }, { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' });
    sections.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) sectionObserver.observe(el);
    });
}

// === MUSIC PLAYER (mantido do existente) ===
const _AP_AUDIO_BASE = 'https://jogo.lendasdevaldoria.com.br/shared/audio/';
const _AP_TRACKS = {
    'Tema da Cidade': ['city_day.mp3', 'city_day_2.mp3', 'city_day_3.mp3', 'city_day_4.mp3'],
    'Tema da Taverna': ['tavern_ambient.mp3', 'tavern_ambient_2.mp3', 'tavern_ambient_3.mp3'],
    'Floresta': ['forest_explore.mp3', 'forest_explore_2.mp3', 'forest_explore_3.mp3'],
    'Estradas': ['mountain_wind.mp3', 'mountain_wind_2.mp3'],
    'Deserto': ['desert_wind.mp3', 'desert_wind_2.mp3'],
    'Pântano': ['swamp_mist.mp3', 'swamp_mist_2.mp3'],
    'Masmorra': ['dungeon_dark.mp3', 'dungeon_dark_2.mp3'],
    'Combate': ['combat_tense.mp3', 'combat_tense_2.mp3'],
    'Prólogo': ['prologue_theme.mp3'],
};
const _apAllTracks = [];
for (const [name, files] of Object.entries(_AP_TRACKS)) {
    for (const f of files) _apAllTracks.push({ name: name, file: f });
}

let _apAudio = null;
let _apPlaying = false;
let _apLastFile = '';
let _apRafId = null;
let _apTrackHistory = [];
let _apHistoryIdx = -1;
let _apCurrentTrack = null;

function _apPickRandom() {
    var pick;
    do { pick = _apAllTracks[Math.floor(Math.random() * _apAllTracks.length)]; }
    while (pick.file === _apLastFile && _apAllTracks.length > 1);
    _apLastFile = pick.file;
    return pick;
}

function togglePlayer() {
    if (_apPlaying && _apAudio) {
        _apAudio.pause();
        _apPlaying = false;
        _apUpdateUI();
        return;
    }
    if (_apAudio && _apAudio.paused && _apAudio.src && _apAudio.currentTime > 0) {
        _apAudio.play().catch(function() {});
        _apPlaying = true;
        _apUpdateUI();
        _apAnimateBar();
        return;
    }
    _apPlayRandom();
}

function _apPlayRandom() {
    var track = _apPickRandom();
    _apTrackHistory = [track];
    _apHistoryIdx = 0;
    _apPlayTrack(track);
}

function _apPlayTrack(track) {
    _apDestroyAudio();
    _apCurrentTrack = track;
    _apLastFile = track.file;
    var audio = new Audio(_AP_AUDIO_BASE + track.file);
    audio.volume = 0.25;
    _apAudio = audio;
    audio.onended = function() { if (audio === _apAudio) _apNextTrack(); };
    audio.onerror = function() {
        if (audio === _apAudio) setTimeout(function() { if (audio === _apAudio) _apNextTrack(); }, 1000);
    };
    audio.play().then(function() {
        if (audio !== _apAudio) return;
        _apPlaying = true;
        _apSetTrackName(track.name);
        _apUpdateUI();
        _apAnimateBar();
    }).catch(function() {});
}

function _apNextTrack() {
    if (!_apPlaying && !_apAudio) return;
    if (_apHistoryIdx < _apTrackHistory.length - 1) {
        _apHistoryIdx++;
        _apPlayTrack(_apTrackHistory[_apHistoryIdx]);
    } else {
        var track = _apPickRandom();
        _apTrackHistory.push(track);
        _apHistoryIdx = _apTrackHistory.length - 1;
        _apPlayTrack(track);
    }
}

function _apPrevTrack() {
    if (_apAudio && _apAudio.currentTime > 3) { _apAudio.currentTime = 0; return; }
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
        try { _apAudio.src = ''; _apAudio.load(); } catch {}
        _apAudio = null;
    }
}

function _apUpdateUI() {
    var iconPlay = document.getElementById('ap-icon-play');
    var iconPause = document.getElementById('ap-icon-pause');
    if (iconPlay) iconPlay.style.display = _apPlaying ? 'none' : 'block';
    if (iconPause) iconPause.style.display = _apPlaying ? 'block' : 'none';
    var btn = document.getElementById('ap-play-btn');
    if (btn) btn.classList.toggle('playing', _apPlaying);
    var wave = document.getElementById('ap-wave');
    if (wave) wave.classList.toggle('active', _apPlaying);
    if (!_apPlaying) _apSetTrackName('');
}

function _apSetTrackName(name) {
    var el = document.getElementById('ap-track-name');
    if (el) el.textContent = name || '';
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

// === Cookie consent ===
function checkCookieConsent() {
    var consent = null;
    try { consent = localStorage.getItem('valdoria_cookies'); } catch {}
    if (!consent) {
        var banner = document.getElementById('cookie-banner');
        if (banner) banner.style.display = 'block';
    }
}

function acceptCookies() {
    try { localStorage.setItem('valdoria_cookies', 'accepted'); } catch {}
    var banner = document.getElementById('cookie-banner');
    if (banner) banner.style.display = 'none';
    // Auth buttons ja foram renderizados no bootstrap — nao precisamos re-init.
}

function rejectCookies() {
    try { localStorage.setItem('valdoria_cookies', 'rejected'); } catch {}
    var banner = document.getElementById('cookie-banner');
    if (banner) banner.style.display = 'none';
}

// === Bootstrap ===
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

function _bootstrap() {
    window.scrollTo(0, 0);

    // Cookies first
    checkCookieConsent();

    // Donor identification — sempre disponivel (botoes nao carregam tracking
    // ate o usuario clicar; Google SDK so dispara cookie apos prompt()).
    // O dialogo de cookies continua independente, mas nao bloqueia a UI.
    if (window.ApTgOAuth && typeof window.ApTgOAuth.init === 'function') {
        window.ApTgOAuth.init(BOT_USERNAME, function(user) { telegramUser = user; });
    }

    loadGoals();
    loadStats();
    loadRecentDonors();
    setupNavbar();
    observeReveals();
    updatePreview();

    // Slider/input listeners
    var slider = document.getElementById('amount-slider');
    if (slider) slider.addEventListener('input', function() { onSliderInput(slider); });
    var input = document.getElementById('custom-amount');
    if (input) input.addEventListener('input', function() { onCustomAmount(input); });

    // Orb thumb: reposicionar no resize + apos layout estavel
    window.addEventListener('resize', updateSliderOrbPosition);
    setTimeout(updateSliderOrbPosition, 100);
    setTimeout(updateSliderOrbPosition, 500);

    // Reveal animations + scene-ready
    // Sessao #23 v9.1: setTimeout direto (rAF nao firava em alguns contextos).
    var cenarioEl = document.querySelector('.ap-cinematic');
    if (cenarioEl) {
        // Add immediately so transitions can run
        setTimeout(function() {
            cenarioEl.classList.add('ap-scene-ready');
        }, 50);
    }
}

// Sessao #23 v9 fix: bootstrap roda imediato se DOM ja carregado
// (script inlined no worker carrega APOS DOMContentLoaded — listener nunca fira).
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bootstrap);
} else {
    setTimeout(_bootstrap, 10);
}

// Export to window for HTML onclick handlers
window.selectAmount = selectAmount;
window.onSliderInput = onSliderInput;
window.onCustomAmount = onCustomAmount;
window.generatePix = generatePix;
window.copyBrcode = copyBrcode;
window.resetDonation = resetDonation;
window.acceptCookies = acceptCookies;
window.rejectCookies = rejectCookies;
window.togglePlayer = togglePlayer;
window._apNextTrack = _apNextTrack;
window._apPrevTrack = _apPrevTrack;
