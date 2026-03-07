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
// ALL dice share the same visual style:
//   - Vertex-color gradient (dark brown → gold, based on Y)
//   - MeshPhong with flat shading + specular highlights
//   - Gold edge wireframe
//   - Floating transparent label planes (numbers always centered)

const Dice3D = (() => {
    'use strict';

    const EDGE_COLOR = 0xc4953a;
    const V_GOLD_HEX = '#c4953a';
    const V_SUCCESS_HEX = '#4caf50';
    const V_DANGER_HEX = '#e74c3c';

    function haptic(style) {
        try {
            const tg = window.Telegram && window.Telegram.WebApp;
            if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(style);
        } catch (e) { /* ignore */ }
    }

    function clampPos(v) { return Math.max(-1.8, Math.min(1.8, v)); }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  SHARED VISUAL HELPERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** Transparent label texture — number with black stroke + gold glow */
    function makeLabelTexture(num, size) {
        size = size || 256;
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, size, size);

        const text = String(num);
        const fontSize = text.length > 1 ? size * 0.52 : size * 0.62;
        ctx.font = 'bold ' + fontSize + 'px "Cinzel", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.strokeStyle = 'rgba(0,0,0,0.75)';
        ctx.lineWidth = 10;
        ctx.lineJoin = 'round';
        ctx.strokeText(text, size / 2, size / 2);

        ctx.shadowColor = 'rgba(212,175,55,0.5)';
        ctx.shadowBlur = size * 0.06;
        ctx.fillStyle = '#fff8e0';
        ctx.fillText(text, size / 2, size / 2);

        if (num === 6 || num === 9) {
            ctx.shadowBlur = 0;
            var w = ctx.measureText(text).width;
            ctx.fillRect(size / 2 - w / 2, size / 2 + fontSize * 0.38, w, fontSize * 0.06);
        }

        var tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    /** Apply dark-brown → gold vertex-color gradient based on Y position */
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

    /** Standard body material — vertex colors, flat shading, specular */
    function makeBodyMat() {
        return new THREE.MeshPhongMaterial({
            vertexColors: true, shininess: 100,
            specular: new THREE.Color(0x554433), flatShading: true,
        });
    }

    /** Gold edge wireframe overlay */
    function addEdgeWire(mesh, geo, threshold) {
        var edges = new THREE.EdgesGeometry(geo, threshold || 15);
        mesh.add(new THREE.LineSegments(edges,
            new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.5 })));
    }

    /** Add floating label planes at face centers, oriented along face normals */
    function addLabels(mesh, numbers, centers, normals, labelSize) {
        for (var i = 0; i < numbers.length; i++) {
            var tex = makeLabelTexture(numbers[i], 256);
            var mat = new THREE.MeshBasicMaterial({
                map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
            });
            var plane = new THREE.Mesh(new THREE.PlaneGeometry(labelSize, labelSize), mat);
            var n = normals[i];
            plane.position.copy(centers[i].clone().add(n.clone().multiplyScalar(0.01)));

            // Orient label: "up" direction is world-up projected onto the face plane
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

    /** Compute face centers and outward normals for 1-triangle-per-face geometries */
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

    /** Cluster coplanar triangles into logical faces (for d6, d12) */
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
    //  D4 — TETRAHEDRON (4 triangular faces)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function buildD4() {
        var base = new THREE.TetrahedronGeometry(1.1);
        var geo = base.toNonIndexed();
        applyGradient(geo);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        addEdgeWire(mesh, base);
        var numbers = [1, 2, 3, 4];
        var faces = facesFromTris(geo, 4);
        addLabels(mesh, numbers, faces.centers, faces.normals, 0.58);
        mesh.userData = { type: 'd4', numbers: numbers, normals: faces.normals };
        mesh.castShadow = true;
        return mesh;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  D6 — CUBE (6 square faces)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function buildD6() {
        var base = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        var geo = base.toNonIndexed();
        applyGradient(geo);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        addEdgeWire(mesh, base);

        // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z (2 tris each)
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
        addLabels(mesh, D6_NUMS, centers, normals, 0.7);
        mesh.userData = { type: 'd6', numbers: D6_NUMS, normals: normals };
        mesh.castShadow = true;
        return mesh;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  D8 — OCTAHEDRON (8 triangular faces)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function buildD8() {
        var base = new THREE.OctahedronGeometry(1.05);
        var geo = base.toNonIndexed();
        applyGradient(geo);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        addEdgeWire(mesh, base);
        var numbers = [1, 2, 3, 4, 5, 6, 7, 8];
        var faces = facesFromTris(geo, 8);
        addLabels(mesh, numbers, faces.centers, faces.normals, 0.42);
        mesh.userData = { type: 'd8', numbers: numbers, normals: faces.normals };
        mesh.castShadow = true;
        return mesh;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  D10 — PENTAGONAL TRAPEZOHEDRON (10 kite faces)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
        addLabels(mesh, faceNumbers, faceCenters, faceNormals, 0.4);

        mesh.userData = { type: 'd10', numbers: faceNumbers, normals: faceNormals };
        mesh.castShadow = true;
        return mesh;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  D12 — DODECAHEDRON (12 pentagonal faces)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function buildD12() {
        var base = new THREE.DodecahedronGeometry(1.0);
        var geo = base.toNonIndexed();
        applyGradient(geo);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        addEdgeWire(mesh, base);
        var faces = facesFromClusters(geo);
        var numbers = [];
        for (var i = 1; i <= faces.centers.length; i++) numbers.push(i);
        addLabels(mesh, numbers, faces.centers, faces.normals, 0.5);
        mesh.userData = { type: 'd12', numbers: numbers, normals: faces.normals };
        mesh.castShadow = true;
        return mesh;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  D20 — ICOSAHEDRON (20 triangular faces)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function buildD20() {
        var R = 1.0;
        var baseGeo = new THREE.IcosahedronGeometry(R, 0);
        var geo = baseGeo.toNonIndexed();
        applyGradient(geo);

        var faces = facesFromTris(geo, 20);
        var mesh = new THREE.Mesh(geo, makeBodyMat());

        // Gold edge wireframe (slightly enlarged to avoid z-fight)
        var edgeGeo = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(R * 1.003, 0));
        mesh.add(new THREE.LineSegments(edgeGeo,
            new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.5 })));

        var numbers = [];
        for (var i = 1; i <= 20; i++) numbers.push(i);
        addLabels(mesh, numbers, faces.centers, faces.normals, 0.48);

        mesh.userData = { type: 'd20', numbers: numbers, normals: faces.normals };
        mesh.castShadow = true;
        return mesh;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  BUILDER REGISTRY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    var BUILDERS = { d4: buildD4, d6: buildD6, d8: buildD8, d10: buildD10, d12: buildD12, d20: buildD20 };

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  ORIENT RESULT FACE TOWARD CAMERA
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function getTargetQuaternion(mesh, resultValue) {
        var numbers = mesh.userData.numbers;
        var normals = mesh.userData.normals;
        var faceIdx = numbers.indexOf(resultValue);
        if (faceIdx === -1) faceIdx = 0;

        var faceNormal = normals[faceIdx].clone();
        var targetDir = new THREE.Vector3(0, 0.85, 0.52).normalize();
        var quat = new THREE.Quaternion();
        quat.setFromUnitVectors(faceNormal, targetDir);
        return quat;
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
            this._rollAnim = null;
            this._idleTime = 0;
            this._showingResult = false;
            this._dieMesh = null;
            this._particlesEl = opts.particlesContainer || null;

            // Camera tracking state
            this._camTarget = new THREE.Vector3(0, 0, 0);
            this._camBasePos = new THREE.Vector3(0, 3.5, 6);

            var W = this._size, H = this._size;

            this._scene = new THREE.Scene();
            this._camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
            this._camera.position.copy(this._camBasePos);
            this._camera.lookAt(0, 0, 0);

            this._renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            this._renderer.setSize(W, H);
            this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this._renderer.shadowMap.enabled = true;
            this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.appendChild(this._renderer.domElement);

            // Lighting
            this._scene.add(new THREE.AmbientLight(0xffffff, 0.5));

            var keyLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
            keyLight.position.set(3, 6, 4);
            keyLight.castShadow = true;
            keyLight.shadow.mapSize.set(512, 512);
            keyLight.shadow.camera.near = 0.5;
            keyLight.shadow.camera.far = 20;
            keyLight.shadow.camera.left = -3;
            keyLight.shadow.camera.right = 3;
            keyLight.shadow.camera.top = 3;
            keyLight.shadow.camera.bottom = -3;
            this._scene.add(keyLight);

            var fillLight = new THREE.DirectionalLight(0xc8d8ff, 0.3);
            fillLight.position.set(-3, 2, -2);
            this._scene.add(fillLight);

            var rimLight = new THREE.PointLight(0xd4af37, 0.4, 10);
            rimLight.position.set(0, 1, -4);
            this._scene.add(rimLight);

            // Ground shadow
            var groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
            this._ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), groundMat);
            this._ground.rotation.x = -Math.PI / 2;
            this._ground.position.y = -1.5;
            this._ground.receiveShadow = true;
            this._scene.add(this._ground);

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

            if (this._rollAnim) {
                this._updateRoll(time);
            } else if (this._showingResult) {
                // Hold still — smoothly return camera to center
                this._camTarget.lerp(new THREE.Vector3(0, 0, 0), 0.08);
            } else if (this._dieMesh) {
                this._idleTime += 0.012;
                this._dieMesh.rotation.y = this._idleTime * 0.3;
                this._dieMesh.rotation.x = Math.sin(this._idleTime * 0.5) * 0.12 - 0.2;
                this._dieMesh.position.y = Math.sin(this._idleTime * 0.8) * 0.08;
                this._camTarget.set(0, 0, 0);
            }

            // Camera follows target smoothly
            var camLookAt = this._camTarget;
            this._camera.position.set(
                this._camBasePos.x + camLookAt.x * 0.6,
                this._camBasePos.y + camLookAt.y * 0.3,
                this._camBasePos.z + camLookAt.z * 0.3
            );
            this._camera.lookAt(camLookAt.x, camLookAt.y, camLookAt.z);

            this._renderer.render(this._scene, this._camera);
        }

        _updateRoll(time) {
            var elapsed = time - this._rollAnim.startTime;
            var dur = this._rollAnim.duration;
            var t = Math.min(elapsed / dur, 1);
            var mesh = this._dieMesh;
            if (!mesh) return;
            var ra = this._rollAnim;
            var sec = elapsed / 1000;

            // Compute base spin quaternion (continuous, decaying)
            var spinQ = ra.spinQ(sec);

            // Determine current phase
            var phase = -1;
            for (var i = 0; i < ra.bounces.length; i++) {
                if (sec < ra.bounces[i].tEnd) { phase = i; break; }
            }
            if (phase === -1) phase = ra.bounces.length; // settle

            if (phase < ra.bounces.length) {
                // ─── AIRBORNE PHASE (throw + bounces) ───
                var b = ra.bounces[phase];
                var tl = sec - b.tStart;

                // Parabolic arc
                var px = b.x0 + b.vx * tl;
                var pz = b.z0 + b.vz * tl;
                var py = Math.max(0, b.vy * tl - 0.5 * ra.G * tl * tl);
                mesh.position.set(clampPos(px), py, clampPos(pz));

                // Spin with cumulative bounce perturbation
                mesh.quaternion.copy(spinQ.clone().multiply(b.rotQ));

                // Haptic on first frame of each bounce
                if (!b.hapticDone) { b.hapticDone = true; if (phase > 0) haptic('light'); }
            } else {
                // ─── SETTLE PHASE ───
                var tl = sec - ra.settleStart;
                var p = Math.min(tl / ra.settleTime, 1);

                // Position: slide to center with friction + micro-bounces
                var posEase = 1 - Math.pow(1 - p, 2.5);
                var sx = ra.settleX * (1 - posEase);
                var sz = ra.settleZ * (1 - posEase);
                // Damped micro-bounces (3-4 tiny hops)
                var sy = 0;
                if (p < 0.5) {
                    var bp = p / 0.5;
                    sy = 0.06 * (1 - bp) * Math.abs(Math.sin(bp * Math.PI * 4));
                }
                mesh.position.set(sx, sy, sz);

                // Rotation: damped oscillation toward target (rocking)
                var easeBase = 1 - Math.pow(1 - Math.min(1, p * 1.2), 3);
                var rock = ra.rockAmp * Math.exp(-ra.rockDamp * p) *
                    Math.sin(p * ra.rockFreq * Math.PI * 2);
                var slerpT = Math.max(0, Math.min(1, easeBase + rock));

                var currentQ = ra.settleStartQ.clone().slerp(ra.targetQ, slerpT);

                // Extra wobble on perpendicular axes (die tips between faces)
                if (p > 0.05 && p < 0.85) {
                    var wp = p - 0.05;
                    var env = Math.exp(-ra.wobbleDamp * wp);
                    currentQ.multiply(new THREE.Quaternion().setFromAxisAngle(
                        ra.wobbleAxis1, ra.wobbleAmp * env * Math.sin(ra.wobbleFreq * wp * Math.PI * 2)));
                    currentQ.multiply(new THREE.Quaternion().setFromAxisAngle(
                        ra.wobbleAxis2, ra.wobbleAmp * 0.5 * env * Math.sin(ra.wobbleFreq * 1.4 * wp * Math.PI * 2 + 0.8)));
                }
                mesh.quaternion.copy(currentQ);
            }

            // ─── CAMERA FOLLOW ───
            // Smooth lerp toward die position (heavier during airborne, lighter during settle)
            var lerpRate = phase < ra.bounces.length ? 0.12 : 0.06;
            this._camTarget.lerp(mesh.position, lerpRate);

            // Dynamic shadow
            this._ground.material.opacity = 0.35 - 0.25 * (Math.max(0, mesh.position.y) / 2.5);

            if (t >= 1) {
                mesh.position.set(0, 0, 0);
                mesh.quaternion.copy(ra.targetQ);
                this._ground.material.opacity = 0.35;
                var onDone = ra.onDone;
                this._rollAnim = null;
                this._showingResult = true;
                if (onDone) onDone();
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
            this._rollAnim = null;
            this._createMesh();
            this._camTarget.set(0, 0, 0);
            haptic('medium');

            var targetQ = getTargetQuaternion(this._dieMesh, resultValue);
            var dieType = this._dieType;

            // ─── THROW STRENGTH (wide variation: gentle toss vs hard throw) ───
            // throwForce 0.0-1.0: 0=gentle lob, 1=powerful throw
            var throwForce = Math.random();
            // Bias toward mid-range but allow extremes
            throwForce = 0.5 + (throwForce - 0.5) * 1.4;
            throwForce = Math.max(0.05, Math.min(1.0, throwForce));

            // ─── GRAVITY (constant — real physics!) ───
            var G = 9.81 * 4; // scaled for visual space

            // ─── ENTRY DIRECTION ───
            var throwAngle = Math.random() * Math.PI * 2;
            var entryDist = 0.8 + throwForce * 1.2;
            var startX = Math.cos(throwAngle) * entryDist;
            var startZ = Math.sin(throwAngle) * entryDist * 0.5;

            // ─── THROW ARC — energy-based ───
            // Gentle: low arc (0.8-1.2), strong: high arc (2.0-3.5)
            var throwH = 0.8 + throwForce * 2.5 + Math.random() * 0.5;
            var v0_throw = Math.sqrt(2 * G * throwH);

            // Horizontal: biased toward center, proportional to throw force
            var hSpeed = (1.5 + throwForce * 3.0) * (0.7 + Math.random() * 0.6);
            var aimAngle = Math.atan2(-startZ, -startX) + (Math.random() - 0.5) * 0.8;
            var vx0 = Math.cos(aimAngle) * hSpeed;
            var vz0 = Math.sin(aimAngle) * hSpeed * 0.6;

            // ─── BOUNCE SEQUENCE — energy conservation model ───
            // Coefficient of restitution: how much energy preserved per bounce
            // Real dice: ~0.3-0.5 on felt, 0.5-0.7 on hard surface
            var cor = 0.38 + Math.random() * 0.22; // coefficient of restitution
            var rollingFriction = 0.35 + Math.random() * 0.2;
            var maxBounces = 5;

            // ─── SPIN — velocity-coupled (faster throw = faster spin) ───
            var mass = { d4: 0.6, d6: 0.8, d8: 0.7, d10: 0.75, d12: 0.9, d20: 1.0 }[dieType] || 1.0;
            var inertia = mass * 0.6; // moment of inertia factor
            // Spin speed proportional to throw energy, inversely proportional to inertia
            var initialSpin = (6 + throwForce * 12) / inertia;
            // Spin decays based on angular drag (air resistance + surface friction)
            var spinDrag = 1.2 + throwForce * 0.8 + Math.random() * 0.5;

            // Random spin axis components
            var sdX = Math.random() > 0.5 ? 1 : -1;
            var sdY = Math.random() > 0.5 ? 1 : -1;
            var sdZ = Math.random() > 0.5 ? 1 : -1;
            var ssX = 0.6 + Math.random() * 0.8;
            var ssY = 0.6 + Math.random() * 0.8;
            var ssZ = 0.3 + Math.random() * 0.6;

            // Tumble axis with precession (gyroscopic effect)
            var tumbleAxis = new THREE.Vector3(
                Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5
            ).normalize();
            var tumbleSpeed = (2 + throwForce * 6) / inertia;
            var tumbleDecay = 1.0 + throwForce * 1.2 + Math.random() * 0.8;
            var precessionSpeed = 1.0 + Math.random() * 3.0;
            var precessionAxis = new THREE.Vector3(0, 1, 0);

            // ─── SPIN FUNCTION — angular momentum with drag ───
            var spinQ = function (tSec) {
                // Integrated angle = (w0/drag) * (1 - e^(-drag*t))
                var sa = (initialSpin / spinDrag) * (1 - Math.exp(-spinDrag * tSec));
                var pq = new THREE.Quaternion().setFromEuler(new THREE.Euler(
                    sdX * ssX * sa, sdY * ssY * sa * 1.1, sdZ * ssZ * sa * 0.8
                ));
                var tsa = (tumbleSpeed / tumbleDecay) * (1 - Math.exp(-tumbleDecay * tSec));
                var pa = tSec * precessionSpeed * Math.exp(-0.3 * tSec);
                var cta = tumbleAxis.clone().applyAxisAngle(precessionAxis, pa);
                return pq.multiply(new THREE.Quaternion().setFromAxisAngle(cta, tsa));
            };

            // ─── BUILD BOUNCE TABLE (energy-based timing) ───
            var bounces = [];
            var tCursor = 0;
            var cx = startX, cz = startZ;
            var cvx = vx0, cvz = vz0;
            var cvy = v0_throw;
            var cumulRotQ = new THREE.Quaternion();

            // Phase 0: initial throw
            var t0 = 2 * cvy / G;
            bounces.push({
                tStart: 0, tEnd: t0,
                x0: cx, z0: cz, vx: cvx, vz: cvz, vy: cvy,
                rotQ: cumulRotQ.clone(),
                hapticDone: false,
            });
            cx = cx + cvx * t0;
            cz = cz + cvz * t0;
            tCursor = t0;

            // Subsequent bounces — energy-based
            for (var i = 0; i < maxBounces; i++) {
                // Impact: velocity * restitution (energy = 0.5*m*v^2, so v scales by cor)
                cvy = cvy * cor;
                // Rolling friction reduces horizontal speed
                var speed = Math.sqrt(cvx * cvx + cvz * cvz);
                if (speed > 0.01) {
                    var newSpeed = speed * rollingFriction;
                    cvx = cvx * (newSpeed / speed) + (Math.random() - 0.5) * (0.8 - i * 0.12);
                    cvz = cvz * (newSpeed / speed) + (Math.random() - 0.5) * (0.5 - i * 0.08);
                }

                // Minimum bounce height: stop bouncing when too small
                var bounceH = (cvy * cvy) / (2 * G);
                if (bounceH < 0.01) break;

                // Rotation perturbation on impact — angular impulse proportional to impact speed
                var impactSpeed = cvy / v0_throw; // normalized 0-1
                var perturbAngle = (Math.random() - 0.5) * Math.PI * impactSpeed * 1.2;
                var perturbAxis = new THREE.Vector3(
                    Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5
                ).normalize();
                var perturbQ = new THREE.Quaternion().setFromAxisAngle(perturbAxis, perturbAngle);
                cumulRotQ = cumulRotQ.clone().multiply(perturbQ);

                var tb = 2 * cvy / G;
                bounces.push({
                    tStart: tCursor, tEnd: tCursor + tb,
                    x0: cx, z0: cz, vx: cvx, vz: cvz, vy: cvy,
                    rotQ: cumulRotQ.clone(),
                    hapticDone: false,
                });
                cx = cx + cvx * tb;
                cz = cz + cvz * tb;
                tCursor += tb;
            }

            var totalAirborne = tCursor;

            // ─── SETTLE — duration proportional to remaining energy ───
            var remainingEnergy = cvy * cvy + cvx * cvx + cvz * cvz;
            var settleTime = 0.35 + Math.min(0.4, remainingEnergy * 0.05) + Math.random() * 0.15;
            var duration = (totalAirborne + settleTime) * 1000;

            var lastBounce = bounces[bounces.length - 1];
            var settleStartQ = spinQ(totalAirborne).clone().multiply(lastBounce.rotQ);

            // Rocking amplitude proportional to remaining angular momentum
            var angularRemaining = Math.exp(-spinDrag * totalAirborne);
            var rockAmp = 0.06 + angularRemaining * 0.12 + Math.random() * 0.04;
            var rockFreq = 3 + Math.random() * 2;
            var rockDamp = 4 + Math.random() * 3;

            var wobbleAmp = 0.03 + angularRemaining * 0.06;
            var wobbleFreq = 10 + Math.random() * 10;
            var wobbleDamp = 5 + Math.random() * 3;

            // Crit/fail detection
            var maxVal = { d4: 4, d6: 6, d8: 8, d10: 9, d12: 12, d20: 20 }[dieType] || 20;
            var minVal = dieType === 'd10' ? 0 : 1;
            var isCrit = resultValue === maxVal;
            var isFail = resultValue === minVal;

            this._rollAnim = {
                startTime: performance.now(),
                duration: duration,
                targetQ: targetQ,
                G: G,
                bounces: bounces,
                spinQ: spinQ,
                settleStart: totalAirborne,
                settleTime: settleTime,
                settleX: cx,
                settleZ: cz,
                settleStartQ: settleStartQ,
                rockAmp: rockAmp,
                rockFreq: rockFreq,
                rockDamp: rockDamp,
                wobbleAmp: wobbleAmp,
                wobbleFreq: wobbleFreq,
                wobbleDamp: wobbleDamp,
                wobbleAxis1: new THREE.Vector3(
                    0.8 + Math.random() * 0.4, Math.random() * 0.3, Math.random() * 0.3
                ).normalize(),
                wobbleAxis2: new THREE.Vector3(
                    Math.random() * 0.3, Math.random() * 0.3, 0.8 + Math.random() * 0.4
                ).normalize(),
                onDone: function () {
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
                },
            };

            return duration;
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
