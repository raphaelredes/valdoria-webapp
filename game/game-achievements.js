/* ═══════════════════════════════════════════════════════════════
   Conquistas — Hall of Fame Épico (sessão #22)
   Interceptado por game-popup-unified.js via achievements_data

   Design:
   - Main view: 6 categorias com banner + PNG mascote + progress
   - Category view: lista épica com PNG por conquista + tier badge
                    + locked/unlocked state + glow dourado
   - Tier indicators: bronze (cobre), prata (silver), ouro (gold)
   - Locked: grayscale + lock icon overlay
   - Unlocked: full color + glow + date

   Heraldic PNGs canonical em /shared/img/achievements/:
     ach-algoz, ach-andarilho, ach-aventureiro, ach-cacador,
     ach-cartografo, ach-cofreiro, ach-colecionador, ach-devoto,
     ach-diplomata, ach-erudito, ach-forjador, ach-indomavel,
     ach-mestre, ach-sobrevivente, trofeu (fallback)

   Safe DOM: tudo via createElement/textContent (XSS safe).
   ═══════════════════════════════════════════════════════════════ */

(function() {

var PNG_BASE = '/shared/img/achievements/';
var FALLBACK_PNG = 'trofeu.webp';

var TIER_META = {
  'bronze': { label: 'Bronze',  color: '#cd7f32', emoji: '' },
  'prata':  { label: 'Prata',   color: '#c0c0c0', emoji: '' },
  'ouro':   { label: 'Ouro',    color: '#ffd700', emoji: '' }
};

var CATEGORY_META = {
  'combate':    { label: 'Combate',    emoji: '', accent: '#c4953a' },
  'exploracao': { label: 'Exploração', emoji: '', accent: '#7dba5b' },
  'social':     { label: 'Social',     emoji: '', accent: '#5b9dba' },
  'economia':   { label: 'Economia',   emoji: '', accent: '#ffb84d' },
  'missoes':    { label: 'Missões',    emoji: '', accent: '#ba5b5b' },
  'progresso':  { label: 'Progresso',  emoji: '', accent: '#b07cc4' }
};


/**
 * Main entry point — called by game-popup-unified.js when achievements_data is present.
 * Routes to main view (categories) or category view (achievements list).
 */
window.renderAchievementsData = function(el, data) {
  if (!el || !data) return;
  el.innerHTML = '';
  el.classList.add('v-ach-screen');

  if (data.view === 'category') {
    _renderCategoryView(el, data);
  } else {
    _renderMainView(el, data);
  }
};


/**
 * Main view: 6 category cards + overall progress badge.
 */
function _renderMainView(el, data) {
  // Header banner com badge total
  var banner = document.createElement('div');
  banner.className = 'v-ach-banner';

  var title = document.createElement('div');
  title.className = 'v-ach-banner-title';
  title.textContent = 'Hall da Fama';
  banner.appendChild(title);

  var sub = document.createElement('div');
  sub.className = 'v-ach-banner-sub';
  sub.innerHTML = '<b>' + (data.unlocked || 0) + '</b> de <b>' + (data.total || 0)
                + '</b> conquistas';
  banner.appendChild(sub);

  // Progress bar geral
  var prog = document.createElement('div');
  prog.className = 'v-ach-progress';
  var fill = document.createElement('div');
  fill.className = 'v-ach-progress-fill';
  var pct = data.total > 0 ? (data.unlocked / data.total) * 100 : 0;
  fill.style.width = pct.toFixed(1) + '%';
  prog.appendChild(fill);
  banner.appendChild(prog);

  el.appendChild(banner);

  // Grid de 6 categorias
  var grid = document.createElement('div');
  grid.className = 'v-ach-cat-grid';

  (data.categories || []).forEach(function(cat) {
    var card = _buildCategoryCard(cat);
    grid.appendChild(card);
  });

  el.appendChild(grid);

  // Hint
  var hint = document.createElement('div');
  hint.className = 'v-ach-hint';
  hint.innerHTML = '<i>Toque em uma categoria para ver as conquistas.</i>';
  el.appendChild(hint);
}


function _buildCategoryCard(cat) {
  var card = document.createElement('button');
  card.className = 'v-ach-cat-card';
  card.setAttribute('data-cat-id', cat.id);
  var meta = CATEGORY_META[cat.id] || { label: cat.name, emoji: cat.icon, accent: '#c4953a' };
  card.style.setProperty('--cat-accent', meta.accent);

  var done = cat.done || 0;
  var total = cat.total || 0;
  var pct = total > 0 ? (done / total) * 100 : 0;

  var emoji = document.createElement('div');
  emoji.className = 'v-ach-cat-emoji';
  emoji.textContent = meta.emoji;
  card.appendChild(emoji);

  var name = document.createElement('div');
  name.className = 'v-ach-cat-name';
  name.textContent = meta.label;
  card.appendChild(name);

  var count = document.createElement('div');
  count.className = 'v-ach-cat-count';
  count.innerHTML = '<b>' + done + '</b> / ' + total;
  card.appendChild(count);

  var bar = document.createElement('div');
  bar.className = 'v-ach-cat-bar';
  var barFill = document.createElement('div');
  barFill.className = 'v-ach-cat-bar-fill';
  barFill.style.width = pct.toFixed(1) + '%';
  barFill.style.background = meta.accent;
  bar.appendChild(barFill);
  card.appendChild(bar);

  if (done === total && total > 0) {
    var crown = document.createElement('div');
    crown.className = 'v-ach-cat-crown';
    crown.textContent = '';
    crown.title = 'Categoria 100%';
    card.appendChild(crown);
  }

  // Click: navigate to category view via doAction
  card.addEventListener('click', function() {
    if (typeof doAction === 'function') {
      doAction('ach_cat_' + cat.id);
    }
  });

  return card;
}


/**
 * Category view: list de achievements épicos com PNG art.
 */
function _renderCategoryView(el, data) {
  var meta = CATEGORY_META[data.category_id] || {
    label: data.category_name, emoji: data.category_icon, accent: '#c4953a'
  };

  // Header banner
  var banner = document.createElement('div');
  banner.className = 'v-ach-cat-banner';
  banner.style.setProperty('--cat-accent', meta.accent);

  var title = document.createElement('div');
  title.className = 'v-ach-cat-banner-title';
  title.innerHTML = meta.emoji + ' <b>' + meta.label + '</b>';
  banner.appendChild(title);

  var sub = document.createElement('div');
  sub.className = 'v-ach-cat-banner-sub';
  var unlocked = (data.achievements || []).filter(function(a) { return a.unlocked; }).length;
  var total = (data.achievements || []).length;
  sub.innerHTML = '<b>' + unlocked + '</b> de <b>' + total + '</b> desbloqueadas';
  banner.appendChild(sub);

  el.appendChild(banner);

  // Lista de conquistas
  var list = document.createElement('div');
  list.className = 'v-ach-list';

  (data.achievements || []).forEach(function(ach) {
    var card = _buildAchievementCard(ach);
    list.appendChild(card);
  });

  el.appendChild(list);
}


function _buildAchievementCard(ach) {
  var card = document.createElement('div');
  card.className = 'v-ach-item ' + (ach.unlocked ? 'v-ach-unlocked' : 'v-ach-locked');
  var tierMeta = TIER_META[ach.tier] || TIER_META['bronze'];
  card.style.setProperty('--tier-color', tierMeta.color);

  // Left: PNG art (or emoji fallback)
  var artBox = document.createElement('div');
  artBox.className = 'v-ach-art';

  if (ach.png) {
    var img = document.createElement('img');
    img.src = PNG_BASE + ach.png;
    img.alt = ach.name;
    img.loading = 'lazy';
    img.addEventListener('error', function() {
      // Fallback: replace with emoji
      img.style.display = 'none';
      var emoji = document.createElement('div');
      emoji.className = 'v-ach-emoji-fallback';
      emoji.textContent = ach.icon || '';
      artBox.appendChild(emoji);
    });
    artBox.appendChild(img);
  } else {
    var emoji = document.createElement('div');
    emoji.className = 'v-ach-emoji-fallback';
    emoji.textContent = ach.icon || '';
    artBox.appendChild(emoji);
  }

  // Lock overlay if locked
  if (!ach.unlocked) {
    var lockOv = document.createElement('div');
    lockOv.className = 'v-ach-lock-overlay';
    lockOv.textContent = '';
    artBox.appendChild(lockOv);
  }

  // Tier badge na arte
  var tierBadge = document.createElement('div');
  tierBadge.className = 'v-ach-tier-badge';
  tierBadge.textContent = tierMeta.emoji;
  tierBadge.title = tierMeta.label;
  artBox.appendChild(tierBadge);

  card.appendChild(artBox);

  // Right: text content
  var body = document.createElement('div');
  body.className = 'v-ach-body';

  var name = document.createElement('div');
  name.className = 'v-ach-name';
  name.textContent = ach.name;
  body.appendChild(name);

  var desc = document.createElement('div');
  desc.className = 'v-ach-desc';
  desc.textContent = ach.desc;
  body.appendChild(desc);

  if (ach.unlocked && ach.unlocked_at) {
    var date = document.createElement('div');
    date.className = 'v-ach-date';
    var d = new Date(ach.unlocked_at * 1000);
    if (!isNaN(d.getTime())) {
      date.textContent = '✓ Desbloqueada em ' + d.toLocaleDateString('pt-BR');
    } else {
      date.textContent = '✓ Desbloqueada';
    }
    body.appendChild(date);
  } else {
    var lockTxt = document.createElement('div');
    lockTxt.className = 'v-ach-locked-txt';
    lockTxt.textContent = 'Bloqueada';
    body.appendChild(lockTxt);
  }

  card.appendChild(body);

  // Lightbox para zoom da arte (se desbloqueada)
  if (ach.unlocked && ach.png) {
    artBox.classList.add('v-zoomable');
    artBox.style.cursor = 'zoom-in';
  }

  return card;
}


})();
