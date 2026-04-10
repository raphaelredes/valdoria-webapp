/* LENDAS DE VALDORIA - LEAGUES & ACHIEVEMENTS RENDERER */
/* ES5 Compatible for maximum device support */

function renderLeagueData(container, data) {
    console.log("[LA] renderLeagueData:", data);
    var root = document.createElement("div");
    root.className = "sys-la slide-up";

    if (!data) {
        root.innerHTML = '<div style="padding:20px; text-align:center; color:var(--color-danger)">Erro: Dados da liga ausentes.</div>';
        container.appendChild(root);
        return;
    }

    if (data.view === "main") {
        var weeklyXpStr = (data.weekly_xp || 0).toLocaleString("pt-BR");
        var lastChangeHtml = "";
        if (data.last_change === "promoted") {
            lastChangeHtml = '<div class="la-info-row"><span class="la-value highlight" style="color:var(--color-success)">\u2b06\ufe0f Voc\u00ea subiu de liga!</span></div>';
        } else if (data.last_change === "demoted") {
            lastChangeHtml = '<div class="la-info-row"><span class="la-value highlight" style="color:var(--color-danger)">\u2b07\ufe0f Voc\u00ea foi rebaixado.</span></div>';
        }

        var rewardHtml = "";
        if (data.pending_reward) {
            rewardHtml = '<div class="la-reward-banner">' +
                '<div style="font-weight:bold; color:var(--color-gold); margin-bottom:4px;">\ud83c\udf81 Recompensa Dispon\u00edvel!</div>' +
                '<div>' + (data.pending_reward.title || "") + '</div>' +
                '<div style="font-size:var(--text-xl); margin-top:8px;">+' + (data.pending_reward.gold || 0) + ' <small>Valdoritas</small></div>' +
                '</div>';
        }

        var tiersListHtml = "";
        if (data.all_tiers) {
            for (var i = 0; i < data.all_tiers.length; i++) {
                var t = data.all_tiers[i];
                var isPlayer = t.id === data.tier;
                tiersListHtml += '<div class="la-list-item ' + (isPlayer ? "is-player" : "") + '">' +
                    '<div class="la-item-left">' +
                    '<span style="font-size:1.5rem">' + (t.icon || "") + '</span>' +
                    '<span class="la-item-name">' + (t.name || "") + '</span>' +
                    '</div>' +
                    '<div class="la-item-rank">' + (isPlayer ? "\u25c4 Atual" : "") + '</div>' +
                    '</div>';
            }
        }

        root.innerHTML = '<div class="la-card glow-gold">' +
            '<div class="la-tier-header">' +
            '<div class="la-tier-icon">' + (data.tier_icon || "") + '</div>' +
            '<div class="la-tier-title">' + (data.tier_name || "Liga") + '</div>' +
            '</div>' +
            '<div class="la-info-row">' +
            '<span class="la-label">XP nesta semana:</span>' +
            '<span class="la-value highlight">' + weeklyXpStr + ' XP</span>' +
            '</div>' +
            lastChangeHtml +
            rewardHtml +
            '<div class="la-label" style="text-align:center; padding: 12px 0; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 12px;">Top 10 sobem. \u00daltimos 5 descem.</div>' +
            '</div>' +
            '<div style="margin-top:20px;">' +
            '<h3 style="font-family:var(--font-header);margin-bottom:12px;color:var(--color-gold)">Progress\u00e3o de Ligas</h3>' +
            '<div class="la-list">' +
            tiersListHtml +
            '</div>' +
            '</div>';
    } 
    else if (data.view === "standings") {
        var standingsHtml = "";
        if (data.standings && data.standings.length > 0) {
            for (var j = 0; j < data.standings.length; j++) {
                var s = data.standings[j];
                var rank = j + 1;
                var isMe = s.user_id === data.player_id;
                var icon = rank === 1 ? "\ud83e\udd47" : rank === 2 ? "\ud83e\udd48" : rank === 3 ? "\ud83e\udd49" : rank + ".";
                var xp = (s.weekly_xp || 0).toLocaleString("pt-BR");
                
                var zoneClass = "";
                if (rank <= 10) zoneClass = "la-zone-promo";
                else if (rank > (data.total_players - 5) && data.total_players > 15) zoneClass = "la-zone-demo";

                standingsHtml += '<div class="la-list-item ' + (isMe ? 'is-player ' : '') + zoneClass + '">' +
                    '<div class="la-item-left">' +
                    '<span class="la-item-rank">' + icon + '</span>' +
                    '<span class="la-item-name">' + s.name + '</span>' +
                    '</div>' +
                    '<span class="la-item-score">' + xp + ' XP</span>' +
                    '</div>';
            }
        } else {
            standingsHtml = '<div style="text-align:center; padding: 20px; color:var(--v-text-dim)">Nenhum jogador pontuou ainda.</div>';
        }

        var playerRankHtml = "";
        if (data.player_rank > 15) {
            playerRankHtml = '<div class="la-list-item is-player" style="margin-top:8px;">' +
                '<div class="la-item-left">' +
                '<span class="la-item-rank">' + data.player_rank + '.</span>' +
                '<span class="la-item-name">Sua Posi\u00e7\u00e3o</span>' +
                '</div>' +
                '</div>';
        }

        root.innerHTML = '<div class="caption pulse-slow" style="text-align:center; margin-bottom:16px;">' +
            'Temporada em andamento -- Encerra toda Segunda-Feira.' +
            '</div>' +
            '<div class="la-card">' +
            '<div class="la-list">' +
            standingsHtml +
            playerRankHtml +
            '</div>' +
            '</div>' +
            '<div class="la-legend" style="display:flex; justify-content:center; gap:16px; margin-top:16px; font-size:12px; opacity:0.8;">' +
            '<span><span style="color:#4ade80">\u25cf</span> Top 10 Sobe</span>' +
            '<span><span style="color:#f87171">\u25cf</span> Z-5 Desce</span>' +
            '</div>';
    }
    else if (data.view === "claim") {
        var rankIcon = data.rank === 1 ? "\ud83e\udd47" : data.rank === 2 ? "\ud83e\udd48" : data.rank === 3 ? "\ud83e\udd49" : "\ud83c\udf96\ufe0f";
        root.innerHTML = '<div class="la-card" style="text-align:center;">' +
            '<h2 style="color:var(--color-gold); font-family:var(--font-header);">Recompensa Coletada!</h2>' +
            '<div style="font-size:4rem; margin:10px 0; font-family:monospace; line-height:1;">' + rankIcon + '</div>' +
            '<div style="font-size:var(--text-lg); font-weight:bold; margin-bottom:16px;">' + data.title + '</div>' +
            '<div style="font-size:var(--text-3xl); color:var(--color-gold); text-shadow:0 0 10px rgba(184,134,11,0.5);">+' + (data.gold || 0).toLocaleString("pt-BR") + ' <small style="font-size:0.5em;">VD</small></div>' +
            '</div>';
    }

    container.appendChild(root);
}

function renderAchievementsData(container, data) {
    console.log("[LA] renderAchievementsData:", data);
    var root = document.createElement("div");
    root.className = "sys-la slide-up";

    if (!data) {
        root.innerHTML = '<div style="padding:20px; text-align:center; color:var(--color-danger)">Erro: Dados de conquistas ausentes.</div>';
        container.appendChild(root);
        return;
    }

    if (data.view === "main") {
        var pct = 0;
        if (data.total > 0) {
            pct = Math.floor((data.unlocked / data.total) * 100);
        }

        var categoriesHtml = "";
        if (data.categories) {
            for (var k = 0; k < data.categories.length; k++) {
                var cat = data.categories[k];
                categoriesHtml += '<button class="la-cat-btn" onclick="doAction(\'ach_cat_' + cat.id + '\')">' +
                    '<div class="la-cat-icon">' + cat.icon + '</div>' +
                    '<div class="la-cat-name">' + cat.name + '</div>' +
                    '<div class="la-cat-counts">' + cat.done + ' / ' + cat.total + '</div>' +
                    '</button>';
            }
        }

        root.innerHTML = '<div class="la-card">' +
            '<div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px;">' +
            '<span style="font-family:var(--font-header); font-size:var(--text-xl); color:var(--color-gold)">Progresso Global</span>' +
            '<span style="font-family:monospace; color:var(--color-gray-300)">' + data.unlocked + '/' + data.total + ' -- ' + pct + '%</span>' +
            '</div>' +
            '<div class="la-progress-container">' +
            '<div class="la-progress-fill" style="width: 0%;"></div>' +
            '</div>' +
            '</div>' +
            '<h3 style="font-family:var(--font-header); margin: 20px 0 12px; color:var(--color-gray-300);">Categorias</h3>' +
            '<div class="la-cat-grid">' +
            categoriesHtml +
            '</div>';

        // Animate after render
        setTimeout(function() {
            var pb = root.querySelector('.la-progress-fill');
            if (pb) pb.style.width = pct + "%";
        }, 100);

    } else if (data.view === "category") {
        var TIERS = { "bronze": "\ud83e\udd49", "prata": "\ud83e\udd48", "ouro": "\ud83e\udd47", "": "" };
        var achsHtml = "";
        
        if (data.achievements && data.achievements.length > 0) {
            for (var m = 0; m < data.achievements.length; m++) {
                var ach = data.achievements[m];
                var isDone = ach.unlocked;
                var tierIcon = TIERS[ach.tier] || "";
                achsHtml += '<div class="la-ach-item ' + (isDone ? 'unlocked' : '') + '">' +
                    '<div class="la-ach-icon">' + (isDone ? ach.icon : "\ud83d\udd12") + '</div>' +
                    '<div class="la-ach-content">' +
                    '<div class="la-ach-title">' +
                    '<span>' + (ach.name || "Conquista") + ' ' + tierIcon + '</span>' +
                    (isDone ? "<span>\u2705</span>" : "") +
                    '</div>' +
                    '<div class="la-ach-desc">' + (ach.desc || "") + '</div>' +
                    '</div>' +
                    '</div>';
            }
        } else {
            achsHtml = '<div style="text-align:center; padding: 40px 20px; color:var(--v-text-dim)">Nenhuma conquista ativa nesta categoria.</div>';
        }

        root.innerHTML = '<div class="la-list">' + achsHtml + '</div>';
    } else {
        // Fallback for debugging
        root.innerHTML = '<div style="padding:20px;">' +
            '<h3 style="color:var(--color-gold)">DEBUG: View Desconhecida</h3>' +
            '<div style="font-size:12px; margin-bottom:10px;">View ID: ' + (data.view || "null") + '</div>' +
            '<pre style="font-size:10px; background:rgba(0,0,0,0.3); padding:10px; overflow:auto; max-height:200px;">' + 
            JSON.stringify(data, null, 2) + '</pre></div>';
    }

    // Debug alert + banner removed (2026-04-10 audit #61 - categoria D)
    container.innerHTML = ""; // Clear previous content
    container.appendChild(root);
}
