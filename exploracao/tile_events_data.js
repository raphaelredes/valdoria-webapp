// simuladores/tile_events_data.js — Sub-projeto #3 Phase A.8
// MAPA_IA: 5 entries orc_camp (dormant/active/alerted/cleared/ruins).
// Phase B vai expandir para os outros 11 types.
// Sem auto-generation — escrita manual com prosa cuidadosa em PT-BR.

window.TILE_EVENTS_DB = window.TILE_EVENTS_DB || {};

window.TILE_EVENTS_DB['orc_camp.dormant'] = {
  body: 'O acampamento está em silêncio profundo. Brasas mortas onde havia uma fogueira; lonas escuras, sem movimento. Nenhuma sentinela à vista.',
  voiceLines: {
    martial:    '"Calmo demais. Algo aconteceu aqui."',
    specialist: '"Sem trilhas frescas saindo. Eles partiram, ou estão dormindo."',
    spiritual:  '"O ar cheira a derrota antiga. Algo escureceu este lugar."',
    arcane:     '"Sem auras vivas próximas. Curioso."',
    BARBARO:    '"Hmpf. Sem ninguém para esmagar."'
  },
  choices: [
    {
      id: 'investigate_camp',
      label: 'Investigar o acampamento',
      skill: 'wis', dc: 12,
      outcome_ok: {
        flavor: 'Você descobre marcas no chão: foram embora rápido. Há um pequeno saco esquecido sob uma das lonas.',
        ops: [
          { op: 'gold', delta: 8 },
          { op: 'xp', delta: 15 },
          { op: 'flag', id: 'orc_camp_investigated', scope: 'session' }
        ],
        fsm: null
      },
      outcome_fail: {
        flavor: 'Você revira tudo, mas nada de valor. Apenas trapos e cinza.',
        ops: [{ op: 'xp', delta: 3 }],
        fsm: null
      }
    },
    {
      id: 'rest_briefly',
      label: 'Descansar brevemente',
      flavor: 'Você se senta perto da fogueira morta. Por alguns minutos, o silêncio é um aliado.',
      outcome_ok: {
        flavor: 'Você recupera o fôlego. O peso da estrada cede um pouco.',
        ops: [{ op: 'hp', delta: 5 }],
        fsm: null
      }
    },
    {
      id: 'leave_quietly',
      label: 'Seguir caminho sem perturbar',
      flavor: 'Você passa sem deixar rastro. Talvez tenha sido por pouco.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

window.TILE_EVENTS_DB['orc_camp.active'] = {
  body: 'Você espia da mata. Vultos se movem entre as tendas, fogueira crepita, banner tremula no vento. Eles ainda não te viram.',
  voiceLines: {
    martial:    '"Cheiro de aço e suor. São poucos. Posso pegá-los."',
    specialist: '"Sentinela ao leste. Fogueira de iscas. Padrão típico."',
    spiritual:  '"Almas em sofrimento residem aqui. Hostilidade pulsa no ar."',
    arcane:     '"Resíduo arcano? Não. Apenas brutalidade pura."',
    BARBARO:    '"BONS oponentes! Bons!"',
    PALADINO:   '"Maldade declarada. Não há ambiguidade aqui."'
  },
  choices: [
    {
      id: 'sneak_left',
      label: 'Esgueirar pela esquerda',
      skill: 'dex', dc: 14,
      outcome_ok: {
        flavor: 'Você desliza pela vegetação rasteira. Ninguém te viu — e você agora vê o ângulo cego do acampamento.',
        ops: [
          { op: 'flag', id: 'flanked_orc_camp', scope: 'session' },
          { op: 'xp', delta: 10 }
        ],
        fsm: 'sneak_success'
      },
      outcome_fail: {
        flavor: 'Um galho estala sob seu pé. Os orcs se viram. Lança em punho!',
        ops: [{ op: 'hp', delta: -3 }],
        fsm: 'player_attack_choice'
      }
    },
    {
      id: 'attack_frontal',
      label: 'Atacar de frente',
      flavor: 'Você saca a arma e avança rugindo!',
      outcome_ok: { ops: [], fsm: 'player_attack_choice', flavor: 'O combate começa.' }
    },
    {
      id: 'parley_hunter_kid',
      label: 'Falar do garoto desaparecido',
      when: { hasFlag: 'saved_hunter_child' },
      skill: 'cha', dc: 13,
      outcome_ok: {
        flavor: 'Os orcs reconhecem a voz: "Você é o que salvou o moleque. Pode passar — desta vez."',
        ops: [
          { op: 'flag', id: 'orc_camp_negotiated', scope: 'session' },
          { op: 'xp', delta: 25 }
        ],
        fsm: 'player_proximity'
      },
      outcome_fail: {
        flavor: 'Eles riem com escárnio. "Esse moleque era nosso prisioneiro, idiota."',
        ops: [],
        fsm: null
      }
    },
    {
      id: 'retreat_unseen',
      label: 'Recuar sem ser visto',
      flavor: 'Você se afasta antes de ser percebido. Outra hora, talvez.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você recua silencioso.' }
    }
  ]
};

window.TILE_EVENTS_DB['orc_camp.alerted'] = {
  body: 'Eles te viram. Lanças apontam. Gritos guturais ecoam pela mata. Sem volta.',
  voiceLines: {
    martial:    '"Que venham!"',
    specialist: '"Tarde demais para furtividade. Posições defensivas."',
    spiritual:  '"Se a luta é inevitável, que seja com honra."',
    arcane:     '"Vou precisar de magia."',
    BARBARO:    '"AGORA SIM!"'
  },
  choices: [
    {
      id: 'fight',
      label: 'Lutar até o fim',
      flavor: 'Você firma os pés e enfrenta o cerco.',
      outcome_ok: { ops: [], fsm: 'combat_won', flavor: 'Que comece a luta!' }
    },
    {
      id: 'flee_combat',
      label: 'Fugir pela mata densa',
      skill: 'dex', dc: 15,
      outcome_ok: {
        flavor: 'Você desaparece entre as árvores. As pegadas se perdem. Eles desistem.',
        ops: [{ op: 'xp', delta: 8 }],
        fsm: 'sneak_success'
      },
      outcome_fail: {
        flavor: 'Eles são mais rápidos do que pareciam. Uma flecha encontra seu ombro.',
        ops: [{ op: 'hp', delta: -6 }],
        fsm: null
      }
    },
    {
      id: 'parley_alerted',
      label: 'Tentar falar (Diplomacia)',
      skill: 'cha', dc: 18,
      outcome_ok: {
        flavor: 'Surpreendentemente, o líder ergue a mão. "Fale rápido, andarilho."',
        ops: [
          { op: 'flag', id: 'orc_camp_diplomacy_active', scope: 'session' },
          { op: 'xp', delta: 30 }
        ],
        fsm: 'retreat_choice'
      },
      outcome_fail: {
        flavor: 'O líder cospe no chão. "Palavras não te salvam aqui."',
        ops: [],
        fsm: null
      }
    }
  ]
};

window.TILE_EVENTS_DB['orc_camp.cleared'] = {
  body: 'O acampamento agora é silêncio. Corpos onde antes havia guarda. A fogueira reduzida a cinzas. Há despojos no chão.',
  voiceLines: {
    martial:    '"Limpo. O que sobrou é meu."',
    specialist: '"Cuidado com armadilhas. Sempre cuidado."',
    spiritual:  '"Que descansem. Mesmo os malvados merecem repouso."',
    arcane:     '"O resíduo está se dissipando. Mais cinco minutos e tudo desvanece."',
    PALADINO:   '"Que a paz finalmente os encontre."'
  },
  choices: [
    {
      id: 'loot_camp',
      label: 'Saquear despojos',
      skill: 'wis', dc: 10,
      outcome_ok: {
        flavor: 'Você encontra um saco com 25 Valdoritas, comida seca e uma adaga rúnica.',
        ops: [
          { op: 'gold', delta: 25 },
          { op: 'item', id: 'rusty_dagger' },
          { op: 'flag', id: 'orc_camp_looted', scope: 'session' }
        ],
        fsm: 'loot_picked'
      },
      outcome_fail: {
        flavor: 'Você acha apenas trapos e cinza. Levou tempo demais.',
        ops: [{ op: 'exh', delta: 1 }],
        fsm: 'loot_picked'
      }
    },
    {
      id: 'search_clues',
      label: 'Procurar pistas (Investigação)',
      skill: 'int', dc: 13,
      outcome_ok: {
        flavor: 'Você encontra um mapa rasgado: marca uma fortaleza maior ao norte.',
        ops: [
          { op: 'xp', delta: 20 },
          { op: 'flag', id: 'orc_fortress_lead', scope: 'pc' }
        ],
        fsm: null
      },
      outcome_fail: {
        flavor: 'Nada coerente. Apenas registros do dia-a-dia.',
        ops: [{ op: 'xp', delta: 3 }],
        fsm: null
      }
    },
    {
      id: 'leave_cleared',
      label: 'Seguir caminho',
      flavor: 'Você deixa o lugar para trás.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

window.TILE_EVENTS_DB['orc_camp.ruins'] = {
  body: 'O tempo cobriu tudo. Estrutura desabada, musgo invadindo, ossos antigos. Nada útil aqui — só lembranças.',
  voiceLines: {
    martial:    '"Pó."',
    specialist: '"Anos. Nada para colher."',
    spiritual:  '"Que descansem em paz, finalmente."',
    arcane:     '"Qualquer magia que existiu aqui já se dissipou."'
  },
  choices: [
    {
      id: 'ponder',
      label: 'Refletir sobre o passado',
      flavor: 'Você fica em silêncio um momento, contemplando a passagem do tempo.',
      outcome_ok: {
        flavor: 'Algo no ar te traz clareza — sabedoria silenciosa que ficará com você.',
        ops: [{ op: 'xp', delta: 5 }],
        fsm: null
      }
    },
    {
      id: 'leave_ruins',
      label: 'Sair (nada aqui)',
      flavor: 'Não há mais nada de valor. Você prossegue.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você segue em frente.' }
    }
  ]
};

// =============================================================================
//  forgotten_chest — Tesouro abandonado (Phase B.1, family: loot)
// =============================================================================

window.TILE_EVENTS_DB['forgotten_chest.dormant'] = {
  body: 'Um baú de madeira escurecida pelo tempo descansa sob raízes retorcidas. Cadeado intacto, mas a tampa parece ceder à pressão certa.',
  voiceLines: {
    martial:    '"Madeira velha. Não vai resistir."',
    specialist: '"Cadeado simples. Posso abrir limpo."',
    spiritual:  '"Quem deixou isso aqui talvez ainda volte."',
    arcane:     '"Sem aura mágica. Apenas riqueza esquecida."'
  },
  choices: [
    {
      id: 'pick_lock',
      label: 'Forçar a fechadura (Furtividade)',
      skill: 'sleight', dc: 13,
      outcome_ok: {
        flavor: 'A fechadura cede com um clique satisfatório. Dentro: 35 Valdoritas, uma poção e um anel rúnico.',
        ops: [
          { op: 'gold', delta: 35 },
          { op: 'item', id: 'healing_potion' },
          { op: 'flag', id: 'forgotten_chest_opened', scope: 'session' }
        ],
        fsm: 'loot_picked'
      },
      outcome_fail: {
        flavor: 'A fechadura prende. Você quebra a gazua e fica com as mãos doloridas.',
        ops: [{ op: 'hp', delta: -2 }],
        fsm: null
      }
    },
    {
      id: 'force_open',
      label: 'Quebrar à força (Atletismo)',
      skill: 'athletics', dc: 11,
      outcome_ok: {
        flavor: 'Você esmaga a tampa. Conteúdo intacto: 25 Valdoritas e ração seca.',
        ops: [
          { op: 'gold', delta: 25 },
          { op: 'flag', id: 'forgotten_chest_opened', scope: 'session' }
        ],
        fsm: 'loot_picked'
      },
      outcome_fail: {
        flavor: 'A madeira racha mas a tampa segura. Você só consegue ferir a mão.',
        ops: [{ op: 'hp', delta: -3 }],
        fsm: null
      }
    },
    {
      id: 'leave_chest',
      label: 'Deixar como está',
      flavor: 'Talvez seja propriedade de alguém. Você prossegue.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você segue em frente.' }
    }
  ]
};

window.TILE_EVENTS_DB['forgotten_chest.cleared'] = {
  body: 'O baú está aberto, vazio. Pedaços do conteúdo espalhados ao redor — você já o saqueou antes.',
  voiceLines: {
    martial:    '"Já peguei o que valia."',
    specialist: '"Eu mesmo deixei essa carcaça aqui."',
    spiritual:  '"O passado segue passando."',
    arcane:     '"Sem nada arcano. Sem nada útil."'
  },
  choices: [
    {
      id: 'inspect_again',
      label: 'Revistar com calma',
      skill: 'investigation', dc: 14,
      outcome_ok: {
        flavor: 'No fundo do baú, sob madeira solta: uma chave pequena de bronze.',
        ops: [
          { op: 'xp', delta: 10 },
          { op: 'flag', id: 'bronze_key_found', scope: 'pc' }
        ],
        fsm: null
      },
      outcome_fail: {
        flavor: 'Apenas farpas e poeira. Nada de valor escondido.',
        ops: [{ op: 'xp', delta: 2 }],
        fsm: null
      }
    },
    {
      id: 'leave_cleared',
      label: 'Seguir caminho',
      flavor: 'Você se afasta do baú vazio.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

window.TILE_EVENTS_DB['forgotten_chest.ruins'] = {
  body: 'Restos de madeira apodrecida no chão. Foi um baú, há muito tempo.',
  voiceLines: {
    martial:    '"Tarde demais."',
    specialist: '"Ratos pegaram o que sobrou."',
    spiritual:  '"O tempo é o ladrão silencioso."',
    arcane:     '"Pó. Nada mais."'
  },
  choices: [
    {
      id: 'leave_ruins',
      label: 'Continuar caminhando',
      flavor: 'Não há nada a fazer aqui.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você segue em frente.' }
    }
  ]
};

// =============================================================================
//  tripwire_trap — Armadilha de fio (Phase B.2, family: hazard)
// =============================================================================

window.TILE_EVENTS_DB['tripwire_trap.dormant'] = {
  body: 'Um fio fino estendido entre duas árvores na altura do tornozelo. Mal visível. Liga-se a um mecanismo escondido na folhagem.',
  voiceLines: {
    martial:    '"Cilada de caçador. Posso passar com cuidado."',
    specialist: '"Vejo a tensão do fio. Posso desarmar isto."',
    spiritual:  '"Quem armou isto não tinha boas intenções."',
    arcane:     '"Mecanismo simples — sem magia, só metal e madeira."'
  },
  choices: [
    {
      id: 'disarm_trap',
      label: 'Desarmar a armadilha (Furtividade)',
      skill: 'sleight', dc: 14,
      outcome_ok: {
        flavor: 'Você corta o fio com precisão. O mecanismo cai inerte. Você recolhe o gatilho e algumas pontas de flecha.',
        ops: [
          { op: 'xp', delta: 20 },
          { op: 'flag', id: 'tripwire_disarmed', scope: 'session' }
        ],
        fsm: 'loot_picked'
      },
      outcome_fail: {
        flavor: 'O fio escapa entre seus dedos. SNAP! Flechas voam dos arbustos.',
        ops: [{ op: 'hp', delta: -8 }],
        fsm: 'player_attack_choice'
      }
    },
    {
      id: 'step_carefully',
      label: 'Passar por cima com cuidado (Acrobacia)',
      skill: 'acrobatics', dc: 12,
      outcome_ok: {
        flavor: 'Você mede o passo e cruza por cima do fio sem tocá-lo.',
        ops: [{ op: 'xp', delta: 8 }],
        fsm: null
      },
      outcome_fail: {
        flavor: 'Seu pé toca o fio. Flechas disparam dos arbustos!',
        ops: [{ op: 'hp', delta: -10 }],
        fsm: 'player_attack_choice'
      }
    },
    {
      id: 'detour',
      label: 'Contornar pela mata',
      flavor: 'Você dá uma volta longa pela vegetação densa. Seguro, mas demorado.',
      outcome_ok: {
        flavor: 'Você desvia da armadilha. Cansaço extra na rota.',
        ops: [{ op: 'exh', delta: 1 }],
        fsm: null
      }
    }
  ]
};

window.TILE_EVENTS_DB['tripwire_trap.cleared'] = {
  body: 'O fio está cortado, o mecanismo desativado. Um caminho seguro agora.',
  voiceLines: {
    martial:    '"Limpo. Próximo viajante deve a mim."',
    specialist: '"Trabalho bem feito."',
    spiritual:  '"Algumas vidas serão poupadas por isto."',
    arcane:     '"Trivial."'
  },
  choices: [
    {
      id: 'pass_through',
      label: 'Passar pela rota livre',
      flavor: 'Você atravessa sem incidentes.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

window.TILE_EVENTS_DB['tripwire_trap.ruins'] = {
  body: 'Fragmentos de uma armadilha enferrujada espalhados pelo chão. Não funciona mais — o tempo a desativou.',
  voiceLines: {
    martial:    '"Velha demais pra machucar alguém."',
    specialist: '"Mal feita. O ferrugem fez o resto."',
    spiritual:  '"Quem a armou já se foi há muito."',
    arcane:     '"Ferro morto. Sem ameaça."'
  },
  choices: [
    {
      id: 'leave_ruins',
      label: 'Continuar caminhando',
      flavor: 'Você passa sem dar atenção.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você segue em frente.' }
    }
  ]
};

// =============================================================================
//  runestone — Pedra rúnica (Phase B.3, family: sagrado)
// =============================================================================

window.TILE_EVENTS_DB['runestone.dormant'] = {
  body: 'Uma pedra ereta com runas gravadas pulsa fracamente. As linhas formam um padrão antigo — quem o gravou já não vive mais.',
  voiceLines: {
    martial:    '"Uma pedra. Símbolos estranhos."',
    specialist: '"Marca de fronteira ou aviso. Talvez ambos."',
    spiritual:  '"Há uma presença aqui. Antiga, mas desperta."',
    arcane:     '"Esta runa ainda canta. Magia residual viva."',
    MAGO:       '"Glifo de Eldrik, do Conclave do Sul. Raríssimo."',
    DRUIDA:     '"A pedra fala com a terra. Eu posso ouvi-la."'
  },
  choices: [
    {
      id: 'study_runes',
      label: 'Estudar as runas (Arcanismo)',
      skill: 'arcana', dc: 14,
      outcome_ok: {
        flavor: 'As runas se revelam a você: instruções de proteção contra mortos-vivos. Você grava o conhecimento.',
        ops: [
          { op: 'xp', delta: 30 },
          { op: 'flag', id: 'runestone_protection_learned', scope: 'pc' }
        ],
        fsm: 'player_proximity'
      },
      outcome_fail: {
        flavor: 'Os símbolos resistem ao seu olhar. Apenas dor de cabeça.',
        ops: [{ op: 'mp', delta: -2 }],
        fsm: null
      }
    },
    {
      id: 'pray_runes',
      label: 'Rezar diante da pedra (Religião)',
      skill: 'religion', dc: 12,
      outcome_ok: {
        flavor: 'Você se ajoelha. A pedra responde com calor suave. Você se sente revigorado.',
        ops: [
          { op: 'hp', delta: 8 },
          { op: 'mp', delta: 4 },
          { op: 'flag', id: 'runestone_blessed', scope: 'session' }
        ],
        fsm: 'player_proximity'
      },
      outcome_fail: {
        flavor: 'Você sussurra preces, mas a pedra permanece indiferente.',
        ops: [],
        fsm: null
      }
    },
    {
      id: 'leave_runestone',
      label: 'Seguir respeitosamente',
      flavor: 'Você baixa a cabeça e prossegue.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você segue em frente.' }
    }
  ]
};

window.TILE_EVENTS_DB['runestone.active'] = {
  body: 'A pedra brilha forte agora. Energia arcana se condensa ao seu redor — alguém ou algo a despertou recentemente.',
  voiceLines: {
    martial:    '"Algo há aí dentro. Não gosto."',
    specialist: '"Recém ativada. Não estava assim antes."',
    spiritual:  '"Um espírito desperta. Cuidado."',
    arcane:     '"A magia transborda. Posso canalizar — ou ser engolido."',
    BARDO:      '"Esta pedra quer cantar. Quer me ouvir."'
  },
  choices: [
    {
      id: 'channel_power',
      label: 'Canalizar o poder (Arcanismo)',
      skill: 'arcana', dc: 16,
      outcome_ok: {
        flavor: 'A energia flui através de você. Você absorve uma faísca — temporariamente, sua magia transborda.',
        ops: [
          { op: 'mp', delta: 12 },
          { op: 'xp', delta: 25 },
          { op: 'flag', id: 'runestone_channeled', scope: 'session' }
        ],
        fsm: 'loot_picked'
      },
      outcome_fail: {
        flavor: 'A energia te repele. Você cai para trás, atordoado.',
        ops: [
          { op: 'hp', delta: -5 },
          { op: 'mp', delta: -3 }
        ],
        fsm: null
      }
    },
    {
      id: 'observe_silence',
      label: 'Observar em silêncio',
      flavor: 'Você se afasta e contempla. A pedra eventualmente acalma.',
      outcome_ok: {
        flavor: 'Algo no ato de observar te ensina. Você não saberia explicar o quê — mas ficou.',
        ops: [{ op: 'xp', delta: 10 }],
        fsm: 'player_proximity'
      }
    },
    {
      id: 'flee_arcane',
      label: 'Recuar — magia é imprevisível',
      flavor: 'Você se afasta antes que algo aconteça.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

window.TILE_EVENTS_DB['runestone.cleared'] = {
  body: 'A pedra agora é apenas pedra. Sem brilho, sem zumbido — algo a esvaziou. Resta a forma, sem o poder.',
  voiceLines: {
    martial:    '"Pedra comum agora."',
    specialist: '"Foi drenada. Quem fez isso?"',
    spiritual:  '"O espírito partiu. Que descanse."',
    arcane:     '"Cinza arcana. Triste."'
  },
  choices: [
    {
      id: 'recover_dust',
      label: 'Recolher pó arcano (Arcanismo)',
      skill: 'arcana', dc: 11,
      outcome_ok: {
        flavor: 'Você raspa traços de pó arcano da superfície. Suficiente pra um componente.',
        ops: [
          { op: 'item', id: 'arcane_dust' },
          { op: 'xp', delta: 8 }
        ],
        fsm: null
      },
      outcome_fail: {
        flavor: 'O pó se desfaz nos seus dedos. Nada utilizável.',
        ops: [],
        fsm: null
      }
    },
    {
      id: 'leave_cleared',
      label: 'Seguir caminho',
      flavor: 'Você toca a pedra fria uma última vez e parte.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

window.TILE_EVENTS_DB['runestone.ruins'] = {
  body: 'A pedra está partida ao meio. Os símbolos quebrados não significam mais nada.',
  voiceLines: {
    martial:    '"Vandalismo. Ou guerra."',
    specialist: '"Foi quebrada de propósito. Símbolos riscados."',
    spiritual:  '"Profanação. Que pena."',
    arcane:     '"O conhecimento se perdeu para sempre."'
  },
  choices: [
    {
      id: 'leave_ruins',
      label: 'Seguir adiante',
      flavor: 'Não há nada a fazer.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

// =============================================================================
//  fresh_tracks — Pegadas frescas (Phase B.4, family: vivo)
// =============================================================================

window.TILE_EVENTS_DB['fresh_tracks.dormant'] = {
  body: 'Pegadas profundas no barro úmido. Recentes — talvez horas atrás. Algo grande passou por aqui.',
  voiceLines: {
    martial:    '"Algo grande. Posso seguir e pegá-lo."',
    specialist: '"Quatro patas. Animal selvagem, não humanoide."',
    spiritual:  '"Uma criatura solitária. Cuidado."',
    arcane:     '"Sem aura mágica. Mortal comum, mas grande."',
    PATRULHEIRO: '"Urso pardo, macho jovem. Ferido — uma das pegadas tem sangue."'
  },
  choices: [
    {
      id: 'follow_tracks',
      label: 'Seguir as pegadas (Sobrevivência)',
      skill: 'survival', dc: 13,
      outcome_ok: {
        // 2026-04-27 USER RULE: removido "por xp" (referência técnica quebra
        // imersão) + adicionado chain real pra escolher caçar/poupar/curar.
        // Padrão AAA tipo BG3/Pathfinder/Witcher 3 — encontro com criatura
        // ferida exige decisão moral, não apenas FINALIZAR.
        flavor: 'Você segue o rastro até uma clareira sob a luz filtrada das árvores. O urso pardo está deitado de lado, ofegante. Tem uma flecha quebrada cravada no flanco esquerdo, e o sangue escuro mancha o pelo. Os olhos te encaram — não com fúria, mas com cansaço. Ainda é perigoso. Ainda é um urso.',
        ops: [
          { op: 'flag', id: 'fresh_tracks_followed', scope: 'session' }
        ],
        fsm: 'player_proximity',
        chain: {
          id: 'fresh_tracks.bear_encounter',
          title: 'PEGADAS FRESCAS',
          body: 'O urso ergue a cabeça com esforço, observando seus passos. Em alguns segundos ele decide se reage ou cede. Você decide primeiro.',
          choices: [
            {
              id: 'fresh_tracks_hunt',
              label: 'Abater rápido — golpe certeiro',
              skill: 'str', dc: 10,
              outcome_ok: {
                flavor: 'Você se aproxima em silêncio e desfere o golpe. O urso solta um rosnado curto e tomba sem agonia desnecessária. Você recolhe pele, gordura e carne — recursos que valem em qualquer vilarejo. A clareira fica em silêncio outra vez.',
                ops: [
                  { op: 'xp', delta: 25 },
                  { op: 'gold', delta: 12 },
                  { op: 'flag', id: 'fresh_tracks_hunted', scope: 'pc' }
                ]
              },
              outcome_fail: {
                flavor: 'O golpe sai mal calculado e o urso reage. Mesmo ferido, te derruba com a pata antes de sucumbir. Você sente as costelas reclamarem — e o gosto amargo de uma caça malfeita.',
                ops: [
                  { op: 'hp', delta: -8 },
                  { op: 'xp', delta: 10 },
                  { op: 'flag', id: 'fresh_tracks_hunted', scope: 'pc' }
                ]
              }
            },
            {
              id: 'fresh_tracks_heal',
              label: 'Tentar curar a fera (Medicina)',
              skill: 'medicine', dc: 14,
              outcome_ok: {
                flavor: 'Você se aproxima com cautela. O urso permite. Arranca a flecha quebrada num movimento firme, aplica o que tem de erva e tecido limpo, e recua devagar. O animal te encara por um longo segundo — um juramento mudo — e desaparece nas árvores.',
                ops: [
                  { op: 'xp', delta: 30 },
                  { op: 'flag', id: 'fresh_tracks_healed', scope: 'pc' }
                ]
              },
              outcome_fail: {
                flavor: 'O urso se assusta com a aproximação e ataca antes de você explicar gesto algum. Você consegue se afastar mas leva um corte profundo no braço. O animal cambaleia floresta adentro, mais ferido ainda do que antes.',
                ops: [
                  { op: 'hp', delta: -6 },
                  { op: 'xp', delta: 5 },
                  { op: 'flag', id: 'fresh_tracks_healed_failed', scope: 'pc' }
                ]
              }
            },
            {
              id: 'fresh_tracks_spare',
              label: 'Recuar — deixar a fera viver',
              flavor: 'Você não tira o olho do urso enquanto recua. Ele te observa de volta, imóvel. Quando você cruza o limite da clareira, o animal baixa a cabeça e fecha os olhos — exausto, mas vivo. Algo se firma dentro de você.',
              outcome_ok: {
                flavor: 'Você não tira o olho do urso enquanto recua. Ele te observa de volta, imóvel. Quando você cruza o limite da clareira, o animal baixa a cabeça e fecha os olhos — exausto, mas vivo. Algo se firma dentro de você.',
                ops: [
                  { op: 'xp', delta: 18 },
                  { op: 'flag', id: 'fresh_tracks_spared', scope: 'pc' }
                ]
              }
            }
          ]
        }
      },
      outcome_fail: {
        flavor: 'Você perde o rastro entre raízes e samambaias. A floresta engole as pegadas. Cansaço e frustração — pelo menos a floresta não te traiu de propósito.',
        ops: [{ op: 'exh', delta: 1 }],
        fsm: null
      }
    },
    {
      id: 'analyze_tracks',
      label: 'Analisar a fundo (Natureza)',
      skill: 'nature', dc: 12,
      outcome_ok: {
        flavor: 'Você identifica a espécie e a direção. Conhecimento útil pra rotas seguras.',
        ops: [
          { op: 'xp', delta: 12 },
          { op: 'flag', id: 'fresh_tracks_analyzed', scope: 'pc' }
        ],
        fsm: null
      },
      outcome_fail: {
        flavor: 'Você não consegue ler bem o rastro.',
        ops: [],
        fsm: null
      }
    },
    {
      id: 'avoid_tracks',
      label: 'Mudar de rota — evitar a fera',
      flavor: 'Você se afasta cuidadosamente.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue por outro caminho.' }
    }
  ]
};

window.TILE_EVENTS_DB['fresh_tracks.cleared'] = {
  body: 'As pegadas foram seguidas e exploradas. Nada mais a aprender aqui.',
  voiceLines: {
    martial:    '"Já segui. Próximo passo."',
    specialist: '"Rastro frio agora."',
    spiritual:  '"O caminho seguiu seu curso."',
    arcane:     '"Memória apenas."'
  },
  choices: [
    {
      id: 'leave_cleared',
      label: 'Continuar caminho',
      flavor: 'Você prossegue.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você segue em frente.' }
    }
  ]
};

window.TILE_EVENTS_DB['fresh_tracks.ruins'] = {
  body: 'O barro secou e as pegadas viraram cicatrizes secas no chão. Velhas demais pra ler.',
  voiceLines: {
    martial:    '"Tempo demais."',
    specialist: '"Sem leitura possível."',
    spiritual:  '"Quem passou já partiu."',
    arcane:     '"Apenas terra agora."'
  },
  choices: [
    {
      id: 'leave_ruins',
      label: 'Seguir adiante',
      flavor: 'Você passa sem parar.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

// =============================================================================
//  sentinel_post — Posto de Sentinela (Phase B.5, family: vigia)
// =============================================================================

window.TILE_EVENTS_DB['sentinel_post.dormant'] = {
  body: 'Uma torre baixa de pedra, com janela estreita virada para o caminho. Sem luz dentro, sem movimento.',
  voiceLines: {
    martial:    '"Vazia. Deserto ou descanso?"',
    specialist: '"Sem fumaça da chaminé. Está fria há horas."',
    spiritual:  '"Quem vigia aqui não está mais."',
    arcane:     '"Sem auras vivas. Apenas pedra e silêncio."'
  },
  choices: [
    {
      id: 'climb_post',
      label: 'Subir e investigar (Atletismo)',
      skill: 'athletics', dc: 12,
      outcome_ok: {
        flavor: 'Você escala a parede e olha pela janela: nada além de um banco vazio e papéis velhos. Mas há um sino — pode tocar para chamar reforços.',
        ops: [
          { op: 'xp', delta: 12 },
          { op: 'flag', id: 'sentinel_bell_known', scope: 'pc' }
        ],
        fsm: null
      },
      outcome_fail: {
        flavor: 'Você escorrega na pedra úmida. Seu joelho protesta.',
        ops: [{ op: 'hp', delta: -3 }],
        fsm: null
      }
    },
    {
      id: 'leave_post',
      label: 'Seguir caminho',
      flavor: 'Você passa rapidamente, sem chamar atenção.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

window.TILE_EVENTS_DB['sentinel_post.active'] = {
  body: 'Fumaça sobe da chaminé. Uma silhueta se move pela janela — alguém vigia. Os olhos passam pela estrada.',
  voiceLines: {
    martial:    '"Sentinela armada. Cuidado."',
    specialist: '"Apenas um vigia. Posso passar de noite."',
    spiritual:  '"Cumpre seu dever. Talvez possa ser convencido."',
    arcane:     '"Mortal armado. Sem suporte arcano."'
  },
  choices: [
    {
      id: 'sneak_past',
      label: 'Passar furtivamente (Furtividade)',
      skill: 'stealth', dc: 14,
      outcome_ok: {
        flavor: 'Você espreita pela mata e cruza o ponto cego do vigia.',
        ops: [{ op: 'xp', delta: 15 }],
        fsm: 'sneak_success'
      },
      // 2026-04-27 USER RULE: chain de decisão após falha — sentinela
      // detectou e ordenou identificação. Player precisa decidir: render-se,
      // tentar persuadir, fugir, ou atacar primeiro. Padrão BG3/Pathfinder.
      outcome_fail: {
        flavor: 'O sentinela te avista. "Pare! Identifique-se!" A besta dele já está apontada na sua direção — o gatilho a centímetros do dedo dele.',
        ops: [],
        fsm: 'player_attack_choice',
        chain: {
          id: 'sentinel_post.spotted',
          title: 'POSTO DE SENTINELA',
          body: 'A besta do sentinela aponta firme. Ele espera resposta — qualquer movimento errado e a flecha sai. Você decide.',
          choices: [
            {
              id: 'sentinel_surrender',
              label: 'Render-se e identificar-se (Persuasão)',
              skill: 'persuasion', dc: 13,
              outcome_ok: {
                flavor: 'Você ergue as mãos lentamente, fala devagar — nome, motivo, destino. O vigia escuta sem baixar a besta. Quando termina, ele acena com a cabeça e abaixa a arma. "Passe. Mas a próxima patrulha pode não ser tão tolerante."',
                ops: [
                  { op: 'xp', delta: 12 },
                  { op: 'flag', id: 'sentinel_identified', scope: 'session' }
                ]
              },
              outcome_fail: {
                flavor: 'Sua voz tropeça nas palavras erradas. O sentinela não acredita na história. "Espião." Ele atira primeiro — você consegue se desviar mas leva um corte na lateral.',
                ops: [{ op: 'hp', delta: -6 }, { op: 'xp', delta: 5 }]
              }
            },
            {
              id: 'sentinel_run',
              label: 'Correr para a mata (Atletismo)',
              skill: 'athletics', dc: 12,
              outcome_ok: {
                flavor: 'Você gira em silêncio e mergulha entre as árvores antes que ele possa apontar. Ouve o som da besta sendo recarregada — mas você já desapareceu.',
                ops: [{ op: 'xp', delta: 8 }]
              },
              outcome_fail: {
                flavor: 'Sua bota escorrega numa raiz. A flecha te alcança no ombro com um silvo seco. Você ainda chega na mata, mas marcado.',
                ops: [{ op: 'hp', delta: -8 }]
              }
            },
            {
              id: 'sentinel_attack',
              label: 'Atacar primeiro — força bruta',
              outcome_ok: {
                flavor: 'Você fecha distância antes que o gatilho seja puxado. A besta dispara num arco que passa por cima do seu ombro. O combate começa de frente, sem hesitação.',
                ops: [],
                combat: { enemy_id: 'bandit', enemy_count: 1 }
              }
            }
          ]
        }
      }
    },
    {
      id: 'parley_sentinel',
      label: 'Aproximar-se e falar (Persuasão)',
      skill: 'persuasion', dc: 12,
      outcome_ok: {
        flavor: 'O vigia escuta sua história. "Passe. Mas não me obrigue a explicar isso ao capitão."',
        ops: [
          { op: 'xp', delta: 18 },
          { op: 'flag', id: 'sentinel_friendly', scope: 'session' }
        ],
        fsm: 'player_proximity'
      },
      outcome_fail: {
        flavor: 'Ele ergue a besta. "Não se aproxime mais." Os olhos dele não piscam — cada passo seu agora é peso de morte calculada.',
        ops: [],
        fsm: null,
        chain: {
          id: 'sentinel_post.parley_failed',
          title: 'POSTO DE SENTINELA',
          body: 'O sentinela mantém a mira firme. Você está dentro do alcance, sem escudo. O que decide?',
          choices: [
            {
              id: 'sentinel_back_off',
              label: 'Recuar lentamente — sem virar as costas',
              outcome_ok: {
                flavor: 'Você ergue as mãos vazias e dá passos pra trás, devagar, mantendo o olhar nele. Ele te observa até a mata engolir sua silhueta. A besta nunca abaixou — mas também nunca disparou.',
                ops: []
              }
            },
            {
              id: 'sentinel_force_through',
              label: 'Forçar passagem — atacar de surpresa',
              outcome_ok: {
                flavor: 'Você se atira pra frente. A besta dispara mas a flecha passa de raspão. Vocês dois se enfrentam ali mesmo.',
                ops: [],
                combat: { enemy_id: 'bandit', enemy_count: 1 }
              }
            }
          ]
        }
      }
    },
    {
      id: 'retreat_post',
      label: 'Recuar — outra rota',
      flavor: 'Você se afasta antes de ser visto.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você desvia.' }
    }
  ]
};

window.TILE_EVENTS_DB['sentinel_post.cleared'] = {
  body: 'O posto está vazio agora. O sentinela partiu — ou foi removido. Você pode descansar brevemente aqui.',
  voiceLines: {
    martial:    '"Posto livre. Útil pra um descanso."',
    specialist: '"Pelo menos a vista é boa."',
    spiritual:  '"Que descanse, onde quer que esteja."',
    arcane:     '"Lugar agora seguro."'
  },
  choices: [
    {
      id: 'short_rest',
      label: 'Descanso curto (5 min)',
      flavor: 'Você fecha os olhos por um momento.',
      outcome_ok: {
        flavor: 'Você recupera o fôlego — e algo da chama interior também volta. A pausa valeu.',
        ops: [
          { op: 'hp', delta: 5 },
          { op: 'mp', delta: 2 }
        ],
        fsm: null
      }
    },
    {
      id: 'leave_cleared',
      label: 'Seguir caminho',
      flavor: 'Você sai pela porta e segue adiante.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

window.TILE_EVENTS_DB['sentinel_post.ruins'] = {
  body: 'A torre está desabada. Apenas uma pilha de pedras restou — quem viveu aqui foi esquecido pelo tempo.',
  voiceLines: {
    martial:    '"Foi guerra ou tempo?"',
    specialist: '"Tempo. Anos."',
    spiritual:  '"Que descansem em paz."',
    arcane:     '"Pedra fria, memória apagada."'
  },
  choices: [
    {
      id: 'leave_ruins',
      label: 'Seguir adiante',
      flavor: 'Você deixa as ruínas para trás.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

// =============================================================================
//  broken_tower — Torre Fendida (Phase B.6, family: ruinas)
// =============================================================================

window.TILE_EVENTS_DB['broken_tower.dormant'] = {
  body: 'Uma torre alta partida ao meio. As pedras superiores caíram, criando uma rampa improvisada até o que sobrou da plataforma.',
  voiceLines: {
    martial:    '"Torre quebrada. Ainda há altura útil."',
    specialist: '"Vista privilegiada do alto. Vale subir."',
    spiritual:  '"Quem morava aqui pereceu."',
    arcane:     '"Magia residual no topo. Vale investigar."'
  },
  choices: [
    {
      id: 'climb_top',
      label: 'Escalar até o topo (Atletismo)',
      skill: 'athletics', dc: 14,
      outcome_ok: {
        flavor: 'Você alcança a plataforma. A vista revela um caminho oculto na floresta — um atalho.',
        ops: [
          { op: 'xp', delta: 25 },
          { op: 'flag', id: 'forest_shortcut_known', scope: 'pc' }
        ],
        fsm: 'loot_picked'
      },
      outcome_fail: {
        flavor: 'Uma pedra cede sob seu pé. Você cai e bate o ombro.',
        ops: [{ op: 'hp', delta: -6 }],
        fsm: null
      }
    },
    {
      id: 'search_rubble',
      label: 'Vasculhar o entulho (Investigação)',
      skill: 'investigation', dc: 12,
      outcome_ok: {
        flavor: 'Você encontra um diário antigo enterrado entre as pedras. Páginas frágeis, mas legíveis.',
        ops: [
          { op: 'xp', delta: 15 },
          { op: 'flag', id: 'tower_diary_found', scope: 'pc' }
        ],
        fsm: null
      },
      outcome_fail: {
        flavor: 'Apenas pedras e poeira.',
        ops: [],
        fsm: null
      }
    },
    {
      id: 'leave_tower',
      label: 'Seguir caminho',
      flavor: 'Você prossegue sem investigar.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você segue em frente.' }
    }
  ]
};

window.TILE_EVENTS_DB['broken_tower.cleared'] = {
  body: 'Você já explorou esta torre. Resta apenas o esqueleto da estrutura.',
  voiceLines: {
    martial:    '"Já esvaziei aqui."',
    specialist: '"Mais nada útil."',
    spiritual:  '"O passado descansou."',
    arcane:     '"Sem nova informação."'
  },
  choices: [
    {
      id: 'leave_cleared',
      label: 'Seguir caminho',
      flavor: 'Você passa.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

window.TILE_EVENTS_DB['broken_tower.ruins'] = {
  body: 'Apenas alicerces submersos sob musgo e raízes. Era torre, num passado distante.',
  voiceLines: {
    martial:    '"Pó."',
    specialist: '"Total devolução à terra."',
    spiritual:  '"Que descansem."',
    arcane:     '"Memória apagada do tempo."'
  },
  choices: [
    {
      id: 'leave_ruins',
      label: 'Seguir adiante',
      flavor: 'Você passa por cima dos alicerces.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

// =============================================================================
//  bandit_camp — Acampamento de Bandidos (Phase B.7, family: camp)
// =============================================================================

window.TILE_EVENTS_DB['bandit_camp.dormant'] = {
  body: 'Acampamento abandonado às pressas. Tendas torpes, fogueira morta, pegadas confusas para todos os lados.',
  voiceLines: {
    martial:    '"Foram assustados ou rolaram em pânico."',
    specialist: '"Padrão de fuga. Algo os pegou de surpresa."',
    spiritual:  '"O medo paira no ar."',
    arcane:     '"Sem residual mágico. Mortais comuns."'
  },
  choices: [
    {
      id: 'investigate_bandit',
      label: 'Investigar o acampamento',
      skill: 'investigation', dc: 11,
      outcome_ok: {
        flavor: 'Você encontra um saco esquecido com 18 Valdoritas e uma adaga.',
        ops: [
          { op: 'gold', delta: 18 },
          { op: 'item', id: 'rusty_dagger' }
        ],
        fsm: 'loot_picked'
      },
      outcome_fail: {
        flavor: 'Apenas trapos e migalhas.',
        ops: [{ op: 'xp', delta: 2 }],
        fsm: null
      }
    },
    {
      id: 'rest_bandit',
      label: 'Descansar entre as tendas',
      flavor: 'Você se acomoda, vigilante.',
      outcome_ok: {
        flavor: 'Algumas horas de sono leve — uma orelha sempre acordada. O corpo agradece o pouco que pôde.',
        ops: [{ op: 'hp', delta: 5 }],
        fsm: null
      }
    },
    {
      id: 'leave_bandit',
      label: 'Seguir caminho',
      flavor: 'Você não confia neste lugar.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

window.TILE_EVENTS_DB['bandit_camp.active'] = {
  body: 'Bandidos riem em torno da fogueira, contando moedas roubadas. Quatro deles, dois com bestas. Não te viram ainda.',
  voiceLines: {
    martial:    '"Quatro contra um. Justo."',
    specialist: '"Dois bestas — flanco direito é cego."',
    spiritual:  '"Roubadores. Que paguem suas dívidas."',
    arcane:     '"Posso desarmá-los com sono mágico."',
    LADINO:     '"Conheço esse grupo — gangue do Caolho."'
  },
  choices: [
    {
      id: 'sneak_bandit',
      label: 'Esgueirar pelo flanco (Furtividade)',
      skill: 'stealth', dc: 14,
      outcome_ok: {
        flavor: 'Você passa pelo lado cego sem ser visto.',
        ops: [{ op: 'xp', delta: 15 }],
        fsm: 'sneak_success'
      },
      outcome_fail: {
        flavor: 'Um bandido ouve você. "Quem está aí?!"',
        ops: [],
        fsm: 'player_attack_choice'
      }
    },
    {
      id: 'attack_bandit',
      label: 'Atacar de surpresa',
      flavor: 'Você saca a arma e ataca!',
      outcome_ok: { ops: [], fsm: 'player_attack_choice', flavor: 'O combate começa.' }
    },
    {
      id: 'parley_bandit',
      label: 'Tentar negociar (Intimidação)',
      skill: 'intimidation', dc: 15,
      outcome_ok: {
        flavor: 'Sua presença os intimida. Eles te dão metade do espólio para sumir.',
        ops: [
          { op: 'gold', delta: 22 },
          { op: 'flag', id: 'bandit_intimidated', scope: 'session' }
        ],
        fsm: 'retreat_choice'
      },
      outcome_fail: {
        flavor: 'Eles riem. "Que coragem inútil."',
        ops: [],
        fsm: 'player_attack_choice'
      }
    },
    {
      id: 'retreat_bandit',
      label: 'Recuar silenciosamente',
      flavor: 'Você se afasta sem ser percebido.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você desvia.' }
    }
  ]
};

window.TILE_EVENTS_DB['bandit_camp.alerted'] = {
  body: 'Eles te viram. Saques sacam armas — facas, bestas, ódio.',
  voiceLines: {
    martial:    '"Sem volta agora."',
    specialist: '"Vou pelos pontos cegos."',
    spiritual:  '"Que assim seja."',
    arcane:     '"Magia primeiro."'
  },
  choices: [
    {
      id: 'fight_bandit',
      label: 'Lutar',
      flavor: 'Você firma a posição.',
      outcome_ok: { ops: [], fsm: 'combat_won', flavor: 'Combate inicia.' }
    },
    {
      id: 'flee_bandit',
      label: 'Fugir',
      skill: 'acrobatics', dc: 14,
      outcome_ok: {
        flavor: 'Você desaparece pela mata. Eles desistem.',
        ops: [],
        fsm: 'sneak_success'
      },
      outcome_fail: {
        flavor: 'Um deles te alcança. Você leva uma facada nas costas.',
        ops: [{ op: 'hp', delta: -8 }],
        fsm: null
      }
    }
  ]
};

window.TILE_EVENTS_DB['bandit_camp.cleared'] = {
  body: 'Os bandidos foram derrotados ou fugiram. Os despojos estão por toda parte.',
  voiceLines: {
    martial:    '"Limpo. Tomarei o que merecer."',
    specialist: '"Inventário rápido."',
    spiritual:  '"Que aprendam com a derrota."',
    arcane:     '"Menos uma ameaça no mundo."'
  },
  choices: [
    {
      id: 'loot_bandit',
      label: 'Saquear o acampamento',
      skill: 'investigation', dc: 10,
      outcome_ok: {
        flavor: 'Você encontra 30 Valdoritas, dois punhais e provisões.',
        ops: [
          { op: 'gold', delta: 30 },
          { op: 'item', id: 'rusty_dagger' }
        ],
        fsm: 'loot_picked'
      },
      outcome_fail: {
        flavor: 'Os bandidos foram cuidadosos com o esconderijo. Pouco resta.',
        ops: [{ op: 'gold', delta: 8 }],
        fsm: 'loot_picked'
      }
    },
    {
      id: 'leave_cleared',
      label: 'Seguir caminho',
      flavor: 'Você prossegue.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você segue em frente.' }
    }
  ]
};

window.TILE_EVENTS_DB['bandit_camp.ruins'] = {
  body: 'Restos de tendas há muito decompostas. Ossos antigos. Foi acampamento, há anos.',
  voiceLines: {
    martial:    '"Velho demais."',
    specialist: '"Sem nada a colher."',
    spiritual:  '"Que descansem."',
    arcane:     '"Pó."'
  },
  choices: [
    {
      id: 'leave_ruins',
      label: 'Seguir adiante',
      flavor: 'Você passa.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

// =============================================================================
//  hunter_camp — Acampamento de Caçadores (Phase B.8, family: camp)
// =============================================================================

window.TILE_EVENTS_DB['hunter_camp.dormant'] = {
  body: 'Acampamento de caçadores em silêncio. Couros estendidos para secar, fogueira fria, sem sinal recente de uso.',
  voiceLines: {
    martial:    '"Saíram pra caçar. Talvez voltem."',
    specialist: '"Padrão típico. Acampamento de duas semanas."',
    spiritual:  '"Vivem em harmonia com a mata."',
    arcane:     '"Mortais simples. Sem ameaça."'
  },
  choices: [
    {
      id: 'investigate_hunter',
      label: 'Investigar respeitosamente',
      skill: 'survival', dc: 11,
      outcome_ok: {
        flavor: 'Você encontra um pote com geleia de frutas e ração — provisões pra três dias.',
        ops: [
          { op: 'item', id: 'travel_rations' },
          { op: 'flag', id: 'hunter_camp_visited', scope: 'pc' }
        ],
        fsm: null
      },
      outcome_fail: {
        flavor: 'Você sente o olhar invisível dos caçadores ausentes. Melhor sair.',
        ops: [],
        fsm: null
      }
    },
    {
      id: 'leave_hunter',
      label: 'Sair sem perturbar',
      flavor: 'Você passa em silêncio.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

window.TILE_EVENTS_DB['hunter_camp.active'] = {
  body: 'Três caçadores afiam facas em volta da fogueira. Um cervo recém abatido pendurado próximo. Eles te avistam — neutros até agora.',
  voiceLines: {
    martial:    '"Caçadores. Não são ameaça se tratados bem."',
    specialist: '"Posso aprender com eles. Boa sina."',
    spiritual:  '"Estão em paz com a terra."',
    arcane:     '"Mortais simples — sem hostilidade."'
  },
  choices: [
    {
      id: 'parley_hunter',
      label: 'Cumprimentar respeitosamente (Persuasão)',
      skill: 'persuasion', dc: 11,
      outcome_ok: {
        flavor: 'Eles te recebem. "Sentem-se. Há carne pra todos." Você ouve histórias e ganha conhecimento da floresta.',
        ops: [
          { op: 'xp', delta: 20 },
          { op: 'hp', delta: 6 },
          { op: 'flag', id: 'hunter_friendly', scope: 'pc' }
        ],
        fsm: 'player_proximity'
      },
      outcome_fail: {
        flavor: 'Eles continuam neutros. "Passe sem incidentes."',
        ops: [],
        fsm: null
      }
    },
    {
      id: 'trade_hunter',
      label: 'Tentar comércio',
      flavor: 'Você oferece moedas por suprimentos.',
      outcome_ok: {
        flavor: 'Eles aceitam — você gasta 12 Valdoritas e ganha rações.',
        ops: [
          { op: 'gold', delta: -12 },
          { op: 'item', id: 'travel_rations' }
        ],
        fsm: null
      }
    },
    {
      id: 'leave_hunter_active',
      label: 'Seguir caminho',
      flavor: 'Você os cumprimenta com a cabeça e passa.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

window.TILE_EVENTS_DB['hunter_camp.alerted'] = {
  body: 'Eles ergueram os arcos. Você os ofendeu, ameaçou ou foi confundido com inimigo.',
  voiceLines: {
    martial:    '"Como cheguei a este ponto..."',
    specialist: '"Posso recuar — não vale a luta."',
    spiritual:  '"Lamentável. Não desejo mal a eles."',
    arcane:     '"Pode-se desarmá-los sem dano."'
  },
  choices: [
    {
      id: 'apologize_hunter',
      label: 'Pedir perdão (Persuasão)',
      skill: 'persuasion', dc: 16,
      outcome_ok: {
        flavor: 'Eles abaixam os arcos. "Vá em paz. E não volte."',
        ops: [{ op: 'xp', delta: 12 }],
        fsm: 'retreat_choice'
      },
      outcome_fail: {
        flavor: 'Uma flecha passa raspando.',
        ops: [{ op: 'hp', delta: -4 }],
        fsm: 'player_attack_choice'
      }
    },
    {
      id: 'fight_hunter',
      label: 'Lutar',
      flavor: 'Você ataca.',
      outcome_ok: { ops: [], fsm: 'combat_won', flavor: 'Combate inicia.' }
    },
    {
      id: 'flee_hunter',
      label: 'Fugir',
      skill: 'dex', dc: 12,
      outcome_ok: {
        flavor: 'Você corre pela mata e escapa.',
        ops: [],
        fsm: 'sneak_success'
      },
      outcome_fail: {
        flavor: 'Uma flecha encontra seu ombro.',
        ops: [{ op: 'hp', delta: -5 }],
        fsm: null
      }
    }
  ]
};

window.TILE_EVENTS_DB['hunter_camp.cleared'] = {
  body: 'O acampamento agora silente — os caçadores foram embora ou caíram. Algumas coisas restam.',
  voiceLines: {
    martial:    '"Que descansem. Se levarei algo, é com respeito."',
    specialist: '"Provisões valiosas aqui."',
    spiritual:  '"Que a floresta os acolha."',
    arcane:     '"Sem energia residual. Apenas memória."'
  },
  choices: [
    {
      id: 'loot_respectful',
      label: 'Coletar suprimentos com respeito',
      flavor: 'Você toma apenas o necessário.',
      outcome_ok: {
        flavor: 'Algumas moedas, rações que ainda servem — você toma apenas o que viajante de boa fé toma. Um momento de silêncio, e segue.',
        ops: [
          { op: 'gold', delta: 15 },
          { op: 'item', id: 'travel_rations' },
          { op: 'xp', delta: 10 }
        ],
        fsm: 'loot_picked'
      }
    },
    {
      id: 'leave_cleared',
      label: 'Sair em silêncio',
      flavor: 'Você baixa a cabeça e parte.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

window.TILE_EVENTS_DB['hunter_camp.ruins'] = {
  body: 'Restos antigos de couros e ossos. Foi acampamento, faz tempo.',
  voiceLines: {
    martial:    '"Tempo demais."',
    specialist: '"Sem rastros vivos."',
    spiritual:  '"Eles partiram em paz."',
    arcane:     '"Cinza apenas."'
  },
  choices: [
    {
      id: 'leave_ruins',
      label: 'Seguir adiante',
      flavor: 'Você passa.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

// =============================================================================
//  caravan_camp — Caravana Mercante (Phase B.9, family: camp)
// =============================================================================

window.TILE_EVENTS_DB['caravan_camp.active'] = {
  body: 'Uma caravana mercante descansa. Carroças cobertas, mulas pastando, comerciantes contando moedas. Eles te observam.',
  voiceLines: {
    martial:    '"Mercadores. Pacíficos, mas atentos."',
    specialist: '"Carga interessante. Posso negociar."',
    spiritual:  '"Boas almas, espero."',
    arcane:     '"Itens mágicos talvez. Vale ver."',
    BARDO:      '"Posso entreter por barganha melhor."'
  },
  choices: [
    {
      id: 'trade_caravan',
      label: 'Negociar (Persuasão)',
      skill: 'persuasion', dc: 11,
      outcome_ok: {
        flavor: 'Você consegue um bom desconto. Compra rações + tônico por 15 Valdoritas.',
        ops: [
          { op: 'gold', delta: -15 },
          { op: 'item', id: 'travel_rations' },
          { op: 'item', id: 'healing_potion' },
          { op: 'flag', id: 'caravan_traded', scope: 'session' }
        ],
        fsm: 'player_proximity'
      },
      outcome_fail: {
        flavor: 'O preço é firme. 25 Valdoritas pelos itens — caro demais por enquanto.',
        ops: [],
        fsm: null
      }
    },
    {
      id: 'sneak_caravan',
      label: 'Roubar a carga (Furtividade)',
      skill: 'stealth', dc: 16,
      outcome_ok: {
        flavor: 'Você se infiltra entre as carroças e leva uma bolsa pequena. 20 Valdoritas e algumas joias.',
        ops: [
          { op: 'gold', delta: 20 },
          { op: 'flag', id: 'caravan_robbed', scope: 'pc' }
        ],
        fsm: 'sneak_success'
      },
      outcome_fail: {
        flavor: 'Um guarda te flagra. "Ladrão!" Combate iminente.',
        ops: [],
        fsm: 'player_attack_choice'
      }
    },
    {
      id: 'leave_caravan',
      label: 'Seguir caminho',
      flavor: 'Você cumprimenta e passa.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

window.TILE_EVENTS_DB['caravan_camp.dormant'] = {
  body: 'A caravana descansa em silêncio profundo. Tochas apagadas, mulas dormindo, comerciantes em sono pesado. É madrugada.',
  voiceLines: {
    martial:    '"Vigia leve neste horário."',
    specialist: '"Posso passar sem ninguém notar."',
    spiritual:  '"Não atrapalho seu sono."',
    arcane:     '"Sem auras vivas alertas."'
  },
  choices: [
    {
      id: 'sneak_past_caravan',
      label: 'Passar furtivamente',
      skill: 'stealth', dc: 12,
      outcome_ok: {
        flavor: 'Você desliza entre as carroças sem fazer ruído.',
        ops: [{ op: 'xp', delta: 8 }],
        fsm: 'sneak_success'
      },
      outcome_fail: {
        flavor: 'Uma mula relincha. Vozes tensas dentro das carroças.',
        ops: [],
        fsm: null
      }
    },
    {
      id: 'leave_dormant',
      label: 'Acampar próximo (em paz)',
      flavor: 'Você descansa a uma distância respeitosa.',
      outcome_ok: {
        flavor: 'Você se acomoda perto, mas não próximo demais. O sono vem fácil, e a chama interior volta a respirar.',
        ops: [
          { op: 'hp', delta: 8 },
          { op: 'mp', delta: 3 }
        ],
        fsm: null
      }
    }
  ]
};

window.TILE_EVENTS_DB['caravan_camp.alerted'] = {
  body: 'Os guardas da caravana sacam armas. Você foi pego — ou confundido com bandido.',
  voiceLines: {
    martial:    '"Mal entendido. Posso explicar — talvez."',
    specialist: '"Recuar é o mais sábio."',
    spiritual:  '"Lamentável situação."',
    arcane:     '"Posso defletir flechas."'
  },
  choices: [
    {
      id: 'parley_caravan_alert',
      label: 'Tentar explicar (Persuasão)',
      skill: 'persuasion', dc: 14,
      outcome_ok: {
        flavor: 'Você convence o líder de que não é ameaça. "Passe — mas sem mais surpresas."',
        ops: [{ op: 'xp', delta: 18 }],
        fsm: 'retreat_choice'
      },
      outcome_fail: {
        flavor: 'Eles atacam.',
        ops: [],
        fsm: 'player_attack_choice'
      }
    },
    {
      id: 'flee_caravan',
      label: 'Fugir',
      skill: 'dex', dc: 13,
      outcome_ok: {
        flavor: 'Você corre pela noite. Eles não te alcançam.',
        ops: [],
        fsm: 'sneak_success'
      },
      outcome_fail: {
        flavor: 'Uma flecha encontra a sua perna.',
        ops: [{ op: 'hp', delta: -6 }],
        fsm: null
      }
    }
  ]
};

window.TILE_EVENTS_DB['caravan_camp.cleared'] = {
  body: 'A caravana partiu. Marcas de carroças, fogueira morta, e algumas coisas esquecidas.',
  voiceLines: {
    martial:    '"Já se foram. Nada perdido."',
    specialist: '"Vejamos o que esqueceram."',
    spiritual:  '"Boa viagem a eles."',
    arcane:     '"Lugar novamente quieto."'
  },
  choices: [
    {
      id: 'find_lost_items',
      label: 'Vasculhar (Investigação)',
      skill: 'investigation', dc: 11,
      outcome_ok: {
        flavor: 'Você encontra um anel deixado por descuido — vale 12 Valdoritas.',
        ops: [
          { op: 'gold', delta: 12 },
          { op: 'flag', id: 'caravan_lost_item', scope: 'session' }
        ],
        fsm: 'loot_picked'
      },
      outcome_fail: {
        flavor: 'Apenas migalhas e cinzas.',
        ops: [],
        fsm: null
      }
    },
    {
      id: 'leave_cleared',
      label: 'Seguir caminho',
      flavor: 'Você prossegue.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você segue em frente.' }
    }
  ]
};

window.TILE_EVENTS_DB['caravan_camp.ruins'] = {
  body: 'Carroças tombadas, mulas mortas há anos. Esta caravana foi atacada e nunca recuperada.',
  voiceLines: {
    martial:    '"Tragédia velha."',
    specialist: '"Sinais de embuscada."',
    spiritual:  '"Que descansem."',
    arcane:     '"Memória de violência."'
  },
  choices: [
    {
      id: 'pay_respects',
      label: 'Prestar respeito',
      flavor: 'Você dedica um momento.',
      outcome_ok: {
        flavor: 'Você se sente em paz. Pequeno gesto, eco silencioso.',
        ops: [{ op: 'xp', delta: 5 }],
        fsm: null
      }
    },
    {
      id: 'leave_ruins',
      label: 'Seguir adiante',
      flavor: 'Você passa em silêncio.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

// =============================================================================
//  abandoned_camp — Acampamento Abandonado (Phase B.10, family: camp)
// =============================================================================

window.TILE_EVENTS_DB['abandoned_camp.dormant'] = {
  body: 'Um acampamento abandonado há tempos. Tendas em farrapos, fogueira coberta de musgo. Sinais de partida apressada — alguns objetos pessoais ainda restam.',
  voiceLines: {
    martial:    '"Foram embora rápido. Ou pior."',
    specialist: '"Saída em pânico. Investigarei o porquê."',
    spiritual:  '"Algo aterrorizou as pessoas que viviam aqui."',
    arcane:     '"Resíduo de medo no ar. Não mágico — emocional."'
  },
  choices: [
    {
      id: 'investigate_abandoned',
      label: 'Investigar a fundo (Investigação)',
      skill: 'investigation', dc: 13,
      outcome_ok: {
        flavor: 'Você encontra um diário rasgado. Páginas finais falam de criaturas nas sombras — uma maldição local.',
        ops: [
          { op: 'xp', delta: 22 },
          { op: 'flag', id: 'cursed_region_known', scope: 'pc' }
        ],
        fsm: 'loot_picked'
      },
      outcome_fail: {
        flavor: 'Você só encontra trapos e ossos roídos por animais. Nada conclusivo.',
        ops: [{ op: 'xp', delta: 4 }],
        fsm: null
      }
    },
    {
      id: 'salvage_abandoned',
      label: 'Salvar o que puder',
      flavor: 'Você revira as tendas em busca de utilitários.',
      outcome_ok: {
        flavor: 'Algumas moedas espalhadas no chão, um cantil ainda com água. Não muito — mas o suficiente pra valer o tempo.',
        ops: [{ op: 'gold', delta: 8 }],
        fsm: null
      }
    },
    {
      id: 'leave_abandoned',
      label: 'Não perturbar — seguir caminho',
      flavor: 'Você sente que algo aqui não quer ser visto.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

window.TILE_EVENTS_DB['abandoned_camp.cleared'] = {
  body: 'Você já vasculhou tudo aqui. O lugar continua vazio.',
  voiceLines: {
    martial:    '"Já estive aqui."',
    specialist: '"Mais nada útil."',
    spiritual:  '"Que a paz chegue ao fim."',
    arcane:     '"Memória apenas."'
  },
  choices: [
    {
      id: 'leave_cleared',
      label: 'Seguir caminho',
      flavor: 'Você passa.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

window.TILE_EVENTS_DB['abandoned_camp.ruins'] = {
  body: 'Apenas marcas no chão restam. O tempo apagou o resto.',
  voiceLines: {
    martial:    '"Pó."',
    specialist: '"Devolvido à terra."',
    spiritual:  '"Que descansem."',
    arcane:     '"Sem rastro arcano."'
  },
  choices: [
    {
      id: 'leave_ruins',
      label: 'Seguir adiante',
      flavor: 'Você passa.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

// =============================================================================
//  war_drum — Tambor de Guerra (Phase B.11, family: caller)
// =============================================================================

window.TILE_EVENTS_DB['war_drum.dormant'] = {
  body: 'Um grande tambor de guerra orc montado em postes. Decorado com ossos e pinturas tribais. Silencioso por enquanto — mas funcional.',
  voiceLines: {
    martial:    '"Tambor de guerra. Convocação tribal."',
    specialist: '"Posso destruir antes que toque — mas dará reforços vir."',
    spiritual:  '"Ferramenta de violência."',
    arcane:     '"Sem encantamento, mas o som chama longe."'
  },
  choices: [
    {
      id: 'destroy_drum',
      label: 'Destruir o tambor (Atletismo)',
      skill: 'athletics', dc: 13,
      outcome_ok: {
        flavor: 'Você quebra o couro do tambor. Não pode mais convocar reforços.',
        ops: [
          { op: 'xp', delta: 25 },
          { op: 'flag', id: 'war_drum_destroyed', scope: 'session' }
        ],
        fsm: 'loot_picked'
      },
      outcome_fail: {
        flavor: 'Você golpeia em vão — o couro absorve o impacto. Suor, mas sem progresso.',
        ops: [{ op: 'exh', delta: 1 }],
        fsm: null
      }
    },
    {
      id: 'beat_drum',
      label: 'Tocar o tambor — chamar reforços inimigos!',
      flavor: 'Você golpeia o tambor com força. O som ecoa pela mata. Reforços vão chegar.',
      outcome_ok: {
        flavor: 'Reforços orc chegam ao seu próximo combate. (caller_triggered emitido)',
        ops: [
          { op: 'flag', id: 'caller_triggered_war_drum', scope: 'session' },
          { op: 'xp', delta: 5 }
        ],
        fsm: null
      }
    },
    {
      id: 'leave_drum',
      label: 'Deixar como está',
      flavor: 'Você prossegue sem tocar.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

window.TILE_EVENTS_DB['war_drum.cleared'] = {
  body: 'O tambor está destruído — couro rasgado, postes derrubados. Nunca mais convocará ninguém.',
  voiceLines: {
    martial:    '"Trabalho feito."',
    specialist: '"Eficiente."',
    spiritual:  '"Que essa guerra encontre fim."',
    arcane:     '"Pó. Apenas isso."'
  },
  choices: [
    {
      id: 'leave_cleared',
      label: 'Seguir caminho',
      flavor: 'Você prossegue, vitorioso.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você segue em frente.' }
    }
  ]
};

window.TILE_EVENTS_DB['war_drum.ruins'] = {
  body: 'Apenas restos de madeira apodrecida e couro escuro. Foi tambor, há anos.',
  voiceLines: {
    martial:    '"Tempo apagou tudo."',
    specialist: '"Sem nada a fazer."',
    spiritual:  '"Velho silêncio."',
    arcane:     '"Memória apenas."'
  },
  choices: [
    {
      id: 'leave_ruins',
      label: 'Seguir adiante',
      flavor: 'Você passa.',
      outcome_ok: { ops: [], fsm: null, flavor: 'Você prossegue.' }
    }
  ]
};

if (window.TileLog) window.TileLog.info('TILE-EVT', 'tile_events_data_loaded', {
  entries: Object.keys(window.TILE_EVENTS_DB).length
});
