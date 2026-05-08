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
/* Build the PADRAO_ALDRIC card shell (header + body + actions) */
function _prolCard(opts){
  var portrait=opts.portrait||'<svg viewBox="0 0 120 120"><use href="#ic-portoes"/></svg>';
  var name=opts.name||'';
  var desc=opts.desc||'';
  var pageInd=opts.pageInd||'';
  var bodyHtml=opts.body||'';
  var actionsHtml=opts.actions||'';
  return ''
    + '<div class="prol-card">'
    + '  <div class="prol-header">'
    + '    <div class="prol-portrait">' + portrait + '</div>'
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
async function apiCall(endpoint,body={}){const headers={'Content-Type':'application/json','Authorization':`Bearer ${TOKEN}`,};if(window.Telegram?.WebApp?.initData){headers['X-Telegram-Init-Data']=Telegram.WebApp.initData;}
if(endpoint.includes('/reroll')||endpoint.includes('/fight')||endpoint.includes('/complete')||endpoint.includes('/distract')){headers['X-Idempotency-Key']=crypto.randomUUID();}
const resp=await fetchT(`${API_BASE}${endpoint}`,{method:'POST',headers,body:JSON.stringify({user_id:USER_ID,...body}),});if(resp.status===401||resp.status===403){console.error('[PROLOGUE] Auth error:',resp.status);const tg=window.Telegram?.WebApp;if(tg?.sendData){window.__valdoria_transitioning=true;tg.sendData(JSON.stringify({action:'webapp_reconnect',webapp:'PROLOGUE',reason:resp.status===401?'session_expired':'invalid_init_data',}));setTimeout(function(){if(tg.close)tg.close();},1000);}
throw new Error('session_expired');}
if(!resp.ok){const errData=await resp.json().catch(()=>({}));throw new Error(errData.error||`HTTP ${resp.status}`);}
return resp.json().then(function(data){if(data&&data.status==='displaced'){if(window.SessionHeartbeat){SessionHeartbeat.handleDisplaced(data.device||'',data.from_device||'');}return null;}return data;}).catch(function(){throw new Error('Resposta inválida do servidor');});}
var track=document.getElementById('track');function addScreen(html){const div=document.createElement('div');div.className='screen fade-in';div.innerHTML=html;track.appendChild(div);return track.children.length-1;}
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
function renderRoad(){
  const road=DATA.road||{};
  const text=road.text||'';
  return _prolCard({
    portrait: '<svg viewBox="0 0 120 120"><use href="#ic-lobo"/></svg>',
    name: 'Emboscada na Estrada',
    desc: 'Lobos cercam a carroça do ferreiro',
    body: _narration(text),
    actions: ''
      + '<button class="prol-btn" onclick="haptic(\'heavy\'); onRoadChoice(\'fight\')">⚔️ Lutar contra os lobos!</button>'
      + '<button class="prol-btn" onclick="haptic(\'medium\'); onRoadChoice(\'distract\')">🛡️ Criar uma distração</button>'
  });
}
function renderAftermath(){
  const text=DATA.aftermath_text||'';
  /* X-6.5.51AM: usa speech bubble pra fala do Thorne (texto chega geralmente
     com fala dele), narration pro restante. Detecta aspas pra dividir. */
  var bodyHtml = '';
  /* Tenta separar narration | "fala" | narration */
  var match = text.match(/^([\s\S]*?)([""''](.+)[""''])([\s\S]*)$/);
  if (match && match[3]){
    if (match[1] && match[1].trim()) bodyHtml += _narration(match[1].trim());
    bodyHtml += _speech('Thorne, o Ferreiro', match[3]);
    if (match[4] && match[4].trim()) bodyHtml += _narration(match[4].trim());
  } else {
    bodyHtml = _narration(text);
  }
  return _prolCard({
    portrait: '<svg viewBox="0 0 120 120"><use href="#ic-guerreiro"/></svg>',
    name: 'Thorne, o Ferreiro',
    desc: 'Salvo dos lobos, agradecido',
    body: bodyHtml,
    actions: '<button class="prol-btn prol-btn-primary" onclick="haptic(\'heavy\'); onAftermathDone()">🏰 Seguir para os Portões</button>'
  });
}
function openLoreOverlay(){const l=DATA.lore||{};const c=DATA.character||{};const fullName=`${c.name || ''} ${c.surname || ''}`.trim();const body=document.getElementById('loreOverlayBody');if(!body)return;body.innerHTML=`
        <div class="screen-title" style="text-align:left;margin-bottom:12px">📜 ${fullName}</div>
        <div style="line-height:1.7">${l.intro_text || 'Nenhuma história disponível.'}</div>
    `;vDrawer.open('loreOverlay');}
function closeLoreOverlay(){haptic();vDrawer.close('loreOverlay');}
var _prologueDice=null;function showDiceRoll(result){const overlay=document.getElementById('diceOverlay');const canvas=document.getElementById('prologueDice3dCanvas');const breakdown=document.getElementById('diceBreakdown');const resultLabel=document.getElementById('diceResultLabel');const narrative=document.getElementById('diceNarrative');const actions=document.getElementById('diceActions');if(!overlay||!breakdown||!resultLabel||!narrative||!actions)return;breakdown.textContent='';resultLabel.textContent='';narrative.textContent='';actions.innerHTML='';overlay.classList.add('active');try{if(_prologueDice){_prologueDice.dispose();_prologueDice=null;}
_prologueDice=new Dice3D(canvas,{size:typeof ValdoriaDice!=='undefined'?ValdoriaDice.D20_SIZE:220,dieType:'d20',duration:typeof ValdoriaDice!=='undefined'?ValdoriaDice.TIMING.D20_ROLL_MS:1200});}catch(e){console.warn('[PROLOGUE] Dice3D init failed, fallback:',e);_showDiceRollFallback(result);return;}
const natural=result.natural;const mod=result.modifier;const total=result.total;const dc=result.dc;const success=result.success;var _rollDone=false;_prologueDice.roll(natural,function(){if(_rollDone)return;_rollDone=true;const modSign=mod>=0?'+':'';breakdown.textContent=`1d20 (${natural}) ${modSign}${mod} = ${total} vs DC ${dc}`;resultLabel.textContent=success?'SUCESSO!':'FALHA!';resultLabel.style.color=success?'var(--v-success)':'var(--v-danger)';if(success){narrative.innerHTML=('Você pega uma tocha da carroça tombada e a balança na direção dos lobos, '+'gritando e batendo em um escudo improvisado. O fogo e o barulho os assustam — '+'os predadores recuam entre os arbustos, ganindo.<br><br>'+'<span style="color:var(--v-success);font-weight:700">✨ +50 XP</span>');actions.innerHTML=`<button class="hero-btn" onclick="haptic('medium'); onDistractSuccess()">🗣️ Falar com o ferreiro</button>`;}else{narrative.innerHTML=('Você tenta assustar os lobos, mas o líder da matilha não se intimida. '+'Ele rosna e avança! Não há outra opção — é lutar ou morrer!');let _failDone=false;const goFight=()=>{if(_failDone)return;_failDone=true;haptic('heavy');onDistractFail();};actions.innerHTML=`<button class="v-skip-btn" id="distractFailSkip">⚔️ Lutar!</button>`;const failDelay=typeof calcReadTime==='function'?calcReadTime(narrative.textContent,'overlay'):2500;setTimeout(()=>{if(!_failDone){const skipBtn=document.getElementById('distractFailSkip');if(skipBtn){skipBtn.classList.add('visible');skipBtn.onclick=goFight;}}},500);setTimeout(goFight,failDelay);}
try{if(tg)tg.HapticFeedback.notificationOccurred(success?'success':'error');}catch(e){console.warn('[PROLOGUE] haptic:',e);}});}
function _showDiceRollFallback(result){const d20=document.getElementById('diceD20');if(!d20)return;d20.style.display='';d20.className='dice-d20 rolling';d20.textContent='?';let rollInterval=setInterval(()=>{d20.textContent=Math.floor(Math.random()*20)+1;},80);setTimeout(()=>{clearInterval(rollInterval);d20.textContent=result.natural;d20.className='dice-d20 '+(result.success?'success':'fail');const modSign=result.modifier>=0?'+':'';document.getElementById('diceBreakdown').textContent=`1d20 (${result.natural}) ${modSign}${result.modifier} = ${result.total} vs DC ${result.dc}`;document.getElementById('diceResultLabel').textContent=result.success?'SUCESSO!':'FALHA!';document.getElementById('diceResultLabel').style.color=result.success?'var(--v-success)':'var(--v-danger)';const narrative=document.getElementById('diceNarrative');const actions=document.getElementById('diceActions');if(result.success){narrative.innerHTML='Você pega uma tocha da carroça tombada e a balança na direção dos lobos, '+'gritando e batendo em um escudo improvisado. O fogo e o barulho os assustam — '+'os predadores recuam entre os arbustos, ganindo.<br><br>'+'<span style="color:var(--v-success);font-weight:700">✨ +50 XP</span>';actions.innerHTML=`<button class="hero-btn" onclick="haptic('medium'); onDistractSuccess()">🗣️ Falar com o ferreiro</button>`;}else{narrative.innerHTML='Você tenta assustar os lobos, mas o líder da matilha não se intimida. '+'Ele rosna e avança! Não há outra opção — é lutar ou morrer!';let _failDone=false;const goFight=()=>{if(_failDone)return;_failDone=true;haptic('heavy');onDistractFail();};actions.innerHTML=`<button class="v-skip-btn" id="distractFailSkipFb">⚔️ Lutar!</button>`;const fbDelay=typeof calcReadTime==='function'?calcReadTime(narrative.textContent,'overlay'):2500;setTimeout(()=>{if(!_failDone){const skipBtn=document.getElementById('distractFailSkipFb');if(skipBtn){skipBtn.classList.add('visible');skipBtn.onclick=goFight;}}},500);setTimeout(goFight,fbDelay);}},2000);}
function showGateResult(outcomeText,effectText,callback){const overlay=document.getElementById('resultOverlay');const textEl=document.getElementById('resultText');const effectsEl=document.getElementById('resultEffects');const skipBtn=document.getElementById('resultSkip');if(!overlay||!textEl||!effectsEl||!skipBtn)return;textEl.innerHTML=outcomeText;let badgeClass='neutral';if(effectText.includes('Penalidade')||effectText.includes('-'))badgeClass='negative';else if(effectText.includes('Bônus')||effectText.includes('+'))badgeClass='positive';effectsEl.innerHTML=effectText?`<div class="effect-badge ${badgeClass}">${effectText}</div>`:'';overlay.classList.add('active');const fullText=(outcomeText||'')+' '+(effectText||'');const delay=typeof calcReadTime==='function'?calcReadTime(fullText,'summary'):2500;let _done=false;const finish=()=>{if(_done)return;_done=true;skipBtn.classList.remove('visible');skipBtn.onclick=null;overlay.classList.remove('active');callback();};setTimeout(()=>{if(!_done){skipBtn.classList.add('visible');skipBtn.onclick=finish;}},500);setTimeout(finish,delay);}
function onPrefaceDone(){nextScreen(renderIntro());}
function onIntroDone(){closeLoreOverlay();nextScreen(renderRoad());}
async function doReroll(){if(rerollsLeft<=0)return;const btn=document.getElementById('rerollBtn');if(btn){btn.disabled=true;btn.textContent='🎲 Sorteando...';}
try{const result=await apiCall('/api/prologue/reroll');DATA.lore=result.lore;DATA.interaction=result.interaction;rerollsLeft=result.rerolls_left??(rerollsLeft-1);const screens=track.querySelectorAll('.screen');const currentScreen=screens[screenIdx];if(currentScreen){currentScreen.innerHTML=renderIntro();}}catch(e){showError('Erro ao sortear nova origem.',e);}}
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
function onDistractSuccess(){document.getElementById('diceOverlay').classList.remove('active');nextScreen(renderAftermath());}
async function onDistractFail(){document.getElementById('diceOverlay').classList.remove('active');await doFight();}
async function doFight(){try{if(window._prologueInitLoading){window._prologueInitLoading.show();}else{var _ld=document.getElementById('loading');if(_ld){_ld.style.display='flex';_ld.classList.remove('hidden');}}const result=await apiCall('/api/prologue/fight',{});if(result.combat_url||result.arena_url){window.__valdoria_transitioning=true;valdoriaSpaNav(result.combat_url||result.arena_url);}else{showError('Erro ao iniciar combate.');}}catch(e){showError('Erro ao iniciar combate.',e);}}
function onAftermathDone(){nextScreen(renderGate());}
async function onEnterCity(){try{if(window._prologueInitLoading){window._prologueInitLoading.show();}else{var _ld2=document.getElementById('loading');if(_ld2){_ld2.style.display='flex';_ld2.classList.remove('hidden');}}const body={gate_choice:choices.gate_choice||'',interaction_type:choices.interaction_type||'gate',aftermath_only:MODE==='aftermath',};if(choices.distract){body.distract=choices.distract;}
const result=await apiCall('/api/prologue/complete',body);if(result&&result.game_url){window.__valdoria_transitioning=true;valdoriaSpaNav(result.game_url);}else{if(window.Telegram&&Telegram.WebApp){window.__valdoria_transitioning=true;valdoriaSpaClose();}}}catch(e){showError('Erro ao entrar na cidade.',e);}}
async function boot(){
  if(!TOKEN||!API_BASE||!USER_ID){showError('Parâmetros inválidos. Feche e tente novamente.');return;}
  try{
    DATA=await apiCall('/api/prologue/init');
    if(window._prologueInitLoading){window._prologueInitLoading.hide();}
    else{var _ld3=document.getElementById('loading');if(_ld3){_ld3.classList.add('hidden');_ld3.style.display='none';}}
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
  } catch(e){showError('Erro ao carregar prólogo. Feche e tente novamente.',e);}
}
boot();