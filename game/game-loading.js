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

    function _ensureCtrl() {
        if (_ctrl) return _ctrl;
if(window._loadDbgSetApp)_loadDbgSetApp('GAME');
        _ctrl = ValdoriaLoadingController({
            overlayId: 'loading',
            tips: _LOADING_TIPS,
            tipInterval: 5000,
            timeoutMs: (typeof LOADING_TIMEOUT_MS !== 'undefined') ? LOADING_TIMEOUT_MS : 15000,
            retryDelayMs: 10000,
            autoRetryMax: 2,
            hasRingAccel: true,
            hasGemPhase: true,
            onRetry: function() {
                showLoading(true);
                if (typeof init === 'function') {
                    init();
                } else {
                    window.location.reload();
                }
            },
            onTimeout: function() {
                console.error('[GAME] Loading timeout \u2014 server did not respond in time');
            },
        });
        return _ctrl;
    }

    /**
     * Show the loading overlay.
     * @param {boolean} [isRetry=false] - If true, shows reconnecting text instead of tips.
     */
    window.showLoading = function showLoading(isRetry) {
        var ctrl = _ensureCtrl();
        ctrl.show(isRetry);
        var el = document.getElementById('loading');
        if (el) {
            el.style.visibility = '';
            el.style.display = '';
        }
    };

    /**
     * Hide the loading overlay with cinematic exit, respecting VALDORIA_MIN_LOAD_MS.
     */
    window.hideLoading = function hideLoading() {
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
