/**
 * Game Hub Loading - thin wrapper around ValdoriaLoadingController
 * Replaces the standalone loading logic that was in game-ui.js
 */
(function() {
    'use strict';

    var _TIPS_NARRATIVE = [
        'As muralhas de pedra se erguem enquanto os port\u00f5es rangem ao abrir...',
        'O som de bigornas e o aroma de p\u00e3o fresco preenchem as ruas empedradas...',
        'Guardas patrulham as ameias enquanto comerciantes montam suas barracas...',
        'O vento traz murm\u00farios da taverna e risos de crian\u00e7as brincando na pra\u00e7a...',
        'Tochas acesas iluminam os bras\u00f5es entalhados nos portais da cidade...',
        'O sino do templo ecoa pela manh\u00e3, despertando a cidade de seu sono...',
        'Mercadores ajustam suas bancas, exibindo rel\u00edquias de terras distantes...',
        'O cheiro de cerveja e carne assada escapa pelas portas da estalagem...',
    ];

    var _TIPS_MECHANICS = [
        '\u2694\ufe0f Dica: Rolagens de ataque 20 s\u00e3o acertos cr\u00edticos \u2014 dano dobrado!',
        '\ud83d\udee1\ufe0f Dica: Descansar na estalagem recupera todos os dados de vida.',
        '\ud83d\udcb0 Dica: Venda itens que n\u00e3o usa no mercado da cidade.',
        '\ud83d\udcdc Dica: Converse com NPCs para descobrir quests escondidas.',
        '\ud83c\udff0 Dica: A Guilda de Aventureiros oferece miss\u00f5es com boas recompensas.',
        '\ud83e\uddea Dica: Po\u00e7\u00f5es podem ser usadas durante o combate como a\u00e7\u00e3o b\u00f4nus.',
        '\u2b50 Dica: Suba de n\u00edvel para desbloquear novas habilidades de classe.',
        '\ud83d\udc09 Dica: Inimigos mais fortes concedem mais XP e ouro.',
        '\ud83c\udfaf Dica: Advantage dobra suas chances \u2014 posicione-se bem!',
        '\ud83e\uddea Dica: Po\u00e7\u00f5es de cura restauram 2d4+2 pontos de vida.',
        '\ud83d\udee1\ufe0f Dica: Classe de Armadura (CA) determina se ataques acertam voc\u00ea.',
        '\ud83d\udd2e Dica: Magias de concentra\u00e7\u00e3o se perdem ao receber dano.',
        '\ud83d\uddfa\ufe0f Dica: Explore cada localiza\u00e7\u00e3o \u2014 segredos est\u00e3o por toda parte.',
        '\u2694\ufe0f Dica: Ataques de oportunidade atingem inimigos que fogem.',
        '\ud83d\udca0 Dica: Cada classe tem recursos \u00fanicos \u2014 conhe\u00e7a os seus!',
        '\ud83c\udff0 Dica: O ferreiro pode forjar equipamentos poderosos.',
    ];

    var _LOADING_TIPS = _TIPS_NARRATIVE.concat(_TIPS_MECHANICS);

    // Contextual tip sets (inspired by Skyrim/BG3 — show relevant tips for destination)
    var _TIPS_COMBAT = [
        'Sua mão encontra o cabo da arma enquanto você se posiciona...',
        'Adrenalina percorre suas veias enquanto o confronto se aproxima...',
        'Você analisa o terreno, buscando vantagem tática...',
        '⚔️ Dica: Rolagens de ataque 20 são acertos críticos — dano dobrado!',
        '🛡️ Dica: Posicionamento pode garantir ataques de oportunidade.',
        '⚔️ Dica: Habilidades de classe têm usos limitados — use com sabedoria.',
        '🧪 Dica: Poções podem ser usadas durante o combate como ação bônus.',
        '🛡️ Dica: Resistência a dano reduz o dano recebido pela metade.',
    ];
    var _TIPS_EXPLORE = [
        'O vento sussurra segredos sobre os caminhos à frente...',
        'Trilhas pouco usadas frequentemente escondem tesouros esquecidos...',
        'A natureza ao redor observa seus passos com curiosidade...',
        '🗺️ Dica: O ritmo de viagem afeta percepção e furtividade.',
        '⚔️ Dica: Viagem em ritmo rápido impõe -5 na Percepção Passiva.',
        '🛡️ Dica: Ritmo cauteloso permite se mover furtivamente.',
        '📜 Dica: Atividades de viagem incluem vigiar, forragear e navegar.',
        '💡 Dica: Terreno difícil reduz a velocidade pela metade.',
    ];
    var _TIPS_NAVIGATE = [
        'Você desenrola o pergaminho e estuda as rotas...',
        'A bússola arcana gira lentamente, apontando para o norte...',
        'Montanhas, florestas e rios se revelam no mapa desgastado...',
        '🗺️ Dica: Explore regiões desconhecidas para revelar locais ocultos.',
        '⚔️ Dica: Encontros aleatórios são mais comuns em territórios perigosos.',
        '🛡️ Dica: Descanso longo restaura todos os HP e recursos gastos.',
        '🏰 Dica: A Guilda de Aventureiros oferece missões com boas recompensas.',
        '💰 Dica: Venda itens que não usa no mercado da cidade.',
    ];
    var _CONTEXTUAL_TIPS = {
        combat: _TIPS_COMBAT,
        arena: _TIPS_COMBAT,
        explore: _TIPS_EXPLORE,
        navigate: _TIPS_NAVIGATE,
        dungeon: _TIPS_EXPLORE,
    };

    // Controller instance (created lazily on first showLoading)
    var _ctrl = null;

    // ── Title Screen + Audio-Reactive integration ──
    var _titleScreen = null;
    var _titleShown = false;
    var _reactiveStarted = false;
    var _gameReady = false;        /* game finished loading, waiting for user */
    var _pendingHideCb = null;     /* deferred hide callback */
    var _enterBtn = null;          /* "Aventurar-se" button element */

    /**
     * Show title screen ON TOP of loading (z-index 10000 > loading 9999).
     * Loading runs normally underneath. Title screen is just an audio-unlock overlay.
     * Called once on cold start — after that, _titleShown prevents re-showing.
     */
    function _showTitleScreen() {
        if (_titleShown) { console.log('[INTRO] _showTitleScreen skipped — already shown'); return; }
        if (typeof ValdoriaTitleScreen !== 'function') { console.warn('[INTRO] ValdoriaTitleScreen not available'); return; }
        _titleShown = true;
        console.log('[INTRO] Title screen created — waiting for user tap');

        _titleScreen = ValdoriaTitleScreen({
            onStart: function() {
                console.log('[INTRO] Title screen TAPPED — unlocking audio');
                /* Unlock audio: set pending track first, then unlock (which picks it up) */
                if (typeof ValdoriaAudio !== 'undefined') {
                    ValdoriaAudio.play('intro');  /* sets _pendingTrack */
                    ValdoriaAudio.forceUnlock();  /* triggers _playTrack with pending */
                    /* Create analyser synchronously within tap gesture for AudioContext.resume() */
                    var an = ValdoriaAudio.getAnalyser();
                    console.log('[INTRO] Audio unlock: play(intro) + forceUnlock() + getAnalyser()=' + (an ? 'OK' : 'null'));
                } else {
                    console.warn('[INTRO] ValdoriaAudio not available — no music');
                }

                /* Start audio-reactive effects (analyser created synchronously above) */
                setTimeout(function() {
                    _startReactive();
                    /* If game already finished loading while title was up, show enter button */
                    if (_gameReady) {
                        console.log('[INTRO] Game was already ready — showing enter button immediately');
                        _showEnterButton();
                    } else {
                        console.log('[INTRO] Game still loading — enter button will appear when ready');
                    }
                }, 100);
            }
        });
        _titleScreen.show();
    }

    /** Start audio-reactive loading effects */
    function _startReactive() {
        if (_reactiveStarted) { console.log('[INTRO] _startReactive skipped — already running'); return; }
        if (typeof ValdoriaLoadingReactive === 'undefined') { console.warn('[INTRO] ValdoriaLoadingReactive not available'); return; }
        if (typeof ValdoriaAudio === 'undefined') { console.warn('[INTRO] ValdoriaAudio not available for reactive'); return; }

        var analyser = ValdoriaAudio.getAnalyser();
        if (analyser) {
            ValdoriaLoadingReactive.start(analyser);
            _reactiveStarted = true;
            console.log('[INTRO] Audio-reactive effects STARTED (tier=' + (window._valdoriaPerformanceTier || 'unknown') + ')');
        } else {
            console.warn('[INTRO] getAnalyser() returned null — reactive effects disabled');
        }
    }

    /** Show "Aventurar-se" button when game is ready but user is enjoying music */
    function _showEnterButton() {
        if (_enterBtn) { console.log('[INTRO] _showEnterButton skipped — already visible'); return; }
        var overlay = document.getElementById('loading');
        if (!overlay) { console.warn('[INTRO] _showEnterButton — loading overlay not found!'); return; }

        /* CRITICAL: Disable loading controller timeout — game IS ready, user is choosing when to enter */
        if (_ctrl && _ctrl.resetTimers) {
            _ctrl.resetTimers();
            console.log('[INTRO] Loading controller timers RESET — no more timeouts while user enjoys music');
        }

        _enterBtn = document.createElement('button');
        _enterBtn.className = 'loading-enter-btn';
        _enterBtn.textContent = 'Aventurar-se';
        _enterBtn.style.cssText = 'position:absolute;bottom:18%;left:50%;transform:translateX(-50%);'
            + 'z-index:10;padding:12px 32px;border:1px solid var(--v-gold,#c4953a);'
            + 'background:rgba(42,36,32,0.85);color:var(--v-gold,#c4953a);'
            + 'font-family:var(--v-font-display,Cinzel,serif);font-size:var(--v-font-lg,15px);'
            + 'letter-spacing:2px;border-radius:var(--v-radius-pill,20px);cursor:pointer;'
            + 'opacity:0;animation:leFadeIn 0.6s ease-out 0.3s forwards;';
        _enterBtn.addEventListener('click', _onEnterGame);
        _enterBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            _onEnterGame();
        }, { passive: false });
        overlay.appendChild(_enterBtn);

        /* Hide progress bar and update tip — game is ready */
        var prog = overlay.querySelector('.loading-progress-wrap');
        if (prog) prog.style.transition = 'opacity 0.5s ease'; if (prog) prog.style.opacity = '0';
        var stage = overlay.querySelector('.loading-stage');
        if (stage) stage.textContent = '';
        var tip = overlay.querySelector('.loading-tip');
        if (tip) { tip.style.animation = 'none'; tip.style.opacity = '0.7'; tip.textContent = '\u266B Aprecie a trilha sonora \u266B'; }

        /* Inject fadeIn keyframe if not exists */
        if (!document.getElementById('le-enter-style')) {
            var style = document.createElement('style');
            style.id = 'le-enter-style';
            style.textContent = '@keyframes leFadeIn{0%{opacity:0;transform:translateX(-50%) translateY(8px)}'
                + '100%{opacity:1;transform:translateX(-50%) translateY(0)}}'
                + '.loading-enter-btn:active{transform:translateX(-50%) scale(0.96);'
                + 'background:rgba(196,149,58,0.2)}'; /* noqa: preflight — inline keyframe */
            document.head.appendChild(style);
        }

        console.log('[INTRO] "Aventurar-se" button SHOWN — game ready, user controls when to enter');
    }

    /** User clicked "Aventurar-se" — actually dismiss loading */
    function _onEnterGame() {
        if (!_gameReady) { console.warn('[INTRO] _onEnterGame called but _gameReady=false — ignoring'); return; }
        _gameReady = false;
        console.log('[INTRO] User tapped "Aventurar-se" — entering game');

        /* Haptic */
        try {
            if (window.Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
                Telegram.WebApp.HapticFeedback.impactOccurred('medium');
            }
        } catch(e) { /* noop */ }

        /* Stop reactive effects */
        _stopReactive();
        console.log('[INTRO] Reactive effects stopped');

        /* Remove enter button */
        if (_enterBtn && _enterBtn.parentNode) {
            _enterBtn.parentNode.removeChild(_enterBtn);
            _enterBtn = null;
        }

        /* Actually hide loading */
        if (_ctrl) {
            console.log('[INTRO] Calling _ctrl.hide() — cinematic exit begins');
            _ctrl.hide(function() {
                var el = document.getElementById('loading');
                if (el) el.style.display = 'none';
                console.log('[INTRO] Loading overlay HIDDEN — game screen now visible');
                if (_pendingHideCb) {
                    console.log('[INTRO] Resolving pending hideLoadingWithDelay promise');
                    _pendingHideCb();
                    _pendingHideCb = null;
                }
            });
        } else {
            console.warn('[INTRO] _onEnterGame — no loading controller, forcing hide');
            var el = document.getElementById('loading');
            if (el) el.style.display = 'none';
            if (_pendingHideCb) { _pendingHideCb(); _pendingHideCb = null; }
        }
    }

    /** Stop audio-reactive effects */
    function _stopReactive() {
        if (!_reactiveStarted) { return; }
        if (typeof ValdoriaLoadingReactive !== 'undefined') {
            ValdoriaLoadingReactive.stop();
        }
        _reactiveStarted = false;
        console.log('[INTRO] Audio-reactive effects STOPPED');
    }

    function _ensureCtrl() {
        if (_ctrl) return _ctrl;
if(window._loadDbgSetApp)_loadDbgSetApp('GAME');
        _ctrl = ValdoriaLoadingController({
            overlayId: 'loading',
            tips: _LOADING_TIPS,
            tipInterval: 5000,
            timeoutMs: (typeof LOADING_TIMEOUT_MS !== 'undefined') ? LOADING_TIMEOUT_MS : 15000,
            retryDelayMs: 10000,
            autoRetryMax: 1,
            hasRingAccel: true,
            hasGemPhase: true,
            onRetry: function() {
                console.warn('[GAME-LOADING] onRetry: attempting recovery');
                if (typeof window._retryHealthAndStart === 'function') {
                    window._retryHealthAndStart();
                } else {
                    window.location.reload();
                }
            },
            onTimeout: function() {
                console.error('[GAME] Loading timeout \u2014 server did not respond in time');
                if (typeof forceHideLoading === 'function') forceHideLoading();
                if (typeof showError === 'function') {
                    showError('O servidor não respondeu a tempo. Estamos tentando reconectar!');
                }
            },
        });
        return _ctrl;
    }

    /**
     * Show the loading overlay.
     * @param {boolean} [isRetry=false] - If true, shows reconnecting text instead of tips.
     */
    window.showLoading = function showLoading(isRetry) {
        if (window._initAborted && !isRetry) {
            console.warn('[GAME-LOADING] showLoading BLOCKED — init was aborted');
            return;
        }
        console.warn('[GAME-LOADING] showLoading(' + (isRetry ? 'retry' : 'init') + ') spaRevisit=' + !!window.__spaRevisit);
        if (window.__spaRevisit && !isRetry) {
            if (window.vProcessing) vProcessing.show({ text: 'Carregando...' });
            return;
        }
        /* ── Title screen on cold start (shows ON TOP of loading, not instead of) ── */
        if (!isRetry && !_titleShown) {
            console.log('[INTRO] Cold start detected — showing title screen on top of loading');
            _showTitleScreen();
        }
        var ctrl = _ensureCtrl();
        if (!isRetry && ctrl.getState() === 'loading') {
            console.warn('[GAME-LOADING] showLoading() skipped — controller already loading');
            return;
        }
        ctrl.show(isRetry);
        var el = document.getElementById('loading');
        if (el) {
            el.style.display = '';
        }
    };

    /**
     * Hide the loading overlay with cinematic exit, respecting VALDORIA_MIN_LOAD_MS.
     */
    window.hideLoading = function hideLoading() {
        console.warn('[GAME-LOADING] hideLoading()');
        if (window.__spaRevisit && window.vProcessing && vProcessing.isActive()) {
            vProcessing.hide();
            return;
        }
        /* If title/intro is active, defer hide — show enter button when ready */
        var _titleUp = _titleScreen && _titleScreen.isVisible();
        if (_titleShown && (_reactiveStarted || _titleUp) && !_gameReady) {
            _gameReady = true;
            console.log('[INTRO] hideLoading DEFERRED — game ready, titleUp=' + _titleUp + ' reactive=' + _reactiveStarted);
            if (!_titleUp) _showEnterButton(); /* title gone, show button on loading */
            /* else: button will be shown after title tap (onStart checks _gameReady) */
            return;
        }
        _stopReactive();
        if (!_ctrl) return;
        _ctrl.hide(function() {
            var el = document.getElementById('loading');
            if (el) el.style.display = 'none';
        });
    };

    /**
     * Hide loading after ensuring minimum display time has passed.
     * Async version that awaits the remaining time before hiding.
     */
    window.hideLoadingWithDelay = async function hideLoadingWithDelay() {
        console.warn('[GAME-LOADING] hideLoadingWithDelay()');
        if (window.__spaRevisit && window.vProcessing && vProcessing.isActive()) {
            vProcessing.hide();
            return;
        }
        /* If title/intro is active, defer hide — show enter button when ready */
        var _titleUp = _titleScreen && _titleScreen.isVisible();
        if (_titleShown && (_reactiveStarted || _titleUp) && !_gameReady) {
            _gameReady = true;
            console.log('[INTRO] hideLoadingWithDelay DEFERRED — game ready, titleUp=' + _titleUp + ' reactive=' + _reactiveStarted + ' — returning Promise');
            return new Promise(function(resolve) {
                _pendingHideCb = resolve;
                if (!_titleUp) _showEnterButton();
                /* else: button shown after title tap */
            });
        }
        _stopReactive();
        if (!_ctrl) return;
        return new Promise(function(resolve) {
            _ctrl.hide(function() {
                var el = document.getElementById('loading');
                if (el) el.style.display = 'none';
                resolve();
            });
        });
    };

    /**
     * Force-hide the loading overlay immediately (no animation).
     */
    window.forceHideLoading = function forceHideLoading() {
        console.warn('[GAME-LOADING] forceHideLoading()');
        _stopReactive();
        if (window.vProcessing && vProcessing.isActive()) vProcessing.hide();
        if (!_ctrl) {
            var el = document.getElementById('loading');
            if (el) el.style.display = 'none';
            return;
        }
        _ctrl.forceHide();
        var el = document.getElementById('loading');
        if (el) el.style.display = 'none';
    };
    /**
     * Switch tips to match the destination WebApp (contextual loading tips).
     * @param {string} destination - transition target: 'combat', 'explore', 'navigate', etc.
     */
    window.setLoadingContext = function setLoadingContext(destination) {
        console.warn('[GAME-LOADING] setLoadingContext(' + destination + ')');
        var ctrl = _ensureCtrl();
        var contextTips = _CONTEXTUAL_TIPS[destination];
        if (contextTips && ctrl.setTips) {
            ctrl.setTips(contextTips);
        }
    };

    /**
     * Reset loading timers (call after health checks pass to give API call full budget).
     */
    window.resetLoadingTimers = function resetLoadingTimers() {
        console.warn('[GAME-LOADING] resetLoadingTimers()');
        var ctrl = _ensureCtrl();
        if (ctrl.resetTimers) ctrl.resetTimers();
    };

    /**
     * Set progress stage label (stage feedback during loading).
     * @param {number} pct - Progress percentage (0-100).
     * @param {string} label - Stage label text.
     */
    window.setLoadingStage = function setLoadingStage(pct, label) {
        var ctrl = _ensureCtrl();
        if (ctrl.setProgress) ctrl.setProgress(pct, label);
    };
})();
