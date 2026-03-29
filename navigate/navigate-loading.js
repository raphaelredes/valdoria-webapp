(function() {
var TIPS = [
    // Narrativas imersivas
    'Você desenrola o pergaminho e estuda as rotas traçadas a carvão...',
    'A bússola arcana gira lentamente, apontando para o norte verdadeiro...',
    'Montanhas, florestas e rios se revelam no mapa desgastado pelo tempo...',
    'Seus dedos percorrem as trilhas marcadas, calculando a distância...',
    'Marcas de tinta vermelha indicam territórios perigosos e inexplorados...',
    'O pergaminho cheira a tinta de carvalho e segredos antigos...',
    'Runas cartográficas brilham levemente ao toque de seus dedos...',
    'Cada dobra do mapa revela caminhos que poucos ousaram trilhar...',

    // Dicas de gameplay
    '🗺️ Dica: O ritmo de viagem afeta percepção e furtividade do grupo.',
    '⚔️ Dica: Viagem em ritmo rápido impõe -5 na Percepção Passiva.',
    '🛡️ Dica: Ritmo cauteloso permite se mover furtivamente e concede +5 PP.',
    '📜 Dica: Atividades de viagem incluem vigiar, forragear e navegar.',
    '💡 Dica: Terreno difícil reduz a velocidade de deslocamento pela metade.',
    '🗺️ Dica: Explorar regiões desconhecidas pode revelar locais ocultos.',
    '⚔️ Dica: Encontros aleatórios são mais comuns em territórios perigosos.',
    '🛡️ Dica: Descanso longo restaura todos os HP e recursos gastos.',
];
if(window._loadDbgSetApp)_loadDbgSetApp('NAVIGATE');
if (window.__spaRevisit) {
    window._navLoadingCtrl = {
        show: function() { if(window.vProcessing) vProcessing.show({text: 'Carregando mapa...'}); },
        hide: function(cb) { if(window.vProcessing) vProcessing.hide(); if(cb) setTimeout(cb, 200); },
        forceHide: function() { if(window.vProcessing) vProcessing.hide(); },
        setProgress: function() {},
        setTips: function() {},
        getState: function() { return (window.vProcessing && vProcessing.isActive()) ? 'loading' : 'hidden'; },
        cleanup: function() { if(window.vProcessing) vProcessing.hide(); },
        hideLoading: function(cb) { this.hide(cb); },
        hideQuick: function() { this.forceHide(); },
        resetTimers: function() {}
    };
} else {
    window._navLoadingCtrl = ValdoriaLoadingController({
        overlayId: 'loading',
        tips: TIPS,
        onTimeout: function() { console.error('[NAVIGATE] Loading timeout'); }
    });
}
})();
