/* game-plaza-event.js -- Popup imersivo Praca Central */
/* Usa vPopup (shared/popup.js + popup.css) */

(function() {
  "use strict";

  function _esc(s) { return s ? String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") : ""; }

  function _diffDot(chance) {
    if (chance >= 70) return "<span class=\"v-popup-dot v-popup-dot--ok\"></span>";
    if (chance >= 40) return "<span class=\"v-popup-dot v-popup-dot--warn\"></span>";
    return "<span class=\"v-popup-dot v-popup-dot--crit\"></span>";
  }

  function _renderRewards(rewards) {
    if (!rewards || !rewards.length) return "";
    var h = "<div class=\"v-popup-divider\"></div>";
    h += "<div class=\"v-popup-section-label\">Recompensas</div>";
    for (var i = 0; i < rewards.length; i++) {
      var r = rewards[i];
      h += "<div class=\"v-popup-row\">" + (r.emoji || "") + " " + _esc(r.text) + "</div>";
    }
    return h;
  }

  /* ===== INVESTIGATION ===== */

  function _showChoices(d) {
    var body = "<div class=\"v-popup-desc\">" + _esc(d.desc) + "</div>";
    body += "<div class=\"v-popup-divider\"></div>";
    var actions = [];
    for (var i = 0; i < d.choices.length; i++) {
      var c = d.choices[i];
      var label = _esc(c.label);
      if (c.stat_hint) {
        var pct = parseInt(c.stat_hint.replace(/[^0-9]/g, ""), 10) || 50;
        label += " " + _diffDot(pct) + " <small>" + _esc(c.stat_hint) + "</small>";
      }
      actions.push({ html: label, action: c.cb, cls: "v-popup-btn" });
    }
    actions.push({ label: "🔙 Voltar", action: "cancel", cls: "v-popup-btn v-popup-btn--dim" });
    vPopup.show({ id: "plaza-event", header: d.title || "Investigação", body: body, actions: actions, closeOnOutside: false });
  }

  function _showResult(d) {
    var cls = d.success ? "v-popup-header--success" : "v-popup-header--warning";
    var body = "<div class=\"v-popup-desc\">" + _esc(d.narrative) + "</div>";
    body += _renderRewards(d.rewards);
    if (d.leveled) body += "<div class=\"v-popup-row\" style=\"margin-top:8px\">🎉 <b>Nível acima!</b></div>";
    vPopup.show({ id: "plaza-event", header: d.title || "Resultado", headerClass: cls, body: body,
      actions: [{ label: "🔙 Voltar", action: "cancel", cls: "v-popup-btn" }], closeOnOutside: false });
  }

  function _showEntry(d) {
    var body = "<div class=\"v-popup-desc\">" + _esc(d.narrative || d.message) + "</div>";
    body += _renderRewards(d.rewards);
    vPopup.show({ id: "plaza-event", header: "🏛️ Praça Central", body: body,
      actions: [{ label: "Continuar", action: "cancel", cls: "v-popup-btn" }], closeOnOutside: false });
  }

  function _showCooldown(d) {
    var body = "<div class=\"v-popup-desc\">⏳ " + _esc(d.message) + "</div>";
    vPopup.show({ id: "plaza-event", header: "Aguarde", headerClass: "v-popup-header--warning", body: body,
      actions: [{ label: "🔙 Voltar", action: "cancel", cls: "v-popup-btn" }], closeOnOutside: false });
  }

  /* ===== GAMBLE ===== */

  function _showGambleMenu(d) {
    var body = "<div class=\"v-popup-desc\">" + _esc(d.desc || "Escolha sua aposta para o jogo de dados.") + "</div>";
    if (d.gold != null) body += "<div class=\"v-popup-row\">💰 Ouro: " + d.gold + " GP</div>";
    if (d.remaining != null) body += "<div class=\"v-popup-row\">🎲 Apostas restantes: " + d.remaining + "</div>";
    body += "<div class=\"v-popup-divider\"></div>";
    var actions = [];
    if (d.bets) {
      for (var i = 0; i < d.bets.length; i++) {
        var b = d.bets[i];
        actions.push({ label: "🎲 " + b.amount + " GP", action: b.cb, cls: "v-popup-btn" });
      }
    }
    actions.push({ label: "🔙 Voltar", action: "cancel", cls: "v-popup-btn v-popup-btn--dim" });
    vPopup.show({ id: "plaza-event", header: "🎲 Jogo de Dados", body: body, actions: actions, closeOnOutside: false });
  }

  function _showGambleResult(d) {
    var cls = d.won ? "v-popup-header--success" : "v-popup-header--warning";
    var body = "<div class=\"v-popup-desc\">" + _esc(d.narrative) + "</div>";
    body += "<div class=\"v-popup-divider\"></div>";
    body += "<div class=\"v-popup-row\">Você: " + (d.player_total || "?") + "</div>";
    body += "<div class=\"v-popup-row\">Casa: " + (d.house_total || "?") + "</div>";
    body += _renderRewards(d.rewards);
    var actions = [];
    if (d.can_play_again) actions.push({ label: "🎲 Jogar Novamente", action: d.play_again_cb || "square_gamble", cls: "v-popup-btn" });
    actions.push({ label: "🔙 Voltar", action: "cancel", cls: "v-popup-btn v-popup-btn--dim" });
    vPopup.show({ id: "plaza-event", header: "🎲 Resultado", headerClass: cls, body: body, actions: actions, closeOnOutside: false });
  }

  /* ===== BULLETIN ===== */

  function _showBulletin(d) {
    var body = "";
    if (d.notices && d.notices.length) {
      for (var i = 0; i < d.notices.length; i++) {
        var n = d.notices[i];
        var icon = n.type === "bounty" ? "⚔️" : n.type === "help" ? "🤝" : "📋";
        body += "<div class=\"v-popup-row\" style=\"cursor:pointer\" data-action=\"" + _esc(n.cb) + "\">";
        body += icon + " <b>" + _esc(n.title) + "</b>";
        if (n.reward_hint) body += " <small style=\"opacity:0.7\">" + _esc(n.reward_hint) + "</small>";
        body += "</div>";
      }
    } else {
      body += "<div class=\"v-popup-desc\">Nenhum aviso no momento.</div>";
    }
    vPopup.show({ id: "plaza-event", header: "📋 Mural de Avisos", body: body,
      actions: [{ label: "🔙 Voltar", action: "cancel", cls: "v-popup-btn v-popup-btn--dim" }], closeOnOutside: false });
  }

  function _showBulletinResult(d) {
    var cls = d.success ? "v-popup-header--success" : "v-popup-header--warning";
    var body = "<div class=\"v-popup-desc\">" + _esc(d.narrative) + "</div>";
    body += _renderRewards(d.rewards);
    vPopup.show({ id: "plaza-event", header: d.title || "Mural", headerClass: cls, body: body,
      actions: [{ label: "🔙 Voltar ao Mural", action: d.back_cb || "square_bulletin", cls: "v-popup-btn" }], closeOnOutside: false });
  }

  /* ===== VENDOR ===== */

  function _showVendor(d) {
    var body = "";
    if (d.greeting) body += "<div class=\"v-popup-desc\">" + _esc(d.greeting) + "</div><div class=\"v-popup-divider\"></div>";
    if (d.gold != null) body += "<div class=\"v-popup-row\">💰 Ouro: " + d.gold + " GP</div>";
    if (d.items && d.items.length) {
      body += "<div class=\"v-popup-section-label\">🛒 Itens</div>";
      for (var i = 0; i < d.items.length; i++) {
        var it = d.items[i];
        var afford = (d.gold != null && it.price > d.gold) ? " style=\"opacity:0.5\"" : "";
        body += "<div class=\"v-popup-row\"" + afford + ">";
        body += (it.emoji || "📦") + " " + _esc(it.name) + " — " + it.price + " GP";
        body += "</div>";
      }
    } else {
      body += "<div class=\"v-popup-desc\">Nenhum item disponível.</div>";
    }
    var actions = [];
    if (d.items) {
      for (var i = 0; i < d.items.length; i++) {
        var it = d.items[i];
        if (d.gold == null || it.price <= d.gold) {
          actions.push({ label: (it.emoji || "") + " Comprar " + _esc(it.name), action: it.cb, cls: "v-popup-btn" });
        }
      }
    }
    actions.push({ label: "🔙 Voltar", action: "cancel", cls: "v-popup-btn v-popup-btn--dim" });
    vPopup.show({ id: "plaza-event", header: "🏪 " + _esc(d.npc_name || "Vendedor"), body: body, actions: actions, closeOnOutside: false });
  }

  function _showVendorResult(d) {
    var cls = d.success ? "v-popup-header--success" : "v-popup-header--warning";
    var body = "<div class=\"v-popup-desc\">" + _esc(d.narrative) + "</div>";
    body += _renderRewards(d.rewards);
    vPopup.show({ id: "plaza-event", header: d.title || "Compra", headerClass: cls, body: body,
      actions: [{ label: "🔙 Voltar ao Vendedor", action: d.back_cb || "square_vendor", cls: "v-popup-btn" }], closeOnOutside: false });
  }

  /* ===== WORK ===== */

  function _showWork(d) {
    var body = "";
    if (d.desc) body += "<div class=\"v-popup-desc\">" + _esc(d.desc) + "</div><div class=\"v-popup-divider\"></div>";
    if (d.jobs && d.jobs.length) {
      for (var i = 0; i < d.jobs.length; i++) {
        var j = d.jobs[i];
        var hint = "";
        if (j.stat_hint) {
          var pct = parseInt(j.stat_hint.replace(/[^0-9]/g, ""), 10) || 50;
          hint = " " + _diffDot(pct) + " <small>" + _esc(j.stat_hint) + "</small>";
        }
        body += "<div class=\"v-popup-row\">" + _esc(j.title) + hint + "</div>";
        if (j.desc) body += "<div class=\"v-popup-tip\">" + _esc(j.desc) + "</div>";
      }
    }
    var actions = [];
    if (d.jobs) {
      for (var i = 0; i < d.jobs.length; i++) {
        var j = d.jobs[i];
        actions.push({ label: "⚒️ " + _esc(j.title), action: j.cb, cls: "v-popup-btn" });
      }
    }
    actions.push({ label: "🔙 Voltar", action: "cancel", cls: "v-popup-btn v-popup-btn--dim" });
    vPopup.show({ id: "plaza-event", header: "⚒️ Trabalho", body: body, actions: actions, closeOnOutside: false });
  }

  function _showWorkResult(d) {
    var cls = d.success ? "v-popup-header--success" : "v-popup-header--warning";
    var body = "<div class=\"v-popup-desc\">" + _esc(d.narrative) + "</div>";
    body += _renderRewards(d.rewards);
    if (d.leveled) body += "<div class=\"v-popup-row\" style=\"margin-top:8px\">🎉 <b>Nível acima!</b></div>";
    vPopup.show({ id: "plaza-event", header: d.title || "Trabalho", headerClass: cls, body: body,
      actions: [{ label: "🔙 Voltar", action: "cancel", cls: "v-popup-btn v-popup-btn--dim" }], closeOnOutside: false });
  }


  /* ===== ENTRY CHOICE ===== */

  function _showEntryChoice(d) {
    var body = "<div class=\"v-popup-desc\">" + _esc(d.desc) + "</div>";
    body += "<div class=\"v-popup-divider\"></div>";
    var actions = [];
    for (var i = 0; i < d.choices.length; i++) {
      var c = d.choices[i];
      var label = _esc(c.label);
      if (c.stat_hint) {
        var pct = parseInt(c.stat_hint.replace(/[^0-9]/g, ""), 10) || 50;
        label += " " + _diffDot(pct) + " <small>" + _esc(c.stat_hint) + "</small>";
      }
      actions.push({ html: label, action: c.cb, cls: "v-popup-btn" });
    }
    vPopup.show({ id: "plaza-event", header: d.title || "Acontecimento", body: body, actions: actions, closeOnOutside: false });
  }

  /* ===== DISPATCHER ===== */

  var _phases = {
    choices: _showChoices,
    result: _showResult,
    entry: _showEntry,
    cooldown: _showCooldown,
    gamble_menu: _showGambleMenu,
    gamble_result: _showGambleResult,
    bulletin: _showBulletin,
    bulletin_result: _showBulletinResult,
    vendor: _showVendor,
    vendor_result: _showVendorResult,
    work: _showWork,
    work_result: _showWorkResult,
    entry_choice: _showEntryChoice
  };

  function _dispatch(data) {
    if (!data || !data.phase) return;
    var fn = _phases[data.phase];
    if (fn) fn(data);
    else console.warn("[PLAZA] Unknown phase:", data.phase);
  }

  window.renderPlazaEvent = _dispatch;
  window.showPlazaEventPopup = _dispatch;

})();
