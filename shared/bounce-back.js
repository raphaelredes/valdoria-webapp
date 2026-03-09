/* ═══════════════════════════════════════════════════════════════
   Bounce-Back — Shared micro-interaction for all WebApps
   Adds spring bounce-back animation on button release (pointerup).
   Requires v-btnRelease keyframe from valdoria-design.css.
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';
    const SEL = '.btn-action, .btn-hero, .v-btn-primary, .v-btn, .btn-choice, .btn-target, .skill-item';
    document.addEventListener('pointerup', function (e) {
        var btn = e.target.closest(SEL);
        if (!btn || btn.classList.contains('v-action-pending') || btn.disabled) return;
        btn.classList.remove('v-btn-released');
        void btn.offsetWidth;
        btn.classList.add('v-btn-released');
        btn.addEventListener('animationend', function () { btn.classList.remove('v-btn-released'); }, { once: true });
    });
})();
