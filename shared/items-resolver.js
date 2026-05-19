/**
 * items-resolver.js — Resolve item slug to image source (PNG > SVG fallback).
 *
 * Uso:
 *   1. Inclua este script: <script src="/shared/items-resolver.js"></script>
 *   2. Chame na inicialização: vItems.upgrade();
 *      → Substitui todos <svg><use href="#ic-it-{slug}"/></svg> dentro de
 *        elements com class .item-icon que tiverem data-name no parent .item-card
 *        por <img> apontando para o PNG AI-generated quando disponível.
 *
 * API:
 *   vItems.upgrade(rootEl?)              — varre o DOM e substitui SVG→IMG
 *   vItems.resolve(slug, callback)       — retorna 'png' | 'svg' para um slug
 *   vItems.preloadManifest()             — força carregamento antecipado do manifest
 *   vItems.has(slug)                     — true se slug tem PNG disponível
 *   vItems.iconHTML(slug, name)          — retorna HTML pronto (img ou svg use)
 *
 * O módulo carrega manifest.json uma vez e cacheia em window.vItemsManifest.
 */
(function (global) {
  'use strict';

  var SVG_SPRITE_PREFIX = 'ic-it-';

  // Detect base via script src. Captured immediately on parse via
  // document.currentScript (reliable across HTTP and file://). Fallback
  // scans all script tags by name.
  var _currentScript = (typeof document !== 'undefined' && document.currentScript) || null;

  function detectScriptBase() {
    // Approach 1: document.currentScript (most reliable)
    if (_currentScript && _currentScript.src) {
      var clean = _currentScript.src.split('?')[0];
      var idx = clean.indexOf('/shared/items-resolver.js');
      if (idx >= 0) return clean.substring(0, idx + 1);
    }
    // Approach 2: scan all script tags (fallback if currentScript unavailable)
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      if (src.indexOf('items-resolver.js') !== -1) {
        var clean2 = src.split('?')[0];
        var idx2 = clean2.indexOf('/shared/items-resolver.js');
        if (idx2 >= 0) return clean2.substring(0, idx2 + 1);
      }
    }
    // Approach 3: hardcoded fallback for HTTP deployments
    if (typeof location !== 'undefined' && location.origin) {
      return location.origin + '/';
    }
    return '';
  }

  var cfg = (typeof window !== 'undefined' && window.vItemsConfig) || {};
  var scriptBase = detectScriptBase();
  var manifestUrl = cfg.manifestUrl || (scriptBase + 'shared/img/items/manifest.json');
  var pngBase = cfg.pngBase || (scriptBase + 'shared/img/items/');

  var manifestState = {
    loaded: false,
    loading: null, // Promise while loading
    slugs: {},     // {slug: true}
    error: null,
  };

  /* ============================================================
   * BASE_TO_SLUG (2026-05-19): mapping de SVG IDs `base-*` do
   * design system para slugs reais do manifest. Resolve gap:
   * código usa `<svg><use href="#ic-it-base-longsword">` mas o
   * PNG está como `espada-longa.png`. Sem isso, items-resolver
   * não substitui SVG por PNG.
   *
   * 89 mapeamentos pra items que JA TEM PNG + 10 truly missing
   * gerados via _gen_base_templates.py.
   * ============================================================ */
  var BASE_TO_SLUG = {
    // Espadas
    'base-longsword': 'espada-longa',
    'base-shortsword': 'espada-curta',
    'base-greatsword': 'espada-elfica',
    'base-training-sword': 'espada-de-treino',
    // Adagas/Punhais
    'base-dagger': 'adaga',
    'base-cerimonial-dagger': 'adaga',
    'base-rapier': 'florete',
    'base-scimitar': 'cimitarra',
    // Maças/Martelos
    'base-mace': 'maca',
    'base-warhammer': 'martelo-de-guerra',
    'base-light-hammer': 'martelo-de-guerra',
    'base-maul': 'marreta',
    'base-flail': 'mangual',
    'base-morningstar': 'mangual-estrela',
    // Machados
    'base-handaxe': 'machadinha',
    'base-battleaxe': 'machado-de-batalha',
    'base-greataxe': 'machado-grande',
    // Outras armas brancas
    'base-whip': 'foice',
    'base-sickle': 'foice',
    'base-pike': 'lanca',
    'base-spear': 'lanca',
    'base-trident': 'tridente',
    'base-glaive': 'glaive',
    'base-halberd': 'alabarda',
    'base-warpick': 'picareta-mineiro',
    // Distancia
    'base-shortbow': 'arco-curto',
    'base-longbow': 'arco-longo',
    'base-light-crossbow': 'besta-leve',
    'base-heavy-crossbow': 'besta-pesada',
    'base-hand-crossbow': 'besta-leve',
    'base-sling': 'dardo',
    'base-dart': 'dardo',
    'base-broken-arrow': 'flecha-quebrada',
    // Cajados/Focos magicos
    'base-quarterstaff': 'cajado-de-aprendiz',
    'base-mage-staff': 'bordao',
    'base-willow-staff': 'cajado-de-salgueiro',
    'base-wand': 'varinha-de-mago-de-guerra-+1',
    'base-orb': 'orbe-arcano-+1',
    'base-druid-totem': 'totem-druidico',
    // Armaduras
    'base-padded-armor': 'armadura-acolchoada',
    'base-leather-chest': 'armadura-de-couro',
    'base-studded-leather': 'couro-batido',
    'base-hide-armor': 'gibao-de-peles',
    'base-chainmail-tunic': 'cota-de-malha',
    'base-scale-mail': 'cota-de-escamas',
    'base-breastplate': 'peitoral-de-couro',
    'base-splint-mail': 'cota-de-escamas',
    'base-full-plate': 'placa-completa',
    // Escudos/Elmos/Vestuario
    'base-shield-buckler': 'escudo-pequeno',
    'base-shield-round': 'escudo',
    'base-shield-heater': 'escudo-de-aco',
    'base-iron-helm': 'elmo-de-ferro-bruto',
    'base-leather-cap': 'elmo-de-couro',
    'base-cloak': 'capa-da-confianca',
    'base-boot': 'botas-de-couro',
    'base-bracer': 'braceletes-de-defesa',
    // Acessorios
    'base-amulet': 'amuleto-da-sorte',
    'base-ring-gem': 'anel-de-ouro',
    'base-belt': 'cinto-de-ferro',
    'base-coin-pouch': 'bolsa-de-moedas-falsa',
    'base-holy-symbol': 'simbolo-sagrado-+1',
    // Pocoes/Frascos
    'base-potion-bottle': 'pocao-de-cura',
    'base-potion-vial': 'pocao-de-cura',
    'base-thrown-flask': 'pocao-de-cura',
    'base-poison-bottle': 'pseudopode-preservado',
    'base-powder-jar': 'pote-de-po-magico',
    'base-honey-jar': 'pocao-de-cura',
    // Comida/Provisoes
    'base-meal-bowl': 'racoes-de-7-dias',
    'base-meat-cooked': 'racoes-de-7-dias',
    'base-mushroom': 'cogumelos-selvagens',
    'base-mug': 'racoes-de-7-dias',
    'base-bag-rations': 'racoes-de-7-dias',
    // Acampamento/Utilidades
    'base-torch': 'tochas-5',
    'base-candle': 'vela',
    'base-lantern': 'tochas-5',
    'base-rope': 'corda-de-canhamo-(15m)',
    'base-mining-pick': 'picareta-mineiro',
    'base-lockpick': 'gazua',
    'base-bandage': 'ataduras-medicinais',
    'base-leather-roll': 'rolo-de-couro',
    // Truques/Trinkets
    'base-caltrop': 'estrepes',
    'base-spike': 'espigao-de-ferro',
    'base-smoke-bomb': 'pote-de-po-magico',
    'base-sticky-blob': 'goma-grude',
    'base-bone': 'osso',
    'base-eye': 'olho-de-bruxa-verde',
    'base-pelt': 'pele-de-lobo',
    'base-ingot': 'ferro-bruto',
    'base-gear': 'engrenagem',
    'base-gem-faceted': 'esmeralda',
    'base-gem-pearl': 'perola',
    'base-crystal-raw': 'cristal-bruto',
    'base-essence': 'essencia-arcana',
    'base-leaf-magic': 'folha-magica',
    'base-coal': 'carvao',
    // Documentos/Musica
    'base-scroll': 'pergaminho-antigo',
    'base-tome': 'tomo-de-conhecimento',
    'base-music-sheet': 'alaude-do-canto-estelar',
    'base-lute': 'alaude-do-canto-estelar',
    // ─── 2026-05-19 batch (282 entries) — eliminate SVG sprite ───
    'acido-anqueque': 'acido-de-anqueque',
    'adaga-1': 'adaga',
    'adaga-arremesso': 'adaga-de-arremesso',
    'adaga-beco': 'adaga-do-beco',
    'adaga-sombras': 'adaga-das-sombras',
    'adesivo-mimic': 'adesivo-de-mimic',
    'alabarda-1': 'alabarda',
    'alaude-canto-estelar': 'alaude-do-canto-estelar',
    'amuleto-armadura-natural': 'amuleto-de-armadura-natural',
    'amuleto-lobo': 'amuleto-do-lobo',
    'amuleto-saude': 'amuleto-de-saude',
    'amuleto-sorte': 'amuleto-da-sorte',
    'amuleto-vitalidade': 'amuleto-de-vitalidade',
    'anel-alvorecer': 'anel-do-alvorecer',
    'anel-cobre': 'anel-de-cobre',
    'anel-ouro': 'anel-de-ouro',
    'anel-prata': 'anel-de-prata',
    'anel-protecao': 'anel-de-protecao',
    'anel-resistencia': 'anel-de-resistencia',
    'antena-centopeia': 'antena-de-centopeia',
    'antena-ferrugem': 'antena-de-ferrugem',
    'arco-caca': 'arco-de-caca',
    'arco-curto-1': 'arco-curto',
    'arco-guardiao-silvestre': 'arco-do-guardiao-silvestre',
    'arco-longo-1': 'arco-longo',
    'arma-magica-1': 'arma-magica-+1',
    'armadura-couro': 'armadura-de-couro',
    'armadura-couro-1': 'armadura-de-couro',
    'artefato-vale': 'artefato-do-vale',
    'balsamo-cura': 'balsamo-de-cura',
    'bandagem-mumia': 'bandagem-de-mumia',
    'bandana-suja-tool': 'ataduras-medicinais',
    'base-balanced-dagger': 'adaga',
    'base-bone-helm': 'elmo-da-telepatia',
    'base-bread': 'racoes-de-7-dias',
    'base-claw': 'garra-de-carnical',
    'base-cloth-hood': 'capuz-de-tecido',
    'base-club': 'marreta',
    'base-compass': 'fragmento-de-mapa-antigo',
    'base-crown': 'amuleto-da-sorte',
    'base-ear': 'orelha-de-goblin',
    'base-fang': 'presa-de-javali',
    'base-feather': 'pena-de-cocatrice',
    'base-glove': 'manoplas-de-forca-de-ogro',
    'base-grimoire': 'grimorio-do-aprendiz',
    'base-herb-bunch': 'cogumelos-selvagens',
    'base-herb-leaf': 'folha-da-driade',
    'base-horn': 'chifre-de-alce',
    'base-junk-cloth': 'ataduras-medicinais',
    'base-key': 'chave-da-aurora',
    'base-knight-helm': 'elmo-da-telepatia',
    'base-map': 'fragmento-de-mapa-antigo',
    'base-moss-clump': 'cogumelos-selvagens',
    'base-ring-band': 'anel-de-ouro',
    'base-rune-fragment': 'fragmento-runico-ancestral',
    'base-rune-stone': 'runa-de-absorcao',
    'base-scale': 'escama-de-dragao-branco',
    'base-shield-kite': 'escudo',
    'base-skull': 'colar-de-ossos',
    'base-spyglass': 'fragmento-de-mapa-antigo',
    'base-tent': 'tenda-do-artesao',
    'base-tentacle': 'tentaculo-de-pantera-sombria',
    'bencao-tyr': 'simbolo-sagrado-+1',
    'besta-leve-1': 'besta-leve',
    'besta-mao': 'besta-de-mao',
    'bico-axe-beak': 'bico-de-axe-beak',
    'bico-urso-coruja': 'bico-de-urso-coruja',
    'bolsa-moedas-falsa': 'bolsa-de-moedas-falsa',
    'bomba-fumaca': 'bomba-de-fumaca',
    'bordao-1': 'bordao',
    'botas-couro': 'botas-de-couro',
    'botas-velocidade': 'botas-de-velocidade',
    'braceletes-defesa': 'braceletes-de-defesa',
    'braceletes-ferro': 'braceletes-de-ferro',
    'brunea-aneis': 'brunea-de-aneis',
    'cabeca-chimera': 'cabeca-de-chimera',
    'cajado-aprendiz': 'cajado-de-aprendiz',
    'cajado-salgueiro': 'cajado-de-salgueiro',
    'cantil-couro': 'cantil-de-couro',
    'capa-deslocamento': 'capa-de-deslocamento',
    'capa-guardiao-silvestre': 'capa-do-guardiao-silvestre',
    'capa-meia-noite': 'capa-da-meia-noite',
    'capa-protecao': 'capa-de-protecao',
    'capa-viajante': 'capa-de-viajante',
    'capuz-lamento-sombrio': 'capuz-do-lamento-sombrio',
    'capuz-tecido': 'capuz-de-tecido',
    'carapaca-anqueque': 'carapaca-de-anqueque',
    'carne-carnical': 'carne-de-carnical',
    'cauda-rato': 'cauda-de-rato',
    'chapeu-arcanista': 'chapeu-do-arcanista',
    'chapeu-disfarce': 'chapeu-de-disfarce',
    'chave-abismo': 'chave-do-abismo',
    'chave-aurora': 'chave-da-aurora',
    'chave-crepusculo': 'chave-do-crepusculo',
    'chave-porao': 'chave-do-porao',
    'chifre-alce': 'chifre-de-alce',
    'cimitarra-1': 'cimitarra',
    'cinto-ferro': 'cinto-de-ferro',
    'cinto-utilidades': 'cinto-de-utilidades',
    'cinturao-destreza': 'cinturao-de-destreza',
    'cinturao-forca-gigante': 'cinturao-de-forca-do-gigante',
    'circlet-explosao': 'circlet-da-explosao',
    'colar-bolas-fogo': 'colar-de-bolas-de-fogo',
    'colar-dentes': 'colar-de-dentes',
    'colar-ossos': 'colar-de-ossos',
    'colar-ouro': 'colar-de-ouro',
    'corda-canhamo': 'corda-de-canhamo-(15m)',
    'corda-escalada': 'corda-de-escalada',
    'corda-linho': 'corda-de-linho',
    'cota-escamas': 'cota-de-escamas',
    'cota-malha': 'cota-de-malha',
    'cota-malha-1': 'cota-de-malha',
    'cota-malha-2': 'cota-de-malha',
    'cota-malha-enferrujada': 'cota-de-malha-enferrujada',
    'cota-talas': 'cota-de-talas',
    'couraca-protetor-ancestral': 'couraca-do-protetor-ancestral',
    'couro-ettin': 'couro-de-ettin',
    'couro-javali': 'couro-de-javali',
    'cristal-convergencia': 'cristal-de-convergencia',
    'dente-crocodilo': 'dente-de-crocodilo',
    'dente-gnoll': 'dente-de-gnoll',
    'dente-mimic': 'dente-de-mimic',
    'dente-ogro': 'dente-de-ogro',
    'dente-rato': 'dente-de-rato',
    'dente-roper': 'dente-de-roper',
    'diario-edric': 'diario-de-edric',
    'elmo-couro': 'elmo-de-couro',
    'elmo-ossos': 'elmo-de-ossos',
    'elmo-protecao-1': 'elmo-da-telepatia',
    'elmo-protetor-ancestral': 'elmo-do-protetor-ancestral',
    'elmo-telepatia': 'elmo-da-telepatia',
    'escama-dragao-branco': 'escama-de-dragao-branco',
    'escama-kobold': 'escama-de-kobold',
    'escama-lagarto': 'escama-de-lagarto',
    'escudo-1': 'escudo',
    'escudo-aco': 'escudo-de-aco',
    'escudo-aco-1': 'escudo-de-aco',
    'escudo-aco-2': 'escudo-de-aco',
    'escudo-generic': 'escudo',
    'escudo-madeira': 'escudo-de-madeira',
    'escudo-pedra': 'escudo-de-pedra',
    'escudo-protetor-ancestral': 'escudo-do-protetor-ancestral',
    'escudo-redencao': 'escudo-da-redencao',
    'esferas-aco': 'esferas-de-aco',
    'espada-curta-1': 'espada-curta',
    'espada-longa-1': 'espada-longa',
    'espada-longa-2': 'espada-longa',
    'espada-treino': 'espada-de-treino',
    'espinho-manticora': 'espinho-de-manticora',
    'ferrao-viverna': 'ferrao-de-viverna',
    'foco-druidico-1': 'foco-druidico-+1',
    'folha-driade': 'folha-da-driade',
    'fragmento-mapa': 'fragmento-do-mapa',
    'fragmento-obsidiana': 'fragmento-de-obsidiana',
    'fragmento-pacto': 'fragmento-do-pacto',
    'frasco-acido': 'frasco-de-acido',
    'frasco-luz-estelar': 'frasco-de-luz-estelar',
    'frasco-veneno': 'frasco-de-veneno',
    'garra-carnical': 'garra-de-carnical',
    'garra-urso': 'garra-de-urso',
    'garras-lobo-selvagem': 'garras-do-lobo-selvagem',
    'gema-gelo-draconico': 'gema-de-gelo-draconico',
    'gibao-lobo-selvagem': 'gibao-do-lobo-selvagem',
    'gibao-peles': 'gibao-de-peles',
    'glandula-veneno': 'glandula-de-veneno',
    'grimorio-aprendiz': 'grimorio-do-aprendiz',
    'juba-leao': 'juba-de-leao',
    'kit-acampamento': 'kit-de-acampamento',
    'kit-escalada': 'kit-de-escalada',
    'kit-reparo': 'kit-de-reparo',
    'lamina-lamento-sombrio': 'lamina-do-lamento-sombrio',
    'lamina-thorne': 'lamina-de-thorne',
    'lamina-veterano': 'lamina-do-veterano',
    'lanca-1': 'lanca',
    'lanterna-mineiro': 'lanterna-de-mineiro',
    'lingote-ferro': 'lingote-de-ferro',
    'lingote-mithral': 'lingote-de-mithral',
    'lingote-ouro': 'lingote-de-ouro',
    'lingote-prata': 'lingote-de-prata',
    'luvas-couro': 'luvas-de-couro',
    'maca-1': 'maca',
    'maca-estrela': 'maca-de-estrela',
    'machado-batalha': 'machado-de-batalha',
    'machado-batalha-lascado': 'machado-de-batalha-lascado',
    'machado-furia-montanhas': 'machado-da-furia-das-montanhas',
    'machado-grande-1': 'machado-grande',
    'machado-guerra-1': 'machado-da-furia-das-montanhas',
    'machado-montanha': 'machado-de-montanha',
    'machado-pedra': 'machado-de-pedra',
    'manoplas-forca-ogro': 'manoplas-de-forca-de-ogro',
    'manto-arcanista': 'manto-do-arcanista',
    'manto-crepusculo': 'manto-do-crepusculo',
    'manto-devoto-solar': 'manto-do-devoto-solar',
    'manto-morcego': 'manto-do-morcego',
    'manto-resistencia': 'manto-da-resistencia',
    'mapa-deserto': 'mapa-do-deserto',
    'mapa-ermo-gelado': 'mapa-do-ermo-gelado',
    'mapa-floresta': 'mapa-da-floresta',
    'mapa-masmorra': 'mapa-da-masmorra',
    'mapa-montanhas': 'mapa-das-montanhas',
    'mapa-pantano': 'mapa-do-pantano',
    'mapa-planicies': 'mapa-das-planicies',
    'mapa-valdoria': 'mapa-de-valdoria',
    'martelo-guerra': 'martelo-de-guerra',
    'martelo-guerra-1': 'martelo-de-guerra',
    'medalhao-pensamentos': 'medalhao-de-pensamentos',
    'membrana-manto-negro': 'membrana-de-manto-negro',
    'minerio-ferro-puro': 'minerio-de-ferro-puro',
    'montante-1': 'montante',
    'olho-bruxa-verde': 'olho-de-bruxa-verde',
    'olho-grimlock': 'olho-de-grimlock',
    'orbe-arcanista': 'orbe-do-arcanista',
    'orbe-arcano-1': 'orbe-arcano-+1',
    'orelha-goblin': 'orelha-de-goblin',
    'pagina-grimorio': 'pagina-do-grimorio',
    'pagina-ritual': 'pagina-de-ritual',
    'pedra-afiar': 'pedra-de-afiar',
    'pedra-gigante': 'pedra-de-gigante',
    'pedra-sorte': 'pedra-da-sorte',
    'peitoral-furia-montanhas': 'peitoral-da-furia-das-montanhas',
    'pele-cobra-gigante': 'pele-de-cobra-gigante',
    'pele-lobo': 'pele-de-lobo',
    'pele-pantera-sombria': 'pele-de-pantera-sombria',
    'pele-sapo-gigante': 'pele-de-sapo-gigante',
    'pele-urso': 'pele-de-urso',
    'pelo-texugo': 'pelo-de-texugo',
    'pena-cocatrice': 'pena-de-cocatrice',
    'pena-hipogrifo': 'pena-de-hipogrifo',
    'pena-urso-coruja': 'pena-de-urso-coruja',
    'pergaminho-branco': 'pergaminho-em-branco',
    'pergaminho-viajante': 'pergaminho-do-viajante',
    'periapto-cura': 'periapto-de-cura',
    'picareta-guerra': 'picareta-de-guerra',
    'picareta-mineracao': 'picareta-de-mineracao',
    'po-diamante': 'po-de-diamante',
    'po-fogo-fatuo': 'po-de-fogo-fatuo',
    'pocao-cura': 'pocao-de-cura',
    'pocao-cura-maior': 'pocao-de-cura-maior',
    'pocao-cura-superior': 'pocao-de-cura-superior',
    'pocao-cura-suprema': 'pocao-de-cura-suprema',
    'pocao-heroismo': 'pocao-de-heroismo',
    'pocao-invisibilidade': 'pocao-de-invisibilidade',
    'pocao-resist-fogo': 'pocao-de-resistencia-ao-fogo',
    'pocao-resist-frio': 'pocao-de-resistencia-ao-frio',
    'pocao-velocidade': 'pocao-de-velocidade',
    'presa-javali': 'presa-de-javali',
    'presa-lobo': 'presa-de-lobo',
    'presa-worg': 'presa-de-worg',
    'pseudopode': 'pseudopode-preservado',
    'racoes-viagem': 'racoes-de-viagem',
    'rapieira-1': 'rapieira',
    'receita-martha': 'receita-especial-de-martha',
    'reliquia-torre': 'reliquia-da-torre',
    'runa-absorcao': 'runa-de-absorcao',
    'runa-chamas': 'runa-de-chamas',
    'runa-cura': 'runa-de-cura',
    'runa-devastacao': 'runa-de-devastacao',
    'runa-fortuna': 'runa-de-fortuna',
    'runa-gelo': 'runa-de-gelo',
    'runa-precisao': 'runa-de-precisao',
    'runa-protecao': 'runa-de-protecao',
    'runa-trovao': 'runa-de-trovao',
    'runa-vigor': 'runa-de-vigor',
    'saco-dormir': 'saco-de-dormir',
    'saco-ingredientes': 'saco-de-ingredientes',
    'saco-ouro-roubado': 'saco-de-ouro-roubado',
    'sangue-troll': 'sangue-de-troll',
    'seda-aranha': 'seda-de-aranha',
    'simbolo-sagrado-1': 'simbolo-sagrado-+1',
    'tentaculo-pantera-sombria': 'tentaculo-de-pantera-sombria',
    'tentaculo-rastejante': 'tentaculo-de-rastejante',
    'tentaculo-roper': 'tentaculo-de-roper',
    'tiara-conhecimento': 'tiara-do-conhecimento',
    'tocha': 'tochas-5',
    'tomo-conhecimento': 'tomo-de-conhecimento',
    'tunica-protecao': 'tunica-de-protecao',
    'varinha-mago-guerra-1': 'varinha-de-mago-de-guerra-+1',
    'veste-arcanista': 'veste-do-arcanista',
    'veste-sacerdote': 'veste-do-sacerdote',
    'vestes-canto-estelar': 'vestes-do-canto-estelar',
  };

  /* Resolve `ic-it-{X}` (X pode ser base-Y ou slug direto) ao slug real. */
  function resolveSlug(rawSlug) {
    if (!rawSlug) return null;
    var s = String(rawSlug);
    if (BASE_TO_SLUG.hasOwnProperty(s)) return BASE_TO_SLUG[s];
    return s;
  }

  function loadManifest() {
    if (manifestState.loaded || manifestState.loading) {
      return manifestState.loading || Promise.resolve();
    }
    manifestState.loading = fetch(manifestUrl + '?t=' + Date.now())
      .then(function (r) {
        if (!r.ok) throw new Error('manifest not found: ' + r.status);
        return r.json();
      })
      .then(function (json) {
        var gen = (json && json.generated) || {};
        Object.keys(gen).forEach(function (slug) { manifestState.slugs[slug] = true; });
        manifestState.loaded = true;
        manifestState.loading = null;
        console.info('[items-resolver] manifest loaded:', Object.keys(manifestState.slugs).length, 'PNG items');
      })
      .catch(function (err) {
        manifestState.error = err.message;
        manifestState.loaded = true; // Mark as loaded with no items (fallback)
        manifestState.loading = null;
        console.warn('[items-resolver] manifest not reachable — SVG fallback for all:', err.message);
      });
    return manifestState.loading;
  }

  function hasManifestSlug(slug) {
    return !!manifestState.slugs[slug];
  }

  function buildImg(slug, altText) {
    var img = new Image();
    img.src = pngBase + slug + '.png';
    img.alt = altText || slug;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.imageRendering = 'auto';
    img.loading = 'lazy';
    img.setAttribute('data-item-slug', slug);
    return img;
  }

  function buildSvgUse(slug, viewBox) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', viewBox || '0 0 120 120');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#' + SVG_SPRITE_PREFIX + slug);
    svg.appendChild(use);
    return svg;
  }

  function swapCardToPng(card) {
    var rawSlug = card.getAttribute('data-name') || card.getAttribute('data-slug');
    if (!rawSlug) return false;
    /* 2026-05-19: aplica BASE_TO_SLUG antes de testar manifest. */
    var slug = resolveSlug(rawSlug);
    if (!hasManifestSlug(slug)) return false;

    var iconDiv = card.querySelector('.item-icon');
    if (!iconDiv) return false;
    if (iconDiv.querySelector('img[data-item-slug]')) return false; // Already swapped

    var nameEl = card.querySelector('.item-name');
    var altText = nameEl ? nameEl.textContent : slug;
    var img = buildImg(slug, altText);
    img.onload = function () {
      iconDiv.innerHTML = '';
      iconDiv.appendChild(img);
      card.setAttribute('data-img-source', 'png');
    };
    img.onerror = function () {
      card.setAttribute('data-img-source', 'svg-fallback');
    };
    return true;
  }

  /* ============================================================
   * 2026-05-19: swapSvgUseToPng — substitui <svg><use href="#ic-it-X">
   * direto por <img> PNG quando X (ou seu BASE_TO_SLUG resolvido) tem
   * PNG no manifest. Cobre casos onde o codigo NAO usa .item-card +
   * data-name (mercado/inventario inline em cidade/exploracao/combate).
   * ============================================================ */
  function swapSvgUseToPng(useEl) {
    var href = useEl.getAttribute('href') || useEl.getAttribute('xlink:href') || '';
    if (href.indexOf('#' + SVG_SPRITE_PREFIX) !== 0) return false;
    var rawSlug = href.substring(1 + SVG_SPRITE_PREFIX.length); // strip "#ic-it-"
    var slug = resolveSlug(rawSlug);
    if (!hasManifestSlug(slug)) return false;
    var svgEl = useEl.closest('svg');
    if (!svgEl || svgEl.closest('defs')) return false; // skip defs entries
    if (svgEl.getAttribute('data-img-swapped') === '1') return false;
    var img = buildImg(slug, rawSlug);
    img.onload = function () {
      svgEl.setAttribute('data-img-swapped', '1');
      if (svgEl.parentNode) svgEl.parentNode.replaceChild(img, svgEl);
    };
    img.onerror = function () { /* keep SVG fallback */ };
    return true;
  }

  function upgrade(rootEl) {
    rootEl = rootEl || document;
    return loadManifest().then(function () {
      if (Object.keys(manifestState.slugs).length === 0) return 0;
      var cards = rootEl.querySelectorAll('article.item-card, [data-item-card]');
      var swapped = 0;
      cards.forEach(function (card) {
        if (swapCardToPng(card)) swapped++;
      });
      /* 2026-05-19: tambem varre <svg><use href="#ic-it-..."> diretos. */
      var uses = rootEl.querySelectorAll('svg use');
      var directSwaps = 0;
      uses.forEach(function (u) {
        if (swapSvgUseToPng(u)) directSwaps++;
      });
      console.info('[items-resolver] upgrade:', swapped, 'cards +', directSwaps, 'svg-use direct swapped to PNG');
      return swapped + directSwaps;
    });
  }

  function iconHTML(slug, altText, viewBox) {
    // Synchronous: requires manifest already loaded.
    // Returns the right HTML string (img or svg-use) for embedding.
    // Auto-detects player gender from window.vPlayerGender (set by game).
    // If F and {slug}-f.png exists in manifest, uses female version.
    if (manifestState.loaded) {
      var alt = (altText || slug).replace(/"/g, '&quot;');
      // Try female variant if player is female
      var gender = (typeof window !== 'undefined' && window.vPlayerGender) || 'M';
      if (gender === 'F' && hasManifestSlug(slug + '-f')) {
        return '<img src="' + pngBase + slug + '-f.png" alt="' + alt +
               '" style="width:100%;height:100%;object-fit:contain" loading="lazy" data-item-slug="' + slug + '-f">';
      }
      // Fallback to default (masculine) version
      if (hasManifestSlug(slug)) {
        return '<img src="' + pngBase + slug + '.png" alt="' + alt +
               '" style="width:100%;height:100%;object-fit:contain" loading="lazy" data-item-slug="' + slug + '">';
      }
    }
    return '<svg viewBox="' + (viewBox || '0 0 120 120') +
           '"><use href="#' + SVG_SPRITE_PREFIX + slug + '"/></svg>';
  }

  function resolve(slug, callback) {
    loadManifest().then(function () {
      callback(hasManifestSlug(slug) ? 'png' : 'svg');
    });
  }

  global.vItems = {
    upgrade: upgrade,
    resolve: resolve,
    has: hasManifestSlug,
    iconHTML: iconHTML,
    preloadManifest: loadManifest,
    _state: manifestState, // for debugging
  };

  // Auto-preload manifest on script load so iconHTML() returns PNG
  // on first inventory open without delay. Non-blocking — async fetch.
  loadManifest();

  /* ============================================================
   * 2026-05-19: AUTO-SWAP via MutationObserver — garante que TODO
   * novo <svg><use href="#ic-it-X"/> adicionado dinamicamente ao
   * DOM seja substituído por PNG se o manifest tem o slug.
   *
   * Elimina necessidade de chamar vItems.upgrade() manualmente
   * em cada popup/render. User pediu "garanta que nenhum local
   * use mais os SVGs" — esta é a única forma robusta.
   * ============================================================ */
  function tryAutoSwapNode(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.tagName === 'USE' || node.localName === 'use') {
      swapSvgUseToPng(node);
      return;
    }
    // Element node — varre <use> dentro
    var uses = node.querySelectorAll && node.querySelectorAll('svg use');
    if (uses && uses.length) {
      for (var i = 0; i < uses.length; i++) {
        swapSvgUseToPng(uses[i]);
      }
    }
  }

  function startAutoSwapObserver() {
    if (typeof MutationObserver === 'undefined' || !document.body) {
      // body ainda não pronto — adiar
      if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', startAutoSwapObserver, { once: true });
      }
      return;
    }
    // Varre o DOM atual uma vez (cobre estado inicial)
    loadManifest().then(function () {
      tryAutoSwapNode(document.body);
    });

    var observer = new MutationObserver(function (mutations) {
      // Throttle: agrupa mutations e processa após manifest pronto
      if (!manifestState.loaded) return;
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.addedNodes && m.addedNodes.length) {
          for (var j = 0; j < m.addedNodes.length; j++) {
            tryAutoSwapNode(m.addedNodes[j]);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    global.vItems._observer = observer;
    console.info('[items-resolver] MutationObserver auto-swap active');
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startAutoSwapObserver, { once: true });
    } else {
      startAutoSwapObserver();
    }
  }
})(typeof window !== 'undefined' ? window : this);
