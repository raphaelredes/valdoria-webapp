(function() {
var TIPS = [
    // Narrativas imersivas
    'Os dados rolam sobre a mesa de madeira gasta por mil partidas...',
    'A sorte favorece os audaciosos — mas o destino é caprichoso...',
    'O som dos dados batendo na mesa ecoa como trovão distante...',
    'Suas mãos tremem de ansiedade enquanto os dados giram...',
    'A taverna silencia quando os dados tocam a mesa...',
    'O brilho dourado dos dados reflete a chama das velas...',
    'Cada face do dado carrega uma história diferente...',
    'O dado rola, e por um instante, o mundo inteiro para...',

    // Dicas de gameplay
    '🎲 Dica: Um 20 natural é sempre um acerto crítico — dano dobrado!',
    '🎲 Dica: Vantagem permite rolar 2d20 e usar o maior resultado.',
    '🎲 Dica: Desvantagem força rolar 2d20 e usar o menor resultado.',
    '🎲 Dica: Salvaguardas usam d20 + modificador contra uma CD definida.',
    '🎲 Dica: Testes de habilidade determinam o sucesso de ações fora de combate.',
    '🎲 Dica: Dados de dano variam por arma — d6, d8, d10 ou d12.',
    '🎲 Dica: Um 1 natural em ataque é sempre uma falha crítica.',
    '🎲 Dica: Proficiência adiciona bônus aos testes em que você é treinado.',
];
window._diceLoadingCtrl = ValdoriaLoadingController({
    overlayId: 'loadingOverlay',
    tipId: 'dice-loading-tip',
    tips: TIPS,
    hasRingAccel: false,
    hasGemPhase: false,
    onTimeout: function() { console.error("[DICE] Loading timeout"); }
});
})();
