/* ============================================================================
 * narrative-reveal.js — slim typewriter (shared canonical)
 * ============================================================================
 *
 * Fonte unica do efeito "typewriter" de narracao RPG (char-by-char, ~28ms/char,
 * Human Reading Time). Extraido do _typewriter de shared/encounter-popup.js
 * (versao O(n): appendData + stack DOM, perf P0 Android 2GB) + o guard #17 do
 * combate (timer orfao quando o elemento sai do DOM durante a digitacao).
 *
 * FASE 7c single-source consolidation
 * (docs/sistemas/single-source-consolidation-plan.md, H6): o combate tinha sua
 * propria copia O(n^2) (_combatTypewriter em simuladores/combate.html, reparseava
 * todo o HTML acumulado por char). Agora delega aqui (mais rapido + 1 fonte).
 * encounter-popup.js (cidade/exploracao) mantem seu typewriter integrado a
 * paginacao do vEncounter por ora; sua migracao para ca e FASE 7a/7b/9.
 *
 * API:
 *   window.NarrativeReveal.typewriter(element, text, charMs, onDone)
 *     -> { skip: fn, isDone: fn }
 *   - element : no DOM onde o texto aparece char-by-char
 *   - text    : string (pode conter <i>/<b>/<em>/<strong> e entidades HTML)
 *   - charMs  : ms por caractere de texto (tags = instantaneas; <i>/<em> = pausa)
 *   - onDone  : callback ao concluir naturalmente OU via skip()
 *   - skip()  : completa imediatamente (idempotente; chama onDone 1x)
 *   - isDone(): true se ja concluiu
 *
 * Sem estado global, sem dependencias. ES5. Idempotente (nao redefine se ja existe).
 * ============================================================================ */
(function () {
  'use strict';
  if (window.NarrativeReveal && typeof window.NarrativeReveal.typewriter === 'function') return;

  var ASIDE_PAUSE_MS = 500;  /* pausa dramatica ao abrir <i>/<em> (aparte) */

  /* Entidades HTML comuns -> char. Desconhecidas passam literais (o texto do
     jogo usa chars reais como em-dash/reticencias; entidades sao raras). Decode
     por mapa em vez de elemento temporario, p/ manter o modulo sem render HTML. */
  var _ENTITY_MAP = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&#39;': "'", '&apos;': "'", '&nbsp;': ' ',
    '&mdash;': '—', '&ndash;': '–', '&hellip;': '…'
  };
  function _decodeEntity(s) {
    return (_ENTITY_MAP[s] != null) ? _ENTITY_MAP[s] : s;
  }

  function _clear(element) {
    while (element.firstChild) element.removeChild(element.firstChild);
  }

  /* Tokeniza: tags inteiras (<...>), entidades (&...;) e caracteres de texto. */
  function _tokenize(text) {
    var tokens = [], i = 0;
    while (i < text.length) {
      var c = text.charAt(i);
      if (c === '<') {
        var end = text.indexOf('>', i);
        if (end > 0) { tokens.push({ type: 'tag', content: text.substring(i, end + 1) }); i = end + 1; continue; }
      }
      if (c === '&') {
        var sc = text.indexOf(';', i);
        if (sc > 0 && sc - i < 10) { tokens.push({ type: 'entity', content: text.substring(i, sc + 1) }); i = sc + 1; continue; }
      }
      tokens.push({ type: 'char', content: c });
      i++;
    }
    return tokens;
  }

  function typewriter(element, text, charMs, onDone) {
    if (!element) {
      if (typeof onDone === 'function') onDone();
      return { skip: function () {}, isDone: function () { return true; } };
    }
    charMs = charMs || 28;
    text = String(text == null ? '' : text);
    var tokens = _tokenize(text);
    var idx = 0, timer = null, done = false;
    element.classList.add('typing');
    _clear(element);

    /* Construcao DOM por stack: topo = no onde appendamos texto. <i>/<em> abertas
       empilham child; close desempilha. O(n) via appendData (sem reparse de HTML). */
    var stack = [element];
    var currentText = null;

    function _processToken(tok) {
      var top = stack[stack.length - 1];
      if (tok.type === 'tag') {
        var t = tok.content;
        var closeM = t.match(/^<\s*\/\s*(\w+)\s*>$/i);
        if (closeM) {
          if (stack.length > 1) stack.pop();
          currentText = null;
          return /^(i|em)$/i.test(closeM[1]);  /* needsPause */
        }
        var openM = t.match(/^<\s*(\w+)([^>]*?)\s*\/?>$/i);
        if (openM) {
          var el = document.createElement(openM[1]);
          var attrStr = openM[2];
          if (attrStr) {
            attrStr.replace(/(\w+)\s*=\s*"([^"]*)"/g, function (_m, name, val) {
              el.setAttribute(name, val); return '';
            });
          }
          top.appendChild(el);
          if (!/^(br|hr|img|input)$/i.test(openM[1])) stack.push(el);  /* self-closing nao empilha */
          currentText = null;
          return /^(i|em)$/i.test(openM[1]);  /* needsPause */
        }
        top.appendChild(document.createTextNode(t));  /* tag desconhecida = literal */
        currentText = null;
        return false;
      }
      var ch = tok.content;
      if (tok.type === 'entity') ch = _decodeEntity(ch);
      if (currentText && currentText.parentNode === top) {
        currentText.appendData(ch);
      } else {
        currentText = document.createTextNode(ch);
        top.appendChild(currentText);
      }
      return false;
    }

    function step() {
      if (done) return;
      /* guard #17 (combate): popup fechado durante a digitacao -> elemento
         desconectado do DOM. Para o timer orfao em vez de iterar a vazio. */
      if (!element.isConnected) {
        done = true;
        if (timer) { clearTimeout(timer); timer = null; }
        return;
      }
      if (idx >= tokens.length) {
        done = true;
        element.classList.remove('typing');
        if (typeof onDone === 'function') onDone();
        return;
      }
      var tok = tokens[idx++];
      var needsPause = _processToken(tok);
      if (tok.type === 'tag') {
        if (needsPause) { timer = setTimeout(step, ASIDE_PAUSE_MS); return; }
        step();
        return;
      }
      if (tok.type === 'entity') { step(); return; }
      timer = setTimeout(step, charMs);
    }

    step();

    return {
      skip: function () {
        if (done) return;
        if (timer) { clearTimeout(timer); timer = null; }
        while (idx < tokens.length) _processToken(tokens[idx++]);
        element.classList.remove('typing');
        done = true;
        if (typeof onDone === 'function') onDone();
      },
      isDone: function () { return done; }
    };
  }

  window.NarrativeReveal = { typewriter: typewriter };
})();
