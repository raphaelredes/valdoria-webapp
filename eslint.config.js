/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    files: ["**/*.js"],
    ignores: [
      "node_modules/**",
      "shared/three.min.js",
      "mockups/**",
      "scripts/**",
      "eslint.config.js",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        /* Browser APIs */
        window: "readonly", document: "readonly", console: "readonly",
        setTimeout: "readonly", clearTimeout: "readonly",
        setInterval: "readonly", clearInterval: "readonly",
        requestAnimationFrame: "readonly", cancelAnimationFrame: "readonly",
        requestIdleCallback: "readonly",
        fetch: "readonly", localStorage: "readonly", sessionStorage: "readonly",
        navigator: "readonly", location: "readonly", performance: "readonly",
        crypto: "readonly", history: "readonly", screen: "readonly",
        alert: "readonly", confirm: "readonly",
        AbortController: "readonly", AbortSignal: "readonly",
        URL: "readonly", URLSearchParams: "readonly",
        MutationObserver: "readonly", ResizeObserver: "readonly",
        IntersectionObserver: "readonly",
        Audio: "readonly", Image: "readonly", ImageData: "readonly",
        HTMLElement: "readonly", HTMLCanvasElement: "readonly",
        HTMLImageElement: "readonly", ImageBitmap: "readonly",
        Event: "readonly", CustomEvent: "readonly", ProgressEvent: "readonly",
        getComputedStyle: "readonly", innerWidth: "readonly", innerHeight: "readonly",
        atob: "readonly", btoa: "readonly",
        Blob: "readonly", FileReader: "readonly", FormData: "readonly",
        Headers: "readonly", Response: "readonly", Request: "readonly",
        ReadableStream: "readonly", DecompressionStream: "readonly",
        TextDecoder: "readonly", DOMParser: "readonly",
        OffscreenCanvas: "readonly", createImageBitmap: "readonly",
        WeakSet: "readonly", WeakMap: "readonly", Map: "readonly", Set: "readonly",
        Promise: "readonly", Proxy: "readonly", Symbol: "readonly",
        QRCode: "readonly",
        /* Service Worker */
        self: "readonly", caches: "readonly",
        /* Node/CommonJS (for config files) */
        require: "readonly", module: "readonly", exports: "readonly",
        process: "readonly", define: "readonly",
        /* THREE.js */
        THREE: "readonly", XRWebGLLayer: "readonly", XRWebGLBinding: "readonly",
        WebGLRenderingContext: "readonly", __THREE_DEVTOOLS__: "writable",
        /* Telegram Mini App */
        Telegram: "readonly",
      },
    },
    rules: {
      /* ========================================
       * TIER 1: REAL BUG CATCHERS (error)
       * ======================================== */
      "no-dupe-args": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-extra-semi": "error",
      "no-func-assign": "error",
      "no-inner-declarations": "error",
      "no-irregular-whitespace": "error",
      "no-sparse-arrays": "error",
      "no-unexpected-multiline": "error",
      "no-unreachable": "error",
      "no-cond-assign": "error",
      "no-constant-binary-expression": "error",
      "no-constant-condition": "warn",
      "no-self-assign": "error",
      "no-self-compare": "error",
      "no-dupe-else-if": "error",
      "no-empty-pattern": "error",
      "use-isnan": "error",
      "valid-typeof": "error",
      "for-direction": "error",
      "no-compare-neg-zero": "error",
      "no-unsafe-negation": "error",
      "no-unsafe-optional-chaining": "error",
      "no-loss-of-precision": "error",
      "no-control-regex": "error",
      "no-empty-character-class": "error",
      "no-invalid-regexp": "error",
      "no-misleading-character-class": "error",
      "no-useless-backreference": "error",
      "no-ex-assign": "error",
      "no-global-assign": "error",
      "no-import-assign": "error",
      "no-debugger": "warn",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-script-url": "error",
      "no-with": "error",
      "no-octal": "error",

      /* ========================================
       * TIER 2: CODE QUALITY (warn)
       * ======================================== */
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }],
      "no-redeclare": "warn",
      "no-template-curly-in-string": "warn",
      "no-useless-assignment": "warn",
      "eqeqeq": ["warn", "smart"],
      "no-fallthrough": "warn",
      "no-throw-literal": "warn",
      "no-return-assign": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-useless-catch": "warn",
      "no-useless-escape": "warn",
      "no-useless-return": "warn",
      "no-loop-func": "warn",
      "no-extend-native": "error",
      "no-new-wrappers": "error",
      "no-caller": "error",
      "no-proto": "error",
      "radix": "warn",

      /* ========================================
       * TIER 3: COMPLEXITY (warn)
       * ======================================== */
      "max-depth": ["warn", 6],
      "max-nested-callbacks": ["warn", 5],
      "max-params": ["warn", 8],

      /* ========================================
       * OFF — intentional for vanilla JS
       * ======================================== */
      "no-undef": "off",
      "no-console": "off",
      "no-var": "off",
      "prefer-const": "off",
      "no-prototype-builtins": "off",
      "no-alert": "off",
    },
  },
];
