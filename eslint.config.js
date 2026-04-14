/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    // All JS files except vendor/generated
    files: ["**/*.js"],
    ignores: [
      "node_modules/**",
      "shared/three.min.js",
      "mockups/**",
      "scripts/**",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script", // vanilla JS, not modules
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        requestIdleCallback: "readonly",
        fetch: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        navigator: "readonly",
        location: "readonly",
        performance: "readonly",
        crypto: "readonly",
        AbortController: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        MutationObserver: "readonly",
        ResizeObserver: "readonly",
        IntersectionObserver: "readonly",
        Audio: "readonly",
        Image: "readonly",
        HTMLElement: "readonly",
        Event: "readonly",
        CustomEvent: "readonly",
        getComputedStyle: "readonly",
        atob: "readonly",
        btoa: "readonly",
        Blob: "readonly",
        FileReader: "readonly",
        FormData: "readonly",
        Headers: "readonly",
        Response: "readonly",
        Request: "readonly",
        WeakSet: "readonly",
        WeakMap: "readonly",
        Map: "readonly",
        Set: "readonly",
        Promise: "readonly",
        Proxy: "readonly",
        Symbol: "readonly",
        // Telegram Mini App
        Telegram: "readonly",
        // Game globals (shared across WebApps)
        ValdoriaAudio: "readonly",
        ValdoriaMotion: "readonly",
        ValdoriaErrors: "readonly",
        ValdoriaEnv: "readonly",
        ValdoriaLoadingHTML: "readonly",
        ValdoriaLoadingLite: "readonly",
        vPopup: "readonly",
        vToast: "readonly",
        vProcessing: "readonly",
        vConnection: "readonly",
        vWakeLock: "readonly",
        vHaptic: "readonly",
        haptic: "readonly",
        escHtml: "readonly",
        fetchT: "readonly",
        fetchJSON: "readonly",
        apiCall: "readonly",
        doAction: "readonly",
        showError: "readonly",
        showToast: "readonly",
        SpaRouter: "readonly",
        valdoriaSpaNav: "readonly",
        SessionHeartbeat: "readonly",
        ApiDiscovery: "readonly",
        Dice3D: "readonly",
        THREE: "readonly",
        // Shared functions
        vBarHpClass: "readonly",
        vBarHpColor: "readonly",
        calcReadTime: "readonly",
        vLoadScripts: "readonly",
      },
    },
    rules: {
      // ERRORS — these catch real bugs
      "no-undef": "off",                // OFF: vanilla JS with many cross-file globals, too noisy
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }],
      "no-dupe-keys": "error",          // duplicate keys in objects
      "no-duplicate-case": "error",     // duplicate case in switch
      "no-unreachable": "error",        // code after return/throw
      "no-constant-condition": "warn",  // if(true), while(true)
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-extra-semi": "error",         // unnecessary semicolons
      "no-func-assign": "error",        // reassigning function declarations
      "no-inner-declarations": "error", // function/var in nested blocks
      "no-irregular-whitespace": "error",
      "no-sparse-arrays": "error",      // [1,,3]
      "no-unexpected-multiline": "error",
      "use-isnan": "error",             // x === NaN (always false)
      "valid-typeof": "error",          // typeof x === "strig"

      // BEST PRACTICES — prevent common mistakes
      "eqeqeq": ["warn", "smart"],      // === instead of ==
      "no-fallthrough": "warn",          // switch fallthrough
      "no-redeclare": "warn",             // var x; var x; (warn only — project uses var hoisting)
      "no-self-assign": "error",         // x = x
      "no-self-compare": "error",        // x === x
      "no-throw-literal": "warn",        // throw "error" instead of throw new Error

      // OFF — these are too noisy for vanilla JS codebase
      "no-console": "off",
      "no-var": "off",                   // project uses var intentionally
      "prefer-const": "off",
      "no-prototype-builtins": "off",
    },
  },
];
