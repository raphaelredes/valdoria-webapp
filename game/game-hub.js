/* ============================================================
   game-hub.js — Renderizador dedicado do City Hub
   Constroi o layout do hub principal da cidade dentro do
   content area fornecido pelo game-renderer.js.
   ============================================================ */
'use strict';

/* ── Helpers DOM ─────────────────────────────────────────────── */

function _hubDiv(cls) {
    var d = document.createElement('div');
    if (cls) d.className = cls;
    return d;
}

function _hubSpan(cls, text) {
    var s = document.createElement('span');
    if (cls) s.className = cls;
    if (text) s.textContent = text;
    return s;
}

function _hubBtn(cls, text, cb) {
    var b = document.createElement('button');
    b.className = cls || '';
    b.textContent = text || '';
    if (cb) {
        b.addEventListener('click', function () {
            if (typeof haptic === 'function') haptic('medium');
            if (typeof doAction === 'function') doAction(cb);
        });
    }
    return b;
}

/** HTML-safe escaping */
function _hubEsc(s) {
    if (typeof vEsc === 'function') return vEsc(s);
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
}

/* ── Location Mapping ────────────────────────────────────────── */

// === SYNC_REGION: _LOC_MAP BEGIN ===
var _LOC_MAP = (function(){
    function S(id) { return '<svg viewBox="0 0 120 120"><use href="#' + id + '"/></svg>'; }
    return {
        'tavern':           { ico: S('ic-taverna'), nm: 'Taverna' },
        'taverna':          { ico: S('ic-taverna'), nm: 'Taverna' },
        'inn':              { ico: S('ic-estalagem'), nm: 'Estalagem' },
        'estalagem':        { ico: S('ic-estalagem'), nm: 'Estalagem' },
        'open_inn':         { ico: S('ic-estalagem'), nm: 'Estalagem' },
        'arena':            { ico: S('ic-arena'),    nm: 'Arena' },
        'arena_main':       { ico: S('ic-arena'),    nm: 'Arena' },
        'market':           { ico: S('ic-mercado'),  nm: 'Mercado' },
        'mercado':          { ico: S('ic-mercado'),  nm: 'Mercado' },
        'city_locations':   { ico: S('ic-portoes'),  nm: 'Cidade' },
        'action_city_locations': { ico: S('ic-portoes'), nm: 'Cidade' },
        'guild':            { ico: S('ic-paladino'), nm: 'Guilda' },
        'guilda':           { ico: S('ic-paladino'), nm: 'Guilda' },
        'temple':           { ico: S('ic-templo'),   nm: 'Templo' },
        'templo':           { ico: S('ic-templo'),   nm: 'Templo' },
        'gates':            { ico: S('ic-portoes'),  nm: 'Portões' },
        'portoes':          { ico: S('ic-portoes'),  nm: 'Portões' },
        'passagens':        { ico: S('ic-portoes'),  nm: 'Passagens' },
        'passages':         { ico: S('ic-portoes'),  nm: 'Passagens' },
        'sewer':            { ico: S('ic-portoes'),  nm: 'Esgoto' },
        'square':           { ico: S('ic-praca'),    nm: 'Praça' },
        'praca':            { ico: S('ic-praca'),    nm: 'Praça' },
        'bank':             { ico: S('ic-banco'),    nm: 'Banco' },
        'banco':            { ico: S('ic-banco'),    nm: 'Banco' },
        'action_quests':    { ico: S('ic-missões'),  nm: 'Missões' },
        'quests':           { ico: S('ic-missões'),  nm: 'Missões' },
        'daily_challenge':  { ico: S('ic-desafio'),  nm: 'Desafio' },
        'action_codex':     { ico: S('ic-compendio'),nm: 'Compêndio' },
        'codex':            { ico: S('ic-compendio'),nm: 'Compêndio' },
        'festival':         { ico: S('ic-festival'), nm: 'Festival' },
        'league_':          { ico: S('ic-desafio'),  nm: 'Liga' },
        'manage_':          { ico: S('ic-grupo'),    nm: 'Contas' },
        'open_workshop':    { ico: S('ic-oficina'),  nm: 'Oficina' },
        'rel_':             { ico: S('ic-vínculos'), nm: 'Vínculos' },
        'rune_scribe':      { ico: S('ic-runas'),    nm: 'Runas' },
        'shadow_alley':     { ico: S('ic-portoes'),  nm: 'Beco' },
        'workshop_':        { ico: S('ic-oficina'),  nm: 'Oficina' },
        'cartografia':      { ico: S('ic-cartografia'), nm: 'Mapa' },
        'travel':           { ico: S('ic-cartografia'), nm: 'Viajar' },
        'druid':            { ico: S('ic-druida'),   nm: 'Druida' },
        'ach_':             { ico: S('ic-desafio'),  nm: 'Conquistas' }
    };
})();
// === SYNC_REGION END ===

/** Classifica um callback de botao como localizacao conhecida.
 *  Exact match first, then substring — prevents greedy substring
 *  from shadowing more-specific keys (e.g. 'city_locations' matching
 *  before 'action_city_locations'). */
function _matchLocation(cb) {
    if (!cb) return null;
    var lower = cb.toLowerCase();
    /* 1. Exact match (highest priority) */
    if (_LOC_MAP.hasOwnProperty(lower)) return _LOC_MAP[lower];
    /* 2. Longest substring match — iterate by key length descending
       so 'action_city_locations' beats 'city_locations' beats 'action_' */
    var bestKey = null;
    var bestLen = 0;
    for (var key in _LOC_MAP) {
        if (key.length > bestLen && lower.indexOf(key) >= 0) {
            bestKey = key;
            bestLen = key.length;
        }
    }
    return bestKey ? _LOC_MAP[bestKey] : null;
}

/** Extrai badge numerico do texto do botao, ex: "Missoes (3)" -> 3 */
function _extractBadge(text) {
    var m = (text || '').match(/\((\d+)\)\s*$/);
    return m ? parseInt(m[1], 10) : 0;
}

/** Verifica se um botao e o CTA de aventura */
function _isCTA(btn) {
    var t = (btn.text || '').toUpperCase();
    var c = (btn.cb || '').toLowerCase();
    return t.indexOf('PARTIR') >= 0
        || t.indexOf('AVENTURA') >= 0
        || c.indexOf('explore') >= 0
        || c.indexOf('partir') >= 0;
}

/* ── Coin icon wrapper (usa vCity.coin de game-city-shared.js) ── */

function _hubCoin(size) {
    if (typeof vCity !== 'undefined' && vCity.coin) return vCity.coin(size);
    /* Fallback manual caso vCity nao carregou */
    var c = document.createElement('span');
    c.className = 'vi vi-coin' + (size ? ' ' + size : '');
    return c;
}


/* ================================================================
   RENDERIZADOR PRINCIPAL
   ================================================================ */

/**
 * Renderiza o conteudo do City Hub dentro do elemento fornecido.
 * Chamado pelo game-renderer.js quando a tela e o hub da cidade.
 *
 * @param {HTMLElement} el  — container de conteudo (o #content)
 * @param {Object} screen   — dados completos da tela do serializer
 */
// === SYNC_REGION: renderHubScreen BEGIN ===
function renderHubScreen(el, screen) {
    el.className = 'hub-screen';
    var frag = document.createDocumentFragment();

    /* Flatten all buttons from rows into a single list */
    var allBtns = [];
    var rows = screen.buttons || [];
    for (var ri = 0; ri < rows.length; ri++) {
        var row = rows[ri];
        if (!row) continue;
        for (var bi = 0; bi < row.length; bi++) {
            if (row[bi]) allBtns.push(row[bi]);
        }
    }

    /* ── 1. Suggested Action ─────────────────────────────────── */
    var sa = screen.suggested_action;
    if (sa && sa.text) {
        var suggestEl = _hubDiv('hub-suggest');
        suggestEl.textContent = sa.text;
        suggestEl.style.cursor = 'pointer';
        suggestEl.addEventListener('click', function () {
            if (typeof haptic === 'function') haptic('medium');
            if (sa.cb && typeof doAction === 'function') doAction(sa.cb);
        });
        frag.appendChild(suggestEl);
    }

    /* ── 2. CTA — "PARTIR PARA AVENTURA" ─────────────────────── */
    var ctaBtn = null;
    for (var ci = 0; ci < allBtns.length; ci++) {
        if (_isCTA(allBtns[ci])) { ctaBtn = allBtns[ci]; break; }
    }
    if (ctaBtn) {
        var ctaEl = _hubBtn('hub-cta', ctaBtn.text || 'PARTIR PARA AVENTURA', ctaBtn.cb);
        frag.appendChild(ctaEl);
    }

        /* ── 2.1 Opções de Regiões da Cidade (Cartografia Urbana Visual) ─── */
    var districtsWrap = _hubDiv('hub-districts-section');
    districtsWrap.innerHTML = ''
      + '<div class="hub-districts-header">'
      + '  <span>Distritos de Valdoria</span>'
      + '</div>';

    // 0. Cartão de Visão Geral
    var ovCard = document.createElement('div');
    ovCard.className = 'hub-district-card overview-card';
    ovCard.innerHTML = ''
      + '<div class="hdc-info">'
      + '  <div class="hdc-title"><span>🏛️</span> Mapa Geral da Capital</div>'
      + '  <div class="hdc-sub">Visão panorâmica de toda a cidade fortificada</div>'
      + '</div>'
      + '<div class="hdc-badge">Ver Mapa</div>';
    ovCard.addEventListener('click', function() {
      if (typeof haptic === 'function') haptic('light');
      _openCityMapModal('city_overview');
    });
    districtsWrap.appendChild(ovCard);

    // 1. Distrito Sul & Portões
    var d1Card = document.createElement('div');
    d1Card.className = 'hub-district-card';
    d1Card.innerHTML = ''
      + '<div class="hdc-info">'
      + '  <div class="hdc-title"><span>🏰</span> Distrito Sul & Portões</div>'
      + '  <div class="hdc-sub">Portões de Valdoria • Taverna do Javali • Estalagem do Grifo</div>'
      + '</div>'
      + '<div class="hdc-badge">Abrir</div>';
    d1Card.addEventListener('click', function() {
      if (typeof haptic === 'function') haptic('light');
      _openCityMapModal('city_south');
    });
    districtsWrap.appendChild(d1Card);

    // 2. Distrito Mercantil & Praça Central
    var d2Card = document.createElement('div');
    d2Card.className = 'hub-district-card';
    d2Card.innerHTML = ''
      + '<div class="hdc-info">'
      + '  <div class="hdc-title"><span>⚖️</span> Distrito Mercantil & Praça</div>'
      + '  <div class="hdc-sub">Praça Central • Mercado Central • Banco & Cofre • Oficina & Forja</div>'
      + '</div>'
      + '<div class="hdc-badge">Abrir</div>';
    d2Card.addEventListener('click', function() {
      if (typeof haptic === 'function') haptic('light');
      _openCityMapModal('city_market');
    });
    districtsWrap.appendChild(d2Card);

    // 3. Distrito Militar & Coliseu
    var d3Card = document.createElement('div');
    d3Card.className = 'hub-district-card';
    d3Card.innerHTML = ''
      + '<div class="hdc-info">'
      + '  <div class="hdc-title"><span>⚔️</span> Distrito Militar & Coliseu</div>'
      + '  <div class="hdc-sub">Guilda dos Mercenários • Arena do Coliseu</div>'
      + '</div>'
      + '<div class="hdc-badge">Abrir</div>';
    d3Card.addEventListener('click', function() {
      if (typeof haptic === 'function') haptic('light');
      _openCityMapModal('city_military');
    });
    districtsWrap.appendChild(d3Card);

    // 4. Distrito Sagrado & Acrópole
    var d4Card = document.createElement('div');
    d4Card.className = 'hub-district-card';
    d4Card.innerHTML = ''
      + '<div class="hdc-info">'
      + '  <div class="hdc-title"><span>🕊️</span> Distrito Sagrado & Acrópole</div>'
      + '  <div class="hdc-sub">Templo da Luz Sagrada • Escriba Rúnico • Festival da Capital</div>'
      + '</div>'
      + '<div class="hdc-badge">Abrir</div>';
    d4Card.addEventListener('click', function() {
      if (typeof haptic === 'function') haptic('light');
      _openCityMapModal('city_high');
    });
    districtsWrap.appendChild(d4Card);

    frag.appendChild(districtsWrap);

/* ── 7. Quest Mini Tracker ───────────────────────────────── */
    var qt = screen.quest_tracker;
    if (qt && qt.quests && qt.quests.length > 0) {
        for (var qi = 0; qi < qt.quests.length; qi++) {
            frag.appendChild(_buildQuestRow(qt.quests[qi]));
        }
    }

    /* ── 8. Progress Strip ───────────────────────────────────── */
    var ps = screen.progress_strip;
    var pStats = screen.player_stats;
    if (ps || (pStats && pStats.kills > 0)) {
        var progRow = _hubDiv('hub-prog');

        if (ps) {
            /* Liga */
            var leagueCard = _hubDiv('hub-prog-card');
            leagueCard.style.cursor = 'pointer';
            leagueCard.addEventListener('click', function () {
                if (typeof haptic === 'function') haptic('light');
                if (ps.league_cb && typeof doAction === 'function') doAction(ps.league_cb);
            });
            // ps.league_icon agora é ID heráldico (ic-liga-bronze/prata/ouro/...)
            var leagueIconId = ps.league_icon || 'ic-liga-bronze';
            var leagueColor = ps.league_color || '#cd7f32';
            var leagueVal = _hubDiv('hp-val');
            leagueVal.innerHTML = '<svg viewBox="0 0 120 120" style="width:14px;height:14px;vertical-align:middle;margin-right:3px;color:' + leagueColor + ';"><use href="#' + leagueIconId + '"/></svg>' + (ps.league_xp || 0).toLocaleString('pt-BR');
            leagueCard.appendChild(leagueVal);
            var leagueLbl = _hubDiv('hp-lbl');
            leagueLbl.textContent = ps.league_name || 'Liga';
            leagueCard.appendChild(leagueLbl);
            progRow.appendChild(leagueCard);

            /* Conquistas */
            var achCard = _hubDiv('hub-prog-card');
            achCard.style.cursor = 'pointer';
            achCard.addEventListener('click', function () {
                if (typeof haptic === 'function') haptic('light');
                if (ps.ach_cb && typeof doAction === 'function') doAction(ps.ach_cb);
            });
            var achVal = _hubDiv('hp-val');
            achVal.innerHTML = '<svg viewBox="0 0 120 120" style="width:14px;height:14px;vertical-align:middle;margin-right:3px;color:' + (HERALDIC_COLORS['ic-trofeu'] || '#e8d878') + ';"><use href="#ic-trofeu"/></svg>' + (ps.ach_unlocked || 0) + '/' + (ps.ach_total || 0);
            achCard.appendChild(achVal);
            var achLbl = _hubDiv('hp-lbl');
            achLbl.textContent = 'Conquistas';
            achCard.appendChild(achLbl);
            progRow.appendChild(achCard);
        }

        /* Combat stats (from _player_stats) */
        if (pStats && pStats.kills > 0) {
            var killCard = _hubDiv('hub-prog-card');
            killCard.style.cursor = 'pointer';
            killCard.addEventListener('click', function () {
                if (typeof haptic === 'function') haptic('light');
                if (typeof doAction === 'function') doAction(pStats.kills_cb || 'kills_log');
            });
            var killVal = _hubDiv('hp-val');
            killVal.innerHTML = '<svg viewBox="0 0 120 120" style="width:14px;height:14px;vertical-align:middle;margin-right:3px;color:' + (HERALDIC_COLORS['ic-ach-algoz'] || '#c43020') + ';"><use href="#ic-ach-algoz"/></svg>' + pStats.kills;
            killCard.appendChild(killVal);
            var killLbl = _hubDiv('hp-lbl');
            killLbl.textContent = 'Abates';
            killCard.appendChild(killLbl);
            progRow.appendChild(killCard);
        }
        if (pStats && pStats.streak > 0) {
            var streakCard = _hubDiv('hub-prog-card');
            streakCard.style.cursor = 'pointer';
            streakCard.addEventListener('click', function () {
                if (typeof haptic === 'function') haptic('light');
                if (typeof doAction === 'function') doAction(pStats.streak_cb || 'streak_log');
            });
            var streakVal = _hubDiv('hp-val');
            streakVal.innerHTML = '<svg viewBox="0 0 120 120" style="width:14px;height:14px;vertical-align:middle;margin-right:3px;color:#ff8a4a;"><use href="#ic-ach-indomavel"/></svg>' + pStats.streak;
            streakCard.appendChild(streakVal);
            var streakLbl = _hubDiv('hp-lbl');
            streakLbl.textContent = 'Sequência';
            streakCard.appendChild(streakLbl);
            progRow.appendChild(streakCard);
        }

        frag.appendChild(progRow);
    }

    /* ── 8b. Daily Challenge Badge ──────────────────────────── */
    var dcb = screen.daily_challenge_badge;
    if (dcb && !dcb.completed && dcb.dungeon_name) {
        var dcEl = _hubDiv('hub-dc-badge');
        dcEl.style.cursor = 'pointer';
        dcEl.addEventListener('click', function () {
            if (typeof haptic === 'function') haptic('light');
            if (typeof doAction === 'function') doAction('daily_challenge_main');
        });
        /* Sess\u00E3o #64 (2026-05-30): sem emoji de lobo \u2014 user pediu s\u00F3 texto. */
        dcEl.textContent = 'Desafio: ' + dcb.dungeon_name;
        frag.appendChild(dcEl);
    }

    /* ── 9. DM Tip ───────────────────────────────────────────── */
    /* DM Tip REMOVIDO 2026-05-08 (X-6.5.51AQ): irrelevante, jogador n\u00E3o l\u00EA,
       ocupava espa\u00E7o no hub. Conte\u00FAdo `_dm_tip` do backend \u00E9 ignorado. */

    /* Append everything to the container */
    el.appendChild(frag);
}

/* ── MODAL POPUP EM TELA CHEIA: MAPA DA CIDADE DE VALDORIA ──────────────── */
// Dados dos 4 Distritos Regionais de Valdoria + Visao Geral
var CITY_DISTRICTS_DATA = {
  'city_overview': {
    id: 'city_overview',
    name: 'Visão Geral',
    fullName: 'Capital de Valdoria (Visão Geral)',
    img: '/shared/img/map/provinces/city.webp',
    landmarks: [
      { id: 'anchor_south', name: 'Distrito Sul & Portões', ico: '🏰', x: 50, y: 84, targetDistrict: 'city_south', desc: 'Portões fortificados, Taverna do Javali Bêbado e Estalagem do Grifo.', btnText: 'Explorar Distrito Sul' },
      { id: 'anchor_market', name: 'Distrito Mercantil', ico: '⚖️', x: 44, y: 52, targetDistrict: 'city_market', desc: 'O coração pulsante da cidade: Praça Central, Mercado, Banco e Oficina.', btnText: 'Explorar Distrito Mercantil' },
      { id: 'anchor_military', name: 'Distrito Militar', ico: '⚔️', x: 74, y: 38, targetDistrict: 'city_military', desc: 'Quartel dos guerreiros, Guilda dos Mercenários e Arena do Coliseu.', btnText: 'Explorar Distrito Militar' },
      { id: 'anchor_high', name: 'Distrito Sagrado', ico: '🕊️', x: 50, y: 20, targetDistrict: 'city_high', desc: 'Acrópole da Luz: Templo da Luz Sagrada, Escriba Rúnico e Festival.', btnText: 'Explorar Distrito Sagrado' }
    ]
  },
  'city_south': {
    id: 'city_south',
    name: 'Distrito Sul',
    fullName: 'Distrito Sul & Portões de Valdoria',
    img: '/shared/img/map/city_districts/city_south.webp',
    landmarks: [
      { id: 'loc_gates', name: 'Portões de Valdoria', ico: '🏰', x: 50, y: 80, cb: 'explore_main', desc: 'Muralhas fortificadas, sentinelas de vigília e saída sul rumo às planícies.', btnText: 'Partir para Aventura' },
      { id: 'loc_tavern', name: 'Taverna do Javali Bêbado', ico: '🍺', x: 26, y: 44, cb: 'tavern', desc: 'Canecas cheias de hidromel, lareira crepitante, descanso e boatos das estradas.', btnText: 'Entrar na Taverna' },
      { id: 'loc_inn', name: 'Estalagem do Grifo', ico: '🛏️', x: 74, y: 44, cb: 'inn', desc: 'Aposentos confortáveis e silêncio reparador para descanso longo e recuperação total.', btnText: 'Descansar na Estalagem' }
    ]
  },
  'city_market': {
    id: 'city_market',
    name: 'Distrito Mercantil',
    fullName: 'Distrito Mercantil & Praça Central',
    img: '/shared/img/map/city_districts/city_market.webp',
    landmarks: [
      { id: 'loc_square', name: 'Praça Central', ico: '🏛️', x: 50, y: 52, cb: 'square', desc: 'O coração pulsante da capital: pregoeiros, bardos, jogos de dados e contratações.', btnText: 'Visitar a Praça' },
      { id: 'loc_market', name: 'Mercado Central', ico: '⚖️', x: 25, y: 72, cb: 'market', desc: 'Bancas de mercadores, ferreiros, boticários, armaduras e suprimentos de marcha.', btnText: 'Negociar no Mercado' },
      { id: 'loc_bank', name: 'Banco & Cofre', ico: '🏦', x: 75, y: 35, cb: 'bank', desc: 'Cofres de pedra maciça, cambistas juramentados e guarda segura para suas riquezas.', btnText: 'Acessar o Banco' },
      { id: 'loc_workshop', name: 'Oficina & Forja', ico: '⚒️', x: 25, y: 32, cb: 'open_workshop', desc: 'Forjas incandescentes, conserto de lâminas, bigornas e aprimoramento de armas.', btnText: 'Trabalhar na Oficina' }
    ]
  },
  'city_military': {
    id: 'city_military',
    name: 'Distrito Militar',
    fullName: 'Distrito Militar & Coliseu',
    img: '/shared/img/map/city_districts/city_military.webp',
    landmarks: [
      { id: 'loc_guild', name: 'Guilda dos Mercenários', ico: '⚔️', x: 30, y: 50, cb: 'guild', desc: 'Quartel de guerreiros experientes sob a comandante Tavira: recrutamento e gestão.', btnText: 'Entrar na Guilda' },
      { id: 'loc_arena', name: 'Arena do Coliseu', ico: '🏟️', x: 70, y: 50, cb: 'arena', desc: 'Fosso circular de combate com torneios sangrentos, aplausos e glória militar.', btnText: 'Entrar na Arena' }
    ]
  },
  'city_high': {
    id: 'city_high',
    name: 'Distrito Sagrado',
    fullName: 'Distrito Sagrado da Luz & Acrópole',
    img: '/shared/img/map/city_districts/city_high.webp',
    landmarks: [
      { id: 'loc_temple', name: 'Templo da Luz Sagrada', ico: '🕊️', x: 32, y: 44, cb: 'temple', desc: 'Altar divino onde sacerdotes concedem bênçãos, curas milagrosas e ritos sagrados.', btnText: 'Rezar no Altar' },
      { id: 'loc_runes', name: 'Escriba Rúnico', ico: '🔮', x: 75, y: 46, cb: 'rune_scribe', desc: 'Pergaminhos místicos, encantamentos arcanos, transmutação e runas de poder.', btnText: 'Consultar Escriba' },
      { id: 'loc_festival', name: 'Festival da Capital', ico: '🎭', x: 50, y: 78, cb: 'festival', desc: 'Música festiva, torneios de pontaria, hidromel e comemorações nas ruas.', btnText: 'Celebrar o Festival' }
    ]
  }
};

var _currentCityDistrict = 'city_overview';

function _openCityMapModal(initialDistrictId) {
  var modal = document.getElementById('city-map-fullscreen-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'city-map-fullscreen-modal';
    modal.className = 'city-map-fullscreen-modal';
    document.body.appendChild(modal);
  }

  _currentCityDistrict = (initialDistrictId && CITY_DISTRICTS_DATA[initialDistrictId]) ? initialDistrictId : 'city_overview';
  var district = CITY_DISTRICTS_DATA[_currentCityDistrict];

  modal.innerHTML = ''
    + '<div class="cfm-header">'
    + '  <div class="cfm-header-title"><span>🗺️</span> <span id="cfm-header-text">' + district.fullName + '</span></div>'
    + '  <button type="button" class="cfm-close-btn" onclick="_closeCityMapModal()">✕ Fechar</button>'
    + '</div>'
    + '<div class="cfm-district-tabs" id="cfm-district-tabs"></div>'
    + '<div class="cfm-viewport">'
    + '  <div class="cfm-stage">'
    + '    <img class="cfm-img" id="cfm-city-img" src="' + district.img + '" alt="Mapa de Valdoria">'
    + '    <div class="cfm-pins-layer" id="cfm-pins-layer"></div>'
    + '  </div>'
    + '</div>'
    + '<div class="cfm-drawer" id="cfm-drawer">'
    + '  <div class="cfm-drawer-info">'
    + '    <div class="cfm-drawer-name" id="cfm-drawer-name"></div>'
    + '    <div class="cfm-drawer-desc" id="cfm-drawer-desc"></div>'
    + '  </div>'
    + '  <button type="button" class="cfm-drawer-action-btn" id="cfm-drawer-act-btn"></button>'
    + '</div>';

  var tabsBar = modal.querySelector('#cfm-district-tabs');
  var cityImgEl = modal.querySelector('#cfm-city-img');
  var pinsLayer = modal.querySelector('#cfm-pins-layer');
  var drawerName = modal.querySelector('#cfm-drawer-name');
  var drawerDesc = modal.querySelector('#cfm-drawer-desc');
  var drawerBtn = modal.querySelector('#cfm-drawer-act-btn');
  var headerText = modal.querySelector('#cfm-header-text');

  var dOrder = ['city_overview', 'city_south', 'city_market', 'city_military', 'city_high'];

  dOrder.forEach(function(did) {
    var dData = CITY_DISTRICTS_DATA[did];
    var tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'cfm-dtab' + (did === _currentCityDistrict ? ' active' : '');
    tab.setAttribute('data-did', did);
    var icoMap = { 'city_overview': '🏛️', 'city_south': '🏰', 'city_market': '⚖️', 'city_military': '⚔️', 'city_high': '🕊️' };
    tab.innerHTML = '<span>' + (icoMap[did] || '🗺️') + '</span> ' + dData.name;
    tab.addEventListener('click', function() {
      if (typeof haptic === 'function') haptic('light');
      _switchCityDistrict(did);
    });
    tabsBar.appendChild(tab);
  });

  function _wireImageFallbacks(imgEl, distId) {
    var attempts = 0;
    imgEl.onerror = function() {
      attempts++;
      var isOverview = (distId === 'city_overview');
      var fallbacks = isOverview ? [
        '/shared/img/map/provinces/city.webp',
        '../shared/img/map/provinces/city.webp',
        'shared/img/map/provinces/city.webp'
      ] : [
        '/shared/img/map/city_districts/' + distId + '.webp',
        '../shared/img/map/city_districts/' + distId + '.webp',
        'shared/img/map/city_districts/' + distId + '.webp',
        './shared/img/map/city_districts/' + distId + '.webp'
      ];
      if (attempts < fallbacks.length) {
        this.src = fallbacks[attempts];
      }
    };
  }

  function _selectLandmark(lm) {
    drawerName.innerHTML = '<span>' + lm.ico + '</span> ' + lm.name;
    drawerDesc.textContent = lm.desc;
    drawerBtn.textContent = lm.btnText;
    drawerBtn.onclick = function() {
      if (typeof haptic === 'function') haptic('medium');
      if (lm.targetDistrict) {
        _switchCityDistrict(lm.targetDistrict);
      } else if (lm.cb) {
        _closeCityMapModal();
        if (typeof doAction === 'function') doAction(lm.cb);
      }
    };

    var pins = pinsLayer.querySelectorAll('.cfm-pin');
    pins.forEach(function(p) {
      p.classList.toggle('active', p.getAttribute('data-id') === lm.id);
    });
  }

  function _renderDistrictPins(distData) {
    pinsLayer.innerHTML = '';
    var lms = distData.landmarks || [];
    if (lms.length === 0) return;

    lms.forEach(function(lm, idx) {
      var pin = document.createElement('div');
      pin.className = 'cfm-pin' + (idx === 0 ? ' active' : '');
      pin.setAttribute('data-id', lm.id);
      pin.style.left = lm.x + '%';
      pin.style.top = lm.y + '%';

      pin.innerHTML = ''
        + '<div class="cfm-pin-icon">' + lm.ico + '</div>'
        + '<div class="cfm-pin-badge">' + lm.name + '</div>';

      pin.addEventListener('click', function(e) {
        e.stopPropagation();
        if (typeof haptic === 'function') haptic('light');
        _selectLandmark(lm);
      });

      pinsLayer.appendChild(pin);
    });

    _selectLandmark(lms[0]);
  }

  function _switchCityDistrict(newDistId) {
    _currentCityDistrict = newDistId;
    var dData = CITY_DISTRICTS_DATA[newDistId];
    headerText.textContent = dData.fullName;

    var tabs = tabsBar.querySelectorAll('.cfm-dtab');
    tabs.forEach(function(t) {
      t.classList.toggle('active', t.getAttribute('data-did') === newDistId);
    });

    cityImgEl.src = dData.img;
    _wireImageFallbacks(cityImgEl, newDistId);
    _renderDistrictPins(dData);
  }

  _wireImageFallbacks(cityImgEl, _currentCityDistrict);
  _renderDistrictPins(district);

  modal.style.display = 'flex';
  document.body.classList.add('city-modal-open');
}

function _closeCityMapModal() {
  var modal = document.getElementById('city-map-fullscreen-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  document.body.classList.remove('city-modal-open');
}

window._openCityMapModal = _openCityMapModal;
window._closeCityMapModal = _closeCityMapModal;
window._toggleHallSubmenu = _toggleHallSubmenu;
window._openFooterSubItem = _openFooterSubItem;
// === SYNC_REGION END ===


/* ================================================================
   SUB-COMPONENTES
   ================================================================ */

/**
 * Constroi um card de aliado compacto para o grid do hub.
 * @param {Object} a — dados do aliado {n, c, ico, l, hp, mhp, mp, mmp, type, dead, ...}
 * @returns {HTMLElement}
 */
// === SYNC_REGION: _buildHubAlly BEGIN ===
function _buildHubAlly(a) {
    var card = _hubDiv('hub-ally');
    if (a.type === 'player') card.classList.add('player');
    if (a.dead) card.classList.add('dead');

    /* Emoji icon */
    var ico = _hubSpan('ha-ico', a.ico || '');
    card.appendChild(ico);

    /* Info column: name + bars */
    var info = _hubDiv('ha-info');

    /* Name + Level */
    var nameEl = _hubDiv('ha-name');
    nameEl.textContent = a.n || '';
    if (a.l > 0) {
        var lvlEl = _hubSpan('ha-lvl', ' Nv' + a.l);
        nameEl.appendChild(lvlEl);
    }
    info.appendChild(nameEl);

    /* HP bar (3px) */
    if (a.mhp > 0 && !a.dead) {
        var hpPct = Math.min(100, Math.max(0, Math.round((a.hp / a.mhp) * 100)));
        info.appendChild(_hubMiniBar('hp', hpPct));
    } else if (a.dead) {
        var deadLbl = _hubDiv('ha-dead');
        deadLbl.textContent = '\uD83D\uDC80';
        info.appendChild(deadLbl);
    }

    /* MP bar (3px) — only if ally has mana */
    if (a.mmp > 0 && !a.dead) {
        var mpPct = Math.min(100, Math.max(0, Math.round((a.mp / a.mmp) * 100)));
        info.appendChild(_hubMiniBar('mp', mpPct));
    }

    card.appendChild(info);
    return card;
}
// === SYNC_REGION END ===

/**
 * Cria uma mini barra de HP ou MP (3px de altura).
 * @param {string} type — 'hp' ou 'mp'
 * @param {number} pct  — percentual 0-100
 * @returns {HTMLElement}
 */
function _hubMiniBar(type, pct) {
    var track = _hubDiv('ha-bar');
    var fill = _hubDiv('fill ' + type);
    /* Anima de 0 para o valor real */
    fill.style.width = '0%';
    requestAnimationFrame(function () {
        fill.style.width = pct + '%';
    });
    track.appendChild(fill);
    return track;
}

/**
 * Constroi uma celula de localizacao para o grid 4 colunas.
 * @param {string} ico   — emoji do local
 * @param {string} name  — nome curto do local
 * @param {Object} btn   — {text, cb} do botao original
 * @returns {HTMLElement}
 */
// === SYNC_REGION: _buildLocCell BEGIN ===
/* 2026-05-16: city location PNG map — generated by scripts/generate_city_icons.py.
   16 locais × 4 setores. Keyed por callback (loc.cb em CITY_LOCATIONS). */
var CITY_LOC_PNG_AVAILABLE = {
    'tavern': 1, 'inn': 1, 'rel_main': 1, 'action_quests': 1,
    'market': 1, 'bank': 1, 'open_workshop': 1, 'rune_scribe': 1,
    'guild': 1, 'gates': 1, 'arena': 1, 'daily_challenge': 1,
    'temple': 1, 'square': 1, 'action_codex': 1, 'festival': 1
};
function _cityLocIconHTML(cb, fallbackIco) {
    if (cb && CITY_LOC_PNG_AVAILABLE[cb]) {
        var base = '../valdoria-webapp/shared/img/city/';
        var loc = (typeof location !== 'undefined') ? location.href : '';
        if (loc.indexOf('file://') === 0) {
            base = '../valdoria-webapp/shared/img/city/';
        }
        /* Sessão #28 (2026-05-24): ?v=<bundle-hash> força cache bust pra browsers
           que tinham as PNGs com Cache-Control:immutable do header anterior.
           Sem isso, browsers servem versão velha (1.5MB) por até 1 ano sem nem
           consultar o servidor. Tier C (no-cache + ETag) só pega efeito em URLs
           novas — daí o sufixo. Date.now() fallback se bundle hash falhar.
           Sessão #56 (2026-05-28): FIX P0 cidade images — formato dos arquivos
           é .webp (gerado via OpenAI + Pillow + save_optimized kind='scenery'),
           NÃO .png. Antes o <img src="...tavern.png"> 404ava + onerror sumia o
           elemento. User reportou: "imagens taverna/missões/mercado/templo não
           aparecem". Fix: src usa .webp matching o filesystem. */
        var v = (typeof window !== 'undefined' && window.VBUNDLE_HASH) || Date.now();
        return '<img class="hl-ico-img" src="' + base + cb + '.webp?v=' + v + '" ' +
               'alt="" loading="lazy" ' +
               'onerror="this.onerror=null;this.outerHTML=\'\'">';
    }
    if (typeof fallbackIco === 'string' && fallbackIco.indexOf('<svg') === 0) {
        return fallbackIco;
    }
    return fallbackIco || '';
}
function _buildLocCell(ico, name, btn) {
    var cell = _hubDiv('hub-loc');

    /* USER REQUEST 2026-05-05: data-cb pra CSS aplicar cor temática por local
       (evita "tudo gold" — cada local tem sua cor heráldica natural). */
    if (btn && btn.cb) cell.setAttribute('data-cb', btn.cb);

    /* Sessão #63 (2026-05-30) — User pediu as IMAGENS geradas dos locais de
       volta, EM DESTAQUE no topo do card. Histórico: #56 mostrava como
       iconezinho 36px lateral; #62 removeu (user achou "ícone ao lado do nome"
       poluído); agora user quer as ilustrações .webp visíveis como thumbnail
       proeminente. _cityLocIconHTML retorna <img .webp> p/ locais em
       CITY_LOC_PNG_AVAILABLE; layout via .hl-thumb (CSS no <style> inline).
       Só adiciona se há imagem real (.webp) — fallback SVG/vazio = só nome. */
    var thumbHtml = (typeof _cityLocIconHTML === 'function') ? _cityLocIconHTML(btn && btn.cb, ico) : '';
    if (thumbHtml && thumbHtml.indexOf('<img') === 0) {
        var thumb = _hubDiv('hl-thumb');
        thumb.innerHTML = thumbHtml;
        cell.appendChild(thumb);
    }

    /* Label */
    var nmEl = _hubDiv('hl-nm');
    nmEl.textContent = name;
    cell.appendChild(nmEl);

    /* Badge (se o texto do botao tem "(N)") */
    var badgeCount = _extractBadge(btn.text);
    if (badgeCount > 0) {
        var badge = _hubDiv('hl-badge');
        badge.textContent = String(badgeCount);
        cell.appendChild(badge);
    }

    /* Click handler */
    if (btn.cb) {
        cell.addEventListener('click', function () {
            if (typeof haptic === 'function') haptic('medium');
            if (typeof doAction === 'function') doAction(btn.cb);
        });
    }

    return cell;
}
// === SYNC_REGION END ===

/**
 * Constroi uma linha do mini quest tracker.
 * @param {Object} q — {title, stage, total, ready, cb, obj}
 * @returns {HTMLElement}
 */
// === SYNC_REGION: _buildQuestRow BEGIN ===
function _buildQuestRow(q) {
    var row = _hubDiv('hub-quest');
    row.style.cursor = 'pointer';

    /* Icon */
    var icoEl = _hubSpan('hq-ico');
    icoEl.innerHTML = _uiIcoImg('missoes', 'ui-ico-img');
    row.appendChild(icoEl);

    /* Title text */
    var textEl = _hubSpan('hq-text');
    textEl.textContent = q.title || '';
    row.appendChild(textEl);

    /* Status indicator */
    var statusEl = _hubSpan('hq-status');
    if (q.ready) {
        statusEl.textContent = '\u2713'; /* check mark — pronta para entregar */
    } else {
        statusEl.textContent = (q.stage || 0) + '/' + (q.total || 0);
    }
    row.appendChild(statusEl);

    /* Click -> quest detail */
    if (q.cb) {
        row.addEventListener('click', function () {
            if (typeof haptic === 'function') haptic('light');
            if (typeof doAction === 'function') doAction(q.cb);
        });
    }

    return row;
}
// === SYNC_REGION END ===


/* ── Nota ────────────────────────────────────────────────────── */
/* .hub-section-label e .ha-dead estilizados em game-hub.css    */
