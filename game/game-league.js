/* ═══════════════════════════════════════════════════════════════
   Liga dos Aventureiros — Renderer Épico (sessão #22)
   Interceptado por game-popup-unified.js via league_data

   Design:
   - Main view: medalha PNG grande (bronze/silver/gold/platinum/mithral)
                + tier path horizontal (5 tiers conectados)
                + weekly XP card + pending reward CTA
   - Standings view: top 10-15 ranking com PNG da medalha + crown
                     pra top 3 + barra de XP por jogador
   - Claim view: celebração de recompensa coletada

   Medal PNGs em /shared/img/medals/ (já existem):
     bronze, silver (prata), gold (ouro), platinum (platina), mithral (lendaria)

   Safe DOM: tudo via createElement/textContent (XSS safe).
   ═══════════════════════════════════════════════════════════════ */

(function() {

var MEDAL_BASE = '/shared/img/medals/';
var MEDAL_BY_TIER = {
  'bronze':   'bronze.webp',
  'prata':    'silver.webp',
  'ouro':     'gold.webp',
  'platina':  'platinum.webp',
  'lendaria': 'mithral.webp'
};

var TIER_META = {
  'bronze':   { label: 'Bronze',   color: '#cd7f32', order: 0 },
  'prata':    { label: 'Prata',    color: '#c0c0c0', order: 1 },
  'ouro':     { label: 'Ouro',     color: '#ffd700', order: 2 },
  'platina':  { label: 'Platina',  color: '#7eb6c4', order: 3 },
  'lendaria': { label: 'Lendária', color: '#b07cc4', order: 4 }
};

var TIER_ORDER = ['bronze', 'prata', 'ouro', 'platina', 'lendaria'];

// 2026-07-04: medalhas de rank 1-3 restauradas p/ WebP (medals/) — eram emoji.
var _RANK_MEDAL_STYLE = 'width:20px;height:20px;vertical-align:middle;object-fit:contain;';
var RANK_MEDALS = {
  1: '<img src="' + MEDAL_BASE + 'gold.webp" alt="1o" style="' + _RANK_MEDAL_STYLE + '">',
  2: '<img src="' + MEDAL_BASE + 'silver.webp" alt="2o" style="' + _RANK_MEDAL_STYLE + '">',
  3: '<img src="' + MEDAL_BASE + 'bronze.webp" alt="3o" style="' + _RANK_MEDAL_STYLE + '">'
};


/**
 * Main entry point — called by game-popup-unified.js when league_data is present.
 */
window.renderLeagueData = function(el, data) {
  if (!el || !data) return;
  el.innerHTML = '';
  el.classList.add('v-league-screen');

  if (data.view === 'standings') {
    _renderStandingsView(el, data);
  } else if (data.view === 'claim') {
    _renderClaimView(el, data);
  } else {
    _renderMainView(el, data);
  }
};


/**
 * Main view: medalha + tier path + weekly XP + reward CTA.
 */
function _renderMainView(el, data) {
  var tierMeta = TIER_META[data.tier] || TIER_META['bronze'];

  // Banner com medalha gigante
  var banner = document.createElement('div');
  banner.className = 'v-league-banner';
  banner.style.setProperty('--tier-color', tierMeta.color);

  var medalBox = document.createElement('div');
  medalBox.className = 'v-league-medal-box v-zoomable';
  medalBox.style.cursor = 'zoom-in';

  var medalImg = document.createElement('img');
  medalImg.src = MEDAL_BASE + (MEDAL_BY_TIER[data.tier] || 'bronze.webp');
  medalImg.alt = data.tier_name;
  medalImg.className = 'v-league-medal-img';
  medalImg.addEventListener('error', function() {
    medalImg.style.display = 'none';
    var emoji = document.createElement('div');
    emoji.className = 'v-league-medal-emoji';
    emoji.textContent = data.tier_icon || '';
    medalBox.appendChild(emoji);
  });
  medalBox.appendChild(medalImg);
  banner.appendChild(medalBox);

  var tierName = document.createElement('div');
  tierName.className = 'v-league-tier-name';
  tierName.textContent = data.tier_name;
  banner.appendChild(tierName);

  var sub = document.createElement('div');
  sub.className = 'v-league-tier-sub';
  sub.textContent = 'Ordem dos Aventureiros';
  banner.appendChild(sub);

  el.appendChild(banner);

  // Tier path horizontal (5 tiers)
  var path = _buildTierPath(data.tier);
  el.appendChild(path);

  // Weekly XP card
  var xpCard = document.createElement('div');
  xpCard.className = 'v-league-xp-card';
  var xpLabel = document.createElement('div');
  xpLabel.className = 'v-league-xp-label';
  xpLabel.textContent = 'XP da Semana';
  xpCard.appendChild(xpLabel);
  var xpVal = document.createElement('div');
  xpVal.className = 'v-league-xp-val';
  xpVal.textContent = (data.weekly_xp || 0) + ' XP';
  xpCard.appendChild(xpVal);
  el.appendChild(xpCard);

  // Pending reward CTA (if any)
  if (data.pending_reward) {
    var rewardCard = document.createElement('div');
    rewardCard.className = 'v-league-reward-card';

    var rewardTitle = document.createElement('div');
    rewardTitle.className = 'v-league-reward-title';
    rewardTitle.innerHTML = '<b>' + (data.pending_reward.title || 'Recompensa Pendente') + '</b>';
    rewardCard.appendChild(rewardTitle);

    var rewardGold = document.createElement('div');
    rewardGold.className = 'v-league-reward-gold';
    rewardGold.innerHTML = '<b>' + (data.pending_reward.gold || 0) + '</b> Valdoritas';
    rewardCard.appendChild(rewardGold);

    var claimBtn = document.createElement('button');
    claimBtn.className = 'v-league-claim-btn';
    claimBtn.textContent = 'Coletar Recompensa';
    claimBtn.addEventListener('click', function() {
      if (typeof doAction === 'function') doAction('league_claim');
    });
    rewardCard.appendChild(claimBtn);

    el.appendChild(rewardCard);
  }

  // Info: como funciona a liga
  var info = document.createElement('div');
  info.className = 'v-league-info';
  info.innerHTML =
    '<i>Reset semanal. Top 10 promovem, últimos 5 descem. '
    + 'Top 3 recebem ouro e títulos.</i>';
  el.appendChild(info);
}


function _buildTierPath(currentTier) {
  var path = document.createElement('div');
  path.className = 'v-league-path';

  var currOrder = TIER_META[currentTier] ? TIER_META[currentTier].order : 0;

  TIER_ORDER.forEach(function(tierId, idx) {
    var meta = TIER_META[tierId];
    var node = document.createElement('div');
    node.className = 'v-league-path-node';

    if (idx < currOrder) node.classList.add('v-league-path-past');
    else if (idx === currOrder) node.classList.add('v-league-path-current');
    else node.classList.add('v-league-path-future');

    var medalSmall = document.createElement('img');
    medalSmall.src = MEDAL_BASE + (MEDAL_BY_TIER[tierId] || 'bronze.webp');
    medalSmall.alt = meta.label;
    medalSmall.className = 'v-league-path-medal';
    node.appendChild(medalSmall);

    var label = document.createElement('div');
    label.className = 'v-league-path-label';
    label.textContent = meta.label;
    node.appendChild(label);

    path.appendChild(node);

    // Connector entre nodes (exceto último)
    if (idx < TIER_ORDER.length - 1) {
      var conn = document.createElement('div');
      conn.className = 'v-league-path-conn';
      if (idx < currOrder) conn.classList.add('v-league-path-conn-done');
      path.appendChild(conn);
    }
  });

  return path;
}


function _renderStandingsView(el, data) {
  var tierMeta = TIER_META[data.tier] || TIER_META['bronze'];

  // Header
  var header = document.createElement('div');
  header.className = 'v-league-standings-header';
  header.style.setProperty('--tier-color', tierMeta.color);

  var medalSm = document.createElement('img');
  medalSm.src = MEDAL_BASE + (MEDAL_BY_TIER[data.tier] || 'bronze.webp');
  medalSm.alt = data.tier_name;
  medalSm.className = 'v-league-standings-medal';
  header.appendChild(medalSm);

  var titleBox = document.createElement('div');
  var title = document.createElement('div');
  title.className = 'v-league-standings-title';
  title.textContent = data.tier_name;
  titleBox.appendChild(title);
  var subBox = document.createElement('div');
  subBox.className = 'v-league-standings-sub';
  // 2026-05-21: defesa adicional contra rank negativo (mostrava "-6" no UI).
  // Backend já clampou em max(1, ...) mas guard front-end por segurança.
  var safeRank = (data.player_rank && data.player_rank > 0) ? data.player_rank : '—';
  subBox.innerHTML = 'Posição: <b>' + safeRank + '</b> / '
                    + (data.total_players || 0) + ' jogadores';
  titleBox.appendChild(subBox);
  header.appendChild(titleBox);

  el.appendChild(header);

  // List
  var list = document.createElement('div');
  list.className = 'v-league-standings-list';

  var maxXp = 1;
  (data.standings || []).forEach(function(p) {
    if ((p.weekly_xp || 0) > maxXp) maxXp = p.weekly_xp;
  });

  (data.standings || []).forEach(function(p, idx) {
    var row = document.createElement('div');
    var rank = idx + 1;
    row.className = 'v-league-rank-row';
    if (p.user_id === data.player_id) row.classList.add('v-league-rank-self');
    if (rank <= 3) row.classList.add('v-league-rank-top');

    var rankBox = document.createElement('div');
    rankBox.className = 'v-league-rank-num';
    if (RANK_MEDALS[rank]) { rankBox.innerHTML = RANK_MEDALS[rank]; } else { rankBox.textContent = '#' + rank; }
    row.appendChild(rankBox);

    var info = document.createElement('div');
    info.className = 'v-league-rank-info';
    var name = document.createElement('div');
    name.className = 'v-league-rank-name';
    name.textContent = p.name + (p.user_id === data.player_id ? ' (você)' : '');
    info.appendChild(name);
    var meta = document.createElement('div');
    meta.className = 'v-league-rank-meta';
    meta.textContent = (p.class || '') + ' · Nv ' + (p.level || 1);
    info.appendChild(meta);
    row.appendChild(info);

    var xpCol = document.createElement('div');
    xpCol.className = 'v-league-rank-xp';
    var xpNum = document.createElement('div');
    xpNum.className = 'v-league-rank-xp-num';
    xpNum.textContent = (p.weekly_xp || 0) + ' XP';
    xpCol.appendChild(xpNum);
    var xpBar = document.createElement('div');
    xpBar.className = 'v-league-rank-xp-bar';
    var xpFill = document.createElement('div');
    xpFill.className = 'v-league-rank-xp-fill';
    xpFill.style.width = ((p.weekly_xp / maxXp) * 100).toFixed(1) + '%';
    xpBar.appendChild(xpFill);
    xpCol.appendChild(xpBar);
    row.appendChild(xpCol);

    list.appendChild(row);
  });

  if (!(data.standings || []).length) {
    var empty = document.createElement('div');
    empty.className = 'v-league-empty';
    empty.innerHTML = '<i>Nenhum jogador no ranking ainda esta semana.</i>';
    list.appendChild(empty);
  }

  el.appendChild(list);
}


function _renderClaimView(el, data) {
  var card = document.createElement('div');
  card.className = 'v-league-claim-celebration';

  var title = document.createElement('div');
  title.className = 'v-league-claim-title';
  title.innerHTML = '<b>Recompensa Coletada!</b>';
  card.appendChild(title);

  var rankBadge = document.createElement('div');
  rankBadge.className = 'v-league-claim-rank';
  if (RANK_MEDALS[data.rank]) { rankBadge.innerHTML = RANK_MEDALS[data.rank]; } else { rankBadge.textContent = '#' + data.rank; }
  card.appendChild(rankBadge);

  var titleText = document.createElement('div');
  titleText.className = 'v-league-claim-title-text';
  titleText.textContent = '' + (data.title || 'Honrado pelos Aventureiros');
  card.appendChild(titleText);

  var gold = document.createElement('div');
  gold.className = 'v-league-claim-gold';
  gold.innerHTML = '+' + (data.gold || 0) + ' <span>Valdoritas</span>';
  card.appendChild(gold);

  var hint = document.createElement('div');
  hint.className = 'v-league-claim-hint';
  hint.innerHTML = '<i>Você foi homenageado na Ordem dos Aventureiros. '
                  + 'Que sua glória inspire outros bravos.</i>';
  card.appendChild(hint);

  el.appendChild(card);
}


})();
