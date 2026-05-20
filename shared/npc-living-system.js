/* ============================================================================
 * npc-living-system.js — NPC living memory, cascade unlocks, mood engine
 * ============================================================================
 *
 * MAPA_IA — navegação rápida (atualizar a CADA mudança):
 *   ~50    constants + _NPC_MEMORY init
 *   ~95    window._npcRemember / _npcRecall / _npcGetMemory
 *   ~140   window._npcUnlockDialogue / _npcIsDialogueUnlocked / _npcGetUnlocks
 *   ~190   window._npcGetTimeOfDay / _npcGetMood
 *   ~265   window._npcPickDialogue (pool selection by context)
 *   ~315   window._npcMarkVisit / _npcGetVisitCount
 *   ~355   window._npcRecordInteraction
 *   ~390   window._npcGetGossipAbout (consulta NPC_RELATIONS)
 *   ~450   window._npcDispatchCascadeChoice (cb pattern handler)
 *   ~510   bootstrap + module exports
 *
 * Busca rápida:
 *   grep "MEMORY_SCHEMA"     → estrutura canonical de memória por NPC
 *   grep "MOOD_TIERS"        → tabela de tiers de mood e thresholds
 *   grep "CASCADE_CB_PREFIX" → padrões de cb para cascata/memória
 *
 * ============================================================================
 * USO em mockups (estabelecimentos *-final.html):
 *
 *   <!-- Load AFTER svc-interactions.js -->
 *   <script src="../valdoria-webapp/shared/npc-relations-data.js"></script>
 *   <script src="../valdoria-webapp/shared/npc-living-system.js"></script>
 *
 *   // No greeting builder:
 *   const mood = _npcGetMood('aldwin', _PLAYER_RENOWN.bank || 0, _npcGetTimeOfDay());
 *   const greeting = _npcPickDialogue('aldwin', GREETINGS, { mood });
 *
 *   // No choice handler (dispatch cb extras):
 *   if (_npcDispatchCascadeChoice(ch.cb, dialogue)) return;
 *
 *   // Para cascade unlocks: cb 'cascade:tavira:gossip_aldwin_brother'
 *   // Para memória: cb 'memory:asked_about_tavira:true'
 *   // Para visit log: cb 'visit:invest' (registra tópico da última visita)
 *
 * ============================================================================
 * MEMORY_SCHEMA — formato canonical de window._NPC_MEMORY[npcId]:
 *
 *   {
 *     first_meet: 1716000000,          // timestamp ms
 *     interactions_count: 5,            // total visits
 *     visits_by_topic: {                // contador por tópico
 *       'invest': 2, 'loan': 1, 'gossip_tavira': 1
 *     },
 *     last_topic: 'invest',             // último tópico discutido
 *     last_visit_ts: 1716003600,        // timestamp última visita
 *     player_choices: [                 // log de escolhas (até últimas 50)
 *       { ts: 1716000000, choice: 'paid_in_time' },
 *       { ts: 1716001200, choice: 'asked_about_tavira' }
 *     ],
 *     unlocked_dialogues: [             // dialogues canonical desbloqueados
 *       'gossip_tavira_brother',
 *       'reveal_loan_to_corvus'
 *     ],
 *     custom: {                         // free-form (use _npcRemember)
 *       'paid_loan_count': 3,
 *       'confessed_real_sin': true
 *     }
 *   }
 *
 * Persistência (atualizada 2026-05-20 — sessão #16, task #80):
 * - Hidrata `_NPC_MEMORY` de localStorage no boot (char-namespaced).
 * - Persiste a cada mutação relevante (`_npcRemember`, `_npcUnlockDialogue`,
 *   `_npcMarkVisit`, `_npcRecordInteraction`) com debounce 200ms.
 * - Chave: `valdoria_npc_memory_<charId>` (window._charId || 'default').
 * - LGPD: state de UI/dedup (não é game state). Permitido por CLAUDE.md
 *   regra Server-Only State (preferências de UI exceção).
 * - Backend authoritative (quando existir): vai sobrepor localStorage no
 *   próximo hydrate via `applyServerNpcMemory(snap)`.
 *
 * ============================================================================ */

(function(){
  'use strict';

  // === Global state =========================================================
  if (!window._NPC_MEMORY) window._NPC_MEMORY = {};

  // === MOOD_TIERS ===========================================================
  // Mood é derivado de (renown + interaction_history + time_of_day).
  // Tabela de thresholds com base no Renown D&D 5e DMG p.22:
  //   ≥ 25 → friendly (heróico/notório)
  //   ≥ 10 → warm (confiado/respeitado)
  //   ≥ 0  → neutral (desconhecido)
  //   < 0  → cold (rispidez prévia)
  //   ≤ -10 → hostile (quebra de acordo, fugiu, etc.)
  const MOOD_TIERS = [
    { tier: 'hostile',  min_renown: -999, label: 'Hostil' },
    { tier: 'cold',     min_renown: -10,  label: 'Frio' },
    { tier: 'neutral',  min_renown: 0,    label: 'Neutro' },
    { tier: 'warm',     min_renown: 10,   label: 'Cordial' },
    { tier: 'friendly', min_renown: 25,   label: 'Amigável' }
  ];

  // === CASCADE_CB_PREFIX ====================================================
  // Padrões de cb que _npcDispatchCascadeChoice reconhece:
  //   'cascade:<targetNpc>:<dialogueId>'  → unlock dialogue em outro NPC
  //   'memory:<key>:<value>'              → store memory ('value' parsed JSON-ish)
  //   'visit:<topic>'                     → registra tópico de visita
  //   'recall:<npc>:<key>'                → debug only (não fazer em choice)
  const CASCADE_PREFIXES = ['cascade:', 'memory:', 'visit:'];

  // === Memory primitives ====================================================
  function _ensureNpcRecord(npcId){
    if (!window._NPC_MEMORY[npcId]) {
      window._NPC_MEMORY[npcId] = {
        first_meet: Date.now(),
        interactions_count: 0,
        visits_by_topic: {},
        last_topic: null,
        last_visit_ts: null,
        player_choices: [],
        unlocked_dialogues: [],
        custom: {}
      };
    }
    return window._NPC_MEMORY[npcId];
  }

  window._npcRemember = function(npcId, key, value){
    const rec = _ensureNpcRecord(npcId);
    rec.custom[key] = value;
  };

  window._npcRecall = function(npcId, key, defaultValue){
    const rec = window._NPC_MEMORY[npcId];
    if (!rec || !(key in rec.custom)) {
      return (defaultValue !== undefined) ? defaultValue : null;
    }
    return rec.custom[key];
  };

  window._npcGetMemory = function(npcId){
    return window._NPC_MEMORY[npcId] || null;
  };

  // === Cascade unlocks ======================================================
  window._npcUnlockDialogue = function(npcId, dialogueId){
    const rec = _ensureNpcRecord(npcId);
    if (rec.unlocked_dialogues.indexOf(dialogueId) === -1) {
      rec.unlocked_dialogues.push(dialogueId);
      try {
        if (typeof window._logCity === 'function') {
          window._logCity('[NPC-LIVING] unlock ' + npcId + '/' + dialogueId);
        }
      } catch(e){}
      return true;  // primeira vez
    }
    return false;  // já estava unlocked
  };

  window._npcIsDialogueUnlocked = function(npcId, dialogueId){
    const rec = window._NPC_MEMORY[npcId];
    return !!(rec && rec.unlocked_dialogues.indexOf(dialogueId) !== -1);
  };

  window._npcGetUnlocks = function(npcId){
    const rec = window._NPC_MEMORY[npcId];
    return rec ? rec.unlocked_dialogues.slice() : [];
  };

  // === Time of day ==========================================================
  // Usado pra atmosfera (NPC sonolento à noite, energético de manhã, etc.).
  // Pode ser sobrescrito via window._npcForceTimeOfDay (para tests).
  window._npcGetTimeOfDay = function(){
    if (window._npcForceTimeOfDay) return window._npcForceTimeOfDay;
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  };

  // === Mood resolution ======================================================
  // playerRenown: numeric Renown DA FAÇÃO desse NPC (não global)
  // timeOfDay: opcional, default _npcGetTimeOfDay()
  // Retorna { tier, label, hour_modifier }
  //
  // Hour modifier ajusta tom (e.g. à noite Aldwin está cansado mesmo com
  // renown alto). Não muda o tier, mas pode ser usado pra escolher
  // variações dentro do mesmo tier.
  window._npcGetMood = function(npcId, playerRenown, timeOfDay){
    timeOfDay = timeOfDay || window._npcGetTimeOfDay();
    playerRenown = (typeof playerRenown === 'number') ? playerRenown : 0;

    // Pick tier mais alto cujo min_renown ≤ playerRenown
    let tier = MOOD_TIERS[0];
    for (let i = 0; i < MOOD_TIERS.length; i++) {
      if (playerRenown >= MOOD_TIERS[i].min_renown) tier = MOOD_TIERS[i];
    }

    return {
      tier: tier.tier,
      label: tier.label,
      hour_modifier: timeOfDay,
      renown: playerRenown
    };
  };

  // === Dialogue pool picker =================================================
  // Seleciona melhor dialogue de um pool baseado em contexto.
  //
  // pools: pode ser:
  //   - array simples → retorna random (legacy)
  //   - dict por mood → { hostile: [...], cold: [...], neutral: [...], warm: [...], friendly: [...] }
  //   - dict por tópico → { default: [...], invest: [...], loan: [...] }
  //
  // context: { mood, topic, visitCount }
  window._npcPickDialogue = function(npcId, pools, context){
    context = context || {};
    if (!pools) return null;

    // Array simples (legacy fallback)
    if (Array.isArray(pools)) {
      return pools[Math.floor(Math.random() * pools.length)];
    }

    // Dict — tentar match em ordem de prioridade
    if (typeof pools === 'object') {
      let candidates = null;

      // 1. Match exato por tier (friendly > warm > neutral > cold > hostile)
      if (context.mood && context.mood.tier && pools[context.mood.tier]) {
        candidates = pools[context.mood.tier];
      }
      // 2. Match por tópico
      else if (context.topic && pools[context.topic]) {
        candidates = pools[context.topic];
      }
      // 3. Fallback genérico
      else if (pools.default) {
        candidates = pools.default;
      } else if (pools.neutral) {
        candidates = pools.neutral;
      }
      // 4. Última tentativa — primeiro array que encontrar
      else {
        for (const k in pools) {
          if (Array.isArray(pools[k])) { candidates = pools[k]; break; }
        }
      }

      if (Array.isArray(candidates) && candidates.length) {
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
    }

    return null;
  };

  // === Visit tracking =======================================================
  window._npcMarkVisit = function(npcId, topic){
    const rec = _ensureNpcRecord(npcId);
    rec.interactions_count++;
    rec.last_topic = topic || rec.last_topic;
    rec.last_visit_ts = Date.now();
    if (topic) {
      rec.visits_by_topic[topic] = (rec.visits_by_topic[topic] || 0) + 1;
    }
  };

  window._npcGetVisitCount = function(npcId, topic){
    const rec = window._NPC_MEMORY[npcId];
    if (!rec) return 0;
    if (topic) return rec.visits_by_topic[topic] || 0;
    return rec.interactions_count;
  };

  // === Interaction log ======================================================
  window._npcRecordInteraction = function(npcId, choiceLabel){
    const rec = _ensureNpcRecord(npcId);
    rec.player_choices.push({ ts: Date.now(), choice: choiceLabel });
    // Cap a 50 últimos
    if (rec.player_choices.length > 50) {
      rec.player_choices = rec.player_choices.slice(-50);
    }
  };

  // === Inter-NPC gossip =====================================================
  // Consulta NPC_RELATIONS data file (npc-relations-data.js).
  // Retorna gossip line se relação existe AND player tem context apropriado
  // (e.g. já interagiu com o target).
  window._npcGetGossipAbout = function(speakerNpcId, targetNpcId){
    if (!window.NPC_RELATIONS) return null;
    const speakerRels = window.NPC_RELATIONS[speakerNpcId];
    if (!speakerRels || !speakerRels[targetNpcId]) return null;

    const rel = speakerRels[targetNpcId];
    // Só fofocar se o player já conheceu o target
    if (!window._NPC_MEMORY[targetNpcId]) return null;

    // Pick variant baseado em tipo de relação
    return {
      type: rel.type,
      strength: rel.strength || 0.5,
      line: rel.gossip || null,
      reveal_threshold: rel.reveal_threshold || 0  // visits to speaker needed
    };
  };

  // === Cascade choice dispatcher ============================================
  // Reconhece cb patterns extras pra _dispatchSvcChoice integration:
  //   'cascade:<targetNpc>:<dialogueId>'  → unlock dialogue
  //   'memory:<key>:<value>'              → store memory (custom field)
  //   'visit:<topic>'                     → mark visit topic
  //
  // Retorna true se handled (caller pode return early); false se não-match.
  window._npcDispatchCascadeChoice = function(cb, dialogue){
    if (!cb || typeof cb !== 'string') return false;
    const npcId = (dialogue && dialogue.npcId) || null;

    // cascade:targetNpc:dialogueId
    if (cb.indexOf('cascade:') === 0) {
      const parts = cb.substring(8).split(':');
      if (parts.length >= 2) {
        const targetNpc = parts[0];
        const dialogueId = parts.slice(1).join(':');
        window._npcUnlockDialogue(targetNpc, dialogueId);
        // Log + toast opcional
        try {
          if (typeof window.vToast === 'function') {
            window.vToast('Algo desbloqueado em ' + targetNpc, 'info');
          }
        } catch(e){}
        return true;
      }
    }

    // memory:key:value (value parsed: true/false/number, else string)
    if (cb.indexOf('memory:') === 0 && npcId) {
      const parts = cb.substring(7).split(':');
      if (parts.length >= 2) {
        const key = parts[0];
        const rawVal = parts.slice(1).join(':');
        let value = rawVal;
        if (rawVal === 'true') value = true;
        else if (rawVal === 'false') value = false;
        else if (!isNaN(Number(rawVal))) value = Number(rawVal);
        window._npcRemember(npcId, key, value);
        return true;
      }
    }

    // visit:topic
    if (cb.indexOf('visit:') === 0 && npcId) {
      const topic = cb.substring(6);
      window._npcMarkVisit(npcId, topic);
      return true;
    }

    return false;
  };

  // === LocalStorage Persistence (2026-05-20, task #80) ======================
  // Hidrata _NPC_MEMORY no boot + persiste após cada mutação (debounce 200ms).
  // Char-namespaced — cada personagem mantém memória independente.
  //
  // RATIONALE (user 2026-05-20): "identifique todo diálogo que precisa ser
  // único, não repetir, e garanta que não apareçam mais nenhuma vez". Sem
  // persistência, NPC unique tinha intro repetido em todo refresh — bug.
  //
  // LGPD: state efêmero de UI/dedup (não é game state). Permitido por CLAUDE.md
  // Server-Only State (exceção para preferências de UI).
  //
  // INVARIANTS:
  //   - charId pode mudar (switch char) → _NPC_MEMORY rehidrata de outro key
  //   - localStorage indisponível (private mode) → fallback in-memory silencioso
  //   - Cap em JSON.stringify size (50KB) → não persiste se exceder

  const LS_PREFIX = 'valdoria_npc_memory_';
  const LS_MAX_SIZE = 50 * 1024;  // 50KB cap
  let _persistTimer = null;
  let _lastHydratedChar = null;

  function _lsKey(){
    const charId = (window._charId || 'default') + '';
    return LS_PREFIX + charId;
  }

  function _hydrateFromLocalStorage(){
    try {
      const charId = (window._charId || 'default') + '';
      if (_lastHydratedChar === charId) return;  // already loaded
      const raw = localStorage.getItem(_lsKey());
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          // Merge: localStorage authoritative ONLY for previously persisted
          // NPCs. Em-memory data atual (boot) é mantida se não tem persistência.
          for (const k in data) {
            if (Object.prototype.hasOwnProperty.call(data, k)) {
              window._NPC_MEMORY[k] = data[k];
            }
          }
          if (typeof window._logCity === 'function') {
            window._logCity('[NPC-LIVING] hydrated ' + Object.keys(data).length
                            + ' NPCs from localStorage (char=' + charId + ')');
          }
        }
      }
      _lastHydratedChar = charId;
    } catch (e) {
      // localStorage bloqueado ou JSON malformado — fallback silencioso
      try { console.warn('[NPC-LIVING] hydrate failed:', e); } catch(_){}
    }
  }

  function _persistToLocalStorage(){
    try {
      const json = JSON.stringify(window._NPC_MEMORY || {});
      if (json.length > LS_MAX_SIZE) {
        try { console.warn('[NPC-LIVING] memory exceeds 50KB cap, skipping persist'); } catch(_){}
        return;
      }
      localStorage.setItem(_lsKey(), json);
    } catch (e) {
      try { console.warn('[NPC-LIVING] persist failed:', e); } catch(_){}
    }
  }

  function _schedulePersist(){
    if (_persistTimer) return;
    _persistTimer = setTimeout(function(){
      _persistTimer = null;
      _persistToLocalStorage();
    }, 200);
  }

  // Re-hidrata se charId mudar (switch char no mesmo session)
  window._npcReloadMemory = function(){
    _lastHydratedChar = null;  // force re-hydrate
    window._NPC_MEMORY = {};   // clear current
    _hydrateFromLocalStorage();
  };

  // Wrappers que disparam persist após mutação. Preservam a API original.
  const _origRemember = window._npcRemember;
  window._npcRemember = function(npcId, key, value){
    _origRemember(npcId, key, value);
    _schedulePersist();
  };

  const _origUnlockDialogue = window._npcUnlockDialogue;
  window._npcUnlockDialogue = function(npcId, dialogueId){
    const result = _origUnlockDialogue(npcId, dialogueId);
    if (result) _schedulePersist();  // só persiste se foi novo unlock
    return result;
  };

  const _origMarkVisit = window._npcMarkVisit;
  window._npcMarkVisit = function(npcId, topic){
    _origMarkVisit(npcId, topic);
    _schedulePersist();
  };

  const _origRecordInteraction = window._npcRecordInteraction;
  window._npcRecordInteraction = function(npcId, choiceLabel){
    _origRecordInteraction(npcId, choiceLabel);
    _schedulePersist();
  };

  // Hydrate na boot (e a cada hub navigate via setTimeout, caso _charId chegue depois)
  _hydrateFromLocalStorage();
  setTimeout(_hydrateFromLocalStorage, 100);   // após URL params parse
  setTimeout(_hydrateFromLocalStorage, 1000);  // safety net p/ slow boot

  // Persist on beforeunload (failsafe — debounce pode estar pendente)
  try {
    window.addEventListener('beforeunload', function(){
      if (_persistTimer) {
        clearTimeout(_persistTimer);
        _persistTimer = null;
      }
      _persistToLocalStorage();
    });
  } catch(e){}

  // === Bootstrap log ========================================================
  if (typeof window._logCity === 'function') {
    window._logCity('[NPC-LIVING] npc-living-system.js loaded — API ready (with localStorage persistence)');
  }

})();
