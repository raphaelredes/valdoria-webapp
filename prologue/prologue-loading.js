(function() {
var TIPS = [
    // Narrativas imersivas
    'O destino começa a tecer sua história nas terras de Valdoria...',
    'Uma nova lenda está prestes a ser escrita...',
    'Os ventos da mudança sopram sobre as terras antigas...',
    'Estrelas se alinham, e o caminho do aventureiro se ilumina...',
    'O pergaminho do destino aguarda suas primeiras palavras...',
    'Sombras e luz dançam enquanto o mundo se revela...',
    'As portas de Valdoria se abrem para quem tem coragem de cruzá-las...',
    'Antigos guardiões observam em silêncio a chegada de um novo aventureiro...',

    // Dicas de gameplay
    '📜 Dica: Seu personagem começa no nível 1 — cada escolha importa.',
    '💡 Dica: Preste atenção nas pistas narrativas — elas guiam seu caminho.',
    '⚔️ Dica: Testes de habilidade usam 1d20 + modificador contra uma CD.',
    '🛡️ Dica: Valdoria é um mundo vasto com segredos em cada esquina.',
    '⚔️ Dica: Descanso curto recupera Dados de Vida — use entre combates.',
    '🛡️ Dica: Salvaguardas usam d20 + modificador contra uma DC do perigo.',
    '📜 Dica: Proficiência em uma skill adiciona seu bônus ao teste.',
    '💡 Dica: Cada classe tem recursos únicos — explore suas habilidades.',
];
window._prologueInitLoading = ValdoriaLoadingController({
    overlayId: 'initLoading',
    tips: TIPS,
    onTimeout: function() { console.error('[PROLOGUE] Loading timeout'); }
});
})();
