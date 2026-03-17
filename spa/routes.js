/* SPA Route Definitions */
(function () {
    "use strict";

    /* Game Hub route */
    SpaRouter.register("game", {
        page: "game/index.html",
        external: [
            { src: "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js", integrity: "sha384-qOkzR5Ke/XkQxuGVJ9hpFEpDlcoLtWwVYhnJf06cLIZa2vaIptSqaubivErzmD5O" },
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
            /* Release wake lock in menu */
            window.__spaWakeLockActive = false;
            if (window.vWakeLock) vWakeLock.release();
            /* game-core.js registers DOMContentLoaded but it already fired.
               In SPA mode, we call init() directly. */
            if (typeof init === "function") return init();
        },
    });

    /* Prologue route */
    SpaRouter.register("prologue", {
        page: "prologue/index.html",
        external: [
            { src: "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js", integrity: "sha384-qOkzR5Ke/XkQxuGVJ9hpFEpDlcoLtWwVYhnJf06cLIZa2vaIptSqaubivErzmD5O" },
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
            window.__spaWakeLockActive = true;
            if (window.vWakeLock) vWakeLock.request();
            /* prologue.js calls boot() at module level — self-initializing */
        },
        cleanup: function () {
            window.__spaWakeLockActive = false;
            if (window.vWakeLock) vWakeLock.release();
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

    /* Inventory route */
    SpaRouter.register("inventory", {
        page: "inventory/index.html",
        css: [
            "shared/status-bars.css",
            "shared/toast.css",
            "shared/tabs.css",
            "shared/animations.css",
            "shared/loading.css",
            "shared/image-popup.css",
            "inventory/inventory.css",
        ],
        sharedJs: [
            "shared/bounce-back.js",
            "shared/exit-confirm.js",
            "shared/session-heartbeat.js",
            "shared/fetch-utils.js",
            "shared/text-timing.js",
            "shared/api-discovery.js",
            "shared/device-id.js",
            "shared/status-bars.js",
            "shared/toast.js",
            "shared/image-popup.js",
        ],
        js: [
            "inventory/inventory-loading.js",
            "inventory/inventory.js",
            "inventory/inventory-tabs.js",
            "inventory/inventory-details.js",
            "inventory/inventory-actions.js",
        ],
        init: function () {
            /* inventory.js self-initializes at module level */
        },
        cleanup: function () {
            if (window._invLoadingCtrl) {
                try { window._invLoadingCtrl.hide(); } catch(e) {}
            }
        },
    });

    /* Combat route */
    SpaRouter.register("combat", {
        page: "combat/index.html",
        external: [
            { src: "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js", integrity: "sha384-qOkzR5Ke/XkQxuGVJ9hpFEpDlcoLtWwVYhnJf06cLIZa2vaIptSqaubivErzmD5O" },
        ],
        css: [
            "shared/status-bars.css",
            "shared/animations.css",
            "shared/dice-roller.css",
            "shared/loading.css",
            "shared/image-popup.css",
            "combat/combat.css",
        ],
        sharedJs: [
            "shared/bounce-back.js",
            "shared/exit-confirm.js",
            "shared/session-heartbeat.js",
            "shared/status-bars.js",
            "shared/motion.js",
            "shared/fetch-utils.js",
            "shared/dice-roller.js",
            "shared/dice-3d.js",
            "shared/combat-vfx.js",
            "shared/text-timing.js",
            "shared/api-discovery.js",
            "shared/device-id.js",
            "shared/image-popup.js",
        ],
        js: [
            "combat/combat-loading.js",
            "combat/combat-audio.js",
            "combat/combat-data.js",
            "combat/combat-vfx.js",
            "combat/combat-dice.js",
            "combat/combat-ui.js",
            "combat/combat.js",
        ],
        init: function () {
            window.__spaWakeLockActive = true;
            if (window.vWakeLock) vWakeLock.request();
            /* combat.js self-initializes at module level */
        },
        cleanup: function () {
            window.__spaWakeLockActive = false;
            if (window.vWakeLock) vWakeLock.release();
            if (window._combatLoadingCtrl) {
                try { window._combatLoadingCtrl.hide(); } catch(e) {}
            }
            // Clear combat intervals
            if (typeof _timerInterval !== "undefined" && _timerInterval) { clearInterval(_timerInterval); }
            if (typeof _heartbeatInterval !== "undefined" && _heartbeatInterval) { clearInterval(_heartbeatInterval); }
            if (typeof _pollTimeout !== "undefined" && _pollTimeout) { clearTimeout(_pollTimeout); }
        },
    });

    /* Explore route */
    SpaRouter.register("explore", {
        page: "explore/index.html",
        external: [
            { src: "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js", integrity: "sha384-qOkzR5Ke/XkQxuGVJ9hpFEpDlcoLtWwVYhnJf06cLIZa2vaIptSqaubivErzmD5O" },
        ],
        css: [
            "shared/status-bars.css",
            "shared/animations.css",
            "shared/loading.css",
            "shared/image-popup.css",
            "explore/explore.css",
        ],
        sharedJs: [
            "shared/bounce-back.js",
            "shared/exit-confirm.js",
            "shared/typewriter.js",
            "shared/session-heartbeat.js",
            "shared/status-bars.js",
            "shared/motion.js",
            "shared/fetch-utils.js",
            "shared/dice-3d.js",
            "shared/text-timing.js",
            "shared/api-discovery.js",
            "shared/device-id.js",
            "shared/image-popup.js",
        ],
        js: [
            "explore/explore-loading.js",
            "explore/explore-iso.js",
            "explore/explore-tiles.js",
            "explore/explore-fog.js",
            "explore/explore-travel.js",
            "explore/explore-movement.js",
            "explore/explore-renderer.js",
            "explore/explore-narrations.js",
            "explore/explore-stories.js",
            "explore/explore-tutorial.js",
            "explore/explore-core.js",
            "explore/explore-events.js",
            "explore/explore-events-pace.js",
            "explore/explore-events-hazards.js",
            "explore/explore-events-rest.js",
            "explore/explore-events-tiles.js",
            "explore/explore-particles.js",
        ],
        init: function () {
            window.__spaWakeLockActive = true;
            if (window.vWakeLock) vWakeLock.request();
            /* In SPA mode, DOMContentLoaded already fired — call initAsync directly */
            if (typeof initAsync === "function") return initAsync();
        },
        cleanup: function () {
            window.__spaWakeLockActive = false;
            if (window.vWakeLock) vWakeLock.release();
            if (window._loadingCtrl) {
                try { window._loadingCtrl.cleanup(); } catch(e) {}
            }
            // Cancel explore render loop and intervals
            if (typeof _rafId !== "undefined" && _rafId) { cancelAnimationFrame(_rafId); }
            if (typeof _travelRaf !== "undefined" && _travelRaf) { cancelAnimationFrame(_travelRaf); }
        },
    });

    /* Navigate route */
    SpaRouter.register("navigate", {
        page: "navigate/index.html",
        css: [
            "shared/animations.css",
            "shared/loading.css",
            "navigate/navigate.css",
        ],
        sharedJs: [
            "shared/bounce-back.js",
            "shared/exit-confirm.js",
            "shared/fetch-utils.js",
            "shared/text-timing.js",
            "shared/api-discovery.js",
            "shared/device-id.js",
            "shared/session-heartbeat.js",
        ],
        js: [
            "navigate/map-layout.js",
            "navigate/navigate-core.js",
            "navigate/navigate-map.js",
            "navigate/navigate-map-terrain.js",
            "navigate/navigate-map-decor.js",
            "navigate/navigate-ambient.js",
            "navigate/navigate-ui.js",
            "navigate/navigate-fontpicker.js",
        ],
        init: function () {
            window.__spaWakeLockActive = true;
            if (window.vWakeLock) vWakeLock.request();
            /* In SPA mode, DOMContentLoaded already fired — call initAsync directly */
            if (typeof initAsync === "function") return initAsync();
        },
        cleanup: function () {
            window.__spaWakeLockActive = false;
            if (window.vWakeLock) vWakeLock.release();
            /* Cancel navigate intervals */
            if (typeof _ttRAF !== "undefined" && _ttRAF) { cancelAnimationFrame(_ttRAF); }
        },
    });

    /* Pix route */
    SpaRouter.register("pix", {
        page: "pix/index.html",
        css: [
            "shared/animations.css",
            "pix/pix.css",
        ],
        sharedJs: [
            "shared/exit-confirm.js",
        ],
        external: [
            { src: "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js", integrity: "sha384-3zSEDfvllQohrq0PHL1fOXJuC/jSOO34H46t6UQfobFOmxE5BpjjaIJY5F2/bMnU" },
        ],
        js: [
            "pix/pix-app.js",
        ],
        init: function () { /* pix-app.js self-initializes at module level */ },
        cleanup: function () {},
    });

    /* Workstation (Crafting) route */
    SpaRouter.register("workstation", {
        page: "workstation/index.html",
        css: [
            "shared/animations.css",
            "shared/loading.css",
            "workstation/workstation.css",
        ],
        sharedJs: [
            "shared/bounce-back.js",
            "shared/exit-confirm.js",
            "shared/fetch-utils.js",
        ],
        js: [
            "workstation/workstation-loading.js",
            "workstation/workstation-app.js",
        ],
        init: function () { /* workstation-app.js self-initializes at module level */ },
        cleanup: function () {
            if (window._craftLoadingCtrl) {
                try { window._craftLoadingCtrl.hide(); } catch(e) {}
            }
        },
    });

    /* Dice route */
    SpaRouter.register("dice", {
        page: "dice/index.html",
        external: [
            { src: "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js", integrity: "sha384-qOkzR5Ke/XkQxuGVJ9hpFEpDlcoLtWwVYhnJf06cLIZa2vaIptSqaubivErzmD5O" },
        ],
        css: [
            "shared/animations.css",
            "dice/dice.css",
        ],
        sharedJs: [
            "shared/bounce-back.js",
            "shared/exit-confirm.js",
        ],
        js: [
            "dice/dice-app.js",
        ],
        init: function () { /* dice-app.js self-initializes at module level */ },
        cleanup: function () {},
    });

    /* Character Creator route */
    SpaRouter.register("character_creator", {
        page: "character_creator/index.html",
        css: [
            "shared/animations.css",
            "shared/loading.css",
            "character_creator/creator.css",
        ],
        sharedJs: [
            "shared/bounce-back.js",
            "shared/exit-confirm.js",
            "shared/text-timing.js",
        ],
        js: [
            "character_creator/data.js",
            "character_creator/personality_data.js",
            "character_creator/creator-loading.js",
            "character_creator/creator-app.js",
        ],
        init: function () { /* creator-app.js self-initializes via IIFE init() */ },
        cleanup: function () {
            if (window._ccLoadingCtrl) {
                try { window._ccLoadingCtrl.hide(); } catch(e) {}
            }
        },
    });

    /* Dungeon route */
    SpaRouter.register("dungeon", {
        page: "dungeon/index.html",
        css: [
            "shared/animations.css",
            "shared/loading.css",
            "dungeon/dungeon.css",
        ],
        sharedJs: [
            "shared/bounce-back.js",
            "shared/exit-confirm.js",
            "shared/session-heartbeat.js",
            "shared/motion.js",
            "shared/fetch-utils.js",
            "shared/text-timing.js",
            "shared/api-discovery.js",
        ],
        js: [
            "dungeon/dungeon-loading.js",
            "dungeon/dungeon-core.js",
            "dungeon/dungeon-map.js",
            "dungeon/dungeon-ui.js",
        ],
        init: function () {
            window.__spaWakeLockActive = true;
            if (window.vWakeLock) vWakeLock.request();
            /* In SPA mode, DOMContentLoaded already fired — call initDungeon directly */
            if (typeof initDungeon === "function") return initDungeon();
        },
        cleanup: function () {
            window.__spaWakeLockActive = false;
            if (window.vWakeLock) vWakeLock.release();
            if (window._dungeonLoadingCtrl) {
                try { window._dungeonLoadingCtrl.hide(); } catch(e) {}
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
