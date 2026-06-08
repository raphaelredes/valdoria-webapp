/* legacy-reward-popup.js — Popup unico de recompensa de veterano (pre-wipe 2026-06-07).
 *
 * Carregado pela cidade (entry pos-prologo). Ao abrir a cidade, consulta
 * POST /api/game/legacy-reward; se houver recompensa pendente (conta elegivel e
 * ainda nao reivindicada), mostra UM popup com 3 opcoes. A escolha vai por
 * POST /api/game/legacy-reward/claim (server-authoritative — aplica ao char ativo).
 * Aparece UMA vez (flag `claimed` no metadata da conta, server-side).
 *
 * Self-contained: overlay proprio (estilo medieval), zero dependencia de vPopup.
 * Resolve token/uid/api dos params da URL (como a cidade faz) com fallbacks.
 * Render seguro: setFmt() so cria <b>/<i> via textContent (sem innerHTML / sem XSS).
 */
(function () {
  'use strict';
  var SHOWN_KEY = 'valdoria_legacy_reward_shown';

  // Render seguro de texto com tags <b>/<i> simples (parser por indexOf — sem innerHTML).
  function setFmt(el, str) {
    el.textContent = '';
    if (str == null) { return; }
    var i = 0, n = str.length;
    while (i < n) {
      var lt = str.indexOf('<', i);
      if (lt < 0) { el.appendChild(document.createTextNode(str.slice(i))); break; }
      if (lt > i) { el.appendChild(document.createTextNode(str.slice(i, lt))); }
      var tag = null;
      if (str.substr(lt, 3) === '<b>') { tag = 'b'; }
      else if (str.substr(lt, 3) === '<i>') { tag = 'i'; }
      if (tag) {
        var endTag = '</' + tag + '>';
        var end = str.indexOf(endTag, lt + 3);
        if (end < 0) { el.appendChild(document.createTextNode(str.slice(lt))); break; }
        var node = document.createElement(tag);
        node.textContent = str.slice(lt + 3, end);
        el.appendChild(node);
        i = end + endTag.length;
      } else {
        el.appendChild(document.createTextNode('<'));
        i = lt + 1;
      }
    }
  }

  function ctx() {
    var q = new URLSearchParams(location.search);
    var api = (window._VALDORIA_API_BASE || window._API_BASE || q.get('api') || '').replace(/\/$/, '');
    var token = q.get('token');
    var uid = q.get('uid');
    try {
      if ((!token) && window.vAuthTokenStore && window.vAuthTokenStore.getToken) {
        token = window.vAuthTokenStore.getToken() || token;
      }
    } catch (e) { /* ignore */ }
    return { api: api, token: token, uid: uid };
  }

  function post(path, body, cb) {
    var c = ctx();
    if (!c.token || !c.uid) { return; }
    var headers = { 'Content-Type': 'application/json' };
    if (c.token) { headers['Authorization'] = 'Bearer ' + c.token; }
    var payload = Object.assign({ token: c.token, user_id: Number(c.uid) }, body || {});
    fetch(c.api + path, { method: 'POST', headers: headers, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (j) { cb(j); })
      .catch(function (e) { console.warn('[LEGACY_REWARD]', path, e); });
  }

  function injectStyle() {
    if (document.getElementById('vlr-style')) { return; }
    var css = [
      '.vlr-ov{position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;',
      'background:rgba(15,12,8,.88);padding:16px;overflow-y:auto;font-family:var(--v-font,"MedievalSharp","Cinzel",serif);}',
      '.vlr-card{max-width:420px;width:100%;max-height:92vh;overflow-y:auto;background:linear-gradient(180deg,#332a22,#2a2420);',
      'border:2px solid var(--v-gold,#c4953a);border-radius:14px;box-shadow:0 0 28px rgba(196,149,58,.35),0 12px 40px rgba(0,0,0,.6);',
      'padding:20px 18px 18px;color:var(--v-text,#d4c8b0);text-align:center;position:relative;}',
      '.vlr-crest{font-size:34px;line-height:1;margin-bottom:6px;}',
      '.vlr-title{font-family:var(--v-font-display,"Cinzel",serif);font-weight:700;color:var(--v-gold,#c4953a);',
      'font-size:clamp(18px,5.5vw,22px);letter-spacing:1px;text-shadow:0 0 14px rgba(196,149,58,.4);margin:0 0 4px;}',
      '.vlr-sub{font-size:13px;color:var(--v-text-dim,#a09484);line-height:1.5;margin:0 auto 14px;max-width:340px;}',
      '.vlr-div{height:1px;background:linear-gradient(90deg,transparent,rgba(196,149,58,.5),transparent);margin:12px 0;}',
      '.vlr-opt{display:block;width:100%;text-align:left;background:#2e2520;border:1.5px solid var(--v-border,#4a3828);',
      'border-radius:10px;padding:12px 12px;margin:9px 0;cursor:pointer;transition:all .18s ease;color:inherit;font:inherit;}',
      '.vlr-opt:hover{border-color:var(--v-gold,#c4953a);}',
      '.vlr-opt.sel{border-color:var(--v-gold,#c4953a);box-shadow:0 0 14px rgba(196,149,58,.4) inset,0 0 12px rgba(196,149,58,.25);background:#3a3026;}',
      '.vlr-opt-h{display:flex;align-items:center;gap:9px;font-family:var(--v-font-display,"Cinzel",serif);',
      'font-weight:700;color:var(--v-gold,#c4953a);font-size:15px;margin-bottom:4px;}',
      '.vlr-opt-ic{font-size:20px;}',
      '.vlr-opt-d{font-size:12.5px;color:var(--v-text,#d4c8b0);line-height:1.45;}',
      '.vlr-cta{width:100%;margin-top:14px;padding:13px;border:none;border-radius:10px;cursor:pointer;',
      'font-family:var(--v-font-display,"Cinzel",serif);font-weight:700;font-size:15px;letter-spacing:.5px;',
      'background:linear-gradient(180deg,#d8a843,#b07f28);color:#1a1510;box-shadow:0 3px 10px rgba(0,0,0,.4);}',
      '.vlr-cta:disabled{opacity:.45;cursor:default;filter:grayscale(.4);}',
      '.vlr-note{font-size:11px;color:var(--v-text-dim,#a09484);margin-top:10px;font-style:italic;}',
      '.vlr-result{font-size:14px;line-height:1.6;color:var(--v-text,#d4c8b0);margin:14px 4px;}'
    ].join('');
    var st = document.createElement('style');
    st.id = 'vlr-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function close(ov) {
    try { if (ov && ov.parentNode) { ov.parentNode.removeChild(ov); } } catch (e) { /* */ }
  }

  function show(reward) {
    if (!reward || !reward.options) { return; }
    if (document.getElementById('vlr-ov')) { return; }
    injectStyle();
    try { sessionStorage.setItem(SHOWN_KEY, '1'); } catch (e) { /* */ }

    var ov = document.createElement('div');
    ov.className = 'vlr-ov';
    ov.id = 'vlr-ov';

    var card = document.createElement('div');
    card.className = 'vlr-card';
    ov.appendChild(card);

    var crest = document.createElement('div'); crest.className = 'vlr-crest'; crest.textContent = '⚜️';
    var title = document.createElement('div'); title.className = 'vlr-title'; title.textContent = 'Recompensa de Veterano';
    var sub = document.createElement('div'); sub.className = 'vlr-sub';
    setFmt(sub, 'O reino de Valdoria renasceu, e os registros de antes se tornaram lenda. '
      + 'Em honra a sua jornada anterior, escolha <b>uma</b> recompensa para o seu novo comeco.');
    card.appendChild(crest); card.appendChild(title); card.appendChild(sub);
    var div = document.createElement('div'); div.className = 'vlr-div'; card.appendChild(div);

    var selected = null;
    var cta = document.createElement('button');
    cta.className = 'vlr-cta'; cta.disabled = true; cta.textContent = 'Selecione uma recompensa';

    (reward.options || []).forEach(function (opt) {
      var b = document.createElement('button');
      b.className = 'vlr-opt';
      b.setAttribute('data-opt', opt.id);
      var h = document.createElement('div'); h.className = 'vlr-opt-h';
      var ic = document.createElement('span'); ic.className = 'vlr-opt-ic'; ic.textContent = opt.icon || '✦';
      var hn = document.createElement('span'); hn.textContent = opt.title || ('Opcao ' + opt.id);
      h.appendChild(ic); h.appendChild(hn);
      var d = document.createElement('div'); d.className = 'vlr-opt-d'; setFmt(d, opt.desc || '');
      b.appendChild(h); b.appendChild(d);
      b.onclick = function () {
        selected = opt.id;
        Array.prototype.forEach.call(card.querySelectorAll('.vlr-opt'), function (x) { x.classList.remove('sel'); });
        b.classList.add('sel');
        cta.disabled = false;
        cta.textContent = 'Confirmar: ' + (opt.title || opt.id);
      };
      card.appendChild(b);
    });

    cta.onclick = function () {
      if (!selected) { return; }
      cta.disabled = true; cta.textContent = 'Concedendo...';
      claim(selected, ov, card);
    };
    card.appendChild(cta);

    var note = document.createElement('div'); note.className = 'vlr-note';
    note.textContent = 'A escolha e definitiva e aparece apenas uma vez.';
    card.appendChild(note);

    if (window.vOverlay && window.vOverlay.add) { window.vOverlay.add(ov); }
    else { document.body.appendChild(ov); }
  }

  function claim(option, ov, card) {
    post('/api/game/legacy-reward/claim', { option: option }, function (res) {
      if (!res || (!res.ok && !res.already_claimed)) {
        var cta = card.querySelector('.vlr-cta');
        if (cta) { cta.disabled = false; cta.textContent = 'Tentar novamente'; }
        console.warn('[LEGACY_REWARD] claim falhou', res);
        return;
      }
      while (card.firstChild) { card.removeChild(card.firstChild); }
      var crest = document.createElement('div'); crest.className = 'vlr-crest'; crest.textContent = '⚜️';
      var title = document.createElement('div'); title.className = 'vlr-title'; title.textContent = 'Recompensa concedida';
      var div = document.createElement('div'); div.className = 'vlr-div';
      var msg = document.createElement('div'); msg.className = 'vlr-result';
      setFmt(msg, (res && res.message) ? res.message : 'Sua recompensa de veterano foi aplicada.');
      var go = document.createElement('button'); go.className = 'vlr-cta'; go.textContent = 'Continuar';
      go.onclick = function () { close(ov); try { location.reload(); } catch (e) { /* */ } };
      card.appendChild(crest); card.appendChild(title); card.appendChild(div);
      card.appendChild(msg); card.appendChild(go);
    });
  }

  function check() {
    try { if (sessionStorage.getItem(SHOWN_KEY)) { return; } } catch (e) { /* */ }
    var c = ctx();
    if (!c.token || !c.uid) { return; }
    post('/api/game/legacy-reward', {}, function (res) {
      if (res && res.pending && res.reward) { show(res.reward); }
    });
  }

  window.vLegacyReward = { check: check, show: show };

  // Auto-fire: aguarda a cidade assentar (~2.6s) para nao competir com o loading.
  function arm() { setTimeout(check, 2600); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm);
  } else { arm(); }
})();
