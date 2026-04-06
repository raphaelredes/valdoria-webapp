/* game-plaza-event.js -- Popup imersivo Praca Central */
/* Usa vPopup (shared/popup.js + popup.css) */

(function() {
  "use strict";

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
      if (!r || !r.text) continue;
      h += "<div class=\"v-popup-row\">" + (r.emoji || "") + " " + vEsc(r.text) + "</div>";
    }
    return h;
  }

  /* ===== INVESTIGATION ===== */

  function _showChoices(d) {
    if (!d.choices || !d.choices.length) { console.error("[PLAZA] _showChoices: missing choices", d); return; }
    var body = "<div class=\"v-popup-desc\">" + vEsc(d.desc) + "</div>";
    body += "<div class=\"v-popup-divider\"></div>";
    var actions = [];
    for (var i = 0; i < d.choices.length; i++) {
      var c = d.choices[i];
      var label = vEsc(c.label);
      if (c.stat_hint) {
        var pct = (typeof c.stat_hint === "string") ? (parseInt(c.stat_hint.replace(/[^0-9]/g, ""), 10) || 50) : 50;
        label += " " + _diffDot(pct) + " <small>" + vEsc(c.stat_hint) + "</small>";
      }
      actions.push({ html: label, action: c.cb, cls: "v-popup-btn" });
    }
    actions.push({ label: "🔙 Voltar", action: "cancel", cls: "v-popup-btn v-popup-btn--dim" });
    vPopup.show({ id: "plaza-event", header: d.title || "Investigação", body: body, actions: actions, closeOnOutside: false });
  }

  function _showResult(d) {
    if (!d.narrative) { console.error("[PLAZA] _showResult: missing narrative", d); }
    var cls = d.success ? "v-popup-header--success" : "v-popup-header--warning";
    var body = "<div class=\"v-popup-desc\">" + vEsc(d.narrative) + "</div>";
    body += _renderRewards(d.rewards);
    if (d.leveled) body += "<div class=\"v-popup-row v-popup-level-up\">🎉 <b>Nível acima!</b></div>";
    vPopup.show({ id: "plaza-event", header: d.title || "Resultado", headerClass: cls, body: body,
      actions: [{ label: "Fechar", action: "cancel", cls: "v-popup-btn v-popup-btn--cancel" }], closeOnOutside: false });
  }

  function _showEntry(d) {
    var body = "<div class=\"v-popup-desc\">" + vEsc(d.narrative || d.message) + "</div>";
    body += _renderRewards(d.rewards);
    vPopup.show({ id: "plaza-event", header: "🏛️ Praça Central", body: body,
      actions: [{ label: "Fechar", action: "cancel", cls: "v-popup-btn v-popup-btn--cancel" }], closeOnOutside: false });
  }

  function _showCooldown(d) {
    var body = "<div class=\"v-popup-desc\">⏳ " + vEsc(d.message) + "</div>";
    vPopup.show({ id: "plaza-event", header: "Aguarde", headerClass: "v-popup-header--warning", body: body,
      actions: [{ label: "Fechar", action: "cancel", cls: "v-popup-btn v-popup-btn--cancel" }], closeOnOutside: false });
  }

  /* ===== GAMBLE ===== */

  function _showGambleMenu(d) {
    if (!d.bets || !d.bets.length) { console.error("[PLAZA] _showGambleMenu: missing bets", d); }
    var body = "<div class=\"v-popup-desc\">" + vEsc(d.desc || "Escolha sua aposta para o jogo de dados.") + "</div>";
    if (d.gold != null) body += "<div class=\"v-popup-row\">💰 Ouro: " + d.gold + " 💰</div>";
    if (d.remaining != null) body += "<div class=\"v-popup-row\">🎲 Apostas restantes: " + d.remaining + "</div>";
    body += "<div class=\"v-popup-divider\"></div>";
    var actions = [];
    if (d.bets) {
      for (var i = 0; i < d.bets.length; i++) {
        var b = d.bets[i];
        actions.push({ label: "🎲 " + b.amount + " 💰", action: b.cb, cls: "v-popup-btn" });
      }
    }
    actions.push({ label: "🔙 Voltar", action: "cancel", cls: "v-popup-btn v-popup-btn--dim" });
    vPopup.show({ id: "plaza-event", header: "🎲 Jogo de Dados", body: body, actions: actions, closeOnOutside: false });
  }

  function _showGambleResult(d) {
    if (d.won == null) { console.error("[PLAZA] _showGambleResult: missing won", d); }
    var cls = d.won ? "v-popup-header--success" : "v-popup-header--warning";
    var body = "<div class=\"v-popup-desc\">" + vEsc(d.narrative) + "</div>";
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
    if (!d.notices) { console.error("[PLAZA] _showBulletin: missing notices", d); }
    var body = "";
    if (d.notices && d.notices.length) {
      for (var i = 0; i < d.notices.length; i++) {
        var n = d.notices[i];
        var icon = n.type === "bounty" ? "⚔️" : n.type === "help" ? "🤝" : "📋";
        body += "<div class=\"v-popup-row\" data-action=\"" + vEsc(n.cb) + "\">";
        body += icon + " <b>" + vEsc(n.title) + "</b>";
        if (n.reward_hint) body += " <small class=\"v-popup-value--dim\">" + vEsc(n.reward_hint) + "</small>";
        body += "</div>";
      }
    } else {
      body += "<div class=\"v-popup-desc\">Nenhum aviso no momento.</div>";
    }
    vPopup.show({ id: "plaza-event", header: "📋 Mural de Avisos", body: body,
      actions: [{ label: "Fechar", action: "cancel", cls: "v-popup-btn v-popup-btn--cancel" }], closeOnOutside: false });
  }

  function _showBulletinResult(d) {
    if (!d.narrative) { console.error("[PLAZA] _showBulletinResult: missing narrative", d); }
    var cls = d.success ? "v-popup-header--success" : "v-popup-header--warning";
    var body = "<div class=\"v-popup-desc\">" + vEsc(d.narrative) + "</div>";
    body += _renderRewards(d.rewards);
    vPopup.show({ id: "plaza-event", header: d.title || "Mural", headerClass: cls, body: body,
      actions: [{ label: "🔙 Voltar ao Mural", action: d.back_cb || "square_bulletin", cls: "v-popup-btn" }], closeOnOutside: false });
  }

  /* ===== VENDOR ===== */

  function _showVendor(d) {
    if (!d.items) { console.error("[PLAZA] _showVendor: missing items", d); }
    var body = "";
    if (d.greeting) body += "<div class=\"v-popup-desc\">" + vEsc(d.greeting) + "</div><div class=\"v-popup-divider\"></div>";
    if (d.gold != null) body += "<div class=\"v-popup-row\">💰 Ouro: " + d.gold + " 💰</div>";
    if (d.items && d.items.length) {
      body += "<div class=\"v-popup-section-label\">🛒 Itens</div>";
      for (var i = 0; i < d.items.length; i++) {
        var it = d.items[i];
        var afford = (d.gold != null && it.price > d.gold) ? " class=\"v-popup-unaffordable\"" : "";
        body += "<div class=\"v-popup-row\"" + afford + ">";
        body += (it.emoji || "📦") + " " + vEsc(it.name) + " — " + it.price + " 💰";
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
          actions.push({ label: (it.emoji || "") + " Comprar " + vEsc(it.name), action: it.cb, cls: "v-popup-btn" });
        }
      }
    }
    actions.push({ label: "🔙 Voltar", action: "cancel", cls: "v-popup-btn v-popup-btn--dim" });
    vPopup.show({ id: "plaza-event", header: "🏪 " + vEsc(d.npc_name || "Vendedor"), body: body, actions: actions, closeOnOutside: false });
  }

  function _showVendorResult(d) {
    if (!d.narrative) { console.error("[PLAZA] _showVendorResult: missing narrative", d); }
    var cls = d.success ? "v-popup-header--success" : "v-popup-header--warning";
    var body = "<div class=\"v-popup-desc\">" + vEsc(d.narrative) + "</div>";
    if (d.item_name) body += "<div class=\"v-popup-row\">📦 " + vEsc(d.item_name) + (d.price ? " — " + d.price + " 💰" : "") + "</div>";
    body += _renderRewards(d.rewards);
    vPopup.show({ id: "plaza-event", header: d.title || "Compra", headerClass: cls, body: body,
      actions: [{ label: "🔙 Voltar ao Vendedor", action: d.back_cb || "square_vendor", cls: "v-popup-btn" }], closeOnOutside: false });
  }

  /* ===== WORK ===== */

  function _showWork(d) {
    if (!d.jobs) { console.error("[PLAZA] _showWork: missing jobs", d); }
    var body = "";
    if (d.desc) body += "<div class=\"v-popup-desc\">" + vEsc(d.desc) + "</div><div class=\"v-popup-divider\"></div>";
    if (d.jobs && d.jobs.length) {
      for (var i = 0; i < d.jobs.length; i++) {
        var j = d.jobs[i];
        var hint = "";
        if (j.stat_hint) {
          var pct = (typeof j.stat_hint === "string") ? (parseInt(j.stat_hint.replace(/[^0-9]/g, ""), 10) || 50) : 50;
          hint = " " + _diffDot(pct) + " <small>" + vEsc(j.stat_hint) + "</small>";
        }
        body += "<div class=\"v-popup-row\">" + vEsc(j.title) + hint + "</div>";
        if (j.desc) body += "<div class=\"v-popup-tip\">" + vEsc(j.desc) + "</div>";
      }
    }
    var actions = [];
    if (d.jobs) {
      for (var i = 0; i < d.jobs.length; i++) {
        var j = d.jobs[i];
        actions.push({ label: "⚒️ " + vEsc(j.title), action: j.cb, cls: "v-popup-btn" });
      }
    }
    actions.push({ label: "🔙 Voltar", action: "cancel", cls: "v-popup-btn v-popup-btn--dim" });
    vPopup.show({ id: "plaza-event", header: "⚒️ Trabalho", body: body, actions: actions, closeOnOutside: false });
  }

  function _showWorkResult(d) {
    if (!d.narrative) { console.error("[PLAZA] _showWorkResult: missing narrative", d); }
    var cls = d.success ? "v-popup-header--success" : "v-popup-header--warning";
    var body = "<div class=\"v-popup-desc\">" + vEsc(d.narrative) + "</div>";
    if (d.job_name) body += "<div class=\"v-popup-row\">⚒️ " + vEsc(d.job_name) + "</div>";
    body += _renderRewards(d.rewards);
    if (d.leveled) body += "<div class=\"v-popup-row v-popup-level-up\">🎉 <b>Nível acima!</b></div>";
    vPopup.show({ id: "plaza-event", header: d.title || "Trabalho", headerClass: cls, body: body,
      actions: [{ label: "🔙 Voltar", action: "cancel", cls: "v-popup-btn v-popup-btn--dim" }], closeOnOutside: false });
  }


  /* ===== CARTOGRAPHER ===== */

  function _showCartographer(d) {
    if (!d.tiers && !d.all_owned) { console.error("[PLAZA] _showCartographer: missing tiers/all_owned", d); }
    var body = "";
    if (d.greeting) body += "<div class=\"v-popup-desc\">" + vEsc(d.greeting) + "</div><div class=\"v-popup-divider\"></div>";
    body += "<div class=\"v-popup-row\">\ud83d\udcb0 Ouro: " + (d.gold || 0) + " 💰</div>";

    if (d.all_owned) {
      body += "<div class=\"v-popup-divider\"></div>";
      body += "<div class=\"v-popup-section-label\">\u2705 Cole\u00e7\u00e3o Completa!</div>";
      if (d.owned && d.owned.length) {
        for (var i = 0; i < d.owned.length; i++) {
          var o = d.owned[i];
          body += "<div class=\"v-popup-row\">" + (o.emoji || "\ud83d\uddfa\ufe0f") + " " + vEsc(o.name) + "</div>";
        }
      }
    } else {
      if (d.owned && d.owned.length) {
        body += "<div class=\"v-popup-divider\"></div>";
        body += "<div class=\"v-popup-section-label\">\u2705 Adquiridos</div>";
        for (var i = 0; i < d.owned.length; i++) {
          var o = d.owned[i];
          body += "<div class=\"v-popup-row\">" + (o.emoji || "\ud83d\uddfa\ufe0f") + " " + vEsc(o.name) + "</div>";
        }
      }
      if (d.tiers && d.tiers.length) {
        for (var t = 0; t < d.tiers.length; t++) {
          var tier = d.tiers[t];
          body += "<div class=\"v-popup-divider\"></div>";
          body += "<div class=\"v-popup-section-label\">" + (tier.icon || "") + " " + vEsc(tier.label) + "</div>";
          for (var j = 0; j < tier.items.length; j++) {
            var it = tier.items[j];
            var afford = (!it.affordable) ? " class=\"v-popup-unaffordable\"" : "";
            var hint = "";
            if (it.stat_hint) {
              var pct = (typeof it.stat_hint === "string") ? (parseInt(it.stat_hint.replace(/[^0-9]/g, ""), 10) || 50) : 50;
              hint = " " + _diffDot(pct) + " <small>" + vEsc(it.stat_hint) + "</small>";
            }
            body += "<div class=\"v-popup-row\"" + afford + ">";
            body += (it.emoji || "\ud83d\uddfa\ufe0f") + " " + vEsc(it.name) + " \u2014 " + it.price + " 💰" + hint;
            body += "</div>";
          }
        }
      }
      if (d.master) {
        body += "<div class=\"v-popup-divider\"></div>";
        body += "<div class=\"v-popup-section-label\">\ud83c\udf0d Mapa Mestre</div>";
        var mAfford = (!d.master.affordable) ? " class=\"v-popup-unaffordable\"" : "";
        body += "<div class=\"v-popup-row\"" + mAfford + ">\ud83c\udf0d Mapa Mestre \u2014 " + d.master.price + " 💰</div>";
      }
    }

    var actions = [];
    if (!d.all_owned) {
      if (d.tiers) {
        for (var t = 0; t < d.tiers.length; t++) {
          var tier = d.tiers[t];
          for (var j = 0; j < tier.items.length; j++) {
            var it = tier.items[j];
            if (it.affordable) {
              var lbl = (it.emoji || "\ud83d\uddfa\ufe0f") + " " + vEsc(it.name) + " (" + it.price + " 💰)";
              actions.push({ html: lbl, action: it.cb, cls: "v-popup-btn" });
            }
          }
        }
      }
      if (d.master && d.master.affordable) {
        actions.push({ label: "\ud83c\udf0d Mapa Mestre (" + d.master.price + " 💰)", action: d.master.cb, cls: "v-popup-btn" });
      }
    }
    actions.push({ label: "\ud83d\udd19 Voltar", action: "cancel", cls: "v-popup-btn v-popup-btn--dim" });
    vPopup.show({ id: "plaza-event", header: "\ud83d\uddfa\ufe0f " + vEsc(d.npc_name || "Cart\u00f3grafo"), body: body, actions: actions, closeOnOutside: false });
  }

  /* ===== ENTRY CHOICE ===== */

  function _showEntryChoice(d) {
    if (!d.choices || !d.choices.length) { console.error("[PLAZA] _showEntryChoice: missing choices", d); return; }
    var body = "<div class=\"v-popup-desc\">" + vEsc(d.desc) + "</div>";
    body += "<div class=\"v-popup-divider\"></div>";
    var actions = [];
    for (var i = 0; i < d.choices.length; i++) {
      var c = d.choices[i];
      var label = vEsc(c.label);
      if (c.stat_hint) {
        var pct = (typeof c.stat_hint === "string") ? (parseInt(c.stat_hint.replace(/[^0-9]/g, ""), 10) || 50) : 50;
        label += " " + _diffDot(pct) + " <small>" + vEsc(c.stat_hint) + "</small>";
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
    entry_choice: _showEntryChoice,
    cartographer_menu: _showCartographer
  };

  function _dispatch(data) {
    if (!data || !data.phase) { console.warn("[PLAZA] Missing data or phase", data); return; }
    var fn = _phases[data.phase];
    if (fn) { try { fn(data); } catch(e) { console.error("[PLAZA] Error in phase", data.phase, e); } }
    else console.warn("[PLAZA] Unknown phase:", data.phase);
  }

  window.renderPlazaEvent = _dispatch;
  window.showPlazaEventPopup = _dispatch;

})();
