function renderQuestDiary(container,data){container.innerHTML='';var wrap=document.createElement('div');wrap.className='quest-diary';if(data.flash){var flash=document.createElement('div');flash.className='quest-flash';flash.innerHTML='\ud83d\udcac <em>\u201c'+vEsc(data.flash)+'\u201d</em>';wrap.appendChild(flash);}
var searchWrap=document.createElement('div');searchWrap.className='quest-search-wrap';var searchInput=document.createElement('input');searchInput.type='text';searchInput.className='quest-search-input';searchInput.placeholder='\ud83d\udd0d Pesquisar miss\u00f5es...';searchWrap.appendChild(searchInput);wrap.appendChild(searchWrap);var filters=[{id:'all',icon:'\ud83d\udccb',label:'Todas'},{id:'story',icon:'\u2694\ufe0f',label:'Hist\u00f3ria'},{id:'daily',icon:'\ud83d\udd04',label:'Di\u00e1rias'},{id:'done',icon:'\u2705',label:'Feitas'},];var activeFilter='all';var tabRow=document.createElement('div');tabRow.className='quest-filter-tabs';for(var i=0;i<filters.length;i++){var f=filters[i];var tab=document.createElement('button');tab.className='quest-filter-tab'+(activeFilter===f.id?' active':'');tab.textContent=f.icon+' '+f.label;tab.setAttribute('data-filter',f.id);(function(fid,tabEl){tabEl.onclick=function(){activeFilter=fid;var allTabs=tabRow.querySelectorAll('.quest-filter-tab');for(var t=0;t<allTabs.length;t++){allTabs[t].classList.toggle('active',allTabs[t].getAttribute('data-filter')===fid);}
_applyQuestFilter(wrap,fid,searchInput.value);};})(f.id,tab);tabRow.appendChild(tab);}
wrap.appendChild(tabRow);searchInput.oninput=function(){_applyQuestFilter(wrap,activeFilter,searchInput.value);};if(data.turnin&&data.turnin.length>0){for(var ti=0;ti<data.turnin.length;ti++){var t=data.turnin[ti];var banner=document.createElement('button');banner.className='quest-turnin-banner';banner.setAttribute('data-qsection','turnin');var bannerText=t.count>1?'\ud83d\udcdc Entregar '+t.count+' Miss\u00f5es':'\ud83d\udcdc Entregar: '+vEsc(t.titles[0]);banner.innerHTML='<strong>'+bannerText+'</strong>'
+'<span class="quest-turnin-loc">'+vEsc(t.loc)+'</span>';(function(cb){banner.onclick=function(){doAction(cb);};})(t.cb);wrap.appendChild(banner);}}
if(data.story&&data.story.length>0){var storyHdr=_questSectionHdr('\u2694\ufe0f','Missões em Andamento');storyHdr.setAttribute('data-qsection','story');wrap.appendChild(storyHdr);for(var si=0;si<data.story.length;si++){var sCard=_renderQCard(data.story[si]);sCard.setAttribute('data-qsection','story');sCard.setAttribute('data-qtitle',(data.story[si].title||'').toLowerCase());wrap.appendChild(sCard);}}
if(data.daily&&data.daily.length>0){var dailyHdr=_questSectionHdr('\ud83d\udd04','Tarefas do Dia');dailyHdr.setAttribute('data-qsection','daily');wrap.appendChild(dailyHdr);for(var di=0;di<data.daily.length;di++){var dCard=_renderQCard(data.daily[di],true);dCard.setAttribute('data-qsection','daily');dCard.setAttribute('data-qtitle',(data.daily[di].title||'').toLowerCase());wrap.appendChild(dCard);}}
if(data.done&&data.done.length>0){var doneHdr=_questSectionHdr('\u2705','Feitos Realizados');doneHdr.setAttribute('data-qsection','done');wrap.appendChild(doneHdr);for(var ci=0;ci<data.done.length;ci++){var d=data.done[ci];var doneCard=document.createElement('div');doneCard.className='quest-card quest-card--done';doneCard.setAttribute('data-qsection','done');doneCard.setAttribute('data-qtitle',(d.title||'').toLowerCase());doneCard.innerHTML='<div class="quest-card-header">'
+'<span class="quest-title quest-title--done">'+vEsc(d.title)+'</span></div>'
+'<div class="quest-rewards-mini">\u2728 '+d.xp+' XP \u00b7 <span class="vi vi-coin sm"></span> '+d.gold+' Valdoritas</div>';wrap.appendChild(doneCard);}}
if(data.failed&&data.failed.length>0){var failHdr=_questSectionHdr('\u274c','Miss\u00f5es Perdidas');failHdr.setAttribute('data-qsection','done');wrap.appendChild(failHdr);for(var fi=0;fi<data.failed.length;fi++){var fq=data.failed[fi];var failCard=document.createElement('div');failCard.className='quest-card quest-card--failed';failCard.setAttribute('data-qsection','done');failCard.setAttribute('data-qtitle',(fq.title||'').toLowerCase());failCard.innerHTML='<div class="quest-card-header">'
+'<span class="quest-title quest-title--failed">\ud83d\udc80 '+vEsc(fq.title)+'</span></div>';if(fq.cb_retry){var retryBtn=document.createElement('button');retryBtn.className='quest-retry-btn';retryBtn.textContent='\ud83d\udd04 Tentar Novamente';(function(cb){retryBtn.onclick=function(e){e.stopPropagation();doAction(cb);};})(fq.cb_retry);failCard.appendChild(retryBtn);}
wrap.appendChild(failCard);}}
var totalQ=(data.story||[]).length+(data.daily||[]).length
+(data.done||[]).length+(data.failed||[]).length;if(totalQ===0){var empty=document.createElement('div');empty.className='quest-empty';var _eText=document.createElement('div');_eText.className='quest-empty-text';_eText.textContent='\ud83d\udcdc Nenhuma miss\u00e3o ativa';empty.appendChild(_eText);var _eHint=document.createElement('div');_eHint.className='quest-empty-hint';_eHint.textContent='Converse com os habitantes de Eld\u00f3ria ou visite o Quadro de Miss\u00f5es na Guilda dos Aventureiros.';
empty.appendChild(_eHint);var _eCta=document.createElement('div');_eCta.className='quest-empty-cta';_eCta.textContent='\ud83c\udfe0 Visitar Locais';_eCta.onclick=function(){doAction('action_city_locations');};empty.appendChild(_eCta);wrap.appendChild(empty);}
var emptyFilter=document.createElement('div');emptyFilter.className='quest-empty quest-empty-filter';emptyFilter.style.display='none';emptyFilter.innerHTML='<div class="quest-empty-text">Nenhuma miss\u00e3o nesta categoria.</div>';wrap.appendChild(emptyFilter);container.appendChild(wrap);}
function _applyQuestFilter(wrap,filter,searchText){var query=(searchText||'').toLowerCase().trim();var sections=wrap.querySelectorAll('[data-qsection]');var visibleCount=0;for(var i=0;i<sections.length;i++){var el=sections[i];var section=el.getAttribute('data-qsection');var title=el.getAttribute('data-qtitle')||'';var showByTab=(filter==='all')||(filter==='story'&&section==='story')||(filter==='daily'&&section==='daily')||(filter==='done'&&section==='done')||section==='turnin';var showBySearch=!query||!title||title.indexOf(query)>=0;var isHeader=el.classList.contains('quest-section-hdr');if(isHeader){var hasVisible=false;var next=el.nextElementSibling;while(next&&next.getAttribute('data-qsection')===section&&!next.classList.contains('quest-section-hdr')){var nextTitle=next.getAttribute('data-qtitle')||'';var nextSearch=!query||!nextTitle||nextTitle.indexOf(query)>=0;if(showByTab&&nextSearch){hasVisible=true;break;}
next=next.nextElementSibling;}
el.style.display=hasVisible?'':'none';}else{var show=showByTab&&showBySearch;el.style.display=show?'':'none';if(show&&section!=='turnin')visibleCount++;}}
var emptyEl=wrap.querySelector('.quest-empty-filter');if(emptyEl){var totalQ=wrap.querySelectorAll('.quest-card').length;emptyEl.style.display=(totalQ>0&&visibleCount===0)?'':'none';}}
function _questSectionHdr(icon,label){var el=document.createElement('div');el.className='quest-section-hdr';el.innerHTML='<span class="quest-section-icon">'+icon+'</span>'
+'<span class="quest-section-label">'+label+'</span>';return el;}
function _renderQCard(q,isDaily){var card=document.createElement('div');card.className='quest-card'+(q.ready?' quest-card--ready':'');card.setAttribute('data-element','quest-card');card.onclick=function(){doAction(q.cb);};var hdr=document.createElement('div');hdr.className='quest-card-header';var npcIcon=q.npc_icon||'\u2694\ufe0f';var catBadge='';if(q.cat==='daily'){catBadge='<span class="quest-cat-badge quest-cat--daily">DI\u00c1RIA</span>';}else if(q.cat==='story'){catBadge='<span class="quest-cat-badge quest-cat--story">HIST\u00d3RIA</span>';}else if(q.cat==='side'){catBadge='<span class="quest-cat-badge quest-cat--side">SECUND\u00c1RIA</span>';}
hdr.innerHTML='<span class="quest-npc-icon">'+npcIcon+'</span>'
+'<span class="quest-title">'+vEsc(q.title)+'</span>'
+catBadge
+(q.ready?'<span class="quest-ready-badge">\u2705</span>':'');card.appendChild(hdr);if(q.chain){var chainEl=document.createElement('div');chainEl.className='quest-chain-badge';chainEl.textContent='Cap\u00edtulo '+q.chain.part+' de '+q.chain.total;card.appendChild(chainEl);}
if(q.obj){var objEl=document.createElement('div');objEl.className='quest-objective';objEl.innerHTML='<em>'+vEsc(q.obj)+'</em>';card.appendChild(objEl);}
if(q.npc){var npcEl=document.createElement('div');npcEl.className='quest-card-npc';npcEl.textContent=q.npc;card.appendChild(npcEl);}
return card;}
/* Quest detail — V3 Grimorio Dual layout (2026-04-11)
 * Renders the quest as a 2-column grid (Etapas left, Recompensas right)
 * with a category banner, narrative card, progress bar, and contractor
 * panel. Used by game-popup-unified.js when data.quest_detail is present.
 * Uses createElement/textContent throughout — no innerHTML — to avoid
 * XSS vectors with user-controlled quest text. */
function _qdMakeEl(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
}
function _qdMakePanelHead(iconText, titleText, countText) {
    var head = _qdMakeEl('div', 'v3-panel-head');
    head.appendChild(_qdMakeEl('span', 'v3-panel-ic', iconText));
    head.appendChild(_qdMakeEl('span', 'v3-panel-title', titleText));
    if (countText != null) head.appendChild(_qdMakeEl('span', 'v3-panel-count', countText));
    return head;
}
function _qdMakeRewardRow(iconText, nameText, valText, useVCoin) {
    var row = _qdMakeEl('div', 'v3-reward-row');
    var icEl = _qdMakeEl('span', 'v3-reward-row-ic');
    if (useVCoin) {
        /* Money display: use Valdoria v-coin icon (NEVER money-bag emoji) */
        icEl.appendChild(_qdMakeEl('span', 'vi vi-coin sm'));
    } else {
        icEl.textContent = iconText;
    }
    row.appendChild(icEl);
    row.appendChild(_qdMakeEl('span', 'v3-reward-row-name', nameText));
    row.appendChild(_qdMakeEl('span', 'v3-reward-row-val', valText));
    return row;
}
function renderQuestDetail(container, q) {
    container.innerHTML = '';
    var wrap = _qdMakeEl('div', 'quest-detail quest-detail-v3');

    /* Banner with category badge, icon and title */
    var banner = _qdMakeEl('div', 'v3-banner');
    var catText = '';
    if (q.cat === 'story') catText = 'História';
    else if (q.cat === 'daily') catText = 'Diária';
    else if (q.cat === 'side') catText = 'Secundária';
    else if (q.cat === 'bounty') catText = 'Recompensa';
    if (catText) banner.appendChild(_qdMakeEl('div', 'v3-cat-badge', catText));
    if (q.ready) banner.appendChild(_qdMakeEl('div', 'v3-ready-badge', '✅ Pronta para entrega'));
    var bannerRow = _qdMakeEl('div', 'v3-banner-row');
    bannerRow.appendChild(_qdMakeEl('div', 'v3-banner-ic', q.npc_icon || '📜'));
    var bannerText = _qdMakeEl('div', 'v3-banner-text');
    bannerText.appendChild(_qdMakeEl('div', 'v3-banner-title', q.title || 'Missão'));
    var subParts = [];
    if (q.chain) subParts.push('Capítulo ' + q.chain.part + ' de ' + q.chain.total);
    if (q.status === 'active') subParts.push('Em andamento');
    else if (q.status === 'completed') subParts.push('Concluída');
    else if (q.status === 'failed') subParts.push('Falhada');
    bannerText.appendChild(_qdMakeEl('div', 'v3-banner-sub', subParts.join(' • ')));
    bannerRow.appendChild(bannerText);
    banner.appendChild(bannerRow);
    wrap.appendChild(banner);

    /* Narrative card with description */
    if (q.desc) wrap.appendChild(_qdMakeEl('div', 'v3-narrative', q.desc));

    /* Progress bar (only for active quests with multiple stages) */
    if (q.status === 'active' && q.total && q.total > 1) {
        var progWrap = _qdMakeEl('div', 'v3-progress-wrap');
        var progTop = _qdMakeEl('div', 'v3-progress-top');
        progTop.appendChild(_qdMakeEl('span', null, 'Progresso'));
        progTop.appendChild(_qdMakeEl('span', null, (q.stage || 0) + ' / ' + q.total));
        progWrap.appendChild(progTop);
        var progBar = _qdMakeEl('div', 'v3-progress-bar');
        var progFill = _qdMakeEl('div', 'v3-progress-fill');
        var pct = q.pct != null ? q.pct : Math.round(((q.stage || 0) / q.total) * 100);
        progFill.style.width = pct + '%';
        progBar.appendChild(progFill);
        progWrap.appendChild(progBar);
        wrap.appendChild(progWrap);
    }

    /* 2-column grid: Etapas | Recompensas */
    var hasObjectives = q.objectives && q.objectives.length > 0;
    var hasRewards = q.xp || q.gold || (q.items && q.items.length > 0);
    if (hasObjectives || hasRewards) {
        var grid = _qdMakeEl('div', 'v3-grid');
        if (hasObjectives) {
            var stepsPanel = _qdMakeEl('div', 'v3-panel');
            stepsPanel.appendChild(_qdMakePanelHead('⚔', 'Etapas',
                (q.stage || 0) + '/' + (q.total || q.objectives.length)));
            for (var i = 0; i < q.objectives.length; i++) {
                var o = q.objectives[i];
                var obj = _qdMakeEl('div', 'v3-obj v3-obj--' + o.state);
                var icon = o.state === 'done' ? '✓' : (o.state === 'current' ? '●' : '○');
                obj.appendChild(_qdMakeEl('span', 'v3-obj-ic', icon));
                obj.appendChild(_qdMakeEl('span', 'v3-obj-text', o.text));
                stepsPanel.appendChild(obj);
            }
            grid.appendChild(stepsPanel);
        }
        if (hasRewards) {
            var rewPanel = _qdMakeEl('div', 'v3-panel');
            rewPanel.appendChild(_qdMakePanelHead('💎', 'Recompensas'));
            var rewList = _qdMakeEl('div', 'v3-reward-list');
            if (q.xp) rewList.appendChild(_qdMakeRewardRow('✨', 'Experiência', String(q.xp)));
            if (q.gold) rewList.appendChild(_qdMakeRewardRow('', 'Valdoritas', String(q.gold), true));
            if (q.items && q.items.length > 0) {
                for (var ii = 0; ii < q.items.length; ii++) {
                    rewList.appendChild(_qdMakeRewardRow('🎁', q.items[ii], '+1'));
                }
            }
            rewPanel.appendChild(rewList);
            grid.appendChild(rewPanel);
        }
        wrap.appendChild(grid);
    }

    /* Contractor panel with quote and name */
    if (q.npc || q.hint) {
        var giverPanel = _qdMakeEl('div', 'v3-panel v3-giver-panel');
        giverPanel.appendChild(_qdMakePanelHead(q.npc_icon || '🧙', 'Contratante'));
        if (q.hint) giverPanel.appendChild(_qdMakeEl('div', 'v3-giver-quote', '"' + q.hint + '"'));
        if (q.npc) giverPanel.appendChild(_qdMakeEl('div', 'v3-giver-name', '— ' + q.npc));
        wrap.appendChild(giverPanel);
    }

    container.appendChild(wrap);
}
function renderQuestTurnin(container,data){container.innerHTML='';var wrap=document.createElement('div');wrap.className='quest-turnin';if(data.npc){var npcEl=document.createElement('div');npcEl.className='quest-turnin-npc';npcEl.innerHTML='\ud83d\udc64 <b>'+vEsc(data.npc)+'</b>';wrap.appendChild(npcEl);}
if(data.dialogue){var dlg=document.createElement('div');dlg.className='quest-turnin-dialogue';dlg.innerHTML='\ud83d\udcac <em>\u201c'+vEsc(data.dialogue)+'\u201d</em>';wrap.appendChild(dlg);}
if(data.quests&&data.quests.length>0){var qList=document.createElement('div');qList.className='quest-turnin-list';for(var i=0;i<data.quests.length;i++){var qItem=document.createElement('div');qItem.className='quest-turnin-item';qItem.style.animationDelay=(i*0.15)+'s';qItem.innerHTML='\u2705 <b>'+vEsc(data.quests[i].title)+'</b>';if(data.quests[i].narrative){qItem.innerHTML+='<div class="quest-turnin-narrative">'+_safeQ(data.quests[i].narrative)+'</div>';}
qList.appendChild(qItem);}
wrap.appendChild(qList);}
var rewBlock=document.createElement('div');rewBlock.className='quest-turnin-rewards';rewBlock.innerHTML='<div class="quest-turnin-rewards-label">\ud83d\udc8e Recompensas</div>';var rewItems=document.createElement('div');rewItems.className='quest-turnin-rewards-grid';var delay=(data.quests?data.quests.length:0)*0.15+0.3;if(data.xp){var xpEl=document.createElement('div');xpEl.className='quest-turnin-reward-item quest-turnin-reveal';xpEl.style.animationDelay=delay+'s';xpEl.innerHTML='<span class="quest-turnin-reward-icon">\u2728</span>'
+'<span class="quest-turnin-reward-val">+'+data.xp+'</span>'
+'<span class="quest-turnin-reward-lbl">XP</span>';rewItems.appendChild(xpEl);delay+=0.2;}
if(data.gold){var goldEl=document.createElement('div');goldEl.className='quest-turnin-reward-item quest-turnin-reveal';goldEl.style.animationDelay=delay+'s';goldEl.innerHTML='<span class="quest-turnin-reward-icon"><span class="vi vi-coin lg"></span></span>'
+'<span class="quest-turnin-reward-val">+'+data.gold+'</span>'
+'<span class="quest-turnin-reward-lbl">Valdoritas</span>';rewItems.appendChild(goldEl);delay+=0.2;}
if(data.items&&data.items.length>0){for(var ii=0;ii<data.items.length;ii++){var itemEl=document.createElement('div');itemEl.className='quest-turnin-reward-item quest-turnin-reveal';itemEl.style.animationDelay=delay+'s';itemEl.innerHTML='<span class="quest-turnin-reward-icon">\ud83c\udf81</span>'
+'<span class="quest-turnin-reward-val">'+vEsc(data.items[ii])+'</span>';rewItems.appendChild(itemEl);delay+=0.2;}}
rewBlock.appendChild(rewItems);wrap.appendChild(rewBlock);if(data.leveled){var lvl=document.createElement('div');lvl.className='quest-turnin-levelup quest-turnin-reveal';lvl.style.animationDelay=(delay+0.3)+'s';lvl.innerHTML='\ud83c\udf89 <b>LEVEL UP!</b> N\u00edvel '+data.level;wrap.appendChild(lvl);}
if(data.current_gold!==undefined){var goldLine=document.createElement('div');goldLine.className='quest-turnin-gold';goldLine.innerHTML='<span class="vi vi-coin sm"></span> <b>Valdoritas:</b> '+data.current_gold;wrap.appendChild(goldLine);}
container.appendChild(wrap);}
function renderQuestAbandon(container,data){container.innerHTML='';var wrap=document.createElement('div');wrap.className='quest-abandon';var iconEl=document.createElement('div');iconEl.className='quest-abandon-icon';iconEl.textContent='\u26a0\ufe0f';wrap.appendChild(iconEl);var titleEl=document.createElement('div');titleEl.className='quest-abandon-title';titleEl.textContent='Abandonar Miss\u00e3o?';wrap.appendChild(titleEl);var nameEl=document.createElement('div');nameEl.className='quest-abandon-name';nameEl.innerHTML='\ud83d\udcdc '+vEsc(data.title);wrap.appendChild(nameEl);var warnEl=document.createElement('div');warnEl.className='quest-abandon-warn';warnEl.textContent=data.is_daily?'Ao desistir, tudo que foi feito se perder\u00e1. Tarefas di\u00e1rias abandonadas contam para o limite do dia.':'Ao desistir, voc\u00ea perder\u00e1 tudo que conquistou nesta jornada. Poder\u00e1 retom\u00e1-la mais tarde.';wrap.appendChild(warnEl);container.appendChild(wrap);}
function renderQuestTracker(container,data){if(!data.quests||data.quests.length===0)return;var wrap=document.createElement('div');wrap.className='quest-tracker';wrap.innerHTML='<div class="quest-tracker-hdr">\ud83d\udcdc Missões</div>';for(var i=0;i<data.quests.length;i++){var q=data.quests[i];var row=document.createElement('div');row.className='quest-tracker-row'+(q.ready?' quest-tracker-row--ready':'');row.onclick=(function(cb){return function(){doAction(cb);};})(q.cb);var statusText=q.ready?'Conclu\u00edda':(q.obj||'...');row.innerHTML='<span class="quest-tracker-title">'+vEsc(q.title)+'</span>'
+'<span class="quest-tracker-status">'+(q.ready?'\u2705':'\u25b8')+'</span>';wrap.appendChild(row);}
var viewAll=document.createElement('div');viewAll.className='quest-tracker-view-all';viewAll.textContent='Ver todas ▸';viewAll.onclick=function(){doAction('action_quests');};wrap.appendChild(viewAll);var firstBlock=container.querySelector('.text-block, .v-bar-row');if(firstBlock&&firstBlock.nextSibling){container.insertBefore(wrap,firstBlock.nextSibling.nextSibling||null);}else{container.appendChild(wrap);}}
function _safeQ(text){if(!text)return'';var s=vEsc(text);s=s.replace(/&lt;b&gt;/g,'<b>').replace(/&lt;\/b&gt;/g,'</b>');s=s.replace(/&lt;i&gt;/g,'<i>').replace(/&lt;\/i&gt;/g,'</i>');return s;}