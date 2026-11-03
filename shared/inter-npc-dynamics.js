/* ============================================================================
 * inter-npc-dynamics.js — Dinâmica de Relacionamento Inter-NPC e Comitiva
 * ============================================================================
 *
 * Lendas de Valdoria — Design System Canônico
 * Regra Soberana Zero: Tolerância zero a termos proibidos.
 * Regra Soberana de Imersão Diegética: Sem menções a manuais de regras ou páginas.
 *
 * Funcionalidades:
 * 1. Efeito Ondulação (Ripple Effect): Mudanças de afinidade com um NPC repercutem
 *    positiva ou negativamente nos seus amigos, mentores e rivais.
 * 2. Mutação de Relações Inter-NPC: As escolhas do jogador alteram os vínculos
 *    diretos entre os NPCs de Valdoria (ex.: quitação de dívidas, tréguas comerciais).
 * 3. Aprovação de Companheiros da Comitiva (Estilo Baldur's Gate 3):
 *    Companheiros reagem ativamente a decisões tomadas no mundo conforme seus
 *    arquétipos de personalidade.
 * ============================================================================ */

(function(global){
  'use strict';

  if (global.interNpcDynamics) return;

  var _rippleRecursionGuard = false;

  // ── Arquétipos e Gatilhos de Aprovação (BG3 Style) ──────────────────────────

  var ARCHETYPE_TRIGGERS = {
    'leal': {
      approvals: ['proteger_inocente', 'cumprir_promessa', 'ajudar_aliado', 'sacrificio', 'honrar_acordo', 'ajudar_npc', 'disciplina_honra', 'honor', 'bravery'],
      disapprovals: ['trair_aliado', 'abandonar_inocente', 'mentir', 'fugir_covarde', 'quebrar_promessa', 'crueldade', 'cowardice'],
    },
    'rebelde': {
      approvals: ['desafiar_autoridade', 'libertar_prisioneiro', 'escolha_ousada', 'ignorar_regras', 'defender_oprimido', 'redencao', 'cunning'],
      disapprovals: ['obedecer_tirano', 'submissao', 'trair_rebeldes', 'crueldade', 'hipocrisia'],
    },
    'sabio': {
      approvals: ['resolver_enigma', 'escolha_inteligente', 'explorar_ruinas', 'poupar_vida', 'investigar', 'curiosidade_arcana', 'scholar', 'arcana', 'diplomacia'],
      disapprovals: ['destruir_conhecimento', 'ignorancia_voluntaria', 'violencia_desnecessaria', 'imprudencia'],
    },
    'pragmatico': {
      approvals: ['eficiencia', 'lucro', 'escolha_pratica', 'evitar_risco', 'negociar', 'pragmatismo', 'profit', 'greed'],
      disapprovals: ['desperdicio', 'idealismo_cego', 'risco_desnecessario', 'generosidade_excessiva'],
    },
    'compassivo': {
      approvals: ['curar_aliado', 'ajudar_npc', 'poupar_inimigo', 'sacrificio', 'generosidade', 'fe_compaixao', 'mercy', 'charity', 'redencao', 'ajudar_aliado'],
      disapprovals: ['crueldade', 'ignorar_sofrimento', 'matar_rendido', 'ganancia', 'indiferenca', 'ruthless'],
    },
  };

  // ── Persistência de Relações Mutadas ────────────────────────────────────────

  var LS_PREFIX = 'valdoria_inter_npc_relations_';

  function _lsKey(){
    var charId = (global._charId || 'default') + '';
    return LS_PREFIX + charId;
  }

  function hydrateMutatedRelations(){
    try {
      var raw = localStorage.getItem(_lsKey());
      if (raw && global.NPC_RELATIONS) {
        var mutations = JSON.parse(raw);
        if (mutations && typeof mutations === 'object') {
          Object.keys(mutations).forEach(function(pairKey){
            var parts = pairKey.split(':');
            if (parts.length === 2) {
              var s = parts[0];
              var t = parts[1];
              if (!global.NPC_RELATIONS[s]) global.NPC_RELATIONS[s] = {};
              global.NPC_RELATIONS[s][t] = mutations[pairKey];
            }
          });
        }
      }
    } catch(e) {
      console.warn('[INTER-NPC] Falha ao hidratar relações mutadas:', e);
    }
  }

  function _persistMutation(sourceNpc, targetNpc, relationData){
    try {
      var key = _lsKey();
      var raw = localStorage.getItem(key);
      var current = raw ? JSON.parse(raw) : {};
      current[sourceNpc + ':' + targetNpc] = relationData;
      localStorage.setItem(key, JSON.stringify(current));
    } catch(e) {
      console.warn('[INTER-NPC] Falha ao persistir relação mutada:', e);
    }
  }

  // ── Mutação Direta de Relação Entre Dois NPCs ───────────────────────────────

  function mutateRelation(player, sourceNpc, targetNpc, newType, newStrength, newGossip, reason){
    if (!global.NPC_RELATIONS) return null;
    if (!global.NPC_RELATIONS[sourceNpc]) global.NPC_RELATIONS[sourceNpc] = {};

    var data = {
      type: newType,
      strength: Math.max(0.0, Math.min(1.0, parseFloat(newStrength) || 0.5)),
      gossip: newGossip || '',
      reason: reason || '',
      resolved: true,
      updated_at: Date.now()
    };

    global.NPC_RELATIONS[sourceNpc][targetNpc] = data;
    _persistMutation(sourceNpc, targetNpc, data);

    // Registra na memória viva se disponível
    if (typeof global._npcRemember === 'function') {
      try {
        global._npcRemember(sourceNpc, 'rel_' + targetNpc, newType);
        global._npcRemember(targetNpc, 'rel_' + sourceNpc, newType);
      } catch(_e){}
    }

    return data;
  }

  // ── Efeito Ondulação Social (Ripple Effect) ──────────────────────────────────

  function processRipple(player, sourceNpcKey, delta){
    if (!delta || _rippleRecursionGuard || !global.NPC_RELATIONS) return;
    _rippleRecursionGuard = true;

    try {
      // Varre todos os observadores que possuem relação ativa com sourceNpcKey
      Object.keys(global.NPC_RELATIONS).forEach(function(observerKey){
        if (observerKey === sourceNpcKey) return;
        var rel = global.NPC_RELATIONS[observerKey] && global.NPC_RELATIONS[observerKey][sourceNpcKey];
        if (!rel) return;

        var relType = rel.type || 'peer';
        var strength = rel.strength != null ? rel.strength : 0.5;
        var observerDelta = 0;
        var toastMsg = '';

        if (relType === 'old_friend' || relType === 'mentor' || relType === 'peer' || relType === 'sibling') {
          var factor = (relType === 'old_friend') ? 0.5 : ((relType === 'mentor') ? 0.6 : 0.4);
          observerDelta = Math.round(delta * strength * factor);
          if (observerDelta > 0) {
            toastMsg = '◆ ' + _cap(observerKey) + ' soube do seu auxílio a ' + _cap(sourceNpcKey);
          } else if (observerDelta < 0) {
            toastMsg = '◇ ' + _cap(observerKey) + ' desaprovou sua conduta com ' + _cap(sourceNpcKey);
          }
        } else if (relType === 'rival') {
          // Rivalidade gera ciúme competitivo em atos favoráveis
          if (delta > 0) {
            observerDelta = Math.round(-1 * delta * strength * 0.35);
            if (observerDelta < 0) {
              toastMsg = '◇ ' + _cap(observerKey) + ' olhou com desdém sua proximidade com ' + _cap(sourceNpcKey);
            }
          } else if (delta < 0) {
            observerDelta = Math.round(Math.abs(delta) * strength * 0.25);
            if (observerDelta > 0) {
              toastMsg = '◆ ' + _cap(observerKey) + ' aprovou sua postura firme perante ' + _cap(sourceNpcKey);
            }
          }
        } else if (relType === 'creditor') {
          if (delta > 0) {
            observerDelta = Math.max(1, Math.round(delta * 0.25));
            toastMsg = '◆ ' + _cap(observerKey) + ' apreciou sua influência benéfica sobre ' + _cap(sourceNpcKey);
          }
        }

        if (observerDelta !== 0 && global.npcAffinity && typeof global.npcAffinity.get === 'function') {
          var cur = global.npcAffinity.get(player, observerKey);
          var nextVal = Math.max(-100, Math.min(100, cur + observerDelta));
          global.npcAffinity.set(player, observerKey, nextVal);

          // Feedback sutil diegético
          if (toastMsg && typeof global.vToast === 'function') {
            try { global.vToast(toastMsg, 'info'); } catch(_t){}
          }
        }
      });
    } finally {
      _rippleRecursionGuard = false;
    }
  }

  // ── Aprovação Ativa no Grupo (Baldur's Gate 3 Style) ─────────────────────────

  function triggerPartyApproval(player, triggerKey, contextLabel){
    if (!triggerKey) return [];
    var p = player || global.CITY_MOCK_PLAYER || null;
    if (!p) return [];

    var party = p.party || [];
    var partyStatus = p.party_status || {};
    var results = [];

    party.forEach(function(npcId){
      var st = partyStatus[npcId] || {};
      var arch = st.archetype || 'leal';
      var archRules = ARCHETYPE_TRIGGERS[arch];
      if (!archRules) return;

      var isApprove = archRules.approvals.indexOf(triggerKey) >= 0;
      var isDisapprove = archRules.disapprovals.indexOf(triggerKey) >= 0;

      if (!isApprove && !isDisapprove) return;

      var delta = isApprove ? +5 : -5;
      var curApp = st.approval != null ? st.approval : 0;
      var newApp = Math.max(-100, Math.min(100, curApp + delta));
      st.approval = newApp;

      var name = st.name || npcId;
      var glyph = delta > 0 ? '◆' : '◇';
      var tag = glyph + ' ' + name + ' ' + (delta > 0 ? 'aprova' : 'desaprova') + ' (' + (delta > 0 ? '+' : '') + delta + ')';

      // Feedback em tela
      if (typeof global.vToast === 'function') {
        try { global.vToast(tag, delta > 0 ? 'success' : 'warn'); } catch(_t){}
      }

      results.push({
        npc_id: npcId,
        name: name,
        delta: delta,
        new_approval: newApp,
        tag: tag,
        context: contextLabel || ''
      });
    });

    return results;
  }

  // ── Helper ──────────────────────────────────────────────────────────────────

  function _cap(str){
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Hydrate inicial
  hydrateMutatedRelations();

  // Export
  global.interNpcDynamics = {
    processRipple: processRipple,
    mutateRelation: mutateRelation,
    triggerPartyApproval: triggerPartyApproval,
    hydrateMutatedRelations: hydrateMutatedRelations,
  };

})(typeof window !== 'undefined' ? window : this);
