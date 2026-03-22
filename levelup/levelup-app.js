var _spaP=window.__spaRouteParams||{};const _vBg='#2a2420';const tg=window.Telegram?.WebApp;if(tg){tg.ready();tg.expand();tg.setHeaderColor(_vBg);tg.setBackgroundColor(_vBg);if(tg.onEvent){tg.onEvent('viewportChanged',()=>{document.documentElement.style.setProperty('--tg-viewport-height',tg.viewportHeight+'px');});}}
let token='';let P=null;let apiFallback='';let userId='';let returnTo='';const sel={asi:{},feat:'',featStat:'',skills:[],subclass:''};function haptic(type='light'){try{tg?.HapticFeedback?.impactOccurred(type);}catch(e){console.warn('[LEVELUP] haptic:',e);}}
function hapticNotify(type='error'){try{tg?.HapticFeedback?.notificationOccurred(type);}catch(e){console.warn('[LEVELUP] haptic:',e);}}
async function _levelupTransitionBack(){const h={'Content-Type':'application/json','Authorization':'Bearer '+token};if(window.Telegram?.WebApp?.initData)h['X-Telegram-Init-Data']=Telegram.WebApp.initData;h['X-Idempotency-Key']=crypto.randomUUID();try{const r=await fetchT(apiFallback+'/api/webapp/transition',{method:'POST',headers:h,body:JSON.stringify({from:'levelup',to:returnTo,user_id:parseInt(userId, 10),payload:{}})});if(r.status===401||r.status===403){console.error('[LEVELUP] Auth error on transition:',r.status);if(tg?.sendData){window.__valdoria_transitioning=true;tg.sendData(JSON.stringify({action:'webapp_reconnect',webapp:'LEVELUP',reason:'session_expired'}));return;}}
if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json();if(d.url){window.__valdoria_transitioning=true;valdoriaSpaNav(d.url);return;}}catch(e){console.error('[LEVELUP] transition error:',e);}
try{window.__valdoria_transitioning=true;if(tg)tg.close();}catch(e){console.warn('[LEVELUP] tg.close:',e);}}
const screens=[];let cur=0;let asiMode='asi';let isTransitioning=false;
(function init(){const params=new URLSearchParams(location.search);if(_spaP){Object.keys(_spaP).forEach(function(k){if(!params.has(k))params.set(k,_spaP[k]);});}
token=params.get('token')||'';apiFallback=params.get('api')||'';userId=params.get('uid')||'';if(window.SessionHeartbeat&&apiFallback&&token&&userId){SessionHeartbeat.init({apiBase:apiFallback,token:token,uid:parseInt(userId, 10)||0});}
returnTo=params.get('return')||'';if(window.ValdoriaErrors){ValdoriaErrors.init({appName:'LEVELUP',apiBase:apiFallback,token:token,uid:userId});}
try{const raw=params.get('p')||'';P=JSON.parse(decodeBase64Utf8(raw));}catch(e){showFatalError('Dados invalidos',e);return;}
if(!P||!P.hero_class||!P.stats||typeof P.level!=='number'){showFatalError('Dados do personagem incompletos');return;}
for(const[k,v]of Object.entries(P.stats)){if(typeof v!=='number'||v<1||v>20){showFatalError('Atributos invalidos');return;}}
if(typeof CLASS_SKILLS==='undefined'||typeof FEATS==='undefined'){showFatalError('Dados do jogo não carregaram');return;}
buildScreens();if(typeof ValdoriaAudio!=='undefined')ValdoriaAudio.play('levelup');if(window._lvlInitLoading)window._lvlInitLoading.hide();})();function buildScreens(){screens.length=0;screens.push({id:'summary',build:buildSummary,validate:()=>null});if(P.needs_subclass){screens.push({id:'subclass',build:buildSubclass,validate:validateSubclass,hasSub:true});}
if(P.pending_asi>0){screens.push({id:'asi',build:buildASI,validate:validateASI,hasSub:true});}
if(P.pending_skills>0){const skills=getAvailableSkills();if(skills.length>0){screens.push({id:'skills',build:buildSkills,validate:validateSkills,hasSub:true});}}
screens.push({id:'review',build:buildReview,validate:()=>null});buildProgress();renderAllScreens();goTo(0);}
function buildProgress(){const bar=document.getElementById('progressBar');bar.innerHTML=screens.map((s,i)=>`<div class="progress-step" id="pstep_${i}"></div>`).join('');}
function updateProgress(){screens.forEach((_,i)=>{const el=document.getElementById('pstep_'+i);if(!el)return;el.className='progress-step'+(i<cur?' done':i===cur?' active':'');});}
function renderAllScreens(){const track=document.getElementById('screenTrack');track.innerHTML=screens.map((s,i)=>{let subHtml='';if(s.hasSub){subHtml=`<div class="sub-screen" id="sub_${s.id}"><div class="screen-content" id="sub_content_${s.id}"></div></div>`;}
return`<div class="screen" id="screen_${i}"><div class="screen-content" id="content_${i}"></div>${subHtml}</div>`;}).join('');screens.forEach((s,i)=>s.build(document.getElementById('content_'+i)));}
function goTo(idx){if(idx<0||idx>=screens.length)return;haptic('light');closeAllSubScreens();cur=idx;document.getElementById('screenTrack').style.transform=`translateX(-${idx * 100}vw)`;const bar=document.getElementById('progressBar');if(idx>0)bar.classList.add('visible');else bar.classList.remove('visible');updateProgress();updateNavBtn();if(screens[cur].id==='review'){screens[cur].build(document.getElementById('content_'+cur));}}
function goNext(){const err=screens[cur].validate();if(err){_showValidation(err);return;}
if(cur===screens.length-1){submit();}else{goTo(cur+1);}}
function goBack(){if(cur>0){goTo(cur-1);return;}
try{window.__valdoria_transitioning=true;tg.close();}catch(e){console.warn('[LEVELUP] close failed:',e);}}
if(typeof vEscapeKey!=='undefined'){vEscapeKey.register(function(){return typeof vDrawer!=='undefined'&&vDrawer.isOpen();},function(){var top=typeof vDrawer!=='undefined'&&vDrawer.getTopOpen();if(top)vDrawer.close(top.id);});}
function updateNavBtn(){const btn=document.getElementById('btnNext');if(cur===screens.length-1){btn.textContent='\u2694\ufe0f Confirmar Evolucao';btn.className='v-btn v-btn-primary';}else{btn.textContent='Continuar \u25b6';btn.className='v-btn v-btn-primary';}
if(tg&&tg.BackButton){const hasOpenSub=document.querySelector('.sub-screen.active');tg.BackButton.show();}}
function openSubScreen(subId){vDrawer.open(subId);var sub=document.getElementById(subId);if(sub)sub.scrollTop=0;document.querySelector('.nav-bar').classList.add('hidden');updateNavBtn();}
function closeSubScreen(subId){vDrawer.close(subId);if(!document.querySelector('.sub-screen.active')){document.querySelector('.nav-bar').classList.remove('hidden');}updateNavBtn();}
function closeAllSubScreens(){vDrawer.closeAll();}
if(tg&&tg.BackButton){tg.BackButton.onClick(()=>{const openSub=document.querySelector('.sub-screen.active');if(openSub){closeSubScreen(openSub.id);return;}
goBack();});}
function getMod(val){return Math.floor((val-10)/2);}
function fmtMod(val){const m=getMod(val);return m>=0?'+'+m:''+m;}
function getAvailableSkills(){const pool=CLASS_SKILLS[P.hero_class]||{};const result=[];for(const[lv,skills]of Object.entries(pool)){if(parseInt(lv, 10)<=P.level){for(const s of skills){if(!P.acquired_skills.includes(s.id)){result.push({...s,level:parseInt(lv, 10)});}}}}
return result;}
function _showValidation(msg){console.warn('[LEVELUP]',msg);hapticNotify('error');var _dur=Math.max(2000,msg.split(/\s+/).length*250);if(window.ValdoriaErrors){ValdoriaErrors.showToast(msg,_dur);}else{vToast(msg,'err',_dur);}}
function showFatalError(msg,err=null){console.error('[LEVELUP][FATAL]',msg,err||'');if(window.ValdoriaErrors){ValdoriaErrors.showError(msg,err);}else{const el=document.getElementById('fatalError');document.getElementById('fatalMsg').textContent=msg;el.classList.add('active');}}
function calcDmgRange(effect){if(!effect)return'';const m=effect.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/);if(!m)return'';const n=parseInt(m[1], 10),d=parseInt(m[2], 10),b=m[3]?parseInt(m[3], 10):0;return`${n + b}~${n * d + b}`;}
function buildSummary(el){const info=CLASS_INFO[P.hero_class]||{name:'Aventureiro',resource:'MP'};let html=`
        <div class="dm-bubble">${P.name}, a energia do seu crescimento se manifesta. Você sente o poder fluindo...</div>
        <div class="lvl-banner">
            <div class="lvl-banner-level">${P.level}</div>
            <div class="lvl-banner-title">Novo Nivel Alcancado!</div>
            <div class="lvl-banner-class">${info.name} &mdash; ${P.name}</div>
            <div class="lvl-gains">
                ${P.hp_gain ? `<div class="lvl-gain hp">\u2764\ufe0f+${P.hp_gain}HP</div>` : ''}
                ${P.mp_gain ? `<div class="lvl-gain mp">\ud83d\udd37+${P.mp_gain}${info.resource}</div>` : ''}
            </div>
        </div>
        <div class="section-title">Escolhas Pendentes</div>
        <div class="pending-list">
    `;if(P.needs_subclass){html+=`<div class="pending-item">
            <div class="pending-icon">\ud83c\udff0</div>
            <div class="pending-text"><b>Subclasse</b><small>Escolha obrigatória no nivel 3+</small></div>
            <div class="pending-badge">1</div>
        </div>`;}
if(P.pending_asi>0){html+=`<div class="pending-item">
            <div class="pending-icon">\ud83d\udcaa</div>
            <div class="pending-text"><b>Pontos de Atributo</b><small>Distribua entre seus atributos</small></div>
            <div class="pending-badge">${P.pending_asi}</div>
        </div>`;}
if(P.pending_skills>0){html+=`<div class="pending-item">
            <div class="pending-icon">\u26a1</div>
            <div class="pending-text"><b>Novas Habilidades</b><small>Escolha do pool da sua classe</small></div>
            <div class="pending-badge">${P.pending_skills}</div>
        </div>`;}
html+='</div><div class="hint">Prossiga para fazer suas escolhas</div>';el.innerHTML=html;}
function buildSubclass(el){const subs=SUBCLASSES[P.hero_class]||{};const info=CLASS_INFO[P.hero_class]||{name:'Classe'};let html=`<div class="dm-bubble">Chegou a hora de definir seu caminho. Cada especializacao oferece poderes unicos...</div>
        <div class="section-title">\ud83c\udff0 Subclasse: ${info.name}</div>
        <div class="hint">Escolha sua especializacao</div>
        <div id="subclassList">`;const subEntries=Object.entries(subs);if(subEntries.length===0){html+='<div class="empty-msg">Subclasses não disponíveis para este nivel.</div>';}else{for(const[scId,sc]of subEntries){const isSel=sel.subclass===scId;html+=`<div class="choice-card${isSel ? ' selected' : ''}" onclick="selectSubclass('${scId}')">
                <div class="choice-card-header">
                    <div class="choice-card-icon">\ud83c\udff0</div>
                    <div class="choice-card-name">${sc.name}</div>
                    <div class="choice-card-check">${isSel ? '\u2713' : ''}</div>
                </div>
                <div class="choice-card-desc">${sc.desc}</div>
                <div class="detail-link" onclick="event.stopPropagation(); openSubclassDetail('${scId}')">Ver habilidades \u25b8</div>
            </div>`;}}
html+='</div>';el.innerHTML=html;}
function openSubclassDetail(scId){const subs=SUBCLASSES[P.hero_class]||{};const sc=subs[scId];if(!sc)return;const container=document.getElementById('sub_content_subclass');if(!container)return;let html=`<button class="sub-back-btn" onclick="closeSubScreen('sub_subclass')">\u25c0 Voltar</button>`;html+=`<div class="section-title">\ud83c\udff0 ${sc.name}</div>`;html+=`<div style="font-size:12px;color:var(--v-text-dim);margin-bottom:12px;line-height:1.4">${sc.desc}</div>`;const feats=sc.features||{};const levels=Object.keys(feats).sort((a,b)=>parseInt(a, 10)-parseInt(b, 10));if(levels.length>0){html+='<div class="section-title">Habilidades por Nivel</div>';for(const lv of levels){const f=feats[lv];html+=`<div class="sc-feature">
                <div class="sc-feature-level">Nivel ${lv}</div>
                <div class="sc-feature-name">${f.name}</div>
                ${f.desc ? `<div class="sc-feature-desc">${f.desc}</div>` : ''}
            </div>`;}}
const isSel=sel.subclass===scId;html+=`<button class="v-btn ${isSel ? 'v-btn-secondary' : 'v-btn-primary'}" style="width:100%;margin-top:16px"
        onclick="selectSubclass('${scId}'); closeSubScreen('sub_subclass')">
        ${isSel ? '\u2713 Selecionada' : `Selecionar ${sc.name}`}
    </button>`;container.innerHTML=html;openSubScreen('sub_subclass');}
function selectSubclass(scId){haptic('light');sel.subclass=sel.subclass===scId?'':scId;const screen=screens.findIndex(s=>s.id==='subclass');if(screen>=0)screens[screen].build(document.getElementById('content_'+screen));}
function validateSubclass(){if(!sel.subclass)return'Escolha uma subclasse';return null;}
function buildASI(el){const totalPts=P.pending_asi;const featCost=sel.feat?2:0;const asiPts=totalPts-featCost;const allocated=Object.values(sel.asi).reduce((a,b)=>a+b,0);const remaining=asiPts-allocated;const availableFeats=getAvailableFeats();const hasFeats=Object.keys(availableFeats).length>0&&totalPts>=2;let html='<div class="dm-bubble">Distribua sua experiencia adquirida para fortalecer seus atributos — ou escolha um talento especial.</div>';if(hasFeats){html+=`<div class="mode-toggle">
            <button class="mode-toggle-btn${asiMode === 'asi' ? ' active' : ''}" onclick="setAsiMode('asi')">\ud83d\udcaa Atributos</button>
            <button class="mode-toggle-btn${asiMode === 'feat' ? ' active' : ''}" onclick="setAsiMode('feat')">\ud83c\udf96\ufe0f Talento</button>
        </div>`;}
if(asiMode==='asi'){html+=buildASIPanel(asiPts,allocated,remaining);}else{html+=buildFeatPanel(availableFeats);}
el.innerHTML=html;}
function buildASIPanel(asiPts,allocated,remaining){let html=`<div class="asi-counter">Pontos: <b>${allocated}</b> / <b>${asiPts}</b> distribuidos</div>`;if(asiPts<=0){html+=`<div class="empty-msg">Todos os pontos foram usados no talento selecionado.</div>`;return html;}
html+='<div class="asi-grid">';const attrs=['strength','dexterity','constitution','intelligence','wisdom','charisma'];for(const attr of attrs){const base=P.stats[attr];const boost=sel.asi[attr]||0;const val=base+boost;const maxed=val>=20;html+=`<div class="asi-card${maxed && boost === 0 ? ' maxed' : ''}">
            <div class="asi-icon">${ATTR_ICONS[attr]}</div>
            <div class="asi-name">${ATTR_ABBR[attr]}</div>
            <div class="asi-value">${val}</div>
            <div class="asi-mod">(${fmtMod(val)})</div>
            <div class="asi-boost">${boost > 0 ? '+' + boost : ''}</div>
            <div class="asi-controls">
                <button class="asi-btn minus" aria-label="Diminuir ${attr}" onclick="asiChange('${attr}',-1)" ${boost <= 0 ? 'disabled' : ''}>-</button>
                <button class="asi-btn plus" aria-label="Aumentar ${attr}" onclick="asiChange('${attr}',1)" ${(remaining <= 0 || val >= 20) ? 'disabled' : ''}>+</button>
            </div>
        </div>`;}
html+='</div>';return html;}
function buildFeatPanel(availableFeats){let html='<div class="section-title">\ud83c\udf96\ufe0f Talentos</div>';html+='<div class="hint">Escolher um talento consome 2 pontos de atributo</div>';if(sel.feat){const f=FEATS[sel.feat];html+=`<div class="choice-card selected" onclick="selectFeat('')">
            <div class="choice-card-header">
                <div class="choice-card-icon">\ud83c\udf96\ufe0f</div>
                <div class="choice-card-name">${f.name}</div>
                <div class="choice-card-badge badge-cost">-2 pts</div>
                <div class="choice-card-check">\u2713</div>
            </div>
        </div>`;if(f.stat_choice){html+='<div class="section-title">Escolha do Atributo</div>';for(const attr of f.stat_choice){const curVal=P.stats[attr];const amt=f.stat_amount||1;if(curVal+amt>20)continue;const isSel=sel.featStat===attr;html+=`<div class="choice-card${isSel ? ' selected' : ''}" onclick="selectFeatStat('${attr}')">
                    <div class="choice-card-header">
                        <div class="choice-card-icon">${ATTR_ICONS[attr]}</div>
                        <div class="choice-card-name">${ATTR_PT[attr]} (${curVal} \u2192 ${curVal + amt})</div>
                        <div class="choice-card-check">${isSel ? '\u2713' : ''}</div>
                    </div>
                </div>`;}}
html+=`<button class="v-btn v-btn-secondary" style="width:100%;margin-top:12px" onclick="selectFeat('')">Remover Talento</button>`;}else{const featEntries=Object.entries(availableFeats);if(featEntries.length===0){html+='<div class="empty-msg">Nenhum talento disponivel para sua classe.</div>';}else{html+='<div class="feat-scroll-list">';for(const[fid,f]of featEntries){html+=`<div class="choice-card" onclick="selectFeat('${fid}')">
                    <div class="choice-card-header">
                        <div class="choice-card-icon">\ud83c\udf96\ufe0f</div>
                        <div class="choice-card-name">${f.name}</div>
                        <div class="choice-card-badge badge-cost">-2 pts</div>
                        <button class="info-btn" onclick="event.stopPropagation(); openFeatDetail('${fid}')">i</button>
                    </div>
                </div>`;}
html+='</div>';}}
return html;}
function openFeatDetail(fid){const f=FEATS[fid];if(!f)return;const container=document.getElementById('sub_content_asi');if(!container)return;let html=`<button class="sub-back-btn" onclick="closeSubScreen('sub_asi')">\u25c0 Voltar</button>`;html+=`<div class="section-title">\ud83c\udf96\ufe0f ${f.name}</div>`;html+=`<div style="font-size:13px;color:var(--v-text);margin-bottom:8px;line-height:1.4">${f.desc}</div>`;if(f.effect){html+=`<div style="font-size:12px;color:var(--v-text-dim);margin-bottom:8px;line-height:1.3"><b>Efeito:</b> ${f.effect}</div>`;}
if(f.stat_choice){html+=`<div style="font-size:12px;color:var(--v-text-dim);margin-bottom:8px"><b>Bônus:</b> +${f.stat_amount || 1} em ${f.stat_choice.map(a => ATTR_PT[a]).join(' ou ')}</div>`;}
if(f.req_spellcaster){html+=`<div style="font-size:12px;color:#e45;margin-bottom:8px"><b>Requisito:</b> Classe conjuradora</div>`;}
html+=`<div style="font-size:11px;color:var(--v-text-dim);margin-top:4px">Custo: 2 pontos de atributo</div>`;html+=`<button class="v-btn v-btn-primary" style="width:100%;margin-top:16px"
        onclick="selectFeat('${fid}'); closeSubScreen('sub_asi')">Selecionar ${f.name}</button>`;container.innerHTML=html;openSubScreen('sub_asi');}
function getAvailableFeats(){const result={};const nonCasters=['WARRIOR','ROGUE','BARBARIAN'];for(const[fid,f]of Object.entries(FEATS)){if(P.feats.includes(fid))continue;if(f.req_spellcaster&&nonCasters.includes(P.hero_class))continue;result[fid]=f;}
return result;}
function setAsiMode(mode){asiMode=mode;const screen=screens.findIndex(s=>s.id==='asi');if(screen>=0)screens[screen].build(document.getElementById('content_'+screen));}
function asiChange(attr,delta){haptic('light');const boost=(sel.asi[attr]||0)+delta;const val=P.stats[attr]+boost;if(boost<0||val>20)return;const featCost=sel.feat?2:0;const asiPts=P.pending_asi-featCost;const totalAllocated=Object.values(sel.asi).reduce((a,b)=>a+b,0)+delta;if(totalAllocated>asiPts||totalAllocated<0)return;if(boost===0){delete sel.asi[attr];}else{sel.asi[attr]=boost;}
const screen=screens.findIndex(s=>s.id==='asi');if(screen>=0)screens[screen].build(document.getElementById('content_'+screen));}
function selectFeat(fid){haptic('medium');if(sel.feat===fid){sel.feat='';sel.featStat='';}else{sel.feat=fid;sel.featStat='';const featCost=fid?2:0;const asiPts=P.pending_asi-featCost;const allocated=Object.values(sel.asi).reduce((a,b)=>a+b,0);if(allocated>asiPts){sel.asi={};}}
const screen=screens.findIndex(s=>s.id==='asi');if(screen>=0)screens[screen].build(document.getElementById('content_'+screen));}
function selectFeatStat(attr){haptic('light');sel.featStat=sel.featStat===attr?'':attr;const screen=screens.findIndex(s=>s.id==='asi');if(screen>=0)screens[screen].build(document.getElementById('content_'+screen));}
function validateASI(){const featCost=sel.feat?2:0;const asiPts=P.pending_asi-featCost;const allocated=Object.values(sel.asi).reduce((a,b)=>a+b,0);if(sel.feat){const f=FEATS[sel.feat];if(f&&f.stat_choice&&!sel.featStat){return'Escolha o atributo para o talento';}}
if(allocated!==asiPts){return`Distribua todos os ${asiPts} pontos de atributo (faltam ${asiPts - allocated})`;}
return null;}
function buildSkills(el){const available=getAvailableSkills();const needed=Math.min(P.pending_skills,available.length);const info=CLASS_INFO[P.hero_class]||{resource:'MP'};let html=`<div class="dm-bubble">Novas tecnicas de combate estao ao seu alcance. Escolha com sabedoria.</div>`;html+=`<div class="section-title">\u26a1 Habilidades</div>`;html+=`<div class="asi-counter">Selecionadas: <b>${sel.skills.length}</b> / <b>${needed}</b></div>`;for(const s of available){const isSel=sel.skills.includes(s.id);html+=`<div class="skill-compact${isSel ? ' selected' : ''}" onclick="toggleSkill('${s.id}')">
            <div class="skill-compact-check">${isSel ? '\u2713' : ''}</div>
            <span class="skill-compact-icon">\u26a1</span>
            <span class="skill-compact-name">${s.name}</span>
            ${s.passive ? '<span class="choice-card-badge badge-passive">Passiva</span>' :
                        `<span class="choice-card-badge badge-cost">${s.cost}${info.resource}</span>`}
            <button class="info-btn" onclick="event.stopPropagation(); openSkillDetail('${s.id}')">i</button>
        </div>`;}
if(available.length===0){html+='<div class="empty-msg">Nenhuma habilidade disponivel para escolher.</div>';}
el.innerHTML=html;}
function openSkillDetail(sid){const available=getAvailableSkills();const s=available.find(sk=>sk.id===sid);if(!s)return;const info=CLASS_INFO[P.hero_class]||{resource:'MP'};const container=document.getElementById('sub_content_skills');if(!container)return;const dmg=calcDmgRange(s.effect);let html=`<button class="sub-back-btn" onclick="closeSubScreen('sub_skills')">\u25c0 Voltar</button>`;html+=`<div class="section-title">\u26a1 ${s.name}</div>`;html+=`<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">`;if(s.passive){html+='<span class="choice-card-badge badge-passive">Passiva</span>';}else{html+=`<span class="choice-card-badge badge-cost">${s.cost} ${info.resource}</span>`;}
html+=`<span class="choice-card-badge badge-level">Nivel ${s.level}</span>`;if(dmg)html+=`<span class="choice-card-badge" style="background:rgba(228,68,85,0.15);color:#e45">${dmg} dano</span>`;html+='</div>';if(s.effect)html+=`<div style="font-size:13px;color:var(--v-text);margin-bottom:8px">\u2728 ${s.effect}</div>`;if(s.desc)html+=`<div style="font-size:12px;color:var(--v-text-dim);margin-bottom:8px;line-height:1.4">${s.desc}</div>`;if(s.tech)html+=`<div style="font-size:11px;color:var(--v-text-dim);font-style:italic;line-height:1.3">${s.tech}</div>`;const isSel=sel.skills.includes(sid);html+=`<button class="v-btn ${isSel ? 'v-btn-secondary' : 'v-btn-primary'}" style="width:100%;margin-top:16px"
        onclick="toggleSkill('${sid}'); closeSubScreen('sub_skills')">
        ${isSel ? '\u2713 Selecionada' : 'Selecionar Habilidade'}
    </button>`;container.innerHTML=html;openSubScreen('sub_skills');}
function toggleSkill(sid){haptic('light');const idx=sel.skills.indexOf(sid);const available=getAvailableSkills();const needed=Math.min(P.pending_skills,available.length);if(idx>=0){sel.skills.splice(idx,1);}else{if(sel.skills.length>=needed){_showValidation(`Voce so pode escolher ${needed} habilidade(s)`);return;}
sel.skills.push(sid);}
const screen=screens.findIndex(s=>s.id==='skills');if(screen>=0)screens[screen].build(document.getElementById('content_'+screen));}
function validateSkills(){const available=getAvailableSkills();const needed=Math.min(P.pending_skills,available.length);if(sel.skills.length!==needed){return`Escolha ${needed} habilidade(s) (faltam ${needed - sel.skills.length})`;}
return null;}
function buildReview(el){const info=CLASS_INFO[P.hero_class]||{name:'Aventureiro',resource:'MP'};let html=`<div class="dm-bubble">Revise suas escolhas antes de confirmar. Uma vez feitas, nao ha como voltar.</div>`;html+=`<div class="section-title">\ud83d\udcdc Resumo da Evolucao</div>`;html+=`<div class="review-section">
        <div class="review-section-title">\u2764\ufe0f Vitalidade</div>`;if(P.hp_gain){html+=`<div class="review-row"><span class="review-label">HP</span>
        <span class="review-value">${P.max_hp - P.hp_gain} <span class="arrow">\u2192</span> <span class="changed">${P.max_hp}</span></span></div>`;}
if(P.mp_gain){html+=`<div class="review-row"><span class="review-label">${info.resource}</span>
        <span class="review-value">${P.max_mp - P.mp_gain} <span class="arrow">\u2192</span> <span class="changed">${P.max_mp}</span></span></div>`;}
html+='</div>';if(P.needs_subclass&&sel.subclass){const subs=SUBCLASSES[P.hero_class]||{};const sc=subs[sel.subclass];html+=`<div class="review-section">
            <div class="review-section-title">\ud83c\udff0 Subclasse</div>
            <div class="review-row"><span class="review-label">Escolha:</span>
            <span class="review-value"><span class="changed">${sc ? sc.name : sel.subclass}</span> <span class="new-badge">Novo</span></span></div>
        </div>`;}
if(sel.feat){const f=FEATS[sel.feat];html+=`<div class="review-section">
            <div class="review-section-title">\ud83c\udf96\ufe0f Talento</div>
            <div class="review-row"><span class="review-label">Escolha:</span>
            <span class="review-value"><span class="changed">${f ? f.name : sel.feat}</span> <span class="new-badge">Novo</span></span></div>`;if(sel.featStat){const amt=f?.stat_amount||1;html+=`<div class="review-row"><span class="review-label">Bonus:</span>
            <span class="review-value"><span class="changed">+${amt} ${ATTR_PT[sel.featStat]}</span></span></div>`;}
html+=`<div class="review-row"><span class="review-label">Custo:</span>
            <span class="review-value" style="color:#e45">-2 pontos de atributo</span></div>
        </div>`;}
const asiEntries=Object.entries(sel.asi).filter(([_,v])=>v>0);if(asiEntries.length>0){html+=`<div class="review-section">
            <div class="review-section-title">\ud83d\udcaa Atributos</div>`;for(const[attr,boost]of asiEntries){const before=P.stats[attr];const after=before+boost;html+=`<div class="review-row">
                <span class="review-label">${ATTR_ICONS[attr]} ${ATTR_PT[attr]}</span>
                <span class="review-value">${before} <span class="arrow">\u2192</span> <span class="changed">${after}</span> (${fmtMod(after)})</span>
            </div>`;}
html+='</div>';}
if(sel.skills.length>0){html+=`<div class="review-section">
            <div class="review-section-title">\u26a1 Habilidades</div>`;const pool=CLASS_SKILLS[P.hero_class]||{};for(const sid of sel.skills){let sName=sid;for(const skills of Object.values(pool)){const found=skills.find(s=>s.id===sid);if(found){sName=found.name;break;}}
html+=`<div class="review-row"><span class="review-label">\u26a1</span>
            <span class="review-value"><span class="changed">${sName}</span> <span class="new-badge">Novo</span></span></div>`;}
html+='</div>';}
html+='<div class="hint" style="margin-top:12px">Confirme suas escolhas para finalizar a evolucao</div>';el.innerHTML=html;}
let _submitted=false;function submit(){if(_submitted)return;_submitted=true;var _sbtn=document.getElementById('btnNext')||document.querySelector('.submit-btn');if(_sbtn)_sbtn.disabled=true;haptic('medium');const asiChoices=[];for(const[attr,count]of Object.entries(sel.asi)){for(let i=0;i<count;i++)asiChoices.push(attr);}
const payload={action:'levelup_complete',token:token,asi_choices:asiChoices,skill_choices:sel.skills,subclass:sel.subclass,feat:sel.feat,feat_stat:sel.featStat,};const btn=document.getElementById('btnNext');btn.disabled=true;btn.textContent='Enviando...';document.getElementById('loadingOverlay').classList.add('active');try{if(apiFallback){payload.user_id=parseInt(userId, 10);const _lh={'Content-Type':'application/json','Authorization':'Bearer '+token};if(window.Telegram?.WebApp?.initData){_lh['X-Telegram-Init-Data']=Telegram.WebApp.initData;}
_lh['X-Idempotency-Key']=crypto.randomUUID();fetchT(apiFallback+'/api/levelup/apply',{method:'POST',headers:_lh,body:JSON.stringify(payload)}).then(res=>{if(res.status===401||res.status===403){console.error('[LEVELUP] Auth error on apply:',res.status);document.getElementById('loadingOverlay').classList.remove('active');if(tg?.sendData){window.__valdoria_transitioning=true;tg.sendData(JSON.stringify({action:'webapp_reconnect',webapp:'LEVELUP',reason:'session_expired'}));return null;}
showFatalError('Sessão expirada. Feche e reabra.');return null;}
if(!res.ok)throw new Error('HTTP '+res.status);return res.json();}).then(data=>{if(!data)return;if(data.status==='saved'||data.ok){if(data.return_url){window.__valdoria_transitioning=true;valdoriaSpaNav(data.return_url);}else if(returnTo&&apiFallback&&token){_levelupTransitionBack();}else if(tg&&tg.close){window.__valdoria_transitioning=true;tg.close();}else{console.warn('[LEVELUP] Evolução confirmada (modo teste)');}}else{document.getElementById('loadingOverlay').classList.remove('active');btn.disabled=false;btn.textContent='Confirmar';showFatalError('Erro ao aplicar evolucao: '+(data.error||'Desconhecido'));}}).catch(e=>{document.getElementById('loadingOverlay').classList.remove('active');btn.disabled=false;btn.textContent='Confirmar';showFatalError('Erro de conexao com servidor.',e);});}
else if(tg&&tg.sendData){setTimeout(()=>{window.__valdoria_transitioning=true;tg.sendData(JSON.stringify(payload));setTimeout(()=>{try{tg.close();}catch(e){console.warn('[LEVELUP] tg.close:',e);}},300);},300);setTimeout(()=>{if(document.visibilityState!=='hidden'){document.getElementById('loadingOverlay').classList.remove('active');btn.disabled=false;btn.textContent='Confirmar';}},5000);}else{console.debug('Level-up payload:',JSON.stringify(payload,null,2));setTimeout(()=>{document.getElementById('loadingOverlay').classList.remove('active');btn.disabled=false;console.warn('[LEVELUP] Evolução confirmada (modo teste)\n\n'+JSON.stringify(payload,null,2));},800);}}catch(e){document.getElementById('loadingOverlay').classList.remove('active');btn.disabled=false;showFatalError('Erro ao enviar dados. Tente novamente.',e);}}
/* Immersive mode toggle */
(function _initImmersive(){var KEY='valdoria_immersive';var collapsed=false;try{collapsed=localStorage.getItem(KEY)==='1';}catch(e){console.warn('[LEVELUP]',e);}
var toggle=document.getElementById('immersive-toggle');var restore=document.getElementById('immersive-restore');var panel=document.getElementById('bottom-panel');if(!toggle||!restore||!panel)return;
function apply(){var hasSub=!!document.querySelector('.sub-screen.active');if(hasSub){toggle.style.display='none';restore.style.display='none';return;}
if(collapsed){panel.classList.add('immersive-collapsed');toggle.style.display='none';restore.style.display='';}else{panel.classList.remove('immersive-collapsed');toggle.style.display='';restore.style.display='none';}}
toggle.onclick=function(){collapsed=true;try{localStorage.setItem(KEY,'1');}catch(e){console.warn('[LEVELUP]',e);}apply();if(typeof haptic==='function')haptic('light');};
restore.onclick=function(){collapsed=false;try{localStorage.setItem(KEY,'0');}catch(e){console.warn('[LEVELUP]',e);}apply();if(typeof haptic==='function')haptic('light');};
apply();
var _origOpen=window.openSubScreen;var _origClose=window.closeSubScreen;
if(_origOpen)window.openSubScreen=function(id){_origOpen(id);apply();};
if(_origClose)window.closeSubScreen=function(id){_origClose(id);setTimeout(apply,50);};})();