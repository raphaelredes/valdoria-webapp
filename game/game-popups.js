(function(){
"use strict";

window._activeFooterPopup = null;

window._isFooterPopupActive = function(id) {
    return _activeFooterPopup === id && vPopup.isOpen();
};

window._closeFooterPopup = function() {
    _activeFooterPopup = null;
    vPopup.hide();
};

function _buildActionsHtml(data) {
    var html = "";
    if (data.actions && data.actions.length > 0) {
        for (var i = 0; i < data.actions.length; i++) {
            var a = data.actions[i];
            var label = a.label || a.text || a.name || "???";
            var cb = a.cb || a.callback || a.callback_data || "";
            html += '<button class="v-popup-btn" data-action="' + cb + '">' + label + '</button>';
        }
    }
    html += '<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">Fechar</button>';
    return html;
}

function _onActionOrDispatch(action) {
    if (action !== "cancel" && typeof doAction === "function") { doAction(action); return true; }
}
window._onActionOrDispatch = _onActionOrDispatch;

/* ====== SKILLS LIST ====== */
window._showSkillsPopup = function(data) {
    var bodyEl = document.createElement("div");
    renderSkillsList(bodyEl, data.skills_data);
    _activeFooterPopup = "skills";
    vPopup.show({
        header: "Habilidades",
        bodyEl: bodyEl,
        actions: '<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">Fechar</button>',
        onAction: _onActionOrDispatch,
        onHide: function() { _activeFooterPopup = null; }
    });
};

/* ====== SKILL DETAIL ====== */
window._showSkillDetailPopup = function(data) {
    var d = data.skill_detail_data;
    var bodyEl = document.createElement("div");
    renderSkillDetail(bodyEl, d);
    var headerText = (d.icon || "") + " " + (d.name || "Habilidade");
    vPopup.show({
        header: headerText,
        bodyEl: bodyEl,
        actions: '<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">Fechar</button>',
        onAction: _onActionOrDispatch
    });
};

/* ====== CHARACTER DETAILS (FICHA) ====== */
window._showCharDetailsPopup = function(data) {
    var bodyEl = document.createElement("div");
    if (typeof renderCharDetails === "function") {
        renderCharDetails(bodyEl, data.char_details);
    } else {
        bodyEl.className = "v-popup-desc";
        bodyEl.textContent = "Dados do personagem indisponíveis.";
    }
    _activeFooterPopup = "char-details";
    vPopup.show({
        header: "Ficha do Personagem",
        bodyEl: bodyEl,
        actions: '<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">Fechar</button>',
        onAction: _onActionOrDispatch,
        onHide: function() { _activeFooterPopup = null; }
    });
};

/* ====== ALLIES / PARTY (GRUPO) ====== */
window._showAlliesPopup = function(data) {
    var bodyEl = document.createElement("div");
    if (typeof renderAllies === "function") {
        renderAllies(bodyEl, data);
    } else {
        bodyEl.className = "v-popup-body-inner";
        for (var i = 0; i < data.allies.length; i++) {
            var a = data.allies[i];
            var row = document.createElement("div");
            row.className = "v-popup-row";
            var text = a.name || "Aliado";
            if (a.class_name) text += " - " + a.class_name;
            if (a.level) text += " Nv." + a.level;
            row.innerHTML = "<b>" + vEsc(text) + "</b>";
            bodyEl.appendChild(row);
        }
    }
    var actionsHtml = _buildActionsHtml(data);
    _activeFooterPopup = "allies";
    vPopup.show({
        header: "Grupo",
        bodyEl: bodyEl,
        actions: actionsHtml,
        onAction: _onActionOrDispatch,
        onHide: function() { _activeFooterPopup = null; }
    });
};

/* ====== MEMBER DETAIL ====== */
window._showMemberDetailPopup = function(data) {
    var d = data.member_detail;
    var bodyEl = document.createElement("div");
    if (typeof renderMemberDetail === "function") {
        renderMemberDetail(bodyEl, d);
    } else {
        bodyEl.className = "v-popup-desc";
        var text = (d.name || "Membro");
        if (d.class_name) text += " - " + d.class_name + " Nv." + (d.level || "?");
        if (d.hp !== undefined) text += " | HP: " + d.hp + "/" + (d.max_hp || d.hp);
        bodyEl.textContent = text;
    }
    var actionsHtml = _buildActionsHtml(data);
    vPopup.show({
        header: (d.name || "Membro do Grupo"),
        bodyEl: bodyEl,
        actions: actionsHtml,
        onAction: _onActionOrDispatch
    });
};

/* ====== INN SELECT ====== */
window._showInnSelectPopup = function(data) {
    var d = data.inn_select;
    var bodyEl = document.createElement("div");
    if (typeof renderInnSelect === "function") {
        renderInnSelect(bodyEl, d);
    } else {
        bodyEl.className = "v-popup-body-inner";
        if (d.text) {
            var intro = document.createElement("div");
            intro.className = "v-popup-desc";
            intro.textContent = d.text;
            bodyEl.appendChild(intro);
        }
        if (d.options && d.options.length > 0) {
            for (var i = 0; i < d.options.length; i++) {
                var opt = d.options[i];
                var card = document.createElement("div");
                card.className = "v-popup-row";
                card.style.cursor = "pointer";
                var label = opt.label || opt.name || opt.text || "";
                var html = "<b>" + vEsc(label) + "</b>";
                if (opt.price) html += ' <span class="v-popup-gold">' + vEsc(opt.price) + " GP</span>";
                if (opt.desc) html += '<div class="v-popup-subdesc">' + vEsc(opt.desc) + "</div>";
                card.innerHTML = html;
                (function(cb) {
                    card.onclick = function() {
                        if (cb && typeof doAction === "function") doAction(cb);
                    };
                })(opt.cb);
                bodyEl.appendChild(card);
            }
        }
    }
    vPopup.show({
        header: "Estalagem",
        bodyEl: bodyEl,
        actions: '<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">Fechar</button>',
        onAction: _onActionOrDispatch
    });
};

/* ====== REFERRAL ====== */
window._showReferralPopup = function(data) {
    var d = data.referral_data;
    var bodyEl = document.createElement("div");
    bodyEl.className = "v-popup-body-inner";
    if (d.text) {
        var intro = document.createElement("div");
        intro.className = "v-popup-desc";
        intro.textContent = d.text;
        bodyEl.appendChild(intro);
    }
    if (d.code) {
        var codeEl = document.createElement("div");
        codeEl.className = "v-popup-highlight";
        codeEl.textContent = d.code;
        bodyEl.appendChild(codeEl);
    }
    if (d.stats) {
        var statsEl = document.createElement("div");
        statsEl.className = "v-popup-subdesc";
        statsEl.textContent = d.stats;
        bodyEl.appendChild(statsEl);
    }
    vPopup.show({
        header: "Convite",
        bodyEl: bodyEl,
        actions: '<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">Fechar</button>',
        onAction: _onActionOrDispatch
    });
};

})();
