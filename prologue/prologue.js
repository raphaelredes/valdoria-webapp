var tg=window.Telegram?.WebApp;if(tg){tg.ready();tg.expand();}
var _spaP=window.__spaRouteParams||{};var params=new URLSearchParams(location.search);var TOKEN=_spaP.token||params.get('token')||'';var API_BASE=(_spaP.api||params.get('api')||'').replace(/\/$/,'');var USER_ID=parseInt(_spaP.uid||params.get('uid')||'0',10);if(window.SessionHeartbeat&&API_BASE&&TOKEN&&USER_ID){SessionHeartbeat.init({apiBase:API_BASE,token:TOKEN,uid:USER_ID});}
var MODE=_spaP.mode||params.get('mode')||'full';var SHOW_PREFACE=(_spaP.preface||params.get('preface'))==='1';if(window.ValdoriaErrors){ValdoriaErrors.init({appName:'PROLOGUE',apiBase:API_BASE,token:TOKEN,uid:USER_ID,});}
var DATA=null;var screenIdx=0;var choices={};var rerollsLeft=5;function haptic(type){if(window.vHaptic)vHaptic.impact(type||'light');}
/* X-6.5.51AM (2026-05-08) PADRAO_ALDRIC helpers — wrap text in narration/speech
   blocks com reveal animation. Substitui plain .prologue-text divs por blocos
   AAA quality compatíveis com cidade.html PADRAO_ALDRIC encounters. */
function _computeRevealDur(text){var c=(text||'').length;return Math.max(900,Math.min(4000,c*14+600));}
function _narration(text){var dur=_computeRevealDur(text);return '<div class="prol-line prol-narration" style="--reveal-dur:'+dur+'ms">'+(text||'')+'</div>';}
function _speech(speaker,text){var dur=_computeRevealDur(text);var safe=String(speaker||'').replace(/"/g,'&quot;');return '<div class="prol-line prol-speech" data-speaker="'+safe+'" style="--reveal-dur:'+dur+'ms">'+(text||'')+'</div>';}
/* Build the PADRAO_ALDRIC card shell (header + body + actions).
   X-6.5.51AQ (2026-05-08): se opts.portrait NÃO for fornecido (cenas sem NPC
   falando — narração pura como "Emboscada na Estrada"), usa AAA orb (3D
   animado, mesma esfera dourada da tela TOQUE PARA INICIAR) como fallback.
   User pediu: "no circulo ao lado do titulo Emboscada na estrada precisamos
   colocar a esfera 3d animada igual a tela TOQUE PARA INICIAR dentro dele
   sempre que nao tiver icone para mostrar como nesse caso que nao tem NPC
   falando, na narrativa atual... deve ser um fallback para quando nao tiver icone" */
function _prolCard(opts){
  var hasPortrait = !!(opts.portrait);
  /* AAA orb fallback — placeholder DOM populado via JS depois (precisa
     do CSS shared/loading-title.css carregado). */
  var portrait = hasPortrait
    ? opts.portrait
    : '<div class="prol-aaa-orb" data-needs-orb="1"></div>';
  var name=opts.name||'';
  var desc=opts.desc||'';
  var pageInd=opts.pageInd||'';
  var bodyHtml=opts.body||'';
  var actionsHtml=opts.actions||'';
  return ''
    + '<div class="prol-card">'
    + '  <div class="prol-header">'
    + '    <div class="prol-portrait' + (hasPortrait ? '' : ' prol-portrait-orb') + '">' + portrait + '</div>'
    + '    <div class="prol-meta">'
    + '      <h3 class="prol-name">' + name + '</h3>'
    + (desc ? '      <p class="prol-desc">' + desc + '</p>' : '')
    + '    </div>'
    + (pageInd ? '    <div class="prol-page-ind">' + pageInd + '</div>' : '')
    + '  </div>'
    + '  <div class="prol-body">' + bodyHtml + '</div>'
    + (actionsHtml ? '  <div class="prol-actions">' + actionsHtml + '</div>' : '')
    + '</div>';
}
/* X-6.5.51AQ — Build the AAA orb DOM (replicates ValdoriaTitleScreen orb
   structure but scaled down for header portrait). Uses .title-orb-* CSS
   classes from shared/loading-title.css (which prologue route MUST load). */
function _buildProlAAAOrb(host){
  if (!host) return;
  host.innerHTML = '';
  var orbWrap = document.createElement('div');
  orbWrap.className = 'title-orb-wrap';
  ['title-orb-rays','title-orb-ambient'].forEach(function(c){
    var el = document.createElement('div'); el.className = c; orbWrap.appendChild(el);
  });
  var orb = document.createElement('div'); orb.className = 'title-orb';
  var nebula = document.createElement('div'); nebula.className = 'title-orb-nebula';
  ['title-orb-neb1','title-orb-neb2','title-orb-neb3','title-orb-neb4'].forEach(function(c){
    var n = document.createElement('div'); n.className = c; nebula.appendChild(n);
  });
  ['title-orb-wisp title-orb-w1','title-orb-wisp title-orb-w2',
   'title-orb-wisp title-orb-w3','title-orb-wisp title-orb-w4',
   'title-orb-wisp title-orb-w5'].forEach(function(c){
    var w = document.createElement('div'); w.className = c; nebula.appendChild(w);
  });
  ['title-orb-spark title-orb-sp1','title-orb-spark title-orb-sp2',
   'title-orb-spark title-orb-sp3'].forEach(function(c){
    var s = document.createElement('div'); s.className = c; nebula.appendChild(s);
  });
  orb.appendChild(nebula);
  ['title-orb-core','title-orb-core-fl','title-orb-intlight','title-orb-term',
   'title-orb-fresnel','title-orb-sss','title-orb-glass-top','title-orb-glass-bot'].forEach(function(c){
    var l = document.createElement('div'); l.className = c; orb.appendChild(l);
  });
  orbWrap.appendChild(orb);
  ['title-orb-caustic-1','title-orb-caustic-2','title-orb-caustic-3'].forEach(function(c){
    var ca = document.createElement('div'); ca.className = c; orbWrap.appendChild(ca);
  });
  host.appendChild(orbWrap);
}
/* Hook: after each addScreen, populate any pending [data-needs-orb] elements */
function _populatePendingOrbs(){
  document.querySelectorAll('[data-needs-orb="1"]').forEach(function(host){
    host.removeAttribute('data-needs-orb');
    _buildProlAAAOrb(host);
  });
}
async function apiCall(endpoint,body={}){const headers={'Content-Type':'application/json','Authorization':`Bearer ${TOKEN}`,};if(window.Telegram?.WebApp?.initData){headers['X-Telegram-Init-Data']=Telegram.WebApp.initData;}
if(endpoint.includes('/reroll')||endpoint.includes('/fight')||endpoint.includes('/complete')||endpoint.includes('/distract')){headers['X-Idempotency-Key']=crypto.randomUUID();}
const resp=await fetchT(`${API_BASE}${endpoint}`,{method:'POST',headers,body:JSON.stringify({user_id:USER_ID,...body}),});if(resp.status===401||resp.status===403){console.error('[PROLOGUE] Auth error:',resp.status);const tg=window.Telegram?.WebApp;if(tg?.sendData){window.__valdoria_transitioning=true;tg.sendData(JSON.stringify({action:'webapp_reconnect',webapp:'PROLOGUE',reason:resp.status===401?'session_expired':'invalid_init_data',}));setTimeout(function(){if(tg.close)tg.close();},1000);}
throw new Error('session_expired');}
if(!resp.ok){const errData=await resp.json().catch(()=>({}));throw new Error(errData.error||`HTTP ${resp.status}`);}
return resp.json().then(function(data){if(data&&data.status==='displaced'){if(window.SessionHeartbeat){SessionHeartbeat.handleDisplaced(data.device||'',data.from_device||'');}return null;}return data;}).catch(function(){throw new Error('Resposta inválida do servidor');});}
var track=document.getElementById('track');function addScreen(html){const div=document.createElement('div');div.className='screen fade-in';div.innerHTML=html;track.appendChild(div);
/* X-6.5.51AQ: populate AAA orb fallback in any new screen (data-needs-orb) */
try { if(typeof _populatePendingOrbs === 'function') _populatePendingOrbs(); } catch(e){}
return track.children.length-1;}
function goToScreen(idx){screenIdx=idx;track.style.transform=`translateX(-${idx * 100}%)`;}
function nextScreen(html){const idx=addScreen(html);setTimeout(()=>goToScreen(idx),50);}
function renderPreface(){
  const text=DATA.preface_text||'Boas vindas a Eldoria!';
  return _prolCard({
    portrait: '<svg viewBox="0 0 120 120"><use href="#ic-portoes"/></svg>',
    name: 'Boas-Vindas a Eldoria',
    desc: 'O início da sua jornada',
    pageInd: '1 / 1',
    body: _narration(text),
    actions: '<button class="prol-btn prol-btn-primary" onclick="haptic(\'medium\'); onPrefaceDone()">▸ Continuar</button>'
  });
}
function renderIntro(){
  const c=DATA.character||{};
  const l=DATA.lore||{};
  const fullName=`${c.name || ''} ${c.surname || ''}`.trim();
  const rerollLabel=rerollsLeft>0?`🎲 Sortear Outra (${rerollsLeft})`:'🎲 Limite atingido';
  const charBadgeHtml = ''
    + '<div class="prol-char-badge">'
    + '  <div class="prol-char-icon">' + (c.class_icon || '⚔️') + '</div>'
    + '  <div class="prol-char-info">'
    + '    <div class="prol-char-name">' + fullName + '</div>'
    + '    <div class="prol-char-details">' + (c.class_label || '') + ' · ' + (c.race || '') + ' · Nível ' + (c.level || 1) + '</div>'
    + '  </div>'
    + '</div>';
  const loreHtml = ''
    + '<div class="prol-lore-card">'
    + '  <div class="prol-lore-title">📜 ' + (l.title || 'Sua Origem') + '</div>'
    + '  <div class="prol-lore-desc">' + (l.description || '') + '</div>'
    + '</div>';
  const subHtml = _narration('As origens criam escolhas e eventos diferentes durante a jornada.');
  const actionsHtml = ''
    + '<div class="prol-btn-row">'
    + '  <button class="prol-btn prol-btn-outline" onclick="haptic(); openLoreOverlay()">📜 Ver Origem</button>'
    + '  <button class="prol-btn prol-btn-outline" id="rerollBtn" onclick="haptic(); doReroll()"' + (rerollsLeft <= 0 ? ' disabled' : '') + '>' + rerollLabel + '</button>'
    + '</div>'
    + '<button class="prol-btn prol-btn-primary" onclick="haptic(\'medium\'); onIntroDone()">▸ Continuar Jornada</button>';
  return _prolCard({
    portrait: '<svg viewBox="0 0 120 120"><use href="#ic-guerreiro"/></svg>',
    name: 'A Jornada de ' + fullName.toUpperCase(),
    desc: 'Sua história começa aqui',
    body: charBadgeHtml + loreHtml + subHtml,
    actions: actionsHtml
  });
}
function renderGate(){
  const inter=DATA.interaction||{};
  const title=inter.title||'EVENTO';
  const text=inter.text||'';
  const options=inter.options||[];
  const choicesHtml=options.map(function(o){
    return '<button class="prol-btn" onclick="haptic(\'medium\'); onGateChoice(\'' + o.key + '\')">' + o.label + '</button>';
  }).join('');
  return _prolCard({
    portrait: '<svg viewBox="0 0 120 120"><use href="#ic-portoes"/></svg>',
    name: title,
    desc: 'Os portões de Valdória',
    body: _narration(text),
    actions: choicesHtml
  });
}
/* X-6.5.51AS (2026-05-08) — pagination AAA pra Emboscada (PADRAO_ALDRIC).
   User pediu: "na emboscada na estrada faça ter paginação ao invés de
   scrolling, enriqueça a narrativa com trechos separados, imersão épica".
   Backend agora retorna road.script[] (lista de narration/speech segments).
   Cada segment vira 1 página com reveal animation; última página mostra
   action buttons (Lutar / Distração). */
function renderRoad(){
  const road=DATA.road||{};
  const script=Array.isArray(road.script) && road.script.length ? road.script : null;
  if (!script) {
    /* fallback: backend antigo retorna só road.text — single page sem paginação */
    return _prolCard({
      name: 'Emboscada na Estrada',
      desc: 'A jornada se torna perigosa',
      body: _narration(road.text || ''),
      actions: ''
        + '<button class="prol-btn" onclick="haptic(\'heavy\'); onRoadChoice(\'fight\')">⚔️ Lutar contra os lobos!</button>'
        + '<button class="prol-btn" onclick="haptic(\'medium\'); onRoadChoice(\'distract\')">🛡️ Criar uma distração</button>'
    });
  }
  /* Pagination state — armazenado como prop do screen DOM */
  window._roadCurPage = window._roadCurPage || 0;
  return _renderPaginatedScreen({
    name: 'Emboscada na Estrada',
    desc: 'A jornada se torna perigosa',
    script: script,
    pageVarName: '_roadCurPage',
    onLastPageActions: ''
      + '<button class="prol-btn" onclick="haptic(\'heavy\'); onRoadChoice(\'fight\')">⚔️ Lutar contra os lobos!</button>'
      + '<button class="prol-btn" onclick="haptic(\'medium\'); onRoadChoice(\'distract\')">🛡️ Criar uma distração</button>',
    rerenderFn: function(){
      /* Re-render the road screen using pagination state */
      var screens = track.querySelectorAll('.screen');
      var current = screens[screenIdx];
      if (current) {
        current.innerHTML = renderRoad();
        try { if(typeof _populatePendingOrbs === 'function') _populatePendingOrbs(); } catch(e){}
      }
    }
  });
}
/* Helper: renderiza um card paginado a partir de um script[] PADRAO_ALDRIC.
   - opts.script: array {type, speaker?, text}
   - opts.pageVarName: window prop name pra estado de página atual
   - opts.onLastPageActions: HTML pros botões da última página
   - opts.rerenderFn: chamado ao trocar de página (ou null = inline navigation)
   Header sempre AAA orb fallback (cenas de narração pura sem NPC). */
function _renderPaginatedScreen(opts){
  var script = opts.script || [];
  var pageVar = opts.pageVarName || '_paginatedCurPage';
  var totalPages = script.length;
  var curPage = Math.max(0, Math.min(window[pageVar] || 0, totalPages - 1));
  var entry = script[curPage] || {};
  var bodyHtml = entry.type === 'speech'
    ? _speech(entry.speaker || 'Voz', entry.text || '')
    : _narration(entry.text || '');
  var isLastPage = curPage === totalPages - 1;
  var actionsHtml;
  if (isLastPage && opts.onLastPageActions) {
    actionsHtml = opts.onLastPageActions;
  } else {
    /* Nav buttons: Anterior / Próximo */
    actionsHtml = ''
      + '<div class="prol-btn-row">'
      + '<button class="prol-btn" onclick="_paginatedPrev(\'' + pageVar + '\')"' + (curPage === 0 ? ' disabled' : '') + '>← Anterior</button>'
      + '<button class="prol-btn prol-btn-primary" onclick="_paginatedNext(\'' + pageVar + '\')">Próximo →</button>'
      + '</div>';
  }
  return _prolCard({
    /* SEM portrait — AAA 3D orb fallback (cena de narração pura) */
    name: opts.name || '',
    desc: opts.desc || '',
    pageInd: (curPage + 1) + ' / ' + totalPages,
    body: bodyHtml,
    actions: actionsHtml
  });
}
/* Pagination navigation handlers. Re-render current screen after page change. */
window._paginatedPrev = function(pageVar){
  haptic('light');
  if ((window[pageVar] || 0) > 0) {
    window[pageVar] = (window[pageVar] || 0) - 1;
    _rerenderCurrentScreen();
  }
};
window._paginatedNext = function(pageVar){
  haptic('light');
  /* Determina total de páginas pelo script atual baseado em pageVar.
     Pra simplificar: incrementa e deixa _renderPaginatedScreen clampar. */
  window[pageVar] = (window[pageVar] || 0) + 1;
  _rerenderCurrentScreen();
};
function _rerenderCurrentScreen(){
  var screens = track.querySelectorAll('.screen');
  var current = screens[screenIdx];
  if (!current) return;
  /* Identifica qual screen está visível e re-renderiza */
  if (DATA && DATA.mode === 'aftermath') {
    current.innerHTML = renderAftermath();
  } else {
    /* Default: assume road (única tela paginada hoje). Adicionar mais
       triggers se outras telas forem paginadas no futuro. */
    current.innerHTML = renderRoad();
  }
  try { if(typeof _populatePendingOrbs === 'function') _populatePendingOrbs(); } catch(e){}
}
function renderAftermath(){
  const text=DATA.aftermath_text||'';
  /* X-6.5.51AQ (2026-05-08): aftermath narrative is multi-quote — Thorne has
     TWO falas separadas. Old regex captured only ONE quote. Now: parse ALL
     quotes between "..." (or smart quotes) and wrap each as separate speech
     bubble; everything else is narration. User pediu: "tem uma segunda fala
     dele que começa com Venha comigo... que deveria aparecer com visual igual
     a fala Você salvou a vida do meu filho..." */
  var bodyHtml = '';
  var quoteRegex = /([""'']|<i>['"])(.+?)(['""'']|['"]<\/i>)/g;
  var lastIdx = 0;
  var match;
  var foundAny = false;
  while ((match = quoteRegex.exec(text)) !== null) {
    foundAny = true;
    var preText = text.slice(lastIdx, match.index).trim();
    if (preText) bodyHtml += _narration(preText);
    bodyHtml += _speech('Thorne, o Ferreiro', match[2]);
    lastIdx = match.index + match[0].length;
  }
  if (foundAny) {
    var trailing = text.slice(lastIdx).trim();
    if (trailing) bodyHtml += _narration(trailing);
  } else {
    bodyHtml = _narration(text);
  }
  return _prolCard({
    /* X-6.5.51AQ: portrait SVG com heraldic-sprite inline.
       User pediu: "adicione o icone heraldico no circulo do lado esquerdo do
       nome Thorne, o ferreiro no topo da janela". Usa ic-guerreiro (martelo
       + escudo, condizente com ferreiro lutador). Color amber heraldic. */
    portrait: '<svg viewBox="0 0 120 120" style="color:#b87333"><use href="#ic-guerreiro"/></svg>',
    name: 'Thorne, o Ferreiro',
    desc: 'Salvo dos lobos, agradecido',
    body: bodyHtml,
    actions: '<button class="prol-btn prol-btn-primary" onclick="haptic(\'heavy\'); onAftermathDone()">🏰 Seguir para os Portões</button>'
  });
}
function openLoreOverlay(){
  const l=DATA.lore||{};
  const c=DATA.character||{};
  const fullName=`${c.name || ''} ${c.surname || ''}`.trim();
  const body=document.getElementById('loreOverlayBody');
  if(!body)return;
  /* X-6.5.51AQ (2026-05-08): pagination + PADRAO_ALDRIC visual.
     Server returns l.pages = [page1, page2, ...] (mínimo 2: Cap I real + Cap II procedural).
     Client renderiza com nav Anterior/Próximo + page indicator. */
  var pages = (l.pages && Array.isArray(l.pages) && l.pages.length) ? l.pages
              : [l.intro_text || 'Nenhuma história disponível.'];
  var curPage = 0;
  function _renderPage() {
    var pageHtml = pages[curPage] || '';
    body.innerHTML = ''
      + '<div class="prol-card" style="height:100%;">'
      + '  <div class="prol-header">'
      + '    <div class="prol-portrait prol-portrait-orb"><div class="prol-aaa-orb" data-needs-orb="1"></div></div>'
      + '    <div class="prol-meta">'
      + '      <h3 class="prol-name">📜 ' + (l.title || 'Sua Origem') + '</h3>'
      + '      <p class="prol-desc">' + _escapeHtml(fullName) + '</p>'
      + '    </div>'
      + '    <div class="prol-page-ind">' + (curPage + 1) + ' / ' + pages.length + '</div>'
      + '  </div>'
      + '  <div class="prol-body" style="overflow-y:auto;">'
      + '    <div class="prol-line prol-narration" style="--reveal-dur:' + _computeRevealDur(pageHtml) + 'ms;">'
      + pageHtml.replace(/\n\n/g, '<br><br>')
      + '    </div>'
      + '  </div>'
      + '  <div class="prol-actions" style="flex-direction:row;gap:6px;">'
      + '    <button class="prol-btn" id="lore-prev"' + (curPage === 0 ? ' disabled' : '') + '>← Anterior</button>'
      + (curPage < pages.length - 1
          ? '    <button class="prol-btn prol-btn-primary" id="lore-next">Próximo →</button>'
          : '    <button class="prol-btn prol-btn-primary" id="lore-close">✓ Entendido</button>')
      + '  </div>'
      + '</div>';
    /* Wire buttons */
    var prevBtn = body.querySelector('#lore-prev');
    var nextBtn = body.querySelector('#lore-next');
    var closeBtn = body.querySelector('#lore-close');
    if (prevBtn) prevBtn.onclick = function(){ if(curPage>0){curPage--; haptic('light'); _renderPage();}};
    if (nextBtn) nextBtn.onclick = function(){ if(curPage<pages.length-1){curPage++; haptic('light'); _renderPage();}};
    if (closeBtn) closeBtn.onclick = function(){ haptic('medium'); closeLoreOverlay(); };
    /* Populate AAA orb */
    try { if(typeof _populatePendingOrbs === 'function') _populatePendingOrbs(); } catch(e){}
  }
  function _escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  _renderPage();
  vDrawer.open('loreOverlay');
}
function closeLoreOverlay(){haptic();vDrawer.close('loreOverlay');}
var _prologueDice=null;function showDiceRoll(result){const overlay=document.getElementById('diceOverlay');const canvas=document.getElementById('prologueDice3dCanvas');const breakdown=document.getElementById('diceBreakdown');const resultLabel=document.getElementById('diceResultLabel');const narrative=document.getElementById('diceNarrative');const actions=document.getElementById('diceActions');if(!overlay||!breakdown||!resultLabel||!narrative||!actions)return;breakdown.textContent='';resultLabel.textContent='';narrative.textContent='';actions.innerHTML='';overlay.classList.add('active');try{if(_prologueDice){_prologueDice.dispose();_prologueDice=null;}
_prologueDice=new Dice3D(canvas,{size:typeof ValdoriaDice!=='undefined'?ValdoriaDice.D20_SIZE:220,dieType:'d20',duration:typeof ValdoriaDice!=='undefined'?ValdoriaDice.TIMING.D20_ROLL_MS:1200});}catch(e){console.warn('[PROLOGUE] Dice3D init failed, fallback:',e);_showDiceRollFallback(result);return;}
const natural=result.natural;const mod=result.modifier;const total=result.total;const dc=result.dc;const success=result.success;var _rollDone=false;_prologueDice.roll(natural,function(){if(_rollDone)return;_rollDone=true;const modSign=mod>=0?'+':'';breakdown.textContent=`1d20 (${natural}) ${modSign}${mod} = ${total} vs DC ${dc}`;resultLabel.textContent=success?'SUCESSO!':'FALHA!';resultLabel.style.color=success?'var(--v-success)':'var(--v-danger)';if(success){narrative.innerHTML=('Você pega uma tocha da carroça tombada e a balança na direção dos lobos, '+'gritando e batendo em um escudo improvisado. O fogo e o barulho os assustam — '+'os predadores recuam entre os arbustos, ganindo.<br><br>'+'<span style="color:var(--v-success);font-weight:700">✨ +50 XP</span>');actions.innerHTML=`<button class="cenario-btn" onclick="haptic('medium'); onDistractSuccess()">🗣️ Falar com o ferreiro</button>`;}else{narrative.innerHTML=('Você tenta assustar os lobos, mas o líder da matilha não se intimida. '+'Ele rosna e avança! Não há outra opção — é lutar ou morrer!');let _failDone=false;const goFight=()=>{if(_failDone)return;_failDone=true;haptic('heavy');onDistractFail();};actions.innerHTML=`<button class="v-skip-btn" id="distractFailSkip">⚔️ Lutar!</button>`;const failDelay=typeof calcReadTime==='function'?calcReadTime(narrative.textContent,'overlay'):2500;setTimeout(()=>{if(!_failDone){const skipBtn=document.getElementById('distractFailSkip');if(skipBtn){skipBtn.classList.add('visible');skipBtn.onclick=goFight;}}},500);setTimeout(goFight,failDelay);}
try{if(tg)tg.HapticFeedback.notificationOccurred(success?'success':'error');}catch(e){console.warn('[PROLOGUE] haptic:',e);}});}
function _showDiceRollFallback(result){const d20=document.getElementById('diceD20');if(!d20)return;d20.style.display='';d20.className='dice-d20 rolling';d20.textContent='?';let rollInterval=setInterval(()=>{d20.textContent=Math.floor(Math.random()*20)+1;},80);setTimeout(()=>{clearInterval(rollInterval);d20.textContent=result.natural;d20.className='dice-d20 '+(result.success?'success':'fail');const modSign=result.modifier>=0?'+':'';document.getElementById('diceBreakdown').textContent=`1d20 (${result.natural}) ${modSign}${result.modifier} = ${result.total} vs DC ${result.dc}`;document.getElementById('diceResultLabel').textContent=result.success?'SUCESSO!':'FALHA!';document.getElementById('diceResultLabel').style.color=result.success?'var(--v-success)':'var(--v-danger)';const narrative=document.getElementById('diceNarrative');const actions=document.getElementById('diceActions');if(result.success){narrative.innerHTML='Você pega uma tocha da carroça tombada e a balança na direção dos lobos, '+'gritando e batendo em um escudo improvisado. O fogo e o barulho os assustam — '+'os predadores recuam entre os arbustos, ganindo.<br><br>'+'<span style="color:var(--v-success);font-weight:700">✨ +50 XP</span>';actions.innerHTML=`<button class="cenario-btn" onclick="haptic('medium'); onDistractSuccess()">🗣️ Falar com o ferreiro</button>`;}else{narrative.innerHTML='Você tenta assustar os lobos, mas o líder da matilha não se intimida. '+'Ele rosna e avança! Não há outra opção — é lutar ou morrer!';let _failDone=false;const goFight=()=>{if(_failDone)return;_failDone=true;haptic('heavy');onDistractFail();};actions.innerHTML=`<button class="v-skip-btn" id="distractFailSkipFb">⚔️ Lutar!</button>`;const fbDelay=typeof calcReadTime==='function'?calcReadTime(narrative.textContent,'overlay'):2500;setTimeout(()=>{if(!_failDone){const skipBtn=document.getElementById('distractFailSkipFb');if(skipBtn){skipBtn.classList.add('visible');skipBtn.onclick=goFight;}}},500);setTimeout(goFight,fbDelay);}},2000);}
function showGateResult(outcomeText,effectText,callback){const overlay=document.getElementById('resultOverlay');const textEl=document.getElementById('resultText');const effectsEl=document.getElementById('resultEffects');const skipBtn=document.getElementById('resultSkip');if(!overlay||!textEl||!effectsEl||!skipBtn)return;textEl.innerHTML=outcomeText;let badgeClass='neutral';if(effectText.includes('Penalidade')||effectText.includes('-'))badgeClass='negative';else if(effectText.includes('Bônus')||effectText.includes('+'))badgeClass='positive';effectsEl.innerHTML=effectText?`<div class="effect-badge ${badgeClass}">${effectText}</div>`:'';overlay.classList.add('active');const fullText=(outcomeText||'')+' '+(effectText||'');const delay=typeof calcReadTime==='function'?calcReadTime(fullText,'summary'):2500;let _done=false;const finish=()=>{if(_done)return;_done=true;skipBtn.classList.remove('visible');skipBtn.onclick=null;overlay.classList.remove('active');callback();};setTimeout(()=>{if(!_done){skipBtn.classList.add('visible');skipBtn.onclick=finish;}},500);setTimeout(finish,delay);}
function onPrefaceDone(){nextScreen(renderIntro());}
function onIntroDone(){closeLoreOverlay();nextScreen(renderRoad());}
async function doReroll(){
  if(rerollsLeft<=0)return;
  const btn=document.getElementById('rerollBtn');
  if(btn){btn.disabled=true;btn.textContent='🎲 Sorteando...';}
  try{
    const result=await apiCall('/api/prologue/reroll');
    DATA.lore=result.lore;
    DATA.interaction=result.interaction;
    rerollsLeft=result.rerolls_left??(rerollsLeft-1);
    const screens=track.querySelectorAll('.screen');
    const currentScreen=screens[screenIdx];
    if(currentScreen){currentScreen.innerHTML=renderIntro();}
    /* X-6.5.51AQ (2026-05-08) — popup quando user usa o ULTIMO reroll.
       Avisa que "Esta foi sua ultima sortida — mesmo se nao gostar, nao
       conseguira sortear mais". User pediu: "precisamos de um popup com
       botao Entendido avisando o jogador que ele nao conseguira sortear
       mais, mesmo se nao gostar da ultima vez que sortear" */
    if (rerollsLeft === 0) {
      _showLastRerollPopup();
    }
  }catch(e){showError('Erro ao sortear nova origem.',e);}
}
function _showLastRerollPopup(){
  /* Inject CSS (idempotent) */
  if (!document.getElementById('reroll-limit-style')) {
    var st = document.createElement('style');
    st.id = 'reroll-limit-style';
    st.textContent = ''
      + '#reroll-limit-overlay{position:fixed;inset:0;z-index:10500;background:rgba(0,0,0,0.85);'
      + '  display:flex;align-items:center;justify-content:center;padding:16px;'
      + '  animation:rrFadeIn 0.4s ease-out}'
      + '@keyframes rrFadeIn{from{opacity:0}to{opacity:1}}'
      + '.rr-card{background:linear-gradient(180deg,#3a2e22,#2a2218);'
      + '  border:1px solid rgba(196,149,58,0.6);border-radius:12px;'
      + '  max-width:380px;width:100%;padding:22px;text-align:center;'
      + '  box-shadow:0 12px 40px rgba(0,0,0,0.7),0 0 30px rgba(196,149,58,0.15)}'
      + '.rr-icon{font-size:36px;margin-bottom:12px;color:#c4953a;'
      + '  text-shadow:0 0 12px rgba(196,149,58,0.5)}'
      + '.rr-title{font-family:Cinzel,serif;color:#c4953a;font-size:16px;'
      + '  font-weight:700;letter-spacing:1.5px;margin:0 0 12px;text-transform:uppercase;'
      + '  text-shadow:0 0 8px rgba(196,149,58,0.4)}'
      + '.rr-text{color:#d4c8b0;font-size:14px;line-height:1.6;margin-bottom:18px;'
      + '  padding:10px 12px;background:rgba(0,0,0,0.18);border-left:2px solid rgba(196,149,58,0.4);'
      + '  border-radius:0 4px 4px 0;text-align:left;font-style:italic}'
      + '.rr-btn{padding:14px 28px;background:linear-gradient(180deg,#c4953a,#9a7530);'
      + '  border:1px solid #c4953a;border-radius:8px;color:#1a1510;'
      + '  font-family:Cinzel,serif;font-size:14px;font-weight:700;'
      + '  letter-spacing:1px;cursor:pointer;text-transform:uppercase;'
      + '  min-width:160px;min-height:48px;'
      + '  box-shadow:0 3px 12px rgba(196,149,58,0.3);'
      + '  transition:transform 0.1s,background 0.15s}'
      + '.rr-btn:hover{background:linear-gradient(180deg,#d4a54a,#a78540)}'
      + '.rr-btn:active{transform:scale(0.97)}';
    document.head.appendChild(st);
  }
  var ov = document.createElement('div');
  ov.id = 'reroll-limit-overlay';
  ov.innerHTML = ''
    + '<div class="rr-card">'
    + '  <div class="rr-icon">🎲</div>'
    + '  <h3 class="rr-title">Última Sortida</h3>'
    + '  <p class="rr-text">Esta foi a sua última oportunidade de sortear uma nova origem. '
    + 'O destino agora se firmou — mesmo que não goste do resultado, terá que seguir adiante '
    + 'com a história que o dado escolheu.</p>'
    + '  <button class="rr-btn">Entendido</button>'
    + '</div>';
  document.body.appendChild(ov);
  ov.querySelector('.rr-btn').addEventListener('click', function(){
    haptic('medium');
    ov.remove();
  });
}

/* SPA cleanup hook — remove overlays appended ao body se o router SPA trocar
   de WebApp sem o user clicar "Entendido". Sem este hook, #reroll-limit-overlay
   ficaria preso sob a próxima tela. Padrão definido em log-relay.js. */
if (!window._spaCleanupFns) window._spaCleanupFns = [];
window._spaCleanupFns.push(function() {
  var ids = ['reroll-limit-overlay', 'reroll-limit-style'];
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  });
});
/* X-6.5.51AN (2026-05-08) anti-cheat helper: persiste escolha server-side
   IMEDIATAMENTE. Falha silenciosa (best-effort) — se rede cair, escolha
   ainda vai no /complete. Mas se servidor confirmar, /init futuro retorna
   choice via saved_choices e WebApp pula a tela. */
async function _saveChoiceServer(choiceType, choiceValue){
  try {
    await apiCall('/api/prologue/save_choice', { choice_type: choiceType, choice_value: choiceValue });
  } catch(e){
    console.warn('[PROLOGUE] save_choice failed for ' + choiceType + '=' + choiceValue + ':', e);
    /* Don't fail the user flow — /complete will still send all choices as fallback */
  }
}
async function onGateChoice(key){
  choices.gate_choice=key;
  choices.interaction_type=DATA.interaction?.type||'gate';
  /* X-6.5.51AN: persist choices server-side IMMEDIATELY (anti-cheat) */
  await _saveChoiceServer('gate', key);
  await _saveChoiceServer('interaction_type', choices.interaction_type);
  const inter=DATA.interaction||{};
  let outcomeText='';
  let effectText='';
  if(inter.type==='lore'&&inter.outcomes){
    const outcome=inter.outcomes[key]||{};
    outcomeText=outcome.text||'Você avança para a cidade.';
    if(outcome.gold){const sign=outcome.gold>0?'+':'';effectText=`${sign}${outcome.gold} GP`;}
  } else {
    const gateTexts={
      refuge:{text:'O guarda te analisa de cima a baixo e te deixa passar, mas não sem uma inspeção.',effect:'⚠️ Inspeção nos portões'},
      bribe:{text:'O guarda pega as moedas rapidamente. "Um cidadão exemplar. A cidade lhe dá as boas-vindas."',effect:'<span class="vi vi-coin sm"></span> Taxa de entrada paga'},
      intimidate:{text:'O guarda mais velho não hesita — a coronha da lança acerta seu estômago. A dor acende algo dentro de você.',effect:'⚡ Entrada pela força'},
    };
    const g=gateTexts[key]||{text:'Você entra na cidade.',effect:''};
    outcomeText=g.text;
    effectText=g.effect;
  }
  showGateResult(outcomeText,effectText,()=>{onEnterCity();});
}
var _roadChoiceMade=false;
async function onRoadChoice(key){
  if(_roadChoiceMade)return;
  _roadChoiceMade=true;
  document.querySelectorAll('.prol-btn,.choice-btn').forEach(b=>{b.disabled=true;b.style.opacity='0.5';});
  choices.road_choice=key;
  /* X-6.5.51AN: persist road choice IMMEDIATELY (anti-cheat) */
  await _saveChoiceServer('road', key);
  if(key==='fight'){await doFight();}else{await doDistract();}
}
async function doDistract(){try{const result=await apiCall('/api/prologue/distract');choices.distract=result;showDiceRoll(result);}catch(e){showError('Erro no teste de habilidade.',e);}}
function onDistractSuccess(){
  document.getElementById('diceOverlay').classList.remove('active');
  /* === FASE C (sessão #11, 2026-05-19) — NPC Living System hooks ============
     Thorne é Armeiro canonical do Mercado (memory/reference_npc_personalities_canonical.md
     §13). Salvar a vida do filho dele no prólogo desbloqueia gossip especial
     quando jogador encontrá-lo em mercado-eldoria-final.html (Mercado).
     Renown +3 com facção market (escala DMG p.22: feito notável). */
  try {
    if (typeof window._npcMarkVisit === 'function') {
      window._npcMarkVisit('thorne', 'prologue_save');
      window._npcRemember('thorne', 'rescued_from_wolves', true);
      window._npcUnlockDialogue('thorne', 'gossip_prologue_rescue');
    }
    if (typeof window._applyRenownDelta === 'function') {
      window._applyRenownDelta('market', +3);
    }
  } catch(e){ console.warn('[PROLOGUE] NPC living hook err:', e); }
  nextScreen(renderAftermath());
}
async function onDistractFail(){document.getElementById('diceOverlay').classList.remove('active');await doFight();}
async function doFight(){try{if(window._prologueInitLoading){window._prologueInitLoading.show();}else{var _ld=document.getElementById('loading');if(_ld){_ld.style.display='flex';_ld.classList.remove('hidden');}}const result=await apiCall('/api/prologue/fight',{});if(result.combat_url||result.arena_url){window.__valdoria_transitioning=true;valdoriaSpaNav(result.combat_url||result.arena_url);}else{showError('Erro ao iniciar combate.');}}catch(e){showError('Erro ao iniciar combate.',e);}}
function onAftermathDone(){nextScreen(renderGate());}
async function onEnterCity(){try{if(window._prologueInitLoading){window._prologueInitLoading.show();}else{var _ld2=document.getElementById('loading');if(_ld2){_ld2.style.display='flex';_ld2.classList.remove('hidden');}}const body={gate_choice:choices.gate_choice||'',interaction_type:choices.interaction_type||'gate',aftermath_only:MODE==='aftermath',};if(choices.distract){body.distract=choices.distract;}
const result=await apiCall('/api/prologue/complete',body);if(result&&result.game_url){window.__valdoria_transitioning=true;valdoriaSpaNav(result.game_url);}else{if(window.Telegram&&Telegram.WebApp){window.__valdoria_transitioning=true;valdoriaSpaClose();}}}catch(e){showError('Erro ao entrar na cidade.',e);}}
/* X-6.5.51AP (2026-05-08) — _hideAllLoadings hides BOTH:
   1. vProcessing overlay (used by /fight retry — _prologueInitLoading.hide())
   2. SPA cold start #loading (created by app.html on first navigation)
   3. SPA's window.hideLoading if exposed
   Antes só chamava _prologueInitLoading.hide() (vProcessing) — mas cold start
   usa #loading direto. Resultado: loading "Preparando sua aventura..." ficava
   travado mesmo após /api/prologue/init retornar 200. */
function _hideAllLoadings(){
  try { if(window._prologueInitLoading && window._prologueInitLoading.hide) window._prologueInitLoading.hide(); } catch(e){}
  try { if(window.vProcessing && window.vProcessing.hide) window.vProcessing.hide(); } catch(e){}
  try { if(typeof window.hideLoading === 'function') window.hideLoading(); } catch(e){}
  try {
    var _ld = document.getElementById('loading');
    if(_ld){ _ld.classList.add('hidden'); _ld.style.display = 'none'; }
  } catch(e){}
}
async function boot(){
  if(!TOKEN||!API_BASE||!USER_ID){_hideAllLoadings();showError('Parâmetros inválidos. Feche e tente novamente.');return;}
  try{
    DATA=await apiCall('/api/prologue/init');
    _hideAllLoadings();
    if(typeof ValdoriaAudio!=='undefined')ValdoriaAudio.play('prologue');

    /* X-6.5.51AN (2026-05-08) anti-cheat: restaura escolhas ja persistidas
       server-side. Se user fechou WebApp apos escolher (ex: distract+fail
       intermediario, ou gate_choice), SKIPA telas ja resolvidas e vai
       direto pro proximo passo. NUNCA permite re-rodar dice de distract. */
    var sc = (DATA && DATA.saved_choices) || {};
    if (sc.gate_choice) choices.gate_choice = sc.gate_choice;
    if (sc.interaction_type) choices.interaction_type = sc.interaction_type;
    if (sc.road_choice) choices.road_choice = sc.road_choice;
    if (sc.distract_result) choices.distract = sc.distract_result;

    if(DATA.mode==='aftermath'){addScreen(renderAftermath());goToScreen(0);return;}

    /* Skip-forward determinado pelo estado salvo:
       - sem road_choice: comeca no comeco (preface ou intro)
       - road_choice='fight': já indo pra combate (chamou /fight) — mas se
         lore_completed=False ainda no server, /fight ainda funciona.
         Provavelmente caiu aqui por conta de retry; vai pro intro mesmo.
       - road_choice='distract' + sem distract_result: mostra road de novo
         (situacao improvavel — distract sempre persiste o resultado).
       - distract_result.success=True + sem gate_choice: pula direto pro aftermath
       - distract_result.success=False: pula pro fight (perdeu o teste, tem
         que lutar — cheating-proof) */
    var startScreen = null;
    if (sc.distract_result && sc.distract_result.success && !sc.gate_choice){
      console.info('[PROLOGUE] resume: distract success → aftermath');
      startScreen = renderAftermath();
    } else if (sc.distract_result && sc.distract_result.success === false){
      console.info('[PROLOGUE] resume: distract fail → fight (forced)');
      addScreen(renderRoad());  // mostra brevemente o estado "fail"
      goToScreen(0);
      /* dispara fight automaticamente (anti-cheat: nao deixa user trocar) */
      setTimeout(function(){ doFight(); }, 600);
      return;
    } else if(DATA.show_preface){
      startScreen = renderPreface();
    } else {
      startScreen = renderIntro();
    }
    addScreen(startScreen);
    goToScreen(0);
  } catch(e){
    _hideAllLoadings();  /* X-6.5.51AP: hide loading on error too */
    showError('Erro ao carregar prólogo. Feche e tente novamente.',e);
  }
}
boot();