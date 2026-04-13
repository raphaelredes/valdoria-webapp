/**
 * DiaryEngine — reusable page-based diary/travel log engine.
 *
 * Usage:
 *   var diary = new DiaryEngine(pageArea, footerArea, progressFill);
 *   diary.start(events, onComplete);
 *   diary.setChoiceHandler(fn);       // fn(choiceIdx, event)
 *   diary.showChoiceResult(result);   // {icon, text, detail?, xp?, gp?, hp_lost?}
 *   diary.appendEvents(newEvents);    // hybrid batching
 *
 * All DOM via createElement — never innerHTML.
 */
var DiaryEngine = (function () {
  'use strict';

  /* ── constants ── */
  var MAX_PER_PAGE          = 5;
  var SIMPLE_DELAY_COMPACT  = 250;
  var SIMPLE_DELAY_NORMAL   = 450;
  var LOADING_DURATION      = 900;
  var DICE_FORMULA_DELAY    = 600;
  var DICE_RESULT_DELAY     = 300;
  var CHOICE_RESOLVE_DELAY  = 700;
  var PAGE_EXIT_MS          = 250;

  /* ── helpers ── */
  function _el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function _calcReadTime(text) {
    if (!text) return 2000;
    var words = text.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(2000, words * 250);
  }

  /* ── constructor ── */
  function DiaryEngine(pageArea, footerArea, progressFill, opts) {
    this._pageArea     = pageArea;
    this._footerArea   = footerArea;
    this._progressFill = progressFill;
    this._opts         = opts || {};

    this._events       = [];
    this._idx          = 0;
    this._totalXp      = 0;
    this._totalGp      = 0;
    this._totalHp      = 0;
    this._totalEvents  = 0;
    this._running      = false;
    this._onComplete   = null;
    this._onChoice     = null;
  }

  /* ══════════════════════════════════════
   *  PUBLIC API
   * ══════════════════════════════════════ */

  DiaryEngine.prototype.start = function (events, onComplete) {
    console.info('[DIARY] start', events.length, 'events');
    this._events      = events.slice();
    this._idx         = 0;
    this._totalXp     = 0;
    this._totalGp     = 0;
    this._totalHp     = 0;
    this._totalEvents = 0;
    this._running     = true;
    this._onComplete  = onComplete || null;
    this._showSimpleBatch();
  };

  DiaryEngine.prototype.appendEvents = function (newEvents) {
    if (!newEvents || !newEvents.length) return;
    console.info('[DIARY] appendEvents +' + newEvents.length);
    for (var i = 0; i < newEvents.length; i++) {
      this._events.push(newEvents[i]);
    }
  };

  DiaryEngine.prototype.setChoiceHandler = function (fn) {
    this._onChoice = fn;
  };

  DiaryEngine.prototype.showChoiceResult = function (result) {
    console.info('[DIARY] showChoiceResult', result && result.text);
    if (!result) return;
    this._renderChoiceResult(result);
  };

  /* ══════════════════════════════════════
   *  INTERNAL — page flow
   * ══════════════════════════════════════ */

  DiaryEngine.prototype._updateProgress = function () {
    if (!this._progressFill) return;
    var pct = this._events.length ? Math.min(100, (this._idx / this._events.length) * 100) : 0;
    this._progressFill.style.width = pct + '%';
  };

  DiaryEngine.prototype._clearPage = function (cb) {
    var pa = this._pageArea;
    pa.classList.add('diary-page-exit');
    setTimeout(function () {
      while (pa.firstChild) pa.removeChild(pa.firstChild);
      pa.classList.remove('diary-page-exit');
      if (cb) cb();
    }, PAGE_EXIT_MS);
  };

  DiaryEngine.prototype._showSimpleBatch = function () {
    if (!this._running || this._idx >= this._events.length) {
      this._showSummary();
      return;
    }
    var self = this;
    this._clearPage(function () { self._fillBatch(); });
  };

  DiaryEngine.prototype._fillBatch = function () {
    var self  = this;
    var count = 0;

    function next() {
      if (!self._running || self._idx >= self._events.length) {
        self._showFooterNext(function () { self._showSummary(); });
        return;
      }

      var ev = self._events[self._idx];
      self._updateProgress();

      /* ── hazard dice ── */
      if (ev.type === 'hazard_dice') {
        self._showFooterNext(function () { self._showDicePage(ev); });
        return;
      }

      /* ── encounter choice ── */
      if (ev.type === 'encounter_choice') {
        self._showFooterNext(function () { self._showChoicePage(ev); });
        return;
      }

      /* ── loading indicator ── */
      if (ev.type === '_loading') {
        self._idx++;
        var el   = _el('div', 'diary-loading');
        var ldot = _el('div', 'diary-loading-dot');
        var ltxt = _el('div', 'diary-loading-text', ev.text);
        el.appendChild(ldot);
        el.appendChild(ltxt);
        self._pageArea.appendChild(el);
        setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
          next();
        }, LOADING_DURATION);
        return;
      }

      /* ── simple event ── */
      self._trackRewards(ev);
      self._addSimpleEntry(ev);
      self._idx++;
      self._totalEvents++;
      count++;

      if (count >= MAX_PER_PAGE && self._idx < self._events.length && self._events[self._idx].type !== '_loading') {
        self._showFooterNext(function () { self._showSimpleBatch(); });
        return;
      }

      setTimeout(next, ev.compact ? SIMPLE_DELAY_COMPACT : SIMPLE_DELAY_NORMAL);
    }

    next();
  };

  /* ── simple entry row ── */
  DiaryEngine.prototype._addSimpleEntry = function (ev) {
    var entry = _el('div', 'diary-entry' + (ev.compact ? ' diary-entry--compact' : ''));
    var dot   = _el('div', 'diary-dot diary-dot--' + ev.type);
    dot.textContent = ev.icon || '';
    var card  = _el('div', 'diary-card');
    card.appendChild(_el('div', 'diary-card-title', ev.text));
    if (ev.detail) card.appendChild(_el('div', 'diary-card-detail', ev.detail));

    var rewards = this._buildRewardBadges(ev);
    for (var i = 0; i < rewards.length; i++) card.appendChild(rewards[i]);

    entry.appendChild(dot);
    entry.appendChild(card);
    this._pageArea.appendChild(entry);
  };

  DiaryEngine.prototype._buildRewardBadges = function (ev) {
    var out = [];
    if (ev.xp)      out.push(_el('span', 'diary-reward diary-reward--xp', '+' + ev.xp + ' XP'));
    if (ev.gp)      out.push(_el('span', 'diary-reward', '+' + ev.gp + ' Valdoritas'));
    var hpLost = ev.hp_lost || ev.hpLost || 0;
    if (hpLost)     out.push(_el('span', 'diary-reward diary-reward--hp', '-' + hpLost + ' HP'));
    return out;
  };

  DiaryEngine.prototype._trackRewards = function (ev) {
    if (ev.xp)                          this._totalXp += ev.xp;
    if (ev.gp)                          this._totalGp += ev.gp;
    var hpLost = ev.hp_lost || ev.hpLost || 0;
    if (hpLost)                         this._totalHp += hpLost;
  };

  /* ── footer "Prosseguir" ── */
  DiaryEngine.prototype._showFooterNext = function (cb) {
    var fa   = this._footerArea;
    var done = false;
    while (fa.firstChild) fa.removeChild(fa.firstChild);
    var btn = _el('button', 'diary-action-btn', 'Prosseguir \u25B8');
    btn.addEventListener('click', function () {
      if (done) return;          // double-fire guard
      done = true;
      fa.style.display = 'none';
      if (cb) cb();
    });
    fa.appendChild(btn);
    fa.style.display = 'block';
  };

  /* ══════════════════════════════════════
   *  DICE PAGE
   * ══════════════════════════════════════ */

  DiaryEngine.prototype._showDicePage = function (ev) {
    this._idx++;
    this._totalEvents++;
    var self = this;

    this._clearPage(function () {
      var page = _el('div', 'diary-dice-page');

      /* narration */
      page.appendChild(_el('div', 'diary-dice-narration', ev.narration));

      /* formula (delayed via CSS animation) */
      page.appendChild(_el('div', 'diary-dice-formula', ev.formula));

      /* canvas */
      var cw     = _el('div', 'diary-dice-canvas-wrap');
      var canvas = document.createElement('canvas');
      canvas.className = 'diary-dice-canvas';
      canvas.width  = 120;
      canvas.height = 120;
      cw.appendChild(canvas);
      page.appendChild(cw);

      /* placeholders */
      var resultEl = _el('div', 'diary-dice-result');
      resultEl.style.opacity = '0';
      page.appendChild(resultEl);

      var resolEl = _el('div', 'diary-dice-resolution');
      resolEl.style.opacity = '0';
      page.appendChild(resolEl);

      self._pageArea.appendChild(page);
      self._updateProgress();

      var rollValue = ev.roll;
      var total     = ev.roll + (ev.mod || 0);
      var isSuccess = total >= ev.dc;

      setTimeout(function () {
        self._rollDice3D(canvas, rollValue, function () {
          self._showDiceResult(resultEl, resolEl, ev, isSuccess, total);
        });
      }, DICE_FORMULA_DELAY);
    });
  };

  DiaryEngine.prototype._rollDice3D = function (canvas, value, onDone) {
    /* Try real 3D dice */
    if (typeof Dice3D !== 'undefined' && Dice3D) {
      try {
        var dice = new Dice3D(canvas, { size: 120, dieType: 'd20', duration: 1500 });
        dice.roll(value, onDone);
        return;
      } catch (e) {
        console.warn('[DIARY] Dice3D init error, using fallback', e);
      }
    }

    /* Fallback: 2D animated number cycling */
    var ctx       = canvas.getContext('2d');
    var frames    = 0;
    var maxFrames = 12;
    var w = canvas.width, h = canvas.height;

    var anim = setInterval(function () {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(20,16,12,0.95)';
      ctx.fillRect(0, 0, w, h);
      ctx.font      = '900 36px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#dbb668';
      ctx.fillText(String(Math.floor(Math.random() * 20) + 1), w / 2, h / 2);
      frames++;
      if (frames >= maxFrames) {
        clearInterval(anim);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(20,16,12,0.95)';
        ctx.fillRect(0, 0, w, h);
        ctx.font      = '900 36px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#dbb668';
        ctx.fillText(String(value), w / 2, h / 2);
        if (onDone) onDone();
      }
    }, 80);
  };

  DiaryEngine.prototype._showDiceResult = function (resultEl, resolEl, ev, isSuccess, total) {
    var self = this;

    setTimeout(function () {
      resultEl.className = 'diary-dice-result ' + (isSuccess ? 'diary-dice-result--success' : 'diary-dice-result--fail');
      resultEl.textContent = (isSuccess ? '\u2713 Sucesso' : '\u2717 Falha') + ' (' + total + ' vs DC ' + ev.dc + ')';
      resultEl.style.opacity = '';

      var successText = ev.success_text || ev.successText || '';
      var failText    = ev.fail_text    || ev.failText    || '';
      var resText     = isSuccess ? successText : failText;
      resolEl.textContent = resText;
      resolEl.style.opacity = '';

      var failDmg = ev.fail_dmg || ev.failDmg || 0;
      if (!isSuccess && failDmg) {
        self._totalHp += failDmg;
        var dmg = _el('span', 'diary-reward diary-reward--hp', '-' + failDmg + ' HP');
        dmg.style.cssText = 'display:block;text-align:center;margin-top:6px';
        resolEl.parentNode.appendChild(dmg);
      }

      var readTime = _calcReadTime(resText);
      setTimeout(function () {
        self._showFooterNext(function () { self._showSimpleBatch(); });
      }, readTime);
    }, DICE_RESULT_DELAY);
  };

  /* ══════════════════════════════════════
   *  CHOICE PAGE
   * ══════════════════════════════════════ */

  DiaryEngine.prototype._showChoicePage = function (ev) {
    this._idx++;
    this._totalEvents++;
    var self = this;

    this._clearPage(function () {
      var page = _el('div', 'diary-choice-page');
      page.appendChild(_el('div', 'diary-choice-narration', ev.narration));

      var opts = _el('div', 'diary-choice-options');
      for (var i = 0; i < ev.choices.length; i++) {
        (function (ci, c) {
          var btn = _el('button', 'diary-choice-btn');
          btn.appendChild(_el('span', 'choice-icon', c.icon));
          btn.appendChild(_el('span', 'choice-label', c.label));
          if (c.check) btn.appendChild(_el('span', 'choice-check', c.check));
          btn.addEventListener('click', function () { self._onChoiceSelected(opts, ci, ev); });
          opts.appendChild(btn);
        })(i, ev.choices[i]);
      }
      page.appendChild(opts);
      self._pageArea.appendChild(page);
      self._updateProgress();
    });
  };

  DiaryEngine.prototype._onChoiceSelected = function (optsEl, selectedIdx, ev) {
    var btns = optsEl.querySelectorAll('.diary-choice-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.add(i === selectedIdx ? 'diary-choice-btn--selected' : 'diary-choice-btn--disabled');
      btns[i].disabled = true;
    }

    this._pendingChoiceEv = ev;

    if (this._onChoice) {
      this._onChoice(selectedIdx, ev);
      /* caller will call showChoiceResult() */
    } else {
      /* auto-continue when no handler set */
      var self = this;
      setTimeout(function () {
        self._showFooterNext(function () { self._showSimpleBatch(); });
      }, CHOICE_RESOLVE_DELAY);
    }
  };

  DiaryEngine.prototype._renderChoiceResult = function (result) {
    var self = this;

    var resBox = _el('div', 'diary-entry');
    resBox.style.marginTop = '10px';
    var rdot = _el('div', 'diary-dot diary-dot--encounter');
    rdot.textContent = result.icon || '\uD83D\uDDE3\uFE0F';
    var rcard = _el('div', 'diary-card');
    rcard.appendChild(_el('div', 'diary-card-title', result.text || ''));
    if (result.detail) rcard.appendChild(_el('div', 'diary-card-detail', result.detail));

    this._trackRewards(result);
    var badges = this._buildRewardBadges(result);
    for (var i = 0; i < badges.length; i++) rcard.appendChild(badges[i]);

    resBox.appendChild(rdot);
    resBox.appendChild(rcard);
    this._pageArea.appendChild(resBox);

    var readTime = _calcReadTime(result.text || '');
    setTimeout(function () {
      self._showFooterNext(function () { self._showSimpleBatch(); });
    }, readTime);
  };

  /* ══════════════════════════════════════
   *  SUMMARY
   * ══════════════════════════════════════ */

  DiaryEngine.prototype._showSummary = function () {
    console.info('[DIARY] summary xp=' + this._totalXp + ' gp=' + this._totalGp + ' hp=' + this._totalHp + ' events=' + this._totalEvents);
    this._running = false;
    if (this._progressFill) this._progressFill.style.width = '100%';

    var self = this;
    this._clearPage(function () {
      var page = _el('div', 'diary-summary-page');
      page.appendChild(_el('div', 'diary-summary-title', 'Viagem Conclu\u00edda'));

      var stats = _el('div', 'diary-summary-stats');

      function addStat(val, label, cls) {
        var s = _el('div', 'diary-summary-stat');
        s.appendChild(_el('div', 'diary-summary-stat-val' + (cls || ''), String(val)));
        s.appendChild(_el('div', 'diary-summary-stat-label', label));
        stats.appendChild(s);
      }

      addStat(self._totalEvents, 'Eventos');
      if (self._totalXp) addStat('+' + self._totalXp, 'XP', ' diary-summary-stat-val--xp');
      if (self._totalGp) addStat('+' + self._totalGp, 'Valdoritas');
      if (self._totalHp) addStat('-' + self._totalHp, 'HP', ' diary-summary-stat-val--hp');

      page.appendChild(stats);
      self._pageArea.appendChild(page);

      /* final button via onComplete */
      var fa = self._footerArea;
      while (fa.firstChild) fa.removeChild(fa.firstChild);

      if (self._onComplete) {
        self._onComplete(fa, {
          events: self._totalEvents,
          xp:     self._totalXp,
          gp:     self._totalGp,
          hp:     self._totalHp
        });
      } else {
        var btn = _el('button', 'diary-action-btn', 'Continuar Viagem \u27A1');
        fa.appendChild(btn);
      }
      fa.style.display = 'block';
    });
  };

  return DiaryEngine;
})();
