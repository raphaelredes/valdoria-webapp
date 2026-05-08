/**
 * combat-turn-queue.js
 * Turn queue component — Timeline Conectada style.
 * Renders initiative order as connected nodes with lines between them.
 */

/**
 * renderTurnQueue(turnOrder, activeIdx)
 * Returns an HTML string for the .turn-queue timeline strip.
 *
 * @param {Array<{t:string, n:string, ico:string, dead:boolean}>} turnOrder
 * @param {number} activeIdx - index of the currently active entry
 * @returns {string} HTML string
 */
function renderTurnQueue(turnOrder, activeIdx) {
  if (!turnOrder || !turnOrder.length) return '';

  var parts = ['<div class="turn-queue">'];

  /* Round badge at the start */
  if (typeof window._currentRound !== 'undefined') {
    parts.push('<span class="tl-round">R' + window._currentRound + '</span>');
  }

  for (var i = 0; i < turnOrder.length; i++) {
    var entry = turnOrder[i];

    /* Node classes */
    var cls = 'tl-node';
    if (entry.t === 'e') cls += ' t-enemy';
    else if (entry.t === 'a') cls += ' t-ally';
    if (i === activeIdx) cls += ' active';
    if (entry.dead) cls += ' dead';

    /* Icon */
    var ico = escHtml(entry.ico || '?');

    /* Name: truncate to 9 chars */
    var name = escHtml((entry.n || '').substring(0, 9));

    /* HP mini bar (if HP data available) */
    var hpHtml = '';
    if (entry.hp !== undefined && entry.mhp > 0) {
      var hpPct = Math.max(0, Math.min(100, (entry.hp / entry.mhp) * 100));
      var hpCls = hpPct > 60 ? 'tl-hp-high' : hpPct > 25 ? 'tl-hp-mid' : 'tl-hp-low';
      hpHtml = '<div class="tl-hp"><div class="tl-hp-fill ' + hpCls + '" style="width:' + hpPct + '%"></div></div>';
    }

    /* Node HTML */
    parts.push(
      '<div class="' + cls + '">' +
        '<div class="tl-ico">' + ico + '</div>' +
        hpHtml +
        '<div class="tl-nm">' + name + '</div>' +
      '</div>'
    );

    /* Connecting line between nodes (not after last) */
    if (i < turnOrder.length - 1) {
      var lineCls = 'tl-line';
      if (i < activeIdx) lineCls += ' done';
      parts.push('<div class="' + lineCls + '"></div>');
    }
  }

  parts.push('</div>');
  return parts.join('');
}

/**
 * scrollTurnQueueToActive()
 * Centers the active node within the .turn-queue container.
 */
function scrollTurnQueueToActive() {
  var queue = document.querySelector('.turn-queue');
  var active = document.querySelector('.tl-node.active');
  if (!queue || !active) return;

  var queueWidth = queue.offsetWidth;
  var activeLeft = active.offsetLeft;
  var activeWidth = active.offsetWidth;

  queue.scrollLeft = activeLeft - (queueWidth / 2) + (activeWidth / 2);
}
