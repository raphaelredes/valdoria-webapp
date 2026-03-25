(function() {
var TIPS = [
    // Narrativas imersivas
    'O calor da forja aquece seu rosto enquanto as brasas crepitam...',
    'Ferramentas de artesão se alinham na bancada, prontas para o trabalho...',
    'O som ritmado do martelo na bigorna ecoa pela oficina...',
    'Fumaça sobe em espirais enquanto o fole alimenta as chamas...',
    'Moldes e fôrmas de metal se alinham nas prateleiras empoeiradas...',
    'O cheiro de metal quente e carvão preenche o ar da oficina...',
    'Runas arcanas brilham fracamente nos instrumentos do artesão...',
    'Lingotes de diferentes metais aguardam para serem transformados...',

    // Dicas de gameplay
    '🔨 Dica: Receitas melhores exigem materiais mais raros.',
    '🛡️ Dica: Itens forjados podem ter atributos únicos.',
    '🔨 Dica: Gemas podem ser encaixadas em equipamentos com soquetes.',
    '🛡️ Dica: Runas adicionam propriedades mágicas aos itens.',
    '🔨 Dica: Desmontar itens recupera parte dos materiais.',
    '🛡️ Dica: Nível do personagem desbloqueia receitas mais avançadas.',
    '🔨 Dica: Materiais raros podem ser encontrados em masmorras e trilhas.',
    '🛡️ Dica: Equipamentos forjados são sempre melhores que os comprados.',
];
if(window._loadDbgSetApp)_loadDbgSetApp('WORKSTATION');
window._wsLoadingCtrl = ValdoriaLoadingController({
    overlayId: 'wsLoading',
    tips: TIPS,
    onTimeout: function() { console.error("[WORKSTATION] Loading timeout"); }
});
})();
