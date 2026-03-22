(function() {
var TIPS = [
    // Narrativas imersivas
    'Sua m\u00e3o encontra o cabo da arma enquanto voc\u00ea se posiciona para o combate...',
    'O ch\u00e3o treme sob seus p\u00e9s \u2014 o inimigo se aproxima...',
    'Voc\u00ea respira fundo e foca a mente. Cada segundo conta numa batalha.',
    'O brilho de a\u00e7o reflete nos olhos do advers\u00e1rio \u00e0 sua frente...',
    'Adrenalina percorre suas veias enquanto o confronto se aproxima...',
    'Voc\u00ea analisa o terreno, buscando vantagem t\u00e1tica...',
    'O som de armaduras tilintando ecoa enquanto ambos os lados se preparam...',
    'Uma brisa fria corta o ar tenso entre voc\u00ea e seu oponente...',

    // Dicas de gameplay
    '\u2694\ufe0f Dica: Rolagens de ataque 20 s\u00e3o acertos cr\u00edticos \u2014 dano dobrado!',
    '\ud83d\udee1\ufe0f Dica: Cobertura parcial concede +2 na CA contra ataques \u00e0 dist\u00e2ncia.',
    '\u2694\ufe0f Dica: A\u00e7\u00f5es b\u00f4nus como Investida Imprudente podem virar o jogo.',
    '\ud83d\udee1\ufe0f Dica: Efeitos de status como Amedrontado imp\u00f5em desvantagem nos ataques.',
    '\u2694\ufe0f Dica: Posicionamento t\u00e1tico pode garantir ataques de oportunidade.',
    '\ud83d\udee1\ufe0f Dica: Curar-se no momento certo pode ser melhor que atacar.',
    '\u2694\ufe0f Dica: Habilidades de classe t\u00eam usos limitados \u2014 use com sabedoria.',
    '\ud83d\udee1\ufe0f Dica: Resist\u00eancia a dano reduz o dano recebido pela metade.',
];
window._combatLoadingCtrl = ValdoriaLoadingController({
    overlayId: 'combatLoading',
    tips: TIPS,
    onTimeout: function() { console.error('[COMBAT] Loading timeout'); }
});
})();
