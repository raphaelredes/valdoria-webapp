/* ============================================================================
 * game-market-hub.js — Mercado de Valdoria (PADRAO_TAVERNA multi-NPC canonical)
 * ============================================================================
 *
 * Task #32 sessão #14 (2026-05-20) — REFATORADO p/ usar PADRAO_TAVERNA canonical.
 * Mercado é HÍBRIDO: ao invés de 1 NPC principal + N services, tem GRID de
 * mercadores (cada um é uma .row-npc clicável com dialogue próprio).
 *
 * Classes canonical: .cenario, .row-npc, .rep-bar, .services, .svc
 * CSS canonical em shared/padrao-taverna.css.
 *
 * MAPA_IA:
 *   ~30   _SVC_CONFIG_MARKET (faction market + reactions)
 *   ~55   MERCHANT_NPCS_MARKET (6 NPCs: Thorne/Mirena/Velithra/Corvus/Bjorn/Garlen)
 *   ~250  _mktBuildCenario(data) — cenario panel canonical
 *   ~300  _mktBuildMerchantRow(npc) — .row-npc clicável por mercador
 *   ~340  _mktBuildRepBar(data) — D&D 5e Renome
 *   ~370  renderMarketHub(container, data) — entry point
 *
 * Source: simuladores/mercado-Valdoria-final.html (1815L)
 * ============================================================================ */

'use strict';

(function() {

/* 2026-05-21 — MARKET_SVC_META map svc.cb -> PNG path canonical.
   Service icons via PNGs gerados OpenAI ao invés de emoji/SVG fallback.
   Cobre extras canônicos enviados por src/game/city/market_ui.py:213-219:
   - market_sell_menu / market_gossip_general / rune_scribe_menu */
var MARKET_SVC_META = {
  'market_sell_menu':      { icon: '<img src="../shared/img/services/svc-vender.webp" alt="">' },
  'market_gossip_general': { icon: '<img src="../shared/img/services/svc-rumores.webp" alt="">' },
  'rune_scribe_menu':      { icon: '<img src="../shared/img/services/svc-decifrar.webp" alt="">' },
  /* Aliases pra robustez */
  'market_sell':           { icon: '<img src="../shared/img/services/svc-vender.webp" alt="">' },
  'sell':                  { icon: '<img src="../shared/img/services/svc-vender.webp" alt="">' },
  'market_gossip':         { icon: '<img src="../shared/img/services/svc-rumores.webp" alt="">' },
  'rumores':               { icon: '<img src="../shared/img/services/svc-rumores.webp" alt="">' },
  'rune_scribe':           { icon: '<img src="../shared/img/services/svc-decifrar.webp" alt="">' },
  'escriba':               { icon: '<img src="../shared/img/services/svc-decifrar.webp" alt="">' }
};

if (!window._SVC_CONFIG_MARKET) {
  window._SVC_CONFIG_MARKET = {
    faction: 'market',
    factionLabel: 'Mercado de Valdoria',
    reactions: {
      very_negative: 'Os mercadores se entreolham, e logo o boato corre pelas barracas. <i>(silêncio constrangedor)</i> "Vossa Senhoria perdeu crédito aqui hoje."',
      negative: 'O mercador balança a cabeça desaprovando. <i>(continua o trabalho sem te olhar)</i> "Cada um com seus modos. Mas o preço fica o mesmo."',
      neutral: 'O mercador continua atendendo. <i>(mantém o tom profissional)</i> "Anotado."',
      positive: 'O mercador sorri de canto. <i>(aceita a moeda com cuidado)</i> "Cliente respeitoso é cliente que volta. Apareça sempre."',
      very_positive: 'O mercador estende a mão pra cumprimentar. <i>(gesto raro entre comerciantes orgulhosos)</i> "És do tipo que honra o Mercado. Próxima visita, abro a gaveta especial."'
    },
    confirmMsgs: {
      narration: 'O mercador embala a compra com cuidado.',
      generic: '"Bom proveito. Que serva bem."'
    }
  };
}

/* === MERCHANT NPCS — 6 mercadores fixos do mockup =========================
 * Cada NPC tem dialogue PADRAO_ALDRIC próprio + cb que mapeia a backend.
 * Backend pode sobrescrever via data.merchants se quiser ordem/seleção custom. */
/* task #70 (2026-05-20): cb's alinhadas com backend canonical em market_ui.py.
   Backend usa pattern `market_interact_menu_<role>`. Roles canonical:
   blacksmith, alchemist, jeweler, tentmaker, cartographer.
   Renderer NPCs mapeiam por descrição/categoria mais próxima. Onde mapping
   é ambíguo (Mirena armadureira, Corvus livreiro), usa close + label
   ajustado pra indicar que dialogue é narrativo (acessar via hub cards). */
var MERCHANT_NPCS_MARKET = {
  thorne: {
    npc: { name: 'Thorne', desc: 'Armeiro · vende lâminas há trinta e cinco anos', portrait: '../shared/img/npcs/thorne-armeiro.webp' },
    quote: '"Aço carbono de Valdoria. Sem desconto."',
    cb: 'market_interact_menu_blacksmith',
    script: [
      { type: 'narration', text: 'A barraca de Thorne é uma parede de aço polido — espadas suspensas em pregos longos, adagas em fileira sobre veludo vermelho, machados de duas mãos pendurados das vigas. O cheiro é de óleo de armas e suor honesto.' },
      { type: 'speech', speaker: 'Thorne', text: 'Tudo do meu estoque corta osso sem entortar. <i>(ergue uma espada longa)</i> Adaga, cinco. Espada longa, vinte. Machado de duas mãos, trinta. Sem desconto.' }
    ],
    choices: [
      { id: 'weapons', label: 'Ver inventário de armas', cb: 'market_interact_menu_blacksmith' },
      { id: 'leave',   label: '"Outra hora."', cb: 'close' }
    ]
  },
  mirena: {
    npc: { name: 'Mirena', desc: 'Armadureira · alfaiata de couro e malha por vinte anos', portrait: '../shared/img/npcs/mirena-armadureira.webp' },
    quote: '"Sob medida, sai pelo dobro. Mas dura o triplo."',
    cb: 'market_interact_menu_alchemist',
    script: [
      { type: 'narration', text: 'Mirena empilha placas de couro batido, gibões reforçados, peitorais de bronze polido. Ela mede você com o olhar — ombro, peito, braços — em silêncio, antes mesmo de cumprimentar.' },
      { type: 'speech', speaker: 'Mirena', text: 'Couro batido, dez Valdoritas. Cota de malha, cinquenta. Peitoral de bronze, cento e cinquenta. <i>(toca seu braço pra estimar tamanho)</i> Sob medida, sai pelo dobro. Mas dura o triplo.' }
    ],
    choices: [
      { id: 'armor', label: 'Ver armaduras disponíveis', cb: 'market_interact_menu_alchemist' },
      { id: 'leave', label: '"Outra hora."', cb: 'close' }
    ]
  },
  velithra: {
    npc: { name: 'Velithra', desc: 'Alquimista · três gerações de alquímia', portrait: '../shared/img/npcs/velithra-alquimista.webp' },
    quote: '"Esta… só tu sabes pra que serve."',
    cb: 'market_interact_menu_jeweler',
    script: [
      { type: 'narration', text: 'A barraca de Velithra é toda frascos coloridos. Estantes com vidros borbulhantes em violeta, esmeralda, rubi. Aroma denso de ervas secas, enxofre, e algo doce que faz a pele formigar.' },
      { type: 'speech', speaker: 'Velithra', text: 'Cura simples, vinte e cinco Valdoritas. Antídoto, quarenta. Heroísmo temporário, oitenta. <i>(ergue um frasco roxo)</i> Esta… só tu sabes pra que serve. Cento e vinte, sem perguntas.' }
    ],
    choices: [
      { id: 'potions', label: 'Ver poções', cb: 'market_interact_menu_jeweler' },
      { id: 'leave',   label: '"Outra hora."', cb: 'close' }
    ]
  },
  corvus: {
    npc: { name: 'Corvus', desc: 'Livreiro · colecionador de tomos por trinta anos', portrait: '../shared/img/npcs/corvus-livreiro.webp' },
    quote: '"Tenho dois grimórios menores, se Vossa Senhoria for mago."',
    cb: 'market_interact_menu_cartographer',
    script: [
      { type: 'narration', text: 'Corvus mantém uma barraca improvavelmente alta, empilhada com livros encadernados em couro de várias cores. Pergaminhos enrolados em cilindros de osso. Pena de corvo no tinteiro.' },
      { type: 'speech', speaker: 'Corvus', text: 'Livro comum, dez Valdoritas. Tomo raro, cinquenta. Pergaminho mágico, varia muito. <i>(toca uma lombada gasta)</i> Tenho dois grimórios menores, se Vossa Senhoria for mago e tiver aval do Escriba Thessil.' }
    ],
    choices: [
      { id: 'books', label: 'Ver livros e tomos', cb: 'market_interact_menu_cartographer' },
      { id: 'leave', label: '"Outra hora."', cb: 'close' }
    ]
  },
  bjorn: {
    npc: { name: 'Bjorn', desc: 'Mantimentos · padeiro e açougueiro do bairro Norte', portrait: '../shared/img/npcs/bjorn-comerciante.webp' },
    quote: '"Prova primeiro — se não gostar, não vendo."',
    cb: 'market_interact_menu_tentmaker',
    script: [
      { type: 'narration', text: 'Bjorn enche o ar com cheiro de pão recém-saído do forno e queijo curado pendurado em ganchos de cobre. Atrás dele, barris de azeitona, sacos de farinha, pirâmides de maçãs vermelhas.' },
      { type: 'speech', speaker: 'Bjorn', text: 'Pão fresco, três cobres. Queijo curado, uma Valdorita. Ração de viagem (sete dias), cinco. <i>(corta o queijo num gesto rápido)</i> Prova primeiro — se não gostar, não vendo. Honestidade é meu único capital.' }
    ],
    choices: [
      { id: 'food',  label: 'Ver mantimentos', cb: 'market_interact_menu_tentmaker' },
      { id: 'leave', label: '"Outra hora."', cb: 'close' }
    ]
  },
  garlen: {
    npc: { name: 'Garlen', desc: 'Cartógrafo · mapeou do Vale às Montanhas do Norte', portrait: '../shared/img/npcs/garlen-cartografo.webp' },
    quote: '"Masmorra Antiga (com armadilhas marcadas), cento e vinte."',
    cb: 'market_interact_menu_cartographer',
    script: [
      { type: 'narration', text: 'Garlen tem uma barraca menor que as outras, mas mais ordenada. Mapas enrolados em tubos de couro etiquetados. Bússolas de bronze polido alinhadas. Lupa de cristal sobre uma carta da Floresta Esquecida desdobrada, marcada com X vermelhos.' },
      { type: 'speech', speaker: 'Garlen', text: 'Mapas variam por região. <i>(consulta o estoque)</i> Floresta Esquecida, vinte. Montanhas do Norte, cinquenta. Masmorra Antiga (com armadilhas marcadas), cento e vinte. Contratos antigos, valor negociado.' }
    ],
    choices: [
      { id: 'maps',  label: 'Ver mapas disponíveis', cb: 'market_interact_menu_cartographer' },
      { id: 'leave', label: '"Outra hora."', cb: 'close' }
    ]
  }
};

/* === Cenário canonical ============================================== */
function _mktBuildCenario(data) {
  var cenarioEl = vCity.el('div', 'cenario');

  var bg = vCity.el('img', 'cenario-bg');
  bg.src = '../shared/img/mercado/mercado-banner.webp';
  bg.alt = '';
  bg.loading = 'lazy';
  bg.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(bg);

  cenarioEl.appendChild(vCity.el('div', 'candle-glow l'));
  cenarioEl.appendChild(vCity.el('div', 'candle-glow r'));

  var crest = vCity.el('img', 'cenario-brasao');
  crest.src = '../shared/img/mercado/mercado-crest.webp';
  crest.alt = 'Brasão do Mercado de Valdoria';
  crest.loading = 'lazy';
  crest.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(crest);

  var titulo = vCity.el('div', 'cenario-titulo');
  var nameEl = vCity.el('div', 'name');
  nameEl.textContent = 'Mercado de Valdoria';
  titulo.appendChild(nameEl);
  var subEl = vCity.el('div', 'sub');
  subEl.textContent = 'Praça Central · Seis Mercadores Fiéis';
  titulo.appendChild(subEl);
  cenarioEl.appendChild(titulo);

  return cenarioEl;
}

/* === Merchant row canonical — .row-npc clickable por mercador ============= */
function _mktBuildMerchantRow(npcKey, merchantData) {
  var npcDef = MERCHANT_NPCS_MARKET[npcKey];
  if (!npcDef) return null;

  var row = vCity.el('div', 'row-npc');

  var portraitWrap = vCity.el('div', 'npc-portrait');
  var img = vCity.el('img');
  img.src = npcDef.npc.portrait;
  img.alt = npcDef.npc.name;
  img.loading = 'lazy';
  img.onerror = function(){ this.style.display = 'none'; };
  portraitWrap.appendChild(img);
  row.appendChild(portraitWrap);

  var info = vCity.el('div', 'npc-info');
  var name = vCity.el('div', 'name');
  name.textContent = npcDef.npc.name;
  info.appendChild(name);
  var quote = vCity.el('div', 'quote');
  quote.textContent = npcDef.quote || ('"' + (npcDef.npc.desc || '') + '"');
  info.appendChild(quote);
  row.appendChild(info);

  var chev = vCity.el('div', 'npc-chev');
  chev.textContent = '›';
  row.appendChild(chev);

  // Click → open PADRAO_ALDRIC dialogue
  row.addEventListener('click', function(){
    if (typeof window.vEncounter === 'object' && window.vEncounter.render) {
      window._SVC_CONFIG = window._SVC_CONFIG_MARKET;
      window.vEncounter.render({
        npc: npcDef.npc,
        script: npcDef.script,
        choices: npcDef.choices
      }, {
        /* sessão #76 FIX: as choices usavam cb 'market_interact_menu_<role>' —
           cbs de BACKEND que NÃO estão registrados no client-mock → clicar
           "Ver inventário/poções/mapas" não fazia NADA (bug reportado: Thorne,
           Garlen). Agora a choice de ver-loja (qualquer id != 'leave') FECHA o
           diálogo e abre o popup de loja do mercador via _showShopPopup(npcKey)
           — npcKey é chave de CANON_MARKET_SHOPS (thorne/garlen/etc.). */
        onChoice: function(ch){
          try { window.vEncounter.close(); } catch(_e){}
          if (ch && ch.id !== 'leave' && (ch.cb || '') !== 'close'
              && typeof window._showShopPopup === 'function') {
            window._showShopPopup(npcKey);
          }
        }
      });
    } else if (merchantData && merchantData.cb && typeof vCity.act === 'function') {
      vCity.act(merchantData.cb);
    }
  });

  return row;
}

/* === Reputation bar canonical (.rep-bar) ================================== */
function _mktBuildRepBar(data) {
  var renome = 0;
  if (data && data.renome && typeof data.renome.market === 'number') renome = data.renome.market;
  else if (window._PLAYER_RENOWN && typeof window._PLAYER_RENOWN.market === 'number') renome = window._PLAYER_RENOWN.market;

  var tier = 'NEUTRO';
  if (renome >= 25) tier = 'AMIGÁVEL';
  else if (renome >= 10) tier = 'CORDIAL';
  else if (renome < 0 && renome >= -10) tier = 'FRIO';
  else if (renome < -10) tier = 'HOSTIL';

  var pct = Math.max(0, Math.min(100, Math.round((renome + 10) / 40 * 100)));

  var bar = vCity.el('div', 'rep-bar');
  var lbl = vCity.el('span', 'label');
  lbl.textContent = 'Reputação';
  bar.appendChild(lbl);
  var track = vCity.el('div', 'bar');
  var fill = vCity.el('div', 'fill');
  fill.style.width = pct + '%';
  track.appendChild(fill);
  bar.appendChild(track);
  var val = vCity.el('span', 'value');
  val.textContent = tier + ' · ' + renome;
  bar.appendChild(val);
  return bar;
}

/* === Map backend merchant cb → MERCHANT_NPCS_MARKET key ===================
 * Backend manda data.merchants com {icon, label, cb, ...}. Cada cb deve
 * mapear a um NPC. Heurística: split por '_' e pega último segmento, ou
 * busca substring no nome. */
function _mktResolveNpcKey(merchant) {
  if (!merchant) return null;
  var cb = (merchant.cb || '').toLowerCase();
  var label = (merchant.label || '').toLowerCase();
  var keys = Object.keys(MERCHANT_NPCS_MARKET);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (cb.indexOf(k) !== -1 || label.indexOf(k) !== -1) return k;
    var nameInDef = MERCHANT_NPCS_MARKET[k].npc.name.toLowerCase();
    if (label.indexOf(nameInDef) !== -1) return k;
  }
  return null;
}

/* === renderMarketHub entry point ========================================== */
function renderMarketHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-MARKET] renderMarketHub (PADRAO_TAVERNA) type=' + (data.type || '?') + ' merchants=' + (data.merchants ? data.merchants.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  /* Mercado fechado (noite) */
  if (data.type === 'closed') {
    var closed = vCity.el('div', 'mkt-hub');
    closed.appendChild(_mktBuildCenario(data));
    var body = vCity.el('div', 'mkt-body');
    body.style.cssText = 'padding:8px 12px 0;display:flex;flex-direction:column;gap:7px;';
    body.appendChild(vCity.statusAlert(data.message || 'Mercado fechado neste horário', 'warn'));
    if (data.extras && data.extras.length) {
      var lbl = vCity.el('div', 'pt-section-label');
      lbl.textContent = 'Alternativas';
      body.appendChild(lbl);
      body.appendChild(vCity.serviceGrid(data.extras));
    }
    closed.appendChild(body);
    container.appendChild(closed);
    return;
  }

  var root = vCity.el('div', 'mkt-hub');
  root.appendChild(_mktBuildCenario(data));

  var body = vCity.el('div', 'mkt-body');
  body.style.cssText = 'padding:8px 12px 0;display:flex;flex-direction:column;gap:7px;';

  /* Reputation bar */
  body.appendChild(_mktBuildRepBar(data));

  /* Flavor */
  if (data.flavor) {
    var flavor = vCity.el('div', 'mkt-flavor');
    flavor.style.cssText = 'font-style:italic;font-size:calc(12px * var(--v-font-scale, 1));color:#a09484;padding:6px 10px;border-left:2px solid rgba(196,149,58,0.3);background:rgba(0,0,0,0.18);border-radius:4px';
    flavor.innerHTML = data.flavor;
    body.appendChild(flavor);
  }

  /* Gold + items badge */
  var stats = vCity.el('div', 'mkt-stats');
  stats.style.cssText = 'display:flex;justify-content:center;gap:14px;padding:4px 0;font-size:calc(12px * var(--v-font-scale, 1));color:#a09484;';
  var goldSpan = vCity.el('span', '');
  goldSpan.textContent = String(data.gold || 0) + ' ';
  if (typeof vCity.coin === 'function') goldSpan.appendChild(vCity.coin('sm'));
  else goldSpan.textContent += 'V';
  stats.appendChild(goldSpan);
  var itemsSpan = vCity.el('span', '');
  itemsSpan.textContent = (data.item_count || 0) + ' itens';
  stats.appendChild(itemsSpan);
  body.appendChild(stats);

  /* Section: Mercadores */
  var sectionLbl = vCity.el('div', 'pt-section-label');
  sectionLbl.textContent = 'Mercadores Fiéis';
  body.appendChild(sectionLbl);

  /* Multi-NPC grid — cada merchant é uma .row-npc clicável */
  if (data.merchants && data.merchants.length) {
    var merchantsContainer = vCity.el('div', 'mkt-merchants');
    merchantsContainer.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
    data.merchants.forEach(function(merchant) {
      var npcKey = _mktResolveNpcKey(merchant);
      if (npcKey) {
        var row = _mktBuildMerchantRow(npcKey, merchant);
        if (row) merchantsContainer.appendChild(row);
      } else {
        // Fallback: render como service card pra mercadores não-mapeados (transient NPCs)
        var fallback = vCity.serviceGrid([merchant]);
        merchantsContainer.appendChild(fallback);
      }
    });
    body.appendChild(merchantsContainer);
  }

  /* Extras (vender, rune scribe, rumors, etc.) */
  if (data.extras && data.extras.length) {
    var extrasLbl = vCity.el('div', 'pt-section-label');
    extrasLbl.textContent = 'Outros Serviços';
    body.appendChild(extrasLbl);
    /* 2026-05-21 — substitui emoji icon por PNG canonical via MARKET_SVC_META. */
    var extrasWithPng = data.extras.map(function(svc){
      var meta = MARKET_SVC_META[svc.cb];
      if (meta && meta.icon) {
        var copy = {}; for (var k in svc) copy[k] = svc[k];
        copy.icon = meta.icon;
        return copy;
      }
      return svc;
    });
    body.appendChild(vCity.serviceGrid(extrasWithPng));
  }

  /* 2026-05-31 USER FIX: removida a seção "⌛ Ausentes hoje".
     Histórico: 2026-05-21 separou ausentes dos viajantes em 2 listas; agora o
     dono pediu remover de vez — "Ausentes hoje" era percebido pelo jogador como
     estranho. Mercadores fixos ausentes não viram mais card (filtrados em
     _buildMarketMockData); quem quer saber deles pergunta a um mercador presente
     (tópico de diálogo "Viu os outros mercadores?"). wandering_npcs agora só
     traz o mercador de passagem do dia → renderizado como "Viajantes". */
  if (data.wandering_npcs && data.wandering_npcs.length) {
    var wnLbl = vCity.el('div', 'pt-section-label');
    wnLbl.textContent = 'Viajantes';
    body.appendChild(wnLbl);
    body.appendChild(vCity.actionList(data.wandering_npcs));
  }

  root.appendChild(body);
  container.appendChild(root);
}

window.renderMarketHub = renderMarketHub;

})();
