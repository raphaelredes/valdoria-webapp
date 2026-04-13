/* Travel Journal — DiaryEngine-based implementation
 * Called from hub.js via _showTravelJournal(log, redirectUrl).
 * Uses shared/diary-engine.js + shared/diary.css for rendering. */
var _SAFE_TYPES={'safe':1,'forced_march_ok':1,'weather_save_ok':1};

function _hideTravelOverlay(){
  var overlay=document.getElementById('diary-overlay');
  if(overlay){
    overlay.classList.remove('visible');
    setTimeout(function(){if(overlay.parentNode)overlay.parentNode.removeChild(overlay);},400);
  }
  if(window.vProcessing&&vProcessing.isActive())vProcessing.hide();
}

function _showTravelJournal(log,redirectUrl){
  _hideTravelOverlay();
  console.info('[TRAVEL-JOURNAL]','showing',log.length,'events, redirectUrl=',(redirectUrl||'(none)').toString().substring(0,60));

  var _hasDeath=log.some(function(e){return e.type==='exhaustion_death';});

  /* ── Compact consecutive safe passages ── */
  var compacted=[];var safeRun=0;
  for(var ci=0;ci<log.length;ci++){
    if(_SAFE_TYPES[log[ci].type]){safeRun++;continue;}
    if(safeRun>0){
      compacted.push(safeRun===1
        ?{type:'safe',icon:'\u2714\ufe0f',text:'Trecho seguro',compact:true}
        :{type:'safe',icon:'\u2714\ufe0f',text:safeRun+' trechos seguros',compact:true});
      safeRun=0;
    }
    compacted.push(log[ci]);
  }
  if(safeRun>0){
    compacted.push(safeRun===1
      ?{type:'safe',icon:'\u2714\ufe0f',text:'Trecho seguro',compact:true}
      :{type:'safe',icon:'\u2714\ufe0f',text:safeRun+' trechos seguros',compact:true});
  }

  /* ── Insert _loading events between natural breaks ── */
  var _loadTexts=['Avan\u00e7ando pela trilha...','Seguindo viagem...','Prosseguindo...','Caminhando...'];
  var _loadIdx=0;
  var withLoading=[];var simpleCount=0;
  for(var li=0;li<compacted.length;li++){
    var ev=compacted[li];
    var isInteractive=(ev.type==='hazard_dice'||ev.type==='encounter_choice');
    if(isInteractive&&simpleCount>0){
      withLoading.push({type:'_loading',text:_loadTexts[_loadIdx%_loadTexts.length]});
      _loadIdx++;simpleCount=0;
    }
    withLoading.push(ev);
    if(!isInteractive&&ev.type!=='_loading'){
      simpleCount++;
      if(simpleCount>=4&&li<compacted.length-1){
        withLoading.push({type:'_loading',text:_loadTexts[_loadIdx%_loadTexts.length]});
        _loadIdx++;simpleCount=0;
      }
    }
  }

  /* ── Build overlay DOM ── */
  var overlay=document.createElement('div');
  overlay.id='diary-overlay';
  overlay.className='diary-overlay';

  /* Header */
  var header=document.createElement('div');
  header.className='diary-header';
  var ornTop=document.createElement('div');
  ornTop.className='ornament';
  ornTop.textContent='\u25c6  \u2500\u2500\u2500  \u25c6  \u2500\u2500\u2500  \u25c6';
  header.appendChild(ornTop);
  var h1=document.createElement('h1');
  h1.textContent='\ud83d\udcdc Di\u00e1rio de Viagem';
  header.appendChild(h1);
  var sep=document.createElement('div');
  sep.className='sep';
  header.appendChild(sep);
  overlay.appendChild(header);

  /* Progress bar */
  var progWrap=document.createElement('div');
  progWrap.className='diary-progress';
  var progBar=document.createElement('div');
  progBar.className='diary-progress-bar';
  var progFill=document.createElement('div');
  progFill.className='diary-progress-fill';
  progBar.appendChild(progFill);
  progWrap.appendChild(progBar);
  overlay.appendChild(progWrap);

  /* Page area */
  var pageArea=document.createElement('div');
  pageArea.className='diary-page';
  overlay.appendChild(pageArea);

  /* Footer area */
  var footerArea=document.createElement('div');
  footerArea.className='diary-footer';
  footerArea.style.display='none';
  overlay.appendChild(footerArea);

  document.body.appendChild(overlay);

  /* ── Wire DiaryEngine ── */
  if(typeof DiaryEngine==='undefined'){
    console.error('[TRAVEL-JOURNAL] DiaryEngine not loaded — skipping journal');
    if(overlay.parentNode)overlay.parentNode.removeChild(overlay);
    window.__valdoria_transitioning=true;
    if(typeof redirectUrl==='function'){redirectUrl();}
    else if(redirectUrl){window.location.replace(redirectUrl);}
    return;
  }
  var diary=new DiaryEngine(pageArea,footerArea,progFill);

  /* Choice handler for interactive choices (calls backend API) */
  diary.setChoiceHandler(function(choiceIdx,ev){
    var apiUrl=(window.S&&S.api)||'';
    var token=(window.S&&S.token)||'';
    var uid=(window.S&&S.uid)||0;
    fetch(apiUrl+'/api/navigate/choice',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({token:token,uid:uid,choice_idx:choiceIdx})
    })
    .then(function(r){return r.json();})
    .then(function(data){
      if(data.error){
        console.error('[TRAVEL-JOURNAL] choice error:',data.error);
        diary.showChoiceResult({type:'safe',icon:'\u2714\ufe0f',text:'Continuou a viagem.'});
        return;
      }
      diary.showChoiceResult(data.result);
      if(data.events&&data.events.length)diary.appendEvents(data.events);
    })
    .catch(function(err){
      console.error('[TRAVEL-JOURNAL] choice fetch error:',err);
      diary.showChoiceResult({type:'safe',icon:'\u2714\ufe0f',text:'Continuou a viagem.'});
    });
  });

  diary.start(withLoading,function(fa,stats){
    /* Save discovered locations */
    var revealLocs=[];
    for(var ri=0;ri<log.length;ri++){
      if(log[ri].type==='arrival_new'&&log[ri].loc_id)revealLocs.push(log[ri].loc_id);
    }
    if(revealLocs.length){
      try{localStorage.setItem('valdoria_reveal_locs',JSON.stringify(revealLocs));}catch(e){console.warn('[TRAVEL-JOURNAL]',e);}
    }

    /* Build final button */
    var _journalDone=false;
    var btnLabel=_hasDeath?'Despertar no Templo \ud83c\udfdb\ufe0f':'Continuar Viagem \u27a1';
    var btn=document.createElement('button');
    btn.className='diary-action-btn';
    btn.textContent=btnLabel;
    btn.addEventListener('click',function(){
      if(_journalDone)return;
      _journalDone=true;
      /* Remove overlay */
      if(overlay.parentNode)overlay.parentNode.removeChild(overlay);
      /* Redirect */
      window.__valdoria_transitioning=true;
      if(typeof redirectUrl==='function'){redirectUrl();}
      else if(typeof valdoriaSpaNav==='function'){valdoriaSpaNav(redirectUrl);}
      else if(redirectUrl){window.location.replace(redirectUrl);}
    });
    fa.appendChild(btn);
  });
}
