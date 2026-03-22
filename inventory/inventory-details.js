function buildLoadoutBar(){const ldout=D.ldout||{};const names=Object.keys(ldout);let html='<div style="display:flex;gap:4px;margin:6px 0;flex-wrap:wrap;align-items:center;">';html+=`<span class="btn-sell-junk" onclick="promptSaveLoadout()" style="border-color:var(--v-gold);">${vi('save', 13)} Salvar</span>`;names.forEach(n=>{html+=`<span class="btn-sell-junk" style="border-color:var(--v-text-dim);display:inline-flex;align-items:center;gap:2px;">
                <span onclick="doLoadLoadout('${esc(n)}')" style="cursor:pointer;">${vi('sword', 13)} ${n}</span>
                <span onclick="event.stopPropagation();doDeleteLoadout('${esc(n)}')" style="cursor:pointer;color:var(--v-danger);opacity:0.6;font-size:14px;padding:0 2px;">×</span>
            </span>`;});html+='</div>';return names.length>0||true?html:'';}
function promptSaveLoadout(){const ldout=D.ldout=D.ldout||{};if(Object.keys(ldout).length>=5){toast(`${vi('warn', 13)} Máximo 5 loadouts`,'err');return;}
showInputModal('Salvar Loadout','Nome do loadout',20,(name)=>{ldout[name]=Object.assign({},localEq);addOp({t:'save_loadout',name});haptic('medium');toast(`${vi('save', 13)} '${esc(name)}' salvo`,'ok');renderTab();updateBottomBar();});}
function showInputModal(title,placeholder,maxLen,onConfirm){const html=`<div class="modal-handle"></div>
            <div class="modal-title">${vi('save', 16)} ${title}</div>
            <div style="padding:0 4px;">
                <input type="text" id="inputModalField" placeholder="${placeholder}" maxlength="${maxLen}"
                    style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--v-border);border-radius:var(--v-radius);
                    background:var(--v-bg-card);color:var(--v-text-bright);font-size:14px;outline:none;"
                    oninput="document.getElementById('inputModalCount').textContent=this.value.length+'/${maxLen}'">
                <div id="inputModalCount" style="text-align:right;font-size:11px;color:var(--v-text-dim);margin-top:4px;">0/${maxLen}</div>
            </div>
            <div class="detail-actions" style="margin-top:8px;">
                <button class="btn-unequip" onclick="closeModal()">Cancelar</button>
                <button class="btn-equip" id="inputModalConfirm">Confirmar</button>
            </div>`;showModal(html);const field=document.getElementById('inputModalField');const btn=document.getElementById('inputModalConfirm');setTimeout(()=>field.focus(),100);btn.onclick=()=>{const val=field.value.trim().slice(0,maxLen);if(!val){hapticNotify('error');return;}
closeModal();onConfirm(val);};field.onkeydown=(e)=>{if(e.key==='Enter')btn.click();};}
function doLoadLoadout(name){const ldout=(D.ldout||{})[name];if(!ldout)return;_acDirty=true;const results={ok:[],noItem:[],noProf:[]};for(const[slot,itemName]of Object.entries(ldout)){if(!itemName)continue;const inv=localInv.find(i=>i.n===itemName&&i.q>0);if(!inv){results.noItem.push(itemName);continue;}
const it=getItemData(itemName);if(!it?.s){results.noItem.push(itemName);continue;}
if(!checkProficiency(it,'player',itemName)){results.noProf.push(itemName);continue;}
var oldItem=localEq[slot];if(oldItem&&oldItem!==itemName){addToLocalInv(oldItem);}
addOp({t:'equip',item:itemName,slot,tgt:'player'});localEq[slot]=itemName;removeFromLocalInv(itemName);results.ok.push(itemName);}
closeModal();haptic('medium');updateHeader();renderTab();updateBottomBar();const total=Object.values(ldout).filter(Boolean).length;_showLoadoutFeedback(name,results,total);}
function _showLoadoutFeedback(name,results,total){let html='<div class="modal-handle"></div>';html+='<div class="modal-title">'+vi('sword',16)+' Loadout \''+esc(name)+'\'</div>';html+='<div style="text-align:center;font-size:14px;margin-bottom:10px;">';html+='<b>'+results.ok.length+'</b> de <b>'+total+'</b> itens equipados</div>';if(results.ok.length>0){html+='<div style="font-size:12px;margin-bottom:6px;">';results.ok.forEach(function(n){var it=getItemData(n);html+='<div style="color:var(--v-success);">'+vi_f('check',12)+' '+(it.e||'')+' '+n+'</div>';});html+='</div>';}
if(results.noItem.length>0){html+='<div style="font-size:12px;margin-bottom:6px;">';results.noItem.forEach(function(n){var it=getItemData(n);html+='<div style="color:var(--v-danger);">'+vi('warn',12)+' '+(it.e||'')+' '+n+' — n\u00e3o encontrado</div>';});html+='</div>';}
if(results.noProf.length>0){html+='<div style="font-size:12px;margin-bottom:6px;">';results.noProf.forEach(function(n){var it=getItemData(n);html+='<div style="color:var(--v-warning);">'+vi('lock',12)+' '+(it.e||'')+' '+n+' — sem profici\u00eancia</div>';});html+='</div>';}
html+='<div class="detail-actions" style="margin-top:10px;">';html+='<button class="btn-equip" onclick="closeModal()">'+vi_f('check',13)+' OK</button>';html+='</div>';showModal(html);}
function doDeleteLoadout(name){if(!D.ldout||!D.ldout[name])return;delete D.ldout[name];addOp({t:'delete_loadout',name});haptic('medium');toast(`${vi('trash', 13)} Loadout '${esc(name)}' removido`,'ok');renderTab();updateBottomBar();}
function renderBankTab(c){if(!D.bank)D.bank={g:0,i:[]};var bankGold=D.bank.g||0;var bankItems=D.bank.i||[];var html='<div class="vault-header">'
+'<div class="vault-amount">'+vi('coin',22)+' '+bankGold+' GP</div>'
+'<div class="vault-sub">Cofre da Guilda</div>'
+'</div>';html+='<div style="display:flex;gap:6px;justify-content:center;margin:8px 0;">';if(localGold>=10){html+='<button class="btn-sell-junk" style="border-color:var(--v-gold-dim);" onclick="doBankGoldDeposit()">'
+vi('coin',12)+' Depositar 10 GP</button>';}
if(bankGold>=10){html+='<button class="btn-sell-junk" style="border-color:var(--v-success);" onclick="doBankGoldWithdraw()">'
+vi('coin',12)+' Sacar 10 GP</button>';}
html+='</div>';var depositableCount=_getDepositableItems().length;if(depositableCount>0){html+='<div style="text-align:right;margin-bottom:6px;">'
+'<span class="btn-sell-junk" style="border-color:var(--v-info);" onclick="doBankDepositAll()">'
+vi('vault',13)+' Guardar Tudo ('+depositableCount+')</span></div>';}
if(bankItems.length>0){html+='<div class="section-title">'+vi('bag',14)+' Itens Guardados ('+bankItems.length+')</div>';html+='<div class="item-grid">';bankItems.forEach(function(bi){var it=getItemData(bi.n);var emoji=it?(it.e||'\ud83d\udce6'):'\ud83d\udce6';var rarity=it?(it.r||'common'):'common';html+='<div class="item-card rarity-'+rarity+' fade-in" onclick="doBankWithdraw(\''+esc(bi.n)+'\')">'
+'<div class="ic-badges">'
+(bi.q>1?'<span class="ic-qty">x'+bi.q+'</span>':'')
+'</div>'
+'<div class="ic-emoji">'+emoji+'</div>'
+'<div class="ic-name v-rarity-'+rarity+'">'+esc(bi.n)+'</div>'
+'<div class="ic-meta">'+getItemShortDesc(bi.n,it||{})+'</div>'
+'</div>';});html+='</div>';}
var invEquippable=localInv.filter(function(inv){if(inv.q<=0)return false;if(isEquippedAnywhere(inv.n))return false;if(isLocked(inv.n))return false;var it=getItemData(inv.n);return it&&!(it.t||[]).includes('quest');});if(invEquippable.length>0){html+='<div class="section-title">'+vi('bag',14)+' Depositar da Mochila</div>';html+='<div class="item-grid">';invEquippable.forEach(function(inv){var it=getItemData(inv.n);var emoji=it?(it.e||'\ud83d\udce6'):'\ud83d\udce6';var rarity=it?(it.r||'common'):'common';html+='<div class="item-card rarity-'+rarity+' fade-in" onclick="doBankDeposit(\''+esc(inv.n)+'\')"'
+' style="opacity:0.7;">'
+'<div class="ic-badges">'
+(inv.q>1?'<span class="ic-qty">x'+inv.q+'</span>':'')
+'</div>'
+'<div class="ic-emoji">'+emoji+'</div>'
+'<div class="ic-name v-rarity-'+rarity+'">'+esc(inv.n)+'</div>'
+'<div class="ic-meta">Toque para guardar</div>'
+'</div>';});html+='</div>';}
if(bankItems.length===0&&bankGold===0&&invEquippable.length===0){html+='<div class="empty-state"><div class="icon">'+vi('vault',32)+'</div><p>Cofre vazio.</p></div>';}
c.innerHTML=html;}
function openItemDetail(name){if(typeof markItemViewed==='function')markItemViewed(name);const it=getItemData(name);const inv=localInv.find(i=>i.n===name);const qty=inv?inv.q:0;const rarity=it.r||'common';const tags=it.t||[];const rarColor=getRarityColor(rarity);let html='<div class="modal-handle"></div>';if(it.img){html+='<div style="text-align:center;margin-bottom:6px;">'
+'<img src="'+it.img+'" alt="" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid rgba(196,149,58,0.3);cursor:pointer;" onerror="this.style.display=\'none\'" onclick="event.stopPropagation();showItemImage(\''+esc(name)+'\')">'
+'</div>';}
html+=`<div class="modal-title">${it.e || '📦'} ${esc(name)}</div>`;html+=`<div style="text-align:center;margin-bottom:10px;">
            <span class="detail-rarity-badge" style="background:${rarColor}22;color:${rarColor};border:1px solid ${rarColor}44;">
                ${getRarityLabel(rarity)}
            </span></div>`;if(it.desc)html+=`<div class="detail-desc">"${it.desc}"</div>`;if(it.s)html+=detailRow('Slot',SLOT_NAMES[it.s]||it.s);if(it.dd){let dmgStr=it.dd+(it.b?` +${it.b}`:'');if(it.dt)dmgStr+=` (${it.dt})`;html+=detailRow('Dano',dmgStr,it.b?'bonus':'');}
if(it.vd)html+=detailRow('Versátil',it.vd);if(it.ac)html+=detailRow('CA',`+${it.ac}`,'bonus');if(it.hb)html+=detailRow('HP Bônus',`+${it.hb}`,'bonus');if(it.mb)html+=detailRow('MP Bônus',`+${it.mb}`,'bonus');if(it.ib)html+=detailRow('INT Bônus',`+${it.ib}`,'bonus');if(it.sb)html+=detailRow('Bônus de Salvaguarda',`+${it.sb}`,'bonus');if(it.sk)html+=detailRow('Engastes',`${it.sk} ${vi('gem', 13)}`);if(it.sr)html+=detailRow('Força Req.',it.sr);if(it.th)html+=detailRow('Duas Mãos','Sim');if(it.heal){const avg=avgDice(it.heal);const m=(it.heal||'').match(/(\d+)d(\d+)\+?(\d+)?/);const lo=m?parseInt(m[1])+parseInt(m[3]||0):avg;const hi=m?parseInt(m[1])*parseInt(m[2])+parseInt(m[3]||0):avg;const preview=Math.min(D.p.mhp,localHP+avg)-localHP;html+=detailRow('Cura',`${it.heal} (${lo}–${hi})`);if(preview>0)html+=detailRow('Preview',`${vi('heart', 12)} ${localHP} → ~${localHP + preview}`,'bonus');}
if(it.v)html+=detailRow('Valor',`${it.v} GP`);if(qty>1)html+=detailRow('Quantidade',`x${qty}`);if(it.gb){let parts=[];if(it.gb.hp_bonus)parts.push(`+${it.gb.hp_bonus} HP`);if(it.gb.mp_bonus)parts.push(`+${it.gb.mp_bonus} MP`);if(it.gb.ac_bonus)parts.push(`+${it.gb.ac_bonus} CA`);if(it.gb.save_bonus)parts.push(`+${it.gb.save_bonus} Salv.`);if(parts.length)html+=detailRow('Bônus Gema',parts.join(', '),'bonus');}
if(it.re){html+=detailRow('Runa',`${it.re.tr}: ${it.re.ch}% ${it.re.ef}`);}
if(it.si&&D.sets&&D.sets[it.si]){const sdef=D.sets[it.si];const owned=sdef.pcs.filter(p=>Object.values(localEq).includes(p)||localInv.some(i=>i.n===p&&i.q>0)).length;html+=detailRow('Conjunto',`${sdef.i} ${sdef.n} (${owned}/${sdef.pcs.length})`);}
if(tags.length){html+='<div class="detail-tags">';tags.slice(0,8).forEach(t=>{html+=`<span class="detail-tag">${TAG_LABELS[t] || t}</span>`;});html+='</div>';}
if(it.s){const slot=resolveSlot(it);const eq=activeTarget==='player'?localEq:(localAllyEq[activeTarget]||{});const currentItem=eq[slot];if(currentItem===name){html+=`<div style="margin-top:8px;padding:8px;background:var(--v-bg-card);border-radius:var(--v-radius);font-size:12px;text-align:center;">
                    <span style="color:var(--v-success);">${vi_f('check', 13)} Equipado neste slot</span>
                </div>`;}else{html+=_buildComparisonPanel(it,currentItem,slot);}}
html+='<div class="detail-actions">';const favIcon=isFav(name)?vi_f('star',16):vi('star',16);html+=`<button class="btn-unequip" onclick="doToggleFav('${esc(name)}');openItemDetail('${esc(name)}')"
            style="flex:0 0 44px;padding:10px;">${favIcon}</button>`;const lockIcon=isLocked(name)?vi('lock',16):vi('unlock',16);const lockCls=isLocked(name)?'border-color:var(--v-gold-dim)!important;color:var(--v-gold);':'';html+=`<button class="btn-unequip" onclick="doToggleLock('${esc(name)}');openItemDetail('${esc(name)}')"
            style="flex:0 0 44px;padding:10px;${lockCls}">${lockIcon}</button>`;if(it.s){html+='<button class="btn-unequip" onclick="showCompareWith(\''+esc(name)+'\')" style="flex:0 0 auto;padding:10px 12px;font-size:12px;">'
+vi('sword',12)+' vs</button>';}
if(it.s&&!isProtected(tags)){const canEquip=checkProficiency(it,activeTarget,name);if(canEquip){html+=`<button class="btn-equip" onclick="showEquipConfirm('${esc(name)}')">${vi('sword', 13)} Equipar</button>`;}else{html+=`<button class="btn-disabled" disabled>${vi('lock', 13)} Sem proficiência</button>`;}}
if(isConsumable(tags)&&qty>0){const isCamping=tags.includes('camping');const isFood=tags.includes('food');const isPotion=tags.includes('potion');const hasAllies=D.allies&&D.allies.length>0;if(isCamping){html+=`<button class="btn-use" onclick="showCampConfirm('${esc(name)}')">${vi('tent', 13)} Acampar ▸</button>`;}else if((isFood||isPotion)&&hasAllies){html+=`<button class="btn-use" onclick="showTargetPicker('${esc(name)}')">${vi('flask', 13)} Usar ▸</button>`;}else{html+=`<button class="btn-use" onclick="showUseConfirm('${esc(name)}')">${vi('flask', 13)} Usar</button>`;}}
if(canSell(it,tags)&&qty>0&&!isEquippedAnywhere(name)&&!isLocked(name)){const sellPrice=Math.max(1,Math.floor((it.v||1)*0.5));html+=`<button class="btn-sell" onclick="showSellConfirm('${esc(name)}',${sellPrice})">${vi('coin', 13)} ${sellPrice}gp</button>`;}
if(canDiscard(it,tags)&&qty>0&&!isEquippedAnywhere(name)&&!isLocked(name)){html+=`<button class="btn-discard" onclick="showDiscardConfirm('${esc(name)}')" style="flex:0 0 44px;padding:10px;">${vi('trash', 14)}</button>`;}
html+='</div>';showModal(html);}
function _buildComparisonPanel(newIt,currentItemName,slot){const curIt=currentItemName?getItemData(currentItemName):null;const stats=[{key:'ac',label:'CA',icon:'shield'},{key:'b',label:'ATK',icon:'sword'},{key:'hb',label:'HP',icon:'heart'},{key:'mb',label:'MP',icon:'orb'},];let newDmg=0,curDmg=0;if(newIt.dd){const m=newIt.dd.match(/(\d+)d(\d+)/);if(m)newDmg=parseInt(m[1])*(parseInt(m[2])+1)/2;}
if(curIt&&curIt.dd){const m=curIt.dd.match(/(\d+)d(\d+)/);if(m)curDmg=parseInt(m[1])*(parseInt(m[2])+1)/2;}
const showDmg=newDmg>0||curDmg>0;let totalDelta=0;let rows='';stats.forEach(s=>{const nv=newIt[s.key]||0;const cv=curIt?(curIt[s.key]||0):0;const d=nv-cv;if(nv===0&&cv===0)return;totalDelta+=d;const cls=d>0?'cp-up':d<0?'cp-down':'cp-same';const sign=d>0?'+':'';rows+=`<div class="cp-row">
            <span class="cp-label">${vi(s.icon, 12)} ${s.label}</span>
            <span class="cp-cur">${cv}</span>
            <span class="cp-arrow">→</span>
            <span class="cp-new ${cls}">${nv}</span>
            <span class="cp-delta ${cls}">${d !== 0 ? sign + d : '—'}</span>
        </div>`;});if(showDmg){const d=Math.round((newDmg+(newIt.b||0))-(curDmg+(curIt?curIt.b||0:0)));totalDelta+=d;const cls=d>0?'cp-up':d<0?'cp-down':'cp-same';const sign=d>0?'+':'';const nvStr=newDmg>0?newIt.dd+(newIt.b?'+'+newIt.b:''):'—';const cvStr=curDmg>0?curIt.dd+(curIt.b?'+'+curIt.b:''):'—';rows+=`<div class="cp-row">
            <span class="cp-label">${vi('target', 12)} Dano</span>
            <span class="cp-cur">${cvStr}</span>
            <span class="cp-arrow">→</span>
            <span class="cp-new ${cls}">${nvStr}</span>
            <span class="cp-delta ${cls}">${d !== 0 ? sign + d : '—'}</span>
        </div>`;}
if(!rows)return'';const summaryClass=totalDelta>0?'cp-up':totalDelta<0?'cp-down':'cp-same';const summarySign=totalDelta>0?'+':'';const summaryText=totalDelta>0?'Melhoria':totalDelta<0?'Perda':'Equivalente';const vsLabel=currentItemName?`vs ${currentItemName}`:'Slot vazio';return`<div class="comparison-panel">
        <div class="cp-header">
            <span class="cp-title">${vi('sword', 13)} Comparação</span>
            <span class="cp-vs">${vsLabel}</span>
        </div>
        ${rows}
        <div class="cp-summary ${summaryClass}">
            ${summaryText}: <b>${summarySign}${totalDelta}</b>
        </div>
    </div>`;}
function detailRow(label,val,cls){const valClass=cls?`detail-val ${cls}`:'detail-val';return`<div class="detail-row"><span class="detail-label">${label}</span><span class="${valClass}">${val}</span></div>`;}
function openSlotModal(slot){const eq=activeTarget==='player'?localEq:(localAllyEq[activeTarget]||{});const item=eq[slot]||null;const it=item?getItemData(item):null;let html='<div class="modal-handle"></div>';html+=`<div class="modal-title">${SLOT_NAMES[slot] || slot}</div>`;if(item){const rarity=it?.r||'common';const rarColor=getRarityColor(rarity);html+=`<div style="text-align:center;font-size:18px;margin-bottom:4px;">${it?.e || '📦'}</div>`;html+=`<div style="text-align:center;font-size:14px;font-weight:600;margin-bottom:2px;" class="v-rarity-${rarity}">${item}</div>`;html+=`<div style="text-align:center;margin-bottom:6px;">
                <span class="detail-rarity-badge" style="background:${rarColor}22;color:${rarColor};border:1px solid ${rarColor}44;font-size:10px;">
                    ${getRarityLabel(rarity)}
                </span></div>`;if(it?.dd)html+=`<div style="text-align:center;font-size:12px;color:var(--v-text-dim);">Dano: ${it.dd}${it.b ? ' +' + it.b : ''}</div>`;if(it?.ac)html+=`<div style="text-align:center;font-size:12px;color:var(--v-text-dim);">CA: +${it.ac}</div>`;if(it?.hb)html+=`<div style="text-align:center;font-size:12px;color:var(--v-text-dim);">HP: +${it.hb}</div>`;if(it?.mb)html+=`<div style="text-align:center;font-size:12px;color:var(--v-text-dim);">MP: +${it.mb}</div>`;if(it?.sp)html+=`<div style="text-align:center;font-size:11px;color:#ef5350;">${vi('stealth', 12)} Desvantagem em Furtividade</div>`;if(activeTarget==='player'){const sockets=it?.sk||0;if(sockets>0){html+=`<div class="section-title">${vi('gem', 14)} Gemas</div>`;html+='<div class="gem-grid">';const gems=localGems[slot]||[];for(let i=0;i<sockets;i++){const gem=gems[i]||null;const gemData=gem?getItemData(gem):null;const filled=gem?'filled':'';const icon=gem?(gemData?.e||'💎'):'+';html+=`<div class="gem-socket ${filled}" onclick="gemAction('${slot}',${i},'${esc(gem || '')}')"
                            title="${gem || 'Vazio'}">${icon}</div>`;}
html+='</div>';const gemsInSlot=localGems[slot]||[];const gemNames=gemsInSlot.filter(Boolean);if(gemNames.length){html+=`<div style="text-align:center;font-size:11px;color:var(--v-text-dim);margin-top:4px;">
                            ${gemNames.join(' · ')}</div>`;}
if(gemNames.length>1){html+=`<div style="text-align:center;margin-top:6px;">
                            <button class="btn-unequip" style="font-size:11px;padding:4px 12px;"
                                onclick="doExtractAllGems('${slot}')">${vi('gem', 12)} Extrair Todas (${gemNames.length})</button>
                        </div>`;}}
if(RUNE_ELIGIBLE.has(slot)){html+=`<div class="section-title">${vi('orb', 14)} Runa</div>`;const rune=localRunes[slot]||null;if(rune){const runeData=getItemData(rune);html+=`<div class="rune-slot filled" onclick="runeAction('${slot}')">
                            <div style="font-size:16px;">${runeData?.e || '🔮'} ${rune}</div>
                            <div style="font-size:11px;color:var(--v-text-dim);margin-top:2px;">Toque para substituir</div>
                        </div>`;}else{html+=`<div class="rune-slot" onclick="runeAction('${slot}')">
                            <div style="font-size:14px;color:var(--v-text-dim);">+ Inscrever Runa</div>
                        </div>`;}}}
html+=`<div class="detail-actions" style="margin-top:14px;">
                <button class="btn-unequip" onclick="doUnequip('${slot}')">${vi('bag', 13)} Desequipar</button>
            </div>`;}else{html+='<div style="text-align:center;color:var(--v-text-dim);padding:12px;">Slot vazio</div>';}
html+=`<div class="section-title">${vi('bag', 14)} Itens Compatíveis</div>`;const compatItems=getCompatibleItems(slot);if(compatItems.length===0){html+='<div style="font-size:12px;color:var(--v-text-dim);text-align:center;">Nenhum item compatível no inventário.</div>';}else{const withDelta=compatItems.map(ci=>{const cit=getItemData(ci.name);const{cls:compCls,delta,score}=compareItemsDetailed(cit,it,slot);return{ci,cit,compCls,delta,score:score||0};});withDelta.sort((a,b)=>b.score-a.score);html+='<div class="compat-quick-grid">';withDelta.forEach(({ci,cit,compCls,score})=>{const arrow=compCls==='better'?'<span class="cq-badge cq-up">▲</span>':compCls==='worse'?'<span class="cq-badge cq-down">▼</span>':'';const rarity=cit?.r||'common';html+=`<div class="cq-item rarity-${rarity}" onclick="doEquip('${esc(ci.name)}','${slot}')">
                    ${arrow}
                    <div class="cq-emoji">${cit?.e || '📦'}</div>
                    <div class="cq-name v-rarity-${rarity}">${ci.name}</div>
                </div>`;});html+='</div>';}
showModal(html);}
function gemAction(slot,idx,currentGem){if(currentGem){const confirmHtml=`<div class="modal-handle"></div>
                <div class="modal-title">${vi('gem', 16)} Remover Gema?</div>
                <div style="text-align:center;font-size:13px;color:var(--v-text-dim);margin-bottom:12px;">
                    Remover <b style="color:var(--v-text-bright)">${currentGem}</b> do socket?
                </div>
                <div class="detail-actions">
                    <button class="btn-unequip" onclick="openSlotModal('${slot}')">Cancelar</button>
                    <button class="btn-equip" onclick="doGemRemove('${slot}',${idx},'${esc(currentGem)}')">Remover</button>
                </div>`;showModal(confirmHtml);}else{showGemSelect(slot,idx);}}
function doGemRemove(slot,idx,gemName){_acDirty=true;addOp({t:'gem_remove',slot,idx});const gems=localGems[slot]||[];gems[idx]=null;localGems[slot]=gems;addToLocalInv(gemName);haptic('medium');toast(`${vi('gem', 13)} ${esc(gemName)} removida`,'ok');openSlotModal(slot);}
function showGemSelect(slot,idx){const gems=localInv.filter(i=>{const it=getItemData(i.n);return it&&(it.t||[]).some(t=>t==='gem'||t==='socketable');});let html='<div class="modal-handle"></div>';html+=`<div class="modal-title">${vi('gem', 16)} Selecionar Gema</div>`;if(!gems.length){html+='<div style="text-align:center;color:var(--v-text-dim);">Nenhuma gema disponível.</div>';}else{gems.forEach(g=>{const it=getItemData(g.n);let desc='';if(it.gb){let parts=[];if(it.gb.hp_bonus)parts.push(`+${it.gb.hp_bonus} HP`);if(it.gb.mp_bonus)parts.push(`+${it.gb.mp_bonus} MP`);if(it.gb.ac_bonus)parts.push(`+${it.gb.ac_bonus} CA`);if(it.gb.save_bonus)parts.push(`+${it.gb.save_bonus} Salv.`);desc=parts.join(' · ');}
const tierBadge=it.gt?`<span style="font-size:10px;color:var(--v-text-dim);"> T${it.gt}</span>`:'';html+=`<div class="select-item" onclick="doGemInsert('${slot}',${idx},'${esc(g.n)}')">
                    <span class="si-emoji">${it.e || '💎'}</span>
                    <div><div class="si-name">${g.n}${tierBadge}</div>
                    <div class="si-desc">${desc}</div></div>
                </div>`;});}
html+=`<div class="detail-actions" style="margin-top:12px;">
            <button class="btn-unequip" onclick="openSlotModal('${slot}')">← Voltar</button>
        </div>`;showModal(html);}
function doGemInsert(slot,idx,gemName){_acDirty=true;addOp({t:'gem_insert',slot,gem:gemName,idx});const sockets=(getItemData(localEq[slot])||{}).sk||0;if(!localGems[slot])localGems[slot]=Array(sockets).fill(null);localGems[slot][idx]=gemName;removeFromLocalInv(gemName);haptic('medium');toast(`${vi('gem', 13)} ${esc(gemName)} encaixada`,'ok');openSlotModal(slot);}
function runeAction(slot){showRuneSelect(slot);}
function showRuneSelect(slot){const currentRune=localRunes[slot]||null;const runes=localInv.filter(i=>{const it=getItemData(i.n);return it&&(it.t||[]).includes('rune');});let html='<div class="modal-handle"></div>';html+=`<div class="modal-title">${vi('orb', 16)} Inscrever Runa</div>`;if(currentRune){html+=`<div style="background:var(--v-bg-card);border:1px solid var(--v-warning);border-radius:var(--v-radius);padding:10px;margin-bottom:10px;font-size:12px;color:var(--v-warning);text-align:center;">
                ${vi('warn', 13)} Runa atual (${currentRune}) será <b>destruída</b> ao inscrever outra.
            </div>`;}
if(!runes.length){html+='<div style="text-align:center;color:var(--v-text-dim);">Nenhuma runa disponível.</div>';}else{runes.forEach(r=>{const it=getItemData(r.n);let desc='';if(it.re)desc=`${it.re.tr}: ${it.re.ch}% ${it.re.ef}`;const tierBadge=it.rt?`<span style="font-size:10px;color:var(--v-text-dim);"> T${it.rt}</span>`:'';html+=`<div class="select-item" onclick="doRuneInscribe('${slot}','${esc(r.n)}')">
                    <span class="si-emoji">${it.e || '🔮'}</span>
                    <div><div class="si-name">${r.n}${tierBadge}</div>
                    <div class="si-desc">${desc}</div></div>
                </div>`;});}
if(D.frags){const tierNames={1:'Menor',2:'Maior',3:'Ancestral'};let hasFrags=false;for(const[t,cnt]of Object.entries(D.frags)){if(cnt>=3){hasFrags=true;break;}}
if(hasFrags){html+=`<div class="section-title" style="margin-top:10px;">${vi('hammer', 14)} Forjar Runa</div>`;for(const[t,cnt]of Object.entries(D.frags)){if(cnt>=3){html+=`<button class="btn-equip" style="width:100%;margin-bottom:4px;font-size:11px;padding:6px;" onclick="doRuneCraft(${t},'${slot}')">${vi('hammer', 12)} Forjar T${t} ${tierNames[t] || ''} (${cnt}/3)</button>`;}else if(cnt>0){html+=`<div style="font-size:11px;color:var(--v-text-dim);text-align:center;margin-bottom:4px;">T${t} ${tierNames[t] || ''}: ${cnt}/3 fragmentos</div>`;}}}}
html+=`<div class="detail-actions" style="margin-top:12px;">
            <button class="btn-unequip" onclick="openSlotModal('${slot}')">← Voltar</button>
        </div>`;showModal(html);}
function doRuneCraft(tier,slot){addOp({t:'rune_craft',tier:tier});if(D.frags&&D.frags[String(tier)]){D.frags[String(tier)]-=3;if(D.frags[String(tier)]<=0)delete D.frags[String(tier)];}
closeModal();haptic('heavy');toast(`${vi('hammer', 13)} Runa forjada! Confirme para aplicar.`,'ok');updateHeader();renderTab();updateBottomBar();}
function doRuneInscribe(slot,runeName){const oldRune=localRunes[slot];if(oldRune){const html=`<div class="modal-handle"></div>
                <div class="modal-title">⚠️ Ação Irreversível</div>
                <div style="text-align:center;padding:10px 8px;font-size:13px;border:1px solid var(--v-danger);border-radius:var(--v-radius);background:rgba(229,57,53,0.08);margin-bottom:8px;">
                    <div style="font-size:15px;margin-bottom:6px;">⚠️</div>
                    <div style="color:var(--v-text);">A runa <b style="color:var(--v-text-bright);">${esc(oldRune)}</b> será <b style="color:var(--v-danger);">DESTRUÍDA</b> permanentemente.</div>
                    <div style="color:var(--v-text-dim);font-size:12px;margin-top:4px;">Esta ação <b>NÃO</b> pode ser desfeita.</div>
                </div>
                <div class="detail-actions">
                    <button class="btn-unequip" onclick="showRuneSelect('${slot}')">Cancelar</button>
                    <button style="background:var(--v-danger);color:#fff;border:none;border-radius:8px;padding:10px 16px;font-size:13px;cursor:pointer;" onclick="_confirmRuneInscribe('${slot}','${esc(runeName)}')">🔥 Destruir e Inscrever</button>
                </div>`;showModal(html);hapticNotify('warning');return;}
_confirmRuneInscribe(slot,runeName);}
function _confirmRuneInscribe(slot,runeName){_acDirty=true;addOp({t:'rune_inscribe',slot,rune:runeName});localRunes[slot]=runeName;removeFromLocalInv(runeName);haptic('heavy');toast(`${vi('orb', 13)} ${esc(runeName)} inscrita`,'ok');openSlotModal(slot);}
var _GEM_UPGRADE_FALLBACK={'Turquesa':'Ametista','Quartzo':'Jade','\u00d4nix':'P\u00e9rola','Ametista':'Rubi','Jade':'Safira','P\u00e9rola':'Esmeralda'};var GEM_UPGRADE_MAP=(D&&D.gfm)?D.gfm:_GEM_UPGRADE_FALLBACK;var GEM_UPGRADE_COST=3;function getGemFusions(){var gemCounts={};localInv.forEach(function(inv){if(inv.q<=0)return;var it=getItemData(inv.n);if(!it||!(it.t||[]).some(function(t){return t==='gem'||t==='socketable';}))return;if(!GEM_UPGRADE_MAP[inv.n])return;gemCounts[inv.n]=(gemCounts[inv.n]||0)+inv.q;});var fusions=[];for(var gem in gemCounts){if(gemCounts[gem]>=GEM_UPGRADE_COST){fusions.push({from:gem,to:GEM_UPGRADE_MAP[gem],count:gemCounts[gem]});}}
return fusions;}
function showGemFusionModal(){var fusions=getGemFusions();var html='<div class="modal-handle"></div>';html+='<div class="modal-title">'+vi('gem',16)+' Fundir Gemas</div>';html+='<div style="text-align:center;font-size:12px;color:var(--v-text-dim);margin-bottom:10px;">Combine 3 gemas iguais para criar uma gema superior.</div>';if(!fusions.length){html+='<div style="text-align:center;color:var(--v-text-dim);font-size:12px;padding:16px;">Nenhuma fus\u00e3o dispon\u00edvel. Precisa de 3+ gemas iguais.</div>';}else{fusions.forEach(function(f){var fromIt=getItemData(f.from);var toIt=getItemData(f.to);var fromEmoji=fromIt?fromIt.e||'':'';var toEmoji=toIt?toIt.e||'':'';var fromTier=fromIt?(fromIt.gt||1):1;var toTier=toIt?(toIt.gt||2):2;var times=Math.floor(f.count/GEM_UPGRADE_COST);html+='<div class="select-item" onclick="doGemFusion(\''+esc(f.from)+'\',\''+esc(f.to)+'\')" style="border-color:var(--v-gold-dim);">';html+='<span class="si-emoji">'+fromEmoji+'</span>';html+='<div style="flex:1;">';html+='<div class="si-name">'+GEM_UPGRADE_COST+'\u00d7 '+f.from+' <span style="font-size:10px;color:var(--v-text-dim);">T'+fromTier+'</span></div>';html+='<div class="si-desc" style="color:var(--v-success);">\u2192 '+toEmoji+' '+f.to+' <span style="font-size:10px;">T'+toTier+'</span>';if(times>1)html+=' <span style="opacity:0.7;">(at\u00e9 '+times+'x)</span>';html+='</div></div></div>';});}
var gemInv=localInv.filter(function(inv){if(inv.q<=0)return false;var it=getItemData(inv.n);return it&&(it.t||[]).some(function(t){return t==='gem'||t==='socketable';});});if(gemInv.length>0){html+='<div style="margin-top:10px;font-size:11px;color:var(--v-text-dim);text-align:center;">';gemInv.forEach(function(inv){var it=getItemData(inv.n);html+=(it?it.e||'':'')+' '+inv.n+' x'+inv.q+'&nbsp;&nbsp;';});html+='</div>';}
html+='<div class="detail-actions" style="margin-top:10px;">';html+='<button class="btn-unequip" onclick="closeModal()">Fechar</button>';html+='</div>';showModal(html);}
function doGemFusion(fromGem,toGem){var inv=localInv.find(function(i){return i.n===fromGem;});if(!inv||inv.q<GEM_UPGRADE_COST){toast(vi('warn',13)+' Gemas insuficientes!','warn');return;}
inv.q-=GEM_UPGRADE_COST;if(inv.q<=0)localInv=localInv.filter(function(i){return i.n!==fromGem;});addToLocalInv(toGem);addOp({t:'gem_upgrade',gem:fromGem,result:toGem});haptic('heavy');var toIt=getItemData(toGem);toast(vi('gem',13)+' '+fromGem+' \u00d73 \u2192 '+(toIt?toIt.e||'':'')+' '+toGem+'!','ok');updateHeader();renderTab();updateBottomBar();setTimeout(function(){showGemFusionModal();},300);}
function showCompareWith(itemA){var itA=getItemData(itemA);if(!itA||!itA.s)return;var slot=itA.s;var candidates=localInv.filter(function(inv){if(inv.q<=0||inv.n===itemA)return false;var it=getItemData(inv.n);if(!it||!it.s)return false;if(it.s===slot)return true;if(slot==='ring'&&(it.s==='ring_1'||it.s==='ring_2'))return true;if((slot==='ring_1'||slot==='ring_2')&&it.s==='ring')return true;return false;});var eq=activeTarget==='player'?localEq:(localAllyEq[activeTarget]||{});var eqSlot=itA.s==='ring'?'ring_1':itA.s;var eqItem=eq[eqSlot];if(eqItem&&eqItem!==itemA){var already=candidates.some(function(c){return c.n===eqItem;});if(!already)candidates.unshift({n:eqItem,q:1,_eq:true});}
var html='<div class="modal-handle"></div>';html+='<div class="modal-title">'+vi('sword',16)+' Comparar com...</div>';html+='<div style="text-align:center;font-size:13px;color:var(--v-text-dim);margin-bottom:10px;">'
+(itA.e||'')+' <b>'+itemA+'</b></div>';if(!candidates.length){html+='<div style="text-align:center;color:var(--v-text-dim);font-size:12px;">Nenhum item compar\u00e1vel no invent\u00e1rio.</div>';}else{candidates.forEach(function(ci){var cit=getItemData(ci.n);var rarity=cit?(cit.r||'common'):'common';var eqBadge=ci._eq?'<span style="font-size:10px;color:var(--v-gold);margin-left:4px;">(Equipado)</span>':'';html+='<div class="select-item" onclick="showABComparison(\''+esc(itemA)+'\',\''+esc(ci.n)+'\')">'
+'<span class="si-emoji">'+(cit?cit.e||'':'')+'</span>'
+'<div><div class="si-name v-rarity-'+rarity+'">'+ci.n+eqBadge+'</div>'
+'<div class="si-desc">'+getItemShortDesc(ci.n,cit||{})+'</div></div>'
+'</div>';});}
html+='<div class="detail-actions" style="margin-top:10px;">';html+='<button class="btn-unequip" onclick="openItemDetail(\''+esc(itemA)+'\')">'+vi('bag',13)+' Voltar</button>';html+='</div>';showModal(html);}
function showABComparison(nameA,nameB){var itA=getItemData(nameA);var itB=getItemData(nameB);var slot=(itA.s==='ring')?'ring_1':itA.s;var html='<div class="modal-handle"></div>';html+='<div class="modal-title">'+vi('sword',16)+' Compara\u00e7\u00e3o</div>';html+='<div style="display:flex;gap:8px;margin-bottom:12px;">';html+='<div style="flex:1;text-align:center;padding:8px;background:var(--v-bg-card);border-radius:var(--v-radius);border:1px solid var(--v-border);">';html+='<div style="font-size:20px;">'+(itA.e||'')+'</div>';html+='<div class="v-rarity-'+(itA.r||'common')+'" style="font-size:12px;font-weight:600;">'+nameA+'</div>';html+='</div>';html+='<div style="display:flex;align-items:center;color:var(--v-text-dim);font-size:14px;font-weight:700;">VS</div>';html+='<div style="flex:1;text-align:center;padding:8px;background:var(--v-bg-card);border-radius:var(--v-radius);border:1px solid var(--v-border);">';html+='<div style="font-size:20px;">'+(itB.e||'')+'</div>';html+='<div class="v-rarity-'+(itB.r||'common')+'" style="font-size:12px;font-weight:600;">'+nameB+'</div>';html+='</div></div>';html+=_buildABPanel(itA,itB,slot);html+='<div class="detail-actions" style="margin-top:10px;">';html+='<button class="btn-unequip" onclick="showCompareWith(\''+esc(nameA)+'\')">'+vi('bag',13)+' Voltar</button>';html+='<button class="btn-equip" onclick="closeModal()">OK</button>';html+='</div>';showModal(html);}
function _buildABPanel(itA,itB,slot){var stats=[{key:'ac',label:'CA',icon:'shield'},{key:'b',label:'ATK',icon:'sword'},{key:'hb',label:'HP',icon:'heart'},{key:'mb',label:'MP',icon:'orb'},];var rows='';var totalDelta=0;stats.forEach(function(s){var va=itA[s.key]||0;var vb=itB[s.key]||0;var d=va-vb;if(va===0&&vb===0)return;totalDelta+=d;var cls=d>0?'cp-up':d<0?'cp-down':'cp-same';var sign=d>0?'+':'';rows+='<div class="cp-row">'
+'<span class="cp-label">'+vi(s.icon,12)+' '+s.label+'</span>'
+'<span class="cp-cur">'+va+'</span>'
+'<span class="cp-arrow">vs</span>'
+'<span class="cp-new">'+vb+'</span>'
+'<span class="cp-delta '+cls+'">'+(d!==0?sign+d:'\u2014')+'</span>'
+'</div>';});var dmgA=0,dmgB=0;if(itA.dd){var m=itA.dd.match(/(\d+)d(\d+)/);if(m)dmgA=parseInt(m[1])*(parseInt(m[2])+1)/2;}
if(itB.dd){var m=itB.dd.match(/(\d+)d(\d+)/);if(m)dmgB=parseInt(m[1])*(parseInt(m[2])+1)/2;}
if(dmgA>0||dmgB>0){var d=Math.round((dmgA+(itA.b||0))-(dmgB+(itB.b||0)));totalDelta+=d;var cls=d>0?'cp-up':d<0?'cp-down':'cp-same';var sign=d>0?'+':'';rows+='<div class="cp-row">'
+'<span class="cp-label">'+vi('target',12)+' Dano</span>'
+'<span class="cp-cur">'+(dmgA>0?itA.dd:'\u2014')+'</span>'
+'<span class="cp-arrow">vs</span>'
+'<span class="cp-new">'+(dmgB>0?itB.dd:'\u2014')+'</span>'
+'<span class="cp-delta '+cls+'">'+(d!==0?sign+d:'\u2014')+'</span>'
+'</div>';}
if(!rows)return'<div style="text-align:center;color:var(--v-text-dim);font-size:12px;">Sem stats compar\u00e1veis.</div>';var sumCls=totalDelta>0?'cp-up':totalDelta<0?'cp-down':'cp-same';var sumText=totalDelta>0?'A \u00e9 melhor':totalDelta<0?'B \u00e9 melhor':'Equivalentes';var sumSign=totalDelta>0?'+':'';return'<div class="comparison-panel"><div class="cp-header"><span class="cp-title">'
+vi('sword',13)+' A</span><span class="cp-vs">B</span></div>'
+rows
+'<div class="cp-summary '+sumCls+'">'+sumText+': <b>'+sumSign+totalDelta+'</b></div></div>';}
function _getDepositableItems(){return localInv.filter(function(inv){if(inv.q<=0)return false;if(isEquippedAnywhere(inv.n))return false;if(isLocked(inv.n))return false;if(isFav(inv.n))return false;var it=getItemData(inv.n);if(!it)return false;if((it.t||[]).includes('quest'))return false;if((it.t||[]).includes('potion'))return false;if((it.t||[]).includes('consumable'))return false;return true;});}
function doBankDeposit(name){removeFromLocalInv(name);if(!D.bank)D.bank={g:0,i:[]};if(!D.bank.i)D.bank.i=[];var existing=D.bank.i.find(function(bi){return bi.n===name;});if(existing){existing.q++;}
else{D.bank.i.push({n:name,q:1});}
addOp({t:'deposit',item:name});haptic('medium');toast(vi('vault',13)+' '+name+' guardado no cofre','ok');updateHeader();renderTab();updateBottomBar();}
function doBankWithdraw(name){if(!D.bank||!D.bank.i)return;var bi=D.bank.i.find(function(b){return b.n===name;});if(!bi||bi.q<=0)return;bi.q--;if(bi.q<=0)D.bank.i=D.bank.i.filter(function(b){return b.n!==name;});addToLocalInv(name);addOp({t:'withdraw',item:name});haptic('medium');toast(vi('bag',13)+' '+name+' retirado do cofre','ok');updateHeader();renderTab();updateBottomBar();}
function doBankDepositAll(){var items=_getDepositableItems();if(!items.length)return;if(!D.bank)D.bank={g:0,i:[]};if(!D.bank.i)D.bank.i=[];var count=0;items.forEach(function(inv){for(var i=0;i<inv.q;i++){var existing=D.bank.i.find(function(bi){return bi.n===inv.n;});if(existing){existing.q++;}
else{D.bank.i.push({n:inv.n,q:1});}
addOp({t:'deposit',item:inv.n});count++;}});items.forEach(function(inv){localInv=localInv.filter(function(i){return i.n!==inv.n;});});haptic('heavy');toast(vi('vault',13)+' '+count+' itens guardados no cofre','ok');updateHeader();renderTab();updateBottomBar();}
function doBankGoldDeposit(){var amount=10;if(localGold<amount)return;localGold-=amount;D.bank.g=(D.bank.g||0)+amount;addOp({t:'deposit_gold',amount:amount});haptic('medium');toast(vi('coin',13)+' '+amount+' GP depositados','ok');updateHeader();renderTab();updateBottomBar();}
function doBankGoldWithdraw(){var amount=10;if(!D.bank||(D.bank.g||0)<amount)return;D.bank.g-=amount;localGold+=amount;addOp({t:'withdraw_gold',amount:amount});haptic('medium');toast(vi('coin',13)+' '+amount+' GP sacados','ok');updateHeader();renderTab();updateBottomBar();}