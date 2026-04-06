function renderItemsTab(c){if(D.items_stripped){c.innerHTML='<div class="empty-state"><div class="icon">'+vi('warn',32)+'</div>'
+'<p>Inventário muito grande para exibir aqui. Use o bot para gerenciar seus itens.</p></div>';return;}
const counts=getFilterCounts();const filters=[{id:'all',label:'Todos',cnt:counts.all},{id:'fav',label:`${vi_f('star', 13)} Fav`,cnt:counts.fav},{id:'equip',label:`${vi('sword', 13)} Equip`,cnt:counts.equip},{id:'use',label:`${vi('flask', 13)} Consum.`,cnt:counts.use},{id:'gem',label:`${vi('gem', 13)} Gemas`,cnt:counts.gem},{id:'rune',label:`${vi('orb', 13)} Runas`,cnt:counts.rune},{id:'misc',label:`${vi('bag', 13)} Outros`,cnt:counts.misc},{id:'upgrade',label:'\u2B06 Melhoria',cnt:counts.upgrade},];let html='';const _viewIcon=viewMode==='compact'?vi('listView',14):vi('gridView',14);const _viewTitle=viewMode==='compact'?'Modo detalhado':'Modo compacto';html+=`<div class="search-bar">
            <div class="search-wrap">
                <input type="text" placeholder="Buscar item..." value="${esc(searchQuery)}"
                    oninput="onSearch(this.value)" id="searchInput">
                <button class="search-clear ${searchQuery ? 'visible' : ''}" onclick="clearSearch()" id="searchClear">&times;</button>
            </div>
            <div class="view-toggle-btn" onclick="toggleViewMode()" title="${_viewTitle}">
                ${_viewIcon}
            </div>
            <div class="sort-btn ${selectionMode ? 'active' : ''}" onclick="toggleSelectionMode()" title="Modo seleção">
                ${selectionMode ? vi_f('check', 14) : vi('check', 14)}
            </div>
            <div class="sort-btn ${sortMode !== 'default' ? 'active' : ''}" onclick="cycleSort()">
                ${SORT_LABELS[sortMode]}
            </div>
        </div>`;html+='<div class="filter-row">';html+='<div class="filter-select-wrap">';html+='<select class="filter-select" onchange="setFilter(this.value)">';filters.forEach(f=>{const sel=f.id===activeFilter?' selected':'';const cnt=f.cnt>0?` (${f.cnt})`:'';html+=`<option value="${f.id}"${sel}>${f.label}${cnt}</option>`;});html+='</select></div></div>';if((activeFilter==='all'||activeFilter==='gem')&&typeof getGemFusions==='function'){var _fusions=getGemFusions();if(_fusions.length>0){html+='<div style="text-align:right;margin-bottom:6px;">'
+'<span class="btn-sell-junk" style="border-color:var(--v-info);" onclick="showGemFusionModal()">'
+vi('gem',13)+' Fundir Gemas ('+_fusions.length+')</span></div>';}}
const _junkItems=getJunkItems();const junkCount=_junkItems.reduce((sum,j)=>sum+j.q,0);if(junkCount>0&&!searchQuery){let junkGP=0;_junkItems.forEach(inv=>{const jit=getItemData(inv.n);junkGP+=Math.max(1,Math.floor((jit.v||1)*0.6))*inv.q;});html+=`<div style="text-align:right;margin-bottom:6px;">
                <span class="btn-sell-junk" onclick="doSellJunk()">${vi('coin', 13)} Vender Lixo (${junkCount}) · ${junkGP} ${vi('coin', 11)}</span>
            </div>`;}
if(localPotions>0&&(activeFilter==='all'||activeFilter==='use')&&(!searchQuery||'poção de cura'.includes(searchQuery))){html+=`<div style="margin-bottom:10px;"><div class="item-grid ${viewMode === 'compact' ? 'compact-grid' : ''}">
                <div class="item-card rarity-common fade-in" onclick="showPotionConfirm()" style="grid-column: span ${viewMode === 'compact' ? 4 : 2};
                    display:flex;align-items:center;gap:12px;padding:12px;">
                    <span style="font-size:clamp(22px,6vw,28px);">${vi('flask', 28)}</span>
                    <div style="flex:1;">
                        <div class="ic-name" style="font-size:14px;">Poção de Cura</div>
                        <div class="ic-meta">Cura 2d4+2 HP</div>
                    </div>
                    <span class="ic-qty" style="font-size:13px;">x${localPotions}</span>
                </div>
            </div></div>`;}
if(D.trunc){html+=`<div style="background:rgba(255,152,0,0.1);border:1px solid var(--v-warning);border-radius:var(--v-radius);padding:8px 12px;margin-bottom:10px;font-size:12px;color:var(--v-warning);text-align:center;">
                ${vi('warn', 13)} Mostrando 40 de ${D.trunc} itens. Use o bot para gerenciar os demais.
            </div>`;}
const items=getSortedFilteredItems();if(!items.length&&localPotions<=0){const emptyMsg=searchQuery?'Nenhum item encontrado para a busca.':'Nenhum item encontrado.';html+=`<div class="empty-state"><div class="icon">${vi('bag', 32)}</div><p>${emptyMsg}</p></div>`;}else if(items.length){const isCompact=viewMode==='compact';html+='<div class="item-grid'+(isCompact?' compact-grid':'')+'">';let _lastRarGroup=null;items.forEach(inv=>{if(sortMode==='rarity'){const _rg=(getItemData(inv.n).r||'common');if(_rg!==_lastRarGroup){_lastRarGroup=_rg;const _rc=getRarityColor(_rg);html+=`<div class="rarity-separator"><span class="rs-dot" style="background:${_rc}"></span>${getRarityLabel(_rg)}</div>`;}}
const it=getItemData(inv.n);const rarity=it.r||'common';const equipped=isEquippedAnywhere(inv.n);const setId=it.si||'';const tags=it.t||[];const canSelect=selectionMode&&!equipped&&!isProtected(tags)&&!isLocked(inv.n);const isSelected=selectedItems.has(inv.n);const hasSlot=!!it.s;const clickAction=canSelect?`toggleSelectItem('${esc(inv.n)}')`:(selectionMode?'':(hasSlot?`onItemTap('${esc(inv.n)}')`:`openItemDetail('${esc(inv.n)}')`));const locked=isLocked(inv.n);html+=`<div class="item-card rarity-${rarity} ${equipped ? 'equipped-marker' : ''} ${locked ? 'locked-marker' : ''} fade-in"
                    onclick="${clickAction}" ${selectionMode && !canSelect ? 'style="opacity:0.4;"' : ''}>
                    ${selectionMode ? `<div class="sel-check ${isSelected ? 'active' : ''}">${isSelected?vi_f('check',12):''}</div>` : ''}
                    <div class="ic-badges">
                        ${inv.q > 1 ? `<span class="ic-qty">x${inv.q}</span>` : ''}
                        ${equipped ? (isCompact ? '<span class="ic-eq-badge">E</span>' : '<span class="ic-eq-badge">Equipado</span>') : ''}
                        ${setId ? `<span class="ic-set-badge">${getSetIcon(setId)}</span>` : ''}
                    </div>
                    ${!selectionMode && isFav(inv.n) ? `<span class="ic-fav">${vi_f('star',14)}</span>` : ''}
                    ${isLocked(inv.n) ? `<span class="ic-lock">${vi('lock',11)}</span>` : ''}
                    ${(!selectionMode && it.s && _isUpgradeForSlot(inv.n, it)) ? '<span class="ic-upgrade">\u2B06</span>' : ''}
                    ${(!selectionMode && it.s && typeof _getCardDelta==='function') ? _getCardDelta(inv.n, it) : ''}
                    ${isNewItem(inv.n) ? '<span class="ic-new-dot"></span>' : ''}
                    <div class="ic-emoji">${it.img ? '<img class="ic-thumb" src="' + it.img + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'\'"><span style="display:none">' + (it.e || '📦') + '</span>' : (it.e || '📦')}</div>
                    <div class="ic-name v-rarity-${rarity}">${esc(inv.n)}</div>
                    <div class="ic-meta">${getItemShortDesc(inv.n, it)}</div>
                </div>`;});html+='</div>';}
c.innerHTML=html;}
var _searchTimer=null;function onSearch(val){clearTimeout(_searchTimer);const clearBtn=document.getElementById('searchClear');if(clearBtn)clearBtn.classList.toggle('visible',val.trim().length>0);_searchTimer=setTimeout(()=>{searchQuery=val.toLowerCase().trim();renderTab();const inp=document.getElementById('searchInput');if(inp){inp.focus();inp.selectionStart=inp.selectionEnd=inp.value.length;}},150);}
function clearSearch(){searchQuery='';renderTab();const inp=document.getElementById('searchInput');if(inp){inp.focus();}}
function cycleSort(){const idx=SORT_CYCLE.indexOf(sortMode);sortMode=SORT_CYCLE[(idx+1)%SORT_CYCLE.length];try{localStorage.setItem('valdoria_inv_sort',sortMode);}catch(e){console.warn('[INVENTORY]',e);}haptic('light');renderTab();}
function setFilter(f){activeFilter=f;try{localStorage.setItem('valdoria_inv_filter',activeFilter);}catch(e){console.warn('[INVENTORY]',e);}renderTab();}
function _isUpgradeForSlot(name,it){if(!it||!it.s)return false;const slot=it.s==='ring'?'ring_1':it.s;const eq=localEq;const curName=eq[slot];if(!curName)return true;if(curName===name)return false;const curIt=getItemData(curName);const newScore=_calcItemScore(it,slot);const curScore=_calcItemScore(curIt,slot);return newScore>curScore;}
function getFilterCounts(){const all=localInv.filter(i=>i.q>0);const counts={all:all.length,fav:0,equip:0,use:0,gem:0,rune:0,misc:0,upgrade:0};all.forEach(inv=>{const it=getItemData(inv.n);const tags=it.t||[];if(isFav(inv.n))counts.fav++;if(it.s)counts.equip++;if(tags.includes('consumable')||tags.includes('food')||tags.includes('potion'))counts.use++;if(tags.includes('gem')||tags.includes('socketable'))counts.gem++;if(tags.includes('rune'))counts.rune++;if(it.s&&_isUpgradeForSlot(inv.n,it))counts.upgrade++;if(!it.s&&!tags.includes('consumable')&&!tags.includes('food')&&!tags.includes('potion')&&!tags.includes('gem')&&!tags.includes('socketable')&&!tags.includes('rune'))counts.misc++;});return counts;}
function getSortedFilteredItems(){let items=getFilteredItems();if(searchQuery){items=items.filter(inv=>inv.n.toLowerCase().includes(searchQuery));}
if(sortMode==='name'){items.sort((a,b)=>a.n.localeCompare(b.n));}else if(sortMode==='rarity'){items.sort((a,b)=>{const ra=RARITY_ORDER[getItemData(a.n).r||'common']||0;const rb=RARITY_ORDER[getItemData(b.n).r||'common']||0;return rb-ra;});}else if(sortMode==='value'){items.sort((a,b)=>(getItemData(b.n).v||0)-(getItemData(a.n).v||0));}
return items;}
function getFilteredItems(){let items=localInv.filter(i=>i.q>0);if(activeFilter==='all')return items;return items.filter(inv=>{const it=getItemData(inv.n);const tags=it.t||[];if(activeFilter==='fav')return isFav(inv.n);if(activeFilter==='equip')return!!it.s;if(activeFilter==='use')return tags.includes('consumable')||tags.includes('food')||tags.includes('potion');if(activeFilter==='gem')return tags.includes('gem')||tags.includes('socketable');if(activeFilter==='rune')return tags.includes('rune');if(activeFilter==='upgrade')return!!it.s&&_isUpgradeForSlot(inv.n,it);if(activeFilter==='misc')return!it.s&&!tags.includes('consumable')&&!tags.includes('food')&&!tags.includes('potion')&&!tags.includes('gem')&&!tags.includes('socketable')&&!tags.includes('rune');return true;});}
function renderEquipTab(c){let html='';const eq=activeTarget==='player'?localEq:(localAllyEq[activeTarget]||{});if(D.allies&&D.allies.length>0){html+='<div class="ally-equip-nav">';const playerActive=activeTarget==='player'?' active':'';const pName=D.p?.n||'Personagem';html+=`<button class="ally-equip-nav-btn${playerActive}" onclick="switchEquipTarget('player')">${pName}</button>`;D.allies.forEach(a=>{const allyActive=activeTarget===a.id?' active':'';html+=`<button class="ally-equip-nav-btn${allyActive}" onclick="switchEquipTarget('${esc(a.id)}')">${a.ico || '⚔️'} ${a.n}</button>`;});html+='</div>';}
if(activeTarget==='player'){html+=buildStatsSummary();html+=buildSetProgress();html+=buildLoadoutBar();}else{const ally=D.allies.find(a=>a.id===activeTarget);if(ally){const hpPct=ally.mhp>0?Math.round((ally.hp/ally.mhp)*100):0;html+=`<div class="ally-equip-header">
                <span>${ally.ico} <b>${ally.n}</b> · ${ally.c} Lv${ally.l}</span>
                <span>❤️ ${ally.hp}/${ally.mhp}${ally.ac != null ? ' · ' + vi('shield', 12) + ' CA ' + ally.ac : ''}</span>
            </div>`;}}
html+=`<div class="auto-equip-row">
        <button class="auto-equip-btn" onclick="doAutoEquip()">
            ${vi('sparkle', 14)} Auto-Equipar
        </button>
    </div>`;html+='<div class="body-equip">';html+=_buildBodySilhouette(eq);html+='</div>';c.innerHTML=html;}
function _buildBodySilhouette(eq){let html='<div class="equip-slots-grid">';SLOT_ORDER.forEach(slot=>{html+=_buildBodySlot(slot,eq);});html+='</div>';return html;}
function _buildBodySlot(slot,eq){const item=eq[slot]||null;const it=item?getItemData(item):null;const filled=item?'filled':'';const icon=item?(it?.e||'📦'):getSlotEmptyIcon(slot);const label=SLOT_NAMES[slot]||slot;const shortName=item?(item.length>14?item.slice(0,12)+'…':item):'—';const rarity=item?(it?.r||'common'):'';const rarityBorder=rarity&&item?`border-color:${getRarityColor(rarity)};`:'';let upgradeDot='';if(activeTarget==='player'&&!item){if(_getCompatCached(slot).length>0)upgradeDot='<span class="bs-upgrade-dot"></span>';}else if(activeTarget==='player'&&item){const hasUpgrade=_getCompatCached(slot).some(ci=>{if(ci.name===item)return false;const cit=getItemData(ci.name);const{cls}=compareItemsDetailed(cit,it||{ac:0,b:0,hb:0,mb:0},slot);return cls==='better';});if(hasUpgrade)upgradeDot='<span class="bs-upgrade-dot"></span>';}
let gemDots='';if(activeTarget==='player'&&item){const sockets=it?.sk||0;const gems=localGems[slot]||[];const rune=localRunes[slot];if(sockets>0||rune){gemDots='<div class="bs-gems">';for(let i=0;i<sockets;i++){gemDots+=`<span class="bs-gem ${gems[i] ? 'bs-gem-filled' : ''}"></span>`;}
if(rune)gemDots+=`<span class="bs-rune">${vi('orb', 8)}</span>`;gemDots+='</div>';}}
return`<div class="body-slot ${filled}" onclick="openSlotModal('${slot}')" style="${rarityBorder}">
        ${upgradeDot}
        <div class="bs-icon">${icon}</div>
        <div class="bs-text">
            <div class="bs-label">${label}</div>
            <div class="bs-name">${shortName}</div>
        </div>
        ${gemDots}
    </div>`;}
function doAutoEquip(){_invalidateEquipCache();haptic('medium');const isPlayer=activeTarget==='player';const eq=isPlayer?localEq:(localAllyEq[activeTarget]||{});const SLOT_LIST=['head','chest','shoulders','hands','legs','feet','main_hand','off_hand','necklace','ring_1','ring_2','belt','cloak','map'];let equipped=0;SLOT_LIST.forEach(slot=>{const currentItem=eq[slot]||null;const currentData=currentItem?getItemData(currentItem):{ac:0,b:0,hb:0,mb:0};const compat=getCompatibleItems(slot);if(!compat.length)return;let bestName=currentItem;let bestScore=_calcItemScore(currentData,slot);compat.forEach(ci=>{if(ci.name===currentItem)return;const alreadyEquipped=Object.entries(eq).some(([s,n])=>s!==slot&&n===ci.name);if(alreadyEquipped)return;const cit=getItemData(ci.name);const score=_calcItemScore(cit,slot);if(score>bestScore){bestScore=score;bestName=ci.name;}});if(bestName&&bestName!==currentItem){if(currentItem){pendingOps.push({t:'unequip',slot,target:activeTarget});eq[slot]=null;}
pendingOps.push({t:'equip',item:bestName,slot,target:activeTarget});eq[slot]=bestName;const invItem=localInv.find(i=>i.n===bestName);if(invItem&&invItem.q>0)invItem.q--;equipped++;}});if(equipped>0){if(isPlayer)localAC=calcLocalAC();updateHeader();renderTab();toast(`⚔️ ${equipped} equipamento(s) otimizado(s)!`,'ok');}else{toast('✅ Já está com os melhores equipamentos!','ok');}}
function _calcItemScore(it,slot){if(!it)return 0;let score=0;if(slot==='main_hand'||slot==='off_hand'){score+=(it.b||0)*10;if(it.dd){const dm=it.dd.match(/(\d+)d(\d+)/);if(dm)score+=parseInt(dm[1],10)*(parseInt(dm[2],10)+1)/2;}}
score+=(it.ac||0)*8;score+=(it.hb||0)*3;score+=(it.mb||0)*3;score+=(it.b||0)*5;const rarityScores={common:0,uncommon:1,rare:2,very_rare:3,legendary:4};score+=(rarityScores[it.r]||0)*0.5;return score;}
function buildStatsSummary(){let totalAC=0,totalHP=0,totalMP=0,totalATK=0;const slotBreakdown=[];for(const[slot,item]of Object.entries(localEq)){if(!item)continue;const it=getItemData(item);let sAC=it.ac||0,sATK=it.b||0,sHP=it.hb||0,sMP=it.mb||0;const gems=localGems[slot]||[];gems.forEach(g=>{if(!g)return;const gd=getItemData(g);if(gd.gb){sHP+=gd.gb.hp_bonus||0;sMP+=gd.gb.mp_bonus||0;sAC+=gd.gb.ac_bonus||0;}});totalAC+=sAC;totalATK+=sATK;totalHP+=sHP;totalMP+=sMP;if(sAC||sATK||sHP||sMP){slotBreakdown.push({slot,item,ac:sAC,atk:sATK,hp:sHP,mp:sMP});}}
const parts=[];if(totalAC)parts.push(`${vi('shield', 13)} CA <b>+${totalAC}</b>`);if(totalATK)parts.push(`${vi('sword', 13)} ATK <b>+${totalATK}</b>`);if(totalHP)parts.push(`${vi('heart', 13)} HP <b>+${totalHP}</b>`);if(totalMP)parts.push(`${vi('orb', 13)} MP <b>+${totalMP}</b>`);if(!parts.length)return'';let breakdown='';if(slotBreakdown.length>0){breakdown='<div class="ss-breakdown" id="ssBreakdown" style="display:none;">';slotBreakdown.forEach(s=>{const label=SLOT_NAMES[s.slot]||s.slot;const emoji=(getItemData(s.item)||{}).e||'\u{1F4E6}';const vals=[];if(s.ac)vals.push('CA+'+s.ac);if(s.atk)vals.push('ATK+'+s.atk);if(s.hp)vals.push('HP+'+s.hp);if(s.mp)vals.push('MP+'+s.mp);breakdown+='<div class="ss-bd-row">'
+'<span class="ss-bd-slot">'+emoji+' '+label+'</span>'
+'<span class="ss-bd-vals">'+vals.join(' ')+'</span>'
+'</div>';});breakdown+='</div>';}
return'<div class="stats-summary" onclick="toggleStatsBreakdown()" style="cursor:pointer;" title="Toque para detalhes">'
+parts.map(p=>'<div class="ss-item">'+p+'</div>').join('')
+'<div class="ss-expand-hint" id="ssExpandHint">\u25BC</div>'
+'</div>'+breakdown;}
function toggleStatsBreakdown(){const bd=document.getElementById('ssBreakdown');const hint=document.getElementById('ssExpandHint');if(!bd)return;if(bd.style.display==='none'){bd.style.display='';if(hint)hint.textContent='\u25B2';}else{bd.style.display='none';if(hint)hint.textContent='\u25BC';}
haptic('light');}
function buildSetProgress(){if(!D.sets)return'';const owned=new Set();for(const item of Object.values(localEq)){if(item)owned.add(item);}
localInv.forEach(i=>{if(i.q>0)owned.add(i.n);});let html='';for(const[sid,sdef]of Object.entries(D.sets)){const count=sdef.pcs.filter(p=>owned.has(p)).length;if(count===0)continue;html+=`<div class="set-progress fade-in">
                <div class="set-title">${sdef.i} ${sdef.n} (${count}/${sdef.pcs.length})</div>
                <div class="set-pieces">`;sdef.pcs.forEach(p=>{const cls=owned.has(p)?'owned':'missing';const icon=owned.has(p)?vi_f('check',13):vi('check',13);html+=`<div class="set-piece ${cls}">${icon} ${p}</div>`;});html+='</div>';for(const[th,label]of Object.entries(sdef.th)){const active=count>=parseInt(th,10);html+=`<div class="set-bonus ${active ? 'active' : 'inactive'}">${active ? vi('sparkle', 13) : vi('lock', 13)} ${th}/${sdef.pcs.length}: ${label}</div>`;}
const equipped=new Set(Object.values(localEq).filter(Boolean));const canEquipPieces=sdef.pcs.filter(p=>owned.has(p)&&!equipped.has(p));if(canEquipPieces.length>0){html+=`<button class="btn-equip" style="width:100%;margin-top:6px;font-size:11px;padding:6px;" onclick="doEquipSet('${esc(sid)}')">${vi('sword', 13)} Equipar Set (${canEquipPieces.length})</button>`;}
html+='</div>';}
return html;}
function getSlotEmptyIcon(slot){return vi(SLOT_ICONS[slot]||'bag',20);}
function renderAlliesTab(c){if(!D.allies||!D.allies.length){c.innerHTML=`<div class="empty-state"><div class="icon">${vi('people', 32)}</div><p>Nenhum aliado no grupo.</p></div>`;return;}
let html='';D.allies.forEach(a=>{const hpPct=(a.mhp||0)>0?Math.round(((a.hp||0)/(a.mhp||1))*100):0;const hpCls=typeof vBarHpClass==='function'?vBarHpClass(hpPct):(hpPct>60?'bar-high':hpPct>25?'bar-mid':'bar-low');let mpBar='';if(a.mmp>0){const mpPct=a.mmp>0?Math.round((a.mp/a.mmp)*100):0;mpBar=`<div class="ally-bar-row">
                <span class="ally-bar-label">${a.res || '💧'} ${a.mp}/${a.mmp}</span>
                <div class="ally-bar-track"><div class="ally-bar-fill ally-bar-mp" style="transform:scaleX(${mpPct/100})"></div></div>
            </div>`;}
const lvlBadge=a.l>0?`<span class="ally-lvl-badge">Lv${a.l}</span>`:'';const affBadge=a.aff>0?`<span class="ally-aff-badge">❤️${a.aff}</span>`:'';const deadClass=a.hp<=0?' ally-dead':'';html+=`<div class="ally-card fade-in${deadClass}" onclick="openAllyEquip('${esc(a.id)}')">
                <div class="ally-header">
                    <span class="ally-ico">${a.ico || '⚔️'}</span>
                    <div class="ally-name-col">
                        <span class="ally-name">${esc(a.n)} ${lvlBadge}${affBadge}</span>
                        <span class="ally-class">${a.c || 'Aliado'}</span>
                    </div>
                    ${a.ac != null ? '<span class="ally-ac">' + vi('shield', 12) + ' ' + a.ac + '</span>' : ''}
                </div>
                <div class="ally-bars">
                    <div class="ally-bar-row">
                        <span class="ally-bar-label">❤️ ${a.hp}/${a.mhp}</span>
                        <div class="ally-bar-track"><div class="ally-bar-fill ${hpCls}" style="transform:scaleX(${hpPct/100})"></div></div>
                    </div>
                    ${mpBar}
                </div>
            </div>`;});c.innerHTML=html;}
function openAllyEquip(npcId){activeTarget=npcId;activeTab='equip';buildTabs();renderTab();}
function switchEquipTarget(target){haptic('light');activeTarget=target;activeTab='equip';buildTabs();renderTab();}
var _lastTapItem='';var _lastTapTime=0;function onItemTap(name){var now=Date.now();if(name===_lastTapItem&&now-_lastTapTime<400){_lastTapItem='';_lastTapTime=0;quickEquipItem(name);return;}
_lastTapItem=name;_lastTapTime=now;setTimeout(function(){if(_lastTapItem===name){openItemDetail(name);_lastTapItem='';}},350);}
function quickEquipItem(name){var it=getItemData(name);if(!it||!it.s){openItemDetail(name);return;}
if(!checkProficiency(it,activeTarget,name)){toast(vi('lock',13)+' Sem profici\u00eancia para este item','warn');return;}
var slot=resolveSlot(it);var eq=activeTarget==='player'?localEq:(localAllyEq[activeTarget]||{});var current=eq[slot];if(current===name){toast(vi('check',13)+' J\u00e1 equipado neste slot','ok');return;}
_acDirty=true;if(current){addOp({t:'unequip',slot:slot,target:activeTarget});addToLocalInv(current);}
addOp({t:'equip',item:name,slot:slot,tgt:activeTarget});removeFromLocalInv(name);eq[slot]=name;if(activeTarget==='player')localAC=calcLocalAC();haptic('heavy');toast(vi('sword',13)+' '+name+' equipado!','ok');updateHeader();renderTab();updateBottomBar();}