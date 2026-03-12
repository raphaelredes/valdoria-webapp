/* ========================================================
   VALDORIA SHARED HAPTIC v1.0
   Unified haptic feedback for Telegram Mini Apps.
   Usage: vHaptic.tap(), vHaptic.heavy(), vHaptic.success(), etc.
   Also exports vReducedMotion for animation checks.
   ======================================================== */
(function() {
    "use strict";
    var tg = window.Telegram && Telegram.WebApp;
    var hf = tg && tg.HapticFeedback;

    /* Reduced motion preference (for JS animation guards) */
    window.vReducedMotion = window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;

    function impact(type) {
        try { if (hf) hf.impactOccurred(type || "light"); } catch(_) {}
    }
    function notify(type) {
        try { if (hf) hf.notificationOccurred(type || "success"); } catch(_) {}
    }
    function select() {
        try { if (hf) hf.selectionChanged(); } catch(_) {}
    }

    window.vHaptic = {
        /* Impact feedback (physical sensation) */
        tap:    function() { impact("light"); },
        medium: function() { impact("medium"); },
        heavy:  function() { impact("heavy"); },

        /* Notification feedback (outcome) */
        success: function() { notify("success"); },
        warning: function() { notify("warning"); },
        error:   function() { notify("error"); },

        /* Selection feedback */
        select: select,

        /* Raw access for custom types */
        impact: impact,
        notify: notify
    };
})();
