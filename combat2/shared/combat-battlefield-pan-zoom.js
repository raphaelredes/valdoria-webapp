/**
 * Pan + zoom na área da arena (.battlefield) sem quebrar cliques em cards.
 * - Mouse: arrastar com botão esquerdo, scroll (roda) para zoom no ponteiro
 * - Toque: um dedo arrasta; dois dedos = pinça (zoom)
 * - Após um arrasto real, suprime o próximo "click" para não abrir ficha/alvo por engano
 *
 * Correção (2026-04): não chamar setPointerCapture no pointerdown — isso retargetava
 * o click para a viewport e os listeners em .cell[data-clickable] deixavam de disparar.
 * Só capturamos o pointer depois que o movimento ultrapassa PAN_THRESH (pan real).
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

        /* Estado persiste entre re-mounts (render() recria o DOM, mas o transform
           de pan/zoom deve continuar onde estava). Jogador só percebe mudança quando
           movimentar ou dar zoom manualmente. Reset explícito via resetPanState(). */
        var persisted = (typeof global.__bfPanState === 'object' && global.__bfPanState) ? global.__bfPanState : null;
        var scale = persisted ? persisted.scale : 1;
        var tx = persisted ? persisted.tx : 0;
        var ty = persisted ? persisted.ty : 0;
        var hasInitialFit = !!persisted;
        var MIN = 0.35;
        var MAX = 2.45;
        var PAN_THRESH = 10;
        var lastPanTs = 0;

        function saveState() {
            global.__bfPanState = { scale: scale, tx: tx, ty: ty };
        }

        /* Auto-fit: calcula scale inicial pra que o stage (arena inteira) caiba no viewport.
           Roda no attach + quando viewport muda de tamanho (rotação, resize).

           2026-05-18 USER REQUEST: combate com poucos combatentes (<=4 cards
           ocupados visíveis na arena) deve dar zoom in pra focar — combate
           1v1, 1v2, 2v2 ficavam minúsculos no viewport. Heurística:
             - count occupied cells (.cell.occupied)
             - <=4 cells: usar fit * 1.6 (mais focado, até MAX_FOCUS=1.6)
             - >4 cells: comportamento atual (fit natural, fitX/fitY/1)
           Jogador pode dar zoom out manualmente depois. */
        var FOCUSED_ZOOM_BOOST = 1.6;
        var FOCUSED_THRESHOLD = 4;
        function _countOccupiedCells() {
            try {
                var occ = stage.querySelectorAll('.cell.occupied');
                return occ ? occ.length : 0;
            } catch (_) { return 0; }
        }
        function fitToViewport() {
            var vw = viewport.clientWidth || 0;
            var vh = viewport.clientHeight || 0;
            if (!vw || !vh) return;
            /* reset transform pra medir dimensões naturais do stage */
            stage.style.transform = '';
            var sw = stage.scrollWidth || stage.offsetWidth || 0;
            var sh = stage.scrollHeight || stage.offsetHeight || 0;
            if (!sw || !sh) return;
            /* padding de 8px em cada lado pra não ficar colado na borda */
            var fitX = (vw - 16) / sw;
            var fitY = (vh - 16) / sh;
            var fit = Math.min(fitX, fitY, 1);
            /* Combate com poucos inimigos → boost zoom pra focar. */
            var occCount = _countOccupiedCells();
            if (occCount > 0 && occCount <= FOCUSED_THRESHOLD) {
                fit = Math.min(fit * FOCUSED_ZOOM_BOOST, MAX);
            }
            if (fit < MIN) fit = MIN;
            scale = fit;
            /* centraliza horizontal e vertical */
            tx = (vw - sw * scale) / 2;
            ty = (vh - sh * scale) / 2;
            apply();
        }

        var mouseActive = null;
        var touchPan = null;
        var pinch = null;

        function apply() {
            stage.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + scale + ')';
            saveState();
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
            /* Não setPointerCapture aqui — ver cabeçalho. */
            mouseActive = {
                id: e.pointerId,
                sx: e.clientX,
                sy: e.clientY,
                stx: tx,
                sty: ty,
                didPan: false,
                ptrCaptured: false
            };
        }

        function onPointerMove(e) {
            if (!mouseActive || e.pointerId !== mouseActive.id) return;
            if (e.pointerType !== 'mouse') return;
            var dx = e.clientX - mouseActive.sx;
            var dy = e.clientY - mouseActive.sy;
            if (!mouseActive.didPan && dist(0, 0, dx, dy) > PAN_THRESH) {
                mouseActive.didPan = true;
                try {
                    viewport.setPointerCapture(e.pointerId);
                    mouseActive.ptrCaptured = true;
                } catch (err) {}
            }
            if (mouseActive.didPan) {
                tx = mouseActive.stx + dx;
                ty = mouseActive.sty + dy;
                clampPanSoft();
                apply();
            }
        }

        function endMouseActive(e) {
            if (!mouseActive || e.pointerId !== mouseActive.id) return;
            if (mouseActive.ptrCaptured) {
                try {
                    viewport.releasePointerCapture(e.pointerId);
                } catch (err2) {}
            }
            if (mouseActive.didPan) lastPanTs = Date.now();
            mouseActive = null;
        }

        function onPointerUp(e) {
            endMouseActive(e);
        }

        function onLostPointerCapture(e) {
            if (!mouseActive || e.pointerId !== mouseActive.id) return;
            mouseActive.ptrCaptured = false;
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

        /* ---------- Toque: pan 1 dedo + pinça 2 dedos ---------- */
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
                if (!touchPan.didPan && dist(0, 0, dx, dy) > PAN_THRESH) touchPan.didPan = true;
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

        apply();

        viewport.addEventListener('pointerdown', onPointerDown);
        viewport.addEventListener('pointermove', onPointerMove);
        viewport.addEventListener('pointerup', onPointerUp);
        viewport.addEventListener('pointercancel', onPointerUp);
        viewport.addEventListener('lostpointercapture', onLostPointerCapture);
        viewport.addEventListener('wheel', onWheel, { passive: false });
        viewport.addEventListener('touchstart', onTouchStart, { passive: true });
        viewport.addEventListener('touchmove', onTouchMove, { passive: false });
        viewport.addEventListener('touchend', onTouchEnd, { passive: true });
        viewport.addEventListener('touchcancel', onTouchEnd, { passive: true });

        window.addEventListener('click', onWinClickCapture, true);

        /* Auto-fit só no primeiro mount (estado não persistido ainda).
           Em re-mounts após rolagens/renders, restaura o scale/tx/ty que o jogador
           configurou (ou o fit inicial). Usa rAF duplo pra aguardar layout final. */
        function runFitIfNeeded() {
            if (hasInitialFit) {
                /* Estado restaurado — só reaplica transform no stage novo */
                requestAnimationFrame(apply);
                return;
            }
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    fitToViewport();
                    hasInitialFit = true;
                });
            });
        }
        runFitIfNeeded();
        /* 2026-05-18: expoe actions pra botoes UI (zoom in/out/fit). Cada attach()
           sobrescreve — em re-mounts da arena, a viewport mais recente fica ativa. */
        global.__bfPanActions = {
            zoomIn: function () { zoomAtViewport(null, null, 1.25); },
            zoomOut: function () { zoomAtViewport(null, null, 1 / 1.25); },
            fit: function () { hasInitialFit = false; runFitIfNeeded(); }
        };
        /* Resize da viewport (rotação, fullscreen) re-executa fit do zero — evento raro */
        var _ro = null;
        function onResize() {
            hasInitialFit = false;
            runFitIfNeeded();
        }
        if (typeof ResizeObserver !== 'undefined') {
            _ro = new ResizeObserver(onResize);
            _ro.observe(viewport);
        } else {
            window.addEventListener('resize', onResize);
        }

        return function teardown() {
            viewport.removeEventListener('pointerdown', onPointerDown);
            viewport.removeEventListener('pointermove', onPointerMove);
            viewport.removeEventListener('pointerup', onPointerUp);
            viewport.removeEventListener('pointercancel', onPointerUp);
            viewport.removeEventListener('lostpointercapture', onLostPointerCapture);
            viewport.removeEventListener('wheel', onWheel);
            viewport.removeEventListener('touchstart', onTouchStart);
            viewport.removeEventListener('touchmove', onTouchMove);
            viewport.removeEventListener('touchend', onTouchEnd);
            viewport.removeEventListener('touchcancel', onTouchEnd);
            window.removeEventListener('click', onWinClickCapture, true);
            if (_ro) { try { _ro.disconnect(); } catch (eRo) {} _ro = null; }
            else { window.removeEventListener('resize', onResize); }
            /* Não limpa transform — estado persisted garante que o próximo mount
               restaura o mesmo pan/zoom sem piscar. */
        };
    }

    /* resetPanState: limpa o estado persistido (chamar no Restart pra voltar ao fit inicial) */
    function resetPanState() { global.__bfPanState = null; }
    /* 2026-05-18 USER REQUEST: API publica pra integrar botoes UI (zoom in/out/fit).
       Cada attach() expoe estes via __bfPanActions; ultima attach() vence. */
    global.ValdoriaBattlefieldPanZoom = {
        attach: attach,
        resetPanState: resetPanState,
        zoomIn: function () { try { global.__bfPanActions && global.__bfPanActions.zoomIn(); } catch (_) {} },
        zoomOut: function () { try { global.__bfPanActions && global.__bfPanActions.zoomOut(); } catch (_) {} },
        fit: function () { try { global.__bfPanActions && global.__bfPanActions.fit(); } catch (_) {} },
    };
})(typeof window !== 'undefined' ? window : this);
