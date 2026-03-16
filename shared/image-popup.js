/* image-popup.js — Shared tap-to-enlarge image popup for all WebApps */
(function () {
    "use strict";

    var _overlay = null;
    var _busy = false;

    function _ensureDOM() {
        if (_overlay) return;
        var ov = document.createElement("div");
        ov.className = "v-img-popup-overlay";
        ov.innerHTML =
            '<div class="v-img-popup-card">' +
                '<div class="v-img-popup-img-wrap">' +
                    '<button class="v-img-popup-close" aria-label="Fechar">&times;</button>' +
                    '<img class="v-img-popup-img" alt="" loading="lazy">' +
                '</div>' +
                '<div class="v-img-popup-title"></div>' +
                '<div class="v-img-popup-stats"></div>' +
                '<div class="v-img-popup-desc"></div>' +
            '</div>';
        document.body.appendChild(ov);
        _overlay = ov;

        // Close on backdrop tap
        ov.addEventListener("click", function (e) {
            if (e.target === ov) hideImagePopup();
        });
        // Close on X button
        ov.querySelector(".v-img-popup-close").addEventListener("click", function () {
            hideImagePopup();
        });
    }

    /**
     * Show image popup.
     * @param {Object} cfg
     * @param {string} cfg.src - Image URL
     * @param {string} cfg.title - Title text
     * @param {string} [cfg.desc] - Description text
     * @param {Array} [cfg.stats] - [{icon, label, value}]
     * @param {string} [cfg.type] - "enemy"|"location"|"event"
     */
    function showImagePopup(cfg) {
        if (!cfg || !cfg.src || _busy) return;
        _ensureDOM();
        _busy = true;

        var card = _overlay.querySelector(".v-img-popup-card");
        card.setAttribute("data-type", cfg.type || "");

        // Image
        var img = _overlay.querySelector(".v-img-popup-img");
        img.src = cfg.src;
        img.alt = cfg.title || "";
        img.onerror = function () { img.style.display = "none"; };
        img.onload = function () { img.style.display = ""; };

        // Title
        _overlay.querySelector(".v-img-popup-title").textContent = cfg.title || "";

        // Stats
        var statsEl = _overlay.querySelector(".v-img-popup-stats");
        if (cfg.stats && cfg.stats.length > 0) {
            statsEl.innerHTML = cfg.stats.map(function (s) {
                return '<span class="v-img-popup-stat">' +
                    (s.icon || "") + ' ' + (s.label || "") +
                    ' <span class="v-img-popup-stat-val">' + (s.value || "") + '</span>' +
                '</span>';
            }).join("");
            statsEl.style.display = "";
        } else {
            statsEl.style.display = "none";
        }

        // Description
        var descEl = _overlay.querySelector(".v-img-popup-desc");
        if (cfg.desc) {
            descEl.textContent = cfg.desc;
            descEl.style.display = "";
        } else {
            descEl.style.display = "none";
        }

        // Show
        _overlay.style.display = "flex";
        _overlay.classList.remove("hiding");
        // Force reflow for animation
        void _overlay.offsetHeight;
        _overlay.classList.add("active");

        _busy = false;
        if (typeof haptic === "function") haptic("light");
    }

    function hideImagePopup() {
        if (!_overlay || _busy) return;
        _busy = true;
        _overlay.classList.add("hiding");
        _overlay.classList.remove("active");
        setTimeout(function () {
            if (_overlay) {
                _overlay.style.display = "none";
                _overlay.classList.remove("hiding");
            }
            _busy = false;
        }, 300);
    }

    // Expose globally
    window.showImagePopup = showImagePopup;
    window.hideImagePopup = hideImagePopup;
})();
