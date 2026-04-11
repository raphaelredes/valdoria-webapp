/* game-guild.js — Guild popup renderer
 *
 * V4 NPC Dialog redesign (2026-04-11):
 * Hero NPC scene (Tavira, a Mestra) with speech bubble + dialogue
 * choices. Uses createElement/textContent only (no innerHTML) to
 * avoid XSS vectors with user-controlled quest names.
 *
 * Uses the Valdoria coin icon (.vi.vi-coin) for gold display —
 * NEVER the money-bag emoji.
 */
'use strict';

function _gldEl(tag, cls, text) {
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
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

function renderGuildHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-GUILD] renderGuildHub party=' + (data.party_count || 0) + '/' + (data.party_max || 3) + ' services=' + (data.services ? data.services.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = _gldEl('div', 'gld-hub gld-hub-v4');

  /* ===== SCENE: NPC portrait + name ===== */
  var scene = _gldEl('div', 'gld-scene');
  scene.appendChild(_gldEl('div', 'gld-scene-banner', '✦ Salão dos Aventureiros ✦'));
  var npcAv = _gldEl('div', 'gld-npc-avatar');
  npcAv.textContent = '🧙‍♀️';
  scene.appendChild(npcAv);
  scene.appendChild(_gldEl('div', 'gld-npc-name', 'Tavira, a Mestra'));
  scene.appendChild(_gldEl('div', 'gld-npc-title', 'Guardiã da Guilda'));
  root.appendChild(scene);

  /* ===== DIALOGUE AREA ===== */
  var dlg = _gldEl('div', 'gld-dlg');

  /* Speech bubble */
  var speech = _gldEl('div', 'gld-dlg-speech');
  var speechText = _gldEl('div', 'gld-dlg-text');
  var speechContent = _gldSpeech(
    data.party_count || 0,
    data.party_max || 3,
    data.recruit_available || 0,
    data.rotation_hours || 12
  );
  speechText.textContent = speechContent;
  speech.appendChild(speechText);
  dlg.appendChild(speech);

  /* Show fallen ally warning if any */
  if (data.fallen_count > 0) {
    var fallenBox = _gldEl('div', 'gld-fallen-warn');
    fallenBox.textContent = '⚠ ' + data.fallen_count + ' aliado(s) caído(s) em teu grupo';
    dlg.appendChild(fallenBox);
  }

  /* Dialogue choices (from services list) */
  var choices = _gldEl('div', 'gld-choices');
  if (data.services && data.services.length) {
    data.services.forEach(function (svc) {
      var choice = _gldEl('button', 'gld-choice');
      choice.setAttribute('data-cb', svc.cb || '');
      choice.addEventListener('click', function () {
        if (typeof doAction === 'function' && svc.cb) doAction(svc.cb);
      });
      choice.appendChild(_gldEl('span', 'gld-choice-ic', svc.icon || '▸'));
      var txt = _gldEl('div', 'gld-choice-text');
      txt.appendChild(_gldEl('div', 'gld-choice-lbl', svc.label || ''));
      if (svc.desc) txt.appendChild(_gldEl('div', 'gld-choice-desc', svc.desc));
      choice.appendChild(txt);
      if (svc.badge) {
        var badge = _gldEl('span', 'gld-choice-badge', svc.badge);
        choice.appendChild(badge);
      }
      choices.appendChild(choice);
    });
  }
  dlg.appendChild(choices);
  root.appendChild(dlg);

  /* ===== STATUS BAR (bottom): Party / Gold / Rotation ===== */
  var statusBar = _gldEl('div', 'gld-status-bar');

  var statusParty = _gldEl('div', 'gld-status-item');
  statusParty.appendChild(_gldEl('div', 'gld-status-lbl', 'Grupo'));
  statusParty.appendChild(_gldEl('div', 'gld-status-val', (data.party_count || 0) + ' / ' + (data.party_max || 3)));
  statusBar.appendChild(statusParty);

  var statusGold = _gldEl('div', 'gld-status-item');
  statusGold.appendChild(_gldEl('div', 'gld-status-lbl', 'Valdoritas'));
  var goldVal = _gldEl('div', 'gld-status-val gld-status-gold');
  /* V-coin icon + number (NEVER money-bag emoji) */
  var coin = _gldEl('span', 'vi vi-coin sm');
  goldVal.appendChild(coin);
  goldVal.appendChild(document.createTextNode(' ' + (data.gold || 0)));
  statusGold.appendChild(goldVal);
  statusBar.appendChild(statusGold);

  if (data.rotation_hours != null) {
    var statusRot = _gldEl('div', 'gld-status-item');
    statusRot.appendChild(_gldEl('div', 'gld-status-lbl', 'Rotação'));
    statusRot.appendChild(_gldEl('div', 'gld-status-val', data.rotation_hours + 'h'));
    statusBar.appendChild(statusRot);
  }

  root.appendChild(statusBar);

  container.appendChild(root);
}
