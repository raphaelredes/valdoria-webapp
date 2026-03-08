/* ═══════════════════════════════════════════════════════════════
   VALDORIA — Shared Font Preference Applier
   Reads the player's font choice from localStorage and applies
   it to the page. Import this in every WebApp to respect the
   font preference set in the Game Hub settings screen.
   ═══════════════════════════════════════════════════════════════ */
(function () {
    var FONT_KEY = 'valdoria_font';
    var FONTS = {
        medievalsharp: "'MedievalSharp', serif",
        cinzel: "'Cinzel', serif",
        imfell: "'IM Fell English', serif",
        pirataone: "'Pirata One', cursive",
        almendra: "'Almendra', serif",
        metamorphous: "'Metamorphous', serif"
    };

    function apply() {
        var id;
        try { id = localStorage.getItem(FONT_KEY); } catch (e) { return; }
        if (!id || !FONTS[id]) return; // default (MedievalSharp) is already set via CSS
        document.body.style.setProperty('--user-font', FONTS[id]);
        document.body.dataset.font = id;
        document.body.style.fontFamily = FONTS[id];
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply);
    } else {
        apply();
    }
})();
