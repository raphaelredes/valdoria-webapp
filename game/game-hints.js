/* game-hints.js -- Contextual onboarding hints */
(function(){
'use strict';

function showHint(hint) {
    if (!hint || !hint.title) return;
    if (!window.vPopup) return;

    vPopup.show({
        header: '\u2728 ' + hint.title,
        headerClass: 'hint-header',
        body: '<div class="hint-body">' + hint.text + '</div>',
        actions: '<button class="v-popup-btn" data-action="cancel">Entendi!</button>',
    });
}

// Hook into renderScreen to show hints
var _origRenderHint = window.renderScreen;
if (_origRenderHint) {
    window.renderScreen = function(screen) {
        _origRenderHint(screen);
        if (screen && screen.hint) {
            setTimeout(function() { showHint(screen.hint); }, 800);
        }
    };
}
})();
