/* ═══════════════════════════════════════════════
   COMBAT-VFX — Cinematics, Banners, Floats, HP Animation
   Lendas de Valdoria Combat WebApp
   ═══════════════════════════════════════════════ */

// ─── CINEMATIC ACTION RESULT ───
// Delays state render so the player can watch dice animations unfold
function _playCinematicResult(result, actionType) {
    const isResolution = result.phase === 'victory' || result.phase === 'defeat' || result.phase === 'ended' || result.phase === 'fled';
    const hasRoll = result.lr && (result.lr.r || result.lr.d || result.lr.t === 'death_save');
    const isNonCombatAction = actionType === 'initiative' || actionType === 'proceed' || actionType === 'restore';
    const oldPhase = currentState?.ph || currentState?.phase || '';

    // No cinematic for: initiative actions, no dice roll, or not in active combat
    if (!hasRoll || isNonCombatAction || oldPhase !== 'active') {
        currentState = result;
        if (result.phase === 'ended') { showCombatEnded(); }
        else if (isResolution) { renderResolution(result); }
        else { renderArena(result); }
        return;
    }

    _cinematicInProgress = true;
    // Safety net: force-reset after 20s to prevent permanent UI freeze (slow devices may need >15s)
    const _cinematicSafetyTimer = setTimeout(() => {
        if (_cinematicInProgress) {
            console.warn('[COMBAT] Cinematic safety timeout — force reset');
            clearTimeout(_cinematicWarnTimer);
            _cinematicInProgress = false;
            startPolling();
        }
    }, 20000);

    try {
    // Phase 0: Anticipation text (350ms) — "⚔️ Kalfin avança!"
    const attackerName = currentState?.p?.n || 'Herói';
    const _antTexts = {
        'skill': `✨ ${attackerName} conjura!`, 'attack': `⚔️ ${attackerName} avança!`,
        'save': `✨ ${attackerName} conjura!`, 'auto_hit': `✨ ${attackerName} conjura!`,
        'aoe': `🔥 ${attackerName} conjura!`, 'heal': `✨ ${attackerName} cura!`,
        'util': `✨ ${attackerName} prepara!`, 'item_throw': `🎯 ${attackerName} arremessa!`,
        'death_save': `💀 ${attackerName} luta pela vida...`,
    };
    let anticipationText = _antTexts[result.lr.t] || `⚔️ ${attackerName} avança!`;
    // Append skill/item name for clarity
    const _sn = result.lr.sn;
    if (_sn) {
        const rt = result.lr.t;
        if (rt === 'item_throw') anticipationText = `🎯 ${attackerName} arremessa ${_sn}!`;
        else if (rt === 'heal') anticipationText = `✨ ${attackerName} usa ${_sn}!`;
        else if (rt === 'util') anticipationText = `✨ ${attackerName} invoca ${_sn}!`;
        else if (['skill', 'save', 'auto_hit', 'aoe'].includes(rt)) anticipationText = `✨ ${attackerName} lança ${_sn}!`;
    }
    _showAnticipation(anticipationText);

    // Phase 1: Animate dice on CURRENT DOM after anticipation (350ms delay)
    setTimeout(() => {
        initDice(result.lr);

        // Phase 2: Show floating damage after 3D overlay completes
        const _rt = result.lr.t || 'attack';
        const _isDmgType = ['attack', 'skill', 'save', 'auto_hit', 'aoe', 'item_throw'].includes(_rt);
        if (_isDmgType && !result.lr.miss && result.lr.d > 0) {
            // Overlay timing: d20(1200)+hold(800)+dmgRoll(1500)+fusion(400)+result(1200)
            const _floatDelay = ['auto_hit', 'aoe'].includes(_rt) ? 2200 : 3800;
            if (_rt === 'aoe') {
                // AOE: stagger damage floats on each enemy using cached elements
                const enemyCards = document.querySelectorAll('.entity.enemy');
                const hitCount = Math.min(result.lr.hits || enemyCards.length, enemyCards.length);
                for (let i = 0; i < hitCount; i++) {
                    const cachedCard = enemyCards[i];
                    setTimeout(() => _showDamageFloat(result.lr.d, result.lr.dt, null, !!result.lr.crit, cachedCard), _floatDelay + i * 200);
                }
            } else {
                setTimeout(() => _showDamageFloat(result.lr.d, result.lr.dt, '.entity.enemy', !!result.lr.crit), _floatDelay);
            }
        }

        // Phase 3: After full overlay animation, check for kills then render new state
        let baseDelay;
        if (_rt === 'death_save') baseDelay = 3800;
        else if (_rt === 'heal' || _rt === 'util') baseDelay = 2800;
        else if (_rt === 'auto_hit' || _rt === 'aoe') baseDelay = 3600;
        else if (_rt === 'save') baseDelay = (result.lr.saved && !result.lr.half) ? 2600 : 5200;
        else baseDelay = (result.lr.miss || result.lr.d <= 0) ? 2600 : 5200;
        const hasKill = result.lr.kill;
        const totalDelay = hasKill ? baseDelay + 1200 : baseDelay;

        // Death animation: fade+shake on killed enemy before re-render
        const isBossKill = hasKill && currentState?.e?.some(e => e.leg && e.hp > 0);
        if (hasKill) {
            setTimeout(() => {
                const enemyCards = document.querySelectorAll('.entity.enemy');
                enemyCards.forEach(card => card.classList.add('death-anim'));
                hapticBurst('kill');
                // VFX: elemental dissolution on kill
                if (window._combatVfx) {
                    enemyCards.forEach(card => window._combatVfx.kill(card, result.lr.dt || 'slashing'));
                    if (isBossKill) {
                        // Boss kill — extra VFX burst + screen shake + flash
                        window._combatVfx.flash('rgba(255,215,0,0.4)', 600);
                        setTimeout(() => {
                            enemyCards.forEach(card => window._combatVfx.kill(card, 'radiant'));
                        }, 300);
                    }
                }
                if (isBossKill) {
                    _shakeApp('heavy');
                }
            }, baseDelay);
        }

        setTimeout(() => {
            clearTimeout(_cinematicSafetyTimer);
            clearTimeout(_cinematicWarnTimer);
            _cinematicInProgress = false;
            currentState = result;
            if (result.phase === 'ended') { showCombatEnded(); }
            else if (isResolution) { renderResolution(result); }
            else { renderArena(result); }
        }, totalDelay);
    }, 350);

    } catch (e) {
        console.error('[COMBAT] Cinematic exception — force reset', e);
        clearTimeout(_cinematicSafetyTimer);
        clearTimeout(_cinematicWarnTimer);
        _cinematicInProgress = false;
        currentState = result;
        renderArena(result);
    }
}

// ─── TURN ANNOUNCEMENT BANNER ───
function _showTurnBanner(text, type) {
    document.querySelectorAll('.turn-banner').forEach(b => b.remove());
    const el = document.createElement('div');
    el.className = `turn-banner ${type || ''}`;
    el.innerHTML = `<span class="turn-banner-text">${text}</span>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('visible'));
    });
    // Haptic on turn change — distinct per turn type
    if (type === 'player') haptic('medium');
    else if (type === 'enemy') haptic('light');
    else if (type === 'ally') hapticSelect();
    setTimeout(() => {
        el.classList.remove('visible');
        setTimeout(() => el.remove(), 400);
    }, 1800);
}

function _showRoundBanner(roundNum) {
    document.querySelectorAll('.turn-banner').forEach(b => b.remove());
    const el = document.createElement('div');
    el.className = 'turn-banner round';
    el.innerHTML = `<span class="turn-banner-text">── Rodada ${roundNum} ──</span>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => { requestAnimationFrame(() => el.classList.add('visible')); });
    hapticSelect();
    setTimeout(() => {
        el.classList.remove('visible');
        setTimeout(() => el.remove(), 400);
    }, 1200);
}

// ─── COMBO STREAK COUNTER (P2-G) ───
function _showComboCounter(count) {
    let el = document.getElementById('comboCounter');
    if (!el) {
        el = document.createElement('div');
        el.id = 'comboCounter';
        el.className = 'combo-counter';
        document.body.appendChild(el);
    }
    el.textContent = `x${count}`;
    el.classList.remove('combo-pop');
    void el.offsetWidth;
    el.classList.add('combo-pop');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.remove('combo-pop'), 3000);
}

// ─── ANTICIPATION OVERLAY ───
function _showAnticipation(text) {
    const el = document.createElement('div');
    el.className = 'anticipation-overlay';
    el.innerHTML = `<span class="anticipation-text">${text}</span>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('visible'));
    });
    setTimeout(() => {
        el.classList.remove('visible');
        setTimeout(() => el.remove(), 200);
    }, 350);
}

function _dmgFlashClass(dt) {
    return _DMG_FLASH_TYPES.has(dt) ? `dmg-flash-${dt}` : 'dmg-flash';
}

// ─── FLOATING MISS INDICATOR ───
function _showMissFloat(targetSelector, cachedEl) {
    const target = cachedEl || document.querySelector(targetSelector || '.entity.enemy');
    if (!target || !document.body.contains(target)) return;
    const rect = target.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'damage-float miss';
    el.textContent = 'Esquivou!';
    el.style.left = (rect.left + rect.width / 2) + 'px';
    el.style.top = rect.top + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

// ─── FLOATING DAMAGE NUMBER ───
function _showDamageFloat(damage, damageType, targetSelector, isCrit, cachedEl) {
    const target = cachedEl || document.querySelector(targetSelector || '.entity.enemy');
    if (!target || !document.body.contains(target)) return;
    const rect = target.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'damage-float' + (isCrit ? ' crit' : '');
    el.textContent = isCrit ? `💥 -${damage}` : `-${damage}`;
    const colors = { fire: '#ff6020', cold: '#80c0ff', lightning: '#ffe040', necrotic: '#9040c0', radiant: '#ffe080', poison: '#60c040', acid: '#60d040', psychic: '#e080ff', thunder: '#a0c0ff', force: '#c0a0ff', slashing: '#ff4444', piercing: '#ff4444', bludgeoning: '#ff6644' };
    if (!isCrit) el.style.color = colors[damageType] || '#ff4444';
    el.style.left = (rect.left + rect.width / 2) + 'px';
    el.style.top = rect.top + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), isCrit ? 1500 : 1200);
}

// ─── FLOATING HEAL NUMBER ───
function _showHealFloat(amount, targetSelector, cachedEl) {
    const target = cachedEl || document.querySelector(targetSelector || '.entity.player');
    if (!target || !document.body.contains(target)) return;
    const rect = target.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'damage-float heal';
    el.textContent = `+${amount}`;
    el.style.left = (rect.left + rect.width / 2) + 'px';
    el.style.top = rect.top + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

// ─── GREEN VIEWPORT FLASH (HEAL) ───
function _showHealFlash() {
    let flash = document.getElementById('healFlash');
    if (!flash) {
        flash = document.createElement('div');
        flash.id = 'healFlash';
        flash.className = 'viewport-flash heal-flash';
        document.body.appendChild(flash);
    }
    flash.classList.remove('active');
    void flash.offsetWidth;
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 400);
}


// ─── COMBAT TOAST (lightweight feedback) ───
function showCombatToast(msg, duration) {
    const d = duration || 2500;
    const el = document.createElement('div');
    el.className = 'combat-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('visible'), 30);
    setTimeout(() => { el.classList.remove('visible'); setTimeout(() => el.remove(), 300); }, d);
}

// ─── FEATURE 1: HP BAR ANIMATED TRANSITION ───
function _animateHpBars(state) {
    const current = new Map();
    if (state.p) current.set('player', { hp: state.p.hp, mhp: state.p.mhp });
    (state.e || []).forEach((e, i) => current.set(`e${i}_${e.n}`, { hp: e.hp, mhp: e.mhp }));
    (state.a || []).forEach((a, i) => current.set(`a${i}_${a.n}`, { hp: a.hp, mhp: a.mhp }));

    current.forEach((cur, key) => {
        const prev = _prevHpState.get(key);
        if (!prev || prev.hp === cur.hp) return;

        const oldPct = prev.mhp > 0 ? (prev.hp / prev.mhp) * 100 : 0;
        const newPct = cur.mhp > 0 ? (cur.hp / cur.mhp) * 100 : 0;

        let fillEl = null;
        if (key === 'player') {
            fillEl = document.querySelector('.zone-player .bar-fill');
        } else if (key.startsWith('e')) {
            const idx = parseInt(key.charAt(1));
            const els = document.querySelectorAll('.zone-enemies .hp-mini-fill');
            if (els[idx]) fillEl = els[idx];
        } else if (key.startsWith('a')) {
            const idx = parseInt(key.charAt(1));
            const els = document.querySelectorAll('.zone-allies .hp-mini-fill');
            if (els[idx]) fillEl = els[idx];
        }
        if (!fillEl) return;

        const isDamage = newPct < oldPct;
        const isHeal = newPct > oldPct;

        // Ghost bar: show old HP draining slowly on damage
        if (isDamage) {
            const track = fillEl.parentElement;
            if (track && document.body.contains(fillEl)) {
                let ghost = track.querySelector('.bar-ghost');
                if (!ghost) {
                    ghost = document.createElement('div');
                    ghost.className = 'bar-ghost';
                    track.insertBefore(ghost, fillEl);
                }
                ghost.style.transition = 'none';
                ghost.style.width = oldPct + '%';
                requestAnimationFrame(() => {
                    ghost.style.transition = 'width 1.2s ease-in 0.3s';
                    ghost.style.width = newPct + '%';
                });
            }
        }

        // Heal shine sweep
        if (isHeal) {
            fillEl.classList.add('healing');
            setTimeout(() => fillEl.classList.remove('healing'), 700);
        }

        fillEl.style.transition = 'none';
        fillEl.style.width = oldPct + '%';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                fillEl.style.transition = 'width 0.65s ease-out';
                fillEl.style.width = newPct + '%';
            });
        });
    });

    current.forEach((v, k) => _prevHpState.set(k, v));
}

// ─── FEATURE 2: PLAYER SHAKE ON DAMAGE + VIEWPORT FLASH + FLOAT ───
function _checkPlayerDamage(state) {
    if (!state.p) return;
    const curHp = state.p.hp;
    if (_prevPlayerHp > 0 && curHp < _prevPlayerHp) {
        const dmgTaken = _prevPlayerHp - curHp;
        const playerEl = document.querySelector('.entity.player');
        if (playerEl) {
            playerEl.classList.remove('dmg-shake');
            void playerEl.offsetWidth;
            playerEl.classList.add('dmg-shake');
            setTimeout(() => playerEl.classList.remove('dmg-shake'), 500);
            // Damage-type colored flash on player
            const pFlashCls = _dmgFlashClass(_lastEnemyDmgType);
            playerEl.classList.add(pFlashCls);
            setTimeout(() => playerEl.classList.remove(pFlashCls), 400);
            haptic('heavy');
            sfxPlayerHit();

            // Floating damage on player (with correct damage type color)
            _showDamageFloat(dmgTaken, _lastEnemyDmgType, '.entity.player');
            // Impact flash at player position
            _showImpactFlash(playerEl, false);
        }

        // VFX: impact on player using tracked enemy damage type + screen flash
        if (window._combatVfx) {
            window._combatVfx.impact(playerEl, _lastEnemyDmgType || 'slashing', {});
            const dtFlash = (typeof VFX_PROFILES !== 'undefined' && VFX_PROFILES[_lastEnemyDmgType]?.flashColor) || 'rgba(255,60,30,0.3)';
            window._combatVfx.flash(dtFlash, 400);
        } else {
            _showViewportFlash();
        }
    }
    // Detect healing (HP increased)
    if (_prevPlayerHp > 0 && curHp > _prevPlayerHp) {
        const healAmt = curHp - _prevPlayerHp;
        _showHealFloat(healAmt, '.entity.player');
        _showHealFlash();
    }
    _prevPlayerHp = curHp;
}

// ─── STATUS CHANGE DETECTION — VFX on buff/debuff apply/remove ───
function _clearStatusTracking() { _prevStatusState.clear(); _prevPlayerHp = 0; _prevHpState.clear(); }
function _checkStatusChanges(state) {
    const vfx = window._combatVfx;
    if (!vfx) return;
    const entities = [];
    if (state.p) entities.push({ key: 'player', se: state.p.se || [], sel: '.entity.player' });
    (state.e || []).forEach((e, i) => entities.push({ key: `e${i}`, se: e.se || [], sel: `.entity.enemy[data-enemy-idx="${i}"]` }));
    (state.a || []).forEach((a, i) => entities.push({ key: `a${i}`, se: a.se || [], sel: `.entity.ally:nth-child(${i + 2})` }));

    for (const ent of entities) {
        const prev = _prevStatusState.get(ent.key) || [];
        const prevSet = new Set(prev);
        const curSet = new Set(ent.se);

        // New statuses added — fire buff or debuff VFX
        for (const s of ent.se) {
            if (!prevSet.has(s)) {
                const el = document.querySelector(ent.sel);
                if (el) {
                    if (STATUS_BUFFS.has(s)) vfx.buff(el);
                    else vfx.debuff(el);
                }
                break; // One VFX per entity per tick to avoid spam
            }
        }

        // Statuses removed — fire cleanse VFX for debuffs cleared from player/allies
        if (ent.key === 'player' || ent.key.startsWith('a')) {
            let cleansed = false;
            for (const s of prev) {
                if (!curSet.has(s) && !STATUS_BUFFS.has(s)) { cleansed = true; break; }
            }
            if (cleansed) {
                const el = document.querySelector(ent.sel);
                if (el) vfx.heal(el); // Green upward sparkles = cleanse
            }
        }

        _prevStatusState.set(ent.key, [...ent.se]);
    }

    // Concentration break detection
    const prevConc = _prevStatusState.get('_conc') || '';
    const curConc = state.p?.conc || '';
    if (prevConc && !curConc) {
        // Concentration was broken!
        const pEl = document.querySelector('.entity.player');
        if (pEl) vfx.debuff(pEl);
        vfx.flash('rgba(160,60,200,0.3)', 400);
        const spellName = prevConc.replace(/_/g, ' ');
        showNarration('💔 Concentração quebrada: ' + spellName + '!', 'miss');
        haptic('heavy');
    }
    _prevStatusState.set('_conc', curConc);
}

function _showViewportFlash() {
    let flash = document.getElementById('viewportFlash');
    if (!flash) {
        flash = document.createElement('div');
        flash.id = 'viewportFlash';
        flash.className = 'viewport-flash';
        document.body.appendChild(flash);
    }
    flash.classList.remove('active');
    void flash.offsetWidth;
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 400);
}
