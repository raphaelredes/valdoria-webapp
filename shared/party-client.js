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
    var _lastSeenCombatSummaryId = null;

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
        var inspiration = typeof _partyState.party_inspiration === 'number' ? _partyState.party_inspiration : 0;

        html += '<div class="v-party-hud-bar">';
        html += '  <div class="v-party-hud-title">';
        html += '    <span>🛡️ Comitiva</span>';
        html += '    <span class="v-party-code-badge" id="v-party-copy-code" title="Toque para copiar código da sala">#' + sid + '</span>';
        html += '  </div>';
        html += '  <div class="v-party-hud-controls">';
        html += '    <button type="button" class="v-party-icon-btn" id="v-party-btn-stash">🎒 Baú</button>';
        html += '    <button type="button" class="v-party-icon-btn" id="v-party-btn-camp">🏕️ Acampamento</button>';
        html += '    <button type="button" class="v-party-icon-btn" id="v-party-btn-pings">🎯 Pings</button>';
        html += '    <button type="button" class="v-party-icon-btn" id="v-party-btn-lobby">👥 Sala</button>';
        html += '  </div>';
        html += '</div>';

        // Alerta de Corda / Turn Timer Combat2 (Hearthstone Rope)
        if (_partyState.combat && _partyState.combat.rope_active) {
            html += '<div class="v-party-rope-badge">';
            html += '  <span>⏳ Turno esgotando: ' + (_partyState.combat.turn_time_left || 0) + 's (Auto-Esquiva iminente)</span>';
            html += '</div>';
        }

        // Barra de Inspiração da Comitiva D&D 5e (0 a 100)
        html += '<div class="v-party-inspiration-wrap">';
        html += '  <div class="v-party-inspiration-header">';
        html += '    <span>✨ Inspiração da Comitiva</span>';
        html += '    <span>' + inspiration + '/100</span>';
        html += '  </div>';
        html += '  <div class="v-party-inspiration-track">';
        html += '    <div class="v-party-inspiration-fill" style="width:' + inspiration + '%;"></div>';
        html += '  </div>';
        if (inspiration >= 100) {
            html += '  <button type="button" class="v-party-feat-btn" id="v-party-btn-feat">⚡ Conclamar Proeza de Comitiva</button>';
        }
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

        var stashBtn = document.getElementById('v-party-btn-stash');
        if (stashBtn) {
            stashBtn.onclick = function () {
                _openSharedStashModal();
            };
        }

        var campBtn = document.getElementById('v-party-btn-camp');
        if (campBtn) {
            campBtn.onclick = function () {
                _openCampRestModal();
            };
        }

        var featBtn = document.getElementById('v-party-btn-feat');
        if (featBtn) {
            featBtn.onclick = function () {
                _openPartyFeatModal();
            };
        }

        var lobbyBtn = document.getElementById('v-party-btn-lobby');
        if (lobbyBtn) {
            lobbyBtn.onclick = function () {
                _openLobbyModal();
            };
        }
    }

    // ── Polling & Sincronização Delta (Valve Source Protocol / Glenn Fiedler) ────

    function _applyStateDelta(delta, newVersion) {
        if (!_partyState) return;
        _partyState.turn_version = newVersion;
        if (typeof delta.party_inspiration === 'number') {
            _partyState.party_inspiration = delta.party_inspiration;
        }
        if (delta.shared_stash) {
            _partyState.shared_stash = delta.shared_stash;
        }
        if (delta.dialogue_helpers) {
            _partyState.dialogue_helpers = delta.dialogue_helpers;
        }
        if (delta.new_ping) {
            _renderPingWave(delta.new_ping);
        }
        if (delta.leader_migrated) {
            if (_partyState) _partyState.leader_uid = delta.leader_migrated.new_leader_uid;
            if (global.vToast) global.vToast('👑 Liderança transferida para ' + delta.leader_migrated.new_leader_name + ' (ausência do líder anterior)', 'info');
        }
        if (delta.auto_dodge) {
            if (global.vToast) global.vToast('⏳ Turno esgotou: ' + delta.auto_dodge.actor_name + ' assumiu Esquiva automática!', 'warning');
        }
        if (delta.camp_rest_proposal) {
            _partyState.camp_rest_proposal = delta.camp_rest_proposal;
        }
        if (delta.camp_rest_resolved) {
            _partyState.camp_rest_proposal = null;
            if (global.vToast) {
                var isOk = delta.camp_rest_resolved.accepted;
                global.vToast(isOk ? '🏕️ Descanso concluído com sucesso!' : '🏕️ ' + (delta.camp_rest_resolved.reason || 'Descanso cancelado.'), isOk ? 'ok' : 'err');
            }
        }
        if (delta.trade_requested) {
            _partyState.active_trade = delta.trade_requested;
            if (delta.trade_requested.p2_uid === _cfg.uid) {
                _showTradeInviteModal(delta.trade_requested);
            }
        }
        if (delta.trade_started || delta.trade_staged || delta.trade_locked || delta.trade_confirmed) {
            var tradeData = delta.trade_started || delta.trade_staged || delta.trade_locked || delta.trade_confirmed;
            _partyState.active_trade = tradeData;
            _refreshTradeModal(tradeData);
        }
        if (delta.trade_completed) {
            _partyState.active_trade = null;
            _closeTradeModal();
            if (global.vToast) {
                global.vToast('⚖️ Troca concluída com sucesso entre ' + delta.trade_completed.p1_name + ' e ' + delta.trade_completed.p2_name + '!', 'ok');
            }
        }
        if (delta.trade_cancelled) {
            _partyState.active_trade = null;
            _closeTradeModal();
            if (global.vToast) {
                global.vToast('⚖️ ' + (delta.trade_cancelled.reason || 'Negociação cancelada.'), 'warning');
            }
        }
        if (delta.death_save_broadcast) {
            var dsb = delta.death_save_broadcast;
            if (dsb.crit_success) {
                if (global.vToast) global.vToast('✨ MILAGRE EM CAMPO! ' + dsb.actorName + ' rolou Natural 20, recuperou 1 PV e se levantou!', 'ok');
            } else if (dsb.is_dead) {
                if (global.vToast) global.vToast('💀 Tragédia! ' + dsb.actorName + ' sucumbiu às salvaguardas contra a morte...', 'err');
            } else if (dsb.is_stable) {
                if (global.vToast) global.vToast('🛡️ ' + dsb.actorName + ' foi estabilizado a 0 PV e respira com alívio.', 'ok');
            } else {
                var sLabel = dsb.success ? 'Sucesso' : 'Falha';
                if (global.vToast) global.vToast('🎲 Salvaguarda (' + dsb.actorName + '): d20=' + dsb.d20 + ' [' + sLabel + ' ' + dsb.total_successes + '/3 S, ' + dsb.total_failures + '/3 F]', dsb.success ? 'ok' : 'warning');
            }
        }
        if (delta.challenge_started || delta.challenge_update) {
            var chData = delta.challenge_started || delta.challenge_update;
            _partyState.active_challenge = chData;
            _showSkillChallengeModal(chData);
        }
        if (delta.hp_change) {
            var mems = _partyState.members || [];
            for (var uid in delta.hp_change) {
                for (var i = 0; i < mems.length; i++) {
                    if (mems[i].uid === parseInt(uid, 10)) {
                        mems[i].hp = delta.hp_change[uid];
                    }
                }
            }
        }
    }

    async function _pollState() {
        if (!_partyState || !_partyState.session_id) return;
        try {
            var curVer = _partyState.turn_version || 0;
            var url = '/api/party/state?session_id=' + _partyState.session_id + '&uid=' + _cfg.uid;
            if (curVer > 0) {
                url += '&ack_version=' + curVer;
            }
            var data = await _request(url, null, 'GET');
            if (data && data.ok) {
                if (data.is_delta && data.delta) {
                    _applyStateDelta(data.delta, data.turn_version);
                } else if (data.state) {
                    _partyState = data.state;
                }
                _renderHud();
                _checkStateTriggers(_partyState);
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

        // 3. Proposta de Acampamento e Descanso Consensual (Short / Long Rest)
        if (state.camp_rest_proposal && !document.getElementById('v-party-camp-vote-modal')) {
            var myV = state.camp_rest_proposal.votes && state.camp_rest_proposal.votes[_cfg.uid];
            if (!myV) {
                _showCampRestVoteModal(state.camp_rest_proposal);
            }
        }

        // 4. Negociação bilateral ativa
        if (state.active_trade) {
            if (state.active_trade.status === 'pending_accept' && state.active_trade.p2_uid === _cfg.uid && !document.getElementById('v-party-trade-invite-modal')) {
                _showTradeInviteModal(state.active_trade);
            } else if ((state.active_trade.status === 'staged' || state.active_trade.status === 'locked') && document.getElementById('v-party-trade-modal')) {
                _refreshTradeModal(state.active_trade);
            }
        }

        // 5. Modo Espectador e Salvaguardas Contra a Morte no combate
        if (state.combat && state.combat.is_spectator && state.combat.spectator_meta) {
            if (state.combat.spectator_meta.dying && !document.getElementById('v-party-death-save-modal')) {
                _showDeathSaveModal(state.combat);
            }
        }

        // 6. Desafios de Perícias Coletivas (Skill Challenges D&D 4e/5e)
        if (state.active_challenge) {
            if (state.active_challenge.status === 'active' && !document.getElementById('v-party-challenge-modal')) {
                _showSkillChallengeModal(state.active_challenge);
            } else if (document.getElementById('v-party-challenge-modal')) {
                _refreshSkillChallengeModal(state.active_challenge);
            }
        }

        // 7. Resumo Tático Pós-Combate & MVP Honors (Blizzard / Valve / Riot)
        if (state.last_combat_summary && !_lastSeenCombatSummaryId) {
            if (!document.getElementById('v-party-summary-modal') && state.status !== 'combat' && state.status !== 'combat2') {
                _showTacticalSummaryModal(state.last_combat_summary);
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
            { type: 'assist', icon: '🆘', label: 'Socorro / Auxílio' },
            { type: 'loot', icon: '💎', label: 'Espólio Valioso' },
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
            var msg = (e && e.message && e.message.indexOf('429') !== -1)
                ? 'Você está sinalizando rápido demais. Aguarde alguns instantes.'
                : ('Erro ao enviar ping: ' + e.message);
            if (global.vToast) global.vToast(msg, 'warn');
        }
    }

    function _renderPingWave(ping) {
        var el = document.createElement('div');
        el.className = 'v-party-map-ping ping-' + (ping.ping_type || 'focus');
        var ico = '🎯';
        if (ping.ping_type === 'danger') ico = '⚠️';
        else if (ping.ping_type === 'march') ico = '🚶';
        else if (ping.ping_type === 'assist') ico = '🆘';
        else if (ping.ping_type === 'loot') ico = '💎';
        el.innerHTML = ico;

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

    // ── Modal de Proezas de Comitiva (Regra Soberana #24) ────────────────────────

    function _openPartyFeatModal() {
        _closeModal();

        var overlay = document.createElement('div');
        overlay.className = 'v-party-modal-overlay';
        overlay.id = 'v-party-feat-modal';

        var card = document.createElement('div');
        card.className = 'v-party-modal-card';

        var feats = [
            {
                id: 'alento_coletivo',
                title: 'Alento Coletivo',
                subtitle: 'Proeza de Comitiva • Cura Coordenada D&D 5e',
                icon: '💚',
                explanation: 'A comitiva canaliza a inspiração mútua para reerguer as forças de todos os companheiros vivos.',
                consequences: 'Cura instantânea de 2d6 + 3 PV para cada aventureiro vivo do grupo e estabiliza companheiros caídos. Consome 100 pontos de Inspiração.',
            },
            {
                id: 'investida_coordenada',
                title: 'Investida Coordenada',
                subtitle: 'Proeza de Comitiva • Mobilidade Tática Coletiva',
                icon: '⚡',
                explanation: 'O grupo sincroniza sua marcha em formação de assalto unificada.',
                consequences: 'Concede +3 metros (2 hexágonos) de deslocamento adicional para todos os membros na rodada e ignora terreno difícil. Consome 100 pontos de Inspiração.',
            },
            {
                id: 'vontade_inabalavel',
                title: 'Vontade Inabalável',
                subtitle: 'Proeza de Comitiva • Blindagem Moral e Espiritual',
                icon: '🛡️',
                explanation: 'A comitiva cerra fileiras e une suas vontades em determinação de ferro.',
                consequences: 'Concede Vantagem em todas as jogadas de proteção e salvaguarda por 1 rodada inteira. Consome 100 pontos de Inspiração.',
            },
        ];

        var html = '';
        html += '<div class="v-party-modal-header">';
        html += '  <div class="v-party-modal-title">✨ Conclamar Proeza de Comitiva</div>';
        html += '  <button type="button" class="v-party-icon-btn" id="v-feat-close">✖</button>';
        html += '</div>';
        html += '<div class="v-party-modal-body">';
        html += '  <p style="color:#d5c7b3; font-size:12px;">A sinergia e cooperação da equipe atingiram o ápice (100/100). Selecione a Proeza a ser conclamada:</p>';

        for (var i = 0; i < feats.length; i++) {
            var f = feats[i];
            html += '<div class="v-party-feat-card" style="background:rgba(30,22,16,0.85); border:1px solid rgba(196,149,58,0.3); border-radius:6px; padding:10px; margin-bottom:8px;">';
            html += '  <div style="font-size:13px; font-weight:700; color:#f3dfa2;">' + f.icon + ' ' + f.title + '</div>';
            html += '  <div style="font-size:10px; color:#a09078; text-transform:uppercase;">' + f.subtitle + '</div>';
            html += '  <div style="margin-top:6px; font-size:11px; color:#e0d2c0;"><strong>O Que Está Sendo Escolhido:</strong> ' + f.explanation + '</div>';
            html += '  <div style="margin-top:4px; font-size:11px; color:#c4953a;"><strong>Benefícios & Consequências:</strong> ' + f.consequences + '</div>';
            html += '  <div style="display:flex; gap:8px; margin-top:8px;">';
            html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-need v-btn-trigger-feat" data-feat-id="' + f.id + '" style="flex:1; padding:8px;">✔ Conclamar ' + f.title + '</button>';
            html += '  </div>';
            html += '</div>';
        }

        html += '  <button type="button" class="v-party-loot-btn v-party-loot-btn-pass" id="v-feat-back" style="width:100%; padding:8px; margin-top:4px;">← Voltar ao Jogo</button>';
        html += '</div>';

        card.innerHTML = html;
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        var closeBtn = document.getElementById('v-feat-close');
        if (closeBtn) closeBtn.onclick = _closeModal;
        var backBtn = document.getElementById('v-feat-back');
        if (backBtn) backBtn.onclick = _closeModal;

        var triggerBtns = card.querySelectorAll('.v-btn-trigger-feat');
        for (var k = 0; k < triggerBtns.length; k++) {
            triggerBtns[k].onclick = async function (ev) {
                var fId = ev.currentTarget.getAttribute('data-feat-id');
                _closeModal();
                try {
                    var res = await _request('/api/party/feat/trigger', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        feat_id: fId,
                    });
                    if (global.vToast) global.vToast('Proeza conclamada com sucesso!', 'ok');
                    await _pollState();
                } catch (err) {
                    if (global.vToast) global.vToast('Falha ao conclamar proeza: ' + err.message, 'err');
                }
            };
        }
    }

    // ── Modal de Mochila Compartilhada da Comitiva (Shared Stash) ───────────────

    function _openSharedStashModal() {
        _closeModal();

        var overlay = document.createElement('div');
        overlay.className = 'v-party-modal-overlay';
        overlay.id = 'v-party-stash-modal';

        var card = document.createElement('div');
        card.className = 'v-party-modal-card';

        var stash = (_partyState && _partyState.shared_stash) ? _partyState.shared_stash : [];

        var html = '';
        html += '<div class="v-party-modal-header">';
        html += '  <div class="v-party-modal-title">🎒 Baú Compartilhado da Comitiva</div>';
        html += '  <button type="button" class="v-party-icon-btn" id="v-stash-close">✖</button>';
        html += '</div>';
        html += '<div class="v-party-modal-body">';
        html += '  <p style="color:#d5c7b3; font-size:12px;">Recursos comuns (poções, tochas, pergaminhos) partilhados livremente entre os aventureiros da comitiva.</p>';

        if (stash.length === 0) {
            html += '  <div style="text-align:center; padding:16px; color:#888; font-size:12px;">O baú compartilhado está vazio no momento.</div>';
        } else {
            html += '  <div style="display:flex; flex-direction:column; gap:6px; max-height:220px; overflow-y:auto;">';
            for (var i = 0; i < stash.length; i++) {
                var it = stash[i];
                html += '<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(30,22,16,0.8); border:1px solid rgba(196,149,58,0.25); border-radius:5px; padding:6px 10px;">';
                html += '  <div>';
                html += '    <div style="font-size:12px; font-weight:700; color:#f3dfa2;">' + it.name + ' <span style="color:#aaa;">(x' + it.quantity + ')</span></div>';
                html += '    <div style="font-size:10px; color:#888;">' + it.item_type + '</div>';
                html += '  </div>';
                html += '  <button type="button" class="v-party-loot-btn v-party-loot-btn-need v-btn-take-stash" data-item-id="' + it.item_id + '" style="padding:4px 10px; font-size:11px;">Pegar 1</button>';
                html += '</div>';
            }
            html += '  </div>';
        }

        html += '  <button type="button" class="v-party-loot-btn v-party-loot-btn-pass" id="v-stash-back" style="width:100%; padding:8px; margin-top:8px;">← Voltar</button>';
        html += '</div>';

        card.innerHTML = html;
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        var closeBtn = document.getElementById('v-stash-close');
        if (closeBtn) closeBtn.onclick = _closeModal;
        var backBtn = document.getElementById('v-stash-back');
        if (backBtn) backBtn.onclick = _closeModal;

        var takeBtns = card.querySelectorAll('.v-btn-take-stash');
        for (var k = 0; k < takeBtns.length; k++) {
            takeBtns[k].onclick = async function (ev) {
                var itId = ev.currentTarget.getAttribute('data-item-id');
                try {
                    await _request('/api/party/stash/transfer', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        item_id: itId,
                        quantity: 1,
                        action_mode: 'stash_to_player',
                    });
                    if (global.vToast) global.vToast('Item retirado para sua mochila!', 'ok');
                    await _pollState();
                    _openSharedStashModal();
                } catch (e) {
                    if (global.vToast) global.vToast('Erro ao pegar item: ' + e.message, 'err');
                }
            };
        }
    }

    // ── Painel de Acampamento & Descanso da Comitiva (PHB p. 186 & Regra #24) ───

    function _openCampRestModal() {
        _closeModal();

        var overlay = document.createElement('div');
        overlay.className = 'v-party-modal-overlay';
        overlay.id = 'v-party-camp-modal';

        var card = document.createElement('div');
        card.className = 'v-party-modal-card v-party-camp-card';

        var html = '';
        html += '<div class="v-party-modal-header">';
        html += '  <div class="v-party-modal-title">🏕️ Acampamento & Descanso da Comitiva</div>';
        html += '  <button type="button" class="v-party-icon-btn" id="v-camp-close">✖</button>';
        html += '</div>';
        html += '<div class="v-party-modal-body">';
        html += '  <p style="font-size:12px; color:#c7b59d; margin-top:0;">';
        html += '    Conforme as regras do Livro do Jogador (D&D 5e PHB p. 186), descansar em grupo restaura a vitalidade física e mental dos aventureiros.';
        html += '  </p>';

        // O Que Está Sendo Escolhido (Regra #24)
        html += '  <div class="v-party-camp-explainer">';
        html += '    <div class="v-party-camp-block">';
        html += '      <div class="v-party-camp-block-title">⏳ Opção 1: Descanso Curto (1 Hora)</div>';
        html += '      <div class="v-party-camp-block-desc"><strong>O Que Está Sendo Escolhido:</strong> Um período de pausa ligeira e provisões rápidas. Cada aventureiro pode gastar Dados de Vida (1dHD + CON) para regenerar PV. Classes como Bruxo e Monge restauram suas magias e Ki inteiramente.</div>';
        html += '      <div class="v-party-camp-block-benefit">✔ <strong>Benefícios:</strong> Recuperação ágil de PV sem avançar o relógio do dia; restaura recursos táticos de classe.</div>';
        html += '      <div class="v-party-camp-block-risk">⚠️ <strong>Limitação:</strong> Consome os Dados de Vida disponíveis do personagem até o próximo Descanso Longo.</div>';
        html += '      <button type="button" class="v-party-loot-btn v-party-loot-btn-greed" id="v-camp-propose-short" style="margin-top:8px; padding:8px; width:100%;">';
        html += '        ✔ Propor Descanso Curto (1h)';
        html += '      </button>';
        html += '    </div>';

        html += '    <div class="v-party-camp-block" style="margin-top:10px;">';
        html += '      <div class="v-party-camp-block-title">🌙 Opção 2: Descanso Longo (8 Horas)</div>';
        html += '      <div class="v-party-camp-block-desc"><strong>O Que Está Sendo Escolhido:</strong> Um repouso solene e prolongado (mínimo 6h de sono e 2h de vigília leve). Restaura TODOS os Pontos de Vida (PV) e Pontos de Mana (MP) ao máximo, remove 1 nível de exaustão e define escala de sentinelas noturnas.</div>';
        html += '      <div class="v-party-camp-block-benefit">✔ <strong>Benefícios:</strong> Vitalidade 100% restaurada para todos os companheiros vivos; recuperação de metade dos Dados de Vida totais.</div>';
        html += '      <div class="v-party-camp-block-risk">⚠️ <strong>Atenção:</strong> Exige consenso da comitiva; pode ser interrompido por encontros hostis se a vigília falhar.</div>';
        html += '      <button type="button" class="v-party-loot-btn v-party-loot-btn-need" id="v-camp-propose-long" style="margin-top:8px; padding:8px; width:100%;">';
        html += '        ✔ Propor Descanso Longo (8h)';
        html += '      </button>';
        html += '    </div>';
        html += '  </div>';

        html += '  <div style="margin-top:12px; display:flex; justify-content:flex-end;">';
        html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-pass" id="v-camp-back" style="padding:8px 16px;">';
        html += '      ← Voltar à Exploração';
        html += '    </button>';
        html += '  </div>';

        html += '</div>';

        card.innerHTML = html;
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        var closeBtn = document.getElementById('v-camp-close');
        if (closeBtn) closeBtn.onclick = _closeModal;
        var backBtn = document.getElementById('v-camp-back');
        if (backBtn) backBtn.onclick = _closeModal;

        var btnShort = document.getElementById('v-camp-propose-short');
        if (btnShort) {
            btnShort.onclick = async function () {
                _closeModal();
                try {
                    await _request('/api/party/camp/propose', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        rest_type: 'short',
                        hit_dice: 1,
                    });
                    if (global.vToast) global.vToast('Proposta de Descanso Curto enviada à comitiva!', 'ok');
                } catch (e) {
                    if (global.vToast) global.vToast('Erro ao propor descanso: ' + e.message, 'err');
                }
            };
        }

        var btnLong = document.getElementById('v-camp-propose-long');
        if (btnLong) {
            btnLong.onclick = async function () {
                _closeModal();
                try {
                    await _request('/api/party/camp/propose', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        rest_type: 'long',
                    });
                    if (global.vToast) global.vToast('Proposta de Descanso Longo enviada à comitiva!', 'ok');
                } catch (e) {
                    if (global.vToast) global.vToast('Erro ao propor descanso: ' + e.message, 'err');
                }
            };
        }
    }

    // ── Modal de Votação de Descanso da Comitiva (Consenso D&D 5e) ───────────────

    function _showCampRestVoteModal(proposal) {
        if (!proposal) return;
        _closeModal();

        var overlay = document.createElement('div');
        overlay.className = 'v-party-modal-overlay';
        overlay.id = 'v-party-camp-vote-modal';

        var card = document.createElement('div');
        card.className = 'v-party-modal-card';

        var isLong = (proposal.rest_type === 'long');
        var proposer = proposal.proposer_name || 'Um companheiro';

        var html = '';
        html += '<div class="v-party-modal-header">';
        html += '  <div class="v-party-modal-title">🏕️ Proposta de ' + (isLong ? 'Descanso Longo (8h)' : 'Descanso Curto (1h)') + '</div>';
        html += '</div>';
        html += '<div class="v-party-modal-body">';
        html += '  <p><strong>' + proposer + '</strong> propôs um <strong>' + (isLong ? 'Descanso Longo de 8 Horas' : 'Descanso Curto de 1 Hora') + '</strong> para a comitiva.</p>';
        html += '  <div class="v-party-camp-explainer">';
        if (isLong) {
            html += '    <p style="font-size:12px; color:#e0d0b8;">✔ <strong>Efeito:</strong> Recuperação de 100% dos PV e Mana para todos, remoção de exaustão e escala de sentinelas (PHB p. 186).</p>';
        } else {
            html += '    <p style="font-size:12px; color:#e0d0b8;">✔ <strong>Efeito:</strong> Recuperação de PV gastando Dados de Vida (1dHD + CON) e recuperação rápida de recursos.</p>';
            html += '    <div style="margin:8px 0; font-size:12px;">';
            html += '      <label>Dados de Vida a gastar: </label>';
            html += '      <select id="v-camp-dice-select" style="background:#1b1510; color:#e0d0b8; border:1px solid #c4953a; border-radius:4px; padding:2px 6px;">';
            var maxDice = Math.max(1, _cfg.level || 1);
            for (var d = 1; d <= maxDice; d++) {
                html += '        <option value="' + d + '">' + d + ' Dado(s) de Vida</option>';
            }
            html += '      </select>';
            html += '    </div>';
        }
        html += '  </div>';

        html += '  <div style="display:flex; gap:8px; margin-top:12px;">';
        html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-need" id="v-camp-vote-accept" style="flex:1; padding:10px;">';
        html += '      ✔ Aceitar Descanso';
        html += '    </button>';
        html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-pass" id="v-camp-vote-decline" style="flex:1; padding:10px;">';
        html += '      ✖ Recusar / Continuar';
        html += '    </button>';
        html += '  </div>';
        html += '</div>';

        card.innerHTML = html;
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        var btnAccept = document.getElementById('v-camp-vote-accept');
        if (btnAccept) {
            btnAccept.onclick = async function () {
                var diceInp = document.getElementById('v-camp-dice-select');
                var dVal = diceInp ? parseInt(diceInp.value, 10) : 1;
                _closeModal();
                try {
                    await _request('/api/party/camp/vote', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        proposal_id: proposal.proposal_id,
                        choice: 'accept',
                        hit_dice: dVal,
                    });
                    if (global.vToast) global.vToast('Voto de descanso registrado!', 'ok');
                } catch (e) {
                    if (global.vToast) global.vToast('Falha no voto de descanso: ' + e.message, 'err');
                }
            };
        }

        var btnDecline = document.getElementById('v-camp-vote-decline');
        if (btnDecline) {
            btnDecline.onclick = async function () {
                _closeModal();
                try {
                    await _request('/api/party/camp/vote', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        proposal_id: proposal.proposal_id,
                        choice: 'decline',
                    });
                    if (global.vToast) global.vToast('Você recusou a proposta de descanso.', 'warn');
                } catch (e) {
                    if (global.vToast) global.vToast('Falha ao recusar: ' + e.message, 'err');
                }
            };
        }
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
                html += '    <div style="display:flex; align-items:center; gap:6px;">';
                if (mem.uid !== _cfg.uid) {
                    html += '      <button type="button" class="v-party-trade-init-btn" data-trade-uid="' + mem.uid + '" title="Trocar Itens e Moedas">⚖️ Negociar</button>';
                }
                html += '      <span style="font-size:11px; color:' + (mem.ready ? '#4caf50' : '#ffa000') + ';">' + (mem.ready ? '✓ Pronto' : '⏳ Aguardando') + '</span>';
                html += '    </div>';
                html += '  </div>';
            }
            html += '  </div>';

            // Formação Tática de Marcha (Baldur's Gate / Pillars of Eternity)
            var currentFormation = _partyState.marching_formation || 'line';
            var isLeader = (_partyState.leader_uid === _cfg.uid || _partyState.is_leader);

            var FORMATIONS_DICT = {
                line: { name: 'Linha Padrão', icon: '🛡️', benefit: 'Retaguarda ganha +2 CA de cobertura contra ataques à distância (PHB p. 196).' },
                wedge: { name: 'Cunha de Assalto', icon: '⚔️', benefit: 'Toda a comitiva recebe +1 de bônus no ataque na 1ª rodada de combate.' },
                protect: { name: 'Proteção ao Núcleo', icon: '🧙', benefit: 'Conjuradores no centro ganham Vantagem em salvaguardas de Concentração.' },
                scattered: { name: 'Marcha Dispersa', icon: '🌫️', benefit: 'Espaçamento aberto: Vantagem em DES contra magias ou armadilhas de área.' }
            };

            html += '  <div class="v-party-formation-box">';
            html += '    <div class="v-party-formation-title">';
            html += '      <span>🧭 Formação Tática de Marcha</span>';
            html += '      <span class="v-party-formation-badge">' + (FORMATIONS_DICT[currentFormation] ? FORMATIONS_DICT[currentFormation].name : currentFormation) + '</span>';
            html += '    </div>';

            if (isLeader) {
                html += '    <div class="v-party-formation-grid">';
                var fKeys = ['line', 'wedge', 'protect', 'scattered'];
                for (var fI = 0; fI < fKeys.length; fI++) {
                    var fKey = fKeys[fI];
                    var fData = FORMATIONS_DICT[fKey];
                    var isAct = (fKey === currentFormation);
                    html += '      <button type="button" class="v-party-formation-btn ' + (isAct ? 'active' : '') + '" data-formation-key="' + fKey + '">';
                    html += '        <strong>' + fData.icon + ' ' + fData.name + '</strong>';
                    html += '        <span class="v-party-formation-benefit">' + fData.benefit + '</span>';
                    html += '      </button>';
                }
                html += '    </div>';
            } else {
                var curData = FORMATIONS_DICT[currentFormation] || FORMATIONS_DICT.line;
                html += '    <div style="font-size:11px; color:#c7b59d; margin-top:2px;">';
                html += '      <strong>' + curData.icon + ' ' + curData.name + ':</strong> ' + curData.benefit;
                html += '      <div style="font-size:9.5px; color:#888; margin-top:2px;">(Definido pelo líder da comitiva)</div>';
                html += '    </div>';
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
            var tradeBtns = card.querySelectorAll('.v-party-trade-init-btn');
            for (var tIdx = 0; tIdx < tradeBtns.length; tIdx++) {
                tradeBtns[tIdx].onclick = async function (ev) {
                    var targetUid = parseInt(ev.currentTarget.getAttribute('data-trade-uid'), 10);
                    _closeModal();
                    try {
                        var res = await _request('/api/party/trade/request', {
                            session_id: _partyState.session_id,
                            user_id: _cfg.uid,
                            target_uid: targetUid,
                        });
                        if (res && res.ok && res.trade) {
                            _partyState.active_trade = res.trade;
                            _openTradeModal(res.trade);
                            if (global.vToast) global.vToast('Convite de negociação enviado!', 'info');
                        }
                    } catch (err) {
                        if (global.vToast) global.vToast('Falha ao negociar: ' + err.message, 'err');
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

            if (isLeader) {
                var formBtns = card.querySelectorAll('.v-party-formation-btn');
                for (var fbI = 0; fbI < formBtns.length; fbI++) {
                    formBtns[fbI].onclick = async function (ev) {
                        var targetF = ev.currentTarget.getAttribute('data-formation-key');
                        if (!targetF || targetF === currentFormation) return;
                        try {
                            var fRes = await _request('/api/party/formation/set', {
                                session_id: _partyState.session_id,
                                user_id: _cfg.uid,
                                formation: targetF,
                            });
                            if (fRes && fRes.ok) {
                                _partyState.marching_formation = targetF;
                                if (global.vToast) global.vToast('Formação tática alterada para ' + (FORMATIONS_DICT[targetF] ? FORMATIONS_DICT[targetF].name : targetF) + '!', 'ok');
                                _openLobbyModal();
                            }
                        } catch (err) {
                            if (global.vToast) global.vToast('Erro ao alterar formação: ' + err.message, 'warn');
                        }
                    };
                }
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

    // ── Negociação Bilateral Segura em Duas Etapas (Two-Phase Commit Protocol) ─

    function _closeTradeModal() {
        var el = document.getElementById('v-party-trade-modal');
        if (el) el.remove();
        var invEl = document.getElementById('v-party-trade-invite-modal');
        if (invEl) invEl.remove();
    }

    function _showTradeInviteModal(trade) {
        _closeTradeModal();

        var overlay = document.createElement('div');
        overlay.className = 'v-party-modal-overlay';
        overlay.id = 'v-party-trade-invite-modal';

        var card = document.createElement('div');
        card.className = 'v-party-modal-card';

        var html = '';
        html += '<div class="v-party-modal-header">';
        html += '  <div class="v-party-modal-title">⚖️ Proposta de Negociação Direta</div>';
        html += '</div>';
        html += '<div class="v-party-modal-body">';
        html += '  <p style="color:#f0e6d2; font-size:13px;">O companheiro <strong>' + (trade.p1_name || 'Aventureiro') + '</strong> convidou você para negociar itens e moedas de ouro diretamente.</p>';
        html += '  <p style="font-size:11px; color:#c7b59d;">As ofertas são bloqueadas em duas fases protegidas antes da confirmação mútua, prevenindo perdas ou trocas desonestas.</p>';
        html += '  <div style="display:flex; gap:8px; margin-top:12px;">';
        html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-need" id="v-trade-inv-accept" style="flex:1; padding:10px;">✔ Aceitar Negociação</button>';
        html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-pass" id="v-trade-inv-decline" style="flex:1; padding:10px;">✖ Recusar</button>';
        html += '  </div>';
        html += '</div>';

        card.innerHTML = html;
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        var btnAcc = document.getElementById('v-trade-inv-accept');
        if (btnAcc) {
            btnAcc.onclick = async function () {
                _closeTradeModal();
                try {
                    var res = await _request('/api/party/trade/respond', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        trade_id: trade.trade_id,
                        accept: true,
                    });
                    if (res && res.ok && res.trade) {
                        _partyState.active_trade = res.trade;
                        _openTradeModal(res.trade);
                    }
                } catch (err) {
                    if (global.vToast) global.vToast('Erro ao aceitar negociação: ' + err.message, 'err');
                }
            };
        }

        var btnDec = document.getElementById('v-trade-inv-decline');
        if (btnDec) {
            btnDec.onclick = async function () {
                _closeTradeModal();
                try {
                    await _request('/api/party/trade/respond', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        trade_id: trade.trade_id,
                        accept: false,
                    });
                } catch (_) {}
            };
        }
    }

    function _openTradeModal(trade) {
        _closeModal();
        _closeTradeModal();

        var overlay = document.createElement('div');
        overlay.className = 'v-party-modal-overlay';
        overlay.id = 'v-party-trade-modal';

        var card = document.createElement('div');
        card.className = 'v-party-modal-card v-party-trade-card';
        card.id = 'v-party-trade-card-inner';

        card.innerHTML = _buildTradeModalHtml(trade);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        _bindTradeModalEvents(card, trade);
    }

    function _refreshTradeModal(trade) {
        var card = document.getElementById('v-party-trade-card-inner');
        if (!card) return;
        card.innerHTML = _buildTradeModalHtml(trade);
        _bindTradeModalEvents(card, trade);
    }

    function _buildTradeModalHtml(trade) {
        var isP1 = (_cfg.uid === trade.p1_uid);
        var myItems = isP1 ? (trade.p1_items || []) : (trade.p2_items || []);
        var myGold = isP1 ? (trade.p1_gold || 0) : (trade.p2_gold || 0);
        var myLocked = isP1 ? trade.p1_locked : trade.p2_locked;
        var myConfirmed = isP1 ? trade.p1_confirmed : trade.p2_confirmed;

        var partnerName = isP1 ? trade.p2_name : trade.p1_name;
        var partnerItems = isP1 ? (trade.p2_items || []) : (trade.p1_items || []);
        var partnerGold = isP1 ? (trade.p2_gold || 0) : (trade.p1_gold || 0);
        var partnerLocked = isP1 ? trade.p2_locked : trade.p1_locked;

        var bothLocked = (myLocked && partnerLocked);

        var html = '';
        html += '<div class="v-party-modal-header">';
        html += '  <div class="v-party-modal-title">⚖️ Negociação Segura (Two-Phase Commit)</div>';
        html += '  <button type="button" class="v-party-icon-btn" id="v-trade-cancel-x">✖</button>';
        html += '</div>';

        html += '<div class="v-party-modal-body">';
        html += '  <div class="v-party-trade-grid">';

        // Coluna da Esquerda: Sua Oferta
        html += '    <div class="v-party-trade-col">';
        html += '      <div class="v-party-trade-col-header">';
        html += '        <span>Sua Oferta</span>';
        html += '        <span style="font-size:10px; color:#beb09b;">(' + _cfg.name + ')</span>';
        html += '      </div>';
        html += '      <div class="v-party-trade-lock-badge ' + (myLocked ? 'locked' : 'unlocked') + '">';
        html += '        ' + (myLocked ? '🔒 OFERTA TRAVADA' : '🔓 AJUSTANDO OFERTA');
        html += '      </div>';
        html += '      <div style="font-size:10px; color:#a09078; font-weight:700;">Itens Ofertados:</div>';
        html += '      <div class="v-party-trade-items" id="v-trade-my-items">';
        if (myItems.length === 0) {
            html += '      <div style="font-size:11px; color:#777; text-align:center; padding:10px;">Nenhum item ofertado</div>';
        } else {
            for (var i = 0; i < myItems.length; i++) {
                var itm = myItems[i];
                html += '    <div class="v-party-trade-item-pill">';
                html += '      <span>' + (itm.name || itm.item_id) + ' x' + (itm.quantity || 1) + '</span>';
                if (!myLocked) {
                    html += '  <button type="button" class="v-party-icon-btn v-trade-remove-item" data-idx="' + i + '" style="font-size:10px; padding:1px 4px;">✕</button>';
                }
                html += '    </div>';
            }
        }
        html += '      </div>';

        html += '      <div class="v-party-trade-gold-box">';
        html += '        <span>💰 Moedas de Ouro:</span>';
        if (!myLocked) {
            html += '    <input type="number" id="v-trade-gold-inp" min="0" value="' + myGold + '" style="width:60px; background:#18120d; border:1px solid #ffd700; color:#ffd700; text-align:right; border-radius:4px; padding:2px;" />';
        } else {
            html += '    <strong style="color:#ffd700;">' + myGold + ' PO</strong>';
        }
        html += '      </div>';

        if (!myLocked) {
            html += '    <div style="display:flex; gap:6px;">';
            html += '      <button type="button" class="v-party-loot-btn" id="v-trade-add-item-btn" style="flex:1; padding:6px; font-size:11px;">+ Item da Mochila</button>';
            html += '      <button type="button" class="v-party-loot-btn v-party-loot-btn-need" id="v-trade-lock-btn" style="flex:1; padding:6px; font-size:11px;">🔒 Travar Oferta</button>';
            html += '    </div>';
        } else {
            html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-pass" id="v-trade-unlock-btn" style="padding:6px; font-size:11px;">🔓 Destravar e Modificar</button>';
        }
        html += '    </div>';

        // Coluna da Direita: Oferta do Parceiro
        html += '    <div class="v-party-trade-col">';
        html += '      <div class="v-party-trade-col-header">';
        html += '        <span>Oferta do Companheiro</span>';
        html += '        <span style="font-size:10px; color:#beb09b;">(' + partnerName + ')</span>';
        html += '      </div>';
        html += '      <div class="v-party-trade-lock-badge ' + (partnerLocked ? 'locked' : 'unlocked') + '">';
        html += '        ' + (partnerLocked ? '🔒 OFERTA TRAVADA' : '⏳ AJUSTANDO OFERTA');
        html += '      </div>';
        html += '      <div style="font-size:10px; color:#a09078; font-weight:700;">Itens Ofertados:</div>';
        html += '      <div class="v-party-trade-items">';
        if (partnerItems.length === 0) {
            html += '      <div style="font-size:11px; color:#777; text-align:center; padding:10px;">Nenhum item ofertado</div>';
        } else {
            for (var j = 0; j < partnerItems.length; j++) {
                var pItm = partnerItems[j];
                html += '    <div class="v-party-trade-item-pill">';
                html += '      <span>' + (pItm.name || pItm.item_id) + ' x' + (pItm.quantity || 1) + '</span>';
                html += '    </div>';
            }
        }
        html += '      </div>';

        html += '      <div class="v-party-trade-gold-box">';
        html += '        <span>💰 Moedas de Ouro:</span>';
        html += '        <strong style="color:#ffd700;">' + partnerGold + ' PO</strong>';
        html += '      </div>';

        html += '      <div style="font-size:10px; color:#888; text-align:center; margin-top:auto; padding:4px;">';
        html += '        ' + (partnerLocked ? '✔ Parceiro pronto para confirmar' : 'Aguardando o parceiro travar');
        html += '      </div>';
        html += '    </div>';

        html += '  </div>';

        // Barra Inferior de Ação Mútua
        html += '  <div style="display:flex; gap:8px; margin-top:8px;">';
        if (bothLocked) {
            html += '  <button type="button" class="v-party-loot-btn v-party-loot-btn-need" id="v-trade-confirm-btn" style="flex:2; padding:12px; font-size:13px;" ' + (myConfirmed ? 'disabled' : '') + '>';
            html += '    ' + (myConfirmed ? '⏳ Aguardando confirmação de ' + partnerName : '✔ Confirmar Troca Bilateral');
            html += '  </button>';
        } else {
            html += '  <div style="flex:2; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:6px; font-size:11px; color:#a09078; display:flex; align-items:center; justify-content:center; text-align:center; padding:8px;">';
            html += '    Ambos os aventureiros devem travar suas ofertas antes de confirmar a troca.';
            html += '  </div>';
        }
        html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-pass" id="v-trade-cancel-btn" style="flex:1; padding:10px;">';
        html += '      ✖ Cancelar';
        html += '    </button>';
        html += '  </div>';

        html += '</div>';
        return html;
    }

    function _bindTradeModalEvents(card, trade) {
        var tid = trade.trade_id;
        var isP1 = (_cfg.uid === trade.p1_uid);
        var myItems = isP1 ? (trade.p1_items || []) : (trade.p2_items || []);

        var btnCancel = card.querySelector('#v-trade-cancel-btn');
        var btnCancelX = card.querySelector('#v-trade-cancel-x');
        var cancelHandler = async function () {
            _closeTradeModal();
            try {
                await _request('/api/party/trade/cancel', {
                    session_id: _partyState.session_id,
                    user_id: _cfg.uid,
                    trade_id: tid,
                });
            } catch (_) {}
        };
        if (btnCancel) btnCancel.onclick = cancelHandler;
        if (btnCancelX) btnCancelX.onclick = cancelHandler;

        var btnLock = card.querySelector('#v-trade-lock-btn');
        if (btnLock) {
            btnLock.onclick = async function () {
                var gInp = card.querySelector('#v-trade-gold-inp');
                var gVal = gInp ? parseInt(gInp.value, 10) || 0 : 0;
                try {
                    await _request('/api/party/trade/stage', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        trade_id: tid,
                        items: myItems,
                        gold: gVal,
                    });
                    var res = await _request('/api/party/trade/lock', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        trade_id: tid,
                        locked: true,
                    });
                    if (res && res.trade) {
                        _partyState.active_trade = res.trade;
                        _refreshTradeModal(res.trade);
                    }
                } catch (err) {
                    if (global.vToast) global.vToast('Erro ao travar oferta: ' + err.message, 'err');
                }
            };
        }

        var btnUnlock = card.querySelector('#v-trade-unlock-btn');
        if (btnUnlock) {
            btnUnlock.onclick = async function () {
                try {
                    var res = await _request('/api/party/trade/lock', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        trade_id: tid,
                        locked: false,
                    });
                    if (res && res.trade) {
                        _partyState.active_trade = res.trade;
                        _refreshTradeModal(res.trade);
                    }
                } catch (err) {
                    if (global.vToast) global.vToast('Erro ao destravar: ' + err.message, 'err');
                }
            };
        }

        var btnConfirm = card.querySelector('#v-trade-confirm-btn');
        if (btnConfirm) {
            btnConfirm.onclick = function () {
                _showTradeConfirmDecision(trade);
            };
        }

        var btnAddItem = card.querySelector('#v-trade-add-item-btn');
        if (btnAddItem) {
            btnAddItem.onclick = function () {
                _promptTradeItemSelector(trade);
            };
        }

        var rmBtns = card.querySelectorAll('.v-trade-remove-item');
        for (var r = 0; r < rmBtns.length; r++) {
            rmBtns[r].onclick = async function (ev) {
                var idx = parseInt(ev.currentTarget.getAttribute('data-idx'), 10);
                myItems.splice(idx, 1);
                var gInp = card.querySelector('#v-trade-gold-inp');
                var gVal = gInp ? parseInt(gInp.value, 10) || 0 : 0;
                try {
                    var res = await _request('/api/party/trade/stage', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        trade_id: tid,
                        items: myItems,
                        gold: gVal,
                    });
                    if (res && res.trade) {
                        _partyState.active_trade = res.trade;
                        _refreshTradeModal(res.trade);
                    }
                } catch (err) {
                    if (global.vToast) global.vToast('Erro ao remover item: ' + err.message, 'err');
                }
            };
        }
    }

    function _showTradeConfirmDecision(trade) {
        var isP1 = (_cfg.uid === trade.p1_uid);
        var partnerName = isP1 ? trade.p2_name : trade.p1_name;
        var myItems = isP1 ? (trade.p1_items || []) : (trade.p2_items || []);
        var myGold = isP1 ? (trade.p1_gold || 0) : (trade.p2_gold || 0);
        var partnerItems = isP1 ? (trade.p2_items || []) : (trade.p1_items || []);
        var partnerGold = isP1 ? (trade.p2_gold || 0) : (trade.p1_gold || 0);

        var modal = document.createElement('div');
        modal.className = 'v-party-modal-overlay';
        modal.id = 'v-trade-confirm-dialog';

        var card = document.createElement('div');
        card.className = 'v-party-modal-card';

        var html = '';
        html += '<div class="v-party-modal-header">';
        html += '  <div class="v-party-modal-title">✔ Confirmar Negociação Bilateral</div>';
        html += '</div>';
        html += '<div class="v-party-modal-body">';
        html += '  <div class="v-party-camp-block">';
        html += '    <div class="v-party-camp-block-title">O Que Está Sendo Escolhido:</div>';
        html += '    <div class="v-party-camp-block-desc">Você está prestes a concluir a troca atômica definitiva com <strong>' + partnerName + '</strong>.</div>';
        html += '    <div style="font-size:11px; color:#e0d0b8; margin:6px 0;">';
        html += '      <div>📤 <strong>Você Entrega:</strong> ' + myItems.length + ' item(ns) e ' + myGold + ' PO.</div>';
        html += '      <div>📥 <strong>Você Recebe:</strong> ' + partnerItems.length + ' item(ns) e ' + partnerGold + ' PO.</div>';
        html += '    </div>';
        html += '    <div class="v-party-camp-block-benefit">✔ Transação segura garantida pelo servidor autoritativo (Two-Phase Commit).</div>';
        html += '  </div>';

        html += '  <div style="display:flex; gap:8px; margin-top:12px;">';
        html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-need" id="v-trade-decision-confirm" style="flex:1; padding:10px;">✔ Concluir Troca</button>';
        html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-pass" id="v-trade-decision-back" style="flex:1; padding:10px;">← Voltar às Opções</button>';
        html += '  </div>';
        html += '</div>';

        card.innerHTML = html;
        modal.appendChild(card);
        document.body.appendChild(modal);

        card.querySelector('#v-trade-decision-back').onclick = function () {
            modal.remove();
        };

        card.querySelector('#v-trade-decision-confirm').onclick = async function () {
            modal.remove();
            try {
                var res = await _request('/api/party/trade/confirm', {
                    session_id: _partyState.session_id,
                    user_id: _cfg.uid,
                    trade_id: trade.trade_id,
                });
                if (res && res.trade) {
                    _partyState.active_trade = res.trade;
                    _refreshTradeModal(res.trade);
                }
            } catch (err) {
                if (global.vToast) global.vToast('Erro ao confirmar: ' + err.message, 'err');
            }
        };
    }

    function _promptTradeItemSelector(trade) {
        var myMember = null;
        var members = (_partyState && _partyState.members) || [];
        for (var i = 0; i < members.length; i++) {
            if (members[i].uid === _cfg.uid) { myMember = members[i]; break; }
        }
        var inv = (myMember && myMember.inventory) || [];
        if (inv.length === 0) {
            if (global.vToast) global.vToast('Sua mochila na comitiva está vazia.', 'info');
            return;
        }

        var modal = document.createElement('div');
        modal.className = 'v-party-modal-overlay';
        modal.id = 'v-trade-item-picker';

        var card = document.createElement('div');
        card.className = 'v-party-modal-card';

        var html = '<div class="v-party-modal-header"><div class="v-party-modal-title">🎒 Selecionar Item para Troca</div><button type="button" class="v-party-icon-btn" id="v-picker-close">✖</button></div>';
        html += '<div class="v-party-modal-body"><div style="display:flex; flex-direction:column; gap:6px; max-height:200px; overflow-y:auto;">';
        for (var j = 0; j < inv.length; j++) {
            var itm = inv[j];
            html += '<button type="button" class="v-party-loot-btn v-trade-pick-btn" data-id="' + itm.item_id + '" data-name="' + (itm.name || itm.item_id) + '" style="padding:8px 10px; text-align:left; align-items:flex-start;">';
            html += '  <div style="font-weight:700;">' + (itm.name || itm.item_id) + '</div>';
            html += '  <div style="font-size:10px; color:#c7b59d;">Quantidade disponível: ' + (itm.quantity || 1) + '</div>';
            html += '</button>';
        }
        html += '</div></div>';

        card.innerHTML = html;
        modal.appendChild(card);
        document.body.appendChild(modal);

        card.querySelector('#v-picker-close').onclick = function () { modal.remove(); };

        var pickBtns = card.querySelectorAll('.v-trade-pick-btn');
        for (var p = 0; p < pickBtns.length; p++) {
            pickBtns[p].onclick = async function (ev) {
                var itmId = ev.currentTarget.getAttribute('data-id');
                var itmName = ev.currentTarget.getAttribute('data-name');
                modal.remove();

                var isP1 = (_cfg.uid === trade.p1_uid);
                var myItems = isP1 ? (trade.p1_items || []) : (trade.p2_items || []);
                myItems.push({ item_id: itmId, name: itmName, quantity: 1 });

                var gInp = document.querySelector('#v-trade-gold-inp');
                var gVal = gInp ? parseInt(gInp.value, 10) || 0 : 0;
                try {
                    var res = await _request('/api/party/trade/stage', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        trade_id: trade.trade_id,
                        items: myItems,
                        gold: gVal,
                    });
                    if (res && res.trade) {
                        _partyState.active_trade = res.trade;
                        _refreshTradeModal(res.trade);
                    }
                } catch (err) {
                    if (global.vToast) global.vToast('Erro ao ofertar item: ' + err.message, 'err');
                }
            };
        }
    }

    // ── Salvaguardas Contra a Morte e Modo Espectador (D&D 5e PHB p.197) ────────

    function _showDeathSaveModal(combatData) {
        var existing = document.getElementById('v-party-death-save-modal');
        if (existing) existing.remove();

        var meta = combatData.spectator_meta || {};
        var ds = meta.death_saves || { s: 0, f: 0 };
        var canRoll = meta.can_roll_death_save;

        var overlay = document.createElement('div');
        overlay.className = 'v-party-modal-overlay';
        overlay.id = 'v-party-death-save-modal';

        var card = document.createElement('div');
        card.className = 'v-party-modal-card v-party-death-save-card';

        var html = '';
        html += '<div class="v-party-modal-header">';
        html += '  <div class="v-party-modal-title">🔻 Salvaguarda Contra a Morte (PHB p. 197)</div>';
        html += '  <button type="button" class="v-party-icon-btn" id="v-ds-close">✖</button>';
        html += '</div>';

        html += '<div class="v-party-modal-body">';
        html += '  <p style="color:#f0dcd0; font-size:12px; margin:0 0 8px 0;">Seu aventureiro está inconsciente a 0 PV. Três sucessos estabilizam sua respiração; três falhas resultam em morte permanente.</p>';

        html += '  <div class="v-ds-track">';
        html += '    <span style="font-size:12px; font-weight:700; color:#81c784;">Sucessos (' + ds.s + '/3):</span>';
        html += '    <div class="v-ds-pips-row">';
        for (var s = 1; s <= 3; s++) {
            html += '  <div class="v-ds-pip v-ds-pip-s ' + (s <= ds.s ? 'active' : '') + '"></div>';
        }
        html += '    </div>';
        html += '  </div>';

        html += '  <div class="v-ds-track">';
        html += '    <span style="font-size:12px; font-weight:700; color:#e57373;">Falhas (' + ds.f + '/3):</span>';
        html += '    <div class="v-ds-pips-row">';
        for (var f = 1; f <= 3; f++) {
            html += '  <div class="v-ds-pip v-ds-pip-f ' + (f <= ds.f ? 'active' : '') + '"></div>';
        }
        html += '    </div>';
        html += '  </div>';

        if (canRoll) {
            html += '  <button type="button" class="v-party-loot-btn v-party-loot-btn-need" id="v-ds-roll-btn" style="width:100%; padding:12px; margin-top:10px; font-size:13px;">';
            html += '    🎲 Rolar Salvaguarda Contra a Morte (1d20)';
            html += '  </button>';
        } else {
            html += '  <div style="font-size:11px; color:#beb09b; text-align:center; padding:8px; background:rgba(0,0,0,0.3); border-radius:4px; margin-top:8px;">';
            html += '    Aguardando a sua vez na ordem de iniciativa para rolar o d20.';
            html += '  </div>';
        }

        html += '  <div style="display:flex; gap:8px; margin-top:10px;">';
        html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-greed" id="v-ds-ping-help" style="flex:1; padding:8px; font-size:11px;">🆘 Sinalizar Socorro</button>';
        html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-pass" id="v-ds-spectate-btn" style="flex:1; padding:8px; font-size:11px;">👁️ Ver Campo</button>';
        html += '  </div>';

        html += '</div>';

        card.innerHTML = html;
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        card.querySelector('#v-ds-close').onclick = function () { overlay.remove(); };
        card.querySelector('#v-ds-spectate-btn').onclick = function () { overlay.remove(); };

        var btnHelp = card.querySelector('#v-ds-ping-help');
        if (btnHelp) {
            btnHelp.onclick = function () {
                _sendPing('assist', 0, 0, 'Companheiro caído a 0 PV precisa de cura!');
                if (global.vToast) global.vToast('Alerta de socorro transmitido para a comitiva!', 'ok');
            };
        }

        var btnRoll = card.querySelector('#v-ds-roll-btn');
        if (btnRoll) {
            btnRoll.onclick = async function () {
                btnRoll.disabled = true;
                try {
                    await _request('/api/party/combat/death-save', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                    });
                    overlay.remove();
                    await _pollState();
                } catch (err) {
                    btnRoll.disabled = false;
                    if (global.vToast) global.vToast('Erro ao rolar salvaguarda: ' + err.message, 'err');
                }
            };
        }
    }

    // ── Desafios de Perícias Coletivas (D&D 4e/5e Skill Challenges) ─────────────

    function _showSkillChallengeModal(challenge) {
        var existing = document.getElementById('v-party-challenge-modal');
        if (existing) {
            _refreshSkillChallengeModal(challenge);
            return;
        }

        var overlay = document.createElement('div');
        overlay.className = 'v-party-modal-overlay';
        overlay.id = 'v-party-challenge-modal';

        var card = document.createElement('div');
        card.className = 'v-party-modal-card v-party-challenge-card';

        card.innerHTML = _buildSkillChallengeHtml(challenge);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        _bindSkillChallengeEvents(card, challenge);
    }

    function _refreshSkillChallengeModal(challenge) {
        var overlay = document.getElementById('v-party-challenge-modal');
        if (!overlay) return;
        var card = overlay.querySelector('.v-party-challenge-card');
        if (!card) return;
        card.innerHTML = _buildSkillChallengeHtml(challenge);
        _bindSkillChallengeEvents(card, challenge);
    }

    function _buildSkillChallengeHtml(challenge) {
        var sReq = challenge.required_successes || 4;
        var fMax = challenge.max_failures || 3;
        var sCur = challenge.current_successes || 0;
        var fCur = challenge.current_failures || 0;
        var timeLeft = challenge.time_left_sec != null ? challenge.time_left_sec : (challenge.time_limit_sec || 60);
        var isDone = challenge.status !== 'active';

        var html = '';
        html += '<div class="v-party-modal-header">';
        html += '  <div class="v-party-modal-title">🧭 ' + (challenge.title || 'Desafio de Perícias Coletivas') + '</div>';
        html += '  <button type="button" class="v-party-icon-btn" id="v-ch-close-x">✖</button>';
        html += '</div>';

        html += '<div class="v-party-modal-body">';
        if (challenge.description) {
            html += '  <p style="color:#f0dcd0; font-size:12px; line-height:1.4; margin:0 0 8px 0;">' + challenge.description + '</p>';
        }

        // Relógio de Progresso da Comitiva (Progress Clocks)
        html += '  <div class="v-challenge-clock-banner">';
        html += '    <div class="v-challenge-track">';
        html += '      <span style="font-size:11px; font-weight:700; color:#81c784;">Sucessos:</span>';
        for (var s = 1; s <= sReq; s++) {
            html += '    <div class="v-ch-pip-s ' + (s <= sCur ? 'active' : '') + '"></div>';
        }
        html += '    </div>';

        html += '    <div class="v-challenge-track">';
        html += '      <span style="font-size:11px; font-weight:700; color:#e57373;">Falhas:</span>';
        for (var f = 1; f <= fMax; f++) {
            html += '    <div class="v-ch-pip-f ' + (f <= fCur ? 'active' : '') + '"></div>';
        }
        html += '    </div>';

        html += '    <div style="font-size:11px; font-weight:700; color:#ffe082;">⏱️ ' + timeLeft + 's</div>';
        html += '  </div>';

        // Desfechos do Desafio
        if (challenge.status === 'victory') {
            html += '  <div style="background:rgba(46,125,50,0.25); border:1px solid #4caf50; border-radius:6px; padding:10px; text-align:center; margin:8px 0;">';
            html += '    <div style="font-size:13px; font-weight:700; color:#81c784;">🏆 Vitória da Comitiva!</div>';
            html += '    <div style="font-size:11px; color:#c8e6c9; margin-top:2px;">O obstáculo coletivo foi superado com maestria pela comitiva.</div>';
            html += '  </div>';
        } else if (challenge.status === 'partial_victory') {
            html += '  <div style="background:rgba(239,108,0,0.25); border:1px solid #ff9800; border-radius:6px; padding:10px; text-align:center; margin:8px 0;">';
            html += '    <div style="font-size:13px; font-weight:700; color:#ffb74d;">⚠️ Vitória Parcial (Sucesso com Custo)</div>';
            html += '    <div style="font-size:11px; color:#ffe0b2; margin-top:2px;">A comitiva conseguiu escapar a tempo, sofrendo apenas desgaste leve de recursos.</div>';
            html += '  </div>';
        } else if (challenge.status === 'defeat') {
            html += '  <div style="background:rgba(198,40,40,0.25); border:1px solid #f44336; border-radius:6px; padding:10px; text-align:center; margin:8px 0;">';
            html += '    <div style="font-size:13px; font-weight:700; color:#e57373;">💀 Fracasso Crítico da Comitiva</div>';
            html += '    <div style="font-size:11px; color:#ffcdd2; margin-top:2px;">O perigo ambiental cobrou seu preço, ativando armadilhas ou emboscada na câmara!</div>';
            html += '  </div>';
        }

        // Grade de Perícias Aplicáveis
        if (!isDone) {
            html += '  <div style="font-size:11px; font-weight:700; color:var(--v-gold,#c4953a); margin-top:6px; text-transform:uppercase;">Escolha sua Perícia:</div>';
            html += '  <div class="v-challenge-skills-grid">';
            var skills = challenge.skills || [];
            for (var i = 0; i < skills.length; i++) {
                var sk = skills[i];
                html += '    <button type="button" class="v-challenge-skill-btn" data-key="' + sk.skill_key + '">';
                html += '      <div style="display:flex; flex-direction:column; gap:2px;">';
                html += '        <div style="font-weight:700; font-size:12px; color:#ffe082;">🎲 ' + sk.skill_name + ' <span style="font-size:10px; color:#a1887f;">(CD ' + sk.dc + ' | ' + sk.attr.toUpperCase() + ')</span></div>';
                html += '        <div style="font-size:11px; color:#ded1be;">' + sk.description + '</div>';
                html += '      </div>';
                html += '      <div style="font-size:16px;">▸</div>';
                html += '    </button>';
            }
            html += '  </div>';

            html += '  <div style="display:flex; gap:8px; margin-top:8px;">';
            html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-greed" id="v-ch-assist-btn" style="flex:1; padding:8px; font-size:11px;">🤝 Ajudar Companheiro (Conceder Vantagem)</button>';
            html += '  </div>';
        }

        // Histórico de Ações da Comitiva
        var contribs = challenge.contributions || [];
        if (contribs.length > 0) {
            html += '  <div style="font-size:10px; font-weight:700; color:#a1887f; margin:8px 0 4px 0; text-transform:uppercase;">Últimas Ações da Comitiva:</div>';
            html += '  <div class="v-challenge-log-box">';
            for (var c = contribs.length - 1; c >= 0; c--) {
                var ev = contribs[c];
                if (ev.type === 'skill_check') {
                    var sCol = ev.success ? '#81c784' : '#e57373';
                    var sTxt = ev.success ? '✔ Sucesso' : '✖ Falha';
                    var advNote = ev.has_advantage ? ' (Vantagem)' : '';
                    html += '<div><strong>' + ev.member_name + '</strong> usou ' + ev.skill_name + advNote + ': d20=' + ev.roll + ' (Total ' + ev.total + ' vs CD ' + ev.dc + ') → <span style="color:' + sCol + '; font-weight:700;">' + sTxt + '</span></div>';
                } else if (ev.type === 'assist') {
                    html += '<div style="color:#ffd54f;">🤝 <strong>' + ev.member_name + '</strong> concedeu auxílio tático a ' + ev.target_name + '.</div>';
                } else if (ev.message) {
                    html += '<div style="color:#beb09b;">' + ev.message + '</div>';
                }
            }
            html += '  </div>';
        }

        if (isDone) {
            html += '  <button type="button" class="v-party-loot-btn v-party-loot-btn-pass" id="v-ch-done-btn" style="width:100%; padding:10px; margin-top:10px; font-size:12px;">← Continuar Exploração</button>';
        }

        html += '</div>';
        return html;
    }

    function _bindSkillChallengeEvents(card, challenge) {
        var overlay = document.getElementById('v-party-challenge-modal');

        var btnCloseX = card.querySelector('#v-ch-close-x');
        if (btnCloseX) {
            btnCloseX.onclick = function () { if (overlay) overlay.remove(); };
        }

        var btnDone = card.querySelector('#v-ch-done-btn');
        if (btnDone) {
            btnDone.onclick = function () { if (overlay) overlay.remove(); };
        }

        var skillBtns = card.querySelectorAll('.v-challenge-skill-btn');
        for (var i = 0; i < skillBtns.length; i++) {
            skillBtns[i].onclick = async function (ev) {
                var skKey = ev.currentTarget.getAttribute('data-key');
                ev.currentTarget.disabled = true;
                try {
                    var res = await _request('/api/party/challenge/contribute', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        skill_key: skKey,
                    });
                    if (res && res.challenge_state) {
                        _partyState.active_challenge = res.challenge_state;
                        _refreshSkillChallengeModal(res.challenge_state);
                    }
                    await _pollState();
                } catch (err) {
                    ev.currentTarget.disabled = false;
                    if (global.vToast) global.vToast(err.message, 'warn');
                }
            };
        }

        var btnAssist = card.querySelector('#v-ch-assist-btn');
        if (btnAssist) {
            btnAssist.onclick = function () {
                _promptChallengeAssistTarget(challenge);
            };
        }
    }

    function _promptChallengeAssistTarget(challenge) {
        var existing = document.getElementById('v-ch-assist-dialog');
        if (existing) existing.remove();

        var members = (_partyState && _partyState.members) ? _partyState.members : [];
        var eligible = [];
        for (var i = 0; i < members.length; i++) {
            if (members[i].uid !== _cfg.uid) eligible.push(members[i]);
        }

        if (eligible.length === 0) {
            if (global.vToast) global.vToast('Não há outros companheiros na comitiva para auxiliar.', 'warn');
            return;
        }

        var modal = document.createElement('div');
        modal.className = 'v-party-modal-overlay';
        modal.id = 'v-ch-assist-dialog';

        var card = document.createElement('div');
        card.className = 'v-party-modal-card';
        card.style.maxWidth = '360px';

        var html = '';
        html += '<div class="v-party-modal-header">';
        html += '  <div class="v-party-modal-title">🤝 Ação de Ajuda (PHB p. 192)</div>';
        html += '  <button type="button" class="v-party-icon-btn" id="v-ast-close">✖</button>';
        html += '</div>';
        html += '<div class="v-party-modal-body">';
        html += '  <p style="color:#ded1be; font-size:11px;">Selecione qual companheiro da comitiva receberá Vantagem no próximo teste do desafio:</p>';
        html += '  <div style="display:flex; flex-direction:column; gap:6px; margin:8px 0;">';
        for (var j = 0; j < eligible.length; j++) {
            var m = eligible[j];
            html += '    <button type="button" class="v-party-loot-btn v-ast-target-btn" data-uid="' + m.uid + '" data-name="' + (m.name || 'Companheiro') + '" style="padding:8px 10px; text-align:left;">';
            html += '      <span>' + (m.icon || '⚔️') + ' ' + (m.name || 'Companheiro') + ' (' + (m.character_class || 'Aventureiro') + ')</span>';
            html += '    </button>';
        }
        html += '  </div>';
        html += '</div>';

        card.innerHTML = html;
        modal.appendChild(card);
        document.body.appendChild(modal);

        card.querySelector('#v-ast-close').onclick = function () { modal.remove(); };

        var tBtns = card.querySelectorAll('.v-ast-target-btn');
        for (var k = 0; k < tBtns.length; k++) {
            tBtns[k].onclick = async function (ev) {
                var targetUid = parseInt(ev.currentTarget.getAttribute('data-uid'), 10);
                var targetName = ev.currentTarget.getAttribute('data-name');
                modal.remove();
                try {
                    var res = await _request('/api/party/challenge/assist', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        target_uid: targetUid,
                        assist_type: 'advantage',
                        note: _cfg.name + ' orienta e apoia ' + targetName + '.',
                    });
                    if (res && res.challenge_state) {
                        _partyState.active_challenge = res.challenge_state;
                        _refreshSkillChallengeModal(res.challenge_state);
                    }
                    if (global.vToast) global.vToast('Auxílio concedido a ' + targetName + ' (Vantagem no próximo teste)!', 'ok');
                    await _pollState();
                } catch (err) {
                    if (global.vToast) global.vToast('Erro ao auxiliar companheiro: ' + err.message, 'err');
                }
            };
        }
    }

    // ── Resumo Tático Pós-Combate & MVP Honors (Blizzard / Valve / Riot) ─────────

    function _showTacticalSummaryModal(summary) {
        if (!summary) return;
        var existing = document.getElementById('v-party-summary-modal');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.className = 'v-party-modal-overlay';
        overlay.id = 'v-party-summary-modal';

        var card = document.createElement('div');
        card.className = 'v-party-modal-card v-party-summary-card';

        var phaseLabel = summary.phase === 'victory' ? '🏆 VITÓRIA ESMAGADORA' : '💀 DERROTA DRAMÁTICA';
        var phaseColor = summary.phase === 'victory' ? '#81c784' : '#e57373';

        var html = '';
        html += '<div class="v-party-modal-header">';
        html += '  <div class="v-party-modal-title">⚔️ Resumo Tático da Batalha</div>';
        html += '  <button type="button" class="v-party-icon-btn" id="v-sum-close-x">✖</button>';
        html += '</div>';

        html += '<div class="v-party-modal-body">';
        html += '  <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(196,149,58,0.25); padding-bottom:6px; margin-bottom:8px;">';
        html += '    <div style="font-size:12px; color:#ded1be;"><strong>Cenário:</strong> ' + (summary.biome || 'Masmorra') + ' | <strong>Duração:</strong> ' + (summary.rounds || 1) + ' Rodadas</div>';
        html += '    <div style="font-size:11px; font-weight:700; color:' + phaseColor + ';">' + phaseLabel + '</div>';
        html += '  </div>';

        // Grid com os membros da comitiva e honrarias MVP
        html += '  <div class="v-summary-grid">';
        var members = summary.members || [];
        for (var i = 0; i < members.length; i++) {
            var m = members[i];
            html += '    <div class="v-summary-member-card">';
            html += '      <div style="display:flex; justify-content:space-between; align-items:center;">';
            html += '        <div style="font-size:13px; font-weight:700; color:#ffe082;">' + (m.icon || '⚔️') + ' ' + (m.name || 'Aventureiro') + '</div>';
            html += '        <div style="font-size:10px; color:#a1887f;">' + (m.character_class || 'Classe') + '</div>';
            html += '      </div>';

            if (m.honors && m.honors.length > 0) {
                html += '    <div>';
                for (var h = 0; h < m.honors.length; h++) {
                    html += '    <span class="v-summary-honor-badge">' + m.honors[h] + '</span> ';
                }
                html += '    </div>';
            }

            html += '      <div style="display:flex; flex-direction:column; gap:2px; margin-top:4px;">';
            html += '        <div class="v-summary-stat-row"><span>💥 Dano Infligido:</span><strong>' + (m.damage_dealt || 0) + '</strong></div>';
            html += '        <div class="v-summary-stat-row"><span>🛡️ Dano Sofrido:</span><strong>' + (m.damage_taken || 0) + '</strong></div>';
            html += '        <div class="v-summary-stat-row"><span>💚 Cura Concedida:</span><strong>' + (m.healing_done || 0) + '</strong></div>';
            html += '        <div class="v-summary-stat-row"><span>💀 Inimigos Abatidos:</span><strong>' + (m.kills || 0) + '</strong></div>';
            html += '      </div>';
            html += '    </div>';
        }
        html += '  </div>';

        // Totais e Espólios
        html += '  <div class="v-summary-rewards-box">';
        html += '    <strong>Totais da Comitiva:</strong> 💥 ' + (summary.total_party_damage || 0) + ' Dano Total | 🛡️ ' + (summary.total_party_taken || 0) + ' Sofrido | 💚 ' + (summary.total_party_healing || 0) + ' Curado';
        html += '  </div>';

        // Botões de Ação
        html += '  <div style="display:flex; gap:8px; margin-top:10px;">';
        html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-need" id="v-sum-copy-telegram" style="flex:2; padding:10px; font-size:12px;">📋 Copiar Relatório para o Telegram</button>';
        html += '    <button type="button" class="v-party-loot-btn v-party-loot-btn-pass" id="v-sum-done-btn" style="flex:1; padding:10px; font-size:12px;">← Continuar Viagem</button>';
        html += '  </div>';

        html += '</div>';

        card.innerHTML = html;
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        function closeSummary() {
            _lastSeenCombatSummaryId = summary.compiled_at || Date.now();
            overlay.remove();
        }

        card.querySelector('#v-sum-close-x').onclick = closeSummary;
        card.querySelector('#v-sum-done-btn').onclick = closeSummary;

        var btnCopy = card.querySelector('#v-sum-copy-telegram');
        if (btnCopy) {
            btnCopy.onclick = function () {
                var text = summary.telegram_formatted_text || '';
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(function () {
                        btnCopy.textContent = '✔ Relatório Copiado!';
                        btnCopy.style.background = '#4caf50';
                        if (global.vToast) global.vToast('Relatório tático copiado para a área de transferência!', 'ok');
                    }).catch(function () {
                        if (global.vToast) global.vToast('Erro ao copiar relatório.', 'warn');
                    });
                } else {
                    if (global.vToast) global.vToast('Área de transferência indisponível no navegador.', 'warn');
                }
            };
        }
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

        // Protocolo de Reconexão Rápida / Resiliência de Rede (VisibilityChange & Online)
        if (typeof document !== 'undefined' && !document._vPartyReconnectRegistered) {
            document._vPartyReconnectRegistered = true;
            var handleAppWakeup = function () {
                if (document.visibilityState === 'visible' && _partyState && _partyState.session_id && _cfg.uid) {
                    _request('/api/party/reconnect', {
                        session_id: _partyState.session_id,
                        user_id: _cfg.uid,
                        client_turn_version: _partyState.turn_version || 0,
                    }).then(function (recRes) {
                        if (recRes && recRes.ok && recRes.snapshot) {
                            _partyState = recRes.snapshot;
                            _renderHud();
                        }
                    }).catch(function () {});
                }
            };
            document.addEventListener('visibilitychange', handleAppWakeup);
            window.addEventListener('online', handleAppWakeup);
        }
    }

    async function _setMarchingFormation(formation) {
        if (!_partyState || !_partyState.session_id) return false;
        var res = await _request('/api/party/formation/set', {
            session_id: _partyState.session_id,
            user_id: _cfg.uid,
            formation: formation,
        });
        if (res && res.ok) {
            _partyState.marching_formation = formation;
            return true;
        }
        return false;
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
        openPartyFeatModal: _openPartyFeatModal,
        openSharedStash: _openSharedStashModal,
        openCampRest: _openCampRestModal,
        showCampRestVote: _showCampRestVoteModal,
        openTrade: _openTradeModal,
        showDeathSaveModal: _showDeathSaveModal,
        showSkillChallengeModal: _showSkillChallengeModal,
        showTacticalSummaryModal: _showTacticalSummaryModal,
        showLootModal: _showLootModal,
        showReactionPrompt: _showReactionPrompt,
        renderPingWave: _renderPingWave,
        setFormation: _setMarchingFormation,
    };

})(typeof window !== 'undefined' ? window : this);
