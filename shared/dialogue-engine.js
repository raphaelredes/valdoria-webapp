/* dialogue-engine.js — JSON-driven NPC dialogue engine
 *
 * 2026-05-22 — Foundation skeleton (NOT YET WIRED to any NPC).
 * Conecta JSON files em /shared/dialogues/*.json ao vEncounter.render canonical
 * (char-by-char typewriter PADRAO_ALDRIC v2).
 *
 * MAPA_IA — navegação rápida:
 *   ~40   _cache (loaded JSONs)
 *   ~60   load(npcKey) — fetch + cache
 *   ~100  evalConditions(conditions, player) — flag/hp/affinity/rep/skill
 *   ~170  resolveStartNode(timeline, player, fallback)
 *   ~220  renderNode(npcKey, nodeId, player, opts) — bridge pra vEncounter
 *   ~280  handleSkillCheck(option, player, npcKey, opts)
 *
 * STATUS: Esqueleto público pronto. Migração NPC-a-NPC pendente:
 *   - aldric (gate guard) — JSON pronto, wiring pendente
 *   - martha (estalagem) — JSON pronto, hardcoded ainda usa MARTHA_ENCOUNTERS
 *   - grom (taverna) — JSON pronto, completamente órfão
 *   - thorne/mirena/velithra/corvus/bjorn — JSON pronto, merchants hardcoded
 *   - elara (templo) — JSON pronto, completamente órfão
 *   - alchemist, lyra (herbalist), gossip, npc_scenes, itinerant — pendente
 *
 * Próxima sessão: migrar 1 NPC end-to-end como PoC.
 *
 * Dependências:
 *   - npc-affinity.js (window.npcAffinity)
 *   - encounter-popup.js (window.vEncounter)
 *   - JSON files em valdoria-webapp/shared/dialogues/*.json (copiar de src/assets/dialogues/)
 */

(function(){
  'use strict';

  // === CACHE ===
  var _cache = {};        // npcKey → dialogue object
  var _pending = {};      // npcKey → Promise (durante fetch)

  /** Resolve URL base do diretório de dialogues. */
  function _dialoguesBaseUrl(){
    // Heuristic: detecta local mode vs production
    var pathname = window.location.pathname || '';
    if (pathname.indexOf('/simuladores/') >= 0) {
      // Local: ../valdoria-webapp/shared/dialogues/
      return '../valdoria-webapp/shared/dialogues/';
    }
    // Production (cidade/): /shared/dialogues/
    return '/shared/dialogues/';
  }

  // === LOAD JSON ===
  /**
   * Carrega JSON de NPC. Retorna Promise<dialogue|null>.
   * Cache: subsequentes chamadas retornam from cache.
   */
  function load(npcKey){
    if (!npcKey) return Promise.resolve(null);
    if (_cache[npcKey]) return Promise.resolve(_cache[npcKey]);
    if (_pending[npcKey]) return _pending[npcKey];

    var url = _dialoguesBaseUrl() + npcKey + '.json';
    _pending[npcKey] = fetch(url)
      .then(function(r){
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(data){
        // JSON top-level key é o npc_id (ex: "npc_gate_aldric")
        // Pega first key se múltiplo, ou data direto se for single object
        var dialogue = data;
        if (data && typeof data === 'object' && !data.timeline && !data.nodes) {
          var keys = Object.keys(data);
          if (keys.length > 0) dialogue = data[keys[0]];
        }
        _cache[npcKey] = dialogue;
        delete _pending[npcKey];
        return dialogue;
      })
      .catch(function(err){
        console.warn('[dialogue-engine] failed to load ' + npcKey + ':', err);
        delete _pending[npcKey];
        return null;
      });

    return _pending[npcKey];
  }

  // === CONDITION EVALUATION ===
  /**
   * Avalia conditions object. Retorna bool.
   * Suporta:
   *   - flag: 'flag_name'           // checa player.metadata.flags[flag_name] === true
   *   - flag: '!flag_name'          // negação
   *   - flags: ['a', '!b']          // todos must match
   *   - hp_below: N                 // player.hp < N
   *   - hp_above: N
   *   - location: 'city'            // checa player.location
   *   - patience_below: N           // npc-specific: affinity < N
   *   - min_affinity: N             // npc affinity >= N
   *   - min_rep: { faction, value } // faction reputation >= value
   *   - class: 'mage'               // player.cls match
   *   - level_min: N                // player.level >= N
   */
  function evalConditions(conditions, player, npcKey){
    if (!conditions) return true;
    if (!player) return false;
    var meta = player.metadata || {};
    var flags = meta.flags || {};

    // Single flag (string OR object)
    if (conditions.flag) {
      if (!_checkFlag(conditions.flag, flags)) return false;
    }
    // Multiple flags (AND)
    if (Array.isArray(conditions.flags)) {
      for (var i = 0; i < conditions.flags.length; i++) {
        if (!_checkFlag(conditions.flags[i], flags)) return false;
      }
    }
    // HP thresholds
    if (typeof conditions.hp_below === 'number') {
      var hpPct = player.hpMax > 0 ? (player.hp / player.hpMax * 100) : 0;
      if (hpPct >= conditions.hp_below) return false;
    }
    if (typeof conditions.hp_above === 'number') {
      var hpPctA = player.hpMax > 0 ? (player.hp / player.hpMax * 100) : 0;
      if (hpPctA <= conditions.hp_above) return false;
    }
    // Location
    if (conditions.location && meta.location && meta.location !== conditions.location) {
      return false;
    }
    // Affinity (NPC-specific)
    if (npcKey && window.npcAffinity) {
      var aff = window.npcAffinity.get(player, npcKey);
      if (typeof conditions.patience_below === 'number' && aff >= conditions.patience_below) return false;
      if (typeof conditions.min_affinity === 'number' && aff < conditions.min_affinity) return false;
      if (typeof conditions.max_affinity === 'number' && aff > conditions.max_affinity) return false;
    }
    // Reputation
    if (conditions.min_rep && window.npcAffinity) {
      var f = conditions.min_rep.faction;
      var v = conditions.min_rep.value;
      if (f && window.npcAffinity.getReputation(player, f) < v) return false;
    }
    // Class
    if (conditions.class && player.cls && conditions.class !== player.cls) return false;
    // Level
    if (typeof conditions.level_min === 'number' && (player.level || 1) < conditions.level_min) return false;

    return true;
  }

  function _checkFlag(flagDef, flags){
    if (typeof flagDef !== 'string') return false;
    if (flagDef.charAt(0) === '!') {
      // Negação
      return !flags[flagDef.substr(1)];
    }
    return !!flags[flagDef];
  }

  // === TIMELINE RESOLVER ===
  /**
   * Encontra primeiro node do timeline que matches conditions atuais.
   * Fallback: 'start' (default node).
   */
  function resolveStartNode(timeline, player, npcKey, fallback){
    fallback = fallback || 'start';
    if (!Array.isArray(timeline)) return fallback;
    for (var i = 0; i < timeline.length; i++) {
      var entry = timeline[i];
      if (entry && entry.node && evalConditions(entry.conditions, player, npcKey)) {
        return entry.node;
      }
    }
    return fallback;
  }

  // === NODE → vEncounter SHAPE ===
  /**
   * Converte node JSON pra dialogue shape esperada por vEncounter.render.
   *   { npc: { name, desc, portrait }, script: [...], choices: [...] }
   */
  function buildVEncounterDialogue(npcKey, nodeId, dialogueData, player, opts){
    opts = opts || {};
    var node = (dialogueData && dialogueData.nodes && dialogueData.nodes[nodeId]) || null;
    if (!node) return null;

    var npc = (dialogueData.npc) || {
      name: npcKey,
      desc: '',
      portrait: opts.portrait || ''
    };

    // Script: usa node.script se presente, senão converte text
    var script = [];
    if (Array.isArray(node.script)) {
      script = node.script.slice();
    } else if (Array.isArray(node.text)) {
      // Múltiplas variantes — pega 1 aleatória (RNG behavior canonical)
      var picked = node.text[Math.floor(Math.random() * node.text.length)];
      script = [{ type: 'speech', speaker: npcKey, text: picked }];
    } else if (typeof node.text === 'string') {
      script = [{ type: 'speech', speaker: npcKey, text: node.text }];
    }

    // Choices: filter por once/conditions, traduz pra cb pattern
    var choices = [];
    if (Array.isArray(node.options)) {
      node.options.forEach(function(opt){
        // Skip options já usadas (once: true + visited)
        if (opt.once && window.npcAffinity && window.npcAffinity.getFlag(player, npcKey, '_once_' + (opt.next || opt.text))) {
          return;
        }
        // Skip se conditions não satisfeitas
        if (opt.conditions && !evalConditions(opt.conditions, player, npcKey)) {
          return;
        }
        choices.push({
          id: opt.next || opt.exit_callback || ('opt_' + choices.length),
          label: opt.text || '...',
          // Stash original option pra resolver no callback
          _original: opt,
          // Skill check badges (renderizado por vEncounter)
          skill: opt.check ? opt.check.skill : undefined,
          dc: opt.check ? opt.check.difficulty : undefined
        });
      });
    }

    return { npc: npc, script: script, choices: choices };
  }

  // === SKILL CHECK RESOLVER ===
  /**
   * Resolve skill check. Returns 'success' ou 'failure' (which node to navigate to).
   * Roll d20 + modifier vs DC.
   */
  function rollSkillCheck(option, player){
    if (!option || !option.check) return null;
    var skill = option.check.skill;
    var dc = option.check.difficulty || 10;
    // Map skill name → ability score
    var ABILITY_MAP = {
      strength: 'strength', str: 'strength',
      dexterity: 'dexterity', dex: 'dexterity',
      constitution: 'constitution', con: 'constitution',
      intelligence: 'intelligence', int: 'intelligence',
      wisdom: 'wisdom', wis: 'wisdom',
      charisma: 'charisma', cha: 'charisma'
    };
    var ability = ABILITY_MAP[skill] || skill;
    var statVal = (player.stats && player.stats[ability]) || 10;
    var mod = Math.floor((statVal - 10) / 2);
    var roll = 1 + Math.floor(Math.random() * 20);
    var total = roll + mod;
    var success = total >= dc;
    return {
      success: success,
      roll: roll,
      mod: mod,
      total: total,
      dc: dc,
      nextNode: success ? option.check.success : option.check.failure,
      skill: skill
    };
  }

  // === IMPACT APPLIER ===
  /**
   * Aplica `impact` de uma escolha:
   *   { reputation: { faction: delta }, affinity: { npc: delta }, flag: 'flag_name', xp: N, gold: N }
   */
  function applyImpact(impact, player, npcKey){
    if (!impact || !player) return;
    if (impact.reputation && window.npcAffinity) {
      Object.keys(impact.reputation).forEach(function(faction){
        window.npcAffinity.adjustReputation(player, faction, impact.reputation[faction]);
      });
    }
    if (impact.affinity && window.npcAffinity) {
      Object.keys(impact.affinity).forEach(function(target){
        window.npcAffinity.adjust(player, target, impact.affinity[target]);
      });
    }
    if (impact.flag) {
      player.metadata = player.metadata || {};
      player.metadata.flags = player.metadata.flags || {};
      player.metadata.flags[impact.flag] = true;
    }
    if (typeof impact.xp === 'number' && typeof _gainXp === 'function') {
      try { _gainXp(player, impact.xp); } catch(_e){}
    }
    if (typeof impact.gold === 'number') {
      player.gold = Math.max(0, (player.gold || 0) + impact.gold);
    }
  }

  // === EXPORT ===
  window.dialogueEngine = {
    load: load,
    evalConditions: evalConditions,
    resolveStartNode: resolveStartNode,
    buildVEncounterDialogue: buildVEncounterDialogue,
    rollSkillCheck: rollSkillCheck,
    applyImpact: applyImpact,
    // Cache control (testing/dev)
    _clearCache: function(){ _cache = {}; },
    _getCache: function(){ return _cache; }
  };

})();
