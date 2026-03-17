/* SPA Init - Bootstrap the application */
(function () {
    "use strict";

    function bootstrap() {
        var params = new URLSearchParams(window.location.search);
        var route = params.get("route") || "game";

        /* Pass URL params to the route */
        var routeParams = {};
        params.forEach(function (val, key) {
            if (key !== "route") routeParams[key] = val;
        });

        console.debug("[SPA] Bootstrap: route=" + route);
        SpaRouter.navigate(route, routeParams);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootstrap);
    } else {
        bootstrap();
    }
})();
