(function(){
"use strict";

var _activeFooterPopup = null;

window._isFooterPopupActive = function(id) {
    return _activeFooterPopup === id && vPopup.isOpen();
}

window._closeFooterPopup = function() {
    _activeFooterPopup = null;
    vPopup.hide();
}

function _renderToHtml(renderFn, data) {
    var container = document.createElement("div");
    renderFn(container, data);
    return container.innerHTML;
}

function _attachActionClicks(popupEl) {
    if (!popupEl) return;
    var btns = popupEl.querySelectorAll("[data-cb]");
    for (var i = 0; i < btns.length; i++) {
        (function(btn) {
            var cb = btn.getAttribute("data-cb");
            if (cb) {
                btn.onclick = function() {
                    if (typeof doAction === "function") doAction(cb);
                };
            }
        })(btns[i]);
    }
}

function _buildActionsHtml(data) {
    var html = "";
    if (data.actions && data.actions.length > 0) {
        for (var i = 0; i < data.actions.length; i++) {
            var a = data.actions[i];
            var label = a.label || a.text || a.name || "???";
            var cb = a.cb || a.callback || a.callback_data || "";
            html += "<button class=\"v-popup-btn\" data-cb=\"" + cb + "\">" + label + "</button>";
        }
    }
    html += "<button class=\"v-popup-btn v-popup-btn--cancel\" data-action=\"cancel\">Voltar</button>";
    return html;
}

/* ====== SKILLS LIST ====== */
window._showSkillsPopup = function(data) {
    var body = _renderToHtml(renderSkillsList, data.skills_data);
    _activeFooterPopup = "skills";
    vPopup.show({
        header: "Habilidades",
        body: body,
        actions: "<button class=\"v-popup-btn v-popup-btn--cancel\" data-action=\"cancel\">Voltar</button>",
        onAction: function(action) {
            if (action !== "cancel" && typeof doAction === "function") doAction(action);
        },
        onHide: function() { _activeFooterPopup = null; },
        onReady: function(el) {
            var cards = el.querySelectorAll(".skill-card");
            for (var i = 0; i < cards.length; i++) {
                (function(card) {
                    var cb = card.getAttribute("data-cb");
                    if (cb) {
                        card.onclick = function() {
                            if (typeof doAction === "function") doAction(cb);
                        };
                    }
                })(cards[i]);
            }
        }
    });
};

/* ====== SKILL DETAIL ====== */
window._showSkillDetailPopup = function(data) {
    var d = data.skill_detail_data;
    var body = _renderToHtml(renderSkillDetail, d);
    var headerText = (d.icon || "") + " " + (d.name || "Habilidade");
    vPopup.show({
        header: headerText,
        body: body,
        actions: "<button class=\"v-popup-btn v-popup-btn--cancel\" data-action=\"cancel\">Voltar</button>",
        onAction: function(action) {
            if (action !== "cancel" && typeof doAction === "function") doAction(action);
        }
    });
};

/* ====== CHARACTER DETAILS (FICHA) ====== */
window._showCharDetailsPopup = function(data) {
    var body = "";
    if (typeof renderCharDetails === "function") {
        body = _renderToHtml(renderCharDetails, data.char_details);
    } else {
        body = "<div style=\"padding:12px;color:var(--v-text);\">Dados do personagem indisponíveis.</div>";
    }
    _activeFooterPopup = "char-details";
    vPopup.show({
        header: "Ficha do Personagem",
        body: body,
        actions: "<button class=\"v-popup-btn v-popup-btn--cancel\" data-action=\"cancel\">Voltar</button>",
        onAction: function(action) {
            if (action !== "cancel" && typeof doAction === "function") doAction(action);
        },
        onHide: function() { _activeFooterPopup = null; },
        onReady: function(el) { _attachActionClicks(el); }
    });
};

/* ====== ALLIES / PARTY (GRUPO) ====== */
window._showAlliesPopup = function(data) {
    var body = "";
    if (typeof renderAllies === "function") {
        body = _renderToHtml(renderAllies, data);
    } else {
        body = "<div style=\"padding:12px;\">";
        for (var i = 0; i < data.allies.length; i++) {
            var a = data.allies[i];
            body += "<div style=\"padding:6px 0;border-bottom:1px solid var(--v-border,#4a3828);\">";
            body += "<b>" + (a.name || "Aliado") + "</b>";
            if (a.class_name) body += " - " + a.class_name;
            if (a.level) body += " Nv." + a.level;
            body += "</div>";
        }
        body += "</div>";
    }
    var actionsHtml = _buildActionsHtml(data);
    _activeFooterPopup = "allies";
    vPopup.show({
        header: "Grupo",
        body: body,
        actions: actionsHtml,
        onAction: function(action) {
            if (action !== "cancel" && typeof doAction === "function") doAction(action);
        },
        onHide: function() { _activeFooterPopup = null; },
        onReady: function(el) { _attachActionClicks(el); }
    });
};

/* ====== MEMBER DETAIL ====== */
window._showMemberDetailPopup = function(data) {
    var d = data.member_detail;
    var body = "";
    if (typeof renderMemberDetail === "function") {
        body = _renderToHtml(renderMemberDetail, d);
    } else {
        body = "<div style=\"padding:12px;color:var(--v-text);\">";
        body += "<div><b>" + (d.name || "Membro") + "</b></div>";
        if (d.class_name) body += "<div>" + d.class_name + " Nv." + (d.level || "?") + "</div>";
        if (d.hp !== undefined) body += "<div>HP: " + d.hp + "/" + (d.max_hp || d.hp) + "</div>";
        body += "</div>";
    }
    var actionsHtml = _buildActionsHtml(data);
    vPopup.show({
        header: (d.name || "Membro do Grupo"),
        body: body,
        actions: actionsHtml,
        onAction: function(action) {
            if (action !== "cancel" && typeof doAction === "function") doAction(action);
        },
        onReady: function(el) { _attachActionClicks(el); }
    });
};

/* ====== QUEST TURNIN ====== */
window._showQuestTurninPopup = function(data) {
    var d = data.quest_turnin;
    var body = "<div style=\"padding:12px;color:var(--v-text);\">";
    if (d.title) body += "<div style=\"font-size:16px;font-weight:bold;margin-bottom:8px;\">" + d.title + "</div>";
    if (d.text) body += "<div style=\"margin-bottom:12px;line-height:1.5;\">" + d.text + "</div>";
    if (d.rewards) {
        body += "<div style=\"margin-top:8px;padding:8px;background:rgba(0,0,0,0.2);border-radius:8px;\">";
        body += "<div style=\"font-weight:bold;margin-bottom:4px;\">Recompensas:</div>";
        if (typeof d.rewards === "string") {
            body += "<div>" + d.rewards + "</div>";
        } else if (Array.isArray(d.rewards)) {
            for (var i = 0; i < d.rewards.length; i++) {
                body += "<div>" + d.rewards[i] + "</div>";
            }
        }
        body += "</div>";
    }
    body += "</div>";
    var actionsHtml = _buildActionsHtml(data);
    vPopup.show({
        header: "Entrega de Missão",
        body: body,
        actions: actionsHtml,
        onAction: function(action) {
            if (action !== "cancel" && typeof doAction === "function") doAction(action);
        },
        onReady: function(el) { _attachActionClicks(el); }
    });
};

/* ====== INN SELECT ====== */
window._showInnSelectPopup = function(data) {
    var d = data.inn_select;
    var body = "<div style=\"padding:12px;color:var(--v-text);\">";
    if (d.text) body += "<div style=\"margin-bottom:12px;line-height:1.5;\">" + d.text + "</div>";
    if (d.options && d.options.length > 0) {
        for (var i = 0; i < d.options.length; i++) {
            var opt = d.options[i];
            body += "<div data-cb=\"" + (opt.cb || "") + "\" style=\"padding:10px;margin:6px 0;background:var(--v-bg-card,#2e2520);border:1px solid var(--v-border,#4a3828);border-radius:8px;cursor:pointer;\">";
            body += "<b>" + (opt.label || opt.name || opt.text || "") + "</b>";
            if (opt.price) body += " <span style=\"color:var(--v-gold,#c8a84e);\">" + opt.price + " GP</span>";
            if (opt.desc) body += "<div style=\"font-size:12px;color:var(--v-text-dim,#a09484);margin-top:4px;\">" + opt.desc + "</div>";
            body += "</div>";
        }
    }
    body += "</div>";
    vPopup.show({
        header: "Estalagem",
        body: body,
        actions: "<button class=\"v-popup-btn v-popup-btn--cancel\" data-action=\"cancel\">Voltar</button>",
        onAction: function(action) {
            if (action !== "cancel" && typeof doAction === "function") doAction(action);
        },
        onReady: function(el) { _attachActionClicks(el); }
    });
};

/* ====== REFERRAL ====== */
window._showReferralPopup = function(data) {
    var d = data.referral_data;
    var body = "<div style=\"padding:12px;color:var(--v-text);\">";
    if (d.text) body += "<div style=\"margin-bottom:12px;line-height:1.5;\">" + d.text + "</div>";
    if (d.code) body += "<div style=\"text-align:center;padding:12px;margin:8px 0;background:rgba(0,0,0,0.3);border-radius:8px;font-size:18px;font-weight:bold;color:var(--v-gold,#c8a84e);\">" + d.code + "</div>";
    if (d.stats) body += "<div style=\"margin-top:8px;font-size:13px;color:var(--v-text-dim,#a09484);\">" + d.stats + "</div>";
    body += "</div>";
    vPopup.show({
        header: "Convite",
        body: body,
        actions: "<button class=\"v-popup-btn v-popup-btn--cancel\" data-action=\"cancel\">Voltar</button>",
        onAction: function(action) {
            if (action !== "cancel" && typeof doAction === "function") doAction(action);
        }
    });
};

})();
