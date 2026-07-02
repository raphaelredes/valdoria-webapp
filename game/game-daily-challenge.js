/**
 * game-daily-challenge.js — AAA renderer pra Desafio Diário (refatorado 2026-05-27).
 * Sistema NOVO: objetivo único kill/find com auto-track (sem botão "Iniciar").
 *
 * Data shape (de handlers.py _daily_challenge):
 *   { state: 'completed'|'locked'|'active',
 *     objective: {id, type, target_id, target_display, count, description, flavor, min_level},
 *     progress, count, pct, theme_icon, theme_label, theme_color,
 *     min_level, player_level, xp_est, gold_est, total_completed, texts }
 */
(function () {
'use strict';

window.renderDailyChallenge = function (el, dc) {
    if (!el || !dc) return;

    var state = dc.state || 'active';
    var obj = dc.objective || {};
    var texts = dc.texts || {};
    var themeIcon = dc.theme_icon || '';
    var themeLabel = dc.theme_label || '';
    var themeColor = dc.theme_color || '#c4953a';

    var html = '<div class="dc-root" style="display:flex;flex-direction:column;gap:12px;padding:4px;">';

    // BANNER ÉPICO com PNG backdrop
    html += '<div class="dc-banner" style="position:relative;height:100px;overflow:hidden;'
        + 'border-radius:8px;border:1px solid ' + themeColor + ';'
        + 'box-shadow:0 0 16px rgba(196,149,58,0.25),inset 0 0 30px rgba(0,0,0,0.5);">'
        + '<img src="../shared/img/city/daily_challenge.webp" '
        + 'onerror="this.onerror=null;this.src=\'../shared/img/city/daily_challenge.webp\';" '
        + 'alt="" style="width:100%;height:100%;object-fit:cover;opacity:0.55;">'
        + '<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;'
        + 'background:linear-gradient(180deg,rgba(42,36,32,0.4) 0%,rgba(42,36,32,0.85) 100%);text-align:center;">'
        + '<div style="font-size:28px;line-height:1;text-shadow:0 0 12px ' + themeColor + ';">' + themeIcon + '</div>'
        + '<div style="font-family:var(--v-font-display,Cinzel,serif);font-size:calc(15px * var(--v-font-scale, 1));'
        + 'color:var(--v-gold,#c4953a);font-weight:700;letter-spacing:2px;text-transform:uppercase;'
        + 'text-shadow:0 0 10px rgba(196,149,58,0.6),0 2px 4px rgba(0,0,0,0.8);margin-top:4px;">'
        + (texts.title || 'Desafio Diário') + '</div>'
        + (themeLabel ? '<div style="font-size:calc(10px * var(--v-font-scale, 1));color:var(--v-text-dim,#a09484);'
            + 'letter-spacing:1px;text-transform:uppercase;margin-top:2px;">' + themeLabel + '</div>' : '')
        + '</div></div>';

    // LOCKED STATE
    if (state === 'locked') {
        html += '<div class="dc-locked" style="text-align:center;padding:20px 12px;'
            + 'background:rgba(196,83,74,0.08);border:1px solid rgba(196,83,74,0.30);border-radius:6px;">'
            + '<div style="font-family:var(--v-font-display,Cinzel,serif);font-size:calc(13px * var(--v-font-scale, 1));color:#c4534a;letter-spacing:2px;margin-bottom:8px;">BLOQUEADO</div>'
            + '<div style="font-size:calc(12px * var(--v-font-scale, 1));color:var(--v-text,#d4c8b0);">'
            + (texts.level_too_low || 'Nível insuficiente para o desafio de hoje.') + '</div>'
            + '<div style="margin-top:8px;font-size:calc(11px * var(--v-font-scale, 1));color:var(--v-gold,#c4953a);">'
            + 'Necessário: <b>Nível ' + dc.min_level + '</b> · Seu nível: ' + dc.player_level
            + '</div></div></div>';
        el.innerHTML = html;
        return;
    }

    // COMPLETED STATE
    if (state === 'completed') {
        html += '<div class="dc-completed" style="text-align:center;padding:20px 12px;'
            + 'background:linear-gradient(180deg,rgba(124,219,124,0.12) 0%,rgba(42,36,32,0.4) 100%);'
            + 'border:1px solid #7cdb7c;border-radius:6px;'
            + 'box-shadow:inset 0 0 18px rgba(124,219,124,0.20),0 0 22px rgba(124,219,124,0.35);">'
            + '<div style="font-size:32px;margin-bottom:6px;text-shadow:0 0 12px #7cdb7c;">✓</div>'
            + '<div style="font-family:var(--v-font-display,Cinzel,serif);font-size:calc(14px * var(--v-font-scale, 1));'
            + 'color:#7cdb7c;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">'
            + (texts.completed_title || 'Desafio Completado!') + '</div>'
            + '<div style="margin-top:8px;font-size:calc(12px * var(--v-font-scale, 1));color:var(--v-text-dim,#a09484);font-style:italic;line-height:1.4;">'
            + (texts.completed_msg || 'Você completou o desafio de hoje. Volte amanhã!') + '</div>';

        if (dc.total_completed > 0) {
            html += '<div style="margin-top:12px;padding:8px;background:rgba(0,0,0,0.3);border-radius:4px;'
                + 'font-size:calc(11px * var(--v-font-scale, 1));color:var(--v-gold,#c4953a);">'
                + (texts.completed_total_label || 'Total Completados') + ': <b>' + dc.total_completed + '</b></div>';
        }
        html += '</div></div>';
        el.innerHTML = html;
        return;
    }

    // ACTIVE STATE — Objetivo
    html += '<div class="dc-objective" style="padding:12px;'
        + 'background:linear-gradient(180deg,rgba(196,149,58,0.10) 0%,rgba(42,36,32,0.5) 100%);'
        + 'border:1px solid var(--v-gold,#c4953a);border-radius:6px;'
        + 'box-shadow:inset 0 0 14px rgba(196,149,58,0.15);">'
        + '<div style="font-family:var(--v-font-display,Cinzel,serif);font-size:calc(10px * var(--v-font-scale, 1));'
        + 'color:var(--v-gold,#c4953a);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;opacity:0.8;">'
        + (texts.objective_label || 'Objetivo') + '</div>'
        + '<div style="font-size:calc(13px * var(--v-font-scale, 1));color:var(--v-text,#d4c8b0);'
        + 'line-height:1.4;font-weight:600;">'
        + (obj.description || '???') + '</div>';

    if (obj.flavor) {
        html += '<div style="margin-top:8px;font-size:calc(11px * var(--v-font-scale, 1));color:var(--v-text-dim,#a09484);'
            + 'font-style:italic;line-height:1.4;border-top:1px dotted rgba(196,149,58,0.25);padding-top:6px;">'
            + '"' + obj.flavor + '"</div>';
    }
    html += '</div>';

    // BARRA DE PROGRESSO
    var pct = dc.pct || 0;
    var progressColor = pct >= 100 ? '#7cdb7c' : '#c4953a';
    html += '<div class="dc-progress">'
        + '<div style="display:flex;justify-content:space-between;font-size:calc(11px * var(--v-font-scale, 1));'
        + 'color:var(--v-text-dim,#a09484);margin-bottom:4px;letter-spacing:0.6px;text-transform:uppercase;">'
        + '<span>' + (texts.progress_label || 'Progresso') + '</span>'
        + '<span style="color:' + progressColor + ';font-weight:700;font-size:calc(13px * var(--v-font-scale, 1));">'
        + dc.progress + ' / ' + dc.count + '</span>'
        + '</div>'
        + '<div style="position:relative;height:10px;background:rgba(0,0,0,0.5);'
        + 'border-radius:5px;overflow:hidden;border:1px solid var(--v-border,#4a3828);'
        + 'box-shadow:inset 0 1px 2px rgba(0,0,0,0.5);">'
        + '<div style="height:100%;width:' + pct + '%;'
        + 'background:linear-gradient(90deg,#9a7530,' + progressColor + ',#e8c45a);'
        + 'box-shadow:0 0 8px ' + progressColor + ';transition:width 0.6s ease;"></div>'
        + '</div></div>';

    // DICA AUTO-TRACK
    var trackHint = obj.type === 'kill'
        ? 'Cada inimigo abatido conta automaticamente.'
        : 'Itens encontrados são contados quando você abre o desafio.';
    html += '<div class="dc-hint" style="text-align:center;font-size:calc(11px * var(--v-font-scale, 1));'
        + 'color:var(--v-gold-dim,#8f7338);font-style:italic;padding:4px 8px;">'
        + trackHint + '</div>';

    // RECOMPENSAS
    html += '<div class="dc-rewards" style="padding:10px 12px;'
        + 'background:rgba(196,149,58,0.08);border:1px solid rgba(196,149,58,0.25);border-radius:6px;">'
        + '<div style="font-family:var(--v-font-display,Cinzel,serif);font-size:calc(10px * var(--v-font-scale, 1));'
        + 'color:var(--v-gold,#c4953a);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;text-align:center;">'
        + (texts.rewards_section || 'Recompensas Estimadas') + '</div>'
        + '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">'
        + '<span style="display:inline-flex;align-items:center;gap:3px;padding:6px 12px;'
        + 'background:rgba(196,149,58,0.15);border:1px solid rgba(196,149,58,0.40);'
        + 'border-radius:14px;color:var(--v-gold,#c4953a);font-weight:700;'
        + 'font-size:calc(12px * var(--v-font-scale, 1));">'
        + '◆ ' + dc.xp_est + ' XP</span>'
        + '<span style="display:inline-flex;align-items:center;gap:3px;padding:6px 12px;'
        + 'background:rgba(196,149,58,0.15);border:1px solid rgba(196,149,58,0.40);'
        + 'border-radius:14px;color:var(--v-gold,#c4953a);font-weight:700;'
        + 'font-size:calc(12px * var(--v-font-scale, 1));">'
        + dc.gold_est + ' <span class="vi vi-coin sm"></span></span>'
        + '</div></div>';

    if (dc.total_completed > 0) {
        html += '<div class="dc-stats" style="text-align:center;padding:6px;'
            + 'font-size:calc(10px * var(--v-font-scale, 1));color:var(--v-text-dim,#a09484);'
            + 'border-top:1px dotted var(--v-gold-20, rgba(196,149,58,0.2));">'
            + (texts.completed_total_label || 'Total Completados') + ': '
            + '<b style="color:var(--v-gold,#c4953a);">' + dc.total_completed + '</b></div>';
    }

    html += '</div>';
    el.innerHTML = html;
};

})();
