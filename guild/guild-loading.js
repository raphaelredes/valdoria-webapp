(function() {
    var TIPS = [
        'O cheiro de couro e tinta de pergaminho permeia o salao da guilda...',
        'Aventureiros conversam aos sussurros sobre tesouros escondidos...',
        'O quadro de missoes esta repleto de pedidos de ajuda...',
        'Armas e escudos adornam as paredes do salao como trofeus...',
        'Uma lareira crepita no centro, aquecendo os bravos aventureiros...',
        'O registro da guilda guarda historias de incontaveis jornadas...',
        'Mapas antigos e diarios de campo cobrem a grande mesa central...',
        'O mestre da guilda examina os contratos com olhar atento...',
    ];
    var tipEl = document.getElementById('loading-tip');
    var progressEl = document.getElementById('loading-progress');
    var overlay = document.getElementById('loadingOverlay');
    var tipIndex = Math.floor(Math.random() * TIPS.length);
    if (tipEl) tipEl.textContent = TIPS[tipIndex];
    var _tipInterval;
    var _loadStart = Date.now();
    var MIN_LOAD_MS = window.__spaRevisit ? (window.VALDORIA_SPA_RETURN_MS || 1500) : (window.VALDORIA_MIN_LOAD_MS || 5000);
    var _progress = 0;
    var _progressTimer = setInterval(function() {
        _progress += (90 - _progress) * 0.08;
        if (progressEl) progressEl.style.width = _progress + '%';
    }, 200);
    _tipInterval = setInterval(function() {
        tipIndex = (tipIndex + 1) % TIPS.length;
        if (tipEl) {
            tipEl.classList.add('tip-exit');
            setTimeout(function() {
                tipEl.textContent = TIPS[tipIndex];
                tipEl.classList.remove('tip-exit');
                tipEl.classList.add('tip-enter');
                setTimeout(function() { tipEl.classList.remove('tip-enter'); }, 350);
            }, 300);
        }
    }, 5000);
    window._guildLoadingCtrl = {
        hide: function() {
            if (window._guildLoadingHiding) return;
            clearInterval(_tipInterval);
            clearInterval(_progressTimer);
            if (!overlay || overlay.classList.contains('hidden')) return;
            var elapsed = Date.now() - _loadStart;
            var remaining = MIN_LOAD_MS - elapsed;
            if (remaining > 0) {
                setTimeout(function() { window._guildLoadingCtrl.hide(); }, remaining);
                return;
            }
            if (progressEl) progressEl.style.width = '100%';
            try {
                if (window.Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
                    Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
                }
            } catch (_) {}
            window._guildLoadingHiding = true;
            setTimeout(function() {
                overlay.classList.add('exit-cinematic');
                setTimeout(function() {
                    overlay.classList.add('hidden');
                    window._guildLoadingHiding = false;
                }, 800);
            }, 250);
        }
    };
})();
