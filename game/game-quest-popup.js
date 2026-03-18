(function(){'use strict';function _esc(text){if(!text)return'';return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function _renderBody(q){var h='';var npcIcon=q.npc_icon||'\u2694\uFE0F';h+='<div style="text-align:center;margin-bottom:8px;">';h+='<span style="font-size:28px;">'+npcIcon+'</span>';h+='</div>';if(q.ready){h+='<div style="text-align:center;padding:6px 12px;margin-bottom:10px;'
+'background:rgba(76,175,80,0.12);border:1px solid rgba(76,175,80,0.3);'
+'border-radius:6px;color:#81c784;font-size:13px;font-weight:600;">'
+'\u2705 Pronta para entrega</div>';}
if(q.chain){h+='<div style="text-align:center;font-size:12px;color:var(--v-text-dim);margin-bottom:8px;">'
+'\ud83d\udd17 Cap\u00edtulo '+q.chain.part+' de '+q.chain.total;if(q.chain.next_title){h+=' \u2192 Pr\u00f3ximo: <em>'+_esc(q.chain.next_title)+'</em>';}
h+='</div>';}
if(q.desc){h+='<div class="v-popup-desc">'+_esc(q.desc)+'</div>';}
if(q.obj&&q.status==='active'){h+='<div style="margin-bottom:10px;">';h+='<div class="v-popup-section-label">\ud83d\udcdc O que voc\u00ea sabe</div>';if(q.ready){h+='<div style="font-size:13px;color:var(--v-text);font-style:italic;">'
+'A miss\u00e3o est\u00e1 cumprida. Resta apenas reportar o feito.</div>';}else{h+='<div style="font-size:13px;color:var(--v-text);font-style:italic;">'
+_esc(q.obj)+'</div>';}
h+='</div>';}
if(q.objectives&&q.objectives.length>0){var hasCompleted=false;for(var ci=0;ci<q.objectives.length;ci++){if(q.objectives[ci].state==='done'){hasCompleted=true;break;}}
if(hasCompleted){h+='<div style="margin-bottom:10px;padding:8px;background:rgba(74,56,40,0.1);border-radius:6px;">';h+='<div class="v-popup-section-label">\ud83d\udcd6 Sua Jornada</div>';for(var i=0;i<q.objectives.length;i++){var o=q.objectives[i];if(o.state==='future')continue;var marker=o.state==='done'?'\u2705':'\u25b8';var color=o.state==='done'?'var(--v-text-dim)':'var(--v-text)';h+='<div style="font-size:12px;color:'+color+';padding:2px 0;">'
+marker+' <em>'+_esc(o.text)+'</em></div>';}
h+='</div>';}}
if(q.hint){h+='<div style="font-size:12px;color:var(--v-info,#5b9bd5);font-style:italic;'
+'margin-bottom:10px;padding:6px 10px;background:rgba(91,155,213,0.08);'
+'border-radius:6px;">\ud83d\udcd6 '+_esc(q.hint)+'</div>';}
if(q.npc){h+='<div style="font-size:12px;color:var(--v-text-dim);margin-bottom:10px;">'
+(q.npc_icon||'\ud83d\udc64')+' '+_esc(q.npc)+'</div>';}
var rewHtml='';if(q.xp)rewHtml+='<span style="margin-right:10px;">\u2728 '+q.xp+' XP</span>';if(q.gold)rewHtml+='<span style="margin-right:10px;">\ud83d\udcb0 '+q.gold+' GP</span>';if(q.items&&q.items.length>0){for(var ii=0;ii<q.items.length;ii++){rewHtml+='<span style="margin-right:10px;">\ud83c\udf81 '+_esc(q.items[ii])+'</span>';}}
if(rewHtml){h+='<div style="margin-top:6px;padding:8px 10px;background:rgba(196,149,58,0.08);'
+'border-radius:6px;border:1px solid rgba(196,149,58,0.15);">';h+='<div class="v-popup-section-label">\ud83d\udc8e Recompensas</div>';h+='<div style="font-size:13px;color:var(--v-text);">'+rewHtml+'</div>';h+='</div>';}
return h;}
function _renderActions(q){var h='';if(q.can_turnin&&q.turnin_cb){h+='<button class="v-popup-btn v-popup-btn--success" data-action="'+q.turnin_cb+'">'
+'\ud83d\udcdc Entregar Miss\u00e3o</button>';}
if(q.can_abandon&&q.abandon_cb){h+='<button class="v-popup-btn v-popup-btn--danger" data-action="'+q.abandon_cb+'">'
+'\u274c Abandonar</button>';}
h+='<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">'
+'\ud83c\udfe0 Voltar</button>';return h;}
window.showQuestPopup=function(data){if(typeof vPopup==='undefined'){console.warn('[QUEST-POPUP] vPopup not loaded');return;}
vPopup.show({id:'quest-popup-overlay',header:'\u2694\uFE0F '+_esc(data.title||'Detalhes da Miss\u00e3o'),body:_renderBody(data),actions:_renderActions(data)});};window.hideQuestPopup=function(){if(typeof vPopup!=='undefined')vPopup.hide();};window.showQuestDiaryPopup=function(data){var overlay=document.getElementById('quest-diary-overlay');var body=document.getElementById('quest-diary-body');if(!overlay||!body){console.warn('[QUEST-POPUP] quest-diary-overlay not found');return;}
body.innerHTML='';if(typeof renderQuestDiary==='function'){renderQuestDiary(body,data);}else{body.innerHTML='<div style="text-align:center;color:var(--v-text-dim);padding:20px;">'
+'Carregando missões...</div>';console.error('[QUEST-POPUP] renderQuestDiary not available');}
overlay.style.display='flex';requestAnimationFrame(function(){overlay.classList.add('active');});};window.hideQuestDiaryPopup=function(){var overlay=document.getElementById('quest-diary-overlay');if(!overlay)return;overlay.classList.add('hiding');overlay.classList.remove('active');setTimeout(function(){overlay.style.display='none';overlay.classList.remove('hiding');},300);};window.showQuestAbandonPopup=function(data){if(typeof vPopup==='undefined'){console.warn('[QUEST-POPUP] vPopup not loaded');return;}
var warnText=data.is_daily?'Ao desistir, tudo que foi feito se perderá. Tarefas diárias abandonadas contam para o limite do dia.':'Ao desistir, você perderá tudo que conquistou nesta jornada. Poderá retomá-la mais tarde.';
var bodyHtml='<div style="text-align:center;margin-bottom:12px;"><span style="font-size:32px;">⚠️</span></div>'
+'<div style="text-align:center;font-size:14px;color:var(--v-text);margin-bottom:12px;">📜 <b>'+_esc(data.title)+'</b></div>'
+'<div style="font-size:13px;color:var(--v-text-dim);text-align:center;line-height:1.5;">'+warnText+'</div>';
var actionsHtml='<button class="v-popup-btn v-popup-btn--danger" data-action="'+data.confirm_cb+'">✅ Sim, Abandonar</button>'
+'<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">🔙 Cancelar</button>';
vPopup.show({id:'quest-abandon-popup',header:'⚠️ Abandonar Missão',body:bodyHtml,actions:actionsHtml});};
})();