/**
 * asset-resolver.js — Unified PNG resolver for ALL game assets.
 *
 * Replaces inline SVG sprites + emojis with AI-generated PNGs when
 * available, with automatic fallback to original SVG/emoji.
 *
 * USAGE:
 *   Load BEFORE inline JS that renders icons.
 *   Call vAssets.upgradeAll(rootEl) after each render to scan DOM
 *   and swap <svg><use href="#ic-X"/></svg> for <img src="...png">.
 *
 * INTEGRATION:
 *   - cidade.html (112 inline sprite refs in ARCHETYPE_ICONS, NPCs, etc.)
 *   - combate.html (already has _combatPortraitHTML — coexists)
 *   - exploracao.html (UI sprites only — no impact)
 *
 * PNG INVENTORIES (synced from scripts/generate_*.py outputs):
 *   - Combat main (20): 12 classes + boss/inimigo + 6 invocações
 *   - Enemies per-creature (29)
 *   - Skills (135)
 *   - City locations (16)
 *
 * NOTE: Items use separate items-resolver.js (vItems API).
 */
(function (global) {
    'use strict';
    if (global.vAssets) return;

    /* ========================================================
     * COMBAT MAIN ICONS — 12 classes + 2 misc + 6 invocações
     * Slug = iconId stripped of 'ic-' prefix (normalize _ → -).
     * ======================================================== */
    var COMBAT_PNGS = {
        'mago': 1, 'clerigo': 1, 'barbaro': 1, 'ladino': 1, 'guerreiro': 1,
        'patrulheiro': 1, 'paladino': 1, 'bardo': 1, 'druida': 1, 'monge': 1,
        'feiticeiro': 1, 'bruxo': 1,
        'inimigo': 1, 'boss': 1,
        'spiritual-weapon': 1, 'summon': 1, 'familiar': 1, 'sprite': 1,
        'find-steed': 1, 'animal-companion': 1
    };

    /* ========================================================
     * PER-ENEMY PNG (29 creature portraits) — keyed by slugified name.
     * Source: scripts/_inventory_combat_data.py.
     * ======================================================== */
    var ENEMY_PNGS = {
        'goblin': 1, 'orc': 1, 'esqueleto': 1, 'aranha-gigante': 1,
        'sapo-gigante': 1, 'homem-lagarto': 1, 'crocodilo': 1,
        'cobra-constritora-gigante': 1, 'bruxa-verde': 1, 'mimico': 1,
        'acolito': 1, 'aprendiz-de-mago': 1, 'cultista-fanatico': 1,
        'mago-hostil': 1, 'lobo': 1, 'bandido': 1, 'orc-guerreiro': 1,
        'fogo-fatuo': 1, 'troll': 1, 'zumbi': 1, 'aguia-gigante': 1,
        'escorpiao-gigante': 1, 'leao-da-areia': 1, 'yeti-congelado': 1,
        'lobo-da-tundra': 1, 'troll-das-cavernas': 1, 'morcego-gigante': 1,
        'elemental-de-lava-menor': 1, 'brakthar': 1
    };

    /* ========================================================
     * SKILL ICONS (135) — keyed by slugified name.
     * ======================================================== */
    var SKILL_PNGS = {
        'acao-ardilosa': 1, 'agarrar': 1, 'arma-espiritual': 1, 'arma-magica': 1,
        'armadura-de-agathys': 1, 'ataque-assassino': 1, 'ataque-brutal': 1,
        'ataque-furtivo': 1, 'ataque-poderoso': 1, 'aura-de-protecao': 1,
        'aura-de-vitalidade': 1, 'auto': 1, 'banir': 1, 'bencao': 1,
        'bola-de-fogo': 1, 'bruxaria': 1, 'calmar-emocoes': 1, 'cancao-de-cura': 1,
        'cegueira': 1, 'chama-sagrada': 1, 'chicote-espinhoso': 1, 'choque-eletrico': 1,
        'chuva-de-espinhos': 1, 'cone-de-frio': 1, 'conjurar-animais': 1,
        'contagio': 1, 'contramagica': 1, 'corpo-calmo': 1, 'crescimento-espinhoso': 1,
        'cura': 1, 'cura-da-companhia': 1, 'cura-pelas-maos': 1, 'curar': 1,
        'curar-ferimentos': 1, 'defesa-paciente': 1, 'desviar-projeteis': 1,
        'disparo-rapido': 1, 'enfeiticar-monstros': 1, 'enfeiticar-pessoa': 1,
        'enredar': 1, 'escudo-arcano': 1, 'escudo-da-fe': 1, 'espiritos-guardioes': 1,
        'esquiva': 1, 'esquiva-sobrenatural': 1, 'estocada-mental': 1,
        'explosao-arcana': 1, 'feixe-lunar': 1, 'flecha-de-acido': 1, 'forma-selvagem': 1,
        'furia': 1, 'furia-devastadora': 1, 'golpe-arcano': 1, 'golpe-atordoante': 1,
        'golpe-de-armadilha': 1, 'golpe-divino': 1, 'golpe-flamejante': 1,
        'golpe-fulminante': 1, 'golpe-guidado': 1, 'golpe-irado': 1, 'golpe-marcante': 1,
        'golpe-mortal': 1, 'golpe-preciso': 1, 'golpe-trovejante': 1, 'graxa': 1,
        'grito-de-guerra': 1, 'hipnose': 1, 'imobilizar-pessoa': 1, 'infligir-ferimentos': 1,
        'inspiracao': 1, 'investida': 1, 'investida-selvagem': 1, 'invisibilidade': 1,
        'invisibilidade-maior': 1, 'invocar-lobo': 1, 'invocar-raio': 1,
        'juramento-de-inimizade': 1, 'lamina-sombria': 1, 'lentidao': 1,
        'lobo-espiritual': 1, 'maldicao': 1, 'maldicao-da-fraqueza': 1, 'mao-arcana': 1,
        'maos-flamejantes': 1, 'marca-do-cacador': 1, 'massa-de-cura': 1, 'medo': 1,
        'metamagia-acelerar': 1, 'metamagia-duplicar': 1, 'misseis-magicos': 1,
        'missil-magico': 1, 'nevoa-ardente': 1, 'nuvem-toxica': 1, 'onda-de-trovao': 1,
        'palavra-de-cura': 1, 'palavra-guia': 1, 'palavra-imperiosa': 1,
        'palavra-poder-atordoar': 1, 'palavras-cortantes': 1, 'palavras-crueis': 1,
        'passar-sem-rastro': 1, 'passo-brumoso': 1, 'passo-do-vento': 1,
        'passo-oculto': 1, 'passos-silenciosos': 1, 'plaga-de-insetos': 1,
        'postura-defensiva': 1, 'pressa': 1, 'produzir-chama': 1, 'protecao-contra-energia': 1,
        'protecao-divina': 1, 'raio-caotico': 1, 'raio-de-enfraquecimento': 1,
        'raio-de-fogo': 1, 'raio-doentio': 1, 'raio-gelido': 1, 'raio-guiador': 1,
        'raio-relampejante': 1, 'rajada-de-flechas': 1, 'rajada-de-golpes': 1,
        'recuperacao-rapida': 1, 'reflexos-evasivos': 1, 'relampago': 1,
        'repreensao-divina': 1, 'repreensao-infernal': 1, 'rugido-feroz': 1,
        'santuario': 1, 'segundo-folego': 1, 'sono': 1, 'surto-de-acao': 1,
        'sussurros-dissonantes': 1, 'temerario': 1, 'tiro-certeiro': 1,
        'tiro-preciso': 1, 'transmutar-em-pedra': 1
    };

    /* ========================================================
     * CITY LOCATION PNG (16) — keyed by callback name.
     * ======================================================== */
    var CITY_LOC_PNGS = {
        'tavern': 1, 'inn': 1, 'rel_main': 1, 'action_quests': 1,
        'market': 1, 'bank': 1, 'open_workshop': 1, 'rune_scribe': 1,
        'guild': 1, 'gates': 1, 'arena': 1, 'daily_challenge': 1,
        'temple': 1, 'square': 1, 'action_codex': 1, 'festival': 1
    };

    /* ========================================================
     * RACE OFFICIAL OPT (canonical opt per race, 2026-05-16 user choice)
     * ======================================================== */
    var RACE_OFFICIAL_OPT = {
        Human: 3, Elf: 3, Dwarf: 2, Halfling: 1, Gnome: 1,
        HalfElf: 4, HalfOrc: 1, Dragonborn: 4, Tiefling: 6
    };

    /* ========================================================
     * BASE PATH DETECTION — handles file:// (LOCAL mode) and HTTP.
     * For HTTP, assumes WebApp root has /shared/ at top-level.
     * For file://, walks up to find valdoria-webapp/ ancestor.
     * ======================================================== */
    function _basePath() {
        var loc = (typeof location !== 'undefined') ? location.href : '';
        if (loc.indexOf('file://') === 0) {
            // file:///.../simuladores/cidade.html → ../valdoria-webapp/
            // file:///.../valdoria-webapp/cidade/index.html → /
            if (loc.indexOf('/simuladores/') >= 0) {
                return '../valdoria-webapp/';
            }
            // file://.../valdoria-webapp/X/Y.html
            var m = loc.match(/file:\/\/(.*?)\/valdoria-webapp\//);
            if (m) {
                // Compute relative path from current document to /shared/
                var path = loc.substring(loc.indexOf('/valdoria-webapp/') + '/valdoria-webapp/'.length);
                var depth = (path.match(/\//g) || []).length;
                return new Array(depth + 1).join('../');
            }
            return '../';
        }
        // HTTP — always reference root
        return '/';
    }

    /* ========================================================
     * SLUG NORMALIZATION (matches Python slugify + JS _vinvSlug)
     * ======================================================== */
    function _slugify(s) {
        if (!s) return '';
        var n = String(s).toLowerCase();
        try { n = n.normalize('NFKD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
        return n.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    /* ========================================================
     * URL BUILDERS — return absolute URL or null if no PNG.
     * ======================================================== */
    function combatIconUrl(iconIdOrSlug) {
        if (!iconIdOrSlug) return null;
        var slug = String(iconIdOrSlug).replace(/^ic-/, '').replace(/_/g, '-');
        if (!COMBAT_PNGS[slug]) return null;
        return _basePath() + 'shared/img/combat/' + slug + '.png';
    }
    function enemyIconUrl(enemyName) {
        if (!enemyName) return null;
        var slug = _slugify(enemyName);
        if (!ENEMY_PNGS[slug]) return null;
        return _basePath() + 'shared/img/combat/enemies/' + slug + '.png';
    }
    function skillIconUrl(skillName) {
        if (!skillName) return null;
        var slug = _slugify(skillName);
        if (!SKILL_PNGS[slug]) return null;
        return _basePath() + 'shared/img/combat/skills/' + slug + '.png';
    }
    function cityIconUrl(cb) {
        if (!cb || !CITY_LOC_PNGS[cb]) return null;
        return _basePath() + 'shared/img/city/' + cb + '.png';
    }
    function raceIconUrl(raceKey) {
        if (!raceKey) return null;
        var opt = RACE_OFFICIAL_OPT[raceKey];
        if (!opt) return null;
        var suffix = opt === 1 ? '' : '_opt' + opt;
        return _basePath() + 'character_creator/races/' + raceKey + suffix + '.png';
    }

    /* ========================================================
     * HTML BUILDERS — return inline HTML string (PNG <img> or SVG fallback).
     * ======================================================== */
    function classIconHTML(iconId, size, extraStyle) {
        var url = combatIconUrl(iconId);
        var sizeStr = size || '38px';
        if (url) {
            return '<img class="v-asset-png v-asset-class" src="' + url + '" alt="" ' +
                   'style="width:' + sizeStr + ';height:' + sizeStr + ';object-fit:contain;' +
                   (extraStyle || '') + '" loading="lazy" ' +
                   "onerror=\"this.onerror=null;this.outerHTML='<svg viewBox=\\\'0 0 120 120\\\' style=\\\'width:" + sizeStr + ";height:" + sizeStr + "\\\'><use href=\\\'#" + iconId + "\\\'/></svg>';\">";
        }
        return '<svg viewBox="0 0 120 120" style="width:' + sizeStr + ';height:' + sizeStr +
               '"><use href="#' + iconId + '"/></svg>';
    }

    /* ========================================================
     * DOM UPGRADERS — scan and swap <svg><use href="#ic-X"/></svg> for <img>
     * when PNG is available. Idempotent — safe to call multiple times.
     * ======================================================== */
    function upgradeClassIcons(rootEl) {
        rootEl = rootEl || document;
        var uses = rootEl.querySelectorAll('svg use[href^="#ic-"], svg use[*|href^="#ic-"]');
        var upgraded = 0;
        for (var i = 0; i < uses.length; i++) {
            var useEl = uses[i];
            var href = useEl.getAttribute('href') || useEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
            if (!href) continue;
            var iconId = href.replace(/^#/, '');
            var slug = iconId.replace(/^ic-/, '').replace(/_/g, '-');
            // Only upgrade icons that have a PNG (classes/combat/invocações)
            if (!COMBAT_PNGS[slug]) continue;
            var svgEl = useEl.closest('svg');
            if (!svgEl || svgEl.dataset.assetUpgraded) continue;
            // Build replacement <img>
            var img = document.createElement('img');
            img.className = 'v-asset-png v-asset-class' + (svgEl.className.baseVal ? ' ' + svgEl.className.baseVal : '');
            img.src = combatIconUrl(iconId);
            img.alt = '';
            img.loading = 'lazy';
            img.dataset.assetUpgraded = '1';
            // Preserve inline size from SVG
            var svgStyle = svgEl.getAttribute('style') || '';
            var w = svgEl.style.width || svgEl.getAttribute('width') || '';
            var h = svgEl.style.height || svgEl.getAttribute('height') || '';
            // If no inline size, infer from class context (use 100% / em scaling)
            if (!w && !h) {
                img.style.cssText = svgStyle + ';object-fit:contain;display:inline-block;vertical-align:middle';
            } else {
                img.style.cssText = svgStyle + ';object-fit:contain;display:inline-block;vertical-align:middle';
            }
            // Fallback to original SVG on load error
            img.onerror = function (origSvg) {
                return function () { this.onerror = null; this.parentNode.replaceChild(origSvg, this); };
            }(svgEl.cloneNode(true));
            // Mark + swap
            svgEl.dataset.assetUpgraded = '1';
            svgEl.parentNode.replaceChild(img, svgEl);
            upgraded++;
        }
        return upgraded;
    }

    function upgradeAll(rootEl) {
        return upgradeClassIcons(rootEl);
    }

    /* ========================================================
     * MUTATION OBSERVER — auto-upgrade dynamically rendered content.
     * Watches the body for new nodes containing class SVG sprites.
     * ======================================================== */
    var _observer = null;
    function _startObserver() {
        if (_observer || typeof MutationObserver === 'undefined') return;
        _observer = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type !== 'childList') continue;
                for (var j = 0; j < m.addedNodes.length; j++) {
                    var node = m.addedNodes[j];
                    if (node.nodeType !== 1) continue;  // Element only
                    // Quick check before expensive querySelector
                    try {
                        if (node.querySelector && node.querySelector('svg use[href^="#ic-"]')) {
                            upgradeClassIcons(node);
                        }
                    } catch (_) {}
                }
            }
        });
        if (document.body) {
            _observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    /* ========================================================
     * PUBLIC API
     * ======================================================== */
    global.vAssets = {
        // URL builders
        combatIconUrl: combatIconUrl,
        enemyIconUrl: enemyIconUrl,
        skillIconUrl: skillIconUrl,
        cityIconUrl: cityIconUrl,
        raceIconUrl: raceIconUrl,
        // HTML builders
        classIconHTML: classIconHTML,
        // DOM upgraders
        upgradeClassIcons: upgradeClassIcons,
        upgradeAll: upgradeAll,
        // Internals (debug)
        _maps: { COMBAT_PNGS: COMBAT_PNGS, ENEMY_PNGS: ENEMY_PNGS,
                 SKILL_PNGS: SKILL_PNGS, CITY_LOC_PNGS: CITY_LOC_PNGS,
                 RACE_OFFICIAL_OPT: RACE_OFFICIAL_OPT },
        _slugify: _slugify,
        _basePath: _basePath
    };

    // Auto-start: initial upgrade + observer for dynamic content
    function _init() {
        try {
            upgradeAll();
            _startObserver();
        } catch (_) {}
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})(typeof window !== 'undefined' ? window : this);
