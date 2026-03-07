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
    const ROLL_MS_DEFAULT = 2000;

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

    /**
     * Build a special "result die" — a gold cube showing a custom total on all faces.
     * Used after multi-dice fusion to display the sum (which may exceed die max).
     */
    function buildResultDie(total) {
        var base = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        var geo = base.toNonIndexed();
        applyGradient(geo);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        addEdgeWire(mesh, base);
        // Put the total number on all 6 faces
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
        var nums = [total, total, total, total, total, total];
        addLabels(mesh, nums, centers, normals, 0.92);
        mesh.userData = { type: 'result', numbers: nums, normals: normals };
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
            this._rollMs = opts.duration || ROLL_MS_DEFAULT;
            this._disposed = false;
            this._animFrame = null;
            this._rolling = false;
            this._rollStart = 0;
            this._rollDuration = this._rollMs;
            this._startEuler = { x: 0, y: 0, z: 0 };
            this._endEuler = { x: 0, y: 0, z: 0 };
            this._finalQuat = new THREE.Quaternion();
            this._rollCallback = null;
            this._showingResult = false;
            this._resultTime = 0;
            this._idleTime = 0;
            this._dieMesh = null;
            this._particlesEl = opts.particlesContainer || null;

            // Multi-dice state
            this._multiMode = false;
            this._multiMeshes = [];
            this._multiStates = [];
            this._multiLanded = 0;
            this._multiCallback = null;

            // Fusion state
            this._fusionActive = false;
            this._fusionStart = 0;
            this._fusionDuration = 500;
            this._fusionCallback = null;
            this._fusionMesh = null;

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
            this._ambient = new THREE.AmbientLight(0xffffff, 0.5);
            this._scene.add(this._ambient);

            this._keyLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
            this._keyLight.position.set(3, 5, 5);
            this._keyLight.castShadow = true;
            this._keyLight.shadow.mapSize.set(512, 512);
            this._scene.add(this._keyLight);

            var fillLight = new THREE.DirectionalLight(0xd4af37, 0.4);
            fillLight.position.set(-4, -1, 3);
            this._scene.add(fillLight);

            var rimLight = new THREE.DirectionalLight(0x8b6914, 0.3);
            rimLight.position.set(0, -4, -3);
            this._scene.add(rimLight);

            // Orbiting point light (activated during roll)
            this._orbitLight = new THREE.PointLight(0xd4af37, 0, 6);
            this._scene.add(this._orbitLight);

            // Result glow light (pulse after landing)
            this._resultGlow = new THREE.PointLight(0xd4af37, 0, 5);
            this._resultGlow.position.set(0, 0, 2);
            this._scene.add(this._resultGlow);

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

            if (this._fusionActive) {
                this._updateFusion(time);
            } else if (this._multiMode && this._rolling) {
                this._updateMultiRoll(time);
            } else if (this._rolling) {
                this._updateRoll(time);
            } else if (this._showingResult) {
                this._resultTime += 0.02;
                var pulse = 0.3 + 0.2 * Math.sin(this._resultTime * 2.5);
                this._resultGlow.intensity = pulse;
                var target = this._fusionMesh || this._dieMesh;
                if (target) {
                    var s = 1.0 + 0.008 * Math.sin(this._resultTime * 2.0);
                    target.scale.setScalar(s);
                }
                // Fusion die stays static — total is displayed on its face

                // Multi-mode result: gentle breathing on all meshes
                if (this._multiMode && this._multiMeshes.length > 0) {
                    for (var i = 0; i < this._multiMeshes.length; i++) {
                        var ms = 1.0 + 0.006 * Math.sin(this._resultTime * 2.0 + i * 0.5);
                        this._multiMeshes[i].scale.setScalar(this._multiStates[i].baseScale * ms);
                    }
                }
            } else if (this._dieMesh) {
                this._idleTime += 0.012;
                this._dieMesh.rotation.y += 0.003;
                this._dieMesh.rotation.x += 0.001;
                this._orbitLight.intensity = 0;
                this._resultGlow.intensity = 0;
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

            // ─── ROLLING FX ───
            var speed = 1 - eased; // 1 at start, 0 at end

            // Orbiting golden light — circles the die, fades as spin slows
            var orbitAngle = elapsed * 0.008;
            this._orbitLight.position.set(
                Math.cos(orbitAngle) * 2.5,
                Math.sin(orbitAngle) * 2.5,
                1.5
            );
            this._orbitLight.intensity = speed * 1.8;

            // Scale pulse — die "breathes" fast while spinning, settles to normal
            var scalePulse = 1.0 + speed * 0.04 * Math.sin(elapsed * 0.015);
            mesh.scale.setScalar(scalePulse);

            // Specular boost — shinier while spinning fast
            if (mesh.material) {
                mesh.material.shininess = 100 + speed * 150;
            }

            if (elapsed >= this._rollDuration) {
                // ─── LANDING FX ───
                mesh.quaternion.copy(this._finalQuat);
                mesh.scale.setScalar(1.0);
                if (mesh.material) mesh.material.shininess = 100;
                this._orbitLight.intensity = 0;

                // Flash — brief white light burst
                this._keyLight.intensity = 3.0;
                var self = this;
                var flashI = 3.0;
                var flashFade = setInterval(function () {
                    flashI -= 0.15;
                    if (flashI <= 1.2) {
                        self._keyLight.intensity = 1.2;
                        clearInterval(flashFade);
                    } else {
                        self._keyLight.intensity = flashI;
                    }
                }, 20);

                // Scale punch — brief enlarge on impact
                mesh.scale.setScalar(1.12);
                setTimeout(function () {
                    if (self._dieMesh) self._dieMesh.scale.setScalar(1.0);
                }, 120);

                // Screen shake on container
                var el = self._container;
                if (el) {
                    el.style.transition = 'transform 0.06s ease-out';
                    el.style.transform = 'translate(' + (Math.random() - 0.5) * 4 + 'px,' + (Math.random() - 0.5) * 4 + 'px)';
                    setTimeout(function () {
                        el.style.transform = 'translate(' + (Math.random() - 0.5) * 2 + 'px,' + (Math.random() - 0.5) * 2 + 'px)';
                    }, 60);
                    setTimeout(function () {
                        el.style.transition = 'transform 0.1s ease-out';
                        el.style.transform = '';
                    }, 140);
                }

                this._rolling = false;
                this._showingResult = true;
                this._resultTime = 0;
                this._resultGlow.intensity = 0.6;
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

            this._rollDuration = this._rollMs;
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

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  MULTI-DICE: rollMultiple + fusionTo
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        /**
         * Roll multiple dice simultaneously in one scene.
         * @param {Array<{value: number}>} configs - Per-die result values
         * @param {function} onDone - Called when ALL dice have landed
         * @returns {number} total duration in ms
         */
        rollMultiple(configs, onDone) {
            if (!configs || configs.length <= 1) {
                return this.roll(configs && configs[0] ? configs[0].value : 1, onDone);
            }

            var self = this;
            var count = Math.min(configs.length, 5);
            this._showingResult = false;
            this._rolling = true;
            this._multiMode = true;
            this._multiLanded = 0;
            this._multiCallback = onDone;
            this._fusionActive = false;
            this._fusionMesh = null;
            haptic('medium');

            // Remove single die mesh
            if (this._dieMesh) { this._scene.remove(this._dieMesh); this._dieMesh = null; }
            // Remove previous multi meshes
            for (var k = 0; k < this._multiMeshes.length; k++) this._scene.remove(this._multiMeshes[k]);
            this._multiMeshes = [];
            this._multiStates = [];

            // Adjust camera for multiple dice
            this._camera.position.z = 4.5 + (count - 1) * 0.4;

            // Scale factor per die
            var baseScale = 1.0 / (1 + (count - 1) * 0.15);
            // Horizontal spacing
            var totalWidth = (count - 1) * 1.6;
            var builder = BUILDERS[this._dieType] || BUILDERS.d20;
            var staggerMs = 80;

            for (var i = 0; i < count; i++) {
                var mesh = builder();
                var xPos = count === 1 ? 0 : -totalWidth / 2 + i * 1.6;
                mesh.position.set(xPos, 0, 0);
                mesh.scale.setScalar(baseScale);
                this._scene.add(mesh);
                this._multiMeshes.push(mesh);

                // Compute target quaternion for this die's result
                var val = configs[i].value;
                var finalQuat = getTargetQuaternion(mesh, val);

                // Random start + end euler per die
                var startE = { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z };
                var targetE = new THREE.Euler().setFromQuaternion(finalQuat);
                var spins = 3 + Math.floor(Math.random() * 3);
                var dir = function () { return Math.random() > 0.5 ? 1 : -1; };
                var endE = {
                    x: targetE.x + Math.PI * 2 * spins * dir(),
                    y: targetE.y + Math.PI * 2 * spins * dir(),
                    z: targetE.z + Math.PI * 2 * spins * dir(),
                };

                this._multiStates.push({
                    startEuler: startE,
                    endEuler: endE,
                    finalQuat: finalQuat,
                    startTime: performance.now() + i * staggerMs,
                    landed: false,
                    baseScale: baseScale,
                    originX: xPos,
                    value: val,
                });
            }

            this._rollStart = performance.now();
            return this._rollMs + (count - 1) * staggerMs;
        }

        _updateMultiRoll(time) {
            var allLanded = true;
            var self = this;

            for (var i = 0; i < this._multiMeshes.length; i++) {
                var st = this._multiStates[i];
                if (st.landed) continue;

                var elapsed = time - st.startTime;
                if (elapsed < 0) { allLanded = false; continue; } // not started yet (stagger)

                var t = Math.min(elapsed / this._rollMs, 1);
                var eased = 1 - Math.pow(1 - t, 4);
                var mesh = this._multiMeshes[i];

                mesh.rotation.x = st.startEuler.x + (st.endEuler.x - st.startEuler.x) * eased;
                mesh.rotation.y = st.startEuler.y + (st.endEuler.y - st.startEuler.y) * eased;
                mesh.rotation.z = st.startEuler.z + (st.endEuler.z - st.startEuler.z) * eased;

                var speed = 1 - eased;
                var scalePulse = st.baseScale * (1.0 + speed * 0.04 * Math.sin(elapsed * 0.015));
                mesh.scale.setScalar(scalePulse);
                if (mesh.material) mesh.material.shininess = 100 + speed * 150;

                if (elapsed >= this._rollMs) {
                    // This die landed
                    mesh.quaternion.copy(st.finalQuat);
                    mesh.scale.setScalar(st.baseScale * 1.1);
                    if (mesh.material) mesh.material.shininess = 100;
                    st.landed = true;
                    self._multiLanded++;
                    haptic('light');

                    // Scale punch
                    (function (m, bs) {
                        setTimeout(function () { m.scale.setScalar(bs); }, 100);
                    })(mesh, st.baseScale);
                } else {
                    allLanded = false;
                }
            }

            // Shared orbiting light follows first die
            if (this._multiMeshes.length > 0 && !this._multiStates[0].landed) {
                var e0 = time - this._multiStates[0].startTime;
                var sp0 = 1 - Math.min(e0 / this._rollMs, 1);
                var angle = e0 * 0.008;
                this._orbitLight.position.set(Math.cos(angle) * 2.5, Math.sin(angle) * 2.5, 1.5);
                this._orbitLight.intensity = sp0 * 1.5;
            } else {
                this._orbitLight.intensity = 0;
            }

            if (allLanded && this._multiLanded >= this._multiMeshes.length) {
                this._rolling = false;
                this._showingResult = true;
                this._resultTime = 0;

                // Flash on all-landed
                this._keyLight.intensity = 2.5;
                var flashI = 2.5;
                var flashFade = setInterval(function () {
                    flashI -= 0.12;
                    if (flashI <= 1.2) { self._keyLight.intensity = 1.2; clearInterval(flashFade); }
                    else self._keyLight.intensity = flashI;
                }, 20);

                // Screen shake
                var el = this._container;
                if (el) {
                    el.style.transition = 'transform 0.06s ease-out';
                    el.style.transform = 'translate(' + (Math.random() - 0.5) * 3 + 'px,' + (Math.random() - 0.5) * 3 + 'px)';
                    setTimeout(function () { el.style.transform = ''; el.style.transition = ''; }, 120);
                }

                this._spawnParticles(V_GOLD_HEX, 12);
                this._resultGlow.intensity = 0.5;

                if (this._multiCallback) this._multiCallback();
            }
        }

        /**
         * Merge all multi-dice into a single die with fusion effect.
         * Call AFTER rollMultiple's onDone callback.
         * @param {number} totalValue - The total to display on the fusion die
         * @param {function} onDone - Called when fusion animation completes
         */
        fusionTo(totalValue, onDone) {
            if (!this._multiMode || this._multiMeshes.length < 2) {
                if (onDone) onDone();
                return;
            }
            this._showingResult = false;
            this._fusionActive = true;
            this._fusionStart = performance.now();
            this._fusionDuration = 500;
            this._fusionCallback = onDone;
            this._fusionTotal = totalValue;
            this._resultGlow.intensity = 0;
            haptic('medium');
        }

        _updateFusion(time) {
            var elapsed = time - this._fusionStart;
            var t = Math.min(elapsed / this._fusionDuration, 1);
            // Ease-in-out cubic
            var eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            var self = this;

            // Phase: converge all dice to center + shrink
            for (var i = 0; i < this._multiMeshes.length; i++) {
                var mesh = this._multiMeshes[i];
                var st = this._multiStates[i];
                var targetScale = st.baseScale * (1 - eased * 0.7); // shrink to 30%
                mesh.scale.setScalar(targetScale);
                mesh.position.x = st.originX * (1 - eased); // converge to center
                // Spin faster during convergence
                mesh.rotation.y += 0.02 * (1 + eased * 3);
            }

            // Orbiting light during fusion
            var angle = elapsed * 0.015;
            this._orbitLight.position.set(Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, 1.5);
            this._orbitLight.intensity = eased * 2.0;

            if (elapsed >= this._fusionDuration) {
                // Remove all multi meshes
                for (var j = 0; j < this._multiMeshes.length; j++) {
                    this._scene.remove(this._multiMeshes[j]);
                }
                this._multiMeshes = [];
                this._multiStates = [];
                this._multiMode = false;

                // Create fusion result die showing total value
                this._fusionMesh = buildResultDie(this._fusionTotal);
                this._fusionMesh.position.set(0, 0, 0);
                this._fusionMesh.scale.setScalar(0.01);
                // Orient face toward camera, upright (no random twist)
                var normals = this._fusionMesh.userData.normals;
                var faceIdx = 0; // all faces show the same total, pick first Z-facing
                for (var fi = 0; fi < normals.length; fi++) {
                    if (normals[fi].z > normals[faceIdx].z) faceIdx = fi;
                }
                var alignQ = new THREE.Quaternion().setFromUnitVectors(
                    normals[faceIdx].clone(), new THREE.Vector3(0, 0, 1)
                );
                this._fusionMesh.quaternion.copy(alignQ);
                this._scene.add(this._fusionMesh);

                // Reset camera
                this._camera.position.z = 4.5;

                // Flash burst
                this._keyLight.intensity = 4.0;
                var flashI = 4.0;
                var flashFade = setInterval(function () {
                    flashI -= 0.2;
                    if (flashI <= 1.2) { self._keyLight.intensity = 1.2; clearInterval(flashFade); }
                    else self._keyLight.intensity = flashI;
                }, 20);

                this._orbitLight.intensity = 0;
                haptic('heavy');
                this._spawnRing(V_GOLD_HEX);
                this._spawnParticles(V_GOLD_HEX, 25);

                // Scale punch: 0 → 1.2 → 1.0
                var fm = this._fusionMesh;
                fm.scale.setScalar(1.2);
                setTimeout(function () {
                    if (fm) fm.scale.setScalar(1.0);
                }, 150);

                // Screen shake
                var el = this._container;
                if (el) {
                    el.style.transition = 'transform 0.06s ease-out';
                    el.style.transform = 'translate(' + (Math.random() - 0.5) * 5 + 'px,' + (Math.random() - 0.5) * 5 + 'px)';
                    setTimeout(function () {
                        el.style.transform = 'translate(' + (Math.random() - 0.5) * 2 + 'px,' + (Math.random() - 0.5) * 2 + 'px)';
                    }, 60);
                    setTimeout(function () { el.style.transition = ''; el.style.transform = ''; }, 140);
                }

                this._fusionActive = false;
                this._showingResult = true;
                this._resultTime = 0;
                this._resultGlow.intensity = 0.7;

                if (this._fusionCallback) this._fusionCallback();
            }
        }

        dispose() {
            this._disposed = true;
            if (this._animFrame) cancelAnimationFrame(this._animFrame);
            if (this._dieMesh) this._scene.remove(this._dieMesh);
            if (this._fusionMesh) this._scene.remove(this._fusionMesh);
            for (var i = 0; i < this._multiMeshes.length; i++) this._scene.remove(this._multiMeshes[i]);
            this._multiMeshes = [];
            this._renderer.dispose();
            if (this._renderer.domElement.parentNode) {
                this._renderer.domElement.parentNode.removeChild(this._renderer.domElement);
            }
        }
    }

    return Dice3DInstance;
})();
