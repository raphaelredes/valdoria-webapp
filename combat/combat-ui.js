function _seKey(s){return typeof s==='object'?s.k:s;}
function _seIcon(s){return typeof s==='object'?s.i:(STATUS_ICONS[s]||'');}
function _seName(s){return typeof s==='object'?s.n:(STATUS_PT[s]||s);}
function _seIsBuff(s){return typeof s==='object'?(s.cat==='buff'):STATUS_BUFFS.has(s);}
function _seDcLabel(s){if(typeof s!=='object'||!s.dc||!s.sa)return '';var saShort={'strength':'FOR','dexterity':'DES','constitution':'CON','intelligence':'INT','wisdom':'SAB','charisma':'CAR'};return ' CD'+s.dc+(saShort[s.sa]||'');}
function _seDur(s){if(typeof s==='object'&&s.dur&&s.dur>0)return ' <span class="se-dur">'+s.dur+'r</span>';return '';}
function announce(msg){var el=document.getElementById('combatAnnouncer');if(el){el.textContent='';setTimeout(function(){el.textContent=msg;},50);}}
/* Stubs for removed functions — now in combat-grid.js / combat-actions-popup.js.
 * combat.js still calls these by name; stubs prevent ReferenceError. */
function bindExpandCollapse(){if(typeof _bindGridCollapse==='function')_bindGridCollapse();}
function bindFeedToggle(){if(typeof _bindGridFeedToggle==='function')_bindGridFeedToggle();}
function bindFeedDetail(){if(typeof _bindGridFeedDetail==='function')_bindGridFeedDetail();}
function renderActionBar(acts,enemies,player,toast){return typeof renderActionsButton==='function'?renderActionsButton():'<div class="action-bar"><div class="action-loading">Carregando...</div></div>';}
/** Foca o primeiro botão útil da sub-fase (teclado / leitores de tela). */
function focusFirstSubphaseButton(subPh){
    requestAnimationFrame(function(){
        var bar=document.querySelector(subPh==='reaction'?'.reaction-bar':'.bonus-action-bar');
        if(!bar)return;
        var btn=bar.querySelector(subPh==='reaction'?'.reaction-skill-btn':'.bonus-skill-btn');
        if(!btn)btn=bar.querySelector('.action-btn');
        if(btn&&typeof btn.focus==='function'){try{btn.focus({preventScroll:true});}catch(e){try{btn.focus();}catch(e2){}}}
    });
}
/** Fase de ação bônus (D&D 5e) — só habilidades bônus + pular. Nunca reutilizar o grid principal. */
function renderBonusActionBar(acts,enemies,player,toast){
    var skills=(acts&&acts.skills)?acts.skills:[];
    var html='<div class="action-bar subphase-bar bonus-action-bar" role="region" aria-label="Ação bônus">';
    html+='<div class="ba-header"><span class="ba-badge" aria-hidden="true">⚡</span><span class="ba-title">Ação bônus</span></div>';
    html+='<p class="ba-rule-hint" title="D&D 5e: no máximo uma ação bônus por turno, só se uma habilidade ou efeito permitir.">No máximo uma ação bônus por turno, se uma habilidade ou efeito permitir.</p>';
    html+='<p class="ba-hint">Escolha uma habilidade ou pule para seguir o combate (resolver inimigos e o restante do turno).</p>';
    if(toast)html+=toast;
    skills.forEach(function(sk){
        var sid=String(sk.id||'').replace(/["'<>]/g,'');
        if(!sid)return;
        var ch=(typeof sk.ch==='number')?sk.ch:0;
        var chCls=ch>=65?'ch-high':(ch>=40?'ch-mid':'ch-low');
        var tg=String(sk.tg||'single').replace(/["'<>]/g,'');
        html+='<button type="button" class="action-btn bonus-skill-btn" data-action="bonus_use_single" data-skill-id="'+sid+'" data-tg="'+tg+'">';
        html+='<span class="ba-skill-name">'+escHtml(sk.n||'')+'</span>';
        html+='<span class="ba-skill-meta">Custo '+escHtml(String(sk.c!=null?sk.c:0))+' · <span class="'+chCls+'">'+ch+'%</span></span>';
        html+='</button>';
    });
    html+='<button type="button" class="action-btn primary full-width ba-skip" data-action="bonus_skip">⏭️ Pular ação bônus</button>';
    html+='</div>';
    return html;
}
/** Fase de reação — opções do servidor + não reagir. promptMs: tempo de UI para decidir (produto; não é regra de mesa). */
function renderReactionBar(acts,player,toast,promptMs){
    var skills=(acts&&acts.skills)?acts.skills:[];
    var dmg=(acts&&acts.damage_taken!=null)?acts.damage_taken:'';
    var sec=typeof promptMs==='number'&&promptMs>0?Math.max(1,Math.ceil(promptMs/1000)):10;
    var html='<div class="action-bar subphase-bar reaction-bar" role="region" aria-label="Reação">';
    html+='<div class="reaction-header"><span class="ba-badge" aria-hidden="true">⚡</span><span class="ba-title">Reação disponível</span></div>';
    html+='<p class="ba-rule-hint" title="D&D 5e SRD: no máximo uma reação por rodada, até o início do seu próximo turno.">No máximo uma reação até o início do seu próximo turno.</p>';
    if(dmg!=='')html+='<p class="ba-dmg-note">Dano recebido: <b>'+escHtml(String(dmg))+'</b></p>';
    html+='<p class="ba-hint reaction-prompt-hint"><span class="reaction-ctx">'+(dmg!==''?'Escolha uma reação ou ignore.':'Uma reação está disponível.')+'</span> <span class="reaction-timer">('+sec+'s)</span></p>';
    if(toast)html+=toast;
    skills.forEach(function(sk){
        var sid=String(sk.id||'').replace(/["'<>]/g,'');
        if(!sid)return;
        var ico=sk.ico||'⚡';
        html+='<button type="button" class="action-btn reaction-skill-btn" data-action="reaction_use" data-skill-id="'+sid+'">';
        html+='<span class="ba-ico" aria-hidden="true">'+escHtml(ico)+'</span> <span class="ba-skill-name">'+escHtml(sk.n||'Reação')+'</span>';
        html+='<span class="ba-skill-meta"> ('+escHtml(String(sk.c!=null?sk.c:0))+')</span>';
        html+='</button>';
    });
    html+='<button type="button" class="action-btn secondary full-width" data-action="reaction_skip">Não reagir</button>';
    html+='</div>';
    return html;
}
var _actionsDelegated=false;var _actionsState=null;function bindActions(state){_actionsState=state;if(_actionsDelegated)return;_actionsDelegated=true;document.body.addEventListener('click',(ev)=>{const btn=ev.target.closest('.action-btn');if(!btn)return;const state=_actionsState;if(!state)return;if(_actionSent||_cinematicInProgress){return;}
{var sp=state.sub_phase||'';var act=btn.dataset.action||'';if((sp==='bonus_action'||sp==='reaction')&&['attack','skill','items','item','flee','dodge','disengage','pass','initiative','proceed','restore'].indexOf(act)>=0){var _subToast=sp==='reaction'?'Encerre a reação antes de usar outras ações.':'Encerre a ação bônus antes de usar outras ações.';vToast(_subToast,'warn');return;}}
(()=>{vHaptic.select();if(!_audioUnlocked){if(_audioCtx&&_audioCtx.state==='suspended'){_audioCtx.resume().then(()=>{_audioUnlocked=true;}).catch(e=>{if(window._dbg)console.debug('[COMBAT] audioCtx.resume:',e.name);});}else if(_audioCtx&&_audioCtx.state==='running'){_audioUnlocked=true;}}if(typeof ValdoriaAudio!=='undefined'&&!ValdoriaAudio.isUnlocked()){ValdoriaAudio.forceUnlock();}
const action=btn.dataset.action;console.info('[COMBAT:CLICK] action=%s disabled=%s',action,btn.classList.contains('disabled'));if(btn.classList.contains('disabled')){btn.classList.add('disabled-shake');setTimeout(()=>btn.classList.remove('disabled-shake'),ValdoriaMotion.duration(400,0));if(action==='skill')vToast('Sem recurso suficiente para habilidades','warn');else if(action==='items')vToast('Nenhum item utilizável em combate','warn');return;}
const enemies=state.e||[];const skills=state.acts?.skills||[];if(action==='attack'){if(enemies.length>1){showTargetPicker(enemies,'attack');}else{sendAction({type:'attack',target:0});}}else if(action==='skill'){if(skills.length===1){if(enemies.length>1){showTargetPicker(enemies,'skill',skills[0].id);}else{sendAction({type:'skill',skill_id:skills[0].id,target:0});}}else if(skills.length>1){showSkillPicker(skills,enemies,'skill');}}else if(action==='flee'){sendAction({type:'flee'});}else if(action==='dodge'){sendAction({type:'dodge'});}else if(action==='disengage'){sendAction({type:'disengage'});}else if(action==='pass'){sendAction({type:'pass'});}else if(action==='items'){const items=state.acts?.item_list||[];if(items.length>0){showItemPicker(items,enemies,state.a||[]);}}else if(action==='initiative'){sendAction({type:'initiative'});}else if(action==='proceed'){sendAction({type:'proceed'});}else if(action==='restore'){sendAction({type:'restore'});}
else if(action==='bonus_skip'){sendAction({type:'bonus_skip'});}else if(action==='bonus_use_single'){const skillId=btn.dataset.skillId;if(!skillId){vToast('Selecione uma habilidade válida.','warn');return;}const tg=btn.dataset.tg||'single';if(tg==='all'||tg==='self'){sendAction({type:'bonus_use',skill_id:skillId,target:0});}else if(enemies.length>1){showTargetPicker(enemies,'bonus_use',skillId);}else{sendAction({type:'bonus_use',skill_id:skillId,target:0});}}else if(action==='bonus_skill_pick'){showSkillPicker(skills,enemies,'bonus_use');}
else if(action==='reaction_skip'){sendAction({type:'reaction_skip'});}else if(action==='reaction_use'){const skillId=btn.dataset.skillId;if(!skillId){vToast('Nenhuma reação selecionável.','warn');return;}sendAction({type:'reaction_use',skill_id:skillId});}
else if(action==='continue_spectator'){sendAction({type:'continue_spectator'});}})();});}
function _showActionLoading(show){let el=document.getElementById('actionLoading');if(show){if(!el){el=document.createElement('div');el.id='actionLoading';el.className='action-loading';el.innerHTML='<div class="loading-d20-icon"></div><span>Resolvendo<span class="loading-dots"></span></span>';const bar=document.querySelector('.action-bar');if(bar)bar.prepend(el);}
el.style.display='flex';}else if(el){el.remove();}}
var _actionSent=false;var _actionSentTimer=null;async function sendAction(actionData){console.info('[COMBAT:ACTION] sendAction type=%s target=%s skill=%s item=%s',actionData.type,actionData.target,actionData.skill_id||'-',actionData.item_key||'-');if(_actionSent||_cinematicInProgress){console.warn('[COMBAT:ACTION] BLOCKED actionSent=%s cinematic=%s',_actionSent,_cinematicInProgress);return;}if(typeof _clearReactionAutoTimers==='function')_clearReactionAutoTimers();vHaptic.medium();_actionSent=true;clearTimeout(_actionSentTimer);_actionSentTimer=setTimeout(()=>{if(_actionSent){console.warn('[COMBAT] Action safety timeout — force reset');_actionSent=false;_timerExpiredPending=false;_showActionLoading(false);document.querySelectorAll('#app .action-btn').forEach(b=>b.classList.remove('disabled'));startPolling();}},30000)/* produto: safety se a API não responder; não é o timer de turno do servidor */;_lastAnimatedRoll=null;_initDiceAnimated=false;document.querySelectorAll('#app .action-btn').forEach(b=>b.classList.add('disabled'));_showActionLoading(true);stopTimer();stopPolling();if(isApiMode&&api){try{const result=await api.sendAction(actionData);clearTimeout(_actionSentTimer);_showActionLoading(false);_actionSent=false;if(!result){showError('Sem resposta do servidor. Verifique sua conex\u00e3o.');return;}
console.info('[COMBAT:API] response phase=%s hasLR=%s hasPLR=%s hasFeed=%s',result.phase,!!result.lr,!!result.plr,!!(result.feed&&result.feed.length));_playCinematicResult(result,actionData.type);}catch(e){clearTimeout(_actionSentTimer);_showActionLoading(false);_actionSent=false;console.error('[COMBAT:API] sendAction FAILED status=%s msg=%s',e.status||'?',e.message||e);const msg=(e.status===401||e.status===403)?'Sessão expirada.':e.status===429?'Muitas ações. Aguarde um momento.':'Erro de conexão. Tente novamente.';showError(msg);if(e.status===429){setTimeout(()=>{document.querySelectorAll('#app .action-btn').forEach(b=>b.classList.remove('disabled'));startPolling();},5000);}else{document.querySelectorAll('#app .action-btn').forEach(b=>b.classList.remove('disabled'));if(e.status!==401&&e.status!==403){startPolling();}}}}else{if(!tg){console.warn('[COMBAT] No Telegram WebApp',actionData);_actionSent=false;return;}
const payload={action:'combat_action',token:token,...actionData,};window.__valdoria_transitioning=true;tg.sendData(JSON.stringify(payload)); /* pflt-suppress: fetch via api.sendAction() above */setTimeout(()=>{try{tg.close();}catch(e){console.warn('[COMBAT] tg.close() failed',e);}},1000);}}
function showSkillPicker(skills,enemies,actionType){if(!skills||skills.length===0)return;actionType=actionType||'skill';const panel=document.getElementById('skillPanel');const overlay=document.getElementById('skillOverlay');const title=actionType==='bonus_use'?'⚡ Ação bônus':'Habilidades';let html=`<div class="skill-panel-title">${title}</div>`;skills.forEach(sk=>{const _sid=String(sk.id!=null?sk.id:'').replace(/["'<>]/g,'');if(!_sid)return;const _tg=String(sk.tg||'single').replace(/["'<>]/g,'');const _ch=(typeof sk.ch==='number'&&!isNaN(sk.ch))?sk.ch:0;const _cost=sk.c!=null?sk.c:0;const typeBadge=sk.tp==='saving_throw'?' · <span class="sk-type sk-type-st">ST</span>':sk.tp==='auto'?' · <span class="sk-type sk-type-auto">Auto</span>':sk.tp==='heal'?' · <span class="sk-type sk-type-heal">Cura</span>':'';const tgtBadge=sk.tg==='all'?' · <span class="sk-aoe">AOE</span>':sk.tg==='self'?' · <span class="sk-aoe">Próprio</span>':'';const effLine=sk.eff?`<div class="skill-effect">${escHtml(sk.eff)}</div>`:'';const skCls=sk.tp==='heal'?'sk-heal':sk.tp==='saving_throw'?'sk-save':sk.tp==='auto'?'sk-buff':'sk-damage';html+=`<div class="skill-item ${skCls}" data-skill-id="${_sid}" data-tg="${_tg}">
            <div>
                <div class="skill-name">${escHtml(sk.n)}</div>
                ${effLine}
                <div class="skill-meta">Custo: ${_cost} · <span class="action-chance ${_ch>=65?'ch-high':_ch>=40?'ch-mid':'ch-low'}">${_ch}%</span>${typeBadge}${tgtBadge}</div>
            </div>
        </div>`;});html+='<div class="skill-close" id="skillClose">Cancelar</div>';panel.innerHTML=html;panel.style.animation='none';panel.offsetHeight;panel.style.animation='';overlay.classList.add('active');const _firstItem=panel.querySelector('.skill-item');if(_firstItem)_firstItem.focus();overlay.onkeydown=(e)=>{if(e.key==='Escape')_closeOverlay(overlay);};panel.onclick=(e)=>{const item=e.target.closest('.skill-item');if(e.target.closest('#skillClose')){_closeOverlay(overlay);return;}
if(!item||_actionSent)return;vHaptic.tap();const skillId=item.dataset.skillId;const tg=item.dataset.tg||'single';overlay.classList.remove('active');if(tg==='all'||tg==='self'){sendAction({type:actionType,skill_id:skillId,target:0});}else if(enemies.length>1){showTargetPicker(enemies,actionType,skillId);}else{sendAction({type:actionType,skill_id:skillId,target:0});}};overlay.onclick=(e)=>{if(e.target===overlay)_closeOverlay(overlay);};}
var _COMBAT_OVERLAY_IDS=['skillOverlay','targetOverlay','itemOverlay','initiativeOrderOverlay'];function isOverlayOpen(){for(var i=0;i<_COMBAT_OVERLAY_IDS.length;i++){var el=document.getElementById(_COMBAT_OVERLAY_IDS[i]);if(el&&el.classList.contains('active'))return true;}return false;}function _closeOverlay(overlay){overlay.classList.remove('active');if(_pendingPollState&&!_cinematicInProgress&&!_diceAnimating&&!_actionSent){var _ps=_pendingPollState;_pendingPollState=null;var _newPh=_ps.ph||_ps.phase||'';currentState=_ps;if(_newPh==='victory'||_newPh==='defeat'||_newPh==='ended'){renderResolution(_ps);}else{renderArena(_ps);}}}
function showTargetPicker(enemies,actionType,skillId){const panel=document.getElementById('targetPanel');const overlay=document.getElementById('targetOverlay');let html='<div class="skill-panel-title">Escolher Alvo</div>';enemies.forEach((e,i)=>{const pct=e.mhp>0?Math.round((e.hp/e.mhp)*100):0;let previewHtml='';const acts=currentState&&currentState.acts;if(acts){let chText='',dmgText='';if(actionType==='attack'){chText=`${acts.hit || '?'}%`;dmgText=currentState.p?currentState.p.dmg:'';}else if((actionType==='skill'||actionType==='bonus_use')&&skillId&&acts.skills){const sk=acts.skills.find(s=>String(s.id)===String(skillId));if(sk){const _pch=(typeof sk.ch==='number'&&!isNaN(sk.ch))?sk.ch:0;chText=`${_pch}%`;dmgText=sk.eff||'';}}
if(chText){const chVal=parseInt(chText, 10);let chCls;if(isNaN(chVal)){chCls='prev-mid';}else if(chVal>=65){chCls='prev-hit';}else if(chVal>=40){chCls='prev-mid';}else{chCls='prev-miss';};const chLabel=isNaN(chVal)?'❓ Incerto':chVal>=65?'\u{1F3AF} Prov\u00e1vel':chVal>=40?'\u26A0\uFE0F Arriscado':'\u274C Dif\u00edcil';const barCls=chVal>=65?'bar-high':chVal>=40?'bar-mid':'bar-low';previewHtml=`<div class="target-preview"><span class="${chCls}">${chLabel} \u00b7 ${chText}</span>${dmgText ? `\u00b7 ${escHtml(dmgText)}` : ''}<div class="target-chance-bar ${barCls}"><div class="target-chance-fill" style="width:${chVal}%"></div></div></div>`;}}
const hpColor=pct>60?'var(--v-hp-high, #5a8a3c)':pct>25?'var(--v-hp-mid, #b88a2a)':'var(--v-hp-low, #a63a2a)';html+=`<div class="target-item" data-target="${i}">
            <div><span>${e.ico || '👹'}</span> <b>${escHtml(e.n)}</b>${previewHtml}</div>
            <div class="skill-meta">${e.hp}/${e.mhp} HP (${pct}%)</div>
            <div class="target-hp-bar"><div class="target-hp-fill" style="transform:scaleX(${pct/100});background:${hpColor}"></div></div>
        </div>`;});html+='<div class="skill-close" id="targetClose">Cancelar</div>';panel.innerHTML=html;panel.style.animation='none';panel.offsetHeight;panel.style.animation='';overlay.classList.add('active');const _firstTarget=panel.querySelector('.target-item');if(_firstTarget)_firstTarget.focus();overlay.onkeydown=(e)=>{if(e.key==='Escape')_closeOverlay(overlay);};panel.onclick=(e)=>{const item=e.target.closest('.target-item');if(e.target.closest('#targetClose')){_closeOverlay(overlay);return;}
if(!item||_actionSent)return;vHaptic.medium();const target=parseInt(item.dataset.target, 10);overlay.classList.remove('active');if(actionType==='skill'||actionType==='bonus_use'){sendAction({type:actionType,skill_id:skillId,target:target});}else{sendAction({type:'attack',target:target});}};overlay.onclick=(e)=>{if(e.target===overlay)_closeOverlay(overlay);};}
function showItemPicker(items,enemies,allies){const panel=document.getElementById('itemPanel');const overlay=document.getElementById('itemOverlay');let html='<div class="skill-panel-title">🎒 Itens de Combate</div>';items.forEach(it=>{const isThrown=!!it.tdmg;const effText=isThrown?`${it.tdmg} ${it.ttype || ''}`:(it.heal?`Cura ${it.heal}`:'');const typeBadge=isThrown?'<span class="sk-aoe">Arremesso</span>':'<span class="sk-type sk-type-heal">Cura</span>';const itemCls=isThrown?'item-thrown':'item-heal';html+=`<div class="skill-item item-entry ${itemCls}" data-item="${escHtml(it.n)}" data-thrown="${isThrown}">
            <div>
                <div class="skill-name">${it.ico} ${escHtml(it.n)} <span class="action-chance">x${it.q}</span></div>
                <div class="skill-meta">${effText} · ${typeBadge}</div>
            </div>
        </div>`;});if(isApiMode){html+='<div class="skill-item" id="itemFullInventory" style="text-align:center;color:var(--v-gold);font-size:12px;padding:10px;cursor:pointer;opacity:0.8">📦 Ver Mochila Completa</div>';}
html+='<div class="skill-close" id="itemClose">Cancelar</div>';panel.innerHTML=html;panel.style.animation='none';panel.offsetHeight;panel.style.animation='';overlay.classList.add('active');const _firstEntry=panel.querySelector('.item-entry');if(_firstEntry)_firstEntry.focus();overlay.onkeydown=(e)=>{if(e.key==='Escape')_closeOverlay(overlay);};panel.onclick=(e)=>{const item=e.target.closest('.item-entry');if(e.target.closest('#itemClose')){_closeOverlay(overlay);return;}
if(e.target.closest('#itemFullInventory')){_closeOverlay(overlay);transitionToInventoryFromArena();return;}
if(!item||_actionSent)return;vHaptic.medium();const itemName=item.dataset.item;const isThrown=item.dataset.thrown==='true';overlay.classList.remove('active');if(isThrown){sendAction({type:'use_item',item_key:itemName,item_target:-2});}else{sendAction({type:'use_item',item_key:itemName,item_target:-1});}};overlay.onclick=(e)=>{if(e.target===overlay)_closeOverlay(overlay);};}