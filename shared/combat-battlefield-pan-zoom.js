/**
 * Pan + zoom na área da arena (.battlefield) sem quebrar cliques em cards.
 * - Mouse: arrastar com botão esquerdo, scroll (roda) para zoom no ponteiro
 * - Toque: um dedo arrasta; dois dedos = pinça (zoom)
 * - Após um arrasto real, suprime o próximo "click" para não abrir ficha/alvo por engano
 */
(function (global) {
    'use strict';

    function clamp(n, a, b) {
        return Math.max(a, Math.min(b, n));
    }

    function dist(ax, ay, bx, by) {
        var dx = bx - ax;
        var dy = by - ay;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * @param {HTMLElement} viewport — elemento [data-bf-pan-viewport]
     * @returns {function(): void} teardown
     */
    function attach(viewport) {
        if (!viewport || viewport.nodeType !== 1) return function () {};
        var stage = viewport.querySelector('[data-bf-pan-stage]');
        if (!stage) return function () {};

        var scale = 1;
        var tx = 0;
        var ty = 0;
        var MIN = 0.40;
        var MAX = 2.45;
        /* Threshold gordo pra touch (dedo wobbla no toque). Mouse usa o antigo. */
        var PAN_THRESH = 10;
        var TOUCH_PAN_THRESH = 24;
        var lastPanTs = 0;

        var mouseActive = null;
        var touchPan = null;
        var pinch = null;

        function apply() {
            stage.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + scale + ')';
        }

        /* Fit stage into viewport (height-limited): calcula scale que cabe
           todas as 4 linhas da arena sem cortar retaguarda aliada.
           Telegram WebApp em mobile força viewport estreito e alto; cells
           usam clamp(96px,22.5vw,112px) → 4 rows excedem altura disponível. */
        function computeFitScale() {
            var vpW = viewport.clientWidth || 0;
            var vpH = viewport.clientHeight || 0;
            var stW = stage.scrollWidth || stage.offsetWidth || vpW;
            var stH = stage.scrollHeight || stage.offsetHeight || vpH;
            if (vpW <= 0 || vpH <= 0 || stH <= 0) return 1;
            var sW = vpW / stW;
            var sH = vpH / stH;
            var s = Math.min(sW, sH, 1);
            return clamp(s, MIN, 1);
        }

        function applyFit() {
            scale = computeFitScale();
            tx = 0;
            ty = 0;
            apply();
        }

        function clampPanSoft() {
            var w = viewport.clientWidth || 0;
            var h = viewport.clientHeight || 0;
            var margin = Math.max(w, h) * 1.35 * scale;
            tx = clamp(tx, -margin, margin);
            ty = clamp(ty, -margin, margin);
        }

        function zoomAtViewport(anchorVX, anchorVY, factor) {
            var rect = viewport.getBoundingClientRect();
            var ax = anchorVX != null ? anchorVX : rect.width * 0.5;
            var ay = anchorVY != null ? anchorVY : rect.height * 0.5;
            var prev = scale;
            var next = clamp(prev * factor, MIN, MAX);
            if (Math.abs(next - prev) < 1e-6) return;
            var k = next / prev;
            tx = ax - k * (ax - tx);
            ty = ay - k * (ay - ty);
            scale = next;
            clampPanSoft();
            apply();
        }

        function onWinClickCapture(e) {
            if (Date.now() - lastPanTs > 480) return;
            if (!viewport.contains(e.target)) return;
            e.stopImmediatePropagation();
            e.preventDefault();
        }

        /* ---------- Mouse (PointerEvents só para mouse) ---------- */
        function onPointerDown(e) {
            if (e.pointerType !== 'mouse') return;
            if (e.button !== 0) return;
            if (e.target.closest && (e.target.closest('button') || e.target.closest('a'))) return;
            try {
                viewport.setPointerCapture(e.pointerId);
            } catch (err) {}
            mouseActive = {
                id: e.pointerId,
                sx: e.clientX,
                sy: e.clientY,
                stx: tx,
                sty: ty,
                didPan: false
            };
        }

        function onPointerMove(e) {
            if (!mouseActive || e.pointerId !== mouseActive.id) return;
            if (e.pointerType !== 'mouse') return;
            var dx = e.clientX - mouseActive.sx;
            var dy = e.clientY - mouseActive.sy;
            if (!mouseActive.didPan && dist(0, 0, dx, dy) > PAN_THRESH) mouseActive.didPan = true;
            if (mouseActive.didPan) {
                tx = mouseActive.stx + dx;
                ty = mouseActive.sty + dy;
                clampPanSoft();
                apply();
            }
        }

        function onPointerUp(e) {
            if (!mouseActive || e.pointerId !== mouseActive.id) return;
            try {
                viewport.releasePointerCapture(e.pointerId);
            } catch (err2) {}
            if (mouseActive.didPan) lastPanTs = Date.now();
            mouseActive = null;
        }

        function onWheel(e) {
            if (e.ctrlKey) return;
            e.preventDefault();
            var rect = viewport.getBoundingClientRect();
            var mx = e.clientX - rect.left;
            var my = e.clientY - rect.top;
            var dir = e.deltaY < 0 ? 1.09 : 0.91;
            zoomAtViewport(mx, my, dir);
        }

        /* ---------- Toque: pan 1 dedo + pinça 2 dedos ----------
           FIX (2026-04-20): quando o toque inicial cai em .cell/[data-clickable]
           ou em um <button>, NAO inicia pan. Previne bug onde dedo wobbla
           ~10-20px no toque em card de inimigo e o panzoom rouba o click,
           bloqueando seleção de alvo. Pinça 2 dedos continua permitida. */
        function onTouchStart(e) {
            if (e.touches.length === 2) {
                touchPan = null;
                var t0 = e.touches[0];
                var t1 = e.touches[1];
                var rect = viewport.getBoundingClientRect();
                pinch = {
                    d0: dist(t0.clientX, t0.clientY, t1.clientX, t1.clientY) || 1,
                    s0: scale,
                    tx0: tx,
                    ty0: ty,
                    mx: (t0.clientX + t1.clientX) / 2 - rect.left,
                    my: (t0.clientY + t1.clientY) / 2 - rect.top
                };
                return;
            }
            if (e.touches.length === 1) {
                pinch = null;
                var tt = e.touches[0];
                /* Nao inicia pan se o toque é em elemento clicavel (card, botao). */
                if (e.target && e.target.closest && (
                        e.target.closest('[data-clickable="1"]') ||
                        e.target.closest('button') ||
                        e.target.closest('a') ||
                        e.target.closest('[data-act]'))) {
                    touchPan = null;
                    return;
                }
                touchPan = {
                    sx: tt.clientX,
                    sy: tt.clientY,
                    stx: tx,
                    sty: ty,
                    didPan: false
                };
            }
        }

        function onTouchMove(e) {
            if (pinch && e.touches.length >= 2) {
                e.preventDefault();
                var p0 = e.touches[0];
                var p1 = e.touches[1];
                var d = dist(p0.clientX, p0.clientY, p1.clientX, p1.clientY) || 1;
                var next = clamp(pinch.s0 * (d / pinch.d0), MIN, MAX);
                var k = next / scale;
                tx = pinch.mx - k * (pinch.mx - pinch.tx0);
                ty = pinch.my - k * (pinch.my - pinch.ty0);
                scale = next;
                clampPanSoft();
                apply();
                return;
            }
            if (touchPan && e.touches.length === 1) {
                var t = e.touches[0];
                var dx = t.clientX - touchPan.sx;
                var dy = t.clientY - touchPan.sy;
                /* Threshold maior pra touch (dedo wobbla). */
                if (!touchPan.didPan && dist(0, 0, dx, dy) > TOUCH_PAN_THRESH) touchPan.didPan = true;
                if (touchPan.didPan) {
                    e.preventDefault();
                    tx = touchPan.stx + dx;
                    ty = touchPan.sty + dy;
                    clampPanSoft();
                    apply();
                }
            }
        }

        function onTouchEnd(e) {
            if (pinch && e.touches.length < 2) pinch = null;
            if (touchPan) {
                if (touchPan.didPan) lastPanTs = Date.now();
                if (e.touches.length === 0) touchPan = null;
            }
        }

        /* Apply fit-scale on mount — 2 passes (DOM may not be laid out yet on first frame).
           Sem fit inicial, 4 rows da arena (RETAGUARDA aliada) ficam cortadas em viewports
           mobile estreitos (Telegram WebApp ~430x700). */
        applyFit();
        requestAnimationFrame(applyFit);
        setTimeout(applyFit, 80);

        /* Re-fit em resize / orientationchange. */
        function onResize() { applyFit(); }
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onResize);

        viewport.addEventListener('pointerdown', onPointerDown);
        viewport.addEventListener('pointermove', onPointerMove);
        viewport.addEventListener('pointerup', onPointerUp);
        viewport.addEventListener('pointercancel', onPointerUp);
        viewport.addEventListener('wheel', onWheel, { passive: false });
        viewport.addEventListener('touchstart', onTouchStart, { passive: true });
        viewport.addEventListener('touchmove', onTouchMove, { passive: false });
        viewport.addEventListener('touchend', onTouchEnd, { passive: true });
        viewport.addEventListener('touchcancel', onTouchEnd, { passive: true });

        window.addEventListener('click', onWinClickCapture, true);

        return function teardown() {
            viewport.removeEventListener('pointerdown', onPointerDown);
            viewport.removeEventListener('pointermove', onPointerMove);
            viewport.removeEventListener('pointerup', onPointerUp);
            viewport.removeEventListener('pointercancel', onPointerUp);
            viewport.removeEventListener('wheel', onWheel);
            viewport.removeEventListener('touchstart', onTouchStart);
            viewport.removeEventListener('touchmove', onTouchMove);
            viewport.removeEventListener('touchend', onTouchEnd);
            viewport.removeEventListener('touchcancel', onTouchEnd);
            window.removeEventListener('click', onWinClickCapture, true);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
            stage.style.transform = '';
        };
    }

    global.ValdoriaBattlefieldPanZoom = { attach: attach };
})(typeof window !== 'undefined' ? window : this);
