function _seKey(s){return typeof s==='object'?s.k:s;}
function _seIcon(s){return typeof s==='object'?s.i:(STATUS_ICONS[s]||'');}
function _seName(s){return typeof s==='object'?s.n:(STATUS_PT[s]||s);}
function _seIsBuff(s){return typeof s==='object'?(s.cat==='buff'):STATUS_BUFFS.has(s);}
function _seDcLabel(s){if(typeof s!=='object'||!s.dc||!s.sa)return '';var saShort={'strength':'FOR','dexterity':'DES','constitution':'CON','intelligence':'INT','wisdom':'SAB','charisma':'CAR'};return ' CD'+s.dc+(saShort[s.sa]||'');}
function announce(msg){var el=document.getElementById('combatAnnouncer');if(el){el.textContent='';setTimeout(function(){el.textContent=msg;},50);}}
function renderEntity(e,type,idx,isActiveTurn){const pct=e.mhp>0?(e.hp/e.mhp):0;const hpClass=pct>0.60?'hp-high':pct>0.25?'hp-mid':'hp-low';let statusIcons='';if(e.se&&e.se.length>0){if(e.se.length>3){statusIcons=e.se.slice(0,3).map(s=>_seIcon(s)).join('')+`<span class="status-overflow">+${e.se.length - 3}</span>`;}else{statusIcons=e.se.map(s=>_seIcon(s)).join('');}}
let detailsHtml='';if(type==='enemy'){const atkLabel=ATK_TYPE_LABELS[e.at]||e.at||'';const dmgIcon=DMG_ICONS[e.dt]||'';detailsHtml+=`<div class="bar-container">
            <div class="bar-label"><span>❤️ HP</span><span>${e.hp}/${e.mhp}</span></div>
            <div class="bar-track"><div class="bar-fill ${hpClass}" style="transform:scaleX(${pct})"></div></div>
        </div>`;detailsHtml+=`<div class="stats-row">
            <span class="stat-item">🛡️ CA ${e.ac}</span>
            <span class="stat-item">⚔️ +${e.atk}</span>
            <span class="stat-item">${dmgIcon} ${e.dmg}</span>
            <span class="entity-badge-sm">${atkLabel}</span>
        </div>`;if(e.leg){detailsHtml+='<div class="legendary-row">';detailsHtml+='<span>👑 Boss</span>';if(e.leg.lrm>0)detailsHtml+=`<span title="Anula falha em salvaguarda">⭐ Resist. Lend. ${e.leg.lr}/${e.leg.lrm}</span>`;if(e.leg.lam>0)detailsHtml+=`<span>⚡ Ações ${e.leg.la}/${e.leg.lam}</span>`;detailsHtml+='</div>';}
if(e.se&&e.se.length>0){detailsHtml+='<div class="status-pills">'+e.se.map(s=>`<span class="status-pill${_seIsBuff(s) ? ' buff status-buff' : ' status-debuff'}">${_seIcon(s)} ${_seName(s)}${_seDcLabel(s)}</span>`).join('')+'</div>';}
if(e.img&&typeof showImagePopup==='function'){detailsHtml+='<button class="entity-view-btn" data-img="'+escHtml(e.img)+'" data-name="'+escHtml(e.n)+'" data-desc="'+escHtml(e.desc||'')+'" data-ac="'+(e.ac||'')+'" data-atk="'+(e.atk||'')+'" data-dmg="'+escHtml(e.dmg||'')+'">🔍 Ver Criatura</button>';}}else{detailsHtml+=`<div class="bar-container">
            <div class="bar-label"><span>❤️ HP</span><span>${e.hp}/${e.mhp}</span></div>
            <div class="bar-track"><div class="bar-fill ${hpClass}" style="transform:scaleX(${pct})"></div></div>
        </div>`;if(e.mmp>0){const mpPct=e.mmp>0?(e.mp/e.mmp):0;detailsHtml+=`<div class="bar-container">
                <div class="bar-label"><span>💧 MP</span><span>${e.mp}/${e.mmp}</span></div>
                <div class="bar-track"><div class="bar-fill mp-bar" style="transform:scaleX(${mpPct})"></div></div>
            </div>`;}
const allyStats=[];if(e.ac)allyStats.push(`🛡️ CA ${e.ac}`);if(e.atk)allyStats.push(`⚔️ +${e.atk}`);if(e.dmg)allyStats.push(`🗡️ ${e.dmg}`);if(e.pot>0)allyStats.push(`🧪 ${e.pot}`);if(allyStats.length>0){detailsHtml+='<div class="stats-row">'+allyStats.map(s=>`<span class="stat-item">${s}</span>`).join('')+'</div>';}
if(e.conc){detailsHtml+=`<div class="stats-row"><span class="stat-item conc-badge">🔮 Conc.: ${escHtml(e.conc)}</span></div>`;}
if(e.se&&e.se.length>0){detailsHtml+='<div class="status-pills">'+e.se.map(s=>`<span class="status-pill${_seIsBuff(s) ? ' buff status-buff' : ' status-debuff'}">${_seIcon(s)} ${_seName(s)}${_seDcLabel(s)}</span>`).join('')+'</div>';}}
const isDead=e.hp<=0;const activeClass=isActiveTurn?' active-turn':'';const deadClass=isDead?' dead':'';const hpStateClass=pct>0.60?'':pct>0.25?' hp-wounded':' hp-critical' /* noqa: preflight */;const dataAttr=type==='enemy'?` data-enemy-idx="${idx}"`:'';let posBadge='';if(type==='enemy'&&_currentPositions){const pPos=_currentPositions['player'];const ePos=_currentPositions[`enemy_${idx}`];if(pPos&&ePos){const dx=(pPos.x||0)-(ePos.x||0),dy=(pPos.y||0)-(ePos.y||0);const near=Math.sqrt(dx*dx+dy*dy)<=1.5;posBadge=`<span class="pos-badge ${near ? 'near' : 'far'}">${near ? '⚔ Perto' : '🏹 Longe'}</span>`;}}
let intentBadge='';if(type==='enemy'&&e.it){const it=e.it;const intentCls=it.tp==='stun'||it.tp==='skip'?'intent-stun':it.tp==='skill'?'intent-skill':'intent-atk';const dmgLabel=it.dmg?' '+it.dmg:'';intentBadge='<span class="intent-badge '+intentCls+'">'+(it.ic||'')+dmgLabel+'</span>';}
const acBadge=type==='enemy'&&e.ac?`<span class="ac-badge">🛡${e.ac}</span>`:'';return`<div class="entity ${type}${activeClass}${deadClass}${hpStateClass}" role="group" aria-label="${escHtml(e.n)}"${dataAttr}>
        <div class="entity-header">
            <span class="entity-icon${e.img ? ' entity-thumb' : ''}">${e.img ? '<img src="' + escHtml(e.img) + '" loading="lazy" onerror="this.parentNode.textContent=this.dataset.fb" data-fb="' + (e.ico || (type === 'enemy' ? '👹' : '🛡️')) + '">' : (e.ico || (type === 'enemy' ? '👹' : '🛡️'))}</span>
            <span class="compact-name">${escHtml(e.n)}</span>
            ${acBadge}
            <div class="hp-mini"><div class="hp-mini-fill ${hpClass}" style="transform:scaleX(${pct})"></div></div>
            <span class="hp-text-compact">${e.hp}/${e.mhp}</span>
            ${statusIcons ? `<span class="status-icons-compact">${statusIcons}</span>` : ''}
            ${posBadge}
            ${intentBadge}
            <span class="expand-arrow">▸</span>
        </div>
        <div class="entity-details">${detailsHtml}</div>
    </div>`;}
function renderPlayerCard(p,isCompact=false){const hpPct=p.mhp>0?(p.hp/p.mhp):0;const hpClass=hpPct>0.60?'hp-high':hpPct>0.25?'hp-mid':'hp-low';const mpPct=p.mmp>0?(p.mp/p.mmp):0;const resClass=RES_CLASS_MAP[p.res]||'mp';const resIcon=RES_ICON_MAP[p.res]||'💧';const resLowCls=mpPct<=0.10&&mpPct>0?' res-critical':mpPct<=0.25&&mpPct>0?' res-low':'';const badges=[];if(p.se&&p.se.length>0){p.se.forEach(s=>badges.push(`<span class="mini-badge status${_seIsBuff(s) ? ' buff status-buff' : ' status-debuff'}">${_seIcon(s)} ${_seName(s)}${_seDcLabel(s)}</span>`));}
if(p.cov){badges.push(`<span class="mini-badge cover">${p.cov.ico} +${p.cov.ac} CA</span>`);}
if(p.conc){badges.push(`<span class="mini-badge conc">🔮 ${escHtml(p.conc)}</span>`);}
const badgesHtml=badges.length>0?`<div class="player-badge-row">${badges.join('')}</div>`:'';const concClass=p.conc?' concentrating':'';const dangerClass=hpPct<=0.25&&hpPct>0?' hp-danger':'';return`<div class="entity player${concClass}${dangerClass}">
        <div class="entity-header">
            <span class="entity-icon">${p.ico || '👤'}</span>
            <span class="compact-name">${escHtml(p.n)}</span>
            <span class="player-header-stats">🛡${p.ac} ⚔+${p.atk} 🗡${p.dmg}</span>
        </div>
        <div class="player-bars" style="${isCompact ? 'display:none;' : ''}">
            <div class="bar-row">
                <span class="bar-icon">❤️</span>
                <div class="bar-track"><div class="bar-fill ${hpClass}" style="width:${hpPct * 100}%"></div></div>
                <span class="bar-val">${p.hp}/${p.mhp}</span>
            </div>
            <div class="bar-row">
                <span class="bar-icon">${resIcon}</span>
                <div class="bar-track"><div class="bar-fill ${resClass}${resLowCls}" style="transform:scaleX(${mpPct})"></div></div>
                <span class="bar-val">${p.mp}/${p.mmp}</span>
            </div>
            ${badgesHtml}
        </div>
    </div>`;}
function renderActionBar(acts,enemies,player,toastHtml){if(!acts)return'';const hitChance=acts.hit||50;const fleeChance=acts.flee||50;const hasSkills=acts.skills&&acts.skills.length>0;const itemCount=acts.items||0;const hitCh=hitChance>=65?'ch-high':hitChance>=40?'ch-mid':'ch-low';const fleeCh=fleeChance>=65?'ch-high':fleeChance>=40?'ch-mid':'ch-low';let skillBtnText='🧠 Habilidade';if(hasSkills&&acts.skills.length===1){const sk=acts.skills[0];const skCh=sk.ch>=65?'ch-high':sk.ch>=40?'ch-mid':'ch-low';skillBtnText=`🧠 ${sk.n} <span class="action-chance ${skCh}">${sk.ch}%</span>`;}else if(!hasSkills){skillBtnText=`🚫 Sem ${player.res || 'Mana'}`;}
return`<div class="action-bar">${toastHtml || ''}<div class="action-grid">
        <button class="action-btn primary" data-action="attack">⚔️ Atacar <span class="action-chance ${hitCh}">${hitChance}%</span></button>
        <button class="action-btn ${hasSkills ? '' : 'disabled'}" data-action="skill">${skillBtnText}</button>
        <button class="action-btn ${itemCount > 0 ? '' : 'disabled'}" data-action="items">🎒 Itens <span class="action-chance">(${itemCount})</span></button>
        <button class="action-btn danger" data-action="flee">🏃 Fugir <span class="action-chance ${fleeCh}">${fleeChance}%</span></button>
        </div><div class="action-grid action-grid-tactical">
        <button class="action-btn tactical-btn" data-action="dodge">🛡️ Esquivar</button>
        <button class="action-btn tactical-btn" data-action="disengage">💨 Desengajar</button>
        <button class="action-btn pass-btn" data-action="pass">⏭️ Pular</button>
    </div></div>`;}
function renderBonusActionBar(acts,enemies,player,toastHtml){if(!acts)return'';const hasSkills=acts.skills&&acts.skills.length>0;const resName=player.res||'Mana';let skillsHtml='';if(hasSkills){if(acts.skills.length===1){const sk=acts.skills[0];skillsHtml=`<button class="action-btn ba-btn" data-action="bonus_use_single" data-skill-id="${sk.id}" data-tg="${sk.tg || 'single'}">⚡ ${escHtml(sk.n)} <span class="action-chance">${sk.c} ${resName} · ${sk.ch}%</span></button>`;}else{skillsHtml=`<button class="action-btn ba-btn" data-action="bonus_skill_pick">⚡ Habilidade Bonus <span class="action-chance">(${acts.skills.length})</span></button>`;}}
return`<div class="action-bar">${toastHtml || ''}<div class="ba-header">
        <div class="ba-label">⚡ AÇÃO BÔNUS</div>
        <div class="ba-hint">Use uma habilidade bônus ou pule.</div>
    </div><div class="action-grid">
        ${skillsHtml}
        <button class="action-btn" data-action="bonus_skip">⏭️ Pular</button>
    </div></div>`;}
function renderReactionBar(acts,player,toastHtml){if(!acts)return'';const hasSkills=acts.skills&&acts.skills.length>0;const dmg=acts.damage_taken||0;const resName=player.res||'Mana';let skillsHtml='';if(hasSkills){acts.skills.forEach(sk=>{const ico=sk.ico||'⚡';const effText=sk.eff?` · ${escHtml(sk.eff)}`:'';skillsHtml+=`<button class="action-btn reaction-btn" data-action="reaction_use" data-skill-id="${sk.id}">${ico} ${escHtml(sk.n)} <span class="action-chance">${sk.c} ${resName}${effText}</span></button>`;});}
return`<div class="action-bar">${toastHtml || ''}<div class="ba-header reaction-header">
        <div class="ba-label">⚡ REAÇÃO</div>
        <div class="ba-hint">Você recebeu ${dmg} de dano. Reagir?</div>
    </div><div class="action-grid">
        ${skillsHtml}
        <button class="action-btn" data-action="reaction_skip">⏭️ Não reagir</button>
    </div></div>`;}
var _expandDelegated=false;function bindExpandCollapse(){if(_expandDelegated)return;_expandDelegated=true;document.body.addEventListener('click',(ev)=>{const viewBtn=ev.target.closest('.entity-view-btn');if(viewBtn&&typeof showImagePopup==='function'){ev.stopPropagation();showImagePopup({src:viewBtn.dataset.img,title:viewBtn.dataset.name||'',desc:viewBtn.dataset.desc||'',stats:[{icon:'\u{1F6E1}\uFE0F',label:'CA',value:viewBtn.dataset.ac||''},{icon:'\u2694\uFE0F',label:'ATK',value:'+'+(viewBtn.dataset.atk||'')},{icon:'\u{1F5E1}\uFE0F',label:'Dano',value:viewBtn.dataset.dmg||''}],type:'enemy'});return;}
const entity=ev.target.closest('.entity:not(.player)');if(!entity||ev.target.closest('.action-btn')||ev.target.closest('.skill-item')||ev.target.closest('.target-item')||ev.target.closest('.item-entry')||ev.target.closest('.entity-view-btn'))return;const wasExpanded=entity.classList.contains('expanded');document.querySelectorAll('.entity.expanded').forEach(e=>e.classList.remove('expanded'));if(!wasExpanded)entity.classList.add('expanded');});}
function bindFeedToggle(){const toggle=document.getElementById('feedToggle');if(!toggle)return;toggle.addEventListener('click',()=>{const feed=document.getElementById('combatFeed');if(!feed)return;const expanded=feed.classList.toggle('feed-expanded');toggle.textContent=expanded?'▼ Recolher':toggle.dataset.label||'▲ Mostrar mais';});toggle.dataset.label=toggle.textContent;}
var _feedDetailDelegated=false;function bindFeedDetail(){if(_feedDetailDelegated)return;_feedDetailDelegated=true;document.body.addEventListener('click',function(ev){var el=ev.target.closest('.feed-entry.has-detail');if(!el)return;ev.stopPropagation();var existing=el.querySelector('.feed-detail-expanded');if(existing){existing.remove();var arrow=el.querySelector('.feed-expand-icon');if(arrow)arrow.textContent='▸';return;}
var detailText=el.getAttribute('data-detail')||'';if(!detailText)return;var div=document.createElement('div');div.className='feed-detail-expanded';detailText.split('\n').forEach(function(line){var p=document.createElement('div');p.textContent=line;div.appendChild(p);});el.appendChild(div);var arrow=el.querySelector('.feed-expand-icon');if(arrow)arrow.textContent='▾'});}
var _actionsDelegated=false;var _actionsState=null;function bindActions(state){_actionsState=state;if(_actionsDelegated)return;_actionsDelegated=true;document.body.addEventListener('click',(ev)=>{const btn=ev.target.closest('.action-btn');if(!btn)return;const state=_actionsState;if(!state)return;if(_actionSent||_cinematicInProgress){return;}
(()=>{vHaptic.select();if(!_audioUnlocked){if(_audioCtx&&_audioCtx.state==='suspended'){_audioCtx.resume().then(()=>{_audioUnlocked=true;}).catch(e=>{console.debug('[COMBAT] audioCtx.resume:',e.name);});}else if(_audioCtx&&_audioCtx.state==='running'){_audioUnlocked=true;}}
const action=btn.dataset.action;if(btn.classList.contains('disabled')){btn.classList.add('disabled-shake');setTimeout(()=>btn.classList.remove('disabled-shake'),ValdoriaMotion.duration(400,0));if(action==='skill')vToast('Sem recurso suficiente para habilidades','warn');else if(action==='items')vToast('Nenhum item utilizável em combate','warn');return;}
const enemies=state.e||[];const skills=state.acts?.skills||[];if(action==='attack'){if(enemies.length>1){showTargetPicker(enemies,'attack');}else{sendAction({type:'attack',target:0});}}else if(action==='skill'){if(skills.length===1){if(enemies.length>1){showTargetPicker(enemies,'skill',skills[0].id);}else{sendAction({type:'skill',skill_id:skills[0].id,target:0});}}else if(skills.length>1){showSkillPicker(skills,enemies,'skill');}}else if(action==='flee'){sendAction({type:'flee'});}else if(action==='dodge'){sendAction({type:'dodge'});}else if(action==='disengage'){sendAction({type:'disengage'});}else if(action==='pass'){sendAction({type:'pass'});}else if(action==='items'){const items=state.acts?.item_list||[];if(items.length>0){showItemPicker(items,enemies,state.a||[]);}}else if(action==='initiative'){sendAction({type:'initiative'});}else if(action==='proceed'){sendAction({type:'proceed'});}else if(action==='restore'){sendAction({type:'restore'});}
else if(action==='bonus_skip'){sendAction({type:'bonus_skip'});}else if(action==='bonus_use_single'){const skillId=btn.dataset.skillId;const tg=btn.dataset.tg||'single';if(tg==='all'||tg==='self'){sendAction({type:'bonus_use',skill_id:skillId,target:0});}else if(enemies.length>1){showTargetPicker(enemies,'bonus_use',skillId);}else{sendAction({type:'bonus_use',skill_id:skillId,target:0});}}else if(action==='bonus_skill_pick'){showSkillPicker(skills,enemies,'bonus_use');}
else if(action==='reaction_skip'){sendAction({type:'reaction_skip'});}else if(action==='reaction_use'){const skillId=btn.dataset.skillId;sendAction({type:'reaction_use',skill_id:skillId});}
else if(action==='continue_spectator'){sendAction({type:'continue_spectator'});}})();});}
function _showActionLoading(show){let el=document.getElementById('actionLoading');if(show){if(!el){el=document.createElement('div');el.id='actionLoading';el.className='action-loading';el.innerHTML='<div class="loading-d20-icon"></div><span>Resolvendo<span class="loading-dots"></span></span>';const bar=document.querySelector('.action-bar');if(bar)bar.prepend(el);}
el.style.display='flex';}else if(el){el.remove();}}
var _actionSent=false;var _actionSentTimer=null;async function sendAction(actionData){if(_actionSent||_cinematicInProgress)return;vHaptic.medium();_actionSent=true;clearTimeout(_actionSentTimer);_actionSentTimer=setTimeout(()=>{if(_actionSent){console.warn('[COMBAT] Action safety timeout — force reset');_actionSent=false;_showActionLoading(false);document.querySelectorAll('.action-btn').forEach(b=>b.classList.remove('disabled'));startPolling();}},30000)/*_TIMEOUT*/;_lastAnimatedRoll=null;_initDiceAnimated=false;document.querySelectorAll('.action-btn').forEach(b=>b.classList.add('disabled'));_showActionLoading(true);stopTimer();stopPolling();if(isApiMode&&api){try{const result=await api.sendAction(actionData);clearTimeout(_actionSentTimer);_showActionLoading(false);_actionSent=false;if(!result){showError('Sem resposta do servidor. Verifique sua conex\u00e3o.');return;}
_playCinematicResult(result,actionData.type);}catch(e){clearTimeout(_actionSentTimer);_showActionLoading(false);_actionSent=false;console.error('[COMBAT] API sendAction error',e);const msg=(e.status===401||e.status===403)?'Sessão expirada.':e.status===429?'Muitas ações. Aguarde um momento.':'Erro de conexão. Tente novamente.';showError(msg);document.querySelectorAll('.action-btn').forEach(b=>b.classList.remove('disabled'));if(e.status===429){setTimeout(()=>startPolling(),5000);}else if(e.status!==401&&e.status!==403){startPolling();}}}else{if(!tg){console.warn('[COMBAT] No Telegram WebApp',actionData);_actionSent=false;return;}
const payload={action:'combat_action',token:token,...actionData,};window.__valdoria_transitioning=true;tg.sendData(JSON.stringify(payload)); /* pflt-suppress: fetch via api.sendAction() above */setTimeout(()=>{try{tg.close();}catch(e){console.warn('[COMBAT] tg.close() failed',e);}},1000);}}
function showSkillPicker(skills,enemies,actionType){if(!skills||skills.length===0)return;actionType=actionType||'skill';const panel=document.getElementById('skillPanel');const overlay=document.getElementById('skillOverlay');const title=actionType==='bonus_use'?'⚡ Ação Bônus':'Habilidades';let html=`<div class="skill-panel-title">${title}</div>`;skills.forEach(sk=>{const typeBadge=sk.tp==='saving_throw'?' · <span class="sk-type sk-type-st">ST</span>':sk.tp==='auto'?' · <span class="sk-type sk-type-auto">Auto</span>':sk.tp==='heal'?' · <span class="sk-type sk-type-heal">Cura</span>':'';const tgtBadge=sk.tg==='all'?' · <span class="sk-aoe">AOE</span>':sk.tg==='self'?' · <span class="sk-aoe">Próprio</span>':'';const effLine=sk.eff?`<div class="skill-effect">${escHtml(sk.eff)}</div>`:'';const skCls=sk.tp==='heal'?'sk-heal':sk.tp==='saving_throw'?'sk-save':sk.tp==='auto'?'sk-buff':'sk-damage';html+=`<div class="skill-item ${skCls}" data-skill-id="${sk.id}" data-tg="${sk.tg || 'single'}">
            <div>
                <div class="skill-name">${escHtml(sk.n)}</div>
                ${effLine}
                <div class="skill-meta">Custo: ${sk.c} · <span class="action-chance ${sk.ch>=65?'ch-high':sk.ch>=40?'ch-mid':'ch-low'}">${sk.ch}%</span>${typeBadge}${tgtBadge}</div>
            </div>
        </div>`;});html+='<div class="skill-close" id="skillClose">Cancelar</div>';panel.innerHTML=html;panel.style.animation='none';panel.offsetHeight;panel.style.animation='';overlay.classList.add('active');const _firstItem=panel.querySelector('.skill-item');if(_firstItem)_firstItem.focus();overlay.onkeydown=(e)=>{if(e.key==='Escape')_closeOverlay(overlay);};panel.onclick=(e)=>{const item=e.target.closest('.skill-item');if(e.target.closest('#skillClose')){_closeOverlay(overlay);return;}
if(!item||_actionSent)return;vHaptic.tap();const skillId=item.dataset.skillId;const tg=item.dataset.tg||'single';overlay.classList.remove('active');if(tg==='all'||tg==='self'){sendAction({type:actionType,skill_id:skillId,target:0});}else if(enemies.length>1){showTargetPicker(enemies,actionType,skillId);}else{sendAction({type:actionType,skill_id:skillId,target:0});}};overlay.onclick=(e)=>{if(e.target===overlay)_closeOverlay(overlay);};}
var _COMBAT_OVERLAY_IDS=['skillOverlay','targetOverlay','itemOverlay'];function isOverlayOpen(){for(var i=0;i<_COMBAT_OVERLAY_IDS.length;i++){var el=document.getElementById(_COMBAT_OVERLAY_IDS[i]);if(el&&el.classList.contains('active'))return true;}return false;}function _closeOverlay(overlay){overlay.classList.remove('active');}
function showTargetPicker(enemies,actionType,skillId){const panel=document.getElementById('targetPanel');const overlay=document.getElementById('targetOverlay');let html='<div class="skill-panel-title">Escolher Alvo</div>';enemies.forEach((e,i)=>{const pct=e.mhp>0?Math.round((e.hp/e.mhp)*100):0;let previewHtml='';const acts=currentState&&currentState.acts;if(acts){let chText='',dmgText='';if(actionType==='attack'){chText=`${acts.hit || '?'}%`;dmgText=currentState.p?currentState.p.dmg:'';}else if((actionType==='skill'||actionType==='bonus_use')&&skillId&&acts.skills){const sk=acts.skills.find(s=>s.id===skillId);if(sk){chText=`${sk.ch}%`;dmgText=sk.eff||'';}}
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