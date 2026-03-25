(function() {
var TIPS = [
    // Narrativas imersivas
    'Uma energia arcana percorre seu corpo... algo mudou dentro de você...',
    'As lições de incontáveis batalhas cristalizam em poder e sabedoria...',
    'Seus músculos se fortalecem, sua mente se expande, sua alma se aguça...',
    'O universo reconhece sua determinação e concede novos dons...',
    'Poder latente desperta, aguardando ser moldado pela sua vontade...',
    'O brilho em seus olhos revela uma força que antes não existia...',
    'Suas cicatrizes contam histórias de vitórias que moldaram quem você é...',

    // Dicas de gameplay
    '⚔️ Dica: A cada 4 níveis, você ganha um Aumento de Atributo ou um Talento.',
    '🛡️ Dica: Conjuradores ganham novos espaços de magia ao subir de nível.',
    '📜 Dica: Novos níveis podem desbloquear traços de subclasse.',
    '💡 Dica: Seus dados de vida aumentam — mais HP para enfrentar desafios.',
    '⚔️ Dica: Alguns níveis concedem Ataques Extras ou habilidades únicas.',
    '⬆️ Dica: ASI (+2 em um atributo) vs Talento — avalie o que seu personagem precisa.',
    '⬆️ Dica: Cantrips escalam automaticamente nos níveis 5, 11 e 17.',
    '⬆️ Dica: Subclasses definem seu estilo — cada uma tem mecânicas únicas.',
];
if(window._loadDbgSetApp)_loadDbgSetApp('LEVELUP');
window._lvlInitLoading = ValdoriaLoadingController({
    overlayId: 'initLoading',
    tipId: 'init-loading-tip',
    progressId: 'init-loading-progress',
    tips: TIPS,
    onTimeout: function() { console.error("[LEVELUP] Loading timeout"); }
});
})();
