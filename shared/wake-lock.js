/* Wake Lock — keeps screen on during active gameplay */
(function () {
    "use strict";
    var _lock = null;

    window.vWakeLock = {
        request: function () {
            if (!navigator.wakeLock) return;
            navigator.wakeLock.request('screen').then(function (sentinel) {
                _lock = sentinel;
                _lock.addEventListener('release', function () { _lock = null; });
            }).catch(function () { /* unsupported or denied */ });
        },
        release: function () {
            if (_lock) {
                _lock.release().catch(function () {});
                _lock = null;
            }
        }
    };

    // Re-acquire on visibility change (lock is auto-released when tab goes hidden)
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && _lock === null && window.__spaWakeLockActive) {
            vWakeLock.request();
        }
    });
})();
