(function(){'use strict';
function _questActionHtml(data,backAction,backLabel){var h='';if(data.can_turnin&&data.turnin_cb){h+='<button class="v-popup-btn v-popup-btn--success" data-action="'+data.turnin_cb+'">📜 Entregar Missão</button>';}
if(data.can_abandon&&data.abandon_cb){h+='<button class="v-popup-btn v-popup-btn--danger" data-action="'+data.abandon_cb+'">❌ Abandonar</button>';}
h+='<button class="v-popup-btn v-popup-btn--cancel" data-action="'+(backAction||'cancel')+'">'+(backLabel||'🏠 Voltar')+'</button>';return h;}
function _diaryNav(action){if(action==='action_quests'){if(typeof doAction==='function')doAction(action);return true;}return false;}
window.showQuestPopup=function(data){if(typeof vPopup==='undefined'){console.error('[QUEST-POPUP] vPopup not loaded');return;}
var bodyEl=document.createElement('div');if(typeof renderQuestDetail==='function'){renderQuestDetail(bodyEl,data);}
var diaryOv=document.getElementById('quest-diary-overlay');var inDiary=diaryOv&&diaryOv.classList.contains('active');var oid=inDiary?'quest-diary-overlay':'quest-popup-overlay';var bAct=inDiary?'action_quests':'cancel';var bLbl=inDiary?'📝 Voltar às Missões':'🏠 Voltar';
vPopup.show({id:oid,header:'⚔️ '+_escQ(data.title||'Detalhes da Missão'),bodyEl:bodyEl,actions:_questActionHtml(data,bAct,bLbl),onAction:inDiary?_diaryNav:null});};
window.hideQuestPopup=function(){if(typeof vPopup!=='undefined')vPopup.hide();};
window.showQuestDiaryPopup=function(data){if(typeof vPopup==='undefined'){console.error('[QUEST-POPUP] vPopup not loaded');return;}
var bodyEl=document.createElement('div');if(typeof renderQuestDiary==='function'){renderQuestDiary(bodyEl,data);}else{bodyEl.innerHTML='<div style="text-align:center;color:var(--v-text-dim);padding:20px;">Carregando missões...</div>';console.error('[QUEST-POPUP] renderQuestDiary not available');}
vPopup.show({id:'quest-diary-overlay',header:'📜 Missões',bodyEl:bodyEl,actions:'<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">🏠 Voltar</button>'});};
window.hideQuestDiaryPopup=function(){if(typeof vPopup!=='undefined')vPopup.hide();};
window.showQuestAbandonPopup=function(data){if(typeof vPopup==='undefined'){console.error('[QUEST-POPUP] vPopup not loaded');return;}
var bodyEl=document.createElement('div');if(typeof renderQuestAbandon==='function'){renderQuestAbandon(bodyEl,data);}
var diaryOv=document.getElementById('quest-diary-overlay');var inDiary=diaryOv&&diaryOv.classList.contains('active');var oid=inDiary?'quest-diary-overlay':'quest-popup-overlay';var cAct=inDiary?'action_quests':'cancel';
vPopup.show({id:oid,header:'⚠️ Abandonar Missão',bodyEl:bodyEl,actions:'<button class="v-popup-btn v-popup-btn--danger" data-action="'+data.confirm_cb+'">✅ Sim, Abandonar</button>'+'<button class="v-popup-btn v-popup-btn--cancel" data-action="'+cAct+'">🔙 Cancelar</button>',onAction:inDiary?_diaryNav:null});};
})();
