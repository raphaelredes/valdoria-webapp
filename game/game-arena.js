/* ═══════════════════════════════════════════════════════════════
   Arena de Combate — Gladiator/Coliseum Redesign (#41)
   Interceptado por game-popup-unified.js via arena_screen

   Design references aplicadas:
   - Game UI Database: tier badges que ficam mais imponentes a cada rank
   - Gladiator Arena assets: arches, columns, crowd silhouette, torches
   - Hipsters & Dragons: multiple tiers of bloodthirsty spectators
   - Medieval UI patterns: laurel wreaths, embossed gold, stone textures

   Safe DOM: todos os elementos construidos via createElement/textContent.

   MAPA_IA — navegacao rapida (atualizar a CADA mudanca):
     ~21   ARENA_SVC_META           cb -> WebP icon canonical (grid de servicos)
     ~62   VORHAN_DIALOGUE          greeting principal (NPC row click)
     ~89   renderArenaScreen        dispatcher por d.type
     ~110  _arenaTierMedallion      medalhao do tier + crest WebP (fallback CSS)
     ~150  _arenaBackdrop           coliseu (tochas + multidao)
     ~165  _renderArenaMain         tela principal (cenario+NPC+rep+tier+stats+
                                     desafiante+recompensa+SERVICOS+acoes)
     ~410  _renderArenaHpWarning    aviso de HP baixo
     ~480  _renderArenaResult       pos-combate (vitoria/derrota)
     ~620  _renderArenaLeaderboard  ranking diario (podium + lista)
     ~760  _arenaServicesGrid       grid .services/.svc (PADRAO_LOCAIS)
     ~810  _renderArenaRules        Regras do Coliseu (tiers + leis da areia)
     ~960  _renderArenaRecord       Seus Feitos (registro agregado)
     ~1010 _renderArenaHistory      Historico de Lutas (ultimos combates)
     ~1100 _div/_makeBtn/etc        DOM helpers
     ~1190 window.renderArenaScreen export

   Busca rapida:
     grep "function _render"  -> telas
     grep "data-tier"         -> medalhoes/tiers
   ═══════════════════════════════════════════════════════════════ */

/* task #75 (2026-05-20): IIFE wrap pra prevenir colis\u00F5es de globais entre
   renderers (regra estabelecida ap\u00F3s bug Garrick/Vorhan task #70). Apenas
   renderArenaScreen \u00E9 exposto via window no final. */
(function() {

/* 2026-05-21 \u2014 ARENA_SVC_META map cb -> PNG path canonical.
   Cobre cb Arena enviados pelo backend + aliases. */
var ARENA_SVC_META = {
  'arena_challenge':   { icon: '<img src="../shared/img/services/svc-duelo.webp" alt="">' },
  'arena_duel':        { icon: '<img src="../shared/img/services/svc-duelo.webp" alt="">' },
  'arena_solo':        { icon: '<img src="../shared/img/services/svc-combate-solo.webp" alt="">' },
  'arena_team':        { icon: '<img src="../shared/img/services/svc-combate-equipe.webp" alt="">' },
  'arena_tournament':  { icon: '<img src="../shared/img/services/svc-torneio.webp" alt="">' },
  'arena_training':    { icon: '<img src="../shared/img/services/svc-treino-arena.webp" alt="">' },
  'arena_train':       { icon: '<img src="../shared/img/services/svc-treino-arena.webp" alt="">' },
  'arena_ranking':     { icon: '<img src="../shared/img/services/svc-ranking-arena.webp" alt="">' },
  'arena_daily_board': { icon: '<img src="../shared/img/services/svc-ranking-arena.webp" alt="">' },
  /* arena_history reaproveita svc-livros (crônica de combates passados);
     arena_record reaproveita svc-torneio (troféu/louros = feitos pessoais).
     Catálogo existente — regra "Items Existentes: NUNCA recriar SVG". */
  'arena_history':     { icon: '<img src="../shared/img/services/svc-livros.webp" alt="">' },
  'arena_record':      { icon: '<img src="../shared/img/services/svc-torneio.webp" alt="">' },
  'arena_rules':       { icon: '<img src="../shared/img/services/svc-informacoes.webp" alt="">' }
};
window._ARENA_SVC_META = ARENA_SVC_META;

var _ARENA_MEDALS = {1: '1\u00BA', 2: '2\u00BA', 3: '3\u00BA'};

/* === PADRAO_TAVERNA canonical (task #34, 2026-05-20) === */
if (!window._SVC_CONFIG_ARENA) {
  window._SVC_CONFIG_ARENA = {
    faction: 'arena',
    factionLabel: 'Arena de Valdoria',
    reactions: {
      very_negative: 'Vorhan cospe no ch\u00E3o. <i>(volta-se para a multid\u00E3o)</i> "Pr\u00F3ximo!"',
      negative: 'Vorhan aperta os olhos, descrente. <i>(co\u00E7a a cicatriz no queixo)</i> "Trouxa."',
      neutral: 'Vorhan anota o resultado no escudo de couro. <i>(n\u00E3o te olha)</i> "Hmm."',
      positive: 'Vorhan assente, satisfeito. <i>(bate o punho sobre o peito)</i> "Lutaste bem. A multid\u00E3o lembrar\u00E1."',
      very_positive: 'Vorhan estende a m\u00E3o calejada. <i>(rara mostra de respeito)</i> "Honraste o coliseu. A Arena reconhece os bravos."'
    },
    confirmMsgs: {
      narration: 'Vorhan marca o resultado na tabela de combate. <i>(tom de bronze ressoa pelos corredores)</i>',
      generic: '"Registrado. Pr\u00F3ximo combate em breve."'
    }
  };
}

/* P4 (2026-07-02): sessão REMOTE = diálogo server-driven (venue 'arena' no
   city_dialogue_resolver — saudação ROTATIVA anti-repeat + node 'rules' que
   conserta o cb no-op + transitions pras telas ricas). VORHAN_DIALOGUE abaixo
   vira fallback LOCAL-only (dev file://). */
function _arnIsRemote() {
  return !!(window.vCityServer && window.vCityServer.isRemote && window.vCityServer.isRemote());
}

var VORHAN_DIALOGUE = {
  npc: {
    name: 'Mestre Vorhan',
    desc: 'Mestre de Armas \u00B7 vinte anos no coliseu',
    portrait: '../shared/img/npcs/mestre-vorhan.webp'
  },
  script: [
    { type: 'narration', text: 'Vorhan \u00E9 colossal \u2014 dois metros, cicatrizes desenhando mapas em seu rosto, armadura de couro batido suja do sangue de mil combates. Atr\u00E1s dele, o coliseu zumbe com a multid\u00E3o. Ele te mede com o olhar de quem j\u00E1 viu mil aventureiros prometer e n\u00E3o cumprir.' },
    { type: 'speech', speaker: 'Mestre Vorhan', text: 'Vens lutar ou tagarelar? <i>(cruza os bra\u00E7os calejados)</i> A Arena n\u00E3o tolera covardes. Ganha duas vezes seguidas e a multid\u00E3o lembrar\u00E1. Perde mais que ganha e ningu\u00E9m vai sequer ao funeral.' }
  ],
  choices: [
    // task #70 (2026-05-20): cb's alinhadas com backend canonical em arena_manager.py.
    // Antes: 'arena_fight'/'arena_leaderboard' \u2192 n\u00E3o dispatched (silent close).
    // Agora: backend handlers reais \u2192 'arena_challenge' abre tier selection;
    // 'arena_daily_board' abre ranking. 'rules' ainda no-op (sem backend handler).
    { id: 'fight',   label: '"Vim lutar."', cb: 'arena_challenge' },
    { id: 'rules',   label: '"Explica as regras."', cb: 'arena_rules' },
    { id: 'rank',    label: '"Mostra o ranking."', cb: 'arena_daily_board' },
    { id: 'leave',   label: '\u21A9 "Outra hora, Mestre."', cb: 'close' }
  ]
};

/**
 * Renders the Arena screen inside a popup body element.
 * @param {HTMLElement} el - Container element (popup body)
 * @param {Object} data - arena_screen structured data from backend
 */
function renderArenaScreen(el, data) {
    el.className = 'arena-screen';
    var type = data.type;
    if (type === 'main')             _renderArenaMain(el, data);
    else if (type === 'hp_warning')  _renderArenaHpWarning(el, data);
    else if (type === 'result')      _renderArenaResult(el, data);
    else if (type === 'leaderboard') _renderArenaLeaderboard(el, data);
    else if (type === 'rules')       _renderArenaRules(el, data);
    else if (type === 'record')      _renderArenaRecord(el, data);
    else if (type === 'history')     _renderArenaHistory(el, data);
    else {
        el.textContent = 'Erro: tipo de tela desconhecido.';
    }
}

/* ── Coin icon helper (safe DOM) ───────────────────────────── */
function _coinEl() {
    var s = document.createElement('span');
    s.className = 'vi vi-coin sm';
    return s;
}

/* ── Tier medallion (crest image + CSS fallback) ───────────── *
 * Retorna um wrapper [medalhão + legenda]. A heráldica WebP do tier
 * (/shared/img/arena/tier-{id}.webp) é sobreposta ao medalhão CSS.
 * Se a imagem falhar (onerror), o medalhão CSS (gradiente + texto
 * embossado) permanece como fallback gracioso — nenhuma tela quebrada.
 * A legenda (nome + faixa de nível) fica SEMPRE visível abaixo, então
 * a informação nunca se perde, com ou sem crest.
 * tierId = iron|bronze|silver|gold|mythral (id canonical do backend). */
function _arenaTierMedallion(tierId, tierName, min, max) {
    var box = _div('arena-tier-box');

    var badge = _div('arena-tier-medallion');
    badge.setAttribute('data-tier', tierId);

    /* CSS fallback content (texto embossado — escondido quando há crest) */
    var tierLabel = _div('arena-tier-label');
    tierLabel.textContent = 'TIER';
    badge.appendChild(tierLabel);
    var tierNameEl = _div('arena-tier-name');
    tierNameEl.textContent = (tierName || 'Ferro').toUpperCase();
    badge.appendChild(tierNameEl);

    /* Crest image overlay — graceful fallback se faltar o arquivo. */
    var crestImg = document.createElement('img');
    crestImg.className = 'arena-tier-crest';
    crestImg.src = '../shared/img/arena/tier-' + tierId + '.webp';
    crestImg.alt = 'Brasão Tier ' + (tierName || '');
    crestImg.loading = 'lazy';
    crestImg.onerror = function() { this.remove(); };
    crestImg.onload = function() { badge.classList.add('has-crest'); };
    badge.appendChild(crestImg);
    box.appendChild(badge);

    /* Legenda sempre visível (nome + faixa de nível). */
    var caption = _div('arena-tier-caption');
    var capName = _div('arena-tier-caption-name');
    capName.textContent = (tierName || 'Ferro').toUpperCase();
    caption.appendChild(capName);
    var capRange = _div('arena-tier-caption-range');
    capRange.textContent = 'Nível ' + (min || 1) + '–' + (max || 4);
    caption.appendChild(capRange);
    box.appendChild(caption);

    return box;
}

/* ── Coliseum backdrop (shared decorative element) ────────── */
function _arenaBackdrop() {
    var back = _div('arena-backdrop');
    back.setAttribute('aria-hidden', 'true');
    back.appendChild(_div('arena-backdrop-crowd'));
    back.appendChild(_div('arena-backdrop-arch arch-left'));
    back.appendChild(_div('arena-backdrop-arch arch-right'));
    var torchL = _div('arena-backdrop-torch torch-left');
    torchL.appendChild(_div('torch-flame'));
    back.appendChild(torchL);
    var torchR = _div('arena-backdrop-torch torch-right');
    torchR.appendChild(_div('torch-flame'));
    back.appendChild(torchR);
    return back;
}

/* ── Main Screen ───────────────────────────────────────────── */
function _renderArenaMain(el, d) {
    var tier = d.tier || {};
    var stats = d.stats || {};
    var ch = d.challenger || {};
    var reward = d.reward || {};

    var frag = document.createDocumentFragment();

    /* === PADRAO_TAVERNA canonical: Cenário + NPC row + Rep bar (task #34) === */
    var cenarioEl = _div('cenario');
    var bg = document.createElement('img');
    bg.className = 'cenario-bg';
    bg.src = '../shared/img/arena/arena-banner.webp';
    bg.loading = 'lazy';
    bg.onerror = function(){ this.style.display = 'none'; };
    cenarioEl.appendChild(bg);
    cenarioEl.appendChild(_div('candle-glow l'));
    cenarioEl.appendChild(_div('candle-glow r'));
    var crest = document.createElement('img');
    crest.className = 'cenario-brasao';
    crest.src = '../shared/img/arena/arena-crest.webp';
    crest.alt = 'Brasão da Arena';
    crest.loading = 'lazy';
    crest.onerror = function(){ this.style.display = 'none'; };
    cenarioEl.appendChild(crest);
    var heroTitulo = _div('cenario-titulo');
    var heroName = _div('name');
    heroName.textContent = 'Arena de Valdoria';
    heroTitulo.appendChild(heroName);
    var heroSub = _div('sub');
    heroSub.textContent = 'Coliseu Real · Tier ' + ((tier.name || 'Ferro').toUpperCase());
    heroTitulo.appendChild(heroSub);
    cenarioEl.appendChild(heroTitulo);
    frag.appendChild(cenarioEl);

    /* NPC row: Vorhan */
    var npcRow = _div('row-npc');
    var portraitWrap = _div('npc-portrait');
    var npcImg = document.createElement('img');
    npcImg.src = '../shared/img/npcs/mestre-vorhan.webp';
    npcImg.alt = 'Mestre Vorhan';
    npcImg.loading = 'lazy';
    npcImg.onerror = function(){ this.style.display = 'none'; };
    portraitWrap.appendChild(npcImg);
    npcRow.appendChild(portraitWrap);
    var npcInfo = _div('npc-info');
    var npcName = _div('name');
    npcName.textContent = 'Mestre Vorhan';
    npcInfo.appendChild(npcName);
    var npcQuote = _div('quote');
    npcQuote.textContent = '"Vens lutar ou tagarelar?"';
    npcInfo.appendChild(npcQuote);
    npcRow.appendChild(npcInfo);
    var chev = _div('npc-chev');
    chev.textContent = '›';
    npcRow.appendChild(chev);
    npcRow.addEventListener('click', function(){
        // PADRAO_SERVIDOR (P4): o servidor monta a saudação rotativa do Vorhan e resolve.
        if (typeof window._openCityDialogue === 'function' && _arnIsRemote()) {
            window._openCityDialogue('arena', 'vorhan');
        } else if (typeof window.vEncounter === 'object' && window.vEncounter.render) {
            window._SVC_CONFIG = window._SVC_CONFIG_ARENA;
            window.vEncounter.render(VORHAN_DIALOGUE);
        }
    });
    frag.appendChild(npcRow);

    /* Rep bar */
    var renome = 0;
    if (d.renome && typeof d.renome.arena === 'number') renome = d.renome.arena;
    else if (window._PLAYER_RENOWN && typeof window._PLAYER_RENOWN.arena === 'number') renome = window._PLAYER_RENOWN.arena;
    var tierLbl = 'NEUTRO';
    if (renome >= 25) tierLbl = 'AMIGÁVEL';
    else if (renome >= 10) tierLbl = 'CORDIAL';
    else if (renome < 0 && renome >= -10) tierLbl = 'FRIO';
    else if (renome < -10) tierLbl = 'HOSTIL';
    var pct = Math.max(0, Math.min(100, Math.round((renome + 10) / 40 * 100)));
    var repBar = _div('rep-bar');
    var repLbl = document.createElement('span');
    repLbl.className = 'label';
    repLbl.textContent = 'Reputação';
    repBar.appendChild(repLbl);
    var repTrack = _div('bar');
    var repFill = _div('fill');
    repFill.style.width = pct + '%';
    repTrack.appendChild(repFill);
    repBar.appendChild(repTrack);
    var repVal = document.createElement('span');
    repVal.className = 'value';
    repVal.textContent = tierLbl + ' · ' + renome;
    repBar.appendChild(repVal);
    frag.appendChild(repBar);

    /* Coliseum backdrop with torches + crowd silhouette */
    frag.appendChild(_arenaBackdrop());

    /* Tier badge — imposing laurel wreath */
    var tierWrap = _div('arena-tier-cabecalho');
    var laurel = _div('arena-tier-laurel');
    var badge = _arenaTierMedallion(tier.id || 'iron', tier.name, tier.min, tier.max);
    laurel.appendChild(badge);
    tierWrap.appendChild(laurel);
    frag.appendChild(tierWrap);

    /* Record tablet — wins / losses / streak */
    var tablet = _div('arena-record-tablet');
    var tabHeader = _div('arena-record-header');
    tabHeader.textContent = 'REGISTRO DE COMBATE';
    tablet.appendChild(tabHeader);
    var statsRow = _div('arena-stats-row');
    statsRow.appendChild(_statBadgeEl(stats.wins || 0, 'Vit\u00f3rias', 'stat-wins'));
    statsRow.appendChild(_statBadgeEl(stats.losses || 0, 'Derrotas', 'stat-losses'));
    statsRow.appendChild(_statBadgeEl(stats.streak || 0, 'Sequ\u00eancia', 'stat-streak'));
    tablet.appendChild(statsRow);
    /* Best streak badge (if > 0) */
    if (stats.best_streak > 0) {
        var bestRow = _div('arena-best-streak');
        bestRow.textContent = 'Melhor sequ\u00eancia: ' + stats.best_streak;
        tablet.appendChild(bestRow);
    }
    var daily = _div('arena-daily-wins');
    var dailyPrefix = document.createElement('span');
    dailyPrefix.textContent = 'Vit\u00f3rias hoje: ';
    daily.appendChild(dailyPrefix);
    var dailyStrong = document.createElement('strong');
    dailyStrong.textContent = String(stats.daily_wins || 0);
    daily.appendChild(dailyStrong);
    tablet.appendChild(daily);
    frag.appendChild(tablet);

    /* Saldo (A8 — rodapé com Valdoritas; padrão dos demais venues) */
    var saldo = _div('arena-saldo');
    saldo.style.cssText = 'text-align:center;font-size:calc(12px * var(--v-font-scale,1));color:var(--v-text-dim,#a09484);padding:4px 0;display:flex;align-items:center;justify-content:center;gap:4px;';
    saldo.appendChild(document.createTextNode('Bolsa: ' + (d.player_gold || 0)));
    var saldoCoin = document.createElement('span');
    saldoCoin.className = 'vi vi-coin sm';
    saldo.appendChild(saldoCoin);
    frag.appendChild(saldo);

    /* Ornamental divider */
    frag.appendChild(_dividerEl());

    /* Challenger reveal card — portrait frame */
    var card = _div('arena-challenger-card');
    var cardLabel = _div('arena-challenger-label');
    cardLabel.textContent = '\u25C6 PR\u00d3XIMO DESAFIANTE \u25C6';
    card.appendChild(cardLabel);

    var portraitWrap = _div('arena-challenger-portrait');
    var portraitFrame = _div('arena-portrait-frame');
    /* Set class-based data attribute for CSS differentiation */
    var chCls = (ch.cls || '').toLowerCase().replace(/\s+/g, '-');
    if (chCls) portraitFrame.setAttribute('data-class', chCls);
    var icon = _div('arena-challenger-icon');
    icon.innerHTML = ch.icon || '';
    portraitFrame.appendChild(icon);
    portraitWrap.appendChild(portraitFrame);
    card.appendChild(portraitWrap);

    var name = _div('arena-challenger-name');
    name.textContent = ch.name || '???';
    card.appendChild(name);
    var cls = document.createElement('span');
    cls.className = 'arena-challenger-class';
    cls.textContent = ch.cls || 'Guerreiro';
    card.appendChild(cls);
    if (ch.flavor) {
        var flavor = _div('arena-challenger-flavor');
        flavor.textContent = '\u201C' + ch.flavor + '\u201D';
        card.appendChild(flavor);
    }
    /* P2 (emoji ban 2026-07-01): stat chips sem emoji \u2014 o r\u00F3tulo (HP/CA/ATQ)
       j\u00E1 identifica; \u25C6 d\u00E1 o acento visual. */
    var cStats = _div('arena-challenger-stats');
    cStats.appendChild(_cStat('\u25C6', ch.hp || 0, 'HP'));
    cStats.appendChild(_cStat('\u25C6', ch.ac || 0, 'CA'));
    cStats.appendChild(_cStat('\u25C6', '+' + (ch.atk || 0), 'ATQ'));
    card.appendChild(cStats);
    frag.appendChild(card);

    /* Reward scroll — gold + xp preview */
    var rewardScroll = _div('arena-reward-scroll');
    var rewardHeader = _div('arena-reward-header');
    rewardHeader.textContent = 'RECOMPENSAS DA VIT\u00d3RIA';
    rewardScroll.appendChild(rewardHeader);
    var rewardRow = _div('arena-reward-row');
    var goldRange = (reward.gold && reward.gold.length === 2) ? reward.gold[0] + '\u2013' + reward.gold[1] : '?';
    var r1 = _div('reward-item reward-gold');
    r1.appendChild(_coinEl());
    var r1Range = document.createElement('strong');
    r1Range.textContent = ' ' + goldRange + ' ';
    r1.appendChild(r1Range);
    /* v-coin icon already present — no "Valdoritas" text needed */
    rewardRow.appendChild(r1);
    var r2 = _div('reward-item reward-xp');
    r2.textContent = '+' + (reward.xp || 0) + ' XP';
    rewardRow.appendChild(r2);
    rewardScroll.appendChild(rewardRow);
    var fee = _div('arena-fee');
    var feeLabel = document.createElement('span');
    feeLabel.className = 'fee-label';
    feeLabel.textContent = 'Inscri\u00e7\u00e3o';
    fee.appendChild(feeLabel);
    fee.appendChild(_coinEl());
    var feeAmount = document.createElement('strong');
    feeAmount.textContent = ' ' + (d.fee || 0) + ' ';
    fee.appendChild(feeAmount);
    /* v-coin icon already present — no "Valdoritas" text needed */
    rewardScroll.appendChild(fee);
    frag.appendChild(rewardScroll);

    /* Formal services grid (PADRAO_LOCAIS — paridade com a Guilda).
       Backend envia d.services [{icon,label,desc,cb,badge}]; ícones
       resolvidos por ARENA_SVC_META (WebP canonical). */
    if (d.services && d.services.length) {
        var svcLabel = _div('pt-section-label');
        svcLabel.textContent = 'Serviços do Coliseu';
        frag.appendChild(svcLabel);
        frag.appendChild(_arenaServicesGrid(d.services));
    }

    /* Actions */
    var actions = _div('arena-actions');
    if (d.cooldown > 0) {
        var cd = _div('arena-cooldown');
        var cdIcon = _div('arena-cooldown-icon');
        cdIcon.textContent = '';
        cd.appendChild(cdIcon);
        var cdText = _div('arena-cooldown-text');
        var cdIntro = document.createElement('span');
        cdIntro.textContent = 'Pr\u00f3ximo combate em ';
        cdText.appendChild(cdIntro);
        var cdTurns = document.createElement('strong');
        cdTurns.textContent = String(d.cooldown);
        cdText.appendChild(cdTurns);
        var cdSuffix = document.createElement('span');
        cdSuffix.textContent = ' turno(s)';
        cdText.appendChild(cdSuffix);
        cd.appendChild(cdText);
        /* Visual progress bar for cooldown */
        var cdBar = _div('arena-cooldown-bar');
        var cdFill = _div('arena-cooldown-fill');
        var maxCd = 3; /* typical arena cooldown max */
        cdFill.style.width = Math.min(100, Math.max(0, ((maxCd - d.cooldown) / maxCd) * 100)) + '%';
        cdBar.appendChild(cdFill);
        cd.appendChild(cdBar);
        actions.appendChild(cd);
    } else if (!d.can_afford) {
        var ins = _div('arena-insufficient');
        ins.textContent = 'Valdoritas insuficientes para a taxa';
        actions.appendChild(ins);
    } else {
        var feeText = 'DESAFIAR \u00b7 \u2212' + (d.fee || 0) + ' Valdoritas';
        actions.appendChild(_makeBtn(feeText, 'arena_challenge', 'arena-btn--challenge'));
    }
    /* "Ranking do Dia" agora vive no grid de servi\u00E7os (paridade Guilda) \u2014
       o bot\u00E3o hero DESAFIAR permanece para feedback de cooldown/saldo. */
    frag.appendChild(actions);

    el.appendChild(frag);
}

/* ── HP Warning ────────────────────────────────────────────── */
function _renderArenaHpWarning(el, d) {
    var pct = d.hp_pct || 0;
    var barClass = pct <= 25 ? 'hp-crit' : 'hp-warn';
    var frag = document.createDocumentFragment();
    var wrap = _div('arena-hp-warning');

    /* Warning icon */
    var warnIcon = _div('arena-hp-warn-icon');
    warnIcon.textContent = '!';
    wrap.appendChild(warnIcon);

    var warnTitle = _div('arena-hp-warn-title');
    warnTitle.textContent = 'VIDA EM PERIGO';
    wrap.appendChild(warnTitle);

    /* Status panel: heart + bar + text */
    var panel = _div('arena-hp-status-panel');

    var heartIcon = _div('arena-hp-heart');
    heartIcon.textContent = 'HP';
    panel.appendChild(heartIcon);

    var barWrap = _div('arena-hp-bar-wrap');
    var bar = _div('arena-hp-bar');
    var fill = _div('arena-hp-bar-fill ' + barClass);
    fill.style.width = Math.max(2, pct) + '%';
    bar.appendChild(fill);
    barWrap.appendChild(bar);
    panel.appendChild(barWrap);

    var hpText = _div('arena-hp-text');
    hpText.textContent = (d.hp || 0) + '/' + (d.max_hp || 0) + ' (' + pct + '%)';
    panel.appendChild(hpText);

    wrap.appendChild(panel);

    /* Message */
    var msg = _div('arena-hp-msg');
    msg.textContent = 'Entrar na arena com pouca vida \u00e9 arriscado. Os curandeiros n\u00e3o v\u00e3o te salvar no meio do combate.';
    wrap.appendChild(msg);

    /* Choice cards */
    var choices = _div('arena-hp-choices');

    if (d.has_potion) {
        var potionSub = d.potion_count ? d.potion_count + ' dispon\u00edvel(is)' : 'Recuperar HP';
        choices.appendChild(_makeChoiceCard(
            '<img src="../shared/img/ui/pocao.webp" alt="" style="width:100%;height:100%;object-fit:contain" onerror="this.style.display=\'none\'">', 'Usar Po\u00e7\u00e3o de Cura', potionSub,
            'action_use_potion_heal', 'choice-potion'
        ));
    }

    choices.appendChild(_makeChoiceCard(
        '', 'Ir para Estalagem', 'Descansar e recuperar HP',
        'open_inn', 'choice-inn'
    ));

    choices.appendChild(_makeChoiceCard(
        '', 'Lutar Mesmo Assim', 'Alto risco \u2014 HP baixo',
        'arena_force_fight', 'choice-fight risky'
    ));

    wrap.appendChild(choices);

    /* Back button */
    wrap.appendChild(_makeBtn('\u2190 Voltar', 'arena_main', 'arena-btn--back'));

    frag.appendChild(wrap);
    el.appendChild(frag);
}

/* ── Result Screen ─────────────────────────────────────────── */
function _renderArenaResult(el, d) {
    var victory = d.victory;
    var ch = d.challenger || {};
    var rewards = d.rewards || {};
    var stats = d.stats || {};
    var frag = document.createDocumentFragment();
    var wrap = _div('arena-result ' + (victory ? 'is-victory' : 'is-defeat'));

    /* Coliseum backdrop for drama */
    wrap.appendChild(_arenaBackdrop());

    /* Crown/Skull with radial glow */
    var crownWrap = _div('arena-result-crown-wrap');
    var crown = _div('arena-result-crown');
    if (victory) {
        crown.innerHTML = '<img src="../shared/img/ui/coroa.webp" alt="" style="width:100%;height:100%;object-fit:contain" onerror="this.style.display=\'none\'">';
    } else {
        crown.textContent = '\u2020';  // marcador tipogr\u00E1fico de derrota (sem webp de caveira)
    }
    crownWrap.appendChild(crown);
    wrap.appendChild(crownWrap);

    /* Header with victory/defeat class */
    var header = _div('arena-result-header ' + (victory ? 'victory' : 'defeat'));
    var titleSpan = document.createElement('span');
    titleSpan.className = 'arena-result-title';
    titleSpan.textContent = victory ? 'VIT\u00d3RIA!' : 'DERROTA';
    header.appendChild(titleSpan);
    wrap.appendChild(header);

    /* Opponent */
    if (ch && ch.name) {
        var opLabel = victory ? 'Oponente derrotado' : 'Derrotado por';
        var op = _div('arena-result-opponent');
        var opLabelEl = _div('opponent-label');
        opLabelEl.textContent = opLabel;
        op.appendChild(opLabelEl);
        var opName = _div('opponent-name');
        opName.innerHTML = (ch.icon ? ch.icon + ' ' : '') + (ch.name);
        op.appendChild(opName);
        wrap.appendChild(op);
    }

    /* Flavor */
    if (d.flavor) {
        var flav = _div('arena-result-flavor');
        flav.textContent = '\u201C' + d.flavor + '\u201D';
        wrap.appendChild(flav);
    }

    /* Rewards (victory only) */
    if (victory) {
        var listHeader = _div('arena-rewards-header');
        listHeader.textContent = '\u25C6 ESP\u00d3LIOS DA ARENA \u25C6';
        wrap.appendChild(listHeader);

        var list = _div('arena-rewards-list');

        /* Gold */
        var goldCard = _div('arena-reward-card reward-gold');
        var goldIcon = _div('reward-icon');
        goldIcon.appendChild(_coinEl());
        goldCard.appendChild(goldIcon);
        var goldText = _div('reward-text');
        var goldMain = document.createElement('strong');
        goldMain.textContent = '+' + (rewards.gold || 0);
        goldText.appendChild(goldMain);
        if (rewards.streak_bonus_gold > 0) {
            var bonus = document.createElement('span');
            bonus.className = 'arena-reward-bonus';
            bonus.textContent = 'b\u00f4nus de sequ\u00eancia +' + rewards.streak_bonus_gold;
            goldText.appendChild(bonus);
        }
        goldCard.appendChild(goldText);
        list.appendChild(goldCard);

        /* XP */
        var xpCard = _div('arena-reward-card reward-xp');
        var xpIcon = _div('reward-icon');
        xpIcon.textContent = 'XP';
        xpCard.appendChild(xpIcon);
        var xpText = _div('reward-text');
        var xpMain = document.createElement('strong');
        xpMain.textContent = '+' + (rewards.xp || 0) + ' XP';
        xpText.appendChild(xpMain);
        if (rewards.streak_bonus_xp > 0) {
            var xpBonus = document.createElement('span');
            xpBonus.className = 'arena-reward-bonus';
            xpBonus.textContent = 'b\u00f4nus de sequ\u00eancia +' + rewards.streak_bonus_xp;
            xpText.appendChild(xpBonus);
        }
        xpCard.appendChild(xpText);
        list.appendChild(xpCard);

        /* Streak */
        if (stats.streak > 0) {
            var streakCard = _div('arena-reward-card streak');
            var streakIcon = _div('reward-icon');
            streakIcon.textContent = '\u25C6';
            streakCard.appendChild(streakIcon);
            var streakText = _div('reward-text');
            var streakStrong = document.createElement('strong');
            streakStrong.textContent = 'Sequ\u00eancia: ';
            streakText.appendChild(streakStrong);
            var streakVal = document.createElement('span');
            streakVal.textContent = String(stats.streak);
            streakText.appendChild(streakVal);
            streakCard.appendChild(streakText);
            list.appendChild(streakCard);
        }

        /* Daily wins */
        var dailyCard = _div('arena-reward-card');
        var dailyIcon = _div('reward-icon');
        dailyIcon.textContent = '\u25C6';
        dailyCard.appendChild(dailyIcon);
        var dailyText = _div('reward-text');
        var dailyStrong2 = document.createElement('strong');
        dailyStrong2.textContent = 'Vit\u00f3rias hoje: ';
        dailyText.appendChild(dailyStrong2);
        var dailyVal = document.createElement('span');
        dailyVal.textContent = String(stats.daily_wins || 0);
        dailyText.appendChild(dailyVal);
        dailyCard.appendChild(dailyText);
        list.appendChild(dailyCard);

        wrap.appendChild(list);
    }

    /* Buttons */
    var actions = _div('arena-actions');
    actions.appendChild(_makeBtn(victory ? 'NOVO COMBATE' : 'Voltar \u00e0 Arena', 'arena_main', 'arena-btn--challenge'));
    actions.appendChild(_makeBtn('Cidade', 'action_city_hub', 'arena-btn--city'));
    wrap.appendChild(actions);

    frag.appendChild(wrap);
    el.appendChild(frag);

    /* Play fanfare on victory (audio manager is optional) */
    if (victory && typeof ValdoriaAudio !== 'undefined' && typeof ValdoriaAudio.playSFX === 'function') {
        try { ValdoriaAudio.playSFX('victory_fanfare'); } catch (e) { /* silent */ }
    }
}

/* ── Leaderboard ───────────────────────────────────────────── */
function _renderArenaLeaderboard(el, d) {
    var entries = d.entries || [];
    var frag = document.createDocumentFragment();
    var wrap = _div('arena-leaderboard');

    /* Header with trophy */
    var header = _div('arena-lb-header');
    var trophy = _div('arena-lb-trophy');
    trophy.innerHTML = '<img src="../shared/img/arena/arena-crest.webp" alt="" style="width:100%;height:100%;object-fit:contain" onerror="this.style.display=\'none\'">';
    header.appendChild(trophy);
    var title = _div('arena-lb-title');
    title.textContent = 'HALL DOS CAMPE\u00d5ES';
    header.appendChild(title);
    var dateEl = _div('arena-lb-date');
    dateEl.textContent = 'Vit\u00f3rias de hoje \u00b7 ' + (d.date || '');
    header.appendChild(dateEl);
    wrap.appendChild(header);

    if (entries.length === 0) {
        var empty = _div('arena-lb-empty');
        var emptyIcon = _div('arena-lb-empty-icon');
        emptyIcon.textContent = '\u25C6';
        empty.appendChild(emptyIcon);
        var emptyText = document.createElement('div');
        emptyText.textContent = 'Nenhuma vit\u00f3ria registrada hoje.';
        empty.appendChild(emptyText);
        var emptySub = document.createElement('div');
        emptySub.className = 'empty-sub';
        emptySub.textContent = 'Seja o primeiro a entrar na arena!';
        empty.appendChild(emptySub);
        wrap.appendChild(empty);
    } else {
        /* Podium for top 3 */
        var topThree = entries.slice(0, 3);
        if (topThree.length > 0) {
            var podium = _div('arena-lb-podium');
            /* Order: 2nd, 1st, 3rd for visual podium effect */
            var podiumOrder = [];
            if (topThree[1]) podiumOrder.push({e: topThree[1], pos: 2});
            if (topThree[0]) podiumOrder.push({e: topThree[0], pos: 1});
            if (topThree[2]) podiumOrder.push({e: topThree[2], pos: 3});
            for (var i = 0; i < podiumOrder.length; i++) {
                var p = podiumOrder[i];
                var step = _div('arena-lb-podium-step podium-' + p.pos + (p.e.is_player ? ' is-player' : ''));
                var medal = _div('arena-lb-podium-medal');
                medal.textContent = _ARENA_MEDALS[p.pos] || '';
                step.appendChild(medal);
                var pName = _div('arena-lb-podium-name');
                pName.textContent = (p.e.is_player ? '\u25BA ' : '') + (p.e.name || '???');
                step.appendChild(pName);
                var pLv = _div('arena-lb-podium-level');
                pLv.textContent = 'Nv.' + (p.e.level || 1);
                step.appendChild(pLv);
                var pWins = _div('arena-lb-podium-wins');
                pWins.textContent = (p.e.wins || 0) + ' vit.';
                step.appendChild(pWins);
                var base = _div('arena-lb-podium-base');
                base.setAttribute('data-pos', String(p.pos));
                step.appendChild(base);
                podium.appendChild(step);
            }
            wrap.appendChild(podium);
        }

        /* Remaining entries (4-10) */
        var rest = entries.slice(3);
        if (rest.length > 0) {
            var restHeader = _div('arena-lb-rest-header');
            restHeader.textContent = '\u25C6 Demais Gladiadores \u25C6';
            wrap.appendChild(restHeader);

            var restList = _div('arena-lb-list');
            for (var j = 0; j < rest.length; j++) {
                var e = rest[j];
                var row = _div('arena-lb-entry' + (e.is_player ? ' is-player' : ''));

                var rEl = document.createElement('span');
                rEl.className = 'arena-lb-rank';
                rEl.textContent = String(e.rank);
                row.appendChild(rEl);

                var nEl = document.createElement('span');
                nEl.className = 'arena-lb-name';
                nEl.textContent = (e.is_player ? '\u25BA ' : '') + (e.name || '???');
                row.appendChild(nEl);

                var lEl = document.createElement('span');
                lEl.className = 'arena-lb-level';
                lEl.textContent = 'Nv.' + (e.level || 1);
                row.appendChild(lEl);

                var wEl = document.createElement('span');
                wEl.className = 'arena-lb-wins';
                wEl.textContent = String(e.wins || 0);
                row.appendChild(wEl);

                restList.appendChild(row);
            }
            wrap.appendChild(restList);
        }
    }

    /* Player outside top 10 */
    if (entries.length > 0 && d.player_rank > 0) {
        var sep = document.createElement('hr');
        sep.className = 'arena-lb-separator';
        wrap.appendChild(sep);
        var pRow = _div('arena-lb-entry is-player');
        var pRank = document.createElement('span');
        pRank.className = 'arena-lb-rank';
        pRank.textContent = '#' + d.player_rank;
        pRow.appendChild(pRank);
        var pName2 = document.createElement('span');
        pName2.className = 'arena-lb-name';
        pName2.textContent = '\u25BA ' + (d.player_name || '');
        pRow.appendChild(pName2);
        var pWins2 = document.createElement('span');
        pWins2.className = 'arena-lb-wins';
        pWins2.textContent = String(d.player_wins || 0);
        pRow.appendChild(pWins2);
        wrap.appendChild(pRow);
    } else if (entries.length > 0 && d.player_wins === 0) {
        var noWin = _div('arena-lb-empty arena-lb-noplayer');
        noWin.textContent = 'Voc\u00ea ainda n\u00e3o venceu hoje. Entre na arena!';
        wrap.appendChild(noWin);
    }

    /* Button */
    var actions = _div('arena-actions');
    actions.appendChild(_makeBtn('\u2190 Voltar \u00e0 Arena', 'arena_main', 'arena-btn--back-main'));
    wrap.appendChild(actions);

    frag.appendChild(wrap);
    el.appendChild(frag);
}

/* ── Services grid (PADRAO_LOCAIS — espelha a Guilda) ──────── *
 * services = [{ icon, label, desc, cb, badge? }]. Ícone resolvido por
 * ARENA_SVC_META (WebP) com fallback para o emoji/texto enviado.
 * Reusa as classes .services/.svc do padrao-taverna.css (presente em
 * cidade/index.html). Clique despacha o cb via doAction (server-driven). */
function _arenaServicesGrid(services) {
    var grid = _div('services');
    services.forEach(function(svc) {
        var card = _div('svc');
        if (svc.disabled) card.classList.add('disabled');
        card.setAttribute('data-svc', svc.cb || '');

        var ico = _div('svc-ico');
        var meta = ARENA_SVC_META[svc.cb || ''];
        var icoStr = (meta && meta.icon) || svc.icon || '▸';
        if (icoStr.indexOf('<svg') >= 0 || icoStr.indexOf('<img') >= 0) {
            ico.innerHTML = icoStr;
            var img = ico.querySelector('img');
            if (img) img.style.cssText = 'width:38px;height:38px;object-fit:contain;';
        } else {
            ico.textContent = icoStr;
            ico.style.fontSize = 'calc(20px * var(--v-font-scale, 1))';
        }
        card.appendChild(ico);

        var txt = _div('svc-text');
        var nameEl = _div('svc-name');
        nameEl.textContent = svc.label || '';
        txt.appendChild(nameEl);
        if (svc.desc) {
            var metaEl = _div('svc-meta');
            metaEl.textContent = svc.desc;
            txt.appendChild(metaEl);
        }
        card.appendChild(txt);

        if (svc.badge) {
            var badgeEl = _div('svc-badge');
            badgeEl.textContent = svc.badge;
            card.appendChild(badgeEl);
        }

        if (svc.cb && !svc.disabled) {
            card.addEventListener('click', function() {
                if (typeof haptic === 'function') haptic('light');
                if (typeof doAction === 'function') doAction(svc.cb);
            });
        }
        grid.appendChild(card);
    });
    return grid;
}

/* ── Rules sub-screen (Regras do Coliseu) ──────────────────── *
 * Dados canônicos do backend (arena_data.get_rules_data): tiers com faixa
 * de nível + taxa + recompensas, cooldown e bônus de sequência. Server é
 * autoridade — zero número inventado aqui. Tier atual destacado. */
function _renderArenaRules(el, d) {
    var frag = document.createDocumentFragment();
    var wrap = _div('arena-rules');

    /* Header em pergaminho */
    var header = _div('arena-rules-header');
    var hIcon = _div('arena-rules-icon');
    hIcon.textContent = '◆';
    header.appendChild(hIcon);
    var hTitle = _div('arena-rules-title');
    hTitle.textContent = 'REGRAS DO COLISEU';
    header.appendChild(hTitle);
    var hSub = _div('arena-rules-sub');
    hSub.textContent = 'Mestre Vorhan registra cada combate. Conhece as leis da areia.';
    header.appendChild(hSub);
    wrap.appendChild(header);

    /* Section: Tiers */
    var tiersLabel = _div('pt-section-label');
    tiersLabel.textContent = 'Tiers de Combate';
    wrap.appendChild(tiersLabel);

    var tiers = d.tiers || [];
    var list = _div('arena-rules-tiers');
    tiers.forEach(function(t) {
        var row = _div('arena-rules-tier');
        row.setAttribute('data-tier', t.id);
        if (t.id === d.current_tier_id) row.classList.add('is-current');

        /* Crest mini-medallion (mesma fonte WebP, fallback CSS) */
        var medal = _div('arena-rules-tier-medal');
        medal.setAttribute('data-tier', t.id);
        var crest = document.createElement('img');
        crest.className = 'arena-tier-crest';
        crest.src = '../shared/img/arena/tier-' + t.id + '.webp';
        crest.alt = '';
        crest.loading = 'lazy';
        crest.onerror = function() { this.remove(); };
        medal.appendChild(crest);
        row.appendChild(medal);

        var info = _div('arena-rules-tier-info');
        var nameRow = _div('arena-rules-tier-name');
        nameRow.textContent = t.name;
        if (t.id === d.current_tier_id) {
            var youBadge = document.createElement('span');
            youBadge.className = 'arena-rules-tier-you';
            youBadge.textContent = 'VOCÊ';
            nameRow.appendChild(youBadge);
        }
        info.appendChild(nameRow);
        var lvlRow = _div('arena-rules-tier-lvl');
        lvlRow.textContent = 'Nível ' + t.min + '–' + t.max;
        info.appendChild(lvlRow);

        var statRow = _div('arena-rules-tier-stats');
        /* Fee */
        var feeStat = _div('arena-rules-stat');
        var feeLbl = document.createElement('span');
        feeLbl.className = 'arena-rules-stat-lbl';
        feeLbl.textContent = 'Inscrição';
        feeStat.appendChild(feeLbl);
        var feeVal = document.createElement('span');
        feeVal.className = 'arena-rules-stat-val';
        feeVal.appendChild(_coinEl());
        feeVal.appendChild(document.createTextNode(' ' + t.fee));
        feeStat.appendChild(feeVal);
        statRow.appendChild(feeStat);
        /* Gold reward */
        var goldStat = _div('arena-rules-stat');
        var goldLbl = document.createElement('span');
        goldLbl.className = 'arena-rules-stat-lbl';
        goldLbl.textContent = 'Prêmio';
        goldStat.appendChild(goldLbl);
        var goldVal = document.createElement('span');
        goldVal.className = 'arena-rules-stat-val';
        goldVal.appendChild(_coinEl());
        var gr = (t.gold && t.gold.length === 2) ? (t.gold[0] + '–' + t.gold[1]) : '?';
        goldVal.appendChild(document.createTextNode(' ' + gr));
        goldStat.appendChild(goldVal);
        statRow.appendChild(goldStat);
        /* XP reward */
        var xpStat = _div('arena-rules-stat');
        var xpLbl = document.createElement('span');
        xpLbl.className = 'arena-rules-stat-lbl';
        xpLbl.textContent = 'XP';
        xpStat.appendChild(xpLbl);
        var xpVal = document.createElement('span');
        xpVal.className = 'arena-rules-stat-val';
        xpVal.textContent = '+' + t.xp;
        xpStat.appendChild(xpVal);
        statRow.appendChild(xpStat);
        info.appendChild(statRow);

        row.appendChild(info);
        list.appendChild(row);
    });
    wrap.appendChild(list);

    /* Section: rules of engagement */
    var lawsLabel = _div('pt-section-label');
    lawsLabel.textContent = 'Leis da Areia';
    wrap.appendChild(lawsLabel);

    var laws = _div('arena-rules-laws');
    laws.appendChild(_arenaLawItem('◆', 'Tempo de Recuperação',
        'Após cada combate, descanse ' + (d.cooldown_turns || 3) +
        ' turno(s) antes de desafiar novamente.'));
    var sg = d.streak_gold_per_win || 5;
    var sx = d.streak_xp_per_win || 10;
    var cap = d.streak_cap || 5;
    laws.appendChild(_arenaLawItem('◆', 'Bônus de Sequência',
        'Vitórias consecutivas rendem +' + sg + ' Valdoritas e +' + sx +
        ' XP por vitória na sequência, até ' + cap + ' vitórias seguidas.'));
    laws.appendChild(_arenaLawItem('◆', 'Derrota Não é Morte',
        'Perder na arena não é fatal — os curandeiros te recuperam, mas a sequência zera.'));
    wrap.appendChild(laws);

    /* Back button */
    var actions = _div('arena-actions');
    actions.appendChild(_makeBtn('← Voltar à Arena', 'arena_main', 'arena-btn--back-main'));
    wrap.appendChild(actions);

    frag.appendChild(wrap);
    el.appendChild(frag);
}

function _arenaLawItem(icon, title, body) {
    var item = _div('arena-rules-law');
    var ic = _div('arena-rules-law-ic');
    ic.textContent = icon;
    item.appendChild(ic);
    var txt = _div('arena-rules-law-txt');
    var t = _div('arena-rules-law-title');
    t.textContent = title;
    txt.appendChild(t);
    var b = _div('arena-rules-law-body');
    b.textContent = body;
    txt.appendChild(b);
    item.appendChild(txt);
    return item;
}

/* ── Record sub-screen (Seus Feitos) ───────────────────────── *
 * Registro de combate agregado real do jogador (wins/losses/streak/
 * best/daily/win-rate). Dados do backend handle_record. */
function _renderArenaRecord(el, d) {
    var stats = d.stats || {};
    var frag = document.createDocumentFragment();
    var wrap = _div('arena-record-screen');

    var header = _div('arena-rules-header');
    var hIcon = _div('arena-rules-icon');
    hIcon.textContent = '◆';
    header.appendChild(hIcon);
    var hTitle = _div('arena-rules-title');
    hTitle.textContent = 'SEUS FEITOS';
    header.appendChild(hTitle);
    var hSub = _div('arena-rules-sub');
    hSub.textContent = 'O registro de combate que a multidão recorda.';
    header.appendChild(hSub);
    wrap.appendChild(header);

    /* Big win/loss tablet */
    var tablet = _div('arena-record-tablet');
    var tabHeader = _div('arena-record-header');
    tabHeader.textContent = 'REGISTRO DE COMBATE';
    tablet.appendChild(tabHeader);
    var statsRow = _div('arena-stats-row');
    statsRow.appendChild(_statBadgeEl(stats.wins || 0, 'Vitórias', 'stat-wins'));
    statsRow.appendChild(_statBadgeEl(stats.losses || 0, 'Derrotas', 'stat-losses'));
    statsRow.appendChild(_statBadgeEl(stats.streak || 0, 'Sequência', 'stat-streak'));
    tablet.appendChild(statsRow);
    wrap.appendChild(tablet);

    /* Detail rows */
    var detail = _div('arena-record-detail');
    detail.appendChild(_arenaRecordRow('◆', 'Melhor sequência', String(stats.best_streak || 0)));
    detail.appendChild(_arenaRecordRow('◆', 'Vitórias hoje', String(stats.daily_wins || 0)));
    detail.appendChild(_arenaRecordRow('◆', 'Total de combates', String(stats.total || 0)));
    detail.appendChild(_arenaRecordRow('◆', 'Taxa de vitória', (stats.win_rate || 0) + '%'));
    wrap.appendChild(detail);

    var actions = _div('arena-actions');
    actions.appendChild(_makeBtn('← Voltar à Arena', 'arena_main', 'arena-btn--back-main'));
    wrap.appendChild(actions);

    frag.appendChild(wrap);
    el.appendChild(frag);
}

function _arenaRecordRow(icon, label, value) {
    var row = _div('arena-record-row');
    var ic = _div('arena-record-row-ic');
    ic.textContent = icon;
    row.appendChild(ic);
    var lbl = _div('arena-record-row-lbl');
    lbl.textContent = label;
    row.appendChild(lbl);
    var val = _div('arena-record-row-val');
    val.textContent = value;
    row.appendChild(val);
    return row;
}

/* ── History sub-screen (Histórico de Lutas) ───────────────── *
 * Lista os últimos combates registrados (server-only state). entries =
 * [{ opponent, opponent_class, opponent_icon, tier, victory, gold, xp, date }].
 * Safe DOM: ícone do oponente via textContent (emoji), nunca innerHTML. */
function _renderArenaHistory(el, d) {
    var entries = d.entries || [];
    var frag = document.createDocumentFragment();
    var wrap = _div('arena-history-screen');

    var header = _div('arena-rules-header');
    var hIcon = _div('arena-rules-icon');
    hIcon.textContent = '◆';
    header.appendChild(hIcon);
    var hTitle = _div('arena-rules-title');
    hTitle.textContent = 'HISTÓRICO DE LUTAS';
    header.appendChild(hTitle);
    var hSub = _div('arena-rules-sub');
    hSub.textContent = 'Os ecos dos teus combates mais recentes.';
    header.appendChild(hSub);
    wrap.appendChild(header);

    if (!entries.length) {
        var empty = _div('arena-lb-empty');
        var emptyIcon = _div('arena-lb-empty-icon');
        emptyIcon.textContent = '◆';
        empty.appendChild(emptyIcon);
        var emptyTxt = document.createElement('div');
        emptyTxt.textContent = 'Nenhum combate registrado ainda.';
        empty.appendChild(emptyTxt);
        var emptySub = document.createElement('div');
        emptySub.className = 'empty-sub';
        emptySub.textContent = 'Entre na arena e faça história!';
        empty.appendChild(emptySub);
        wrap.appendChild(empty);
    } else {
        var list = _div('arena-history-list');
        entries.forEach(function(e) {
            var row = _div('arena-history-entry ' + (e.victory ? 'is-victory' : 'is-defeat'));
            /* result glyph (P2 emoji ban: ✓/✗ colorem via is-victory/is-defeat) */
            var res = _div('arena-history-res');
            res.textContent = e.victory ? '✓' : '✗';
            row.appendChild(res);
            /* opponent — safe DOM: icon como textContent (emoji) */
            var info = _div('arena-history-info');
            var oppName = _div('arena-history-opp');
            var oppIcon = document.createElement('span');
            oppIcon.className = 'arena-history-opp-ic';
            oppIcon.textContent = e.opponent_icon ? (e.opponent_icon + ' ') : '';
            oppName.appendChild(oppIcon);
            oppName.appendChild(document.createTextNode(e.opponent || '???'));
            info.appendChild(oppName);
            var meta = _div('arena-history-meta');
            var metaParts = [];
            if (e.tier) metaParts.push('Tier ' + e.tier);
            if (e.opponent_class) metaParts.push(e.opponent_class);
            meta.textContent = metaParts.join(' · ');
            info.appendChild(meta);
            row.appendChild(info);
            /* outcome */
            var out = _div('arena-history-out');
            if (e.victory) {
                var goldOut = document.createElement('div');
                goldOut.className = 'arena-history-gold';
                goldOut.appendChild(_coinEl());
                goldOut.appendChild(document.createTextNode(' +' + (e.gold || 0)));
                out.appendChild(goldOut);
                var xpOut = document.createElement('div');
                xpOut.className = 'arena-history-xp';
                xpOut.textContent = '+' + (e.xp || 0) + ' XP';
                out.appendChild(xpOut);
            } else {
                var lossOut = document.createElement('div');
                lossOut.className = 'arena-history-loss';
                lossOut.textContent = 'Derrota';
                out.appendChild(lossOut);
            }
            row.appendChild(out);
            list.appendChild(row);
        });
        wrap.appendChild(list);
    }

    var actions = _div('arena-actions');
    actions.appendChild(_makeBtn('← Voltar à Arena', 'arena_main', 'arena-btn--back-main'));
    wrap.appendChild(actions);

    frag.appendChild(wrap);
    el.appendChild(frag);
}

/* ── DOM Helpers ───────────────────────────────────────────── */
function _div(cls) {
    var d = document.createElement('div');
    d.className = cls;
    return d;
}

function _dividerEl() {
    var d = _div('arena-divider');
    d.appendChild(_div('arena-divider-line'));
    var gem = _div('arena-divider-gem');
    gem.textContent = '\u25C6';
    d.appendChild(gem);
    d.appendChild(_div('arena-divider-line'));
    return d;
}

function _statBadgeEl(value, label, cls) {
    var d = _div('arena-stat-badge ' + (cls || ''));
    var v = document.createElement('span');
    v.className = 'stat-value';
    v.textContent = String(value);
    d.appendChild(v);
    var l = document.createElement('span');
    l.className = 'stat-label';
    l.textContent = label;
    d.appendChild(l);
    return d;
}

function _cStat(icon, value, label) {
    var s = document.createElement('div');
    s.className = 'c-stat';
    var iconEl = document.createElement('span');
    iconEl.className = 'c-stat-icon';
    iconEl.innerHTML = icon;
    s.appendChild(iconEl);
    var valEl = document.createElement('span');
    valEl.className = 'c-stat-value';
    valEl.textContent = String(value);
    s.appendChild(valEl);
    var lblEl = document.createElement('span');
    lblEl.className = 'c-stat-label';
    lblEl.textContent = label;
    s.appendChild(lblEl);
    return s;
}

function _makeBtn(text, cb, extraClass) {
    var btn = document.createElement('button');
    btn.className = 'arena-btn' + (extraClass ? ' ' + extraClass : '');
    btn.textContent = text;
    btn.onclick = function() {
        if (typeof haptic === 'function') haptic('medium');
        if (typeof doAction === 'function') doAction(cb);
    };
    return btn;
}

function _makeChoiceCard(icon, title, subtitle, cb, extraCls) {
    var card = document.createElement('button');
    card.className = 'arena-hp-choice' + (extraCls ? ' ' + extraCls : '');
    var icoEl = _div('arena-hp-choice-icon');
    icoEl.innerHTML = icon;
    var textEl = _div('arena-hp-choice-text');
    var titleEl = document.createElement('div');
    titleEl.textContent = title;
    var subEl = document.createElement('div');
    subEl.textContent = subtitle;
    textEl.appendChild(titleEl);
    textEl.appendChild(subEl);
    card.appendChild(icoEl);
    card.appendChild(textEl);
    card.addEventListener('click', function() {
        if (typeof haptic === 'function') haptic('medium');
        if (typeof doAction === 'function') doAction(cb);
    });
    return card;
}

/* task #75: expose public API. Privadas: VORHAN_DIALOGUE, _ARENA_MEDALS,
   _coinEl, _arenaBackdrop, _renderArenaMain, _renderArenaHpWarning,
   _renderArenaResult, _renderArenaLeaderboard, _div, _dividerEl,
   _statBadgeEl, _cStat, _makeBtn, _makeChoiceCard. */
window.renderArenaScreen = renderArenaScreen;

})(); /* end IIFE task #75 */
