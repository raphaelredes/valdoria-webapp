/**
 * dnd-rules-shared.js — FONTE ÚNICA da matemática D&D 5e do cliente.
 *
 * ROLE: elimina a divergência de REGRA entre os 3 pilares (cidade / exploração /
 * combate). Antes desta consolidação o MESMO personagem tinha odds de skill check
 * DIFERENTES dependendo de onde a viagem começava (cidade somava proficiência
 * escalando por nível; a exploração somava 0 ou +2 fixo). Este módulo é puro
 * (sem estado, sem DOM) e é consumido pelos HTML — eles NÃO redefinem mais.
 *
 * Plano: docs/sistemas/single-source-consolidation-plan.md (FASE 1).
 *
 * FONTES canônicas migradas (as MELHORES versões de cada pilar):
 *   - combate.html: spell DC por classe (_simSpellcastingAbility) + saves por classe
 *                   (simClassSaveProficiencies) + prof PHB (2 + floor((lvl-1)/4)).
 *   - cidade.html : CLASS_STAT_MAP (12 classes, array PHB) + whitelist de prof
 *                   por classe (_classHasSkillProficiency) + chance% canônica.
 *   - utils.py    : class_key() (ASCII canonical) — espelhado aqui em classKey(),
 *                   com tabela EN→PT extra (Python só normaliza EN→PT pra RAÇAS;
 *                   os consumidores JS — CLASS_STAT_MAP/whitelist — precisam de PT).
 *
 * SERVER É A AUTORIDADE (SUPREME RULE #0): em sessão REMOTE a resolução FINAL de
 * skill check / spell DC / identidade idealmente vem do Python (src/game/). Este
 * módulo:
 *   (a) é o fix CERTO + suficiente pro sandbox/mock client-side (viagem na cidade
 *       mock, combate de exploração — ver memory/reference_exploration_combat_client_side.md);
 *   (b) é INTERIM pra gameplay REMOTE — spellSaveDc()/statMod() PREFEREM valores
 *       autoritativos do servidor (actor.spell_save_dc / actor.dc / player.mods)
 *       quando presentes, e só calculam como fallback. A meta de longo prazo é o
 *       backend resolver e o cliente só animar.
 *
 * API (window.DndRules):
 *   abilityMod(score)                 floor((score-10)/2)
 *   proficiencyBonus(level)           2 + floor((level-1)/4)   (PHB)
 *   classKey(cls)                     normaliza enum/EN/PT/acento -> ASCII PT
 *   statBaseForClass(cls, stat)       CLASS_STAT_MAP (array PHB) — fallback DEV/mock
 *   spellcastingAbility(cls)          'int'|'wis'|'cha' por classe (PHB p.205)
 *   classSaveProficiencies(cls)       ['str','con'] etc (PHB)
 *   statMod(player, stat)             normaliza os 3 shapes de player -> modificador
 *   getStatMod(player, stat)          alias de statMod (compat com o plano §3.1)
 *   isProficient(player, stat, skill) prefere listas reais (server) -> whitelist classe
 *   dcToSuccessPct(dc, mod)           % de sucesso, clamp [5,95] (nat1 falha / nat20 passa)
 *   successPct(player, check)         % usando o MESMO mod+prof do resolve (odds iguais)
 *   spellSaveDc(actor)               8 + prof + mod(atributo de conjuração POR CLASSE)
 *   resolveSkillCheck(player, check)  {d20, mod, prof, total, dc, success, crit, critFail}
 *   statLabel(stat)                   nome PT-BR do atributo
 *   STAT_NAMES_PT, STAT_FULL, SKILL_TO_ABILITY, CLASS_STAT_MAP, CLASS_SAVE_PROFS
 *
 * check = { stat?, skill?, dc }  — journey passa {stat}; tile-event passa {skill}.
 *   Se só vier skill, o atributo é derivado via SKILL_TO_ABILITY. SEMPRE a mesma
 *   regra: prof ESCALANDO por nível (PHB), NUNCA +2 fixo.
 *
 * SELF-TEST (console DEV — deve dar tudo true):
 *   DndRules.abilityMod(14)===2 && DndRules.proficiencyBonus(5)===3 &&
 *   DndRules.classKey('Clérigo')==='clerigo' && DndRules.classKey('Wizard')==='mago' &&
 *   DndRules.spellcastingAbility('Bardo')==='cha' && DndRules.dcToSuccessPct(10,3)===70
 *
 * ES5 only (Android WebView 2GB / low-end). Sem const/let/arrow/template literals.
 */
(function (global) {
    'use strict';
    if (global.DndRules) return;  // idempotente (carregado por 3 HTML)

    /* ------------------------------------------------------------------ */
    /* Constantes (dados — fonte única)                                    */
    /* ------------------------------------------------------------------ */

    // Nome PT-BR do atributo (byte-idêntico em cidade CITY_STAT_NAMES_PT +
    // exploração STAT_NAMES_PT antes da consolidação — L1 do plano).
    var STAT_NAMES_PT = {
        str: 'Força', dex: 'Destreza', con: 'Constituição',
        int: 'Inteligência', wis: 'Sabedoria', cha: 'Carisma'
    };

    // Short ability key -> full canonical (espelha o reverso de STAT_KEY da cidade
    // FOR->strength). Usado por statMod pra ler p.stats['strength'] (shape cidade plaza).
    var STAT_FULL = {
        str: 'strength', dex: 'dexterity', con: 'constitution',
        int: 'intelligence', wis: 'wisdom', cha: 'charisma'
    };

    // PT-BR abreviacao de atributo -> full canonical (FASE 9/M8: era STAT_KEY
    // duplicado 2x na cidade, function-scoped). Le p.stats['strength'] a partir
    // de FOR/DES/CON/INT/SAB/CAR (rolagem de skill check da cidade).
    var STAT_KEY_PT = {
        FOR: 'strength', DES: 'dexterity', CON: 'constitution',
        INT: 'intelligence', SAB: 'wisdom', CAR: 'charisma'
    };

    // Skill name -> ability key (short). União de exploração (12245) + svc (60).
    // Inclui passthrough das próprias abreviações de atributo (str:'str') pra os
    // checks que vêm chaveados por stat (journey) E por skill (tile-event). L2 do plano.
    var SKILL_TO_ABILITY = {
        str: 'str', athletics: 'str',
        dex: 'dex', acrobatics: 'dex', sleight: 'dex', sleight_of_hand: 'dex', stealth: 'dex',
        con: 'con',
        int: 'int', arcana: 'int', history: 'int', investigation: 'int', nature: 'int', religion: 'int',
        wis: 'wis', animal: 'wis', animal_handling: 'wis', insight: 'wis', medicine: 'wis', perception: 'wis', survival: 'wis',
        cha: 'cha', deception: 'cha', intimidation: 'cha', performance: 'cha', persuasion: 'cha'
    };

    // Array PHB padrão por classe (prioridade de atributo). Base = cidade
    // _statBaseForClass CLASS_STAT_MAP (rica, 12 classes). Keyed por ASCII PT.
    // Fallback DEV/mock quando o player não traz scores reais do servidor.
    var CLASS_STAT_MAP = {
        bardo:       { cha: 16, dex: 14, con: 12, wis: 11, int: 10, str: 8 },
        feiticeiro:  { cha: 16, con: 14, dex: 12, wis: 11, int: 10, str: 8 },
        mago:        { int: 16, dex: 14, con: 13, wis: 11, cha: 10, str: 8 },
        clerigo:     { wis: 16, con: 14, str: 13, cha: 11, dex: 10, int: 8 },
        druida:      { wis: 16, con: 14, dex: 13, int: 11, cha: 10, str: 8 },
        bruxo:       { cha: 16, con: 14, dex: 13, wis: 11, int: 10, str: 8 },
        paladino:    { str: 15, cha: 14, con: 14, wis: 11, dex: 10, int: 8 },
        patrulheiro: { dex: 16, wis: 14, con: 13, str: 11, int: 10, cha: 8 },
        guerreiro:   { str: 15, con: 14, dex: 14, wis: 11, cha: 10, int: 8 },
        barbaro:     { str: 15, con: 15, dex: 13, wis: 11, cha: 10, int: 8 },
        monge:       { dex: 15, wis: 14, con: 13, str: 11, int: 10, cha: 8 },
        ladino:      { dex: 16, cha: 13, con: 13, int: 12, wis: 11, str: 8 }
    };

    // Saving throws proficientes por classe (PHB — 2 por classe). Base = combate
    // simClassSaveProficiencies. Keyed por ASCII PT.
    var CLASS_SAVE_PROFS = {
        barbaro:     ['str', 'con'],
        bardo:       ['dex', 'cha'],
        clerigo:     ['wis', 'cha'],
        druida:      ['int', 'wis'],
        feiticeiro:  ['con', 'cha'],
        guerreiro:   ['str', 'con'],
        ladino:      ['dex', 'int'],
        mago:        ['int', 'wis'],
        monge:       ['str', 'dex'],
        paladino:    ['wis', 'cha'],
        patrulheiro: ['str', 'dex'],
        bruxo:       ['wis', 'cha']
    };

    // EN -> PT canonical. O class_key() do Python NÃO mapeia EN->PT pra classes
    // (só pra raças, via _RACE_PT_TO_EN). Mas os consumidores JS (CLASS_STAT_MAP,
    // CLASS_SAVE_PROFS, whitelist) usam keys PT ASCII — então normalizamos aqui.
    var _CLASS_EN_TO_PT = {
        bard: 'bardo', sorcerer: 'feiticeiro', wizard: 'mago', cleric: 'clerigo',
        druid: 'druida', warlock: 'bruxo', paladin: 'paladino', ranger: 'patrulheiro',
        fighter: 'guerreiro', barbarian: 'barbaro', monk: 'monge', rogue: 'ladino'
    };

    /* ------------------------------------------------------------------ */
    /* Helpers internos                                                    */
    /* ------------------------------------------------------------------ */

    function _stripAccents(s) {
        if (s == null) return '';
        try {
            return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        } catch (_e) {
            return String(s);
        }
    }

    // Whitelist conservadora de prof por classe (espelha cidade
    // _classHasSkillProficiency). Só aplica quando não há lista real de skills.
    function _classWhitelistProficient(ck, stat, skill) {
        if (!ck) return false;
        if (ck === 'bardo') return true;  // Bardo (Versátil) — qualquer skill
        if (ck === 'ladino') return ['dex', 'int', 'wis', 'cha'].indexOf(stat) >= 0;
        if (ck === 'patrulheiro') return ['dex', 'wis', 'str'].indexOf(stat) >= 0;
        if (ck === 'clerigo') return ['wis', 'int', 'cha'].indexOf(stat) >= 0;
        if (ck === 'druida') return ['wis', 'int'].indexOf(stat) >= 0;
        if (ck === 'guerreiro') return ['str', 'dex', 'wis'].indexOf(stat) >= 0;
        return false;  // demais classes — player declara via background
    }

    // mod + prof compartilhado por resolveSkillCheck E successPct → ODDS IGUAIS.
    function _modAndProf(player, check) {
        check = check || {};
        var stat = check.stat
            ? String(check.stat).toLowerCase()
            : (SKILL_TO_ABILITY[String(check.skill || '').toLowerCase()] || 'str');
        var mod = statMod(player, stat);
        var lvl = (player && (player.level || player.lvl)) || 1;
        var prof = isProficient(player, stat, check.skill) ? proficiencyBonus(lvl) : 0;
        return { stat: stat, mod: mod, prof: prof };
    }

    /* ------------------------------------------------------------------ */
    /* Matemática pura D&D 5e                                              */
    /* ------------------------------------------------------------------ */

    function abilityMod(score) {
        return Math.floor(((score | 0) - 10) / 2);
    }

    function proficiencyBonus(level) {
        level = Math.max(1, level | 0);
        return 2 + Math.floor((level - 1) / 4);
    }

    /* ------------------------------------------------------------------ */
    /* Classe                                                              */
    /* ------------------------------------------------------------------ */

    function classKey(cls) {
        if (cls && typeof cls === 'object' && cls.value != null) cls = cls.value;  // enum-like
        var s = _stripAccents(cls == null ? '' : String(cls)).toLowerCase().replace(/^\s+|\s+$/g, '');
        if (!s) return '';
        s = s.split(/\s+/)[0];  // primeiro token (espelha class_key() do Python)
        return _CLASS_EN_TO_PT[s] || s;
    }

    function statBaseForClass(cls, stat) {
        var map = CLASS_STAT_MAP[classKey(cls)];
        if (!map) return 10;  // classe desconhecida -> neutro (mod 0)
        return map[String(stat).toLowerCase()] || 10;
    }

    // Atributo de conjuração por classe (PHB p.205) — NÃO é sempre INT.
    function spellcastingAbility(cls) {
        var c = classKey(cls);
        if (!c) return 'int';
        if (c === 'clerigo' || c === 'druida' || c === 'patrulheiro' || c === 'monge') return 'wis';
        if (c === 'paladino' || c === 'bardo' || c === 'feiticeiro' || c === 'bruxo') return 'cha';
        return 'int';  // mago + default
    }

    function classSaveProficiencies(cls) {
        return (CLASS_SAVE_PROFS[classKey(cls)] || []).slice();
    }

    // Nome do recurso de classe — autoridade Python resource_name / combate-data-shared.
    // UPPERCASE (convenção da exploração + chave do RES_CLASS_MAP). FASE 6 (H5):
    // antes a exploração mostrava Bardo='MANA' (errado) e Guerreiro=null.
    var _CLASS_RESOURCE = {
        barbaro: 'FÚRIA', guerreiro: 'VIGOR', bardo: 'INSPIRAÇÃO',
        monge: 'KI', ladino: 'ENERGIA', bruxo: 'PACTO'
        // demais conjuradores (mago/clerigo/druida/paladino/patrulheiro/feiticeiro) -> MANA
    };
    function classResourceName(cls) {
        return _CLASS_RESOURCE[classKey(cls)] || 'MANA';
    }

    /* ------------------------------------------------------------------ */
    /* Normalizadores de shape de player                                   */
    /* ------------------------------------------------------------------ */

    // Modificador de atributo a partir de QUALQUER um dos 3 shapes de player:
    //   1) exploração: S.player.mods[stat]  (modificador já calculado pelo server)
    //   2) cidade    : p.stats[stat] ou p.stats[FULL]  (scores brutos, str OU strength)
    //   3) combate   : actor[stat] / actor.intScore     (scores brutos)
    //   4) DEV/mock  : statBaseForClass(classe) -> abilityMod
    function statMod(player, stat) {
        if (!player || !stat) return 0;
        stat = String(stat).toLowerCase();
        // 1) exploração — mods pré-calculados (autoritativo se o server populou)
        if (player.mods && typeof player.mods[stat] === 'number') return player.mods[stat];
        // 2) cidade — scores brutos (short key OU full name)
        if (player.stats) {
            if (typeof player.stats[stat] === 'number') return abilityMod(player.stats[stat]);
            var full = STAT_FULL[stat];
            if (full && typeof player.stats[full] === 'number') return abilityMod(player.stats[full]);
        }
        // 3) combate actor — score bruto no próprio objeto (intScore pra INT)
        if (stat === 'int' && typeof player.intScore === 'number') return abilityMod(player.intScore);
        if (typeof player[stat] === 'number') return abilityMod(player[stat]);
        // 4) fallback DEV/mock — array PHB por classe
        return abilityMod(statBaseForClass(player.cls || player.class || player.hero_class || player.cls_key, stat));
    }

    // Proficiente no atributo/skill? Prefere listas REAIS (server) -> whitelist classe.
    function isProficient(player, stat, skill) {
        if (!player) return false;
        stat = stat ? String(stat).toLowerCase() : '';
        var sk = skill ? String(skill).toLowerCase() : '';
        // 1) exploração — prof[] chaveado por ability key (save profs da classe)
        if (Object.prototype.toString.call(player.prof) === '[object Array]') {
            if (sk && player.prof.indexOf(sk) >= 0) return true;
            if (stat && player.prof.indexOf(stat) >= 0) return true;
            return false;  // lista autoritativa por ability -> respeita
        }
        // 2) cidade/server — listas de NOMES de skill
        var lists = [];
        if (Object.prototype.toString.call(player.skills) === '[object Array]') lists = lists.concat(player.skills);
        if (Object.prototype.toString.call(player.skill_proficiencies) === '[object Array]') lists = lists.concat(player.skill_proficiencies);
        if (Object.prototype.toString.call(player.acquired_skills) === '[object Array]') lists = lists.concat(player.acquired_skills);
        if (lists.length) {
            for (var i = 0; i < lists.length; i++) {
                var L = String(lists[i] || '').toLowerCase();
                if (sk && L === sk) return true;
                if (stat && L === stat) return true;
            }
            return false;  // tem lista autoritativa -> respeita
        }
        // 3) fallback whitelist por classe (mock/DEV)
        return _classWhitelistProficient(classKey(player.cls || player.class || player.hero_class || player.cls_key), stat, sk);
    }

    /* ------------------------------------------------------------------ */
    /* DC / chance / resolução                                             */
    /* ------------------------------------------------------------------ */

    // % de sucesso de um d20 + mod vs DC. Clamp [5,95]: um nat 20 sempre pode
    // passar (5% mín) e um nat 1 sempre pode falhar (95% máx). Fórmula canônica
    // de cidade _cityJourneyChance / exploração _journeyChancePct (idênticas).
    function dcToSuccessPct(dc, mod) {
        var need = (dc | 0) - (mod || 0);
        var passing = 20 - Math.max(0, Math.min(20, need - 1));
        passing = Math.max(1, Math.min(19, passing));
        return Math.round(passing / 20 * 100);
    }

    // % de sucesso pro preview — usa o MESMO mod+prof do resolve (garante que o
    // % mostrado bate com a rolagem; resolve o H1/A1 — preview e resolve divergiam).
    function successPct(player, check) {
        if (!check || check.dc == null) return null;
        var r = _modAndProf(player, check);
        return dcToSuccessPct(check.dc, r.mod + r.prof);
    }

    // CD de magia: 8 + prof + mod(atributo de conjuração POR CLASSE). Respeita o
    // valor autoritativo do servidor (spell_save_dc / dc) quando presente.
    function spellSaveDc(actor) {
        if (!actor) return 8;
        if (actor.spell_save_dc != null) return actor.spell_save_dc | 0;  // server authority
        if (actor.dc != null) return actor.dc | 0;                         // server authority (cidade m.dc)
        var lvl = actor.level || actor.lvl || 1;
        var prof = (actor.prof != null) ? (actor.prof | 0) : proficiencyBonus(lvl);
        var abil = spellcastingAbility(actor.cls || actor.class || actor.hero_class || actor.cls_key);
        return 8 + prof + statMod(actor, abil);
    }

    // Resolve um skill check D&D 5e. success = total >= dc (PHB: checks NÃO têm
    // auto-sucesso/falha em 20/1 — crit/critFail ficam como flag informativa pra
    // narrativa). prof SEMPRE escala por nível (PHB), NUNCA +2 fixo.
    function resolveSkillCheck(player, check) {
        check = check || {};
        var mp = _modAndProf(player, check);
        var d20 = 1 + Math.floor(Math.random() * 20);
        var dc = (check.dc != null) ? (check.dc | 0) : 10;
        var total = d20 + mp.mod + mp.prof;
        return {
            d20: d20, mod: mp.mod, prof: mp.prof, stat: mp.stat, skill: check.skill || null,
            total: total, dc: dc, success: total >= dc, crit: d20 === 20, critFail: d20 === 1
        };
    }

    function statLabel(stat) {
        return STAT_NAMES_PT[String(stat).toLowerCase()] || String(stat || '').toUpperCase();
    }

    /* ------------------------------------------------------------------ */
    /* Export                                                              */
    /* ------------------------------------------------------------------ */

    global.DndRules = {
        abilityMod: abilityMod,
        proficiencyBonus: proficiencyBonus,
        classKey: classKey,
        statBaseForClass: statBaseForClass,
        spellcastingAbility: spellcastingAbility,
        classSaveProficiencies: classSaveProficiencies,
        classResourceName: classResourceName,
        statMod: statMod,
        getStatMod: statMod,  // alias (plano §3.1 chama getStatMod, §7.3 chama statMod)
        isProficient: isProficient,
        dcToSuccessPct: dcToSuccessPct,
        successPct: successPct,
        spellSaveDc: spellSaveDc,
        resolveSkillCheck: resolveSkillCheck,
        statLabel: statLabel,
        STAT_NAMES_PT: STAT_NAMES_PT,
        STAT_FULL: STAT_FULL,
        STAT_KEY_PT: STAT_KEY_PT,
        SKILL_TO_ABILITY: SKILL_TO_ABILITY,
        CLASS_STAT_MAP: CLASS_STAT_MAP,
        CLASS_SAVE_PROFS: CLASS_SAVE_PROFS
    };
})(typeof window !== 'undefined' ? window : this);
