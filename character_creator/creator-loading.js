(function() {
var TIPS = [
    // Narrativas imersivas
    'Os deuses observam enquanto uma nova alma se prepara para nascer...',
    'As estrelas se alinham, aguardando a escolha do destino do aventureiro...',
    'Pergaminhos antigos se desenrolam, revelando raças e linhagens...',
    'O fogo da forja crepita, pronto para moldar um novo campeão...',
    'Ecos de lendas passadas sussurram conselhos ao novo aventureiro...',
    'Runas ancestrais brilham, canalizando o poder da criação...',
    'O livro de classes se abre, revelando caminhos de poder...',
    'Uma nova página na história de Valdoria está prestes a ser escrita...',

    // Dicas de gameplay
    '⚔️ Dica: Cada raça oferece bônus únicos de atributo e habilidades.',
    '🛡️ Dica: Escolha uma classe que combine com seu estilo de jogo.',
    '⚔️ Dica: Atributos altos em Força ou Destreza melhoram seu ataque.',
    '🛡️ Dica: Constituição alta significa mais pontos de vida.',
    '⚔️ Dica: Magos usam Inteligência, Clérigos usam Sabedoria.',
    '🛡️ Dica: Carisma é essencial para Bardos, Feiticeiros e Bruxos.',
    '⚔️ Dica: A origem do personagem define suas perícias iniciais.',
    '🛡️ Dica: Não existe escolha errada — cada combinação é viável!',
];
if(window._loadDbgSetApp)_loadDbgSetApp('CREATOR');
window._creatorLoadingCtrl = ValdoriaLoadingController({
    overlayId: 'creatorLoading',
    tips: TIPS,
    onTimeout: function() { console.error('[CREATOR] Loading timeout'); }
});
})();
