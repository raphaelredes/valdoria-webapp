/* game-daily.js -- Daily login reward popup */
(function(){
'use strict';

function renderDailyReward(screen) {
    if (!screen.daily_reward) return;
    var r = screen.daily_reward;
    var itemsHtml = '';
    if (r.items && r.items.length > 0) {
        for (var i = 0; i < r.items.length; i++) {
            var item = r.items[i];
            itemsHtml += '<div class="daily-item">' + (item.name || item) + (item.qty > 1 ? ' x' + item.qty : '') + '</div>';
        }
    }
    var streakText = r.streak > 1
        ? '<div class="daily-streak">\uD83D\uDD25 ' + r.streak + ' dias consecutivos!</div>'
        : '<div class="daily-streak">\u2728 Primeiro dia da jornada!</div>';
    var recordHtml = r.is_new_record ? '<div class="daily-record">\uD83C\uDFC6 Novo recorde de streak!</div>' : '';
    var multiplierHtml = r.multiplier > 1 ? '<div class="daily-multiplier">\u00D7' + r.multiplier.toFixed(1) + ' b\u00F4nus de ciclo</div>' : '';
    var dayDots = '';
    for (var d = 1; d <= 7; d++) {
        var cls = d < r.day_in_cycle ? 'daily-dot done' : d === r.day_in_cycle ? 'daily-dot current' : 'daily-dot';
        dayDots += '<span class="' + cls + '">' + d + '</span>';
    }
    var bodyHtml = '<div class="daily-popup">' + streakText + '<div class="daily-cycle">' + dayDots + '</div>' + '<div class="daily-gold">\uD83D\uDCB0 ' + r.gold + ' GP</div>' + itemsHtml + multiplierHtml + recordHtml + '</div>';
    if (window.vPopup) {
        vPopup.show({ header: '\uD83C\uDF81 Recompensa Di\u00E1ria', headerClass: 'daily-header', body: bodyHtml, actions: '<button class="v-popup-btn" data-action="claim_daily">Coletar!</button>' });
    }
    if (typeof ValdoriaAudio !== 'undefined' && ValdoriaAudio.playSFX) ValdoriaAudio.playSFX('sfx_reward');
}

function renderStreakBadge(screen) {
    if (!screen.streak || screen.streak.streak <= 0) return;
    var s = screen.streak;
    var existing = document.querySelector('.streak-badge');
    if (existing) existing.remove();
    var badge = document.createElement('div');
    badge.className = 'streak-badge v-slide-in';
    badge.innerHTML = '\uD83D\uDD25 ' + s.streak;
    badge.title = 'Streak: ' + s.streak + ' dias | Recorde: ' + s.max_streak;
    if (s.has_reward) {
        badge.classList.add('streak-has-reward');
        badge.onclick = function() { doAction('claim_daily_reward'); };
    }
    var content = document.getElementById('content');
    if (content) content.insertBefore(badge, content.firstChild);
}

var _origRender = window.renderScreen;
if (_origRender) {
    window.renderScreen = function(screen) {
        _origRender(screen);
        if (screen && screen.daily_reward) setTimeout(function() { renderDailyReward(screen); }, 500);
        if (screen && screen.streak) renderStreakBadge(screen);
    };
}

document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-action="claim_daily"]');
    if (!btn) return;
    if (window.vPopup) vPopup.hide();
    doAction('claim_daily_reward');
});
})();
