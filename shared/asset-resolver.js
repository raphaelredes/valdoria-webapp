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
        'elemental-de-lava-menor': 1, 'brakthar': 1,
        // 2026-05-17: enemies que têm name pool mas não tinham PNG
        'ghoul': 1, 'urso': 1, 'urso-pardo': 1, 'lobo-atroz': 1,
        'bandido-arqueiro': 1, 'capitao-bandido': 1
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
     * NPC TYPE ICONS (2026-05-17) — keyed by slug (no prefix).
     * Source: scripts/generate_ui_icons.py NPC_ICONS.
     * Stored in /shared/img/npcs/{slug}.png
     * ======================================================== */
    var NPC_PNGS = {
        'banqueiro': 1, 'aldeao': 1, 'escriba': 1, 'taverneiro': 1,
        'estalajadeira': 1, 'ferreiro': 1, 'alquimista': 1, 'joalheiro': 1
    };

    /* ========================================================
     * UI ICON PNGs (2026-05-17) — keyed by slug.
     * Includes UI sprites + stat icons + small race indicators.
     * Stored in /shared/img/ui/{slug}.png
     * ======================================================== */
    var UI_PNGS = {
        'mochila': 1, 'tochas': 1, 'grupo': 1, 'cartografia': 1, 'acampamento': 1,
        'stat-attack': 1, 'stat-hp': 1, 'stat-mp': 1,
        'elfo': 1, 'anao': 1
    };

    /* ========================================================
     * ACHIEVEMENT ICON PNGs (2026-05-17) — keyed by slug WITHOUT 'ach-' prefix.
     * Stored in /shared/img/achievements/{slug}.png
     * ======================================================== */
    var ACHIEVEMENT_PNGS = {
        'ach-algoz': 1, 'ach-indomavel': 1, 'ach-aventureiro': 1, 'ach-cacador': 1,
        'ach-cartografo': 1, 'ach-cofreiro': 1, 'ach-colecionador': 1, 'ach-devoto': 1,
        'ach-diplomata': 1, 'ach-erudito': 1, 'ach-forjador': 1, 'ach-mestre': 1,
        'ach-sobrevivente': 1, 'ach-andarilho': 1, 'trofeu': 1
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
     * CACHE BUST SUFFIX (Sessão #28, 2026-05-24)
     * Append ?v=<bundle-hash> a URLs de assets que ANTES eram servidos
     * com Cache-Control: immutable max-age=1y. Browsers com cache antigo
     * não revalidam nunca — só uma URL diferente força fresh fetch.
     * Fallback Date.now() se bundle hash não carregou.
     * ======================================================== */
    function _cbSuffix() {
        var v = (typeof window !== 'undefined' && window.VBUNDLE_HASH) || Date.now();
        return '?v=' + v;
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
    function npcIconUrl(iconIdOrSlug) {
        if (!iconIdOrSlug) return null;
        var slug = String(iconIdOrSlug).replace(/^ic-/, '').replace(/_/g, '-');
        if (!NPC_PNGS[slug]) return null;
        return _basePath() + 'shared/img/npcs/' + slug + '.png';
    }
    function uiIconUrl(iconIdOrSlug) {
        if (!iconIdOrSlug) return null;
        var slug = String(iconIdOrSlug).replace(/^ic-/, '').replace(/_/g, '-');
        if (!UI_PNGS[slug]) return null;
        return _basePath() + 'shared/img/ui/' + slug + '.png';
    }
    function achievementIconUrl(iconIdOrSlug) {
        if (!iconIdOrSlug) return null;
        var slug = String(iconIdOrSlug).replace(/^ic-/, '').replace(/_/g, '-');
        if (!ACHIEVEMENT_PNGS[slug]) return null;
        // trofeu lives at root (not ach-*); everything else under achievements/
        // Sessão #56 (2026-05-28): .png → .webp (mesma fix de items/cidade)
        return _basePath() + 'shared/img/achievements/' + slug + '.webp';
    }
    function itemIconUrl(iconIdOrSlug, itemName) {
        // Items use ic-it-* prefix. Try vItems manifest lookup with multiple
        // slug candidates (name with connectives + sprite stripped).
        if (!window.vItems || typeof window.vItems.has !== 'function') return null;
        var candidates = [];
        if (itemName) {
            var nameSlug = _slugify(itemName);
            if (nameSlug) candidates.push(nameSlug);
        }
        if (iconIdOrSlug) {
            var spriteSlug = String(iconIdOrSlug).replace(/^ic-it-(base-)?/, '');
            if (spriteSlug && candidates.indexOf(spriteSlug) < 0) {
                candidates.push(spriteSlug);
            }
        }
        for (var i = 0; i < candidates.length; i++) {
            if (window.vItems.has(candidates[i])) {
                // Sessão #56 (2026-05-28): FIX P0 items inventory — extensão é
                // .webp (kind='subject' via save_optimized, alpha preservado),
                // NÃO .png. User reportou: "várias imagens de itens da mochila
                // não estão sendo carregadas". Same root cause as city PNGs
                // (Task #38) — código pulou a migração WebP.
                return _basePath() + 'shared/img/items/' + candidates[i] + '.webp';
            }
        }
        return null;
    }
    /* Smart resolver — tries each category map until one matches.
       Returns null if no PNG available for the iconId. */
    function resolveIconUrl(iconId, altName) {
        if (!iconId) return null;
        var rest = String(iconId).replace(/^ic-/, '');
        // Items: ic-it-* prefix
        if (rest.indexOf('it-') === 0) {
            return itemIconUrl(iconId, altName);
        }
        // Achievements: ic-ach-* prefix (try both — slug is stored WITH 'ach-' prefix)
        if (rest.indexOf('ach-') === 0 || rest === 'trofeu') {
            return achievementIconUrl(iconId);
        }
        // Skills: SKILL_PNGS uses raw slug (no prefix difference)
        var skillSlug = rest.replace(/_/g, '-');
        if (SKILL_PNGS[skillSlug]) {
            return _basePath() + 'shared/img/combat/skills/' + skillSlug + '.webp';
        }
        // City: CITY_LOC_PNGS uses callback name (matches slug).
        // Sessão #28 (2026-05-24): ?v=<bundle-hash> cache bust — ver _cbSuffix.
        // Sessão #56 (2026-05-28): FIX P0 — extensão é .webp (kind='scenery'
        // via save_optimized), NÃO .png. Arquivos foram convertidos pra WebP
        // (regra "Imagens leves WebP via _image_optim canonical") mas o
        // resolver continuou apontando pra .png — 404 silencioso.
        if (CITY_LOC_PNGS[skillSlug]) {
            return _basePath() + 'shared/img/city/' + skillSlug + '.webp' + _cbSuffix();
        }
        // Combat (classes, boss, inimigo, invocations)
        if (COMBAT_PNGS[skillSlug]) {
            return _basePath() + 'shared/img/combat/' + skillSlug + '.png';
        }
        // NPCs
        // Sessão #56 (2026-05-28): .png → .webp (mesma fix)
        if (NPC_PNGS[skillSlug]) {
            return _basePath() + 'shared/img/npcs/' + skillSlug + '.webp';
        }
        // UI (mochila, tochas, stats, race indicators)
        if (UI_PNGS[skillSlug]) {
            return _basePath() + 'shared/img/ui/' + skillSlug + '.png';
        }
        return null;
    }
    function enemyIconUrl(enemyName) {
        if (!enemyName) return null;
        var slug = _slugify(enemyName);
        if (!ENEMY_PNGS[slug]) return null;
        return _basePath() + 'shared/img/combat/enemies/' + slug + '.webp';
    }
    function skillIconUrl(skillName) {
        if (!skillName) return null;
        var slug = _slugify(skillName);
        if (!SKILL_PNGS[slug]) return null;
        return _basePath() + 'shared/img/combat/skills/' + slug + '.webp';
    }
    function cityIconUrl(cb) {
        if (!cb || !CITY_LOC_PNGS[cb]) return null;
        // Sessão #56 (2026-05-28): .png → .webp fix (mesma causa do bug acima)
        return _basePath() + 'shared/img/city/' + cb + '.webp' + _cbSuffix();
    }
    function raceIconUrl(raceKey) {
        if (!raceKey) return null;
        var opt = RACE_OFFICIAL_OPT[raceKey];
        if (!opt) return null;
        var suffix = opt === 1 ? '' : '_opt' + opt;
        // Sessão #56 (2026-05-28): .png → .webp (mesma fix)
        return _basePath() + 'character_creator/races/' + raceKey + suffix + '.webp';
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
        // Backward-compat alias — delegates to full upgrader
        return upgradeAllIcons(rootEl);
    }

    /* 2026-05-17 SMART UPGRADER — handles ALL slug types via resolveIconUrl.
       Walks DOM for any <svg><use href="#ic-X"></svg>, tries each PNG category
       map. Swaps for <img> when a PNG matches; leaves SVG untouched otherwise.

       Sizing strategy (BUG FIX 2026-05-17 user reported ícones gigantes):
       1. getBoundingClientRect — actual rendered size from CSS+layout
       2. Fallback: explicit width/height HTML attributes
       3. Fallback: inline style width/height
       4. SAFETY: if no size determinable, SKIP upgrade — better keep SVG than
          render IMG at natural 1024×1024 size breaking layout.

       Applies size via BOTH `img.width/height` HTML attrs (layout hint pre-load)
       AND inline style (final). Defensive CSS in _injectDefensiveCSS() also
       caps IMG at max-width/max-height of parent.

       Idempotent: data-asset-upgraded marker prevents re-processing. */
    /* Returns { w, h, source } — source ∈ 'rect' | 'attr' | 'style' | 'viewbox-default'.
       If source === 'rect' or 'viewbox-default', the size came from CSS — caller
       should NOT set inline width/height (let CSS rules on the IMG class match).
       If source === 'attr' or 'style', size was explicit on SVG — caller SHOULD
       preserve via inline style. Returns null if no usable size info. */
    function _getSvgRenderedSize(svgEl) {
        // Try rendered (CSS-driven) first
        try {
            if (svgEl.getBoundingClientRect) {
                var rect = svgEl.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    return { w: Math.round(rect.width), h: Math.round(rect.height),
                             source: 'rect' };
                }
            }
        } catch (_) {}
        // HTML width/height attrs (explicit)
        var attrW = parseInt(svgEl.getAttribute && svgEl.getAttribute('width'), 10);
        var attrH = parseInt(svgEl.getAttribute && svgEl.getAttribute('height'), 10);
        if (attrW && attrH) return { w: attrW, h: attrH, source: 'attr' };
        // Inline style (explicit)
        if (svgEl.style) {
            var stylW = parseInt(svgEl.style.width, 10);
            var stylH = parseInt(svgEl.style.height, 10);
            if (stylW && stylH) return { w: stylW, h: stylH, source: 'style' };
        }
        // 2026-05-17: viewBox + class-based default (handles hidden SVGs).
        // Returns "default" size so IMG renders SOMETHING — CSS rules on the IMG
        // class (preserved from SVG) will override if a better match exists.
        var vbStr = svgEl.getAttribute && svgEl.getAttribute('viewBox');
        if (vbStr) {
            var vb = vbStr.split(/\s+/).map(parseFloat);
            if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
                var aspect = vb[2] / vb[3];
                var clsName = ((svgEl.getAttribute && svgEl.getAttribute('class')) || '').toLowerCase();
                var defaultSize = 24;
                if (/\b(qb|quick)-icon\b/.test(clsName)) defaultSize = 32;
                if (/\b(lo|light)-icon\b/.test(clsName)) defaultSize = 28;
                if (/\b(hud|stat)-(icon|ico)\b/.test(clsName)) defaultSize = 16;
                if (/\binv-title-icon\b/.test(clsName)) defaultSize = 22;
                if (/\bv-heraldic\b/.test(clsName)) defaultSize = 28;
                if (/\bc-portrait\b/.test(clsName)) defaultSize = 38;
                return {
                    w: Math.round(defaultSize * aspect),
                    h: defaultSize,
                    source: 'viewbox-default'
                };
            }
        }
        return null;
    }

    function upgradeAllIcons(rootEl) {
        rootEl = rootEl || document;
        if (!rootEl.querySelectorAll) return 0;
        var uses;
        try {
            uses = rootEl.querySelectorAll('svg use[href^="#ic-"], svg use[*|href^="#ic-"]');
        } catch (_) { return 0; }
        var upgraded = 0;
        for (var i = 0; i < uses.length; i++) {
            var useEl = uses[i];
            var href = useEl.getAttribute('href')
                || useEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
            if (!href) continue;
            var iconId = href.replace(/^#/, '');
            var url = resolveIconUrl(iconId);
            if (!url) continue;
            var svgEl = useEl.closest ? useEl.closest('svg') : null;
            if (!svgEl) {
                svgEl = useEl.parentNode;
                while (svgEl && svgEl.tagName && svgEl.tagName.toLowerCase() !== 'svg') {
                    svgEl = svgEl.parentNode;
                }
            }
            if (!svgEl || (svgEl.dataset && svgEl.dataset.assetUpgraded)) continue;

            // CRITICAL: capture rendered size BEFORE swap
            var size = _getSvgRenderedSize(svgEl);
            if (!size) {
                // SAFETY: no size determinable — skip upgrade, keep SVG.
                if (svgEl.dataset) svgEl.dataset.assetUpgraded = 'skipped-no-size';
                continue;
            }

            // Build replacement <img>
            var img = document.createElement('img');
            var svgClassName = (svgEl.className && svgEl.className.baseVal !== undefined)
                ? svgEl.className.baseVal
                : (svgEl.getAttribute && svgEl.getAttribute('class')) || '';
            img.className = 'v-asset-png ' + svgClassName;
            img.src = url;
            img.alt = '';
            img.loading = 'lazy';
            // HTML attrs: layout hint BEFORE image loads (browser uses for reserving
            // space; CSS rules on the class still override final size if present).
            img.setAttribute('width', size.w);
            img.setAttribute('height', size.h);

            // Inline style strategy depends on size source:
            // - 'attr'/'style': SVG had explicit inline sizing → preserve via inline style
            // - 'rect': CSS-driven sizing → DON'T set inline width/height (let CSS rules
            //   on the preserved class match the IMG so it sizes correctly)
            // - 'viewbox-default': best-effort default → DON'T set inline (let CSS try)
            var origSvgStyle = (svgEl.getAttribute && svgEl.getAttribute('style')) || '';
            // Strip ;color:X from origSvgStyle (IMG doesn't use it, was for SVG fill)
            var cleanStyle = origSvgStyle.replace(/(^|;)\s*color\s*:[^;]+/gi, '$1');
            var baseStyle = cleanStyle
                + ';object-fit:contain'
                + ';display:inline-block'
                + ';vertical-align:middle'
                + ';max-width:100%'
                + ';max-height:100%';
            if (size.source === 'attr' || size.source === 'style') {
                // Explicit size → preserve via inline (overrides any CSS)
                img.style.cssText = baseStyle
                    + ';width:' + size.w + 'px'
                    + ';height:' + size.h + 'px';
            } else {
                // CSS-driven → leave width/height to CSS class rules (preserved)
                img.style.cssText = baseStyle;
            }
            if (img.dataset) img.dataset.assetUpgraded = '1';

            // Fallback to original SVG on load error
            (function (origSvg) {
                img.onerror = function () {
                    this.onerror = null;
                    if (this.parentNode) this.parentNode.replaceChild(origSvg, this);
                };
            })(svgEl.cloneNode(true));

            // Mark + swap
            if (svgEl.dataset) svgEl.dataset.assetUpgraded = '1';
            if (svgEl.parentNode) {
                svgEl.parentNode.replaceChild(img, svgEl);
                upgraded++;
            }
        }
        return upgraded;
    }

    /* Defensive CSS — prevents IMG from exceeding container even if sizing
       calculation fails. Belt-and-suspenders with explicit width/height attrs. */
    function _injectDefensiveCSS() {
        if (!document.head) return;
        if (document.getElementById('v-asset-png-defensive-css')) return;
        var style = document.createElement('style');
        style.id = 'v-asset-png-defensive-css';
        style.textContent =
            'img.v-asset-png{max-width:100%;max-height:100%;}' +
            'img.v-asset-png[width]:not([width="0"]){width:attr(width px);}' +
            'img.v-asset-png[height]:not([height="0"]){height:attr(height px);}';
        document.head.appendChild(style);
    }

    function upgradeAll(rootEl) {
        return upgradeAllIcons(rootEl);
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
        // URL builders (smart routing)
        resolveIconUrl: resolveIconUrl,
        combatIconUrl: combatIconUrl,
        enemyIconUrl: enemyIconUrl,
        skillIconUrl: skillIconUrl,
        cityIconUrl: cityIconUrl,
        raceIconUrl: raceIconUrl,
        npcIconUrl: npcIconUrl,
        uiIconUrl: uiIconUrl,
        achievementIconUrl: achievementIconUrl,
        itemIconUrl: itemIconUrl,
        // HTML builders
        classIconHTML: classIconHTML,
        // DOM upgraders
        upgradeClassIcons: upgradeClassIcons,  // legacy alias → upgradeAllIcons
        upgradeAllIcons: upgradeAllIcons,
        upgradeAll: upgradeAll,
        // Internals (debug)
        _maps: { COMBAT_PNGS: COMBAT_PNGS, ENEMY_PNGS: ENEMY_PNGS,
                 SKILL_PNGS: SKILL_PNGS, CITY_LOC_PNGS: CITY_LOC_PNGS,
                 NPC_PNGS: NPC_PNGS, UI_PNGS: UI_PNGS,
                 ACHIEVEMENT_PNGS: ACHIEVEMENT_PNGS,
                 RACE_OFFICIAL_OPT: RACE_OFFICIAL_OPT },
        _slugify: _slugify,
        _basePath: _basePath
    };

    // Auto-start: defensive CSS + initial upgrade + observer for dynamic content
    function _init() {
        try {
            _injectDefensiveCSS();
            upgradeAll();
            _startObserver();
        } catch (_) {}
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

    // Items use async-loaded manifest. Re-scan AFTER items-resolver finishes
    // loading its manifest (typically ~100-500ms after page load) to catch
    // any ic-it-* sprites that were rendered before vItems.has became truthy.
    function _retryItemUpgrade() {
        if (window.vItems && window.vItems._state && window.vItems._state.loaded) {
            try { upgradeAll(); } catch (_) {}
        } else {
            setTimeout(_retryItemUpgrade, 200);
        }
    }
    setTimeout(_retryItemUpgrade, 200);
})(typeof window !== 'undefined' ? window : this);
