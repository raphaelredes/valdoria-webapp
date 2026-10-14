/**
 * party-client.js — Cliente Frontend para Comitiva Multiplayer D&D 5e
 * Lendas de Valdoria — Design System Canônico
 * Regra Soberana Zero: Tolerância zero. Nomenclatura estrita de aventureiros, personagens e comitiva.
 */
(function (global) {
    'use strict';

    if (global.vPartyClient) return;

    var _cfg = {
        apiBase: '',
        uid: null,
        charId: '',
        name: 'Aventureiro',
        cls: 'Guerreiro',
        icon: '⚔️',
        level: 1,
        hp: 20,
        maxHp: 20,
        mp: 10,
        maxMp: 10,
        armorClass: 14,
        pollIntervalMs: 2500,
    };

    var _partyState = null;
    var _pollTimer = null;
    var _isPolling = false;
    var _activeLootTimer = null;
    var _activeReactionTimer = null;
    var _activeGhostingPromptMemberId = null;

    // Elementos DOM cacheados
    var _hudEl = null;
    var _modalOverlayEl = null;

    // Classes canônicas que podem declarar Necessidade por tipo de equipamento
    var PROFICIENCY_MAP = {
        martial_weapons: ['Guerreiro', 'Paladino', 'Bárbaro', 'Patrulheiro'],
        simple_weapons: ['Guerreiro', 'Paladino', 'Bárbaro', 'Patrulheiro', 'Ladino', 'Clérigo', 'Druida', 'Bardo', 'Monge', 'Bruxo'],
        heavy_armor: ['Guerreiro', 'Paladino'],
        medium_armor: ['Guerreiro', 'Paladino', 'Bárbaro', 'Patrulheiro', 'Clérigo', 'Druida'],
        light_armor: ['Guerreiro', 'Paladino', 'Bárbaro', 'Patrulheiro', 'Clérigo', 'Druida', 'Ladino', 'Bardo', 'Bruxo'],
        arcane_focus: ['Mago', 'Feiticeiro', 'Bruxo', 'Bardo'],
        divine_focus: ['Clérigo', 'Paladino'],
        nature_focus: ['Druida', 'Patrulheiro'],
    };

    function _getApiBase() {
        if (_cfg.apiBase) return _cfg.apiBase.replace(/\/$/, '');
        if (global.ApiDiscovery && global.ApiDiscovery.getBase) {
            var b = global.ApiDiscovery.getBase();
            if (b) return b.replace(/\/$/, '');
        }
        return '';
    }

    async function _request(endpoint, body, method) {
        var base = _getApiBase();
        var url = base + endpoint;
        var m = method || (body ? 'POST' : 'GET');
        var headers = { 'Content-Type': 'application/json' };

        var token = null;
        try {
            token = localStorage.getItem('v_auth_token') || sessionStorage.getItem('v_auth_token');
        } catch (e) {}
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }

        var opts = {
            method: m,
            headers: headers,
        };
        if (body && m !== 'GET') {
            opts.body = JSON.stringify(body);
        }

        try {
            var res = await fetch(url, opts);
            if (!res.ok) {
                var errJson = {};
                try { errJson = await res.json(); } catch (_) {}
                throw new Error(errJson.error || ('Erro HTTP ' + res.status));
            }
            return await res.json();
        } catch (err) {
            console.warn('[PartyClient] Falha na rota ' + endpoint + ':', err.message);
            throw err;
        }
    }

    function _hpClass(current, max) {
        if (!max || max <= 0) return 'hp-mid';
        var pct = Math.round((current / max) * 100);
        if (global.vBarHpClass) return global.vBarHpClass(pct);
        if (pct > 60) return 'hp-high';
        if (pct > 25) return 'hp-mid';
        return 'hp-low';
    }

    function _isClassEligibleForNeed(itemType, itemTags, charClass) {
        if (!charClass) return false;
        var tags = Array.isArray(itemTags) ? itemTags : [];

        // Focos e catalisadores
        if (tags.indexOf('arcane_focus') !== -1 || tags.indexOf('wand') !== -1 || tags.indexOf('staff') !== -1) {
            return (PROFICIENCY_MAP.arcane_focus || []).indexOf(charClass) !== -1;
        }
        if (tags.indexOf('divine_focus') !== -1 || tags.indexOf('holy_symbol') !== -1) {
            return (PROFICIENCY_MAP.divine_focus || []).indexOf(charClass) !== -1;
        }
        if (tags.indexOf('nature_focus') !== -1) {
            return (PROFICIENCY_MAP.nature_focus || []).indexOf(charClass) !== -1;
        }

        // Armaduras
        if (itemType === 'heavy_armor') return (PROFICIENCY_MAP.heavy_armor || []).indexOf(charClass) !== -1;
        if (itemType === 'medium_armor') return (PROFICIENCY_MAP.medium_armor || []).indexOf(charClass) !== -1;
        if (itemType === 'light_armor') return (PROFICIENCY_MAP.light_armor || []).indexOf(charClass) !== -1;

        // Armas
        if (itemType === 'martial_weapon' || tags.indexOf('martial') !== -1) {
            return (PROFICIENCY_MAP.martial_weapons || []).indexOf(charClass) !== -1;
        }
        if (itemType === 'weapon' || itemType === 'simple_weapon') {
            return (PROFICIENCY_MAP.simple_weapons || []).indexOf(charClass) !== -1;
        }

        // Consumíveis e pergaminhos: utilizáveis por todos
        if (itemType === 'potion' || itemType === 'scroll') return true;

        return false;
    }

    // ── HUD da Comitiva ──────────────────────────────────────────────────────────

    function _ensureHud() {
        if (_hudEl && _hudEl.isConnected) return _hudEl;
        _hudEl = document.getElementById('v-party-hud');
        if (!_hudEl) {
            _hudEl = document.createElement('div');
            _hudEl.id = 'v-party-hud';
            _hudEl.className = 'v-party-hud';
            _hudEl.style.display = 'none';
            document.body.appendChild(_hudEl);
        }
        return _hudEl;
    }

    function _renderHud() {
        var hud = _ensureHud();
        if (!_partyState || !_partyState.session_id) {
            hud.style.display = 'none';
            return;
        }

        hud.style.display = 'flex';
        var members = _partyState.members || [];
        var sid = _partyState.session_id;

        var html = '';
        html += '<div class="v-party-hud-bar">';
        html += '  <div class="v-party-hud-title">';
        html += '    <span>🛡️ Comitiva</span>';
        html += '    <span class="v-party-code-badge" id="v-party-copy-code" title="Toque para copiar código da sala">#' + sid + '</span>';
        html += '  </div>';
        html += '  <div class="v-party-hud-controls">';
        html += '    <button type="button" class="v-party-icon-btn" id="v-party-btn-pings">🎯 Pings</button>';
        html += '    <button type="button" class="v-party-icon-btn" id="v-party-btn-lobby">👥 Sala</button>';
        html += '  </div>';
        html += '</div>';

        html += '<div class="v-party-members-grid">';
        for (var i = 0; i < members.length; i++) {
            var m = members[i];
            var isLeader = (m.uid === _partyState.leader_uid);
            var isMe = (m.uid === _cfg.uid);
            var hpPct = m.max_hp > 0 ? Math.min(100, Math.max(0, Math.round((m.hp / m.max_hp) * 100))) : 0;
            var mpPct = m.max_mp > 0 ? Math.min(100, Math.max(0, Math.round((m.mp / m.max_mp) * 100))) : 0;
            var hpTier = _hpClass(m.hp, m.max_hp);

            var cardClass = 'v-party-member-card';
            if (m.is_current_turn) cardClass += ' is-active-turn';
            if (!m.is_online) cardClass += ' is-offline';

            html += '<div class="' + cardClass + '" data-uid="' + m.uid + '">';
            html += '  <div class="v-party-member-header">';
            html += '    <div class="v-party-avatar">';
            html += '      <span>' + (m.icon || '⚔️') + '</span>';
            if (isLeader) {
                html += '      <span class="v-party-leader-crown" title="Líder da Comitiva">👑</span>';
            }
            html += '    </div>';
            html += '    <div class="v-party-info">';
            html += '      <div class="v-party-name">' + (m.name || 'Aventureiro') + (isMe ? ' (Você)' : '') + '</div>';
            html += '      <div class="v-party-subtext">';
            html += '        <span>Nv.' + (m.level || 1) + ' ' + (m.character_class || '') + '</span>';
            html += '        <span>🛡️' + (m.armor_class || 14) + '</span>';
            html += '      </div>';
            html += '    </div>';
            html += '  </div>';

            // Badges de Ausência e Controle Temporário
            if (m.controller_uid && m.controller_uid !== m.uid) {
                var isMeControlling = (m.controller_uid === _cfg.uid);
                html += '<div class="v-party-badge-controller">' + (isMeControlling ? '🎮 Você está controlando' : '🎮 Sob controle de aliado') + '</div>';
            } else if (m.is_ai_controlled) {
                html += '<div class="v-party-badge-ai">🤖 IA Tática Ativa</div>';
            }

            // Barras de PV e MP
            html += '  <div class="v-party-bars">';
            html += '    <div class="v-party-bar-label">';
            html += '      <span>PV</span><span>' + m.hp + '/' + m.max_hp + '</span>';
            html += '    </div>';
            html += '    <div class="v-party-bar-wrap v-party-bar-hp">';
            html += '      <div class="v-party-bar-fill ' + hpTier + '" style="width:' + hpPct + '%;"></div>';
            html += '    </div>';
            html += '    <div class="v-party-bar-label">';
            html += '      <span>MP</span><span>' + m.mp + '/' + m.max_mp + '</span>';
            html += '    </div>';
            html += '    <div class="v-party-bar-wrap v-party-bar-mp">';
            html += '      <div class="v-party-bar-fill" style="width:' + mpPct + '%;"></div>';
            html += '    </div>';
            html += '  </div>';

            html += '</div>';
        }
        html += '</div>';

        hud.innerHTML = html;

        // Listeners de controles
        var copyBtn = document.getElementById('v-party-copy-code');
        if (copyBtn) {
            copyBtn.onclick = function () {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(sid);
                    if (global.vToast) global.vToast('Código da comitiva copiado: #' + sid, 'ok');
                }
            };
        }

        var pingsBtn = document.getElementById('v-party-btn-pings');
        if (pingsBtn) {
            pingsBtn.onclick = function () {
                _openPingPicker();
            };
        }

        var lobbyBtn = document.getElementById('v-party-btn-lobby');
        if (lobbyBtn) {
            lobbyBtn.onclick = function () {
                _openLobbyModal();
            };
        }
    }

    // ── Polling & Sincronização ──────────────────────────────────────────────────

    async function _pollState() {
        if (!_partyState || !_partyState.session_id) return;
        try {
            var data = await _request('/api/party/state?session_id=' + _partyState.session_id + '&uid=' + _cfg.uid, null, 'GET');
            if (data && data.ok && data.state) {
                _partyState = data.state;
                _renderHud();
                _checkStateTriggers(data.state);
            }
        } catch (e) {
            // Falha silenciosa de polling
        }
    }

    function _startPolling() {
        if (_isPolling) return;
        _isPolling = true;
        _pollTimer = setInterval(_pollState, _cfg.pollIntervalMs);
    }

    function _stopPolling() {
        _isPolling = false;
        if (_pollTimer) {
            clearInterval(_pollTimer);
            _pollTimer = null;
        }
    }

    function _checkStateTriggers(state) {
        // 1. Verifica sorteio de saque coletivo ativo
        if (state.active_loot_roll && !_activeLootTimer) {
            _showLootModal(state.active_loot_roll);
        }

        // 2. Proteção contra Ausência (Ghosting Protection — 1º Timeout de 30s)
        var members = state.members || [];
        for (var i = 0; i < members.length; i++) {
            var m = members[i];
            // Se o aliado está sem responder há >30s no combate, abre consulta aos aliados ativos
            if (m.uid !== _cfg.uid && m.needs_ghosting_decision && _activeGhostingPromptMemberId !== m.uid) {
                _showGhostingModal(m);
                break;
            }
        }
    }

    // ── Modal de Proteção contra Ausência (1º Timeout de 30s) ───────────────────

    function _showGhostingModal(absentMember) {
        _activeGhostingPromptMemberId = absentMember.uid;
        _closeModal();

        var overlay = document.createElement('div');
        overlay.className = 'v-party-modal-overlay';
        overlay.id = 'v-party-ghosting-modal';

        var card = document.createElement('div');
        card.className = 'v-party-modal-card';

        var html = '';
        html += '<div class="v-party-modal-header">';
        html += '  <div class="v-party-modal-title">⚠️ Ausência de Aventureiro</div>';
        html += '</div>';
        html += '<div class="v-party-modal-body">';
        html += '  <p><strong>' + (absentMember.name || 'O companheiro') + '</strong> (' + (absentMember.character_class || 'Aventureiro') + ') não respondeu à rodada nos últimos 30 segundos.</p>';
        html += '  <p style="color:#beb09b; font-size:12px;">Como a comitiva deseja prosseguir para manter o ritmo da batalha?</p>';
        html += '  <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">';
        html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-need" id="v-ghost-ai" style="padding:10px;">';
        html += '      <span>🤖 Ativar Controle por IA Tática</span>';
        html += '      <span style="font-size:10px; opacity:0.85;">Adota postura defensiva e ações seguras</span>';
        html += '    </button>';
        html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-greed" id="v-ghost-takeover" style="padding:10px;">';
        html += '      <span>🎮 Assumir Controle Temporário</span>';
        html += '      <span style="font-size:10px; opacity:0.85;">Você comanda as ações até o aliado reconectar</span>';
        html += '    </button>';
        html += '  </div>';
        html += '</div>';

        card.innerHTML = html;
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        var btnAi = document.getElementById('v-ghost-ai');
        if (btnAi) {
            btnAi.onclick = async function () {
                _closeModal();
                try {
                    await _request('/api/party/combat/action', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        action: { type: 'ghosting_delegate_ai', target_uid: absentMember.uid },
                    });
                    if (global.vToast) global.vToast('IA tática assumiu o turno de ' + absentMember.name, 'ok');
                } catch (e) {
                    if (global.vToast) global.vToast('Falha ao delegar para IA: ' + e.message, 'err');
                }
            };
        }

        var btnTakeover = document.getElementById('v-ghost-takeover');
        if (btnTakeover) {
            btnTakeover.onclick = async function () {
                _closeModal();
                try {
                    await _request('/api/party/combat/action', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        action: { type: 'ghosting_takeover', target_uid: absentMember.uid },
                    });
                    if (global.vToast) global.vToast('Você assumiu temporariamente o controle de ' + absentMember.name, 'ok');
                } catch (e) {
                    if (global.vToast) global.vToast('Falha ao assumir controle: ' + e.message, 'err');
                }
            };
        }
    }

    // ── Modal de Saque Coletivo (Need before Greed) ──────────────────────────────

    function _showLootModal(lootData) {
        if (!lootData) return;
        _closeModal();

        var rollId = lootData.roll_id || 'roll_' + Date.now();
        var itemName = lootData.item_name || 'Tesouro Encontrado';
        var itemType = lootData.item_type || 'weapon';
        var itemTags = lootData.tags || [];
        var icon = lootData.icon || '💎';
        var desc = lootData.description || 'Um valioso item encontrado pela comitiva.';

        var isEligibleNeed = _isClassEligibleForNeed(itemType, itemTags, _cfg.cls);

        var overlay = document.createElement('div');
        overlay.className = 'v-party-modal-overlay';
        overlay.id = 'v-party-loot-modal';

        var card = document.createElement('div');
        card.className = 'v-party-modal-card';

        var html = '';
        html += '<div class="v-party-modal-header">';
        html += '  <div class="v-party-modal-title">🎲 Distribuição de Saque</div>';
        html += '</div>';
        html += '<div class="v-party-timer-bar">';
        html += '  <div class="v-party-timer-bar-fill" id="v-loot-timer-fill" style="width:100%;"></div>';
        html += '</div>';
        html += '<div class="v-party-modal-body">';
        html += '  <div class="v-party-loot-item-preview">';
        html += '    <div class="v-party-loot-item-icon">' + icon + '</div>';
        html += '    <div class="v-party-loot-item-info">';
        html += '      <div class="v-party-loot-item-name">' + itemName + '</div>';
        html += '      <div class="v-party-loot-item-type">' + desc + '</div>';
        html += '    </div>';
        html += '  </div>';

        html += '  <div class="v-party-loot-actions">';
        html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-need" id="v-loot-btn-need"' + (isEligibleNeed ? '' : ' disabled title="Sua classe (' + _cfg.cls + ') não tem proficiência para Necessidade"') + '>';
        html += '      <span>⚔️ Necessidade</span>';
        html += '      <span style="font-size:9px;">' + (isEligibleNeed ? 'Prioridade de Uso' : 'Incompatível') + '</span>';
        html += '    </button>';
        html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-greed" id="v-loot-btn-greed">';
        html += '      <span>🎲 Ganância</span>';
        html += '      <span style="font-size:9px;">Sorteio Aberto</span>';
        html += '    </button>';
        html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-pass" id="v-loot-btn-pass">';
        html += '      <span>✖ Passar</span>';
        html += '      <span style="font-size:9px;">Abrir Mão</span>';
        html += '    </button>';
        html += '  </div>';

        html += '  <div class="v-party-loot-tally" id="v-loot-tally">⏳ Aguardando votos dos membros da comitiva...</div>';
        html += '</div>';

        card.innerHTML = html;
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        var fillEl = document.getElementById('v-loot-timer-fill');
        var startTime = Date.now();
        var durationMs = 15000;

        function updateTimer() {
            var elapsed = Date.now() - startTime;
            var remaining = Math.max(0, durationMs - elapsed);
            var pct = (remaining / durationMs) * 100;
            if (fillEl) fillEl.style.width = pct + '%';
            if (remaining <= 0) {
                _sendLootVote(rollId, 'pass');
            } else {
                _activeLootTimer = requestAnimationFrame(updateTimer);
            }
        }
        _activeLootTimer = requestAnimationFrame(updateTimer);

        function _sendLootVote(rId, choice) {
            if (_activeLootTimer) {
                cancelAnimationFrame(_activeLootTimer);
                _activeLootTimer = null;
            }
            _closeModal();
            _request('/api/party/loot/vote', {
                session_id: _partyState.session_id,
                user_id: _cfg.uid,
                roll_id: rId,
                choice: choice,
            }).then(function (res) {
                if (res && res.winner_name) {
                    if (global.vToast) global.vToast('🏆 ' + res.winner_name + ' conquistou ' + itemName + '!', 'ok');
                }
            }).catch(function (e) {
                console.warn('[PartyClient] Falha no voto de saque:', e.message);
            });
        }

        var btnNeed = document.getElementById('v-loot-btn-need');
        if (btnNeed && isEligibleNeed) {
            btnNeed.onclick = function () { _sendLootVote(rollId, 'need'); };
        }
        var btnGreed = document.getElementById('v-loot-btn-greed');
        if (btnGreed) {
            btnGreed.onclick = function () { _sendLootVote(rollId, 'greed'); };
        }
        var btnPass = document.getElementById('v-loot-btn-pass');
        if (btnPass) {
            btnPass.onclick = function () { _sendLootVote(rollId, 'pass'); };
        }
    }

    // ── Prompt de Reação Imediata (6 Segundos Combat2) ──────────────────────────

    function _showReactionPrompt(reactionData, onResolve) {
        if (!reactionData) return;
        _closeModal();

        var triggerName = reactionData.attacker_name || 'Inimigo';
        var triggerDamage = reactionData.potential_damage || 0;
        var options = reactionData.options || [
            { id: 'shield', name: 'Escudo Arcano', icon: '🛡️', cost: '1 Slot Nv.1', desc: '+5 CA até próximo turno' },
            { id: 'parry', name: 'Aparar', icon: '⚔️', cost: 'Reação', desc: 'Soma bônus de maestria à CA' },
        ];

        var overlay = document.createElement('div');
        overlay.className = 'v-party-modal-overlay';
        overlay.id = 'v-party-reaction-modal';

        var card = document.createElement('div');
        card.className = 'v-party-modal-card v-party-reaction-card';

        var html = '';
        html += '<div class="v-party-modal-header">';
        html += '  <div class="v-party-modal-title">⚡ Janela de Reação (D&D 5e)</div>';
        html += '</div>';
        html += '<div class="v-party-timer-bar">';
        html += '  <div class="v-party-timer-bar-fill" id="v-reaction-timer-fill" style="width:100%; background:linear-gradient(90deg, #ff5722, #ff9800);"></div>';
        html += '</div>';
        html += '<div class="v-party-modal-body">';
        html += '  <p style="margin:0;"><strong>' + triggerName + '</strong> desferiu um ataque iminente contra você! (Dano estimado: <strong>' + triggerDamage + '</strong>).</p>';
        html += '  <div class="v-party-reaction-list">';

        for (var i = 0; i < options.length; i++) {
            var opt = options[i];
            html += '  <button type="button" class="v-party-reaction-opt" data-opt-id="' + opt.id + '">';
            html += '    <div style="display:flex; align-items:center; gap:8px;">';
            html += '      <span style="font-size:18px;">' + (opt.icon || '⚡') + '</span>';
            html += '      <div>';
            html += '        <div style="font-weight:700; font-size:13px;">' + opt.name + '</div>';
            html += '        <div style="font-size:11px; color:#c7b59d;">' + opt.desc + '</div>';
            html += '      </div>';
            html += '    </div>';
            html += '    <span class="v-party-reaction-cost">' + (opt.cost || 'Reação') + '</span>';
            html += '  </button>';
        }

        html += '  <button type="button" class="v-party-loot-btn v-party-loot-btn-pass" id="v-reaction-pass" style="padding:8px; margin-top:4px;">';
        html += '    ✖ Não Reagir / Poupar Reação';
        html += '  </button>';
        html += '  </div>';
        html += '</div>';

        card.innerHTML = html;
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        var fillEl = document.getElementById('v-reaction-timer-fill');
        var startTime = Date.now();
        var durationMs = 6000;

        function finishReaction(choiceId) {
            if (_activeReactionTimer) {
                cancelAnimationFrame(_activeReactionTimer);
                _activeReactionTimer = null;
            }
            _closeModal();
            if (typeof onResolve === 'function') {
                onResolve(choiceId);
            }
            _request('/api/party/combat/reaction', {
                session_id: _partyState ? _partyState.session_id : '',
                user_id: _cfg.uid,
                reaction_id: choiceId,
            }).catch(function (e) {
                console.warn('[PartyClient] Falha ao despachar reação:', e.message);
            });
        }

        function updateTimer() {
            var elapsed = Date.now() - startTime;
            var remaining = Math.max(0, durationMs - elapsed);
            var pct = (remaining / durationMs) * 100;
            if (fillEl) fillEl.style.width = pct + '%';
            if (remaining <= 0) {
                finishReaction('pass');
            } else {
                _activeReactionTimer = requestAnimationFrame(updateTimer);
            }
        }
        _activeReactionTimer = requestAnimationFrame(updateTimer);

        var optBtns = card.querySelectorAll('.v-party-reaction-opt');
        for (var j = 0; j < optBtns.length; j++) {
            optBtns[j].onclick = function (ev) {
                var btn = ev.currentTarget;
                var oId = btn.getAttribute('data-opt-id');
                finishReaction(oId);
            };
        }

        var btnPass = document.getElementById('v-reaction-pass');
        if (btnPass) {
            btnPass.onclick = function () { finishReaction('pass'); };
        }
    }

    // ── Menu de Pings Táticos ────────────────────────────────────────────────────

    function _openPingPicker(hex_q, hex_r) {
        var existing = document.getElementById('v-party-ping-radial');
        if (existing) {
            existing.remove();
            return;
        }

        var menu = document.createElement('div');
        menu.id = 'v-party-ping-radial';
        menu.className = 'v-party-ping-radial';
        menu.style.top = '60px';
        menu.style.right = '12px';

        var pings = [
            { type: 'focus', icon: '🎯', label: 'Foco no Alvo' },
            { type: 'danger', icon: '⚠️', label: 'Alerta de Perigo' },
            { type: 'march', icon: '🚶', label: 'Ponto de Marcha' },
            { type: 'explore', icon: '❓', label: 'Investigar Ponto' },
        ];

        var html = '<div style="font-size:11px; font-weight:700; color:var(--v-gold,#c4953a); margin-bottom:4px; text-transform:uppercase;">Pings Táticos</div>';
        for (var i = 0; i < pings.length; i++) {
            var p = pings[i];
            html += '<button type="button" class="v-party-ping-btn" data-type="' + p.type + '">';
            html += '  <span>' + p.icon + '</span><span>' + p.label + '</span>';
            html += '</button>';
        }
        menu.innerHTML = html;
        document.body.appendChild(menu);

        var btns = menu.querySelectorAll('.v-party-ping-btn');
        for (var j = 0; j < btns.length; j++) {
            btns[j].onclick = function (ev) {
                var pType = ev.currentTarget.getAttribute('data-type');
                menu.remove();
                _sendPing(pType, hex_q || 0, hex_r || 0);
            };
        }

        function onOutside(ev) {
            if (!menu.contains(ev.target) && ev.target.id !== 'v-party-btn-pings') {
                menu.remove();
                document.removeEventListener('click', onOutside);
            }
        }
        setTimeout(function () { document.addEventListener('click', onOutside); }, 50);
    }

    async function _sendPing(pingType, q, r, note) {
        if (!_partyState || !_partyState.session_id) return;
        try {
            var res = await _request('/api/party/ping', {
                session_id: _partyState.session_id,
                user_id: _cfg.uid,
                ping_type: pingType,
                hex_q: q,
                hex_r: r,
                note: note || '',
            });
            if (res && res.ping) {
                _renderPingWave(res.ping);
            }
        } catch (e) {
            if (global.vToast) global.vToast('Erro ao enviar ping: ' + e.message, 'err');
        }
    }

    function _renderPingWave(ping) {
        var el = document.createElement('div');
        el.className = 'v-party-map-ping ping-' + (ping.ping_type || 'focus');
        el.innerHTML = (ping.ping_type === 'focus' ? '🎯' : (ping.ping_type === 'danger' ? '⚠️' : (ping.ping_type === 'march' ? '🚶' : '❓')));

        // Centraliza na tela ou busca elemento do hexágono se disponível
        var targetHex = document.querySelector('[data-q="' + ping.hex_q + '"][data-r="' + ping.hex_r + '"]');
        if (targetHex) {
            var rect = targetHex.getBoundingClientRect();
            el.style.left = (rect.left + rect.width / 2) + 'px';
            el.style.top = (rect.top + rect.height / 2) + 'px';
        } else if (typeof window.hexToScreen === 'function') {
            try {
                var pt = window.hexToScreen(ping.hex_q, ping.hex_r);
                if (pt && typeof pt.x === 'number') {
                    var cv = document.getElementById('main-canvas') || document.querySelector('canvas');
                    var cRect = cv ? cv.getBoundingClientRect() : { left: 0, top: 0 };
                    el.style.left = (cRect.left + pt.x) + 'px';
                    el.style.top = (cRect.top + pt.y) + 'px';
                } else {
                    el.style.left = '50%';
                    el.style.top = '50%';
                }
            } catch (_) {
                el.style.left = '50%';
                el.style.top = '50%';
            }
        } else {
            el.style.left = '50%';
            el.style.top = '50%';
        }

        document.body.appendChild(el);
        setTimeout(function () { el.remove(); }, 3500);
    }

    // ── Painel de Lobby / Sala da Comitiva ───────────────────────────────────────

    function _openLobbyModal() {
        _closeModal();

        var overlay = document.createElement('div');
        overlay.className = 'v-party-modal-overlay';
        overlay.id = 'v-party-lobby-modal';

        var card = document.createElement('div');
        card.className = 'v-party-modal-card';

        var hasParty = (_partyState && _partyState.session_id);

        var html = '';
        html += '<div class="v-party-modal-header">';
        html += '  <div class="v-party-modal-title">👥 Comitiva Multiplayer</div>';
        html += '  <button type="button" class="v-party-icon-btn" id="v-lobby-close">✖</button>';
        html += '</div>';
        html += '<div class="v-party-modal-body">';

        if (!hasParty) {
            html += '  <p style="color:#d5c7b3; font-size:13px;">Reúna até 4 aventureiros para desbravar masmorras e combater lado a lado com regras de D&D 5e.</p>';
            html += '  <div style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">';
            html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-need" id="v-party-create-btn" style="padding:12px;">';
            html += '      <span>⚔️ Criar Nova Comitiva</span>';
            html += '      <span style="font-size:10px; opacity:0.85;">Você será o líder da sala</span>';
            html += '    </button>';
            html += '    <div style="text-align:center; color:#888; font-size:11px;">— OU —</div>';
            html += '    <div style="display:flex; gap:8px;">';
            html += '      <input type="text" id="v-party-join-input" placeholder="Código da sala (ex: a1b2c3d4)" style="flex:1; background:#18120d; border:1px solid rgba(196,149,58,0.4); border-radius:5px; color:#fff; padding:8px 10px; font-family:monospace; text-transform:lowercase;" />';
            html += '      <button type="button" class="v-party-loot-btn v-party-loot-btn-greed" id="v-party-join-btn" style="padding:8px 14px;">Ingressar</button>';
            html += '    </div>';
            html += '  </div>';
        } else {
            var members = _partyState.members || [];
            var myMember = null;
            for (var mIdx = 0; mIdx < members.length; mIdx++) {
                if (members[mIdx].uid === _cfg.uid) { myMember = members[mIdx]; break; }
            }
            var isReady = myMember ? myMember.ready : false;

            html += '  <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); border-radius:6px; padding:8px 10px;">';
            html += '    <div>';
            html += '      <div style="font-size:11px; color:#a89880;">Código da Comitiva:</div>';
            html += '      <div style="font-family:monospace; font-size:15px; font-weight:700; color:var(--v-gold,#c4953a);">#' + _partyState.session_id + '</div>';
            html += '    </div>';
            html += '    <button type="button" class="v-party-icon-btn" id="v-lobby-share">📋 Compartilhar</button>';
            html += '  </div>';

            html += '  <div style="font-size:12px; font-weight:700; color:#d8cbb8; margin-top:8px;">Aventureiros na Comitiva (' + members.length + '/4):</div>';
            html += '  <div style="display:flex; flex-direction:column; gap:6px;">';
            for (var i = 0; i < members.length; i++) {
                var mem = members[i];
                html += '  <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(30,22,16,0.8); border:1px solid rgba(196,149,58,0.25); border-radius:5px; padding:6px 10px;">';
                html += '    <div style="display:flex; align-items:center; gap:8px;">';
                html += '      <span>' + (mem.icon || '⚔️') + '</span>';
                html += '      <div>';
                html += '        <div style="font-size:12px; font-weight:700; color:#f0e6d2;">' + mem.name + (mem.uid === _partyState.leader_uid ? ' 👑' : '') + '</div>';
                html += '        <div style="font-size:10px; color:#a09078;">Nv.' + mem.level + ' ' + mem.character_class + '</div>';
                html += '      </div>';
                html += '    </div>';
                html += '    <span style="font-size:11px; color:' + (mem.ready ? '#4caf50' : '#ffa000') + ';">' + (mem.ready ? '✓ Pronto' : '⏳ Aguardando') + '</span>';
                html += '  </div>';
            }
            html += '  </div>';

            html += '  <div style="display:flex; gap:8px; margin-top:10px;">';
            html += '    <button type="button" class="v-party-loot-btn ' + (isReady ? 'v-party-loot-btn-pass' : 'v-party-loot-btn-need') + '" id="v-lobby-ready-btn" style="flex:1; padding:10px;">';
            html += '      <span>' + (isReady ? '⏳ Desmarcar Prontidão' : '✔ Estou Pronto') + '</span>';
            html += '    </button>';
            html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-pass" id="v-lobby-leave-btn" style="padding:10px 14px;">';
            html += '      <span>🚪 Sair</span>';
            html += '    </button>';
            html += '  </div>';
        }

        html += '</div>';

        card.innerHTML = html;
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        var closeBtn = document.getElementById('v-lobby-close');
        if (closeBtn) closeBtn.onclick = _closeModal;

        if (!hasParty) {
            var btnCreate = document.getElementById('v-party-create-btn');
            if (btnCreate) {
                btnCreate.onclick = async function () {
                    try {
                        await _createParty();
                        _openLobbyModal();
                    } catch (e) {
                        if (global.vToast) global.vToast('Erro ao criar comitiva: ' + e.message, 'err');
                    }
                };
            }
            var btnJoin = document.getElementById('v-party-join-btn');
            if (btnJoin) {
                btnJoin.onclick = async function () {
                    var inp = document.getElementById('v-party-join-input');
                    var code = inp ? inp.value.trim().replace(/^#/, '') : '';
                    if (!code) {
                        if (global.vToast) global.vToast('Digite o código da comitiva.', 'warn');
                        return;
                    }
                    try {
                        await _joinParty(code);
                        _openLobbyModal();
                    } catch (e) {
                        if (global.vToast) global.vToast('Erro ao entrar na comitiva: ' + e.message, 'err');
                    }
                };
            }
        } else {
            var btnShare = document.getElementById('v-lobby-share');
            if (btnShare) {
                btnShare.onclick = function () {
                    var text = 'Entre na minha comitiva em Lendas de Valdoria! Código: #' + _partyState.session_id;
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(text);
                        if (global.vToast) global.vToast('Convite copiado para área de transferência!', 'ok');
                    }
                };
            }
            var btnReady = document.getElementById('v-lobby-ready-btn');
            if (btnReady) {
                btnReady.onclick = async function () {
                    var nextState = !isReady;
                    try {
                        await _request('/api/party/ready', {
                            session_id: _partyState.session_id,
                            user_id: _cfg.uid,
                            ready: nextState,
                        });
                        await _pollState();
                        _openLobbyModal();
                    } catch (e) {
                        if (global.vToast) global.vToast('Erro ao alternar prontidão: ' + e.message, 'err');
                    }
                };
            }
            var btnLeave = document.getElementById('v-lobby-leave-btn');
            if (btnLeave) {
                btnLeave.onclick = async function () {
                    _closeModal();
                    try {
                        await _leaveParty();
                        if (global.vToast) global.vToast('Você deixou a comitiva.', 'ok');
                    } catch (e) {
                        if (global.vToast) global.vToast('Erro ao sair da comitiva: ' + e.message, 'err');
                    }
                };
            }
        }
    }

    function _closeModal() {
        if (_activeLootTimer) {
            cancelAnimationFrame(_activeLootTimer);
            _activeLootTimer = null;
        }
        if (_activeReactionTimer) {
            cancelAnimationFrame(_activeReactionTimer);
            _activeReactionTimer = null;
        }
        var modals = document.querySelectorAll('.v-party-modal-overlay');
        for (var i = 0; i < modals.length; i++) {
            modals[i].remove();
        }
    }

    // ── API Pública do vPartyClient ──────────────────────────────────────────────

    async function _createParty(dungeonName) {
        var res = await _request('/api/party/create', {
            user_id: _cfg.uid,
            name: _cfg.name,
            character_class: _cfg.cls,
            icon: _cfg.icon,
            level: _cfg.level,
            hp: _cfg.hp,
            max_hp: _cfg.maxHp,
            mp: _cfg.mp,
            max_mp: _cfg.maxMp,
            armor_class: _cfg.armorClass,
            dungeon_name: dungeonName || null,
        });
        if (res && res.ok && res.state) {
            _partyState = res.state;
            _renderHud();
            _startPolling();
            if (global.vToast) global.vToast('Comitiva criada com sucesso! Código: #' + res.session_id, 'ok');
            return res.state;
        }
        throw new Error((res && res.error) || 'Falha ao criar comitiva');
    }

    async function _joinParty(sessionId) {
        var res = await _request('/api/party/join', {
            session_id: sessionId,
            user_id: _cfg.uid,
            name: _cfg.name,
            character_class: _cfg.cls,
            icon: _cfg.icon,
            level: _cfg.level,
            hp: _cfg.hp,
            max_hp: _cfg.maxHp,
            mp: _cfg.mp,
            max_mp: _cfg.maxMp,
            armor_class: _cfg.armorClass,
        });
        if (res && res.ok && res.state) {
            _partyState = res.state;
            _renderHud();
            _startPolling();
            if (global.vToast) global.vToast('Você entrou na comitiva #' + sessionId + '!', 'ok');
            return res.state;
        }
        throw new Error((res && res.error) || 'Falha ao ingressar na comitiva');
    }

    async function _leaveParty() {
        if (!_partyState || !_partyState.session_id) return;
        var sid = _partyState.session_id;
        _stopPolling();
        _partyState = null;
        _renderHud();
        try {
            await _request('/api/party/leave', {
                session_id: sid,
                user_id: _cfg.uid,
            });
        } catch (_) {}
    }

    function init(cfg) {
        if (cfg) {
            for (var k in cfg) {
                if (cfg.hasOwnProperty(k)) _cfg[k] = cfg[k];
            }
        }
        // Se já houver session_id nos parâmetros da URL (ex: ?party=a1b2c3d4)
        try {
            var params = new URLSearchParams(window.location.search);
            var autoParty = params.get('party');
            if (autoParty && _cfg.uid) {
                _joinParty(autoParty).catch(function () {});
            }
        } catch (_) {}
    }

    // Exportação do Singleton Global
    global.vPartyClient = {
        init: init,
        createParty: _createParty,
        joinParty: _joinParty,
        leaveParty: _leaveParty,
        getState: function () { return _partyState; },
        openLobby: _openLobbyModal,
        openPings: _openPingPicker,
        showLootModal: _showLootModal,
        showReactionPrompt: _showReactionPrompt,
        renderPingWave: _renderPingWave,
    };

})(typeof window !== 'undefined' ? window : this);
