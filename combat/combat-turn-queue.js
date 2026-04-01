/**
 * combat-turn-queue.js
 * Turn queue component for the combat WebApp.
 * Renders the initiative order strip at the top of the combat screen.
 */

/**
 * renderTurnQueue(turnOrder, activeIdx)
 * Returns an HTML string for the .turn-queue strip.
 *
 * @param {Array<{t:string, n:string, ico:string, dead:boolean}>} turnOrder
 *   - t: 'p' (player), 'e' (enemy), 'a' (ally)
 *   - n: display name
 *   - ico: emoji icon
 *   - dead: boolean
 * @param {number} activeIdx - index of the currently active entry
 * @returns {string} HTML string (empty if turnOrder is empty/null)
 */
function renderTurnQueue(turnOrder, activeIdx) {
  if (!turnOrder || !turnOrder.length) return '';

  var parts = [];
  for (var i = 0; i < turnOrder.length; i++) {
    var entry = turnOrder[i];

    // Build CSS classes
    var classes = 'tq-entry';
    if (entry.t === 'e') classes += ' t-enemy';
    else if (entry.t === 'a') classes += ' t-ally';
    if (i === activeIdx) classes += ' active';
    if (entry.dead) classes += ' dead';

    // Truncate name to 5 chars
    var name = escHtml((entry.n || '').substring(0, 5));
    var ico = escHtml(entry.ico || '?');

    parts.push(
      '<div class="' + classes + '">' +
        '<div class="tq-ico-wrap">' + ico + '</div>' +
        '<div class="tq-name">' + name + '</div>' +
      '</div>'
    );

    // Add separator between entries (not after the last one)
    if (i < turnOrder.length - 1) {
      parts.push('<span class="tq-sep">\u203A</span>');
    }
  }

  return parts.join('');
}

/**
 * scrollTurnQueueToActive()
 * Instantly centers the active .tq-entry within .turn-queue (no smooth scroll).
 */
function scrollTurnQueueToActive() {
  var queue = document.querySelector('.turn-queue');
  var active = document.querySelector('.tq-entry.active');
  if (!queue || !active) return;

  var queueWidth = queue.offsetWidth;
  var activeLeft = active.offsetLeft;
  var activeWidth = active.offsetWidth;

  queue.scrollLeft = activeLeft - (queueWidth / 2) + (activeWidth / 2);
}
