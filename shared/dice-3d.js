// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DICE 3D — Shared THREE.js Dice Roller Module
//  Lendas de Valdoria
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Supports: d4, d6, d8, d10, d12, d20
//
// Usage:
//   const dice = new Dice3D(container, { size: 200, dieType: 'd20' });
//   dice.roll(resultValue, () => { /* onDone */ });
//   dice.dispose();
//
// Requires: THREE.js v0.160+ loaded globally
//
// Animation: die spins in place with quartic ease-out, landing on result face.
// Visual: vertex-color gradient, flat shading, gold wireframe, floating labels.

const Dice3D = (() => {
    'use strict';

    const EDGE_COLOR = 0xc4953a;
    const V_GOLD_HEX = '#c4953a';
    const V_SUCCESS_HEX = '#4caf50';
    const V_DANGER_HEX = '#e74c3c';
    const ROLL_MS = 2000;

    function haptic(style) {
        try {
            var tg = window.Telegram && window.Telegram.WebApp;
            if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(style);
        } catch (e) { /* ignore */ }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  SHARED VISUAL HELPERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function makeLabelTexture(num, size) {
        size = size || 256;
        var c = document.createElement('canvas');
        c.width = size; c.height = size;
        var ctx = c.getContext('2d');
        ctx.clearRect(0, 0, size, size);

        var text = String(num);
        var fontSize = text.length > 1 ? size * 0.62 : size * 0.74;
        ctx.font = 'bold ' + fontSize + 'px "Cinzel", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 12;
        ctx.lineJoin = 'round';
        ctx.strokeText(text, size / 2, size / 2);

        ctx.shadowColor = 'rgba(212,175,55,0.6)';
        ctx.shadowBlur = size * 0.08;
        ctx.fillStyle = '#fff8e0';
        ctx.fillText(text, size / 2, size / 2);

        if (num === 6 || num === 9) {
            ctx.shadowBlur = 0;
            var w = ctx.measureText(text).width;
            ctx.fillRect(size / 2 - w / 2, size / 2 + fontSize * 0.36, w, fontSize * 0.07);
        }

        var tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    function applyGradient(geo) {
        var pos = geo.attributes.position;
        var yMin = Infinity, yMax = -Infinity;
        for (var i = 0; i < pos.count; i++) {
            var y = pos.getY(i);
            if (y < yMin) yMin = y;
            if (y > yMax) yMax = y;
        }
        var range = yMax - yMin || 1;
        var colors = new Float32Array(pos.count * 3);
        var cLow = new THREE.Color(0x2a1e10);
        var cHigh = new THREE.Color(0xc4953a);
        var tmp = new THREE.Color();
        for (var i = 0; i < pos.count; i++) {
            var t = (pos.getY(i) - yMin) / range;
            tmp.copy(cLow).lerp(cHigh, t);
            colors[i * 3] = tmp.r;
            colors[i * 3 + 1] = tmp.g;
            colors[i * 3 + 2] = tmp.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }

    function makeBodyMat() {
        return new THREE.MeshPhongMaterial({
            vertexColors: true, shininess: 100,
            specular: new THREE.Color(0x554433), flatShading: true,
        });
    }

    function addEdgeWire(mesh, geo, threshold) {
        var edges = new THREE.EdgesGeometry(geo, threshold || 15);
        mesh.add(new THREE.LineSegments(edges,
            new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.5 })));
    }

    function addLabels(mesh, numbers, centers, normals, labelSize) {
        for (var i = 0; i < numbers.length; i++) {
            var tex = makeLabelTexture(numbers[i], 256);
            var mat = new THREE.MeshBasicMaterial({
                map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
            });
            var plane = new THREE.Mesh(new THREE.PlaneGeometry(labelSize, labelSize), mat);
            var n = normals[i];
            plane.position.copy(centers[i].clone().add(n.clone().multiplyScalar(0.01)));

            var worldUp = new THREE.Vector3(0, 1, 0);
            var faceUp = worldUp.clone().addScaledVector(n, -worldUp.dot(n));
            if (faceUp.lengthSq() < 0.001) {
                faceUp = new THREE.Vector3(1, 0, 0).addScaledVector(n,
                    -new THREE.Vector3(1, 0, 0).dot(n));
            }
            faceUp.normalize();
            var faceRight = new THREE.Vector3().crossVectors(faceUp, n).normalize();
            plane.rotation.setFromRotationMatrix(
                new THREE.Matrix4().makeBasis(faceRight, faceUp, n));
            mesh.add(plane);
        }
    }

    function facesFromTris(geo, count) {
        var pos = geo.attributes.position;
        var centers = [], normals = [];
        for (var f = 0; f < count; f++) {
            var i = f * 3;
            var a = new THREE.Vector3().fromBufferAttribute(pos, i);
            var b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
            var c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
            var center = a.clone().add(b).add(c).divideScalar(3);
            var normal = new THREE.Vector3()
                .crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
            if (normal.dot(center) < 0) normal.negate();
            centers.push(center);
            normals.push(normal);
        }
        return { centers: centers, normals: normals };
    }

    function facesFromClusters(geo) {
        var pos = geo.attributes.position;
        var triCount = pos.count / 3;
        var tN = [], tC = [];
        for (var t = 0; t < triCount; t++) {
            var i = t * 3;
            var a = new THREE.Vector3().fromBufferAttribute(pos, i);
            var b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
            var c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
            tC.push(a.clone().add(b).add(c).divideScalar(3));
            var n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
            if (n.dot(tC[t]) < 0) n.negate();
            tN.push(n);
        }
        var used = [];
        for (var t = 0; t < triCount; t++) used.push(false);
        var centers = [], normals = [];
        for (var t = 0; t < triCount; t++) {
            if (used[t]) continue;
            used[t] = true;
            var cluster = [t];
            for (var u = t + 1; u < triCount; u++) {
                if (!used[u] && tN[t].dot(tN[u]) > 0.999) {
                    used[u] = true;
                    cluster.push(u);
                }
            }
            var center = new THREE.Vector3();
            for (var j = 0; j < cluster.length; j++) center.add(tC[cluster[j]]);
            center.divideScalar(cluster.length);
            centers.push(center);
            normals.push(tN[t]);
        }
        return { centers: centers, normals: normals };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  DIE BUILDERS — label sizes maximized per face type
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function buildD4() {
        var base = new THREE.TetrahedronGeometry(1.1);
        var geo = base.toNonIndexed();
        applyGradient(geo);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        addEdgeWire(mesh, base);
        var numbers = [1, 2, 3, 4];
        var faces = facesFromTris(geo, 4);
        addLabels(mesh, numbers, faces.centers, faces.normals, 0.72);
        mesh.userData = { type: 'd4', numbers: numbers, normals: faces.normals };
        mesh.castShadow = true;
        return mesh;
    }

    function buildD6() {
        var base = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        var geo = base.toNonIndexed();
        applyGradient(geo);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        addEdgeWire(mesh, base);
        var D6_NUMS = [3, 4, 1, 6, 2, 5];
        var pos = geo.attributes.position;
        var centers = [], normals = [];
        for (var f = 0; f < 6; f++) {
            var bi = f * 6;
            var center = new THREE.Vector3();
            for (var v = 0; v < 6; v++) center.add(new THREE.Vector3().fromBufferAttribute(pos, bi + v));
            center.divideScalar(6);
            var a = new THREE.Vector3().fromBufferAttribute(pos, bi);
            var b = new THREE.Vector3().fromBufferAttribute(pos, bi + 1);
            var c = new THREE.Vector3().fromBufferAttribute(pos, bi + 2);
            var n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
            if (n.dot(center) < 0) n.negate();
            centers.push(center);
            normals.push(n);
        }
        addLabels(mesh, D6_NUMS, centers, normals, 0.92);
        mesh.userData = { type: 'd6', numbers: D6_NUMS, normals: normals };
        mesh.castShadow = true;
        return mesh;
    }

    function buildD8() {
        var base = new THREE.OctahedronGeometry(1.05);
        var geo = base.toNonIndexed();
        applyGradient(geo);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        addEdgeWire(mesh, base);
        var numbers = [1, 2, 3, 4, 5, 6, 7, 8];
        var faces = facesFromTris(geo, 8);
        addLabels(mesh, numbers, faces.centers, faces.normals, 0.55);
        mesh.userData = { type: 'd8', numbers: numbers, normals: faces.normals };
        mesh.castShadow = true;
        return mesh;
    }

    function buildD10() {
        var scale = 1.15;
        var step = Math.PI * 2 / 10;
        var hOff = 0.105;
        var rawVerts = [];
        for (var i = 0; i < 10; i++) {
            var angle = i * step;
            rawVerts.push(new THREE.Vector3(
                Math.cos(angle), Math.sin(angle), hOff * (i % 2 ? 1 : -1)
            ).normalize().multiplyScalar(scale));
        }
        rawVerts.push(new THREE.Vector3(0, 0, -1).multiplyScalar(scale));
        rawVerts.push(new THREE.Vector3(0, 0, 1).multiplyScalar(scale));
        var kiteFaces = [
            [5, 7, 11, 0], [4, 2, 10, 1], [1, 3, 11, 2], [0, 8, 10, 3],
            [7, 9, 11, 4], [8, 6, 10, 5], [9, 1, 11, 6], [2, 0, 10, 7],
            [3, 5, 11, 8], [6, 4, 10, 9],
        ];
        var equatTris = [
            [1, 0, 2], [1, 2, 3], [3, 2, 4], [3, 4, 5], [5, 4, 6],
            [5, 6, 7], [7, 6, 8], [7, 8, 9], [9, 8, 0], [9, 0, 1],
        ];
        var positions = [], normArr = [];
        var faceNormals = [], faceCenters = [], faceNumbers = [];
        kiteFaces.forEach(function (face) {
            var a = face[0], b = face[1], pole = face[2], num = face[3];
            var va = rawVerts[a], vb = rawVerts[b], vc = rawVerts[pole];
            positions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z);
            var e1 = new THREE.Vector3().subVectors(vb, va);
            var e2 = new THREE.Vector3().subVectors(vc, va);
            var n = new THREE.Vector3().crossVectors(e1, e2).normalize();
            var center = new THREE.Vector3().addVectors(va, vb).add(vc).divideScalar(3);
            if (n.dot(center) < 0) n.negate();
            normArr.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
            faceNormals.push(n);
            faceCenters.push(center);
            faceNumbers.push(num);
        });
        equatTris.forEach(function (tri) {
            var a = tri[0], b = tri[1], c = tri[2];
            var va = rawVerts[a], vb = rawVerts[b], vc = rawVerts[c];
            positions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z);
            var e1 = new THREE.Vector3().subVectors(vb, va);
            var e2 = new THREE.Vector3().subVectors(vc, va);
            var n = new THREE.Vector3().crossVectors(e1, e2).normalize();
            var center = new THREE.Vector3().addVectors(va, vb).add(vc).divideScalar(3);
            if (n.dot(center) < 0) n.negate();
            normArr.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
        });
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(normArr, 3));
        applyGradient(geo);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        addEdgeWire(mesh, geo, 20);
        addLabels(mesh, faceNumbers, faceCenters, faceNormals, 0.52);
        mesh.userData = { type: 'd10', numbers: faceNumbers, normals: faceNormals };
        mesh.castShadow = true;
        return mesh;
    }

    function buildD12() {
        var base = new THREE.DodecahedronGeometry(1.0);
        var geo = base.toNonIndexed();
        applyGradient(geo);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        addEdgeWire(mesh, base);
        var faces = facesFromClusters(geo);
        var numbers = [];
        for (var i = 1; i <= faces.centers.length; i++) numbers.push(i);
        addLabels(mesh, numbers, faces.centers, faces.normals, 0.62);
        mesh.userData = { type: 'd12', numbers: numbers, normals: faces.normals };
        mesh.castShadow = true;
        return mesh;
    }

    function buildD20() {
        var R = 1.0;
        var baseGeo = new THREE.IcosahedronGeometry(R, 0);
        var geo = baseGeo.toNonIndexed();
        applyGradient(geo);
        var faces = facesFromTris(geo, 20);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        var edgeGeo = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(R * 1.003, 0));
        mesh.add(new THREE.LineSegments(edgeGeo,
            new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.5 })));
        var numbers = [];
        for (var i = 1; i <= 20; i++) numbers.push(i);
        addLabels(mesh, numbers, faces.centers, faces.normals, 0.56);
        mesh.userData = { type: 'd20', numbers: numbers, normals: faces.normals };
        mesh.castShadow = true;
        return mesh;
    }

    var BUILDERS = { d4: buildD4, d6: buildD6, d8: buildD8, d10: buildD10, d12: buildD12, d20: buildD20 };

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  TARGET QUATERNION — orient result face toward camera
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function getTargetQuaternion(mesh, resultValue) {
        var numbers = mesh.userData.numbers;
        var normals = mesh.userData.normals;
        var faceIdx = numbers.indexOf(resultValue);
        if (faceIdx === -1) faceIdx = 0;

        // Align face normal toward camera (Z axis)
        var alignQ = new THREE.Quaternion().setFromUnitVectors(
            normals[faceIdx].clone(),
            new THREE.Vector3(0, 0, 1)
        );
        // Random twist around Z so it doesn't always look the same
        var twistQ = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 0, 1),
            Math.random() * Math.PI * 2
        );
        return twistQ.multiply(alignQ);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  CLASS: Dice3D
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    class Dice3DInstance {
        constructor(container, opts) {
            opts = opts || {};
            this._container = container;
            this._size = opts.size || 200;
            this._dieType = opts.dieType || 'd20';
            this._disposed = false;
            this._animFrame = null;
            this._rolling = false;
            this._rollStart = 0;
            this._rollDuration = ROLL_MS;
            this._startEuler = { x: 0, y: 0, z: 0 };
            this._endEuler = { x: 0, y: 0, z: 0 };
            this._finalQuat = new THREE.Quaternion();
            this._rollCallback = null;
            this._showingResult = false;
            this._idleTime = 0;
            this._dieMesh = null;
            this._particlesEl = opts.particlesContainer || null;

            var W = this._size, H = this._size;

            this._scene = new THREE.Scene();
            this._camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
            this._camera.position.set(0, 0, 4.5);

            this._renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            this._renderer.setSize(W, H);
            this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this._renderer.shadowMap.enabled = true;
            this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.appendChild(this._renderer.domElement);

            // Lighting — warm medieval
            this._scene.add(new THREE.AmbientLight(0xffffff, 0.5));

            var keyLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
            keyLight.position.set(3, 5, 5);
            keyLight.castShadow = true;
            keyLight.shadow.mapSize.set(512, 512);
            this._scene.add(keyLight);

            var fillLight = new THREE.DirectionalLight(0xd4af37, 0.4);
            fillLight.position.set(-4, -1, 3);
            this._scene.add(fillLight);

            var rimLight = new THREE.DirectionalLight(0x8b6914, 0.3);
            rimLight.position.set(0, -4, -3);
            this._scene.add(rimLight);

            this._createMesh();
            this._animate = this._animate.bind(this);
            this._animate(performance.now());
        }

        _createMesh() {
            if (this._dieMesh) {
                this._scene.remove(this._dieMesh);
                this._dieMesh = null;
            }
            var builder = BUILDERS[this._dieType] || BUILDERS.d20;
            this._dieMesh = builder();
            this._dieMesh.position.set(0, 0, 0);
            this._scene.add(this._dieMesh);
        }

        _animate(time) {
            if (this._disposed) return;
            this._animFrame = requestAnimationFrame(this._animate);

            if (this._rolling) {
                this._updateRoll(time);
            } else if (this._showingResult) {
                // Hold still on result
            } else if (this._dieMesh) {
                // Gentle idle rotation
                this._idleTime += 0.012;
                this._dieMesh.rotation.y += 0.003;
                this._dieMesh.rotation.x += 0.001;
            }

            this._renderer.render(this._scene, this._camera);
        }

        _updateRoll(time) {
            var elapsed = time - this._rollStart;
            var t = Math.min(elapsed / this._rollDuration, 1);

            // Quartic ease-out: fast start, smooth deceleration
            var eased = 1 - Math.pow(1 - t, 4);

            var mesh = this._dieMesh;
            mesh.rotation.x = this._startEuler.x + (this._endEuler.x - this._startEuler.x) * eased;
            mesh.rotation.y = this._startEuler.y + (this._endEuler.y - this._startEuler.y) * eased;
            mesh.rotation.z = this._startEuler.z + (this._endEuler.z - this._startEuler.z) * eased;

            if (elapsed >= this._rollDuration) {
                // Snap to exact final quaternion
                mesh.quaternion.copy(this._finalQuat);
                this._rolling = false;
                this._showingResult = true;
                if (this._rollCallback) this._rollCallback();
            }
        }

        _spawnRing(color) {
            var c = this._particlesEl;
            if (!c) return;
            var cx = c.offsetWidth / 2, cy = c.offsetHeight / 2;
            var r = document.createElement('div');
            r.style.cssText = 'position:absolute;border-radius:50%;border:2px solid ' + color + ';pointer-events:none;opacity:0;left:' + cx + 'px;top:' + cy + 'px';
            r.animate([
                { width: '0', height: '0', marginLeft: '0', marginTop: '0', opacity: 0.8, borderWidth: '3px' },
                { width: '180px', height: '180px', marginLeft: '-90px', marginTop: '-90px', opacity: 0, borderWidth: '1px' }
            ], { duration: 550, easing: 'ease-out' });
            c.appendChild(r);
            setTimeout(function () { r.remove(); }, 550);
        }

        _spawnParticles(color, n) {
            var c = this._particlesEl;
            if (!c) return;
            var cx = c.offsetWidth / 2, cy = c.offsetHeight / 2;
            for (var i = 0; i < n; i++) {
                var p = document.createElement('div');
                var s = 2 + Math.random() * 5;
                p.style.cssText = 'position:absolute;border-radius:50%;background:' + color + ';opacity:0;width:' + s + 'px;height:' + s + 'px;left:' + cx + 'px;top:' + cy + 'px';
                var a = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.6;
                var dist = 40 + Math.random() * 100;
                var dx = Math.cos(a) * dist, dy = Math.sin(a) * dist;
                var dur = 450 + Math.random() * 550;
                p.animate([
                    { opacity: 0.9, transform: 'translate(0,0) scale(1)' },
                    { opacity: 0, transform: 'translate(' + dx + 'px,' + dy + 'px) scale(0)' }
                ], { duration: dur, easing: 'cubic-bezier(0,0.3,0.5,1)' });
                c.appendChild(p);
                (function (el, d) { setTimeout(function () { el.remove(); }, d); })(p, dur);
            }
        }

        /**
         * Roll the die to show a specific result value.
         * @param {number} resultValue - The face value to land on
         * @param {function} onDone - Callback when animation completes
         * @returns {number} duration in ms
         */
        roll(resultValue, onDone) {
            var self = this;
            this._showingResult = false;
            this._rolling = false;
            this._createMesh();
            haptic('medium');

            var mesh = this._dieMesh;
            var dieType = this._dieType;

            // Compute final orientation — result face toward camera
            this._finalQuat = getTargetQuaternion(mesh, resultValue);

            // Start from current rotation
            this._startEuler = {
                x: mesh.rotation.x,
                y: mesh.rotation.y,
                z: mesh.rotation.z,
            };

            // Target euler = final orientation + random multi-axis spins
            var targetEuler = new THREE.Euler().setFromQuaternion(this._finalQuat);
            var spins = 3 + Math.floor(Math.random() * 3);
            var dir = function () { return Math.random() > 0.5 ? 1 : -1; };
            this._endEuler = {
                x: targetEuler.x + Math.PI * 2 * spins * dir(),
                y: targetEuler.y + Math.PI * 2 * spins * dir(),
                z: targetEuler.z + Math.PI * 2 * spins * dir(),
            };

            // Crit/fail detection
            var maxVal = { d4: 4, d6: 6, d8: 8, d10: 9, d12: 12, d20: 20 }[dieType] || 20;
            var minVal = dieType === 'd10' ? 0 : 1;
            var isCrit = resultValue === maxVal;
            var isFail = resultValue === minVal;

            this._rollDuration = ROLL_MS;
            this._rollStart = performance.now();
            this._rolling = true;

            this._rollCallback = function () {
                if (isCrit || isFail) {
                    haptic('heavy');
                    self._spawnRing(isCrit ? V_SUCCESS_HEX : V_DANGER_HEX);
                    self._spawnParticles(isCrit ? V_SUCCESS_HEX : V_DANGER_HEX, 30);
                    if (self._dieMesh) {
                        var glowColor = parseInt((isCrit ? V_SUCCESS_HEX : V_DANGER_HEX).replace('#', ''), 16);
                        var glow = new THREE.PointLight(glowColor, 1.5, 4);
                        glow.position.set(0, 0.5, 1);
                        self._dieMesh.add(glow);
                        var intensity = 1.5;
                        var fadeGlow = setInterval(function () {
                            intensity -= 0.05;
                            if (intensity <= 0) { self._dieMesh.remove(glow); clearInterval(fadeGlow); }
                            else glow.intensity = intensity;
                        }, 50);
                    }
                } else {
                    haptic('heavy');
                    self._spawnParticles(V_GOLD_HEX, 15);
                }
                if (onDone) onDone();
            };

            return this._rollDuration;
        }

        dispose() {
            this._disposed = true;
            if (this._animFrame) cancelAnimationFrame(this._animFrame);
            if (this._dieMesh) this._scene.remove(this._dieMesh);
            this._renderer.dispose();
            if (this._renderer.domElement.parentNode) {
                this._renderer.domElement.parentNode.removeChild(this._renderer.domElement);
            }
        }
    }

    return Dice3DInstance;
})();
