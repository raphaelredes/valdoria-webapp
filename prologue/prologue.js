var tg=window.Telegram?.WebApp;if(tg){tg.ready();tg.expand();}
var _spaP=window.__spaRouteParams||{};var params=new URLSearchParams(location.search);var TOKEN=_spaP.token||params.get('token')||'';var API_BASE=(_spaP.api||params.get('api')||'').replace(/\/$/,'');var USER_ID=parseInt(_spaP.uid||params.get('uid')||'0',10);if(window.SessionHeartbeat&&API_BASE&&TOKEN&&USER_ID){SessionHeartbeat.init({apiBase:API_BASE,token:TOKEN,uid:USER_ID});}
var MODE=_spaP.mode||params.get('mode')||'full';var SHOW_PREFACE=(_spaP.preface||params.get('preface'))==='1';if(window.ValdoriaErrors){ValdoriaErrors.init({appName:'PROLOGUE',apiBase:API_BASE,token:TOKEN,uid:USER_ID,});}
var DATA=null;var screenIdx=0;var choices={};var rerollsLeft=5;function haptic(type){if(window.vHaptic)vHaptic.impact(type||'light');}
async function apiCall(endpoint,body={}){const headers={'Content-Type':'application/json','Authorization':`Bearer ${TOKEN}`,};if(window.Telegram?.WebApp?.initData){headers['X-Telegram-Init-Data']=Telegram.WebApp.initData;}
if(endpoint.includes('/reroll')||endpoint.includes('/fight')||endpoint.includes('/complete')||endpoint.includes('/distract')){headers['X-Idempotency-Key']=crypto.randomUUID();}
const resp=await fetchT(`${API_BASE}${endpoint}`,{method:'POST',headers,body:JSON.stringify({user_id:USER_ID,...body}),});if(resp.status===401||resp.status===403){console.error('[PROLOGUE] Auth error:',resp.status);const tg=window.Telegram?.WebApp;if(tg?.sendData){window.__valdoria_transitioning=true;tg.sendData(JSON.stringify({action:'webapp_reconnect',webapp:'PROLOGUE',reason:resp.status===401?'session_expired':'invalid_init_data',}));setTimeout(function(){if(tg.close)tg.close();},1000);}
throw new Error('session_expired');}
if(!resp.ok){const errData=await resp.json().catch(()=>({}));throw new Error(errData.error||`HTTP ${resp.status}`);}
return resp.json().catch(function(){throw new Error('Resposta inválida do servidor');});}
var track=document.getElementById('track');function addScreen(html){const div=document.createElement('div');div.className='screen fade-in';div.innerHTML=html;track.appendChild(div);return track.children.length-1;}
function goToScreen(idx){screenIdx=idx;track.style.transform=`translateX(-${idx * 100}%)`;}
function nextScreen(html){const idx=addScreen(html);setTimeout(()=>goToScreen(idx),50);}
function renderPreface(){const text=DATA.preface_text||'Boas vindas a Eldoria!';return`
        <div class="screen-title">Boas-Vindas a Eldoria</div>
        <div class="prologue-text">${text}</div>
        <button class="hero-btn" onclick="haptic('medium'); onPrefaceDone()">Entendido!</button>
    `;}
function renderIntro(){const c=DATA.character||{};const l=DATA.lore||{};const fullName=`${c.name || ''} ${c.surname || ''}`.trim();const rerollLabel=rerollsLeft>0?`🎲 Sortear Outra (${rerollsLeft})`:'🎲 Limite atingido';return`
        <div class="screen-title">A Jornada de ${fullName.toUpperCase()}</div>
        <div class="char-badge">
            <span class="char-badge-icon">${c.class_icon || '⚔️'}</span>
            <div class="char-badge-info">
                <div class="char-badge-name">${fullName}</div>
                <div class="char-badge-details">${c.class_label || ''} ${c.race || ''} · Nível ${c.level || 1}</div>
            </div>
        </div>
        <div class="lore-card">
            <div class="lore-card-title">${l.title || 'Sua Origem'}</div>
            <div class="lore-card-desc">${l.description || ''}</div>
        </div>
        <div class="screen-subtitle">As origens criam escolhas e eventos diferentes durante a jornada.</div>
        <div class="btn-row">
            <button class="outline-btn" onclick="haptic(); openLoreOverlay()">📜 Ver Origem</button>
            <button class="outline-btn" id="rerollBtn" onclick="haptic(); doReroll()" ${rerollsLeft <= 0 ? 'disabled' : ''}>${rerollLabel}</button>
        </div>
        <button class="hero-btn" onclick="haptic('medium'); onIntroDone()">Continuar ▸</button>
    `;}
function renderGate(){const inter=DATA.interaction||{};const title=inter.title||'EVENTO';const text=inter.text||'';const options=inter.options||[];let choicesHtml=options.map(o=>`<button class="choice-btn" onclick="haptic('medium'); onGateChoice('${o.key}')">${o.label}</button>`).join('');return`
        <div class="screen-title">${title}</div>
        <div class="prologue-text">${text}</div>
        <div class="choice-list">${choicesHtml}</div>
    `;}
function renderRoad(){const road=DATA.road||{};const text=road.text||'';return`
        <div class="screen-title">Emboscada na Estrada</div>
        <div class="prologue-text">${text}</div>
        <div class="choice-list">
            <button class="choice-btn" onclick="haptic('heavy'); onRoadChoice('fight')">⚔️ Lutar!</button>
            <button class="choice-btn" onclick="haptic('medium'); onRoadChoice('distract')">🛡️ Criar distração</button>
        </div>
    `;}
function renderAftermath(){const text=DATA.aftermath_text||'';return`
        <div class="screen-title">Thorne, o Ferreiro</div>
        <div class="prologue-text">${text}</div>
        <button class="hero-btn" onclick="haptic('heavy'); onAftermathDone()">🏰 Seguir para os Portões</button>
    `;}
function openLoreOverlay(){const l=DATA.lore||{};const c=DATA.character||{};const fullName=`${c.name || ''} ${c.surname || ''}`.trim();const body=document.getElementById('loreOverlayBody');body.innerHTML=`
        <div class="screen-title" style="text-align:left;margin-bottom:12px">📜 ${fullName}</div>
        <div style="line-height:1.7">${l.intro_text || 'Nenhuma história disponível.'}</div>
    `;vDrawer.open('loreOverlay');}
function closeLoreOverlay(){haptic();vDrawer.close('loreOverlay');}
var _prologueDice=null;function showDiceRoll(result){const overlay=document.getElementById('diceOverlay');const canvas=document.getElementById('prologueDice3dCanvas');const breakdown=document.getElementById('diceBreakdown');const resultLabel=document.getElementById('diceResultLabel');const narrative=document.getElementById('diceNarrative');const actions=document.getElementById('diceActions');breakdown.textContent='';resultLabel.textContent='';narrative.textContent='';actions.innerHTML='';overlay.classList.add('active');try{if(_prologueDice){_prologueDice.dispose();_prologueDice=null;}
_prologueDice=new Dice3D(canvas,{size:typeof ValdoriaDice!=='undefined'?ValdoriaDice.D20_SIZE:220,dieType:'d20',duration:typeof ValdoriaDice!=='undefined'?ValdoriaDice.TIMING.D20_ROLL_MS:1200});}catch(e){console.warn('[PROLOGUE] Dice3D init failed, fallback:',e);_showDiceRollFallback(result);return;}
const natural=result.natural;const mod=result.modifier;const total=result.total;const dc=result.dc;const success=result.success;var _rollDone=false;_prologueDice.roll(natural,function(){if(_rollDone)return;_rollDone=true;const modSign=mod>=0?'+':'';breakdown.textContent=`1d20 (${natural}) ${modSign}${mod} = ${total} vs DC ${dc}`;resultLabel.textContent=success?'SUCESSO!':'FALHA!';resultLabel.style.color=success?'var(--v-success)':'var(--v-danger)';if(success){narrative.innerHTML=('Você pega uma tocha da carroça tombada e a balança na direção dos lobos, '+'gritando e batendo em um escudo improvisado. O fogo e o barulho os assustam — '+'os predadores recuam entre os arbustos, ganindo.<br><br>'+'<span style="color:var(--v-success);font-weight:700">✨ +50 XP</span>');actions.innerHTML=`<button class="hero-btn" onclick="haptic('medium'); onDistractSuccess()">🗣️ Falar com o ferreiro</button>`;}else{narrative.innerHTML=('Você tenta assustar os lobos, mas o líder da matilha não se intimida. '+'Ele rosna e avança! Não há outra opção — é lutar ou morrer!');let _failDone=false;const goFight=()=>{if(_failDone)return;_failDone=true;haptic('heavy');onDistractFail();};actions.innerHTML=`<button class="v-skip-btn" id="distractFailSkip">⚔️ Lutar!</button>`;const failDelay=typeof calcReadTime==='function'?calcReadTime(narrative.textContent,'overlay'):2500;setTimeout(()=>{if(!_failDone){const skipBtn=document.getElementById('distractFailSkip');if(skipBtn){skipBtn.classList.add('visible');skipBtn.onclick=goFight;}}},500);setTimeout(goFight,failDelay);}
try{if(tg)tg.HapticFeedback.notificationOccurred(success?'success':'error');}catch(e){console.warn('[PROLOGUE] haptic:',e);}});}
function _showDiceRollFallback(result){const d20=document.getElementById('diceD20');d20.style.display='';d20.className='dice-d20 rolling';d20.textContent='?';let rollInterval=setInterval(()=>{d20.textContent=Math.floor(Math.random()*20)+1;},80);setTimeout(()=>{clearInterval(rollInterval);d20.textContent=result.natural;d20.className='dice-d20 '+(result.success?'success':'fail');const modSign=result.modifier>=0?'+':'';document.getElementById('diceBreakdown').textContent=`1d20 (${result.natural}) ${modSign}${result.modifier} = ${result.total} vs DC ${result.dc}`;document.getElementById('diceResultLabel').textContent=result.success?'SUCESSO!':'FALHA!';document.getElementById('diceResultLabel').style.color=result.success?'var(--v-success)':'var(--v-danger)';const narrative=document.getElementById('diceNarrative');const actions=document.getElementById('diceActions');if(result.success){narrative.innerHTML='Você pega uma tocha da carroça tombada e a balança na direção dos lobos, '+'gritando e batendo em um escudo improvisado. O fogo e o barulho os assustam — '+'os predadores recuam entre os arbustos, ganindo.<br><br>'+'<span style="color:var(--v-success);font-weight:700">✨ +50 XP</span>';actions.innerHTML=`<button class="hero-btn" onclick="haptic('medium'); onDistractSuccess()">🗣️ Falar com o ferreiro</button>`;}else{narrative.innerHTML='Você tenta assustar os lobos, mas o líder da matilha não se intimida. '+'Ele rosna e avança! Não há outra opção — é lutar ou morrer!';let _failDone=false;const goFight=()=>{if(_failDone)return;_failDone=true;haptic('heavy');onDistractFail();};actions.innerHTML=`<button class="v-skip-btn" id="distractFailSkipFb">⚔️ Lutar!</button>`;const fbDelay=typeof calcReadTime==='function'?calcReadTime(narrative.textContent,'overlay'):2500;setTimeout(()=>{if(!_failDone){const skipBtn=document.getElementById('distractFailSkipFb');if(skipBtn){skipBtn.classList.add('visible');skipBtn.onclick=goFight;}}},500);setTimeout(goFight,fbDelay);}},2000);}
function showGateResult(outcomeText,effectText,callback){const overlay=document.getElementById('resultOverlay');const textEl=document.getElementById('resultText');const effectsEl=document.getElementById('resultEffects');const skipBtn=document.getElementById('resultSkip');textEl.innerHTML=outcomeText;let badgeClass='neutral';if(effectText.includes('Penalidade')||effectText.includes('-'))badgeClass='negative';else if(effectText.includes('Bônus')||effectText.includes('+'))badgeClass='positive';effectsEl.innerHTML=effectText?`<div class="effect-badge ${badgeClass}">${effectText}</div>`:'';overlay.classList.add('active');const fullText=(outcomeText||'')+' '+(effectText||'');const delay=typeof calcReadTime==='function'?calcReadTime(fullText,'summary'):2500;let _done=false;const finish=()=>{if(_done)return;_done=true;skipBtn.classList.remove('visible');skipBtn.onclick=null;overlay.classList.remove('active');callback();};setTimeout(()=>{if(!_done){skipBtn.classList.add('visible');skipBtn.onclick=finish;}},500);setTimeout(finish,delay);}
function onPrefaceDone(){nextScreen(renderIntro());}
function onIntroDone(){closeLoreOverlay();nextScreen(renderRoad());}
async function doReroll(){if(rerollsLeft<=0)return;const btn=document.getElementById('rerollBtn');if(btn){btn.disabled=true;btn.textContent='🎲 Sorteando...';}
try{const result=await apiCall('/api/prologue/reroll');DATA.lore=result.lore;DATA.interaction=result.interaction;rerollsLeft=result.rerolls_left??(rerollsLeft-1);const screens=track.querySelectorAll('.screen');const currentScreen=screens[screenIdx];if(currentScreen){currentScreen.innerHTML=renderIntro();}}catch(e){showError('Erro ao sortear nova origem.',e);}}
function onGateChoice(key){choices.gate_choice=key;choices.interaction_type=DATA.interaction?.type||'gate';const inter=DATA.interaction||{};let outcomeText='';let effectText='';if(inter.type==='lore'&&inter.outcomes){const outcome=inter.outcomes[key]||{};outcomeText=outcome.text||'Você avança para a cidade.';if(outcome.gold){const sign=outcome.gold>0?'+':'';effectText=`${sign}${outcome.gold} GP`;}}else{const gateTexts={refuge:{text:'O guarda te analisa de cima a baixo e te deixa passar, mas não sem uma inspeção.',effect:'⚠️ Inspeção nos portões'},bribe:{text:'O guarda pega as moedas rapidamente. "Um cidadão exemplar. A cidade lhe dá as boas-vindas."',effect:'💰 Taxa de entrada paga'},intimidate:{text:'O guarda mais velho não hesita — a coronha da lança acerta seu estômago. A dor acende algo dentro de você.',effect:'⚡ Entrada pela força'},};const g=gateTexts[key]||{text:'Você entra na cidade.',effect:''};outcomeText=g.text;effectText=g.effect;}
showGateResult(outcomeText,effectText,()=>{onEnterCity();});}
var _roadChoiceMade=false;async function onRoadChoice(key){if(_roadChoiceMade)return;_roadChoiceMade=true;document.querySelectorAll('.choice-btn').forEach(b=>{b.disabled=true;b.style.opacity='0.5';});choices.road_choice=key;if(key==='fight'){await doFight();}else{await doDistract();}}
async function doDistract(){try{const result=await apiCall('/api/prologue/distract');choices.distract=result;showDiceRoll(result);}catch(e){showError('Erro no teste de habilidade.',e);}}
function onDistractSuccess(){document.getElementById('diceOverlay').classList.remove('active');nextScreen(renderAftermath());}
async function onDistractFail(){document.getElementById('diceOverlay').classList.remove('active');await doFight();}
async function doFight(){try{if(window._prologueInitLoading){window._prologueInitLoading.show();}else{var _ld=document.getElementById('loading');if(_ld){_ld.style.display='flex';_ld.classList.remove('hidden');}}const result=await apiCall('/api/prologue/fight',{});if(result.combat_url||result.arena_url){window.__valdoria_transitioning=true;valdoriaSpaNav(result.combat_url||result.arena_url);}else{showError('Erro ao iniciar combate.');}}catch(e){showError('Erro ao iniciar combate.',e);}}
function onAftermathDone(){nextScreen(renderGate());}
async function onEnterCity(){try{if(window._prologueInitLoading){window._prologueInitLoading.show();}else{var _ld2=document.getElementById('loading');if(_ld2){_ld2.style.display='flex';_ld2.classList.remove('hidden');}}const body={gate_choice:choices.gate_choice||'',interaction_type:choices.interaction_type||'gate',aftermath_only:MODE==='aftermath',};if(choices.distract){body.distract=choices.distract;}
const result=await apiCall('/api/prologue/complete',body);if(result&&result.game_url){window.__valdoria_transitioning=true;valdoriaSpaNav(result.game_url);}else{if(window.Telegram&&Telegram.WebApp){valdoriaSpaClose();}}}catch(e){showError('Erro ao entrar na cidade.',e);}}
async function boot(){if(!TOKEN||!API_BASE||!USER_ID){showError('Parâmetros inválidos. Feche e tente novamente.');return;}
try{DATA=await apiCall('/api/prologue/init');if(window._prologueInitLoading){window._prologueInitLoading.hide();}else{var _ld3=document.getElementById('loading');if(_ld3){_ld3.classList.add('hidden');_ld3.style.display='none';}}if(typeof ValdoriaAudio!=='undefined')ValdoriaAudio.play('prologue');if(DATA.mode==='aftermath'){addScreen(renderAftermath());goToScreen(0);return;}
if(DATA.show_preface){addScreen(renderPreface());}else{addScreen(renderIntro());}
goToScreen(0);}catch(e){showError('Erro ao carregar prólogo. Feche e tente novamente.',e);}}
boot();