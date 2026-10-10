/* ============================================================================
 * dialogue-history.js — Histórico de Diálogos e Decisões do Aventureiro (Canonical)
 * ============================================================================
 * Gerencia o registro persistente de todos os diálogos, encontros, escolhas
 * feitas pelo jogador, testes de atributos/perícias (D&D 5e), resultados de rolagens
 * e desfechos narrativos por personagem.
 * ============================================================================ */

(function (root) {
  'use strict';

  var STORAGE_PREFIX = 'valdoria_dialog_history_v2_';
  var MAX_ENTRIES_PER_CHAR = 60;
  var _lastActiveEntryId = null;

  /**
   * Resolve a chave de identificação única do personagem ativo.
   */
  function getCharacterKey(player) {
    var p = player || (typeof window !== 'undefined' && (window.vPlayer || window.CITY_MOCK_PLAYER)) || null;
    if (p) {
      var id = p.character_id || p.cid || p.id || p.name;
      if (id) {
        return STORAGE_PREFIX + String(id).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      }
    }
    // Fallback: tenta recuperar o último UID ou nome persistido
    try {
      var lastId = localStorage.getItem('valdoria_last_character_id') || localStorage.getItem('valdoria_active_char_id');
      if (lastId) return STORAGE_PREFIX + String(lastId).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    } catch (_e) {}

    return STORAGE_PREFIX + 'default';
  }

  /**
   * Obtém o histórico completo do personagem ativo.
   */
  function getHistory(player) {
    var key = getCharacterKey(player);
    var entries = [];
    try {
      entries = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (_e) {
      entries = [];
    }

    if (!Array.isArray(entries)) entries = [];

    // Migração transparente de formatos legados se a lista estiver vazia
    if (entries.length === 0) {
      try {
        var p = player || (typeof window !== 'undefined' && window.CITY_MOCK_PLAYER) || null;
        var legacyKey = ((p && p.name) || 'player') + '_dialog_history';
        var legacyData = JSON.parse(localStorage.getItem(legacyKey) || '[]');
        if (Array.isArray(legacyData) && legacyData.length > 0) {
          entries = legacyData.map(function (item) {
            return {
              id: 'legacy_' + (item.ts || Date.now()),
              ts: item.ts || Date.now(),
              npc: {
                name: item.npc || 'Desconhecido',
                desc: item.desc || '',
                portrait: item.portrait || 'ic-dialogo',
                portraitImg: item.portraitImg || null
              },
              location: item.location || '',
              script: Array.isArray(item.script) ? item.script : [],
              availableChoices: Array.isArray(item.choices) ? item.choices.map(function (c) {
                return typeof c === 'string' ? { label: c } : c;
              }) : [],
              chosen: null,
              check: null,
              outcome: null,
              rewards: null
            };
          });
          // Salva no novo padrão
          saveHistory(entries, player);
        }
      } catch (_eMig) {}
    }

    // Ordena do mais recente para o mais antigo
    return entries.sort(function (a, b) {
      return (b.ts || 0) - (a.ts || 0);
    });
  }

  /**
   * Persiste a lista de histórico no localStorage.
   */
  function saveHistory(entries, player) {
    var key = getCharacterKey(player);
    try {
      if (!Array.isArray(entries)) entries = [];
      if (entries.length > MAX_ENTRIES_PER_CHAR) {
        entries = entries.slice(0, MAX_ENTRIES_PER_CHAR);
      }
      localStorage.setItem(key, JSON.stringify(entries));
    } catch (_e) {
      console.warn('[dialogue-history] Falha ao persistir no localStorage:', _e);
    }
  }

  /**
   * Sanitiza e normaliza o objeto do NPC para gravação.
   */
  function _normalizeNpc(rawNpc) {
    if (!rawNpc) return { name: 'Interlocutor', desc: '', portrait: 'ic-dialogo', portraitImg: null };
    if (typeof rawNpc === 'string') {
      var reg = (typeof window !== 'undefined' && window.RECURRING_NPCS) || {};
      var hit = reg[rawNpc] || {};
      return {
        id: rawNpc,
        name: hit.name || rawNpc,
        desc: hit.desc || '',
        portrait: hit.portrait || 'ic-dialogo',
        portraitImg: hit.portraitImg || null
      };
    }
    return {
      id: rawNpc.id || rawNpc.key || '',
      name: rawNpc.name || 'Interlocutor',
      desc: rawNpc.desc || '',
      portrait: rawNpc.portrait || 'ic-dialogo',
      portraitImg: rawNpc.portraitImg || null
    };
  }

  /**
   * Sanitiza e normaliza o script (falas e narrações).
   */
  function _normalizeScript(script) {
    if (!Array.isArray(script)) return [];
    return script.map(function (line) {
      if (!line) return null;
      return {
        type: line.type || 'narration',
        speaker: line.speaker || null,
        text: String(line.text || line.content || '')
      };
    }).filter(function (l) { return l && l.text.trim().length > 0; });
  }

  /**
   * Normaliza a lista de opções disponíveis para escolha.
   */
  function _normalizeAvailableChoices(choices) {
    if (!Array.isArray(choices)) return [];
    return choices.map(function (c) {
      if (!c) return null;
      var label = typeof c === 'string' ? c : (c.label || c.title || '');
      var desc = c.desc || c.result_hint || '';
      var skill = c.skill || (c.check && c.check.skill) || null;
      var dc = c.dc || (c.check && c.check.dc) || null;
      var cost = c.cost || null;
      return {
        id: c.id || '',
        label: label,
        desc: desc,
        skill: skill,
        dc: dc,
        cost: cost
      };
    }).filter(function (c) { return c && c.label; });
  }

  /**
   * Registra o início de uma conversa / encontro.
   * Retorna o ID único da entrada criada.
   */
  function recordStart(dialogue, opts) {
    if (!dialogue) return null;
    opts = opts || {};
    var player = opts.player || null;
    var npc = _normalizeNpc(dialogue.npc);
    var script = _normalizeScript(dialogue.script);
    var available = _normalizeAvailableChoices(dialogue.choices);

    // Evita duplicar se o script e NPC forem exatamente os mesmos do último registrado nos últimos 3 segundos
    var history = getHistory(player);
    var now = Date.now();
    if (history.length > 0) {
      var last = history[0];
      if (now - (last.ts || 0) < 3000 && last.npc && last.npc.name === npc.name) {
        var isSameScript = (last.script || []).length === script.length &&
          (last.script || []).every(function (l, i) { return script[i] && l.text === script[i].text; });
        if (isSameScript) {
          _lastActiveEntryId = last.id;
          return last.id;
        }
      }
    }

    var entryId = 'dlg_' + now + '_' + Math.random().toString(36).substr(2, 5);
    var entry = {
      id: entryId,
      ts: now,
      npc: npc,
      location: opts.location || (typeof window !== 'undefined' && window._currentScreen ? String(window._currentScreen) : ''),
      script: script,
      availableChoices: available,
      chosen: null,
      check: null,
      outcome: null,
      rewards: null
    };

    history.unshift(entry);
    saveHistory(history, player);
    _lastActiveEntryId = entryId;
    return entryId;
  }

  /**
   * Registra a escolha tomada pelo jogador.
   */
  function recordChoice(entryId, choice, checkResult, outcomeData, player) {
    var targetId = entryId || _lastActiveEntryId;
    if (!choice) return;

    var history = getHistory(player);
    var entry = null;
    for (var i = 0; i < history.length; i++) {
      if (history[i].id === targetId) {
        entry = history[i];
        break;
      }
    }

    if (!entry) {
      // Se não encontrou pelo ID, atualiza o primeiro registro recente se existir
      if (history.length > 0) entry = history[0];
      else return;
    }

    var label = typeof choice === 'string' ? choice : (choice.label || choice.title || choice.id || '');
    var desc = (choice && choice.desc) || (choice && choice.result_hint) || '';
    entry.chosen = {
      id: (choice && choice.id) || '',
      label: label,
      desc: desc,
      cost: (choice && choice.cost) || null
    };

    if (checkResult) {
      entry.check = checkResult;
    }

    if (outcomeData) {
      if (Array.isArray(outcomeData)) {
        entry.outcome = _normalizeScript(outcomeData);
      } else if (typeof outcomeData === 'string') {
        entry.outcome = [{ type: 'narration', text: outcomeData }];
      }
    }

    saveHistory(history, player);
  }

  /**
   * Registra o resultado de um teste de atributos/perícias (D&D 5e).
   */
  function recordCheck(checkData, entryId, player) {
    if (!checkData) return;
    var targetId = entryId || _lastActiveEntryId;
    var history = getHistory(player);
    var entry = null;
    for (var i = 0; i < history.length; i++) {
      if (history[i].id === targetId) {
        entry = history[i];
        break;
      }
    }

    if (!entry) {
      if (history.length > 0) entry = history[0];
      else return;
    }

    entry.check = {
      stat: checkData.stat || null,
      skill: checkData.skill || checkData.stat || null,
      dc: typeof checkData.dc === 'number' ? checkData.dc : null,
      mod: typeof checkData.mod === 'number' ? checkData.mod : 0,
      d20: typeof checkData.d20 === 'number' ? checkData.d20 : null,
      total: typeof checkData.total === 'number' ? checkData.total : null,
      success: !!checkData.success,
      critSuccess: !!checkData.critSuccess,
      critFail: !!checkData.critFail
    };

    saveHistory(history, player);
  }

  /**
   * Registra o desfecho narrativo (falas pós-escolha) e recompensas obtidas.
   */
  function recordOutcome(outcomeData, rewards, entryId, player) {
    var targetId = entryId || _lastActiveEntryId;
    var history = getHistory(player);
    var entry = null;
    for (var i = 0; i < history.length; i++) {
      if (history[i].id === targetId) {
        entry = history[i];
        break;
      }
    }

    if (!entry) {
      if (history.length > 0) entry = history[0];
      else return;
    }

    if (outcomeData) {
      if (Array.isArray(outcomeData)) {
        entry.outcome = _normalizeScript(outcomeData);
      } else if (typeof outcomeData === 'string' && outcomeData.trim().length > 0) {
        entry.outcome = [{ type: 'narration', text: outcomeData.trim() }];
      }
    }

    if (Array.isArray(rewards) && rewards.length > 0) {
      entry.rewards = rewards.map(function (r) {
        return {
          type: r.type || 'gold',
          amount: r.amount || 0,
          label: r.label || ''
        };
      });
    }

    saveHistory(history, player);
  }

  /**
   * Anexa novas falas a uma entrada existente (útil para nós subsequentes / chains).
   */
  function appendScript(scriptLines, entryId, player) {
    if (!Array.isArray(scriptLines) || scriptLines.length === 0) return;
    var targetId = entryId || _lastActiveEntryId;
    var history = getHistory(player);
    var entry = null;
    for (var i = 0; i < history.length; i++) {
      if (history[i].id === targetId) {
        entry = history[i];
        break;
      }
    }
    if (!entry) return;

    var normalized = _normalizeScript(scriptLines);
    if (!entry.outcome) entry.outcome = [];
    normalized.forEach(function (line) {
      entry.outcome.push(line);
    });

    saveHistory(history, player);
  }

  /**
   * Limpa todo o histórico de diálogos do personagem ativo.
   */
  function clearHistory(player) {
    var key = getCharacterKey(player);
    try {
      localStorage.removeItem(key);
    } catch (_e) {}
  }

  // Exportação canônica universal
  var api = {
    getCharacterKey: getCharacterKey,
    getHistory: getHistory,
    recordStart: recordStart,
    recordChoice: recordChoice,
    recordCheck: recordCheck,
    recordOutcome: recordOutcome,
    appendScript: appendScript,
    clearHistory: clearHistory
  };

  root.vDialogueHistory = api;
})(typeof window !== 'undefined' ? window : this);
