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
  var CITY_SETTLE_DELAY_MS = 2600;  // aguarda a cidade assentar antes de checar (pos-loading)
  var FETCH_TIMEOUT_MS = 12000;     // teto p/ nao deixar o CTA preso em "Concedendo..."

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
    if (!c.token || !c.uid) { console.warn('[LEGACY_REWARD] sem token/uid — pulando', path); cb(null); return; }
    if (!c.api) { console.warn('[LEGACY_REWARD] api base ausente — abortando', path); cb(null); return; }
    var headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.token };
    var payload = Object.assign({ token: c.token, user_id: Number(c.uid) }, body || {});
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = setTimeout(function () { try { if (ctrl) ctrl.abort(); } catch (e) {} }, FETCH_TIMEOUT_MS);
    var opts = { method: 'POST', headers: headers, body: JSON.stringify(payload) };
    if (ctrl) { opts.signal = ctrl.signal; }
    fetch(c.api + path, opts)
      .then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(timer); cb(j); })
      .catch(function (e) { clearTimeout(timer); console.warn('[LEGACY_REWARD]', path, e); cb(null); });
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
      '.vlr-defer{width:100%;margin-top:9px;padding:11px;border:1px solid var(--v-border,#4a3828);',
      'border-radius:10px;cursor:pointer;background:transparent;color:var(--v-text-dim,#a09484);',
      'font-family:var(--v-font,"MedievalSharp","Cinzel",serif);font-size:13px;}',
      '.vlr-defer:hover{border-color:var(--v-gold,#c4953a);color:var(--v-text,#d4c8b0);}',
      '.vlr-warn{text-align:left;background:rgba(196,149,58,.10);border:1px solid var(--v-gold,#c4953a);',
      'border-radius:10px;padding:11px 12px;margin:4px 0 12px;}',
      '.vlr-warn-h{font-family:var(--v-font-display,"Cinzel",serif);font-weight:700;color:var(--v-gold,#c4953a);',
      'font-size:13px;margin-bottom:6px;letter-spacing:.5px;}',
      '.vlr-warn ul{margin:0;padding-left:18px;}',
      '.vlr-warn li{font-size:12.5px;color:var(--v-text,#d4c8b0);line-height:1.5;margin:2px 0;}',
      '.vlr-warn b{color:var(--v-gold,#c4953a);}',
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

  function show(reward, charName) {
    if (!reward || !reward.options) { return; }
    if (document.getElementById('vlr-ov')) { return; }
    injectStyle();
    // NOTA: o once-guard (SHOWN_KEY) só é setado APÓS um claim bem-sucedido (em claim()).
    // Marcar aqui faria o jogador perder a recompensa pra sempre se o claim falhasse.

    var ov = document.createElement('div');
    ov.className = 'vlr-ov';
    ov.id = 'vlr-ov';

    var card = document.createElement('div');
    card.className = 'vlr-card';
    ov.appendChild(card);

    var who = (charName && String(charName).trim()) ? String(charName).trim() : '';

    var crest = document.createElement('div'); crest.className = 'vlr-crest'; crest.textContent = '⚜️';
    var title = document.createElement('div'); title.className = 'vlr-title'; title.textContent = 'Recompensa de Veterano';
    var sub = document.createElement('div'); sub.className = 'vlr-sub';
    setFmt(sub, 'O reino de Valdoria renasceu, e os registros de antes se tornaram lenda. '
      + 'Em honra à sua jornada anterior, você pode resgatar <b>uma</b> recompensa.');
    card.appendChild(crest); card.appendChild(title); card.appendChild(sub);

    // Caixa de aviso — destaque para escolha única, irreversível e não-transferível
    var warn = document.createElement('div'); warn.className = 'vlr-warn';
    var warnH = document.createElement('div'); warnH.className = 'vlr-warn-h'; warnH.textContent = '⚠ Leia antes de escolher';
    var ul = document.createElement('ul');
    [
      'A recompensa vale para <b>um único personagem</b>.',
      'Só pode ser resgatada <b>uma vez</b>.',
      '<b>Não é transferível</b>: depois de resgatada, fica ligada ao personagem escolhido — um personagem novo não a recebe.'
    ].forEach(function (t) { var li = document.createElement('li'); setFmt(li, t); ul.appendChild(li); });
    warn.appendChild(warnH); warn.appendChild(ul);
    card.appendChild(warn);

    // A quem se aplica + opção de adiar para criar outro personagem
    var applyTo = document.createElement('div'); applyTo.className = 'vlr-sub';
    if (who) {
      setFmt(applyTo, 'Será aplicada a <b>' + who + '</b>, seu personagem atual. '
        + 'Prefere guardá-la para outro? Crie o personagem primeiro e volte aqui.');
    } else {
      setFmt(applyTo, 'Será aplicada ao seu personagem atual. '
        + 'Prefere guardá-la para outro? Crie o personagem primeiro e volte aqui.');
    }
    card.appendChild(applyTo);
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
      var hn = document.createElement('span'); hn.textContent = opt.title || ('Opção ' + opt.id);
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

    // Adiar: fecha SEM marcar o once-guard — reaparece na proxima vez que chegar na cidade
    // (inclusive depois de criar outro personagem). A recompensa continua pendente no servidor.
    var defer = document.createElement('button'); defer.className = 'vlr-defer';
    defer.textContent = 'Prefiro criar outro personagem primeiro';
    defer.onclick = function () { close(ov); };
    card.appendChild(defer);

    var note = document.createElement('div'); note.className = 'vlr-note';
    note.textContent = 'A escolha é definitiva e aparece apenas uma vez.';
    card.appendChild(note);

    // SPA cleanup: preferir vOverlay; senao append ao body + registrar cleanup manual
    // em _spaCleanupFns (evita overlay orfao em troca de rota). Avisa se vOverlay ausente.
    if (window.vOverlay && window.vOverlay.add) {
      window.vOverlay.add(ov);
    } else {
      console.warn('[LEGACY_REWARD] vOverlay ausente — fallback body.appendChild + cleanup manual');
      document.body.appendChild(ov);
      try {
        window._spaCleanupFns = window._spaCleanupFns || [];
        window._spaCleanupFns.push(function () { close(ov); });
      } catch (e) { /* */ }
    }
  }

  function claim(option, ov, card) {
    // game_session: prova de identidade persistente p/ o fallback server-side (token in-memory perdido)
    var gs = '';
    try { if (window.vAuthTokenStore && window.vAuthTokenStore.getToken) { gs = window.vAuthTokenStore.getToken() || ''; } } catch (e) { /* */ }
    post('/api/game/legacy-reward/claim', { option: option, game_session: gs }, function (res) {
      if (!res || (!res.ok && !res.already_claimed)) {
        var cta = card.querySelector('.vlr-cta');
        if (cta) { cta.disabled = false; cta.textContent = 'Erro de conexão. Tentar novamente'; }
        console.warn('[LEGACY_REWARD] claim falhou', res);
        return;
      }
      // Sucesso (ou ja reivindicado) — AGORA sim marca o once-guard.
      try { sessionStorage.setItem(SHOWN_KEY, '1'); } catch (e) { /* */ }
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
      if (res && res.pending && res.reward) { show(res.reward, res.char_name); }
    });
  }

  window.vLegacyReward = { check: check, show: show };

  // Auto-fire: aguarda a cidade assentar para não competir com o loading.
  function arm() { setTimeout(check, CITY_SETTLE_DELAY_MS); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm);
  } else { arm(); }
})();
