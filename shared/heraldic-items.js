/**
 * HeraldicItems - API helper sobre o sprite ic-it-*.
 * Carrega DEPOIS de heraldic-items-sprite.js.
 *
 * USAGE:
 *   if (HeraldicItems.ready()) {
 *     var html = HeraldicItems.iconSvg("Adaga", "32px");
 *   } else {
 *     HeraldicItems.onReady(function () { ... });
 *   }
 *
 * Mapeamento name -> symbol id:
 *   slugify(name) -> "ic-it-" + slug
 *   "Adaga" -> "ic-it-adaga"
 *   "Martelo Leve" -> "ic-it-martelo-leve"
 *   "Pocao de Cura" -> "ic-it-pocao-de-cura" (com fallbacks acentos)
 *
 * Gerado por scripts/_gen_heraldic_items.py.
 */
(function (global) {
    "use strict";
    if (global.HeraldicItems) return;

    /* Set de ids conhecidos extraido do sprite — fallback rapido. */
    var KNOWN_IDS = new Set(["ic-it-acido-anqueque", "ic-it-adaga", "ic-it-adaga-1", "ic-it-adaga-arremesso", "ic-it-adaga-balanceada", "ic-it-adaga-beco", "ic-it-adaga-cerimonial", "ic-it-adaga-enferrujada", "ic-it-adaga-sombras", "ic-it-adesivo-mimic", "ic-it-agua-benta", "ic-it-agua-pura", "ic-it-alabarda", "ic-it-alabarda-1", "ic-it-alaude-canto-estelar", "ic-it-ametista", "ic-it-amuleto-armadura-natural", "ic-it-amuleto-lobo", "ic-it-amuleto-saude", "ic-it-amuleto-sorte", "ic-it-amuleto-vitalidade", "ic-it-anel-alvorecer", "ic-it-anel-cobre", "ic-it-anel-ouro", "ic-it-anel-prata", "ic-it-anel-protecao", "ic-it-anel-resistencia", "ic-it-antena-centopeia", "ic-it-antena-ferrugem", "ic-it-antidoto", "ic-it-arco-caca", "ic-it-arco-curto", "ic-it-arco-curto-1", "ic-it-arco-guardiao-silvestre", "ic-it-arco-longo", "ic-it-arco-longo-1", "ic-it-arco-rachado", "ic-it-arma-magica-1", "ic-it-armadura-acolchoada", "ic-it-armadura-couro", "ic-it-armadura-couro-1", "ic-it-artefato-vale", "ic-it-ataduras-medicinais", "ic-it-balsamo-cura", "ic-it-bandagem-mumia", "ic-it-bandana-suja", "ic-it-bandana-suja-tool", "ic-it-barraca", "ic-it-base-amulet", "ic-it-base-bag-rations", "ic-it-base-balanced-dagger", "ic-it-base-bandage", "ic-it-base-battleaxe", "ic-it-base-belt", "ic-it-base-bone", "ic-it-base-bone-helm", "ic-it-base-boot", "ic-it-base-bracer", "ic-it-base-bread", "ic-it-base-breastplate", "ic-it-base-broken-arrow", "ic-it-base-caltrop", "ic-it-base-candle", "ic-it-base-cerimonial-dagger", "ic-it-base-chainmail-tunic", "ic-it-base-claw", "ic-it-base-cloak", "ic-it-base-cloth-hood", "ic-it-base-club", "ic-it-base-coal", "ic-it-base-coin-pouch", "ic-it-base-compass", "ic-it-base-crown", "ic-it-base-crystal-raw", "ic-it-base-dagger", "ic-it-base-dart", "ic-it-base-druid-totem", "ic-it-base-ear", "ic-it-base-essence", "ic-it-base-eye", "ic-it-base-fang", "ic-it-base-feather", "ic-it-base-flail", "ic-it-base-full-plate", "ic-it-base-gear", "ic-it-base-gem-faceted", "ic-it-base-gem-pearl", "ic-it-base-glaive", "ic-it-base-glove", "ic-it-base-greataxe", "ic-it-base-greatsword", "ic-it-base-grimoire", "ic-it-base-halberd", "ic-it-base-hand-crossbow", "ic-it-base-handaxe", "ic-it-base-heavy-crossbow", "ic-it-base-herb-bunch", "ic-it-base-herb-leaf", "ic-it-base-hide-armor", "ic-it-base-holy-symbol", "ic-it-base-honey-jar", "ic-it-base-horn", "ic-it-base-ingot", "ic-it-base-iron-helm", "ic-it-base-junk-cloth", "ic-it-base-key", "ic-it-base-knight-helm", "ic-it-base-lantern", "ic-it-base-leaf-magic", "ic-it-base-leather-cap", "ic-it-base-leather-chest", "ic-it-base-leather-roll", "ic-it-base-light-crossbow", "ic-it-base-light-hammer", "ic-it-base-lockpick", "ic-it-base-longbow", "ic-it-base-longsword", "ic-it-base-lute", "ic-it-base-mace", "ic-it-base-mage-staff", "ic-it-base-map", "ic-it-base-maul", "ic-it-base-meal-bowl", "ic-it-base-meat-cooked", "ic-it-base-mining-pick", "ic-it-base-morningstar", "ic-it-base-moss-clump", "ic-it-base-mug", "ic-it-base-mushroom", "ic-it-base-music-sheet", "ic-it-base-orb", "ic-it-base-padded-armor", "ic-it-base-pelt", "ic-it-base-pike", "ic-it-base-poison-bottle", "ic-it-base-potion-bottle", "ic-it-base-potion-vial", "ic-it-base-powder-jar", "ic-it-base-quarterstaff", "ic-it-base-rapier", "ic-it-base-ring-band", "ic-it-base-ring-gem", "ic-it-base-rope", "ic-it-base-rune-fragment", "ic-it-base-rune-stone", "ic-it-base-scale", "ic-it-base-scale-mail", "ic-it-base-scimitar", "ic-it-base-scroll", "ic-it-base-shield-buckler", "ic-it-base-shield-heater", "ic-it-base-shield-kite", "ic-it-base-shield-round", "ic-it-base-shortbow", "ic-it-base-shortsword", "ic-it-base-sickle", "ic-it-base-skull", "ic-it-base-sling", "ic-it-base-smoke-bomb", "ic-it-base-spear", "ic-it-base-spike", "ic-it-base-splint-mail", "ic-it-base-spyglass", "ic-it-base-sticky-blob", "ic-it-base-studded-leather", "ic-it-base-tent", "ic-it-base-tentacle", "ic-it-base-thrown-flask", "ic-it-base-tome", "ic-it-base-torch", "ic-it-base-training-sword", "ic-it-base-trident", "ic-it-base-wand", "ic-it-base-warhammer", "ic-it-base-warpick", "ic-it-base-whip", "ic-it-base-willow-staff", "ic-it-bencao-tyr", "ic-it-besta-leve", "ic-it-besta-leve-1", "ic-it-besta-mao", "ic-it-besta-pesada", "ic-it-bico-axe-beak", "ic-it-bico-urso-coruja", "ic-it-bolsa-moedas-falsa", "ic-it-bomba-fumaca", "ic-it-bordao", "ic-it-bordao-1", "ic-it-botas-couro", "ic-it-botas-elficas", "ic-it-botas-pesadas", "ic-it-botas-velocidade", "ic-it-braceletes-defesa", "ic-it-braceletes-ferro", "ic-it-brunea", "ic-it-brunea-aneis", "ic-it-bussola-magica", "ic-it-cabeca-chimera", "ic-it-cajado-aprendiz", "ic-it-cajado-salgueiro", "ic-it-cantil", "ic-it-cantil-couro", "ic-it-cantil-magico", "ic-it-capa-deslocamento", "ic-it-capa-guardiao-silvestre", "ic-it-capa-meia-noite", "ic-it-capa-protecao", "ic-it-capa-viajante", "ic-it-capuz-lamento-sombrio", "ic-it-capuz-tecido", "ic-it-carapaca-anqueque", "ic-it-carne-assada", "ic-it-carne-carnical", "ic-it-carne-crua", "ic-it-carne-podre", "ic-it-carne-seca", "ic-it-carvao", "ic-it-cataplasma-curativo", "ic-it-cauda-rato", "ic-it-cerveja-forte", "ic-it-chapeu-arcanista", "ic-it-chapeu-disfarce", "ic-it-chave-abismo", "ic-it-chave-antiga", "ic-it-chave-aurora", "ic-it-chave-crepusculo", "ic-it-chave-porao", "ic-it-chave-primordial", "ic-it-chicote", "ic-it-chifre-alce", "ic-it-cimitarra", "ic-it-cimitarra-1", "ic-it-cinto-ferro", "ic-it-cinto-utilidades", "ic-it-cinturao-destreza", "ic-it-cinturao-forca-gigante", "ic-it-circlet-explosao", "ic-it-clava", "ic-it-clava-gigante", "ic-it-cogumelo-comestivel", "ic-it-cogumelo-grelhado", "ic-it-cogumelo-silvestre", "ic-it-colar-bolas-fogo", "ic-it-colar-dentes", "ic-it-colar-ossos", "ic-it-colar-ouro", "ic-it-corda-canhamo", "ic-it-corda-escalada", "ic-it-corda-ignifuga", "ic-it-corda-linho", "ic-it-coroa-primordial", "ic-it-cota-escamas", "ic-it-cota-malha", "ic-it-cota-malha-1", "ic-it-cota-malha-2", "ic-it-cota-malha-enferrujada", "ic-it-cota-talas", "ic-it-couraca-protetor-ancestral", "ic-it-couro-batido", "ic-it-couro-curtido", "ic-it-couro-ettin", "ic-it-couro-javali", "ic-it-cranio-rachado", "ic-it-cristal-bruto", "ic-it-cristal-convergencia", "ic-it-dardo", "ic-it-dente-crocodilo", "ic-it-dente-gnoll", "ic-it-dente-mimic", "ic-it-dente-ogro", "ic-it-dente-rato", "ic-it-dente-roper", "ic-it-diario-edric", "ic-it-elmo-anao", "ic-it-elmo-couro", "ic-it-elmo-enferrujado", "ic-it-elmo-ossos", "ic-it-elmo-protecao-1", "ic-it-elmo-protetor-ancestral", "ic-it-elmo-telepatia", "ic-it-engrenagem", "ic-it-ensopado-revigorante", "ic-it-enxofre-refinado", "ic-it-erva-curativa", "ic-it-escama-dragao-branco", "ic-it-escama-kobold", "ic-it-escama-lagarto", "ic-it-escudo-1", "ic-it-escudo-aco", "ic-it-escudo-aco-1", "ic-it-escudo-aco-2", "ic-it-escudo-generic", "ic-it-escudo-madeira", "ic-it-escudo-pedra", "ic-it-escudo-pequeno", "ic-it-escudo-protetor-ancestral", "ic-it-escudo-quebrado", "ic-it-escudo-redencao", "ic-it-esferas-aco", "ic-it-esmeralda", "ic-it-espada-curta", "ic-it-espada-curta-1", "ic-it-espada-enferrujada", "ic-it-espada-longa", "ic-it-espada-longa-1", "ic-it-espada-longa-2", "ic-it-espada-longa-flamejante", "ic-it-espada-longa-gelida", "ic-it-espada-longa-trovejante", "ic-it-espada-longa-velha", "ic-it-espada-treino", "ic-it-espinho-manticora", "ic-it-esporo-violeta", "ic-it-essencia-arcana", "ic-it-essencia-espectral", "ic-it-estrepes", "ic-it-ferrao-viverna", "ic-it-flecha-quebrada", "ic-it-foco-druidico-1", "ic-it-fogo-alquimico", "ic-it-foice", "ic-it-foice-leve", "ic-it-folha-driade", "ic-it-fragmento-mapa", "ic-it-fragmento-obsidiana", "ic-it-fragmento-pacto", "ic-it-fragmento-runico-ancestral", "ic-it-fragmento-runico-maior", "ic-it-fragmento-runico-menor", "ic-it-frasco-acido", "ic-it-frasco-luz-estelar", "ic-it-frasco-veneno", "ic-it-funda", "ic-it-galho-animado", "ic-it-garra-carnical", "ic-it-garra-grande", "ic-it-garra-urso", "ic-it-garras-fetidas", "ic-it-garras-lobo-selvagem", "ic-it-gazua-mestra", "ic-it-gema-gelo-draconico", "ic-it-gibao-lobo-selvagem", "ic-it-gibao-peles", "ic-it-glaive", "ic-it-glandula-veneno", "ic-it-gravetos-secos", "ic-it-grimorio-aprendiz", "ic-it-grimorio-menor", "ic-it-grito-cristalizado", "ic-it-hidromel-fortificado", "ic-it-insignia-militar", "ic-it-isqueiro", "ic-it-jade", "ic-it-joia-funeraria", "ic-it-juba-leao", "ic-it-kit-acampamento", "ic-it-kit-escalada", "ic-it-kit-reparo", "ic-it-lamina-lamento-sombrio", "ic-it-lamina-thorne", "ic-it-lamina-veterano", "ic-it-lanca", "ic-it-lanca-1", "ic-it-lanca-quebrada", "ic-it-lanterna-mineiro", "ic-it-lingote-ferro", "ic-it-lingote-mithral", "ic-it-lingote-ouro", "ic-it-lingote-prata", "ic-it-luneta", "ic-it-luvas-couro", "ic-it-maca", "ic-it-maca-1", "ic-it-maca-estrela", "ic-it-machadinha", "ic-it-machado-batalha", "ic-it-machado-batalha-lascado", "ic-it-machado-furia-montanhas", "ic-it-machado-grande", "ic-it-machado-grande-1", "ic-it-machado-guerra-1", "ic-it-machado-montanha", "ic-it-machado-pedra", "ic-it-madeira-lei", "ic-it-malho", "ic-it-mangual", "ic-it-manoplas-forca-ogro", "ic-it-manto-arcanista", "ic-it-manto-crepusculo", "ic-it-manto-devoto-solar", "ic-it-manto-elfico", "ic-it-manto-morcego", "ic-it-manto-resistencia", "ic-it-manto-sombrio", "ic-it-mapa-deserto", "ic-it-mapa-ermo-gelado", "ic-it-mapa-floresta", "ic-it-mapa-masmorra", "ic-it-mapa-montanhas", "ic-it-mapa-pantano", "ic-it-mapa-planicies", "ic-it-mapa-rabiscado", "ic-it-mapa-valdoria", "ic-it-mapa-vulcanico", "ic-it-martelo-guerra", "ic-it-martelo-guerra-1", "ic-it-martelo-leve", "ic-it-medalhao-pensamentos", "ic-it-meia-placa", "ic-it-mel-silvestre", "ic-it-membrana-manto-negro", "ic-it-minerio-ferro-puro", "ic-it-montante", "ic-it-montante-1", "ic-it-musgo-luminoso", "ic-it-olho-bruxa-verde", "ic-it-olho-grimlock", "ic-it-onix", "ic-it-orbe-arcanista", "ic-it-orbe-arcano-1", "ic-it-orbe-mistico", "ic-it-orelha-goblin", "ic-it-osso", "ic-it-pagina-grimorio", "ic-it-pagina-ritual", "ic-it-pao-fresco", "ic-it-partitura-elfica", "ic-it-pedra-afiar", "ic-it-pedra-gigante", "ic-it-pedra-polida", "ic-it-pedra-sorte", "ic-it-peitoral-furia-montanhas", "ic-it-pele-cobra-gigante", "ic-it-pele-lobo", "ic-it-pele-pantera-sombria", "ic-it-pele-sapo-gigante", "ic-it-pele-urso", "ic-it-pelo-texugo", "ic-it-pena-cocatrice", "ic-it-pena-hipogrifo", "ic-it-pena-urso-coruja", "ic-it-pergaminho-branco", "ic-it-pergaminho-magico", "ic-it-pergaminho-viajante", "ic-it-periapto-cura", "ic-it-perola", "ic-it-picareta-guerra", "ic-it-picareta-mineracao", "ic-it-pique", "ic-it-placa-completa", "ic-it-po-cegante", "ic-it-po-diamante", "ic-it-po-fogo-fatuo", "ic-it-pocao-cura", "ic-it-pocao-cura-maior", "ic-it-pocao-cura-superior", "ic-it-pocao-cura-suprema", "ic-it-pocao-heroismo", "ic-it-pocao-invisibilidade", "ic-it-pocao-resist-fogo", "ic-it-pocao-resist-frio", "ic-it-pocao-velocidade", "ic-it-presa-javali", "ic-it-presa-lobo", "ic-it-presa-worg", "ic-it-proboscide", "ic-it-pseudopode", "ic-it-quartzo", "ic-it-racoes-viagem", "ic-it-raiz-amarga", "ic-it-rapieira", "ic-it-rapieira-1", "ic-it-receita-martha", "ic-it-refeicao-completa", "ic-it-refeicao-fortificante", "ic-it-reliquia-torre", "ic-it-residuo-acido", "ic-it-rubi", "ic-it-runa-absorcao", "ic-it-runa-chamas", "ic-it-runa-cura", "ic-it-runa-devastacao", "ic-it-runa-fortuna", "ic-it-runa-gelo", "ic-it-runa-precisao", "ic-it-runa-protecao", "ic-it-runa-trovao", "ic-it-runa-vigor", "ic-it-saco-dormir", "ic-it-saco-ingredientes", "ic-it-saco-ouro-roubado", "ic-it-safira", "ic-it-sandalias-aladas", "ic-it-sangue-troll", "ic-it-seda-aranha", "ic-it-seiva-pegajosa", "ic-it-simbolo-purificado", "ic-it-simbolo-sagrado-1", "ic-it-tecido-rasgado", "ic-it-tentaculo-pantera-sombria", "ic-it-tentaculo-rastejante", "ic-it-tentaculo-roper", "ic-it-tiara-conhecimento", "ic-it-tocha", "ic-it-tochas-5", "ic-it-tomo-conhecimento", "ic-it-tomo-sombrio", "ic-it-topazio", "ic-it-tridente", "ic-it-tunica-protecao", "ic-it-turquesa", "ic-it-varinha-mago-guerra-1", "ic-it-vela", "ic-it-veneno-basico", "ic-it-veneno-refinado", "ic-it-veste-arcana", "ic-it-veste-arcanista", "ic-it-veste-sacerdote", "ic-it-vestes-canto-estelar"]);

    /* Slugify pt-BR: lowercase, remove acentos, espaços/punctos -> hifen. */
    function _slug(name) {
        if (!name) return "";
        var s = String(name).toLowerCase();
        try { s = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); } catch (_) {}
        s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        return s;
    }

    /* Tenta varios prefixos pra resolver name -> symbol id. */
    function _resolveId(name) {
        var slug = _slug(name);
        if (!slug) return "";
        var candidates = [
            "ic-it-" + slug,
            "ic-it-base-" + slug,
        ];
        for (var i = 0; i < candidates.length; i++) {
            if (KNOWN_IDS.has(candidates[i])) return candidates[i];
        }
        return "";
    }

    global.HeraldicItems = {
        ready: function () { return !!window.__heraldicItemsReady; },
        onReady: function (cb) {
            if (typeof cb !== "function") return;
            if (window.__heraldicItemsReady) { try { cb(); } catch (_) {} return; }
            (window.__heraldicItemsReadyCbs = window.__heraldicItemsReadyCbs || []).push(cb);
        },
        /**
         * Retorna SVG HTML pra um item por name. Vazio se nao houver symbol.
         * Caller decide fallback (emoji, etc).
         */
        iconSvg: function (name, size) {
            var id = _resolveId(name);
            if (!id) return "";
            var sz = size || "32px";
            /* viewBox 0 0 120 120 = padrao dos symbols. style inline pra width/height. */
            return '<svg viewBox="0 0 120 120" style="width:' + sz + ';height:' + sz +
                ';display:inline-block;vertical-align:middle"><use href="#' + id + '"/></svg>';
        },
        /* Helpers de debug. */
        knownIds: function () { return Array.from(KNOWN_IDS); },
        resolve: _resolveId,
        slug: _slug,
    };
})(window);
