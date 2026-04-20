/* Combat2 WebApp — frontend real.
 *
 * UI alinhada ao fluxo de combate WebApp (arena, iniciativa, popups).
 * Consome /api/combat2 do backend.
 * Backend retorna {state, events} — frontend anima events em sequencia
 * e sincroniza com state autoritativo ao final.
 *
 * Boot: carrega THREE -> dice-3d -> GET /api/combat2 -> render(state).
 */
(function () {
    'use strict';

    var BASE = 'https://jogo.lendasdevaldoria.com.br';
    var _qs = new URLSearchParams(location.search);
    var TOKEN = _qs.get('token') || '';
    var API_BASE = (_qs.get('api') || '').replace(/\/+$/, '');
    var ORIGIN_APP = (_qs.get('origin') || '').trim();
    if (!ORIGIN_APP && API_BASE) {
        ORIGIN_APP = 'game';
    }
    var USER_ID = parseInt(_qs.get('uid') || '0', 10);

    var currentState = null;

    /* ═════════════════════════════════════════════════════════════
     * PORT_LOG — rastreabilidade de features portadas do simulador
     * (simuladores/combate.html, fonte canônica) para o WebApp DEV.
     *
     * Regra IMMUTABLE (CLAUDE.md § Log [COMBAT2:PORT]): toda alteração
     * trazida do simulador DEVE adicionar entry aqui. Boot do WebApp
     * loga um [COMBAT2:PORT] summary rastreável pela aba Combate da GUI.
     * ═════════════════════════════════════════════════════════════ */
    var PORT_LOG = [
        /* Fase 2 (2026-04-18) — ícones heráldicos + markup V8 card. */
        { id: 'v8-heraldic-card',         phase: 'V1-Visual',    date: '2026-04-18', ref: 'combate.html:10019-10189', desc: 'Card V8 com SVG heraldic + c-name/c-portrait/c-class-tag' },
        { id: 'heraldic-icon-map',        phase: 'V1-Visual',    date: '2026-04-18', ref: 'combate.html:9862-9880',   desc: '_heraldicIconOf: resolve unit → ic-XXX' },
        { id: 'class-slug-map',           phase: 'V1-Visual',    date: '2026-04-18', ref: 'combate.html:9862-9880',   desc: '_heraldicClsSlugOf: resolve unit → cls-XXX' },
        /* Fase 3 (2026-04-18) — wiring heraldic em buildCell. */
        { id: 'buildcell-v8-wiring',      phase: 'V1-Visual',    date: '2026-04-18', ref: 'combate.html:10312-10320', desc: 'buildCell aplica v8-card + cls-slug automaticamente' },
        /* Fase 4 (2026-04-19) — summons invocações (spiritual_weapon, familiar, etc). */
        { id: 'summons-phb-icons',        phase: 'V1.6-PHB',     date: '2026-04-19', ref: 'combate.html:9882-9920',   desc: 'Invocações PHB-fiel: ic-spiritual-weapon, ic-familiar, ic-sprite' },
        { id: 'summons-caster-color',    phase: 'V1-Invocações', date: '2026-04-18', ref: 'combate.html:9900-9935',   desc: 'Summons herdam cor do caster (cls-clerigo, cls-mago)' },
        { id: 'summon-attached-chip',    phase: 'V1-Invocações', date: '2026-04-18', ref: 'combate.html:10152-10168', desc: 'Chip flutuante de Arma Espiritual sobre conjurador' },
        { id: 'summon-focus-marker',     phase: 'V1-Invocações', date: '2026-04-19', ref: 'combate.html:10139-10151', desc: 'Marcador 🎯 em inimigo focado por Familiar' },
        /* Fase 5 (2026-04-19) — HUD recursos D&D + action sheet. */
        { id: 'dnd-resources-bar',        phase: 'V1-HUD',       date: '2026-04-19', ref: 'combate.html:11200-11395', desc: 'Barra HUD pílulas reação/movimento/recursos' },
        { id: 'action-sheet-bottom',      phase: 'V1-HUD',       date: '2026-04-19', ref: 'combate.html:11400-11530', desc: 'Sheet inferior de ações (agir/reagir/mover)' },
        /* Fase 13 (polish) — popup condição .v8-cond-popup + chip clicável */
        { id: 'condition-chip-popup',     phase: 'V1-Polish',    date: '2026-04-19', ref: 'combate.html:1229+',       desc: 'Chip .c-cond-chip clicável abre popup detalhe' },
        /* 2026-04-20 — 4 correções de alinhamento simulador ↔ DEV. */
        { id: 'fix-attack-click-guard',   phase: 'V1-BugFix',    date: '2026-04-20', ref: 'combate.html:8367,11912',  desc: 'Click no card inimigo em modo selectingTarget: guard closest(button) refinado (só data-act bloqueia)' },
        { id: 'fix-turn-queue-heraldic',  phase: 'V1-BugFix',    date: '2026-04-20', ref: 'combate.html:9708-9745',   desc: 'buildTurnQueue usa SVG heraldic + cls-slug (era emoji genérico)' },
        { id: 'fix-ally-fallback-v8',     phase: 'V1-BugFix',    date: '2026-04-20', ref: 'combate.html:9862-9880',   desc: 'Ally NPC sem cls mapeada usa ic-inimigo + cls-aliado (verde-aço) em vez de cair no fallback legado' },
        { id: 'fix-music-sync-robust',    phase: 'V1-BugFix',    date: '2026-04-20', ref: 'audio-manager.js',        desc: 'syncCombat2Music com targetKey unificada; só re-dispara em mudança de track conceitual' }
    ];

    /* Loga PORT_LOG UMA vez no boot para rastreio pela GUI (filtro [COMBAT2:). */
    try {
        if (!window.__combat2PortLogged) {
            window.__combat2PortLogged = true;
            console.info('[COMBAT2:PORT] ' + PORT_LOG.length + ' features portadas do simulador combate.html');
            PORT_LOG.forEach(function (e) {
                console.info('[COMBAT2:PORT] ' + e.id + ' phase=' + e.phase + ' date=' + e.date + ' ref=' + e.ref + ' — ' + e.desc);
            });
        }
    } catch (e) { /* silencioso */ }

    var _selectingTarget = false;
    var _selectHealTarget = false;
    /** Folha inferior de acoes (paridade com simuladores/combate.html). */
    var _actionSheetOpen = false;
    var _pendingSkill = null;
    /** Indice em order[p_idx].skills ao usar habilidade de ataque/cura com alvo. */
    var _pendingSkillSlot = null;
    /** Ataque com arma: Ataque Poderoso (Guerreiro) na confirmacao. */
    var _pendingPowerAttack = false;
    /** Poção de cura: após escolher item na mochila, escolher alvo (slot no .bagIdx). */
    var _pendingHealItem = null;
    var _activeDiceClose = null;
    var _skipInit = false;
    /** Quando true, interrompe replays de eventos do lote atual e aplica state final + resumo. */
    var _skipReplayBatch = false;
    /** Estado ja e vitoria/derrota/fuga mas ainda ha eventos a animar — nao pintar a tela terminal ate o fim da fila. */
    var _suppressTerminalDuringReplay = false;
    /** Evita duplo disparo do fluxo pos-resumo do lote (Continuar / clique no overlay). */
    var _postBatchVfxRunning = false;
    var _leavingCombat = false;
    /** Ultima faixa BGM pedida (evita reiniciar combat em todo render). */
    var _combat2MusicKey = '';

    function tryValdoriaAudioInit() {
        try {
            if (typeof ValdoriaAudio !== 'undefined' && ValdoriaAudio.init) {
                ValdoriaAudio.init();
            }
        } catch (e) {}
    }

    function unlockCombat2OscFallback() {
        try {
            window._audioUnlocked = true;
        } catch (e) {}
    }

    function syncCombat2Music(s) {
        if (!s || typeof ValdoriaAudio === 'undefined' || !ValdoriaAudio.play) {
            return;
        }
        /* FIX (2026-04-20): sync robusto pra evitar cortes de musica em
           popups/overlays/animacoes dentro do combate. Estrategia:
           - Guard por _combat2MusicKey: so re-dispara ao mudar de track
           - NAO depende de _audio.paused (pode ser suspend temporario do
             WebView que o audio-manager auto-retoma via unlock events)
           - Detecta mudancas de fase real (intro → init → active → victory). */
        var ph = s.ph || '';
        var targetKey = null;
        if (ph === 'victory' || ph === 'defeat') {
            targetKey = ph;
        } else if (ph === 'fled') {
            /* Fled nao tem musica persistente, apenas SFX 1x. */
            if (_combat2MusicKey !== 'fled') {
                _combat2MusicKey = 'fled';
                try { ValdoriaAudio.playSFX('sfx_success'); } catch (eF) {}
            }
            return;
        } else if (ph === 'intro' || ph === 'init' || ph === 'init_done' || ph === 'active') {
            targetKey = 'combat';
        }
        if (!targetKey) return;
        /* Re-dispara APENAS se a track conceitual mudou (ex: combat → victory).
           Dentro da mesma track (ex: varios renders em fase 'active' todas
           em 'combat'), nao faz nada — audio-manager continua tocando. */
        if (_combat2MusicKey !== targetKey) {
            _combat2MusicKey = targetKey;
            try { ValdoriaAudio.play(targetKey); } catch (eP) {}
        }
    }

    /* ============================================================
     * Sair do combate: mesma rota que combat.js (transition -> URL)
     * ============================================================ */
    async function leaveCombatToOrigin() {
        if (_leavingCombat) return;
        _leavingCombat = true;
        try { if (window.vProcessing) vProcessing.show({ text: 'Carregando...' }); } catch (eVp) {}
        var tg = window.Telegram && window.Telegram.WebApp;
        var ph = (currentState && currentState.ph) || 'victory';
        var result = ph === 'defeat' ? 'defeat' : (ph === 'fled' ? 'fled' : 'victory');
        var origin = ORIGIN_APP || (API_BASE ? 'game' : '');
        if (!API_BASE || !TOKEN || !origin || USER_ID <= 0) {
            console.warn('[COMBAT2]', 'leaveCombat_missing_params', {
                hasApi: !!API_BASE,
                hasToken: !!TOKEN,
                origin: origin,
                uid: USER_ID
            });
            try { if (tg) tg.close(); } catch (e0) {}
            return;
        }
        var headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + TOKEN
        };
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
            headers['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData;
        }
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            headers['X-Idempotency-Key'] = window.crypto.randomUUID();
        }
        var url = API_BASE + '/api/webapp/transition';
        var body = JSON.stringify({
            from: 'combat',
            to: origin,
            user_id: USER_ID,
            payload: { result: result }
        });
        try {
            var resp = await fetch(url, { method: 'POST', headers: headers, body: body });
            var data = {};
            try { data = await resp.json(); } catch (eJson) {}
            if (data.url) {
                try {
                    if (data.toast) {
                        localStorage.setItem('valdoria_pending_toast', data.toast);
                    }
                } catch (eLs) {}
                window.__valdoria_transitioning = true;
                window.location.replace(data.url);
                return;
            }
            if (data.fallback === 'close') {
                window.__valdoria_transitioning = true;
                try { if (tg) tg.close(); } catch (e1) {}
                return;
            }
            console.error('[COMBAT2]', 'leaveCombat_unexpected', resp.status, data);
        } catch (eNet) {
            console.error('[COMBAT2]', 'leaveCombat_fetch', eNet);
        }
        window.__valdoria_transitioning = true;
        try { if (tg) tg.close(); } catch (e2) {}
    }

    /* ============================================================
     * API CLIENT
     * ============================================================ */
    async function apiCall(method, body) {
        var opts = {
            method: method,
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        };
        if (body) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        var url = API_BASE + '/api/combat2';
        var r;
        try {
            r = await fetch(url, opts);
        } catch (netErr) {
            console.error('[COMBAT2]', 'fetch_network', {
                method: method,
                apiHost: (function () {
                    try { return new URL(API_BASE || location.origin).host; } catch (e) { return ''; }
                })(),
                message: netErr && netErr.message
            }, netErr || '');
            throw netErr;
        }
        if (!r.ok) {
            var errDetail = '';
            var errObj = null;
            var rawText = '';
            try {
                rawText = await r.clone().text();
                errObj = JSON.parse(rawText);
                errDetail = (errObj.detail || errObj.error || errObj.hint || '').toString();
            } catch (parseEx) {
                errDetail = (rawText || r.statusText || '').slice(0, 200);
            }
            console.error('[COMBAT2]', 'api_http_error', {
                method: method,
                status: r.status,
                statusText: r.statusText,
                urlPath: '/api/combat2',
                apiBaseLen: (API_BASE || '').length,
                bodyError: errObj && errObj.error,
                bodyDetail: errObj && errObj.detail,
                bodyHint: errObj && errObj.hint
            });
            var human = 'HTTP ' + r.status;
            if (errDetail) human += ' — ' + errDetail;
            if (r.status === 503 && errObj && errObj.hint) human += ' (' + errObj.hint + ')';
            throw new Error(human);
        }
        return await r.json();
    }

    async function fetchState() { return apiCall('GET'); }
    async function dispatchAction(action) { return apiCall('POST', action); }

    /**
     * GET /api/combat2 — estado autoritativo apos falha de POST (ex.: reaction_resolve).
     * @param {string} logTag tag para console.error se sync falhar
     * @returns {Promise<boolean>}
     */
    async function resyncCombat2State(logTag) {
        try {
            var snap = await fetchState();
            if (snap && snap.state) {
                currentState = snap.state;
                render(currentState);
                return true;
            }
        } catch (eSync) {
            console.error('[COMBAT2]', logTag || 'resyncCombat2State', eSync || '');
        }
        return false;
    }

    /** Aviso raro (falha de reacao + sync); Telegram.showAlert se disponivel. */
    function c2NotifyReactionRecover(msg) {
        console.error('[COMBAT2]', 'reaction_recover', msg || '');
        try {
            var tg = window.Telegram && window.Telegram.WebApp;
            if (tg && typeof tg.showAlert === 'function') {
                tg.showAlert(msg);
            }
        } catch (eA) { /* noop */ }
    }

    /* ============================================================
     * HTML HELPERS
     * ============================================================ */
    function setHTML(node, html) {
        while (node.firstChild) node.removeChild(node.firstChild);
        var range = document.createRange();
        range.selectNodeContents(node);
        var frag = range.createContextualFragment(html);
        node.appendChild(frag);
    }

    function escHtml(str) {
        return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    /** Chaves de bioma vindas do servidor (inglês) → rótulo PT-BR na arena. */
    var C2_BIOME_PT = {
        plains: 'Planície',
        grassland: 'Planície',
        forest: 'Floresta',
        hill: 'Colinas',
        hills: 'Colinas',
        mountain: 'Montanha',
        mountains: 'Montanha',
        swamp: 'Pântano',
        desert: 'Deserto',
        arctic: 'Ártico',
        coast: 'Costa',
        underdark: 'Underdark',
        urban: 'Urbano',
        sea: 'Mar',
        jungle: 'Selva',
        tundra: 'Tundra',
        cave: 'Caverna',
        arena: 'Arena'
    };

    function formatCombat2Biome(b) {
        if (b == null || b === '') return 'Arena';
        var k = String(b).toLowerCase().trim();
        if (C2_BIOME_PT[k]) return C2_BIOME_PT[k];
        return String(b);
    }

    /** Mini-popup D&D 5e sobre o cartão de habilidades (paridade com simuladores/combate.html). */
    function openSkillHelpMini(cardEl, row) {
        if (!cardEl || !row || cardEl.querySelector('.lp-help-overlay')) return;
        var layer = document.createElement('div');
        layer.className = 'lp-help-overlay';
        var mini = document.createElement('div');
        mini.className = 'lp-help-card';
        var tag = document.createElement('div');
        tag.className = 'lp-help-tag';
        tag.textContent = 'Referência D&D 5e';
        var title = document.createElement('div');
        title.className = 'lp-help-title';
        title.textContent = row.n ? String(row.n) : 'Habilidade';
        var body = document.createElement('div');
        body.className = 'lp-help-body';
        var raw = row.helpDnd5e;
        if (!raw || !String(raw).trim()) {
            raw = row.desc
                ? 'Resumo: ' + row.desc + '\n\nConsulte o PHB/SRD 5.1 para a regra completa.'
                : 'Sem texto técnico extra; consulte o PHB/SRD 5.1.';
        }
        String(raw).split('\n').forEach(function (line) {
            if (!line.trim()) return;
            var pr = document.createElement('p');
            pr.className = 'lp-help-p';
            pr.textContent = line;
            body.appendChild(pr);
        });
        var foot = document.createElement('p');
        foot.className = 'lp-help-p lp-help-foot';
        foot.textContent =
            'O motor do jogo pode resumir efeitos de mesa (posição, concentração, reações, condições). Em dúvida, use o texto oficial do PHB/SRD.';
        body.appendChild(foot);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lp-help-btn';
        btn.textContent = 'Entendido';
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            layer.remove();
        });
        mini.appendChild(tag);
        mini.appendChild(title);
        mini.appendChild(body);
        mini.appendChild(btn);
        layer.appendChild(mini);
        layer.addEventListener('click', function (e) {
            if (e.target === layer) layer.remove();
        });
        mini.addEventListener('click', function (e) { e.stopPropagation(); });
        cardEl.appendChild(layer);
    }

    /**
     * Conteúdo informativo escaneável (rótulo + intro + linhas-chave + lista curta + nota).
     * Boas práticas: hierarquia clara, frases curtas, poucos pontos por tela (UX writing / modais).
     * spec: string | { kicker?, intro?, rows?: {l,v}[], bullets?, note? }
     */
    function c2AppendInfoStack(container, spec) {
        if (spec == null || spec === '') return;
        if (typeof spec === 'string') {
            var p0 = document.createElement('p');
            p0.className = 'c2-msg-lead';
            p0.textContent = spec;
            container.appendChild(p0);
            return;
        }
        if (typeof spec !== 'object' || Array.isArray(spec)) return;
        var wrap = document.createElement('div');
        wrap.className = 'c2-info-stack';
        if (spec.kicker) {
            var k0 = document.createElement('div');
            k0.className = 'c2-info-kicker';
            k0.textContent = spec.kicker;
            wrap.appendChild(k0);
        }
        if (spec.intro) {
            var intro0 = document.createElement('p');
            intro0.className = 'c2-info-intro';
            intro0.textContent = spec.intro;
            wrap.appendChild(intro0);
        }
        if (spec.rows && spec.rows.length) {
            var grid = document.createElement('div');
            grid.className = 'c2-info-rows';
            spec.rows.forEach(function (row) {
                if (!row) return;
                var r0 = document.createElement('div');
                r0.className = 'c2-info-kv';
                var l0 = document.createElement('span');
                l0.className = 'c2-info-kv-l';
                l0.textContent = row.l != null ? String(row.l) : '';
                var v0 = document.createElement('span');
                v0.className = 'c2-info-kv-v';
                v0.textContent = row.v != null ? String(row.v) : '';
                r0.appendChild(l0);
                r0.appendChild(v0);
                grid.appendChild(r0);
            });
            wrap.appendChild(grid);
        }
        if (spec.bullets && spec.bullets.length) {
            var ul0 = document.createElement('ul');
            ul0.className = 'c2-info-bullets';
            spec.bullets.forEach(function (b) {
                var li0 = document.createElement('li');
                li0.textContent = b;
                ul0.appendChild(li0);
            });
            wrap.appendChild(ul0);
        }
        if (spec.note) {
            var note0 = document.createElement('p');
            note0.className = 'c2-info-note';
            note0.textContent = spec.note;
            wrap.appendChild(note0);
        }
        container.appendChild(wrap);
    }

    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    /** Marcador de rodada no log (backend `combat2.py` — `::C2_ROUND::N`). */
    var C2_ROUND_RE = /^::C2_ROUND::(\d+)$/;

    /**
     * Agrupa linhas do log por rodada para exibição (telas finais, painel de log).
     * @param {string[]} logLines ordem cronológica
     * @param {{ reverseRounds?: boolean }} opts se true, rodadas mais recentes primeiro (painel)
     */
    function formatCombat2LogByRounds(logLines, opts) {
        opts = opts || {};
        var lines = logLines || [];
        var chunks = [];
        var curRn = null;
        var curBuf = [];
        function pushChunk(rn) {
            if (!curBuf.length && rn == null) return;
            chunks.push({ rn: rn, lines: curBuf.slice() });
            curBuf = [];
        }
        for (var i = 0; i < lines.length; i++) {
            var ln = lines[i];
            var m = typeof ln === 'string' ? ln.match(C2_ROUND_RE) : null;
            if (m) {
                pushChunk(curRn);
                curRn = m[1];
                continue;
            }
            curBuf.push(ln);
        }
        pushChunk(curRn);
        if (!chunks.length) {
            chunks.push({ rn: null, lines: lines.slice() });
        }
        if (opts.reverseRounds && chunks.length > 1) {
            chunks = chunks.slice().reverse();
        }
        var parts = [];
        chunks.forEach(function (ch) {
            var head = ch.rn != null ? ('Rodada ' + escHtml(String(ch.rn))) : 'Registro';
            parts.push('<div class="c2-log-round">');
            parts.push('<div class="c2-log-round-head">' + head + '</div>');
            parts.push('<div class="c2-log-round-body">');
            ch.lines.forEach(function (line) {
                parts.push('<div class="c2-log-line">' + escHtml(line) + '</div>');
            });
            parts.push('</div></div>');
        });
        return parts.join('');
    }


    /** Combate com 5+ participantes: oferece pular animações do lote de eventos (vários inimigos). */
    function shouldOfferBatchSkip() {
        return !!(currentState && currentState.order && currentState.order.length > 4 && currentState.ph === 'active');
    }

    /** Só inimigos/aliados — nunca o personagem do jogador (ev.aIdx === p_idx). */
    function isEventFromOtherCombatant(ev) {
        if (!currentState || !ev || currentState.p_idx == null) return false;
        var k = ev.kind;
        if (k === 'attack' || k === 'oa' || k === 'heal' || k === 'buff') {
            return ev.aIdx !== currentState.p_idx;
        }
        if (k === 'condition_save' || k === 'condition_expire') {
            return ev.tIdx != null && ev.tIdx !== currentState.p_idx;
        }
        if (k === 'sanctuary_save') {
            return ev.aIdx != null && ev.aIdx !== currentState.p_idx;
        }
        if (k === 'concentration_save' || k === 'concentration_lost') {
            return ev.tIdx != null && ev.tIdx !== currentState.p_idx;
        }
        return false;
    }

    /** Botão "pular" só em overlays de outros combatentes; glob = shouldOfferBatchSkip(). */
    function offerAnimSkipForEvent(ev, offerSkipGlob) {
        return !!offerSkipGlob && isEventFromOtherCombatant(ev);
    }

    function dmgTypeLabel(dt) {
        var m = {
            slashing: 'Cortante', piercing: 'Perfurante', bludgeoning: 'Concussão',
            fire: 'Fogo', cold: 'Frio', lightning: 'Relâmpago', necrotic: 'Necrótico',
            radiant: 'Radiante', poison: 'Veneno', acid: 'Ácido', psychic: 'Psíquico',
            thunder: 'Trovão', force: 'Força'
        };
        return m[dt] || dt || '';
    }

    function shouldFastForwardAttack(ev) {
        return !!_skipReplayBatch && isEventFromOtherCombatant(ev);
    }

    function syncHealOutcomeFromEvent(ev) {
        if (!currentState || !ev) return;
        var target = currentState.order[ev.tIdx];
        if (!target) return;
        var oldHp = target.hp;
        if (ev.newHp != null) {
            target.hp = ev.newHp;
            target.alive = target.hp > 0;
        }
        render(currentState);
        /* Refinamento Fase 13: FCT (+N HP verde) sobre alvo curado. */
        var healed = (ev.newHp != null) ? Math.max(0, ev.newHp - oldHp) : (ev.healGained | 0);
        if (healed > 0 && typeof _spawnFloatingDmgNumber === 'function') {
            var huid = ev.tIdx === currentState.p_idx ? 'player' : 'ally_' + ev.tIdx;
            _spawnFloatingDmgNumber(huid, healed, { heal: true });
        }
    }

    function syncAttackOutcomeFromEvent(ev) {
        if (!currentState || !ev) return;
        var target = currentState.order[ev.tIdx];
        if (!target) return;
        if (ev.hit && ev.newHp != null) {
            var oldHp = target.hp;
            target.hp = ev.newHp;
            target.alive = ev.newHp > 0;
            render(currentState);
            var uid = ev.tIdx === currentState.p_idx ? 'player' : 'enemy_' + ev.tIdx;
            arenaStrikeFromEvent(ev);
            /* Refinamento Fase 13: FCT (-N vermelho/dourado se crit) sobre alvo. */
            var dmgApplied = Math.max(0, oldHp - ev.newHp);
            if (dmgApplied > 0 && typeof _spawnFloatingDmgNumber === 'function') {
                _spawnFloatingDmgNumber(uid, dmgApplied, {
                    crit: !!ev.crit,
                    half: !!(ev.saveSuccess || ev.halfDmg || ev.rageResisted)
                });
            }
        } else {
            render(currentState);
            // PHB miss feedback: garante VFX no card mesmo com animações puladas.
            try {
                var missUid = ev.tIdx === currentState.p_idx ? 'player' : 'enemy_' + ev.tIdx;
                var missEl = document.querySelector('[data-unit-id="' + missUid + '"]');
                if (missEl) {
                    flashMissTargetCell(missEl);
                    ensureCombatVfxRuntime();
                    if (window._combatVfx) {
                        try { window._combatVfx.missFlash(missEl); } catch (eM) {}
                        var hasDodge = target.se && target.se.some(function (x) {
                            return x && (x.id === 'esquiva' || x.attackAdvantage);
                        });
                        if (hasDodge) {
                            try { window._combatVfx.dodgeEvade(missEl); } catch (eD) {}
                        }
                    }
                }
            } catch (eSyncMiss) { console.warn('[COMBAT2]', 'skip_miss_vfx_failed', eSyncMiss || ''); }
        }
    }

    /** Ícone do combatente na ordem (mesma grelha que «Ordem de iniciativa»). */
    function batchActorIco(state, aIdx) {
        if (!state || !state.order || aIdx == null) return '\u2694';
        var u = state.order[aIdx];
        return (u && u.ico) ? u.ico : '\u2694';
    }

    /**
     * Resumo do lote com animacoes puladas: mesmas colunas que ordem de iniciativa
     * (iop-pos · iop-ico · iop-name · iop-roll), uma linha por passo legivel.
     */
    function buildBatchSummaryHtml(events, state) {
        state = state || currentState;
        var parts = [
            '<header class="iop-head-batch" aria-labelledby="c2-batch-summary-title">',
            '<span class="iop-head-batch__orn" aria-hidden="true">\u2694</span>',
            '<div class="iop-head-batch__text">',
            '<h2 class="iop-head-batch__title" id="c2-batch-summary-title">',
            '<span class="iop-head-batch__line1">Ataque</span>',
            '<span class="iop-head-batch__line2">Anima\u00e7\u00f5es puladas</span>',
            '</h2>',
            '</div>',
            '</header>',
            '<div class="iop-head-batch__rule" role="presentation"></div>',
            '<div class="iop-list">'
        ];
        var rowNum = 0;
        function pushRow(ico, name, roll, longName) {
            rowNum++;
            var cls = 'iop-row' + (longName ? ' iop-row--long-name' : '');
            parts.push('<div class="' + cls + '"><span class="iop-pos">' + rowNum + '</span><span class="iop-ico">' + ico +
                '</span><span class="iop-name">' + escHtml(name) + '</span><span class="iop-roll">' + escHtml(roll) + '</span></div>');
        }
        var any = false;
        for (var i = 0; i < (events || []).length; i++) {
            var ev = events[i];
            if (!ev) continue;
            if (ev.kind === 'attack' || ev.kind === 'oa') {
                any = true;
                var oa = ev.kind === 'oa';
                var an = ev.actorName || '';
                var tn = ev.targetName || '';
                var lbl = (oa ? 'Oportunidade: ' : '') + an + ' \u2192 ' + tn;
                var icoA = batchActorIco(state, ev.aIdx);
                if (!ev.hit) {
                    var rollLn = (ev.d20 != null ? ev.d20 : '?') + '+' + (ev.atk != null ? ev.atk : '?') + '=' +
                        (ev.total != null ? ev.total : '?') + ' vs CA ' + (ev.ac != null ? ev.ac : '?');
                    pushRow(icoA, lbl, 'Sem acerto');
                    pushRow('\ud83c\udfb2', 'Teste vs CA', rollLn);
                } else {
                    var dmg = ev.dmgTotal != null ? ev.dmgTotal : '?';
                    var dr = ev.dmgRolls || [];
                    var die = ev.dmgDie != null ? ev.dmgDie : 8;
                    var sumD = dr.length ? dr.reduce(function (a, b) { return a + b; }, 0) : 0;
                    var dmgLine = dr.length ? (dr.length + 'd' + die + ': [' + dr.join(', ') + '] = ' + sumD) : ('Dano');
                    if (ev.dmgMod) dmgLine += ' +' + ev.dmgMod + ' mod';
                    if (ev.dmgSpecFlat) dmgLine += ' +' + ev.dmgSpecFlat + ' fixo';
                    var pillHit = ev.crit ? 'Cr\u00edtico' : 'Acerto';
                    if (ev.autoHit) {
                        pushRow(icoA, lbl, 'Acerto automático');
                        pushRow('\ud83c\udfb2', 'Magia (SRD)', 'Sem rolagem vs CA');
                    } else if (ev.saveDc != null) {
                        pushRow(icoA, lbl, ev.saveSuccess ? 'TR (metade)' : 'TR (total)');
                        pushRow('\ud83c\udfb2', 'Teste de resistência',
                            'd20=' + (ev.saveD20 != null ? ev.saveD20 : '?') + '+' + (ev.saveMod != null ? ev.saveMod : '?') +
                            '=' + (ev.saveTotal != null ? ev.saveTotal : '?') + ' vs CD ' + (ev.saveDc != null ? ev.saveDc : '?'));
                    } else {
                        pushRow(icoA, lbl, pillHit);
                        pushRow('\ud83c\udfb2', 'Teste vs CA', 'd20=' + (ev.d20 != null ? ev.d20 : '?') + '+' + (ev.atk != null ? ev.atk : '?') +
                            '=' + (ev.total != null ? ev.total : '?') + ' vs CA ' + (ev.ac != null ? ev.ac : '?'));
                    }
                    pushRow('\u2694', dmgLine, String(dmg) + ' PV', true);
                    if (ev.oldHp != null && ev.newHp != null) pushRow('\u2764', 'PV ' + tn, ev.oldHp + ' \u2192 ' + ev.newHp);
                }
            } else if (ev.kind === 'flee') {
                any = true;
                var fleeRoll = (ev.d20 != null ? 'd20=' + ev.d20 : '') + (ev.mod != null ? ' + ' + ev.mod : '') +
                    (ev.total != null ? ' = ' + ev.total : '') + ' vs CD ' + (ev.dc != null ? ev.dc : '');
                pushRow('\ud83c\udfc3', ev.success ? 'Fuga' : 'Falha na fuga', ev.success ? 'Passou' : 'N\u00e3o passou');
                pushRow('\ud83c\udfb2', 'Acrobacia (Des)', fleeRoll);
            } else if (ev.kind === 'round') {
                pushRow('\ud83d\udd04', 'Rodada', String(ev.rn != null ? ev.rn : ''));
            } else if (ev.kind === 'heal') {
                any = true;
                var hActor = batchActorIco(state, ev.aIdx);
                pushRow(hActor, (ev.actorName || '') + ' \u2192 ' + (ev.targetName || ''), '+' + (ev.healGained != null ? ev.healGained : '?') + ' PV');
                if (ev.oldHp != null && ev.newHp != null) pushRow('\u2764', 'PV ' + (ev.targetName || ''), ev.oldHp + ' \u2192 ' + ev.newHp);
            } else if (ev.kind === 'buff') {
                any = true;
                var turnsB = ev.turnsLeft != null ? (ev.turnsLeft + ' turno(s)') : 'ativo';
                pushRow('\u2728', ev.skillName || 'Buff', (ev.actorName || '') + ' \u00b7 ' + turnsB);
            } else if (ev.kind === 'resource') {
                any = true;
                pushRow('\u26a1', (ev.who || '') + ' \u00b7 ' + (ev.resName || 'recurso'),
                    String(ev.before != null ? ev.before : '?') + ' \u2192 ' + String(ev.after != null ? ev.after : '?'));
            } else if (ev.kind === 'reaction_prompt') {
                any = true;
                pushRow('\u2728', 'Reação (Escudo)', (ev.actorName || '') + ' \u2192 ' + (ev.targetName || ''));
            } else if (ev.kind === 'condition_save') {
                any = true;
                var ab2 = (ev.saveAbility || 'dex').toLowerCase();
                var abLab = ab2 === 'str' ? 'For' : ab2 === 'con' ? 'Con' : ab2 === 'int' ? 'Int' : ab2 === 'wis' ? 'Sab' : ab2 === 'cha' ? 'Car' : 'Des';
                var cRoll = 'TR ' + abLab + ' d20=' + (ev.saveD20 != null ? ev.saveD20 : '?') + '+' +
                    (ev.saveMod != null ? ev.saveMod : '?') + '=' + (ev.saveTotal != null ? ev.saveTotal : '?') +
                    ' vs CD ' + (ev.saveDc != null ? ev.saveDc : '?');
                pushRow('\ud83c\udfb2', (ev.targetName || '') + ' \u00b7 fim do turno', ev.saveSuccess ? 'Dissipa efeito' : 'Mantém efeito');
                pushRow('\u2694', ev.conditionName || 'Condição', cRoll);
            } else if (ev.kind === 'condition_expire') {
                any = true;
                pushRow('\u23f1', 'Duração', (ev.targetName || '') + ' \u00b7 ' + (ev.conditionName || ''));
            }
        }
        if (!any) {
            pushRow('\u2014', 'Nenhum ataque nesta a\u00e7\u00e3o', 'Estado apenas');
        }
        parts.push('</div>');
        return parts.join('');
    }

    function showBatchSummaryPopup(events) {
        if (!events || !events.length) return;
        var existing = document.getElementById('c2-batch-summary');
        if (existing) existing.remove();
        var ov = document.createElement('div');
        ov.id = 'c2-batch-summary';
        ov.className = 'iop-overlay iop-overlay--batch';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        ov.setAttribute('aria-labelledby', 'c2-batch-summary-title');
        var card = document.createElement('div');
        card.className = 'iop-card iop-card--batch-summary';
        setHTML(card, buildBatchSummaryHtml(events, currentState));
        var foot = document.createElement('div');
        foot.className = 'iop-start-wrap';
        foot.innerHTML = '<button type="button" class="epic-cta-btn" id="c2-batch-summary-ok"><span class="epic-cta-text">Continuar \u2192</span></button>';
        async function onDismiss() {
            if (_postBatchVfxRunning) return;
            _postBatchVfxRunning = true;
            try {
                if (ov.parentNode) ov.remove();
                await playPostBatchSummaryVfx(events);
            } catch (eV) {
                console.warn('[COMBAT2]', 'batch_summary_dismiss_vfx', eV || '');
            } finally {
                _postBatchVfxRunning = false;
            }
        }
        foot.querySelector('#c2-batch-summary-ok').addEventListener('click', function () { onDismiss(); });
        card.appendChild(foot);
        ov.appendChild(card);
        vOverlay.add(ov);
        ov.addEventListener('click', function (e) { if (e.target === ov) onDismiss(); });
    }

    /**
     * Confirmação de ação (Esquivar, Desengajar): mesmo cabeçalho que resumo de lote + lista curta.
     * cfg: { line1, line2, bullets: string[], note?: string }
     */
    function showMetaActionConfirm(cfg) {
        return new Promise(function (resolve) {
            if (!cfg) {
                resolve(false);
                return;
            }
            var dup = document.getElementById('c2-meta-action-confirm');
            if (dup) dup.remove();
            var ov = document.createElement('div');
            ov.id = 'c2-meta-action-confirm';
            ov.className = 'iop-overlay iop-overlay--batch';
            ov.setAttribute('role', 'dialog');
            ov.setAttribute('aria-modal', 'true');
            ov.setAttribute('aria-labelledby', 'c2-meta-confirm-title');
            var card = document.createElement('div');
            card.className = 'iop-card iop-card--batch-summary c2-meta-confirm-card';
            var parts = [
                '<header class="iop-head-batch" aria-labelledby="c2-meta-confirm-title">',
                '<span class="iop-head-batch__orn" aria-hidden="true">\u2694</span>',
                '<div class="iop-head-batch__text">',
                '<h2 class="iop-head-batch__title" id="c2-meta-confirm-title">',
                '<span class="iop-head-batch__line1">' + escHtml(cfg.line1 || '') + '</span>',
                '<span class="iop-head-batch__line2">' + escHtml(cfg.line2 || '') + '</span>',
                '</h2></div></header>',
                '<div class="iop-head-batch__rule" role="presentation"></div>',
                '<div class="c2-meta-confirm-body">'
            ];
            var bullets = cfg.bullets || [];
            if (bullets.length) {
                parts.push('<ul class="c2-meta-confirm-bullets">');
                for (var bi = 0; bi < bullets.length; bi++) {
                    parts.push('<li>' + escHtml(bullets[bi]) + '</li>');
                }
                parts.push('</ul>');
            }
            if (cfg.note) {
                parts.push('<p class="c2-meta-confirm-note">' + escHtml(cfg.note) + '</p>');
            }
            parts.push('</div>');
            parts.push('<div class="c2-meta-confirm-actions">');
            parts.push('<button type="button" class="action-btn" data-c2mac="0">' + escHtml(cfg.cancelLabel || 'Cancelar') + '</button>');
            parts.push('<button type="button" class="action-btn primary" data-c2mac="1">' + escHtml(cfg.confirmLabel || 'Confirmar') + '</button>');
            parts.push('</div>');
            setHTML(card, parts.join(''));
            function finish(ok) {
                try {
                    document.removeEventListener('keydown', onKey);
                } catch (eK) {}
                try {
                    ov.remove();
                } catch (eR) {}
                resolve(!!ok);
            }
            function onKey(e) {
                if (e.key === 'Escape') finish(false);
            }
            document.addEventListener('keydown', onKey);
            ov.addEventListener('click', function (e) {
                if (e.target === ov) finish(false);
            });
            card.addEventListener('click', function (e) {
                var t = e.target;
                if (!t || !t.getAttribute) return;
                var v = t.getAttribute('data-c2mac');
                if (v === '0') finish(false);
                if (v === '1') finish(true);
            });
            ov.appendChild(card);
            vOverlay.add(ov);
        });
    }

    /* ============================================================
     * RENDER (estado via currentState do backend)
     * ============================================================ */
    function buildTurnQueue(s) {
        if (!s.order || !s.order.length) return '';
        var list;
        if (s.ph === 'init') {
            list = s.order.filter(function (c) { return c.initRevealed; });
            list.sort(function (a, b) { return b.init - a.init || (a.t === 'p' ? -1 : 1); });
        } else { list = s.order.slice(); }
        var parts = ['<div class="turn-queue" id="turn-queue">'];
        parts.push('<span class="tl-round">Turno ' + s.rn + '</span>');
        for (var i = 0; i < list.length; i++) {
            var entry = list[i];
            var origIdx = s.order.indexOf(entry);
            var utypeQ = entry.t === 'p' ? 'player' : (entry.t === 'a' ? 'ally' : 'enemy');
            var cls = 'tl-node';
            if (entry.t === 'e') cls += ' t-enemy';
            else if (entry.t === 'a') cls += ' t-ally';
            /* FIX (2026-04-20 — port simulator combate.html): adicionar cls-XXX
               no node da turn queue para aplicar cor heráldica de classe. */
            var slugQ = _heraldicClsSlugOf(entry, utypeQ);
            if (slugQ) cls += ' ' + slugQ;
            if (origIdx === s.active_idx && s.ph === 'active') cls += ' active';
            else if (s.ph === 'active') cls += ' forecast';
            if (!entry.alive) cls += ' dead';
            var id = 'tq-' + entry.n.replace(/[^a-zA-Z0-9]/g, '_');
            /* FIX (2026-04-20): ícone heráldico SVG em vez de emoji genérico.
               Simulator linhas 9712-9740 do combate.html — usa _heraldicIconOf
               e renderiza <svg><use href="#ic-XXX"/></svg>. Fallback emoji apenas
               quando não há ícone heráldico mapeado (summons exóticos, etc). */
            var iconIdQ = _heraldicIconOf(entry, utypeQ);
            var icoHtml = iconIdQ
                ? '<svg viewBox="0 0 120 120" aria-hidden="true"><use href="#' + iconIdQ + '"/></svg>'
                : escHtml(entry.ico || '?');
            parts.push('<div class="' + cls + '" id="' + id + '" title="' + escHtml(entry.n) + '"><div class="tl-ico">' + icoHtml + '</div></div>');
        }
        parts.push('</div>');
        return parts.join('');
    }

    function captureQueueRects() {
        var rects = {};
        document.querySelectorAll('#turn-queue .tl-node').forEach(function (el) { rects[el.id] = el.getBoundingClientRect(); });
        return rects;
    }

    function animateQueueTransition(oldRects) {
        requestAnimationFrame(function () {
            document.querySelectorAll('#turn-queue .tl-node').forEach(function (el) {
                var newRect = el.getBoundingClientRect();
                var old = oldRects[el.id];
                if (old) {
                    var dx = old.left - newRect.left;
                    if (Math.abs(dx) > 2) {
                        el.style.transition = 'none';
                        el.style.transform = 'translateX(' + dx + 'px)';
                        requestAnimationFrame(function () {
                            el.style.transition = 'transform .55s cubic-bezier(.34,1.56,.64,1)';
                            el.style.transform = '';
                        });
                    }
                } else { el.classList.add('tq-enter'); }
            });
        });
    }

    function partyHasConsciousAllyForMedicine(s) {
        if (!s || !s.order) return false;
        for (var i = 0; i < s.order.length; i++) {
            var u = s.order[i];
            if (u && u.t === 'a' && (u.hp || 0) > 0 && u.alive && !u.isDead) return true;
        }
        return false;
    }

    function ensureDeathSaves(u) {
        if (!u) return;
        if (!u.deathSaves || typeof u.deathSaves !== 'object') u.deathSaves = { s: 0, f: 0 };
    }

    function unitUidForOrderIndex(s, idx) {
        var u = s.order[idx];
        if (!u) return null;
        if (u.t === 'p') return 'player';
        if (u.t === 'a') return 'ally_' + idx;
        if (u.t === 'e') return 'enemy_' + idx;
        return null;
    }

    /** Ícones de efeitos em `se[]`: rótulo 5e + turnos restantes + indicador de TR no fim do turno. */
    function buildStatusEffectChips(u) {
        var se = u && u.se;
        if (!se || !se.length) return '';
        var h = '<div class="cell-se" role="list" aria-label="Efeitos ativos">';
        se.forEach(function (st) {
            if (!st || typeof st !== 'object') return;
            var label = st.dndCondition ? st.dndCondition : (st.n || st.id || '');
            var ico = st.ico || '\u2022';
            var tl = st.turnsLeft;
            var tlStr = '';
            if (tl != null && tl !== '') tlStr = '<span class="se-turns" title="Turnos até dissipar (duração)">' + tl + '</span>';
            else if (st.repeatSave || st.saveDc != null)
                tlStr = '<span class="se-turns se-turns--save" title="PHB: TR repetido no fim do cada turno teu">\u221e</span>';
            var kindCls = st.kind === 'buff' ? ' se-chip--buff' : ' se-chip--debuff';
            h += '<span class="se-chip' + kindCls + '" role="listitem">' +
                '<span class="se-ico" aria-hidden="true">' + escHtml(ico) + '</span>' +
                '<span class="se-lbl">' + escHtml(label) + '</span>' + tlStr + '</span>';
        });
        h += '</div>';
        return h;
    }

    function buildBattlefield(s) {
        var ROW_LABELS = ['retaguarda inimiga', 'frente inimiga', 'frente aliada', 'retaguarda aliada'];
        var grid = [[null, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]];
        function findCol(row) {
            var order = [1, 2, 0, 3];
            for (var i = 0; i < order.length; i++) if (grid[row][order[i]] === null) return order[i];
            return -1;
        }
        s.order.forEach(function (c, idx) {
            if (c.t !== 'e') return;
            var row = findCol(1) !== -1 ? 1 : 0;
            var col = findCol(row);
            if (col !== -1) grid[row][col] = { uid: 'enemy_' + idx, utype: 'enemy', u: c };
        });
        var p = s.order[s.p_idx];
        var pcol = findCol(2);
        if (pcol !== -1) grid[2][pcol] = { uid: 'player', utype: 'player', u: p };
        s.order.forEach(function (c, idx) {
            if (c.t !== 'a') return;
            var rowA = findCol(2) !== -1 ? 2 : 3;
            var colA = findCol(rowA);
            if (colA !== -1) grid[rowA][colA] = { uid: 'ally_' + idx, utype: 'ally', u: c };
        });
        var activeId = null;
        var active = s.order[s.active_idx];
        if (active && active.alive) activeId = unitUidForOrderIndex(s, s.active_idx);
        var html = '<div class="bf-pan-viewport" data-bf-pan-viewport aria-label="Área de combate — arraste para mover, pinça ou roda do mouse para zoom">';
        html += '<div class="bf-pan-stage" data-bf-pan-stage>';
        html += '<div class="battlefield">';
        for (var row = 0; row < 4; row++) {
            var zoneClass = row < 2 ? ' enemy-zone' : ' ally-zone';
            html += '<div class="row-label' + zoneClass + '">' + escHtml(ROW_LABELS[row]) + '</div>';
            html += '<div class="bf-row">';
            for (var col = 0; col < 4; col++) html += buildCell(grid[row][col], activeId);
            html += '</div>';
            if (row === 1) html += '<div class="bf-divider"></div>';
        }
        html += '</div></div></div>';
        return html;
    }

    /* ============================================================
       V8 HERALDIC helpers — port simulador (linhas 9836-10189 do combate.html)
       Fase 2/14 do port. NÃO chamado ainda — Fase 3 fará wiring via buildCell.
       Plano completo em docs/sistemas/combat2-port-simulador-dev.md
       ============================================================ */

    /* Mapeamento classe PT-BR -> ic-XXX (SVG symbol injetado por shared/heraldic-icons.js) */
    var CLASS_ICON_MAP = {
        'Guerreiro':    'ic-guerreiro',
        'Mago':         'ic-mago',
        'Ladino':       'ic-ladino',
        'Clérigo':      'ic-clerigo',
        'Paladino':     'ic-paladino',
        'Bárbaro':      'ic-barbaro',
        'Patrulheiro':  'ic-patrulheiro',
        'Bardo':        'ic-bardo',
        'Druida':       'ic-druida',
        'Monge':        'ic-monge',
        'Feiticeiro':   'ic-feiticeiro'
    };

    /* Mapeamento classe PT-BR -> cls-XXX (ativa token CSS --card-accent em combat2.css) */
    var CLASS_SLUG_MAP = {
        'Guerreiro':    'cls-guerreiro',
        'Mago':         'cls-mago',
        'Ladino':       'cls-ladino',
        'Clérigo':      'cls-clerigo',
        'Paladino':     'cls-paladino',
        'Bárbaro':      'cls-barbaro',
        'Patrulheiro':  'cls-patrulheiro',
        'Bardo':        'cls-bardo',
        'Druida':       'cls-druida',
        'Monge':        'cls-monge',
        'Feiticeiro':   'cls-feiticeiro'
    };

    /* Resolve unit -> id do SVG heráldico (ic-XXX). Summons têm ícones específicos.
     *
     * Icones disponiveis em heraldic-icons.js (auditado 2026-04-20):
     *   11 classes: ic-mago, ic-clerigo, ic-barbaro, ic-druida, ic-bardo,
     *               ic-ladino, ic-guerreiro, ic-monge, ic-patrulheiro,
     *               ic-paladino, ic-feiticeiro
     *   2 NPC:      ic-inimigo, ic-boss
     *
     * NAO existem: ic-aliado, ic-summon, ic-familiar, ic-sprite,
     *              ic-spiritual-weapon, ic-find_steed, ic-animal_companion
     *
     * Para esses casos, usamos fallback heraldico do caster/classe ou
     * ic-inimigo (silueta neutra, apenas cor muda conforme cls-XXX).
     */
    function _heraldicIconOf(u, utype) {
        if (!u) return null;
        if (utype === 'enemy') return u.isBoss ? 'ic-boss' : 'ic-inimigo';
        /* Player: usa icone da sua classe diretamente. */
        if (utype === 'player') {
            return CLASS_ICON_MAP[u.cls] || 'ic-guerreiro';
        }
        /* Ally: summons herdam icone do conjurador quando possivel,
           senao fallback generico. iconHeraldic explicito tem prioridade. */
        if (u.iconHeraldic && CLASS_ICON_MAP[u.iconHeraldic]) return u.iconHeraldic;
        /* Summon com caster identificado: usar icone do caster. */
        if (u.summonKind && u.summonedBy != null && currentState && currentState.order) {
            var caster = currentState.order[u.summonedBy];
            if (caster && caster.cls && CLASS_ICON_MAP[caster.cls]) {
                return CLASS_ICON_MAP[caster.cls];
            }
        }
        /* Ally com cls mapeada (NPC guerreiro, mago, etc). */
        var mapped = CLASS_ICON_MAP[u.cls];
        if (mapped) return mapped;
        /* Fallback para ally generico (brawler, mercenary, NPC sem cls):
           usa ic-inimigo (silueta neutra) mas cor vem de cls-aliado (verde). */
        return 'ic-inimigo';
    }

    /* Resolve unit -> classe slug (cls-xxx). Summons herdam cor do caster. */
    function _heraldicClsSlugOf(u, utype) {
        if (!u) return '';
        if (utype === 'enemy') return u.isBoss ? 'cls-boss' : 'cls-inimigo';
        /* V1 Invocações Phase 3 (2026-04-18) — summons herdam cor do conjurador
           (Arma Espiritual de Clérigo = cls-clerigo amarelo dourado, etc.). */
        if (u.summonKind && u.summonedBy != null && currentState && currentState.order) {
            var caster = currentState.order[u.summonedBy];
            if (caster && caster.cls && CLASS_SLUG_MAP[caster.cls]) {
                return CLASS_SLUG_MAP[caster.cls];
            }
        }
        /* FIX (2026-04-20): aliados NPC sem classe mapeada usam cls-aliado
           (token CSS genérico de aliado). Sem esse fallback o card nao virava
           V8 e aparecia como cardzinho pequeno sem padronização. */
        var mapped = CLASS_SLUG_MAP[u.cls];
        if (mapped) return mapped;
        if (utype === 'ally') return 'cls-aliado';
        if (utype === 'player') return 'cls-guerreiro';  /* fallback rarissimo */
        return '';
    }

    /* Subtítulo da classe no card V8 (class_tag). Inclui nível quando > 0. */
    function _v8ClassTagOf(u, utype) {
        if (utype === 'enemy') {
            var baseE = u.isBoss ? 'Chefe' : 'Inimigo';
            var lvlE = (u && u.lvl != null) ? (u.lvl | 0) : 0;
            return lvlE > 0 ? baseE + ' · Nv ' + lvlE : baseE;
        }
        /* V1.6 PHB-fiel — summons ganham label específico por tipo. */
        if (u && u.summonKind) {
            var SUMMON_TAG_MAP = {
                'familiar': 'Familiar',
                'find_steed': 'Montaria',
                'animal_companion': 'Companheiro',
                'spiritual_weapon': 'Arma Espectral'
            };
            return SUMMON_TAG_MAP[u.summonKind] || 'Invocação';
        }
        var base = (u && u.cls) || 'Aliado';
        var lvl = (u && u.lvl != null) ? (u.lvl | 0) : 0;
        if (lvl > 0) return base + ' · Nv ' + lvl;
        return base;
    }

    /* Label curto (3-4 chars) do tipo de recurso pra stats-row. */
    function _v8ResLabelOf(type) {
        var map = { mp: 'MP', vigor: 'VIG', furia: 'FÚR', energia: 'ENE', ki: 'KI', foco: 'FOC' };
        var k = String(type || '').toLowerCase();
        return map[k] || (k ? k.slice(0, 4).toUpperCase() : 'REC');
    }

    /* Rastreamento do estado anterior das barras (HP/recurso) pra flash-dmg/heal/res.
       Keyed por uid da célula. Populado por buildCellInnerHTML(uid). */
    var _lastBarState = {};

    /* Emite markup V8 LITERAL do mockup card-icons-heraldic.html.
       Markup interno: .c-name + .c-portrait (SVG) + .c-class-tag + .c-stats + .c-conditions.
       Fallback legado (unit-row + ico emoji) para classes não mapeadas.
       Chamado por buildCell (Fase 3, wiring).

       Args:
         u        unit do state.order
         utype    'player' | 'ally' | 'enemy'
         opt      { displayHp?:num, forceHideInit?:bool }
         uid      id único da célula (necessário pra flash tracking) */
    function buildCellInnerHTML(u, utype, opt, uid) {
        opt = opt || {};
        var inner = '';
        var iconId = _heraldicIconOf(u, utype);
        var isHeraldic = !!iconId;

        /* Badges de canto (init e AC) — antes dos blocos V8. */
        var showInitBadge = !opt.forceHideInit && currentState && currentState.ph === 'intro';
        if (showInitBadge) {
            if (u.initRevealed) inner += '<div class="cell-init">🎲' + u.init + '</div>';
            else if (u.init !== undefined) inner += '<div class="cell-init pending">?</div>';
        }
        if (u.ac !== undefined && !isHeraldic) inner += '<div class="cell-ac">' + escHtml(String(u.ac)) + '</div>';

        if (isHeraldic) {
            /* V8 heráldico: c-name → c-portrait (SVG crest) → c-class-tag (borda dourada). */
            inner += '<div class="c-name">' + escHtml(u.n || u.cls || '—') + '</div>';
            inner += '<div class="c-portrait"><svg viewBox="0 0 120 120" aria-hidden="true"><use href="#' + iconId + '"/></svg></div>';
            inner += '<div class="c-class-tag">' + escHtml(_v8ClassTagOf(u, utype)) + '</div>';
        } else {
            /* Fallback legado (unidades sem classe mapeada). */
            inner += '<div class="unit-row">';
            inner += '<div class="unit-side left"></div>';
            inner += '<div class="unit-ico">' + escHtml(u.ico) + '</div>';
            inner += '<div class="unit-side right"></div>';
            inner += '</div>';
        }

        /* Barras HP + recurso legadas (CSS .v8-card .cell-bars { display: none }). */
        inner += '<div class="cell-bars">';
        var hpVal = opt.displayHp != null ? opt.displayHp : u.hp;
        var hpPct = Math.max(0, Math.min(100, Math.round((hpVal / u.mhp) * 100)));
        var hpCls = hpPct > 60 ? 'hp-high' : (hpPct > 25 ? 'hp-mid' : 'hp-low');
        var fillCls = hpPct > 60 ? 'fill-hp-high' : (hpPct > 25 ? 'fill-hp-mid' : 'fill-hp-low');
        inner += '<div class="bar-row"><div class="mini-bar"><div class="fill ' + fillCls + '" style="width:' + hpPct + '%"></div></div><div class="bar-num ' + hpCls + '">' + hpVal + '/' + u.mhp + '</div></div>';
        if (u.res && u.res.max > 0) {
            var rPct = Math.max(0, Math.min(100, Math.round((u.res.value / u.res.max) * 100)));
            var rCls = u.res.type === 'mp' ? 'fill-res-mp' : (u.res.type === 'energia' ? 'fill-res-energia' : (u.res.type === 'vigor' ? 'fill-res-vigor' : 'fill-res-furia'));
            inner += '<div class="bar-row"><div class="mini-bar"><div class="fill ' + rCls + '" style="width:' + rPct + '%"></div></div><div class="bar-num res ' + u.res.type + '">' + u.res.ico + ' ' + u.res.value + '/' + u.res.max + '</div></div>';
        }
        inner += '</div>';

        /* V8 stats grid: PV (topo-esq) + recurso (baixo-esq) + CA (direita span rows).
           Markup LITERAL do card-icons-heraldic.html. */
        if (isHeraldic) {
            var hpPctStat = u.mhp > 0 ? Math.max(0, Math.min(100, Math.round((hpVal / u.mhp) * 100))) : 0;
            var hpThr = hpPctStat > 60 ? 'high' : (hpPctStat > 25 ? 'mid' : 'low');
            /* Captura estado anterior pra animar from→to (flash-dmg/heal/res). */
            var _prevBar = (uid != null ? _lastBarState[uid] : null) || {};
            var _hpFlashCls = '';
            if (_prevBar.hp != null && _prevBar.hp !== hpPctStat) {
                _hpFlashCls = (hpPctStat < _prevBar.hp) ? ' flash-dmg' : ' flash-heal';
            }
            var _hpInitPct = (_prevBar.hp != null) ? _prevBar.hp : hpPctStat;
            inner += '<div class="c-stats">';
            if (!u.noTarget) {
                /* V1 Invocações Phase 2 — summons noTarget (Arma Espiritual) SEM HP/CA. */
                inner += '<div class="c-stat c-stat--hp' + _hpFlashCls + '" style="--bar-pct:' + _hpInitPct + '%" data-bar-target="' + hpPctStat + '">';
                inner += '<div class="c-stat-bar"><span class="c-stat-bar-fill c-stat-bar-fill--hp-' + hpThr + '"></span></div>';
                inner += '<span class="c-stat-label">PV</span><span class="c-stat-val c-stat-val--hp c-stat-val--hp-' + hpThr + '">' + hpVal + '/' + u.mhp + '</span>';
                inner += '</div>';
            } else if (u.durLeft != null) {
                /* Mostra duração restante no lugar do HP (rounds). */
                inner += '<div class="c-stat c-stat--summon-dur">';
                inner += '<span class="c-stat-label">DUR</span><span class="c-stat-val c-stat-val--summon-dur">' + u.durLeft + 'r</span>';
                inner += '</div>';
            }
            var _curResPct = null;
            if (u.res && u.res.max > 0) {
                var resLbl = _v8ResLabelOf(u.res.type);
                var resType = String(u.res.type || '').toLowerCase();
                _curResPct = Math.max(0, Math.min(100, Math.round((u.res.value / u.res.max) * 100)));
                var _resFlashCls = '';
                if (_prevBar.res != null && _prevBar.res !== _curResPct) {
                    _resFlashCls = ' flash-res';
                }
                var _resInitPct = (_prevBar.res != null) ? _prevBar.res : _curResPct;
                inner += '<div class="c-stat c-stat--' + resType + _resFlashCls + '" style="--bar-pct:' + _resInitPct + '%" data-bar-target="' + _curResPct + '">';
                inner += '<div class="c-stat-bar"><span class="c-stat-bar-fill c-stat-bar-fill--' + resType + '"></span></div>';
                inner += '<span class="c-stat-label">' + resLbl + '</span><span class="c-stat-val c-stat-val--' + resType + '">' + u.res.value + '/' + u.res.max + '</span>';
                inner += '</div>';
            }
            if (u.ac !== undefined && !u.noTarget) {
                inner += '<div class="c-stat c-stat--ca"><span class="c-stat-label">CA</span><span class="c-stat-val c-stat-val--ca">' + escHtml(String(u.ac)) + '</span></div>';
            }
            inner += '</div>';
            if (uid != null) _lastBarState[uid] = { hp: hpPctStat, res: _curResPct };
        }

        /* Conditions strip (chips buff/debuff clicáveis — .c-cond-chip com payload JSON). */
        if (isHeraldic) {
            var visibleEffects = (u.se || []).filter(function (st) {
                if (!st) return false;
                if (st.decOn && !st.tickCombat2 && !(st.turnsLeft | 0)) return false;
                return true;
            });
            if (visibleEffects.length) {
                inner += '<div class="c-conditions" role="list" aria-label="Condições ativas">';
                visibleEffects.forEach(function (st) {
                    var kindCls = st.kind === 'debuff' ? 'debuff' : 'buff';
                    var tl = st.turnsLeft;
                    var tlStr = '';
                    if (tl != null && (tl | 0) > 0) tlStr = '<span class="c-cond-tl">' + tl + '</span>';
                    else if (st.repeatSave && st.saveDc != null) tlStr = '<span class="c-cond-tl c-cond-tl--save">\u221e</span>';
                    var label = st.dndCondition || st.condName || st.n || st.id || '';
                    var popPayload = {
                        id: st.id || '', ico: st.ico || '\u2022', kind: kindCls,
                        name: label, desc: st.desc || '', rule: st.condRule || '',
                        turnsLeft: (tl | 0) || null,
                        saveDc: st.saveDc || null, saveAbility: st.saveAbility || ''
                    };
                    var payloadAttr = escHtml(JSON.stringify(popPayload));
                    inner += '<button type="button" class="c-cond-chip ' + kindCls + '"' +
                             ' data-cond-payload="' + payloadAttr + '"' +
                             ' aria-label="' + escHtml(label) + '"' +
                             ' title="' + escHtml(label) + ' — clique para detalhes">' +
                             escHtml(st.ico || '\u2022') +
                             tlStr + '</button>';
                });
                inner += '</div>';
            }
        }
        /* Death saves / stable / dead tags. */
        if ((utype === 'player' || utype === 'ally') && u.hp <= 0 && u.dying && !u.stable && !u.isDead) {
            ensureDeathSaves(u);
            var ds = u.deathSaves;
            var si, pi = '';
            pi += '<div class="cell-death-saves" role="status" aria-live="polite">';
            pi += '<span class="cds-skull" aria-hidden="true">☠</span>';
            pi += '<div class="cds-tracks">';
            pi += '<div class="cds-track" aria-label="Sucessos no teste de morte"><span class="cds-track-lbl" aria-hidden="true">S</span><span class="cds-pips">';
            for (si = 0; si < 3; si++) pi += '<span class="cds-pip' + (si < (ds.s | 0) ? ' cds-pip--ok' : '') + '"></span>';
            pi += '</span></div>';
            pi += '<div class="cds-track" aria-label="Falhas no teste de morte"><span class="cds-track-lbl" aria-hidden="true">F</span><span class="cds-pips">';
            for (si = 0; si < 3; si++) pi += '<span class="cds-pip' + (si < (ds.f | 0) ? ' cds-pip--bad' : '') + '"></span>';
            pi += '</span></div></div></div>';
            inner += pi;
        } else if ((utype === 'player' || utype === 'ally') && u.hp <= 0 && u.stable && !u.isDead) {
            inner += '<div class="cell-stable-tag">Estável · 0 PV</div>';
        } else if ((utype === 'player' || utype === 'ally') && u.isDead) {
            inner += '<div class="cell-dead-tag">MORTO</div>';
        }
        /* Status chips legado (cells NÃO heráldicas — heráldicas usam .c-conditions). */
        if (!isHeraldic && u.se && u.se.length) {
            inner += '<div class="cell-status-chips cell-se" role="list" aria-label="Efeitos ativos">';
            u.se.forEach(function (st) {
                if (!st) return;
                if (st.decOn && !st.tickCombat2) {
                    if (!st.turnsLeft) return;
                }
                var label = st.dndCondition ? st.dndCondition : (st.n || st.id || '');
                var k = st.kind === 'debuff' ? 'debuff' : 'buff';
                var tl = st.turnsLeft;
                var tlStr = '';
                if (tl != null && tl !== '' && (tl | 0) > 0) tlStr = '<span class="se-turns">' + tl + '</span>';
                else if (st.repeatSave && st.saveDc != null) tlStr = '<span class="se-turns se-turns--save" title="TR no fim do turno">\u221e</span>';
                inner += '<span class="cell-status-chip se-chip ' + k + '" role="listitem" title="' + escHtml(label) + '">' +
                    '<span class="se-ico">' + escHtml(st.ico || '\u2022') + '</span> ' +
                    '<span class="se-lbl">' + escHtml((label || '').slice(0, 40)) + '</span>' + tlStr + '</span>';
            });
            inner += '</div>';
        }
        return inner;
    }

    /* ============================================================
       FIM V8 HERALDIC helpers — próximas fases:
       Fase 3 (render refactor): buildCell chama _heraldicClsSlugOf + buildCellInnerHTML
       Fase 13 (polish): popup condição .v8-cond-popup-* + click handler (.c-cond-chip)
       ============================================================ */

    /* buildCell — Fase 3 port simulador linha 10297. Emite .cell.v8-card.<cls-slug>
       com markup interno via buildCellInnerHTML (Fase 2). Preserva todas as classes
       de VFX/status effects/summon/select existentes. */
    function buildCell(cell, activeId) {
        if (!cell) return '<div class="cell"></div>';
        var u = cell.u, utype = cell.utype, uid = cell.uid;
        var classes = 'cell occupied ' + utype;

        /* V8 heraldic: identidade da classe (cor + moldura dourada + SVG crest). */
        var _heraldicSlug = _heraldicClsSlugOf(u, utype);
        if (_heraldicSlug) classes += ' v8-card ' + _heraldicSlug;

        if (uid === activeId) {
            classes += ' active-turn';
            if (utype === 'player' && currentState && currentState.ph === 'active') classes += ' player-turn-active';
        }
        if (u.initRolling) classes += ' init-rolling';
        /* Estados mortos/dying (ordem do simulador linha 10312-10317) */
        if (utype === 'enemy' && !u.alive) classes += ' dead';
        else if (utype === 'player' || utype === 'ally') {
            if (u.isDead) classes += ' dead cell--dead-perm';
            else if ((u.hp | 0) <= 0 && u.dying && !u.stable) classes += ' cell--dying';
            else if ((u.hp | 0) <= 0 && u.stable) classes += ' cell--stable';
        } else if (!u.alive) classes += ' dead';

        /* Condições visuais distintas por status effect (port simulador linha 10328-10359).
           Debuffs: Amedrontado/Sono/Prostrado/Zombado → classes card-*.
           Buffs persistentes: atkAdv/dmgBonus/acBonus/halfDmg → classes unit-buffed-*. */
        if (u.alive && u.se && u.se.length) {
            var hasFrightened = false, hasSleep = false, hasProstrate = false, hasMock = false;
            var hasOffenseBuff = false, hasDefenseBuff = false, hasIntimidating = false;
            u.se.forEach(function (st) {
                if (!st || (st.turnsLeft != null && st.turnsLeft <= 0)) return;
                var cond = (st.dndCondition || '') + ' ' + (st.n || '');
                if (/Amedrontad|Medo|Frightened/i.test(cond)) hasFrightened = true;
                else if (/Sono|Adormecid|Inconscient|Sleep|Stun/i.test(cond)) hasSleep = true;
                else if (/Prostrad|Caíd|Prone/i.test(cond)) hasProstrate = true;
                else if (/Zombad|Mock/i.test(cond)) hasMock = true;
                else if (st.skipTurn) hasSleep = true;
                if (st.atkAdvantage || st.dmgBonusDie || st.bardicInspiration ||
                        st.atkBonusDie || st.rageDmg || st.sneakAttack || st.rollApply) {
                    hasOffenseBuff = true;
                }
                if (st.acBonus || st.halfDmg || st.sanctuary || st.rageResistance ||
                        st.magicSaveAdvantage) {
                    hasDefenseBuff = true;
                }
                if (st.enemyAtkDisadvantage) hasIntimidating = true;
            });
            if (hasFrightened) classes += ' card-frightened';
            else if (hasSleep) classes += ' card-sleeping';
            if (hasProstrate) classes += ' card-prostrate';
            if (hasMock) classes += ' card-mocked';
            if (hasIntimidating) classes += ' unit-intimidating';
            else if (hasOffenseBuff) classes += ' unit-buffed-offense';
            if (hasDefenseBuff) classes += ' unit-buffed-defense';
        }

        /* Selectable (target de ataque/cura) — preservado do buildCell original. */
        if (_selectingTarget && utype === 'enemy' && u.alive) classes += ' selectable';
        var healPick = _selectHealTarget || _pendingHealItem;
        if (healPick && (utype === 'player' || utype === 'ally') && !u.isDead &&
                ((u.alive && u.hp < u.mhp) || (u.hp != null && u.hp <= 0))) {
            classes += ' selectable-heal';
        }

        /* V1 Invocações Phase 4 V1-Visual (2026-04-19) — diferenciadores visuais pra summons.
           cell--is-summon: borda dashed cor heráldica do conjurador.
           cell--summon-attached: noTarget+spectral (Arma Espiritual) → borda ethereal extra.
           cell--summon-focused-by: marcador 🎯 quando inimigo é focusTarget de algum familiar. */
        if (u.summonKind) {
            classes += ' cell--is-summon';
            if (u.noTarget) classes += ' cell--summon-attached';
        }
        var isFocusedByFamiliar = false;
        if (utype === 'enemy' && currentState && currentState.order) {
            for (var fi = 0; fi < currentState.order.length; fi++) {
                var fc = currentState.order[fi];
                if (fc && fc.summonKind === 'familiar' && fc.alive && fc.focusTarget != null) {
                    var ft = currentState.order[fc.focusTarget];
                    if (ft === u) { isFocusedByFamiliar = true; break; }
                }
            }
        }
        if (isFocusedByFamiliar) classes += ' cell--summon-focused-by';

        /* Markup interno via buildCellInnerHTML (Fase 2). Handles heraldic V8 + fallback legado. */
        var inner = buildCellInnerHTML(u, utype, {}, uid);

        /* Focus marker visual (inimigo focado pelo Familiar). */
        var focusMarkerHtml = isFocusedByFamiliar
            ? '<div class="summon-focus-marker" aria-label="Foco do Familiar">🎯</div>'
            : '';

        /* Chip flutuante acima do CONJURADOR com summons attached (Arma Espiritual).
           Mostra ícone + duração restante (ex.: ⚔️ 7r). */
        var attachedChipHtml = '';
        if (u.t === 'p' && currentState && currentState.attachedSummons) {
            var pAttached = currentState.attachedSummons[currentState.p_idx] || [];
            if (pAttached.length && currentState.order && currentState.order[currentState.p_idx] === u) {
                var chipParts = pAttached.map(function (sw) {
                    return '<span class="sa-chip-item">' + escHtml(sw.ico || '⚔️') + ' <strong>' + (sw.durLeft | 0) + 'r</strong></span>';
                }).join('');
                attachedChipHtml = '<div class="summon-attached-chip" aria-label="Summon ativo">' + chipParts + '</div>';
            }
        }

        return '<div class="' + classes + '" data-unit-id="' + uid + '" data-clickable="1">' + inner + focusMarkerHtml + attachedChipHtml + '</div>';
    }

    function render(s) {
        currentState = s;
        if (s && s.ph === 'active' && (_selectingTarget || _selectHealTarget || _pendingHealItem)) {
            _actionSheetOpen = false;
        }
        try {
            var bKey = String((s && s.biome) || 'forest').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'forest';
            document.body.className = (document.body.className || '').replace(/\bbiome-\S+/g, '').trim();
            document.body.classList.add('biome-' + bKey);
        } catch (eBio) {}
        try {
            syncCombat2Music(s);
        } catch (eM) {}
        var app = document.getElementById('app');
        var ph = s.ph;
        if (_suppressTerminalDuringReplay && (ph === 'victory' || ph === 'defeat' || ph === 'fled')) {
            ph = 'active';
        }
        var html = '';

        if (ph === 'victory' || ph === 'defeat' || ph === 'fled') {
            var title = { victory: 'VITÓRIA', defeat: 'DERROTA', fled: 'FUGIU' }[ph];
            var narr = {
                victory: 'Todos os inimigos caíram por suas mãos.',
                defeat: 'Todos os aventureiros da party caem — não resta ninguém de pé para continuar o combate.',
                fled: 'Você escapa para longe da ameaça.'
            }[ph];
            var logBody = formatCombat2LogByRounds(s.log || [], { reverseRounds: false });
            html = '<div class="resolution ' + ph + '">';
            html += '<div class="res-title">' + escHtml(title) + '</div>';
            html += '<div class="res-narr">' + escHtml(narr) + '</div>';
            if (ph === 'victory' && s.rewards) {
                var r = s.rewards;
                var xpPct = Math.min(100, Math.round((r.newXp / r.threshold) * 100));
                html += '<div class="res-rewards">';
                html += '<div class="rr-section-title">Recompensas</div>';
                html += '<div class="rr-xp"><div class="rr-xp-row">';
                html += '<span class="rr-xp-lbl">Experiência</span><span class="rr-xp-val">+' + r.xp + ' XP</span>';
                html += '</div><div class="rr-xp-bar"><div class="rr-xp-fill" data-to="' + xpPct + '" style="width:0%"></div></div>';
                html += '<div class="rr-xp-meta">Nível ' + r.oldLvl + ' · ' + r.newXp + ' / ' + r.threshold + ' XP</div>';
                html += '</div>';
                if (r.levelUp) html += '<div class="rr-levelup">⭐ NÍVEL ' + r.newLvl + ' ALCANÇADO ⭐</div>';
                html += '<div class="rr-loot-row gold"><span class="rr-ico"><span class="vi vi-coin sm" aria-hidden="true"></span></span><span class="rr-name">Valdoritas</span><span class="rr-qty">+' + r.gold + '</span></div>';
                (r.items || []).forEach(function (it, i) {
                    html += '<div class="rr-loot-row" style="animation-delay:' + (1.4 + i * 0.15) + 's"><span class="rr-ico">' + escHtml(it.ico || '🎁') + '</span><span class="rr-name">' + escHtml(it.n) + '</span><span class="rr-qty rare-' + escHtml(it.rare || 'comum') + '">' + escHtml(it.rare || 'comum') + '</span></div>';
                });
                if (!(r.items || []).length) html += '<div class="rr-loot-empty">Nenhum item caiu desta vez.</div>';
                html += '</div>';
            }
            html += '<div class="res-log res-log-full"><div class="res-log-title">Log do combate</div>';
            html += '<div class="lp-log-scroll res-log-scroll">' + logBody + '</div></div>';
            html += '<div class="action-bar"><button class="action-btn primary full-width" data-act="close">✓ Continuar</button></div>';
            html += '</div>';
            setHTML(app, html);
            bindActions();
            /* Anima a barra de XP */
            if (ph === 'victory' && s.rewards) {
                var xpFill = document.querySelector('.rr-xp-fill');
                if (xpFill) setTimeout(function () { xpFill.style.width = xpFill.getAttribute('data-to') + '%'; }, 700);
            }
            return;
        }

        if (ph === 'intro' || ph === 'init' || ph === 'init_done') {
            if (ph === 'intro') {
                html += '<div class="epic-banner"><div class="epic-title">COMBATE INICIADO</div><div class="epic-sub">Prepare-se para a batalha</div></div>';
                html += '<div class="sim-setup-bar"><a href="' + escHtml(BASE + '/simuladores/combate-setup-frontend-testes.html') + '" target="_blank" rel="noopener">Cenário de testes (frontend)</a></div>';
            } else { html += buildTurnQueue(s); }
            html += '<div class="arena-header compact-header"><div class="arena-subtitle">' +
                (ph === 'intro' ? 'Posicionamento' : ph === 'init' ? 'Rolando Iniciativa...' : 'Ordem de Combate') +
                '</div></div>';
            html += buildBattlefield(s);
            if (ph === 'intro') {
                html += '<div class="epic-cta-overlay"><button class="epic-cta-btn" data-act="next"><div class="epic-cta-d3d" id="ctaDiceMount"></div><span class="epic-cta-text">Começar Rolagens<br/>de Iniciativa</span></button></div>';
            } else if (ph === 'init') {
                html += '<div class="epic-cta-overlay"><button class="epic-cta-btn" data-act="skip-init"><span class="epic-cta-icon">⏭️</span><span class="epic-cta-text">Pular<br/>Rolagens</span></button></div>';
            }
            /* init_done: CTA «Começar combate» dentro do popup de ordem (iop-card) */
            setHTML(app, html);
            bindActions();
            return;
        }

        /* Active */
        html += buildTurnQueue(s);
        var activeNow = s.order[s.active_idx];
        var isPlayerTurn = s.active_idx === s.p_idx;
        if (activeNow) {
            if (isPlayerTurn) html += '<div class="current-turn player-turn"><span class="ct-chevron">▸</span><span class="ct-text">SEU TURNO</span><span class="ct-chevron">◂</span></div>';
            else html += '<div class="current-turn"><span class="ct-ico">' + escHtml(activeNow.ico) + '</span><span class="ct-label">Turno de</span><span class="ct-name">' + escHtml(activeNow.n) + '</span></div>';
        }
        html += '<div class="arena-header compact-header"><div class="arena-subtitle"><span class="round-badge">Turno ' + s.rn + '</span> ' +
            escHtml(formatCombat2Biome(s.biome)) + ' <span class="weather-badge w-clear">☀️ Limpo</span></div></div>';
        /* HUD recursos D&D (Fase 5 port). Player turn: 3 pílulas. NPC turn: só ⬢ Reação. */
        var _hudP = s.order[s.p_idx];
        if (_hudP) { html += _buildDndResourcesBarHtml(s, _hudP, { compactReaction: !isPlayerTurn }); }
        html += buildBattlefield(s);

        if (isPlayerTurn && (_selectingTarget || _selectHealTarget || _pendingHealItem)) {
            if (_selectHealTarget || _pendingHealItem) {
                html += '<div class="target-hint target-hint--heal">' +
                    (_pendingHealItem ? 'Toque no aliado ou em si para usar a poção' : 'Toque no aliado a curar (inclui inconscientes a 0 PV)') +
                    '</div>';
            } else {
                html += '<div class="target-hint">Toque no inimigo para atacar</div>';
            }
        }

        if (isPlayerTurn) {
            if (_selectingTarget || _selectHealTarget || _pendingHealItem) {
                var cancelLbl2 = (_selectHealTarget || _pendingHealItem) ? '✕ Cancelar cura' : '✕ Cancelar Ataque';
                html += '<div class="action-bar"><div class="action-btns-row"><button class="action-btn" data-act="cancel-target">' + cancelLbl2 + '</button></div></div>';
            } else {
                var pCur = s.order[s.p_idx];
                if (pCur && pCur.hp <= 0 && pCur.dying && !pCur.stable && !pCur.isDead) {
                    ensureDeathSaves(pCur);
                    html += '<div class="action-bar action-bar--death-save">';
                    html += '<div class="sim-death-save-banner">';
                    html += '<div class="sds-title-row"><span class="sds-skull" aria-hidden="true">\u2620</span><h2 class="sds-title">Teste de morte</h2></div>';
                    html += '<p class="sds-lead">A 0 PV, no seu turno role 1d20. Os resultados acumulam sucessos ou falhas até ficar estável ou morrer (PHB).</p>';
                    html += '<ul class="sds-rules">';
                    html += '<li><strong>20 natural:</strong> recupera 1 PV e deixa de estar morrendo.</li>';
                    html += '<li><strong>10 ou mais:</strong> um sucesso. Três sucessos: inconsciente estável (0 PV).</li>';
                    html += '<li><strong>9 ou menos:</strong> uma falha. <strong>1 natural:</strong> conta como duas falhas.</li>';
                    html += partyHasConsciousAllyForMedicine(s)
                        ? '<li><strong>Três falhas:</strong> morte. Com <strong>aliado de pé</strong> no grupo, ele pode usar <strong>ação</strong> e teste de <strong>Sabedoria (Medicina) CD 10</strong> (PHB) para estabilizar você.</li>'
                        : '<li><strong>Três falhas:</strong> morte. Sem <strong>aliado consciente</strong> no grupo, não há quem faça Medicina no seu turno (PHB: ação de outro combatente adjacente).</li>';
                    html += '</ul></div>';
                    html += '<div class="sds-actions">';
                    html += '<button type="button" class="action-btn primary" data-act="death-save">🎲 Rolar teste de morte</button>';
                    if (partyHasConsciousAllyForMedicine(s)) {
                        html += '<button type="button" class="action-btn secondary" data-act="stabilize-med">🩹 Aliado: Medicina CD 10</button>';
                    }
                    html += '<button type="button" class="action-btn secondary" data-act="log">📜 Log</button>';
                    html += '</div></div>';
                } else if (pCur && (pCur.isDead || (pCur.hp <= 0 && pCur.stable && !pCur.dying))) {
                    html += '<div class="action-bar action-bar--pass-down">';
                    html += '<p class="sim-down-banner">Sem ações (morto ou inconsciente estável a 0 PV).</p>';
                    html += '<div class="action-btns-row"><button type="button" class="action-btn primary" data-act="pass-down">⏭ Avançar turno</button>';
                    html += '<button type="button" class="action-btn secondary" data-act="log">📜 Log</button></div></div>';
                } else {
                    html += '<div class="action-bar action-bar--player-dock">';
                    if (_actionSheetOpen) {
                        html += '<div class="sim-action-backdrop" data-act="close-action-sheet" aria-hidden="true"></div>';
                    }
                    html += '<div class="sim-action-sheet' + (_actionSheetOpen ? ' open' : '') + '">';
                    html += '<div class="sim-action-sheet-title">Escolha uma ação</div>';
                    html += '<div class="sim-action-sheet-sub">Sem grade de posição: Deslocar-se e Desengajar não são botões separados. <strong>Fugir</strong> resume a intenção de sair do combate (teste + risco de OA — ver popup).</div>';
                    html += '<div class="sim-action-sheet-grids">';
                    /* Mini-badge ◆ (Fase 5 port) — indica que botão consome Ação principal. Log é livre. */
                    var _actionGlyph = '<span class="action-btn-res-icon res-action" aria-hidden="true">◆</span>';
                    html += '<div class="action-btns-grid action-btns-grid--main">';
                    html += '<button type="button" class="action-btn primary" data-act="attack">⚔️ Atacar' + _actionGlyph + '</button>';
                    html += '<button type="button" class="action-btn" data-act="skills">✨ Habilidades' + _actionGlyph + '</button>';
                    html += '<button type="button" class="action-btn" data-act="bag">🎒 Mochila' + _actionGlyph + '</button>';
                    html += '</div>';
                    html += '<div class="sim-action-sheet-sep" aria-hidden="true"></div>';
                    html += '<div class="action-btns-grid action-btns-grid--secondary">';
                    html += '<button type="button" class="action-btn secondary" data-act="dodge">🛡️ Esquivar' + _actionGlyph + '</button>';
                    html += '<button type="button" class="action-btn secondary" data-act="flee">🏃 Fugir' + _actionGlyph + '</button>';
                    html += '<button type="button" class="action-btn secondary" data-act="pass">⏭ Passar turno' + _actionGlyph + '</button>';
                    html += '<button type="button" class="action-btn secondary" data-act="log">📜 Log</button>';
                    html += '</div>';
                    /* V1 Invocações Phase 1+ (Fase 4 port, 2026-04-20) — BÔNUS grid + Focar Familiar + Encerrar Turno.
                       Containers default display:none via CSS; _updateActionSheetState torna visíveis quando aplicável. */
                    html += '<div class="action-btns-grid action-btns-grid--bonus" id="bonus-action-grid"></div>';
                    html += '<button type="button" class="focus-familiar-link" id="focus-familiar-btn" data-act="focus-familiar">🎯 Focar Familiar</button>';
                    /* V1.5 F1 (Patrulheiro Beast Master) — Comandar Companheiro consome ação principal. */
                    html += '<button type="button" class="command-companion-btn" id="command-companion-btn" data-act="command-companion">🐺 Comandar Companheiro <span class="action-btn-res-icon res-action" aria-hidden="true">◆</span></button>';
                    /* V1.5 E2 (Paladino) — Mount/Dismount free 1×/turno. */
                    html += '<button type="button" class="mount-toggle-btn" id="mount-toggle-btn" data-act="mount-toggle">🐴 Montar</button>';
                    html += '<button type="button" class="end-turn-btn" id="end-turn-btn" data-act="end-turn">Encerrar turno</button>';
                    html += '</div></div>';
                    if (_actionSheetOpen) {
                        html += '<div class="sim-action-dock"><button type="button" class="action-btn primary sim-btn-agir" data-act="close-action-sheet">✕ Fechar</button></div>';
                    } else {
                        html += '<div class="sim-action-dock"><button type="button" class="action-btn primary sim-btn-agir" data-act="toggle-actions">⚔ Agir</button></div>';
                    }
                    html += '</div>';
                }
            }
        }

        setHTML(app, html);
        bindActions();
        /* V1 Invocações Phase 1 (Fase 4 port, 2026-04-20) — atualiza visibilidade
           do bonus grid, focus familiar link e Encerrar Turno conforme estado do player. */
        _updateActionSheetState(s);
    }

    /* _updateActionSheetState — port simulador linha 11400-11530.
       Aplica .spent aos botões principais/secundários quando `actionSpent`=true.
       Mostra "Encerrar turno" quando `actionSpent || bonusActionSpent` (PHB p.190).
       Popula o BÔNUS grid (Comandar Arma Espiritual) quando `attachedSummons` ativo.
       Mostra "Focar Familiar" quando passive summon (Familiar/Sprite/Wolf/Steed) vivo.

       Próximas fases adicionam (10-11): Command Companion / Mount Toggle buttons. */
    /* ============================================================
       CONDITION POPUP (Fase 13 port simulador 9896-9983).
       Click em .c-cond-chip abre popup com detalhes da condição/buff/debuff.
       ============================================================ */
    function openConditionPopup(payload) {
        if (!payload) return;
        var existing = document.querySelector('.v8-cond-popup-overlay');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.className = 'v8-cond-popup-overlay';
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) overlay.remove();
        });
        var card = document.createElement('div');
        card.className = 'v8-cond-popup-card cond-' + (payload.kind === 'debuff' ? 'debuff' : 'buff');
        card.addEventListener('click', function (e) { e.stopPropagation(); });
        var tag = document.createElement('div');
        tag.className = 'v8-cond-popup-tag';
        tag.textContent = payload.kind === 'debuff' ? 'Debuff · Condição D&D 5e' : 'Buff · Benefício D&D 5e';
        card.appendChild(tag);
        var title = document.createElement('div');
        title.className = 'v8-cond-popup-title';
        var titleIco = document.createElement('span');
        titleIco.className = 'v8-cond-popup-ico';
        titleIco.textContent = payload.ico || '\u2022';
        var titleName = document.createElement('span');
        titleName.textContent = payload.name || 'Condição';
        title.appendChild(titleIco);
        title.appendChild(titleName);
        card.appendChild(title);
        var dur = document.createElement('div');
        dur.className = 'v8-cond-popup-dur';
        if (payload.turnsLeft && (payload.turnsLeft | 0) > 0) {
            dur.textContent = 'Duração: ' + payload.turnsLeft + ' turno' + (payload.turnsLeft > 1 ? 's' : '') + ' restante' + (payload.turnsLeft > 1 ? 's' : '');
        } else if (payload.saveDc) {
            var ab = (payload.saveAbility || '').toUpperCase() || 'atributo';
            dur.textContent = 'Até passar em Teste de Resistência ' + ab + ' CD ' + payload.saveDc + ' (fim de cada turno)';
        } else {
            dur.textContent = 'Duração: até resolução narrativa';
        }
        card.appendChild(dur);
        if (payload.desc && String(payload.desc).trim()) {
            var desc = document.createElement('div');
            desc.className = 'v8-cond-popup-desc';
            desc.textContent = payload.desc;
            card.appendChild(desc);
        }
        if (payload.rule && String(payload.rule).trim()) {
            var ruleHead = document.createElement('div');
            ruleHead.className = 'v8-cond-popup-rule-head';
            ruleHead.textContent = '◆ Regra PHB / SRD 5.1 ◆';
            card.appendChild(ruleHead);
            var rule = document.createElement('div');
            rule.className = 'v8-cond-popup-rule';
            rule.textContent = payload.rule;
            card.appendChild(rule);
        }
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'v8-cond-popup-btn';
        btn.textContent = 'Entendido';
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            overlay.remove();
        });
        card.appendChild(btn);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
    }

    /* Click delegation pra .c-cond-chip — capture phase intercepta antes
       do handler da .cell (que seleciona alvo/ataca). Instala uma vez no boot. */
    document.addEventListener('click', function (e) {
        var chip = e.target && e.target.closest && e.target.closest('.c-cond-chip');
        if (!chip) return;
        e.preventDefault();
        e.stopPropagation();
        var payloadAttr = chip.getAttribute('data-cond-payload');
        if (!payloadAttr) return;
        try {
            var payload = JSON.parse(payloadAttr);
            openConditionPopup(payload);
        } catch (err) {
            console.warn('[COMBAT2] cond_payload_parse_failed', err || '');
        }
    }, true);

    /* ============================================================
       VFX DISPATCHER (Fase 7 port simulador 14045-14111 playHitVFX).
       Consome window._combatVfx (shared/combat-vfx.js já loaded no index.html).
       Mapeia skill/dmgType/ranged para métodos VFX específicos.

       Uso:
         dispatchAttackVfx(targetEl, {skill, fromEl, dmgType, crit, sneakAttack});

       Métodos disponíveis em _combatVfx:
       magicMissiles, fireballAoE, rayOfFrost, arrowVolley, projectile,
       meleeSlash, impact, shadowStrike, radiantBurst, critBurst,
       missFlash, dodgeEvade, potionMana, healSelf, healBurst,
       buffDefense, buffArcaneShield, buffBless, buffStealth, buffRage,
       sanctuary, sanctuaryBlock, sanctuaryBreak,
       concentrationSave, concentrationLost
       ============================================================ */
    function dispatchAttackVfx(targetEl, opts) {
        opts = opts || {};
        if (!targetEl || !window._combatVfx) return;
        var skill = opts.skill || null;
        var fromEl = opts.fromEl || null;
        var dmgType = opts.dmgType || 'slashing';
        var crit = !!opts.crit;
        var ranged = !!(skill && skill.ranged);
        /* Heurística: tipos mágicos distantes sem bandeira explícita */
        var magicDt = ['fire', 'cold', 'lightning', 'force', 'radiant', 'necrotic', 'psychic', 'thunder', 'acid', 'poison'];
        if (!ranged && magicDt.indexOf(dmgType) >= 0) ranged = true;
        try {
            var skName = (skill && skill.n) || '';
            /* 1) habilidades icônicas dedicadas */
            if (skName === 'Mísseis Mágicos' && fromEl) {
                window._combatVfx.magicMissiles(fromEl, targetEl, 3);
            } else if (skName === 'Bola de Fogo') {
                window._combatVfx.fireballAoE(targetEl);
            } else if (skName === 'Raio Gélido' && fromEl) {
                window._combatVfx.rayOfFrost(fromEl, targetEl, { crit: crit });
            } else if (skName === 'Disparo Rápido' && fromEl) {
                window._combatVfx.arrowVolley(fromEl, targetEl, 2, dmgType, { crit: crit });
            } else if (skName === 'Rajada de Flechas' && fromEl) {
                window._combatVfx.arrowVolley(fromEl, targetEl, 3, dmgType, { crit: crit });
            } else if (ranged && fromEl) {
                window._combatVfx.projectile(fromEl, targetEl, dmgType, { crit: crit });
            } else if (['slashing', 'bludgeoning', 'piercing'].indexOf(dmgType) >= 0 && fromEl) {
                window._combatVfx.meleeSlash(fromEl, targetEl, dmgType, { crit: crit });
            } else {
                window._combatVfx.impact(targetEl, dmgType, { crit: crit });
            }
            /* 2) overlays pós-impacto */
            if (opts.sneakAttack) {
                try { window._combatVfx.shadowStrike(targetEl); } catch (e0) {}
            }
            if (dmgType === 'radiant') {
                setTimeout(function () {
                    try { window._combatVfx.radiantBurst(targetEl); } catch (e1) {}
                }, 80);
            }
            if (crit) {
                setTimeout(function () {
                    try { window._combatVfx.critBurst(targetEl, dmgType); } catch (e2) {}
                }, 180);
            }
        } catch (e) {
            console.warn('[COMBAT2] vfx_dispatch_failed', e || '');
        }
    }

    /* Dispatcher de VFX de skill cast (Santuário, Fúria, Escudo Arcano, Bênção, etc.).
       Consome opts.skillName pra despachar pro método correto em _combatVfx. */
    function dispatchSkillCastVfx(targetEl, skillName) {
        if (!targetEl || !window._combatVfx || !skillName) return;
        try {
            if (skillName === 'Postura Defensiva' || skillName === 'Aura de Proteção') {
                window._combatVfx.buffDefense && window._combatVfx.buffDefense(targetEl);
            } else if (skillName === 'Escudo Arcano') {
                window._combatVfx.buffArcaneShield && window._combatVfx.buffArcaneShield(targetEl);
            } else if (skillName === 'Bênção' || skillName === 'Inspiração' || skillName === 'Marca do Caçador') {
                window._combatVfx.buffBless && window._combatVfx.buffBless(targetEl);
            } else if (skillName === 'Esquiva' || skillName === 'Passos Silenciosos') {
                window._combatVfx.buffStealth && window._combatVfx.buffStealth(targetEl);
            } else if (skillName === 'Fúria') {
                window._combatVfx.buffRage && window._combatVfx.buffRage(targetEl);
            } else if (skillName === 'Santuário') {
                window._combatVfx.sanctuary && window._combatVfx.sanctuary(targetEl);
            }
        } catch (e) {
            console.warn('[COMBAT2] skill_cast_vfx_failed', skillName, e || '');
        }
    }

    /* ============================================================
       HUD RECURSOS D&D 5e + DICE THEMES (Fases 5+6 port simulador).
       Glyphs: ◆ Ação  ▲ Bônus  ⬢ Reação
       Temas: holy, fire, ice, force, radiant, arcane, steel, lightning
       ============================================================ */
    function _resourceGlyphFor(kind) {
        if (kind === 'action') return '◆';
        if (kind === 'bonus') return '▲';
        if (kind === 'reaction') return '⬢';
        return '';
    }

    /* Refinamento Fase 4 — gating de skill por motivo PHB.
       Retorna {usable:bool, reason?:string}. Reason é mostrado em chip
       embaixo do .lp-item quando bloqueado. */
    function _simSkillUsable(p, sk) {
        if (!sk || !p) return { usable: true };
        var cost = parseInt(sk.cost, 10) || 0;
        var rv = p.res ? (parseInt(p.res.value, 10) || 0) : 999;
        var resName = (p.res && p.res.name) || 'recurso';
        if (cost > rv) {
            return { usable: false, reason: 'Sem ' + resName + ' (precisa ' + cost + ', tem ' + rv + ')' };
        }
        if (sk.bonus && p.bonusActionSpent) {
            return { usable: false, reason: 'Ação Bônus já gasta neste turno' };
        }
        if (!sk.bonus && p.actionSpent) {
            return { usable: false, reason: 'Ação principal já gasta' };
        }
        /* PHB p.202: BA spell castada limita ação a cantrip. Aplica APENAS a magias leveled. */
        if (!sk.bonus && p.bonusActionWasSpell) {
            var isLeveledSpell = (sk.kind === 'attack' || sk.kind === 'heal' || sk.kind === 'buff') && !sk.cantrip;
            if (isLeveledSpell && (sk.fireball || sk.healSpell || sk.blessSpell || sk.shieldSpell || sk.magicMissiles)) {
                return { usable: false, reason: 'PHB p.202: BA spell já castada — só truque' };
            }
        }
        if (sk.minLevel && (p.lvl | 0) < sk.minLevel) {
            return { usable: false, reason: 'Requer nível ' + sk.minLevel };
        }
        if (sk.requiresBuff) {
            var hasBuff = (p.se || []).some(function (st) { return st && st.id === sk.requiresBuff; });
            if (!hasBuff) return { usable: false, reason: 'Requer ' + sk.requiresBuff + ' ativo' };
        }
        return { usable: true };
    }

    function _skillResourceKind(sk) {
        if (!sk) return 'action';
        if (sk.bonus) return 'bonus';
        if (sk.reaction) return 'reaction';
        if (sk.shieldSpell && (sk.n === 'Escudo Arcano' || sk.n === 'Contramágica')) return 'reaction';
        return 'action';
    }

    /* Fase 6 — mapeia skill → tema do dice overlay. */
    function _skillThemeOf(sk) {
        if (!sk) return 'default';
        if (sk.fireball) return 'fire';
        if (sk.rayOfFrost) return 'ice';
        if (sk.magicMissiles) return 'force';
        if (sk.healSpell) return 'holy';
        if (sk.blessSpell) return 'radiant';
        if (sk.shieldSpell) return 'arcane';
        if (sk.kind === 'heal') return 'holy';
        if (sk.kind === 'attack') {
            var t = (sk.dmgType || '').toLowerCase();
            if (t === 'fire') return 'fire';
            if (t === 'cold') return 'ice';
            if (t === 'force') return 'force';
            if (t === 'radiant') return 'radiant';
            if (t === 'lightning' || t === 'thunder') return 'lightning';
            if (t === 'necrotic' || t === 'psychic') return 'arcane';
            return 'steel';
        }
        if (sk.kind === 'buff') {
            var sim = sk.buffSim || {};
            if (sim.acBonus || sim.sanctuary || sim.rageResistance) return 'arcane';
            if (sim.dmgBonusDie || sim.atkBonusDie || sim.rollApply ||
                    sim.bardicInspiration || sim.rageDmg) return 'radiant';
            return 'arcane';
        }
        return 'default';
    }

    function _buildDndResourcesBarHtml(s, p, opts) {
        if (!p) return '';
        opts = opts || {};
        var compactReaction = !!opts.compactReaction;
        var actionUsed = !!p.actionSpent;
        var baUsed = !!p.bonusActionSpent;
        var reactionUsed = !!p.reactionSpent;
        var baWasSpell = !!p.bonusActionWasSpell;
        var html = '<div class="dnd-resources-bar' + (compactReaction ? ' dnd-resources-bar--compact-reaction' : '') + '" aria-label="Recursos D&D 5e">';
        if (!compactReaction) {
            html += '<button type="button" class="dnd-res-pill dnd-res-action ' + (actionUsed ? 'spent' : 'available') + '" data-act="dnd-res-info" data-res="action" aria-label="Ação">';
            html += '<span class="dnd-res-glyph" aria-hidden="true">◆</span><span class="dnd-res-label">Ação</span><span class="dnd-res-state">' + (actionUsed ? '✗' : '✓') + '</span>';
            if (baWasSpell && !actionUsed) {
                html += '<span class="dnd-res-chip" title="PHB p.202: BA spell restringe magias leveled">✨ magia: só truque</span>';
            }
            html += '</button>';
            html += '<button type="button" class="dnd-res-pill dnd-res-bonus ' + (baUsed ? 'spent' : 'available') + '" data-act="dnd-res-info" data-res="bonus" aria-label="Ação Bônus">';
            html += '<span class="dnd-res-glyph" aria-hidden="true">▲</span><span class="dnd-res-label">Bônus</span><span class="dnd-res-state">' + (baUsed ? '✗' : '✓') + '</span></button>';
        }
        var reactionLabel = compactReaction ? 'Reação (off-turn)' : 'Reação';
        html += '<button type="button" class="dnd-res-pill dnd-res-reaction ' + (reactionUsed ? 'spent' : 'available') + '" data-act="dnd-res-info" data-res="reaction" aria-label="Reação">';
        html += '<span class="dnd-res-glyph" aria-hidden="true">⬢</span><span class="dnd-res-label">' + reactionLabel + '</span><span class="dnd-res-state">' + (reactionUsed ? '✗' : '✓') + '</span></button>';
        html += '</div>';
        return html;
    }

    function _updateActionSheetState(s) {
        if (!s || !s.order || s.p_idx == null) return;
        var p = s.order[s.p_idx];
        if (!p) return;
        /* Spent class nos botões de ação principal/secundários. */
        var mainBtns = document.querySelectorAll('.action-btns-grid--main .action-btn, .action-btns-grid--secondary .action-btn');
        for (var bi = 0; bi < mainBtns.length; bi++) {
            var btnEl = mainBtns[bi];
            var actName = btnEl.getAttribute('data-act') || '';
            /* log é livre (não consome ação). Demais botões ficam spent se actionSpent. */
            if (actName === 'log') {
                btnEl.classList.remove('spent');
            } else {
                btnEl.classList.toggle('spent', !!p.actionSpent);
            }
        }
        /* BÔNUS grid: populado com botões "Comandar Arma" quando player tem
           attached summons. Fase 9 (V1 Invocações) completará o fluxo de target
           picker + dispatch attack_summon. Por enquanto deixa grid vazio + escondido
           quando não tem summon. */
        var bonusGrid = document.getElementById('bonus-action-grid');
        if (bonusGrid) {
            var attached = (s.attachedSummons || {})[s.p_idx] || [];
            var hasAttached = attached.length > 0;
            bonusGrid.classList.toggle('has-bonus', hasAttached);
            /* Limpa conteúdo atual. */
            while (bonusGrid.firstChild) bonusGrid.removeChild(bonusGrid.firstChild);
            if (hasAttached) {
                for (var ai = 0; ai < attached.length; ai++) {
                    var sw = attached[ai];
                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'action-btn';
                    btn.dataset.act = 'command-summon';
                    btn.dataset.attachedIdx = String(ai);
                    if (p.bonusActionSpent) {
                        btn.classList.add('spent');
                        btn.setAttribute('aria-disabled', 'true');
                        btn.setAttribute('title', 'Ação Bônus já gasta neste turno');
                    }
                    btn.textContent = (sw.ico || '⚔️') + ' Comandar ' + (sw.name || 'Arma') + ' (' + (sw.durLeft | 0) + 'r)';
                    bonusGrid.appendChild(btn);
                    /* Re-bind (botão criado dinamicamente não passa por bindActions) */
                    btn.addEventListener('click', onBtnClick);
                }
            }
        }
        /* Encerrar Turno: visível quando player já consumiu pelo menos uma ação. */
        var endBtn = document.getElementById('end-turn-btn');
        if (endBtn) {
            endBtn.classList.toggle('visible', !!(p.actionSpent || p.bonusActionSpent));
        }
        /* Focar Familiar: visível quando passive summon vivo existe (Familiar, Sprite,
           Wolf, Warhorse). Fase 9/10 completa o fluxo de target picker + set_focus. */
        var focusBtn = document.getElementById('focus-familiar-btn');
        if (focusBtn) {
            var passiveAlive = false;
            var passiveName = '';
            if (s.order) {
                for (var pi = 0; pi < s.order.length; pi++) {
                    var u = s.order[pi];
                    if (u && u.summonedBy === s.p_idx && u.alive &&
                            (u.summonKind === 'familiar' ||
                             u.summonKind === 'animal_companion' ||
                             u.summonKind === 'find_steed')) {
                        passiveAlive = true;
                        passiveName = u.n || 'Aliado';
                        break;
                    }
                }
            }
            focusBtn.style.display = passiveAlive ? 'block' : 'none';
            if (passiveAlive) {
                focusBtn.textContent = '🎯 Focar ' + passiveName;
            }
        }
        /* V1.5 F1 — Comandar Companheiro só visível pra Patrulheiro Beast Master
           com Wolf vivo (animal_companion). Spent quando ação principal já gasta. */
        var cmdBtn = document.getElementById('command-companion-btn');
        if (cmdBtn) {
            var wolfAlive = false;
            if (s.order) {
                for (var wi = 0; wi < s.order.length; wi++) {
                    var u = s.order[wi];
                    if (u && u.summonKind === 'animal_companion' && u.summonedBy === s.p_idx && u.alive) {
                        wolfAlive = true; break;
                    }
                }
            }
            cmdBtn.style.display = wolfAlive ? 'block' : 'none';
            if (wolfAlive) cmdBtn.classList.toggle('spent', !!p.actionSpent);
        }
        /* V1.5 E2 — Mount/Dismount só visível pra Paladino com Steed vivo (find_steed).
           Toggle muda label baseado em p.mounted; free 1×/turno via p.mountedThisTurn. */
        var mountBtn = document.getElementById('mount-toggle-btn');
        if (mountBtn) {
            var steedAlive = false;
            if (s.order) {
                for (var msi = 0; msi < s.order.length; msi++) {
                    var us = s.order[msi];
                    if (us && us.summonKind === 'find_steed' && us.summonedBy === s.p_idx && us.alive) {
                        steedAlive = true; break;
                    }
                }
            }
            if (steedAlive) {
                mountBtn.style.display = 'block';
                mountBtn.textContent = p.mounted ? '🚶 Desmontar' : '🐴 Montar';
                mountBtn.classList.toggle('spent', !!p.mountedThisTurn);
                if (p.mountedThisTurn) {
                    mountBtn.title = 'Já montou/desmontou neste turno (PHB: 1×)';
                } else {
                    mountBtn.removeAttribute('title');
                }
            } else {
                mountBtn.style.display = 'none';
            }
        }
    }

    /* ============================================================
     * BINDING
     * ============================================================ */
    var _bfPanZoomTeardown = null;
    function mountBattlefieldPanZoom() {
        if (_bfPanZoomTeardown) {
            try { _bfPanZoomTeardown(); } catch (ePz) {}
            _bfPanZoomTeardown = null;
        }
        var vp = document.querySelector('[data-bf-pan-viewport]');
        if (!vp || !window.ValdoriaBattlefieldPanZoom) return;
        _bfPanZoomTeardown = ValdoriaBattlefieldPanZoom.attach(vp);
    }

    function bindActions() {
        document.querySelectorAll('[data-act]').forEach(function (b) { b.addEventListener('click', onBtnClick); });
        /* Cards clicaveis */
        document.querySelectorAll('[data-clickable="1"]').forEach(function (c) {
            c.addEventListener('click', function (ev) {
                var uid = this.getAttribute('data-unit-id');
                /* FIX (2026-04-20): quando em modo de seleção de alvo,
                   qualquer click no card inimigo/aliado deve confirmar.
                   O guard closest('button') antes impedia click porque
                   .c-cond-chip (condições buff/debuff) é <button> e capturava
                   cliques. Agora só bloqueamos botões REAIS de ação (data-act). */
                var clickedBtn = ev.target.closest('button');
                var isActionBtn = clickedBtn && clickedBtn.hasAttribute('data-act');
                if (_selectingTarget && uid && uid.indexOf('enemy_') === 0) {
                    if (isActionBtn) return;  // só bloqueia botão real de ação
                    console.info('[C2] target select enemy', uid);
                    showTargetConfirm(parseInt(uid.slice(6), 10));
                    return;
                }
                if ((_selectHealTarget || _pendingHealItem) && uid === 'player') {
                    if (isActionBtn) return;
                    showHealTargetConfirm(currentState.p_idx);
                    return;
                }
                if ((_selectHealTarget || _pendingHealItem) && uid && uid.indexOf('ally_') === 0) {
                    if (isActionBtn) return;
                    var aixH = parseInt(uid.slice(5), 10);
                    if (!isNaN(aixH)) showHealTargetConfirm(aixH);
                    return;
                }
                /* Fora do modo de seleção: clicar em botão dentro do card
                   (ex: chip de condição) NÃO deve abrir o detalhe do unit. */
                if (clickedBtn) return;
                openUnitDetail(uid);
            });
        });
        /* Mini Dice3D no CTA intro */
        var ctaMount = document.getElementById('ctaDiceMount');
        if (ctaMount && window.Dice3D && !ctaMount._d3d) {
            try {
                var dCta = new Dice3D(ctaMount, { size: 56, dieType: 'd20', duration: 2400 });
                ctaMount._d3d = dCta;
                (function loopCta() {
                    if (!document.body.contains(ctaMount)) { try { dCta.dispose(); } catch (e) {} return; }
                    dCta.roll(1 + Math.floor(Math.random() * 20), function () { setTimeout(loopCta, 600); });
                })();
            } catch (e) { console.warn('[C2] CTA dice failed', e); }
        }
        mountBattlefieldPanZoom();
    }

    async function onBtnClick(ev) {
        tryValdoriaAudioInit();
        unlockCombat2OscFallback();
        var b = ev.currentTarget;
        var act = b.dataset.act;
        if (act === 'close') {
            await leaveCombatToOrigin();
            return;
        }
        if (act === 'cancel-target') {
            _selectingTarget = false;
            _selectHealTarget = false;
            _pendingHealItem = null;
            _pendingSkill = null;
            _pendingSkillSlot = null;
            _pendingPowerAttack = false;
            _actionSheetOpen = false;
            render(currentState);
            return;
        }
        if (act === 'toggle-actions') {
            _actionSheetOpen = !_actionSheetOpen;
            render(currentState);
            return;
        }
        if (act === 'close-action-sheet') {
            _actionSheetOpen = false;
            render(currentState);
            return;
        }
        if (act === 'skills') {
            _actionSheetOpen = false;
            render(currentState);
            openSkillsPanel();
            return;
        }
        if (act === 'bag') {
            _actionSheetOpen = false;
            render(currentState);
            openBagPanel();
            return;
        }
        if (act === 'attack') {
            _actionSheetOpen = false;
            _pendingHealItem = null;
            _pendingSkill = null;
            _pendingSkillSlot = null;
            _pendingPowerAttack = false;
            var aliveIdxs = [];
            if (currentState && currentState.order) {
                for (var ai = 0; ai < currentState.order.length; ai++) {
                    var oc = currentState.order[ai];
                    if (oc && oc.t === 'e' && oc.alive) aliveIdxs.push(ai);
                }
            }
            if (aliveIdxs.length === 1) {
                render(currentState);
                showTargetConfirm(aliveIdxs[0]);
                return;
            }
            _selectingTarget = true;
            render(currentState);
            return;
        }
        if (act === 'next') { await remoteAction({ type: 'next' }); animInitFromBackend(); return; }
        if (act === 'skip-init') {
            _skipInit = true;
            if (_activeDiceClose) _activeDiceClose();
            return;
        }
        if (act === 'start') { closeInitiativeOrderPopup(); await remoteAction({ type: 'start' }); return; }
        if (act === 'flee') {
            _actionSheetOpen = false;
            render(currentState);
            await remoteAction({ type: 'flee' });
            return;
        }
        if (act === 'pass') {
            _actionSheetOpen = false;
            render(currentState);
            await remoteAction({ type: 'pass' });
            return;
        }
        /* V1 Invocações Phase 4 V1-Visual (Fase 5 port, 2026-04-20) — click em pílula
           do HUD recursos abre popup com regra PHB detalhada + status atual. */
        if (act === 'dnd-res-info') {
            var resKind = b.dataset.res;
            var pDr = currentState && currentState.order ? currentState.order[currentState.p_idx] : null;
            var info = null;
            if (resKind === 'action') {
                var phbBlock = (pDr && pDr.bonusActionWasSpell)
                    ? '<p style="color:#ffe080"><strong>✨ PHB p.202 (BA Spell Rule):</strong></p>' +
                      '<p style="color:#ffe080">Você castou uma magia com tempo de Ação Bônus neste turno. Como sua ação principal:</p>' +
                      '<p style="color:#a0e8a0">✅ <strong>Permitido:</strong> Atacar com arma, Usar item da Mochila, Esquivar, Fugir, Passar turno, ou castar um <strong>TRUQUE</strong> (cantrip).</p>' +
                      '<p style="color:#e0a0a0">❌ <strong>Bloqueado:</strong> Castar qualquer outra magia leveled (Cura, Bola de Fogo, Bênção, etc.).</p>' +
                      '<p style="color:#a09484; font-size:0.95em">A restrição reseta no início do seu próximo turno.</p>'
                    : '';
                info = {
                    title: '◆ Ação',
                    rule: 'PHB p.189-190 — Cada criatura tem 1 ação por turno: Atacar, Lançar Magia, Esquivar, Disparar, Ajudar, Esconder, Pressionar, Procurar, Usar Objeto, ou ações de classe.',
                    state: (pDr && pDr.actionSpent) ? 'GASTA neste turno (reseta no início do próximo).' : 'DISPONÍVEL.',
                    extra: phbBlock
                };
            } else if (resKind === 'bonus') {
                info = {
                    title: '▲ Ação Bônus',
                    rule: 'PHB p.189 — Apenas se você tiver uma habilidade de classe ou magia que conceda. Ex.: Atacar com arma secundária (Two-Weapon Fighting), Bardic Inspiration, Comandar Arma Espiritual (PHB p.278), Cunning Action do Ladino, etc.',
                    state: (pDr && pDr.bonusActionSpent) ? 'GASTA neste turno (reseta no início do próximo).' : 'DISPONÍVEL.',
                    extra: (pDr && pDr.bonusActionWasSpell) ? '<p>Esta BA foi um <strong>cast de magia BA</strong> (aciona regra PHB p.202).</p>' : ''
                };
            } else if (resKind === 'reaction') {
                info = {
                    title: '⬢ Reação',
                    rule: 'PHB p.190 — Resposta INSTANTÂNEA a um trigger; pode ocorrer no SEU turno OU no de OUTRO combatente.<br><br>' +
                          '<strong>Regras:</strong><br>' +
                          '· 1 reação por RODADA (não por turno).<br>' +
                          '· Reseta no INÍCIO do seu próximo turno.<br>' +
                          '· Se interrompe outra criatura, ela continua o turno após a reação.<br><br>' +
                          '<strong>Triggers comuns:</strong><br>' +
                          '· Ataque de Oportunidade: inimigo se afasta da sua zona de ameaça.<br>' +
                          '· Escudo Arcano (PHB p.275): você é alvo de ataque ou Mísseis Mágicos → +5 CA até início do próximo turno.<br>' +
                          '· Contramágica (PHB p.237): outro conjurador casta uma magia que você vê.<br>' +
                          '· Castigo Divino (Paladino): pode usar Smite após ataque que acerta.',
                    state: (pDr && pDr.reactionSpent) ? 'GASTA nesta rodada (reseta no início do seu próximo turno).' : 'DISPONÍVEL — pode ser triggered agora.',
                    extra: ''
                };
            }
            if (info && typeof showMessage === 'function') {
                showMessage(info.title, 'info', info.rule + '<br><br><strong>Status:</strong> ' + info.state + (info.extra || ''));
            }
            return;
        }
        /* V1 Invocações Phase 1 (Fase 4 port, 2026-04-20) — PHB p.190: jogador pode
           encerrar o turno explicitamente quando tem BA pendente e quer pular.
           Força avanço via action 'end_turn' (motor força _advance_after_player_turn
           com force=True, independente de BA pendente). */
        if (act === 'end-turn') {
            _actionSheetOpen = false;
            render(currentState);
            await remoteAction({ type: 'end_turn' });
            return;
        }
        /* Focar Familiar: por enquanto só loga — target picker virá com Fase 9/10.
           Quando implementado: entra em modo _selectingTarget e ao clicar inimigo
           envia {type: 'set_focus', summonIdx, targetIdx}. */
        if (act === 'focus-familiar') {
            console.log('[COMBAT2] focus-familiar clicked — target picker pending Fase 9');
            return;
        }
        /* Comandar Arma Espiritual: análogo ao focus — target picker virá com Fase 8 completa.
           Quando implementado: seleciona inimigo, envia {type: 'attack_summon',
           summonAttachedIdx, target}. */
        if (act === 'command-summon') {
            console.log('[COMBAT2] command-summon clicked — target picker pending', b.dataset.attachedIdx);
            return;
        }
        /* V1.5 F1 — Comandar Companheiro (Patrulheiro Beast Master).
           Consome Ação principal; abre target picker; envia attack_summon (animal_companion). */
        if (act === 'command-companion') {
            console.log('[COMBAT2] command-companion clicked — target picker pending');
            return;
        }
        /* V1.5 E2 — Mount/Dismount (Paladino) free 1×/turno.
           Envia mount_toggle pro motor (handler Python pendente). */
        if (act === 'mount-toggle') {
            _actionSheetOpen = false;
            render(currentState);
            try {
                await remoteAction({ type: 'mount_toggle' });
            } catch (e) {
                console.warn('[COMBAT2] mount_toggle handler may not be implemented yet', e);
            }
            return;
        }
        if (act === 'death-save') {
            _actionSheetOpen = false;
            render(currentState);
            await remoteAction({ type: 'death_save' });
            return;
        }
        if (act === 'stabilize-med') {
            _actionSheetOpen = false;
            render(currentState);
            var okMed = await showMetaActionConfirm({
                line1: 'Medicina (aliado)',
                line2: 'Sabedoria CD 10 (PHB)',
                bullets: [
                    'Um aliado consciente gasta a ação para tentar estabilizar você a 0 PV.',
                    'Rolagem: 1d20 + modificador de Sabedoria do aliado; CD 10.'
                ],
                note: '',
                confirmLabel: 'Rolar',
                cancelLabel: 'Cancelar'
            });
            if (okMed) await remoteAction({ type: 'stabilize_med' });
            return;
        }
        if (act === 'pass-down') {
            await remoteAction({ type: 'pass_down' });
            return;
        }
        if (act === 'dodge') {
            _actionSheetOpen = false;
            render(currentState);
            var okDodge = await showMetaActionConfirm({
                line1: 'Esquivar',
                line2: 'Ação (PHB)',
                bullets: [
                    'Ataques contra você têm desvantagem se você enxergar o atacante — até o início do seu próximo turno.',
                    'Testes de TR de Destreza com vantagem no mesmo período.',
                    'Gasta sua ação agora.'
                ],
                note: '',
                confirmLabel: 'Usar ação',
                cancelLabel: 'Cancelar'
            });
            if (okDodge) await remoteAction({ type: 'dodge' });
            return;
        }
        if (act === 'disengage') {
            var okDis = await showMetaActionConfirm({
                line1: 'Desengajar',
                line2: 'Ação (PHB)',
                bullets: [
                    'Seu deslocamento não provoca ataques de oportunidade neste turno.',
                    'Gasta sua ação agora.'
                ],
                confirmLabel: 'Usar ação',
                cancelLabel: 'Cancelar'
            });
            if (okDis) await remoteAction({ type: 'disengage' });
            return;
        }
        if (act === 'log') {
            _actionSheetOpen = false;
            render(currentState);
            openCombatLog();
            return;
        }
    }

    async function confirmPendingAction(tgtIdx) {
        _selectingTarget = false;
        _selectHealTarget = false;
        var slot = _pendingSkillSlot;
        var pa = _pendingPowerAttack;
        var bagHeal = _pendingHealItem;
        _pendingSkillSlot = null;
        _pendingSkill = null;
        _pendingPowerAttack = false;
        _pendingHealItem = null;
        render(currentState);
        if (bagHeal && bagHeal.bagIdx != null) {
            await remoteAction({ type: 'use_item', slot: bagHeal.bagIdx, target: tgtIdx });
            return;
        }
        if (slot != null && slot >= 0) {
            await remoteAction({ type: 'skill', slot: slot, target: tgtIdx });
        } else {
            await remoteAction({ type: 'attack', target: tgtIdx, powerAttack: !!pa });
        }
    }

    /* ============================================================
     * ACTIONS: POST /api/combat2 + replay events
     * ============================================================ */
    function promptShieldReaction(ev) {
        return new Promise(function (resolve) {
            var ov = document.createElement('div');
            ov.className = 'target-confirm-overlay';
            var card = document.createElement('div');
            card.className = 'target-confirm-card';
            var nm = ev.actorName || 'Inimigo';
            var tot = (ev.d20 != null ? ev.d20 : '?') + '+' + (ev.atk != null ? ev.atk : '?') + '=' + (ev.total != null ? ev.total : '?');
            var html = '<div class="tcc-title">Reação — Escudo Arcano</div>';
            html += '<p class="c2-info-intro c2-info-intro--inline"><strong>' + escHtml(nm) + '</strong> acerta em você (' + escHtml(tot) + ' vs CA ' + (ev.ac != null ? ev.ac : '?') + ').</p>';
            html += '<p class="c2-info-intro c2-info-intro--inline">Gastar <strong>' + (ev.shieldCost | 0) + '</strong> de mana para somar +5 à CA contra este ataque (PHB)?</p>';
            html += '<div class="tcc-actions"><button type="button" class="action-btn" data-rs="0">Não usar</button>';
            html += '<button type="button" class="action-btn primary" data-rs="1">Usar Escudo</button></div>';
            setHTML(card, html);
            ov.appendChild(card);
            vOverlay.add(ov);
            function done(v) {
                try { ov.remove(); } catch (eR) {}
                resolve(!!v);
            }
            ov.addEventListener('click', function (e) { if (e.target === ov) done(false); });
            card.querySelector('[data-rs="0"]').addEventListener('click', function () { done(false); });
            card.querySelector('[data-rs="1"]').addEventListener('click', function () { done(true); });
        });
    }

    async function drainCombatEventQueue(initialEvs, offerSkip) {
        var originalBatch = (initialEvs || []).slice();
        var queue = originalBatch.slice();
        var terminalReplay =
            currentState &&
            (currentState.ph === 'victory' || currentState.ph === 'defeat' || currentState.ph === 'fled') &&
            queue.length > 0;
        var prevSuppress = _suppressTerminalDuringReplay;
        if (terminalReplay) {
            _suppressTerminalDuringReplay = true;
        }
        try {
        while (queue.length) {
            var ev = queue.shift();
            if (!ev) continue;
            if (ev.kind === 'reaction_prompt' && ev.subtype === 'shield') {
                var use = await promptShieldReaction(ev);
                var r2 = null;
                var reactFail = '';
                for (var ri = 0; ri < 2; ri++) {
                    try {
                        r2 = await dispatchAction({ type: 'reaction_resolve', useShield: use });
                        if (r2 && r2.error) {
                            reactFail = String(r2.error);
                            r2 = null;
                        } else if (r2 && r2.state) {
                            reactFail = '';
                            break;
                        } else {
                            reactFail = 'invalid_response';
                            r2 = null;
                        }
                    } catch (ePost) {
                        reactFail = (ePost && ePost.message) ? String(ePost.message) : 'network';
                        r2 = null;
                    }
                    if (ri < 1) await sleep(380);
                }
                if (!r2 || !r2.state) {
                    console.error('[COMBAT2]', 'reaction_resolve_failed', reactFail || '');
                    var synced = await resyncCombat2State('reaction_resolve_resync');
                    c2NotifyReactionRecover(
                        synced
                            ? 'Nao foi possivel confirmar o Escudo Arcano; o estado foi atualizado. Se algo parecer errado, feche e reabra o combate pelo bot.'
                            : 'Nao foi possivel confirmar o Escudo Arcano nem sincronizar. Verifique a conexao e tente de novo.'
                    );
                    return;
                }
                currentState = r2.state;
                render(currentState);
                if (r2.events && r2.events.length) {
                    queue = r2.events.concat(queue);
                }
                continue;
            }
            if (_skipReplayBatch) {
                showBatchSummaryPopup(originalBatch);
                _skipReplayBatch = false;
                return;
            }
            await playEvent(ev, offerSkip);
        }
        } finally {
            if (terminalReplay) {
                _suppressTerminalDuringReplay = prevSuppress;
            }
        }
    }

    async function remoteAction(action) {
        try {
            var resp = await dispatchAction(action);
            if (resp.error) { console.warn('[C2]', resp.error); return; }
            var evs = resp.events || [];
            var offerSkip = shouldOfferBatchSkip();
            _skipReplayBatch = false;
            currentState = resp.state;
            var phNow = currentState && currentState.ph;
            var isTerminal = phNow === 'victory' || phNow === 'defeat' || phNow === 'fled';
            var skipPrematureTerminal = !!(isTerminal && evs.length);
            if (!skipPrematureTerminal) {
                render(currentState);
            }
            if (evs.length) {
                await drainCombatEventQueue(evs, offerSkip);
            }
            render(currentState);
            if (currentState.ph === 'init_done') showInitiativeOrderPopup();
        } catch (e) { console.error('[C2] action failed', e); }
    }

    async function playEvent(ev, offerSkipGlob) {
        if (ev && ev.kind === 'reaction_prompt') return;
        var oSkin = offerAnimSkipForEvent(ev, offerSkipGlob);
        if (ev.kind === 'attack' || ev.kind === 'oa') return animateAttackEvent(ev, oSkin);
        if (ev.kind === 'heal') return animateHealEvent(ev, oSkin);
        if (ev.kind === 'buff') return animateBuffEvent(ev, oSkin);
        if (ev.kind === 'resource') return animateResourceEvent(ev, oSkin);
        if (ev.kind === 'item_use') return animateItemUseEvent(ev, oSkin);
        if (ev.kind === 'concentration_save') return animateConcentrationSaveEvent(ev, oSkin);
        if (ev.kind === 'concentration_lost') return animateConcentrationLostEvent(ev, oSkin);
        /* V1 Invocações + W2 Conjurar Animais — summon events (Fases 9-12 port). */
        if (ev.kind === 'summon_cast') return animateSummonCastEvent(ev, oSkin);
        if (ev.kind === 'summon_attack') return animateSummonAttackEvent(ev, oSkin);
        if (ev.kind === 'summon_expire') return animateSummonExpireEvent(ev, oSkin);
        if (ev.kind === 'summon_pack_cast') return animateSummonPackCastEvent(ev, oSkin);
        if (ev.kind === 'bonus_action_used') return animateBonusActionUsedEvent(ev, oSkin);
        if (ev.kind === 'flee') return animateFleeEvent(ev, oSkin);
        if (ev.kind === 'death_save') {
            var whoDs = currentState.order[ev.tIdx];
            await new Promise(function (resolve) {
                showDice(ev.d20, resolve, whoDs, 'Teste de morte', {
                    offerBatchSkip: !!offerSkipGlob,
                    postResult: function () {
                        return {
                            title: 'Teste de morte',
                            cls: 'hit',
                            subStructured: {
                                kicker: '1d20',
                                rows: [{ l: 'Resultado', v: String(ev.d20) }],
                                note: 'PHB: acumula sucessos (10+) ou falhas (9-); 1 natural = duas falhas; 20 natural = 1 PV.'
                            }
                        };
                    }
                });
            });
            render(currentState);
            return;
        }
        if (ev.kind === 'round') {
            currentState.rn = ev.rn;
            render(currentState);
            if (_skipReplayBatch) return;
            await sleep(400);
            return;
        }
        if (ev.kind === 'condition_save') {
            var oSkinCs = offerAnimSkipForEvent(ev, offerSkipGlob);
            var whoCs = currentState.order[ev.tIdx];
            var abCs = (ev.saveAbility || 'dex').toLowerCase();
            var abLong = abCs === 'str' ? 'Força' : abCs === 'con' ? 'Constituição' : abCs === 'int' ? 'Inteligência' :
                abCs === 'wis' ? 'Sabedoria' : abCs === 'cha' ? 'Carisma' : 'Destreza';
            var ttlCs = (ev.conditionName || 'Condição') + ' \u2014 TR ' + abLong + ' (fim do turno, PHB)';
            await new Promise(function (resolve) {
                showDice(ev.saveD20, resolve, whoCs, ttlCs + ' vs CD ' + ev.saveDc, {
                    offerBatchSkip: !!oSkinCs,
                    postResult: function () {
                        return {
                            title: ev.saveSuccess ? 'Efeito termina' : 'Efeito mantém-se',
                            cls: ev.saveSuccess ? 'hit' : 'miss',
                            subStructured: {
                                kicker: 'Teste de resistência',
                                rows: [
                                    { l: 'Total', v: (ev.saveD20 != null ? ev.saveD20 : '?') + ' + ' + (ev.saveMod != null ? ev.saveMod : '?') + ' = ' + (ev.saveTotal != null ? ev.saveTotal : '?') },
                                    { l: 'CD', v: String(ev.saveDc) }
                                ],
                                note: ev.saveSuccess ? 'Sucesso: a condição termina (SRD/PHB).' : 'Falha: dura enquanto a magia indicar.'
                            }
                        };
                    }
                });
            });
            render(currentState);
            return;
        }
        if (ev.kind === 'condition_expire') {
            if (_skipReplayBatch) return;
            await sleep(220);
            return;
        }
        if (ev.kind === 'sanctuary_save') {
            var oSkSan = offerAnimSkipForEvent(ev, offerSkipGlob);
            var attacker = currentState.order[ev.aIdx];
            var tgt = currentState.order[ev.tIdx];
            var ttlSan = 'Santuário \u2014 TR Sabedoria (PHB)';
            // Em falha do atacante, toca VFX de bloqueio dourado na cúpula do alvo.
            if (ev.saveSuccess === false) {
                setTimeout(function () { playSanctuaryBlockVfx(ev.tIdx); }, 350);
            }
            await new Promise(function (resolve) {
                showDice(ev.saveRoll, resolve, attacker, ttlSan + ' vs CD ' + ev.saveDc, {
                    offerBatchSkip: !!oSkSan,
                    postResult: function () {
                        return {
                            title: ev.saveSuccess ? 'Passou \u2014 ataca normalmente' : 'Falhou \u2014 ataque anulado',
                            cls: ev.saveSuccess ? 'hit' : 'miss',
                            subStructured: {
                                kicker: (attacker && attacker.n ? attacker.n : 'Atacante') + ' vs ' + (tgt && tgt.n ? tgt.n : 'alvo') + ' (Santuário)',
                                rows: [
                                    { l: 'Total', v: (ev.saveRoll != null ? ev.saveRoll : '?') + ' + ' + (ev.saveMod != null ? ev.saveMod : '?') + ' = ' + (ev.saveTotal != null ? ev.saveTotal : '?') },
                                    { l: 'CD', v: String(ev.saveDc) }
                                ],
                                note: ev.saveSuccess ? 'Sucesso: pode atacar o alvo protegido.' : 'Falha: ataque anulado (PHB — Santuário).'
                            }
                        };
                    }
                });
            });
            render(currentState);
            return;
        }
    }

    async function animateAttackEvent(ev, offerSkip) {
        if (shouldFastForwardAttack(ev)) {
            syncAttackOutcomeFromEvent(ev);
            return;
        }
        var actor = currentState.order[ev.aIdx];
        var target = currentState.order[ev.tIdx];
        if (!actor || !target) return;
        /* Ajusta HP local para o antes-do-evento (backend ja aplicou no state final) */
        if (ev.hit) target.hp = ev.oldHp;
        render(currentState);
        if (shouldFastForwardAttack(ev)) {
            syncAttackOutcomeFromEvent(ev);
            return;
        }
        await sleep(200);
        if (shouldFastForwardAttack(ev)) {
            syncAttackOutcomeFromEvent(ev);
            return;
        }
        var actionLabel = ev.kind === 'oa'
            ? 'Ataque de oportunidade → ' + target.n
            : (ev.skillName ? (ev.skillName + ' → ' + target.n) : ('Ataca ' + target.n + ' (CA ' + target.ac + ')'));

        var dmgCritUi = !!(ev.crit && !ev.autoHit && ev.saveDc == null);

        if (ev.autoHit) {
            /* 1A: Mísseis e similares — só dano + VFX, sem overlay extra de “acerto automático”. */
            await sleep(140);
        } else if (ev.saveDc != null) {
            var saveAb = (ev.saveAbility || 'dex').toLowerCase() === 'con' ? 'Constituição' : 'Destreza';
            await new Promise(function (x) {
                showDice(ev.saveD20, x, target, (ev.skillName || 'Magia') + ' — TR ' + saveAb + ' vs CD ' + ev.saveDc, {
                    combatTarget: actor,
                    offerBatchSkip: !!offerSkip,
                    postResult: function () {
                        return {
                            title: ev.saveSuccess ? 'Passou na resistência' : 'Falhou na resistência',
                            cls: ev.saveSuccess ? 'miss' : 'hit',
                            subStructured: {
                                kicker: 'Teste de resistência',
                                rows: [
                                    { l: 'Total', v: (ev.saveD20 != null ? ev.saveD20 : '?') + ' + ' + (ev.saveMod != null ? ev.saveMod : '?') + ' = ' + (ev.saveTotal != null ? ev.saveTotal : '?') },
                                    { l: 'Classe de dificuldade', v: String(ev.saveDc) }
                                ],
                                note: ev.saveSuccess
                                    ? 'Metade do dano (ex.: Bola de Fogo, PHB).'
                                    : 'Dano integral.'
                            }
                        };
                    },
                    onAttackRollResolved: function () {
                        try {
                            if (ev.saveSuccess && typeof sfxMiss === 'function') {
                                sfxMiss();
                            } else if (typeof sfxHit === 'function') {
                                sfxHit();
                            }
                        } catch (eSfx0) {}
                    }
                });
            });
        } else {
            /* Overlay 1: d20 vs CA */
            await new Promise(function (x) {
                showDice(ev.d20, x, actor, actionLabel, {
                    offerBatchSkip: !!offerSkip,
                    postResult: function () {
                        if (ev.crit) {
                            return {
                                title: 'Acerto crítico',
                                cls: 'crit',
                                subStructured: {
                                    kicker: 'Natural 20 no d20',
                                    intro: 'Dados de dano em dobro antes de somar o modificador de atributo (uma vez), conforme PHB.',
                                    rows: [{ l: 'Jogada de ataque', v: '20 + ' + ev.atk + ' = ' + ev.total }]
                                }
                            };
                        }
                        if (ev.hit) {
                            return {
                                title: 'Acertou',
                                cls: 'hit',
                                subStructured: {
                                    kicker: 'Confronto com a CA',
                                    rows: [
                                        { l: 'Total do ataque', v: ev.d20 + ' + ' + ev.atk + ' = ' + ev.total },
                                        { l: 'Classe de Armadura', v: String(ev.ac) }
                                    ],
                                    note: 'Total igual ou superior à CA do alvo.'
                                }
                            };
                        }
                        if (ev.miss_reason === 'falha_critica') {
                            return {
                                title: 'Falha automática',
                                cls: 'miss',
                                subStructured: {
                                    kicker: 'Natural 1 no d20',
                                    intro: 'O ataque erra, sem comparar com a Classe de Armadura.',
                                    rows: [{ l: 'Face do d20', v: '1' }]
                                }
                            };
                        }
                        return {
                            title: 'Ataque não atinge',
                            cls: 'miss',
                            subStructured: {
                                kicker: 'Alvo: ' + target.n,
                                rows: [
                                    { l: 'Total do ataque', v: ev.d20 + ' + ' + ev.atk + ' = ' + ev.total },
                                    { l: 'Classe de Armadura', v: String(ev.ac) }
                                ],
                                note: 'Total inferior à CA — o golpe não causa dano.'
                            }
                        };
                    },
                    onAttackRollResolved: function () {
                        try {
                            if (ev.crit && typeof sfxCrit === 'function') {
                                sfxCrit();
                            } else if (ev.hit && typeof sfxHit === 'function') {
                                sfxHit();
                            } else if (typeof sfxMiss === 'function') {
                                sfxMiss();
                            }
                        } catch (eSfx) {}
                    }
                });
            });
        }

        if (shouldFastForwardAttack(ev)) {
            syncAttackOutcomeFromEvent(ev);
            return;
        }
        if (!ev.hit) return;

        /* Pausa curta entre overlay de d20 e overlay de dano — olho reorienta. */
        await sleep(350);

        /* Overlay 2: dado de dano + card animado */
        var dmgDie = ev.dmgDie != null ? ev.dmgDie : actor.die;
        var dmgModUi = (ev.dmgMod | 0) + (ev.dmgSpecFlat | 0);
        await showDamageDice(ev.dmgRolls, dmgDie, dmgCritUi, actor, target, ev.oldHp, ev.newHp, dmgModUi, {
            offerBatchSkip: !!offerSkip,
            dmgType: ev.dmgType || 'slashing'
        });

        if (shouldFastForwardAttack(ev)) {
            syncAttackOutcomeFromEvent(ev);
            return;
        }
        /* Sincroniza HP local para o depois-do-evento */
        target.hp = ev.newHp;
        target.alive = ev.newHp > 0;
        render(currentState);
        var uid = ev.tIdx === currentState.p_idx ? 'player' : 'enemy_' + ev.tIdx;
        /* Pausa curta entre overlay de dano e impacto VFX na arena — ritmo narrativo. */
        await sleep(400);
        arenaStrikeFromEvent(ev);
        await sleep(120);
    }

    async function animateHealEvent(ev, offerSkip) {
        if (_skipReplayBatch && isEventFromOtherCombatant(ev)) {
            syncHealOutcomeFromEvent(ev);
            return;
        }
        var target = currentState.order[ev.tIdx];
        var actor = currentState.order[ev.aIdx];
        if (!target || !actor) return;
        if (ev.oldHp != null) target.hp = ev.oldHp;
        render(currentState);
        var subHeal = {
            kicker: 'Cura aplicada',
            intro: (ev.skillName || 'Cura') + ': ' + (ev.actorName || '') + ' → ' + (ev.targetName || ''),
            rows: [
                { l: 'PV recuperados', v: '+' + (ev.healGained | 0) },
                { l: 'Total rolado', v: (ev.healRolled != null ? String(ev.healRolled) : '—') }
            ],
            note: 'Valores efetivos podem ser limitados pelo PV máximo do alvo.'
        };
        await showMessage('Cura', 'hit', subHeal, { offerBatchSkip: !!offerSkip });
        if (ev.newHp != null) {
            target.hp = ev.newHp;
            target.alive = target.hp > 0;
        }
        render(currentState);
    }

    async function animateBuffEvent(ev, offerSkip) {
        if (_skipReplayBatch && isEventFromOtherCombatant(ev)) return;
        // VFX profissional por habilidade: cada buff D&D 5e tem seu próprio visual.
        if (ev) {
            try {
                ensureCombatVfxRuntime();
                var actorUid = ev.aIdx === currentState.p_idx ? 'player' : 'enemy_' + ev.aIdx;
                var actorEl = document.querySelector('[data-unit-id="' + actorUid + '"]');
                if (window._combatVfx && actorEl) {
                    var snm = ev.skillName;
                    if (snm === 'Santuário') window._combatVfx.sanctuary(actorEl);
                    else if (snm === 'Fúria') window._combatVfx.buffRage(actorEl);
                    else if (snm === 'Escudo Arcano') window._combatVfx.buffArcaneShield(actorEl);
                    else if (snm === 'Postura Defensiva' || snm === 'Aura de Proteção') {
                        window._combatVfx.buffDefense(actorEl);
                    }
                    else if (snm === 'Bênção' || snm === 'Inspiração' || snm === 'Marca do Caçador') {
                        window._combatVfx.buffBless(actorEl);
                    }
                    else if (snm === 'Esquiva' || snm === 'Passos Silenciosos') {
                        window._combatVfx.buffStealth(actorEl);
                    }
                }
            } catch (eVfxS) { console.warn('[COMBAT2]', 'vfx_buff_specific_failed', eVfxS || ''); }
        }
        var subBuff = {
            kicker: 'Efeito em estado',
            intro: (ev.skillName || 'Buff tático') + ' em ' + (ev.actorName || 'combatente'),
            rows: [{ l: 'Duração restante', v: (ev.turnsLeft | 0) + ' turno(s)' }],
            note: 'O efeito segue ativo até expirar ou ser removido pelo combate.'
        };
        await showMessage(ev.skillName || 'Buff tático', 'hit', subBuff, { offerBatchSkip: !!offerSkip });
        // ≥1s desde o fim do VFX específico (cada buff tem duração diferente).
        if (ev && ev.skillName) {
            var longCasts = ['Santuário', 'Fúria', 'Escudo Arcano', 'Postura Defensiva', 'Aura de Proteção',
                             'Bênção', 'Inspiração', 'Marca do Caçador', 'Esquiva', 'Passos Silenciosos'];
            if (longCasts.indexOf(ev.skillName) >= 0) await sleep(1000);
        }
    }

    /* ============================================================
     * VFX DISPATCHER — escolhe o VFX certo por skill / dmg type / flags
     * Regras de decisão (D&D 5e + projeto):
     *  - Skill específica > tipo físico/mágico > fallback projétil
     *  - Habilidades marcadas `ranged:true` → arrow/projectile com arco
     *  - Slashing/bludgeoning sem `ranged` → slash arc (corpo-a-corpo)
     *  - Piercing sem `ranged` → thrust (ainda usa projectile curto)
     * ============================================================ */
    function _skillByName(aIdx, name) {
        try {
            var u = currentState && currentState.order && currentState.order[aIdx];
            if (!u || !u.skills) return null;
            for (var i = 0; i < u.skills.length; i++) {
                if (u.skills[i] && u.skills[i].n === name) return u.skills[i];
            }
        } catch (e) {}
        return null;
    }
    function _isRangedEv(ev) {
        if (!ev) return false;
        var sk = ev.skillName ? _skillByName(ev.aIdx, ev.skillName) : null;
        if (sk && sk.ranged) return true;
        // heurística: tipos mágicos distantes
        var dt = ev.dmgType || '';
        if (['fire', 'cold', 'lightning', 'force', 'radiant', 'necrotic', 'psychic', 'thunder', 'acid', 'poison'].indexOf(dt) >= 0) return true;
        return false;
    }
    function dispatchAttackVfx(ev, fromEl, toEl, dt) {
        if (!window._combatVfx) return;
        try {
            // 1) habilidades icônicas dedicadas
            if (ev.skillName === 'Mísseis Mágicos' && fromEl && toEl) {
                window._combatVfx.magicMissiles(fromEl, toEl, 3); return;
            }
            if (ev.skillName === 'Bola de Fogo' && toEl) {
                window._combatVfx.fireballAoE(toEl); return;
            }
            if (ev.skillName === 'Raio Gélido' && fromEl && toEl) {
                window._combatVfx.rayOfFrost(fromEl, toEl, { crit: !!ev.crit }); return;
            }
            if (ev.skillName === 'Disparo Rápido' && fromEl && toEl) {
                window._combatVfx.arrowVolley(fromEl, toEl, 2, dt, { crit: !!ev.crit }); return;
            }
            if (ev.skillName === 'Rajada de Flechas' && fromEl && toEl) {
                window._combatVfx.arrowVolley(fromEl, toEl, 3, dt, { crit: !!ev.crit }); return;
            }
            // 2) ranged genérico → projectile com arco
            if (_isRangedEv(ev) && fromEl && toEl) {
                window._combatVfx.projectile(fromEl, toEl, dt, { crit: !!ev.crit }); return;
            }
            // 3) melee físico → slash arc no alvo
            if (['slashing', 'bludgeoning', 'piercing'].indexOf(dt) >= 0 && fromEl && toEl) {
                window._combatVfx.meleeSlash(fromEl, toEl, dt, { crit: !!ev.crit }); return;
            }
            // 4) fallback
            if (fromEl && toEl) window._combatVfx.projectile(fromEl, toEl, dt, { crit: !!ev.crit });
            else if (toEl) window._combatVfx.impact(toEl, dt, { crit: !!ev.crit });
        } catch (eD) {
            console.warn('[COMBAT2]', 'vfx_dispatch_failed', eD || '');
        }
    }

    function playDodgeVfx(tIdx) {
        try {
            ensureCombatVfxRuntime();
            var uid = tIdx === currentState.p_idx ? 'player' : 'enemy_' + tIdx;
            var el = document.querySelector('[data-unit-id="' + uid + '"]');
            if (window._combatVfx && el) window._combatVfx.dodgeEvade(el);
        } catch (e) { console.warn('[COMBAT2]', 'vfx_dodge_failed', e || ''); }
    }

    function playSanctuaryBlockVfx(tIdx) {
        try {
            ensureCombatVfxRuntime();
            var uid = tIdx === currentState.p_idx ? 'player' : 'enemy_' + tIdx;
            var el = document.querySelector('[data-unit-id="' + uid + '"]');
            if (window._combatVfx && el) window._combatVfx.sanctuaryBlock(el);
        } catch (e) { console.warn('[COMBAT2]', 'vfx_sanctuary_block_failed', e || ''); }
    }

    function playSanctuaryBreakVfx(aIdx) {
        try {
            ensureCombatVfxRuntime();
            var uid = aIdx === currentState.p_idx ? 'player' : 'enemy_' + aIdx;
            var el = document.querySelector('[data-unit-id="' + uid + '"]');
            if (window._combatVfx && el) window._combatVfx.sanctuaryBreak(el);
        } catch (e) { console.warn('[COMBAT2]', 'vfx_sanctuary_break_failed', e || ''); }
    }

    async function animateResourceEvent(ev, offerSkip) {
        if (_skipReplayBatch) return;
        await sleep(120);
    }

    async function animateItemUseEvent(ev, offerSkip) {
        if (_skipReplayBatch && isEventFromOtherCombatant(ev)) return;
        try {
            ensureCombatVfxRuntime();
            var tUid = ev.tIdx === currentState.p_idx ? 'player' : 'enemy_' + ev.tIdx;
            var el = document.querySelector('[data-unit-id="' + tUid + '"]');
            if (window._combatVfx && el) {
                if (ev.subtype === 'heal') {
                    window._combatVfx.healSelf(el);
                    if (ev.healGained != null && ev.healGained >= 8) {
                        setTimeout(function () { try { window._combatVfx.healBurst(el); } catch (e) {} }, 200);
                    }
                } else if (ev.subtype === 'resource') {
                    window._combatVfx.potionMana(el);
                }
            }
        } catch (eI) { console.warn('[COMBAT2]', 'item_use_vfx_failed', eI || ''); }
        var sub = { kicker: ev.itemName || 'Item' };
        if (ev.subtype === 'heal') {
            sub.intro = 'Cura: 2d4+2 (poção padrão)';
            sub.rows = [{ l: 'PV recuperado', v: '+' + (ev.healGained || 0) }];
        } else if (ev.subtype === 'resource') {
            sub.intro = 'Restaura ' + (ev.resName || 'recurso') + '.';
            sub.rows = [{ l: (ev.resName || 'Recurso'), v: '+' + (ev.resGained || 0) }];
        } else {
            sub.intro = 'Consumo de item.';
        }
        await showMessage((ev.itemIco || '🎒') + ' ' + (ev.itemName || 'Item'), 'hit', sub, { offerBatchSkip: !!offerSkip });
        // ≥1s de respiro pós-VFX.
        await sleep(1000);
    }

    async function animateConcentrationSaveEvent(ev, offerSkip) {
        if (_skipReplayBatch) return;
        try {
            ensureCombatVfxRuntime();
            var uid = ev.tIdx === currentState.p_idx ? 'player' : 'enemy_' + ev.tIdx;
            var el = document.querySelector('[data-unit-id="' + uid + '"]');
            if (window._combatVfx && el) window._combatVfx.concentrationSave(el);
        } catch (e) { console.warn('[COMBAT2]', 'concentration_save_vfx_failed', e || ''); }
        var who = currentState.order[ev.tIdx];
        await new Promise(function (resolve) {
            showDice(ev.saveRoll, resolve, who, 'Concentração — TR Constituição (PHB)', {
                offerBatchSkip: !!offerSkip,
                postResult: function () {
                    return {
                        title: ev.saveSuccess ? 'Concentração MANTIDA' : 'Concentração ROMPIDA',
                        cls: ev.saveSuccess ? 'hit' : 'miss',
                        subStructured: {
                            kicker: 'CON save vs CD ' + ev.saveDc + ' (dano ' + (ev.damage || '?') + ')',
                            rows: [
                                { l: 'Total', v: (ev.saveRoll != null ? ev.saveRoll : '?') + ' + ' + (ev.saveMod || 0) + ' = ' + (ev.saveTotal != null ? ev.saveTotal : '?') },
                                { l: 'CD', v: String(ev.saveDc) }
                            ],
                            note: ev.saveSuccess
                                ? 'PHB: magia de concentração mantida.'
                                : 'PHB: magia termina; buff removido no próximo evento.'
                        }
                    };
                }
            });
        });
        await sleep(800);
    }

    async function animateConcentrationLostEvent(ev, offerSkip) {
        if (_skipReplayBatch) return;
        try {
            ensureCombatVfxRuntime();
            var uid = ev.tIdx === currentState.p_idx ? 'player' : 'enemy_' + ev.tIdx;
            var el = document.querySelector('[data-unit-id="' + uid + '"]');
            if (window._combatVfx && el) window._combatVfx.concentrationLost(el);
        } catch (e) { console.warn('[COMBAT2]', 'concentration_lost_vfx_failed', e || ''); }
        var lostNames = (ev.lostIds || []).map(function (id) {
            return id === 'benção' ? 'Bênção' :
                id === 'marca_cacador' ? 'Marca do Caçador' :
                id;
        });
        var sub = {
            kicker: 'PHB — Concentração perdida',
            intro: (ev.targetName || 'Conjurador') + ' perdeu concentração.',
            rows: [{ l: 'Efeitos removidos', v: lostNames.join(', ') || '—' }],
            note: 'Buffs dependentes de concentração terminam juntos.'
        };
        await showMessage('⚡ Concentração rompida', 'miss', sub, { offerBatchSkip: !!offerSkip });
        await sleep(800);
    }

    /* ============================================================
       SUMMON EVENT HANDLERS (Fases 9-12 port simulador).
       V1 Invocações Phase 3 + V1-Visual Phase 4 + W2 Conjurar Animais.

       Eventos esperados do motor Python (combat2.py step()):
         summon_cast        — Arma Espiritual cast (BA) [Fase 9]
         summon_attack      — Arma Espiritual ataca [Fase 9]
         summon_expire      — summon expira (duracao zero ou HP zero) [Fase 9-12]
         summon_pack_cast   — Conjurar Animais cast 4 lobos (W2) [Fase 12]
         bonus_action_used  — BA consumida (qualquer skill bonus:true) [Fase 9]
       ============================================================ */

    async function animateSummonCastEvent(ev, offerSkip) {
        /* Arma Espiritual cast — BA, cria entry em state.attachedSummons.
           Visual: toast + render pra aparecer o chip "⚔️ Xr" sobre conjurador. */
        var actorName = ev.casterName || 'Conjurador';
        var summonName = ev.summonName || 'Arma';
        if (typeof showMessage === 'function') {
            showMessage(actorName + ' conjura ' + summonName, 'info',
                (ev.summonIco || '⚔️') + ' Duração: ' + (ev.duration || 10) + ' rodadas');
        }
        render(currentState);
        await sleep(800);
    }

    async function animateSummonAttackEvent(ev, offerSkip) {
        /* Arma Espiritual ataca — dispatch de dice + impact VFX.
           Reusa shared/combat-vfx.js impact() via dispatchAttackVfx.
           Fase 9 (V1 Invocações) — full flight VFX pendente refactor mais profundo. */
        var target = currentState && currentState.order ? currentState.order[ev.tIdx] : null;
        if (ev.d20 != null && target) {
            await new Promise(function (resolve) {
                showDice(ev.d20, resolve, { n: ev.summonName || 'Arma', ico: '⚔️' },
                    (ev.hit ? 'Acerto' : 'Erro') + ' vs CA ' + ev.ac,
                    { offerBatchSkip: !!offerSkip });
            });
        }
        if (ev.hit && target) {
            var targetEl = document.querySelector('[data-unit-id="enemy_' + ev.tIdx + '"]');
            if (targetEl) {
                dispatchAttackVfx(targetEl, {
                    dmgType: ev.dmgType || 'force',
                    crit: !!ev.crit,
                    skill: { n: ev.summonName, ranged: true }
                });
            }
        }
        render(currentState);
        await sleep(600);
    }

    async function animateSummonExpireEvent(ev, offerSkip) {
        /* Summon expira (duração zero OU HP zero). Visual: fade-out do card.
           W2 (Conjurar Animais): reason='duration'; V1 Arma Espiritual: reason='duration' também. */
        var name = ev.summonName || 'Invocação';
        if (typeof showMessage === 'function') {
            showMessage(name + ' se dissipa', 'info',
                ev.reason === 'duration' ? '(duração esgotada)' : '');
        }
        /* CSS cell--summon-dying é adicionada por render() se summon.dying=true,
           mas motor Python remove direto do order. Então só re-renderiza. */
        render(currentState);
        await sleep(500);
    }

    async function animateSummonPackCastEvent(ev, offerSkip) {
        /* W2 Conjurar Animais — cast spawna N lobos (default 4).
           Visual: toast + render pra os 4 novos cards aparecerem no battlefield. */
        var caster = ev.casterName || 'Conjurador';
        var count = ev.count || 4;
        var name = ev.summonName || 'bestas';
        if (typeof showMessage === 'function') {
            showMessage(caster + ' conjura ' + count + ' ' + name, 'info',
                (ev.summonIco || '🐾') + ' Duração: ' + (ev.durTurns || 5) + ' rodadas');
        }
        render(currentState);
        await sleep(800);
    }

    async function animateBonusActionUsedEvent(ev, offerSkip) {
        /* BA consumida. Sem visual pesado — render atualiza HUD pílula ▲ → spent. */
        render(currentState);
        await sleep(200);
    }

    /* ============================================================
       FCT — FLOATING COMBAT TEXT (Fase 13 port simulador _spawnFloatingDmgNumber).
       Spawna número de dano/cura flutuante sobre o card do alvo.
       Usado por animateAttackEvent/animateHealEvent (wiring opcional).
       ============================================================ */
    function _spawnFloatingDmgNumber(targetUid, amount, opts) {
        opts = opts || {};
        var el = document.querySelector('[data-unit-id="' + targetUid + '"]');
        if (!el) return;
        var rect = el.getBoundingClientRect();
        var fct = document.createElement('div');
        fct.className = 'floating-dmg' + (opts.crit ? ' is-crit' : '') + (opts.heal ? ' is-heal' : '') + (opts.half ? ' is-half' : '');
        if (opts.casterCls) fct.classList.add('cls-' + opts.casterCls);
        fct.textContent = (opts.heal ? '+' : '-') + String(amount);
        fct.style.left = (rect.left + rect.width / 2) + 'px';
        fct.style.top = (rect.top + rect.height / 3) + 'px';
        document.body.appendChild(fct);
        setTimeout(function () {
            try { fct.remove(); } catch (e) {}
        }, 1400);
    }

    async function animateFleeEvent(ev, offerSkip) {
        if (_skipReplayBatch) return;
        var p = currentState.order[currentState.p_idx];
        await showMessage('Tentativa de fuga', 'pre-npc', {
            kicker: 'Teste de habilidade',
            intro: 'Acrobacia (Des) para sair do alcance dos hostis presentes na cena.',
            rows: [{ l: 'Classe de dificuldade', v: String(ev.dc) }],
            note: 'Regra adaptada ao fluxo do combate: CD fixa neste modo.'
        }, { offerBatchSkip: !!offerSkip });
        if (_skipReplayBatch) return;
        await new Promise(function (x) {
            showDice(ev.d20, x, p, 'Fuga · Acrobacia', {
                offerBatchSkip: !!offerSkip,
                postResult: function () {
                    return {
                        title: ev.success ? 'Passou no teste' : 'Não passou',
                        cls: ev.success ? 'hit' : 'miss',
                        subStructured: {
                            kicker: 'Acrobacia (Des) · CD ' + ev.dc,
                            rows: [{ l: 'Resultado', v: ev.d20 + ' + ' + ev.mod + ' = ' + ev.total }],
                            note: ev.success
                                ? 'Você pode sair sem provocar ataques de oportunidade por este movimento.'
                                : 'A seguir, inimigos hostis podem realizar ataques de oportunidade, se a regra do encontro permitir.'
                        }
                    };
                }
            });
        });
        if (_skipReplayBatch) return;
        if (ev.success) {
            try {
                if (typeof ValdoriaAudio !== 'undefined' && ValdoriaAudio.playSFX) {
                    ValdoriaAudio.playSFX('sfx_success');
                }
            } catch (eOk) {}
            await showMessage('Fuga bem-sucedida', 'hit', {
                kicker: 'Resultado',
                rows: [
                    { l: 'Total na Acrobacia', v: String(ev.total) },
                    { l: 'CD', v: String(ev.dc) }
                ],
                note: 'Você deixa o combate.'
            }, { offerBatchSkip: !!offerSkip });
        } else {
            try {
                if (typeof sfxMiss === 'function') {
                    sfxMiss();
                } else if (typeof ValdoriaAudio !== 'undefined' && ValdoriaAudio.playSFX) {
                    ValdoriaAudio.playSFX('sfx_miss');
                }
            } catch (eMs) {}
            await showMessage('Falha no teste', 'miss', {
                kicker: 'Consequência',
                intro: 'Total na Acrobacia abaixo da CD — a saída fica exposta.',
                bullets: [
                    'Cada inimigo hostil vivo pode realizar um ataque de oportunidade.',
                    'Depois disso, o estado do combate segue conforme o narrador do encontro.'
                ]
            }, { offerBatchSkip: !!offerSkip });
        }
    }

    /* ============================================================
     * INITIATIVE ANIMATION (client-only, usa init do backend)
     * ============================================================ */
    async function animInitFromBackend() {
        var s = currentState;
        s.ph = 'init';
        _skipInit = false;
        /* Marca todos como nao revelados inicialmente */
        s.order.forEach(function (c) { c.initRevealed = false; c.initRolling = false; });
        render(s);
        for (var i = 0; i < s.order.length; i++) {
            if (_skipInit) break;
            var c = s.order[i];
            c.initRolling = true;
            render(s);
            await sleep(i === 0 ? 600 : 2000);
            if (_skipInit) { c.initRolling = false; break; }
            var d20 = c.init - Math.floor((c.dex - 10) / 2);
            if (d20 < 1) d20 = 1; if (d20 > 20) d20 = 20;
            await new Promise(function (r) { showDice(d20, r, c, 'Iniciativa', { initiativeSequence: true }); });
            c.initRolling = false;
            c.initRevealed = true;
            if (_skipInit) break;
            var oldRects = captureQueueRects();
            render(s);
            animateQueueTransition(oldRects);
        }
        finishInit();
    }

    function finishInit() {
        var s = currentState;
        s.order.forEach(function (c) { c.initRevealed = true; c.initRolling = false; });
        s.order.sort(function (a, b) { return b.init - a.init || (a.t === 'p' ? -1 : 1); });
        s.p_idx = s.order.findIndex(function (c) { return c.t === 'p'; });
        s.ph = 'init_done';
        render(s);
        showInitiativeOrderPopup();
    }

    function showInitiativeOrderPopup() {
        if (document.getElementById('init-order-popup')) return;
        var ov = document.createElement('div');
        ov.id = 'init-order-popup';
        ov.className = 'iop-overlay iop-overlay--batch';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        ov.setAttribute('aria-labelledby', 'c2-init-order-title');
        var card = document.createElement('div');
        card.className = 'iop-card iop-card--batch-summary';
        var parts = [
            '<header class="iop-head-batch" aria-labelledby="c2-init-order-title">',
            '<span class="iop-head-batch__orn" aria-hidden="true">\u2694</span>',
            '<div class="iop-head-batch__text">',
            '<h2 class="iop-head-batch__title" id="c2-init-order-title">',
            '<span class="iop-head-batch__line1">Ordem de iniciativa</span>',
            '<span class="iop-head-batch__line2">Combate come\u00e7a pelo topo</span>',
            '</h2>',
            '</div>',
            '</header>',
            '<div class="iop-head-batch__rule" role="presentation"></div>',
            '<div class="iop-list">'
        ];
        currentState.order.forEach(function (c, i) {
            var isSide = c.t === 'p' || c.t === 'a';
            parts.push('<div class="iop-row' + (isSide ? ' player' : '') + '">');
            parts.push('<span class="iop-pos">' + (i + 1) + '</span>');
            parts.push('<span class="iop-ico">' + c.ico + '</span>');
            parts.push('<span class="iop-name">' + escHtml(c.n) + '</span>');
            parts.push('<span class="iop-roll">\ud83c\udfb2 ' + c.init + '</span>');
            parts.push('</div>');
        });
        parts.push('</div>');
        parts.push('<div class="iop-start-wrap"><button type="button" class="epic-cta-btn" id="iop-start-combat-btn">' +
            '<span class="epic-cta-text">Come\u00e7ar combate \u2192</span></button></div>');
        setHTML(card, parts.join(''));
        ov.appendChild(card);
        vOverlay.add(ov);
        var startBtn = document.getElementById('iop-start-combat-btn');
        if (startBtn) {
            startBtn.addEventListener('click', function () {
                closeInitiativeOrderPopup();
                remoteAction({ type: 'start' }).catch(function (e) { console.error('[C2] start failed', e); });
            });
        }
    }

    function closeInitiativeOrderPopup() {
        var el = document.getElementById('init-order-popup');
        if (el) el.remove();
    }

    /* ============================================================
     * DICE OVERLAYS (Dice3D + overlays de resultado)
     * ============================================================ */
    function showDice(value, cb, actor, context, opts) {
        opts = opts || {};
        if (!window.Dice3D) { cb && cb(); return; }
        var isPlayer = actor && actor.t === 'p';
        var initiativeSequence = !!(opts && opts.initiativeSequence);
        var manualPlayerDice = isPlayer && !initiativeSequence;
        var duration = manualPlayerDice ? 5000 : (1500 + Math.floor(Math.random() * 1500));
        var INTERACT_MAX = 0.70;
        var ov = document.createElement('div');
        /* Refinamento Fase 6: tema dice baseado em opts.theme ou opts.skill (auto-detect). */
        var diceTheme = opts.theme || (opts.skill && _skillThemeOf ? _skillThemeOf(opts.skill) : null);
        ov.className = 'dice-overlay' + (diceTheme && diceTheme !== 'default' ? ' dice-overlay--' + diceTheme : '');
        if (currentState && currentState.ph === 'active' && currentState.rn) {
            var rb = document.createElement('div');
            rb.className = 'dice-round-badge';
            rb.textContent = 'Rodada ' + currentState.rn;
            ov.appendChild(rb);
        }
        if (actor) {
            var hdr = document.createElement('div');
            hdr.className = 'dice-actor-label';
            hdr.textContent = actor.ico + ' ' + actor.n + ' — ' + (context || 'Rolando');
            ov.appendChild(hdr);
        }
        var container = document.createElement('div');
        container.className = 'dice-canvas-holder' + (manualPlayerDice ? ' clickable pulse-idle' : '');
        ov.appendChild(container);
        var resultEl = document.createElement('div');
        resultEl.className = 'dice-result-label';
        ov.appendChild(resultEl);
        var hint = document.createElement('div');
        hint.className = 'dice-hint';
        ov.appendChild(hint);
        var continueBtn = document.createElement('button');
        continueBtn.className = 'dice-continue-btn';
        continueBtn.textContent = 'Continuar →';
        continueBtn.style.display = 'none';
        var actionsWrap = document.createElement('div');
        actionsWrap.className = 'dice-actions-stack';
        actionsWrap.appendChild(continueBtn);
        if (opts.offerBatchSkip && shouldOfferBatchSkip()) {
            var skipAllBtn = document.createElement('button');
            skipAllBtn.type = 'button';
            skipAllBtn.className = 'dice-skip-batch-btn';
            skipAllBtn.textContent = 'Pular rolagens de dado dos outros combatentes';
            skipAllBtn.setAttribute('aria-label', 'Pular animações de dado de inimigos e aliados; só o personagem do jogador mantém dados 3D neste lote');
            skipAllBtn.addEventListener('click', function (evClick) {
                evClick.stopPropagation();
                _skipReplayBatch = true;
                close();
            });
            actionsWrap.appendChild(skipAllBtn);
        }
        ov.appendChild(actionsWrap);
        vOverlay.add(ov);
        var d, closed = false, started = false, lockTimer = null;
        function close() {
            if (closed) return; closed = true;
            if (lockTimer) clearInterval(lockTimer);
            try { d && d.dispose(); } catch (e) {}
            ov.remove();
            if (_activeDiceClose === close) _activeDiceClose = null;
            cb && cb();
        }
        _activeDiceClose = close;
        continueBtn.addEventListener('click', close);
        function startRoll() {
            if (started || !d) return;
            started = true;
            tryValdoriaAudioInit();
            unlockCombat2OscFallback();
            try {
                if (typeof sfxDiceRoll === 'function') {
                    sfxDiceRoll();
                }
            } catch (eDice) {}
            container.classList.remove('pulse-idle');
            hint.textContent = manualPlayerDice ? '⚡ Toque no dado para acelerar o giro' : '';
            d.roll(value, function () {
                container.classList.remove('clickable', 'locked');
                if (lockTimer) { clearInterval(lockTimer); lockTimer = null; }
                var info = opts.postResult ? opts.postResult() : null;
                if (info) {
                    while (resultEl.firstChild) resultEl.removeChild(resultEl.firstChild);
                    var big = document.createElement('div');
                    big.className = 'drl-big';
                    big.textContent = info.title;
                    resultEl.appendChild(big);
                    if (info.subStructured) {
                        var panelSr = document.createElement('div');
                        panelSr.className = 'drl-info-panel';
                        c2AppendInfoStack(panelSr, info.subStructured);
                        resultEl.appendChild(panelSr);
                    } else if (info.sub) {
                        var sub = document.createElement('div');
                        sub.className = 'drl-sub';
                        sub.textContent = info.sub;
                        resultEl.appendChild(sub);
                    }
                    resultEl.className = 'dice-result-label visible ' + (info.cls || '');
                } else {
                    resultEl.textContent = 'd20 = ' + value;
                    resultEl.classList.add('visible');
                }
                if (opts.onAttackRollResolved && typeof opts.onAttackRollResolved === 'function') {
                    try {
                        opts.onAttackRollResolved(value, info);
                    } catch (eAr) {}
                }
                hint.textContent = '';
                continueBtn.style.display = '';
            });
            if (manualPlayerDice) {
                lockTimer = setInterval(function () {
                    if (!d || !d._rolling) { clearInterval(lockTimer); lockTimer = null; return; }
                    var elapsed = performance.now() - d._rollStart;
                    if (elapsed / d._rollDuration >= INTERACT_MAX) {
                        container.classList.add('locked');
                        container.classList.remove('clickable');
                        hint.textContent = '🎲 Aguarde o resultado...';
                        clearInterval(lockTimer); lockTimer = null;
                    }
                }, 80);
            }
        }
        try {
            d = new Dice3D(container, { size: 180, dieType: 'd20', duration: duration });
            if (manualPlayerDice) {
                hint.textContent = '🎲 Toque no dado para começar a rolar';
                container.addEventListener('click', function () {
                    if (!started) { startRoll(); return; }
                    if (!d || !d._rolling) return;
                    var elapsed = performance.now() - d._rollStart;
                    if (elapsed / d._rollDuration >= INTERACT_MAX) return;
                    var m = d._dieMesh;
                    if (!m) return;
                    if (!d._spinDir) d._spinDir = { x: d._endEuler.x >= d._startEuler.x ? 1 : -1, y: d._endEuler.y >= d._startEuler.y ? 1 : -1, z: d._endEuler.z >= d._startEuler.z ? 1 : -1 };
                    d._startEuler.x = m.rotation.x; d._startEuler.y = m.rotation.y; d._startEuler.z = m.rotation.z;
                    d._endEuler.x += Math.PI * 4 * d._spinDir.x;
                    d._endEuler.y += Math.PI * 4 * d._spinDir.y;
                    d._endEuler.z += Math.PI * 2 * d._spinDir.z;
                    d._rollStart = performance.now();
                    d._rollDuration = 2000;
                    hint.textContent = '⚡ Acelerado! Solte para desacelerar';
                    hint.classList.remove('pulse'); void hint.offsetWidth; hint.classList.add('pulse');
                });
            } else { startRoll(); }
        } catch (e) { close(); }
    }

    function showMessage(text, cls, sub, msgOpts) {
        msgOpts = msgOpts || {};
        return new Promise(function (resolve) {
            var ov = document.createElement('div');
            ov.className = 'combat-msg-overlay';
            ov.setAttribute('role', 'dialog');
            ov.setAttribute('aria-modal', 'true');
            var card = document.createElement('div');
            card.className = 'combat-msg-card ' + (cls || '');
            var txt = document.createElement('div');
            txt.className = 'combat-msg-text';
            txt.id = 'c2-msg-title-' + String(Date.now());
            txt.textContent = text;
            ov.setAttribute('aria-labelledby', txt.id);
            card.appendChild(txt);
            if (sub) {
                if (typeof sub === 'object' && !Array.isArray(sub)) {
                    c2AppendInfoStack(card, sub);
                } else {
                    var s = document.createElement('div');
                    s.className = 'combat-msg-sub c2-msg-plain';
                    s.textContent = sub;
                    card.appendChild(s);
                }
            }
            var btn = document.createElement('button');
            btn.className = 'dice-continue-btn';
            btn.textContent = 'Continuar →';
            btn.style.display = 'none';
            card.appendChild(btn);
            if (msgOpts.offerBatchSkip && shouldOfferBatchSkip()) {
                var skipB = document.createElement('button');
                skipB.type = 'button';
                skipB.className = 'dice-skip-batch-btn dice-skip-batch-btn--in-card';
                skipB.textContent = 'Pular rolagens de dado dos outros combatentes';
                skipB.setAttribute('aria-label', 'Pular animações de dado dos outros combatentes neste lote');
                skipB.addEventListener('click', function () {
                    _skipReplayBatch = true;
                    ov.remove();
                    resolve();
                });
                card.appendChild(skipB);
            }
            ov.appendChild(card);
            vOverlay.add(ov);
            setTimeout(function () { btn.style.display = ''; }, 1000);
            btn.addEventListener('click', function () { ov.remove(); resolve(); });
        });
    }

    function showDamageDice(rolls, die, crit, actor, target, oldHp, newHp, dmgMod, dmgOpts) {
        dmgOpts = dmgOpts || {};
        dmgMod = dmgMod || 0;
        return new Promise(function (resolve) {
            if (!window.Dice3D) { resolve(); return; }
            var dieType = 'd' + die;
            var diceSum = rolls.reduce(function (a, b) { return a + b; }, 0);
            var total = Math.max(1, diceSum + dmgMod);
            var ov = document.createElement('div');
            /* Refinamento Fase 6: tema dice via dmgOpts.theme ou dmgOpts.skill. */
            var dmgTheme = dmgOpts.theme || (dmgOpts.skill && _skillThemeOf ? _skillThemeOf(dmgOpts.skill) : null);
            ov.className = 'dice-overlay' + (dmgTheme && dmgTheme !== 'default' ? ' dice-overlay--' + dmgTheme : '');
            if (currentState && currentState.rn) {
                var rb = document.createElement('div');
                rb.className = 'dice-round-badge';
                rb.textContent = 'Rodada ' + currentState.rn;
                ov.appendChild(rb);
            }
            var hdr = document.createElement('div');
            hdr.className = 'dice-actor-label';
            hdr.textContent = actor.ico + ' ' + actor.n + ' → ' + target.n + (crit ? ' (crítico)' : '');
            ov.appendChild(hdr);
            var container = document.createElement('div');
            container.className = 'dice-canvas-holder';
            ov.appendChild(container);
            var resultEl = document.createElement('div');
            resultEl.className = 'dice-result-label';
            ov.appendChild(resultEl);
            var continueBtn = document.createElement('button');
            continueBtn.className = 'dice-continue-btn';
            continueBtn.textContent = 'Continuar →';
            continueBtn.style.display = 'none';
            var dmgActionsWrap = document.createElement('div');
            dmgActionsWrap.className = 'dice-actions-stack';
            dmgActionsWrap.appendChild(continueBtn);
            if (dmgOpts.offerBatchSkip && shouldOfferBatchSkip()) {
                var skipDmg = document.createElement('button');
                skipDmg.type = 'button';
                skipDmg.className = 'dice-skip-batch-btn';
                skipDmg.textContent = 'Pular rolagens de dado dos outros combatentes';
                skipDmg.setAttribute('aria-label', 'Pular animações de dado dos outros combatentes neste lote');
                skipDmg.addEventListener('click', function (evClick) {
                    evClick.stopPropagation();
                    _skipReplayBatch = true;
                    close();
                });
                dmgActionsWrap.appendChild(skipDmg);
            }
            ov.appendChild(dmgActionsWrap);
            vOverlay.add(ov);
            var d;
            function close() { try { d && d.dispose(); } catch (e) {} ov.remove(); if (_activeDiceClose === close) _activeDiceClose = null; resolve(); }
            _activeDiceClose = close;
            continueBtn.addEventListener('click', close);
            try {
                d = new Dice3D(container, { size: 180, dieType: dieType, duration: 1800 });
                function rollOne(i) {
                    if (i >= rolls.length) {
                        /* Resumo numerico apenas — barra HP e impacto ficam na arena (ver arenaStrikeFromEvent). */
                        while (resultEl.firstChild) resultEl.removeChild(resultEl.firstChild);
                        resultEl.className = 'dice-result-label visible';
                        var big = document.createElement('div');
                        big.className = 'drl-big';
                        big.textContent = '−' + total + ' PV' + (crit ? ' · Crítico' : '');
                        resultEl.appendChild(big);
                        var panelDmg = document.createElement('div');
                        panelDmg.className = 'drl-info-panel';
                        c2AppendInfoStack(panelDmg, {
                            kicker: 'Alvo',
                            rows: [
                                { l: target.ico + ' ' + target.n, v: 'PV ' + oldHp + ' → ' + newHp }
                            ],
                            note: 'O dano já foi aplicado ao estado do combate; a arena mostra o impacto.'
                        });
                        resultEl.appendChild(panelDmg);
                        try {
                            if (typeof sfxDamageType === 'function') {
                                sfxDamageType((dmgOpts && dmgOpts.dmgType) || 'slashing');
                            }
                        } catch (eDt) {}
                        setTimeout(function () { continueBtn.style.display = ''; }, 550);
                        return;
                    }
                    try {
                        if (typeof sfxDiceRoll === 'function') {
                            sfxDiceRoll();
                        }
                    } catch (eDr) {}
                    d.roll(rolls[i], function () {
                        if (rolls.length > 1 || dmgMod > 0) {
                            var partial = rolls.slice(0, i + 1).join(' + ');
                            if (i === rolls.length - 1 && dmgMod > 0) partial += ' + ' + dmgMod + ' (' + (actor.attr || 'mod') + ')';
                            resultEl.textContent = partial;
                            resultEl.classList.add('visible');
                        }
                        /* 2026-04-19 v2: pausa em DUAS FASES pra troca-de-dados nao parecer
                           abrupta (reclamado pelo usuario em Misseis Magicos 3d4):
                             Fase A (1200ms): label com parcial ("3", "3 + 2", ...) visivel pra ler
                             Fase B (+800ms): label fade-out + face do dado atual ainda visivel
                                              ("breathing room") antes do proximo dado ser criado
                           Total 2000ms entre pouso do dado N e inicio do giro do dado N+1.
                           Antes era um unico setTimeout(1100) que fazia label-hide + rollOne
                           no mesmo frame → swap instantaneo. */
                        setTimeout(function () { resultEl.classList.remove('visible'); }, 1200);
                        setTimeout(function () { rollOne(i + 1); }, 2000);
                    });
                }
                rollOne(0);
            } catch (e) { close(); }
        });
    }

    /* ============================================================
     * VFX — canvas CombatVFX (shared/combat-vfx.js) + flash no card
     * (espelha combat.js / combat-vfx.js do combate anterior).
     * ============================================================ */
    function ensureCombatVfxRuntime() {
        if (window._combatVfx || typeof CombatVFX === 'undefined') return;
        var c = document.getElementById('vfxCanvas');
        if (c) {
            try {
                window._combatVfx = new CombatVFX('vfxCanvas');
            } catch (e) {
                console.warn('[COMBAT2]', 'CombatVFX_init_failed', e || '');
            }
        }
    }

    function _shakeAppCombat2(intensity) {
        var app = document.getElementById('app');
        if (!app) return;
        var cls = intensity === 'heavy' ? 'shake-heavy' : 'shake-light';
        var dur = intensity === 'heavy' ? 450 : 300;
        app.classList.remove('shake-light', 'shake-heavy');
        void app.offsetWidth;
        app.classList.add(cls);
        var ms = (typeof ValdoriaMotion !== 'undefined' && ValdoriaMotion.duration)
            ? ValdoriaMotion.duration(dur, 0) : dur;
        setTimeout(function () { app.classList.remove(cls); }, ms);
    }

    function _showImpactFlashC2(targetEl, isCrit) {
        if (!targetEl) return;
        var rect = targetEl.getBoundingClientRect();
        var flash = document.createElement('div');
        flash.className = 'impact-flash' + (isCrit ? ' crit' : '');
        flash.style.left = (rect.left + rect.width / 2 - (isCrit ? 35 : 25)) + 'px';
        flash.style.top = (rect.top + rect.height / 2 - (isCrit ? 35 : 25)) + 'px';
        flash.style.position = 'fixed';
        vOverlay.add(flash);
        flash.addEventListener('animationend', function () { flash.remove(); });
    }

    function _dmgFlashClassForCell(dt) {
        var allowed = {
            fire: 1, cold: 1, lightning: 1, necrotic: 1, radiant: 1, poison: 1, acid: 1,
            psychic: 1, thunder: 1, force: 1, slashing: 1, piercing: 1, bludgeoning: 1
        };
        return (dt && allowed[dt]) ? 'dmg-flash-' + dt : 'dmg-flash';
    }

    function _stripCellFlashClasses(el) {
        var rm = [
            'dmg-flash', 'dmg-flash-fire', 'dmg-flash-cold', 'dmg-flash-lightning', 'dmg-flash-necrotic',
            'dmg-flash-radiant', 'dmg-flash-poison', 'dmg-flash-acid', 'dmg-flash-psychic', 'dmg-flash-thunder',
            'dmg-flash-force', 'dmg-flash-slashing', 'dmg-flash-piercing', 'dmg-flash-bludgeoning',
            'dmg-shake', 'enemy-hit-heavy'
        ];
        rm.forEach(function (c) { el.classList.remove(c); });
    }

    function flashTargetCell(el, damageType, isCrit) {
        if (!el || !document.body.contains(el)) return;
        var flashCls = _dmgFlashClassForCell(damageType || 'slashing');
        _stripCellFlashClasses(el);
        void el.offsetWidth;
        el.classList.add(flashCls);
        var rmFlash = (typeof ValdoriaMotion !== 'undefined' && ValdoriaMotion.duration)
            ? ValdoriaMotion.duration(400, 0) : 400;
        setTimeout(function () { el.classList.remove(flashCls); }, rmFlash);
        var shakeCls = isCrit ? 'enemy-hit-heavy' : 'dmg-shake';
        el.classList.add(shakeCls);
        var rmShake = (typeof ValdoriaMotion !== 'undefined' && ValdoriaMotion.duration)
            ? ValdoriaMotion.duration(isCrit ? 600 : 500, 0) : (isCrit ? 600 : 500);
        setTimeout(function () { el.classList.remove(shakeCls); }, rmShake);
        _showImpactFlashC2(el, !!isCrit);
        if (isCrit) { _shakeAppCombat2('heavy'); } else { _shakeAppCombat2('light'); }
    }

    /** Feedback visual curto no alvo quando o ataque erra (apos resumo Animações puladas). */
    function flashMissTargetCell(el) {
        if (!el || !document.body.contains(el)) return;
        el.classList.remove('c2-miss-flash');
        void el.offsetWidth;
        el.classList.add('c2-miss-flash');
        var ms = (typeof ValdoriaMotion !== 'undefined' && ValdoriaMotion.duration)
            ? ValdoriaMotion.duration(480, 0) : 480;
        setTimeout(function () {
            if (el && document.body.contains(el)) el.classList.remove('c2-miss-flash');
        }, ms);
        // Label "Errou" flutuando pra cima com glow branco (paleta dos cards).
        spawnMissFloatLabel(el);
    }

    /** Injeta texto "Errou" animado subindo com glow branco no card do alvo. */
    function spawnMissFloatLabel(el) {
        if (!el || !document.body.contains(el)) return;
        var lbl = document.createElement('div');
        lbl.className = 'c2-miss-float-label';
        lbl.textContent = 'Errou';
        // Inline styles (tokens do próprio ecossistema) — não depende de combat2.css.
        lbl.style.cssText = [
            'position:absolute', 'left:50%', 'top:22%',
            'transform:translate(-50%,0)',
            'z-index:14', 'pointer-events:none',
            "font-family:var(--v-font-display,'Cinzel'),serif",
            'font-weight:800', 'font-size:20px', 'letter-spacing:3px',
            'text-transform:uppercase', 'color:#f5f7ff',
            'text-shadow:0 0 6px rgba(255,255,255,.95),0 0 14px rgba(230,240,255,.75),0 0 26px rgba(200,220,255,.45),0 2px 4px rgba(0,0,0,.95)',
            'animation:c2MissFloatUp 1.25s cubic-bezier(.22,.68,.32,1.2) forwards'
        ].join(';');
        // Garante keyframes globais — injeta uma vez por sessão.
        if (!document.getElementById('c2-miss-float-kf')) {
            var st = document.createElement('style');
            st.id = 'c2-miss-float-kf';
            st.textContent =
                '@keyframes c2MissFloatUp {' +
                '0%{opacity:0;transform:translate(-50%,16px) scale(.55);filter:blur(2px);}' +
                '18%{opacity:1;transform:translate(-50%,4px) scale(1.16);filter:blur(0);}' +
                '45%{opacity:1;transform:translate(-50%,-10px) scale(1.02);}' +
                '100%{opacity:0;transform:translate(-50%,-42px) scale(.92);filter:blur(1px);}' +
                '}';
            document.head.appendChild(st);
        }
        // Garante que o ancestor tem position:relative; cells/cards costumam ter.
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
        el.appendChild(lbl);
        setTimeout(function () { if (lbl.parentNode) lbl.parentNode.removeChild(lbl); }, 1300);
    }

    function flashHealTargetCell(el) {
        if (!el || !document.body.contains(el)) return;
        el.classList.remove('c2-heal-flash');
        void el.offsetWidth;
        el.classList.add('c2-heal-flash');
        var ms = (typeof ValdoriaMotion !== 'undefined' && ValdoriaMotion.duration)
            ? ValdoriaMotion.duration(520, 0) : 520;
        setTimeout(function () {
            if (el && document.body.contains(el)) el.classList.remove('c2-heal-flash');
        }, ms);
    }

    async function playPostBatchAttackVfx(ev) {
        if (!currentState || !ev) return;
        var target = currentState.order[ev.tIdx];
        var actor = currentState.order[ev.aIdx];
        if (!target || !actor) return;
        var toUid = ev.tIdx === currentState.p_idx ? 'player' : 'enemy_' + ev.tIdx;
        var toEl = document.querySelector('[data-unit-id="' + toUid + '"]');
        if (!ev.hit) {
            try {
                if (typeof sfxMiss === 'function') {
                    sfxMiss();
                }
            } catch (eS) {}
            flashMissTargetCell(toEl);
            // Se o alvo tem Esquiva ativa, mostra esquiva deliberada em vez de miss simples.
            try {
                var hasDodge = target && target.se && target.se.some(function (x) {
                    return x && (x.id === 'esquiva' || x.attackAdvantage);
                });
                if (hasDodge) playDodgeVfx(ev.tIdx);
            } catch (eDg) {}
            // ≥1s desde o fim do VFX de miss/dodge (dodge anima ~400ms + 1000ms dwell).
            await sleep(1400);
            return;
        }
        if (ev.oldHp != null && ev.newHp != null) {
            target.hp = ev.oldHp;
            target.alive = ev.oldHp > 0;
            render(currentState);
            await sleep(90);
            target.hp = ev.newHp;
            target.alive = ev.newHp > 0;
            render(currentState);
        }
        arenaStrikeFromEvent(ev);
        // ≥1s desde o fim do impacto/crit/radiant/sanctuary overlays. Ataques
        // terminam ~500-850ms após o call; padding dá 1s+ de dwell antes da
        // próxima rolagem ou avanço de turno.
        await sleep(ev.crit ? 1650 : 1550);
    }

    async function playPostBatchHealVfx(ev) {
        if (!currentState || !ev) return;
        var target = currentState.order[ev.tIdx];
        if (!target || ev.oldHp == null || ev.newHp == null) return;
        target.hp = ev.oldHp;
        target.alive = ev.oldHp > 0;
        render(currentState);
        await sleep(90);
        target.hp = ev.newHp;
        target.alive = ev.newHp > 0;
        render(currentState);
        var toUid = ev.tIdx === currentState.p_idx ? 'player' : 'enemy_' + ev.tIdx;
        var toEl = document.querySelector('[data-unit-id="' + toUid + '"]');
        flashHealTargetCell(toEl);
        // VFX canvas específico: heal em si mesmo (raios verticais) vs aliado
        // (campo de partículas); mão de paladino/clérigo têm healSelf dedicado.
        try {
            if (window._combatVfx && toEl) {
                ensureCombatVfxRuntime();
                var isSelf = ev.aIdx === ev.tIdx;
                if (isSelf) window._combatVfx.healSelf(toEl);
                else window._combatVfx.heal(toEl);
                // Cura crítica (healGained alto): burst verde adicional.
                if (ev.healGained != null && ev.healGained >= 10) {
                    setTimeout(function () { try { window._combatVfx.healBurst(toEl); } catch (e) {} }, 200);
                }
            }
        } catch (eHV) { console.warn('[COMBAT2]', 'heal_vfx_failed', eHV || ''); }
        try {
            if (typeof ValdoriaAudio !== 'undefined' && ValdoriaAudio.playSFX) {
                ValdoriaAudio.playSFX('sfx_success');
            }
        } catch (eH) {}
        // ≥1s desde o final do VFX de cura (healSelf/heal duram ~800-900ms).
        await sleep(1400);
    }

    async function playPostBatchResourceVfx(ev) {
        if (!currentState || !ev || ev.aIdx == null) return;
        var uid = ev.aIdx === currentState.p_idx ? 'player' : 'enemy_' + ev.aIdx;
        var el = document.querySelector('[data-unit-id="' + uid + '"]');
        if (el) {
            el.classList.add('c2-res-pulse');
            var ms = (typeof ValdoriaMotion !== 'undefined' && ValdoriaMotion.duration)
                ? ValdoriaMotion.duration(380, 0) : 380;
            setTimeout(function () {
                if (el && document.body.contains(el)) el.classList.remove('c2-res-pulse');
            }, ms);
        }
        await sleep(320);
    }

    /**
     * Apos fechar o resumo Animações puladas: barra de PV, impacto/miss na arena, cura, buffs/recursos.
     * Estado final ja esta em currentState; aqui so animamos leitura visual.
     */
    async function playPostBatchSummaryVfx(events) {
        if (!events || !events.length || !currentState) return;
        var app = document.getElementById('app');
        if (app) app.classList.add('c2-hp-replay');
        try {
            for (var i = 0; i < events.length; i++) {
                var ev = events[i];
                if (!ev) continue;
                if (ev.kind === 'attack' || ev.kind === 'oa') {
                    await playPostBatchAttackVfx(ev);
                } else if (ev.kind === 'heal') {
                    await playPostBatchHealVfx(ev);
                } else if (ev.kind === 'buff') {
                    await animateBuffEvent(ev, false);
                } else if (ev.kind === 'resource') {
                    await playPostBatchResourceVfx(ev);
                } else if (ev.kind === 'round') {
                    currentState.rn = ev.rn;
                    render(currentState);
                    await sleep(280);
                } else if (ev.kind === 'flee') {
                    await sleep(220);
                }
            }
            render(currentState);
        } catch (eAll) {
            console.warn('[COMBAT2]', 'post_batch_summary_vfx', eAll || '');
        } finally {
            if (app) app.classList.remove('c2-hp-replay');
        }
    }

    /**
     * Dano aplicado na arena: projétil do atacante ao alvo (canvas), depois flash na célula.
     * Ver docs/sistemas/combat2-vfx-pipeline.md (fases B/C/D: transicao, AoE, buffs).
     */
    function arenaStrikeFromEvent(ev) {
        if (!currentState || !ev) return;
        var dt = ev.dmgType || 'slashing';
        var fromUid = ev.aIdx === currentState.p_idx ? 'player' : 'enemy_' + ev.aIdx;
        var toUid = ev.tIdx === currentState.p_idx ? 'player' : 'enemy_' + ev.tIdx;
        var fromEl = document.querySelector('[data-unit-id="' + fromUid + '"]');
        var toEl = document.querySelector('[data-unit-id="' + toUid + '"]');
        ensureCombatVfxRuntime();
        dispatchAttackVfx(ev, fromEl, toEl, dt);
        var impactDelay = ev.crit ? 380 : 440;
        // Ataque furtivo (Ladino): swirl sombrio ANTES do impacto.
        if (ev.sneakAttack && window._combatVfx && toEl) {
            try { window._combatVfx.shadowStrike(toEl); } catch (eSh) {}
        }
        // Crítico: burst dourado APÓS o impacto (realça visual).
        if (ev.crit && window._combatVfx && toEl) {
            setTimeout(function () { try { window._combatVfx.critBurst(toEl, dt); } catch (eC) {} }, impactDelay + 60);
        }
        // Radiante: coluna de luz sobreposta ao impacto (divino).
        if (dt === 'radiant' && window._combatVfx && toEl) {
            setTimeout(function () { try { window._combatVfx.radiantBurst(toEl); } catch (eR) {} }, impactDelay + 20);
        }
        if (ev.sanctuaryBroken) {
            setTimeout(function () { playSanctuaryBreakVfx(ev.aIdx); }, impactDelay + 180);
        }
        setTimeout(function () {
            if (toEl && document.body.contains(toEl)) {
                flashTargetCell(toEl, dt, !!ev.crit);
            }
            if (ev.newHp != null && ev.newHp <= 0 && toUid.indexOf('enemy_') === 0) {
                try {
                    if (typeof ValdoriaAudio !== 'undefined' && ValdoriaAudio.playSFX) {
                        ValdoriaAudio.playSFX('sfx_enemy_death');
                    }
                } catch (eS) {}
                if (window._combatVfx && toEl) {
                    try {
                        window._combatVfx.kill(toEl, dt);
                    } catch (eK) {}
                }
            }
        }, impactDelay);
    }

    /* ============================================================
     * POPUPS (target confirm, unit detail, skills, bag)
     * ============================================================ */
    function c2PreviewAttackDmg(p, sk) {
        var mod = p.dmgMod | 0;
        var spec = sk && sk.damageSpec;
        var n = 1;
        var die = p.die || 8;
        if (spec && spec.n != null && spec.d != null) {
            n = Math.max(1, spec.n | 0);
            die = Math.max(2, spec.d | 0);
        }
        var flat = (spec && spec.flat != null) ? (spec.flat | 0) : 0;
        var attr = p.attr ? ' (' + p.attr + ')' : '';
        var flatStr = flat ? (' + ' + flat + ' (hab.)') : '';
        var modStr = mod > 0 ? (' + ' + mod + attr) : (mod < 0 ? (' ' + mod + attr) : '');
        var dmgF = n + 'd' + die + flatStr + modStr;
        var critN = n + 1;
        var critF = critN + 'd' + die + flatStr + modStr;
        return {
            dmgF: dmgF,
            critF: critF,
            minD: n + flat + mod,
            maxD: n * die + flat + mod,
            critMin: critN + flat + mod,
            critMax: critN * die + flat + mod
        };
    }

    function showTargetConfirm(tgtIdx) {
        var s = currentState;
        var p = s.order[s.p_idx];
        var u = s.order[tgtIdx];
        if (!u || !u.alive) return;
        var sk = (_pendingSkillSlot != null && p.skills && p.skills[_pendingSkillSlot]) ? p.skills[_pendingSkillSlot] : null;
        var skObj = sk && typeof sk === 'object' ? sk : null;
        var atkSkill = (skObj && skObj.kind === 'attack') ? skObj : null;
        var reductions = u.resistances || [];
        var immunities = u.immunities || [];
        var ov = document.createElement('div');
        ov.className = 'target-confirm-overlay';
        var card = document.createElement('div');
        card.className = 'target-confirm-card';
        var hpPct = Math.round((u.hp / u.mhp) * 100);
        var hpCls = hpPct > 60 ? 'hp-high' : (hpPct > 25 ? 'hp-mid' : 'hp-low');
        var die = (p.die | 0) || 8;
        var mod = p.dmgMod || 0;
        var attrLbl = p.attr ? ' (' + p.attr + ')' : '';
        var dmgFormula;
        var critFormula;
        var minDmg;
        var maxDmg;
        var critMin;
        var critMax;
        if (atkSkill) {
            var pr = c2PreviewAttackDmg(p, atkSkill);
            dmgFormula = pr.dmgF;
            critFormula = pr.critF;
            minDmg = pr.minD;
            maxDmg = pr.maxD;
            critMin = pr.critMin;
            critMax = pr.critMax;
        } else {
            var modStrW = mod > 0 ? (' + ' + mod + attrLbl) : (mod < 0 ? (' ' + mod + attrLbl) : '');
            dmgFormula = '1d' + die + modStrW;
            critFormula = '2d' + die + modStrW;
            minDmg = 1 + mod;
            maxDmg = die + mod;
            critMin = 2 + mod;
            critMax = 2 * die + mod;
        }
        var titleHtml = atkSkill
            ? ('🎯 Usar ' + escHtml(atkSkill.n))
            : 'Atacar este alvo?';
        var html = '<div class="tcc-title">' + titleHtml + '</div>';
        html += '<div class="tcc-preview"><div class="tcc-ico">' + escHtml(u.ico) + '</div><div class="tcc-info">';
        html += '<div class="tcc-name">' + escHtml(u.n) + '</div>';
        html += '<div class="tcc-stats"><span class="tcc-n-ca">CA ' + u.ac + '</span> · <span class="' + hpCls + '">' + u.hp + '/' + u.mhp + ' PV</span></div>';
        html += '</div></div>';
        html += '<div class="tcc-dmg">';
        html += '<div class="tcc-dmg-row"><span class="tcc-dmg-lbl">Ataque</span><span class="tcc-dmg-val">';
        html += '<span class="tcc-n-muted">d20</span> + <span class="tcc-n-key">' + p.atk + '</span> <span class="tcc-vs">vs</span> <span class="tcc-n-ca">CA ' + u.ac + '</span>';
        html += '</span></div>';
        html += '<div class="tcc-dmg-row"><span class="tcc-dmg-lbl">Dano</span><span class="tcc-dmg-val">' + escHtml(dmgFormula) +
            ' (<span class="tcc-n-key">' + minDmg + '–' + maxDmg + '</span>)</span></div>';
        html += '<div class="tcc-dmg-row crit"><span class="tcc-dmg-lbl">Crítico (nat 20)</span><span class="tcc-dmg-val">' + escHtml(critFormula) +
            ' (<span class="tcc-n-key">' + critMin + '–' + critMax + '</span>)</span></div>';
        if (reductions.length) {
            html += '<div class="tcc-dmg-row reduction"><span class="tcc-dmg-lbl">🛡 Resistente</span><span class="tcc-dmg-val">' +
                escHtml(reductions.join(', ')) + ' (½ dano)</span></div>';
        }
        if (immunities.length) {
            html += '<div class="tcc-dmg-row immunity"><span class="tcc-dmg-lbl">✦ Imune</span><span class="tcc-dmg-val">' +
                escHtml(immunities.join(', ')) + ' (0 dano)</span></div>';
        }
        if (!reductions.length && !immunities.length) {
            html += '<div class="tcc-dmg-row"><span class="tcc-dmg-lbl">Reduções</span><span class="tcc-dmg-val tcc-none">— nenhuma —</span></div>';
        }
        html += '</div>';
        if (!skObj && p.cls === 'Guerreiro') {
            html += '<label class="c2-pa-row"><input type="checkbox" id="c2-power-atk"/> Ataque Poderoso (−5 no ataque, +10 no dano, PHB)</label>';
        }
        html += '<div class="tcc-actions"><button class="action-btn" data-tcc="cancel">✕ Cancelar</button><button class="action-btn primary" data-tcc="confirm">⚔ Confirmar</button></div>';
        setHTML(card, html);
        ov.appendChild(card);
        vOverlay.add(ov);
        function dismissOverlay() {
            try { ov.remove(); } catch (eR) {}
        }
        function cancelTarget() {
            _pendingPowerAttack = false;
            _pendingSkillSlot = null;
            _pendingSkill = null;
            _pendingHealItem = null;
            _selectingTarget = false;
            _selectHealTarget = false;
            dismissOverlay();
        }
        ov.addEventListener('click', function (e) { if (e.target === ov) cancelTarget(); });
        card.querySelector('[data-tcc="cancel"]').addEventListener('click', function () { cancelTarget(); });
        card.querySelector('[data-tcc="confirm"]').addEventListener('click', function () {
            var paCb = card.querySelector('#c2-power-atk');
            _pendingPowerAttack = !!(paCb && paCb.checked);
            dismissOverlay();
            confirmPendingAction(tgtIdx);
        });
    }

    function showAoESaveTargetChecklist(skillSlot, aliveIdxs) {
        var s = currentState;
        var p = s.order[s.p_idx];
        var sk = p.skills && p.skills[skillSlot];
        var row = sk && typeof sk === 'object' ? sk : {};
        var ov = document.createElement('div');
        ov.className = 'target-confirm-overlay';
        var card = document.createElement('div');
        card.className = 'target-confirm-card';
        var html = '<div class="tcc-title">' + escHtml(row.n || 'Magia') + ' — alvos</div>';
        html += '<p class="c2-info-intro c2-info-intro--inline">Marque os inimigos (uma rolagem de dano; teste de resistência por alvo).</p>';
        aliveIdxs.forEach(function (idx) {
            var u = s.order[idx];
            var id = 'c2aoe-' + idx;
            html += '<label class="c2-pa-row"><input type="checkbox" id="' + id + '" data-idx="' + idx + '" checked/> ' + escHtml(u.n) + '</label>';
        });
        html += '<div class="tcc-actions"><button type="button" class="action-btn" data-ac="0">Cancelar</button>';
        html += '<button type="button" class="action-btn primary" data-ac="1">Lançar</button></div>';
        setHTML(card, html);
        ov.appendChild(card);
        vOverlay.add(ov);
        ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
        card.querySelector('[data-ac="0"]').addEventListener('click', function () { ov.remove(); });
        card.querySelector('[data-ac="1"]').addEventListener('click', async function () {
            var chosen = [];
            card.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
                if (cb.checked) chosen.push(parseInt(cb.getAttribute('data-idx'), 10));
            });
            if (!chosen.length) return;
            ov.remove();
            try {
                await remoteAction({ type: 'skill', slot: skillSlot, targets: chosen });
            } catch (eA) { console.error('[COMBAT2]', 'aoe_skill', eA || ''); }
        });
    }

    function showHealTargetConfirm(tgtIdx) {
        var s = currentState;
        var p = s.order[s.p_idx];
        var u = s.order[tgtIdx];
        if (!u || (u.t !== 'p' && u.t !== 'a')) return;
        var sk = (_pendingSkillSlot != null && p.skills) ? p.skills[_pendingSkillSlot] : null;
        var skn = (_pendingHealItem && p.bag && p.bag[_pendingHealItem.bagIdx])
            ? p.bag[_pendingHealItem.bagIdx].n
            : (sk && typeof sk === 'object' ? sk.n : 'Cura');
        var ov = document.createElement('div');
        ov.className = 'target-confirm-overlay';
        var card = document.createElement('div');
        card.className = 'target-confirm-card';
        var hpPct = Math.round((u.hp / u.mhp) * 100);
        var hpCls = hpPct > 60 ? 'hp-high' : (hpPct > 25 ? 'hp-mid' : 'hp-low');
        var html = '<div class="tcc-title">' + escHtml(skn) + ' em ' + escHtml(u.n) + '?</div>';
        html += '<div class="tcc-preview"><div class="tcc-ico">' + escHtml(u.ico) + '</div><div class="tcc-info"><div class="tcc-name">' + escHtml(u.n) + '</div><div class="tcc-stats"><span class="' + hpCls + '">' + u.hp + '/' + u.mhp + ' PV</span></div></div></div>';
        html += '<div class="tcc-hint-block"><span class="c2-info-kicker">Cura</span>';
        html += '<p class="c2-info-intro c2-info-intro--inline">O custo em recurso já foi reservado; confirme se este é o alvo desejado.</p></div>';
        html += '<div class="tcc-actions"><button class="action-btn" data-tcc="cancel">✕ Cancelar</button><button class="action-btn primary" data-tcc="confirm">✓ Confirmar</button></div>';
        setHTML(card, html);
        ov.appendChild(card);
        vOverlay.add(ov);
        ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
        card.querySelector('[data-tcc="cancel"]').addEventListener('click', function () {
            _pendingHealItem = null;
            _selectHealTarget = false;
            ov.remove();
            render(currentState);
        });
        card.querySelector('[data-tcc="confirm"]').addEventListener('click', function () { ov.remove(); confirmPendingAction(tgtIdx); });
    }

    function openUnitDetail(uid) {
        if (!currentState) return;
        var u = null;
        if (uid === 'player') u = currentState.order[currentState.p_idx];
        else if (uid && uid.indexOf('enemy_') === 0) u = currentState.order[parseInt(uid.slice(6), 10)];
        else if (uid && uid.indexOf('ally_') === 0) u = currentState.order[parseInt(uid.slice(5), 10)];
        if (!u) return;
        var ov = document.createElement('div');
        ov.className = 'unit-detail-overlay';
        ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
        var card = document.createElement('div');
        card.className = 'unit-detail-card';
        var html = '<button class="udc-close" aria-label="Fechar">×</button>';
        html += '<div class="udc-header"><div class="udc-ico">' + escHtml(u.ico) + '</div><div class="udc-id">';
        html += '<div class="udc-name">' + escHtml(u.n) + '</div>';
        if (u.t === 'p') html += '<div class="udc-sub">' + escHtml(u.cls || 'Aventureiro') + ' · Nível ' + (u.lvl || 1) + '</div>';
        else html += '<div class="udc-sub">' + escHtml(u.species || 'Criatura') + ' · Nível sugerido ' + (u.sugLvl || 1) + '</div>';
        html += '</div></div>';
        html += '<div class="udc-section"><div class="udc-section-title">Status</div><div class="udc-stats">';
        var hpPct = Math.round((u.hp / u.mhp) * 100);
        var hpCls = hpPct > 60 ? 'hp-high' : (hpPct > 25 ? 'hp-mid' : 'hp-low');
        html += '<div class="udc-stat"><span class="udc-stat-lbl">PV</span><span class="udc-stat-val ' + hpCls + '">' + u.hp + ' / ' + u.mhp + '</span></div>';
        if (u.res && u.res.max) html += '<div class="udc-stat"><span class="udc-stat-lbl">' + escHtml(u.res.name) + '</span><span class="udc-stat-val res ' + u.res.type + '">' + u.res.ico + ' ' + u.res.value + ' / ' + u.res.max + '</span></div>';
        html += '<div class="udc-stat"><span class="udc-stat-lbl">CA</span><span class="udc-stat-val">' + u.ac + '</span></div>';
        html += '<div class="udc-stat"><span class="udc-stat-lbl">Ataque</span><span class="udc-stat-val">+' + u.atk + '</span></div>';
        html += '<div class="udc-stat"><span class="udc-stat-lbl">Dano</span><span class="udc-stat-val">1d' + u.die + (u.dmgMod ? '+' + u.dmgMod : '') + '</span></div>';
        html += '<div class="udc-stat"><span class="udc-stat-lbl">DEX</span><span class="udc-stat-val">' + u.dex + '</span></div>';
        html += '</div></div>';
        html += '<div class="udc-section"><div class="udc-section-title">Habilidades</div>';
        var skills = u.skills || (u.t === 'e' ? ['Ataque corpo a corpo'] : []);
        if (skills.length) { html += '<ul class="udc-skills">'; skills.forEach(function (sk) { html += '<li>' + escHtml(typeof sk === 'string' ? sk : sk.n) + '</li>'; }); html += '</ul>'; }
        else html += '<div class="udc-empty">— sem habilidades especiais —</div>';
        html += '</div>';
        setHTML(card, html);
        card.querySelector('.udc-close').addEventListener('click', function () { ov.remove(); });
        ov.appendChild(card);
        vOverlay.add(ov);
    }

    function openSkillsPanel() {
        var p = currentState.order[currentState.p_idx];
        if (!p || !p.skills || !p.skills.length) return;
        var ov = document.createElement('div');
        ov.className = 'list-panel-overlay';
        var card = document.createElement('div');
        card.className = 'list-panel-card';
        var html = '<div class="lp-title">🎯 Habilidades</div>';
        html += '<div class="lp-sub">' + (p.res ? escHtml(p.res.ico) + ' ' + p.res.value + '/' + p.res.max + ' ' + escHtml(p.res.name) : '') + '</div>';
        html += '<div class="lp-list">';
        p.skills.forEach(function (sk, idx) {
            var row = typeof sk === 'string' ? { n: sk, cost: 0, kind: 'attack', ico: '✨' } : sk;
            var cost = parseInt(row.cost, 10) || 0;
            /* Refinamento Fase 4 — gating completo PHB (não só MP). */
            var usability = _simSkillUsable(p, row);
            var canUse = usability.usable;
            var dis = canUse ? '' : ' disabled';
            var resIco = p.res && p.res.ico != null ? escHtml(p.res.ico) : '';
            var costCls = 'lp-item-cost' + (canUse ? ' qty' : ' cant');
            /* Refinamento Fase 5 — mini-badge de recurso (◆ ação / ▲ bônus / ⬢ reação). */
            var resKind = (typeof _skillResourceKind === 'function') ? _skillResourceKind(row) : 'action';
            var resGlyph = (typeof _resourceGlyphFor === 'function') ? _resourceGlyphFor(resKind) : '';
            var resBadge = resGlyph ? ' <span class="lp-item-res-badge res-' + resKind + '" aria-hidden="true">' + resGlyph + '</span>' : '';
            html += '<div class="lp-item-wrap">';
            html += '<button type="button" class="lp-item' + dis + '" data-skill-idx="' + idx + '"' + dis + '>';
            html += '<div class="lp-item-ico">' + escHtml(row.ico || '✨') + '</div><div class="lp-item-body">';
            html += '<div class="lp-item-name">' + escHtml(row.n) + resBadge + '</div>';
            if (row.desc) html += '<div class="lp-item-desc">' + escHtml(row.desc) + '</div>';
            /* Chip explicativo embaixo quando skill bloqueada — UX direta sem popup de erro. */
            if (!canUse && usability.reason) {
                html += '<div class="lp-item-block-chip" title="' + escHtml(usability.reason) + '">⊘ ' + escHtml(usability.reason) + '</div>';
            }
            html += '</div><div class="' + costCls + '">' + resIco + (resIco ? ' ' : '') + cost + '</div></button>';
            html += '<button type="button" class="lp-item-help" data-skill-help="' + idx + '" title="Detalhes D&D 5e" aria-label="Detalhes técnicos D&D 5e">?</button>';
            html += '</div>';
        });
        html += '</div><button type="button" class="lp-close" data-close="1">Fechar</button>';
        setHTML(card, html);
        ov.appendChild(card);
        vOverlay.add(ov);
        ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
        card.querySelector('[data-close]').addEventListener('click', function () { ov.remove(); });
        card.querySelectorAll('[data-skill-help]').forEach(function (hb) {
            hb.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var hi = parseInt(hb.getAttribute('data-skill-help'), 10);
                if (!isNaN(hi) && p.skills[hi]) {
                    var skH = p.skills[hi];
                    var rowH = typeof skH === 'string' ? { n: skH, desc: '' } : skH;
                    openSkillHelpMini(card, rowH);
                }
            });
        });
        card.querySelectorAll('[data-skill-idx]').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                if (btn.hasAttribute('disabled')) return;
                var idx = parseInt(btn.getAttribute('data-skill-idx'), 10);
                var sk = p.skills[idx];
                var row = typeof sk === 'string' ? { n: sk, kind: 'attack', cost: 0 } : sk;
                ov.remove();
                if (row.kind === 'buff') {
                    try { await remoteAction({ type: 'skill', slot: idx }); } catch (e3) { console.error('[COMBAT2]', 'skill_buff', e3 || ''); }
                    return;
                }
                if (row.kind === 'heal') {
                    if (row.healTargets === 'self') {
                        try {
                            await remoteAction({ type: 'skill', slot: idx, target: currentState.p_idx });
                        } catch (e4) { console.error('[COMBAT2]', 'skill_heal_self', e4 || ''); }
                        return;
                    }
                    _pendingSkillSlot = idx;
                    _selectHealTarget = true;
                    render(currentState);
                    return;
                }
                if (row.kind === 'attack') {
                    if (row.multiTarget && row.save) {
                        var aliveIdxs2 = [];
                        for (var aj = 0; aj < currentState.order.length; aj++) {
                            var oc2 = currentState.order[aj];
                            if (oc2 && oc2.t === 'e' && oc2.alive) aliveIdxs2.push(aj);
                        }
                        if (aliveIdxs2.length > 1) {
                            showAoESaveTargetChecklist(idx, aliveIdxs2);
                            return;
                        }
                    }
                    _pendingSkillSlot = idx;
                    var aliveIdxs = [];
                    for (var ai = 0; ai < currentState.order.length; ai++) {
                        var oc = currentState.order[ai];
                        if (oc && oc.t === 'e' && oc.alive) aliveIdxs.push(ai);
                    }
                    if (aliveIdxs.length === 1) {
                        showTargetConfirm(aliveIdxs[0]);
                    } else {
                        _selectingTarget = true;
                        render(currentState);
                    }
                }
            });
        });
    }

    function openCombatLog() {
        if (!currentState) return;
        var s = currentState;
        var ov = document.createElement('div');
        ov.className = 'list-panel-overlay';
        var card = document.createElement('div');
        card.className = 'list-panel-card list-panel-card--log';
        var html = '<div class="lp-title">Log do combate</div><div class="lp-sub">Por rodada</div>';
        html += '<div class="lp-lead-block lp-lead-block--dim"><span class="c2-info-kicker">Referência</span>';
        html += '<p class="c2-info-intro c2-info-intro--inline">Rodadas mais recentes no topo; dentro de cada rodada, ordem cronológica. Mesmo registro do servidor.</p></div>';
        html += '<div class="lp-log-scroll">';
        if (!(s.log || []).length) html += '<div class="lp-empty">Sem entradas ainda.</div>';
        else html += formatCombat2LogByRounds(s.log || [], { reverseRounds: true });
        html += '</div><button type="button" class="lp-close" data-close="1">Fechar</button>';
        setHTML(card, html);
        ov.appendChild(card);
        vOverlay.add(ov);
        ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
        card.querySelector('[data-close]').addEventListener('click', function () { ov.remove(); });
    }

    function openBagPanel() {
        var p = currentState.order[currentState.p_idx];
        if (!p) return;
        var bag = p.bag || [];
        var ov = document.createElement('div');
        ov.className = 'list-panel-overlay';
        var card = document.createElement('div');
        card.className = 'list-panel-card';
        var html = '<div class="lp-title">Mochila</div>';
        html += '<div class="lp-sub">' + bag.length + ' tipo(s) de item</div>';
        html += '<div class="lp-lead-block lp-lead-block--dim"><span class="c2-info-kicker">Uso</span>';
        html += '<p class="c2-info-intro c2-info-intro--inline">Toque num item para consumir conforme as regras do encontro; quantidade aparece à direita.</p></div>';
        html += '<div class="lp-list">';
        if (!bag.length) html += '<div class="lp-empty">Mochila vazia</div>';
        bag.forEach(function (it, i) {
            var canUse = (it.qty || 0) > 0;
            html += '<button type="button" class="lp-item' + (canUse ? '' : ' disabled') + '" data-item="' + i + '"' + (canUse ? '' : ' disabled') + '>';
            html += '<div class="lp-item-ico">' + escHtml(it.ico || '') + '</div>';
            html += '<div class="lp-item-body"><div class="lp-item-name">' + escHtml(it.n || '') + '</div>';
            html += '<div class="lp-item-desc">' + escHtml(it.desc || '') + '</div></div>';
            html += '<div class="lp-item-cost qty">x' + (it.qty || 0) + '</div></button>';
        });
        html += '</div><button type="button" class="lp-close" data-close="1">Fechar</button>';
        setHTML(card, html);
        ov.appendChild(card);
        vOverlay.add(ov);
        ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
        card.querySelector('[data-close]').addEventListener('click', function () { ov.remove(); });
        card.querySelectorAll('[data-item]').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                if (btn.hasAttribute('disabled')) return;
                var idx = parseInt(btn.getAttribute('data-item'), 10);
                var it = bag[idx];
                var eff = it && it.effect;
                ov.remove();
                if (eff && eff.hp) {
                    _pendingHealItem = { bagIdx: idx };
                    _selectHealTarget = true;
                    _selectingTarget = false;
                    _actionSheetOpen = false;
                    render(currentState);
                    return;
                }
                try {
                    await remoteAction({ type: 'use_item', slot: idx });
                } catch (e2) {
                    console.error('[COMBAT2]', 'use_item failed', e2 || '');
                }
            });
        });
    }

    /* ============================================================
     * BOOT
     * ============================================================ */
    function loadScript(src, cb) {
        var s = document.createElement('script');
        s.src = src; s.async = false;
        s.onload = cb; s.onerror = cb;
        vOverlay.add(s);
    }

    async function init() {
        if (!TOKEN) {
            document.getElementById('app').innerHTML = '<div class="loading-msg" style="color:#c06a3a">Token ausente. Abra via bot.</div>';
            return;
        }
        try { if (window.vProcessing) vProcessing.show({ text: 'Carregando...' }); } catch (eVp2) {}
        try {
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.ready();
                window.Telegram.WebApp.expand();
            }
        } catch (e) {}
        tryValdoriaAudioInit();
        loadScript('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js', function () {
            loadScript(BASE + '/shared/dice-3d.js?v=' + Date.now(), async function () {
                try {
                    var resp = await fetchState();
                    if (resp.error) {
                        document.getElementById('app').innerHTML = '<div class="loading-msg" style="color:#c06a3a">' + resp.error + '</div>';
                        return;
                    }
                    currentState = resp.state || resp;
                    ensureCombatVfxRuntime();
                    render(currentState);
                    try { if (window.vProcessing) vProcessing.hide(); } catch (eVh) {}
                } catch (e) {
                    console.error('[COMBAT2]', 'init_failed', {
                        tokenLen: (TOKEN || '').length,
                        apiBaseLen: (API_BASE || '').length,
                        apiHost: (function () {
                            try { return new URL(API_BASE || location.origin).host; } catch (e2) { return ''; }
                        })()
                    }, e || '');
                    document.getElementById('app').innerHTML = '<div class="loading-msg" style="color:#c06a3a">Erro ao carregar combate: ' + (e && e.message ? e.message : String(e)) + '</div>';
                }
            });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
