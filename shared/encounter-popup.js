/* ============================================================================
 * encounter-popup.js — PADRAO_ALDRIC dialogue engine (shared canonical)
 * ============================================================================
 *
 * Source canonical: simuladores/banco-cofre-final.html linhas 1324-1853.
 * Extraído nesta sessão (#13) pra ser reusável por TODOS os renderers
 * de estabelecimento em cidade/index.html (Task #23 centralização).
 *
 * MAPA_IA — navegação rápida:
 *   ~80   _ensureOverlay() — cria #encounter-overlay no DOM se ainda não existe
 *   ~170  _groupScriptIntoPages(script) — paginação canonical (2 estrofes / 10 linhas)
 *   ~160  _splitIntoSentences(text) — quebra por .!? pra typewriter por frase
 *   ~200  _typewriter(el, text, charMs, onDone) — char-by-char com pausa em <i>
 *   ~310  _sanitizeDialogueHTML(html) — whitelist REAL (#88): escape + i/em/b/strong/br/u/s/code
 *   ~325  _SKILL_LABEL_PT + _skillLabelPT(s) — keys EN → PT-BR no badge de CD
 *   ~490  _buildRewardBlockEl(line) — bloco RECOMPENSA épico (gold/xp/item WebP)
 *   ~530  _buildCharacterSheetEl(line) — bloco FICHA DE PERSONAGEM épico (FASE 5, retrato+stats, DOM-safe)
 *   ~700  _openItemDetailDialog/_buildChoiceItemThumb (item I) — thumb+detalhe de COMPRA
 *   ~390  openChoices(choices, opts) — sub-overlay AAA (badge CD, label fallback, thumb item)
 *   ~500  vEncounter.render(dialogue) — entry principal (check_hint preproc #88)
 *   ~720  renderPage(idx) — linhas narration/speech/dm + GUARD anti speaker-key (#88)
 *   ~960  renderActions() — choices (fallback Fechar se vazio #88) + cb dispatch
 *   ~1090 vEncounter.close() / vEncounter.isOpen()
 *
 * Doc canonical:
 *   memory/feedback_centralize_in_canonical_webapps.md (porting pattern)
 *   simuladores/banco-cofre-final.html (mockup source)
 *
 * USO em renderer (após carregar shared/svc-interactions.js + shared/dice-3d.js):
 *
 *   var SERVICE_DIALOGUES_BANK = {
 *     deposit: {
 *       npc: { name: 'Aldwin de Tholram', desc: 'Banqueiro · Casa de Tholram',
 *              portrait: '../shared/img/npcs/banqueiro.webp' },
 *       script: [ { type:'narration', text:'...' }, { type:'speech', speaker:'Aldwin', text:'...' } ],
 *       choices: [ { id:'pay', label:'Pagar', cb:'pay-confirm', renownDelta: +1 } ]
 *     }
 *   };
 *
 *   vEncounter.render(SERVICE_DIALOGUES_BANK.deposit, { dialogues: SERVICE_DIALOGUES_BANK });
 *
 * cb patterns reconhecidos (delegated to svc-interactions._dispatchSvcChoice):
 *   - 'close'                            → fecha overlay
 *   - 'dice:<ability>:<dc>:<mod>'        → skill check Dice3D
 *   - 'opinion-*'                        → reação NPC + Renown delta
 *   - '*-confirm'                        → purchase confirm + Renown delta
 *   - 'cascade:<targetNpc>:<dialogueId>' → NPC Living cascade
 *   - 'memory:<key>:<value>'             → grava NPC memory
 *   - 'visit:<topic>'                    → marca visita
 *   - <id de outro dialogue em dialogues> → chain (re-renderiza)
 *
 * ============================================================================ */

(function(){
  'use strict';

  var OVERLAY_ID = 'encounter-overlay';
  var _currentRenderState = null;

  /* ============================================================================
   * BANIMENTO PERMANENTE DE EMOJIS EM NARRATIVAS E UI (Ordem do Usuário 2026-10)
   * Ambientação dark medieval rígida D&D 5e. Remove pictográficos coloridos,
   * emotes de rosto, criaturas, fantasmas e objetos coloridos de narrações, falas,
   * escolhas, títulos e modais, preservando glifos tipográficos monocromáticos
   * universais (✓ ✗ → ← ◆ ◇ · • … ▸ ▾ ■ □ ● ○).
   * ============================================================================ */
  var _BANNED_EMOJI_RE = /[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u26FF\u2700-\u27BF\u2B50-\u2B55\uFE0F]/g;
  function _stripEmojis(str) {
    if (!str) return '';
    return String(str).replace(_BANNED_EMOJI_RE, function(m) {
      if (m === '✓' || m === '✔' || m === '✕' || m === '✖' || m === '✗' ||
          m === '◆' || m === '◇' || m === '·' || m === '•' || m === '…' ||
          m === '▸' || m === '▾' || m === '■' || m === '□' || m === '●' || m === '○') {
        return m;
      }
      return '';
    }).replace(/\s{2,}/g, ' ');
  }

  /* Ordem do Usuário 2026-10: Sanitização canônica de falas/quotes de escolhas.
     Remove pontuação redundante (travessão '—', dashes, aspas duplicadas ou aninhadas)
     que causava o erro de aparecer '“— "' antes ou '."”' depois da fala nos cards de escolha. */
  function _cleanSpeechText(raw) {
    if (!raw) return '';
    var s = _stripEmojis(String(raw).trim());
    var prev = '';
    while (s && s !== prev) {
      prev = s;
      // Remove travessões ou traços iniciais (comum em roteiros de diálogo)
      s = s.replace(/^[—–-]+\s*/, '');
      // Remove aspas externas pareadas ("...", “...”, '...', «...»)
      if ((s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
          (s.charAt(0) === '“' && s.charAt(s.length - 1) === '”') ||
          (s.charAt(0) === '«' && s.charAt(s.length - 1) === '»') ||
          (s.charAt(0) === '\'' && s.charAt(s.length - 1) === '\'')) {
        s = s.slice(1, -1).trim();
      }
      // Remove aspas ou traços órfãos no início ou no fim
      s = s.replace(/^[“"«'\s]+/, '').replace(/[”"»'\s]+$/, '');
      s = s.replace(/^[—–-]+\s*/, '').replace(/[—–-]+\s*$/, '');
      s = s.trim();
    }
    return s;
  }

  /* PADRAO_LOCAIS #2 & Ordem do Usuário 2026-10: fallback de retrato.
     Se a imagem falhar (404/rede), substitui imediatamente pelo Medalhão Dourado
     de Diálogo de Valdoria (/shared/img/ui/dialogo.webp), preservando a imersão. */
  var _ENC_IMG_ONERR = "onerror=\"this.onerror=null;this.src='/shared/img/ui/dialogo.webp';\"";

  /* Ordem do Usuário 2026-10: SISTEMA DE IMAGEM GENÉRICA MISTERIOSA & IDENTIDADE DO JOGO.
     Quando um diálogo ou narrativa não possui imagem oficial/original dedicada (ou se refere
     a leitura de pergaminho, tomo, mistério, monólogo interior ou crônica geral), este resolver
     atribui automaticamente uma ilustração oficial de alta resolução de Valdoria. */
  function _resolveGenericEncounterPortrait(name, desc) {
    var s = String((name || '') + ' ' + (desc || '')).toLowerCase();
    // 1. Pergaminho / Manuscrito / Carta / Edital / Decreto / Leitura / Mapa Antigo
    if (s.indexOf('pergaminho') >= 0 || s.indexOf('lendo') >= 0 || s.indexOf('carta') >= 0 ||
        s.indexOf('edital') >= 0 || s.indexOf('manuscrito') >= 0 || s.indexOf('decreto') >= 0 ||
        s.indexOf('missiva') >= 0 || s.indexOf('mensagem') >= 0 || s.indexOf('registro') >= 0 ||
        s.indexOf('aviso') >= 0 || s.indexOf('anota') >= 0) {
      return '/shared/img/items/pergaminho-antigo.webp';
    }
    // 2. Livro / Tomo / Compêndio / Códex / Arquivos / Crônicas / Sabedoria Arcana
    if (s.indexOf('compêndio') >= 0 || s.indexOf('compendio') >= 0 || s.indexOf('livro') >= 0 ||
        s.indexOf('tomo') >= 0 || s.indexOf('códex') >= 0 || s.indexOf('codex') >= 0 ||
        s.indexOf('crônica') >= 0 || s.indexOf('cronica') >= 0 || s.indexOf('arquivo') >= 0 ||
        s.indexOf('biblioteca') >= 0) {
      return '/shared/img/levelup/subclasses/lore.webp';
    }
    // 3. Mistério / Sussurro / Voz Oculta / Sombra / Vulto / Enigma / Ruínas / Presença Oculta
    if (s.indexOf('misteri') >= 0 || s.indexOf('mistéri') >= 0 || s.indexOf('sussurr') >= 0 ||
        s.indexOf('voz oculta') >= 0 || s.indexOf('sombra') >= 0 || s.indexOf('vulto') >= 0 ||
        s.indexOf('enigma') >= 0 || s.indexOf('ocult') >= 0 || s.indexOf('desconhecid') >= 0 ||
        s.indexOf('estranh') >= 0 || s.indexOf('ruina') >= 0 || s.indexOf('ruína') >= 0) {
      return '/shared/img/npcs/sussurrador-misterioso.webp';
    }
    // 4. Você / Aventureiro / Monólogo Interior / Reflexão / Pensamento
    if (s.indexOf('você') >= 0 || s.indexOf('voce') >= 0 || s.indexOf('pensamento') >= 0 ||
        s.indexOf('reflex') >= 0 || s.indexOf('mente') >= 0 || s.indexOf('monólogo') >= 0 ||
        s.indexOf('monologo') >= 0) {
      return '/shared/img/npcs/plaza/square_wanderer.webp';
    }
    // 5. Fallback Canônico Universal de Identidade do Jogo (Medalhão Dourado de Diálogo de Valdoria)
    return '/shared/img/ui/dialogo.webp';
  }

  /* A3.7 (#90): NORMALIZADOR canônico do shape de NPC de diálogo (vNpc).
     3 shapes coexistem nos dados: (1) string-key resolvida contra
     RECURRING_NPCS (cidade); (2) objeto contrato deste motor {name, desc,
     portrait:URL, portraitHTML:html}; (3) objeto do registry da cidade com
     semântica INVERTIDA (portrait='ic-*' ícone heráldico; portraitImg=URL).
     O render normaliza AQUI (choke-point único) — bug real: o Porão
     (PADRAO_SERVIDOR) mandava portraitImg e o retrato da Martha NÃO
     renderizava. Datasets NÃO foram renomeados de propósito (111 literais +
     18 consumidores legados leem os campos antigos). Regras:
       - portraitImg (URL real) VENCE → vira portrait (lightbox funciona);
       - portrait com cara de ícone ('ic-*') resolve para retrato temático
         de identidade do jogo e só degrada para HTML se não houver;
       - se não houver retrato, atribui o retrato de mistério/identidade canônico;
       - objeto já canônico passa intacto (idempotente). */
  var _NPC_ICON_RE = /^ic-[\w-]+$/;
  function _vNpcResolve(raw, opts) {
    if (!raw) return null;
    if (typeof raw === 'string') {
      var reg = (opts && opts.npcRegistry) || window.RECURRING_NPCS || null;
      var hit = reg ? reg[raw] : null;
      if (!hit) {
        try { console.error('[ENC] vNpc: NPC key não resolvida: ' + raw); } catch (_e) {}
        return null;
      }
      var o = _vNpcResolve(hit, opts);
      if (o && !o.id) o.id = raw;
      return o;
    }
    if (typeof raw !== 'object') return null;
    var out = {};
    for (var k in raw) {
      if (Object.prototype.hasOwnProperty.call(raw, k)) out[k] = raw[k];
    }
    if (out.portraitImg) {
      out.portrait = out.portraitImg;
    } else if (out.portrait && _NPC_ICON_RE.test(String(out.portrait))) {
      var thematicPortrait = _resolveGenericEncounterPortrait(out.name, out.desc);
      if (thematicPortrait) {
        out.portrait = thematicPortrait;
      } else if (!out.portraitHTML && typeof window._heralIco === 'function') {
        try { out.portraitHTML = window._heralIco(out.portrait); } catch (_eIco) {}
        out.portrait = '';
      }
    } else if (!out.portrait) {
      out.portrait = _resolveGenericEncounterPortrait(out.name, out.desc);
    }
    return out;
  }
  // API pública: adapter da cidade / svc / exploração podem delegar em vez de
  // reimplementar a tradução (resolve aceita string-key OU objeto).
  window.vNpc = { resolve: _vNpcResolve };

  /* Sessão #72 (user, IMMUTABLE): nas ESCOLHAS DE AÇÃO de TODOS os diálogos, o
     custo em moeda DEVE usar o desenho da Valdorita (ícone), nunca "Valdoritas"
     por extenso. Só a FALA/narrativa do NPC (enc-line) pode usar "valdoritas" por
     extenso em ocasiões raras. _coinify converte "<n> Valdoritas/Valdorita/V" no
     ícone — aplicado SOMENTE em labels de choice (não em speech/narration). */
  var _VCOIN = '<span class="vi vi-coin sm" aria-label="Valdoritas"></span>';
  function _coinify(s) {
    if (window.vCoin && typeof window.vCoin.coinify === 'function') {
      return window.vCoin.coinify(s);
    }
    return String(s == null ? '' : s)
      .replace(/(\d+)\s*[Vv]aldoritas?\b/g, '$1 ' + _VCOIN)
      .replace(/(\d+)\s*V\b(?![a-zA-Z])/g, '$1 ' + _VCOIN);
  }

  /* Suporte a flexão gramatical por gênero {masc|fem} ou {masc|fem|neut} */
  function _resolveGenderTokens(text, gender) {
    if (!text || typeof text !== 'string') return text || '';
    var g = String(gender || '').trim().toLowerCase();
    var isFem = (g === 'f' || g === 'female' || g === 'fem' || g === 'mulher' || g === 'feminino');
    return text.replace(/\{([^{}|]+)\|([^{}|]+)(?:\|([^{}|]+))?\}/g, function(match, m, f, n) {
      if (isFem) return f;
      return m;
    });
  }

  /* task #69 (2026-05-20) — MIGRATION HTML <dialog> element.
     Pesquisa em 4 fontes (MDN, caniuse 95.48%, LogRocket, dev.to) confirma
     <dialog> + showModal() é solução definitiva pra z-index conflicts.
     Browser support 95.48% (Chrome 37+, Safari 15.4+, FF 98+, Edge 79+).
     Telegram WebView (Chromium) suporta. Top-layer rendering elimina
     conflicts estruturalmente. Mantém API pública compatível. */
  function _ensureOverlay() {
    var ov = document.getElementById(OVERLAY_ID);
    var isNew = false;
    if (ov) {
      // Migration: if exists as <div> from old code, replace with <dialog>
      if (ov.tagName.toLowerCase() !== 'dialog') {
        var newOv = document.createElement('dialog');
        newOv.id = OVERLAY_ID;
        ov.parentNode.replaceChild(newOv, ov);
        ov = newOv;
        isNew = true;
      } else {
        return ov; // already migrated, listeners already attached
      }
    } else {
      ov = document.createElement('dialog');
      ov.id = OVERLAY_ID;
      document.body.appendChild(ov);
      isNew = true;
    }
    if (isNew) {
      // task #69: ESC key triggers cancel event → call our close() for clean
      // state teardown (stops active typewriters, clears _currentRenderState).
      // Without this, native <dialog> default close leaks running setTimeouts.
      ov.addEventListener('cancel', function(e) {
        e.preventDefault();
        close();
      });
      // task #69: defensive close listener — if dialog closes via any path
      // (programmatic .close(), ESC default fallback, etc.), ensure state cleanup.
      ov.addEventListener('close', function() {
        if (_currentRenderState && _currentRenderState.activeTypewriters) {
          _currentRenderState.activeTypewriters.forEach(function(tw){ try { tw.skip && tw.skip(); } catch(e){} });
        }
        _currentRenderState = null;
      });
    }
    return ov;
  }

  /* task #69: helpers pra mudar entre <dialog> API e classList (backward compat).
     showOverlay/closeOverlay usam .showModal()/.close() nativos quando dialog,
     fallback pra classList.add('active')/.remove('active') pra elementos antigos.
     IMPORTANTE — REGRESSION GUARD (revisão task #69):
     cidade/index.html line ~49748 injeta inline <style id="encounter-style"> com
     `#encounter-overlay { display:flex }` HARDCODED, SEM [open]/.active selector.
     Esse inline CSS é parseado DEPOIS do shared encounter-popup.css → mesma
     specificity, cascade ordering vence → legacy CSS ganha. Sem força bruta
     via inline style.display='none', o dialog ficaria visível mesmo após close()
     (sem [open], legacy CSS ainda diz display:flex). _closeOverlay agora SEMPRE
     força display:none via inline style (specificity inline > qualquer CSS). */
  function _showOverlay(ov) {
    if (!ov) return;
    // Clear inline 'none' from previous close (deixa CSS [open] rule kick in)
    ov.style.display = '';
    if (ov.tagName.toLowerCase() === 'dialog' && typeof ov.showModal === 'function') {
      try { if (!ov.open) ov.showModal(); }
      catch(e) { ov.classList.add('active'); ov.style.display = 'flex'; } // fallback
    } else {
      ov.classList.add('active');
    }
  }
  function _closeOverlay(ov) {
    if (!ov) return;
    if (ov.tagName.toLowerCase() === 'dialog' && typeof ov.close === 'function') {
      try { if (ov.open) ov.close(); } catch(e){}
    }
    ov.classList.remove('active'); // sempre remove .active pra compat
    // FORCE hide via inline style — overrides legacy inline CSS hardcoded display:flex
    // (cidade/index.html line ~49748 injects `#encounter-overlay { display:flex }`)
    ov.style.display = 'none';
  }
  function _isOverlayOpen(ov) {
    if (!ov) return false;
    if (ov.tagName.toLowerCase() === 'dialog') return !!ov.open;
    return ov.classList.contains('active');
  }

  /* Quebra texto em FRASES pra typewriter por sentence.
     Split por .!?: seguidos de espaço + capital/quote/tag. Preserva HTML tags. */
  function _splitIntoSentences(text) {
    if (!text) return [];
    var parts = text.split(/(?<=[.!?])\s+(?=["'<—A-ZÁÉÍÓÚÂÊÔÀÃÕÇ])/);
    return parts.map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 0; });
  }

  /* Sistema de Histórico de Textos Vistos (Ordem do Usuário 2026-10):
     Evita repetição maçante de efeito de máquina de escrever para diálogos/narrativas
     que o jogador já leu anteriormente. Hashes compactos persistidos em localStorage. */
  var _SEEN_TEXTS_STORAGE_KEY = 'valdoria_seen_dialogues_v1';
  var _seenTextsSet = null;

  function _normalizeTextForSeen(text) {
    if (!text) return '';
    return String(text)
      .replace(/<[^>]+>/g, '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function _dialogueTextHash(text) {
    var str = _normalizeTextForSeen(text);
    if (!str) return '';
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return (h >>> 0).toString(36);
  }

  function _getSeenTexts() {
    if (_seenTextsSet) return _seenTextsSet;
    try {
      var raw = localStorage.getItem(_SEEN_TEXTS_STORAGE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      _seenTextsSet = new Set(Array.isArray(arr) ? arr : []);
    } catch (_e) {
      _seenTextsSet = new Set();
    }
    return _seenTextsSet;
  }

  function _markTextSeen(text) {
    var hash = _dialogueTextHash(text);
    if (!hash) return;
    var set = _getSeenTexts();
    if (!set.has(hash)) {
      set.add(hash);
      try {
        var arr = Array.from(set);
        if (arr.length > 2000) arr = arr.slice(arr.length - 2000);
        localStorage.setItem(_SEEN_TEXTS_STORAGE_KEY, JSON.stringify(arr));
      } catch (_e) {}
    }
  }

  function _isTextSeen(text) {
    var hash = _dialogueTextHash(text);
    if (!hash) return false;
    return _getSeenTexts().has(hash);
  }

  var _activeEncounterInstance = null;

  /* ============================================================================
   * PERSISTÊNCIA DE DIÁLOGOS, NARRATIVAS E ESCOLHAS (Ordem do Usuário 2026-10)
   * Garante que se o jogador fechar o jogo no meio de um diálogo, narrativa ou
   * seleção de escolhas, ao recarregar ou retornar, o diálogo seja restaurado
   * exatamente onde estava (mesmo personagem/NPC, página e escolhas).
   * ============================================================================ */
  var _ENCOUNTER_STORAGE_PREFIX = 'valdoria_active_encounter_';
  var _ENCOUNTER_MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 horas de validade
  var _choiceHandlers = {};

  function registerChoiceHandler(handlerType, fn) {
    if (typeof handlerType === 'string' && typeof fn === 'function') {
      _choiceHandlers[handlerType] = fn;
    }
  }

  function _resolveStorageCharId(opts) {
    var p = (opts && opts.player) || (typeof window !== 'undefined' ? (window.CURRENT_PLAYER || window.CITY_MOCK_PLAYER) : null);
    if (opts && opts.charId) return String(opts.charId);
    if (p && (p.char_id || p.id)) return String(p.char_id || p.id);
    if (typeof window !== 'undefined' && typeof window._charId === 'string' && window._charId) return window._charId;
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      try {
        var sp = new URLSearchParams(window.location.search);
        var qp = sp.get('char') || sp.get('char_id');
        if (qp) return qp;
      } catch (_) {}
    }
    return 'default';
  }

  function _getEncounterStorageKey(charId) {
    return _ENCOUNTER_STORAGE_PREFIX + (charId || 'default');
  }

  function _saveActiveState(dialogue, opts, currentPage) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (opts && opts.transient) return;
    if (!dialogue || !dialogue.script) return;

    try {
      var charId = _resolveStorageCharId(opts);
      var key = _getEncounterStorageKey(charId);

      var serialized = {
        charId: charId,
        currentPage: typeof currentPage === 'number' ? currentPage : 0,
        dialogue: {
          npc: dialogue.npc ? {
            id: dialogue.npc.id || dialogue.npc.key || '',
            name: dialogue.npc.name || '',
            desc: dialogue.npc.desc || '',
            portrait: dialogue.npc.portrait || '',
            portraitHTML: dialogue.npc.portraitHTML || ''
          } : null,
          script: Array.isArray(dialogue.script) ? dialogue.script.map(function(s) {
            return {
              type: s.type,
              text: s.text,
              speaker: s.speaker,
              is_player: s.is_player,
              check_hint: s.check_hint,
              xp: s.xp,
              gold: s.gold,
              items: s.items,
              effect: s.effect
            };
          }) : [],
          choices: Array.isArray(dialogue.choices) ? dialogue.choices.map(function(c) {
            return {
              id: c.id,
              label: c.label,
              desc: c.desc,
              cb: c.cb,
              icon: c.icon,
              dc: c.dc,
              skill: c.skill,
              stat: c.stat,
              cost: c.cost,
              renownDelta: c.renownDelta,
              screen: c.screen,
              node: c.node,
              isPrep: c.isPrep,
              requireConfirm: c.requireConfirm,
              _oneShot: c._oneShot,
              _forced: c._forced,
              _idx: c._idx
            };
          }) : [],
          title: dialogue.title || null,
          choicesTitle: dialogue.choicesTitle || null,
          choicesSubtitle: dialogue.choicesSubtitle || null,
          choicesBtnLabel: dialogue.choicesBtnLabel || null,
          compact: !!dialogue.compact
        },
        opts: {
          venue: opts && opts.venue ? opts.venue : null,
          node: opts && opts.node ? opts.node : null,
          encId: opts && opts.encId ? opts.encId : null,
          action: opts && opts.action ? opts.action : null,
          handlerType: opts && opts.handlerType ? opts.handlerType : null,
          location: opts && opts.location ? opts.location : null,
          closeable: opts ? !!opts.closeable : false,
          inlineChoices: opts ? !!opts.inlineChoices : false,
          fullHeight: opts ? !!opts.fullHeight : false,
          showGold: opts ? (opts.showGold !== false) : true,
          showHp: opts ? !!opts.showHp : false,
          compact: opts ? !!opts.compact : false,
          customState: opts && opts.customState ? opts.customState : null
        },
        timestamp: Date.now()
      };

      var json = JSON.stringify(serialized);
      localStorage.setItem(key, json);
      if (window.sessionStorage) {
        sessionStorage.setItem(key, json);
      }
      window.__valdoria_active_encounter = serialized;
    } catch (e) {
      console.warn('[ENC] Erro ao salvar persistência do diálogo:', e);
    }
  }

  function _clearActiveState(charId) {
    if (typeof window === 'undefined') return;
    try {
      var cid = charId || _resolveStorageCharId();
      var key = _getEncounterStorageKey(cid);
      if (window.localStorage) localStorage.removeItem(key);
      if (window.sessionStorage) sessionStorage.removeItem(key);
      window.__valdoria_active_encounter = null;
    } catch (e) {
      console.warn('[ENC] Erro ao limpar persistência do diálogo:', e);
    }
  }

  function getPersistedState(charId) {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      var cid = charId || _resolveStorageCharId();
      var key = _getEncounterStorageKey(cid);
      var raw = localStorage.getItem(key);
      if (!raw && window.sessionStorage) {
        raw = sessionStorage.getItem(key);
      }
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.dialogue || !parsed.timestamp) return null;
      if (Date.now() - parsed.timestamp > _ENCOUNTER_MAX_AGE_MS) {
        _clearActiveState(cid);
        return null;
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function hasPersistedState(charId) {
    return !!getPersistedState(charId);
  }

  function restorePersistedState(extraOpts) {
    extraOpts = extraOpts || {};
    var charId = _resolveStorageCharId(extraOpts);
    var saved = getPersistedState(charId);
    if (!saved || !saved.dialogue) return false;

    var dialogue = saved.dialogue;
    var mergedOpts = Object.assign({}, saved.opts || {}, extraOpts);
    mergedOpts.startPage = typeof saved.currentPage === 'number' ? saved.currentPage : 0;
    mergedOpts._restoring = true;

    var handlerType = mergedOpts.handlerType;
    var customHandler = handlerType ? _choiceHandlers[handlerType] : null;

    mergedOpts.onChoice = function(ch, dlg) {
      if (typeof extraOpts.onChoice === 'function') {
        extraOpts.onChoice(ch, dlg);
        return;
      }
      if (typeof customHandler === 'function') {
        customHandler(ch, dlg, mergedOpts);
        return;
      }
      if (mergedOpts.venue && mergedOpts.node && window.vCityServer && typeof window.vCityServer.cityAction === 'function') {
        window.vCityServer.cityAction('dialogue.choice', { venue: mergedOpts.venue, node: mergedOpts.node, choice_id: ch && ch.id })
          .then(function(res) {
            if (res && res.result_script) {
              render({ npc: (res.npc || dlg.npc), script: res.result_script, choices: (res.choices || []) }, mergedOpts);
            } else {
              close();
            }
          })
          .catch(function() { close(); });
        return;
      }
      if (ch && ch.cb === 'close') {
        close();
        return;
      }
      close();
    };

    if (typeof window !== 'undefined' && window.vEncounter && typeof window.vEncounter.render === 'function') {
      window.vEncounter.render(dialogue, mergedOpts);
    } else {
      render(dialogue, mergedOpts);
    }
    return true;
  }

  function _countWords(str) {
    return (str || '').trim().split(/\s+/).filter(Boolean).length;
  }

  /* Agrupa estrofes em páginas (canonical PADRAO_ALDRIC):
     - Orçamento adaptativo por página (evita scrolling vertical em telas mobile/Telegram)
     - Até 2 estrofes por página (se forem curtas)
     - Limite de ~45-55 palavras ou ~280-340 caracteres por página
     - Particiona parágrafos longos em limites de sentenças limpos */
  function _groupScriptIntoPages(script, opts) {
    opts = opts || {};
    var smallScreen = (typeof window !== 'undefined' && window.innerHeight && window.innerHeight <= 640);
    var MAX_PAGE_WORDS = opts.maxWords || (smallScreen ? 45 : 55);
    var MAX_PAGE_CHARS = opts.maxChars || (smallScreen ? 280 : 340);
    var MAX_STROPHES_PER_PAGE = opts.maxStrophes || 2;
    var MAX_LINES_PER_PAGE = opts.maxLines || 4;

    var pages = [];
    var current = [];
    var currentWords = 0;
    var currentChars = 0;
    var currentLines = 0;

    function flushCurrent() {
      if (current.length > 0) {
        pages.push(current);
        current = [];
        currentWords = 0;
        currentChars = 0;
        currentLines = 0;
      }
    }

    (script || []).forEach(function(stroph) {
      if (!stroph) return;

      // Blocos estruturados especiais (recompensas, ficha, notificações técnicas, contratos de missão)
      if (stroph.type === 'reward' || stroph.type === 'character_sheet' || stroph.type === 'technical' || stroph.type === 'quest_contract' || (stroph.text && _parseQuestDetails(stroph.text))) {
        flushCurrent();
        if (!stroph.type || stroph.type === 'narration') stroph.type = 'quest_contract';
        pages.push([stroph]);
        return;
      }

      // Sub-linha de check_hint (anúncio de teste de perícia) — fica junto da estrofe
      if (stroph._checkHint) {
        if (current.length > 0) {
          current.push(stroph);
        } else if (pages.length > 0) {
          pages[pages.length - 1].push(stroph);
        } else {
          current.push(stroph);
        }
        return;
      }

      var text = String(stroph.text || '').trim();
      if (!text) return;

      var sentences = _splitIntoSentences(text);
      var wordCount = _countWords(text);
      var charCount = text.length;

      // Se a estrofe cabe confortavelmente inteira no orçamento de uma página
      if (sentences.length <= 1 || (wordCount <= MAX_PAGE_WORDS && charCount <= MAX_PAGE_CHARS)) {
        var wouldExceed = (current.length >= MAX_STROPHES_PER_PAGE) ||
                          (currentLines + sentences.length > MAX_LINES_PER_PAGE) ||
                          (currentWords + wordCount > MAX_PAGE_WORDS) ||
                          (currentChars + charCount > MAX_PAGE_CHARS);
        if (current.length > 0 && wouldExceed) {
          flushCurrent();
        }
        current.push(stroph);
        currentWords += wordCount;
        currentChars += charCount;
        currentLines += sentences.length;
      } else {
        // Estrofe longa com múltiplas sentenças: particiona em fatias legíveis
        flushCurrent();

        var chunkSentences = [];
        var chunkWords = 0;
        var chunkChars = 0;

        sentences.forEach(function(sent) {
          var w = _countWords(sent);
          var c = sent.length;

          var wouldExceedChunk = (chunkSentences.length > 0) && (
            (chunkWords + w > MAX_PAGE_WORDS) ||
            (chunkChars + c > MAX_PAGE_CHARS) ||
            (chunkSentences.length >= MAX_LINES_PER_PAGE)
          );

          if (wouldExceedChunk) {
            var chunkStroph = Object.assign({}, stroph, { text: chunkSentences.join(' ') });
            pages.push([chunkStroph]);
            chunkSentences = [];
            chunkWords = 0;
            chunkChars = 0;
          }

          chunkSentences.push(sent);
          chunkWords += w;
          chunkChars += c;
        });

        if (chunkSentences.length > 0) {
          var finalStroph = Object.assign({}, stroph, { text: chunkSentences.join(' ') });
          if (chunkWords >= Math.round(MAX_PAGE_WORDS * 0.65)) {
            pages.push([finalStroph]);
          } else {
            current = [finalStroph];
            currentWords = chunkWords;
            currentChars = chunkChars;
            currentLines = chunkSentences.length;
          }
        }
      }
    });

    flushCurrent();
    return pages;
  }

  /* Modo 'compact' — utiliza limites ligeiramente mais enxutos mantendo a mesma robustez */
  function _groupScriptCompact(script) {
    return _groupScriptIntoPages(script || [], { maxWords: 45, maxChars: 260, maxLines: 3, maxStrophes: 2 });
  }

  /* A1.5: API pública de paginação de script[] de diálogo (fonte única).
     opts.mode: 'aldric' (default — PADRAO_ALDRIC) | 'compact' (modo compacto). */
  function groupScriptIntoPages(script, opts) {
    var mode = (opts && opts.mode) || 'aldric';
    if (mode === 'compact') return _groupScriptCompact(script || []);
    return _groupScriptIntoPages(script || [], opts);
  }

  /* Typewriter RPG clássico — char-by-char com pausa em <i>/</i>.
     Velocidade ~28ms/char (~36 chars/s).
     Sessão #38 perf P0 (Fase 2.5): O(n²) → O(n) via textNode.appendData()
     em vez de element.innerHTML = html. Antes, cada char reparseava todo
     o HTML acumulado (~200 chars × 200 ops = 40k operações em Android 2GB).
     Agora: appendChild de text nodes + stack DOM pra tags inline. */
  function _typewriter(element, text, charMs, onDone) {
    var tokens = [];
    var i = 0;
    while (i < text.length) {
      var c = text[i];
      if (c === '<') {
        var end = text.indexOf('>', i);
        if (end > 0) { tokens.push({type:'tag', content: text.substring(i, end+1)}); i = end+1; continue; }
      }
      if (c === '&') {
        var sc = text.indexOf(';', i);
        if (sc > 0 && sc - i < 10) { tokens.push({type:'entity', content: text.substring(i, sc+1)}); i = sc+1; continue; }
      }
      tokens.push({type:'char', content: c});
      i++;
    }
    var idx = 0;
    var timer = null;
    var done = false;
    element.classList.add('typing');
    element.innerHTML = '';  /* limpa — vamos construir via DOM nodes */
    var ASIDE_PAUSE_MS = 500;
    /* Stack-based DOM construction. Topo = elemento onde appendamos texto.
       Para <i>/<em> abertas, push child no stack; close → pop. */
    var stack = [element];
    var currentText = null;  /* texto onde acumulamos chars via appendData */

    function _decodeEntity(s) {
      var tmp = document.createElement('span');
      tmp.innerHTML = s;
      return tmp.textContent;
    }
    function _processToken(tok, immediate) {
      var top = stack[stack.length - 1];
      if (tok.type === 'tag') {
        var t = tok.content;
        var closeM = /^<\s*\/\s*(\w+)\s*>$/i.exec(t);
        if (closeM) {
          if (stack.length > 1) stack.pop();
          currentText = null;
          return /^(i|em)$/i.test(closeM[1]);  /* needsPause */
        }
        var openM = /^<\s*(\w+)([^>]*?)\s*\/?>$/i.exec(t);
        if (openM) {
          var el = document.createElement(openM[1]);
          var attrStr = openM[2];
          if (attrStr) {
            var attrRE = /(\w+)\s*=\s*"([^"]*)"/g, am;
            while ((am = attrRE.exec(attrStr)) !== null) el.setAttribute(am[1], am[2]);
          }
          top.appendChild(el);
          /* Self-closing (br, hr, etc.) não entra no stack */
          if (!/^(br|hr|img|input)$/i.test(openM[1])) stack.push(el);
          currentText = null;
          return /^(i|em)$/i.test(openM[1]);  /* needsPause */
        }
        /* Desconhecido — texto literal */
        top.appendChild(document.createTextNode(t));
        currentText = null;
        return false;
      }
      var ch = tok.content;
      if (tok.type === 'entity') ch = _decodeEntity(ch);
      if (currentText && currentText.parentNode === top) {
        currentText.appendData(ch);
      } else {
        currentText = document.createTextNode(ch);
        top.appendChild(currentText);
      }
      return false;
    }
    function step() {
      if (idx >= tokens.length) {
        done = true;
        element.classList.remove('typing');
        if (onDone) onDone();
        return;
      }
      var tok = tokens[idx++];
      var needsPause = _processToken(tok, false);
      if (tok.type === 'tag') {
        if (needsPause) {
          timer = setTimeout(step, ASIDE_PAUSE_MS);
          return;
        }
        step();
        return;
      }
      if (tok.type === 'entity') { step(); return; }
      timer = setTimeout(step, charMs);
    }
    step();
    return {
      skip: function() {
        if (done) return;
        if (timer) clearTimeout(timer);
        timer = null;
        while (idx < tokens.length) _processToken(tokens[idx++], true);
        element.classList.remove('typing');
        done = true;
        if (onDone) onDone();
      },
      isDone: function() { return done; }
    };
  }

  function _sanitizeDialogueHTML(html) {
    /* Whitelist REAL (sessão #88 — antes era no-op `return html`): escapa toda
       tag e re-permite apenas inline seguro SEM atributos (i/em/b/strong/br/
       u/s/code) — mesmo contrato dos sanitizers da cidade e da exploração.
       Fecha num ponto único os 3 sinks de line.text (pre-measure innerHTML,
       _instantReveal span.innerHTML e _typewriter createElement/setAttribute):
       um `<img onerror=...>` vindo de payload nunca chega ao DOM como tag.
       NÃO escapa `&` — entidades (&mdash;) são legítimas nos textos.
       BANIMENTO DE EMOJIS: limpa qualquer emote ou pictográfico colorido. */
    var raw = (typeof _stripEmojis === 'function' ? _stripEmojis(html) : String(html == null ? '' : html));
    var escaped = raw.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var permitted = escaped.replace(/&lt;(\/?)(i|em|b|strong|br|u|s|code)&gt;/gi, '<$1$2>');
    /* ANTI-VAZAMENTO PERMANENTE (bug prólogo 2026-06-11 — user: "nunca mais
       vaze código pro jogador"). Defense-in-depth: tags NÃO-whitelist (escapadas
       acima e não re-permitidas — ex.: `<div style>`, `<b style="...">`, `<span>`)
       ficariam VISÍVEIS como texto literal `<div style=...>` quando o innerHTML
       reinterpreta `&lt;`/`&gt;`. Aqui REMOVEMOS qualquer sequência com FORMA DE
       TAG escapada restante, de modo que CSS/HTML cravado num campo de texto
       NUNCA chega ao jogador como lixo de marcação. Só remove o que tem forma de
       tag (`<nome ...>`); `<` literal que não é tag (ex.: "a < b") é preservado.
       Substitui quebras de bloco (h1-h6, p, div, li, ul, ol, br) por espaço antes do
       strip para impedir colagem acidental de palavras (ex.: "Marcos</h4><p>Em" -> "Marcos Em").
       Apresentação rica (recompensa/XP) DEVE usar script item {type:'reward'}. */
    var spaced = permitted
      .replace(/&lt;\/(?:h[1-6]|p|div|li|section|article)&gt;/gi, ' ')
      .replace(/&lt;(?:h[1-6]|p|div|li|ul|ol|section|article)[^&]*?&gt;/gi, ' ');
    var stripped = spaced.replace(/&lt;\/?[a-zA-Z][^&]*?&gt;/g, '').replace(/\s{2,}/g, ' ');
    if (stripped !== permitted) {
      try {
        console.error('[ENC] HTML bloqueado em texto de diálogo (use {type:"reward"} '
          + 'ou tags inline i/b/em/br) — trecho: ' + raw.slice(0, 120));
      } catch (_e) { /* console pode faltar */ }
    }
    return stripped;
  }

  /* Bloco de RECOMPENSA estruturado (PADRAO_ALDRIC) — apresentação ÉPICA de
     XP/Valdoritas/itens/efeito SEM cravar HTML em campo de texto. Construído
     AQUI pelo renderer confiável via DOM (createElement + textContent) — XSS
     impossível por construção (zero innerHTML, valores dinâmicos viram texto).
     Consumido por um script item `{type:'reward', xp?, gold?, items?, effect?}`
     em renderPage. Substitui o antigo _epicRewardBlock do prólogo que cravava
     `<div style>`/`<b style>` em narração e vazava como texto (bug 2026-06-11).
     Estilo via classes .enc-reward* (encounter-popup.css) — zero inline style.
     Retorna HTMLElement (ou null se sem recompensa). */
  /* Resolve o slug canônico de um item (espelha o slugify do items-resolver) p/
     achar a imagem WebP da recompensa. */
  function _rewardItemSlug(name) {
    try {
      return String(name).normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    } catch (_e) { return ''; }
  }

  /* Monta o nó de ícone de uma recompensa (DOM-safe, sem innerHTML em texto do
     usuário): gold→moeda Valdorita, xp→✦, item→imagem WebP (vItems), effect→◆. */
  function _rewardIconEl(kind, name) {
    var ic = document.createElement('span');
    ic.className = 'enc-reward-icon enc-reward-icon-' + kind;
    if (kind === 'gold') {
      var coin = document.createElement('span');
      coin.className = 'vi vi-coin';   /* coin-icon.css: moeda dourada V */
      ic.appendChild(coin);
    } else if (kind === 'xp') {
      ic.textContent = '✦';
    } else if (kind === 'item') {
      var slug = _rewardItemSlug(name);
      var img = null;
      if (slug && window.vItems && typeof window.vItems.has === 'function' && window.vItems.has(slug)) {
        img = document.createElement('img');
        img.className = 'enc-reward-item-img';
        img.alt = '';
        img.loading = 'lazy';
        img.src = ((window.vItemsConfig && window.vItemsConfig.pngBase) || '/shared/img/items/') + slug + '.webp';
        img.setAttribute('onerror', "this.style.display='none';this.parentNode.innerHTML='<span class=\"vitem-placeholder-symbol\" style=\"font-size:1.2em;color:#dfbf78;font-weight:700;\">?</span>';");
        ic.appendChild(img);
      } else {
        ic.innerHTML = '<span class="vitem-placeholder-symbol" style="font-size:1.2em;color:#dfbf78;font-weight:700;">?</span>';
      }
    } else {
      ic.textContent = '◆';
    }
    return ic;
  }

  function _buildRewardBlockEl(line) {
    /* [kind, valor, label] — kind controla o ícone (G, 2026-06-18: user pediu
       exibição épica de XP/item/Valdoritas com ícone/imagem em vez de texto puro). */
    var rows = [];
    if (line.gold && line.gold > 0) rows.push(['gold', '+' + (line.gold | 0) + ' Valdoritas', 'Tesouro']);
    if (line.xp && line.xp > 0) rows.push(['xp', '+' + (line.xp | 0) + ' XP', 'Experiência']);
    (line.items || []).forEach(function (it) { if (it) rows.push(['item', String(it), 'Item']); });
    if (line.effect) rows.push(['effect', String(line.effect), '']);
    if (!rows.length) return null;
    var box = document.createElement('div');
    box.className = 'enc-reward';
    var title = document.createElement('div');
    title.className = 'enc-reward-title';
    title.textContent = '◆ Recompensa ◆';
    box.appendChild(title);
    rows.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'enc-reward-row';
      row.appendChild(_rewardIconEl(r[0], r[1]));
      var col = document.createElement('div');
      col.className = 'enc-reward-col';
      var val = document.createElement('div');
      val.className = 'enc-reward-val enc-reward-val-' + r[0];
      val.textContent = r[1];           /* textContent = escape nativo, sem XSS */
      col.appendChild(val);
      if (r[2]) {
        var lbl = document.createElement('div');
        lbl.className = 'enc-reward-lbl';
        lbl.textContent = r[2];
        col.appendChild(lbl);
      }
      row.appendChild(col);
      box.appendChild(row);
    });
    return box;
  }

  /* Bloco de NOTIFICAÇÃO TÉCNICA / ALTERAÇÃO DE STATUS estruturado.
     Exibe deltas técnicos (HP/MP, Valdoritas, buffs, saciedade, avisos de sem efeito)
     com apresentação clara e segura (DOM-safe, textContent). */
  function _buildTechnicalBlockEl(line) {
    var items = (line.items && Array.isArray(line.items)) ? line.items : [];
    if (!items.length && line.text) {
      items = String(line.text).replace(/<[^>]*>/g, '\n').split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
    }
    if (!items.length) return null;
    var box = document.createElement('div');
    box.className = 'enc-technical';
    var title = document.createElement('div');
    title.className = 'enc-technical-title';
    title.textContent = line.title || '◆ Alteração de Status ◆';
    box.appendChild(title);
    var list = document.createElement('div');
    list.className = 'enc-technical-list';
    items.forEach(function (it) {
      var itemEl = document.createElement('div');
      itemEl.className = 'enc-technical-item';
      var text = (typeof it === 'string') ? it : (it.text || '');
      if (!text || text.indexOf('◆ Alteração') !== -1) return;
      if (text.indexOf('+') !== -1 || text.indexOf('restaurad') !== -1) {
        itemEl.classList.add('enc-tech-gain');
      } else if (text.indexOf('-') !== -1 || text.indexOf('perdeu') !== -1) {
        itemEl.classList.add('enc-tech-loss');
      } else if (text.indexOf('⚠️') !== -1 || text.indexOf('Sem efeito') !== -1 || text.indexOf('Saciado') !== -1) {
        itemEl.classList.add('enc-tech-warn');
      } else {
        itemEl.classList.add('enc-tech-neutral');
      }
      itemEl.textContent = text;
      list.appendChild(itemEl);
    });
    box.appendChild(list);
    return box;
  }

  /* ============================================================================
   * BLOCO ÉPICO DE CONTRATO DE AVENTURA / MISSÃO PROCLAMADA (PADRAO_ALDRIC)
   * Apresentação solene dark medieval (D&D 5e / Grim Hollow / BG3):
   * Moldura de pergaminho obsidiana, selo heráldico, título dourado,
   * objetivo claro e chips destacados de experiência, valdoritas e itens.
   * ============================================================================ */
  function _parseQuestDetails(text) {
    if (!text || typeof text !== 'string') return null;
    var clean = text.replace(/<[^>]*>/g, ' ');
    if (clean.indexOf('Nova Miss') === -1 && clean.indexOf('Contrato de Aventura') === -1) {
      return null;
    }
    var lines = text.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
    var title = '';
    var objective = '';
    var rewardsText = '';
    var introText = '';
    var foundQuest = false;

    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      var plain = l.replace(/<[^>]*>/g, '').trim();
      if (/Nova Miss[ãa]o:?/i.test(plain)) {
        foundQuest = true;
        title = plain.replace(/^.*?Nova Miss[ãa]o:?\s*/i, '').trim();
      } else if (/Contrato de Aventura:?/i.test(plain)) {
        foundQuest = true;
        title = plain.replace(/^.*?Contrato de Aventura:?\s*/i, '').trim();
      } else if (/Recompensa:?/i.test(plain)) {
        rewardsText = plain.replace(/^.*?Recompensa:?\s*/i, '').trim();
      } else if (/Objetivo:?/i.test(plain)) {
        objective = plain.replace(/^.*?Objetivo:?\s*/i, '').trim();
      } else if (foundQuest && !rewardsText && !objective) {
        objective = plain;
      } else if (!foundQuest) {
        introText = (introText ? introText + ' ' : '') + plain;
      }
    }

    if (!title && !objective) return null;

    var rewards = [];
    if (rewardsText) {
      var parts = rewardsText.split(/[·•|]/).map(function(s){ return s.trim(); }).filter(Boolean);
      parts.forEach(function(p) {
        var kind = 'item';
        if (/xp/i.test(p)) kind = 'xp';
        else if (/valdorita/i.test(p) || /ouro/i.test(p)) kind = 'gold';
        rewards.push({ kind: kind, text: _stripEmojis(p) });
      });
    }

    return {
      title: _stripEmojis(title || 'Nova Missão'),
      objective: _stripEmojis(objective || title),
      rewards: rewards,
      introText: _stripEmojis(introText)
    };
  }

  function _buildQuestCardEl(qData) {
    if (!qData) return null;
    var card = document.createElement('div');
    card.className = 'enc-quest-card';

    var badge = document.createElement('div');
    badge.className = 'enc-quest-badge';
    badge.textContent = '❖ CONTRATO DE AVENTURA ❖';
    card.appendChild(badge);

    var title = document.createElement('div');
    title.className = 'enc-quest-title';
    title.textContent = _stripEmojis(qData.title || 'Demanda de Valdoria');
    card.appendChild(title);

    var divLine = document.createElement('div');
    divLine.className = 'enc-quest-divider';
    card.appendChild(divLine);

    if (qData.objective) {
      var objSec = document.createElement('div');
      objSec.className = 'enc-quest-section';
      var objLbl = document.createElement('div');
      objLbl.className = 'enc-quest-label';
      objLbl.textContent = 'OBJETIVO';
      var objTxt = document.createElement('div');
      objTxt.className = 'enc-quest-obj';
      objTxt.textContent = _stripEmojis(qData.objective);
      objSec.appendChild(objLbl);
      objSec.appendChild(objTxt);
      card.appendChild(objSec);
    }

    if (qData.rewards && qData.rewards.length) {
      var rewSec = document.createElement('div');
      rewSec.className = 'enc-quest-section';
      var rewLbl = document.createElement('div');
      rewLbl.className = 'enc-quest-label';
      rewLbl.textContent = 'GLÓRIA & ESPÓLIOS';
      var rewList = document.createElement('div');
      rewList.className = 'enc-quest-rewards';
      qData.rewards.forEach(function(r) {
        var pill = document.createElement('span');
        pill.className = 'enc-quest-pill enc-quest-pill-' + (r.kind || 'default');
        pill.textContent = _stripEmojis(r.text);
        rewList.appendChild(pill);
      });
      rewSec.appendChild(rewLbl);
      rewSec.appendChild(rewList);
      card.appendChild(rewSec);
    }

    var motto = document.createElement('div');
    motto.className = 'enc-quest-motto';
    motto.textContent = 'A desolação de Valdoria desafia a bravura dos mortais.';
    card.appendChild(motto);

    return card;
  }

  /* Verifica se a tela/diálogo atual é uma decisão de aceitar ou recusar missão. */
  function _isQuestDecisionScreen(dialogue, choices) {
    if (!choices || !choices.length) return false;
    var hasAccept = false;
    var hasDecline = false;
    choices.forEach(function(c) {
      var cid = String(c.id || c.next || c.cb || c.action || '').toLowerCase();
      var cl = String(c.label || c.text || '').toLowerCase();
      var cres = String(c.result || '').toLowerCase();
      if (
        cid === 'accept' || cid.indexOf('accept') >= 0 || cid === 'unlock' ||
        cl.indexOf('aceitar') >= 0 || cl.indexOf('aceito') >= 0 ||
        cres === 'accept_quest' || cres === 'discovery_unlock' || !!c._questId || !!c.quest_id
      ) {
        hasAccept = true;
      }
      if (
        cid === 'decline' || cid.indexOf('decline') >= 0 || cid === 'defer' ||
        cl.indexOf('recusar') >= 0 || cl.indexOf('desistir') >= 0 ||
        cl.indexOf('cancelar') >= 0 || cl.indexOf('outra hora') >= 0 ||
        cl.indexOf('mudar de ideia') >= 0 || cl.indexOf('não posso') >= 0 ||
        cl.indexOf('talvez depois') >= 0 || cl.indexOf('adiar') >= 0 ||
        cl.indexOf('resistir') >= 0 || cl.indexOf('devolver') >= 0 ||
        cl.indexOf('soltar') >= 0 || cres === 'discovery_defer'
      ) {
        hasDecline = true;
      }
    });
    if (hasAccept && (hasDecline || choices.length <= 2)) return true;
    if (dialogue && (dialogue.isQuest || dialogue.quest_id || dialogue.is_quest)) return true;
    if (dialogue && dialogue.script) {
      var scriptStr = JSON.stringify(dialogue.script).toLowerCase();
      if (scriptStr.indexOf('nova miss') >= 0 || scriptStr.indexOf('contrato de aventura') >= 0 || scriptStr.indexOf('quest_contract') >= 0) {
        return true;
      }
    }
    return false;
  }

  /* ──────────────────────────────────────────────────────────────────────
     Bloco IMPACTO NO PERSONAGEM estruturado (perda de vida e condições na viagem).
     Espelha visualmente o card da cidade (.cgp-card v8-style) e anima a queda de PV.
     Mostrado SOMENTE quando algo acontece com a vida ou stats do personagem.
     DOM-safe (createElement/textContent), sem XSS, tokens canônicos do sistema. */
  function _normalizeClassKey(cls) {
    var k = (cls || '').toLowerCase()
      .replace(/[áàâã]/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
      .replace(/[óô]/g, 'o').replace(/ú/g, 'u')
      .replace(/[\s].*/, '');
    var ALIASES = {
      sacerdote: 'clerigo',
      sacerdotisa: 'clerigo',
      cleric: 'clerigo',
      clerica: 'clerigo',
      cleriga: 'clerigo',
      feiticeira: 'feiticeiro',
      paladina: 'paladino',
      druidesa: 'druida',
      monja: 'monge',
      bruxa: 'bruxo',
      barbara: 'barbaro',
      ladra: 'ladino',
      ladrao: 'ladino',
      barbaro: 'barbaro',
      'meio-elfo': 'aliado'
    };
    return ALIASES[k] || k || 'guerreiro';
  }

  function _buildPlayerImpactCardEl(line) {
    if (!line) return null;
    var p = line.player || {};
    var prevHp = (line.prevHp != null) ? line.prevHp : (p.hp || 0);
    var newHp = (line.newHp != null) ? line.newHp : (p.hp || 0);
    var hpMax = line.hpMax || p.hpMax || p.mhp || p.max_hp || 28;
    if (hpMax <= 0) hpMax = 1;
    var dmg = (line.dmg != null) ? line.dmg : Math.max(0, prevHp - newHp);
    var cond = line.condition || null;

    var prevPct = Math.max(0, Math.min(100, Math.round((prevHp / hpMax) * 100)));
    var newPct = Math.max(0, Math.min(100, Math.round((newHp / hpMax) * 100)));

    var hpRatio = newHp / hpMax;
    var hpThr = hpRatio > 0.5 ? 'high' : (hpRatio > 0.25 ? 'mid' : 'low');

    var card = document.createElement('div');
    var rawCls = (p.cls || p.hero_class || p.cls_key || 'guerreiro').toString().toLowerCase();
    var clsKey = _normalizeClassKey(rawCls);
    card.className = 'enc-pic-card' + (dmg > 0 ? ' enc-pic-card--damaged' : '') + ' cls-' + clsKey;

    // Topo: Avatar + Nome + Subtítulo + Nível
    var top = document.createElement('div');
    top.className = 'enc-pic-top';

    var av = document.createElement('div');
    av.className = 'enc-pic-avatar';
    var heraldicId = 'ic-' + clsKey;
    av.innerHTML = '<svg viewBox="0 0 120 120" style="width:24px;height:24px;fill:currentColor;" aria-hidden="true"><use href="#' + heraldicId + '"/></svg>';
    top.appendChild(av);

    var info = document.createElement('div');
    info.className = 'enc-pic-info';

    var nameEl = document.createElement('div');
    nameEl.className = 'enc-pic-name';
    nameEl.textContent = p.name || 'Aventureiro';
    info.appendChild(nameEl);

    var subEl = document.createElement('div');
    subEl.className = 'enc-pic-sub';
    var clsDisplay = p.cls || p.hero_class || 'Aventureiro';
    var raceDisplay = p.race || 'Mortal';
    subEl.textContent = clsDisplay + ' · ' + raceDisplay;
    info.appendChild(subEl);

    top.appendChild(info);

    var lvlEl = document.createElement('div');
    lvlEl.className = 'enc-pic-lvl';
    lvlEl.textContent = 'Nv ' + (p.level || p.lvl || 1);
    top.appendChild(lvlEl);

    card.appendChild(top);

    // Conteúdo: Barra de Vida com transição animada e badges
    var content = document.createElement('div');
    content.className = 'enc-pic-content';

    var hpRow = document.createElement('div');
    hpRow.className = 'enc-pic-hp-row';

    var hpHead = document.createElement('div');
    hpHead.className = 'enc-pic-hp-head';

    var hpLbl = document.createElement('div');
    hpLbl.className = 'enc-pic-hp-lbl';
    hpLbl.textContent = 'Pontos de Vida';
    hpHead.appendChild(hpLbl);

    if (dmg > 0) {
      var dmgBadge = document.createElement('span');
      dmgBadge.className = 'enc-pic-dmg-badge';
      dmgBadge.textContent = '−' + dmg + ' PV';
      hpHead.appendChild(dmgBadge);
    }

    var hpVal = document.createElement('div');
    hpVal.className = 'enc-pic-hp-val' + (hpThr === 'low' ? ' enc-pic-hp-val--low' : '');
    hpVal.textContent = newHp + ' / ' + hpMax;
    hpHead.appendChild(hpVal);

    hpRow.appendChild(hpHead);

    // Track de PV com ghost fill da perda e transição suave do fill
    var track = document.createElement('div');
    track.className = 'enc-pic-track';

    if (prevPct > newPct) {
      var ghostFill = document.createElement('div');
      ghostFill.className = 'enc-pic-ghost-fill';
      ghostFill.style.width = prevPct + '%';
      track.appendChild(ghostFill);
    }

    var fill = document.createElement('div');
    fill.className = 'enc-pic-fill enc-pic-fill--' + hpThr;
    fill.style.width = prevPct + '%';
    track.appendChild(fill);

    // Dispara animação da vida abaixando após montagem no DOM
    setTimeout(function () {
      try { fill.style.width = newPct + '%'; } catch (_) {}
    }, 60);

    hpRow.appendChild(track);
    content.appendChild(hpRow);

    // Meta row (CA e Recurso se houver)
    var metaRow = document.createElement('div');
    metaRow.className = 'enc-pic-meta-row';

    var acBadge = document.createElement('span');
    acBadge.className = 'enc-pic-meta-badge';
    acBadge.textContent = '🛡️ ' + (p.ac || 10) + ' CA';
    metaRow.appendChild(acBadge);

    var resName = (p.resName || p.resourceName || (window.DndRules && DndRules.classResourceName && DndRules.classResourceName(clsKey)) || 'MP');
    var curRes = (p.mp != null) ? p.mp : (p.resource != null ? p.resource : null);
    var maxRes = (p.mpMax != null) ? p.mpMax : (p.resourceMax != null ? p.resourceMax : (p.mmp != null ? p.mmp : null));
    if (maxRes && maxRes > 0) {
      var resBadge = document.createElement('span');
      resBadge.className = 'enc-pic-meta-badge enc-pic-meta-badge--mp';
      resBadge.textContent = '✨ ' + (curRes != null ? curRes : maxRes) + '/' + maxRes + ' ' + resName;
      metaRow.appendChild(resBadge);
    }

    content.appendChild(metaRow);

    // Caixa de Condição / Prejuízo se houver
    if (cond) {
      var condBox = document.createElement('div');
      condBox.className = 'enc-pic-cond-box';

      var condIcon = document.createElement('span');
      condIcon.className = 'enc-pic-cond-icon';
      condIcon.textContent = cond.icon || '⚠️';
      condBox.appendChild(condIcon);

      var condText = document.createElement('div');
      condText.className = 'enc-pic-cond-text';

      var condTitle = document.createElement('div');
      condTitle.className = 'enc-pic-cond-title';
      condTitle.textContent = cond.label || (typeof cond === 'string' ? cond : 'Condição Aplicada');
      condText.appendChild(condTitle);

      if (cond.desc) {
        var condDesc = document.createElement('div');
        condDesc.className = 'enc-pic-cond-desc';
        condDesc.textContent = cond.desc;
        condText.appendChild(condDesc);
      }

      condBox.appendChild(condText);
      content.appendChild(condBox);
    }

    card.appendChild(content);
    return card;
  }


  /* ──────────────────────────────────────────────────────────────────────
     Bloco FICHA DE PERSONAGEM estruturado (FASE 5 — "Ver ficha" do recruta da
     guilda, 2026-06-24). Espelha _buildRewardBlockEl: nó DOM construído via
     createElement + textContent (DOM-safe, ZERO innerHTML com dados → sem XSS).
     Layout épico (retrato grande dourado + grid de atributos) que ocupa o
     card full-height (.enc-full ligado no render quando há character_sheet).

     Contrato (server↔client):
       { type:'character_sheet',
         npc: { name, portrait(URL) },
         character: {
           class, race, level, hp, mp?, ac?,
           stats: { for:{v,m}, des:{v,m}, con:{v,m}, int:{v,m}, sab:{v,m}, car:{v,m} },
           personality:'', spells:[] } }
     EMOJI-FREE; tokens do design system (estilo via classes .enc-cs-*). */
  var _CS_STAT_ORDER = [
    ['for', 'FOR'], ['des', 'DES'], ['con', 'CON'],
    ['int', 'INT'], ['sab', 'SAB'], ['car', 'CAR']
  ];
  function _csFmtMod(m) {
    var n = (m == null) ? 0 : (m | 0);
    return (n >= 0 ? '+' : '') + n;
  }
  function _buildCharacterSheetEl(line) {
    var npc = line.npc || {};
    var ch = line.character || {};
    var box = document.createElement('div');
    box.className = 'enc-cs';

    /* 1. Retrato grande dourado (clicável → lightbox). */
    var portraitURL = npc.portrait || '';
    var pWrap = document.createElement('div');
    pWrap.className = 'enc-cs-portrait-wrap';
    if (portraitURL) {
      var img = document.createElement('img');
      img.className = 'enc-cs-portrait v-zoomable';
      img.alt = '';
      img.loading = 'lazy';
      img.src = portraitURL;
      img.setAttribute('data-zoom-name', npc.name || '');
      img.setAttribute('data-zoom-desc', '');
      img.setAttribute('onerror', "this.style.display='none';");
      var _csName = npc.name || '';
      var _csTap = function (e) {
        if (e) {
          if (e.stopPropagation) e.stopPropagation();
          if (e.preventDefault) e.preventDefault();
        }
        if (typeof window.showLightbox === 'function') {
          window.showLightbox(portraitURL, _csName, '');
        }
      };
      img.addEventListener('click', _csTap);
      img.addEventListener('pointerup', _csTap);
      img.style.cursor = 'pointer';
      pWrap.appendChild(img);
    }
    box.appendChild(pWrap);

    /* 2. Nome destacado. */
    var nameEl = document.createElement('div');
    nameEl.className = 'enc-cs-name';
    nameEl.textContent = npc.name || 'Aventureiro';
    box.appendChild(nameEl);

    /* 3. Preço atual em destaque a mais (Ordem do Usuário 2026-10). */
    var cost = (ch.cost != null) ? ch.cost : (npc.cost != null ? npc.cost : null);
    if (cost != null && cost > 0) {
      var priceBadge = document.createElement('div');
      priceBadge.className = 'enc-cs-price-badge';
      priceBadge.innerHTML = '<span class="vi vi-coin sm"></span> Soldo Atual: <b>' + cost + ' Valdoritas</b>';
      box.appendChild(priceBadge);
    }

    /* 4. Subtítulo descritivo. */
    var clsLabel = String(ch['class'] || '');
    var subclsLabel = String(ch.subclass || '');
    var raceLabel = String(ch.race || '');
    var subraceLabel = String(ch.subrace || '');
    var lvl = (ch.level != null) ? (ch.level | 0) : 1;

    var subParts = [];
    if (clsLabel) subParts.push(clsLabel + (subclsLabel ? ' (' + subclsLabel + ')' : ''));
    if (raceLabel) subParts.push(raceLabel + (subraceLabel ? ' (' + subraceLabel + ')' : ''));
    subParts.push('Nível ' + lvl);

    var subEl = document.createElement('div');
    subEl.className = 'enc-cs-sub';
    subEl.textContent = subParts.join(' · ');
    box.appendChild(subEl);

    /* 5. Linha de Meta-badges (Classe, Sub-classe, Raça, Sub-raça - padrão da ficha do personagem). */
    var tagsRow = document.createElement('div');
    tagsRow.className = 'enc-cs-tags-row';

    if (clsLabel) {
      var bCls = document.createElement('div');
      bCls.className = 'enc-cs-meta-badge';
      bCls.innerHTML = '<span>🛡️</span> <b>' + clsLabel + '</b>';
      tagsRow.appendChild(bCls);
    }
    if (subclsLabel) {
      var bSubcls = document.createElement('div');
      bSubcls.className = 'enc-cs-meta-badge';
      bSubcls.innerHTML = '<span>🔮</span> <span>' + subclsLabel + '</span>';
      tagsRow.appendChild(bSubcls);
    }
    if (raceLabel) {
      var bRace = document.createElement('div');
      bRace.className = 'enc-cs-meta-badge';
      bRace.innerHTML = '<span>🌿</span> <b>' + raceLabel + '</b>';
      tagsRow.appendChild(bRace);
    }
    if (subraceLabel) {
      var bSubrace = document.createElement('div');
      bSubrace.className = 'enc-cs-meta-badge';
      bSubrace.innerHTML = '<span>⚙️</span> <span>' + subraceLabel + '</span>';
      tagsRow.appendChild(bSubrace);
    }
    box.appendChild(tagsRow);

    /* 6. Linha de vitais e combate (PV / CA / Deslocamento / Bônus Ataque / Dado de Vida). */
    var vitals = [];
    if (ch.hp != null) vitals.push(['PV', String(ch.hp | 0)]);
    if (ch.ac != null) vitals.push(['CA', String(ch.ac | 0)]);
    if (ch.speed) vitals.push(['Desl.', String(ch.speed).split(' ')[0]]);
    if (ch.attack_bonus) vitals.push(['Ataque', String(ch.attack_bonus)]);
    if (ch.spell_dc) vitals.push(['DC Mag.', String(ch.spell_dc)]);
    if (ch.hit_die) vitals.push(['Dado Vida', String(ch.hit_die)]);
    else if (ch.mp != null && (ch.mp | 0) > 0) vitals.push(['PM', String(ch.mp | 0)]);

    if (vitals.length) {
      var vRow = document.createElement('div');
      vRow.className = 'enc-cs-vitals';
      vitals.forEach(function (v) {
        var pill = document.createElement('div');
        pill.className = 'enc-cs-vital';
        var vl = document.createElement('span');
        vl.className = 'enc-cs-vital-lbl';
        vl.textContent = v[0];
        var vv = document.createElement('span');
        vv.className = 'enc-cs-vital-val';
        vv.textContent = v[1];
        pill.appendChild(vl);
        pill.appendChild(vv);
        vRow.appendChild(pill);
      });
      box.appendChild(vRow);
    }

    /* 7. Grid de 6 atributos D&D 5e (valor + modificador). */
    var stats = ch.stats || {};
    var grid = document.createElement('div');
    grid.className = 'enc-cs-grid';
    _CS_STAT_ORDER.forEach(function (s) {
      var st = stats[s[0]] || {};
      var v = (st.v != null) ? (st.v | 0) : 0;
      var m = (st.m != null) ? (st.m | 0) : 0;
      var cell = document.createElement('div');
      cell.className = 'enc-cs-stat';
      var lbl = document.createElement('div');
      lbl.className = 'enc-cs-stat-lbl';
      lbl.textContent = s[1];
      var val = document.createElement('div');
      val.className = 'enc-cs-stat-val';
      val.textContent = String(v);
      var mod = document.createElement('div');
      mod.className = 'enc-cs-stat-mod';
      mod.textContent = _csFmtMod(m);
      cell.appendChild(lbl);
      cell.appendChild(val);
      cell.appendChild(mod);
      grid.appendChild(cell);
    });
    box.appendChild(grid);

    /* 8. Habilidades e o que fazem (Ordem do Usuário 2026-10). */
    var abilities = Array.isArray(ch.abilities) ? ch.abilities : [];
    if (abilities.length > 0) {
      var abSec = document.createElement('div');
      abSec.className = 'enc-cs-section';
      var abTitle = document.createElement('div');
      abTitle.className = 'enc-cs-section-title';
      abTitle.textContent = '◆ Habilidades & O que Fazem (D&D 5e)';
      abSec.appendChild(abTitle);

      var abList = document.createElement('div');
      abList.className = 'enc-cs-abilities-list';
      abilities.forEach(function (ab) {
        var card = document.createElement('div');
        card.className = 'enc-cs-ability-card';

        var head = document.createElement('div');
        head.className = 'enc-cs-ability-header';
        var nameSpan = document.createElement('span');
        nameSpan.className = 'enc-cs-ability-name';
        nameSpan.textContent = ab.name || 'Habilidade';
        var typeSpan = document.createElement('span');
        typeSpan.className = 'enc-cs-ability-type';
        typeSpan.textContent = ab.type || 'Especial';
        head.appendChild(nameSpan);
        head.appendChild(typeSpan);

        var descDiv = document.createElement('div');
        descDiv.className = 'enc-cs-ability-desc';
        descDiv.textContent = ab.desc || '';

        card.appendChild(head);
        card.appendChild(descDiv);
        abList.appendChild(card);
      });
      abSec.appendChild(abList);
      box.appendChild(abSec);
    } else {
      /* Fallback clássico caso abilities não venha populado */
      var spells = (ch.spells || []).filter(Boolean).map(String);
      if (spells.length) {
        box.appendChild(_csSection('Habilidades & Magias', spells, 'enc-cs-skills'));
      }
    }

    /* 9. Seção Temperamento. */
    if (ch.personality) {
      box.appendChild(_csSection('Temperamento', [String(ch.personality)], 'enc-cs-pers'));
    }

    return box;
  }
  /* Seção rotulada da ficha (título dourado + chips/linha de itens, DOM-safe). */
  function _csSection(title, items, chipCls) {
    var sec = document.createElement('div');
    sec.className = 'enc-cs-section';
    var t = document.createElement('div');
    t.className = 'enc-cs-section-title';
    t.textContent = title;
    sec.appendChild(t);
    var list = document.createElement('div');
    list.className = 'enc-cs-chips';
    items.forEach(function (it) {
      var chip = document.createElement('span');
      chip.className = 'enc-cs-chip ' + (chipCls || '');
      chip.textContent = it;
      list.appendChild(chip);
    });
    sec.appendChild(list);
    return sec;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Item detail mini-dialog (item I, 2026-06-18) — nas escolhas de COMPRA o
  // thumbnail do item é clicável e abre ESTE detalhe (imagem grande + stats +
  // descrição). É um <dialog> PRÓPRIO em showModal() → empilha ACIMA do
  // enc-choices-overlay (top-layer nativo) e ao fechar volta pra lista de
  // compra que continua aberta embaixo. Item misterioso/não-identificado NÃO
  // chega aqui (sem spoiler). Alimentado por
  // ch.itemInfo = { rarityColor, rarityLabel, lines:[html], desc, tags:[label] }.
  // ──────────────────────────────────────────────────────────────────────
  function _itemImgSrc(slug) {
    return ((window.vItemsConfig && window.vItemsConfig.pngBase) || '/shared/img/items/') + slug + '.webp';
  }
  function _ensureItemDetailOverlay() {
    var ov = document.getElementById('enc-item-detail-overlay');
    if (ov && ov.tagName.toLowerCase() === 'dialog') return ov;
    if (ov) ov.parentNode.removeChild(ov);
    ov = document.createElement('dialog');
    ov.id = 'enc-item-detail-overlay';
    ov.innerHTML = '<div class="enc-id-card" role="document"></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function(e) { if (e.target === ov) _closeItemDetail(); });
    ov.addEventListener('cancel', function(e) { e.preventDefault(); _closeItemDetail(); });
    return ov;
  }
  function _closeItemDetail() {
    var ov = document.getElementById('enc-item-detail-overlay');
    if (!ov) return;
    try { if (ov.close && ov.open) ov.close(); } catch (_e) {}
    ov.classList.remove('active');
  }
  function _openItemDetailDialog(ch) {
    if (!ch || !ch.itemName || ch.mysterious) return;
    var ov = _ensureItemDetailOverlay();
    var card = ov.querySelector('.enc-id-card');
    if (!card) return;
    var info = ch.itemInfo || {};
    var slug = _rewardItemSlug(ch.itemName);
    var hasImg = !!(slug && window.vItems && typeof window.vItems.has === 'function' && window.vItems.has(slug));
    var rarityCol = info.rarityColor || '#d4c8b0';
    var nameEsc = String(ch.itemName).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    card.innerHTML =
      '<button class="enc-id-close" type="button" aria-label="Fechar">✕</button>' +
      (hasImg
        ? '<div class="enc-id-img-wrap"><img class="enc-id-img" alt="" src="' + _itemImgSrc(slug) + '"></div>'
        : '<div class="enc-id-img-wrap"><div class="vitem-placeholder"><span class="vitem-placeholder-symbol" style="font-size:38px;">?</span></div></div>') +
      '<div class="enc-id-name" style="color:' + rarityCol + '">' + nameEsc + '</div>' +
      (info.rarityLabel ? '<div class="enc-id-rarity" style="color:' + rarityCol + '">' + info.rarityLabel + '</div>' : '') +
      ((info.lines && info.lines.length) ? '<div class="enc-id-divider"></div><div class="enc-id-stats">' + info.lines.join('<br>') + '</div>' : '') +
      (info.desc ? '<div class="enc-id-divider"></div><div class="enc-id-desc">' + info.desc + '</div>' : '') +
      ((info.tags && info.tags.length) ? '<div class="enc-id-tags">' + info.tags.map(function (t) { return '<span class="enc-id-tag">' + t + '</span>'; }).join('') + '</div>' : '');
    var cb = card.querySelector('.enc-id-close');
    if (cb) cb.addEventListener('click', _closeItemDetail);
    if (typeof ov.showModal === 'function') {
      try { if (!ov.open) ov.showModal(); } catch (_e) { ov.classList.add('active'); }
    } else { ov.classList.add('active'); }
  }
  /* item I: thumbnail clicável do item numa choice de COMPRA (qualquer choice
     com ch.itemName). Retorna o <span> do thumb, ou null se não é item. */
  function _buildChoiceItemThumb(ch) {
    if (!ch || !ch.itemName) return null;
    var thumb = document.createElement('span');
    thumb.className = 'enc-cho-item-thumb';
    if (ch.mysterious) {
      thumb.classList.add('enc-cho-item-mys');
      thumb.textContent = '?';
      thumb.setAttribute('aria-label', 'Item misterioso');
      thumb.setAttribute('title', 'Item misterioso');
      thumb.addEventListener('click', function (e) {
        e.stopPropagation(); e.preventDefault();
        if (typeof window.vToast === 'function') window.vToast('Item misterioso — descubra ao adquirir.', 'info');
      });
      return thumb;
    }
    var slug = _rewardItemSlug(ch.itemName);
    if (slug && window.vItems && typeof window.vItems.has === 'function' && window.vItems.has(slug)) {
      var img = document.createElement('img');
      img.className = 'enc-cho-item-img';
      img.alt = '';
      img.loading = 'lazy';
      img.src = _itemImgSrc(slug);
      img.setAttribute('onerror', "this.style.display='none';this.parentNode.classList.add('enc-cho-item-mys');this.parentNode.textContent='?';");
      thumb.appendChild(img);
    } else {
      thumb.classList.add('enc-cho-item-mys');
      thumb.textContent = '?';
    }
    thumb.classList.add('enc-cho-item-thumb--clickable');
    thumb.setAttribute('role', 'button');
    thumb.setAttribute('title', 'Ver detalhes');
    thumb.addEventListener('click', function (e) {
      e.stopPropagation(); e.preventDefault();
      _openItemDetailDialog(ch);
    });
    return thumb;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Choice sub-overlay AAA (task #49) — module-level public API.
  // Reabrível, fechável via ✕ / ESC / backdrop / botão Voltar.
  // z-index 9700 (acima do encounter 9500 e city popup 9000).
  // ──────────────────────────────────────────────────────────────────────

  /* Tradução EN→PT-BR de keys de skill/atributo no badge de CD das choices.
     A1.4 (auditoria #90): delega ao canônico DndRules.skillLabelPT (fonte
     única; animal_handling='Lidar com Animais' — decisão A1.4). Fallback local
     pra entry points sem dnd-rules-shared.js. Preserva strings já em PT-BR
     (callers da viagem/cidade passam label pronto): key desconhecida retorna
     o valor original — NUNCA clobbera label legítimo. */
  var _SKILL_LABEL_PT = {
    strength: 'Força', dexterity: 'Destreza', constitution: 'Constituição',
    intelligence: 'Inteligência', wisdom: 'Sabedoria', charisma: 'Carisma',
    athletics: 'Atletismo', acrobatics: 'Acrobacia', stealth: 'Furtividade',
    sleight_of_hand: 'Prestidigitação', arcana: 'Arcanismo', history: 'História',
    investigation: 'Investigação', nature: 'Natureza', religion: 'Religião',
    animal_handling: 'Lidar com Animais', insight: 'Intuição', medicine: 'Medicina',
    perception: 'Percepção', survival: 'Sobrevivência', deception: 'Enganação',
    intimidation: 'Intimidação', performance: 'Atuação', persuasion: 'Persuasão'
  };
  function _skillLabelPT(s) {
    if (!s) return '';
    if (window.DndRules && typeof window.DndRules.skillLabelPT === 'function') {
      return window.DndRules.skillLabelPT(s);
    }
    return _SKILL_LABEL_PT[String(s).toLowerCase()] || s;
  }

  var _STAT_LABEL_PT = {
    str: 'Força',
    dex: 'Destreza',
    con: 'Constituição',
    int: 'Inteligência',
    wis: 'Sabedoria',
    cha: 'Carisma'
  };

  /* Choice detail modal (janela menor explicativa) */
  function _ensureChoiceDetailOverlay() {
    var ov = document.getElementById('enc-choice-detail-overlay');
    if (ov && ov.tagName.toLowerCase() === 'dialog') return ov;
    if (ov) ov.parentNode.removeChild(ov);
    ov = document.createElement('dialog');
    ov.id = 'enc-choice-detail-overlay';
    ov.innerHTML = '<div class="enc-cd-card" role="document"></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function(e) {
      if (e.target === ov) _closeChoiceDetailDialog();
    });
    ov.addEventListener('cancel', function(e) {
      e.preventDefault();
      _closeChoiceDetailDialog();
    });
    return ov;
  }

  function _closeChoiceDetailDialog() {
    var ov = document.getElementById('enc-choice-detail-overlay');
    if (!ov) return;
    try { if (ov.close && ov.open) ov.close(); } catch (_e) {}
    ov.classList.remove('active');
  }

  function _isChoiceConfirmable(ch, opts) {
    if (!ch) return false;
    var total = (opts && (opts.totalChoices != null ? opts.totalChoices : (opts.choices ? opts.choices.length : null)));
    if (total === 1) return false;
    var cid = String(ch.id || ch.next || '').toLowerCase();
    var ccb = String(ch.cb || '').toLowerCase();
    var clabel = String(ch.label || '').toLowerCase();
    if (cid === 'close' || cid === 'leave' || cid === 'back' || cid === 'done' || ccb === 'close') return false;
    if (clabel.indexOf('continuar') >= 0 || clabel.indexOf('voltar') >= 0 || clabel.indexOf('despedir') >= 0) return false;

    // Regra Soberana #48 (Ordem do Usuário 2026-10): Decisão de Aceitar ou Recusar Missão exige confirmação prévia obrigatória
    var cres = String(ch.result || '').toLowerCase();
    var isQuestChoice = !!(opts && opts.isQuestScreen) ||
      (cid === 'accept' || cid.indexOf('accept') >= 0 || clabel.indexOf('aceitar') >= 0 || clabel.indexOf('aceito') >= 0 || cres === 'accept_quest' || cres === 'discovery_unlock' || !!ch._questId || !!ch.quest_id) ||
      (cid === 'decline' || cid.indexOf('decline') >= 0 || clabel.indexOf('recusar') >= 0 || clabel.indexOf('desistir') >= 0 || clabel.indexOf('cancelar') >= 0 || clabel.indexOf('outra hora') >= 0 || clabel.indexOf('adiar') >= 0 || cres === 'discovery_defer');
    if (isQuestChoice) return true;

    return !!(
      ch.isPrep ||
      ch.isCombat ||
      (ch.cost && ch.cost > 0) ||
      ch.requireConfirm ||
      cid === 'jrn_go' ||
      cid === 'jrn_cancel' ||
      (ch.stat && ch.dc) ||
      (ch.check && ch.check.dc)
    );
  }

  function _openChoiceDetailDialog(ch, opts) {
    if (!ch) return;
    // REGRA SOBERANA (Ordem do Usuário 2026-10): Quando existir apenas uma opção,
    // ou opção puramente narrativa/conversacional, a janela NUNCA deverá aparecer.
    if (!_isChoiceConfirmable(ch, opts)) {
      if (opts && typeof opts.onChoice === 'function') opts.onChoice(ch);
      return;
    }
    var ov = _ensureChoiceDetailOverlay();
    var card = ov.querySelector('.enc-cd-card');
    if (!card) return;

    var cid = String(ch.id || ch.next || ch.cb || '').toLowerCase();
    var clabel = String(ch.label || '').toLowerCase();
    var cres = String(ch.result || '').toLowerCase();
    var isQuestChoice = !!(opts && opts.isQuestScreen) ||
      (cid === 'accept' || cid.indexOf('accept') >= 0 || clabel.indexOf('aceitar') >= 0 || clabel.indexOf('aceito') >= 0 || cres === 'accept_quest' || cres === 'discovery_unlock' || !!ch._questId || !!ch.quest_id) ||
      (cid === 'decline' || cid.indexOf('decline') >= 0 || clabel.indexOf('recusar') >= 0 || clabel.indexOf('desistir') >= 0 || clabel.indexOf('cancelar') >= 0 || clabel.indexOf('outra hora') >= 0 || clabel.indexOf('adiar') >= 0 || cres === 'discovery_defer');
    var isAcceptQuest = isQuestChoice && (cid === 'accept' || cid.indexOf('accept') >= 0 || clabel.indexOf('aceitar') >= 0 || clabel.indexOf('aceito') >= 0 || cres === 'accept_quest' || cres === 'discovery_unlock' || !!ch._questId || !!ch.quest_id);
    var isDeclineQuest = isQuestChoice && !isAcceptQuest && (cid === 'decline' || cid.indexOf('decline') >= 0 || clabel.indexOf('recusar') >= 0 || clabel.indexOf('desistir') >= 0 || clabel.indexOf('cancelar') >= 0 || clabel.indexOf('outra hora') >= 0 || clabel.indexOf('adiar') >= 0 || cres === 'discovery_defer');

    var rawLabel = (ch.label && String(ch.label).trim()) || 'Opção';
    var titleText = rawLabel;
    var subtitleText = '';
    var dlg = (opts && opts.dialogue) || _currentRenderState || null;
    var questTitle = '';
    if (dlg) {
      if (dlg.title && dlg.title !== 'Escolher ação' && dlg.title !== 'ENCONTRO') questTitle = dlg.title;
      else if (dlg.npc && dlg.npc.name) questTitle = dlg.npc.name;
      if (dlg.script && Array.isArray(dlg.script)) {
        for (var si = 0; si < dlg.script.length; si++) {
          var st = dlg.script[si];
          if (st.type === 'quest_contract' && st.quest && st.quest.title) {
            questTitle = st.quest.title; break;
          }
          if (st.text) {
            var pq = _parseQuestDetails(st.text);
            if (pq && pq.title) { questTitle = pq.title; break; }
          }
        }
      }
    }
    if (!questTitle && ch._questId && typeof GUILD_QUEST_DETAILS !== 'undefined' && GUILD_QUEST_DETAILS[ch._questId]) {
      questTitle = GUILD_QUEST_DETAILS[ch._questId].title;
    }

    if (isAcceptQuest) {
      titleText = questTitle ? ('Aceitar Missão: ' + questTitle) : 'Aceitar Contrato de Aventura';
      subtitleText = 'Contrato de Aventura · Compromisso de Honra';
    } else if (isDeclineQuest) {
      titleText = questTitle ? ('Recusar Missão: ' + questTitle) : 'Recusar Chamado';
      subtitleText = 'Retirada Cautelosa';
    } else if (ch.title) {
      titleText = ch.title;
      subtitleText = ch.subtitle || '';
    } else if (rawLabel.indexOf(':') !== -1) {
      var parts = rawLabel.split(':');
      titleText = parts[0].trim();
      subtitleText = parts.slice(1).join(':').trim();
    } else if (ch.id === 'jrn_go') {
      titleText = 'Partir em marcha padrão';
      subtitleText = 'Marcha Padrão · Ritmo Comum';
    } else if (ch.id === 'jrn_cancel') {
      titleText = 'Permanecer na cidade';
      subtitleText = 'Permanecer na Cidade · Cancelar';
    } else if (ch.isPrep) {
      subtitleText = 'Postura Tática de Estrada';
    }
    if (ch.subtitle && !subtitleText) {
      subtitleText = ch.subtitle;
    }

    var statBadge = '';
    if (ch.stat && ch.isPrep) {
      var sName = _STAT_LABEL_PT[ch.stat] || ch.stat.toUpperCase();
      statBadge = '<span class="enc-cd-badge">✦ Vantagem em ' + sName + '</span>';
    } else if (ch.isPrep) {
      statBadge = '<span class="enc-cd-badge">Postura Tática</span>';
    } else if (ch.stat && ch.advantage) {
      var sName = _STAT_LABEL_PT[ch.stat] || ch.stat.toUpperCase();
      statBadge = '<span class="enc-cd-badge">✦ Vantagem em ' + sName + '</span>';
    } else if (ch.advantage) {
      statBadge = '<span class="enc-cd-badge" style="color:#ffd700;">✦ Vantagem</span>';
    } else if (ch.stat) {
      var sName = _STAT_LABEL_PT[ch.stat] || ch.stat.toUpperCase();
      statBadge = '<span class="enc-cd-badge">Teste de ' + sName + '</span>';
    }
    if (ch.dc && ch.skill) {
      statBadge += '<span class="enc-cd-badge">CD ' + ch.dc + ' · ' + _skillLabelPT(ch.skill) + (ch.chance != null ? ' (' + ch.chance + '%)' : '') + '</span>';
    } else if (ch.cost) {
      statBadge += '<span class="enc-cd-badge" style="color:#ffd700;">' + ch.cost + ' ' + _VCOIN + '</span>';
    } else if (ch.renownDelta) {
      var rd = ch.renownDelta > 0 ? '+' + ch.renownDelta : String(ch.renownDelta);
      statBadge += '<span class="enc-cd-badge">Renome ' + rd + '</span>';
    }

    var speechHtml = '';
    if (ch.speech) {
      var sTxt = _cleanSpeechText(ch.speech);
      if (sTxt) {
        speechHtml =
          '<div class="enc-cd-section">' +
            '<div class="enc-cd-section-title">Fala / Resposta do Personagem</div>' +
            '<div class="enc-cd-box enc-cd-speech">“' + _coinify(sTxt) + '”</div>' +
          '</div>';
      }
    }

    var descHtml = '';
    if (isAcceptQuest) {
      descHtml =
        '<div class="enc-cd-section">' +
          '<div class="enc-cd-section-title">O Que Está Sendo Escolhido</div>' +
          '<div class="enc-cd-box">Você assume formalmente o encargo de cumprir este objetivo. Sua palavra como aventureiro é selada perante a desolação e os perigos de Valdoria.</div>' +
        '</div>';
    } else if (isDeclineQuest) {
      descHtml =
        '<div class="enc-cd-section">' +
          '<div class="enc-cd-section-title">O Que Está Sendo Escolhido</div>' +
          '<div class="enc-cd-box">Você decide declinar a incumbência neste momento, priorizando sua sobrevivência e recusando o peso deste fardo.</div>' +
        '</div>';
    } else if (ch.desc) {
      descHtml =
        '<div class="enc-cd-section">' +
          '<div class="enc-cd-section-title">' + (ch.speech ? 'Ação e Intenção' : 'O Que Está Sendo Escolhido') + '</div>' +
          '<div class="enc-cd-box">' + _stripEmojis(ch.desc) + '</div>' +
        '</div>';
    } else {
      descHtml =
        '<div class="enc-cd-section">' +
          '<div class="enc-cd-section-title">' + (ch.speech ? 'Ação e Intenção' : 'O Que Está Sendo Escolhido') + '</div>' +
          '<div class="enc-cd-box">' + _stripEmojis(_coinify(titleText)) + (subtitleText ? ' — ' + subtitleText : '') + '</div>' +
        '</div>';
    }

    var resultsHtml = '';
    var resultParts = [];
    if (isAcceptQuest) {
      resultParts.push('<div>✦ O contrato será formalmente inscrito em seu <b>Diário de Aventuras</b>.</div>');
      resultParts.push('<div>✦ As recompensas prometidas (XP, Valdoritas e espólios garantidos) serão concedidas ao concluir o objetivo.</div>');
      resultParts.push('<div>◆ Desafios e perigos mortais aguardam no local designado. Prepare suas provisões e armas.</div>');
    } else if (isDeclineQuest) {
      resultParts.push('<div>✦ A missão não será iniciada agora.</div>');
      resultParts.push('<div>✦ Você continuará livre para seguir viagem ou retornar aos seus afazeres na cidade em segurança.</div>');
    } else {
      if (ch.prepText) {
        resultParts.push('<div class="enc-cd-flavor">' + ch.prepText + '</div>');
      }
      if (ch.isPrep) {
        resultParts.push('<div>✦ <b>Benefício na Estrada:</b> Concede <b>Vantagem</b> (rolagem de 2d20, escolhendo o maior valor) no primeiro teste do atributo correspondente durante a viagem, auxiliando a superar perigos e emboscadas.</div>');
      } else if (ch.id === 'jrn_go') {
        resultParts.push('<div>Avanço pelo trajeto em ritmo normal, sem bônus adicionais de postura e sem penalidades prévias.</div>');
      } else if (ch.id === 'jrn_cancel') {
        resultParts.push('<div>A viagem é suspensa em segurança, retornando à cidade sem passagem de tempo ou perda de recursos.</div>');
      } else if (ch.dc) {
        resultParts.push('<div>✦ <b>Sucesso:</b> Desafio superado com êxito' + (ch.chance != null ? ' (' + ch.chance + '% de chance)' : '') + '.</div>');
        resultParts.push('<div>◆ <b>Falha:</b> Risco de complicações, perda de recursos ou dano' + (ch.dmg ? ' (~' + ch.dmg + ' PV)' : '') + '.</div>');
      } else if (ch.isCombat) {
        resultParts.push('<div style="color:#df7262;">⚔ <b>Combate Iminente:</b> Enfrentará os adversários em batalha tática em grade hexagonal.</div>');
      }
      if (ch.possibleResults || ch.results) {
        resultParts.push('<div>' + (ch.possibleResults || ch.results) + '</div>');
      }
      if (ch.cost) {
        resultParts.push('<div>Custo de <b>' + ch.cost + ' ' + _VCOIN + '</b> debitado de suas posses para confirmar.</div>');
      }
    }

    if (resultParts.length > 0) {
      resultsHtml =
        '<div class="enc-cd-section">' +
          '<div class="enc-cd-section-title">Possíveis Resultados</div>' +
          '<div class="enc-cd-box" style="display:flex; flex-direction:column; gap:6px;">' +
            resultParts.join('') +
          '</div>' +
        '</div>';
    }

    var confirmLabel = (isAcceptQuest) ? 'Aceitar Missão'
      : (isDeclineQuest) ? 'Confirmar Recusa'
      : (ch.isPrep) ? 'Adotar esta Postura'
      : (ch.id === 'jrn_go') ? 'Partir em Marcha Padrão'
      : (ch.id === 'jrn_cancel') ? 'Permanecer na Cidade'
      : (ch.isCombat) ? 'Entrar em Combate'
      : (ch.speech) ? 'Dizer isto e Confirmar'
      : (ch.confirmLabel) ? ch.confirmLabel
      : (ch.dc || ch._tactical_options) ? 'Confirmar e Rolar'
      : 'Confirmar Escolha';

    card.innerHTML =
      '<button class="enc-cd-close" type="button" aria-label="Fechar">✕</button>' +
      '<div class="enc-cd-title">' + _stripEmojis(_coinify(titleText)) + '</div>' +
      (subtitleText ? '<div class="enc-cd-subtitle">' + _stripEmojis(subtitleText) + '</div>' : '') +
      (statBadge ? '<div class="enc-cd-badge-row">' + statBadge + '</div>' : '') +
      '<div class="enc-cd-divider"></div>' +
      speechHtml +
      descHtml +
      resultsHtml +
      '<div class="enc-cd-actions">' +
        '<button type="button" class="enc-cd-btn-confirm">✔ ' + confirmLabel + '</button>' +
        '<button type="button" class="enc-cd-btn-back">← Voltar às opções</button>' +
      '</div>';

    var closeBtn = card.querySelector('.enc-cd-close');
    var backBtn = card.querySelector('.enc-cd-btn-back');
    var confirmBtn = card.querySelector('.enc-cd-btn-confirm');

    if (closeBtn) closeBtn.addEventListener('click', _closeChoiceDetailDialog);
    if (backBtn) backBtn.addEventListener('click', _closeChoiceDetailDialog);
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function() {
        _closeChoiceDetailDialog();
        closeChoices(true);
        if (opts && typeof opts.onChoice === 'function') {
          opts.onChoice(ch);
        }
      });
    }

    if (typeof ov.showModal === 'function') {
      try { if (!ov.open) ov.showModal(); } catch (_e) { ov.classList.add('active'); }
    } else {
      ov.classList.add('active');
    }
  }

  function _openTravelPrepGuideDialog(choices, opts) {
    var ov = _ensureChoiceDetailOverlay();
    var card = ov.querySelector('.enc-cd-card');
    if (!card) return;

    var choicesSummaryHtml = '';
    if (choices && choices.length) {
      choicesSummaryHtml = '<div class="enc-cd-section">' +
        '<div class="enc-cd-section-title">Opções Disponíveis</div>' +
        '<div class="enc-cd-box" style="display:flex; flex-direction:column; gap:8px;">';
      choices.forEach(function(c) {
        var cLabel = (c.label && String(c.label).trim()) || 'Opção';
        var cName = cLabel.split(':')[0].trim();
        var cStat = c.stat ? (' · <span style="color:#ffd700;">Vantagem em ' + (_STAT_LABEL_PT[c.stat] || c.stat) + '</span>') : '';
        choicesSummaryHtml += '<div style="border-bottom:1px solid rgba(196,149,58,0.15); padding-bottom:6px;">' +
          '<div style="font-weight:700; color:#e8c872; font-family:\'Cinzel\',serif; font-size:12px;">' + cName + cStat + '</div>' +
          (c.desc ? '<div style="font-size:11px; color:#a09484; font-style:italic; margin-top:2px; line-height:1.35;">' + c.desc + '</div>' : '') +
        '</div>';
      });
      choicesSummaryHtml += '</div></div>';
    }

    card.innerHTML =
      '<button class="enc-cd-close" type="button" aria-label="Fechar">✕</button>' +
      '<div class="enc-cd-title">PREPARAÇÃO DE VIAGEM</div>' +
      '<div class="enc-cd-subtitle">Guia Tático D&D 5e</div>' +
      '<div class="enc-cd-divider"></div>' +
      '<div class="enc-cd-section">' +
        '<div class="enc-cd-section-title">Como Funciona a Preparação?</div>' +
        '<div class="enc-cd-flavor">' +
          'Antes de cruzar os portões rumo às terras ermas, você escolhe como seu personagem marchará. ' +
          'Ao assumir uma <b>Postura Tática</b> especializada sintonizada à sua Classe ou Raça, você ganha <b>Vantagem</b> ' +
          'no primeiro teste do atributo correspondente durante a viagem (para prevenir emboscadas, fadiga ou acidentes).' +
        '</div>' +
      '</div>' +
      choicesSummaryHtml +
      '<div class="enc-cd-actions">' +
        '<button type="button" class="enc-cd-btn-confirm">← Entendido / Voltar às opções</button>' +
      '</div>';

    var closeBtn = card.querySelector('.enc-cd-close');
    var confirmBtn = card.querySelector('.enc-cd-btn-confirm');
    if (closeBtn) closeBtn.addEventListener('click', _closeChoiceDetailDialog);
    if (confirmBtn) confirmBtn.addEventListener('click', _closeChoiceDetailDialog);

    if (typeof ov.showModal === 'function') {
      try { if (!ov.open) ov.showModal(); } catch (_e) { ov.classList.add('active'); }
    } else {
      ov.classList.add('active');
    }
  }

  /* Ensure choice sub-overlay DOM exists (singleton).
     task #69 (2026-05-20) — MIGRATION HTML <dialog> element.
     Native top-layer rendering elimina conflitos z-index estruturalmente.
     ::backdrop pseudo-element substitui .enc-cho-backdrop manual.
     ESC key + inert background tratados nativamente pelo browser. */
  function _ensureChoicesOverlay() {
    var sub = document.getElementById('enc-choices-overlay');
    if (sub) {
      // Migrate legacy <div> to <dialog> if necessary
      if (sub.tagName.toLowerCase() !== 'dialog') {
        var newSub = document.createElement('dialog');
        newSub.id = 'enc-choices-overlay';
        sub.parentNode.replaceChild(newSub, sub);
        sub = newSub;
      } else {
        return sub;
      }
    } else {
      sub = document.createElement('dialog');
      sub.id = 'enc-choices-overlay';
    }
    // <dialog> has native ::backdrop — no need for manual .enc-cho-backdrop element
    sub.innerHTML =
      '<div class="enc-cho-card" role="document">' +
        '<button class="enc-cho-close" aria-label="Fechar" type="button">✕</button>' +
        '<div class="enc-cho-title"></div>' +
        '<div class="enc-cho-divider"><span class="enc-cho-divider-gem">◆</span></div>' +
        '<div class="enc-cho-list"></div>' +
        '<button class="enc-cho-back" type="button">← Voltar à narrativa</button>' +
      '</div>';
    document.body.appendChild(sub);
    // Wire close interactions
    var closeBtn = sub.querySelector('.enc-cho-close');
    var backBtn = sub.querySelector('.enc-cho-back');
    if (closeBtn) closeBtn.addEventListener('click', closeChoices);
    if (backBtn) backBtn.addEventListener('click', closeChoices);
    // Click on backdrop (clicking outside the card) closes
    sub.addEventListener('click', function(e) {
      // event.target is the <dialog> itself when clicking on ::backdrop
      if (e.target === sub) closeChoices();
    });
    // <dialog> native cancel event (ESC key)
    sub.addEventListener('cancel', function(e) {
      e.preventDefault(); // prevent default close, use our animation
      closeChoices();
    });
    return sub;
  }

  /* Public API: openChoices(choices, opts).
     - choices: array de { id, label, icon?, desc?, dc?, skill?, cost?, renownDelta?, cb? }
     - opts.title: titulo do sub-overlay (default "Escolher ação")
     - opts.npcName: nome do NPC mostrado abaixo do titulo (opcional)
     - opts.onChoice(ch): callback quando user clica numa choice */
  function openChoices(choices, opts) {
    opts = opts || {};
    if (!choices || choices.length === 0) return;
    var sub = _ensureChoicesOverlay();
    var card = sub.querySelector('.enc-cho-card');
    var listEl = sub.querySelector('.enc-cho-list');
    var titleEl = sub.querySelector('.enc-cho-title');
    listEl.innerHTML = '';

    // Remove any previously injected guide button
    var oldGuide = card ? card.querySelector('.enc-cho-guide-btn') : null;
    if (oldGuide && oldGuide.parentNode) oldGuide.parentNode.removeChild(oldGuide);

    var title = _stripEmojis(opts.title || 'Escolher ação');
    var ctxName = _stripEmojis(opts.npcName || '');

    var isCompact = opts.compact === true ||
                    (typeof title === 'string' && title.toLowerCase().indexOf('prepara') !== -1 && title.toLowerCase().indexOf('viagem') !== -1) ||
                    choices.some(function(c) { return c && c.isPrep; });

    if (card) {
      if (isCompact) {
        card.classList.add('enc-cho-card--compact');
        listEl.classList.add('enc-cho-list--compact');
      } else {
        card.classList.remove('enc-cho-card--compact');
        listEl.classList.remove('enc-cho-list--compact');
      }
    }

    titleEl.innerHTML = '<span class="enc-cho-title-orn">✦</span>' +
                        '<span class="enc-cho-title-text">' + title + '</span>' +
                        '<span class="enc-cho-title-orn">✦</span>' +
                        (ctxName ? '<div class="enc-cho-title-sub">' + ctxName + '</div>' : '');

    // Separate guide button if compact
    if (isCompact && listEl.parentNode) {
      var guideBtn = document.createElement('button');
      guideBtn.type = 'button';
      guideBtn.className = 'enc-cho-guide-btn';
      guideBtn.innerHTML = '<span class="enc-cho-guide-orn">✦</span><span>Ver Guia e Detalhes das Posturas</span><span class="enc-cho-guide-orn">✦</span>';
      guideBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        _openTravelPrepGuideDialog(choices, opts);
      });
      listEl.parentNode.insertBefore(guideBtn, listEl);
    }

    choices.forEach(function(ch, idx) {
      var row = document.createElement('button');
      row.className = 'enc-cho-row' + (isCompact ? ' enc-cho-row--compact' : '');
      row.style.setProperty('--idx', idx);
      var dcBadge = '';
      if (ch.dc && ch.skill) {
        /* sessão #88: "CD" (convenção PT-BR do projeto, não "DC") + tradução
           de key EN ('charisma' → 'Carisma') preservando labels já em PT-BR. */
        var advTag = ch.advantage ? ' · <span class="enc-cho-adv" style="color:#ffd700;font-weight:700;">✦ Vantagem</span>' : '';
        dcBadge = '<span class="enc-cho-dc">CD ' + ch.dc + ' · ' + _skillLabelPT(ch.skill) + (ch.chance != null ? ' · ' + ch.chance + '%' : '') + advTag + '</span>';
      } else if (ch.cost) {
        dcBadge = '<span class="enc-cho-dc enc-cho-cost">' + ch.cost + ' ' + _VCOIN + '</span>';
      } else if (ch.renownDelta) {
        var rd = ch.renownDelta > 0 ? '+' + ch.renownDelta : String(ch.renownDelta);
        dcBadge = '<span class="enc-cho-dc enc-cho-renown">Renome ' + rd + '</span>';
      }
      // label e desc podem ter HTML inline simples (<span>, <i>)
      /* sessão #88: choice sem label NUNCA vira botão vazio (só chevron) —
         fallback 'Continuar' + warn pro error-reporter. */
      var _choLabel = _stripEmojis((ch.label && String(ch.label).trim()) || 'Continuar');
      if (!ch.label) console.warn('[ENC] choice sem label', ch.id || ch.cb || '');

      var tagText = ch.tag || (ch.badge && String(ch.badge).replace(/^\[|\]$/g, '')) || '';
      var tagPill = tagText ? '<span class="enc-cho-bg3-tag">[' + _stripEmojis(tagText).toUpperCase() + ']</span>' : '';
      var hasSpeech = !!(ch.speech && String(ch.speech).trim());
      var speechClean = '';
      if (!hasSpeech && ch.label) {
        var _trimmed = String(ch.label).trim();
        if (_trimmed.indexOf('— "') === 0 || _trimmed.indexOf('— “') === 0 || _trimmed.indexOf('“') === 0 || (_trimmed.indexOf('"') === 0 && _trimmed.length > 2)) {
          hasSpeech = true;
          speechClean = _cleanSpeechText(_trimmed);
        }
      }
      if (hasSpeech && !speechClean) {
        speechClean = _cleanSpeechText(ch.speech);
      }

      if (!tagPill && ch.badge) {
        _choLabel = '<span class="enc-cho-badge-pill" style="display:inline-block;padding:1px 6px;margin-right:6px;font-size:10px;font-weight:700;border:1px solid rgba(196,149,58,0.5);border-radius:4px;color:#c4953a;background:rgba(196,149,58,0.12);text-transform:uppercase;letter-spacing:0.5px;">' + _stripEmojis(ch.badge) + '</span>' + _choLabel;
      }

      if (isCompact) {
        var titleText = hasSpeech ? (tagPill + '“' + _coinify(speechClean) + '”') : _choLabel;
        var subText = '';
        if (_choLabel.indexOf(':') !== -1 && !hasSpeech) {
          var lp = _choLabel.split(':');
          titleText = lp[0].trim();
          subText = lp.slice(1).join(':').trim();
        } else if (ch.id === 'jrn_go') {
          titleText = 'Partir em marcha padrão';
          subText = 'Ritmo normal da estrada · Sem bônus';
        } else if (ch.id === 'jrn_cancel') {
          titleText = 'Permanecer na cidade';
          subText = 'Suspender viagem em segurança';
        } else if (ch.desc) {
          subText = _stripEmojis(ch.desc);
        } else if (hasSpeech && ch.label) {
          subText = _stripEmojis(ch.label);
        }

        var statHint = '';
        if (ch.stat) {
          statHint = ' · ' + (_STAT_LABEL_PT[ch.stat] || ch.stat.toUpperCase());
        }

        row.innerHTML =
          '<span class="enc-cho-row-body">' +
            '<span class="enc-cho-row-label">' + _coinify(titleText) + '</span>' +
            '<span class="enc-cho-row-sub">' + (subText ? subText + statHint : '') + '</span>' +
            (dcBadge ? '<span class="enc-cho-row-meta">' + dcBadge + '</span>' : '') +
          '</span>' +
          '<span class="enc-cho-info-btn" role="button" tabindex="0" title="Ver detalhes desta opção" aria-label="Ver detalhes" style="display:none;" aria-hidden="true">ℹ</span>' +
          '<span class="enc-cho-row-chev">›</span>';

        var infoBtn = row.querySelector('.enc-cho-info-btn');
        if (infoBtn) {
          infoBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            _openChoiceDetailDialog(ch, Object.assign({}, opts, { totalChoices: choices.length }));
          });
        }
      } else {
        var mainContent = '';
        var subDesc = '';
        if (hasSpeech) {
          mainContent = tagPill + '<span class="enc-cho-speech">“' + _coinify(speechClean) + '”</span>';
          subDesc = _stripEmojis(ch.desc || ch.label || '');
          // Anti-repetição (Ordem do Usuário 2026-10): se a descrição for idêntica à fala,
          // usa o label da ação se diferente, ou omite a duplicação em vez de repetir o mesmo texto
          var _normSpeech = String(speechClean || '').replace(/[“”.!?,;:\s]/g, '').toLowerCase();
          var _normSub = String(subDesc || '').replace(/[“”.!?,;:\s]/g, '').toLowerCase();
          if (_normSpeech && _normSpeech === _normSub) {
            var _altLabel = _stripEmojis(ch.label || '');
            var _normLabel = _altLabel.replace(/[“”.!?,;:\s]/g, '').toLowerCase();
            subDesc = (_normLabel && _normLabel !== _normSpeech) ? _altLabel : '';
          }
        } else {
          mainContent = (tagPill ? tagPill : '') + _coinify(_choLabel);
          subDesc = _stripEmojis(ch.desc || '');
        }
        row.innerHTML =
          '<span class="enc-cho-row-body">' +
            '<span class="enc-cho-row-label">' + mainContent + '</span>' +
            (subDesc ? '<span class="enc-cho-row-desc">' + subDesc + '</span>' : '') +
            (dcBadge ? '<span class="enc-cho-row-meta">' + dcBadge + '</span>' : '') +
          '</span>' +
          '<span class="enc-cho-row-chev">›</span>';
      }

      // item I (2026-06-18): choice de COMPRA → thumbnail do item à esquerda
      // (tap = detalhe top-layer, exceto misterioso). Genérico: qualquer choice
      // com ch.itemName. stopPropagation no thumb evita disparar a compra.
      var _thumb = _buildChoiceItemThumb(ch);
      if (_thumb) row.insertBefore(_thumb, row.firstChild);
      row.addEventListener('click', function(e) {
        e.preventDefault();
        // REGRA MANDATÓRIA (Ordem do Usuário 2026-10): Quando existir apenas uma opção (choices.length === 1),
        // ou a escolha for puramente narrativa/conversacional, a janela NUNCA deverá aparecer para solicitar confirmação.
        var confirmOpts = Object.assign({}, opts, { totalChoices: choices.length });
        if (_isChoiceConfirmable(ch, confirmOpts)) {
          _openChoiceDetailDialog(ch, confirmOpts);
        } else {
          closeChoices();
          if (typeof opts.onChoice === 'function') opts.onChoice(ch);
        }
      });
      listEl.appendChild(row);
    });

    // task #69: activate via showModal() — native top-layer rendering
    if (sub.tagName.toLowerCase() === 'dialog' && typeof sub.showModal === 'function') {
      try { if (!sub.open) sub.showModal(); }
      catch(e) { sub.classList.add('active'); }
    } else {
      sub.classList.add('active');
    }
    void sub.offsetWidth; // force reflow
    sub.classList.add('opening');
    setTimeout(function() {
      sub.classList.remove('opening');
      sub.classList.add('open');
    }, 50);
  }

  function closeChoices(immediate) {
    _closeChoiceDetailDialog();
    var sub = document.getElementById('enc-choices-overlay');
    if (!sub) return;
    // task #69: check open via <dialog>.open OR .active class (compat)
    var isOpen = (sub.tagName.toLowerCase() === 'dialog' && sub.open) ||
                 sub.classList.contains('active');
    if (!isOpen) return;
    if (immediate) {
      if (sub.tagName.toLowerCase() === 'dialog' && typeof sub.close === 'function') {
        try { if (sub.open) sub.close(); } catch(e){}
      }
      sub.classList.remove('active', 'closing', 'opening', 'open');
      return;
    }
    sub.classList.add('closing');
    sub.classList.remove('open');
    setTimeout(function() {
      // task #69: close <dialog> via .close() if available
      if (sub.tagName.toLowerCase() === 'dialog' && typeof sub.close === 'function') {
        try { if (sub.open) sub.close(); } catch(e){}
      }
      sub.classList.remove('active');
      sub.classList.remove('closing');
      sub.classList.remove('opening');
    }, 280);
  }

  function isChoicesOpen() {
    var sub = document.getElementById('enc-choices-overlay');
    if (!sub) return false;
    // task #69: <dialog>.open is canonical, .open class is fallback
    if (sub.tagName.toLowerCase() === 'dialog') return !!sub.open;
    return sub.classList.contains('open');
  }

  /* Main entry: vEncounter.render(dialogue, opts) */
  // 2026-06-15 (user): barra de vida estilo card de combate, parte do PADRAO_ALDRIC.
  // Mostra a vida TOTAL do personagem ABAIXO do diálogo (cores = thresholds do combate:
  // alto >60% verde, médio 25-60% âmbar, baixo <25% vermelho). DOM-safe (sem innerHTML).
  function _encHpTier(pct) { return pct > 60 ? 'high' : (pct >= 25 ? 'mid' : 'low'); }
  function _appendHpBar(card, p) {
    if (!p || !card) return;
    var hp = (p.hp != null) ? p.hp : 0;
    var mhp = p.mhp || p.hpMax || p.max_hp || p.total_max_hp || (hp > 0 ? hp : 0);
    if (!(mhp > 0)) return;
    var pct = Math.max(0, Math.min(100, Math.round((hp / mhp) * 100)));
    var thr = (typeof window !== 'undefined' && typeof window.vBarHpTier === 'function')
      ? window.vBarHpTier(pct) : _encHpTier(pct);
    var wrap = document.createElement('div'); wrap.className = 'enc-hp';
    var lbl = document.createElement('span'); lbl.className = 'enc-hp-label'; lbl.textContent = 'PV';
    var track = document.createElement('div'); track.className = 'enc-hp-track';
    var fill = document.createElement('span'); fill.className = 'enc-hp-fill enc-hp-' + thr;
    fill.style.width = pct + '%';
    track.appendChild(fill);
    var val = document.createElement('span'); val.className = 'enc-hp-val'; val.textContent = hp + ' / ' + mhp;
    wrap.appendChild(lbl); wrap.appendChild(track); wrap.appendChild(val);
    card.appendChild(wrap);
  }

  function render(dialogue, opts) {
    opts = opts || {};
    closeChoices(true);
    var ov = _ensureOverlay();
    ov.innerHTML = '';

    /* check_hint (doc dialogue-pattern-aldric.md §4.0.2, implementado sessão #88):
       linha com { check_hint: { phrase } } ganha uma sub-linha dourada própria
       ("⚀ Sabedoria (Percepção) CD 13") logo após a estrofe — anuncia o teste
       antes das choices. Estrofe sintética flui pelo pipeline normal. */
    var _scriptIn = dialogue.script || [];
    var _script = [];
    _scriptIn.forEach(function (l) {
      _script.push(l);
      if (l && l.check_hint && l.check_hint.phrase) {
        _script.push({ type: 'narration', _checkHint: true, text: '⚀ ' + l.check_hint.phrase });
      }
    });
    var pages = _groupScriptIntoPages(_script);
    var currentPage = 0;

    var card = document.createElement('div');
    card.className = 'enc-card';
    /* sessão #77: opts.fullHeight → card ocupa o MÁXIMO de espaço vertical
       (regra "Popup DEVE Ocupar Máximo de Espaço"). Usado pela viagem da
       cidade ("Rumo a <destino>") pra ficar épico/imersivo igual à exploração. */
    if (opts.fullHeight) card.classList.add('enc-full');
    /* FASE 5 (2026-06-24): ficha de personagem ("Ver ficha") ocupa a tela toda
       (regra "Popup DEVE Ocupar Máximo de Espaço") sem o caller precisar passar
       opts.fullHeight — basta o script[] ter um bloco character_sheet. */
    if (_scriptIn.some(function (l) { return l && l.type === 'character_sheet'; })) {
      card.classList.add('enc-full');
    }

    /* Viagem e Navegação (Ordem do Usuário 2026-10): Mostra distância estimada
       aproximada em marcos (que pode variar com desvios e atalhos) em vez de contagem
       rígida de etapas numéricas, ou banner de travessia urbana por Valdoria. Safe-DOM. */
    if (opts.progress && (opts.progress.total > 0 || opts.progress.isCityWalk || opts.progress.distEstimated != null)) {
      var _pg = opts.progress;
      var pBan = document.createElement('div');
      pBan.className = 'enc-journey-progress';
      var pLine = document.createElement('div');
      pLine.className = 'enc-jp-line';
      var pLabel = document.createElement('span');
      pLabel.className = 'enc-jp-label';
      var pRemain = document.createElement('span');
      pRemain.className = 'enc-jp-remain';

      if (_pg.isCityWalk) {
        pLabel.textContent = _pg.title || '◈ A CAMINHO POR VALDORIA';
        var _destNorm = (_pg.destination || '').trim().toLowerCase();
        var _distNorm = (_pg.district || '').trim().toLowerCase();
        if (_pg.district && _distNorm !== _destNorm && !_distNorm.startsWith('a caminho')) {
          pRemain.textContent = _pg.district;
        } else {
          pRemain.textContent = 'Pelas ruas de Valdoria';
        }
      } else {
        var _cur = Math.max(1, Math.min(_pg.current || 1, _pg.total || 1));
        var _remain = Math.max(0, (_pg.total || 1) - _cur);
        var _distRem = (_pg.distRemaining != null) ? _pg.distRemaining : (_remain * 3);
        var _distUnit = (_distRem === 1) ? ' marco' : ' marcos';
        pLabel.textContent = 'Distância estimada: ~' + _distRem + _distUnit;
        pRemain.textContent = (_remain === 0 || _distRem <= 0) ? 'Destino avistado!'
          : ('Aproximadamente ~' + _distRem + (_distRem === 1 ? ' marco restante' : ' marcos restantes') + ' (estimativa)');
      }

      pLine.appendChild(pLabel);
      pLine.appendChild(pRemain);
      var pBar = document.createElement('div');
      pBar.className = 'enc-jp-bar';
      var pFill = document.createElement('div');
      pFill.className = 'enc-jp-fill';
      var _pct = _pg.isCityWalk ? 100 : Math.round((Math.max(1, Math.min(_pg.current || 1, _pg.total || 1)) / (_pg.total || 1)) * 100);
      pFill.style.width = Math.max(12, Math.min(100, _pct)) + '%';
      pBar.appendChild(pFill);
      pBan.appendChild(pLine);
      pBan.appendChild(pBar);
      card.appendChild(pBan);
    }

    // Header
    var header = document.createElement('div');
    header.className = 'enc-header';
    /* A3.7 (#90): normaliza o shape do npc no choke-point — aceita string-key
       (registry), objeto canônico OU objeto do registry da cidade
       (portraitImg/ic-*). Conserta o retrato perdido do Porão (servidor manda
       portraitImg) e protege consumidores novos da semântica dupla. */
    if (dialogue.npc) {
      var _nrmNpc = _vNpcResolve(dialogue.npc, opts);
      if (_nrmNpc) dialogue.npc = _nrmNpc;
    }
    // Guarda Anti-Incoerência no motor vEncounter (Ordem do Usuário 2026-10):
    // Se o dialogue.script tem falas onde TODOS os falantes são um único personagem
    // nomeado (ex: 'Lyra Cantarriba'), mas dialogue.npc tem outro nome (ex: 'Grom, o Caolho'),
    // NUNCA exibir o NPC incongruente no cabeçalho do encontro.
    var _speeches = (_scriptIn || []).filter(function(s){ return s && s.type === 'speech' && s.speaker; });
    if (_speeches.length > 0) {
      var _firstSpk = _speeches[0].speaker;
      var _allSame = _speeches.every(function(s){ return s.speaker === _firstSpk; });
      if (_allSame && dialogue.npc && dialogue.npc.name && dialogue.npc.name !== _firstSpk) {
        if (opts && opts.fallbackNpc && opts.fallbackNpc.name === _firstSpk) {
          dialogue.npc = _vNpcResolve(opts.fallbackNpc, opts) || dialogue.npc;
        } else if (_firstSpk === 'Lyra Cantarriba') {
          dialogue.npc = {
            id: 'npc_tavern_lyra',
            name: 'Lyra Cantarriba',
            desc: 'Bardisa · broche de pena do Conservatório de Valdoria',
            portrait: '../shared/img/npcs/lyra-bardisa.webp'
          };
        }
      }
    }
    var npcPortrait = (dialogue.npc && dialogue.npc.portrait) || '';
    /* Sessão #28 (2026-05-24): suporte a portraitHTML — HTML pronto (ex: SVG
       sprite ou <img> de PNG de classe) em vez de URL pra <img src=...>.
       Quando portraitHTML é passado, lightbox é desabilitado (faz sentido
       só pra fotos reais de personagem). */
    var npcPortraitHTML = (dialogue.npc && dialogue.npc.portraitHTML) || '';
    var npcName = (dialogue.npc && dialogue.npc.name) || '';
    var npcDesc = (dialogue.npc && dialogue.npc.desc) || '';
    // 2026-05-22 B3: affinity badge no header (NPC dialogue engine integration).
    // Renderiza tier visual se player + npc_id + npcAffinity disponíveis.
    var npcId = (dialogue.npc && (dialogue.npc.id || dialogue.npc.key)) || '';
    var affinityBadge = '';
    if (npcId && window.npcAffinity && typeof window.npcAffinity.renderBadgeHTML === 'function') {
      var _p = (opts && opts.player) || window.CITY_MOCK_PLAYER || null;
      if (_p) {
        try { affinityBadge = window.npcAffinity.renderBadgeHTML(_p, npcId); } catch(_e){}
      }
    }

    // Registro canônico de histórico do aventureiro
    var _currentHistoryEntryId = null;
    if (typeof window !== 'undefined' && window.vDialogueHistory && typeof window.vDialogueHistory.recordStart === 'function') {
      try {
        var _pHist = (opts && opts.player) || window.CITY_MOCK_PLAYER || null;
        _currentHistoryEntryId = window.vDialogueHistory.recordStart(dialogue, {
          player: _pHist,
          location: (opts && opts.location) || (typeof window._currentScreen !== 'undefined' ? window._currentScreen : '')
        });
      } catch (_eHist) {}
    }
    // PADRAO_ALDRIC (sessão #70): contador de Valdoritas SEMPRE visível, logo
    // ACIMA dos números de paginação. Lê opts.player.gold (ou CITY_MOCK_PLAYER).
    // A classe cgb-num deixa o contador da cidade (_refreshGoldBadges) atualizá-lo.
    var _encGold = '';
    var _gp = (opts && opts.player) || window.CITY_MOCK_PLAYER || null;
    if (_gp && typeof _gp.gold === 'number' && !(opts && opts.showGold === false)) {
      _encGold = '<div class="enc-gold-badge" title="Suas Valdoritas">' +
        '<span class="vi vi-coin sm"></span>' +
        '<span class="enc-gold-num cgb-num">' + _gp.gold + '</span></div>';
    }
    /* sessão #88: npcName/npcDesc passam pelo sanitizer (escape + whitelist
       inline) — fecha o sink de header que aceitava HTML cru; URL do portrait
       tem aspas escapadas. portraitHTML continua confiado (gerado pelo caller
       via _heralIco/sprite, nunca payload). */
    if (!npcPortrait) {
      npcPortrait = _resolveGenericEncounterPortrait(npcName, npcDesc);
    }
    var _safePortraitURL = npcPortrait ? String(npcPortrait).replace(/"/g, '&quot;') : '';
    var _hasPortraitImg = !!npcPortrait;
    var _hasPortraitHTML = !!npcPortraitHTML;
    var _portraitInner = '';
    var _portraitCls = 'enc-portrait';
    var _portraitTitle = '';
    if (_hasPortraitImg) {
      _portraitInner = '<img src="' + _safePortraitURL + '" alt="" ' + _ENC_IMG_ONERR + '>';
      _portraitTitle = ' title="Clique pra ampliar"';
    } else if (_hasPortraitHTML) {
      _portraitInner = npcPortraitHTML;
    } else {
      /* Ordem do Usuário 2026-10: NUNCA exibir círculo vazio ou sem imagem.
         Ativa fallback automático com gradiente e brasão heráldico estilizado. */
      _portraitCls += ' enc-portrait-fallback';
      _portraitTitle = ' title="Evento"';
    }
    header.innerHTML =
      '<div class="' + _portraitCls + '"' + _portraitTitle + '>' +
        _portraitInner +
      '</div>' +
      '<div class="enc-meta">' +
        '<div class="enc-name">' + _sanitizeDialogueHTML(npcName) + (affinityBadge ? ' ' + affinityBadge : '') + '</div>' +
        '<div class="enc-desc">' + _sanitizeDialogueHTML(npcDesc) + '</div>' +
      '</div>' +
      '<div class="enc-rightcol">' +
        _encGold +
        (pages.length > 1
          ? '<div class="enc-page-indicator" id="enc-page-ind">' + (currentPage + 1) + ' / ' + pages.length + '</div>'
          : '<div class="enc-page-indicator" id="enc-page-ind" style="display:none"></div>') +
      '</div>';
    card.appendChild(header);

    // Lightbox no portrait click — só quando há URL real (npcPortrait), não
    // pra HTML customizado (ex: SVG/PNG de classe via portraitHTML).
    /* Sessao #33 (2026-05-25): user reportou que click NAO funcionava no
       prologo apesar de lightbox.js carregado. Causa raiz provavel: render()
       avaliava `typeof window.showLightbox === 'function'` no momento da
       criacao do listener, mas window.showLightbox podia ainda nao ter sido
       definido (race com defer/document.write order). Fix: SEMPRE attach
       listener se npcPortrait existir; check showLightbox AT CLICK TIME.
       Bonus: pointerdown listener pra capture touch antes de outros listeners.
       Tambem adiciona stopImmediatePropagation pra garantir que body click
       (skip-typewriter) nao intercepta. */
    var portraitEl = header.querySelector('.enc-portrait');
    if (portraitEl && npcPortrait) {
      // sessão #76 FIX: os listeners 'click' E 'pointerup' (abaixo) disparavam
      // AMBOS no mesmo toque → window.showLightbox era chamado 2x em sequência →
      // o lightbox abria e FECHAVA SOZINHO (bug reportado: foto pisca e some).
      // Guard de double-fire (400ms) mantém a compat touch do pointerup sem o
      // 2º disparo. NÃO remover o pointerup (alguns Telegram WebViews engolem click).
      var _lastPortraitTap = 0;
      var _onPortraitTap = function(e){
        if (e) {
          if (e.stopPropagation) e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          if (e.preventDefault) e.preventDefault();
        }
        var _now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if (_now - _lastPortraitTap < 400) return;  // ignora o disparo duplicado
        _lastPortraitTap = _now;
        var curImg = portraitEl.querySelector('img');
        var curSrc = (curImg && curImg.getAttribute('src')) || npcPortrait;
        var nameEl = header.querySelector('.enc-name');
        var descEl = header.querySelector('.enc-desc');
        var curName = (nameEl && nameEl.textContent) || npcName;
        var curDesc = (descEl && descEl.textContent) || npcDesc;
        if (typeof window.showLightbox === 'function' && curSrc) {
          window.showLightbox(curSrc, curName, curDesc);
        } else {
          console.warn('[ENC] showLightbox unavailable — lightbox.js missing?');
        }
      };
      portraitEl.addEventListener('click', _onPortraitTap);
      // Touch fallback (alguns Telegram WebViews engolem click apos touch
      // sem chamar dispatchEvent). pointerup cobre touch + mouse + pen.
      portraitEl.addEventListener('pointerup', _onPortraitTap);
      portraitEl.style.cursor = 'pointer';
    } else if (portraitEl && !npcPortrait) {
      // Sem lightbox: cursor default (não sugere interação)
      portraitEl.style.cursor = 'default';
    }

    // Body
    var body = document.createElement('div');
    body.className = 'enc-body';
    body.id = 'enc-body';
    card.appendChild(body);

    // 2026-06-15 (user): barra de vida (estilo combate) abaixo do diálogo quando
    // opts.showHp + opts.player. PADRAO_ALDRIC: a viagem liga isso (mostra a vida
    // total e ela cai visivelmente ao sofrer dano).
    if (opts.showHp && opts.player) _appendHpBar(card, opts.player);

    // Nav
    var nav = document.createElement('div');
    nav.className = 'enc-nav';
    nav.innerHTML =
      '<button class="enc-nav-btn" id="enc-prev" disabled>← Anterior</button>' +
      '<button class="enc-nav-btn enc-nav-btn-next" id="enc-next">Continuar →</button>';
    card.appendChild(nav);

    // Actions (mostrado só na última página)
    var actions = document.createElement('div');
    actions.className = 'enc-actions';
    actions.id = 'enc-actions';
    actions.style.display = 'none';
    card.appendChild(actions);

    /* Sessão #28 (2026-05-24): opts.closeable=true renderiza X close visivel.
       Permite sair a qualquer momento sem se comprometer a uma choice (player
       decide quando conversar). Usado pra ally chats (conversa amistosa).
       Story events / forced encounters NAO devem passar closeable=true.
       Classe `closeable` na card aciona padding-right no header pra o
       .enc-page-indicator nao colidir com o X (CSS em encounter-popup.css). */
    if (opts.closeable) {
      card.classList.add('closeable');
      var encClose = document.createElement('button');
      encClose.className = 'enc-card-close';
      encClose.type = 'button';
      encClose.setAttribute('aria-label', 'Fechar conversa');
      encClose.textContent = '✕';
      encClose.addEventListener('click', function(e){
        e.stopPropagation();
        close();
      });
      card.appendChild(encClose);
    }

    ov.appendChild(card);
    // task #69: use <dialog>.showModal() (top-layer, inert background, focus trap)
    _showOverlay(ov);

    function renderPage(idx) {
      currentPage = idx;
      _saveActiveState(dialogue, opts, currentPage);
      if (_currentRenderState && _currentRenderState.activeTypewriters) {
        _currentRenderState.activeTypewriters.forEach(function(tw){ tw.skip(); });
      }
      body.innerHTML = '';
      body.classList.remove('revealed');
      body.style.minHeight = '';
      body.style.maxHeight = '';
      body.scrollTop = 0;
      var page = pages[idx];
      // Sessão #23 v8 (2026-05-22): user reportou cabeçalho com nome NPC
      // aparece durante narração (deveria só aparecer quando NPC fala).
      // Fix: oculta header se página atual NÃO tem speech (só narration).
      var hasSpeech = page.some(function(line){ return line.type === 'speech' || line.type === 'player_speech'; });
      header.style.display = (hasSpeech || pages.length > 1) ? '' : 'none';

      // Rule #15: Integridade de Speaker — sincroniza cabeçalho e retrato com o interlocutor da página ativa
      var firstSpeech = page.find(function(line){ return line.type === 'speech'; }) || page.find(function(line){ return line.type === 'player_speech'; });
      if (firstSpeech && firstSpeech.speaker) {
        var pageSpkKey = firstSpeech.speaker;
        var isPlayerSpeaker = !!firstSpeech.is_player || firstSpeech.type === 'player_speech' || pageSpkKey === '{player_name}' || pageSpkKey === '{player}';
        var pData = (opts && opts.player) || window.CURRENT_PLAYER || null;
        var playerName = (pData && pData.name) || 'Você';
        if (isPlayerSpeaker) {
          pageSpkKey = playerName;
        }
        var reg = (opts && opts.npcRegistry) || window.RECURRING_NPCS || null;
        var spkHit = (!isPlayerSpeaker && reg) ? reg[pageSpkKey] : null;
        var displayName = isPlayerSpeaker ? playerName : ((spkHit && spkHit.name) || pageSpkKey);
        var playerDesc = (pData && (pData.subclass || pData.char_class || pData.class_name || pData.cls_key || 'Aventureiro')) || 'Aventureiro';
        var displayDesc = isPlayerSpeaker ? playerDesc : ((spkHit && spkHit.desc) || npcDesc);
        var isMainSpeaker = !isPlayerSpeaker && !spkHit && (displayName === npcName || !firstSpeech.speaker || firstSpeech.speaker === npcName || (dialogue.npc && (firstSpeech.speaker === dialogue.npc.id || firstSpeech.speaker === dialogue.npc.npc_id)));
        var displayPortrait = isPlayerSpeaker
          ? ((pData && (pData.portrait || pData.avatar)) || null)
          : ((spkHit && (spkHit.portraitImg || spkHit.portrait))
            || (isMainSpeaker && npcPortrait ? npcPortrait : null)
            || (typeof window._npcPortraitByName === 'function' ? window._npcPortraitByName(displayName) : null)
            || (typeof window._discoverySpeakerPortrait === 'function' ? window._discoverySpeakerPortrait(displayName) : null)
            || (npcPortrait || null)
            || (typeof _resolveGenericEncounterPortrait === 'function' ? _resolveGenericEncounterPortrait(displayName, displayDesc) : null));

        var nameEl = header.querySelector('.enc-name');
        if (nameEl && displayName) {
          nameEl.textContent = displayName;
        }
        var descEl = header.querySelector('.enc-desc');
        if (descEl && displayDesc) {
          descEl.textContent = displayDesc;
        }
        var portImg = header.querySelector('.enc-portrait img');
        if (portImg && displayPortrait) {
          portImg.src = displayPortrait;
        } else if (displayPortrait) {
          var portEl = header.querySelector('.enc-portrait');
          if (portEl) {
            portEl.innerHTML = '<img src="' + String(displayPortrait).replace(/"/g, '&quot;') + '" alt="" ' + _ENC_IMG_ONERR + '>';
            portEl.className = 'enc-portrait';
            portEl.title = 'Clique pra ampliar';
          }
        }
      } else if (dialogue.npc && (dialogue.npc.name || dialogue.npc.desc)) {
        var nameElDef = header.querySelector('.enc-name');
        if (nameElDef) nameElDef.textContent = dialogue.npc.name || '';
        var descElDef = header.querySelector('.enc-desc');
        if (descElDef) descElDef.textContent = dialogue.npc.desc || '';
        var portImgDef = header.querySelector('.enc-portrait img');
        if (portImgDef && dialogue.npc.portrait) {
          portImgDef.src = dialogue.npc.portrait;
        } else if (dialogue.npc.portrait) {
          var portElDef = header.querySelector('.enc-portrait');
          if (portElDef) {
            portElDef.innerHTML = '<img src="' + String(dialogue.npc.portrait).replace(/"/g, '&quot;') + '" alt="" ' + _ENC_IMG_ONERR + '>';
            portElDef.className = 'enc-portrait';
          }
        }
      } else if (!hasSpeech) {
        header.style.display = 'none';
      }

      var strophes = [];
      page.forEach(function(line) {
        /* Script item ESTRUTURADO de recompensa (bug prólogo 2026-06-11): nó DOM
           construído pelo renderer confiável (textContent, sem innerHTML/HTML em
           texto). Estático (sem typewriter); revelado junto da página via
           .enc-body.revealed (CSS). Não entra em `strophes`. */
        if (line.type === 'reward') {
          var rel = _buildRewardBlockEl(line);
          if (rel) {
            var rdiv = document.createElement('div');
            rdiv.className = 'enc-line enc-reward-line';
            rdiv.appendChild(rel);
            body.appendChild(rdiv);
          }
          return;
        }
        /* FASE 5 (2026-06-24): bloco FICHA DE PERSONAGEM estruturado ("Ver ficha"
           do recruta). Mesmo padrão do `reward`: nó DOM (createElement/textContent
           → DOM-safe), estático (sem typewriter), revelado junto da página via
           .enc-body.revealed. Não entra em `strophes`. */
        if (line.type === 'character_sheet') {
          var csel = _buildCharacterSheetEl(line);
          if (csel) {
            var csdiv = document.createElement('div');
            csdiv.className = 'enc-line enc-cs-line';
            csdiv.appendChild(csel);
            body.appendChild(csdiv);
          }
          return;
        }
        /* Bloco NOTIFICAÇÃO TÉCNICA estruturado (deltas de status / saciedade / sem efeito).
           Renderizado via DOM-safe createElement/textContent, revelado junto da página. */
        if (line.type === 'technical') {
          var tel = _buildTechnicalBlockEl(line);
          if (tel) {
            var tdiv = document.createElement('div');
            tdiv.className = 'enc-line enc-technical-line';
            tdiv.appendChild(tel);
            body.appendChild(tdiv);
          }
          return;
        }
        /* Bloco IMPACTO NO PERSONAGEM estruturado (perda de vida e condições na viagem).
           Revelado com animação de queda de PV e caixa de condições quando aplicável. */
        if (line.type === 'player_impact') {
          var picEl = _buildPlayerImpactCardEl(line);
          if (picEl) {
            var picDiv = document.createElement('div');
            picDiv.className = 'enc-line enc-player-impact-line';
            picDiv.appendChild(picEl);
            body.appendChild(picDiv);
          }
          return;
        }
        /* CONTRATO DE AVENTURA / MISSÃO PROCLAMADA estruturado (PADRAO_ALDRIC ÉPICO).
           Renderizado via DOM-safe createElement/textContent, revelado junto da página. */
        if (line.type === 'quest_contract' || (line.text && _parseQuestDetails(line.text))) {
          var qData = line.quest || _parseQuestDetails(line.text);
          if (qData) {
            if (qData.introText) {
              var introDiv = document.createElement('div');
              introDiv.className = 'enc-line enc-line--narration';
              introDiv.innerHTML = _sanitizeDialogueHTML(_stripEmojis(qData.introText));
              body.appendChild(introDiv);
            }
            var qel = _buildQuestCardEl(qData);
            if (qel) {
              var qdiv = document.createElement('div');
              qdiv.className = 'enc-line enc-quest-line';
              qdiv.appendChild(qel);
              body.appendChild(qdiv);
            }
          }
          return;
        }
        /* 2026-06-08 (user): NAO cria box pra estrofe sem texto. Aparecia uma
           caixa com fundo/borda VAZIA no dialogo (ex.: resultado dos Primeiros
           Socorros). So renderiza estrofe que de fato tem conteudo. */
        var lineText = line.text;
        var pData = (opts && opts.player) || window.CURRENT_PLAYER || null;
        if (lineText && typeof _resolveGenderTokens === 'function') {
          var _pG = (pData && pData.gender) || '';
          lineText = _resolveGenderTokens(lineText, _pG);
        }
        var _sentences = _splitIntoSentences(_sanitizeDialogueHTML(lineText));
        if (!_sentences.length) return;
        var div = document.createElement('div');
        /* sessão #88: tipo 'dm' (voz de Mestre, doc §4.0.1) ganha visual próprio
           (sépia + label MESTRE via .enc-dm); qualquer type desconhecido cai em
           narration (antes caía em speech — invertido vs. legacy/Stub). */
        var isLinePlayer = line.type === 'player_speech' || !!line.is_player || line.speaker === '{player_name}' || line.speaker === '{player}' || line.speaker === 'Você' || (pData && pData.name && line.speaker === pData.name);
        var _lineCls = (line.type === 'speech' || line.type === 'player_speech') ? ('enc-speech' + (isLinePlayer ? ' enc-speech--player' : ''))
          : (line.type === 'dm') ? 'enc-narration enc-dm'
          : 'enc-narration' + (line._checkHint ? ' enc-check-hint' : '');
        div.className = 'enc-line ' + _lineCls;
        if ((line.type === 'speech' || line.type === 'player_speech') && line.speaker) {
          /* GUARD anti-vazamento (sessão #88 — bug reportado pelo user: key de
             backend exibida como nome do NPC). speaker DEVE ser display name;
             o CSS exibe data-speaker VERBATIM (content:attr). Key snake_case
             pura (lowercase ASCII sem espaço/acento) ou igual ao id/key do NPC
             do diálogo NUNCA aparece — cai pro nome do NPC e loga o vazamento.
             Display names legítimos ('Martha', 'Grom Barba-Cinza', 'Aldwin de
             Tholram') têm maiúscula/acento/espaço e passam intactos. */
          var _spk = String(line.speaker);
          if (isLinePlayer || _spk === '{player_name}' || _spk === '{player}') {
            _spk = (pData && pData.name) || 'Você';
          } else if (/^[a-z0-9_]+$/.test(_spk) ||
              (dialogue.npc && (_spk === dialogue.npc.id || _spk === dialogue.npc.key))) {
            console.warn('[ENC] speaker key não resolvida (usando npc.name): ' + _spk);
            _spk = (dialogue.npc && dialogue.npc.name) || '';
          }
          if (_spk) div.setAttribute('data-speaker', _spk);
        }
        body.appendChild(div);
        strophes.push({
          line: line,
          container: div,
          sentences: _sentences
        });
      });

      body.style.minHeight = '';
      strophes.forEach(function(s) {
        s.container.innerHTML = '';
        s.container.classList.remove('typing-started');
        /* 2026-06-08 (user): a estrofe so aparece quando A SUA digitacao comecar.
           Mantem o box escondido (sem fundo/borda visivel) ate typeNextSentence
           (ou _instantReveal) revelar. */
        s.container.style.visibility = 'hidden';
      });

      var state = {
        strophes: strophes,
        stropheIdx: 0,
        sentenceIdx: 0,
        activeTypewriters: [],
        skipped: false,
        isLastPage: idx === pages.length - 1 // task #55: gate pra renderActions
      };
      _currentRenderState = state;

      var CHAR_MS = 28;
      var GAP_BETWEEN_SENTENCES = 100;
      var GAP_BETWEEN_STROPHES = 400;

      function typeNextSentence() {
        if (state.skipped) return;
        if (state.stropheIdx >= state.strophes.length) {
          state.skipped = true;
          body.classList.add('revealed');
          body.style.minHeight = '';
          /* Sessao #42 (2026-05-27): apos typewriter natural completar,
             atualiza nextBtn (mesma logica do _instantReveal). Em ultima pagina,
             actions assume o lugar (renderActions abaixo); em intermediaria,
             nextBtn vira "Continuar ▸" sem hint "(pular)" do CSS. */
          var nextBtnNat = card.querySelector('#enc-next');
          if (nextBtnNat) {
            if (state.isLastPage) {
              nextBtnNat.style.visibility = 'hidden';
              nextBtnNat.style.display = 'none';
            } else {
              nextBtnNat.textContent = 'Continuar ▸';
              nextBtnNat.style.visibility = 'visible';
              nextBtnNat.style.display = '';
              nextBtnNat.removeAttribute('disabled');
            }
          }
          // task #55 (2026-05-20) — user pediu: "Escolher ação" só APÓS dialogue
          // terminar (natural ou skip). Na última página, renderActions só agora.
          if (state.isLastPage) renderActions();
          return;
        }
        var sd = state.strophes[state.stropheIdx];
        if (state.sentenceIdx >= sd.sentences.length) {
          state.stropheIdx++;
          state.sentenceIdx = 0;
          setTimeout(typeNextSentence, GAP_BETWEEN_STROPHES);
          return;
        }

        // Ordem do Usuário 2026-10: Estrofe repetida já ouvida/lida NÃO reexecuta
        // máquina de escrever lenta — exibe o texto instantaneamente (0ms) e avança!
        if (state.sentenceIdx === 0 && sd.line && sd.line.text && _isTextSeen(sd.line.text)) {
          sd.container.classList.add('typing-started');
          sd.container.style.visibility = '';
          sd.container.innerHTML = '';
          for (var sIdx = 0; sIdx < sd.sentences.length; sIdx++) {
            if (sIdx > 0) sd.container.appendChild(document.createTextNode(' '));
            var spanSeen = document.createElement('span');
            spanSeen.className = 'enc-sentence';
            spanSeen.innerHTML = sd.sentences[sIdx];
            sd.container.appendChild(spanSeen);
          }
          state.stropheIdx++;
          state.sentenceIdx = 0;
          typeNextSentence();
          return;
        }

        if (state.sentenceIdx === 0) {
          sd.container.classList.add('typing-started');
          sd.container.style.visibility = '';  /* revela a estrofe ao INICIAR a digitacao */
        }
        var sentence = sd.sentences[state.sentenceIdx];
        var container = sd.container;
        if (state.sentenceIdx > 0) container.appendChild(document.createTextNode(' '));
        var span = document.createElement('span');
        span.className = 'enc-sentence';
        container.appendChild(span);
        var tw = _typewriter(span, sentence, CHAR_MS, function() {
          state.sentenceIdx++;
          if (state.skipped) return;
          setTimeout(typeNextSentence, GAP_BETWEEN_SENTENCES);
        });
        state.activeTypewriters.push(tw);
      }

      /* Ordem do Usuário 2026-10: Diálogos/narrativas que estão repetindo não precisam
         mostrar animação de escrita de texto (design visual) pois o jogador já leu. */
      var textLines = page.filter(function(l) {
        return l && (l.type === 'speech' || l.type === 'player_speech' || l.type === 'narration' || l.type === 'dm') && l.text;
      });
      var hasSpeech = textLines.some(function(l) { return l.type === 'speech' || l.type === 'player_speech'; });
      var isPageRepeated = textLines.length > 0 && (
        (hasSpeech && textLines.some(function(l) { return (l.type === 'speech' || l.type === 'player_speech') && _isTextSeen(l.text); })) ||
        textLines.every(function(l) { return _isTextSeen(l.text); })
      );

      if (isPageRepeated) {
        _instantReveal();
      } else {
        typeNextSentence();
      }

      // Marca textos desta página como vistos para as próximas visitas
      textLines.forEach(function(l) {
        _markTextSeen(l.text);
      });

      // Safety layout preventivo: garante que body nunca empurre nav para fora do card
      requestAnimationFrame(function() {
        var headerEl = card.querySelector('.enc-header');
        var navEl = card.querySelector('.enc-nav');
        var hH = headerEl ? headerEl.offsetHeight : 70;
        var nH = navEl ? navEl.offsetHeight : 48;
        var maxAllowedBody = card.clientHeight - hH - nH;
        if (maxAllowedBody > 60 && body.scrollHeight > maxAllowedBody) {
          body.style.maxHeight = maxAllowedBody + 'px';
        }
      });

      var pageInd = card.querySelector('#enc-page-ind');
      if (pageInd) {
        if (pages.length > 1) {
          pageInd.textContent = (idx + 1) + ' / ' + pages.length;
          pageInd.style.display = '';
        } else {
          pageInd.style.display = 'none';
        }
      }
      var prevBtn = card.querySelector('#enc-prev');
      if (prevBtn) {
        prevBtn.disabled = idx === 0;
        /* Sessao #42 (2026-05-27): esconde "Anterior" se 1 pagina (nao tem
           pra onde voltar). Tambem esconde durante typewriter da pagina 1
           pra UI ficar limpa. */
        prevBtn.style.visibility = (idx === 0) ? 'hidden' : 'visible';
      }
      var nextBtn = card.querySelector('#enc-next');
      var isLastPage = idx === pages.length - 1;
      /* sessão #90: ao (re)renderizar QUALQUER página, limpa a ação que
         renderActions tinha colocado na nav band da última página e restaura o
         display do "Continuar →". Assim, voltar (← Anterior) pra uma página
         intermediária mostra o "Continuar →" de novo (sem botão de ação stale).
         2026-06-16 (user, bug "travado na tela RECOMPENSA +25 XP — só sobra
         '← Anterior'"): este bloco SÓ pode rodar quando a página NÃO completou
         de forma síncrona. Numa última página de SÓ {type:'reward'} (strophes
         vazio), typeNextSentence() ACIMA já completou síncrono (state.skipped=
         true) e JÁ chamou renderActions(), que inseriu o botão de ação ÚNICA
         (.enc-nav-action) na nav band E escondeu o "Continuar →". Sem o guard,
         a limpeza removia o botão recém-criado e re-mostrava o nextBtn (que
         continuava com visibility:hidden) → jogador travado só com "← Anterior".
         Mesmo motivo do guard !state.skipped logo abaixo (#41040bfa). renderActions
         já de-dupa a própria nav-action (querySelector+remove), então quando ela
         roda síncrono não há stale a limpar aqui. renderActions() SÓ roda na
         última página (gate state.isLastPage), logo a única janela em que a
         limpeza apagaria uma ação RECÉM-criada é skipped && isLastPage — por isso
         o guard é (!skipped || !isLastPage): páginas intermediárias e o caminho
         async continuam limpando o stale normalmente — cobre back-nav (← Anterior)
         e qualquer página NÃO-última que complete de forma síncrona. */
      if (!state.skipped || !state.isLastPage) {
        var _navActionStale = card.querySelector('.enc-nav .enc-nav-action');
        if (_navActionStale) _navActionStale.remove();
        if (nextBtn) nextBtn.style.display = '';
      }
      /* 2026-06-11 (user, bug "Pular não faz nada" após reward do Brenn): se a
         página NÃO tem texto (ex.: só {type:'reward'} → strophes vazio),
         typeNextSentence() ACIMA já completou SINCRONAMENTE (skipped=true,
         renderActions, nextBtn hidden). O bloco abaixo então re-mostrava
         "Pular ▸" e re-escondia actions — deixando o botão visível mas INERTE
         (onclick: skipped já true + última página → no-op) e os choices
         escondidos = jogador travado. Guard: se já completou, NÃO clobберar. */
      if (nextBtn && !state.skipped) {
        /* Sessao #42 (2026-05-27): "Pular ▸" SEMPRE visivel durante typewriter,
           inclusive na ultima pagina. Bug raiz: antes na ultima pagina ou em
           dialogo de 1 pagina, nav era hidden + actions display:none durante
           typewriter -> user em viewport pequeno + fonte grande ficava SEM
           NENHUM BOTAO visivel, travado.

           Agora:
           - Durante typewriter (qualquer pagina): "Pular ▸" visivel
           - Apos typewriter completar:
             * Pagina intermediaria -> "Continuar ▸"
             * Ultima pagina -> nextBtn hidden (actions aparecem com choices) */
        nextBtn.style.visibility = 'visible';
        nextBtn.textContent = isLastPage ? 'Pular ▸' : 'Continuar ▸';
        nextBtn.removeAttribute('disabled');
        actions.style.display = 'none'; // sempre começa escondido
      }
      /* Sessao #42 (2026-05-27): NUNCA esconder nav inteira. Antes, em dialogo
         de 1 pagina, navRow ficava display:none -> user sem botoes durante
         typewriter. Agora nav sempre visivel; conteudo se adapta. */
      var navRow = card.querySelector('.enc-nav');
      if (navRow) {
        navRow.style.display = '';
      }
    }

    /* Click-to-skip canonical (PADRAO_ALDRIC regra global 2026-05-19). */
    function _instantReveal() {
      var st = _currentRenderState;
      if (!st || st.skipped) return;
      st.skipped = true;
      st.activeTypewriters.forEach(function(tw){ tw.skip(); });
      st.activeTypewriters = [];
      while (st.stropheIdx < st.strophes.length) {
        var sd = st.strophes[st.stropheIdx];
        var container = sd.container;
        container.classList.add('typing-started');
        container.style.visibility = '';  /* skip/pular revela TODAS as estrofes */
        while (st.sentenceIdx < sd.sentences.length) {
          var sentence = sd.sentences[st.sentenceIdx];
          if (st.sentenceIdx > 0) container.appendChild(document.createTextNode(' '));
          var span = document.createElement('span');
          span.className = 'enc-sentence';
          span.innerHTML = sentence;
          container.appendChild(span);
          st.sentenceIdx++;
        }
        st.stropheIdx++;
        st.sentenceIdx = 0;
      }
      body.classList.add('revealed');
      body.style.minHeight = '';
      /* Sessao #42 (2026-05-27) + Fix 2026-10: apos pular typewriter, atualiza nextBtn:
         - Ultima pagina -> hidden + display:none (actions choices aparece em renderActions)
         - Pagina intermediaria -> "Continuar ▸" com visibilidade e display garantidos */
      var nextBtn = card.querySelector('#enc-next');
      if (nextBtn) {
        if (st.isLastPage) {
          nextBtn.style.visibility = 'hidden';
          nextBtn.style.display = 'none';
        } else {
          nextBtn.textContent = 'Continuar ▸';
          nextBtn.style.visibility = 'visible';
          nextBtn.style.display = '';
          nextBtn.removeAttribute('disabled');
        }
      }
      // task #55 (2026-05-20) — user pediu: "Escolher ação" só APÓS dialogue
      // terminar. Em click-to-skip também precisa mostrar actions.
      if (st.isLastPage) renderActions();
    }

    /* Navegação por toque em card/corpo (Ordem do Usuário 2026-10):
       1) Toque durante typewriter -> revela texto imediatamente.
       2) Toque quando já revelado em página intermediária -> avança para a próxima página. */
    card.addEventListener('click', function(e) {
      if (e.target.closest('button, a, input, select, textarea, .enc-portrait, .enc-card-close, [data-interactive]')) {
        return;
      }
      var st = _currentRenderState;
      if (!st) return;
      if (!st.skipped && !body.classList.contains('revealed')) {
        _instantReveal();
        return;
      }
      if (currentPage < pages.length - 1) {
        currentPage++;
        renderPage(currentPage);
      }
    });

    /* 2026-05-20 task #49 — AAA choice sub-overlay (reabrível).
       Em vez de listar choices inline no encounter, mostra UM botão primário
       "⚔ Escolher ação" que ABRE sub-tela acima (z=9700) com choices em
       cards. Sub-tela pode ser FECHADA (✕) e REABERTA via mesmo botão.
       Encounter permanece intacto atrás.

       Fallback: se opts.inlineChoices === true OU dialogue tem 1 choice única,
       mantém comportamento antigo (inline buttons). */
    function renderActions() {
      actions.innerHTML = '';
      /* sessão #90: limpa ação prévia da nav band (renderActions roda 2x:
         typewriter-finish + click-to-skip) — sem isso, duplicaria o botão. */
      var prevNavAction = nav.querySelector('.enc-nav-action');
      if (prevNavAction) prevNavAction.remove();
      var encNext = card.querySelector('#enc-next');
      var choices = dialogue.choices || [];
      if (choices.length === 0) {
        if (opts.pendingRemote) {
          if (encNext) {
            encNext.style.display = '';
            encNext.style.visibility = 'visible';
            encNext.textContent = 'Continuar ▸';
          }
          return;
        }
        /* Anti-trap (sessão #88): última página sem choices virava modal SEM
           SAÍDA no mobile (<dialog> showModal, sem ESC no Telegram WebView,
           nextBtn hidden, X só com opts.closeable). Fallback: botão Fechar. */
        console.warn('[ENC] dialogue sem choices — fallback Fechar');
        choices = [{ id: '_enc_auto_close', label: 'Fechar', cb: 'close' }];
      }
      var isQuestScreen = _isQuestDecisionScreen(dialogue, choices);
      var useInline = opts.inlineChoices === true || choices.length === 1 || isQuestScreen;
      var btns = [];
      if (useInline) {
        choices.forEach(function(ch, idx) {
          var btn = document.createElement('button');
          btn.className = 'enc-btn' + (idx === 0 ? ' enc-btn-primary' : '');
          if (isQuestScreen) {
            var cid = String(ch.id || ch.next || ch.cb || '').toLowerCase();
            var clabel = String(ch.label || '').toLowerCase();
            var cres = String(ch.result || '').toLowerCase();
            var isAccept = (cid === 'accept' || cid.indexOf('accept') >= 0 || cid === 'unlock' || clabel.indexOf('aceitar') >= 0 || clabel.indexOf('aceito') >= 0 || cres === 'accept_quest' || cres === 'discovery_unlock' || !!ch._questId || !!ch.quest_id);
            if (isAccept) {
              btn.className = 'enc-btn enc-btn-primary enc-btn-quest-accept';
              btn.innerHTML = '⚔ ' + _stripEmojis((ch.label && String(ch.label).trim()) || 'Aceitar Missão');
            } else {
              btn.className = 'enc-btn enc-btn-secondary enc-btn-quest-decline';
              btn.innerHTML = '✕ ' + _stripEmojis((ch.label && String(ch.label).trim()) || 'Recusar');
            }
          } else {
            btn.innerHTML = _stripEmojis(_coinify((ch.label && String(ch.label).trim()) || 'Continuar'));
          }
          btn.addEventListener('click', function() {
            var confirmOpts = {
              totalChoices: choices.length,
              dialogue: dialogue,
              isQuestScreen: isQuestScreen,
              onChoice: _handleChoiceInternal
            };
            if (_isChoiceConfirmable(ch, confirmOpts)) {
              _openChoiceDetailDialog(ch, confirmOpts);
            } else {
              _handleChoiceInternal(ch);
            }
          });
          btns.push(btn);
        });
      } else {
        // Single primary button → opens choice-overlay
        var btn = document.createElement('button');
        btn.className = 'enc-btn enc-btn-primary enc-btn-choose';
        var _chooseBtnText = (dialogue && dialogue.choicesBtnLabel) || 'Escolher ação';
        btn.innerHTML = '<span class="enc-btn-choose-icon">⚔</span>' +
                        '<span class="enc-btn-choose-label">' + _stripEmojis(_chooseBtnText) + '</span>' +
                        '<span class="enc-btn-choose-count">' + choices.length + '</span>';
        btn.addEventListener('click', function() {
          openChoices(choices, {
            title: _stripEmojis((dialogue && (dialogue.choicesTitle || dialogue.title)) || 'Escolher ação'),
            npcName: _stripEmojis((dialogue && dialogue.choicesSubtitle) || (dialogue && dialogue.npc && dialogue.npc.name) || ''),
            compact: (dialogue && dialogue.compact) || opts.compact || false,
            dialogue: dialogue,
            isQuestScreen: isQuestScreen,
            onChoice: _handleChoiceInternal
          });
        });
        btns.push(btn);
      }
      /* sessão #90 (user): AÇÃO ÚNICA fica na MESMA FAIXA do "← Anterior" (nav band),
         no lado direito — em vez de uma 2ª faixa empilhada (.enc-actions) que estourava
         a área visível do Telegram (botão cortado). O "Continuar →" da nav vira
         display:none pra liberar o espaço. Múltiplas escolhas inline continuam
         empilhadas em .enc-actions (precisam de linhas próprias). */
      if (encNext) encNext.style.display = 'none';
      if (btns.length === 1) {
        btns[0].classList.add('enc-nav-action');
        nav.appendChild(btns[0]);
        actions.style.display = 'none';
      } else {
        btns.forEach(function(b) { actions.appendChild(b); });
        actions.style.display = '';
      }
    }

    /* Dispatch único usado por renderActions (closure sobre dialogue + opts). */
    function _handleChoiceInternal(ch) {
      closeChoices(true); /* fecha sub-overlay imediatamente antes de dispatch */
      /* sessão #76: diálogos de ALIADO (npc.id 'ally_*') marcam a pergunta de
         LORE como USADA ao escolher — mesmo em falha de skill check → não
         reaparece. B2.2 #90: SÓ marca choices `_oneShot` (perguntas de lore);
         a choice de skill e o "Sair" NÃO são marcadas → ficam sempre
         disponíveis, então o aliado nunca vira mudo ('Fechar'-only). NPCs
         normais já fazem seu próprio tracking; este guard é só pra allies. */
      if (dialogue && dialogue.npc && typeof dialogue.npc.id === 'string'
          && dialogue.npc.id.indexOf('ally_') === 0
          && ch && ch.id && ch._oneShot && typeof window._npcMarkUsed === 'function') {
        try { window._npcMarkUsed(dialogue.npc.id, ch.id); } catch(_e) {}
      }
      /* Sessao #29 (2026-05-24): ally_source dispara backend apply-effect.
         Pra non-dice (cb='close' ou empty): chama AGORA antes do close.
         Pra dice (cb='dice:'): _diceCheckSvc chama apos resolver dado. */
      var _cb = ch.cb || '';
      if (ch.ally_source && (_cb === '' || _cb === 'close')
          && typeof window._postAllyEffect === 'function') {
        try { window._postAllyEffect(ch.ally_source, null); } catch(_e) {}
      }

      // Registro de histórico: grava a escolha tomada pelo jogador
      if (typeof window !== 'undefined' && window.vDialogueHistory && typeof window.vDialogueHistory.recordChoice === 'function') {
        try {
          var _pChoice = (opts && opts.player) || window.CITY_MOCK_PLAYER || null;
          window.vDialogueHistory.recordChoice(_currentHistoryEntryId, ch, null, null, _pChoice);
        } catch (_eHist) {}
      }

      // External onChoice callback (PADRAO_ALDRIC v2 contrato) - SOBERANO
      // Quando o caller fornece onChoice (ex.: _renderCityDialogue, _arrivalRenderNode, _openRecrutaDialogue, journey-runner),
      // este callback DEVE ser invocado com a choice selecionada, sem ser interceptado por fallbacks legados.
      var inst = (typeof _activeEncounterInstance !== 'undefined' ? _activeEncounterInstance : null);
      var activeOnChoice = (inst && inst.opts && inst.opts.onChoice) || (opts && opts.onChoice);
      if (typeof activeOnChoice === 'function') {
        activeOnChoice(ch, dialogue);
        return;
      }

      // Fallbacks legados (apenas quando opts.onChoice NÃO foi fornecido):
      if (typeof window._dispatchSvcChoice === 'function') {
        var handled = window._dispatchSvcChoice(ch, dialogue, opts.dialogues || {});
        if (handled) return;
      }
      var cb = ch.cb || '';
      if (cb === 'close') { close(); return; }
      if (opts.dialogues && opts.dialogues[ch.id]) {
        render(opts.dialogues[ch.id], opts);
        return;
      }
      // task #70 (2026-05-20) — BACKEND DISPATCH FALLBACK
      // Quando cb não é 'close', dice:, opinion-, *-confirm, cascade:, memory:,
      // visit:, ou key em opts.dialogues — dispatcha pro backend via vCity.act.
      // Resolve bug: choices em greeting dialogues (Guild, Arena, Workshop,
      // Market merchants, RuneScribe) tinham cb's ('guild_quests', 'arena_fight',
      // 'workshop_forge', etc.) que não eram dispatched → clique apenas fechava
      // overlay. Agora cb não-roteado vai pra backend (que pode reconhecer
      // como cb canonical de hub menu).
      if (cb && typeof window.vCity === 'object' && typeof window.vCity.act === 'function') {
        try { window.vCity.act(cb); } catch(_e) { /* non-fatal */ }
        close();
        return;
      }
      close();
    }

    var prevBtn = card.querySelector('#enc-prev');
    var nextBtn = card.querySelector('#enc-next');
    if (prevBtn) prevBtn.onclick = function(e) {
      if (e) e.stopPropagation();
      if (currentPage > 0) { currentPage--; renderPage(currentPage); }
    };
    if (nextBtn) nextBtn.onclick = function(e) {
      if (e) e.stopPropagation();
      /* Sessao #42 (2026-05-27): UX visual-novel — primeiro click PULA typewriter
         se ainda rodando, segundo click avanca. */
      var st = _currentRenderState;
      if (st && !st.skipped && !body.classList.contains('revealed')) {
        _instantReveal();
        return;
      }
      if (currentPage < pages.length - 1) { currentPage++; renderPage(currentPage); }
    };

    _activeEncounterInstance = {
      dialogue: dialogue,
      opts: opts,
      card: card,
      historyEntryId: _currentHistoryEntryId,
      getPages: function() { return pages; },
      setPages: function(p) { pages = p; },
      getCurrentPage: function() { return currentPage; },
      setCurrentPage: function(cp) { currentPage = cp; },
      renderPage: renderPage,
      renderActions: renderActions
    };

    var _startPg = (opts && typeof opts.startPage === 'number' && opts.startPage > 0)
      ? Math.min(opts.startPage, pages.length - 1)
      : 0;
    currentPage = _startPg;
    _saveActiveState(dialogue, opts, currentPage);
    renderPage(_startPg);
  }

  /* Conexão transparente com dados remotos (Ordem do Usuário 2026-10):
     Permite que o diálogo abra a 0ms com narração de aproximação do Mestre e,
     quando a rota HTTP/WebSocket retornar dados dinâmicos, anexe as falas e
     escolhas sem resetar o card, sem reiniciar a animação e sem cortar botões. */
  function attachData(data, newOpts) {
    if (!_activeEncounterInstance || !isOpen()) return false;
    var inst = _activeEncounterInstance;
    var dialogue = inst.dialogue;
    newOpts = newOpts || {};

    if (data.choices) dialogue.choices = data.choices;
    if (newOpts.onChoice) {
      inst.opts.onChoice = newOpts.onChoice;
      if (inst.rawOpts) inst.rawOpts.onChoice = newOpts.onChoice;
    }

    if (data.npc) {
      var resolvedNpc = _vNpcResolve(data.npc, inst.opts) || data.npc;
      dialogue.npc = Object.assign({}, dialogue.npc || {}, resolvedNpc);
      var nameEl = inst.card.querySelector('.enc-name');
      if (nameEl && dialogue.npc.name) nameEl.textContent = dialogue.npc.name;
      var descEl = inst.card.querySelector('.enc-desc');
      if (descEl && dialogue.npc.desc) descEl.textContent = dialogue.npc.desc;
      var portWrap = inst.card.querySelector('.enc-portrait');
      if (portWrap && dialogue.npc.portrait) {
        var safeUrl = String(dialogue.npc.portrait).replace(/"/g, '&quot;');
        portWrap.classList.remove('enc-portrait-fallback');
        var existingImg = portWrap.querySelector('img');
        if (existingImg) {
          existingImg.style.display = '';
          existingImg.src = safeUrl;
        } else {
          portWrap.innerHTML = '<img src="' + safeUrl + '" alt="" ' + _ENC_IMG_ONERR + '>';
        }
      }
    }

    var existingScript = dialogue.script || [];
    var incomingScript = (data.script && Array.isArray(data.script)) ? data.script : [];
    var combinedScript = existingScript.slice();
    incomingScript.forEach(function(incLine) {
      if (!incLine) return;
      var isDup = combinedScript.some(function(extLine) {
        return extLine && extLine.text && _normalizeTextForSeen(extLine.text) === _normalizeTextForSeen(incLine.text);
      });
      if (!isDup) {
        combinedScript.push(incLine);
      }
    });
    dialogue.script = combinedScript;

    // Atualiza histórico com as falas recebidas dinamicamente
    if (incomingScript.length > 0 && typeof window !== 'undefined' && window.vDialogueHistory && typeof window.vDialogueHistory.appendScript === 'function') {
      try {
        var _pAttach = (inst.opts && inst.opts.player) || window.CITY_MOCK_PLAYER || null;
        window.vDialogueHistory.appendScript(incomingScript, inst.historyEntryId, _pAttach);
      } catch (_eHist) {}
    }

    var newPages = _groupScriptIntoPages(combinedScript);
    inst.setPages(newPages);

    var curPage = inst.getCurrentPage();
    var isLastPage = curPage >= newPages.length - 1;

    var pageInd = inst.card.querySelector('#enc-page-ind');
    if (pageInd) {
      if (newPages.length > 1) {
        pageInd.textContent = (curPage + 1) + ' / ' + newPages.length;
        pageInd.style.display = '';
      } else {
        pageInd.style.display = 'none';
      }
    }

    var st = _currentRenderState;
    if (st) {
      st.isLastPage = isLastPage;
      var nextBtn = inst.card.querySelector('#enc-next');
      if (nextBtn) {
        if (!isLastPage) {
          var staleAction = inst.card.querySelector('.enc-nav-action');
          if (staleAction) staleAction.remove();
          nextBtn.style.visibility = 'visible';
          nextBtn.style.display = '';
          nextBtn.removeAttribute('disabled');
          nextBtn.textContent = 'Continuar ▸';
        } else if (st.skipped || curPage === newPages.length - 1) {
          inst.renderActions();
        }
      }
    }
    _saveActiveState(dialogue, inst.opts, curPage);
    return true;
  }

  function close() {
    var prevOpts = _activeEncounterInstance ? _activeEncounterInstance.opts : null;
    _clearActiveState(_resolveStorageCharId(prevOpts));
    closeChoices(true);
    var ov = document.getElementById(OVERLAY_ID);
    // task #69: idempotent state cleanup (also covers edge case where .close()
    // is called but dialog already closed — close event won't fire then).
    if (_currentRenderState && _currentRenderState.activeTypewriters) {
      _currentRenderState.activeTypewriters.forEach(function(tw){ try { tw.skip && tw.skip(); } catch(e){} });
    }
    // task #69: use <dialog>.close() nativo (libera top-layer, restaura focus)
    _closeOverlay(ov);
    _currentRenderState = null;
    _activeEncounterInstance = null;
    if (prevOpts && typeof prevOpts.onClose === 'function') {
      try { prevOpts.onClose(); } catch(e){ console.error('[vEncounter] onClose error', e); }
    }
  }

  function isOpen() {
    var ov = document.getElementById(OVERLAY_ID);
    // task #69: check <dialog>.open OR .active class (compat)
    return _isOverlayOpen(ov);
  }

  // === Public API ===========================================================
  window.vEncounter = {
    render: render,
    attachData: attachData,
    close: close,
    isOpen: isOpen,
    /* task #49 (2026-05-20) — Choice sub-overlay AAA: módulo público
       pra reuso por _renderEncounterPopup legacy + qualquer outro renderer. */
    openChoices: openChoices,
    closeChoices: closeChoices,
    isChoicesOpen: isChoicesOpen,
    openChoiceDetail: _openChoiceDetailDialog,
    closeChoiceDetail: _closeChoiceDetailDialog,
    /* A1.2 (auditoria #90): sanitizer de diálogo CANÔNICO. Whitelist
       i/em/b/strong/br/u/s/code (sem atributos), case-insensitive, NÃO escapa
       & (entidades &mdash; são legítimas). cidade/exploração delegam a ele. */
    sanitize: _sanitizeDialogueHTML,
    /* A1.5 (auditoria #90): paginação canônica de script[]. mode 'aldric'
       (default, PADRAO_ALDRIC) | 'compact' (StubEventLayer exploração). */
    groupScriptIntoPages: groupScriptIntoPages,
    /* Persistência de diálogos, narrativas e escolhas (Ordem do Usuário 2026-10) */
    registerChoiceHandler: registerChoiceHandler,
    hasPersistedState: hasPersistedState,
    getPersistedState: getPersistedState,
    clearPersistedState: _clearActiveState,
    savePersistedState: _saveActiveState,
    restorePersistedState: restorePersistedState
  };

  /* Compat: alias usado por cidade openCityPopup (task #47 dismiss flow). */
  window._vEncChoicesClose = closeChoices;

  console.log('[encounter-popup] PADRAO_ALDRIC engine loaded — vEncounter.{render,openChoices,close} ready');
})();
