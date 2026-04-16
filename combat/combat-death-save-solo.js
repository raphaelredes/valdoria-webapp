/**
 * Tela dedicada de Testes contra a Morte (PHB) quando não há aliados vivos —
 * substitui a arena para o jogador não ver grade vazia enquanto rola salvaguardas.
 */
function renderDeathSavesFullScreen(s) {
  var app = document.getElementById('app');
  if (!app) return;
  stopTimer();
  var ph = s.ph || s.phase || 'intro';
  var ds = s.ds || { s: 0, f: 0, stab: false };
  var p = s.p || {};
  var pName = escHtml(String(p.n || 'Personagem').substring(0, 28));
  var rn = s.rn || 1;
  var dsHtml = '<div class="ds-tracker ds-fs-tracker">';
  dsHtml += '<div class="ds-row ds-row-success"><span class="ds-row-label" aria-hidden="true">\u2714</span>';
  var si;
  for (si = 0; si < 3; si++) {
    dsHtml += '<div class="ds-dot success-slot' + (si < (ds.s || 0) ? ' filled' : '') + '"></div>';
  }
  dsHtml += '</div><div class="ds-row ds-row-failure"><span class="ds-row-label" aria-hidden="true">\u2718</span>';
  var fi;
  for (fi = 0; fi < 3; fi++) {
    dsHtml += '<div class="ds-dot failure-slot' + (fi < (ds.f || 0) ? ' filled' : '') + '"></div>';
  }
  dsHtml += '</div></div>';
  var stab = ds.stab
    ? '<p class="ds-fs-stable">\u2728 Estabilizado — aguardando socorro ou fim do combate.</p>'
    : '';
  var feedBtn =
    s.feed && s.feed.length
      ? '<button type="button" class="action-btn secondary" id="dsFsLogBtn">\uD83D\uDCDC Log de Batalha</button>'
      : '';
  window._resolutionFeed = s.feed || [];
  window._resolutionFeedDetail = s.fd || [];
  app.classList.remove('fade-in');
  app.innerHTML =
    '<div class="ds-fs-screen" role="region" aria-labelledby="dsFsTitle">' +
    '<p class="ds-fs-kicker">Combate</p>' +
    '<h1 class="ds-fs-title" id="dsFsTitle">Salvaguardas contra a Morte</h1>' +
    '<p class="ds-fs-lead"><b>' +
    pName +
    '</b> est\u00e1 a <b>0 PV</b> e inconsciente. Ningu\u00e9m vivo restou no grupo para curar ou proteger — cada rodada, um teste (d20 \u2265 10) decide se voc\u00ea se mant\u00e9m na luta.</p>' +
    '<div class="ds-fs-round" aria-live="polite">Rodada ' +
    rn +
    '</div>' +
    '<div class="ds-fs-track-wrap">' +
    dsHtml +
    stab +
    '</div>' +
    '<div class="ds-fs-actions">' +
    '<button type="button" class="action-btn primary" data-action="continue_spectator">\u23ED\uFE0F Pr\u00f3ximo round</button>' +
    feedBtn +
    '</div>' +
    '</div>';
  void app.offsetWidth;
  app.classList.add('fade-in');
  if (typeof _updateInitiativeOrderOverlay === 'function') {
    _updateInitiativeOrderOverlay('ended', false);
  }
  document.body.className = document.body.className.replace(/\bbiome-\S+/g, '').trim();
  document.body.classList.add('biome-' + (s.bio || 'forest'));
  bindActions(s);
  if (typeof _ensureDiceOverlay === 'function') _ensureDiceOverlay();
  if (typeof initDice === 'function') initDice(s.lr);
  var logBtn = document.getElementById('dsFsLogBtn');
  if (logBtn && typeof _showBattleLog === 'function') {
    logBtn.addEventListener('click', function () {
      _showBattleLog();
    });
  }
  if (isApiMode) startPolling();
}
