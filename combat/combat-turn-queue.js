/* combat-turn-queue.js — Turn queue rendering */
/* global escHtml */

/**
 * Render the turn queue bar.
 * @param {Array} turnOrder - [{t:'p'|'e'|'a', n:string, ico:string, dead:bool}]
 * @param {number} activeIdx - Index of the active turn in turnOrder
 * @returns {string} HTML string
 */
function renderTurnQueue(turnOrder, activeIdx) {
  if (!turnOrder || !turnOrder.length) return '';
  var html = '';
  for (var i = 0; i < turnOrder.length; i++) {
    var e = turnOrder[i];
    var typeClass = e.t === 'e' ? ' t-enemy' : e.t === 'a' ? ' t-ally' : '';
    var activeClass = i === activeIdx ? ' active' : '';
    var deadClass = e.dead ? ' dead' : '';
    var name = (e.n || '?').substring(0, 5);
    if (i > 0) html += '<span class="tq-sep">\u203A</span>';
    html += '<div class="tq-entry' + typeClass + activeClass + deadClass + '">'
      + '<div class="tq-ico-wrap">' + (e.ico || '?') + '</div>'
      + '<div class="tq-name">' + escHtml(name) + '</div>'
      + '</div>';
  }
  return '<div class="turn-queue">' + html + '</div>';
}

/**
 * Auto-scroll turn queue to center the active entry.
 * Called after renderTurnQueue HTML is inserted into DOM.
 */
function scrollTurnQueueToActive() {
  var queue = document.querySelector('.turn-queue');
  var active = queue && queue.querySelector('.tq-entry.active');
  if (!queue || !active) return;
  var queueW = queue.offsetWidth;
  var activeLeft = active.offsetLeft;
  var activeW = active.offsetWidth;
  queue.scrollLeft = Math.max(0, activeLeft - (queueW / 2) + (activeW / 2));
}
