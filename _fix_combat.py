"""Apply 6 combat.js fixes."""
import re

with open('combat/combat.js', 'r', encoding='utf-8') as f:
    content = f.read()

# FIX 1: Initiative dice race condition — block poll re-renders during animation
content = content.replace(
    'let _initDiceAnimated = false; // Dedup: prevents replaying initiative dice on poll re-render',
    'let _initDiceAnimated = false; // Dedup: prevents replaying initiative dice on poll re-render\nlet _initAnimationInProgress = false; // Blocks poll re-render during initiative animation'
)

content = content.replace(
    "// Don't update during cinematic animation\n                if (_cinematicInProgress) {",
    "// Don't update during cinematic or initiative animation\n                if (_cinematicInProgress || _initAnimationInProgress) {"
)

# Set animation flag when DiceRoller starts
old = """    // First render: animate!
    _initDiceAnimated = true;
    if (typeof DiceRoller !== 'undefined') {
        DiceRoller.rollSequence(items, {
            container: area,
            title: '\\u{1F4DC} ORDEM DE COMBATE',
            onComplete: () => {
                _appendSurpriseInfo(area, init);
                _showProceedBar();
            },
        });"""
new = """    // First render: animate!
    _initDiceAnimated = true;
    _initAnimationInProgress = true;
    if (typeof DiceRoller !== 'undefined') {
        DiceRoller.rollSequence(items, {
            container: area,
            title: '\\u{1F4DC} ORDEM DE COMBATE',
            onComplete: () => {
                _initAnimationInProgress = false;
                _appendSurpriseInfo(area, init);
                _showProceedBar();
            },
        });"""
content = content.replace(old, new)

# FIX 2: Double polling loop — renderArena already calls startPolling
old = """            if (newTc !== oldTc || newPh === 'victory' || newPh === 'defeat') {
                currentState = state;
                if (newPh === 'victory' || newPh === 'defeat' || newPh === 'ended') {
                    renderResolution(state);
                } else {
                    renderArena(state);
                }
                startPolling(); // Resume normal polling
                return;"""
new = """            if (newTc !== oldTc || newPh === 'victory' || newPh === 'defeat') {
                currentState = state;
                if (newPh === 'victory' || newPh === 'defeat' || newPh === 'ended') {
                    renderResolution(state);
                } else {
                    renderArena(state); // renderArena already calls startPolling
                }
                return;"""
content = content.replace(old, new)

# FIX 3: Reset _initDiceAnimated on phase transition out of init
old = """                _showPollUpdateIndicator();
                currentState = state;"""
new = """                _showPollUpdateIndicator();
                // Reset init animation state on phase transition
                if (oldPh === 'init' && newPh !== 'init') {
                    _initDiceAnimated = false;
                    _initAnimationInProgress = false;
                }
                currentState = state;"""
content = content.replace(old, new)

# FIX 4: Victory screen — always show minimal message when no rewards
old = """    const rewardsBlock = rewardsHtml
        ? `<div class="res-rewards">${rewardsHtml}</div>`
        : '';"""
new = """    const rewardsBlock = rewardsHtml
        ? `<div class="res-rewards">${rewardsHtml}</div>`
        : (isVictory ? '<div class="res-rewards"><div class="res-reward"><span class="res-icon">\\u2694\\uFE0F</span><span>Combate encerrado</span></div></div>' : '');"""
content = content.replace(old, new)

# FIX 5: Skip button — validate DOM is still intact before appending
old = """        // Skip button
        setTimeout(() => {
            const bar = document.getElementById('init-proceed-bar');
            if (bar && bar.style.display === 'none') {
                const skipBtn = document.createElement('button');
                skipBtn.className = 'v-skip-btn visible';
                skipBtn.textContent = 'Pular \\u{25B8}';
                skipBtn.style.cssText = 'position:relative; z-index:10; margin:8px auto;display:block;padding:6px 16px;font-size:12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#aaa;cursor:pointer; clear:both;';
                skipBtn.onclick = () => {
                    // Skip triggers immediate reveal via DiceRoller internals (safety net)
                    _showInitiativeStatic(area, items, init);
                    _showProceedBar();
                    skipBtn.remove();
                };
                area.appendChild(skipBtn);
            }
        }, 800);"""
new = """        // Skip button — validates DOM is still intact before appending
        setTimeout(() => {
            const bar = document.getElementById('init-proceed-bar');
            const currentArea = document.getElementById('init-dice-area');
            if (bar && bar.style.display === 'none' && currentArea) {
                const skipBtn = document.createElement('button');
                skipBtn.className = 'v-skip-btn visible';
                skipBtn.textContent = 'Pular \\u{25B8}';
                skipBtn.style.cssText = 'position:relative; z-index:10; margin:8px auto;display:block;padding:6px 16px;font-size:12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#aaa;cursor:pointer; clear:both;';
                skipBtn.onclick = () => {
                    _initAnimationInProgress = false;
                    _showInitiativeStatic(currentArea, items, init);
                    _showProceedBar();
                    skipBtn.remove();
                };
                currentArea.appendChild(skipBtn);
            }
        }, 800);"""
content = content.replace(old, new)

# FIX 6: Continue button animation when no rewards
old = """    if (rewardEls.length > 0) {
        rewardEls.forEach((el, i) => {
            el.classList.add('reward-hidden');
            setTimeout(() => {
                el.classList.remove('reward-hidden');
                el.classList.add('reward-reveal');
                hapticSelect();
            }, 400 + i * 500);
        });
        // Show continue button after all rewards revealed
        if (continueBtn) {
            continueBtn.classList.add('reward-hidden');
            setTimeout(() => {
                continueBtn.classList.remove('reward-hidden');
                continueBtn.classList.add('reward-reveal');
            }, 400 + rewardEls.length * 500 + 300);
        }
    }
}"""
new = """    if (rewardEls.length > 0) {
        rewardEls.forEach((el, i) => {
            el.classList.add('reward-hidden');
            setTimeout(() => {
                el.classList.remove('reward-hidden');
                el.classList.add('reward-reveal');
                hapticSelect();
            }, 400 + i * 500);
        });
        // Show continue button after all rewards revealed
        if (continueBtn) {
            continueBtn.classList.add('reward-hidden');
            setTimeout(() => {
                continueBtn.classList.remove('reward-hidden');
                continueBtn.classList.add('reward-reveal');
            }, 400 + rewardEls.length * 500 + 300);
        }
    } else if (continueBtn) {
        // No rewards — still animate the button entrance
        continueBtn.classList.add('reward-hidden');
        setTimeout(() => {
            continueBtn.classList.remove('reward-hidden');
            continueBtn.classList.add('reward-reveal');
        }, 600);
    }
}"""
content = content.replace(old, new)

with open('combat/combat.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('All 6 JS fixes applied successfully')
