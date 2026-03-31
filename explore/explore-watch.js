/* ===================================================================
 * explore-watch.js - Alexandrian Hex Crawl Systems
 * Watch/Day loop, Navigation checks, Social encounters,
 * Rumor system, Fog levels, Pursuer system
 * =================================================================== */

/* == 1. Constants & Data == */

var STEPS_PER_WATCH = 8;
var WATCHES_PER_DAY = 3;
var _watchStepCount = 0;

var NAV_DC_BY_BIOME = {
  forest: 15, plains: 10, cave: 15, swamp: 15, desert: 12,
  mountain: 12, snow: 12, volcanic: 10, graveyard: 10, ruins: 12,
  coast: 10, jungle: 15, tundra: 12, hills: 10, badlands: 12,
  underground: 15
};

var WEATHER_LABELS = {
  s: "Ensolarado", c: "Nublado", r: "Chuva", t: "Tempestade",
  f: "Neblina", w: "Ventania", h: "Calor Extremo",
  z: "Neve", x: "Frio Extremo"
};
var WEATHER_ICONS = {
  s: '\u2600\ufe0f', c: '\u2601\ufe0f', r: '\ud83c\udf27\ufe0f',
  t: '\u26c8\ufe0f', f: '\ud83c\udf2b\ufe0f', w: '\ud83d\udca8',
  h: '\ud83d\udd25', z: '\u2744\ufe0f', x: '\u2744\ufe0f'
};
var WEATHER_EFFECTS = {
  s: {}, c: {}, r: { navDCMod: 2, difficultAll: true, ppMod: -2 },
  t: { navDCMod: 5, difficultAll: true, ppMod: -5, conDC: 12, lightningChance: 0.08 },
  f: { navDCMod: 3, ppMod: -3, visMod: -2 },
  w: { navDCMod: 2, ppMod: -2 },
  h: { conDC: 10 }, z: { navDCMod: 2, difficultAll: true },
  x: { conDC: 12, navDCMod: 3, difficultAll: true }
};

var SOCIAL_ENCOUNTER_POOL = [
  {
    icon: '\ud83d\udc64', title: 'Mercador Andarilho',
    narration: 'Um mercador com mochila pesada se aproxima cautelosamente.',
    skill: 'prs', dc: 12,
    successNarration: 'O mercador sorri e compartilha rumores valiosos sobre a regi\u00e3o.',
    failNarration: 'O mercador desconfia de voc\u00ea e segue seu caminho apressado.',
    successReward: { x: 15, g: 5 }
  },
  {
    icon: '\ud83d\udc64', title: 'Peregrino Ferido',
    narration: 'Um peregrino manca na estrada, com um ferimento no tornozelo.',
    skill: 'med', dc: 13,
    successNarration: 'Voc\u00ea trata o ferimento com habilidade. O peregrino agradece profundamente.',
    failNarration: 'Seu tratamento n\u00e3o ajuda muito. O peregrino agradece o esfor\u00e7o.',
    successReward: { x: 20 }
  },
  {
    icon: '\ud83d\udc64', title: 'Batedor Desconhecido',
    narration: 'Uma figura encapuzada observa voc\u00ea de uma rocha elevada.',
    skill: 'ins', dc: 14,
    successNarration: 'Voc\u00ea percebe que o batedor n\u00e3o \u00e9 hostil e ele revela informa\u00e7\u00f5es.',
    failNarration: 'A figura desaparece antes que voc\u00ea possa avaliar suas inten\u00e7\u00f5es.',
    successReward: { x: 10 }
  },
  {
    icon: '\ud83d\udc64', title: 'Refugiados',
    narration: 'Um pequeno grupo de refugiados descansa \u00e0 beira do caminho.',
    skill: 'prs', dc: 11,
    successNarration: 'Os refugiados compartilham comida e hist\u00f3rias sobre os perigos adiante.',
    failNarration: 'Os refugiados est\u00e3o assustados demais para conversar.',
    successReward: { x: 10, g: 3 }
  },
  {
    icon: '\ud83d\udc64', title: 'Ermit\u00e3o',
    narration: 'Um ermit\u00e3o idoso emerge de uma caverna pr\u00f3xima.',
    skill: 'nat', dc: 13,
    successNarration: 'O ermit\u00e3o reconhece seu conhecimento e revela um segredo da floresta.',
    failNarration: 'O ermit\u00e3o murmura algo incoerente e volta para sua caverna.',
    successReward: { x: 25 }
  },
  {
    icon: '\ud83d\udc64', title: 'Caravana de Aventureiros',
    narration: 'Uma caravana de aventureiros acena de longe.',
    skill: 'itm', dc: 12,
    successNarration: 'Impressionados, os aventureiros oferecem suprimentos e dicas de viagem.',
    failNarration: 'Os aventureiros riem e seguem seu caminho sem parar.',
    successReward: { x: 15, g: 8 }
  }
];

/* Markov weather transition weights */
var _WEATHER_TRANSITIONS = {
  s: { s: 50, c: 30, r: 5, f: 5, w: 5, h: 5 },
  c: { s: 20, c: 30, r: 25, f: 10, w: 10, t: 5 },
  r: { s: 5, c: 25, r: 30, t: 20, f: 10, w: 10 },
  t: { c: 20, r: 35, t: 20, w: 15, f: 10 },
  f: { s: 15, c: 30, f: 30, r: 15, w: 10 },
  w: { s: 20, c: 25, w: 25, r: 15, t: 10, f: 5 },
  h: { s: 40, h: 30, c: 15, w: 10, t: 5 },
  z: { z: 35, x: 25, c: 20, f: 10, w: 10 },
  x: { z: 30, x: 30, c: 15, f: 15, w: 10 }
};
var _BIOME_WEATHER_OVERRIDES = {
  desert: { h: 2.0, r: 0.3, z: 0, x: 0 },
  snow: { z: 2.0, x: 1.5, h: 0, s: 0.5 },
  swamp: { f: 1.8, r: 1.5, h: 0.3, s: 0.5 },
  volcanic: { h: 2.5, r: 0.2, z: 0, x: 0 },
  mountain: { w: 1.5, t: 1.3, z: 1.2, h: 0.3 },
  cave: { s: 0, c: 0, f: 3.0, r: 0, t: 0, w: 0, h: 0, z: 0, x: 0 },
  underground: { s: 0, c: 0, f: 3.0, r: 0, t: 0, w: 0, h: 0, z: 0, x: 0 }
};

/* == 2. Watch System (Alexandrian: 6 watches/day, simplified to 3) == */

function initWatchSystem() {
  if (!S._currentWatch) S._currentWatch = 0;
  if (!S._currentDay) S._currentDay = 1;
  if (!S._weatherSchedule || S._weatherSchedule.length === 0) {
    S._weatherSchedule = _buildWeatherSchedule();
  }
  _watchStepCount = S._watchStepCount || 0;
  _applyWatchWeather();
  updateWatchHUD();
  if(window._dbg)console.debug("[EXPLORE] initWatch", {watch: S._currentWatch, day: S._currentDay, weather: S.weather, schedule: (S._weatherSchedule || []).length});
}

function tickWatch() {
  _watchStepCount++;
  S._watchStepCount = _watchStepCount;
  S._stepCount = (S._stepCount || 0) + 1;

  if (_watchStepCount >= STEPS_PER_WATCH) {
    _watchStepCount = 0;
    S._watchStepCount = 0;
    S._currentWatch = (S._currentWatch || 0) + 1;

    if (S._currentWatch >= WATCHES_PER_DAY) {
      S._currentWatch = 0;
      S._currentDay = (S._currentDay || 1) + 1;
      S._weatherSchedule = _buildWeatherSchedule();
    }

    _applyWatchWeather();
    updateWatchHUD();
    if(window._dbg)console.debug("[EXPLORE] watchAdvance", {watch: S._currentWatch, day: S._currentDay, weather: S.weather});

    if (typeof tickPursuer === 'function') tickPursuer();

    /* Watch boundary toast */
    var w = S._currentWatch + 1;
    var phase = w === 1 ? 'Manh\u00e3' : w === 2 ? 'Tarde' : 'Noite';
    var wLabel = WEATHER_LABELS[S.weather] || 'Limpo';
    if (typeof showTerrainToast === 'function') {
      showTerrainToast('Dia ' + S._currentDay + ' \u2014 ' + phase + ' | ' + wLabel, 'ranger');
    }
  }
  updateWatchHUD();
}

function _buildWeatherSchedule() {
  var current = S.weather || 's';
  var schedule = [];
  for (var i = 0; i < WATCHES_PER_DAY; i++) {
    current = _pickNextWeather(current);
    schedule.push(current);
  }
  return schedule;
}

function _pickNextWeather(current) {
  var transitions = _WEATHER_TRANSITIONS[current] || _WEATHER_TRANSITIONS.s;
  var biome = S.biome || 'forest';
  var overrides = _BIOME_WEATHER_OVERRIDES[biome] || {};
  var pool = {};
  var total = 0;
  for (var key in transitions) {
    var weight = transitions[key];
    if (overrides[key] !== undefined) {
      weight *= overrides[key];
    }
    if (weight > 0) {
      pool[key] = weight;
      total += weight;
    }
  }
  var roll = Math.random() * total;
  var sum = 0;
  for (var k in pool) {
    sum += pool[k];
    if (roll <= sum) return k;
  }
  return 's';
}

function _applyWatchWeather() {
  var idx = S._currentWatch || 0;
  var _prevW = S.weather;
  if (S._weatherSchedule && S._weatherSchedule[idx]) {
    S.weather = S._weatherSchedule[idx];
  }
  if (S.weather !== _prevW) { if (typeof _weatherNarrShown !== "undefined") _weatherNarrShown = false; if (typeof _weatherEffectSteps !== "undefined") _weatherEffectSteps = 0; }
  var eff = WEATHER_EFFECTS[S.weather] || {};
  S._weatherNavDCMod = eff.navDCMod || 0;
  S._weatherDifficultAll = !!eff.difficultAll;
  S._weatherPPMod = eff.ppMod || 0;
  S._weatherCONSaveDC = eff.conDC || 0;
  S._weatherLightningChance = eff.lightningChance || 0;
  S._effectiveVisibility = Math.max(1, (S.visibility || 3) + (eff.visMod || 0));
  if(window._dbg)console.debug("[EXPLORE] weatherApply", {weather: S.weather, prev: _prevW, conDC: S._weatherCONSaveDC, lightning: S._weatherLightningChance, vis: S._effectiveVisibility, changed: S.weather !== _prevW});
}

function updateWatchHUD() {
  var badge = document.getElementById('watch-badge');
  if (!badge) return;
  var day = S._currentDay || 1;
  var watch = (S._currentWatch || 0) + 1;
  var icon = WEATHER_ICONS[S.weather] || '\u2600\ufe0f';
  badge.textContent = 'D' + day + '.' + watch + ' ' + icon;
  badge.title = 'Dia ' + day + ', Vigia ' + watch + ' \u2014 ' + (WEATHER_LABELS[S.weather] || 'Limpo');
  badge.style.display = 'inline-block';
}

/* == 3. Navigation Check (PHB Ch.8 + Alexandrian Part 4) == */

function checkNavigation(targetCol, targetRow) {
  /* Skip if: ranger natural explorer, navigate activity, or insufficient steps */
  if (typeof isRanger === 'function' && isRanger()) return { veered: false };
  if (S.travelActivity === 'navigate') return { veered: false };
  if ((S._stepCount || 0) < 5) return { veered: false };

  var biome = S.biome || 'forest';
  var baseDC = NAV_DC_BY_BIOME[biome] || 12;
  var dc = baseDC + (S._weatherNavDCMod || 0);

  /* Night increases DC */
  if (typeof getDayPhase === 'function' && getDayPhase() === 'night') dc += 5;

  /* Roll WIS (Survival) */
  var wisMod = 0;
  if(!S.charData?.ab)console.warn('[EXPLORE] navCheck: charData.ab missing');
  if (S.charData && S.charData.ab) {
    wisMod = Math.floor(((S.charData.ab.wis || 10) - 10) / 2);
  }
  var profBonus = 0;
  if (S.charData && S.charData.sk && S.charData.sk.sur) {
    profBonus = S.charData.pb || 2;
  }
  var roll = Math.floor(Math.random() * 20) + 1;
  var total = roll + wisMod + profBonus;

  if(window._dbg)console.debug("[EXPLORE] navCheck", {biome: biome, dc: dc, roll: roll, total: total, veered: total < dc});
  if (total >= dc) return { veered: false };

  /* Alexandrian: 20% chance of NOT veering even on failure */
  if (Math.random() < 0.20) return { veered: false };

  /* Veered! Show toast */
  if (typeof showTerrainToast === 'function') {
    showTerrainToast('Desorientado! (Sobreviv\u00eancia ' + total + ' vs DC ' + dc + ')', 'damage');
  }
  return { veered: true };
}

function getVeerTarget(fromCol, fromRow, toCol, toRow) {
  var offsets = (fromRow % 2 === 0) ? EVEN_OFFSETS : ODD_OFFSETS;
  var candidates = [];
  for (var i = 0; i < offsets.length; i++) {
    var nc = fromCol + offsets[i][0];
    var nr = fromRow + offsets[i][1];
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
    if (nc === toCol && nr === toRow) continue;
    /* Exclude current position to prevent "snapback" feeling */
    if (nc === fromCol && nr === fromRow) continue;
    var tile = S.grid[nr] && S.grid[nr][nc] ? S.grid[nr][nc] : '.';
    if (IMPASSABLE.has(tile)) continue;
    candidates.push([nc, nr]);
  }
  if (candidates.length === 0) return [toCol, toRow];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/* == 4. Social Encounters (Alexandrian: encounter != combat) == */

var _lastSocialStep = -99;

function checkSocialEncounter() {
  if (!S._stepCount || S._stepCount - _lastSocialStep < 8) return null;
  var chance = 0.12 + (S.dangerLevel || 1) * 0.02;
  if (Math.random() > chance) return null;
  _lastSocialStep = S._stepCount;
  var pool = SOCIAL_ENCOUNTER_POOL;
  if (!pool || pool.length === 0) return null;
  var enc = pool[Math.floor(Math.random() * pool.length)];
  if(window._dbg)console.debug("[EXPLORE] socialEncounter", {title: enc.title, skill: enc.skill, dc: enc.dc, step: S._stepCount});
  return enc;
}

function showSocialEncounter(enc) {
  if (!enc) return;
  if (typeof activateOverlay === 'function') activateOverlay('dm-overlay');
  else {
    var ov = document.getElementById('dm-overlay');
    if (ov) ov.classList.add('active');
  }
  var dmIcon = document.getElementById('dm-icon');
  var dmTitle = document.getElementById('dm-title');
  var dmType = document.getElementById('dm-type');
  var narrEl = document.getElementById('dm-narration');
  var choicesEl = document.getElementById('dm-choices');
  var dmOverlay = document.getElementById('dm-overlay');
  if (dmIcon) dmIcon.textContent = enc.icon || '\ud83d\udc64';
  if (dmTitle) dmTitle.textContent = enc.title || 'Encontro';
  if (dmType) dmType.textContent = 'social';
  if (choicesEl) choicesEl.innerHTML = '';
  var narrationText = enc.narration || 'Algu\u00e9m se aproxima.';
  if (typeof typewriter === 'function') {
    typewriter(narrEl, narrationText, function() {
      _buildSocialChoices(enc, choicesEl, dmOverlay);
    });
  } else {
    if (narrEl) narrEl.textContent = narrationText;
    _buildSocialChoices(enc, choicesEl, dmOverlay);
  }
}

function _buildSocialChoices(enc, choicesEl, dmOverlay) {
  if (!choicesEl) return;

  /* Skill check button */
  var skillLabel = (typeof STAT_NAMES !== 'undefined' && STAT_NAMES[enc.skill])
    ? STAT_NAMES[enc.skill] : enc.skill;
  var checkBtn = document.createElement('button');
  checkBtn.className = 'dm-choice-btn';
  checkBtn.innerHTML = '<span class="choice-icon">\ud83c\udfb2</span>' + '<span class="choice-label">' + skillLabel + '</span>' + '<span class="choice-check">' + skillLabel + ' (DC ' + enc.dc + ')</span>';
  checkBtn.addEventListener('click', function() {
    checkBtn.disabled = true;
    var fakePoi = {
      id: 'social_' + Date.now(),
      type: 'npc',
      choices: [{
        t: skillLabel,
        k: { s: enc.skill, dc: enc.dc, m: 0 },
        o: {
          t: enc.successNarration || 'Sucesso!',
          x: (enc.successReward && enc.successReward.x) || 0,
          g: (enc.successReward && enc.successReward.g) || 0
        },
        f: {
          t: enc.failNarration || 'Falha.',
          x: 0, g: 0
        }
      }],
      combat: null
    };
    if (typeof deactivateOverlay === 'function') deactivateOverlay('dm-overlay');
    else if (dmOverlay) dmOverlay.classList.remove('active');
    if (typeof performStatCheck === 'function') {
      performStatCheck(fakePoi, fakePoi.choices[0]);
    }
  });
  choicesEl.appendChild(checkBtn);

  /* Ignore button */
  var ignoreBtn = document.createElement('button');
  ignoreBtn.className = 'dm-choice-btn';
  ignoreBtn.innerHTML = '<span class="choice-icon"></span><span class="choice-label">Ignorar</span>';
  ignoreBtn.addEventListener('click', function() {
    if (typeof deactivateOverlay === 'function') deactivateOverlay('dm-overlay');
    else if (dmOverlay) dmOverlay.classList.remove('active');
  });
  choicesEl.appendChild(ignoreBtn);
}

/* == 5. Rumor System (Info -> Choice -> Consequence) == */

function initRumors() {
  if (!S.rumors) S.rumors = [];
  if (!S._landmarksRevealed) S._landmarksRevealed = new Set();
}

function ageRumors() {
  if (!S.rumors || S.rumors.length === 0) return;
  for (var i = S.rumors.length - 1; i >= 0; i--) {
    S.rumors[i].age = (S.rumors[i].age || 0) + 1;
    if (S.rumors[i].age > 30) S.rumors.splice(i, 1);
  }
}

function addRumor(text, col, row) {
  if (!S.rumors) S.rumors = [];
  S.rumors.push({ text: text, col: col, row: row, age: 0 });
  if (typeof showTerrainToast === 'function') {
    showTerrainToast('\ud83d\udcdc ' + text, 'discovery');
  }
}

function checkLandmarkHints(col, row) {
  if (!S.grid || !S.grid[row]) return;
  var tile = S.grid[row][col] || '.';
  var baseTile = tile.match(/[0-9@EC]/) ? '.' : tile;
  var height = (typeof TILE_HEIGHT !== 'undefined' && TILE_HEIGHT[baseTile]) || 1;
  if (height < 3) return;

  /* From elevated terrain, reveal distant POIs as rumors */
  var revealRadius = (S.visibility || 3) + 3;
  for (var i = 0; i < S.pois.length; i++) {
    var poi = S.pois[i];
    if (S.poisResolved && S.poisResolved.has(poi.id)) continue;
    var key = poi.col + ',' + poi.row;
    if (S._landmarksRevealed && S._landmarksRevealed.has(key)) continue;
    var dist = typeof hexDist === 'function' ? hexDist(col, row, poi.col, poi.row) : 99;
    if (dist > revealRadius || dist < 2) continue;
    S._landmarksRevealed.add(key);
    var dir = _compassDir(col, row, poi.col, poi.row);
    var hint = 'Algo ao ' + dir + ' chama sua aten\u00e7\u00e3o.';
    addRumor(hint, poi.col, poi.row);
  }
}

function _compassDir(fromCol, fromRow, toCol, toRow) {
  if (typeof hexToScreen !== 'function') return '?';
  var from = hexToScreen(fromCol, fromRow);
  var to = hexToScreen(toCol, toRow);
  var dx = to.x - from.x;
  var dy = to.y - from.y;
  var angle = Math.atan2(dy, dx) * 180 / Math.PI;
  if (angle < -157.5 || angle >= 157.5) return 'Oeste';
  if (angle >= -157.5 && angle < -112.5) return 'Noroeste';
  if (angle >= -112.5 && angle < -67.5) return 'Norte';
  if (angle >= -67.5 && angle < -22.5) return 'Nordeste';
  if (angle >= -22.5 && angle < 22.5) return 'Leste';
  if (angle >= 22.5 && angle < 67.5) return 'Sudeste';
  if (angle >= 67.5 && angle < 112.5) return 'Sul';
  if (angle >= 112.5 && angle < 157.5) return 'Sudoeste';
  return '?';
}

function drawRumorIndicators(ctx, timestamp) {
  if (!S.rumors || S.rumors.length === 0) return;
  if (typeof hexToScreen !== 'function') return;
  var playerPos = hexToScreen(S.playerCol, S.playerRow);
  var pulse = 0.5 + Math.sin((timestamp || 0) * 0.003) * 0.3;

  for (var i = 0; i < S.rumors.length; i++) {
    var rum = S.rumors[i];
    if (rum.col === undefined || rum.row === undefined) continue;
    var targetPos = hexToScreen(rum.col, rum.row);
    var dx = targetPos.x - playerPos.x;
    var dy = targetPos.y - playerPos.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) continue;

    /* Draw arrow at edge of visible area pointing toward rumor */
    var nx = dx / dist;
    var ny = dy / dist;
    var arrowDist = Math.min(dist, 80);
    var ax = playerPos.x + nx * arrowDist;
    var ay = playerPos.y + ny * arrowDist;
    var angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.4 + pulse * 0.3;
    ctx.fillStyle = '#daa520';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/* == 6. Fog of War - 3 Levels (Alexandrian) == */

function updateFogLevels() {
  if (!S.fogState) return;
  var effectiveVis = S._effectiveVisibility || S.visibility || 3;
  for (var key in S.fogState) {
    if (S.fogState[key] !== 'visible') continue;
    var parts = key.split(',');
    var c = parseInt(parts[0], 10);
    var r = parseInt(parts[1], 10);
    var dist = typeof hexDist === 'function'
      ? hexDist(S.playerCol, S.playerRow, c, r) : 99;
    if (dist > effectiveVis + 1) {
      S.fogState[key] = 'dim';
    }
  }
  /* Ensure current area is visible */
  if (typeof revealFogAt === 'function') {
    revealFogAt(S.playerCol, S.playerRow, effectiveVis, S.fogState, S.grid, false);
    if (typeof invalidateStatic === 'function') invalidateStatic();
  }
}

/* == 7. Pursuer System (Alexandrian: ticking clock) == */

function initPursuer() {
  if ((S.dangerLevel || 1) < 3) return;
  if (S._pursuerData) return; /* Already initialized */

  /* Spawn pursuer at opposite edge of the map from exit */
  var startCol, startRow;
  if (S.exitRow <= 2) {
    startRow = ROWS - 1;
    startCol = Math.floor(Math.random() * COLS);
  } else {
    startRow = 0;
    startCol = Math.floor(Math.random() * COLS);
  }
  /* Make sure it is passable */
  var attempts = 0;
  while (attempts < 20) {
    var tile = S.grid[startRow] && S.grid[startRow][startCol]
      ? S.grid[startRow][startCol] : '.';
    if (!IMPASSABLE.has(tile)) break;
    startCol = Math.floor(Math.random() * COLS);
    attempts++;
  }
  S._pursuerData = { col: startCol, row: startRow, speed: 2 };
  if(window._dbg)console.debug("[EXPLORE] pursuerSpawn", {col: startCol, row: startRow, dangerLevel: S.dangerLevel});
}

/* BFS shortest-path from pursuer to player (11x13 grid = microseconds) */
function _bfsNextStep(fromCol, fromRow, toCol, toRow) {
  if (fromCol === toCol && fromRow === toRow) return null;
  var queue = [[fromCol, fromRow]];
  var visited = {};
  var parent = {};
  var key = fromCol + ',' + fromRow;
  visited[key] = true;
  while (queue.length > 0) {
    var cur = queue.shift();
    var cc = cur[0], cr = cur[1];
    key = cc + ',' + cr;
    var offsets = (cr % 2 === 0) ? EVEN_OFFSETS : ODD_OFFSETS;
    for (var i = 0; i < offsets.length; i++) {
      var nc = cc + offsets[i][0];
      var nr = cr + offsets[i][1];
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      var nk = nc + ',' + nr;
      if (visited[nk]) continue;
      var tile = S.grid[nr] && S.grid[nr][nc] ? S.grid[nr][nc] : '.';
      if (IMPASSABLE.has(tile)) continue;
      visited[nk] = true;
      parent[nk] = key;
      if (nc === toCol && nr === toRow) {
        /* Trace back to find first step */
        var stepKey = nk;
        var startKey = fromCol + ',' + fromRow;
        while (parent[stepKey] && parent[stepKey] !== startKey) {
          stepKey = parent[stepKey];
        }
        var parts = stepKey.split(',');
        return { col: parseInt(parts[0],10), row: parseInt(parts[1],10) };
      }
      queue.push([nc, nr]);
    }
  }
  return null; /* No path found */
}

function tickPursuer() {
  if (!S._pursuerData) return;
  var pur = S._pursuerData;
  for (var step = 0; step < pur.speed; step++) {
    /* BFS pathfinding: optimal shortest path to player */
    var next = _bfsNextStep(pur.col, pur.row, S.playerCol, S.playerRow);
    if (next) {
      pur.col = next.col;
      pur.row = next.row;
    }

    /* If pursuer reaches player, trigger forced combat encounter */
    if(window._dbg)console.debug("[EXPLORE] pursuerTick", {col: pur.col, row: pur.row, playerDist: typeof hexDist === "function" ? hexDist(pur.col, pur.row, S.playerCol, S.playerRow) : "?"});
    if (pur.col === S.playerCol && pur.row === S.playerRow) {
      if (typeof showTerrainToast === 'function') {
        showTerrainToast('\u26a0\ufe0f O perseguidor alcan\u00e7ou voc\u00ea!', 'damage');
      }
      if (S.randomEncounters && S.randomEncounters.length > 0) {
        var enc = S.randomEncounters.shift();
        if (typeof showRandomEncounter === 'function') {
          setTimeout(function() { showRandomEncounter(enc); }, 500);
        }
      }
      S._pursuerData = null;
      return;
    }
  }
}

function drawPursuerIndicator(ctx, timestamp) {
  if (!S._pursuerData) return;
  if (typeof hexToScreen !== 'function') return;
  var playerPos = hexToScreen(S.playerCol, S.playerRow);
  var purPos = hexToScreen(S._pursuerData.col, S._pursuerData.row);
  var dx = purPos.x - playerPos.x;
  var dy = purPos.y - playerPos.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 5) return;

  var pulse = 0.5 + Math.sin((timestamp || 0) * 0.005) * 0.4;
  var nx = dx / dist;
  var ny = dy / dist;
  var arrowDist = Math.min(dist, 60);
  var ax = playerPos.x + nx * arrowDist;
  var ay = playerPos.y + ny * arrowDist;
  var angle = Math.atan2(dy, dx);

  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.5 + pulse * 0.3;
  ctx.fillStyle = '#cc3333';
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();

  /* Danger glow */
  ctx.globalAlpha = pulse * 0.3;
  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
