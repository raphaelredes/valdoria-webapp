/* Explore loading controller (extracted for SPA) */
    (function() {
        var TIPS = [
            // Narrativas imersivas — exploração
            'Você ajusta a mochila e dá os primeiros passos pela trilha...',
            'O vento traz o cheiro de terra molhada e folhas secas...',
            'O horizonte se abre diante de você, cheio de promessas e perigos...',
            'Galhos estalando no escuro... sentidos aguçados, mão na arma...',
            'A trilha se estreita entre rochas cobertas de musgo...',
            'Pegadas na lama indicam que você não é o primeiro a passar por aqui...',
            'O canto distante de um pássaro quebra o silêncio da floresta...',
            'Nuvens escuras se acumulam no horizonte — melhor se apressar...',
            // Dicas D&D intercaladas
            '⚔️ Dica: Terrenos elevados concedem vantagem em combate',
            '🛡️ Dica: Percepção Passiva revela armadilhas ocultas',
            '🏹 Dica: Anões têm resistência a veneno',
            '👁️ Dica: Elfos possuem visão no escuro',
            '🗡️ Dica: Ladinos causam dano extra com Ataque Furtivo',
            '🎵 Dica: Bardos inspiram aliados com Inspiração Bárdica',
            '📜 Dica: Explore cada sala — tesouros escondidos aguardam',
            '🧙 Dica: Magos podem preparar magias diferentes a cada descanso',
        ];
        var tipEl = document.getElementById('loading-tip');
        var progressEl = document.getElementById('loading-progress');
        var stageEl = document.getElementById('loading-stage');
        var overlay = document.getElementById('loading');
        var circle = overlay ? overlay.querySelector('.magic-circle') : null;
        var tipIndex = Math.floor(Math.random() * TIPS.length);
        if (tipEl) tipEl.textContent = TIPS[tipIndex];
        var _tipInterval, _slowTimer, _verySlowTimer;
        var _lastPct = 0;
        var _loadStart = Date.now();
        var MIN_LOAD_MS = window.VALDORIA_MIN_LOAD_MS || 5000;

        // Ring acceleration: lerp speed based on progress (100% = 4x faster)
        function updateRingSpeed(pct) {
            if (!circle) return;
            var factor = 1 - (pct / 100) * 0.75; // 1.0 → 0.25
            circle.style.setProperty('--ring-outer', (60 * factor) + 's');
            circle.style.setProperty('--ring-mid', (35 * factor) + 's');
            circle.style.setProperty('--ring-inner', (45 * factor) + 's');
        }

        // Gem phase: 0 (default ruby), 1 (amber at 50%), 2 (bright gold at 90%)
        function updateGemPhase(pct) {
            if (!overlay) return;
            if (pct >= 90) overlay.setAttribute('data-phase', '2');
            else if (pct >= 50) overlay.setAttribute('data-phase', '1');
            else overlay.removeAttribute('data-phase');
        }

        // Completion pulse at 100% + haptic feedback
        function triggerCompletionPulse() {
            var waves = overlay ? overlay.querySelectorAll('.mc-completion-wave') : [];
            waves.forEach(function(w) { w.classList.add('active'); });
            // Haptic feedback via Telegram WebApp API
            try {
                if (window.Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
                    Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
                }
            } catch(_) {}
        }

        // Gem tap burst interaction
        if (gemEl) {
            var _tapCooldown = false;
            gemEl.addEventListener('click', function() {
                if (_tapCooldown) return;
                _tapCooldown = true;
                // Flash the gem
                gemEl.classList.add('tapped');
                // Create burst element
                var burst = document.createElement('div');
                gemEl.appendChild(burst);
                // Haptic tap feedback
                try {
                    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
                        Telegram.WebApp.HapticFeedback.impactOccurred('light');
                    }
                } catch(_) {}
                // Cleanup after animation
                setTimeout(function() {
                    gemEl.classList.remove('tapped');
                    if (burst.parentNode) burst.parentNode.removeChild(burst);
                    _tapCooldown = false;
                }, 600);
            });
        }

        // Rotate tips every 6s with crossfade (narrative immersion)
        _tipInterval = setInterval(function() {
            tipIndex = (tipIndex + 1) % TIPS.length;
            tipEl.classList.add('tip-exit');
            setTimeout(function() {
                tipEl.textContent = TIPS[tipIndex];
                tipEl.classList.remove('tip-exit');
                tipEl.classList.add('tip-enter');
                setTimeout(function() { tipEl.classList.remove('tip-enter'); }, 350);
            }, 300);
        }, 6000);

        // Slow loading indicator after 5s
        _slowTimer = setTimeout(function() {
            tipEl.classList.add('loading-tip-slow');
        }, 5000);

        // Very slow — reassure after 10s
        _verySlowTimer = setTimeout(function() {
            tipEl.textContent = 'Quase lá...';
        }, 10000);

        // Expose for explore-events.js
        window._loadingCtrl = {
            setProgress: function(pct, stageName) {
                pct = Math.min(100, pct);
                if (progressEl) progressEl.style.width = pct + '%';
                // Stage text
                if (stageEl && stageName) stageEl.textContent = stageName;
                // Ring acceleration
                updateRingSpeed(pct);
                // Gem color evolution
                updateGemPhase(pct);
                // Completion pulse
                if (pct >= 100 && _lastPct < 100) triggerCompletionPulse();
                _lastPct = pct;
            },
            /** Cinematic exit with flash + circle zoom + disperse */
            hideLoading: function(cb) {
                clearInterval(_tipInterval);
                clearTimeout(_slowTimer);
                clearTimeout(_verySlowTimer);
                if (!overlay || overlay.classList.contains('hidden')) { if (cb) cb(); return; }
                // Enforce minimum loading time for narrative immersion
                var elapsed = Date.now() - _loadStart;
                var remaining = MIN_LOAD_MS - elapsed;
                if (remaining > 0) {
                    var self = this;
                    setTimeout(function() { self.hideLoading(cb); }, remaining);
                    return;
                }
                // Set progress to 100% with final stage
                if (progressEl) progressEl.style.width = '100%';
                updateRingSpeed(100);
                updateGemPhase(100);
                if (stageEl) stageEl.textContent = 'Pronto!';
                if (_lastPct < 100) triggerCompletionPulse();
                // Trigger cinematic exit after pulse settles
                setTimeout(function() {
                    overlay.classList.add('exit-cinematic');
                    overlay.addEventListener('animationend', function handler(e) {
                        if (e.target !== overlay) return;
                        overlay.removeEventListener('animationend', handler);
                        overlay.classList.add('hidden');
                        if (cb) cb();
                    });
                    // Safety fallback
                    setTimeout(function() {
                        if (!overlay.classList.contains('hidden')) {
                            overlay.classList.add('hidden');
                            if (cb) cb();
                        }
                    }, 1200);
                }, 350);
            },
            /** Quick hide (no cinematic, for restores) */
            hideQuick: function() {
                clearInterval(_tipInterval);
                clearTimeout(_slowTimer);
                clearTimeout(_verySlowTimer);
                if (overlay) overlay.classList.add('hidden');
            },
            cleanup: function() {
                clearInterval(_tipInterval);
                clearTimeout(_slowTimer);
                clearTimeout(_verySlowTimer);
            }
        };
    })();
