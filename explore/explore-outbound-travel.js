/**
 * explore-outbound-travel.js -- Viagem de ida para Desafio Diario.
 * Reutiliza overlay de return journey e pools de hazards/narrations.
 */

var _outboundJourney = null;
var _outboundActive = false;

var _OUTBOUND_BIOME_LABELS = {
    forest:'Floresta', plains:'Planície', cave:'Caverna',
    swamp:'Pântano', mountain:'Montanha', desert:'Deserto',
    snow:'Neve', graveyard:'Cemitério', volcanic:'Vulcânico'
};

var OUTBOUND_SAFE_NARRATIONS = {
    cave:[
        'O caminho desce por túneis escuros. Gotas de água ecoam ao redor.',
        'Estalactites brilham à luz da tocha. O ar é frio e úmido.',
        'Cristais incrustados nas paredes refletem sua luz. O caminho segue firme.'
    ],
    graveyard:[
        'Lápides enfileiradas marcam o caminho. A névoa se arrasta ao redor.',
        'Corvos observam sua passagem em silêncio. O ar é denso e frio.',
        'Estátuas de anjos esquecidos apontam a direção. Você segue em frente.'
    ],
    forest:[
        'A trilha serpenteia entre carvalhos ancestrais. Pássaros cantam ao longe.',
        'Raios de sol filtram pelas copas. O chão é macio de folhas caídas.',
        'Um riacho cruza o caminho. A água cristalina reflete o céu.'
    ],
    swamp:[
        'O chão é mole e traiçoeiro. Bolhas sobem da lama ao redor.',
        'Sapos coaxam nas poças escuras. O ar cheira a vegetação apodrecida.',
        'Árvores retorcidas formam arcos sobre a trilha. Luzes estranhas piscam ao longe.'
    ],
    mountain:[
        'O ar fica rarefeito a cada passo. Picos nevados brilham ao longe.',
        'Pedras soltas rolam encosta abaixo. O vento uiva entre os desfiladeiros.',
        'A trilha se estreita entre rochedos. Águias circulam no céu acima.'
    ],
    _default:[
        'A estrada se estende à frente. O caminho é tranquilo por ora.',
        'Seus passos ecoam no silêncio. A paisagem muda lentamente.',
        'Uma brisa suave sopra. Nada perturba esta etapa da viagem.'
    ]
};

var OUTBOUND_HAZARDS = {
    cave:[
        {title:'Desmoronamento', narr:'Pedras começam a cair do teto!',
         choices:[
            {i:'🏃', t:'Esquivar', k:{s:'dx',dc:13}, sNarr:'Você rola para o lado a tempo!', fNarr:'Pedras atingem você de raspão.', fDmg:4},
            {i:'🛡', t:'Proteger', k:{s:'cn',dc:12}, sNarr:'Você suporta o impacto com bravura.', fNarr:'O peso das pedras é demais.', fDmg:3}
         ]},
        {title:'Fissura Profunda', narr:'Uma fenda escura corta o caminho.',
         choices:[
            {i:'🧗', t:'Saltar', k:{s:'dx',dc:12}, sNarr:'Um salto perfeito sobre a fissura!', fNarr:'Você escorrega na borda.', fDmg:3},
            {i:'🔍', t:'Contornar', k:{s:'ws',dc:11}, sNarr:'Você encontra uma passagem lateral.', fNarr:'O desvio custou tempo e energia.', fDmg:2}
         ]}
    ],
    graveyard:[
        {title:'Espíritos Inquietos', narr:'Vultos translúcidos cercam você.',
         choices:[
            {i:'🧠', t:'Resistir', k:{s:'ws',dc:13}, sNarr:'Sua vontade afasta os espíritos.', fNarr:'O medo paralisa você por instantes.', fDmg:3},
            {i:'🏃', t:'Correr', k:{s:'dx',dc:12}, sNarr:'Você escapa antes que se aproximem!', fNarr:'Um toque gelado drena sua energia.', fDmg:4}
         ]},
        {title:'Solo Cedendo', narr:'O chão afunda sob seus pés entre as covas.',
         choices:[
            {i:'💪', t:'Escalar', k:{s:'st',dc:12}, sNarr:'Você se ergue com força bruta.', fNarr:'A terra úmida dificulta a escalada.', fDmg:3},
            {i:'🧗', t:'Rolar', k:{s:'dx',dc:11}, sNarr:'Você rola para terreno firme.', fNarr:'Pedras e ossos arranham você.', fDmg:2}
         ]}
    ],
    forest:[
        {title:'Armadilha de Caçadores', narr:'Um laço escondido nas folhas!',
         choices:[
            {i:'🔍', t:'Desarmar', k:{s:'dx',dc:12}, sNarr:'Suas mãos hábeis desarmam o laço.', fNarr:'O laço se fecha no seu tornozelo.', fDmg:3},
            {i:'💪', t:'Romper', k:{s:'st',dc:13}, sNarr:'Você arrebenta a corda com força!', fNarr:'A corda corta sua pele.', fDmg:4}
         ]},
        {title:'Ponte Podre', narr:'A ponte de madeira range perigosamente.',
         choices:[
            {i:'🧗', t:'Atravessar Devagar', k:{s:'dx',dc:11}, sNarr:'Cada passo calculado leva você ao outro lado.', fNarr:'Uma tábua cede sob seus pés!', fDmg:3},
            {i:'🔍', t:'Encontrar Vau', k:{s:'ws',dc:12}, sNarr:'Você encontra uma passagem pelo riacho.', fNarr:'A correnteza é mais forte do que parece.', fDmg:2}
         ]}
    ],
    swamp:[
        {title:'Areia Movediça', narr:'Seus pés afundam na lama traiçoeira!',
         choices:[
            {i:'💪', t:'Forçar Saída', k:{s:'st',dc:13}, sNarr:'Com esforço brutal, você se liberta!', fNarr:'Você afunda mais antes de escapar.', fDmg:4},
            {i:'🧠', t:'Manter Calma', k:{s:'ws',dc:12}, sNarr:'Movimentos lentos permitem sair.', fNarr:'O pânico consome sua energia.', fDmg:3}
         ]},
        {title:'Gás Pantanoso', narr:'Uma nuvem verde sobe das poças.',
         choices:[
            {i:'🛡', t:'Prender Respiração', k:{s:'cn',dc:13}, sNarr:'Você segura a respiração a tempo.', fNarr:'O gás queima seus pulmões.', fDmg:4},
            {i:'🏃', t:'Correr', k:{s:'dx',dc:11}, sNarr:'Você escapa da nuvem tóxica!', fNarr:'Você inala parte do gás.', fDmg:3}
         ]}
    ],
    mountain:[
        {title:'Avalanche', narr:'Neve e pedras descem a encosta!',
         choices:[
            {i:'🏃', t:'Correr', k:{s:'dx',dc:13}, sNarr:'Você desvia da avalanche a tempo!', fNarr:'A força da neve o derruba.', fDmg:5},
            {i:'🛡', t:'Abrigar', k:{s:'cn',dc:12}, sNarr:'Você se protege atrás de uma rocha.', fNarr:'O impacto é forte demais.', fDmg:4}
         ]},
        {title:'Desfiladeiro Estreito', narr:'O caminho se reduz a uma fenda na rocha.',
         choices:[
            {i:'🧗', t:'Escalar', k:{s:'st',dc:12}, sNarr:'Você se espreme com sucesso.', fNarr:'A rocha arranha suas costas.', fDmg:3},
            {i:'🔍', t:'Explorar Rota', k:{s:'in',dc:12}, sNarr:'Você encontra um atalho seguro.', fNarr:'O desvio custa tempo e energia.', fDmg:2}
         ]}
    ],
    _default:[
        {title:'Obstáculo no Caminho', narr:'Um trecho perigoso bloqueia a passagem.',
         choices:[
            {i:'💪', t:'Forçar', k:{s:'st',dc:12}, sNarr:'Você supera o obstáculo com força.', fNarr:'O esforço cobra seu preço.', fDmg:3},
            {i:'🧗', t:'Contornar', k:{s:'dx',dc:11}, sNarr:'Você encontra uma passagem alternativa.', fNarr:'O desvio custou energia.', fDmg:2}
         ]}
    ]
};

var _OB_STAT_NAMES = {st:'FOR', dx:'DES', cn:'CON', 'in':'INT', ws:'SAB', ch:'CAR'};

function _obPickUnused(pool, used) {
    var avail = pool.filter(function(_,i){ return !used.has(i); });
    if (avail.length === 0) { used.clear(); avail = pool; }
    var idx = Math.floor(Math.random() * avail.length);
    var origIdx = pool.indexOf(avail[idx]);
    used.add(origIdx);
    return avail[idx];
}

function _obGetNarration() {
    var j = _outboundJourney;
    var pool = OUTBOUND_SAFE_NARRATIONS[j.biome] || OUTBOUND_SAFE_NARRATIONS._default;
    return _obPickUnused(pool, j.usedNarrations);
}

function _obGetHazard() {
    var j = _outboundJourney;
    var pool = OUTBOUND_HAZARDS[j.biome] || OUTBOUND_HAZARDS._default;
    return _obPickUnused(pool, j.usedHazards);
}

function startOutboundTravel(config) {
    if (!config) { console.error('[OUTBOUND] No config'); return; }
    _outboundJourney = {
        totalSteps: config.total_steps || 3,
        currentStep: 0,
        riskChance: config.risk_chance || 35,
        biome: config.biome || 'forest',
        dungeonName: config.dungeon_name || 'Masmorra',
        dungeonId: config.dungeon_id || '',
        departureNarration: config.departure_narration || '',
        arrivalNarration: config.arrival_narration || '',
        usedNarrations: new Set(),
        usedHazards: new Set(),
    };
    _outboundActive = true;
    var hide = ['iso-map','bottom-panel','hud','immersive-toggle'];
    hide.forEach(function(id){ var e = document.getElementById(id); if (e) e.style.display = 'none'; });
    console.info('[OUTBOUND] Starting:', config.dungeon_name, config.biome);
    _showDepartureScreen();
}

function _showDepartureScreen() {
    var j = _outboundJourney;
    var overlay = document.getElementById('return-journey-overlay');
    if (!overlay) { console.error('[OUTBOUND] No journey overlay'); return; }
    var titleEl = document.getElementById('return-journey-title');
    var subtitleEl = document.getElementById('return-journey-subtitle');
    var iconEl = document.getElementById('return-journey-icon');
    var hpEl = document.getElementById('return-journey-hp');
    var progressEl = document.getElementById('return-journey-progress');
    var narrEl = document.getElementById('return-journey-narration');
    var diceEl = document.getElementById('return-journey-dice');
    var checkEl = document.getElementById('return-journey-check');
    var actionsEl = document.getElementById('return-journey-actions');
    if (!titleEl||!subtitleEl||!iconEl||!hpEl||!progressEl||!narrEl||!diceEl||!checkEl||!actionsEl) return;
    diceEl.classList.remove('active');
    checkEl.innerHTML = '';
    actionsEl.innerHTML = '';
    titleEl.textContent = 'Partindo de Eldoria';
    subtitleEl.textContent = j.totalSteps + ' etapas até ' + j.dungeonName;
    iconEl.textContent = '';
    _renderReturnHP(hpEl);
    _obRenderProgress(progressEl);
    narrEl.innerHTML =
        '<div class="return-step-badge safe">🏰 Partida</div>' +
        '<div>' + j.departureNarration + '</div>';
    _obAddBtn(actionsEl, '', 'Partir', 'Iniciar a jornada', '#c4953a', function() {
        _showOutboundStep();
    });
    overlay.classList.add('active');
    if (window.vHaptic) vHaptic.impact('light');
}

function _obRenderProgress(el) {
    var j = _outboundJourney;
    var pct = j.currentStep > 0 ? Math.round(((j.currentStep) / j.totalSteps) * 100) : 0;
    var dots = '';
    for (var i = 1; i <= j.totalSteps; i++) {
        var cls = i < j.currentStep ? 'done' : i === j.currentStep ? 'current' : 'pending';
        dots += '<div class="return-progress-dot ' + cls + '"></div>';
    }
    el.innerHTML =
        '<div class="return-progress-bar"><div class="return-progress-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="return-progress-dots">' + dots + '</div>';
}

function _obAddBtn(container, icon, title, desc, descColor, onClick) {
    var btn = document.createElement("button");
    btn.className = "exit-option-btn";
    btn.innerHTML =
        "<span class=\"exit-option-icon\">" + icon + "</span>" +
        "<div class=\"exit-option-info\"><div class=\"exit-option-title\">" + title + "</div>" +
        "<div class=\"exit-option-desc\" style=\"color:" + descColor + "\">" + desc + "</div></div>";
    btn.addEventListener("click", onClick);
    container.appendChild(btn);
}

function _showOutboundStep() {
    var j = _outboundJourney;
    if (!j) return;
    j.currentStep++;
    if (j.currentStep > j.totalSteps) {
        _showDungeonArrival();
        return;
    }
    if (typeof playTravelAnimation === 'function' && j.currentStep > 1) {
        playTravelAnimation(j.biome, '', function() { _renderOutboundStep(); }, {duration: 2000});
        return;
    }
    _renderOutboundStep();
}

function _renderOutboundStep() {
    var j = _outboundJourney;
    if (!j) return;
    var roll = Math.random() * 100;
    var hasHazard = roll < j.riskChance;
    var hazard = hasHazard ? _obGetHazard() : null;
    var overlay = document.getElementById('return-journey-overlay');
    var hpEl = document.getElementById('return-journey-hp');
    var progressEl = document.getElementById('return-journey-progress');
    var narrEl = document.getElementById('return-journey-narration');
    var diceEl = document.getElementById('return-journey-dice');
    var checkEl = document.getElementById('return-journey-check');
    var actionsEl = document.getElementById('return-journey-actions');
    var subtitleEl = document.getElementById('return-journey-subtitle');
    var iconEl = document.getElementById('return-journey-icon');
    var titleEl = document.getElementById('return-journey-title');
    if (!overlay||!hpEl||!progressEl||!narrEl||!diceEl||!checkEl||!actionsEl||!subtitleEl||!iconEl||!titleEl) return;
    diceEl.classList.remove('active');
    checkEl.innerHTML = '';
    actionsEl.innerHTML = '';
    var remaining = j.totalSteps - j.currentStep;
    titleEl.textContent = 'Rumo a ' + j.dungeonName;
    subtitleEl.textContent = remaining > 0
        ? (remaining + 1) + ' etapa' + (remaining > 0 ? 's' : '') + ' restante' + (remaining > 0 ? 's' : '')
        : 'Quase lá...';
    iconEl.textContent = '';
    _renderReturnHP(hpEl);
    _obRenderProgress(progressEl);
    if (hasHazard && hazard) {
        narrEl.innerHTML =
            '<div class="return-step-badge hazard">' + hazard.title + '</div>' +
            '<div>' + hazard.narr + '</div>';
        for (var ci = 0; ci < hazard.choices.length; ci++) {
            (function(choice) {
                var sn = (typeof STAT_NAMES !== 'undefined' ? STAT_NAMES : _OB_STAT_NAMES)[choice.k.s] || choice.k.s;
                var mod = typeof getAbilityMod === 'function' ? getAbilityMod(choice.k.s) : 0;
                var proficient = S && S.charData && S.charData.sp && S.charData.sp.includes(choice.k.s);
                var profMark = proficient ? ' ★' : '';
                var chance = Math.max(5, Math.min(95, Math.round(((21 - choice.k.dc + mod) / 20) * 100)));
                _obAddBtn(actionsEl, choice.i, choice.t,
                    sn + profMark + ' DC ' + choice.k.dc + ' | ' + (mod >= 0 ? '+' : '') + mod + ' | ' + chance + '%',
                    '#dca028',
                    function() { _obRollHazard(hazard, choice); }
                );
            })(hazard.choices[ci]);
        }
    } else {
        var biomeLabel = _OUTBOUND_BIOME_LABELS[j.biome] || 'Estrada';
        narrEl.innerHTML =
            '<div class="return-step-badge safe">✓ ' + biomeLabel + ' — Caminho seguro</div>' +
            '<div>' + _obGetNarration() + '</div>';
        _obAddActions(actionsEl, overlay, remaining);
    }
    overlay.classList.add('active');
    if (window.vHaptic) vHaptic.impact(hasHazard ? 'medium' : 'light');
}
function _obRollHazard(hazard, choice) {
    var actionsEl = document.getElementById('return-journey-actions');
    var diceEl = document.getElementById('return-journey-dice');
    var checkEl = document.getElementById('return-journey-check');
    actionsEl.innerHTML = '';
    var stat = choice.k.s;
    var dc = choice.k.dc;
    var mod = typeof getAbilityMod === 'function' ? getAbilityMod(stat) : 0;
    var mode = typeof getRollMode === 'function' ? getRollMode({s: stat}) : 'normal';
    var rollResult = typeof rollD20 === 'function' ? rollD20(mode) : {roll: Math.floor(Math.random()*20)+1, r1:0, r2:0};
    var theRoll = rollResult.roll;
    var total = theRoll + mod;
    var success = total >= dc;
    if (S && S.checksPerformed) {
        S.checksPerformed.push({stat:stat, dc:dc, roll:theRoll, mod:mod, ok:success, mode:mode, context:'outbound'});
    }
    var dice = typeof _getReturnDice === 'function' ? _getReturnDice() : null;
    if (dice) {
        diceEl.classList.add('active');
        dice.roll(theRoll, function() {
            _obResolveHazard(hazard, choice, theRoll, mod, total, success, rollResult.r1, rollResult.r2, mode);
        });
    } else {
        checkEl.innerHTML = '';
        var _dieEl = document.createElement('div');
        _dieEl.className = 'die kept';
        _dieEl.style.cssText = 'width:56px;height:56px;font-size:28px;margin:0 auto;border-radius:10px';
        _dieEl.textContent = '🎲';
        checkEl.appendChild(_dieEl);
        var _cyc = setInterval(function(){ _dieEl.textContent = Math.floor(Math.random()*20)+1; }, 50);
        setTimeout(function() {
            clearInterval(_cyc);
            _dieEl.textContent = theRoll;
            _obResolveHazard(hazard, choice, theRoll, mod, total, success, rollResult.r1, rollResult.r2, mode);
        }, 700);
    }
}
function _obResolveHazard(hazard, choice, roll, mod, total, success, r1, r2, mode) {
    var overlay = document.getElementById('return-journey-overlay');
    var checkEl = document.getElementById('return-journey-check');
    var narrEl = document.getElementById('return-journey-narration');
    var actionsEl = document.getElementById('return-journey-actions');
    var hpEl = document.getElementById('return-journey-hp');
    var sn = (typeof STAT_NAMES !== 'undefined' ? STAT_NAMES : _OB_STAT_NAMES)[choice.k.s] || choice.k.s;
    var proficient = S && S.charData && S.charData.sp && S.charData.sp.includes(choice.k.s);
    var profMark = proficient ? '★' : '';
    checkEl.innerHTML =
        (typeof buildFormula === 'function' ? buildFormula(roll, mod, sn, profMark, choice.k.dc, total, r1, r2, mode) : '') +
        '<div style="margin-top:6px;font-size:15px;font-weight:700;color:' + (success ? '#4a8' : '#c44') + '">' +
        (success ? 'Sucesso!' : 'Falha!') + '</div>';
    if (success) {
        narrEl.innerHTML =
            '<div class="return-step-badge safe">' + hazard.title + ' — Superado!</div>' +
            '<div>' + choice.sNarr + '</div>';
    } else {
        var dmg = choice.fDmg || 3;
        if (S) S.hpChange = (S.hpChange || 0) - dmg;
        if (S && S.charData) {
            var newHP = Math.max(0, S.charData.hp + (S.hpChange || 0));
            if (typeof updateHP === 'function') updateHP(newHP, S.charData.mh);
        }
        _renderReturnHP(hpEl);
        narrEl.innerHTML =
            '<div class="return-step-badge danger">' + hazard.title + ' — Falha!</div>' +
            '<div>' + choice.fNarr + '</div>' +
            '<div style="margin-top:6px;color:#c44;font-size:13px">-' + dmg + ' HP</div>';
    }
    if (window.vHaptic) vHaptic.notify(success ? 'success' : 'error');
    var remaining = _outboundJourney ? _outboundJourney.totalSteps - _outboundJourney.currentStep : 0;
    setTimeout(function() {
        if (typeof _disposeReturnDice === 'function') _disposeReturnDice();
        var _djEl=document.getElementById('return-journey-dice');if(_djEl)_djEl.classList.remove('active');
        if (typeof getCurrentHP === 'function' && getCurrentHP() <= 0) {
            actionsEl.innerHTML = '';
            _obAddBtn(actionsEl, '', 'Você sucumbiu...', 'Seus ferimentos foram fatais', '#c44', function() {
                overlay.classList.remove('active');
                _outboundJourney = null;
                _outboundActive = false;
                if (typeof showDeathSaves === 'function') showDeathSaves();
            });
            return;
        }
        _obAddActions(actionsEl, overlay, remaining);
    }, 1200);
}
function _obAddActions(actionsEl, overlay, remaining) {
    actionsEl.innerHTML = '';
    _obAddBtn(actionsEl, '', remaining > 0 ? 'Continuar Viagem' : 'Chegar à Masmorra',
        remaining > 0
            ? remaining + ' etapa' + (remaining > 1 ? 's' : '') + ' restante' + (remaining > 1 ? 's' : '')
            : 'A entrada se revela à frente!',
        remaining > 0 ? '#8a7a68' : '#c4953a',
        function() { _showOutboundStep(); }
    );
    if (typeof getHealingItems === 'function' && typeof getHPPercent === 'function') {
        var healItems = getHealingItems();
        if (healItems.length > 0 && getHPPercent() < 100) {
            var best = healItems[0];
            _obAddBtn(actionsEl, '', 'Usar ' + best.n + ' (' + best.q + 'x)',
                'Restaura ' + best.h + ' HP', '#4a8',
                function() {
                    if (typeof useInventoryItemAnimated === 'function') {
                        useInventoryItemAnimated(best, function(heal) {
                            if (typeof showTerrainToast === 'function') showTerrainToast('+' + heal + ' HP', 'ranger');
                            _renderReturnHP(document.getElementById('return-journey-hp'));
                            _obAddActions(actionsEl, overlay, remaining);
                        });
                    }
                }
            );
        }
    }
}
function _showDungeonArrival() {
    var j = _outboundJourney;
    var overlay = document.getElementById('return-journey-overlay');
    var titleEl = document.getElementById('return-journey-title');
    var subtitleEl = document.getElementById('return-journey-subtitle');
    var iconEl = document.getElementById('return-journey-icon');
    var hpEl = document.getElementById('return-journey-hp');
    var progressEl = document.getElementById('return-journey-progress');
    var narrEl = document.getElementById('return-journey-narration');
    var diceEl = document.getElementById('return-journey-dice');
    var checkEl = document.getElementById('return-journey-check');
    var actionsEl = document.getElementById('return-journey-actions');
    if (!titleEl||!subtitleEl||!iconEl||!hpEl||!progressEl||!narrEl||!diceEl||!checkEl||!actionsEl) return;
    diceEl.classList.remove('active');
    checkEl.innerHTML = '';
    actionsEl.innerHTML = '';
    if (typeof _disposeReturnDice === 'function') _disposeReturnDice();
    titleEl.textContent = j.dungeonName;
    subtitleEl.textContent = 'Você chegou ao destino';
    iconEl.textContent = '';
    _renderReturnHP(hpEl);
    j.currentStep = j.totalSteps + 1;
    _obRenderProgress(progressEl);
    narrEl.innerHTML =
        '<div class="return-step-badge arrival">⚔️ Chegada</div>' +
        '<div>' + j.arrivalNarration + '</div>';
    _obAddBtn(actionsEl, '', 'Entrar na Masmorra',
        'O desafio aguarda dentro', '#c4953a',
        function() {
            overlay.classList.remove('active');
            _outboundActive = false;
            _obTransitionToDungeon();
        }
    );
    overlay.classList.add('active');
    if (window.vHaptic) vHaptic.success();
}

function _obTransitionToDungeon() {
    var j = _outboundJourney;
    if (!j) return;
    console.info('[OUTBOUND] Transitioning to dungeon:', j.dungeonId);
    var params = typeof _mergedParams === 'function' ? _mergedParams() : {};
    var apiBase = params.api || '';
    var token = params.token || '';
    if (apiBase && token) {
        fetchT(apiBase + '/api/webapp/transition', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
            body: JSON.stringify({from: 'explore', to: 'dungeon', user_id: parseInt(params.uid || (params.get && params.get('uid')) || '0',10), payload: {daily_challenge: true, dungeon_id: j.dungeonId}})
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data && data.status === 'displaced') {
                if (window.SessionHeartbeat) SessionHeartbeat.handleDisplaced(data.device || '', data.from_device || '');
                return;
            }
            if (data && data.url) {
                window.__valdoria_transitioning = true;
                window.location.replace(data.url);
            } else {
                console.warn('[OUTBOUND] No dungeon URL, falling back to game');
                _obFallbackToGame(apiBase, token);
            }
        })
        .catch(function(err) {
            console.error('[OUTBOUND] Transition failed:', err);
            _obFallbackToGame(apiBase, token);
        });
    } else {
        if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
            window.__valdoria_transitioning=true;Telegram.WebApp.sendData(JSON.stringify({type: 'daily_dungeon_enter', dungeon_id: j.dungeonId}));
        }
    }
}

function _obFallbackToGame(apiBase, token) {
    fetchT(apiBase + '/api/webapp/transition', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
        body: JSON.stringify({from: 'explore', to: 'game', user_id: parseInt(S.uid||0,10)})
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data && data.status === 'displaced') {
            if (window.SessionHeartbeat) SessionHeartbeat.handleDisplaced(data.device || '', data.from_device || '');
            return;
        }
        if (data && data.url) {
            window.__valdoria_transitioning = true;
            window.location.replace(data.url);
        }
    })
    .catch(function(e) { console.error('[OUTBOUND] Fallback failed:', e); });
}


/* ═══════════════════════════════════════════════
   Return Journey from Dungeon
   ═══════════════════════════════════════════════ */
function startDungeonReturn(biome, steps, charData) {
    console.info('[RETURN] Starting dungeon return journey:', {biome: biome, steps: steps});

    /* Hide hex map UI elements */
    var mapEl = document.getElementById('hex-canvas') || document.getElementById('map-canvas');
    if (mapEl) mapEl.style.display = 'none';
    var hudEl = document.getElementById('bottom-bar');
    if (hudEl) hudEl.style.display = 'none';

    /* Set minimal explore state for return journey */
    S.biome = biome;
    S.hpChange = 0;
    if (charData) {
        S.charData = charData;
        S.inventory = (charData.inv || []).slice();
        S.level = charData.lv || 1;
    }

    /* Initialize return journey state */
    _returningToCity = true;
    _returnJourney = {
        totalSteps: steps,
        currentStep: 0,
        riskChance: 30,
        usedNarrations: new Set(),
        usedHazards: new Set(),
    };

    /* Setup HUD if charData available */
    if (charData && typeof setupHUD === 'function') {
        setupHUD();
    }

    /* Start the step-by-step return journey */
    if (typeof showReturnJourneyStep === 'function') {
        showReturnJourneyStep();
    } else {
        console.error('[RETURN] showReturnJourneyStep not loaded');
    }
}
