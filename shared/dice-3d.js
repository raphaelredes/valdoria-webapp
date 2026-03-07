// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DICE 3D — Shared THREE.js d20 Roller Module
//  Lendas de Valdoria
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Usage:
//   const dice = new Dice3D(containerElement, { size: 200 });
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

    // ─── Number texture for d20 face labels ───
    function makeNumberTexture(num, size) {
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

    // ─── Build d20 mesh (icosahedron with floating number labels) ───
    function buildD20(scene) {
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

        // Compute face normals and centers
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
            vertexColors: true,
            shininess: 100,
            specular: new THREE.Color(0x554433),
            flatShading: true,
        });

        const mesh = new THREE.Mesh(geo, bodyMat);

        // Gold edge wireframe
        const edgeGeo = new THREE.EdgesGeometry(
            new THREE.IcosahedronGeometry(R * 1.003, 0)
        );
        mesh.add(new THREE.LineSegments(edgeGeo,
            new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.5 })
        ));

        // Floating number labels on each face
        for (let i = 0; i < 20; i++) {
            const num = i + 1;
            const tex = makeNumberTexture(num, 256);
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
                const worldRight = new THREE.Vector3(1, 0, 0);
                faceUp = worldRight.clone().addScaledVector(normal, -worldRight.dot(normal));
            }
            faceUp.normalize();

            const faceRight = new THREE.Vector3().crossVectors(faceUp, normal).normalize();
            plane.rotation.setFromRotationMatrix(
                new THREE.Matrix4().makeBasis(faceRight, faceUp, normal)
            );

            mesh.add(plane);
        }

        const numbers = [];
        for (let i = 1; i <= 20; i++) numbers.push(i);
        mesh.userData = { type: 'd20', numbers, normals: fNormals };
        mesh.castShadow = true;
        return mesh;
    }

    // ─── Orient result face toward camera ───
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
            const ambient = new THREE.AmbientLight(0xffffff, 0.5);
            this._scene.add(ambient);

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
            const groundGeo = new THREE.PlaneGeometry(10, 10);
            const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
            this._ground = new THREE.Mesh(groundGeo, groundMat);
            this._ground.rotation.x = -Math.PI / 2;
            this._ground.position.y = -1.5;
            this._ground.receiveShadow = true;
            this._scene.add(this._ground);

            // Build d20
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
            this._dieMesh = buildD20(this._scene);
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

            // Unified spin quaternion
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
                // Phase 1: Throw
                const tl = elapsedSec;
                const y = ra.v0_throw * tl - 0.5 * ra.G * tl * tl;
                const x = ra.vx0 * tl;
                const z = ra.vz0 * tl;
                mesh.position.set(clampPos(x), Math.max(0, y), clampPos(z));
                mesh.quaternion.copy(computeSpinQ(elapsedSec));

            } else if (elapsedSec < ra.tB1End) {
                // Phase 2: Bounce 1
                const tl = elapsedSec - ra.tThrowEnd;
                const y = ra.v0_b1 * tl - 0.5 * ra.G * tl * tl;
                const x = ra.x_at_b1 + ra.vx1 * tl;
                const z = ra.z_at_b1 + ra.vz1 * tl;
                mesh.position.set(clampPos(x), Math.max(0, y), clampPos(z));
                mesh.quaternion.copy(computeSpinQ(elapsedSec));
                if (!ra.bounce1Haptic) { ra.bounce1Haptic = true; haptic('light'); }

            } else if (elapsedSec < ra.tB2End) {
                // Phase 3: Bounce 2
                const tl = elapsedSec - ra.tB1End;
                const y = ra.v0_b2 * tl - 0.5 * ra.G * tl * tl;
                const x = ra.x_at_b2 + ra.vx2 * tl;
                const z = ra.z_at_b2 + ra.vz2 * tl;
                mesh.position.set(clampPos(x), Math.max(0, y), clampPos(z));
                mesh.quaternion.copy(computeSpinQ(elapsedSec));
                if (!ra.bounce2Haptic) { ra.bounce2Haptic = true; haptic('light'); }

            } else {
                // Phase 4: Settle (SLERP + wobble + micro-bounce)
                const tl = elapsedSec - ra.tB2End;
                const p = Math.min(tl / ra.settleTime, 1);
                const slerpT = Math.min(1, p * 1.5);
                const easeSlerpT = 1 - Math.pow(1 - slerpT, 3);

                const posEase = 1 - Math.pow(1 - p, 3);
                const x = ra.x_at_settle * (1 - posEase);
                const z = ra.z_at_settle * (1 - posEase);

                let y = 0;
                if (p < 0.4) {
                    y = 0.08 * Math.exp(-10 * p) * Math.abs(Math.sin(p * Math.PI * 4));
                }
                mesh.position.set(x, y, z);

                const currentQ = ra.settleStartQ.clone().slerp(ra.targetQ, easeSlerpT);

                if (p > 0.15 && p < 0.95) {
                    const wt = p - 0.15;
                    const env = Math.exp(-ra.wobbleDamp * wt);
                    const w1 = ra.wobbleAmp * env * Math.sin(ra.wobbleFreq * wt * Math.PI * 2);
                    const w2 = ra.wobbleAmp * 0.6 * env * Math.sin(ra.wobbleFreq * 1.3 * wt * Math.PI * 2 + 0.7);
                    currentQ.multiply(new THREE.Quaternion().setFromAxisAngle(ra.wobbleAxis1, w1));
                    currentQ.multiply(new THREE.Quaternion().setFromAxisAngle(ra.wobbleAxis2, w2));
                }
                mesh.quaternion.copy(currentQ);
            }

            // Shadow
            const normH = Math.max(0, mesh.position.y) / 2.5;
            this._ground.material.opacity = 0.35 - 0.25 * normH;

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
         * Roll the d20 to show a specific result value (1-20).
         * @param {number} resultValue - The face value to land on (1-20)
         * @param {function} onDone - Callback when animation completes
         */
        roll(resultValue, onDone) {
            this._showingResult = false;
            this._rollAnim = null;
            this._createMesh();

            haptic('medium');

            const targetQ = getTargetQuaternion(this._dieMesh, resultValue);

            // Physics-based roll parameters
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

            const tThrowEnd = t_throw;
            const tB1End = t_throw + t_b1;
            const tB2End = totalAirborne;

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

            // Spin
            const initialSpin = 10 + Math.random() * 4;
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
            const wobbleAxis1 = new THREE.Vector3(1, 0, 0);
            const wobbleAxis2 = new THREE.Vector3(0, 0, 1);

            const isCrit = resultValue === 20;
            const isFail = resultValue === 1;

            this._rollAnim = {
                startTime: performance.now(), duration, targetQ, G,
                v0_throw, v0_b1, v0_b2,
                tThrowEnd, tB1End, tB2End, settleTime,
                vx0, vz0, vx1, vz1, vx2, vz2,
                x_at_b1, z_at_b1, x_at_b2, z_at_b2, x_at_settle, z_at_settle,
                initialSpin, spinDecay,
                spinDirX, spinDirY, spinDirZ,
                spinScaleX, spinScaleY, spinScaleZ,
                tumbleAxis, tumbleSpeed, tumbleDecay,
                precessionSpeed, precessionAxis,
                wobbleAmp, wobbleFreq, wobbleDamp, wobbleAxis1, wobbleAxis2,
                bounce1Haptic: false, bounce2Haptic: false,
                settleStartQ: null,
                onDone: () => {
                    // Visual effects on finish
                    if (isCrit || isFail) {
                        haptic('heavy');
                        this._spawnRing(isCrit ? V_SUCCESS_HEX : V_DANGER_HEX);
                        this._spawnParticles(isCrit ? V_SUCCESS_HEX : V_DANGER_HEX, 30);

                        // Glow the die
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
                const tq = new THREE.Quaternion().setFromAxisAngle(cta, tsa);
                return pq.multiply(tq);
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
