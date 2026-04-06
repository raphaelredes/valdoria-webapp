(function(){'use strict';var _T={invFail:'\ud83d\udd0d Nada al\u00e9m do \u00f3bvio.',negFail:'\ud83d\udcac Negocia\u00e7\u00e3o recusada.',acceptNarr:'Voc\u00ea arranca o pergaminho do quadro e o guarda cuidadosamente. O papel ainda cheira a tinta fresca.',acceptFarewell:'Boa sorte, aventureiro.',emptyTitle:'Quadro vazio no momento.',emptyHint:'Volte mais tarde para novas miss\u00f5es.',reqFallback:'Requisitos n\u00e3o atendidos.'};var _cachedData=null;var _currentView='list';var _activeFilter='all';
function _renderListBody(d){var h='';h+='<div class="qb-status">';h+='<span class="qb-rep">\u2694\uFE0F '+vEsc(d.attitude)+' ('+(d.rep||0)+')</span>';h+='<span class="qb-daily">\ud83d\udccb '+vEsc(d.daily)+' Di\u00e1rias</span>';h+='</div>';if(d.active_count>0){h+='<div class="qb-active-count">\ud83d\udccc '+d.active_count+' em andamento</div>';}
var filters=[{key:'all',label:'Todas'},{key:'daily',label:'Di\u00e1rias'},{key:'side',label:'Aventuras'}];h+='<div class="v-tabs-pill qb-filters">';for(var f=0;f<filters.length;f++){var cls=_activeFilter===filters[f].key?' active':'';h+='<button class="v-tab'+cls+'" data-qb-filter="'+filters[f].key+'">'
+filters[f].label+'</button>';}
h+='</div>';if(d.is_capped){h+='<div class="qb-capped">\u26A0\uFE0F Limite di\u00e1rio alcan\u00e7ado. Volte amanh\u00e3.</div>';}
var quests=d.quests||[];var shown=0;for(var i=0;i<quests.length;i++){var q=quests[i];var cat=q.cat||'daily';if(_activeFilter!=='all'){if(_activeFilter==='daily'&&cat!=='daily')continue;if(_activeFilter==='side'&&cat==='daily')continue;}
shown++;h+='<div class="qb-card" data-qb-quest="'+vEsc(q.id)+'">';h+='<div class="qb-card-top">';h+='<span class="qb-diff">'+(q.diff||'\ud83d\udfe2')+'</span>';h+='<span class="qb-title">'+vEsc(q.title)+'</span>';var catLabel=cat==='daily'?'Di\u00e1ria':(cat==='story'?'Hist\u00f3ria':'Aventura');h+='<span class="qb-cat-badge qb-cat-'+cat+'">'+catLabel+'</span>';h+='</div>';h+='<div class="qb-card-rewards">';if(q.gold)h+='<span>\ud83d\udcb0 '+q.gold+' 💰</span>';if(q.xp)h+='<span>\u2728 '+q.xp+' XP</span>';h+='<span class="qb-card-npc">'+(q.npc_icon||'\ud83d\udcdc')+' '+vEsc(q.npc)+'</span>';h+='</div>';if(q.active){h+='<div class="qb-card-badge qb-badge-active">\ud83d\udccc Em Andamento</div>';}
if(q.inv){h+='<span class="qb-card-badge qb-badge-inv">\ud83d\udd0d</span>';}
if(q.neg){h+='<span class="qb-card-badge qb-badge-neg">\ud83d\udcac</span>';}
h+='</div>';}
if(shown===0){h+='<div class="qb-empty">';h+='<div class="qb-empty-icon">\ud83d\udcdc</div>';h+='<div>'+_T.emptyTitle+'</div>';h+='<div class="qb-empty-hint">'+_T.emptyHint+'</div>';h+='</div>';}
if(d.flavor){h+='<div class="qb-flavor">'+vEsc(d.flavor)+'</div>';}
return h;}
function _renderListActions(){return'<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">'
+'Fechar</button>';}
function _renderDetailBody(d,q){var h='';h+='<div class="qb-detail-icon">';h+='<span class="qb-detail-icon-emoji">'+(q.npc_icon||'\ud83d\udcdc')+'</span>';h+='</div>';if(q.npc){h+='<div class="qb-detail-npc">';h+='\ud83d\udcdc Solicitante: '+vEsc(q.npc)+'</div>';}
var catLabel=q.cat==='daily'?'Di\u00e1ria':(q.cat==='story'?'Hist\u00f3ria':'Aventura');h+='<div class="qb-detail-meta">';h+='<span class="qb-cat-badge qb-cat-'+(q.cat||'daily')+'">'+catLabel+'</span>';h+='<span class="qb-detail-diff">'+(q.diff||'')+' N\u00edvel '+(q.min_lv||1)+'</span>';h+='</div>';if(q.desc){h+='<div class="v-popup-desc">'+vEsc(q.desc)+'</div>';}
if(q.objs&&q.objs.length>0){h+='<div class="v-popup-section-label">\ud83c\udfaf Objetivos</div>';for(var i=0;i<q.objs.length;i++){h+='<div class="qb-detail-obj">';h+=(i+1)+'. <em>'+vEsc(q.objs[i])+'</em></div>';}}
h+='<div class="v-popup-divider"></div>';h+='<div class="qb-detail-rewards">';h+='<div class="v-popup-section-label">\ud83d\udc8e Recompensas</div>';var rew='';if(q.gold)rew+='<span class="qb-detail-rew-gold">\ud83d\udcb0 '+q.gold+' 💰</span>';if(q.xp)rew+='<span>\u2728 '+q.xp+' XP</span>';h+='<div class="qb-detail-rew">'+rew+'</div>';h+='</div>';if(q.inv==='success'||q.inv==='crit_success'){if(q.hint){h+='<div class="qb-check-result qb-check-success">';h+='\ud83d\udd0d '+vEsc(q.hint)+'</div>';}}else if(q.inv==='fail'){h+='<div class="qb-check-result qb-check-fail">';h+=_T.invFail+'</div>';}
if(q.neg==='success'||q.neg==='crit_success'){if(q.neg_bonus){h+='<div class="qb-check-result qb-check-success">';h+='\ud83d\udcac Negocia\u00e7\u00e3o: '+vEsc(q.neg_bonus)+'</div>';}}else if(q.neg==='fail'){h+='<div class="qb-check-result qb-check-fail">';h+=_T.negFail+'</div>';}
if(q.rep_req){h+='<div class="qb-detail-rep">';h+='\u2694\uFE0F Reputa\u00e7\u00e3o Necess\u00e1ria: '+q.rep_req+'</div>';}
if(d.flash){h+='<div class="qb-flash">'+vEsc(d.flash)+'</div>';}
return h;}
function _renderDetailActions(d,q){var h='';if(q.active){h+='<button class="v-popup-btn" disabled>\ud83d\udccc Miss\u00e3o em Andamento</button>';}else if(q.can&&!d.is_capped){h+='<button class="v-popup-btn v-popup-btn--success" data-action="guild_quest_accept_'+q.id+'">'
+'\u2705 Aceitar Miss\u00e3o</button>';}
var checkBtns='';if(!q.inv&&q.inv_mod){checkBtns+='<button class="v-popup-btn" data-action="guild_quest_investigate_'+q.id+'">'
+'\ud83d\udd0d Investigar '+vEsc(q.inv_mod)+'</button>';}
if(!q.neg&&q.neg_mod&&!d.is_capped){checkBtns+='<button class="v-popup-btn" data-action="guild_quest_negotiate_'+q.id+'">'
+'\ud83d\udcac Negociar '+vEsc(q.neg_mod)+'</button>';}
if(checkBtns){h+='<div class="v-popup-btn-row">'+checkBtns+'</div>';}
h+='<button class="v-popup-btn v-popup-btn--cancel" data-action="qb_back">'
+'\ud83d\udccb Voltar ao Quadro</button>';return h;}
function _renderAcceptedBody(d){var a=d.accepted||{};var h='';if(a.ok){h+='<div class="qb-accepted-header">';h+='<span class="qb-accepted-icon">\u2705</span>';h+='<div class="qb-accepted-ok">'
+'Miss\u00e3o Aceita!</div>';h+='</div>';if(a.dialogue){h+='<div class="qb-accepted-dialogue">\ud83d\udcac \u201c'+vEsc(a.dialogue)+'\u201d</div>';}
h+='<div class="v-popup-desc">'+_T.acceptNarr+'</div>';h+='<div class="qb-accepted-quest">';h+='\ud83d\udcdc <strong>'+vEsc(a.title)+'</strong>';h+='</div>';if(a.obj){h+='<div class="qb-accepted-obj">'
+'\ud83c\udfaf '+vEsc(a.obj)+'</div>';}
h+='<div class="qb-accepted-farewell">'
+_T.acceptFarewell+'</div>';}else{h+='<div class="qb-accepted-header">';h+='<span class="qb-accepted-icon">\u274c</span>';h+='<div class="qb-accepted-fail">'
+'N\u00e3o foi poss\u00edvel aceitar</div>';h+='</div>';h+='<div class="v-popup-desc">'+vEsc(a.reason||_T.reqFallback)+'</div>';}
return h;}
function _renderAcceptedActions(d){var a=d.accepted||{};var h='';if(a.ok){h+='<button class="v-popup-btn v-popup-btn--success" data-action="cancel">'
+'\ud83c\udfe0 Continuar</button>';}else{h+='<button class="v-popup-btn v-popup-btn--cancel" data-action="qb_back">'
+'\ud83d\udccb Voltar ao Quadro</button>';}
return h;}
window.showQuestBoard=function(data){if(typeof vPopup==='undefined'){console.warn('[QUEST-BOARD] vPopup not loaded');return;}
_cachedData=data;_currentView=data.view||'list';_render(data);};function _render(d){var header,body,actions,headerClass='';if(_currentView==='accepted'){var isOk=d.accepted&&d.accepted.ok;header=isOk?'\u2705 Miss\u00e3o Aceita':'\u274c Quadro de Miss\u00f5es';headerClass=isOk?'v-popup-header--success':'v-popup-header--danger';body=_renderAcceptedBody(d);actions=_renderAcceptedActions(d);}else if(_currentView==='detail'&&d.sel){var quest=null;var quests=d.quests||[];for(var i=0;i<quests.length;i++){if(quests[i].id===d.sel){quest=quests[i];break;}}
if(!quest){_currentView='list';_render(d);return;}
header='\ud83d\udcdc '+vEsc(quest.title);body=_renderDetailBody(d,quest);actions=_renderDetailActions(d,quest);}else{header='\ud83d\udccb Quadro de Miss\u00f5es';body=_renderListBody(d);actions=_renderListActions();}
vPopup.show({id:'quest-board-overlay',header:header,headerClass:headerClass,body:body,actions:actions,onAction:_handleAction,closeOnOutside:(_currentView==='list')});_bindListeners();}
function _bindListeners(){var tabs=document.querySelectorAll('.qb-filters .v-tab');for(var t=0;t<tabs.length;t++){tabs[t].addEventListener('click',function(e){e.preventDefault();e.stopPropagation();_activeFilter=e.currentTarget.getAttribute('data-qb-filter')||'all';_render(_cachedData);});}
var cards=document.querySelectorAll('.qb-card');for(var c=0;c<cards.length;c++){cards[c].addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var qid=e.currentTarget.getAttribute('data-qb-quest');if(qid){_cachedData.sel=qid;_currentView='detail';_render(_cachedData);}});}}
function _handleAction(action,btn){if(action==='qb_back'){_currentView='list';_cachedData.sel=null;_cachedData.flash=null;_render(_cachedData);return true;}
return false;}
window.hideQuestBoard=function(){if(typeof vPopup!=='undefined')vPopup.hide();};})();