/* game-guild.js — Guild popup renderer
 *
 * V4 NPC Dialog redesign (2026-04-11):
 * NPC principal scene (Tavira, a Mestra) with speech bubble + dialogue
 * choices. Uses createElement/textContent only (no innerHTML) to
 * avoid XSS vectors with user-controlled quest names.
 *
 * Uses the Valdoria coin icon (.vi.vi-coin) for gold display —
 * NEVER the money-bag emoji.
 *
 * #71e (2026-06-03) — PADRAO_LOCAIS sweep: avatares agora usam o BRASÃO
 * HERÁLDICO da classe (nunca emoji de pessoa) via _gldClassCrest; novo
 * renderGuildRecruitList (grid épico de recrutas). Roda no contexto de
 * cidade/index.html (símbolos ic-* + padrao-taverna.css presentes lá).
 *
 * MAPA_IA — navegação rápida (atualizar a CADA mudança):
 *   ~40   GUILD_SVC_META            cb -> PNG icon canonical
 *   ~46   _gldEl / _gldSpeech       helpers DOM
 *   ~86   TAVIRA_DIALOGUE           greeting principal (NPC row click)
 *   ~107  renderGuildHub            hub PADRAO_TAVERNA (cenário + serviços)
 *   ~276  _gldClassSlug             classe PT-BR -> slug avatar gradiente
 *   ~290  _gldClassIcoId            classe -> id heráldico ic-*
 *   ~310  _GLD_CLASS_COLOR          ic-* -> cor heráldica
 *   ~318  _gldClassCrest            HTML do brasão da classe (fallback emoji)
 *   ~330  renderGuildAdventurer     ficha do recruta (crest + stats + lore)
 *   ~430  renderGuildHireConfirm    confirmar contratação (saldo before/after)
 *   ~480  renderGuildHireSuccess    boas-vindas do aliado (crest + selo ◆)
 *   ~575  renderGuildRecruitList    grid épico de recrutas (PADRAO_LOCAIS)
 *   ~700  window exports
 */
'use strict';

/* task #75 (2026-05-20): IIFE wrap pra prevenir colisões de globais entre
   renderers (regra estabelecida após bug Garrick/Vorhan task #70). Apenas
   render* functions expostas via window no final. */
(function() {

/* 2026-05-21 — GUILD_SVC_META map cb -> PNG canonical.
   Cobre cb da Guilda enviados pelo backend (src/game/system/guild/*.py). */
var GUILD_SVC_META = {
  'guild_quest_board':    { icon: '<img src="../shared/img/services/svc-contratos.webp" alt="">' },
  'guild_quests':         { icon: '<img src="../shared/img/services/svc-contratos.webp" alt="">' },
  'guild_contracts':      { icon: '<img src="../shared/img/services/svc-contratos.webp" alt="">' },
  'guild_recruit_menu':   { icon: '<img src="../shared/img/services/svc-inscrever-guilda.webp" alt="">' },
  'guild_recruit':        { icon: '<img src="../shared/img/services/svc-inscrever-guilda.webp" alt="">' },
  'guild_party_menu':     { icon: '<img src="../shared/img/services/svc-mercenarios.webp" alt="">' },
  'guild_party':          { icon: '<img src="../shared/img/services/svc-mercenarios.webp" alt="">' },
  'guild_bounty_tavira':  { icon: '<img src="../shared/img/services/svc-missoes.webp" alt="">' },
  'guild_research_menu':  { icon: '<img src="../shared/img/services/svc-livros.webp" alt="">' },
  'guild_research':       { icon: '<img src="../shared/img/services/svc-livros.webp" alt="">' },
  'guild_training_menu':  { icon: '<img src="../shared/img/services/svc-treino.webp" alt="">' },
  'guild_training':       { icon: '<img src="../shared/img/services/svc-treino.webp" alt="">' },
  'guild_veteran':        { icon: '<img src="../shared/img/services/svc-mentoria.webp" alt="">' },
  'guild_mentor':         { icon: '<img src="../shared/img/services/svc-mentoria.webp" alt="">' },
  'guild_ranking':        { icon: '<img src="../shared/img/services/svc-ranking-guilda.webp" alt="">' }
};
window._GUILD_SVC_META = GUILD_SVC_META;

function _gldEl(tag, cls, text) {
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) { if (typeof text === 'string' && text.charAt(0) === '<') el.innerHTML = text; else el.textContent = text; }
  return el;
}

function _gldSpeech(partyCount, partyMax, available, rotationHours) {
  var vagas = Math.max(0, (partyMax || 3) - (partyCount || 0));
  var parts = [];
  if (vagas > 0) {
    parts.push('Bem-vindo de volta, aventureiro. Vejo que teu grupo ainda tem ' + vagas + ' vaga' + (vagas !== 1 ? 's' : '') + '.');
  } else {
    parts.push('Bem-vindo de volta, aventureiro. Teu grupo está completo — ' + partyCount + ' de ' + partyMax + '.');
  }
  if (available && available > 0) {
    parts.push(' Temos ' + available + ' aventureiro' + (available !== 1 ? 's' : '') + ' dispostos hoje');
    if (rotationHours) {
      parts.push(' — a lista se renova em ' + rotationHours + ' horas.');
    } else {
      parts.push('.');
    }
  }
  parts.push(' Em que posso te ajudar?');
  return parts.join('');
}

/* === PADRAO_TAVERNA canonical SVC config (task #33, 2026-05-20) === */
if (!window._SVC_CONFIG_GUILD) {
  window._SVC_CONFIG_GUILD = {
    faction: 'guild',
    factionLabel: 'Guilda dos Aventureiros',
    reactions: {
      very_negative: 'Tavira cruza os braços, olhar duro. <i>(suspira longo)</i> "A Guilda não tolera comportamento assim. Vai pensar antes de voltar."',
      negative: 'Tavira balança a cabeça. <i>(volta ao caderno)</i> "Cada um tem seu jeito. Mas a Guilda também."',
      neutral: 'Tavira anota algo no caderno. <i>(mantém o tom profissional)</i> "Registrado."',
      positive: 'Tavira ergue uma sobrancelha em aprovação. <i>(sorri de canto)</i> "Esse é o tipo de aventureiro que a Guilda precisa."',
      very_positive: 'Tavira inclina a cabeça em respeito. <i>(estende a mão)</i> "És dos melhores. A Guilda sempre lembra dos seus."'
    },
    confirmMsgs: {
      narration: 'Tavira anota o registro no livro da Guilda. <i>(passa a pena no tinteiro)</i>',
      generic: '"Registrado e selado." <i>(fecha o livro)</i> Que tua jornada honre o nome da Guilda.'
    }
  };
}

/* P4 (2026-07-02): sessão REMOTE = diálogo server-driven (venue 'guild' no
   city_dialogue_resolver — saudação ROTATIVA anti-repeat + transitions pras
   telas ricas). O objeto TAVIRA_DIALOGUE abaixo vira fallback LOCAL-only. */
function _gldIsRemote() {
  return !!(window.vCityServer && window.vCityServer.isRemote && window.vCityServer.isRemote());
}

/* === TAVIRA_DIALOGUE (fallback LOCAL — REMOTE usa venue 'guild') ======== */
var TAVIRA_DIALOGUE = {
  npc: {
    name: 'Mestra Tavira',
    desc: 'Guardiã da Guilda · dezoito anos liderando o Salão dos Aventureiros',
    portrait: '../shared/img/npcs/mestra-tavira.webp'
  },
  script: [
    { type: 'narration', text: 'O Salão dos Aventureiros respira lenta. Tochas de óleo pendem das vigas, iluminando o brasão da Guilda — espada cruzada com pena — entalhado no mármore atrás do balcão. Tavira ergue os olhos do registro, reconhece você, sorri de canto.' },
    { type: 'speech', speaker: 'Mestra Tavira', text: 'Bem-vindo de volta, aventureiro. <i>(fecha o livro com um clique seco)</i> O Salão sempre tem trabalho pra quem busca. Diz o que precisa.' }
  ],
  choices: [
    // task #70 (2026-05-20): cb's alinhadas com backend canonical em guild.py:151-178.
    // Antes: 'guild_quests'/'guild_recruit'/'guild_rest' → não dispatched (silent close).
    // Agora: backend handlers reais → abre quest board / recruit menu / party menu.
    { id: 'view_quests',  label: '"Quero ver os contratos."', cb: 'guild_quest_board' },
    { id: 'recruit',      label: '"Vim recrutar aventureiros."', cb: 'guild_recruit_menu' },
    { id: 'manage_party', label: '"Como gerencio meu grupo?"', cb: 'guild_party_menu' },
    { id: 'leave',        label: '"Volto depois, Mestra."', cb: 'close' }
  ]
};

function renderGuildHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-GUILD] renderGuildHub (PADRAO_TAVERNA) party=' + (data.party_count || 0) + '/' + (data.party_max || 3) + ' services=' + (data.services ? data.services.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = _gldEl('div', 'gld-hub');

  /* === 1. Cenario canonical === */
  var cenarioEl = _gldEl('div', 'cenario');
  var bg = _gldEl('img', 'cenario-bg');
  bg.src = '../shared/img/guilda/guilda-banner.webp';
  bg.alt = '';
  bg.loading = 'lazy';
  bg.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(bg);
  cenarioEl.appendChild(_gldEl('div', 'candle-glow l'));
  cenarioEl.appendChild(_gldEl('div', 'candle-glow r'));
  var crest = _gldEl('img', 'cenario-brasao');
  crest.src = '../shared/img/guilda/guilda-crest.webp';
  crest.alt = 'Brasão da Guilda';
  crest.loading = 'lazy';
  crest.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(crest);
  var titulo = _gldEl('div', 'cenario-titulo');
  titulo.appendChild(_gldEl('div', 'name', 'Guilda dos Aventureiros'));
  titulo.appendChild(_gldEl('div', 'sub', 'Salão de Mestra Tavira · Coração de Valdoria'));
  cenarioEl.appendChild(titulo);
  root.appendChild(cenarioEl);

  /* === 2. Body container === */
  var body = _gldEl('div', 'gld-body');
  body.style.cssText = 'padding:8px 12px 0;display:flex;flex-direction:column;gap:7px;';

  /* === 2a. NPC row (Tavira main entry) === */
  var npcRow = _gldEl('div', 'row-npc');
  var portraitWrap = _gldEl('div', 'npc-portrait');
  var img = _gldEl('img');
  img.src = '../shared/img/npcs/mestra-tavira.webp';
  img.alt = 'Mestra Tavira';
  img.loading = 'lazy';
  img.onerror = function(){ this.style.display = 'none'; };
  portraitWrap.appendChild(img);
  npcRow.appendChild(portraitWrap);
  var info = _gldEl('div', 'npc-info');
  info.appendChild(_gldEl('div', 'name', 'Mestra Tavira'));
  var vagasMsg = '';
  var vagas = Math.max(0, (data.party_max || 3) - (data.party_count || 0));
  if (vagas > 0) {
    vagasMsg = '"Teu grupo ainda tem ' + vagas + ' vaga' + (vagas !== 1 ? 's' : '') + '."';
  } else {
    vagasMsg = '"Teu grupo está completo — ' + (data.party_count || 0) + ' de ' + (data.party_max || 3) + '."';
  }
  info.appendChild(_gldEl('div', 'quote', vagasMsg));
  npcRow.appendChild(info);
  npcRow.appendChild(_gldEl('div', 'npc-chev', '›'));
  npcRow.addEventListener('click', function(){
    // PADRAO_SERVIDOR (P4): o servidor monta a saudação rotativa da Tavira e resolve.
    if (typeof window._openCityDialogue === 'function' && _gldIsRemote()) {
      window._openCityDialogue('guild', 'tavira');
    } else if (typeof window.vEncounter === 'object' && window.vEncounter.render) {
      window._SVC_CONFIG = window._SVC_CONFIG_GUILD;
      window.vEncounter.render(TAVIRA_DIALOGUE);
    }
  });
  body.appendChild(npcRow);

  /* === 2b. Reputation bar canonical === */
  var renome = 0;
  if (data.renome && typeof data.renome.guild === 'number') renome = data.renome.guild;
  else if (window._PLAYER_RENOWN && typeof window._PLAYER_RENOWN.guild === 'number') renome = window._PLAYER_RENOWN.guild;
  var tier = 'NEUTRO';
  if (renome >= 25) tier = 'AMIGÁVEL';
  else if (renome >= 10) tier = 'CORDIAL';
  else if (renome < 0 && renome >= -10) tier = 'FRIO';
  else if (renome < -10) tier = 'HOSTIL';
  var pct = Math.max(0, Math.min(100, Math.round((renome + 10) / 40 * 100)));
  var repBar = _gldEl('div', 'rep-bar');
  repBar.appendChild(_gldEl('span', 'label', 'Reputação'));
  var track = _gldEl('div', 'bar');
  var fill = _gldEl('div', 'fill');
  fill.style.width = pct + '%';
  track.appendChild(fill);
  repBar.appendChild(track);
  repBar.appendChild(_gldEl('span', 'value', tier + ' · ' + renome));
  body.appendChild(repBar);

  /* === 2c. Fallen ally warning === */
  if (data.fallen_count > 0) {
    var fallenBox = _gldEl('div', 'gld-fallen-warn');
    fallenBox.style.cssText = 'padding:8px 12px;background:rgba(180,40,40,0.15);border-left:3px solid #b42828;border-radius:4px;color:#e8b08c;font-size:calc(12px * var(--v-font-scale, 1));';
    fallenBox.textContent = data.fallen_count + ' aliado(s) caído(s) em teu grupo';
    body.appendChild(fallenBox);
  }

  /* === 2d. Status info REMOVIDO (user 2026-06-24): a faixa "Grupo 0/3 ·
     Valdoritas · 12h" era redundante (grupo ja no #city-group-panel + ficha,
     gold no header da cidade) e poluia o hub. Tambem carregava emoji banido. === */

  /* === 2e. Section label === */
  var sectionLbl = _gldEl('div', 'pt-section-label');
  sectionLbl.textContent = 'Serviços da Guilda';
  body.appendChild(sectionLbl);

  /* === 2f. Services grid (.services + .svc canonical) === */
  if (data.services && data.services.length) {
    var grid = _gldEl('div', 'services');
    data.services.forEach(function(svc) {
      var card = _gldEl('div', 'svc');
      if (svc.disabled) card.classList.add('disabled');
      card.setAttribute('data-svc', svc.cb || '');

      var ico = _gldEl('div', 'svc-ico');
      // 2026-05-21: GUILD_SVC_META overrides emoji por PNG canonical quando cb match.
      var _gMeta = GUILD_SVC_META[svc.cb || ''];
      var icoStr = (_gMeta && _gMeta.icon) || svc.icon || '▸';
      if (icoStr.indexOf('<svg') >= 0 || icoStr.indexOf('<img') >= 0) {
        ico.innerHTML = icoStr;
        var _gimg = ico.querySelector('img');
        if (_gimg) _gimg.style.cssText = 'width:38px;height:38px;object-fit:contain;';
      } else {
        ico.textContent = icoStr;
      }
      ico.style.cssText = 'font-size:calc(20px * var(--v-font-scale, 1));';
      card.appendChild(ico);

      var txt = _gldEl('div', 'svc-text');
      txt.appendChild(_gldEl('div', 'svc-name', svc.label || ''));
      if (svc.desc) txt.appendChild(_gldEl('div', 'svc-meta', svc.desc));
      card.appendChild(txt);

      if (svc.badge) {
        var badge = _gldEl('div', 'svc-badge', svc.badge);
        card.appendChild(badge);
      }

      if (svc.cb && !svc.disabled) {
        card.addEventListener('click', function() {
          if (typeof doAction === 'function') doAction(svc.cb);
          else if (typeof vCity !== 'undefined' && typeof vCity.act === 'function') vCity.act(svc.cb);
        });
      }
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  /* === 2g. Recruit info (extras) === */
  if (data.recruit_available && data.recruit_available > 0) {
    var rec = _gldEl('div', 'gld-recruit-info');
    rec.style.cssText = 'text-align:center;padding:6px;color:#c4953a;font-size:calc(11px * var(--v-font-scale, 1));font-style:italic;';
    rec.textContent = data.recruit_available + ' aventureiro(s) disponível(eis) hoje';
    body.appendChild(rec);
  }

  root.appendChild(body);
  container.appendChild(root);
}

/* ============================================================
 * ADVENTURER DETAIL — V1 Retrato principal (2026-04-11)
 * Shows full NPC sheet with cenario scene, stats grid, HP/MP bars,
 * spells list, lore, and hire CTA. Uses DOM methods only, no
 * innerHTML. Money always via .vi.vi-coin.
 * ============================================================ */
function _gldClassSlug(cls) {
  if (!cls) return 'generic';
  var map = {
    'Guerreiro': 'guerreiro', 'Ladrão': 'ladrao', 'Ladino': 'ladrao',
    'Mago': 'mago', 'Clérigo': 'clerigo', 'Clerigo': 'clerigo',
    'Bárbaro': 'barbaro', 'Ranger': 'ranger', 'Feiticeiro': 'feiticeiro',
    'Bruxo': 'bruxo', 'Paladino': 'paladino', 'Monge': 'monge',
    'Bardo': 'bardo', 'Druida': 'druida'
  };
  return map[cls] || 'generic';
}

/* #71e PADRAO_LOCAIS: brasão heráldico da CLASSE (regra: nunca emoji de pessoa).
   Aceita nome PT-BR (com/sem acento) ou já-key. Retorna SVG <use href="#ic-*">
   reaproveitando os <symbol id="ic-*"> injetados em cidade/index.html + combate.html.
   Fallback gracioso: data.class_icon do backend, depois vazio (sem emoji). */
function _gldClassIcoId(cls) {
  if (!cls) return null;
  var s = String(cls).toLowerCase().trim();
  var map = {
    'guerreiro': 'ic-guerreiro', 'fighter': 'ic-guerreiro', 'class_warrior': 'ic-guerreiro',
    'ladino': 'ic-ladino', 'ladrão': 'ic-ladino', 'ladrao': 'ic-ladino', 'rogue': 'ic-ladino', 'class_rogue': 'ic-ladino',
    'mago': 'ic-mago', 'wizard': 'ic-mago', 'class_mage': 'ic-mago',
    'clérigo': 'ic-clerigo', 'clerigo': 'ic-clerigo', 'clériga': 'ic-clerigo', 'cleric': 'ic-clerigo', 'class_cleric': 'ic-clerigo',
    'bárbaro': 'ic-barbaro', 'barbaro': 'ic-barbaro', 'barbarian': 'ic-barbaro',
    'patrulheiro': 'ic-patrulheiro', 'patrulheira': 'ic-patrulheiro', 'ranger': 'ic-patrulheiro', 'class_ranger': 'ic-patrulheiro',
    'feiticeiro': 'ic-feiticeiro', 'feiticeira': 'ic-feiticeiro', 'sorcerer': 'ic-feiticeiro', 'class_sorcerer': 'ic-feiticeiro',
    'bruxo': 'ic-bruxo', 'warlock': 'ic-bruxo',
    'paladino': 'ic-paladino', 'paladina': 'ic-paladino', 'paladin': 'ic-paladino',
    'monge': 'ic-monge', 'monk': 'ic-monge',
    'bardo': 'ic-bardo', 'bard': 'ic-bardo',
    'druida': 'ic-druida', 'druid': 'ic-druida'
  };
  return map[s] || null;
}

/* Cores heráldicas por classe (espelha HERALDIC_COLORS de cidade/index.html). */
var _GLD_CLASS_COLOR = {
  'ic-barbaro': '#a02020', 'ic-bardo': '#9050a0', 'ic-bruxo': '#5a2a78',
  'ic-clerigo': '#e8d878', 'ic-druida': '#3a8a3a', 'ic-feiticeiro': '#c43020',
  'ic-guerreiro': '#a0a0a8', 'ic-ladino': '#5a5a60', 'ic-mago': '#4878c8',
  'ic-monge': '#c08040', 'ic-paladino': '#e0d090', 'ic-patrulheiro': '#5a8a5a'
};

/* HTML do brasão heráldico da classe; size em px. Fallback p/ fallbackIcon. */
function _gldClassCrest(cls, size, fallbackIcon) {
  var id = _gldClassIcoId(cls);
  if (id) {
    var color = _GLD_CLASS_COLOR[id] || 'var(--v-gold,#c4953a)';
    var sz = (size || 34);
    return '<svg viewBox="0 0 120 120" style="width:' + sz + 'px;height:' + sz + 'px;color:' + color + ';display:block;" aria-hidden="true"><use href="#' + id + '"/></svg>';
  }
  return fallbackIcon || '';
}

function renderGuildAdventurer(container, data) {
  if (!container || !data) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = _gldEl('div', 'gld-adv-v1');

  /* Cena principal: brasão heráldico da classe (left) + bloco de texto (right).
     #71e: avatar = brasão heráldico (SVG hardcoded, sem input do jogador) —
     regra Heraldic Icons Only (nunca emoji de pessoa). Fallback gracioso. */
  var cenario = _gldEl('div', 'gld-adv-cenario');
  var av = _gldEl('div', 'gld-adv-avatar gld-adv-crest ' + _gldClassSlug(data.class_name),
                  _gldClassCrest(data.class_name, 40, data.class_icon || ''));
  cenario.appendChild(av);
  var cenarioTexto = _gldEl('div', 'gld-adv-cenario-texto');
  cenarioTexto.appendChild(_gldEl('div', 'gld-adv-name', data.name || ''));
  cenarioTexto.appendChild(_gldEl('div', 'gld-adv-cls', '✧ ' + (data.class_name || '') + ' ✧'));
  var chips = _gldEl('div', 'gld-adv-chips');
  chips.appendChild(_gldEl('span', 'gld-adv-chip', 'Nv. ' + (data.level || 1)));
  if (data.race) chips.appendChild(_gldEl('span', 'gld-adv-chip', data.race));
  if (data.role_tag) chips.appendChild(_gldEl('span', 'gld-adv-chip', data.role_tag));
  cenarioTexto.appendChild(chips);
  cenario.appendChild(cenarioTexto);
  root.appendChild(cenario);

  /* Content body */
  var body = _gldEl('div', 'gld-adv-content');

  /* Attributes grid 3x2 */
  body.appendChild(_gldEl('div', 'gld-adv-section-title', 'Atributos'));
  var statsGrid = _gldEl('div', 'gld-adv-stats-grid');
  (data.attrs || []).forEach(function (a) {
    var stat = _gldEl('div', 'gld-adv-stat');
    stat.appendChild(_gldEl('div', 'gld-adv-stat-name', a.name));
    stat.appendChild(_gldEl('div', 'gld-adv-stat-val', String(a.val)));
    var modText = (a.mod >= 0 ? '+' : '') + a.mod;
    stat.appendChild(_gldEl('div', 'gld-adv-stat-mod', modText));
    statsGrid.appendChild(stat);
  });
  body.appendChild(statsGrid);

  /* HP/MP bars */
  var bars = _gldEl('div', 'gld-adv-bars');
  var hpMax = data.max_hp || 0;
  var mpMax = data.max_mp || 0;
  var hpRow = _gldEl('div', 'gld-adv-bar-row');
  hpRow.appendChild(_gldEl('span', 'gld-adv-bar-lbl', 'HP'));
  var hpTrack = _gldEl('div', 'gld-adv-bar-track');
  var hpFill = _gldEl('div', 'gld-adv-bar-fill hp');
  hpFill.style.width = '100%';
  hpTrack.appendChild(hpFill);
  hpRow.appendChild(hpTrack);
  hpRow.appendChild(_gldEl('span', 'gld-adv-bar-val', hpMax + ' / ' + hpMax));
  bars.appendChild(hpRow);

  if (mpMax > 0) {
    var mpRow = _gldEl('div', 'gld-adv-bar-row');
    mpRow.appendChild(_gldEl('span', 'gld-adv-bar-lbl', 'MP'));
    var mpTrack = _gldEl('div', 'gld-adv-bar-track');
    var mpFill = _gldEl('div', 'gld-adv-bar-fill mp');
    mpFill.style.width = '100%';
    mpTrack.appendChild(mpFill);
    mpRow.appendChild(mpTrack);
    mpRow.appendChild(_gldEl('span', 'gld-adv-bar-val', mpMax + ' / ' + mpMax));
    bars.appendChild(mpRow);
  }
  body.appendChild(bars);

  /* Spells list */
  if (data.spells && data.spells.length > 0) {
    body.appendChild(_gldEl('div', 'gld-adv-section-title', 'Magias Conhecidas'));
    var spellList = _gldEl('div', 'gld-adv-spells');
    data.spells.forEach(function (s) {
      var spell = _gldEl('div', 'gld-adv-spell');
      spell.appendChild(_gldEl('span', 'gld-adv-spell-ic', '◆'));
      spell.appendChild(_gldEl('span', 'gld-adv-spell-name', s));
      spellList.appendChild(spell);
    });
    body.appendChild(spellList);
  }

  /* Lore */
  if (data.lore) {
    body.appendChild(_gldEl('div', 'gld-adv-section-title', 'História'));
    body.appendChild(_gldEl('div', 'gld-adv-lore', '"' + data.lore + '"'));
  }

  root.appendChild(body);

  /* CTA */
  var cta = _gldEl('div', 'gld-adv-cta');
  var priceRow = _gldEl('div', 'gld-adv-price-row');
  priceRow.appendChild(_gldEl('span', 'gld-adv-price-lbl', 'Custo de Contratação'));
  var priceVal = _gldEl('span', 'gld-adv-price-val');
  priceVal.appendChild(_gldEl('span', 'vi vi-coin lg'));
  priceVal.appendChild(document.createTextNode(' ' + (data.cost || 0)));
  priceRow.appendChild(priceVal);
  cta.appendChild(priceRow);

  var btn = _gldEl('button', 'gld-adv-btn');
  if (data.party_full) {
    btn.textContent = 'Grupo Completo (3/3)';
    btn.disabled = true;
    btn.classList.add('disabled');
  } else if (!data.can_afford) {
    btn.textContent = 'Valdoritas Insuficientes';
    btn.disabled = true;
    btn.classList.add('disabled');
  } else {
    btn.textContent = '◆ Contratar ' + (data.name || '').split(' ')[0];
    btn.addEventListener('click', function () {
      if (typeof doAction === 'function' && data.confirm_cb) doAction(data.confirm_cb);
    });
  }
  cta.appendChild(btn);
  root.appendChild(cta);

  container.appendChild(root);
}

/* ============================================================
 * HIRE CONFIRM — V2 Quick Confirm (2026-04-11)
 * Minimal modal focused on the decision with before/after balance.
 * ============================================================ */
function renderGuildHireConfirm(container, data) {
  if (!container || !data) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = _gldEl('div', 'gld-confirm-v2');
  var card = _gldEl('div', 'gld-confirm-card');

  /* #71e: brasão heráldico da classe (SVG hardcoded) — nunca emoji. */
  var iconEl = _gldEl('div', 'gld-confirm-icon gld-adv-crest',
                      _gldClassCrest(data.class_name, 34, data.class_icon || ''));
  card.appendChild(iconEl);

  card.appendChild(_gldEl('div', 'gld-confirm-q', 'Contratar?'));

  var tgtEl = _gldEl('div', 'gld-confirm-target');
  tgtEl.appendChild(document.createTextNode('Você deseja contratar '));
  var nameB = _gldEl('b', null, data.name || '');
  tgtEl.appendChild(nameB);
  tgtEl.appendChild(document.createTextNode(
    ', ' + (data.class_name || '') + ' ' + (data.race || '') + ' de Nível ' + (data.level || 1) + '?'
  ));
  card.appendChild(tgtEl);

  var balance = _gldEl('div', 'gld-confirm-balance');
  function _mkRow(lbl, val, cls) {
    var row = _gldEl('div', 'gld-confirm-row');
    row.appendChild(_gldEl('span', 'gld-confirm-row-lbl', lbl));
    var vEl = _gldEl('span', 'gld-confirm-row-val' + (cls ? ' ' + cls : ''));
    if (typeof val === 'function') { val(vEl); } else { vEl.textContent = val; }
    row.appendChild(vEl);
    return row;
  }
  balance.appendChild(_mkRow('Saldo atual', function (el) {
    el.appendChild(_gldEl('span', 'vi vi-coin sm'));
    el.appendChild(document.createTextNode(' ' + (data.player_gold || 0)));
  }));
  balance.appendChild(_mkRow('Custo', function (el) {
    el.appendChild(document.createTextNode('− '));
    el.appendChild(_gldEl('span', 'vi vi-coin sm'));
    el.appendChild(document.createTextNode(' ' + (data.cost || 0)));
  }, 'cost'));
  balance.appendChild(_gldEl('div', 'gld-confirm-divider'));
  balance.appendChild(_mkRow('Após contratar', function (el) {
    el.appendChild(_gldEl('span', 'vi vi-coin sm'));
    el.appendChild(document.createTextNode(' ' + (data.after_gold || 0)));
  }, 'after'));
  card.appendChild(balance);

  var btns = _gldEl('div', 'gld-confirm-btns');
  var btnNo = _gldEl('button', 'gld-confirm-btn gld-confirm-btn-no', 'Cancelar');
  btnNo.addEventListener('click', function () {
    if (typeof doAction === 'function' && data.cancel_cb) doAction(data.cancel_cb);
  });
  var btnYes = _gldEl('button', 'gld-confirm-btn gld-confirm-btn-yes', 'Confirmar');
  btnYes.addEventListener('click', function () {
    if (typeof doAction === 'function' && data.hire_cb) doAction(data.hire_cb);
  });
  btns.appendChild(btnNo);
  btns.appendChild(btnYes);
  card.appendChild(btns);

  root.appendChild(card);
  container.appendChild(root);
}

/* ============================================================
 * HIRE SUCCESS — V2 NPC Welcome (2026-04-11)
 * Celebratory scene with Sia waving, speech bubble, transaction
 * summary, and two dialogue choices.
 * ============================================================ */
function renderGuildHireSuccess(container, data) {
  if (!container || !data) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = _gldEl('div', 'gld-success-v2');

  /* Scene: confetti + brasão heráldico da classe (horizontal compact layout).
     #71e: avatar = brasão heráldico (nunca emoji de pessoa). Removido o aceno
     (emote de pessoa — regra No NPC Emotes); selo dourado ◆ no lugar. */
  var scene = _gldEl('div', 'gld-success-scene');
  scene.appendChild(_gldEl('div', 'gld-success-confetti'));
  var avWrap = _gldEl('div', 'gld-success-av-wrap');
  var av = _gldEl('div', 'gld-success-avatar gld-adv-crest ' + _gldClassSlug(data.class_name),
                  _gldClassCrest(data.class_name, 34, data.class_icon || ''));
  avWrap.appendChild(av);
  avWrap.appendChild(_gldEl('span', 'gld-success-seal', '◆'));
  scene.appendChild(avWrap);
  var headerText = _gldEl('div', 'gld-success-header-text');
  headerText.appendChild(_gldEl('div', 'gld-success-title', '✓ Novo Aliado'));
  headerText.appendChild(_gldEl('div', 'gld-success-name', data.name || ''));
  headerText.appendChild(_gldEl('div', 'gld-success-sub', (data.class_name || '') + ' • ' + (data.race || '') + ' • Nv ' + (data.level || 1)));
  scene.appendChild(headerText);
  root.appendChild(scene);

  /* Content */
  var content = _gldEl('div', 'gld-success-content');

  /* Speech bubble with player_name bold */
  var speech = _gldEl('div', 'gld-success-speech');
  var speechText = _gldEl('div', 'gld-success-speech-text');
  var quote = data.welcome_quote || '';
  /* Inject bold player name if present in quote */
  var playerName = data.player_name || '';
  if (playerName && quote.indexOf(playerName) !== -1) {
    var parts = quote.split(playerName);
    speechText.appendChild(document.createTextNode(parts[0]));
    var b = _gldEl('b', null, playerName);
    speechText.appendChild(b);
    for (var i = 1; i < parts.length; i++) {
      speechText.appendChild(document.createTextNode(parts[i]));
    }
  } else {
    speechText.textContent = quote;
  }
  speech.appendChild(speechText);
  content.appendChild(speech);

  /* Transaction summary */
  var tx = _gldEl('div', 'gld-success-tx');
  tx.appendChild(_gldEl('div', 'gld-success-tx-hd', 'Resumo da Contratação'));

  function _sucRow(lbl, valBuilder, cls) {
    var row = _gldEl('div', 'gld-success-tx-row');
    row.appendChild(_gldEl('span', 'gld-success-tx-lbl', lbl));
    var vEl = _gldEl('span', 'gld-success-tx-val' + (cls ? ' ' + cls : ''));
    valBuilder(vEl);
    row.appendChild(vEl);
    return row;
  }
  tx.appendChild(_sucRow('Aliado contratado', function (el) {
    el.textContent = data.name || '';
  }));
  tx.appendChild(_sucRow('Custo', function (el) {
    el.appendChild(document.createTextNode('− '));
    el.appendChild(_gldEl('span', 'vi vi-coin sm'));
    el.appendChild(document.createTextNode(' ' + (data.cost || 0)));
  }, 'loss'));
  tx.appendChild(_sucRow('Saldo atual', function (el) {
    el.appendChild(_gldEl('span', 'vi vi-coin sm'));
    el.appendChild(document.createTextNode(' ' + (data.player_gold_after || 0)));
  }));
  tx.appendChild(_sucRow('Grupo', function (el) {
    el.textContent = (data.party_count || 0) + ' / ' + (data.party_max || 3);
  }));
  content.appendChild(tx);

  /* Dialogue choices */
  var choices = _gldEl('div', 'gld-success-choices');
  var continueBtn = _gldEl('button', 'gld-success-choice');
  continueBtn.textContent = data.party_count < data.party_max
    ? 'Continuar no quadro de aventureiros'
    : 'Ver meu grupo';
  continueBtn.addEventListener('click', function () {
    if (typeof doAction === 'function' && data.continue_cb) doAction(data.continue_cb);
  });
  choices.appendChild(continueBtn);

  var closeBtn = _gldEl('button', 'gld-success-choice');
  closeBtn.textContent = 'Voltar à Guilda';
  closeBtn.addEventListener('click', function () {
    if (typeof doAction === 'function' && data.close_cb) doAction(data.close_cb);
  });
  choices.appendChild(closeBtn);

  content.appendChild(choices);
  root.appendChild(content);
  container.appendChild(root);
}

/* ============================================================
 * RECRUIT LIST — V1 épico (2026-06-03, #71e)
 * Lista de recrutas em PADRAO_LOCAIS: cenário (banner+crest) + intro da
 * Tavira (PADRAO_ALDRIC) + grid de cards .svc, cada um com o BRASÃO HERÁLDICO
 * da classe do recruta (nunca emoji), nome, "Classe · Nv N · função" e badge
 * de custo (Valdoritas via .vi.vi-coin). Clicar abre o detalhe (cb do backend
 * via doAction) — server-driven, zero dado fabricado no cliente.
 *
 * data = {
 *   banner?, crest?, title?, subtitle?, intro? (fala da Tavira),
 *   section_label?, party_count?, party_max?,
 *   recruits: [{ name, class_name, level, race?, role_tag?, cost,
 *                class_icon?, cb (abre detalhe), disabled?, badge? }],
 *   empty_text?
 * }
 * ============================================================ */
function renderGuildRecruitList(container, data) {
  if (!container || !data) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = _gldEl('div', 'gld-recruit-list');

  /* === Cenário (banner + crest + título) — reusa .cenario do PADRAO_TAVERNA === */
  var cenarioEl = _gldEl('div', 'cenario');
  var bg = _gldEl('img', 'cenario-bg');
  bg.src = data.banner || '../shared/img/guilda/guilda-banner.webp';
  bg.alt = '';
  bg.loading = 'lazy';
  bg.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(bg);
  cenarioEl.appendChild(_gldEl('div', 'candle-glow l'));
  cenarioEl.appendChild(_gldEl('div', 'candle-glow r'));
  var crest = _gldEl('img', 'cenario-brasao');
  crest.src = data.crest || '../shared/img/guilda/guilda-crest.webp';
  crest.alt = 'Brasão da Guilda';
  crest.loading = 'lazy';
  crest.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(crest);
  var titulo = _gldEl('div', 'cenario-titulo');
  titulo.appendChild(_gldEl('div', 'name', data.title || 'Recrutar Aliados'));
  titulo.appendChild(_gldEl('div', 'sub', data.subtitle || 'Salão de Mestra Tavira'));
  cenarioEl.appendChild(titulo);
  root.appendChild(cenarioEl);

  /* === Body === */
  var body = _gldEl('div', 'gld-body');
  body.style.cssText = 'padding:8px 12px 0;display:flex;flex-direction:column;gap:7px;';

  /* Intro da Tavira (PADRAO_ALDRIC) — pergaminho com aspas. */
  if (data.intro) {
    var intro = _gldEl('div', 'gld-recruit-intro', data.intro);
    body.appendChild(intro);
  }

  /* Section label ornamentada. */
  var sectionLbl = _gldEl('div', 'pt-section-label', data.section_label || 'Aventureiros à disposição');
  body.appendChild(sectionLbl);

  var recruits = data.recruits || [];
  if (!recruits.length) {
    var empty = _gldEl('div', 'gld-recruit-empty', data.empty_text
      || 'Nenhum aventureiro disponível por ora. A lista se renova em algumas horas.');
    body.appendChild(empty);
  } else {
    var grid = _gldEl('div', 'services');
    recruits.forEach(function(r) {
      var card = _gldEl('div', 'svc gld-recruit-card');
      if (r.disabled) card.classList.add('disabled');
      card.setAttribute('data-cb', r.cb || '');

      /* Brasão heráldico da classe (nunca emoji). Fallback gracioso. */
      var ico = _gldEl('div', 'svc-ico gld-recruit-ico',
                       _gldClassCrest(r.class_name, 30, r.class_icon || ''));
      card.appendChild(ico);

      var txt = _gldEl('div', 'svc-text');
      txt.appendChild(_gldEl('div', 'svc-name', r.name || ''));
      var metaParts = [];
      if (r.class_name) metaParts.push(r.class_name);
      if (r.level != null) metaParts.push('Nv ' + r.level);
      if (r.role_tag) metaParts.push(r.role_tag);
      txt.appendChild(_gldEl('div', 'svc-meta', metaParts.join(' · ')));
      card.appendChild(txt);

      /* Badge de custo com moeda canonical (.vi.vi-coin). */
      var badgeEl = _gldEl('div', 'svc-badge gld-recruit-cost');
      if (r.badge) {
        badgeEl.textContent = r.badge;
      } else {
        badgeEl.appendChild(_gldEl('span', 'vi vi-coin sm'));
        badgeEl.appendChild(document.createTextNode(' ' + (r.cost != null ? r.cost : '?')));
      }
      card.appendChild(badgeEl);

      if (r.cb && !r.disabled) {
        card.addEventListener('click', function() {
          if (typeof doAction === 'function') doAction(r.cb);
          else if (typeof vCity !== 'undefined' && typeof vCity.act === 'function') vCity.act(r.cb);
        });
      }
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  /* Rodapé: vagas no grupo. */
  if (data.party_max != null) {
    var foot = _gldEl('div', 'gld-recruit-foot');
    var pc = data.party_count || 0, pm = data.party_max;
    var vagas = Math.max(0, pm - pc);
    foot.textContent = vagas > 0
      ? (vagas + ' vaga' + (vagas !== 1 ? 's' : '') + ' no grupo (' + pc + '/' + pm + ')')
      : ('Grupo completo — ' + pc + '/' + pm);
    body.appendChild(foot);
  }

  root.appendChild(body);
  container.appendChild(root);
}

/* task #75: expose public API. Privadas: TAVIRA_DIALOGUE, _gldEl, _gldSpeech, _gldClassSlug. */
window.renderGuildHub = renderGuildHub;
window.renderGuildAdventurer = renderGuildAdventurer;
window.renderGuildHireConfirm = renderGuildHireConfirm;
window.renderGuildHireSuccess = renderGuildHireSuccess;
window.renderGuildRecruitList = renderGuildRecruitList;

})(); /* end IIFE task #75 */
