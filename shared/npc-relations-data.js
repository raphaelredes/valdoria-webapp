/* ============================================================================
 * npc-relations-data.js — NPC relations matrix + events timeline (pure data)
 * ============================================================================
 *
 * MAPA_IA — navegação rápida:
 *   ~30    NPC_IDS canonical (18 slugs)
 *   ~60    NPC_RELATIONS matrix (relacionamentos canonical inter-NPC)
 *   ~280   NPC_EVENTS_TIMELINE (eventos cíclicos que afetam NPCs)
 *   ~360   helpers: _getRelation, _getActiveEvents
 *
 * Busca rápida:
 *   grep "aldwin"     → relações de Aldwin
 *   grep "festival"   → eventos festival
 *   grep "type: '"    → tipos canonical de relação (old_friend, rival, etc)
 *
 * ============================================================================
 * RELATION TYPES canonical:
 *   - old_friend   : amizade longa, history compartilhada
 *   - mentor       : ensinou/treinou o outro
 *   - rival        : competição amigável ou hostil
 *   - sibling      : irmãos consanguíneos (raro em Valdoria)
 *   - creditor     : um deve dinheiro/favor ao outro
 *   - peer         : mesma profissão, colegas
 *   - secret       : segredo compartilhado (player descobre via cascata)
 *
 * STRENGTH (0.0 - 1.0): força/proximidade da relação. Usado pra peso de gossip.
 *
 * REVEAL_THRESHOLD: visits que player precisa ter com o SPEAKER pra que o
 * gossip apareça (NPC só fofoca depois de confiança mínima).
 *
 * ============================================================================ */

(function(){
  'use strict';

  // === NPC_IDS canonical (18 slugs) =========================================
  // Os 18 NPCs documentados em memory/reference_npc_personalities_canonical.md
  // (sections 1-18). Slug = primeiro nome lowercase.
  window.NPC_IDS = [
    // Taverna
    'grom',
    // Banco
    'aldwin',
    // Estalagem
    'martha',
    // Templo
    'elara', 'aldwynn', 'miriel', 'theron',
    // Guilda
    'tavira', 'braun',
    // Arena
    'vorhan',
    // Oficina
    'garrick',
    // Runas
    'thessil',
    // Mercado
    'thorne', 'mirena', 'velithra', 'corvus', 'bjorn', 'garlen'
  ];

  // === NPC_RELATIONS matrix =================================================
  // Asimétrica (Aldwin pode ver Tavira de modo diferente que Tavira vê Aldwin).
  // Apenas relações ATIVAS — pares sem entry são "desconhecidos" entre si.
  //
  // gossip: linha que o speaker fala sobre o target QUANDO o player demonstra
  // interesse (e.g. via cb 'cascade:speaker:gossip_target').
  //
  // reveal_threshold: visits que player precisa ter com speaker pra gossip
  // ficar disponível (0 = sempre disponível, 3 = após 3 visitas mínimo).
  window.NPC_RELATIONS = {

    // === ALDWIN (Banco) =====================================================
    'aldwin': {
      'tavira': {
        type: 'old_friend',
        strength: 0.85,
        reveal_threshold: 2,
        gossip: 'Tavira veio aqui antes da Guilda — uma aventureira de couro queimado e olhar de aço. Bom cliente. Pagava todas as dívidas no prazo.',
        unlock: 'tavira:gossip_aldwin_old_client'
      },
      'corvus': {
        type: 'creditor',
        strength: 0.4,
        reveal_threshold: 3,
        gossip: 'O livreiro Corvus deve à Casa de Tholram um empréstimo antigo. Educado, mas o atraso preocupa.',
        unlock: 'corvus:gossip_aldwin_loan'
      },
      'garrick': {
        type: 'peer',
        strength: 0.6,
        reveal_threshold: 1,
        gossip: 'Mestre Garrick deposita o lucro semanal aqui. Anão prudente — sabe que ouro vale mais guardado que gasto.'
      }
    },

    // === TAVIRA (Guilda) ====================================================
    'tavira': {
      'aldwin': {
        type: 'old_friend',
        strength: 0.85,
        reveal_threshold: 1,
        gossip: 'Aldwin? Conheci antes da Casa de Tholram ter aquele nome. Velho. Mantém memórias mais firmes que os números.',
        unlock: 'aldwin:gossip_tavira_aventureira'
      },
      'braun': {
        type: 'peer',
        strength: 0.9,
        reveal_threshold: 0,
        gossip: 'Braun? Meu quartelmestre desde a primeira missão. Confio nele com o estoque mais que com minha sombra.'
      },
      'vorhan': {
        type: 'rival',
        strength: 0.7,
        reveal_threshold: 2,
        gossip: 'O Vorhan da Arena? Já fomos parceiros num contrato no norte. Ele venceu a aposta — eu nunca paguei.'
      }
    },

    // === BRAUN (Guilda Quartelmestre) =======================================
    'braun': {
      'tavira': {
        type: 'peer',
        strength: 0.9,
        reveal_threshold: 0,
        gossip: 'A Mestra é dura — mas justa. Devolveu pra Guilda mais do que tomou. Eu sigo onde ela manda.'
      },
      'vorhan': {
        type: 'old_friend',
        strength: 0.75,
        reveal_threshold: 2,
        gossip: 'Vorhan? Outro meio-orc neste cu de mundo. Lutamos no Norte juntos. Cicatrizes iguais.'
      }
    },

    // === VORHAN (Arena) =====================================================
    'vorhan': {
      'tavira': {
        type: 'rival',
        strength: 0.7,
        reveal_threshold: 1,
        gossip: 'A Mestra me deve uma aposta. Vinte Valdoritas. Cobro toda vez que ela aparece.'
      },
      'braun': {
        type: 'old_friend',
        strength: 0.75,
        reveal_threshold: 1,
        gossip: 'Braun? Sangue dos Sete Picos. Já o vi quebrar um goblin com a mão esquerda. Confio nele.'
      }
    },

    // === MARTHA (Estalagem) =================================================
    'martha': {
      'grom': {
        type: 'rival',
        strength: 0.55,
        reveal_threshold: 1,
        gossip: 'Aquele caolho da taverna rouba meus hóspedes pro mead barato. Mas eu cozinho melhor.'
      },
      'aldwynn': {
        type: 'old_friend',
        strength: 0.7,
        reveal_threshold: 0,
        gossip: 'Padre Aldwynn vem aqui aos domingos. Sopa de aboboráh e silêncio. Bom homem.'
      }
    },

    // === GROM (Taverna) =====================================================
    'grom': {
      'martha': {
        type: 'rival',
        strength: 0.55,
        reveal_threshold: 1,
        gossip: 'A Martha cobra o triplo por cama de palha. Aqui um barril resolve dor e sono. Não compete.'
      },
      'vorhan': {
        type: 'peer',
        strength: 0.6,
        reveal_threshold: 2,
        gossip: 'O orc da Arena bebe aqui de vez em quando. Paga em ouro de aposta ganha. Quieto pra um lutador.'
      }
    },

    // === ELARA (Templo) =====================================================
    'elara': {
      'aldwynn': {
        type: 'mentor',
        strength: 0.9,
        reveal_threshold: 0,
        gossip: 'Padre Aldwynn foi quem me trouxe à fé dos Quatro. Sua paciência ensina mais que mil sermões.'
      },
      'miriel': {
        type: 'peer',
        strength: 0.8,
        reveal_threshold: 1,
        gossip: 'Sacerdotisa Miriel veio do Sul. Marcial demais para meu gosto — mas cura como ninguém.'
      },
      'theron': {
        type: 'mentor',
        strength: 0.7,
        reveal_threshold: 0,
        gossip: 'O pequeno Theron... ele tropeça mais que reverencia. Mas tem coração. Vai longe se sobreviver à pressa.'
      }
    },

    // === ALDWYNN (Templo Padre) =============================================
    'aldwynn': {
      'elara': {
        type: 'mentor',
        strength: 0.9,
        reveal_threshold: 0,
        gossip: 'Irmã Elara cresceu rápido na fé. Hoje ensina onde eu apenas escuto. É como deve ser.'
      },
      'martha': {
        type: 'old_friend',
        strength: 0.7,
        reveal_threshold: 1,
        gossip: 'Martha alimenta minha alma e meu estômago. Domingos sem caldo dela seriam pobres.'
      }
    },

    // === MIRIEL (Templo Sacerdotisa Dragonborn) =============================
    'miriel': {
      'theron': {
        type: 'mentor',
        strength: 0.6,
        reveal_threshold: 1,
        gossip: 'O acólito halfling? Ensino com firmeza. Ele teme — bom. Quem não teme não aprende a lutar pela vida.'
      }
    },

    // === THERON (Templo Acólito Halfling) ===================================
    'theron': {
      'miriel': {
        type: 'mentor',
        strength: 0.6,
        reveal_threshold: 0,
        gossip: 'A Sacerdotisa Miriel... ela é severa. M-mas ensina coisas que I-irmã Elara não menciona. Coragem real.'
      },
      'elara': {
        type: 'mentor',
        strength: 0.8,
        reveal_threshold: 0,
        gossip: 'Irmã Elara é minha guia. Ela tem paciência com... com minha desajeitação. Espero um dia honrar a treina dela.'
      }
    },

    // === GARRICK (Oficina) ==================================================
    'garrick': {
      'thorne': {
        type: 'mentor',
        strength: 0.85,
        reveal_threshold: 1,
        gossip: 'Thorne foi meu aprendiz por sete anos. Hoje vende no Mercado — mas a marca da minha bigorna ainda corta aço.'
      },
      'aldwin': {
        type: 'peer',
        strength: 0.6,
        reveal_threshold: 2,
        gossip: 'Banqueiro Aldwin guarda meu lucro. Sem juros — só prudência. Sabe valor de mão calejada.'
      }
    },

    // === THORNE (Mercado Armeiro) ===========================================
    'thorne': {
      'garrick': {
        type: 'mentor',
        strength: 0.85,
        reveal_threshold: 0,
        gossip: 'Mestre Garrick me ensinou tudo. Hoje vendo o aço da Bigorna no Mercado — comissão dele, lucro meu.'
      }
    },

    // === THESSIL (Runas Meio-elfo) ==========================================
    'thessil': {
      'corvus': {
        type: 'rival',
        strength: 0.5,
        reveal_threshold: 2,
        gossip: 'Corvus, o livreiro tiefling? Pediu-me uma vez algo... que eu recusei. Não tomamos chá juntos desde então.'
      }
    },

    // === CORVUS (Mercado Livreiro Tiefling) =================================
    'corvus': {
      'thessil': {
        type: 'rival',
        strength: 0.5,
        reveal_threshold: 2,
        gossip: 'O escriba Thessil... há tomos que nem ele aceita ler. Eu compreendo o motivo — mas guardo mágoa antiga.'
      },
      'aldwin': {
        type: 'creditor',
        strength: 0.4,
        reveal_threshold: 3,
        gossip: 'Devo à Casa de Tholram. Honro a dívida — só com... atrasos honestos. Livros raros levam tempo a vender.'
      }
    },

    // === VELITHRA (Mercado Alquimista Elfa) =================================
    'velithra': {
      'mirena': {
        type: 'rival',
        strength: 0.6,
        reveal_threshold: 1,
        gossip: 'A gnoma Mirena pensa que armadura é arte. Erva e poção também são. Diferentes — mas se respeitam ou não, a escolha é dela.'
      }
    },

    // === MIRENA (Mercado Armadureira Gnoma) =================================
    'mirena': {
      'velithra': {
        type: 'rival',
        strength: 0.6,
        reveal_threshold: 1,
        gossip: 'Velithra mistura poções e diz que protegem. Minha couraça é mais confiável que três poções dela. Vamos ver quem dura.'
      }
    },

    // === BJORN (Mercado Mantimentos Halfling) ===============================
    'bjorn': {
      'garlen': {
        type: 'peer',
        strength: 0.7,
        reveal_threshold: 1,
        gossip: 'Garlen mapeia, eu alimento. Ele vai longe nas montanhas; minha ração viaja com ele. Boa parceria.'
      }
    },

    // === GARLEN (Mercado Cartógrafo) ========================================
    'garlen': {
      'bjorn': {
        type: 'peer',
        strength: 0.7,
        reveal_threshold: 0,
        gossip: 'Bjorn vende ração e queijo que dura semanas. Faço meus mapas com a barriga cheia graças a ele.'
      }
    }

  };

  // === NPC_EVENTS_TIMELINE ==================================================
  // Eventos cíclicos que afetam NPCs ao longo do tempo de jogo.
  //
  // frequency: 'monthly' (1× por mês), 'seasonal' (1× por estação),
  //            'annual' (1× por ano), 'variable' (gatilho do master)
  //
  // affected_npcs: lista de slugs afetados durante o evento
  //
  // effects: { closed_services?, mood_shift?, dialogue_override? }
  //
  // narrative: descrição curta pra render no UI (e.g. badge sobre o NPC)
  window.NPC_EVENTS_TIMELINE = [

    {
      id: 'festival_moon',
      name: 'Festival da Lua',
      frequency: 'monthly',
      duration_days: 1,
      affected_npcs: ['elara', 'aldwynn', 'miriel', 'theron'],
      effects: {
        closed_services: ['heal', 'cure_poison', 'bless', 'raise_dead'],
        mood_shift: '+1',
        dialogue_override: 'O Templo está fechado para o Festival da Lua. Volte amanhã.'
      },
      narrative: 'Os sacerdotes ocupados em vigília lunar — Templo fechado por hoje.'
    },

    {
      id: 'caravan_north',
      name: 'Caravana do Norte',
      frequency: 'seasonal',
      duration_days: 7,
      affected_npcs: ['garlen', 'bjorn'],
      effects: {
        closed_services: ['mapas', 'mantimentos'],
        dialogue_override: 'Saiu com a caravana. Volta em uma semana.'
      },
      narrative: 'Caravana sazonal — Garlen e Bjorn fora por uma semana.'
    },

    {
      id: 'tournament_annual',
      name: 'Torneio Anual',
      frequency: 'annual',
      duration_days: 3,
      affected_npcs: ['vorhan', 'braun'],
      effects: {
        mood_shift: '+2',
        dialogue_override: 'Treinando pro Torneio Anual. Toda atenção em afiar lâminas.'
      },
      narrative: 'Vorhan e Braun preparando o Torneio Anual — falas focadas em combate.'
    },

    {
      id: 'inspection_count',
      name: 'Inspeção do Conde',
      frequency: 'variable',
      duration_days: 2,
      affected_npcs: ['aldwin', 'tavira'],
      effects: {
        mood_shift: '-1',
        dialogue_override: 'Inspeção do Conde — fala curto, fala sério. Não há tempo pra rodeios.'
      },
      narrative: 'Conde Valdor vem inspecionar — Aldwin checa cofres, Tavira ajeita guarda.'
    },

    {
      id: 'market_fair',
      name: 'Feira de Valdoria',
      frequency: 'monthly',
      duration_days: 2,
      affected_npcs: ['thorne', 'mirena', 'velithra', 'corvus', 'bjorn', 'garlen'],
      effects: {
        mood_shift: '+1'
        // Sem closed_services — Feira POTENCIALIZA o Mercado, não fecha
      },
      narrative: 'Feira mensal — Mercado movimentado, NPCs animados, preços negociáveis.'
    },

    {
      id: 'old_war_memorial',
      name: 'Memória da Guerra Antiga',
      frequency: 'annual',
      duration_days: 1,
      affected_npcs: ['vorhan', 'braun'],
      effects: {
        mood_shift: '-2',
        dialogue_override: 'Hoje não. Hoje é dia de lembrar dos caídos no Norte.'
      },
      narrative: 'Aniversário da Guerra do Norte — meio-orcs em luto silencioso.'
    }

  ];

  // === Helpers ==============================================================
  // _getRelation(speakerNpcId, targetNpcId) — atalho pra NPC_RELATIONS lookup
  window._getRelation = function(speakerNpcId, targetNpcId){
    const rels = window.NPC_RELATIONS[speakerNpcId];
    return (rels && rels[targetNpcId]) ? rels[targetNpcId] : null;
  };

  // _getActiveEvents() — retorna lista de eventos atualmente "ativos"
  // (estratégia simples: usa Math.floor(Date.now() / period) % N — para
  // simulação. Backend real teria calendar persistente.)
  //
  // Para dev/test, pode forçar via window._npcForceActiveEvents = ['festival_moon']
  window._getActiveEvents = function(){
    if (window._npcForceActiveEvents) {
      return window.NPC_EVENTS_TIMELINE.filter(e =>
        window._npcForceActiveEvents.indexOf(e.id) !== -1
      );
    }
    // Default: nenhum evento ativo (mockup mode normal)
    return [];
  };

  // _isNpcEventActive(npcId) — retorna evento ativo afetando o NPC, se houver
  window._isNpcEventActive = function(npcId){
    const events = window._getActiveEvents();
    for (let i = 0; i < events.length; i++) {
      if (events[i].affected_npcs.indexOf(npcId) !== -1) return events[i];
    }
    return null;
  };

  // === Bootstrap log ========================================================
  if (typeof window._logCity === 'function') {
    window._logCity('[NPC-LIVING] npc-relations-data.js loaded — ' +
      Object.keys(window.NPC_RELATIONS).length + ' speakers, ' +
      window.NPC_EVENTS_TIMELINE.length + ' events');
  }

})();
