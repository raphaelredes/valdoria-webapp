/* Travel Journal — standalone function for hub-based Navigate
 * Extracted from navigate-core.js so hub.js can use it without loading
 * the full map-based navigate module (which has conflicting globals). */
var _SAFE_TYPES={'safe':1,'forced_march_ok':1,'weather_save_ok':1};

function _hideTravelOverlay(){
  var overlay=document.getElementById('travel-overlay');
  if(overlay){
    overlay.classList.remove('visible');
    setTimeout(function(){if(overlay.parentNode)overlay.parentNode.removeChild(overlay);},400);
  }
  if(window.vProcessing&&vProcessing.isActive())vProcessing.hide();
}

function _showTravelJournal(log,redirectUrl){
  _hideTravelOverlay();
  var _hasDeath=log.some(function(e){return e.type==='exhaustion_death';});
  /* Compact consecutive safe passages */
  var compacted=[];var safeRun=0;
  for(var _ci=0;_ci<log.length;_ci++){
    if(_SAFE_TYPES[log[_ci].type]){safeRun++;continue;}
    if(safeRun>0){compacted.push(safeRun===1?{type:'safe',icon:'\u2714\ufe0f',text:'Trecho seguro',detail:'',_compact:true}:{type:'safe',icon:'\u2714\ufe0f',text:safeRun+' trechos seguros',detail:'',_group:true});safeRun=0;}
    compacted.push(log[_ci]);
  }
  if(safeRun>0){compacted.push(safeRun===1?{type:'safe',icon:'\u2714\ufe0f',text:'Trecho seguro',detail:'',_compact:true}:{type:'safe',icon:'\u2714\ufe0f',text:safeRun+' trechos seguros',detail:'',_group:true});}
  /* Stats */
  var _xpT=0,_gpT=0,_hpL=0,_safes=0,_enc=0,_disc=0;
  for(var _si=0;_si<log.length;_si++){
    var _st=log[_si].type;
    if(log[_si].xp)_xpT+=log[_si].xp;if(log[_si].gp)_gpT+=log[_si].gp;if(log[_si].hp_lost)_hpL+=log[_si].hp_lost;
    if(_SAFE_TYPES[_st])_safes++;if(_st==='encounter')_enc++;if(_st==='arrival_new'||_st==='discovery'||_st==='cartograph_ok')_disc++;
  }
  /* Paginate: max 5 events per page */
  var PER_PAGE=5;var pages=[];
  for(var _pi=0;_pi<compacted.length;_pi+=PER_PAGE){pages.push(compacted.slice(_pi,_pi+PER_PAGE));}
  if(pages.length===0)pages.push([]);var totalPages=pages.length;
  /* Build HTML */
  var bodyHtml='';var _evData=[];
  for(var pg=0;pg<totalPages;pg++){
    bodyHtml+='<div class="tj-page'+(pg===0?' tj-page--active':'')+'" data-page="'+pg+'"><div class="tj-timeline">';
    var items=pages[pg];
    for(var i=0;i<items.length;i++){
      var e=items[i];var _cls='tj-event';
      if(e._compact)_cls+=' tj-event--compact';if(e._group)_cls+=' tj-event--group';
      var _hasDetail=e.detail&&e.detail.length>0&&!e._compact&&!e._group;
      if(_hasDetail)_evData.push({icon:e.icon,text:e.text,detail:e.detail});
      bodyHtml+='<div class="'+_cls+'"><div class="tj-dot tj-dot--'+vEsc(e.type)+'">'+vEsc(e.icon)+'</div><div class="tj-card tj-card--'+vEsc(e.type)+'"'+(_hasDetail?' data-ev-idx="'+(_evData.length-1)+'"':'')+'><div class="tj-title">'+vEsc(e.text)+'</div>'+(_hasDetail?'<div class="tj-expand">\u25b8 Ver detalhes</div>':'')+'</div></div>';
    }
    bodyHtml+='</div></div>';
  }
  /* Summary */
  bodyHtml+='<div class="tj-summary" data-summary>';
  bodyHtml+='<div class="tj-stat"><div class="tj-stat-val">'+log.length+'</div><div class="tj-stat-label">Eventos</div></div><div class="tj-stat-sep"></div>';
  if(_xpT>0)bodyHtml+='<div class="tj-stat"><div class="tj-stat-val tj-stat-val--xp">+'+_xpT+'</div><div class="tj-stat-label">XP</div></div>';
  if(_gpT>0)bodyHtml+='<div class="tj-stat"><div class="tj-stat-val tj-stat-val--gp">+'+_gpT+'</div><div class="tj-stat-label">Ouro</div></div>';
  if(_hpL>0)bodyHtml+='<div class="tj-stat"><div class="tj-stat-val tj-stat-val--hp">-'+_hpL+'</div><div class="tj-stat-label">HP</div></div>';
  if(!_xpT&&!_gpT&&!_hpL){
    if(_disc>0)bodyHtml+='<div class="tj-stat"><div class="tj-stat-val">'+_disc+'</div><div class="tj-stat-label">Descobertas</div></div>';
    if(_enc>0)bodyHtml+='<div class="tj-stat"><div class="tj-stat-val">'+_enc+'</div><div class="tj-stat-label">Encontros</div></div>';
    if(_safes>0)bodyHtml+='<div class="tj-stat"><div class="tj-stat-val">'+_safes+'</div><div class="tj-stat-label">Seguros</div></div>';
  }
  bodyHtml+='</div>';
  /* Pager */
  if(totalPages>1){
    bodyHtml+='<div class="tj-pager" data-pager><button class="tj-pager-btn" data-pg-prev disabled>\u25c2</button><div class="tj-pager-dots">';
    for(var _di=0;_di<totalPages;_di++){bodyHtml+='<div class="tj-pager-dot'+(_di===0?' active':'')+'"></div>';}
    bodyHtml+='</div><button class="tj-pager-btn" data-pg-next>\u25b8</button></div>';
  }
  /* Show popup */
  var _journalDone=false;var _btnLabel=_hasDeath?'Despertar no Templo \ud83c\udfdb\ufe0f':'Continuar Viagem \u27a1';var _curPage=0;
  vPopup.show({id:'v-popup-overlay',header:'\ud83d\udcdc Di\u00e1rio de Viagem',body:bodyHtml,
    actions:[{label:_btnLabel,action:'continue_travel',cls:'v-popup-btn v-popup-btn--primary'}],
    onAction:function(action){
      if(action==='continue_travel'){
        if(_journalDone)return;_journalDone=true;
        var _rl=[];for(var _ri=0;_ri<log.length;_ri++){if(log[_ri].type==='arrival_new'&&log[_ri].loc_id)_rl.push(log[_ri].loc_id);}
        if(_rl.length)try{localStorage.setItem('valdoria_reveal_locs',JSON.stringify(_rl));}catch(e){console.warn('[NAVIGATE]',e);}
        window.__valdoria_transitioning=true;
        if(typeof valdoriaSpaNav==='function')valdoriaSpaNav(redirectUrl);else window.location.replace(redirectUrl);
        return true;
      }
    },
    closeOnOutside:false,
    onReady:function(overlay){
      overlay.setAttribute('data-journal','1');
      /* Detail popup handlers */
      overlay.querySelectorAll('.tj-expand').forEach(function(el){
        el.addEventListener('click',function(){
          var card=el.closest('.tj-card');var idx=parseInt(card.getAttribute('data-ev-idx'),10);
          if(isNaN(idx)||!_evData[idx])return;var ev=_evData[idx];
          vPopup.show({id:'tj-detail-overlay',header:ev.icon+' '+ev.text,
            body:'<div class="tj-detail-popup"><div class="tj-detail-icon">'+vEsc(ev.icon)+'</div><div class="tj-detail-title">'+vEsc(ev.text)+'</div><div class="tj-detail-sep"></div><div class="tj-detail-text">'+vEsc(ev.detail)+'</div></div>',
            actions:[{label:'Voltar ao Di\u00e1rio',action:'back',cls:'v-popup-btn v-popup-btn--cancel'}],
            onAction:function(a){if(a==='back'){vPopup.hide();return true;}}
          });
        });
      });
      /* Pager handlers */
      var _pages=overlay.querySelectorAll('.tj-page');var _dots=overlay.querySelectorAll('.tj-pager-dot');
      var _prev=overlay.querySelector('[data-pg-prev]');var _next=overlay.querySelector('[data-pg-next]');
      function _goPage(n){
        if(n<0||n>=totalPages)return;_curPage=n;
        _pages.forEach(function(p,idx){p.classList.toggle('tj-page--active',idx===n);});
        _dots.forEach(function(d,idx){d.classList.toggle('active',idx===n);});
        if(_prev)_prev.disabled=(n===0);if(_next)_next.disabled=(n===totalPages-1);
        var newEvents=_pages[n].querySelectorAll('.tj-event');
        newEvents.forEach(function(el,idx){el.classList.remove('tj-revealed');setTimeout(function(){el.classList.add('tj-revealed');},80+idx*120);});
      }
      if(_prev)_prev.addEventListener('click',function(){_goPage(_curPage-1);});
      if(_next)_next.addEventListener('click',function(){_goPage(_curPage+1);});
      /* Initial reveal animation */
      var firstEvents=overlay.querySelectorAll('.tj-page--active .tj-event');
      var summary=overlay.querySelector('[data-summary]');
      var continueBtn=overlay.querySelector('[data-action="continue_travel"]');
      if(continueBtn)continueBtn.style.opacity='0';
      var _stagger=Math.min(280,1400/Math.max(1,firstEvents.length));
      firstEvents.forEach(function(el,idx){setTimeout(function(){el.classList.add('tj-revealed');},200+idx*_stagger);});
      var totalDelay=Math.max(2000,200+firstEvents.length*_stagger+400);
      if(summary)setTimeout(function(){summary.classList.add('tj-revealed');},totalDelay-300);
      setTimeout(function(){if(continueBtn){continueBtn.style.transition='opacity var(--v-transition-base)';continueBtn.style.opacity='1';}},totalDelay);
    }
  });
}
