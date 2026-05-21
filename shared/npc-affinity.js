/* npc-affinity.js — Centralized NPC affinity + reputation engine
 *
 * 2026-05-22 — Foundation for NPC dialogue system unification.
 * Substitui fragmented state: window._marketRep + player.metadata.inn_rep +
 * window._npcMarkUsed + emotion flags. Provê API unificada.
 *
 * Storage canonical:
 *   player.metadata.npc_affinity = { npcKey: int }      // -100 a +100
 *   player.metadata.npc_reputation = { faction: int }   // -100 a +100
 *   player.metadata.npc_memory = { npcKey: { met, visits, lastVisit, ... } }
 *
 * Backward compat (read-only legacy):
 *   window._marketRep[npcKey] → npcAffinity.getReputation(npcKey) fallback
 *   player.metadata.inn_rep → npcAffinity.getReputation('inn') fallback
 *
 * MAPA_IA — navegação rápida:
 *   ~30   AFFINITY_TIERS table
 *   ~50   _ensureStore(player) — lazy init
 *   ~70   get/set/adjust/getTier
 *   ~120  reputation API (faction-level)
 *   ~160  memory API (visits, met)
 *   ~210  legacy bridge (_marketRep)
 *
 * Usage:
 *   var afn = window.npcAffinity.get(player, 'aldric'); // -100..100
 *   window.npcAffinity.adjust(player, 'aldric', +5);
 *   var tier = window.npcAffinity.getTier(player, 'aldric'); // 'Aliado'|'Amigável'|...
 */

(function(){
  'use strict';

  // === AFFINITY TIERS (D&D 5e-inspired social ladder) ===
  // Canonical: market_npcs_data.py REPUTATION_TIERS + Martha inn_rep tiers
  var AFFINITY_TIERS = [
    { id: 'allied',    min:  50, max: 100, label: 'Aliado',      color: '#7cdb7c', emoji: '💚' },
    { id: 'friendly',  min:  20, max:  49, label: 'Amigável',    color: '#c4953a', emoji: '👍' },
    { id: 'known',     min:   5, max:  19, label: 'Conhecido',   color: '#a09484', emoji: '😐' },
    { id: 'neutral',   min:  -4, max:   4, label: 'Neutro',      color: '#8a7a6a', emoji: '😶' },
    { id: 'suspicious',min: -19, max:  -5, label: 'Desconfiado', color: '#b07060', emoji: '🤨' },
    { id: 'hostile',   min:-100, max: -20, label: 'Hostil',      color: '#c63d3d', emoji: '😠' }
  ];

  function _getTierForValue(val){
    val = val | 0;
    for (var i = 0; i < AFFINITY_TIERS.length; i++) {
      var t = AFFINITY_TIERS[i];
      if (val >= t.min && val <= t.max) return t;
    }
    return AFFINITY_TIERS[3]; // neutral fallback
  }

  // === STORE INITIALIZATION (lazy) ===
  function _ensureStore(player){
    if (!player) return null;
    player.metadata = player.metadata || {};
    if (!player.metadata.npc_affinity) player.metadata.npc_affinity = {};
    if (!player.metadata.npc_reputation) player.metadata.npc_reputation = {};
    if (!player.metadata.npc_memory) player.metadata.npc_memory = {};
    return player.metadata;
  }

  function _clamp(val){
    val = val | 0;
    if (val > 100) return 100;
    if (val < -100) return -100;
    return val;
  }

  // === CORE AFFINITY API ===
  /** Retorna affinity 0-100 (default 0). */
  function get(player, npcKey){
    var meta = _ensureStore(player);
    if (!meta || !npcKey) return 0;
    // Tenta novo store primeiro, fallback legacy
    if (meta.npc_affinity[npcKey] != null) return meta.npc_affinity[npcKey];
    // Legacy: market_rep fallback
    if (window._marketRep && window._marketRep[npcKey] != null) return window._marketRep[npcKey];
    return 0;
  }

  /** Seta affinity diretamente (clamped -100..+100). */
  function set(player, npcKey, value){
    var meta = _ensureStore(player);
    if (!meta || !npcKey) return 0;
    var clamped = _clamp(value);
    meta.npc_affinity[npcKey] = clamped;
    return clamped;
  }

  /** Ajusta affinity por delta (clamped). Retorna novo valor. */
  function adjust(player, npcKey, delta){
    var cur = get(player, npcKey);
    var newVal = _clamp(cur + (delta | 0));
    set(player, npcKey, newVal);
    return newVal;
  }

  /** Retorna tier object pra display ({label, color, emoji, ...}). */
  function getTier(player, npcKey){
    return _getTierForValue(get(player, npcKey));
  }

  // === REPUTATION (faction-level, ex: 'inn', 'guard', 'merchants') ===
  function getReputation(player, faction){
    var meta = _ensureStore(player);
    if (!meta || !faction) return 0;
    if (meta.npc_reputation[faction] != null) return meta.npc_reputation[faction];
    // Legacy fallback for inn_rep
    if (faction === 'inn' && meta.inn_rep != null) return meta.inn_rep;
    return 0;
  }

  function setReputation(player, faction, value){
    var meta = _ensureStore(player);
    if (!meta || !faction) return 0;
    var clamped = _clamp(value);
    meta.npc_reputation[faction] = clamped;
    return clamped;
  }

  function adjustReputation(player, faction, delta){
    var cur = getReputation(player, faction);
    var newVal = _clamp(cur + (delta | 0));
    setReputation(player, faction, newVal);
    return newVal;
  }

  function getReputationTier(player, faction){
    return _getTierForValue(getReputation(player, faction));
  }

  // === NPC MEMORY (visits, last seen, flags) ===
  function _ensureMemory(player, npcKey){
    var meta = _ensureStore(player);
    if (!meta || !npcKey) return null;
    if (!meta.npc_memory[npcKey]) {
      meta.npc_memory[npcKey] = { met: false, visits: 0, lastVisit: 0, flags: {} };
    }
    return meta.npc_memory[npcKey];
  }

  function markVisit(player, npcKey){
    var mem = _ensureMemory(player, npcKey);
    if (!mem) return;
    mem.met = true;
    mem.visits = (mem.visits || 0) + 1;
    mem.lastVisit = Date.now();
  }

  function hasMet(player, npcKey){
    var mem = _ensureMemory(player, npcKey);
    return !!(mem && mem.met);
  }

  function getVisits(player, npcKey){
    var mem = _ensureMemory(player, npcKey);
    return mem ? (mem.visits || 0) : 0;
  }

  /** NPC-specific flags (ex: 'rescued_by_thorne', 'aldric_patrol_secret') */
  function setFlag(player, npcKey, flagName, value){
    var mem = _ensureMemory(player, npcKey);
    if (!mem) return;
    mem.flags = mem.flags || {};
    mem.flags[flagName] = value !== undefined ? value : true;
  }

  function getFlag(player, npcKey, flagName){
    var mem = _ensureMemory(player, npcKey);
    if (!mem || !mem.flags) return null;
    return mem.flags[flagName];
  }

  // === LEGACY BRIDGE (write-through pra _marketRep) ===
  // Mantém compatibilidade: quando merchant rep muda, atualiza ambos.
  function syncToLegacy(player, npcKey){
    if (window._marketRep && npcKey in window._marketRep) {
      window._marketRep[npcKey] = get(player, npcKey);
    }
  }

  // === RENDER HELPERS ===
  /** Retorna HTML badge pra exibir tier no header de encounter. */
  function renderBadgeHTML(player, npcKey){
    var v = get(player, npcKey);
    if (v === 0 && !hasMet(player, npcKey)) return ''; // sem badge se nunca interagiu
    var tier = _getTierForValue(v);
    return '<span class="npc-aff-badge" style="display:inline-flex;align-items:center;gap:3px;'
      + 'padding:2px 7px;font-size:10px;border-radius:10px;letter-spacing:0.5px;'
      + 'background:' + tier.color + '18;border:1px solid ' + tier.color + '55;'
      + 'color:' + tier.color + ';font-family:var(--v-font-display,Cinzel,serif);'
      + 'text-transform:uppercase;font-weight:700;">'
      + tier.emoji + ' ' + tier.label + '</span>';
  }

  // === EXPORT ===
  window.npcAffinity = {
    // Core
    get: get,
    set: set,
    adjust: adjust,
    getTier: getTier,
    // Reputation (factions)
    getReputation: getReputation,
    setReputation: setReputation,
    adjustReputation: adjustReputation,
    getReputationTier: getReputationTier,
    // Memory
    markVisit: markVisit,
    hasMet: hasMet,
    getVisits: getVisits,
    setFlag: setFlag,
    getFlag: getFlag,
    // Legacy bridge
    syncToLegacy: syncToLegacy,
    // Render
    renderBadgeHTML: renderBadgeHTML,
    // Const exposure
    TIERS: AFFINITY_TIERS
  };

})();
