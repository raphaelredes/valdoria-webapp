/**
 * Dice3D — dados poliédricos para WebApps (Three.js + CanvasTexture nas faces).
 *
 * Direção visual (2026): referência a dados de RPG em vidro fosco K9 / “sea glass”
 * (numeracao contrastante, superficie difusa sem sombras pesadas) e práticas Three.js
 * (MeshPhysicalMaterial + transmission moderada; ver documentacao transmission/ior).
 * Todos os tipos (d4–d20) partilham o mesmo corpo e o mesmo estilo de etiqueta.
 */
var Dice3D = (function () {
    'use strict';
    if (typeof THREE === 'undefined') {
        console.warn('[DICE3D] THREE.js not loaded — Dice3D disabled (fallback to emoji)');
        return null;
    }

    var _perfTier = window._valdoriaPerformanceTier || 'full';
    var _isLite = _perfTier === 'lite';
    var _isMedium = _perfTier === 'medium';
    var _labelRes = _isLite ? 160 : 256;
    var _texCache = {};
    var _texCacheOrder = [];
    var _TEX_CACHE_MAX = 20;
    var _sharedBodyMat = null;

    var EDGE_COLOR = 0xc4953a;
    var V_GOLD_HEX = '#c4953a';
    var V_SUCCESS_HEX = '#4caf50';
    var V_DANGER_HEX = '#e74c3c';
    var ROLL_MS_DEFAULT = 2000;

    function haptic(style) {
        try {
            var tg = window.Telegram && window.Telegram.WebApp;
            if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(style);
        } catch (e) {
            console.warn('[DICE_3D]', e);
        }
    }

    /**
     * Textura de face: numero centrado, sem shadowBlur (legivel em “vidro”).
     * Inspiracao: dados foscos com pintura/opacidade alta (legibilidade em lojas
     * especializadas em glass / frosted RPG dice).
     */
    function makeLabelTexture(num, size) {
        size = size || _labelRes;
        var _tk = num + '_' + size;
        if (_texCache[_tk]) return _texCache[_tk];

        var c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        var ctx = c.getContext('2d');
        ctx.clearRect(0, 0, size, size);

        var text = String(num);
        var fontSize = text.length > 1 ? Math.round(size * 0.56) : Math.round(size * 0.68);
        ctx.font = 'bold ' + fontSize + 'px "Cinzel", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowColor = 'transparent';

        var cx = size / 2;
        var cy = size / 2;
        var strokeW = Math.max(2, Math.round(size * 0.048));
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.lineWidth = strokeW;
        ctx.strokeStyle = 'rgba(12, 8, 6, 0.92)';
        ctx.strokeText(text, cx, cy);
        ctx.lineWidth = Math.max(1, strokeW - 2);
        ctx.strokeStyle = 'rgba(255, 248, 235, 0.22)';
        ctx.strokeText(text, cx, cy);
        ctx.fillStyle = '#f6eedc';
        ctx.fillText(text, cx, cy);

        if (num === 6 || num === 9) {
            var w = ctx.measureText(text).width;
            ctx.fillStyle = 'rgba(12, 8, 6, 0.88)';
            ctx.fillRect(cx - w / 2, cy + fontSize * 0.34, w, Math.max(2, fontSize * 0.08));
        }

        var tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.userData = { cached: true };

        if (_texCacheOrder.length >= _TEX_CACHE_MAX) {
            var _evict = _texCacheOrder.shift();
            if (_texCache[_evict]) {
                _texCache[_evict].dispose();
                delete _texCache[_evict];
            }
        }
        _texCacheOrder.push(_tk);
        _texCache[_tk] = tex;
        return tex;
    }

    /** Remove vertexColors do geo — corpo usa apenas material “vidro” unificado. */
    function prepareGlassGeometry(geo) {
        if (geo.getAttribute('color')) geo.deleteAttribute('color');
    }

    function makeBodyMat() {
        if (_sharedBodyMat) return _sharedBodyMat;

        if (_isLite) {
            _sharedBodyMat = new THREE.MeshStandardMaterial({
                color: 0xefe8dc,
                metalness: 0.1,
                roughness: 0.44,
                transparent: true,
                opacity: 0.95,
                envMapIntensity: 0.5,
                flatShading: true,
            });
        } else if (_isMedium) {
            _sharedBodyMat = new THREE.MeshPhysicalMaterial({
                color: 0xf2ebe0,
                metalness: 0,
                roughness: 0.26,
                transmission: 0.58,
                thickness: 0.62,
                ior: 1.48,
                transparent: true,
                opacity: 1,
                side: THREE.DoubleSide,
                envMapIntensity: 0.85,
                clearcoat: 0.65,
                clearcoatRoughness: 0.1,
                attenuationDistance: 1.2,
                attenuationColor: 0xffffff,
                flatShading: true,
            });
        } else {
            _sharedBodyMat = new THREE.MeshPhysicalMaterial({
                color: 0xf5efe4,
                metalness: 0,
                roughness: 0.2,
                transmission: 0.72,
                thickness: 0.78,
                ior: 1.5,
                transparent: true,
                opacity: 1,
                side: THREE.DoubleSide,
                envMapIntensity: 1,
                clearcoat: 0.78,
                clearcoatRoughness: 0.08,
                attenuationDistance: 1.35,
                attenuationColor: 0xffffff,
                flatShading: true,
            });
        }
        if (_sharedBodyMat && _sharedBodyMat.roughness != null) {
            _sharedBodyMat.userData._d3dRoughBase = _sharedBodyMat.roughness;
        }
        if (_sharedBodyMat && typeof _sharedBodyMat.shininess === 'number') {
            _sharedBodyMat.userData._d3dShineBase = _sharedBodyMat.shininess;
        }
        return _sharedBodyMat;
    }

    function pulseDieBodyMaterial(meshRoot, speed01) {
        if (!meshRoot || !meshRoot.material) return;
        var list = Array.isArray(meshRoot.material) ? meshRoot.material : [meshRoot.material];
        for (var i = 0; i < list.length; i++) {
            var m = list[i];
            if (!m || m.map) continue;
            if (typeof m.roughness === 'number') {
                if (m.userData._d3dRoughBase == null) m.userData._d3dRoughBase = m.roughness;
                m.roughness = Math.min(0.52, m.userData._d3dRoughBase + speed01 * 0.16);
            }
            if (typeof m.shininess === 'number') {
                if (m.userData._d3dShineBase == null) m.userData._d3dShineBase = m.shininess;
                m.shininess = m.userData._d3dShineBase + speed01 * 130;
            }
        }
    }

    function resetDieBodyMaterial(meshRoot) {
        if (!meshRoot || !meshRoot.material) return;
        var list = Array.isArray(meshRoot.material) ? meshRoot.material : [meshRoot.material];
        for (var j = 0; j < list.length; j++) {
            var m2 = list[j];
            if (!m2 || m2.map) continue;
            if (m2.userData._d3dRoughBase != null) m2.roughness = m2.userData._d3dRoughBase;
            if (m2.userData._d3dShineBase != null) m2.shininess = m2.userData._d3dShineBase;
        }
    }

    function addEdgeWire(mesh, geo, threshold) {
        var edges = new THREE.EdgesGeometry(geo, threshold || 15);
        var op = _isLite ? 0.22 : 0.32;
        mesh.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
            color: EDGE_COLOR,
            transparent: true,
            opacity: op,
        })));
    }

    function computeLabelUp(n) {
        var worldUp = new THREE.Vector3(0, 1, 0);
        var faceUp = worldUp.clone().addScaledVector(n, -worldUp.dot(n));
        if (faceUp.lengthSq() < 0.001) {
            faceUp = new THREE.Vector3(1, 0, 0).addScaledVector(n, -new THREE.Vector3(1, 0, 0).dot(n));
        }
        return faceUp.normalize();
    }

    function addLabels(mesh, numbers, centers, normals, labelSize) {
        var labelUps = [];
        for (var i = 0; i < numbers.length; i++) {
            var tex = makeLabelTexture(numbers[i], _labelRes);
            var mat = new THREE.MeshBasicMaterial({
                map: tex,
                transparent: true,
                depthWrite: false,
                depthTest: true,
                side: THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: -2,
                polygonOffsetUnits: -2,
            });
            var plane = new THREE.Mesh(new THREE.PlaneGeometry(labelSize, labelSize), mat);
            var n = normals[i];
            plane.position.copy(centers[i].clone().add(n.clone().multiplyScalar(0.018)));
            var faceUp = computeLabelUp(n);
            labelUps.push(faceUp.clone());
            var faceRight = new THREE.Vector3().crossVectors(faceUp, n).normalize();
            plane.rotation.setFromRotationMatrix(new THREE.Matrix4().makeBasis(faceRight, faceUp, n));
            mesh.add(plane);
        }
        if (!mesh.userData.labelUps) mesh.userData.labelUps = labelUps;
    }

    function facesFromTris(geo, count) {
        var pos = geo.attributes.position;
        var centers = [];
        var normals = [];
        for (var f = 0; f < count; f++) {
            var i = f * 3;
            var a = new THREE.Vector3().fromBufferAttribute(pos, i);
            var b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
            var c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
            var center = a.clone().add(b).add(c).divideScalar(3);
            var normal = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
            if (normal.dot(center) < 0) normal.negate();
            centers.push(center);
            normals.push(normal);
        }
        return { centers: centers, normals: normals };
    }

    function facesFromClusters(geo) {
        var pos = geo.attributes.position;
        var triCount = pos.count / 3;
        var tN = [];
        var tC = [];
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
        for (var t2 = 0; t2 < triCount; t2++) used.push(false);
        var centers = [];
        var normals = [];
        for (var t3 = 0; t3 < triCount; t3++) {
            if (used[t3]) continue;
            used[t3] = true;
            var cluster = [t3];
            for (var u = t3 + 1; u < triCount; u++) {
                if (!used[u] && tN[t3].dot(tN[u]) > 0.999) {
                    used[u] = true;
                    cluster.push(u);
                }
            }
            var center = new THREE.Vector3();
            for (var j = 0; j < cluster.length; j++) center.add(tC[cluster[j]]);
            center.divideScalar(cluster.length);
            centers.push(center);
            normals.push(tN[t3]);
        }
        return { centers: centers, normals: normals };
    }

    function buildD4() {
        var base = new THREE.TetrahedronGeometry(1.1);
        var geo = base.toNonIndexed();
        prepareGlassGeometry(geo);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        addEdgeWire(mesh, base);
        var numbers = [1, 2, 3, 4];
        var faces = facesFromTris(geo, 4);
        mesh.userData = { type: 'd4', numbers: numbers, normals: faces.normals };
        addLabels(mesh, numbers, faces.centers, faces.normals, 0.85);
        mesh.castShadow = false;
        return mesh;
    }

    function buildD6() {
        var base = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        var geo = base.toNonIndexed();
        prepareGlassGeometry(geo);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        addEdgeWire(mesh, base);
        var D6_NUMS = [3, 4, 1, 6, 2, 5];
        var pos = geo.attributes.position;
        var centers = [];
        var normals = [];
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
        mesh.userData = { type: 'd6', numbers: D6_NUMS, normals: normals };
        addLabels(mesh, D6_NUMS, centers, normals, 0.92);
        mesh.castShadow = false;
        return mesh;
    }

    function buildD8() {
        var base = new THREE.OctahedronGeometry(1.05);
        var geo = base.toNonIndexed();
        prepareGlassGeometry(geo);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        addEdgeWire(mesh, base);
        var numbers = [1, 2, 3, 4, 5, 6, 7, 8];
        var faces = facesFromTris(geo, 8);
        mesh.userData = { type: 'd8', numbers: numbers, normals: faces.normals };
        addLabels(mesh, numbers, faces.centers, faces.normals, 0.55);
        mesh.castShadow = false;
        return mesh;
    }

    function buildD10() {
        var scale = 1.15;
        var step = Math.PI * 2 / 10;
        var hOff = 0.105;
        var rawVerts = [];
        for (var i = 0; i < 10; i++) {
            var angle = i * step;
            rawVerts.push(new THREE.Vector3(Math.cos(angle), Math.sin(angle), hOff * (i % 2 ? 1 : -1)).normalize().multiplyScalar(scale));
        }
        rawVerts.push(new THREE.Vector3(0, 0, -1).multiplyScalar(scale));
        rawVerts.push(new THREE.Vector3(0, 0, 1).multiplyScalar(scale));
        var kiteFaces = [
            [5, 7, 11, 0], [4, 2, 10, 1], [1, 3, 11, 2], [0, 8, 10, 3],
            [7, 9, 11, 4], [8, 6, 10, 5], [9, 1, 11, 6], [2, 0, 10, 7],
            [3, 5, 11, 8], [6, 4, 10, 9],
        ];
        var equatTris = [
            [1, 0, 2], [1, 2, 3], [3, 2, 4], [3, 4, 5], [5, 4, 6], [5, 6, 7],
            [7, 6, 8], [7, 8, 9], [9, 8, 0], [9, 0, 1],
        ];
        var positions = [];
        var normArr = [];
        var faceNormals = [];
        var faceCenters = [];
        var faceNumbers = [];
        kiteFaces.forEach(function (face) {
            var a = face[0];
            var b = face[1];
            var pole = face[2];
            var num = face[3];
            var va = rawVerts[a];
            var vb = rawVerts[b];
            var vc = rawVerts[pole];
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
            var a = tri[0];
            var b = tri[1];
            var c = tri[2];
            var va = rawVerts[a];
            var vb = rawVerts[b];
            var vc = rawVerts[c];
            positions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z);
            var e1b = new THREE.Vector3().subVectors(vb, va);
            var e2b = new THREE.Vector3().subVectors(vc, va);
            var nb = new THREE.Vector3().crossVectors(e1b, e2b).normalize();
            var centerb = new THREE.Vector3().addVectors(va, vb).add(vc).divideScalar(3);
            if (nb.dot(centerb) < 0) nb.negate();
            normArr.push(nb.x, nb.y, nb.z, nb.x, nb.y, nb.z, nb.x, nb.y, nb.z);
        });
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(normArr, 3));
        prepareGlassGeometry(geo);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        addEdgeWire(mesh, geo, 20);
        mesh.userData = { type: 'd10', numbers: faceNumbers, normals: faceNormals };
        addLabels(mesh, faceNumbers, faceCenters, faceNormals, 0.52);
        mesh.castShadow = false;
        return mesh;
    }

    function buildD12() {
        var base = new THREE.DodecahedronGeometry(1.0);
        var geo = base.toNonIndexed();
        prepareGlassGeometry(geo);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        addEdgeWire(mesh, base);
        var faces = facesFromClusters(geo);
        var numbers = [];
        for (var i = 1; i <= faces.centers.length; i++) numbers.push(i);
        mesh.userData = { type: 'd12', numbers: numbers, normals: faces.normals };
        addLabels(mesh, numbers, faces.centers, faces.normals, 0.62);
        mesh.castShadow = false;
        return mesh;
    }

    function buildD20() {
        var R = 1.0;
        var baseGeo = new THREE.IcosahedronGeometry(R, 0);
        var geo = baseGeo.toNonIndexed();
        prepareGlassGeometry(geo);
        var faces = facesFromTris(geo, 20);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        var edgeGeo = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(R * 1.003, 0));
        mesh.add(new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({
            color: EDGE_COLOR,
            transparent: true,
            opacity: 0.32,
        })));
        var numbers = [];
        for (var j = 1; j <= 20; j++) numbers.push(j);
        mesh.userData = { type: 'd20', numbers: numbers, normals: faces.normals };
        addLabels(mesh, numbers, faces.centers, faces.normals, 0.56);
        mesh.castShadow = false;
        return mesh;
    }

    function buildResultDie(total, dieType) {
        if (dieType === 'd10') {
            var baseMesh = buildD10();
            var labelsToRemove = [];
            baseMesh.traverse(function (child) {
                if (child !== baseMesh && child.isMesh && child.material && child.material.map && child.material.transparent) {
                    labelsToRemove.push(child);
                }
            });
            for (var ri = 0; ri < labelsToRemove.length; ri++) {
                if (labelsToRemove[ri].material.map && !labelsToRemove[ri].material.map.userData.cached) {
                    labelsToRemove[ri].material.map.dispose();
                }
                labelsToRemove[ri].material.dispose();
                labelsToRemove[ri].geometry.dispose();
                baseMesh.remove(labelsToRemove[ri]);
            }
            var origNormals = baseMesh.userData.normals;
            var fCount = origNormals.length;
            var nums = [];
            for (var fi = 0; fi < fCount; fi++) nums.push(total);
            var origCenters = [];
            var pos = baseMesh.geometry.attributes.position;
            var triCount = pos.count / 3;
            var tC = [];
            var tN = [];
            for (var t = 0; t < triCount; t++) {
                var ti = t * 3;
                var va = new THREE.Vector3().fromBufferAttribute(pos, ti);
                var vb = new THREE.Vector3().fromBufferAttribute(pos, ti + 1);
                var vc = new THREE.Vector3().fromBufferAttribute(pos, ti + 2);
                tC.push(va.clone().add(vb).add(vc).divideScalar(3));
                var n = new THREE.Vector3().crossVectors(vb.clone().sub(va), vc.clone().sub(va)).normalize();
                if (n.dot(tC[t]) < 0) n.negate();
                tN.push(n);
            }
            for (var fi2 = 0; fi2 < fCount; fi2++) {
                var bestDist = Infinity;
                var bestCenter = tC[0];
                for (var ti2 = 0; ti2 < tC.length; ti2++) {
                    var ang = 1 - origNormals[fi2].dot(tN[ti2]);
                    if (ang < bestDist) {
                        bestDist = ang;
                        bestCenter = tC[ti2];
                    }
                }
                origCenters.push(bestCenter);
            }
            addLabels(baseMesh, nums, origCenters, origNormals, 0.52);
            baseMesh.userData = {
                type: 'result',
                shape: 'd10',
                numbers: nums,
                normals: origNormals,
                labelUps: baseMesh.userData.labelUps,
            };
            return baseMesh;
        }

        var RESULT_CONFIGS = {
            d4: { build: function () { return new THREE.TetrahedronGeometry(1.1); }, faceCount: 4, labelSize: 0.85, faceFn: 'tris' },
            d6: { build: function () { return new THREE.BoxGeometry(1.2, 1.2, 1.2); }, faceCount: 6, labelSize: 0.92, faceFn: 'box' },
            d8: { build: function () { return new THREE.OctahedronGeometry(1.05); }, faceCount: 8, labelSize: 0.55, faceFn: 'tris' },
            d12: { build: function () { return new THREE.DodecahedronGeometry(1.0); }, faceCount: 12, labelSize: 0.62, faceFn: 'clusters' },
            d20: { build: function () { return new THREE.IcosahedronGeometry(1.0, 0); }, faceCount: 20, labelSize: 0.56, faceFn: 'tris' },
        };
        var cfg = dieType ? RESULT_CONFIGS[dieType] : null;
        if (!cfg) cfg = RESULT_CONFIGS.d6;
        var base = cfg.build();
        var geo = base.toNonIndexed();
        prepareGlassGeometry(geo);
        var mesh = new THREE.Mesh(geo, makeBodyMat());
        addEdgeWire(mesh, base);
        var faces;
        if (cfg.faceFn === 'box') {
            var pos2 = geo.attributes.position;
            var centers2 = [];
            var normals2 = [];
            for (var f2 = 0; f2 < 6; f2++) {
                var bi2 = f2 * 6;
                var center2 = new THREE.Vector3();
                for (var v2 = 0; v2 < 6; v2++) center2.add(new THREE.Vector3().fromBufferAttribute(pos2, bi2 + v2));
                center2.divideScalar(6);
                var a2 = new THREE.Vector3().fromBufferAttribute(pos2, bi2);
                var b2 = new THREE.Vector3().fromBufferAttribute(pos2, bi2 + 1);
                var c2 = new THREE.Vector3().fromBufferAttribute(pos2, bi2 + 2);
                var n2 = new THREE.Vector3().crossVectors(b2.clone().sub(a2), c2.clone().sub(a2)).normalize();
                if (n2.dot(center2) < 0) n2.negate();
                centers2.push(center2);
                normals2.push(n2);
            }
            faces = { centers: centers2, normals: normals2 };
        } else if (cfg.faceFn === 'clusters') {
            faces = facesFromClusters(geo);
        } else {
            faces = facesFromTris(geo, cfg.faceCount);
        }
        var fCount2 = faces.centers.length;
        var nums2 = [];
        for (var k = 0; k < fCount2; k++) nums2.push(total);
        mesh.userData = { type: 'result', shape: dieType || 'd6', numbers: nums2, normals: faces.normals };
        addLabels(mesh, nums2, faces.centers, faces.normals, cfg.labelSize);
        mesh.castShadow = false;
        return mesh;
    }

    var BUILDERS = { d4: buildD4, d6: buildD6, d8: buildD8, d10: buildD10, d12: buildD12, d20: buildD20 };

    function getTargetQuaternion(mesh, resultValue) {
        var numbers = mesh.userData.numbers;
        var normals = mesh.userData.normals;
        var dieType = mesh.userData.type;
        var faceIdx = numbers.indexOf(resultValue);
        if (faceIdx === -1) faceIdx = 0;
        var alignQ = new THREE.Quaternion().setFromUnitVectors(normals[faceIdx].clone(), new THREE.Vector3(0, 0, 1));
        var twistAngle;
        var resultShape = mesh.userData.shape;
        if (dieType === 'd6' || (dieType === 'result' && (!resultShape || resultShape === 'd6'))) {
            var screenUp = new THREE.Vector3(0, 1, 0);
            var labelUps = mesh.userData.labelUps;
            var labelUp = labelUps ? labelUps[faceIdx].clone() : new THREE.Vector3(0, 1, 0);
            var bestAngle = 0;
            var bestDot = -2;
            for (var ci = 0; ci < 4; ci++) {
                var angle = ci * (Math.PI / 2);
                var testQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle).multiply(alignQ.clone());
                var upDir = labelUp.clone().applyQuaternion(testQ);
                var dot = upDir.dot(screenUp);
                if (dot > bestDot) {
                    bestDot = dot;
                    bestAngle = angle;
                }
            }
            twistAngle = bestAngle;
        } else {
            twistAngle = Math.random() * Math.PI * 2;
        }
        var twistQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), twistAngle);
        return twistQ.multiply(alignQ);
    }

    function Dice3DInstance(container, opts) {
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
        this._timers = [];
        this._multiMode = false;
        this._multiMeshes = [];
        this._multiStates = [];
        this._multiLanded = 0;
        this._multiCallback = null;
        this._fusionActive = false;
        this._fusionStart = 0;
        this._fusionDuration = 500;
        this._fusionCallback = null;
        this._fusionMesh = null;
        this._epicResult = null;

        var W = this._size;
        var H = this._size;
        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0x12100e);

        this._camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
        this._camera.position.set(0, 0, 4.5);

        this._renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !_isLite, powerPreference: 'default' });
        this._renderer.setSize(W, H);
        this._renderer.setPixelRatio(_isLite ? 1 : Math.min(window.devicePixelRatio, 2));
        this._renderer.shadowMap.enabled = false;
        this._renderer.toneMapping = _isLite ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
        this._renderer.toneMappingExposure = 1.02;
        container.appendChild(this._renderer.domElement);

        this._ambient = new THREE.AmbientLight(0xfff6ec, 0.92);
        this._scene.add(this._ambient);
        this._keyLight = new THREE.DirectionalLight(0xfff3e0, 0.88);
        this._keyLight.position.set(2.4, 4.2, 4.8);
        this._keyLight.castShadow = false;
        this._scene.add(this._keyLight);
        var fillLight = new THREE.DirectionalLight(0xffebd4, 0.38);
        fillLight.position.set(-3.5, -0.5, 3.2);
        this._scene.add(fillLight);
        var rimLight = new THREE.DirectionalLight(0xd8c4a8, 0.24);
        rimLight.position.set(0, -3.5, -2.8);
        this._scene.add(rimLight);
        this._orbitLight = new THREE.PointLight(0xe8d4b8, 0, 6);
        this._scene.add(this._orbitLight);
        this._resultGlow = new THREE.PointLight(0xd4af37, 0, 5);
        this._resultGlow.position.set(0, 0, 2);
        this._scene.add(this._resultGlow);

        this._createMesh();
        this._animate = this._animate.bind(this);
        this._animate(performance.now());
    }

    Dice3DInstance.prototype._trackTimeout = function (fn, ms) {
        var self = this;
        var id = setTimeout(function () {
            self._timers = self._timers.filter(function (t) { return t.id !== id; });
            if (!self._disposed) fn();
        }, ms);
        this._timers.push({ id: id, type: 'timeout' });
        return id;
    };

    Dice3DInstance.prototype._trackInterval = function (fn, ms) {
        var id = setInterval(fn, ms);
        this._timers.push({ id: id, type: 'interval' });
        return id;
    };

    Dice3DInstance.prototype._clearTimers = function () {
        for (var i = 0; i < this._timers.length; i++) {
            var t = this._timers[i];
            if (t.type === 'interval') clearInterval(t.id);
            else clearTimeout(t.id);
        }
        this._timers = [];
    };

    Dice3DInstance.prototype._createMesh = function () {
        if (this._dieMesh) {
            this._dieMesh.traverse(function (child) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map && !child.material.map.userData.cached) child.material.map.dispose();
                    if (child.material !== _sharedBodyMat) child.material.dispose();
                }
            });
            this._scene.remove(this._dieMesh);
            this._dieMesh = null;
        }
        var builder = BUILDERS[this._dieType] || BUILDERS.d20;
        this._dieMesh = builder();
        this._dieMesh.position.set(0, 0, 0);
        this._scene.add(this._dieMesh);
    };

    Dice3DInstance.prototype._animate = function (time) {
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
            var pulse;
            var rv;
            if (this._epicResult === 'crit') {
                pulse = 0.48 + 0.52 * Math.sin(this._resultTime * 3.45);
                rv = 0x66ff88;
            } else if (this._epicResult === 'fail') {
                pulse = 0.42 + 0.5 * Math.sin(this._resultTime * 3.0);
                rv = 0xff5544;
            } else {
                pulse = 0.3 + 0.2 * Math.sin(this._resultTime * 2.5);
                rv = 0xd4af37;
            }
            this._resultGlow.color.setHex(rv);
            this._resultGlow.intensity = pulse;
            var target = this._fusionMesh || this._dieMesh;
            if (target) {
                var amp = this._epicResult ? 0.034 : 0.008;
                var sp = this._epicResult ? 3.1 : 2.0;
                var s = 1.0 + amp * Math.sin(this._resultTime * sp);
                target.scale.setScalar(s);
            }
            if (this._multiMode && this._multiMeshes.length > 0) {
                for (var i = 0; i < this._multiMeshes.length; i++) {
                    var ms = 1.0 + 0.006 * Math.sin(this._resultTime * 2.0 + i * 0.5);
                    this._multiMeshes[i].scale.setScalar(this._multiStates[i].baseScale * ms);
                }
            }
        } else if (this._dieMesh) {
            this._resultGlow.color.setHex(0xd4af37);
            this._idleTime += 0.012;
            this._dieMesh.rotation.y += 0.003;
            this._dieMesh.rotation.x += 0.001;
            this._orbitLight.intensity = 0;
            this._resultGlow.intensity = 0;
        }
        this._renderer.render(this._scene, this._camera);
    };

    Dice3DInstance.prototype._updateRoll = function (time) {
        var elapsed = time - this._rollStart;
        var t = Math.min(elapsed / this._rollDuration, 1);
        var eased = 1 - Math.pow(1 - t, 4);
        var mesh = this._dieMesh;
        mesh.rotation.x = this._startEuler.x + (this._endEuler.x - this._startEuler.x) * eased;
        mesh.rotation.y = this._startEuler.y + (this._endEuler.y - this._startEuler.y) * eased;
        mesh.rotation.z = this._startEuler.z + (this._endEuler.z - this._startEuler.z) * eased;
        var speed = 1 - eased;
        var orbitAngle = elapsed * 0.008;
        this._orbitLight.position.set(Math.cos(orbitAngle) * 2.5, Math.sin(orbitAngle) * 2.5, 1.5);
        this._orbitLight.intensity = speed * 1.45;
        var scalePulse = 1.0 + speed * 0.04 * Math.sin(elapsed * 0.015);
        mesh.scale.setScalar(scalePulse);
        pulseDieBodyMaterial(mesh, speed);

        if (elapsed >= this._rollDuration) {
            mesh.quaternion.copy(this._finalQuat);
            mesh.scale.setScalar(1.0);
            resetDieBodyMaterial(mesh);
            this._orbitLight.intensity = 0;
            this._keyLight.intensity = 1.55;
            var self = this;
            var flashI = 1.55;
            var flashFade = self._trackInterval(function () {
                flashI -= 0.08;
                if (flashI <= 0.95) {
                    self._keyLight.intensity = 0.95;
                    clearInterval(flashFade);
                } else {
                    self._keyLight.intensity = flashI;
                }
            }, 22);
            mesh.scale.setScalar(1.08);
            self._trackTimeout(function () {
                if (self._dieMesh) self._dieMesh.scale.setScalar(1.0);
            }, 120);
            var el = self._container;
            if (el) {
                el.style.transition = 'transform 0.06s ease-out';
                el.style.transform = 'translate(' + (Math.random() - 0.5) * 4 + 'px,' + (Math.random() - 0.5) * 4 + 'px)';
                self._trackTimeout(function () {
                    el.style.transform = 'translate(' + (Math.random() - 0.5) * 2 + 'px,' + (Math.random() - 0.5) * 2 + 'px)';
                }, 60);
                self._trackTimeout(function () {
                    el.style.transition = 'transform 0.1s ease-out';
                    el.style.transform = '';
                }, 140);
            }
            this._rolling = false;
            this._showingResult = true;
            this._resultTime = 0;
            this._resultGlow.intensity = 0.55;
            if (this._rollCallback) this._rollCallback();
        }
    };

    Dice3DInstance.prototype._epicVignette = function (isCrit) {
        if (this._disposed) return;
        var root = this._container && this._container.parentElement;
        if (!root) return;
        if (!document.querySelector('style[data-dice3d-epic]')) {
            var st = document.createElement('style');
            st.setAttribute('data-dice3d-epic', '1');
            st.textContent = '@keyframes dice3dEpicVignette{0%{opacity:0;filter:brightness(1) saturate(1)}18%{opacity:1;filter:brightness(1.35) saturate(1.25)}100%{opacity:0;filter:brightness(1) saturate(1)}}@keyframes dice3dEpicShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-12px,5px)}40%{transform:translate(10px,-8px)}60%{transform:translate(-8px,-5px)}80%{transform:translate(6px,4px)}}';
            document.head.appendChild(st);
        }
        var v = document.createElement('div');
        v.setAttribute('data-dice3d-epic-overlay', '1');
        var g = isCrit
            ? 'radial-gradient(ellipse 72% 58% at 50% 40%,rgba(255,250,200,0.82) 0%,rgba(120,220,140,0.62) 30%,rgba(30,90,45,0.42) 56%,transparent 74%)'
            : 'radial-gradient(ellipse 68% 52% at 50% 42%,rgba(255,150,120,0.82) 0%,rgba(200,50,40,0.58) 34%,rgba(50,10,8,0.52) 60%,transparent 76%)';
        v.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:40;background:' + g + ';animation:dice3dEpicVignette 0.82s ease-out forwards;mix-blend-mode:screen';
        if (!root.style.position) root.style.position = 'relative';
        root.appendChild(v);
        setTimeout(function () {
            if (v.parentNode) v.parentNode.removeChild(v);
        }, 900);
        var holder = this._container;
        if (holder) {
            holder.style.animation = 'dice3dEpicShake 0.42s ease-out';
            setTimeout(function () {
                holder.style.animation = '';
            }, 430);
        }
    };

    Dice3DInstance.prototype._spawnRing = function (color) {
        var mount = this._particlesEl || this._container;
        if (!mount || !color) return;
        mount.style.position = mount.style.position || 'relative';
        var cx = mount.offsetWidth / 2;
        var cy = mount.offsetHeight / 2;
        for (var r = 0; r < 4; r++) {
            (function (rr) {
                var ring = document.createElement('div');
                var thick = 2 + rr;
                var ringSize = 22 + rr * 6;
                ring.style.cssText = 'position:absolute;left:' + cx + 'px;top:' + cy + 'px;width:' + ringSize + 'px;height:' + ringSize + 'px;margin:' + (-ringSize / 2) + 'px 0 0 ' + (-ringSize / 2) + 'px;border-radius:50%;border:' + thick + 'px solid ' + color + ';opacity:0.92;pointer-events:none;z-index:36;will-change:transform,opacity';
                var delay = rr * 95;
                ring.animate(
                    [{ transform: 'scale(0.12)', opacity: 0.95 }, { transform: 'scale(16)', opacity: 0 }],
                    { duration: 820 + rr * 90, easing: 'cubic-bezier(0.12,0.88,0.2,1)', delay: delay, fill: 'forwards' }
                );
                mount.appendChild(ring);
                setTimeout(function () {
                    if (ring.parentNode) ring.parentNode.removeChild(ring);
                }, 1500 + delay);
            })(r);
        }
    };

    Dice3DInstance.prototype._spawnParticles = function (color, n, epic) {
        epic = !!epic;
        var c = this._particlesEl;
        if (!c) return;
        var mul = epic ? 1.7 : 1;
        if (_isLite) n = Math.max(epic ? 22 : 8, Math.floor((n * mul) / 3));
        else if (_isMedium) n = Math.max(epic ? 32 : 10, Math.floor(n * mul * 0.75));
        else n = Math.max(1, Math.floor(n * mul));
        var cx = c.offsetWidth / 2;
        var cy = c.offsetHeight / 2;
        for (var i = 0; i < n; i++) {
            var p = document.createElement('div');
            var s = epic ? (4 + Math.random() * 11) : (2 + Math.random() * 5);
            p.style.cssText = 'position:absolute;border-radius:50%;background:' + color + ';opacity:0;width:' + s + 'px;height:' + s + 'px;left:' + cx + 'px;top:' + cy + 'px';
            var a = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.85;
            var dist = epic ? (90 + Math.random() * 170) : (40 + Math.random() * 100);
            var dx = Math.cos(a) * dist;
            var dy = Math.sin(a) * dist;
            var dur = epic ? (500 + Math.random() * 480) : (450 + Math.random() * 550);
            p.animate(
                [{ opacity: 0.95, transform: 'translate(0,0) scale(1)' }, { opacity: 0, transform: 'translate(' + dx + 'px,' + dy + 'px) scale(0)' }],
                { duration: dur, easing: 'cubic-bezier(0,0.28,0.45,1)' }
            );
            c.appendChild(p);
            (function (el, d) {
                setTimeout(function () {
                    el.remove();
                }, d);
            })(p, dur);
        }
    };

    Dice3DInstance.prototype.roll = function (resultValue, onDone) {
        var self = this;
        this._epicResult = null;
        this._resultGlow.color.setHex(0xd4af37);
        this._showingResult = false;
        this._rolling = false;
        this._createMesh();
        haptic('medium');
        var mesh = this._dieMesh;
        var dieType = this._dieType;
        this._finalQuat = getTargetQuaternion(mesh, resultValue);
        this._startEuler = { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z };
        var targetEuler = new THREE.Euler().setFromQuaternion(this._finalQuat);
        var spins = 3 + Math.floor(Math.random() * 3);
        var dir = function () {
            return Math.random() > 0.5 ? 1 : -1;
        };
        this._endEuler = {
            x: targetEuler.x + Math.PI * 2 * spins * dir(),
            y: targetEuler.y + Math.PI * 2 * spins * dir(),
            z: targetEuler.z + Math.PI * 2 * spins * dir(),
        };
        var maxVal = { d4: 4, d6: 6, d8: 8, d10: 9, d12: 12, d20: 20 }[dieType] || 20;
        var minVal = dieType === 'd10' ? 0 : 1;
        var isCrit = resultValue === maxVal;
        var isFail = resultValue === minVal;
        this._rollDuration = this._rollMs;
        this._rollStart = performance.now();
        this._rolling = true;
        this._rollCallback = function () {
            self._epicResult = isCrit ? 'crit' : (isFail ? 'fail' : null);
            if (isCrit || isFail) {
                haptic('heavy');
                try {
                    self._epicVignette(isCrit);
                } catch (_ev) { /* ignore */ }
                self._spawnRing(isCrit ? V_SUCCESS_HEX : V_DANGER_HEX);
                var pc = isCrit ? 88 : 82;
                self._spawnParticles(isCrit ? V_SUCCESS_HEX : V_DANGER_HEX, pc, true);
                self._trackTimeout(function () {
                    self._spawnParticles(isCrit ? '#fff8c4' : '#ff9e8a', isCrit ? 40 : 36, true);
                }, 240);
                if (self._dieMesh) {
                    var glowColor = parseInt((isCrit ? V_SUCCESS_HEX : V_DANGER_HEX).replace('#', ''), 16);
                    var glow = new THREE.PointLight(glowColor, 3.2, 5.5);
                    glow.position.set(0, 0.35, 1.1);
                    self._dieMesh.add(glow);
                    var intensity = 3.2;
                    var fadeGlow = self._trackInterval(function () {
                        intensity -= 0.04;
                        if (intensity <= 0) {
                            if (self._dieMesh) self._dieMesh.remove(glow);
                            clearInterval(fadeGlow);
                        } else glow.intensity = intensity;
                    }, 42);
                }
            } else {
                haptic('heavy');
                self._spawnParticles(V_GOLD_HEX, 15, false);
            }
            if (onDone) onDone();
        };
        return this._rollDuration;
    };

    Dice3DInstance.prototype.rollMultiple = function (configs, onDone) {
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
        if (this._dieMesh) {
            this._scene.remove(this._dieMesh);
            this._dieMesh = null;
        }
        for (var k = 0; k < this._multiMeshes.length; k++) {
            var _mm = this._multiMeshes[k];
            _mm.traverse(function (child) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map && !child.material.map.userData.cached) child.material.map.dispose();
                    if (child.material !== _sharedBodyMat) child.material.dispose();
                }
            });
            this._scene.remove(_mm);
        }
        this._multiMeshes = [];
        this._multiStates = [];
        var layouts = {
            2: [[-0.8, 0], [0.8, 0]],
            3: [[-0.9, -0.45], [0.9, -0.45], [0, 0.6]],
            4: [[-0.8, -0.55], [0.8, -0.55], [-0.8, 0.55], [0.8, 0.55]],
            5: [[-1.0, -0.55], [0, -0.55], [1.0, -0.55], [-0.55, 0.55], [0.55, 0.55]],
        };
        var positions = layouts[count] || layouts[5];
        this._camera.position.z = count <= 2 ? 4.5 : count === 3 ? 4.8 : count === 4 ? 5.0 : 5.4;
        var baseScale = count <= 2 ? 0.85 : count === 3 ? 0.78 : count === 4 ? 0.72 : 0.65;
        var builder = BUILDERS[this._dieType] || BUILDERS.d20;
        var staggerMs = 80;
        for (var i = 0; i < count; i++) {
            var mesh = builder();
            var pos = positions[i] || [0, 0];
            mesh.position.set(pos[0], pos[1], 0);
            mesh.scale.setScalar(baseScale);
            this._scene.add(mesh);
            this._multiMeshes.push(mesh);
            var val = configs[i].value;
            var finalQuat = getTargetQuaternion(mesh, val);
            var startE = { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z };
            var targetE = new THREE.Euler().setFromQuaternion(finalQuat);
            var spins = 3 + Math.floor(Math.random() * 3);
            var dir = function () {
                return Math.random() > 0.5 ? 1 : -1;
            };
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
                originX: pos[0],
                originY: pos[1],
                value: val,
            });
        }
        this._rollStart = performance.now();
        return this._rollMs + (count - 1) * staggerMs;
    };

    Dice3DInstance.prototype._updateMultiRoll = function (time) {
        var allLanded = true;
        var self = this;
        for (var i = 0; i < this._multiMeshes.length; i++) {
            var st = this._multiStates[i];
            if (st.landed) continue;
            var elapsed = time - st.startTime;
            if (elapsed < 0) {
                allLanded = false;
                continue;
            }
            var t = Math.min(elapsed / this._rollMs, 1);
            var eased = 1 - Math.pow(1 - t, 4);
            var mesh = this._multiMeshes[i];
            mesh.rotation.x = st.startEuler.x + (st.endEuler.x - st.startEuler.x) * eased;
            mesh.rotation.y = st.startEuler.y + (st.endEuler.y - st.startEuler.y) * eased;
            mesh.rotation.z = st.startEuler.z + (st.endEuler.z - st.startEuler.z) * eased;
            var speed = 1 - eased;
            var scalePulse = st.baseScale * (1.0 + speed * 0.04 * Math.sin(elapsed * 0.015));
            mesh.scale.setScalar(scalePulse);
            pulseDieBodyMaterial(mesh, speed);
            if (elapsed >= this._rollMs) {
                mesh.quaternion.copy(st.finalQuat);
                mesh.scale.setScalar(st.baseScale * 1.08);
                resetDieBodyMaterial(mesh);
                st.landed = true;
                self._multiLanded++;
                haptic('light');
                (function (m, bs, inst) {
                    inst._trackTimeout(function () {
                        m.scale.setScalar(bs);
                    }, 100);
                })(mesh, st.baseScale, self);
            } else {
                allLanded = false;
            }
        }
        if (this._multiMeshes.length > 0 && !this._multiStates[0].landed) {
            var e0 = time - this._multiStates[0].startTime;
            var sp0 = 1 - Math.min(e0 / this._rollMs, 1);
            var angle = e0 * 0.008;
            this._orbitLight.position.set(Math.cos(angle) * 2.5, Math.sin(angle) * 2.5, 1.5);
            this._orbitLight.intensity = sp0 * 1.35;
        } else {
            this._orbitLight.intensity = 0;
        }
        if (allLanded && this._multiLanded >= this._multiMeshes.length) {
            this._rolling = false;
            this._showingResult = true;
            this._resultTime = 0;
            this._keyLight.intensity = 1.35;
            var flashI = 1.35;
            var flashFade = self._trackInterval(function () {
                flashI -= 0.07;
                if (flashI <= 0.95) {
                    self._keyLight.intensity = 0.95;
                    clearInterval(flashFade);
                } else self._keyLight.intensity = flashI;
            }, 20);
            var el = this._container;
            if (el) {
                el.style.transition = 'transform 0.06s ease-out';
                el.style.transform = 'translate(' + (Math.random() - 0.5) * 3 + 'px,' + (Math.random() - 0.5) * 3 + 'px)';
                self._trackTimeout(function () {
                    el.style.transform = '';
                    el.style.transition = '';
                }, 120);
            }
            this._spawnParticles(V_GOLD_HEX, 12, false);
            this._resultGlow.intensity = 0.48;
            if (this._multiCallback) this._multiCallback();
        }
    };

    Dice3DInstance.prototype.fusionTo = function (totalValue, onDone) {
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
    };

    Dice3DInstance.prototype._updateFusion = function (time) {
        var elapsed = time - this._fusionStart;
        var t = Math.min(elapsed / this._fusionDuration, 1);
        var eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        var self = this;
        for (var i = 0; i < this._multiMeshes.length; i++) {
            var mesh = this._multiMeshes[i];
            var st = this._multiStates[i];
            var targetScale = st.baseScale * (1 - eased * 0.7);
            mesh.scale.setScalar(targetScale);
            mesh.position.x = st.originX * (1 - eased);
            mesh.position.y = (st.originY || 0) * (1 - eased);
            mesh.rotation.y += 0.02 * (1 + eased * 3);
        }
        var angle = elapsed * 0.015;
        this._orbitLight.position.set(Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, 1.5);
        this._orbitLight.intensity = eased * 1.85;
        if (elapsed >= this._fusionDuration) {
            for (var j = 0; j < this._multiMeshes.length; j++) {
                this._scene.remove(this._multiMeshes[j]);
            }
            this._multiMeshes = [];
            this._multiStates = [];
            this._multiMode = false;
            this._fusionMesh = buildResultDie(this._fusionTotal, this._dieType);
            this._fusionMesh.position.set(0, 0, 0);
            this._fusionMesh.scale.setScalar(0.01);
            var normals = this._fusionMesh.userData.normals;
            var faceIdx = 0;
            for (var fi = 0; fi < normals.length; fi++) {
                if (normals[fi].z > normals[faceIdx].z) faceIdx = fi;
            }
            var alignQ = new THREE.Quaternion().setFromUnitVectors(normals[faceIdx].clone(), new THREE.Vector3(0, 0, 1));
            this._fusionMesh.quaternion.copy(alignQ);
            this._scene.add(this._fusionMesh);
            this._camera.position.z = 4.5;
            this._keyLight.intensity = 1.65;
            var flashI2 = 1.65;
            var flashFade2 = self._trackInterval(function () {
                flashI2 -= 0.12;
                if (flashI2 <= 0.95) {
                    self._keyLight.intensity = 0.95;
                    clearInterval(flashFade2);
                } else self._keyLight.intensity = flashI2;
            }, 20);
            this._orbitLight.intensity = 0;
            haptic('heavy');
            this._spawnRing(V_GOLD_HEX);
            this._spawnParticles(V_GOLD_HEX, 25, false);
            var fm = this._fusionMesh;
            fm.scale.setScalar(1.15);
            self._trackTimeout(function () {
                if (fm) fm.scale.setScalar(1.0);
            }, 150);
            var el2 = this._container;
            if (el2) {
                el2.style.transition = 'transform 0.06s ease-out';
                el2.style.transform = 'translate(' + (Math.random() - 0.5) * 5 + 'px,' + (Math.random() - 0.5) * 5 + 'px)';
                self._trackTimeout(function () {
                    el2.style.transform = 'translate(' + (Math.random() - 0.5) * 2 + 'px,' + (Math.random() - 0.5) * 2 + 'px)';
                }, 60);
                self._trackTimeout(function () {
                    el2.style.transition = '';
                    el2.style.transform = '';
                }, 140);
            }
            this._fusionActive = false;
            this._showingResult = true;
            this._resultTime = 0;
            this._resultGlow.intensity = 0.62;
            if (this._fusionCallback) this._fusionCallback();
        }
    };

    Dice3DInstance.prototype.dispose = function () {
        if (this._disposed) return;
        this._disposed = true;
        this._clearTimers();
        if (this._animFrame) cancelAnimationFrame(this._animFrame);
        var self = this;
        function disposeMesh(mesh) {
            if (!mesh) return;
            self._scene.remove(mesh);
            mesh.traverse(function (child) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map && !child.material.map.userData.cached) child.material.map.dispose();
                    if (child.material !== _sharedBodyMat) child.material.dispose();
                }
            });
        }
        disposeMesh(this._dieMesh);
        disposeMesh(this._fusionMesh);
        for (var i = 0; i < this._multiMeshes.length; i++) disposeMesh(this._multiMeshes[i]);
        this._multiMeshes = [];
        this._dieMesh = null;
        this._fusionMesh = null;
        try {
            this._renderer.dispose();
        } catch (_rd) { /* ignore */ }
        if (this._renderer && this._renderer.domElement && this._renderer.domElement.parentNode) {
            this._renderer.domElement.parentNode.removeChild(this._renderer.domElement);
        }
    };

    return Dice3DInstance;
})();
