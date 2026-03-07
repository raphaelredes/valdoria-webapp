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

const Dice3D = (() => {
    'use strict';

    // ─── Color palette ───
    const FACE_COLOR_HEX = '#2e2218';
    const FACE_COLOR = 0x2e2218;
    const EDGE_COLOR = 0xc4953a;
    const NUM_COLOR = '#c4953a';
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
    //  SHARED TEXTURE & MATERIAL HELPERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Number texture for material-per-face dice (d4, d6, d8, d10, d12)
    function makeFaceTexture(num, size, fontScale) {
        size = size || 256;
        fontScale = fontScale || 1.0;
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const ctx = c.getContext('2d');

        // Dark face background
        ctx.fillStyle = FACE_COLOR_HEX;
        ctx.fillRect(0, 0, size, size);

        // Subtle gradient overlay
        const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grad.addColorStop(0, 'rgba(60,50,30,0.3)');
        grad.addColorStop(1, 'rgba(20,15,10,0.3)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        // Number
        const text = String(num);
        const fontSize = (text.length > 1 ? size * 0.32 : size * 0.42) * fontScale;
        ctx.font = `bold ${fontSize}px "Cinzel", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = 'rgba(212,175,55,0.6)';
        ctx.shadowBlur = size * 0.08;
        ctx.fillStyle = NUM_COLOR;
        ctx.fillText(text, size / 2, size / 2);

        // Underline 6 and 9
        if (num === 6 || num === 9) {
            const w = ctx.measureText(text).width;
            ctx.fillRect(size / 2 - w / 2, size / 2 + fontSize * 0.38, w, fontSize * 0.06);
        }

        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    function makeFaceMaterial(num, fontScale) {
        return new THREE.MeshStandardMaterial({
            map: makeFaceTexture(num, undefined, fontScale),
            metalness: 0.15,
            roughness: 0.55,
            side: THREE.DoubleSide,
        });
    }

    function addEdges(mesh, geo, threshold) {
        const edges = new THREE.EdgesGeometry(geo, threshold !== undefined ? threshold : 15);
        const line = new THREE.LineSegments(edges,
            new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.35 }));
        mesh.add(line);
    }

    // Number texture for d20 floating labels (transparent bg)
    function makeD20LabelTexture(num, size) {
        size = size || 256;
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, size, size);

        const fontSize = num >= 10 ? size * 0.52 : size * 0.62;
        ctx.font = `bold ${fontSize}px "Cinzel", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 10;
        ctx.lineJoin = 'round';
        ctx.strokeText(String(num), size / 2, size / 2);

        ctx.shadowColor = 'rgba(212,175,55,0.5)';
        ctx.shadowBlur = size * 0.06;
        ctx.fillStyle = '#fff8e0';
        ctx.fillText(String(num), size / 2, size / 2);

        if (num === 6 || num === 9) {
            const w = ctx.measureText(String(num)).width;
            ctx.fillRect(size / 2 - w / 2, size / 2 + fontSize * 0.38, w, fontSize * 0.06);
        }

        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  PER-FACE UV MAPPING
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function computePerFaceUVs(geo, vertsPerFace) {
        const pos = geo.attributes.position;
        const totalVerts = pos.count;
        const faceCount = totalVerts / vertsPerFace;
        const uvs = new Float32Array(totalVerts * 2);

        for (let f = 0; f < faceCount; f++) {
            const base = f * vertsPerFace;
            const verts = [];
            const center = new THREE.Vector3();
            for (let j = 0; j < vertsPerFace; j++) {
                const v = new THREE.Vector3().fromBufferAttribute(pos, base + j);
                verts.push(v);
                center.add(v);
            }
            center.divideScalar(vertsPerFace);

            const ab = new THREE.Vector3().subVectors(verts[1], verts[0]);
            const ac = new THREE.Vector3().subVectors(verts[2], verts[0]);
            const normal = new THREE.Vector3().crossVectors(ab, ac).normalize();

            const tangent = new THREE.Vector3().subVectors(verts[0], center);
            tangent.sub(normal.clone().multiplyScalar(tangent.dot(normal)));
            tangent.normalize();
            const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();

            const proj = verts.map(v => {
                const d = new THREE.Vector3().subVectors(v, center);
                return { u: d.dot(tangent), v: d.dot(bitangent) };
            });

            let maxExt = 0;
            for (const p of proj) {
                maxExt = Math.max(maxExt, Math.abs(p.u), Math.abs(p.v));
            }
            maxExt = maxExt || 1;

            const halfRange = 0.42;
            const scale = halfRange / maxExt;
            for (let j = 0; j < vertsPerFace; j++) {
                uvs[(base + j) * 2] = 0.5 + proj[j].u * scale;
                uvs[(base + j) * 2 + 1] = 0.5 + proj[j].v * scale;
            }
        }
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  GENERIC POLYHEDRON BUILDER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function buildPolyhedron(geo, faceCount, vertsPerFace, numbers, fontScale) {
        const nonIndexed = geo.toNonIndexed();
        nonIndexed.clearGroups();
        for (let i = 0; i < faceCount; i++) {
            nonIndexed.addGroup(i * vertsPerFace, vertsPerFace, i);
        }
        computePerFaceUVs(nonIndexed, vertsPerFace);

        const pos = nonIndexed.attributes.position;
        const normals = [];
        for (let i = 0; i < faceCount; i++) {
            const base = i * vertsPerFace;
            const a = new THREE.Vector3().fromBufferAttribute(pos, base);
            const b = new THREE.Vector3().fromBufferAttribute(pos, base + 1);
            const c = new THREE.Vector3().fromBufferAttribute(pos, base + 2);
            normals.push(new THREE.Vector3().crossVectors(
                new THREE.Vector3().subVectors(b, a),
                new THREE.Vector3().subVectors(c, a)
            ).normalize());
        }

        const mats = numbers.map(n => makeFaceMaterial(n, fontScale));
        const mesh = new THREE.Mesh(nonIndexed, mats);
        addEdges(mesh, nonIndexed);
        mesh.userData = { numbers, normals };
        mesh.castShadow = true;
        return mesh;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  D4 — TETRAHEDRON (4 triangular faces)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function buildD4() {
        const geo = new THREE.TetrahedronGeometry(1.0);
        const mesh = buildPolyhedron(geo, 4, 3, [1, 2, 3, 4], 0.65);
        mesh.userData.type = 'd4';
        return mesh;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  D6 — CUBE (6 square faces)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const D6_NUMBERS = [3, 4, 1, 6, 2, 5]; // +X, -X, +Y, -Y, +Z, -Z
    const D6_NORMALS = [
        new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
    ];

    function buildD6() {
        const geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        const mats = D6_NUMBERS.map(n => makeFaceMaterial(n));
        const mesh = new THREE.Mesh(geo, mats);
        addEdges(mesh, geo);
        mesh.userData = { type: 'd6', numbers: D6_NUMBERS, normals: D6_NORMALS };
        mesh.castShadow = true;
        return mesh;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  D8 — OCTAHEDRON (8 triangular faces)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function buildD8() {
        const geo = new THREE.OctahedronGeometry(1.0);
        const mesh = buildPolyhedron(geo, 8, 3, [1, 2, 3, 4, 5, 6, 7, 8]);
        mesh.userData.type = 'd8';
        return mesh;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  D10 — PENTAGONAL TRAPEZOHEDRON (10 kite faces)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function buildD10() {
        const scale = 1.15;
        const step = Math.PI * 2 / 10;
        const hOff = 0.105;

        const rawVerts = [];
        for (let i = 0; i < 10; i++) {
            const angle = i * step;
            rawVerts.push(new THREE.Vector3(
                Math.cos(angle), Math.sin(angle), hOff * (i % 2 ? 1 : -1)
            ).normalize().multiplyScalar(scale));
        }
        rawVerts.push(new THREE.Vector3(0, 0, -1).multiplyScalar(scale)); // bottom pole
        rawVerts.push(new THREE.Vector3(0, 0, 1).multiplyScalar(scale));  // top pole

        const kiteFaces = [
            [5, 7, 11, 0], [4, 2, 10, 1], [1, 3, 11, 2], [0, 8, 10, 3],
            [7, 9, 11, 4], [8, 6, 10, 5], [9, 1, 11, 6], [2, 0, 10, 7],
            [3, 5, 11, 8], [6, 4, 10, 9],
        ];
        const equatTris = [
            [1, 0, 2], [1, 2, 3], [3, 2, 4], [3, 4, 5], [5, 4, 6],
            [5, 6, 7], [7, 6, 8], [7, 8, 9], [9, 8, 0], [9, 0, 1],
        ];

        const positions = [], uvArr = [], normArr = [];
        const groups = [];
        let offset = 0;
        const af = Math.PI * 6 / 5;
        const triAngle = Math.PI * 2 / 3;

        const faceNormals = [];
        const faceNumbers = [];

        kiteFaces.forEach((face, fi) => {
            const [a, b, pole, num] = face;
            const va = rawVerts[a], vb = rawVerts[b], vc = rawVerts[pole];
            positions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z);

            const e1 = new THREE.Vector3().subVectors(vb, va);
            const e2 = new THREE.Vector3().subVectors(vc, va);
            const n = new THREE.Vector3().crossVectors(e1, e2).normalize();
            const center = new THREE.Vector3().addVectors(va, vb).add(vc).divideScalar(3);
            if (n.dot(center) < 0) n.negate();
            normArr.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);

            for (let j = 0; j < 3; j++) {
                const ang = triAngle * j + af;
                uvArr.push((Math.cos(ang) + 1) / 2, (Math.sin(ang) + 1) / 2);
            }

            groups.push({ start: offset, count: 3, materialIndex: fi });
            offset += 3;
            faceNormals.push(n);
            faceNumbers.push(num);
        });

        equatTris.forEach(tri => {
            const [a, b, c] = tri;
            const va = rawVerts[a], vb = rawVerts[b], vc = rawVerts[c];
            positions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z);

            const e1 = new THREE.Vector3().subVectors(vb, va);
            const e2 = new THREE.Vector3().subVectors(vc, va);
            const n = new THREE.Vector3().crossVectors(e1, e2).normalize();
            const center = new THREE.Vector3().addVectors(va, vb).add(vc).divideScalar(3);
            if (n.dot(center) < 0) n.negate();
            normArr.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);

            uvArr.push(0, 0, 1, 0, 0.5, 1);
            groups.push({ start: offset, count: 3, materialIndex: 10 });
            offset += 3;
        });

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(normArr, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
        groups.forEach(g => geo.addGroup(g.start, g.count, g.materialIndex));

        const mats = faceNumbers.map(n => makeFaceMaterial(n, 0.8));
        mats.push(new THREE.MeshStandardMaterial({
            color: FACE_COLOR, metalness: 0.15, roughness: 0.55, side: THREE.DoubleSide,
        }));

        const mesh = new THREE.Mesh(geo, mats);
        addEdges(mesh, geo, 20);
        mesh.userData = { type: 'd10', numbers: faceNumbers, normals: faceNormals };
        mesh.castShadow = true;
        return mesh;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  D12 — DODECAHEDRON (12 pentagonal faces)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function buildD12() {
        const geo = new THREE.DodecahedronGeometry(1.0);
        // Each pentagon = 3 triangles = 9 vertices per face
        const numbers = [];
        for (let i = 1; i <= 12; i++) numbers.push(i);
        const mesh = buildPolyhedron(geo, 12, 9, numbers);
        mesh.userData.type = 'd12';
        return mesh;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  D20 — ICOSAHEDRON (20 triangular faces)
    //  Uses vertex-color gradient + floating label planes
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function buildD20() {
        const R = 1.0;
        let geo = new THREE.IcosahedronGeometry(R, 0);
        geo = geo.toNonIndexed();
        const pos = geo.attributes.position;

        // Vertex-color gradient: dark brown (bottom) -> gold (top)
        const colorsArr = new Float32Array(pos.count * 3);
        const cLow = new THREE.Color(0x2a1e10);
        const cHigh = new THREE.Color(0xc4953a);
        const cTmp = new THREE.Color();
        for (let i = 0; i < pos.count; i++) {
            const t = (pos.getY(i) / R + 1) / 2;
            cTmp.copy(cLow).lerp(cHigh, t);
            colorsArr[i * 3] = cTmp.r;
            colorsArr[i * 3 + 1] = cTmp.g;
            colorsArr[i * 3 + 2] = cTmp.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colorsArr, 3));

        const fNormals = [];
        const fCenters = [];
        for (let f = 0; f < 20; f++) {
            const i = f * 3;
            const a = new THREE.Vector3().fromBufferAttribute(pos, i);
            const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
            const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
            const center = a.clone().add(b).add(c).divideScalar(3);
            const normal = new THREE.Vector3()
                .crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
            if (normal.dot(center) < 0) normal.negate();
            fCenters.push(center);
            fNormals.push(normal);
        }

        const bodyMat = new THREE.MeshPhongMaterial({
            vertexColors: true, shininess: 100,
            specular: new THREE.Color(0x554433), flatShading: true,
        });
        const mesh = new THREE.Mesh(geo, bodyMat);

        // Gold edge wireframe
        const edgeGeo = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(R * 1.003, 0));
        mesh.add(new THREE.LineSegments(edgeGeo,
            new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.5 })));

        // Floating number labels on each face
        for (let i = 0; i < 20; i++) {
            const tex = makeD20LabelTexture(i + 1, 256);
            const mat = new THREE.MeshBasicMaterial({
                map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
            });
            const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.48), mat);
            const normal = fNormals[i];
            const center = fCenters[i];
            plane.position.copy(center.clone().add(normal.clone().multiplyScalar(0.008)));

            const worldUp = new THREE.Vector3(0, 1, 0);
            let faceUp = worldUp.clone().addScaledVector(normal, -worldUp.dot(normal));
            if (faceUp.lengthSq() < 0.001) {
                faceUp = new THREE.Vector3(1, 0, 0).addScaledVector(normal,
                    -new THREE.Vector3(1, 0, 0).dot(normal));
            }
            faceUp.normalize();
            const faceRight = new THREE.Vector3().crossVectors(faceUp, normal).normalize();
            plane.rotation.setFromRotationMatrix(
                new THREE.Matrix4().makeBasis(faceRight, faceUp, normal));
            mesh.add(plane);
        }

        const numbers = [];
        for (let i = 1; i <= 20; i++) numbers.push(i);
        mesh.userData = { type: 'd20', numbers, normals: fNormals };
        mesh.castShadow = true;
        return mesh;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  BUILDER REGISTRY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const BUILDERS = { d4: buildD4, d6: buildD6, d8: buildD8, d10: buildD10, d12: buildD12, d20: buildD20 };

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  ORIENT RESULT FACE TOWARD CAMERA
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    function getTargetQuaternion(mesh, resultValue) {
        const { numbers, normals } = mesh.userData;
        let faceIdx = numbers.indexOf(resultValue);
        if (faceIdx === -1) faceIdx = 0;

        const faceNormal = normals[faceIdx].clone();
        const targetDir = new THREE.Vector3(0, 0.85, 0.52).normalize();
        const quat = new THREE.Quaternion();
        quat.setFromUnitVectors(faceNormal, targetDir);
        return quat;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  CLASS: Dice3D
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    class Dice3DInstance {
        constructor(container, opts = {}) {
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

            const W = this._size, H = this._size;

            // Scene
            this._scene = new THREE.Scene();
            this._camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
            this._camera.position.set(0, 3.5, 6);
            this._camera.lookAt(0, 0, 0);

            // Renderer
            this._renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            this._renderer.setSize(W, H);
            this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this._renderer.shadowMap.enabled = true;
            this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.appendChild(this._renderer.domElement);

            // Lighting
            this._scene.add(new THREE.AmbientLight(0xffffff, 0.5));

            const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
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

            const fillLight = new THREE.DirectionalLight(0xc8d8ff, 0.3);
            fillLight.position.set(-3, 2, -2);
            this._scene.add(fillLight);

            const rimLight = new THREE.PointLight(0xd4af37, 0.4, 10);
            rimLight.position.set(0, 1, -4);
            this._scene.add(rimLight);

            // Ground plane (receives shadow)
            const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
            this._ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), groundMat);
            this._ground.rotation.x = -Math.PI / 2;
            this._ground.position.y = -1.5;
            this._ground.receiveShadow = true;
            this._scene.add(this._ground);

            // Build die mesh
            this._createMesh();

            // Start render loop
            this._animate = this._animate.bind(this);
            this._animate(performance.now());
        }

        _createMesh() {
            if (this._dieMesh) {
                this._scene.remove(this._dieMesh);
                this._dieMesh = null;
            }
            const builder = BUILDERS[this._dieType] || BUILDERS.d20;
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
                // Stay still at result
            } else if (this._dieMesh) {
                // Idle float
                this._idleTime += 0.012;
                this._dieMesh.rotation.y = this._idleTime * 0.3;
                this._dieMesh.rotation.x = Math.sin(this._idleTime * 0.5) * 0.12 - 0.2;
                this._dieMesh.position.y = Math.sin(this._idleTime * 0.8) * 0.08;
            }

            this._renderer.render(this._scene, this._camera);
        }

        _updateRoll(time) {
            const elapsed = time - this._rollAnim.startTime;
            const dur = this._rollAnim.duration;
            const t = Math.min(elapsed / dur, 1);
            const mesh = this._dieMesh;
            if (!mesh) return;
            const ra = this._rollAnim;
            const elapsedSec = elapsed / 1000;

            const computeSpinQ = (tSec) => {
                const sa = (ra.initialSpin / ra.spinDecay) * (1 - Math.exp(-ra.spinDecay * tSec));
                const pq = new THREE.Quaternion().setFromEuler(new THREE.Euler(
                    ra.spinDirX * ra.spinScaleX * sa,
                    ra.spinDirY * ra.spinScaleY * sa * 1.1,
                    ra.spinDirZ * ra.spinScaleZ * sa * 0.8
                ));
                const tsa = (ra.tumbleSpeed / ra.tumbleDecay) * (1 - Math.exp(-ra.tumbleDecay * tSec));
                const pa = tSec * ra.precessionSpeed;
                const cta = ra.tumbleAxis.clone().applyAxisAngle(ra.precessionAxis, pa);
                const tq = new THREE.Quaternion().setFromAxisAngle(cta, tsa);
                return pq.multiply(tq);
            };

            if (elapsedSec < ra.tThrowEnd) {
                const tl = elapsedSec;
                mesh.position.set(
                    clampPos(ra.vx0 * tl),
                    Math.max(0, ra.v0_throw * tl - 0.5 * ra.G * tl * tl),
                    clampPos(ra.vz0 * tl));
                mesh.quaternion.copy(computeSpinQ(elapsedSec));
            } else if (elapsedSec < ra.tB1End) {
                const tl = elapsedSec - ra.tThrowEnd;
                mesh.position.set(
                    clampPos(ra.x_at_b1 + ra.vx1 * tl),
                    Math.max(0, ra.v0_b1 * tl - 0.5 * ra.G * tl * tl),
                    clampPos(ra.z_at_b1 + ra.vz1 * tl));
                mesh.quaternion.copy(computeSpinQ(elapsedSec));
                if (!ra.bounce1Haptic) { ra.bounce1Haptic = true; haptic('light'); }
            } else if (elapsedSec < ra.tB2End) {
                const tl = elapsedSec - ra.tB1End;
                mesh.position.set(
                    clampPos(ra.x_at_b2 + ra.vx2 * tl),
                    Math.max(0, ra.v0_b2 * tl - 0.5 * ra.G * tl * tl),
                    clampPos(ra.z_at_b2 + ra.vz2 * tl));
                mesh.quaternion.copy(computeSpinQ(elapsedSec));
                if (!ra.bounce2Haptic) { ra.bounce2Haptic = true; haptic('light'); }
            } else {
                // Settle phase
                const tl = elapsedSec - ra.tB2End;
                const p = Math.min(tl / ra.settleTime, 1);
                const easeSlerpT = 1 - Math.pow(1 - Math.min(1, p * 1.5), 3);
                const posEase = 1 - Math.pow(1 - p, 3);
                const x = ra.x_at_settle * (1 - posEase);
                const z = ra.z_at_settle * (1 - posEase);
                let y = 0;
                if (p < 0.4) y = 0.08 * Math.exp(-10 * p) * Math.abs(Math.sin(p * Math.PI * 4));
                mesh.position.set(x, y, z);

                const currentQ = ra.settleStartQ.clone().slerp(ra.targetQ, easeSlerpT);
                if (p > 0.15 && p < 0.95) {
                    const wt = p - 0.15;
                    const env = Math.exp(-ra.wobbleDamp * wt);
                    currentQ.multiply(new THREE.Quaternion().setFromAxisAngle(
                        ra.wobbleAxis1, ra.wobbleAmp * env * Math.sin(ra.wobbleFreq * wt * Math.PI * 2)));
                    currentQ.multiply(new THREE.Quaternion().setFromAxisAngle(
                        ra.wobbleAxis2, ra.wobbleAmp * 0.6 * env * Math.sin(ra.wobbleFreq * 1.3 * wt * Math.PI * 2 + 0.7)));
                }
                mesh.quaternion.copy(currentQ);
            }

            // Shadow
            this._ground.material.opacity = 0.35 - 0.25 * (Math.max(0, mesh.position.y) / 2.5);

            if (t >= 1) {
                mesh.position.set(0, 0, 0);
                mesh.quaternion.copy(ra.targetQ);
                this._ground.material.opacity = 0.35;
                const onDone = ra.onDone;
                this._rollAnim = null;
                this._showingResult = true;
                if (onDone) onDone();
            }
        }

        // ─── Particle effects ───
        _spawnRing(color) {
            const c = this._particlesEl;
            if (!c) return;
            const cx = c.offsetWidth / 2, cy = c.offsetHeight / 2;
            const r = document.createElement('div');
            r.style.cssText = `position:absolute;border-radius:50%;border:2px solid ${color};pointer-events:none;opacity:0;left:${cx}px;top:${cy}px`;
            r.animate([
                { width: '0', height: '0', marginLeft: '0', marginTop: '0', opacity: 0.8, borderWidth: '3px' },
                { width: '180px', height: '180px', marginLeft: '-90px', marginTop: '-90px', opacity: 0, borderWidth: '1px' }
            ], { duration: 550, easing: 'ease-out' });
            c.appendChild(r);
            setTimeout(() => r.remove(), 550);
        }

        _spawnParticles(color, n) {
            const c = this._particlesEl;
            if (!c) return;
            const cx = c.offsetWidth / 2, cy = c.offsetHeight / 2;
            for (let i = 0; i < n; i++) {
                const p = document.createElement('div');
                const s = 2 + Math.random() * 5;
                p.style.cssText = `position:absolute;border-radius:50%;background:${color};opacity:0;width:${s}px;height:${s}px;left:${cx}px;top:${cy}px`;
                const a = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.6;
                const dist = 40 + Math.random() * 100;
                const dx = Math.cos(a) * dist, dy = Math.sin(a) * dist;
                const dur = 450 + Math.random() * 550;
                p.animate([
                    { opacity: 0.9, transform: 'translate(0,0) scale(1)' },
                    { opacity: 0, transform: `translate(${dx}px,${dy}px) scale(0)` }
                ], { duration: dur, easing: 'cubic-bezier(0,0.3,0.5,1)' });
                c.appendChild(p);
                setTimeout(() => p.remove(), dur);
            }
        }

        /**
         * Roll the die to show a specific result value.
         * @param {number} resultValue - The face value to land on
         * @param {function} onDone - Callback when animation completes
         * @returns {number} duration in ms
         */
        roll(resultValue, onDone) {
            this._showingResult = false;
            this._rollAnim = null;
            this._createMesh();
            haptic('medium');

            const targetQ = getTargetQuaternion(this._dieMesh, resultValue);
            const dieType = this._dieType;

            // Physics parameters (scaled by die type)
            const G = 40;
            const throwH = 2.2 + Math.random() * 0.6;
            const v0_throw = Math.sqrt(2 * G * throwH);
            const t_throw = 2 * v0_throw / G;

            const e1 = 0.55 + Math.random() * 0.15;
            const v0_b1 = e1 * v0_throw;
            const t_b1 = 2 * v0_b1 / G;

            const e2 = 0.50 + Math.random() * 0.15;
            const v0_b2 = e2 * v0_b1;
            const t_b2 = 2 * v0_b2 / G;

            const totalAirborne = t_throw + t_b1 + t_b2;
            const settleTime = 0.42;
            const duration = (totalAirborne + settleTime) * 1000;

            // Horizontal motion
            const vx0 = (Math.random() - 0.5) * 6.0;
            const vz0 = (Math.random() - 0.5) * 2.0;
            const hFric = 0.5 + Math.random() * 0.2;
            const x_at_b1 = clampPos(vx0 * t_throw);
            const z_at_b1 = clampPos(vz0 * t_throw);
            const vx1 = vx0 * hFric + (Math.random() - 0.5) * 0.5;
            const vz1 = vz0 * hFric + (Math.random() - 0.5) * 0.3;
            const x_at_b2 = clampPos(x_at_b1 + vx1 * t_b1);
            const z_at_b2 = clampPos(z_at_b1 + vz1 * t_b1);
            const vx2 = vx1 * hFric + (Math.random() - 0.5) * 0.3;
            const vz2 = vz1 * hFric + (Math.random() - 0.5) * 0.2;
            const x_at_settle = clampPos(x_at_b2 + vx2 * t_b2);
            const z_at_settle = clampPos(z_at_b2 + vz2 * t_b2);

            // Spin parameters (heavier dice spin slower)
            const spinMult = { d4: 0.7, d6: 0.85, d8: 0.95, d10: 1.0, d12: 1.05, d20: 1.1 }[dieType] || 1.0;
            const initialSpin = (10 + Math.random() * 4) * spinMult;
            const spinDecay = 2.0 + Math.random() * 0.5;
            const spinDirX = Math.random() > 0.5 ? 1 : -1;
            const spinDirY = Math.random() > 0.5 ? 1 : -1;
            const spinDirZ = Math.random() > 0.5 ? 1 : -1;
            const spinScaleX = 0.8 + Math.random() * 0.4;
            const spinScaleY = 0.8 + Math.random() * 0.4;
            const spinScaleZ = 0.5 + Math.random() * 0.4;

            // Tumble
            const tumbleAxis = new THREE.Vector3(
                Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5
            ).normalize();
            const tumbleSpeed = 3 + Math.random() * 4;
            const tumbleDecay = 1.5 + Math.random() * 1.0;
            const precessionSpeed = 1.5 + Math.random() * 2.0;
            const precessionAxis = new THREE.Vector3(0, 1, 0);

            // Wobble
            const wobbleAmp = 0.06 + Math.random() * 0.06;
            const wobbleFreq = 14 + Math.random() * 6;
            const wobbleDamp = 6 + Math.random() * 2;

            // Crit/fail detection
            const maxVal = { d4: 4, d6: 6, d8: 8, d10: 9, d12: 12, d20: 20 }[dieType] || 20;
            const minVal = dieType === 'd10' ? 0 : 1;
            const isCrit = resultValue === maxVal;
            const isFail = resultValue === minVal;

            this._rollAnim = {
                startTime: performance.now(), duration, targetQ, G,
                v0_throw, v0_b1, v0_b2,
                tThrowEnd: t_throw, tB1End: t_throw + t_b1, tB2End: totalAirborne, settleTime,
                vx0, vz0, vx1, vz1, vx2, vz2,
                x_at_b1, z_at_b1, x_at_b2, z_at_b2, x_at_settle, z_at_settle,
                initialSpin, spinDecay,
                spinDirX, spinDirY, spinDirZ, spinScaleX, spinScaleY, spinScaleZ,
                tumbleAxis, tumbleSpeed, tumbleDecay, precessionSpeed, precessionAxis,
                wobbleAmp, wobbleFreq, wobbleDamp,
                wobbleAxis1: new THREE.Vector3(1, 0, 0),
                wobbleAxis2: new THREE.Vector3(0, 0, 1),
                bounce1Haptic: false, bounce2Haptic: false,
                settleStartQ: null,
                onDone: () => {
                    if (isCrit || isFail) {
                        haptic('heavy');
                        this._spawnRing(isCrit ? V_SUCCESS_HEX : V_DANGER_HEX);
                        this._spawnParticles(isCrit ? V_SUCCESS_HEX : V_DANGER_HEX, 30);
                        if (this._dieMesh) {
                            const glowColor = parseInt((isCrit ? V_SUCCESS_HEX : V_DANGER_HEX).replace('#', ''), 16);
                            const glow = new THREE.PointLight(glowColor, 1.5, 4);
                            glow.position.set(0, 0.5, 1);
                            this._dieMesh.add(glow);
                            let intensity = 1.5;
                            const fadeGlow = setInterval(() => {
                                intensity -= 0.05;
                                if (intensity <= 0) { this._dieMesh.remove(glow); clearInterval(fadeGlow); }
                                else glow.intensity = intensity;
                            }, 50);
                        }
                    } else {
                        haptic('heavy');
                        this._spawnParticles(V_GOLD_HEX, 15);
                    }
                    if (onDone) onDone();
                },
            };

            // Pre-compute settleStartQ
            const ra = this._rollAnim;
            const computeSettleQ = (tSec) => {
                const sa = (ra.initialSpin / ra.spinDecay) * (1 - Math.exp(-ra.spinDecay * tSec));
                const pq = new THREE.Quaternion().setFromEuler(new THREE.Euler(
                    ra.spinDirX * ra.spinScaleX * sa,
                    ra.spinDirY * ra.spinScaleY * sa * 1.1,
                    ra.spinDirZ * ra.spinScaleZ * sa * 0.8
                ));
                const tsa = (ra.tumbleSpeed / ra.tumbleDecay) * (1 - Math.exp(-ra.tumbleDecay * tSec));
                const pa = tSec * ra.precessionSpeed;
                const cta = ra.tumbleAxis.clone().applyAxisAngle(ra.precessionAxis, pa);
                return pq.multiply(new THREE.Quaternion().setFromAxisAngle(cta, tsa));
            };
            this._rollAnim.settleStartQ = computeSettleQ(totalAirborne);

            return duration;
        }

        /** Clean up THREE.js resources */
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
