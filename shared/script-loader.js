/**
 * ValdoriaScriptLoader — robust script loading with onload/onerror chain.
 *
 * Replaces inline script injection for dependency chains where load
 * failure must be detected and handled (CDN scripts, diary-engine, dice-3d).
 *
 * Pattern: createElement + onload/onerror (MDN, web.dev recommended).
 * Inline script injection provides zero error feedback — this loader gives
 * visibility into success/failure of each script in the chain.
 *
 * Usage:
 *   vLoadScripts([
 *     { src: 'https://cdn.example.com/lib.js', id: 'three', optional: true,
 *       fallback: '../shared/three.min.js' },
 *     { src: '../shared/dice-3d.js', id: 'dice3d' },
 *     { src: '../shared/diary-engine.js', id: 'diary' },
 *   ], function(results) {
 *     // results = { three: true, dice3d: true, diary: false }
 *     if (results.diary) initDiary();
 *   });
 */
(function() {
  'use strict';

  var _v = window.v || Date.now();
  var TIMEOUT_MS = 8000;

  /**
   * Load a single script with onload/onerror + timeout.
   * @param {string} src - Script URL
   * @param {object} opts - { fallback?, timeout? }
   * @param {function} cb - cb(success: boolean)
   */
  function _loadOne(src, opts, cb) {
    var done = false;
    var timer = null;
    var el = document.createElement('script');

    function finish(ok) {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      el.onload = el.onerror = null;
      cb(ok);
    }

    // Set handlers BEFORE src (cached scripts may fire onload synchronously)
    el.onload = function() { finish(true); };
    el.onerror = function() {
      console.warn('[SCRIPT-LOADER] failed: ' + src);
      if (opts.fallback && !opts._isFallback) {
        // Try fallback URL
        console.info('[SCRIPT-LOADER] trying fallback: ' + opts.fallback);
        var fbSrc = opts.fallback + (opts.fallback.indexOf('?') < 0 ? '?v=' + _v : '');
        _loadOne(fbSrc, { _isFallback: true }, cb);
      } else {
        finish(false);
      }
    };

    // Append cache-busting for same-origin scripts
    var finalSrc = src;
    if (src.indexOf('://') < 0 || src.indexOf(location.hostname) >= 0) {
      finalSrc = src + (src.indexOf('?') < 0 ? '?v=' + _v : '');
    }
    el.src = finalSrc;

    // Timeout safety net
    timer = setTimeout(function() {
      if (!done) {
        console.error('[SCRIPT-LOADER] timeout (' + (opts.timeout || TIMEOUT_MS) + 'ms): ' + src);
        if (opts.fallback && !opts._isFallback) {
          var fbSrc = opts.fallback + (opts.fallback.indexOf('?') < 0 ? '?v=' + _v : '');
          _loadOne(fbSrc, { _isFallback: true, timeout: opts.timeout }, cb);
        } else {
          finish(false);
        }
      }
    }, opts.timeout || TIMEOUT_MS);

    document.head.appendChild(el);
  }

  /**
   * Load scripts sequentially (each waits for prior).
   * @param {Array} scripts - [{ src, id, optional?, fallback?, timeout? }]
   * @param {function} done - done(results: { id: boolean })
   */
  function vLoadScripts(scripts, done) {
    var results = {};
    var i = 0;

    function next() {
      if (i >= scripts.length) {
        if (typeof done === 'function') done(results);
        return;
      }
      var s = scripts[i];
      i++;
      _loadOne(s.src, { fallback: s.fallback, timeout: s.timeout }, function(ok) {
        results[s.id || s.src] = ok;
        if (!ok && !s.optional) {
          console.error('[SCRIPT-LOADER] required script failed: ' + s.src);
        }
        next();
      });
    }

    next();
  }

  // Expose globally
  window.vLoadScripts = vLoadScripts;
})();
