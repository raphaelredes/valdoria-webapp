var _spaP=window.__spaRouteParams||{};const tg=window.Telegram?.WebApp;const _vBg=getComputedStyle(document.documentElement).getPropertyValue('--v-bg').trim()||'#2a2420';const _wsParams=new URLSearchParams(window.location.search);const _wsApi=_wsParams.get('api')||'';const _wsUid=_wsParams.get('uid')||'';const _wsToken=_wsParams.get('token')||'';const _wsReturn=_wsParams.get('return')||'game';if(tg){tg.ready();tg.expand();tg.setHeaderColor(_vBg);tg.setBackgroundColor(_vBg);if(tg.BackButton){tg.BackButton.show();tg.BackButton.onClick(()=>{_navigateBack();});}}
if(window.ValdoriaErrors){ValdoriaErrors.init({appName:'WORKSTATION',apiBase:_wsApi,token:_wsToken,uid:_wsUid});}
async function _navigateBack(){if(_wsApi&&_wsToken){const h={'Content-Type':'application/json','Authorization':'Bearer '+_wsToken};if(window.Telegram?.WebApp?.initData)h['X-Telegram-Init-Data']=Telegram.WebApp.initData;h['X-Idempotency-Key']=crypto.randomUUID();try{const r=await fetchT(_wsApi+'/api/webapp/transition',{method:'POST',headers:h,body:JSON.stringify({from:'workstation',to:_wsReturn,user_id:parseInt(_wsUid),payload:{}})});if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json();if(d.url){valdoriaSpaNav(d.url);return;}}catch(e){console.error('[WORKSTATION] transition error:',e);}}
try{if(tg)tg.close();}catch(e){console.warn('[WORKSTATION] tg.close:',e);}}
let PAYLOAD=null;let selectedRecipe=null;let activeTab=null;const RARITY_LABELS={common:'Comum',uncommon:'Incomum',rare:'Raro',very_rare:'Muito Raro',legendary:'Lendário',};function decodeBase64Utf8(b64){const raw=b64.replace(/-/g,'+').replace(/_/g,'/');const binary=atob(raw);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new TextDecoder().decode(bytes);}
function init(){const params=new URLSearchParams(window.location.search);const dataB64=params.get('data');if(!dataB64){_showInitError('Dados não encontrados.');return;}
try{const json=decodeBase64Utf8(dataB64);PAYLOAD=JSON.parse(json);}catch(e){console.error('[WORKSTATION] Erro ao decodificar dados',e);_showInitError('Erro ao decodificar dados.');return;}
updateHeader();buildTabs();}
function _showInitError(msg){console.error('[WORKSTATION]',msg);document.getElementById('mainContent').innerHTML=`<div class="empty-state"><div class="icon">⚠️</div><p>${msg}</p></div>`;}
function updateHeader(){const stats=document.getElementById('headerStats');const matCount=Object.values(PAYLOAD.materials).reduce((a,b)=>a+b,0);stats.textContent=`💰 ${PAYLOAD.gold} GP · 📦 ${matCount} materiais · Lv.${PAYLOAD.level}`;}
function buildTabs(){const container=document.getElementById('tabsContainer');container.innerHTML='';const toolKeys=Object.keys(PAYLOAD.tools);toolKeys.forEach((tk,i)=>{const t=PAYLOAD.tools[tk];const tab=document.createElement('div');tab.className='tab'+(i===0?' active':'');tab.textContent=`${t.emoji} ${t.name}`;tab.onclick=()=>selectTab(tk,tab);container.appendChild(tab);});const matTab=document.createElement('div');matTab.className='tab';matTab.textContent='📦 Materiais';matTab.onclick=()=>selectTab('_materials',matTab);container.appendChild(matTab);if(toolKeys.length>0){selectTab(toolKeys[0],container.children[0]);}else{selectTab('_materials',matTab);}}
function selectTab(key,tabEl){activeTab=key;selectedRecipe=null;updateCraftButton();document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));tabEl.classList.add('active');if(key==='_materials'){renderMaterials();}else{renderRecipes(key);}}
function renderRecipes(toolKey){const content=document.getElementById('mainContent');const recipes=PAYLOAD.recipes.filter(r=>r.tool===toolKey);if(!recipes.length){content.innerHTML='<div class="empty-state"><div class="icon">📜</div>'+'<p>Nenhuma receita disponível para esta ferramenta no seu nível.</p></div>';document.getElementById('craftBtnContainer').style.display='none';return;}
document.getElementById('craftBtnContainer').style.display='block';let html='';recipes.forEach(r=>{const ready=r.has_materials&&r.can_afford;const cls=ready?'craftable':'missing';const badge=ready?'<span class="recipe-badge badge-ready">✅ Pronto</span>':'<span class="recipe-badge badge-missing">❌ Falta</span>';html+=`
            <div class="recipe-card ${cls} fade-in" data-id="${r.id}" onclick="selectRecipeCard('${r.id}')">
                <div class="recipe-header">
                    <span class="recipe-name">${r.name}</span>
                    ${badge}
                </div>
                <div class="recipe-meta">
                    <span>Lv.${r.min_level}</span>
                    <span>DC ${r.dc}</span>
                    <span>💰 ${r.cost_gp} GP</span>
                    <span class="v-rarity-${r.rarity}">${RARITY_LABELS[r.rarity] || r.rarity}</span>
                </div>
            </div>
            <div class="detail-panel" id="detail-${r.id}">
                ${buildDetailHTML(r)}
            </div>`;});content.innerHTML=html;}
function buildDetailHTML(recipe){let ingHTML='';recipe.ingredients.forEach(ing=>{const have=PAYLOAD.materials[ing.item]||0;const ok=have>=ing.qty;const icon=ok?'✅':'❌';ingHTML+=`<div class="ingredient-row">
                <span><span class="ing-status">${icon}</span> ${ing.item}</span>
                <span>${have}/${ing.qty}</span>
            </div>`;});const goldOk=PAYLOAD.gold>=recipe.cost_gp;const goldIcon=goldOk?'✅':'❌';return`
            <div class="detail-title">📋 ${recipe.name}</div>
            <div style="font-size:13px;color:var(--v-text-dim);margin-bottom:8px;">
                Resultado: <b>${recipe.output_qty}× ${recipe.output}</b>
            </div>
            <div style="font-size:12px;color:var(--v-text-dim);margin-bottom:10px;">
                <b>Ingredientes:</b>
            </div>
            ${ingHTML}
            <div class="gold-row">
                <span>${goldIcon} Custo</span>
                <span>${recipe.cost_gp} GP (você: ${PAYLOAD.gold} GP)</span>
            </div>
        `;}
function selectRecipeCard(recipeId){if(selectedRecipe===recipeId){selectedRecipe=null;}else{selectedRecipe=recipeId;}
document.querySelectorAll('.recipe-card').forEach(c=>{c.classList.toggle('selected',c.dataset.id===selectedRecipe);});document.querySelectorAll('.detail-panel').forEach(p=>{p.classList.toggle('visible',p.id===`detail-${selectedRecipe}`);});updateCraftButton();if(selectedRecipe){const detail=document.getElementById(`detail-${selectedRecipe}`);if(detail){setTimeout(()=>detail.scrollIntoView({behavior:'smooth',block:'nearest'}),100);}}}
function updateCraftButton(){const btn=document.getElementById('craftBtn');const container=document.getElementById('craftBtnContainer');if(!selectedRecipe){btn.className='craft-btn disabled';btn.disabled=true;btn.textContent='🔨 Selecione uma receita';return;}
const recipe=PAYLOAD.recipes.find(r=>r.id===selectedRecipe);if(!recipe)return;const ready=recipe.has_materials&&recipe.can_afford;if(ready){btn.className='craft-btn enabled';btn.disabled=false;btn.textContent=`🔨 Fabricar ${recipe.name}`;btn.onclick=()=>executeCraft(recipe.id);}else{btn.className='craft-btn disabled';btn.disabled=true;const missing=recipe.missing.length>0?`Falta: ${recipe.missing.join(', ')}`:`Ouro insuficiente`;btn.textContent=`❌ ${missing}`;}}
async function executeCraft(recipeId){const btn=document.getElementById('craftBtn');btn.disabled=true;btn.textContent='⏳ Fabricando...';btn.className='craft-btn disabled';const params=new URLSearchParams(window.location.search);const token=params.get('token')||'';const _apiBase=params.get('api')||'';const _apiUid=params.get('uid')||'';const payload={action:'craft_complete',recipe_id:recipeId,token:token};if(_apiBase&&token&&_apiUid){try{const _ch={'Content-Type':'application/json','Authorization':`Bearer ${token}`};if(tg?.initData)_ch['X-Telegram-Init-Data']=tg.initData;_ch['X-Idempotency-Key']=crypto.randomUUID();const _ac=new AbortController();const _tid=setTimeout(()=>_ac.abort(),15000);const resp=await fetch(`${_apiBase}/api/craft/apply`,{method:'POST',headers:_ch,signal:_ac.signal,body:JSON.stringify({user_id:parseInt(_apiUid),token,recipe_id:recipeId})});if(resp.ok){console.debug('[WORKSTATION] Craft submitted via API');setTimeout(()=>{try{tg?.close();}catch(e){console.warn('[WORKSTATION]',e);}},300);return;}
console.warn('[WORKSTATION] API returned',resp.status,'— falling back to sendData');}catch(e){console.warn('[WORKSTATION] API fetch failed — falling back to sendData',e);}}
if(tg){tg.sendData(JSON.stringify(payload));setTimeout(()=>{try{tg.close();}catch(e){console.warn('[WORKSTATION] tg.close:',e);}},300);}}
function renderMaterials(){const content=document.getElementById('mainContent');document.getElementById('craftBtnContainer').style.display='none';const mats=PAYLOAD.materials;const entries=Object.entries(mats).sort((a,b)=>a[0].localeCompare(b[0]));if(!entries.length){content.innerHTML='<div class="empty-state"><div class="icon">📦</div>'+'<p>Nenhum material no inventário.</p>'+'<p style="font-size:12px;margin-top:8px;">Colete materiais na Oficina ou durante explorações.</p></div>';return;}
let html='';entries.forEach(([name,qty])=>{html+=`<div class="material-row fade-in">
                <span>${name}</span>
                <span class="material-qty">×${qty}</span>
            </div>`;});content.innerHTML=html;}
init();if(typeof ValdoriaAudio!=='undefined')ValdoriaAudio.play('city');if(window._wsLoadingCtrl)window._wsLoadingCtrl.hide();