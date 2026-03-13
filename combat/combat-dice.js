/* ═══════════════════════════════════════════════
   COMBAT-DICE — 3D Dice Animation System
   Lendas de Valdoria Combat WebApp
   Uses shared/dice-3d.js (THREE.js)
   ═══════════════════════════════════════════════ */

function _ensureDiceOverlay() {
    if (document.getElementById('dmgDice3dOverlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'dmg-dice3d-overlay';
    overlay.id = 'dmgDice3dOverlay';
    overlay.style.display = 'none';
    overlay.innerHTML = '<div class="dmg-dice3d-particles" id="dmgDice3dParticles"></div>'
        + '<div class="dmg-dice3d-canvas" id="dmgDice3dCanvas"></div>'
        + '<div class="dmg-dice3d-label" id="dmgDice3dLabel"></div>'
        + '<button class="dmg-dice3d-skip" id="dmgDice3dSkip">Pular</button>';
    document.body.appendChild(overlay);
}


// ─── BREAKDOWN DE MODIFICADORES ───
function _formatBreakdown(lr) {
    if (!lr.bk || !lr.bk.length) return '';
    var parts = lr.bk.map(function(p) { return (p.v >= 0 ? '+' : '') + p.v + ' ' + p.l; }).join(' ');
    var vs = lr.ac ? ' vs CA ' + lr.ac : '';
    return 'd20(' + (lr.r || '?') + ') ' + parts + ' = ' + (lr.total || lr.r) + vs;
}

function initDice(lr) {
    if (!lr) return;
    const rollType = lr.t || 'attack';
    // Narrative mode: skip dice animation
    if (currentState && currentState.vm === 'simple') return;

    // Dedup — don't replay the same roll on polling re-renders
    const sig = `${rollType}-${lr.r||0}-${lr.d||0}-${lr.crit||0}-${lr.miss||0}-${lr.dc||0}-${lr.adv||0}-${lr.ac||0}-${(lr.dr||[]).join(',')}`;
    if (sig === _lastAnimatedRoll) return;
    _lastAnimatedRoll = sig;

    // Dispatch to type-specific overlay animation
    if (rollType === 'save') { _initDiceSave(lr); return; }
    if (rollType === 'death_save') { _initDiceDeathSave(lr); return; }
    if (rollType === 'auto_hit' || rollType === 'aoe') { _initDiceDamageOnly(lr); return; }
    if (rollType === 'heal' || rollType === 'util') { _initDiceEffect(lr); return; }

    // Default: attack/skill/item_throw — d20 + damage in overlay
    if (!lr.r) return;
    _initDiceAttackOverlay(lr);
}

// ─── ATTACK/SKILL/ITEM_THROW: Two-phase overlay (d20 → damage) ───
function _initDiceAttackOverlay(lr) {
    const overlay = document.getElementById('dmgDice3dOverlay');
    const canvas = document.getElementById('dmgDice3dCanvas');
    const particles = document.getElementById('dmgDice3dParticles');
    const label3d = document.getElementById('dmgDice3dLabel');
    const skipBtn = document.getElementById('dmgDice3dSkip');
    if (!overlay || !canvas || typeof Dice3D === 'undefined') {
        // Fallback: no 3D available
        return;
    }

    if (_dmgDice3d) { _dmgDice3d.dispose(); _dmgDice3d = null; }
    canvas.classList.remove('multi', 'multi-3', 'multi-4', 'multi-5');
    overlay.style.display = 'flex';
    const hasAdvDis = lr.d20s && lr.d20s.length === 2;
    if (label3d) {
        label3d.textContent = hasAdvDis ? (lr.adv ? 'Vantagem' : 'Desvantagem') : 'd20';
        label3d.className = 'dmg-dice3d-label rolling';
    }
    if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
    haptic('light'); sfxDiceRoll();

    let _done = false;
    // Deferred VFX — queued during dice animation, played AFTER overlay closes
    let _pendingVfx = null;

    const finishAll = () => {
        if (_done) return;
        _done = true;
        if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
        overlay.style.display = 'none';
        canvas.classList.remove('multi', 'multi-3', 'multi-4', 'multi-5');
        if (_dmgDice3d) { _dmgDice3d.dispose(); _dmgDice3d = null; }
        // Play deferred VFX now that the overlay is gone
        if (_pendingVfx) { setTimeout(_pendingVfx, 50); _pendingVfx = null; }
    };

    // D&D 5e: Advantage/Disadvantage — roll 2d20 side by side, highlight chosen
    if (hasAdvDis) {
        try {
            canvas.classList.add('multi');
            _dmgDice3d = new Dice3D(canvas, { size: 140, dieType: 'd20', duration: 1200, particlesContainer: particles });
            const configs = lr.d20s.map(v => ({ value: Math.min(v, 20), type: 'd20' }));
            _dmgDice3d.rollMultiple(configs, () => {
                if (_done) return;
                // Show both values and highlight chosen
                const chosen = lr.r;
                const d1 = lr.d20s[0], d2 = lr.d20s[1];
                const advLabel = lr.adv ? 'Vantagem' : 'Desvantagem';
                if (label3d) {
                    const s1 = d1 === chosen ? 'font-weight:bold;color:#c4953a' : 'opacity:0.4;text-decoration:line-through';
                    const s2 = d2 === chosen ? 'font-weight:bold;color:#c4953a' : 'opacity:0.4;text-decoration:line-through';
                    label3d.innerHTML = `<span style="font-size:0.8em">${advLabel}</span><br><span style="${s1}">${d1}</span> / <span style="${s2}">${d2}</span> → <b>${chosen}</b>`;
                    label3d.className = 'dmg-dice3d-label hit';
                }
                // Hold for reading, then proceed to normal hit/miss/crit evaluation
                setTimeout(() => {
                    if (_done) return;
                    canvas.classList.remove('multi');
                    _processAttackResult(lr, label3d, overlay, canvas, particles, skipBtn, finishAll, () => { _done = true; }, (vfx) => { _pendingVfx = vfx; });
                }, 1200);
            });
        } catch (e) {
            console.warn('[COMBAT] Adv/Dis Dice3D failed, falling back:', e);
            canvas.classList.remove('multi');
            _initDiceAttackOverlaySingle(lr, overlay, canvas, particles, label3d, skipBtn, finishAll, (vfx) => { _pendingVfx = vfx; });
        }
        return;
    }

    _initDiceAttackOverlaySingle(lr, overlay, canvas, particles, label3d, skipBtn, finishAll, (vfx) => { _pendingVfx = vfx; });
}

// ─── Single d20 attack overlay (standard path) ───
function _initDiceAttackOverlaySingle(lr, overlay, canvas, particles, label3d, skipBtn, finishAll, setPendingVfx) {
    let _done = false;
    const markDone = () => { _done = true; };
    try {
        // Phase 1: Roll 3D d20 (full-screen overlay)
        _dmgDice3d = new Dice3D(canvas, { size: 220, dieType: 'd20', duration: 1200, particlesContainer: particles });
        const faceValue = Math.min(lr.r, 20);

        _dmgDice3d.roll(faceValue, () => {
            if (_done) return;
            _processAttackResult(lr, label3d, overlay, canvas, particles, skipBtn, finishAll, markDone, setPendingVfx);
        });
    } catch (e) {
        console.warn('[COMBAT] Attack overlay Dice3D failed:', e);
        overlay.style.display = 'none';
    }
}

// ─── Shared attack result processor (d20 landed → evaluate hit/miss/crit → damage) ───
function _processAttackResult(lr, label3d, overlay, canvas, particles, skipBtn, finishAll, markDone, setPendingVfx) {
    const isCrit = lr.crit || lr.r === 20;
    const isFail = lr.r === 1;
    const isMiss = lr.miss || lr.d <= 0;

    if (label3d) {
        if (isCrit) {
            var _bkLine = _formatBreakdown(lr);
            label3d.innerHTML = '<span style="font-size:1.3em">&#x1F31F;</span> CRITICO!' + (_bkLine ? '<br><span class="breakdown-line">' + _bkLine + '</span>' : ' <span style="font-size:0.7em">(' + lr.r + ' vs CA ' + lr.ac + ')</span>');
            label3d.className = 'dmg-dice3d-label crit';
            hapticBurst('crit'); sfxCrit();
            if (typeof announce === 'function') announce('Critico\! d20: ' + lr.r + ' vs CA ' + lr.ac);
            showNarration(_pick(_NARR_CRIT), 'crit');
            _hitStreak++; if (_hitStreak >= 2) _showComboCounter(_hitStreak);
        } else if (isFail) {
            label3d.innerHTML = '<span style="font-size:1.3em">&#x1F480;</span> FALHA CRITICA!';
            label3d.className = 'dmg-dice3d-label miss';
            hapticNotify('error');
            showNarration(_pick(_NARR_NAT1), 'nat1');
            _hitStreak = 0;
        } else if (isMiss) {
            const total = lr.total || lr.r;
            var _bkMiss = _formatBreakdown(lr);
            label3d.innerHTML = '&#x1F6E1;&#xFE0F; Errou!' + (_bkMiss ? '<br><span class="breakdown-line">' + _bkMiss + '</span>' : ' <span style="font-size:0.7em">(' + total + ' vs CA ' + lr.ac + ')</span>');
            label3d.className = 'dmg-dice3d-label miss';
            hapticBurst('miss'); sfxMiss();
            if (typeof announce === 'function') announce('Errou\! d20: ' + (lr.total || lr.r) + ' vs CA ' + lr.ac);
            showNarration(_pick(_NARR_MISS), 'miss');
            _hitStreak = 0;
        } else {
            const total = lr.total || lr.r;
            const hitLabel = lr.t === 'skill' ? 'Habilidade!' : 'Acertou!';
            var _bkHit = _formatBreakdown(lr);
            label3d.innerHTML = '&#x2694;&#xFE0F; ' + hitLabel + (_bkHit ? '<br><span class="breakdown-line">' + _bkHit + '</span>' : ' <span style="font-size:0.7em">(' + total + ' vs CA ' + lr.ac + ')</span>');
            label3d.className = 'dmg-dice3d-label hit';
            haptic('medium'); sfxHit();
            if (typeof announce === 'function') announce(hitLabel + ' d20: ' + (lr.total || lr.r) + ' vs CA ' + lr.ac);
            _hitStreak++; if (_hitStreak >= 2) _showComboCounter(_hitStreak);
        }
    }

    // Queue VFX to play AFTER overlay closes
    setPendingVfx(() => {
        if (isCrit) _shakeApp('heavy');
        if (isMiss) {
            const dodgeTarget = document.querySelector('.entity.enemy');
            if (dodgeTarget) { dodgeTarget.classList.add('dodge-flash'); setTimeout(() => dodgeTarget.classList.remove('dodge-flash'), 400); }
            _showMissFloat('.entity.enemy');
            if (window._combatVfx) {
                const _pEl = document.querySelector('.entity.player');
                if (_pEl && dodgeTarget) window._combatVfx.miss(_pEl, dodgeTarget, lr.dt || 'slashing');
            }
        } else if (lr.d > 0 && window._combatVfx) {
            const _pEl = document.querySelector('.entity.player');
            const _eEl = document.querySelector('.entity.enemy');
            if (_pEl && _eEl) window._combatVfx.projectile(_pEl, _eEl, lr.dt || 'slashing', { crit: !!isCrit });
        }
    });

    // Miss/no damage — hold then close
    if (isMiss || lr.d <= 0) {
        setTimeout(() => { if (skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = finishAll; } }, 500);
        setTimeout(finishAll, 2400);
        return;
    }

    // Phase 2: Damage dice
    setTimeout(() => {
        _initDamagePhase(lr, overlay, canvas, particles, label3d, skipBtn, finishAll, markDone);
    }, 800);
}

// ─── SAVE SKILL DICE: d20 save in overlay + damage 3D ───
function _initDiceSave(lr) {
    const overlay = document.getElementById('dmgDice3dOverlay');
    const canvas = document.getElementById('dmgDice3dCanvas');
    const particles = document.getElementById('dmgDice3dParticles');
    const label3d = document.getElementById('dmgDice3dLabel');
    const skipBtn = document.getElementById('dmgDice3dSkip');
    if (!overlay || !canvas || typeof Dice3D === 'undefined') return;

    if (_dmgDice3d) { _dmgDice3d.dispose(); _dmgDice3d = null; }
    canvas.classList.remove('multi', 'multi-3', 'multi-4', 'multi-5');
    overlay.style.display = 'flex';
    if (label3d) { const _dc = (lr.dc && lr.dc > 0) ? lr.dc : 12; label3d.textContent = 'Save vs CD ' + _dc; label3d.className = 'dmg-dice3d-label rolling'; }
    if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
    haptic('light'); sfxDiceRoll();

    let _done = false;
    let _pendingVfx = null;

    const finishAll = () => {
        if (_done) return;
        _done = true;
        if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
        overlay.style.display = 'none';
        canvas.classList.remove('multi', 'multi-3', 'multi-4', 'multi-5');
        if (_dmgDice3d) { _dmgDice3d.dispose(); _dmgDice3d = null; }
        if (_pendingVfx) { setTimeout(_pendingVfx, 50); _pendingVfx = null; }
    };

    try {
        _dmgDice3d = new Dice3D(canvas, { size: 220, dieType: 'd20', duration: 1200, particlesContainer: particles });
        const faceValue = Math.min(lr.r, 20);

        _dmgDice3d.roll(faceValue, () => {
            if (_done) return;
            if (label3d) {
                if (lr.saved && !lr.half) {
                    label3d.innerHTML = '&#x1F6E1;&#xFE0F; Resistiu! <span style="font-size:0.7em">(' + lr.r + ' vs CD ' + lr.dc + ')</span>';
                    label3d.className = 'dmg-dice3d-label miss';
                    hapticBurst('miss'); sfxMiss();
                } else if (lr.saved && lr.half) {
                    label3d.innerHTML = '&#x26A0;&#xFE0F; Parcial <span style="font-size:0.7em">(' + lr.r + ' vs CD ' + lr.dc + ')</span>';
                    label3d.className = 'dmg-dice3d-label miss';
                    haptic('medium');
                } else {
                    label3d.innerHTML = '&#x274C; Falhou! <span style="font-size:0.7em">(' + lr.r + ' vs CD ' + lr.dc + ')</span>';
                    label3d.className = 'dmg-dice3d-label hit';
                    haptic('medium'); sfxHit();
                }
            }

            // Queue VFX to play AFTER overlay closes
            _pendingVfx = () => {
                if (lr.saved && !lr.half) {
                    if (window._combatVfx) {
                        const _pEl = document.querySelector('.entity.player');
                        const _eEl = document.querySelector('.entity.enemy');
                        if (_pEl && _eEl) window._combatVfx.miss(_pEl, _eEl, lr.dt || 'fire');
                    }
                } else if (lr.d > 0 && window._combatVfx) {
                    const _pEl = document.querySelector('.entity.player');
                    const _eEl = document.querySelector('.entity.enemy');
                    if (_pEl && _eEl) window._combatVfx.projectile(_pEl, _eEl, lr.dt || 'fire', { crit: false });
                }
            };

            // Full resist, no damage — hold then close
            if (lr.saved && !lr.half) {
                setTimeout(() => { if (!_done && skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = finishAll; } }, 500);
                setTimeout(finishAll, 1200);
                return;
            }

            // Has damage — show damage phase
            if (lr.d > 0 && lr.df) {
                setTimeout(() => {
                    if (_done) return;
                    _initDamagePhase(lr, overlay, canvas, particles, label3d, skipBtn, finishAll, () => { _done = true; });
                }, 800);
            } else {
                setTimeout(() => { if (!_done && skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = finishAll; } }, 500);
                setTimeout(finishAll, 1200);
            }
        });
    } catch (e) {
        console.warn('[COMBAT] Save overlay Dice3D failed:', e);
        overlay.style.display = 'none';
    }
}

// ─── DAMAGE-ONLY DICE: auto_hit / aoe — skip d20, direct damage overlay ───
function _initDiceDamageOnly(lr) {
    if (lr.d > 0 && lr.df) {
        const overlay = document.getElementById('dmgDice3dOverlay');
        const canvas = document.getElementById('dmgDice3dCanvas');
        const particles = document.getElementById('dmgDice3dParticles');
        const label3d = document.getElementById('dmgDice3dLabel');
        const skipBtn = document.getElementById('dmgDice3dSkip');
        if (!overlay || !canvas || typeof Dice3D === 'undefined') return;

        if (_dmgDice3d) { _dmgDice3d.dispose(); _dmgDice3d = null; }
        canvas.classList.remove('multi', 'multi-3', 'multi-4', 'multi-5');
        overlay.style.display = 'flex';

        let infoText;
        if (lr.t === 'aoe' && lr.hits) {
            const killsText = lr.kills > 0 ? ` · ${lr.kills} abatido${lr.kills > 1 ? 's' : ''}` : '';
            infoText = `${lr.sn || 'AOE'} — ${lr.hits} alvo${lr.hits > 1 ? 's' : ''}${killsText}`;
        } else {
            infoText = lr.sn || 'Acerto automático!';
        }
        if (label3d) { label3d.textContent = infoText; label3d.className = 'dmg-dice3d-label rolling'; }
        if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
        haptic('medium');

        let _done = false;
        const finishAll = () => {
            if (_done) return;
            _done = true;
            if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
            overlay.style.display = 'none';
            canvas.classList.remove('multi', 'multi-3', 'multi-4', 'multi-5');
            if (_dmgDice3d) { _dmgDice3d.dispose(); _dmgDice3d = null; }
            // VFX: projectile for auto_hit/aoe — after overlay closes
            if (window._combatVfx) {
                setTimeout(() => {
                    const _pEl = document.querySelector('.entity.player');
                    const _eEl = document.querySelector('.entity.enemy');
                    if (_pEl && _eEl) window._combatVfx.projectile(_pEl, _eEl, lr.dt || 'force', { crit: false });
                }, 50);
            }
        };

        // Small delay then start damage dice
        setTimeout(() => {
            if (_done) return;
            _initDamagePhase(lr, overlay, canvas, particles, label3d, skipBtn, finishAll, () => { _done = true; });
        }, 300);
    }
}

// ─── SHARED: Damage dice phase (used by attack, save, auto_hit, aoe) ───
function _initDamagePhase(lr, overlay, canvas, particles, label3d, skipBtn, finishCallback, markDone) {
    const DMG_ROLL_MS = 1500;
    const DMG_FUSION_HOLD = 400;
    const DMG_RESULT_HOLD = 1200;

    if (_dmgDice3d) { _dmgDice3d.dispose(); _dmgDice3d = null; }

    const parsed = _parseDiceFormula(lr.df);
    const dieType = parsed.type;
    const dieCount = parsed.count;

    let individualResults;
    if (lr.dr && lr.dr.length >= dieCount) individualResults = lr.dr.slice(0, dieCount);
    else individualResults = _distributeTotal(Math.max(1, lr.d - parsed.modifier), dieCount, parsed.sides);

    canvas.classList.remove('multi', 'multi-3', 'multi-4', 'multi-5');
    if (dieCount >= 5) canvas.classList.add('multi', 'multi-5');
    else if (dieCount >= 4) canvas.classList.add('multi', 'multi-4');
    else if (dieCount >= 3) canvas.classList.add('multi', 'multi-3');
    else if (dieCount >= 2) canvas.classList.add('multi');

    if (label3d) { label3d.textContent = lr.df || 'dano'; label3d.className = 'dmg-dice3d-label rolling'; }

    let _phaseDone = false;
    const finishPhase = () => {
        if (_phaseDone) return;
        _phaseDone = true;
        markDone();
        if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
        overlay.style.display = 'none';
        canvas.classList.remove('multi', 'multi-3', 'multi-4', 'multi-5');
        if (_dmgDice3d) { _dmgDice3d.dispose(); _dmgDice3d = null; }

        // Impact effects
        haptic('heavy');
        const app = document.getElementById('app');
        if (app) { app.classList.add('hit-stop'); setTimeout(() => app.classList.remove('hit-stop'), 120); }
        if (typeof sfxDamageType === 'function') sfxDamageType(lr.dt || 'slashing');
        const enemies = document.querySelectorAll('.entity.enemy');
        const isAoe = lr.t === 'aoe';
        const hitCount = isAoe ? Math.min(lr.hits || enemies.length, enemies.length) : 1;
        // Apply dmg-flash + VFX impact to all hit targets (AOE) or first enemy (single)
        for (let i = 0; i < hitCount && i < enemies.length; i++) {
            const delay = isAoe ? i * 100 : 0;
            setTimeout(() => {
                const flashCls = _dmgFlashClass(lr.dt);
                enemies[i].classList.add(flashCls);
                setTimeout(() => enemies[i].classList.remove(flashCls), 400);
                // Flash the HP bar red on damage
                const hpBar = enemies[i].querySelector('.hp-mini');
                if (hpBar) { hpBar.classList.add('dmg-taken'); setTimeout(() => hpBar.classList.remove('dmg-taken'), 500); }
                if (window._combatVfx) {
                    window._combatVfx.impact(enemies[i], lr.dt || 'slashing', { crit: !!lr.crit });
                }
            }, delay);
        }
        if (!window._combatVfx) {
            spawnParticles(lr.crit, lr.dt || 'slashing');
        }
        if (lr.kill) {
            const killName = (currentState?.e && currentState.e[0]?.n) || 'O inimigo';
            showNarration(_pick(_NARR_KILL).replace('{name}', killName), 'crit');
            if (typeof announce === 'function') announce(killName + ' foi abatido\!');
        }
    };

    try {
        const canvasW = dieCount >= 5 ? 370 : dieCount >= 4 ? 340 : dieCount >= 3 ? 300 : dieCount >= 2 ? 260 : 180;
        const canvasH = dieCount >= 5 ? 240 : dieCount >= 4 ? 230 : dieCount >= 3 ? 220 : dieCount >= 2 ? 200 : 180;
        const canvasSize = Math.max(canvasW, canvasH);
        _dmgDice3d = new Dice3D(canvas, {
            size: canvasSize, dieType: dieType, duration: DMG_ROLL_MS,
            particlesContainer: particles
        });

        if (dieCount >= 2) {
            const configs = individualResults.map(v => ({ value: v }));
            _dmgDice3d.rollMultiple(configs, () => {
                if (_phaseDone) return;
                if (label3d) {
                    const modText = parsed.modifier ? ` + ${parsed.modifier}` : '';
                    label3d.textContent = individualResults.join(' + ') + modText;
                    label3d.className = 'dmg-dice3d-label hit';
                }
                setTimeout(() => {
                    if (_phaseDone) return;
                    if (label3d) { label3d.textContent = ''; label3d.className = 'dmg-dice3d-label rolling'; }
                    _dmgDice3d.fusionTo(lr.d, () => {
                        if (label3d) {
                            label3d.textContent = lr.d + ' dano';
                            label3d.className = 'dmg-dice3d-label ' + (lr.crit ? 'crit' : 'hit');
                        }
                        setTimeout(() => { if (!_phaseDone && skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = finishPhase; } }, 500);
                        setTimeout(finishPhase, DMG_RESULT_HOLD);
                    });
                }, DMG_FUSION_HOLD);
            });
        } else {
            const dieMax = { d4:4, d6:6, d8:8, d10:10, d12:12, d20:20 }[dieType] || 6;
            const faceValue = Math.min(lr.d, dieMax) || (Math.floor(Math.random() * dieMax) + 1);
            _dmgDice3d.roll(faceValue, () => {
                if (label3d) {
                    label3d.textContent = lr.d + ' dano';
                    label3d.className = 'dmg-dice3d-label ' + (lr.crit ? 'crit' : 'hit');
                }
                setTimeout(() => { if (!_phaseDone && skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = finishPhase; } }, 500);
                setTimeout(finishPhase, DMG_RESULT_HOLD);
            });
        }
    } catch (e) {
        console.warn('[COMBAT] Damage phase Dice3D failed:', e);
        overlay.style.display = 'none';
        canvas.classList.remove('multi', 'multi-3', 'multi-4', 'multi-5');
    }
}

// (dead code _showDiceStatic removed)


// ─── DEATH SAVE DICE: Dramatic d20 in 3D overlay ───
function _initDiceDeathSave(lr) {
    const overlay = document.getElementById('dmgDice3dOverlay');
    const canvas = document.getElementById('dmgDice3dCanvas');
    const particles = document.getElementById('dmgDice3dParticles');
    const label3d = document.getElementById('dmgDice3dLabel');
    const skipBtn = document.getElementById('dmgDice3dSkip');
    if (!overlay || !canvas || typeof Dice3D === 'undefined') return;

    if (_dmgDice3d) { _dmgDice3d.dispose(); _dmgDice3d = null; }
    canvas.classList.remove('multi', 'multi-3', 'multi-4', 'multi-5');
    overlay.style.display = 'flex';
    if (label3d) { label3d.textContent = '💀 Teste contra a Morte'; label3d.className = 'dmg-dice3d-label rolling death-save-roll'; }
    if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
    haptic('medium'); sfxDiceRoll();
    // Add pulse vignette during roll
    overlay.classList.add('death-save-overlay');

    let _dsDone = false;
    let _pendingDsVfx = null;

    const finishDs = () => {
        if (_dsDone) return;
        _dsDone = true;
        if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
        overlay.style.display = 'none';
        overlay.classList.remove('death-save-overlay');
        if (_dmgDice3d) { _dmgDice3d.dispose(); _dmgDice3d = null; }
        if (_pendingDsVfx) { setTimeout(_pendingDsVfx, 50); _pendingDsVfx = null; }
    };

    try {
        _dmgDice3d = new Dice3D(canvas, { size: 220, dieType: 'd20', duration: 1800, particlesContainer: particles });
        const faceValue = Math.min(lr.r, 20);
        _dmgDice3d.roll(faceValue, () => {
            if (label3d) {
                const isCrit = lr.crit;
                const isCritFail = lr.crit_fail;
                const isSuccess = lr.success;
                if (isCrit) {
                    label3d.textContent = '🌟 NAT 20! Acordou!';
                    label3d.className = 'dmg-dice3d-label crit';
                    hapticBurst('crit'); sfxCrit();
                } else if (isCritFail) {
                    label3d.textContent = '💀 NAT 1! Falha Dupla!';
                    label3d.className = 'dmg-dice3d-label miss';
                    hapticNotify('error');
                } else if (isSuccess) {
                    label3d.textContent = `✅ ${lr.r} — Sucesso!`;
                    label3d.className = 'dmg-dice3d-label hit';
                    haptic('medium');
                } else {
                    label3d.textContent = `❌ ${lr.r} — Falha!`;
                    label3d.className = 'dmg-dice3d-label miss';
                    haptic('light');
                }
                // Queue VFX to play AFTER overlay closes
                _pendingDsVfx = () => {
                    if (isCrit) {
                        if (window._combatVfx) {
                            const pEl = document.querySelector('.entity.player');
                            if (pEl) window._combatVfx.buff(pEl);
                            window._combatVfx.flash('rgba(255,215,0,0.4)', 500);
                        }
                        _shakeApp('heavy');
                    } else if (isCritFail) {
                        if (window._combatVfx) window._combatVfx.flash('rgba(200,30,30,0.4)', 500);
                        _shakeApp('light');
                    } else if (!isSuccess) {
                        if (window._combatVfx) window._combatVfx.flash('rgba(200,30,30,0.25)', 350);
                    }
                };
            }
            setTimeout(() => { if (!_dsDone && skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = finishDs; } }, 300);
            setTimeout(finishDs, 2200);
        });
    } catch (e) {
        console.warn('[COMBAT] Death save Dice3D failed:', e);
        overlay.style.display = 'none';
        finishDs();
    }
}

// ─── EFFECT DICE: heal / util — 3D overlay with themed label ───
function _initDiceEffect(lr) {
    const isHeal = lr.t === 'heal';

    if (lr.d > 0 && lr.df) {
        // Show 3D dice in overlay
        const overlay = document.getElementById('dmgDice3dOverlay');
        const canvas = document.getElementById('dmgDice3dCanvas');
        const particles = document.getElementById('dmgDice3dParticles');
        const label3d = document.getElementById('dmgDice3dLabel');
        const skipBtn = document.getElementById('dmgDice3dSkip');
        if (!overlay || !canvas || typeof Dice3D === 'undefined') return;

        if (_dmgDice3d) { _dmgDice3d.dispose(); _dmgDice3d = null; }

        const parsed = _parseDiceFormula(lr.df);
        canvas.classList.remove('multi', 'multi-3', 'multi-4', 'multi-5');
        if (parsed.count >= 5) canvas.classList.add('multi', 'multi-5');
        else if (parsed.count >= 4) canvas.classList.add('multi', 'multi-4');
        else if (parsed.count >= 3) canvas.classList.add('multi', 'multi-3');
        else if (parsed.count >= 2) canvas.classList.add('multi');
        else canvas.classList.remove('multi', 'multi-3', 'multi-4', 'multi-5');

        overlay.style.display = 'flex';
        if (label3d) { label3d.textContent = lr.df || 'efeito'; label3d.className = 'dmg-dice3d-label rolling'; }
        if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
        haptic('light'); sfxDiceRoll();

        let _efDone = false;
        const finishEf = () => {
            if (_efDone) return;
            _efDone = true;
            if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
            overlay.style.display = 'none';
            canvas.classList.remove('multi', 'multi-3', 'multi-4', 'multi-5');
            if (_dmgDice3d) { _dmgDice3d.dispose(); _dmgDice3d = null; }
            // VFX: heal particles + narration OR buff particles + narration
            if (isHeal) {
                const _pEl = document.querySelector('.entity.player');
                if (window._combatVfx && _pEl) window._combatVfx.heal(_pEl);
                showNarration(_pick(_NARR_HEAL), 'heal');
                if (lr.d > 0) _showHealFloat(lr.d, '.entity.player');
                _showHealFlash();
                // Glow the HP bar green on heal
                const hpTrack = _pEl ? _pEl.querySelector('.bar-track') : null;
                if (hpTrack) { hpTrack.classList.add('heal-glow'); setTimeout(() => hpTrack.classList.remove('heal-glow'), 600); }
            } else {
                // Util / self-buff — golden buff VFX + narration
                const _pEl = document.querySelector('.entity.player');
                if (window._combatVfx && _pEl) window._combatVfx.buff(_pEl);
                showNarration(_pick(_NARR_BUFF).replace('{name}', lr.sn || 'efeito'), '');
                haptic('medium');
            }
        };

        try {
            const canvasSize = parsed.count >= 2 ? 200 : 180;
            _dmgDice3d = new Dice3D(canvas, {
                size: canvasSize, dieType: parsed.type, duration: 1500,
                particlesContainer: particles
            });

            let individualResults;
            if (lr.dr && lr.dr.length >= parsed.count) individualResults = lr.dr.slice(0, parsed.count);
            else individualResults = _distributeTotal(Math.max(1, lr.d - parsed.modifier), parsed.count, parsed.sides);

            if (parsed.count >= 2) {
                const configs = individualResults.map(v => ({ value: v }));
                _dmgDice3d.rollMultiple(configs, () => {
                    if (label3d) {
                        const modText = parsed.modifier ? ` + ${parsed.modifier}` : '';
                        label3d.textContent = individualResults.join(' + ') + modText;
                        label3d.className = 'dmg-dice3d-label hit';
                    }
                    setTimeout(() => {
                        if (_efDone) return;
                        if (label3d) { label3d.textContent = ''; label3d.className = 'dmg-dice3d-label rolling'; }
                        _dmgDice3d.fusionTo(lr.d, () => {
                            if (label3d) {
                                label3d.textContent = isHeal ? `+${lr.d} cura` : `${lr.d} efeito`;
                                label3d.className = 'dmg-dice3d-label hit';
                            }
                            setTimeout(() => { if (!_efDone && skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = finishEf; } }, 500);
                            setTimeout(finishEf, 1200);
                        });
                    }, 400);
                });
            } else {
                const dieMax = { d4:4, d6:6, d8:8, d10:10, d12:12, d20:20 }[parsed.type] || 6;
                const fv = Math.min(lr.d, dieMax) || (Math.floor(Math.random() * dieMax) + 1);
                _dmgDice3d.roll(fv, () => {
                    if (label3d) {
                        label3d.textContent = isHeal ? `+${lr.d} cura` : `${lr.d} efeito`;
                        label3d.className = 'dmg-dice3d-label hit';
                    }
                    setTimeout(() => { if (!_efDone && skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = finishEf; } }, 500);
                    setTimeout(finishEf, 1200);
                });
            }
        } catch (e) {
            console.warn('[COMBAT] Effect Dice3D failed:', e);
            overlay.style.display = 'none'; canvas.classList.remove('multi', 'multi-3', 'multi-4', 'multi-5');
        }
    }
}

// Parse dice formula into structured data
// "2d6+3" → { count:2, type:'d6', sides:6, modifier:3 }
// "1d8"   → { count:1, type:'d8', sides:8, modifier:0 }
function _parseDiceFormula(formula) {
    if (!formula) return { count: 1, type: 'd6', sides: 6, modifier: 0 };
    const m = formula.match(/(\d*)d(\d+)/i);
    if (!m) return { count: 1, type: 'd6', sides: 6, modifier: 0 };
    const count = parseInt(m[1]) || 1;
    const sides = parseInt(m[2]);
    const valid = [4, 6, 8, 10, 12, 20];
    const type = valid.includes(sides) ? `d${sides}` : 'd6';
    const actualSides = valid.includes(sides) ? sides : 6;
    const rest = formula.slice(m.index + m[0].length);
    const modMatch = rest.match(/([+-]\d+)/);
    const modifier = modMatch ? parseInt(modMatch[1]) : 0;
    return { count: Math.min(count, 5), type, sides: actualSides, modifier };
}

// Legacy compat wrapper
function _parseDieType(formula) {
    return _parseDiceFormula(formula).type;
}

// Distribute a total across N dice when backend doesn't send individual rolls
function _distributeTotal(diceTotal, count, sides) {
    const results = [];
    let remaining = Math.max(count, Math.min(diceTotal, count * sides));
    for (let i = 0; i < count - 1; i++) {
        const minNeeded = count - i - 1;
        const maxAllowed = remaining - minNeeded;
        const value = Math.min(sides, Math.max(1,
            Math.floor(Math.random() * Math.min(sides, maxAllowed)) + 1));
        results.push(value);
        remaining -= value;
    }
    results.push(Math.min(sides, Math.max(1, remaining)));
    return results;
}
