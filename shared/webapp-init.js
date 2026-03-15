/* ========================================================
   VALDORIA WEBAPP INIT v1.0
   Shared Telegram Mini App initialization for ALL WebApps.
   Handles: ready, expand, colors, swipes, safe area, haptic on buttons.
   
   Usage: Include AFTER haptic.js in any WebApp HTML:
     <script src="../shared/haptic.js"></script>
     <script src="../shared/webapp-init.js"></script>
   ======================================================== */
(function() {
    "use strict";
    var tg = window.Telegram && Telegram.WebApp;
    if (!tg) return;

    // --- Core init ---
    try { tg.ready(); } catch(_) {}
    try { tg.expand(); } catch(_) {}
    try { tg.disableVerticalSwipes(); } catch(_) {}

    // --- Medieval theme colors ---
    var BG = '#2a2420';
    try { tg.setHeaderColor(BG); } catch(_) {}
    try { tg.setBackgroundColor(BG); } catch(_) {}

    // --- Dynamic safe area insets (CSS variables) ---
    function applySafeArea() {
        var root = document.documentElement;
        try {
            var csa = tg.contentSafeAreaInset;
            if (csa) {
                root.style.setProperty('--tg-safe-top', (csa.top || 0) + 'px');
                root.style.setProperty('--tg-safe-bottom', (csa.bottom || 0) + 'px');
                root.style.setProperty('--tg-safe-left', (csa.left || 0) + 'px');
                root.style.setProperty('--tg-safe-right', (csa.right || 0) + 'px');
            }
        } catch(_) {}
        try {
            var sa = tg.safeAreaInset;
            if (sa) {
                root.style.setProperty('--tg-device-safe-top', (sa.top || 0) + 'px');
                root.style.setProperty('--tg-device-safe-bottom', (sa.bottom || 0) + 'px');
            }
        } catch(_) {}
    }
    applySafeArea();
    try { tg.onEvent('viewportChanged', applySafeArea); } catch(_) {}
    try { tg.onEvent('safeAreaChanged', applySafeArea); } catch(_) {}
    try { tg.onEvent('contentSafeAreaChanged', applySafeArea); } catch(_) {}

    // --- Auto haptic on button clicks ---
    if (window.vHaptic) {
        document.addEventListener('click', function(e) {
            var el = e.target.closest('button, [role="button"], .btn-action, .btn-hero, .footer-row .btn-action');
            if (el) {
                // Hero/CTA buttons get medium impact, others get light tap
                if (el.classList.contains('btn-hero')) {
                    vHaptic.medium();
                } else {
                    vHaptic.tap();
                }
            }
        }, { passive: true });
    }

    // --- Expose for debugging ---
    window.__valdoriaWebAppInit = true;
})();
