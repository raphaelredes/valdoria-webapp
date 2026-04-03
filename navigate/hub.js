/* hub.js — Navigate Hub de Regioes logic */
/* globals: BIOME_META, WEATHER_NAMES, DANGER_LABELS, TERRAIN_LABELS, FORAGE_LABELS (from hub-data.js) */
/* Note: innerHTML usage here is safe — all data comes from trusted server payload, never user input */

(function() {
'use strict';

var state = null;
var _activeFilter = 'todas';
var S = { token: '', api: '', uid: 0, returnTo: 'game' };

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', function() {
  _parseParams();
  _loadPayload();
});

function _parseParams() {
  /* SPA router may pass params via __spaRouteParams */
  var params = window.__spaRouteParams || new URLSearchParams(window.location.search);
  S.token = params.get('token') || '';
  S.api = decodeURIComponent(params.get('api') || '');
  S.uid = parseInt(params.get('uid') || '0', 10);
  S.returnTo = params.get('return') || 'game';
}

async function _loadPayload() {
  var params = window.__spaRouteParams || new URLSearchParams(window.location.search);
  var dataB64 = params.get('data') || '';

  if (dataB64) {
    /* Payload in URL — decompress */
    try {
      var json = typeof decompressPayload === 'function'
        ? await decompressPayload(dataB64)
        : atob(dataB64);
      state = JSON.parse(json);
      _onDataReady();
    } catch (e) {
      console.error('[HUB] Payload decompress failed:', e);
      _fetchFromApi();
    }
  } else if (S.api && S.token) {
    /* No payload in URL — fetch via API */
    _fetchFromApi();
  } else {
    /* No API, no payload — use mock data for development */
    console.warn('[HUB] No payload or API — using mock data');
    if (typeof MOCK_STATE !== 'undefined') {
      state = _convertMockToHubFormat(MOCK_STATE);
    }
    _onDataReady();
  }
}

async function _fetchFromApi() {
  var url = S.api + '/api/navigate/state?token=' + encodeURIComponent(S.token) + '&uid=' + S.uid;
  try {
    var headers = { 'Content-Type': 'application/json' };
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) {
      headers['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
    }
    var resp = await fetch(url, { headers: headers });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var body = await resp.json();
    if (body.data) {
      var json = typeof decompressPayload === 'function'
        ? await decompressPayload(body.data)
        : atob(body.data);
      state = JSON.parse(json);
    } else {
      throw new Error('No data in response');
    }
    _onDataReady();
  } catch (e) {
    console.error('[HUB] API fetch failed:', e);
    if (typeof vToast === 'function') {
      vToast('Erro ao carregar mapa. Tentando novamente...', 'err', 3000);
    }
    /* Retry once after 2s */
    setTimeout(function() {
      _fetchFromApi().catch(function() {
        if (typeof MOCK_STATE !== 'undefined') {
          state = _convertMockToHubFormat(MOCK_STATE);
          _onDataReady();
        }
      });
    }, 2000);
  }
}

function _convertMockToHubFormat(mock) {
  /* Convert MOCK_STATE (hub-data.js) to the format build_hub_payload() produces */
  return {
    cl: mock.currentLoc,
    c: mock.charData,
    rg: mock.regions,
    wt: mock.weather,
    q: [],
    dd: {},
    cc: 0,
  };
}

function _onDataReady() {
  if (!state) return;
  /* Map payload keys to state object for compatibility */
  if (!state.currentLoc) state.currentLoc = state.cl || 'city_gates';
  if (!state.charData) state.charData = state.c || {};
  if (!state.regions) state.regions = state.rg || {};
  if (!state.weather) state.weather = state.wt || {};

  renderPlayerBar();
  renderRegionCards();
  bindFilterTabs();
  bindBottomNav();
  updateReturnVisibility();

  if (typeof HubBiomeArt !== 'undefined') {
    setTimeout(function() { HubBiomeArt.initCards(); }, 50);
  }

  console.log('[HUB] Ready — %s regions, current: %s', Object.keys(state.regions).length, state.currentLoc);
}

/* ===== PLAYER BAR ===== */
function renderPlayerBar() {
  var c = state.charData;
  var loc = _findLoc(state.currentLoc);
  var biome = _findBiome(state.currentLoc);
  var meta = BIOME_META[biome] || {};

  document.getElementById('pb-icon').textContent = loc ? loc.i : '\u{1F3F0}';
  document.getElementById('pb-name').textContent = loc ? loc.n : 'Desconhecido';
  var metaEl = document.getElementById('pb-meta');
  metaEl.textContent = '';
  metaEl.appendChild(document.createTextNode('Nivel ' + c.lv + ' \u00B7 '));
  var coin = document.createElement('span');
  coin.className = 'vi vi-coin sm';
  metaEl.appendChild(coin);
  metaEl.appendChild(document.createTextNode(' ' + c.gp));
  var hpPct = c.mh > 0 ? Math.max(0, Math.min(1, c.hp / c.mh)) : 1;
  var mpPct = c.mm > 0 ? Math.max(0, Math.min(1, c.mp / c.mm)) : 1;
  var hpFill = document.getElementById('pb-hp');
  var hpClass = typeof vBarHpClass === 'function' ? vBarHpClass(c.hp, c.mh) : 'hp';
  hpFill.className = 'v-bar-fill ' + hpClass;
  hpFill.style.transform = 'scaleX(' + hpPct + ')';
  document.getElementById('pb-hp-label').textContent = c.hp + '/' + c.mh;
  var mpFill = document.getElementById('pb-mp');
  mpFill.style.transform = 'scaleX(' + mpPct + ')';
  document.getElementById('pb-mp-label').textContent = c.mp + '/' + c.mm;
}

/* ===== REGION CARDS ===== */
function renderRegionCards() {
  var container = document.getElementById('hub-scroll');
  var biomes = _sortedBiomes();
  var frag = document.createDocumentFragment();

  for (var i = 0; i < biomes.length; i++) {
    var key = biomes[i];
    var reg = state.regions[key];
    var meta = BIOME_META[key];
    if (!meta) continue;
    /* Regioes sem locais descobertos nao aparecem — jogador nao sabe que existem */
    if (reg.discovered.length === 0) continue;
    frag.appendChild(_buildRegionCard(key, reg, meta));
  }

  container.textContent = '';
  container.appendChild(frag);
}

function _buildRegionCard(key, reg, meta) {
  var isCurrent = _findBiome(state.currentLoc) === key;
  var discoveredPct = Math.round(reg.discovered.length / reg.locs.length * 100);
  var maxDanger = 0, minDanger = 99;
  for (var j = 0; j < reg.locs.length; j++) {
    if (reg.locs[j].d > maxDanger) maxDanger = reg.locs[j].d;
    if (reg.locs[j].d < minDanger) minDanger = reg.locs[j].d;
  }

  var card = document.createElement('div');
  card.className = 'region-card' + (isCurrent ? ' current' : '');
  card.setAttribute('data-biome', key);
  if (!_matchesFilter(key, reg)) card.style.display = 'none';
  card.addEventListener('click', function() { toggleCard(card); });

  /* Build inner HTML — data is from trusted server payload, safe to use innerHTML */
  var h = '<div class="region-card-top">';
  h += '<div class="region-art">';
  h += '<canvas class="region-art-canvas" data-biome="' + key + '"></canvas>';
  h += '</div>';

  h += '<div class="region-body">';
  h += '<div><div class="region-name">' + meta.name + '</div>';
  h += '<div class="region-meta">' + reg.locs.length + ' locais \u00B7 Nivel ' + minDanger + '-' + maxDanger + '</div></div>';
  h += '<div class="region-chips">';
  if (reg.quests > 0) h += '<span class="chip chip-quest">\u{1F4DC} ' + reg.quests + ' miss\u00F5es</span>';
  if (reg.dungeons > 0) h += '<span class="chip chip-dungeon">\u{1F480} ' + reg.dungeons + ' masmorras</span>';
  if (reg.settlements) {
    for (var s = 0; s < reg.settlements.length; s++) {
      h += '<span class="chip chip-settlement">\u{1F3D8}\uFE0F ' + reg.settlements[s] + '</span>';
    }
  }
  var wt = state.weather[key];
  if (wt && WEATHER_NAMES[wt]) h += '<span class="chip">' + WEATHER_NAMES[wt] + '</span>';
  h += '</div>';
  h += '<div class="region-prog"><div class="prog-bar"><div class="prog-fill" style="width:' + discoveredPct + '%"></div></div>';
  h += '<div class="prog-text">' + reg.discovered.length + '/' + reg.locs.length + ' descobertos \u00B7 ' + discoveredPct + '%</div></div>';
  h += '</div></div>';

  h += '<div class="region-detail"><div class="region-loc-list">';
    for (var l = 0; l < reg.locs.length; l++) {
      var loc = reg.locs[l];
      var disc = reg.discovered.indexOf(loc.id) !== -1;
      h += '<div class="region-loc-item">';
      h += '<div class="loc-dot ' + (disc ? 'loc-dot-on' : 'loc-dot-off') + '"></div>';
      h += '<div class="loc-item-name' + (disc ? '' : ' unknown') + '">' + (disc ? loc.n : 'Local desconhecido') + '</div>';
      h += '<div class="loc-item-danger">' + (disc ? 'Nivel ' + loc.d : '???') + '</div>';
      h += '</div>';
    }
    h += '</div>';
    h += '<div class="region-detail-actions">';
    h += '<button class="detail-btn" data-action="locations" data-biome="' + key + '">\u{1F5FA}\uFE0F Ver Locais</button>';
    h += '<button class="detail-btn detail-btn-primary" data-action="travel">\u2694\uFE0F Viajar</button>';
    h += '</div></div>';

  /* Safe: all data from trusted server mock */
  var temp = document.createElement('div');
  temp.innerHTML = h; /* noqa: security — server-sourced data only */
  while (temp.firstChild) card.appendChild(temp.firstChild);

  /* Bind detail buttons */
  var locBtn = card.querySelector('[data-action="locations"]');
  if (locBtn) {
    locBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      openLocations(this.getAttribute('data-biome'));
    });
  }

  return card;
}

/* ===== FILTER TABS ===== */
var FILTER_LABELS = {
  todas: 'Todas as Regioes', missoes: 'Com Missoes Ativas',
  masmorras: 'Com Masmorras', assentamentos: 'Com Assentamentos',
  descobertas: 'Ja Visitadas'
};

function bindFilterTabs() {
  var trigger = document.getElementById('filter-trigger');
  var backdrop = document.getElementById('filter-backdrop');
  var sheet = document.getElementById('filter-sheet');

  trigger.addEventListener('click', function() {
    var isOpen = sheet.style.display !== 'none';
    if (isOpen) { _closeFilterSheet(); } else { _openFilterSheet(); }
  });

  backdrop.addEventListener('click', _closeFilterSheet);

  var options = document.querySelectorAll('.filter-option');
  for (var i = 0; i < options.length; i++) {
    options[i].addEventListener('click', function() {
      for (var j = 0; j < options.length; j++) options[j].classList.remove('active');
      this.classList.add('active');
      _activeFilter = this.getAttribute('data-filter');
      document.getElementById('filter-label').textContent = FILTER_LABELS[_activeFilter] || 'Todas';
      var badge = document.getElementById('filter-badge');
      if (_activeFilter === 'todas') {
        badge.style.display = 'none';
      } else {
        badge.textContent = FILTER_LABELS[_activeFilter];
        badge.style.display = '';
      }
      _applyFilter();
      _closeFilterSheet();
    });
  }
}

function _openFilterSheet() {
  document.getElementById('filter-backdrop').style.display = '';
  document.getElementById('filter-sheet').style.display = '';
  document.getElementById('filter-trigger').classList.add('open');
}

function _closeFilterSheet() {
  document.getElementById('filter-backdrop').style.display = 'none';
  document.getElementById('filter-sheet').style.display = 'none';
  document.getElementById('filter-trigger').classList.remove('open');
}

function _applyFilter() {
  var cards = document.querySelectorAll('.region-card');
  for (var i = 0; i < cards.length; i++) {
    var biome = cards[i].getAttribute('data-biome');
    var reg = state.regions[biome];
    if (!reg) continue;
    cards[i].style.display = _matchesFilter(biome, reg) ? '' : 'none';
  }
}

function _matchesFilter(biome, reg) {
  if (_activeFilter === 'todas') return true;
  if (_activeFilter === 'missoes') return reg.quests > 0;
  if (_activeFilter === 'masmorras') return reg.dungeons > 0;
  if (_activeFilter === 'assentamentos') return reg.settlements && reg.settlements.length > 0;
  if (_activeFilter === 'descobertas') return reg.discovered.length > 0;
  return true;
}

/* ===== EXPAND/COLLAPSE ===== */
function toggleCard(el) {
  var wasExpanded = el.classList.contains('expanded');
  var all = document.querySelectorAll('.region-card.expanded');
  for (var i = 0; i < all.length; i++) all[i].classList.remove('expanded');
  if (!wasExpanded) {
    el.classList.add('expanded');
    setTimeout(function() { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
  }
}

/* ===== LOCATIONS SUB-SCREEN ===== */
function openLocations(biome) {
  var reg = state.regions[biome];
  var meta = BIOME_META[biome];
  if (!reg || !meta) return;

  document.getElementById('loc-title').textContent = meta.name;
  document.getElementById('loc-meta').textContent = reg.locs.length + ' locais';

  var container = document.getElementById('loc-list');
  var frag = document.createDocumentFragment();

  for (var i = 0; i < reg.locs.length; i++) {
    var loc = reg.locs[i];
    var disc = reg.discovered.indexOf(loc.id) !== -1;
    var isCurrent = loc.id === state.currentLoc;
    frag.appendChild(_buildLocCard(loc, disc, isCurrent, meta, biome, i));
  }

  container.textContent = '';
  container.appendChild(frag);

  document.getElementById('locations-screen').style.display = 'flex';
  document.getElementById('loc-back').onclick = function() {
    document.getElementById('locations-screen').style.display = 'none';
  };
}

function _buildLocCard(loc, disc, isCurrent, meta, biome, idx) {
  var card = document.createElement('div');
  card.className = 'loc-card' + (isCurrent ? ' here' : '') + (disc ? '' : ' unknown');
  if (disc) {
    card.addEventListener('click', function() { openDetail(biome, idx); });
  }

  var h = '<div class="loc-card-icon" style="background:' + meta.gradient + '">' + (disc ? loc.i : '\u2753') + '</div>';
  h += '<div class="loc-card-info">';
  h += '<div class="loc-card-name">' + (disc ? loc.n : 'Local desconhecido') + '</div>';
  h += '<div class="loc-card-meta">' + (disc ? meta.name + ' \u00B7 Nivel ' + loc.d : '???') + '</div>';
  if (disc) h += '<div class="loc-card-pips">' + _buildPipsSmall(loc.d, 5) + '</div>';
  h += '</div>';
  if (isCurrent) h += '<span class="loc-card-badge">Aqui</span>';
  else if (disc) h += '<span class="loc-card-arrow">\u203A</span>';

  var temp = document.createElement('div');
  temp.innerHTML = h; /* noqa: security — server-sourced data only */
  while (temp.firstChild) card.appendChild(temp.firstChild);
  return card;
}

/* ===== DETAIL SCREEN ===== */
function openDetail(biome, idx) {
  var reg = state.regions[biome];
  var meta = BIOME_META[biome];
  var loc = reg.locs[idx];
  if (!loc) return;

  document.getElementById('detail-title').textContent = loc.n;
  var isCurrent = loc.id === state.currentLoc;
  var wt = state.weather[biome];

  var h = '';
  h += '<div class="detail-icon-row">';
  h += '<div class="detail-icon-big" style="background:' + meta.gradient + '">' + loc.i + '</div>';
  h += '<div><div class="detail-name">' + loc.n + '</div>';
  h += '<div class="detail-subtitle">' + meta.name + ' \u00B7 Nivel ' + loc.d + '</div></div></div>';

  h += '<div class="detail-pips-row">';
  for (var p = 0; p < 5; p++) {
    var cls = 'detail-pip';
    if (p < loc.d) cls += loc.d >= 4 ? ' detail-pip-hot' : ' detail-pip-on';
    h += '<div class="' + cls + '"></div>';
  }
  h += '<span class="detail-pip-label">' + (DANGER_LABELS[loc.d] || 'Perigoso') + '</span></div>';

  h += '<div class="detail-stats">';
  h += _statCell('Distancia', isCurrent ? 'Voce esta aqui' : (Math.floor(Math.random() * 4) + 1) + ' turnos');
  h += _statCell('Clima', wt ? WEATHER_NAMES[wt] : '\u2600\uFE0F Limpo');
  h += _statCell('Terreno', TERRAIN_LABELS[biome] || 'Normal');
  h += _statCell('Forragear', FORAGE_LABELS[biome] || 'Nenhum');
  if (reg.quests > 0) h += _statCell('Missoes', reg.quests + ' ativas');
  if (reg.dungeons > 0) h += _statCell('Masmorras', reg.dungeons + ' encontradas');
  if (loc.s) h += _statCell('Tipo', '\u{1F3D8}\uFE0F Assentamento');
  h += '</div>';

  if (loc.ds) h += '<div class="detail-note">"' + loc.ds + '"</div>';

  if (!isCurrent) {
    h += '<div class="detail-section-title">Ritmo de Viagem</div>';
    h += '<div class="detail-pace-row">';
    h += '<button class="pace-btn" data-pace="fast" title="Mais rapido, mas -5 Percepcao e +10% encontros">Rapido</button>';
    h += '<button class="pace-btn active" data-pace="normal" title="Velocidade padrao, percepcao normal">Normal</button>';
    h += '<button class="pace-btn" data-pace="cautious" title="Mais lento, mas +5 Percepcao e -10% encontros">Cauteloso</button></div>';
    h += '<div class="detail-hint" id="pace-hint">Velocidade padrao, percepcao normal</div>';

    h += '<div class="detail-section-title">Atividade de Viagem</div>';
    h += '<div class="detail-pace-row">';
    h += '<button class="pace-btn active" data-activity="watch" title="Previne surpresa em emboscadas">Vigiar</button>';
    h += '<button class="pace-btn" data-activity="navigate" title="Teste de Sobrevivencia para nao se perder">Navegar</button>';
    h += '<button class="pace-btn" data-activity="forage" title="Teste de Sobrevivencia para encontrar provisoes">Forragear</button>';
    h += '<button class="pace-btn" data-activity="cartograph" title="Teste de Sobrevivencia para revelar locais adjacentes">Cartografar</button></div>';
    h += '<div class="detail-hint" id="activity-hint">Previne surpresa em emboscadas</div>';
  }

  var isOutsideCity = state.currentLoc !== 'city_gates';
  h += '<div class="detail-actions">';
  if (isCurrent) {
    h += '<button class="action-btn">\u{1F50D} Explorar</button>';
    h += '<button class="action-btn">\u{1F3D5}\uFE0F Acampar</button>';
    if (isOutsideCity) {
      h += '<button class="action-btn">\u{1F3F0} Retornar</button>';
    }
  } else {
    h += '<button class="action-btn action-btn-travel" data-travel-loc="' + loc.id + '" data-travel-biome="' + biome + '" data-travel-name="' + loc.n + '">\u2694\uFE0F Viajar</button>';
  }
  h += '</div>';

  var container = document.getElementById('detail-content');
  container.textContent = '';
  var temp = document.createElement('div');
  temp.innerHTML = h; /* noqa: security — server-sourced data only */
  while (temp.firstChild) container.appendChild(temp.firstChild);

  /* Bind pace/activity toggles */
  container.querySelectorAll('[data-pace]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var row = this.parentNode;
      row.querySelectorAll('.pace-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      var hint = document.getElementById('pace-hint');
      if (hint) hint.textContent = this.getAttribute('title') || '';
    });
  });
  container.querySelectorAll('[data-activity]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var row = this.parentNode;
      row.querySelectorAll('.pace-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      var hint = document.getElementById('activity-hint');
      if (hint) hint.textContent = this.getAttribute('title') || '';
    });
  });

  /* Bind travel button */
  var travelBtn = container.querySelector('[data-travel-loc]');
  if (travelBtn) {
    travelBtn.addEventListener('click', function() {
      var targetLoc = this.getAttribute('data-travel-loc');
      var targetBiome = this.getAttribute('data-travel-biome');
      var targetName = this.getAttribute('data-travel-name');
      _startTravel(targetLoc, targetBiome, targetName);
    });
  }

  document.getElementById('detail-screen').style.display = 'flex';
  document.getElementById('detail-back').onclick = function() {
    document.getElementById('detail-screen').style.display = 'none';
  };
}

/* ===== TRAVEL ACTION ===== */
function _startTravel(locId, biome, name) {
  /* Use the full explore-travel.js animation (parallax, silhouette, particles) */
  if (typeof playTravelAnimation === 'function') {
    /* Constrain canvas to 430px max / 932px max height — explore-travel.js uses window.innerWidth/Height */
    var _realW = Object.getOwnPropertyDescriptor(window, 'innerWidth') ||
                 Object.getOwnPropertyDescriptor(Window.prototype, 'innerWidth');
    var _realH = Object.getOwnPropertyDescriptor(window, 'innerHeight') ||
                 Object.getOwnPropertyDescriptor(Window.prototype, 'innerHeight');
    var maxW = Math.min(window.innerWidth, 430);
    var maxH = Math.min(window.innerHeight, 932);
    try {
      Object.defineProperty(window, 'innerWidth', { get: function() { return maxW; }, configurable: true });
      Object.defineProperty(window, 'innerHeight', { get: function() { return maxH; }, configurable: true });
    } catch(e) { /* readonly in some browsers */ }
    playTravelAnimation(biome, name, function() {
      /* Restore original dimensions */
      if (_realW) { try { Object.defineProperty(window, 'innerWidth', _realW); } catch(e) {} }
      if (_realH) { try { Object.defineProperty(window, 'innerHeight', _realH); } catch(e) {} }
      _executeTravelApi(locId);
    });
  } else {
    /* Fallback if explore-travel.js not loaded */
    console.warn('[HUB] playTravelAnimation not available, using simple overlay');
    if (typeof HubBiomeArt !== 'undefined') {
      HubBiomeArt.showTravel(biome, name, function() { _executeTravelApi(locId); });
    } else {
      _executeTravelApi(locId);
    }
  }
}

async function _executeTravelApi(locId) {
  if (!S.api || !S.token) {
    console.warn('[HUB] No API configured, cannot travel');
    if (typeof vToast === 'function') vToast('Conexao indisponivel', 'err', 2500);
    return;
  }

  var pace = _getSelectedPace();
  var activity = _getSelectedActivity();
  var loc = _findLoc(locId);
  var biome = _findBiome(locId);
  var hasMap = state.regions[biome] ? state.regions[biome].hm : false;

  console.log('[HUB] travel uid=%s target=%s pace=%s activity=%s noMap=%s', S.uid, locId, pace, activity, !hasMap);

  if (typeof vProcessing !== 'undefined') vProcessing.show({ text: 'Preparando viagem...' });

  try {
    var headers = { 'Content-Type': 'application/json' };
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) {
      headers['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
    }

    var resp = await fetch(S.api + '/api/navigate/action', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        action: 'navigate_action',
        token: S.token,
        uid: S.uid,
        type: 'travel',
        target: locId,
        pace: pace,
        activity: activity,
        noMap: !hasMap,
      }),
    });

    if (typeof vProcessing !== 'undefined') vProcessing.hide();

    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) {
        if (typeof vToast === 'function') vToast('Sessao expirada. Retornando...', 'err', 2500);
        setTimeout(_transitionToGame, 1500);
        return;
      }
      throw new Error('HTTP ' + resp.status);
    }

    var data = await resp.json();

    if (data.error) {
      if (typeof vToast === 'function') vToast('Erro: ' + (data.message || data.error), 'err', 3000);
      return;
    }

    /* Handle travel journal if present */
    if (data.travel_log && data.travel_log.length > 0 && typeof _showTravelJournal === 'function') {
      _showTravelJournal(data.travel_log, data.url);
    } else if (data.url) {
      /* Direct transition to explore/combat */
      window.__valdoria_transitioning = true;
      window.location.replace(data.url);
    } else {
      /* No URL — return to game */
      _transitionToGame();
    }
  } catch (e) {
    if (typeof vProcessing !== 'undefined') vProcessing.hide();
    console.error('[HUB] Travel API error:', e);
    if (typeof vToast === 'function') vToast('Erro na viagem. Tente novamente.', 'err', 3000);
  }
}

function _transitionToGame() {
  window.__valdoria_transitioning = true;
  if (S.api && S.token) {
    fetch(S.api + '/api/webapp/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'navigate', to: S.returnTo, token: S.token, uid: S.uid }),
    }).then(function(r) { return r.json(); }).then(function(d) {
      if (d.url) window.location.replace(d.url);
    }).catch(function() {
      try { if (window.Telegram && Telegram.WebApp) Telegram.WebApp.close(); } catch(e) {}
    });
  } else {
    try { if (window.Telegram && Telegram.WebApp) Telegram.WebApp.close(); } catch(e) {}
  }
}

function _getSelectedPace() {
  var active = document.querySelector('[data-pace].active');
  return active ? active.getAttribute('data-pace') : 'normal';
}

function _getSelectedActivity() {
  var active = document.querySelector('[data-activity].active');
  return active ? active.getAttribute('data-activity') : 'watch';
}

/* ===== BOTTOM NAV ===== */
function bindBottomNav() {
  document.getElementById('btn-position').addEventListener('click', function() {
    var currentBiome = _findBiome(state.currentLoc);
    if (!currentBiome) return;
    var card = document.querySelector('.region-card[data-biome="' + currentBiome + '"]');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

/* ===== RETURN VISIBILITY ===== */
function updateReturnVisibility() {
  var isOutsideCity = state.currentLoc !== 'city_gates';
  var btnReturn = document.getElementById('btn-return');
  if (btnReturn) btnReturn.style.display = isOutsideCity ? '' : 'none';
}

/* ===== HELPERS ===== */
function _findLoc(id) {
  for (var b in state.regions) {
    for (var i = 0; i < state.regions[b].locs.length; i++) {
      if (state.regions[b].locs[i].id === id) return state.regions[b].locs[i];
    }
  }
  return null;
}

function _findBiome(locId) {
  for (var b in state.regions) {
    for (var i = 0; i < state.regions[b].locs.length; i++) {
      if (state.regions[b].locs[i].id === locId) return b;
    }
  }
  return null;
}

function _sortedBiomes() {
  var keys = Object.keys(state.regions);
  var currentBiome = _findBiome(state.currentLoc);
  keys.sort(function(a, b) {
    var ra = state.regions[a], rb = state.regions[b];
    if (a === currentBiome) return -1;
    if (b === currentBiome) return 1;
    var da = ra.discovered.length > 0 ? 1 : 0;
    var db = rb.discovered.length > 0 ? 1 : 0;
    if (da !== db) return db - da;
    if (ra.quests !== rb.quests) return rb.quests - ra.quests;
    return (rb.discovered.length / rb.locs.length) - (ra.discovered.length / ra.locs.length);
  });
  return keys;
}

function _buildPips(danger, max) {
  var h = '';
  for (var i = 0; i < max; i++) {
    h += '<div class="pip ' + (i < danger ? (danger >= 4 ? 'pip-hot' : 'pip-on') : 'pip-off') + '"></div>';
  }
  return h;
}

function _buildPipsSmall(danger, max) {
  var h = '';
  for (var i = 0; i < max; i++) {
    h += '<div class="pip ' + (i < danger ? (danger >= 4 ? 'pip-hot' : 'pip-on') : 'pip-off') + '" style="width:4px;height:4px"></div>';
  }
  return h;
}

function _statCell(label, value) {
  return '<div class="detail-stat"><div class="detail-stat-label">' + label + '</div><div class="detail-stat-val">' + value + '</div></div>';
}

window.HUB = {
  toggleCard: toggleCard,
  openLocations: openLocations,
  openDetail: openDetail
};

})();
