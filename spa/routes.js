/* SPA Route Definitions */
(function () {
    "use strict";

    /* Game Hub route */
    SpaRouter.register("game", {
        page: "game/index.html",
        external: [
            "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js",
        ],
        css: [
            "shared/toast.css",
            "shared/popup.css",
            "shared/status-bars.css",
            "shared/tabs.css",
            "shared/animations.css",
            "game/game.css",
            "game/inn-animation.css",
            "shared/image-popup.css",
        ],
        sharedJs: [
            "shared/bounce-back.js",
            "shared/action-guard.js",
            "shared/exit-confirm.js",
            "shared/typewriter.js",
            "shared/status-bars.js",
            "shared/image-popup.js",
            "shared/text-timing.js",
            "shared/popup.js",
            "shared/api-discovery.js",
            "shared/device-id.js",
            "shared/session-heartbeat.js",
            "shared/dice-3d.js",
        ],
        js: [
            "game/game-travel-prep.js",
            "game/game-quest-popup.js",
            "game/game-enhancer.js",
            "game/game-particles.js",
            "game/game-core.js",
            "game/game-renderer.js",
            "game/game-quests.js",
            "game/game-status.js",
            "game/game-skills.js",
            "game/game-dialogue.js",
            "game/game-characters.js",
            "game/game-ui.js",
            "game/game-transitions.js",
            "game/inn-animation.js",
        ],
        init: function () {
            /* game-core.js registers DOMContentLoaded but it already fired.
               In SPA mode, we call init() directly. */
            if (typeof init === "function") return init();
        },
    });

})();
