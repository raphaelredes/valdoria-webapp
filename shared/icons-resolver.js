/**
 * icons-resolver.js — Troca ícones heráldicos NÃO-item (`<svg><use href="#ic-X">`)
 * por <img> WebP gerado pela OpenAI. Espelha `items-resolver.js` (que cuida de
 * `ic-it-*`), mas para classes/raças/NPCs/glifos de nav/stats/conquistas.
 *
 * REGRA (CLAUDE.md "Tudo Visível é Imagem OpenAI, não SVG" — 2026-06-12 rev.2):
 *   TODO SVG visível do jogo vira imagem OpenAI via <img>. Única exceção: a
 *   Esfera Dourada (logo/favicon, incl. 3D) e os dados 3D (THREE.js). Este
 *   módulo elimina os ícones heráldicos `ic-*` (não-item) das telas do jogador.
 *
 * Como funciona (igual ao items-resolver):
 *   - MutationObserver varre o DOM e substitui todo `<svg><use href="#ic-X">`
 *     (onde X está em ICON_MAP) por `<img src=".../X.webp">`.
 *   - Pula entradas dentro de `<defs>` (as definições `<symbol>` ficam, inertes).
 *   - Não toca em `ic-it-*` (delegado ao items-resolver).
 *
 * API:
 *   vIcons.upgrade(rootEl?)   — varre e troca SVG→IMG (retorna nº trocado)
 *   vIcons.iconHTML(slug,alt) — string `<img>` pronta (ou '' se slug desconhecido)
 *   vIcons.has(slug)          — true se o ícone tem WebP mapeado
 */
(function (global) {
  'use strict';

  var SPRITE_PREFIX = 'ic-';

  /* slug (sem o `ic-`) → subpath sob shared/img/. Todos já existem como WebP
     gerado pela OpenAI (verificado 2026-06-12: 32/32). */
  /* slug (sem `ic-`) → subpath webp sob shared/img/. Todos já existem como WebP
     OpenAI (verificado 2026-06-12). União dos símbolos `ic-*` definidos com webp +
     NPCs com render-site. ~31 `ic-*` ainda SEM webp (enemy-*, stat-cha/con/dex/int/
     str/wis/prof/spelldc/exhaustion, banco, bolsa, cofre, coroa, desafio, liga-*,
     luz-do-dia, luzes-dancantes, raio, sino, taverna, templo, truque-luz) ficam
     pra geração — ver docs/sistemas/svg-to-openai-migration.md (Fase 1b). */
  var ICON_MAP = {
    'acampamento': 'ui/acampamento.webp',
    'ach-algoz': 'achievements/ach-algoz.webp',
    'ach-andarilho': 'achievements/ach-andarilho.webp',
    'ach-aventureiro': 'achievements/ach-aventureiro.webp',
    'ach-cacador': 'achievements/ach-cacador.webp',
    'ach-cartografo': 'achievements/ach-cartografo.webp',
    'ach-cofreiro': 'achievements/ach-cofreiro.webp',
    'ach-colecionador': 'achievements/ach-colecionador.webp',
    'ach-devoto': 'achievements/ach-devoto.webp',
    'ach-diplomata': 'achievements/ach-diplomata.webp',
    'ach-erudito': 'achievements/ach-erudito.webp',
    'ach-forjador': 'achievements/ach-forjador.webp',
    'ach-indomavel': 'achievements/ach-indomavel.webp',
    'ach-mestre': 'achievements/ach-mestre.webp',
    'ach-sobrevivente': 'achievements/ach-sobrevivente.webp',
    'ajuda': 'ui/ajuda.webp',
    'aldeao': 'npcs/aldeao.webp',
    'alquimista': 'npcs/alquimista.webp',
    'anao': 'ui/anao.webp',
    'animal_companion': 'combat/animal-companion.webp',
    'aranha': 'ui/aranha.webp',
    'arena': 'city/arena.webp',
    'bandido': 'combat/enemies/bandido-2.webp',
    'banqueiro': 'npcs/banqueiro.webp',
    'barbaro': 'combat/barbaro.webp',
    'bardo': 'combat/bardo.webp',
    'boss': 'combat/boss.webp',
    'bruxo': 'combat/bruxo.webp',
    'cartas': 'ui/cartas.webp',
    'cartografia': 'ui/cartografia.webp',
    'cavaleiro': 'combat/guerreiro.webp',
    'cavalo': 'ui/cavalo.webp',
    'cerveja': 'ui/cerveja.webp',
    'cidadao': 'npcs/aldeao.webp',
    'clerigo': 'combat/clerigo.webp',
    'comer': 'items/pao-fresco.webp',
    'compendio': 'ui/compendio.webp',
    'cordas': 'ui/cordas.webp',
    'crianca': 'ui/crianca.webp',
    'cura': 'combat/effects/cura.webp',
    'dialogo': 'ui/dialogo.webp',
    'druida': 'combat/druida.webp',
    'elfo': 'ui/elfo.webp',
    'engrenagem': 'items/engrenagem.webp',
    'escriba': 'npcs/escriba.webp',
    'esqueleto': 'combat/enemies/esqueleto.webp',
    'estalagem': 'ui/estalagem.webp',
    'estalajadeira': 'npcs/estalajadeira.webp',
    'familiar': 'combat/familiar.webp',
    'feiticeiro': 'combat/feiticeiro.webp',
    'ferreiro': 'npcs/ferreiro.webp',
    'festival': 'city/festival.webp',
    'ficha': 'ui/ficha.webp',
    'find_steed': 'combat/find-steed.webp',
    'fonte': 'ui/fonte.webp',
    'goblin': 'combat/enemies/goblin.webp',
    'grupo': 'ui/grupo.webp',
    'guerreiro': 'combat/guerreiro.webp',
    'inimigo': 'combat/inimigo.webp',
    'joalheiro': 'npcs/joalheiro.webp',
    'ladino': 'combat/ladino.webp',
    'lobo': 'combat/enemies/lobo.webp',
    'mago': 'combat/mago.webp',
    'mensagem': 'ui/mensagem.webp',
    'mercado': 'ui/mercado.webp',
    'missoes': 'ui/missoes.webp',
    'missões': 'ui/missoes.webp',
    'mochila': 'items/mochila.webp',
    'monge': 'combat/monge.webp',
    'musica': 'combat/effects/musica.webp',
    'oficina': 'ui/oficina.webp',
    'orc': 'combat/enemies/orc.webp',
    'paladino': 'combat/paladino.webp',
    'patrulheiro': 'combat/patrulheiro.webp',
    'portal': 'ui/portal.webp',
    'portoes': 'ui/portoes.webp',
    'pergaminho': 'ui/missoes.webp',
    'pocao': 'ui/pocao.webp',
    'praca': 'ui/praca.webp',
    'runas': 'ui/runas.webp',
    'som': 'ui/som.webp',
    'sono': 'combat/skills/sono.webp',
    'spiritual-weapon': 'combat/spiritual-weapon.webp',
    'sprite': 'combat/sprite.webp',
    'stat-ac': 'ui/stat-ac.webp',
    'stat-attack': 'ui/stat-attack.webp',
    'stat-hp': 'ui/stat-hp.webp',
    'stat-mp': 'ui/stat-mp.webp',
    'summon': 'combat/summon.webp',
    'taverneiro': 'npcs/taverneiro.webp',
    'tochas': 'ui/tochas.webp',
    'trofeu': 'achievements/trofeu.webp',
    // Fase 1b (2026-06-12): 31 gerados via OpenAI (_gen_missing_icon_images.py)
    'enemy-beast': 'combat/enemy-beast.webp',
    'enemy-fey': 'combat/enemy-fey.webp',
    'enemy-humanoid': 'combat/enemy-humanoid.webp',
    'enemy-monstrosity': 'combat/enemy-monstrosity.webp',
    'enemy-undead': 'combat/enemy-undead.webp',
    'stat-str': 'ui/stat-str.webp',
    'stat-dex': 'ui/stat-dex.webp',
    'stat-con': 'ui/stat-con.webp',
    'stat-int': 'ui/stat-int.webp',
    'stat-wis': 'ui/stat-wis-v2.webp',
    'stat-cha': 'ui/stat-cha-v2.webp',
    'stat-prof': 'ui/stat-prof.webp',
    'stat-spelldc': 'ui/stat-spelldc.webp',
    'stat-exhaustion': 'ui/stat-exhaustion.webp',
    'banco': 'ui/banco.webp',
    'bolsa': 'ui/bolsa.webp',
    'cofre': 'ui/cofre.webp',
    'coroa': 'ui/coroa.webp',
    'desafio': 'ui/desafio.webp',
    'taverna': 'ui/taverna.webp',
    'templo': 'ui/templo.webp',
    'sino': 'ui/sino.webp',
    'liga-bronze': 'ui/liga-bronze.webp',
    'liga-prata': 'ui/liga-prata.webp',
    'liga-ouro': 'ui/liga-ouro.webp',
    'liga-platina': 'ui/liga-platina.webp',
    'liga-mithral': 'ui/liga-mithral.webp',
    'luz-do-dia': 'combat/skills/luz-do-dia-v2.webp',
    'luzes-dancantes': 'combat/skills/luzes-dancantes-v2.webp',
    'raio': 'combat/skills/raio.webp',
    'truque-luz': 'combat/skills/truque-luz-v2.webp',
  };

  var _currentScript = (typeof document !== 'undefined' && document.currentScript) || null;

  function detectScriptBase() {
    if (_currentScript && _currentScript.src) {
      var clean = _currentScript.src.split('?')[0];
      var idx = clean.indexOf('/shared/icons-resolver.js');
      if (idx >= 0) return clean.substring(0, idx + 1);
    }
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      if (src.indexOf('icons-resolver.js') !== -1) {
        var c2 = src.split('?')[0];
        var i2 = c2.indexOf('/shared/icons-resolver.js');
        if (i2 >= 0) return c2.substring(0, i2 + 1);
      }
    }
    if (typeof location !== 'undefined' && location.origin) return location.origin + '/';
    return '';
  }

  var scriptBase = detectScriptBase();
  var imgBase = scriptBase + 'shared/img/';

  function has(slug) {
    return Object.prototype.hasOwnProperty.call(ICON_MAP, slug);
  }

  /* NÃO seta src aqui — o caller (swapUse) anexa onload/onerror ANTES de setar
     src, senão imagem cacheada dispara `load` antes do handler existir e o swap
     nunca ocorre (bug real: ícone re-renderizado/cacheado ficaria como SVG). */
  function buildImg(slug, altText) {
    var img = new Image();
    img.alt = altText || slug;
    img.setAttribute('data-icon-slug', slug);
    return img; // tamanho é definido em swapUse (a partir do box do <svg>)
  }

  /* Substitui um <use href="#ic-X"> por <img> WebP, se X estiver no ICON_MAP.
     Pula ic-it-* (items-resolver) e entradas em <defs>. */
  function swapUse(useEl) {
    var href = useEl.getAttribute('href') || useEl.getAttribute('xlink:href') || '';
    if (href.indexOf('#' + SPRITE_PREFIX) !== 0) return false;
    var slug = href.substring(1 + SPRITE_PREFIX.length); // strip "#ic-"
    if (slug.indexOf('it-') === 0) return false;          // item → items-resolver
    if (!has(slug)) return false;
    var svgEl = useEl.closest('svg');
    if (!svgEl || svgEl.closest('defs')) return false;    // não trocar as defs
    if (svgEl.getAttribute('data-icon-swapped') === '1') return false;
    var img = buildImg(slug, slug);
    // Preserva a APARÊNCIA exata do <svg>: mesma classe + MESMO tamanho que ele
    // ocupava. Antes forçávamos width/height:100% → o <img> enchia containers
    // grandes → ícone GIGANTE. Agora medimos o box renderizado do <svg> e fixamos
    // em px (fallback: atributos width/height; rede de segurança: max 100% do pai).
    var cls = svgEl.getAttribute('class');
    if (cls) img.setAttribute('class', cls);
    var rect = svgEl.getBoundingClientRect();
    var aw = svgEl.getAttribute('width');
    var ah = svgEl.getAttribute('height');
    if (rect && rect.width > 0) img.style.width = Math.round(rect.width) + 'px';
    else if (aw) img.style.width = /^[0-9.]+$/.test(aw) ? aw + 'px' : aw;
    if (rect && rect.height > 0) img.style.height = Math.round(rect.height) + 'px';
    else if (ah) img.style.height = /^[0-9.]+$/.test(ah) ? ah + 'px' : ah;
    img.style.objectFit = 'contain';
    img.style.verticalAlign = 'middle';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    var doSwap = function () {
      if (svgEl.getAttribute('data-icon-swapped') === '1') return;
      svgEl.setAttribute('data-icon-swapped', '1');
      if (svgEl.parentNode) svgEl.parentNode.replaceChild(img, svgEl);
    };
    img.onload = doSwap;
    img.onerror = function () { /* mantém SVG como último recurso */ };
    img.src = imgBase + ICON_MAP[slug]; // src DEPOIS dos handlers
    if (img.complete && img.naturalWidth > 0) doSwap(); // cacheada: load já disparou
    return true;
  }

  function upgrade(rootEl) {
    rootEl = rootEl || document;
    var uses = rootEl.querySelectorAll ? rootEl.querySelectorAll('svg use') : [];
    var n = 0;
    for (var i = 0; i < uses.length; i++) {
      if (swapUse(uses[i])) n++;
    }
    if (n) console.info('[icons-resolver]', n, 'ic-* heráldicos trocados por WebP');
    return n;
  }

  function iconHTML(slug, altText) {
    if (!has(slug)) return '';
    var alt = (altText || slug).replace(/"/g, '&quot;');
    return '<img src="' + imgBase + ICON_MAP[slug] + '" alt="' + alt +
      '" style="width:100%;height:100%;object-fit:contain" loading="lazy" data-icon-slug="' + slug + '">';
  }

  global.vIcons = { upgrade: upgrade, iconHTML: iconHTML, has: has, _map: ICON_MAP };

  /* Auto-swap via MutationObserver — captura ícones adicionados dinamicamente. */
  function tryNode(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.tagName === 'USE' || node.localName === 'use') { swapUse(node); return; }
    var uses = node.querySelectorAll && node.querySelectorAll('svg use');
    if (uses && uses.length) for (var i = 0; i < uses.length; i++) swapUse(uses[i]);
  }

  function start() {
    if (typeof MutationObserver === 'undefined' || !document.body) {
      if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
      }
      return;
    }
    tryNode(document.body);
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.addedNodes && m.addedNodes.length) {
          for (var j = 0; j < m.addedNodes.length; j++) tryNode(m.addedNodes[j]);
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    global.vIcons._observer = obs;
    console.info('[icons-resolver] MutationObserver auto-swap active (' +
      Object.keys(ICON_MAP).length + ' ícones)');
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  }
})(typeof window !== 'undefined' ? window : this);
