(function(){"use strict";
function showImagePopup(cfg){if(!cfg||!cfg.src)return;
var bodyEl=document.createElement('div');bodyEl.className='v-img-popup-content';
if(cfg.type)bodyEl.setAttribute('data-type',cfg.type);
var imgWrap=document.createElement('div');imgWrap.className='v-img-popup-img-wrap';
var img=document.createElement('img');img.className='v-img-popup-img';img.src=cfg.src;img.alt=cfg.title||'';img.loading='lazy';
img.onerror=function(){img.style.display='none';};
imgWrap.appendChild(img);bodyEl.appendChild(imgWrap);
if(cfg.stats&&cfg.stats.length>0){var statsEl=document.createElement('div');statsEl.className='v-img-popup-stats';
statsEl.innerHTML=cfg.stats.map(function(s){return'<span class="v-img-popup-stat">'+vEsc(s.icon)+' '+vEsc(s.label)+' <span class="v-img-popup-stat-val">'+vEsc(s.value)+'<\/span><\/span>';}).join('');
bodyEl.appendChild(statsEl);}
if(cfg.desc){var descEl=document.createElement('div');descEl.className='v-img-popup-desc';descEl.textContent=cfg.desc;bodyEl.appendChild(descEl);}
var headerClass='';if(cfg.type==='enemy')headerClass='v-popup-header--danger';
else if(cfg.type==='event')headerClass='v-popup-header--success';
vPopup.show({header:cfg.title||'',headerClass:headerClass,bodyEl:bodyEl,
actions:'<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">Fechar<\/button>'});
if(typeof haptic==='function')haptic('light');}
function hideImagePopup(){if(typeof vPopup!=='undefined')vPopup.hide();}
window.showImagePopup=showImagePopup;window.hideImagePopup=hideImagePopup;})();
