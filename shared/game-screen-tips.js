/* ============================================================================
 * game-screen-tips.js — Sistema Universal de Dicas Não-Intrusivas (Opção 10)
 * ============================================================================
 *
 * Ordem do Usuário 2026-10 (IMUTÁVEL):
 * - Banimento permanente de popups/modais intrusivos no carregamento de telas.
 * - Padrão canônico Opção 10: Cápsula Minimalista com Aro SVG (Pill & Ring Timer).
 * - Exibição nas 3 primeiras aberturas da tela se não for aberta; se aberta uma vez,
 *   não exibe mais automaticamente.
 * - Piso mínimo tipográfico: font-size >= 11px em todos os textos.
 * - Viewport Telegram Desktop (380px–460px), mobile-first, sem scroll horizontal.
 * ============================================================================ */

(function(window) {
  'use strict';

  var TIPS_DATABASE = {
    // === CIDADE DE VALDORIA ===
    'city_bank': {
      badge: 'Banco de Valdoria',
      title: 'Cofres Reais & Custódia',
      icon: '🏦',
      npc: 'Aldwin de Tholram · Banqueiro',
      items: [
        {
          title: '💰 Depósito Livre (Taxa Zero - 0%)',
          desc: 'Depositar Valdoritas no Banco é <strong>100% gratuito</strong>. Cada moeda entregue a Aldwin é guardada integralmente no seu cofre pessoal.'
        },
        {
          title: '🛡️ Proteção nos Ermos (D&D 5e)',
          desc: 'Se você for derrotado ou cair inconsciente a 0 PV nas estradas e masmorras, <strong>todo o ouro e itens mantidos no Banco permanecem intactos</strong>. Moedas soltas na bolsa de viagem podem ser saqueadas por monstros ou bandidos!'
        },
        {
          title: '⚖️ Saque de Conveniência (Taxa de 2%)',
          desc: 'Ao retirar Valdoritas do cofre, incide apenas uma modesta taxa administrativa de <strong>2% sobre o montante sacado</strong>. Retire apenas o que pretende gastar no comércio urbano.'
        },
        {
          title: '🎒 Cofre de Pertences (Alívio de Carga)',
          desc: 'Armaduras pesadas, armas extras e relíquias raras podem ser guardadas no cofre de itens, liberando peso da mochila e <strong>evitando penalidades de sobrepeso</strong> nas marchas.'
        },
        {
          title: '⚔️ Dica Tática de Andarilho',
          desc: 'Antes de cruzar os portões da cidade para uma longa expedição pelos ermos, passe no Banco e deposite o excesso de moedas. Viaje leve e prevenido!'
        }
      ]
    },

    'city_tavern': {
      badge: 'Taverna do Javali Bêbado',
      title: 'Boatos, Dados & Descanso',
      icon: '🍺',
      npc: 'Grond · Taverneiro & Bardo',
      items: [
        {
          title: '👂 Boatos & Segredos',
          desc: 'Converse com clientes e beba canecas de hidromel para descobrir <strong>fraquezas de monstros</strong> e rumores de tesouros escondidos nos ermos.'
        },
        {
          title: '🎲 Jogos de Dados (Valdoria Bones)',
          desc: 'Teste sua sorte e perspicácia nas mesas de apostas para multiplicar Valdoritas e aumentar seu renome local.'
        },
        {
          title: '🍖 Refeições Revigorantes',
          desc: 'Pratos quentes na taverna restauram vigor e concedem bônus de recuperação para suas viagens.'
        },
        {
          title: '👥 Recrutamento de Aliados',
          desc: 'Conheça mercenários e andarilhos dispostos a integrar sua comitiva em troca de uma fatia justa dos espólios.'
        }
      ]
    },

    'city_temple': {
      badge: 'Templo dos Quatro',
      title: 'Bênçãos & Curas Divinas',
      icon: '✨',
      npc: 'Irmã Melissa · Alta Sacerdotisa',
      items: [
        {
          title: '🕊️ Cura Sagrada',
          desc: 'Sacerdotes canalizam a energia divina para <strong>restaurar pontos de vida</strong>, neutralizar venenos e purificar maldições antigas.'
        },
        {
          title: '🙏 Doações & Bênçãos',
          desc: 'Oferendas no altar concedem bênçãos sagradas com bônus de salvaguarda (<strong>+1d4 de Suporte Divino</strong>) durante a próxima expedição.'
        },
        {
          title: '🕯️ Renome com o Clero',
          desc: 'Quanto maior sua reputação com o templo, menores são os custos de rituais de ressurreição e restauração maior.'
        }
      ]
    },

    'city_market': {
      badge: 'Mercado de Valdoria',
      title: 'Comércio, Compra & Venda',
      icon: '⚖️',
      npc: 'Comerciantes da Praça',
      items: [
        {
          title: '💰 Venda de Espólios',
          desc: 'Venda armas excedentes, gemas preciosas e despojos de criaturas abatidas por <strong>60% do valor de tabela PHB</strong>.'
        },
        {
          title: '🧪 Suprimentos Essenciais',
          desc: 'Mantenha sempre em sua mochila tochas, cordas de cânhamo, rações de viagem e <strong>poções de cura</strong> antes de marchar.'
        },
        {
          title: '💬 Pechincha & Persuasão',
          desc: 'Testes de lábia ou persuasão bem-sucedidos podem render <strong>descontos vantajosos</strong> em equipamentos raros.'
        }
      ]
    },

    'city_guild': {
      badge: 'Guilda dos Aventureiros',
      title: 'Contratos & Comitiva',
      icon: '⚔️',
      npc: 'Mestra Tavira · Comandante',
      items: [
        {
          title: '📜 Contratos de Caça',
          desc: 'Escolha missões com níveis de desafio (ND) adequados ao poder da sua comitiva para obter <strong>XP substancial e recompensas em ouro</strong>.'
        },
        {
          title: '🛡️ Formação de Batalha',
          desc: 'Organize as posições de <strong>vanguarda</strong> (combatentes corpo a corpo) e <strong>retaguarda</strong> (conjuradores e atiradores) da sua comitiva.'
        },
        {
          title: '🏅 Ranque de Membro',
          desc: 'Concluir missões eleva sua patente na Guilda, garantindo acesso a equipamentos de patente superior e mercenários veteranos.'
        }
      ]
    },

    'city_workshop': {
      badge: 'Oficina de Artesanato',
      title: 'Forja & Reparos de Armas',
      icon: '🔨',
      npc: 'Mestre Ferreiro',
      items: [
        {
          title: '⚒️ Manutenção de Equipamento',
          desc: 'Armas e armaduras desgastadas após confrontos intensos podem ser restauradas para recuperar sua <strong>eficácia total</strong>.'
        },
        {
          title: '🛡️ Forja Customizada',
          desc: 'Forje armaduras com lingotes de minério e peles colhidas nos ermos para elevar a <strong>Classe de Armadura (CA)</strong> dos personagens.'
        },
        {
          title: '🔧 Aprimoramento de Balcão',
          desc: 'Melhore o balanceamento de lâminas e o reforço de escudos antes de enfrentar inimigos de grande porte.'
        }
      ]
    },

    'city_runes': {
      badge: 'Escriba Rúnico',
      title: 'Encantamentos & Runas',
      icon: 'ᚱ',
      npc: 'Eirik · Sábio das Runas',
      items: [
        {
          title: '🔮 Gravação de Runas',
          desc: 'Insira pedras rúnicas nos engastes de suas armas para converter ou adicionar <strong>dano mágico</strong> (flamejante, gélido, elétrico).'
        },
        {
          title: '📜 Desencantamento',
          desc: 'Desmonte relíquias e peças arcanas obsoletas para recuperar <strong>pó arcano</strong> e fragmentos rúnicos raros.'
        },
        {
          title: '⚡ Combinações Rúnicas',
          desc: 'Certos conjuntos de runas gravados no mesmo equipamento ativam <strong>poderes passivos lendários</strong>.'
        }
      ]
    },

    'city_arena': {
      badge: 'Arena de Valdoria',
      title: 'Coliseu, Duelos & Apostas',
      icon: '🏟️',
      npc: 'Mestre dos Jogos',
      items: [
        {
          title: '⚔️ Duelos de Gladiadores',
          desc: 'Enfrente desafios táticos em tiers de dificuldade crescentes contra feras e campeões da arena.'
        },
        {
          title: '🪙 Apostas de Combate',
          desc: 'Avalie as probabilidades dos confrontos e aposte Valdoritas para multiplicar suas riquezas.'
        },
        {
          title: '🏆 Glória Urbana',
          desc: 'Vitórias na arena aumentam seu renome entre a guarda e autoridades de Valdoria, abrindo portas em toda a cidade.'
        }
      ]
    },

    'city_inn': {
      badge: 'Estalagem Pena-Dourada',
      title: 'Descanso Longo & Aposentos',
      icon: '🛏️',
      npc: 'Martha · Estalajadeira',
      items: [
        {
          title: '🌙 Descanso Longo Seguro',
          desc: 'Dormir na estalagem recupera <strong>100% dos Pontos de Vida (PV)</strong>, restaura todos os Espaços de Magia e Dados de Vida.'
        },
        {
          title: '🛌 Dissipar Exaustão',
          desc: 'O repouso completo em cama quente zera níveis de <strong>exaustão</strong> acumulados durante marchas duras.'
        },
        {
          title: '👑 Aposentos de Luxo',
          desc: 'Quartos superiores concedem <strong>PV temporários</strong> adicionais que duram até os primeiros combates da jornada seguinte.'
        }
      ]
    },

    'city_square': {
      badge: 'Praça Central',
      title: 'Vida Urbana & O Cartógrafo',
      icon: '🏛️',
      items: [
        {
          title: '🗺️ O Cartógrafo de Valdoria',
          desc: 'Adquira mapas de províncias vizinhas para facilitar navegação e reduzir drasticamente o risco de se perder.'
        },
        {
          title: '🔨 Trabalhos Temporários',
          desc: 'Realize pequenas tarefas urbanas para obter Valdoritas garantidas sem arriscar a vida nos ermos.'
        },
        {
          title: '🗣️ Andarilhos & Viajantes',
          desc: 'Converse com habitantes locais para destravar novas pistas de missões e contatos comerciais.'
        }
      ]
    },

    'city_gates': {
      badge: 'Portões da Cidade',
      title: 'Sentinelas da Muralha & Partida',
      icon: '🚪',
      npc: 'Sentinela Aldric',
      items: [
        {
          title: '🌲 Rumo aos Ermos Selvagens',
          desc: 'Ponto oficial de partida para expedições nos mapas continentais e provinciais de Valdoria.'
        },
        {
          title: '🎒 Checklist de Sobrevivência',
          desc: 'Confirme rações, água, tochas e certifique-se de que o excesso de ouro está seguro no Banco antes de cruzar os portões.'
        },
        {
          title: '🌦️ Relatório dos Sentinelas',
          desc: 'Sentinelas fornecem informações valiosas sobre o tempo meteorológico e movimentação de bandidos na região.'
        }
      ]
    },

    'city_hub': {
      badge: 'Cidade de Valdoria',
      title: 'Seu Refúgio Seguro',
      icon: '🏰',
      items: [
        {
          title: '🛡️ Zona Pacífica',
          desc: 'As ruas fortificadas de Valdoria são imunes a ataques aleatórios e emboscadas de monstros.'
        },
        {
          title: '📋 Menu Rápido Inferior',
          desc: 'Acesse a Mochila, Ficha do Personagem e Diário a qualquer momento pela barra de navegação inferior.'
        },
        {
          title: '🧭 Preparação Estratégica',
          desc: 'Visite cada distrito urbano para preparar suprimentos e alianças antes de longas jornadas.'
        }
      ]
    },

    // === COMBATE TÁTICO ===
    'combat_main': {
      badge: 'Combate Tático D&D 5e',
      title: 'Iniciativa, Ações & Grade',
      icon: '⚔️',
      items: [
        {
          title: '🎲 Iniciativa & Ordem de Turnos',
          desc: 'O confronto inicia com a rolagem de iniciativa (<strong>d20 + Destreza</strong>). Quem obtiver maior valor age primeiro.'
        },
        {
          title: '⚡ Economia de Ações',
          desc: 'A cada rodada você tem: <strong>1 Ação Principal</strong> (Atacar, Magia, Desengajar, Esquivar), <strong>1 Ação Bônus</strong> e <strong>Movimento</strong> na grade hexagonal.'
        },
        {
          title: '🏃 Desengajar vs Ataque de Oportunidade',
          desc: 'Sair do alcance corpo a corpo de um inimigo sem a ação <strong>Desengajar</strong> concede a ele um ataque de oportunidade imediato!'
        },
        {
          title: '🛡️ Ação Esquivar',
          desc: 'A ação Esquivar impõe <strong>desvantagem em todos os ataques</strong> inimigos direcionados a você até seu próximo turno.'
        }
      ]
    },

    'combat_magic': {
      badge: 'Magia & Invocações',
      title: 'Concentração & Táticas Arcanas',
      icon: '🔮',
      items: [
        {
          title: '🧘 Limite de Concentração',
          desc: 'Apenas <strong>uma magia com concentração</strong> pode ser mantida ativa por conjurador por vez. Lançar outra encerra a primeira.'
        },
        {
          title: '💔 Salvaguarda ao Sofrer Dano',
          desc: 'Sofrer dano enquanto concentrado exige um <strong>Teste de Resistência de Constituição</strong> (CD 10 ou metade do dano sofrido).'
        },
        {
          title: '🐾 Invocação de Criaturas',
          desc: 'Criaturas invocadas por magias de concentração dissipam se o conjurador cair inconsciente a 0 PV.'
        }
      ]
    },

    // === EXPLORAÇÃO & CARTOGRAFIA ===
    'explore_travel': {
      badge: 'Cartografia & Viagem',
      title: 'Posturas de Marcha & Sobrevivência',
      icon: '🗺️',
      items: [
        {
          title: '🧭 Posturas de Viagem',
          desc: 'Escolha entre <strong>Cautelosa</strong> (maior percepção e furtividade), <strong>Padrão</strong> (equilibrada) ou <strong>Acelerada</strong> (maior distância com risco de emboscada).'
        },
        {
          title: '⛺ Acampamento & Exaustão',
          desc: 'Viajar sem descanso, comida ou água acumula níveis graves de <strong>Exaustão</strong>, que penalizam atributos e velocidade.'
        },
        {
          title: '🌦️ Clima & Terreno',
          desc: 'Tempestades, pântanos e terrenos acidentados dobram o custo de movimento e atraem predadores nativos.'
        }
      ]
    },

    'explore_dungeon': {
      badge: 'Ermos de Valdoria',
      title: 'Descoberta de Masmorras',
      icon: '🔍',
      items: [
        {
          title: '🗝️ Incursões Ocultas por Padrão',
          desc: 'Nenhuma masmorra ou covil secreto aparece exposto por padrão nos nós do mapa.'
        },
        {
          title: '🔍 Ação Explorar',
          desc: 'Ao parar em um nó dos ermos, use <strong>🔍 Explorar</strong> para realizar testes de Percepção/Investigação D&D 5e e revelar segredos.'
        },
        {
          title: '📜 Mapeamento Permanente',
          desc: 'Uma vez revelada pelo teste, a masmorra fica permanentemente salva na sua cartografia.'
        }
      ]
    }
  };

  /* Helper de persistência por charId (Regra Once-Only / 3 Aberturas) */
  function _getStorageKey(screenKey) {
    var charId = window._charId || 'default';
    return 'vld_screentip_' + screenKey + '_' + charId;
  }

  function _getRecord(screenKey) {
    var def = { impressions: 0, opened: false };
    try {
      var raw = localStorage.getItem(_getStorageKey(screenKey));
      if (raw) {
        var parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      }
    } catch (_) {}
    return def;
  }

  function _saveRecord(screenKey, record) {
    try {
      localStorage.setItem(_getStorageKey(screenKey), JSON.stringify(record));
    } catch (_) {}
  }

  /* Checa se a dica deve ser mostrada automaticamente:
     - Se o jogador já abriu, NÃO mostra mais.
     - Se o jogador já viu 3 vezes sem abrir, NÃO mostra mais. */
  function isEligible(screenKey) {
    var record = _getRecord(screenKey);
    if (record.opened) return false;
    if ((record.impressions || 0) >= 3) return false;
    return true;
  }

  var _activeTimer = null;
  var _activePillEl = null;
  var _activeOverlayEl = null;

  /* Remove a pílula animada atual da tela */
  function _dismissPill() {
    if (_activeTimer) {
      clearTimeout(_activeTimer);
      _activeTimer = null;
    }
    if (_activePillEl && _activePillEl.parentNode) {
      _activePillEl.style.transform = 'translateX(-120%)';
      _activePillEl.style.opacity = '0';
      setTimeout(function() {
        if (_activePillEl && _activePillEl.parentNode) {
          _activePillEl.parentNode.removeChild(_activePillEl);
        }
        _activePillEl = null;
      }, 320);
    }
  }

  /* Exibe a dica completa no drawer/modal */
  function openTip(screenKey) {
    var tip = TIPS_DATABASE[screenKey];
    if (!tip) return;

    // Marca como aberta: nunca mais será exibida automaticamente
    var record = _getRecord(screenKey);
    record.opened = true;
    _saveRecord(screenKey, record);

    _dismissPill();
    _renderDrawer(tip);
  }

  /* Constrói e exibe o drawer modal no DOM */
  function _renderDrawer(tip) {
    if (_activeOverlayEl && _activeOverlayEl.parentNode) {
      _activeOverlayEl.parentNode.removeChild(_activeOverlayEl);
    }

    var overlay = document.createElement('div');
    overlay.className = 'vld-tip-drawer-overlay';

    var cardsHtml = '';
    (tip.items || []).forEach(function(item) {
      cardsHtml += '<div class="vld-tip-card">' +
                   '  <div class="vld-tip-card-title">' + item.title + '</div>' +
                   '  <div class="vld-tip-card-desc">' + item.desc + '</div>' +
                   '</div>';
    });

    overlay.innerHTML =
      '<div class="vld-tip-drawer-content">' +
      '  <div class="vld-tip-drawer-header">' +
      '    <div class="vld-tip-header-left">' +
      '      <div class="vld-tip-avatar-box">' + (tip.icon || '💡') + '</div>' +
      '      <div class="vld-tip-header-titles">' +
      '        <div class="vld-tip-modal-title">' + tip.title + '</div>' +
      '        <div class="vld-tip-modal-sub">' + (tip.npc || tip.badge) + '</div>' +
      '      </div>' +
      '    </div>' +
      '    <button class="vld-tip-close-icon-btn" id="vldTipCloseBtn">✕</button>' +
      '  </div>' +
      '  <div class="vld-tip-drawer-body">' + cardsHtml + '</div>' +
      '  <div class="vld-tip-drawer-footer">' +
      '    <button class="vld-tip-confirm-btn" id="vldTipConfirmBtn">Entendido · Continuar</button>' +
      '  </div>' +
      '</div>';

    document.body.appendChild(overlay);
    _activeOverlayEl = overlay;

    // Animação de entrada
    requestAnimationFrame(function() {
      overlay.classList.add('active');
    });

    function closeDrawer() {
      overlay.classList.remove('active');
      setTimeout(function() {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        _activeOverlayEl = null;
      }, 350);
    }

    var closeBtn = overlay.querySelector('#vldTipCloseBtn');
    var confirmBtn = overlay.querySelector('#vldTipConfirmBtn');
    if (closeBtn) closeBtn.onclick = closeDrawer;
    if (confirmBtn) confirmBtn.onclick = closeDrawer;
    overlay.onclick = function(e) {
      if (e.target === overlay) closeDrawer();
    };
  }

  /* Renderiza a pílula animada Opção 10 na margem esquerda */
  function _renderPill(screenKey, tip, opts) {
    _dismissPill();

    var anchor = document.getElementById('vld-screen-tip-anchor');
    if (!anchor) {
      anchor = document.createElement('div');
      anchor.id = 'vld-screen-tip-anchor';
      anchor.className = 'vld-screen-tip-anchor';
      document.body.appendChild(anchor);
    }

    var pill = document.createElement('div');
    pill.className = 'vld-tip-pill';
    pill.innerHTML =
      '<div class="vld-tip-ring-box">' +
      '  <svg class="vld-tip-svg-ring" width="32" height="32" viewBox="0 0 32 32">' +
      '    <circle class="vld-tip-ring-bg" cx="16" cy="16" r="14" />' +
      '    <circle class="vld-tip-ring-val" cx="16" cy="16" r="14" />' +
      '  </svg>' +
      '  <span class="vld-tip-icon">' + (tip.icon || '💡') + '</span>' +
      '</div>' +
      '<div class="vld-tip-text-col">' +
      '  <div class="vld-tip-badge">' + tip.badge + '</div>' +
      '  <div class="vld-tip-headline">' + tip.title + '</div>' +
      '</div>' +
      '<button class="vld-tip-cta-pill" type="button">Ler</button>' +
      '<button class="vld-tip-dismiss-btn" type="button" aria-label="Dispensar">✕</button>';

    anchor.innerHTML = '';
    anchor.appendChild(pill);
    _activePillEl = pill;

    pill.onclick = function(e) {
      if (e.target.classList.contains('vld-tip-dismiss-btn')) {
        e.stopPropagation();
        _dismissPill();
        return;
      }
      openTip(screenKey);
    };

    var dismissBtn = pill.querySelector('.vld-tip-dismiss-btn');
    if (dismissBtn) {
      dismissBtn.onclick = function(e) {
        e.stopPropagation();
        _dismissPill();
      };
    }

    // Auto-dismiss após 7 segundos
    _activeTimer = setTimeout(function() {
      _dismissPill();
    }, 7000);
  }

  /* Dispara a dica para uma tela específica caso elegível */
  function trigger(screenKey, opts) {
    if (!screenKey) return false;
    var tip = TIPS_DATABASE[screenKey];
    if (!tip) return false;

    if (!isEligible(screenKey)) return false;

    // Incrementa contagem de impressões (até o teto de 3)
    var record = _getRecord(screenKey);
    record.impressions = (record.impressions || 0) + 1;
    _saveRecord(screenKey, record);

    // Pequeno delay para a tela assentar antes da animação entrar
    setTimeout(function() {
      _renderPill(screenKey, tip, opts);
    }, (opts && opts.delay) || 450);

    return true;
  }

  /* API pública */
  window.vldScreenTips = {
    trigger: trigger,
    open: openTip,
    dismiss: _dismissPill,
    isEligible: isEligible,
    getRecord: _getRecord,
    database: TIPS_DATABASE
  };

})(window);
