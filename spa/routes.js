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

    /* Prologue route */
    SpaRouter.register("prologue", {
        page: "prologue/index.html",
        external: [
            "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js",
        ],
        css: [
            "shared/animations.css",
            "shared/loading.css",
            "prologue/prologue.css",
        ],
        sharedJs: [
            "shared/bounce-back.js",
            "shared/exit-confirm.js",
            "shared/session-heartbeat.js",
            "shared/fetch-utils.js",
            "shared/dice-3d.js",
            "shared/text-timing.js",
        ],
        js: [
            "prologue/prologue.js",
        ],
        init: function () {
            /* prologue.js calls boot() at module level — self-initializing */
        },
        cleanup: function () {
            /* Stop any timers/intervals set by prologue */
            if (window._prologueInitLoading) {
                try { window._prologueInitLoading.hide(); } catch(e) {}
            }
        },
    });

    /* Market route */
    SpaRouter.register("market", {
        page: "market/index.html",
        css: [
            "shared/animations.css",
            "shared/loading.css",
            "shared/image-popup.css",
            "market/market.css",
        ],
        sharedJs: [
            "shared/bounce-back.js",
            "shared/exit-confirm.js",
            "shared/session-heartbeat.js",
            "shared/fetch-utils.js",
            "shared/text-timing.js",
            "shared/image-popup.js",
        ],
        js: [
            "market/market-loading.js",
            "market/market-app.js",
        ],
        init: function () {
            /* market-app.js calls init() at module level */
        },
        cleanup: function () {
            if (window._marketLoadingCtrl) {
                try { window._marketLoadingCtrl.hide(); } catch(e) {}
            }
        },
    });

    /* LevelUp route */
    SpaRouter.register("levelup", {
        page: "levelup/index.html",
        css: [
            "shared/animations.css",
            "shared/loading.css",
            "levelup/levelup.css",
        ],
        sharedJs: [
            "shared/bounce-back.js",
            "shared/exit-confirm.js",
            "shared/session-heartbeat.js",
            "shared/fetch-utils.js",
            "shared/text-timing.js",
        ],
        js: [
            "levelup/data.js",
            "levelup/levelup-loading.js",
            "levelup/levelup-app.js",
        ],
        init: function () {
            /* levelup-app.js self-initializes via IIFE init() */
        },
        cleanup: function () {
            if (window._lvlInitLoading) {
                try { window._lvlInitLoading.hide(); } catch(e) {}
            }
        },
    });

    /* Guide route */
    SpaRouter.register("guide", {
        page: "guide/index.html",
        css: [
            "shared/animations.css",
            "guide/guide.css",
        ],
        sharedJs: [
            "shared/exit-confirm.js",
        ],
        js: [
            "guide/guide-data.js",
            "guide/guide-app.js",
        ],
        init: function (params) {
            /* guide-app.js self-initializes via __spaRouteName check */
        },
        cleanup: function () {
            /* guide-app.js IIFE state is scoped; DOM cleanup via routeRoot.innerHTML = "" */
        },
    });

})();
