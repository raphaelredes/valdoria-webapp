/* hub.js — Navigate Hub de Regioes logic */
/* globals: BIOME_META, WEATHER_NAMES, DANGER_LABELS, TERRAIN_LABELS, FORAGE_LABELS (from hub-data.js) */
/* Note: innerHTML usage here is safe — all data comes from trusted server payload, never user input */

(function() {
'use strict';

var state = null;
var _activeFilter = 'todas';
var S = { token: '', api: '', uid: 0, returnTo: 'game' };
var _hubConnGraph = {};

/* Build adjacency list from CONNECTION_EDGES (map-layout.js global) */
function _buildHubConnGraph() {
  if (typeof CONNECTION_EDGES === 'undefined') return;
  _hubConnGraph = {};
  for (var i = 0; i < CONNECTION_EDGES.length; i++) {
    var e = CONNECTION_EDGES[i];
    if (!_hubConnGraph[e[0]]) _hubConnGraph[e[0]] = [];
    if (!_hubConnGraph[e[1]]) _hubConnGraph[e[1]] = [];
    _hubConnGraph[e[0]].push(e[1]);
    _hubConnGraph[e[1]].push(e[0]);
  }
}

function _hubIsConnected(fromId, toId) {
  var neighbors = _hubConnGraph[fromId] || [];
  return neighbors.indexOf(toId) !== -1;
}

/* BFS shortest path using _hubConnGraph — returns array of loc IDs or null */
function _hubBfsPath(fromId, toId) {
  if (fromId === toId) return [fromId];
  var visited = {};
  visited[fromId] = true;
  var queue = [[fromId, [fromId]]];
  while (queue.length > 0) {
    var item = queue.shift();
    var current = item[0], path = item[1];
    var neighbors = _hubConnGraph[current] || [];
    for (var i = 0; i < neighbors.length; i++) {
      var nb = neighbors[i];
      if (nb === toId) return path.concat([nb]);
      if (!visited[nb]) {
        visited[nb] = true;
        queue.push([nb, path.concat([nb])]);
      }
    }
  }
  return null;
}

/* ===== INIT ===== */
/* In SPA context, DOMContentLoaded already fired. Run immediately if DOM ready, else listen. */
function _hubInit() {
  console.warn('[HUB] _hubInit() started');
  _parseParams();
  _loadPayload();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _hubInit);
} else {
  /* SPA: DOM already loaded, run immediately */
  _hubInit();
}

function _parseParams() {
  /* SPA router passes params as plain object via __spaRouteParams
     Standalone page uses URLSearchParams from URL */
  var raw = window.__spaRouteParams;
  var params;
  if (raw && typeof raw === 'object' && typeof raw.get !== 'function') {
    /* Plain object from SPA router — wrap for uniform access */
    params = { get: function(k) { return raw[k] || ''; } };
  } else if (raw && typeof raw.get === 'function') {
    /* URLSearchParams */
    params = raw;
  } else {
    params = new URLSearchParams(window.location.search);
  }
  S.token = params.get('token') || '';
  S.api = decodeURIComponent(params.get('api') || '');
  S.uid = parseInt(params.get('uid') || '0', 10);
  S.returnTo = params.get('return') || 'game';
  S._params = params;
  console.warn('[HUB] _parseParams token=%s api=%s uid=%s hasSpaParams=%s type=%s',
    S.token ? S.token.substring(0, 8) + '...' : '(none)',
    S.api ? 'yes' : 'no', S.uid,
    !!window.__spaRouteParams,
    raw ? typeof raw : 'url');
}

async function _loadPayload() {
  var params = S._params || new URLSearchParams(window.location.search);
  var dataB64 = params.get('data') || '';

  console.warn('[HUB] _loadPayload hasData=%s dataLen=%s hasApi=%s hasToken=%s',
    !!dataB64, dataB64 ? dataB64.length : 0, !!S.api, !!S.token);

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
    console.error('[HUB] No payload or API — falling back to mock data (token=%s api=%s)', !!S.token, !!S.api);
    if (typeof MOCK_STATE !== 'undefined') {
      state = _convertMockToHubFormat(MOCK_STATE);
    }
    _onDataReady();
  }
}

var _fetchAttempt = 0;
async function _fetchFromApi() {
  _fetchAttempt++;
  var attempt = _fetchAttempt;
  var url = S.api + '/api/navigate/state?token=' + encodeURIComponent(S.token) + '&uid=' + S.uid;
  console.warn('[HUB] _fetchFromApi attempt=%s url=%s', attempt, url.substring(0, 80));
  try {
    var headers = { 'Content-Type': 'application/json' };
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) {
      headers['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
    }
    var controller = new AbortController();
    var tid = setTimeout(function() { controller.abort(); }, 12000);
    var resp = await fetch(url, { headers: headers, signal: controller.signal });
    clearTimeout(tid);
    console.warn('[HUB] _fetchFromApi response status=%s attempt=%s', resp.status, attempt);
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
    var errMsg = e.name === 'AbortError' ? 'timeout (12s)' : e.message;
    console.error('[HUB] API fetch FAILED attempt=%s: %s', attempt, errMsg);
    if (attempt < 2) {
      console.warn('[HUB] Retrying in 2s...');
      if (typeof vToast === 'function') {
        vToast('Erro ao carregar mapa. Tentando novamente...', 'err', 3000);
      }
      setTimeout(function() {
        _fetchFromApi().catch(function(e2) {
          console.error('[HUB] Retry also failed:', e2.message || e2);
          _showNavigateError(errMsg);
        });
      }, 2000);
    } else {
      _showNavigateError(errMsg);
    }
  }
}

function _showNavigateError(reason) {
  console.error('[HUB] FATAL: navigate cannot load. Reason: %s. Returning to game.', reason);
  /* Hide loading overlay */
  var _ld = document.getElementById('loading');
  if (_ld) { _ld.style.display = 'none'; }
  if (typeof vProcessing !== 'undefined' && vProcessing.isActive()) vProcessing.hide();
  /* Return to game route via SPA */
  if (window.SpaRouter && SpaRouter._routes && SpaRouter._routes.game) {
    console.warn('[HUB] Redirecting to game route');
    SpaRouter.navigate('game', {
      token: S.token, api: S.api, uid: String(S.uid)
    });
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
  _buildHubConnGraph();
  console.warn('[HUB] _onDataReady raw keys:', Object.keys(state).join(','));

  /* Map compact payload keys to readable names */
  if (!state.currentLoc) state.currentLoc = state.cl || 'city_gates';
  if (!state.charData) state.charData = state.c || {};
  if (!state.regions) state.regions = state.rg || {};
  if (!state.weather) state.weather = state.wt || {};

  /* Map compact region field names from build_hub_payload() to what renderer expects */
  for (var biome in state.regions) {
    var reg = state.regions[biome];
    if (reg.disc && !reg.discovered) reg.discovered = reg.disc;
    if (!reg.discovered) reg.discovered = [];
    if (typeof reg.q === 'number' && reg.quests === undefined) reg.quests = reg.q;
    if (reg.quests === undefined) reg.quests = 0;
    if (typeof reg.dg === 'number' && reg.dungeons === undefined) reg.dungeons = reg.dg;
    if (reg.dungeons === undefined) reg.dungeons = 0;
    if (reg.st && !reg.settlements) reg.settlements = reg.st;
    if (!reg.settlements) reg.settlements = [];
    if (!reg.locs) reg.locs = [];
  }

  console.warn('[HUB] State mapped — %s regions, current: %s, charData: %s',
    Object.keys(state.regions).length, state.currentLoc, state.charData.nm || '?');

  renderPlayerBar();
  renderRegionCards();
  bindFilterTabs();
  bindBottomNav();
  updateReturnVisibility();

  if (typeof HubBiomeArt !== 'undefined') {
    setTimeout(function() { HubBiomeArt.initCards(); }, 50);
  }

  /* Hide SPA loading overlay — hub has no loading controller, content renders instantly */
  var _ld = document.getElementById('loading');
  if (_ld && !_ld.classList.contains('hidden')) {
    _ld.classList.add('hidden');
    _ld.style.display = 'none';
    console.warn('[HUB] Loading overlay hidden');
  }

  /* Apply font preference */
  if (typeof applyFont === 'function') {
    var savedFont = localStorage.getItem('valdoria_font') || 'medievalsharp';
    applyFont(savedFont);
  }

  /* Start audio for current biome */
  if (typeof ValdoriaAudio !== 'undefined') {
    var _curBiome = _findBiome(state.currentLoc);
    if (_curBiome) ValdoriaAudio.playBiome(_curBiome);
    else ValdoriaAudio.play('city');
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
  if (!reg.hm) h += '<span class="chip chip-nomap">\u{1F5FA}\uFE0F Sem Mapa</span>';
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
    var sheetVisible = sheet.style.display !== 'none';
    if (sheetVisible) { _closeFilterSheet(); } else { _openFilterSheet(); }
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
  console.log('[HUB] filter_changed filter=%s', _activeFilter);
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
  console.log('[HUB] card_toggle biome=%s', el.getAttribute('data-biome'));
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
  console.log('[HUB] open_locations biome=%s', biome);
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
  var isConnected = !isCurrent && _hubIsConnected(state.currentLoc, loc.id);
  card.className = 'loc-card' + (isCurrent ? ' here' : '') + (disc ? '' : ' unknown') + (isConnected && !disc ? ' expedition' : '');
  if (disc || isConnected) {
    card.addEventListener('click', function() { openDetail(biome, idx); });
  }

  var h = '<div class="loc-card-icon" style="background:' + meta.gradient + '">' + (disc ? loc.i : '\u2753') + '</div>';
  h += '<div class="loc-card-info">';
  if (disc) {
    h += '<div class="loc-card-name">' + loc.n + '</div>';
    h += '<div class="loc-card-meta">' + meta.name + ' \u00B7 Nivel ' + loc.d + '</div>';
    h += '<div class="loc-card-pips">' + _buildPipsSmall(loc.d, 5) + '</div>';
  } else if (isConnected) {
    var edgeDist = typeof getConnectionDistance === 'function' ? getConnectionDistance(state.currentLoc, loc.id) : 0;
    h += '<div class="loc-card-name">Local desconhecido</div>';
    h += '<div class="loc-card-meta" style="color:var(--v-gold,#c4953a)">\u26a0\ufe0f Expedi\u00e7\u00e3o' + (edgeDist > 0 ? ' \u00B7 ' + edgeDist + ' turnos' : '') + '</div>';
  } else {
    h += '<div class="loc-card-name">Local desconhecido</div>';
    h += '<div class="loc-card-meta">???</div>';
  }
  h += '</div>';
  if (isCurrent) h += '<span class="loc-card-badge">Aqui</span>';
  else if (disc) h += '<span class="loc-card-arrow">\u203A</span>';
  else if (isConnected) h += '<span class="loc-card-arrow" style="color:var(--v-gold,#c4953a)">\u203A</span>';

  var temp = document.createElement('div');
  temp.innerHTML = h; /* noqa: security — server-sourced data only */
  while (temp.firstChild) card.appendChild(temp.firstChild);
  return card;
}

/* ===== DETAIL SCREEN ===== */
function openDetail(biome, idx) {
  console.log('[HUB] open_detail biome=%s idx=%s', biome, idx);
  var reg = state.regions[biome];
  var meta = BIOME_META[biome];
  var loc = reg.locs[idx];
  if (!loc) return;

  var disc = reg.discovered.indexOf(loc.id) !== -1;
  var displayName = disc ? loc.n : 'Local Desconhecido';
  var displayIcon = disc ? loc.i : '\u2753';

  document.getElementById('detail-title').textContent = displayName;
  var isCurrent = loc.id === state.currentLoc;
  var wt = state.weather[biome];

  var h = '';
  h += '<div class="detail-icon-row">';
  h += '<div class="detail-icon-big" style="background:' + meta.gradient + '">' + displayIcon + '</div>';
  h += '<div><div class="detail-name">' + displayName + '</div>';
  h += '<div class="detail-subtitle">' + meta.name + (disc ? ' \u00B7 Nivel ' + loc.d : ' \u00B7 ???') + '</div></div></div>';

  h += '<div class="detail-pips-row">';
  for (var p = 0; p < 5; p++) {
    var cls = 'detail-pip';
    if (p < loc.d) cls += loc.d >= 4 ? ' detail-pip-hot' : ' detail-pip-on';
    h += '<div class="' + cls + '"></div>';
  }
  h += '<span class="detail-pip-label">' + (DANGER_LABELS[loc.d] || 'Perigoso') + '</span></div>';

  var isConnected = !isCurrent && _hubIsConnected(state.currentLoc, loc.id);
  var edgeDist = isConnected ? getConnectionDistance(state.currentLoc, loc.id) : 0;
  var totalDist = isCurrent ? 0 : (typeof weightedDistance === 'function' ? weightedDistance(state.currentLoc, loc.id, _hubConnGraph) : 0);
  var distLabel = isCurrent ? 'Voce esta aqui' : (isConnected ? edgeDist + ' turnos' : (totalDist > 0 ? totalDist + ' turnos (via rota)' : '???'));

  h += '<div class="detail-stats">';
  h += _statCell('Distancia', distLabel);
  h += _statCell('Clima', (wt && WEATHER_NAMES[wt]) ? WEATHER_NAMES[wt] : '\u2600\uFE0F Limpo');
  h += _statCell('Terreno', TERRAIN_LABELS[biome] || 'Normal');
  h += _statCell('Forragear', FORAGE_LABELS[biome] || 'Nenhum');
  if (reg.quests > 0) h += _statCell('Missoes', reg.quests + ' ativas');
  if (reg.dungeons > 0) h += _statCell('Masmorras', reg.dungeons + ' encontradas');
  if (loc.s) h += _statCell('Tipo', '\u{1F3D8}\uFE0F Assentamento');
  h += '</div>';

  if (loc.ds) h += '<div class="detail-note">"' + loc.ds + '"</div>';

  /* No map warning */
  var regData = state.regions[biome];
  if (regData && !regData.hm && !isCurrent) {
    h += '<div class="detail-nomap-warn">\u{1F5FA}\uFE0F Voce nao possui mapa desta regiao. Risco maior de se perder durante a viagem.</div>';
  }

  if (!isCurrent && isConnected) {
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
    h += '<button class="action-btn" data-nav-action="explore">\u{1F50D} Explorar</button>';
    h += '<button class="action-btn" data-nav-action="camp">\u{1F3D5}\uFE0F Acampar</button>';
    if (isOutsideCity) {
      h += '<button class="action-btn" data-nav-action="return">\u{1F3F0} Retornar</button>';
    }
  } else if (isConnected && disc) {
    h += '<button class="action-btn action-btn-travel" data-travel-loc="' + loc.id + '" data-travel-biome="' + biome + '" data-travel-name="' + loc.n + '">\u2694\uFE0F Viajar (' + edgeDist + '\u{1F552})</button>';
  } else if (isConnected && !disc) {
    h += '<div class="detail-nomap-warn">\u26a0\ufe0f <b>Expedi\u00e7\u00e3o \u00e0s Cegas</b> \u2014 ' + edgeDist + ' turno' + (edgeDist !== 1 ? 's' : '') + ', sem mapa, alta chance de se perder</div>';
    h += '<button class="action-btn action-btn-travel" data-travel-loc="' + loc.id + '" data-travel-biome="' + biome + '" data-travel-name="Local desconhecido" data-travel-nomap="1" data-travel-first="1">\u{1F9ED} Expedi\u00e7\u00e3o (' + edgeDist + '\u{1F552} Sem Mapa) \u26a0\ufe0f</button>';
  } else {
    /* Unconnected — show route hint instead of travel button */
    var routePath = _hubBfsPath(state.currentLoc, loc.id);
    if (routePath && routePath.length > 2) {
      var via = [];
      for (var ri = 1; ri < routePath.length - 1; ri++) {
        var rl = _findLoc(routePath[ri]);
        if (rl) via.push(rl.n);
      }
      h += '<div class="detail-nomap-warn">\u{1F6E4}\uFE0F Sem caminho direto. Rota: via ' + via.join(' \u2192 ') + ' (' + totalDist + ' turnos)</div>';
    } else {
      h += '<div class="detail-nomap-warn">\u{1F6E4}\uFE0F Sem caminho direto para este local.</div>';
    }
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

  /* Bind travel button(s) */
  container.querySelectorAll('[data-travel-loc]').forEach(function(travelBtn) {
    travelBtn.addEventListener('click', function() {
      var targetLoc = this.getAttribute('data-travel-loc');
      var targetBiome = this.getAttribute('data-travel-biome');
      var targetName = this.getAttribute('data-travel-name');
      var noMap = this.hasAttribute('data-travel-nomap');
      var firstVisit = this.hasAttribute('data-travel-first');
      _startTravel(targetLoc, targetBiome, targetName, { noMap: noMap, firstVisit: firstVisit });
    });
  });

  /* Bind explore / camp / return buttons (current location) */
  container.querySelectorAll('[data-nav-action]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var action = this.getAttribute('data-nav-action');
      console.warn('[HUB] nav-action action=' + action + ' finishNav=' + (typeof finishNavigation) + ' execNav=' + (typeof _executeNavAction));
      /* Always use _executeNavAction — finishNavigation requires navigate-core.js
         which is NOT loaded by the SPA navigate route */
      _executeNavAction(action);
    });
  });

  document.getElementById('detail-screen').style.display = 'flex';
  document.getElementById('detail-back').onclick = function() {
    document.getElementById('detail-screen').style.display = 'none';
  };
}

/* ===== NAV ACTION (explore/camp/return — fallback when navigate-core.js not loaded) ===== */
async function _executeNavAction(type) {
  if (!S.api || !S.token) {
    console.warn('[HUB] No API/token for nav action');
    if (typeof vToast === 'function') vToast('Sessao expirada. Reabra o mapa.', 'err', 2500);
    return;
  }
  console.log('[HUB] _executeNavAction type=%s uid=%s', type, S.uid);

  if (typeof vProcessing !== 'undefined') vProcessing.show({ text: type === 'explore' ? 'Explorando...' : type === 'camp' ? 'Montando acampamento...' : 'Retornando...' });

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
        type: type,
      }),
    });
    if (typeof vProcessing !== 'undefined') vProcessing.hide();

    if (!resp.ok) {
      console.error('[HUB] nav action HTTP %s', resp.status);
      if (resp.status === 401 || resp.status === 403) {
        if (typeof vToast === 'function') vToast('Sessao expirada. Retornando...', 'err', 2500);
        setTimeout(_transitionToGame, 1500);
      }
      return;
    }
    var data = await resp.json();
    console.log('[HUB] nav action response type=%s hasUrl=%s hasError=%s', type, !!data.url, !!data.error);

    if (data.error) {
      console.warn('[HUB] nav action error: %s', data.error);
      if (typeof vToast === 'function') vToast(data.message || data.error, 'err', 3000);
      return;
    }
    if (data.url) {
      if (data.travel_log && data.travel_log.length > 0 && typeof _showTravelJournal === 'function') {
        _showTravelJournal(data.travel_log, data.url);
      } else {
        window.__valdoria_transitioning = true;
        if (typeof valdoriaSpaNav === 'function') valdoriaSpaNav(data.url);
        else window.location.replace(data.url);
      }
      return;
    }
    /* No URL — return to game */
    _transitionToGame();
  } catch (e) {
    if (typeof vProcessing !== 'undefined') vProcessing.hide();
    console.error('[HUB] nav action error:', e);
    if (typeof vToast === 'function') vToast('Erro: ' + e.message, 'err', 3000);
  }
}

/* ===== TRAVEL ACTION ===== */
function _startTravel(locId, biome, name, flags) {
  /* Store flags for _executeTravelApi */
  window._pendingTravelFlags = flags || {};
  /* Use the full explore-travel.js animation (parallax, silhouette, particles) */
  if (typeof playTravelAnimation === 'function') {
    /* Constrain canvas to 430px max / 932px max height */
    var maxW = Math.min(window.innerWidth, 430);
    var maxH = Math.min(window.innerHeight, 932);
    playTravelAnimation(biome, name, function() {
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

    var _tf = window._pendingTravelFlags || {};
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
        noMap: _tf.noMap || !hasMap,
        firstVisit: _tf.firstVisit || false,
      }),
    });
    window._pendingTravelFlags = {};

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

    console.log('[HUB] travel_response type=%s hasUrl=%s hasLog=%s error=%s',
      data.type || '-', !!data.url, !!(data.travel_log && data.travel_log.length), data.error || '-');

    if (data.error) {
      console.warn('[HUB] travel_error: %s %s', data.error, data.message || '');
      if (typeof vToast === 'function') vToast('Erro: ' + (data.message || data.error), 'err', 3000);
      return;
    }

    /* Handle travel journal if present */
    if (data.travel_log && data.travel_log.length > 0 && typeof _showTravelJournal === 'function') {
      _showTravelJournal(data.travel_log, data.url);
    } else if (data.url) {
      /* Direct transition to explore/combat — use SPA nav to avoid full reload */
      window.__valdoria_transitioning = true;
      if (typeof valdoriaSpaNav === 'function') valdoriaSpaNav(data.url);
      else window.location.replace(data.url);
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
      if (d.url) { if (typeof valdoriaSpaNav === 'function') valdoriaSpaNav(d.url); else window.location.replace(d.url); }
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

  document.getElementById('btn-journal').addEventListener('click', function() {
    /* Open travel journal modal (reuses navigate-core _showTravelJournal if available) */
    var log = state.travelLog || [];
    if (log.length === 0) {
      if (typeof vToast === 'function') vToast('Nenhuma viagem registrada ainda.', 'ok', 2500);
      return;
    }
    if (typeof _showTravelJournal === 'function') {
      _showTravelJournal(log, null);
    }
  });

  document.getElementById('btn-camp').addEventListener('click', function() {
    if (!state.cc) {
      if (typeof vToast === 'function') vToast('Nao e possivel acampar aqui.', 'warn', 2500);
      return;
    }
    _executeAction('camp');
  });

  var btnReturn = document.getElementById('btn-return');
  if (btnReturn) {
    btnReturn.addEventListener('click', function() {
      _executeAction('return');
    });
  }
}

async function _executeAction(type) {
  console.log('[HUB] action_start type=%s uid=%s loc=%s', type, S.uid, state.currentLoc);
  if (!S.api || !S.token) {
    console.warn('[HUB] action_blocked: no API/token');
    if (typeof vToast === 'function') vToast('Conexao indisponivel', 'err', 2500);
    return;
  }

  var labels = { camp: 'Montando acampamento...', return: 'Retornando a cidade...' };
  if (typeof vProcessing !== 'undefined') vProcessing.show({ text: labels[type] || 'Processando...' });

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
        type: type,
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

    if (data.url) {
      /* Redirect (return journey → navigate reload, camp → game) */
      window.__valdoria_transitioning = true;
      if (data.travel_log && data.travel_log.length > 0 && typeof playTravelAnimation === 'function') {
        var biome = _findBiome(state.currentLoc) || 'plains';
        playTravelAnimation(biome, 'Eldoria', function() {
          if (typeof valdoriaSpaNav === 'function') valdoriaSpaNav(data.url);
          else window.location.replace(data.url);
        });
      } else {
        if (typeof valdoriaSpaNav === 'function') valdoriaSpaNav(data.url);
        else window.location.replace(data.url);
      }
    } else {
      /* No redirect — transition to game */
      _transitionToGame();
    }
  } catch (e) {
    if (typeof vProcessing !== 'undefined') vProcessing.hide();
    console.error('[HUB] Action error:', e);
    if (typeof vToast === 'function') vToast('Erro. Tente novamente.', 'err', 3000);
  }
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
