// MIN_LOAD_MS enforced by loading-guard.js
var COLS=11,ROWS=13;var IMPASSABLE=new Set(['W','M','L','#','D']);var EVEN_OFFSETS=[[-1,-1],[0,-1],[-1,0],[1,0],[-1,1],[0,1]];var ODD_OFFSETS=[[0,-1],[1,-1],[-1,0],[1,0],[0,1],[1,1]];var STAT_NAMES={str:'Força',dex:'Destreza',con:'Constituição',int:'Inteligência',wis:'Sabedoria',cha:'Carisma',atl:'Atletismo',acr:'Acrobacia',slh:'Prestidigitação',stl:'Furtividade',arc:'Arcanismo',his:'História',inv:'Investigação',nat:'Natureza',rel:'Religião',anh:'Lid. Animais',ins:'Intuição',med:'Medicina',per:'Percepção',sur:'Sobrevivência',dec:'Enganação',itm:'Intimidação',prf:'Atuação',prs:'Persuasão',};var STAT_SHORT={str:'FOR',dex:'DES',con:'CON',int:'INT',wis:'SAB',cha:'CAR',atl:'ATL',acr:'ACR',slh:'PRE',stl:'FUR',arc:'ARC',his:'HIS',inv:'INV',nat:'NAT',rel:'REL',anh:'ANI',ins:'ITU',med:'MED',per:'PER',sur:'SOB',dec:'ENG',itm:'ITM',prf:'ATU',prs:'PRS',};var POI_TYPE_LABELS={dis:'Descoberta',sea:'Busca',dan:'Perigo',mys:'Mistério',npc:'Encontro'};var _POI_TYPE_ICONS={dis:'\ud83d\udddd\ufe0f',sea:'\ud83d\udd0d',dan:'\u26a0\ufe0f',mys:'\u2728',npc:'\ud83d\udde3\ufe0f',soc:'\ud83e\udd1d',loot:'\ud83d\udcb0',trap:'\u26a1',discovery:'\ud83d\udddd\ufe0f',danger:'\u26a0\ufe0f',mystery:'\u2728',combat:'\u2694\ufe0f',search:'\ud83d\udd0d',enc:'\u2694\ufe0f'};var _ENC_TYPE_ICONS={amb:'\u2694\ufe0f',trp:'\u26a1',trap:'\u26a1',hid:'\ud83d\udddd\ufe0f',hidden:'\ud83d\udddd\ufe0f',snd:'\ud83d\udc41\ufe0f',sound:'\ud83d\udc41\ufe0f',wth:'\ud83c\udf29\ufe0f'};var S={grid:[],pois:[],biome:'forest',playerCol:0,playerRow:0,exitCol:0,exitRow:0,visibility:3,visited:new Set(),fogState:{},xpEarned:0,goldEarned:0,hpChange:0,itemsFound:[],poisResolved:new Set(),checksPerformed:[],combatTrigger:null,charData:null,token:'',dmIntro:'',dangerLevel:1,randomEncounters:[],conditions:[],exhaustion:0,_stepsWithoutRest:0,_stepsForRation:0,_fatigue:0,_fatiguePeriods:0,_secondWindUsed:false,_healingSpringUsed:false,_longRestCount:0,mpChange:0,_hdUsed:0,_longRestAmbushSafe:false,_hazardsTriggered:new Set(),_watchUsed:false,_flavorSteps:0,travelPace:'normal',travelActivity:null,interactedHexes:new Set(),moveLog:[],_stepCount:0,inventory:[],inventoryUsed:[],_lowHPAlertShown:false,};
/* Safe haptic — Telegram WebApp v6.0 has HapticFeedback obj but methods throw */
var _tgVer=(window.Telegram&&Telegram.WebApp&&Telegram.WebApp.version)?parseFloat(Telegram.WebApp.version):0;
var _safeHaptic={impact:function(t){try{if(_tgVer>=6.1&&Telegram.WebApp.HapticFeedback)Telegram.WebApp.HapticFeedback.impactOccurred(t||'light');else if(navigator.vibrate)navigator.vibrate(8);}catch(_){}},notify:function(t){try{if(_tgVer>=6.1&&Telegram.WebApp.HapticFeedback)Telegram.WebApp.HapticFeedback.notificationOccurred(t||'success');}catch(_){}},select:function(){try{if(_tgVer>=6.1&&Telegram.WebApp.HapticFeedback)Telegram.WebApp.HapticFeedback.selectionChanged();}catch(_){}}};
/* Hex directional navigation — terrain display */
var HEX_DIR_ARROWS=['\u2196','\u2197','\u2190','\u2192','\u2199','\u2198'];
var TERRAIN_EMOJI={'.':'\ud83c\udf3f','g':'\ud83c\udf3e','f':'\ud83c\udf32','~':'\ud83d\udca7','m':'\ud83d\udfe4','r':'\ud83e\udea8','H':'\u26f0\ufe0f','s':'\ud83c\udfdc\ufe0f','i':'\u2744\ufe0f','L':'\ud83c\udf0b','W':'\ud83c\udf0a','#':'\ud83e\uddf1','D':'\ud83d\udeaa','C':'\u2728','@':'\ud83d\udccd','E':'\ud83d\udccd','S':'\ud83c\udf3f','R':'\ud83c\udfda\ufe0f','w':'\ud83d\udca7'};
var TERRAIN_NAME={'.':'Aberto','g':'Grama','f':'Floresta','~':'Pantano','m':'Lama','r':'Rochoso','H':'Colina','s':'Areia','i':'Gelo','L':'Lava','W':'Agua','#':'Muro','D':'Porta','C':'Bau','@':'Entrada','E':'Saida','S':'Arbusto','R':'Ruinas','w':'Riacho'};
var DIFFICULT_TILES=new Set(['~','m','i','s','S']);
/* Detect interesting content at a hex (POI, encounter tile, chest, locked door, trap, exit). */
function _hexHasContent(col,row){
  if(!S.grid||row<0||row>=ROWS||col<0||col>=COLS)return null;
  var tile=S.grid[row]&&S.grid[row][col]?S.grid[row][col]:'.';
  /* Exit portal */
  if(col===S.exitCol&&row===S.exitRow)return{type:'exit',icon:'\ud83c\udfd5\ufe0f'};
  /* Tile-based content (chests, doors, encounter markers) */
  if(tile==='C')return{type:'chest',icon:'\ud83d\udcb0'};
  if(tile==='D')return{type:'door',icon:'\ud83d\udeaa'};
  if(tile==='E')return{type:'event',icon:'\u2728'};
  if(tile==='@')return{type:'event',icon:'\u2728'};
  if(tile.match&&tile.match(/[0-9]/))return{type:'event',icon:'\u2728'};
  /* POI overlays — only those visible to player (resolved or hidden are skipped) */
  if(S.pois&&S.pois.length){
    for(var i=0;i<S.pois.length;i++){
      var p=S.pois[i];
      if(p.col!==col||p.row!==row)continue;
      if(S.poisResolved&&S.poisResolved.has(p.id))continue;
      if(p.hidden)continue;
      var icon='\u2728';
      if(p.type==='dan'||p.type==='danger')icon='\u26a0\ufe0f';
      else if(p.type==='npc')icon='\ud83d\udde3\ufe0f';
      else if(p.type==='sea'||p.type==='search')icon='\ud83d\udd0d';
      else if(p.type==='dis'||p.type==='discovery')icon='\ud83d\udddd\ufe0f';
      return{type:p.type||'poi',icon:icon};
    }
  }
  /* Visible chests on the tile */
  if(S.chests&&S.chests.length){
    for(var ci=0;ci<S.chests.length;ci++){
      var ch=S.chests[ci];
      if(ch.col===col&&ch.row===row&&!ch.opened)return{type:'chest',icon:'\ud83d\udcb0'};
    }
  }
  /* Visible traps */
  if(S.traps&&S.traps.length){
    for(var ti=0;ti<S.traps.length;ti++){
      var tr=S.traps[ti];
      if(tr.col===col&&tr.row===row&&!tr.triggered&&!tr.hidden)return{type:'trap',icon:'\u26a1'};
    }
  }
  return null;
}
/* Long-press timer/state per direction (M4: peek terrain) */
var _hexNavLongPress={timer:null,fired:false,btn:null};
function _hexNavCancelLongPress(){
  if(_hexNavLongPress.timer){clearTimeout(_hexNavLongPress.timer);_hexNavLongPress.timer=null;}
  if(_hexNavLongPress.btn){_hexNavLongPress.btn.classList.remove('peeking');}
  _hexNavLongPress.btn=null;
}
function _hexNavLongPressFire(btn,col,row,terrainText){
  _hexNavLongPress.fired=true;
  if(btn)btn.classList.add('peeking');
  console.info('[EXPLORE:HEXNAV] long_press_peek dir target=(%d,%d) terrain=%s',col,row,terrainText);
  /* Light haptic + non-blocking toast */
  if(typeof _safeHaptic!=='undefined')_safeHaptic.impact('light');
  if(typeof showTerrainToast==='function'){showTerrainToast(terrainText,'flavor');}
}
function updateHexNav(){
  var nav=document.getElementById('hex-nav');
  if(!nav)return;
  var btns=nav.querySelectorAll('.hex-dir');
  if(!btns.length)return;
  var offsets=S.playerRow%2===0?EVEN_OFFSETS:ODD_OFFSETS;
  /* Movement budget for visual feedback (BFS-style; matches reachable highlight) */
  for(var i=0;i<btns.length&&i<6;i++){
    var btn=btns[i];
    var col=S.playerCol+offsets[i][0],row=S.playerRow+offsets[i][1];
    var oob=col<0||col>=COLS||row<0||row>=ROWS;
    var tile=(!oob&&S.grid[row]&&S.grid[row][col])?S.grid[row][col]:null;
    var baseTile=tile&&tile.match(/[0-9@EC]/)?'.':tile;
    var impass=!tile||IMPASSABLE.has(baseTile);
    var fogKey=col+','+row;
    var fogSt=S.fogState[fogKey];
    var isVisible=fogSt==='visible'||fogSt==='dim';
    var isDifficult=!impass&&DIFFICULT_TILES.has(baseTile);
    /* M2 — POI / threat detection at the target hex */
    var contentInfo=(!impass&&isVisible)?_hexHasContent(col,row):null;
    var hasThreat=contentInfo&&(contentInfo.type==='trap'||contentInfo.type==='dan'||contentInfo.type==='danger');
    var hasReward=contentInfo&&(contentInfo.type==='chest'||contentInfo.type==='dis'||contentInfo.type==='discovery'||contentInfo.type==='exit');
    /* Build CSS classes */
    var cls='hex-dir';
    if(isDifficult)cls+=' difficult';
    if(!isVisible&&!impass)cls+=' fog-hidden';
    if(contentInfo)cls+=' has-content';
    if(hasThreat)cls+=' has-threat';
    if(hasReward)cls+=' has-reward';
    if(!impass&&isVisible)cls+=' passable';
    /* A1: Use data-blocked-reason + aria-disabled instead of btn.disabled,
     * so onclick still fires and we can show feedback toast to player
     * (hexmap audit FRICÇÃO-2: "Botões nav desabilitados sem feedback de causa"). */
    var blockedReason='';
    if(oob){blockedReason='fora_do_mapa';}
    else if(!isVisible&&!impass){blockedReason='nevoeiro';}
    else if(impass){
      if(baseTile==='#')blockedReason='parede';
      else if(baseTile==='W')blockedReason='agua_profunda';
      else if(baseTile==='M')blockedReason='montanha';
      else if(baseTile==='L')blockedReason='lava';
      else if(baseTile==='D')blockedReason='porta';
      else blockedReason='bloqueado';
    }
    btn.removeAttribute('disabled');
    btn.setAttribute('aria-disabled',blockedReason?'true':'false');
    if(blockedReason){btn.setAttribute('data-blocked-reason',blockedReason);cls+=' blocked';}
    else{btn.removeAttribute('data-blocked-reason');}
    btn.className=cls;
    btn.textContent='';
    btn.removeAttribute('data-cost');
    /* Arrow indicator */
    var arrow=document.createElement('span');
    arrow.className='hex-dir-arrow';
    arrow.textContent=HEX_DIR_ARROWS[i];
    btn.appendChild(arrow);
    /* Terrain label */
    var terrain=document.createElement('span');
    terrain.className='hex-dir-terrain';
    var terrainLabel='';
    if(impass||oob){
      terrain.textContent='\ud83d\udeab';
      terrainLabel='Bloqueado';
    }else if(!isVisible){
      terrain.textContent='? N\u00e9voa';
      terrainLabel='N\u00e9voa';
    }else{
      var emoji=TERRAIN_EMOJI[baseTile]||'\ud83c\udf3f';
      var name=TERRAIN_NAME[baseTile]||'Aberto';
      terrain.textContent=emoji+' '+name;
      terrainLabel=name+(isDifficult?' (terreno dif\u00edcil)':'');
    }
    btn.appendChild(terrain);
    /* M1 — Movement cost badge (1 normal, 2 difficult) — only on passable visible hexes */
    if(!impass&&isVisible){
      var costBadge=document.createElement('span');
      costBadge.className='hex-dir-cost'+(isDifficult?' diff':'');
      costBadge.textContent=isDifficult?'2':'1';
      costBadge.setAttribute('aria-label',isDifficult?'Custo 2 movimentos':'Custo 1 movimento');
      btn.appendChild(costBadge);
      btn.setAttribute('data-cost',isDifficult?'2':'1');
    }
    /* M2 — POI / Threat icon overlay */
    if(contentInfo&&!impass&&isVisible){
      var contentBadge=document.createElement('span');
      contentBadge.className='hex-dir-content'+(hasThreat?' threat':hasReward?' reward':' info');
      contentBadge.textContent=contentInfo.icon;
      contentBadge.setAttribute('aria-label',hasThreat?'Perigo nesta dire\u00e7\u00e3o':hasReward?'Recompensa nesta dire\u00e7\u00e3o':'Algo de interesse');
      btn.appendChild(contentBadge);
    }
    /* M4 — Long-press peek (terrain preview without moving) */
    var peekText=terrainLabel+(contentInfo?(hasThreat?' \u2014 perigo \u00e0 vista':hasReward?' \u2014 algo valioso':' \u2014 algo interessante'):isDifficult?' \u2014 custo 2':'');
    var _peekText=peekText;
    var _peekCol=col,_peekRow=row,_peekBtn=btn;
    var startPeek=function(c,r,b,txt){
      return function(ev){
        if(b.disabled)return;
        if(ev&&ev.type==='touchstart'){/* Allow tap to fire — we just gate via fired flag */}
        _hexNavCancelLongPress();
        _hexNavLongPress.fired=false;
        _hexNavLongPress.btn=b;
        _hexNavLongPress.timer=setTimeout(function(){_hexNavLongPressFire(b,c,r,txt);_hexNavLongPress.timer=null;},420);
      };
    };
    var endPeek=function(){
      return function(){
        _hexNavCancelLongPress();
      };
    };
    btn.onpointerdown=startPeek(col,row,btn,_peekText);
    btn.onpointerup=endPeek();
    btn.onpointercancel=endPeek();
    btn.onpointerleave=endPeek();
    /* Click handler — guard against fired long-press + blocked feedback */
    btn.onclick=(function(c,r,b){return function(){
      if(_hexNavLongPress.fired){_hexNavLongPress.fired=false;return;}
      /* A1 (hexmap FRICÇÃO-2): blocked tile feedback */
      var blocked=b.getAttribute('data-blocked-reason');
      if(blocked){
        var _msgs={
          fora_do_mapa:'Voce esta na borda do mapa.',
          nevoeiro:'Voce nao consegue ver essa direcao.',
          parede:'Uma parede bloqueia o caminho.',
          agua_profunda:'Aguas profundas bloqueiam o caminho.',
          montanha:'Uma montanha intransponivel.',
          lava:'Lava fervente bloqueia o caminho.',
          porta:'Ha uma porta fechada no caminho.',
          bloqueado:'Caminho bloqueado.',
        };
        if(typeof showTerrainToast==='function'){showTerrainToast(_msgs[blocked]||_msgs.bloqueado,'flavor');}
        if(window.vHaptic&&typeof window.vHaptic.warning==='function'){try{window.vHaptic.warning();}catch(_e){/* noqa: preflight */}}
        console.info('[EXPLORE:HEXNAV] blocked click reason=%s',blocked);
        return;
      }
      if(typeof isEventActive==='function'&&isEventActive())return;
      if(typeof isMoving==='function'&&isMoving())return;
      console.info('[EXPLORE:HEXNAV] move_click dir to=(%d,%d)',c,r);
      /* Haptic feedback on successful move (research §4.5: notificationOccurred cross-platform) */
      if(window.vHaptic&&typeof window.vHaptic.tap==='function'){try{window.vHaptic.tap();}catch(_e){/* noqa: preflight */}}
      movePlayerCanvas(c,r);
    };})(col,row,btn);
  }
}
/* Weather fog radius config (visual only) */
var WEATHER_FOG_RADIUS = {
  's': 3.2, 'c': 2.8, 'r': 2.4, 'f': 1.8, 't': 1.6
};
var NIGHT_FOG_RADIUS = 1.2;
var TORCH_BONUS = { 's': 0.3, 'c': 0.3, 'r': 0.5, 'f': 0.7, 't': 0.7, 'night': 1.2 };
S.torchActive = false;

function getFogVisibilityRadius() {
  var phase = typeof getDayPhase === 'function' ? getDayPhase() : 'day';
  var baseRadius;
  if (phase === 'night') {
    baseRadius = NIGHT_FOG_RADIUS;
  } else {
    var wCode = S.weather || 's';
    baseRadius = WEATHER_FOG_RADIUS[wCode] || WEATHER_FOG_RADIUS['s'];
    if (phase === 'dusk') baseRadius *= 0.85;
    if (phase === 'dawn') baseRadius *= 0.95;
  }
  if (S.torchActive) {
    var torchKey = phase === 'night' ? 'night' : (S.weather || 's');
    baseRadius += TORCH_BONUS[torchKey] || 0.3;
  }
  return baseRadius;
}

function toggleTorch() {
  S.torchActive = !S.torchActive;
  var btn = document.getElementById('btn-torch');
  if (btn) btn.classList.toggle('active', S.torchActive);
  if (typeof scheduleRender === 'function') scheduleRender();
}
function _buildSnap(){return{tk:S.token,pc:S.playerCol,pr:S.playerRow,vis:Array.from(S.visited),fog:S.fogState,xp:S.xpEarned,gp:S.goldEarned,hp:S.hpChange,it:S.itemsFound,pr2:Array.from(S.poisResolved),ck:S.checksPerformed,ct:S.combatTrigger,re:S.randomEncounters,cd:S.conditions,hz:Array.from(S._hazardsTriggered||new Set()),tt:Array.from(S._trapsTriggered||new Set()),ml:(S.moveLog||[]).slice(-200),sc:S._stepCount,inv:S.inventory,iu:S.inventoryUsed,bd:S._bossDefeated||false,cau:S._campAmbushUsed||false,wu:S._watchUsed||false,ex:S.exhaustion||0,swr:S._stepsWithoutRest||0,sfr:S._stepsForRation||0,ftg:S._fatigue||0,ftp:S._fatiguePeriods||0,lrc:S._longRestCount||0,mpc:S.mpChange||0,hdu:S._hdUsed||0,tp:S.travelPace||'normal',ta:S.travelActivity||null,wt:S.weather||'s',ih:Array.from(S.interactedHexes||new Set()),ccl:Array.from(S.chainClues||new Set()),gc:COLS,gr:ROWS,do2:Array.from(S._doorsOpened||new Set()),sr2:Array.from(S._secretsRevealed||new Set()),tp2:Array.from(S._terrainPassed||new Set()),trT:(S.traps||[]).filter(function(t){return t.triggered;}).map(function(t){return t.col+','+t.row;}),ldU:Array.from(S._chestsOpened||new Set()),isR:Array.from(S._inscriptionsRead||new Set()),ldK:(S.lockedDoors||[]).filter(function(d){return d.unlocked;}).map(function(d){return d.col+','+d.row;}),wsc:_watchStepCount||0,wcw:S._currentWatch||0,wcd:S._currentDay||0,wws:S._weatherSchedule||[],rum:S.rumors||[],lmr:Array.from(S._landmarksRevealed||new Set()),pur:S._pursuerData||null,fs:S._flavorSteps||0,msh:S._milestonesHit||{},ltt:typeof _lastTerrainType!=='undefined'?_lastTerrainType:null,lha:S._lowHPAlertShown||false,lss:S._lastSocialStep||-99,ts:Date.now()};}
/* C2 (hexmap audit FRICÇÃO-9): reduce debounce 1500ms → 800ms
 * + emit position-only sendBeacon micro-payload on every saveState call
 * so that an abrupt Telegram close (mobile crash, swipe-to-close) always
 * preserves at least {pc, pr, sc} — the player never reappears in a
 * position they already moved past. The full snap still flushes via
 * the normal debounce path. */
function saveState(){try{console.info('[EXPLORE:STATE] saveState step=%d hp=%s xp=%d gp=%d items=%d conds=%d pos=(%d,%d)',S._stepCount||0,typeof getCurrentHP==='function'?getCurrentHP():'?',S.xpEarned||0,S.goldEarned||0,S.itemsFound?S.itemsFound.length:0,S.conditions?S.conditions.length:0,S.playerCol,S.playerRow);const snap=_buildSnap();if(!S.apiBase||!S.uid||!S.token)return;const _sh={'Content-Type':'application/json','Authorization':'Bearer '+S.token};if(window.Telegram?.WebApp?.initData){_sh['X-Telegram-Init-Data']=Telegram.WebApp.initData;}
/* C2: position beacon — best-effort, fire-and-forget micro-save */
try{if(navigator.sendBeacon){var _micro=JSON.stringify({pc:S.playerCol,pr:S.playerRow,sc:S._stepCount||0,_micro:true});var _bUrl=S.apiBase+'/api/explore/save?user_id='+S.uid+'&token='+encodeURIComponent(S.token);navigator.sendBeacon(_bUrl,new Blob([_micro],{type:'application/json'}));}}catch(_be){/* noqa: preflight */}
/* #20 (hexmap audit BUG-2): saveState race guard.
 * Previously the debounce timer could fire AND a flushSaveState could
 * both have a POST in flight at the same time, with the older snap
 * potentially overwriting the newer one on the server if processed
 * out of order. The _saveInFlight flag prevents stacking concurrent
 * debounced fetches. If a POST is already in flight, the new
 * saveState() call schedules a retry for AFTER the current POST
 * completes (via the finally block). */
if(window._saveDebounce)clearTimeout(window._saveDebounce);
window._saveDebounce=setTimeout(function(){
  if(window._saveInFlight){
    /* A POST is already in flight — reschedule instead of stacking */
    if(window._dbg)console.debug('[EXPLORE] saveState re-queued (in flight)');
    window._saveDebouncePending=true;
    return;
  }
  window._saveInFlight=true;
  fetchT(S.apiBase+'/api/explore/save?user_id='+S.uid,{method:'POST',headers:_sh,body:JSON.stringify(snap)})
    .catch(function(e){console.error('[EXPLORE] API save error:',e);if(typeof showTerrainToast==='function')showTerrainToast('Falha ao salvar no servidor. Tentando novamente...','warn');setTimeout(function(){if(window._saveDebounce)clearTimeout(window._saveDebounce);saveState();},3000); /* noqa: preflight */ })
    .finally(function(){
      window._saveInFlight=false;
      /* If another saveState() was called while this one was in flight,
       * fire it now so we always have the most recent state server-side. */
      if(window._saveDebouncePending){
        window._saveDebouncePending=false;
        saveState();
      }
    });
},800);}catch(e){console.error('[EXPLORE] saveState:',e);}}
function flushSaveState(){if(window._dbg)console.debug("[EXPLORE] flushSave");if(window._saveDebounce){clearTimeout(window._saveDebounce);window._saveDebounce=null;}if(!S.apiBase||!S.uid||!S.token)return;if(window._saveInFlight){window._saveDebouncePending=true;return;}window._saveInFlight=true;var snap=_buildSnap();var _sh={'Content-Type':'application/json','Authorization':'Bearer '+S.token};if(window.Telegram?.WebApp?.initData){_sh['X-Telegram-Init-Data']=Telegram.WebApp.initData;}var _body=JSON.stringify(snap);fetchT(S.apiBase+'/api/explore/save?user_id='+S.uid,{method:'POST',headers:_sh,body:_body}).catch(function(e){console.error('[EXPLORE] flush save error, retrying:',e);fetchT(S.apiBase+'/api/explore/save?user_id='+S.uid,{method:'POST',headers:_sh,body:_body}).catch(function(e2){console.error('[EXPLORE] flush retry failed, sendBeacon:',e2);try{var bUrl=S.apiBase+'/api/explore/save?user_id='+S.uid+'&token='+encodeURIComponent(S.token);navigator.sendBeacon(bUrl,new Blob([_body],{type:'application/json'}));}catch(e3){console.error('[EXPLORE] sendBeacon failed:',e3);}});}).finally(function(){window._saveInFlight=false;if(window._saveDebouncePending){window._saveDebouncePending=false;saveState();}});}
function mapEncounterPayloadToRuntime(re){if(!re||typeof re!=='object')return null;var y=Object.prototype.hasOwnProperty.call(re,'y')?re.y:re.type;if((y==null||y==='')&&(re.cb||re.combat||re.cmb))y='amb';if((y==null||y==='')&&re.ch&&re.ch.length)y='amb';if(y==null||y==='')return null;var icon=re.ic!=null?re.ic:re.icon||'';var title=(re.tt!=null?re.tt:re.title)||'Evento';var narr;if(re.ni!=null&&typeof lookupEncNarr==='function'&&S.biome)narr=(lookupEncNarr(y,S.biome,re.ni)||re.n||re.narration||'');else narr=(re.n!=null?re.n:re.narration)||'';var choices=re.ch||re.choices||[];var combat=re.cb!=null?re.cb:(re.combat!=null?re.combat:(re.cmb!=null?re.cmb:null));var aS=re.autoSave||null;var yStr=typeof y==='string'?y:'';var yNorm=yStr;if(yStr.length>3){var _ym={ambush:'amb',trap:'trp',hidden:'hid',sound:'snd',danger:'dan',discovery:'dis',search:'sea',mystery:'mys'};yNorm=_ym[yStr]||yStr.slice(0,3);}return{type:yNorm,icon:icon,title:title,narration:narr,choices:choices,combat:combat,autoSave:aS};}
function applyServerState(snap){if(!snap){console.warn('[EXPLORE] applyServerState: snap is null/undefined');return false;}if(typeof snap.pc!=='number'||typeof snap.pr!=='number'){console.warn('[EXPLORE] applyServerState: missing required fields pc/pr',JSON.stringify(snap).slice(0,200));return false;}console.info('[EXPLORE:STATE] applyServerState pos=(%d,%d) steps=%d xp=%d gp=%d items=%d chestsOpened=%d',snap.pc,snap.pr,snap.sc||0,snap.xp||0,snap.gp||0,snap.it?snap.it.length:0,(snap.ldU||[]).length);try{if(snap.gc)COLS=Math.max(5,Math.min(30,snap.gc));if(snap.gr)ROWS=Math.max(5,Math.min(30,snap.gr));S.playerCol=snap.pc;S.playerRow=snap.pr;S.visited=new Set(snap.vis||[]);S.fogState=snap.fog||{};S.xpEarned=snap.xp||0;S.goldEarned=snap.gp||0;S.hpChange=snap.hp||0;S.itemsFound=snap.it||[];S.poisResolved=new Set(snap.pr2||[]);S.checksPerformed=snap.ck||[];S.combatTrigger=snap.ct||null;if(Object.prototype.hasOwnProperty.call(snap,'re')&&Array.isArray(snap.re)){S.randomEncounters=snap.re.map(function(_re){return mapEncounterPayloadToRuntime(_re);}).filter(function(x){return x!=null;});}S.conditions=snap.cd||[];S._hazardsTriggered=new Set(snap.hz||[]);S._trapsTriggered=new Set(snap.tt||[]);S.chainClues=new Set(snap.ccl||[]);S._doorsOpened=new Set(snap.do2||[]);S._secretsRevealed=new Set(snap.sr2||[]);S._terrainPassed=new Set(snap.tp2||[]);S._chestsOpened=new Set(snap.ldU||[]);S._inscriptionsRead=new Set(snap.isR||[]);var ldkSet=new Set(snap.ldK||[]);if(S.lockedDoors)S.lockedDoors.forEach(function(d){if(ldkSet.has(d.col+','+d.row))d.unlocked=true;});if(S.chests)S.chests.forEach(function(ch){if(S._chestsOpened.has(ch.col+','+ch.row))ch.opened=true;});if(S.inscriptions)S.inscriptions.forEach(function(ins){if(S._inscriptionsRead.has(ins.col+','+ins.row))ins.read=true;});var trT=new Set(snap.trT||[]);if(S.traps)S.traps.forEach(function(t){if(trT.has(t.col+','+t.row))t.triggered=true;});S.moveLog=snap.ml||[];S._stepCount=snap.sc||0;S.inventory=snap.inv||[];S.inventoryUsed=snap.iu||[];S._bossDefeated=snap.bd||false;S._campAmbushUsed=snap.cau||false;S._watchUsed=snap.wu||false;S._currentWatch=snap.wcw||0;S._currentDay=snap.wcd||0;S._watchStepCount=snap.wsc||0;S._weatherSchedule=snap.wws||[];S.rumors=snap.rum||[];S._landmarksRevealed=new Set(snap.lmr||[]);S._pursuerData=snap.pur||null;if(snap.wt)S.weather=snap.wt;S._flavorSteps=snap.fs||0;S._milestonesHit=snap.msh||{};if(typeof snap.ltt!=='undefined'&&snap.ltt!==null)_lastTerrainType=snap.ltt;S._lowHPAlertShown=snap.lha||false;if(typeof snap.lss==='number')S._lastSocialStep=snap.lss;S.exhaustion=snap.ex||0;S._stepsWithoutRest=snap.swr||0;S._stepsForRation=snap.sfr||0;S._fatigue=snap.ftg||0;S._fatiguePeriods=snap.ftp||0;S._longRestCount=snap.lrc||0;S.mpChange=snap.mpc||0;S._hdUsed=snap.hdu||0;S.travelPace=snap.tp||'normal';S.travelActivity=snap.ta||null;S.interactedHexes=new Set(snap.ih||[]);return true;}catch(e){console.error('[EXPLORE] applyServerState:',e);return false;}}
function loadMapData(data){try{_loadMapDataInner(data);}catch(e){console.error('[EXPLORE] loadMapData fatal error:',e);var _lc=window._loadingCtrl;if(_lc)_lc.hideQuick();if(typeof showError==='function')showError('Erro ao carregar mapa: '+e.message);else{console.error('[EXPLORE] Erro ao carregar mapa:',e);if(typeof showFatalError==='function')showFatalError('Erro ao carregar mapa: '+e.message);};if(window.Telegram&&Telegram.WebApp){try{window.__valdoria_transitioning=true;Telegram.WebApp.sendData(JSON.stringify({type:'webapp_error_close',error:'loadMapData: '+e.message}));}catch(_){console.warn('[EXPLORE]',_);}}return;}}function _loadMapDataInner(data){console.info('[EXPLORE:LOAD] loadMapData biome=%s grid=%dx%d danger=%d vis=%d pois=%d encounters=%d chests=%d traps=%d',data.b||'?',data.gc||11,data.gr||13,data.dl||1,data.v||1,data.p?data.p.length:0,data.re?data.re.length:0,data.ct?data.ct.length:0,data.tr?data.tr.length:0);COLS=Math.max(5,Math.min(30,data.gc||11));ROWS=Math.max(5,Math.min(30,data.gr||13));const gridStr=data.g||'';S.grid=[];for(let r=0;r<ROWS;r++){const row=[];for(let c=0;c<COLS;c++){const idx=r*COLS+c;row.push(idx<gridStr.length?gridStr[idx]:'.');}
S.grid.push(row);}
S.biome=data.b||'forest';S.playerCol=data.s?data.s[0]:5;S.playerRow=data.s?data.s[1]:12;S.exitCol=data.e?data.e[0]:5;S.exitRow=data.e?data.e[1]:0;S.visibility=data.v||1;S.dmIntro=data.i||(typeof getDMIntro==='function'?getDMIntro(S.biome,data.dl||1):'');S.charData=data.c||null;S.dangerLevel=data.dl||1;S.inventory=(data.c&&data.c.inv)?JSON.parse(JSON.stringify(data.c.inv)):[];S.randomEncounters=(data.re||[]).map(function(re){return mapEncounterPayloadToRuntime(re);}).filter(function(x){return x!=null;});S.secretPassages=(data.sp||[]).map(sp=>({col:sp.q,row:sp.r,dc:sp.dc,skill:sp.sk,mod:sp.m||0,revealed:false,}));S.terrainChallenges=(data.tc||[]).map(tc=>({col:tc.q,row:tc.r,dc:tc.dc,skill:tc.sk,mod:tc.m||0,dmg:tc.dm,label:tc.lb,used:false,}));S.traps=(data.tr||[]).map(tr=>({col:tr.q,row:tr.r,name:tr.nm,skill:tr.sk,dc:tr.dc,dmg:tr.dm,mod:tr.m||0,hidden:tr.h,hiddenDC:tr.hd||0,condition:tr.cn||'',triggered:false,}));S.torches=(data.lt||[]).map(lt=>({col:lt.q,row:lt.r,radius:lt.rd||2,}));S.lockedDoors=(data.ld||[]).map(ld=>({col:ld.q,row:ld.r,pickDC:ld.pdc,forceDC:ld.fdc,modPick:ld.mp||0,modForce:ld.mf||0,unlocked:false,}));S.chests=(data.ct||[]).map(ct=>({col:ct.q,row:ct.r,gp:ct.gp,xp:ct.xp,hasTrap:ct.tp,trapDC:ct.td,modInv:ct.mi||0,items:ct.it||[],opened:false,trapDetected:false,}));S.safeRooms=(data.sr||[]).map(sr=>({col:sr.q,row:sr.r,discovered:false,}));S.inscriptions=(data.is||[]).map(ins=>({col:ins.q,row:ins.r,textIdx:ins.ti,read:false,}));const pp2=getPassivePerception();S.traps=S.traps.filter(t=>{if(!t.hidden)return true;return pp2>=t.hiddenDC;});S._doorsOpened=new Set();S._secretsRevealed=new Set();S._terrainPassed=new Set();S._chestsOpened=new Set();S._inscriptionsRead=new Set();S.ambientEvents=(data.ae||[]).map(ae=>({title:ae.tt||'',narration:(ae.ni!=null&&typeof lookupAmbientNarr==='function')?(lookupAmbientNarr(S.biome,ae.ni)||ae.n||''):(ae.n||''),xp:ae.x||0,}));S.chainClues=new Set(data.cc||[]);S.bossData=data.bo||null;S.campAmbush=data.ca||null;S.weather=data.w||'s';S.startHour=data.hr||8;S._bossDefeated=false;S._campAmbushUsed=false;S._watchUsed=false;S._lastSocialStep=-99;S.exhaustion=0;S._stepsWithoutRest=0;const allPois=(data.p||[]).map(p=>({id:p.i,col:p.q,row:p.r,type:p.y,icon:p.ic,title:p.tt,narration:(p.ni!=null&&typeof lookupPOINarr==='function')?(lookupPOINarr(p.y,S.biome,p.ni)||p.n||''):(p.n||''),choices:p.ch||[],combat:p.cb||null,hidden:!!p.h,hiddenDC:p.hd||0,dialogue:(p.dlg||[]).map(d=>({speaker:d.s||'npc',text:d.t||''})),npcName:p.nn||null,npcTitle:p.nt||null,chainId:p.ci||null,chainStage:p.cs||0,}));const pp=getPassivePerception();let hiddenDetected=0;S.pois=allPois.filter(p=>{if(!p.hidden)return true;if(pp>=p.hiddenDC){hiddenDetected++;return true;}
return false;});S._passivePerception=pp;S._hiddenDetected=hiddenDetected;const restored=window._serverState?applyServerState(window._serverState):false;window._serverState=null;setupHUD();if(restored){for(const key of(S._doorsOpened||[])){const[c,r]=key.split(',').map(Number);if(S.grid[r]&&S.grid[r][c]==='D')S.grid[r][c]='.';}
for(const key of(S._secretsRevealed||[])){const[c,r]=key.split(',').map(Number);if(S.grid[r]&&S.grid[r][c]==='#')S.grid[r][c]='.';}
for(const key of S.visited){const[c,r]=key.split(',').map(Number);revealFogAt(c,r,S.visibility,S.fogState,S.grid,false);}}else{S.visited.add(`${S.playerCol},${S.playerRow}`);revealFogAt(S.playerCol,S.playerRow,S.visibility,S.fogState,S.grid,false);}
if(restored&&S.conditions.length){updateConditionHUD();}
updateXPBar();initRenderer();updateHexNav();if(typeof initWatchSystem==='function')initWatchSystem();if(typeof initRumors==='function')initRumors();if(typeof initPursuer==='function')initPursuer();initPlayerPosition(S.playerCol,S.playerRow);initBottomBar();if(typeof _updateActivityBadge==='function')_updateActivityBadge();if(typeof updateExhaustionHUD==='function')updateExhaustionHUD();if(typeof updateCampButtonHint==='function')updateCampButtonHint();if(typeof updateCompass==='function')updateCompass();if(typeof updateQuestCompass==='function')updateQuestCompass();if(typeof updateAtmosphere==='function')updateAtmosphere();updateLocationInfo();if(typeof initBiomeParticles==='function')initBiomeParticles(S.biome);if(typeof ValdoriaAudio!=='undefined'&&S.biome){ValdoriaAudio.playBiome(S.biome);/* Ensure audio starts on first user interaction (browser autoplay policy) */if(ValdoriaAudio._warmUp)ValdoriaAudio._warmUp();var _audioStarted=false;function _forceAudioOnTouch(){if(_audioStarted)return;_audioStarted=true;document.removeEventListener('click',_forceAudioOnTouch,true);document.removeEventListener('touchstart',_forceAudioOnTouch,true);if(ValdoriaAudio._warmUp)ValdoriaAudio._warmUp();if(typeof ValdoriaAudio.play==='function'&&S.biome)ValdoriaAudio.playBiome(S.biome);console.info('[EXPLORE] audio forced on first touch biome=%s',S.biome);}document.addEventListener('click',_forceAudioOnTouch,{capture:true,once:true});document.addEventListener('touchstart',_forceAudioOnTouch,{capture:true,once:true});}
setTimeout(()=>scrollCanvasToPlayer(),100);/* Force-hide ALL loading overlays immediately — map is ready */if(typeof forceHideLoading==='function')forceHideLoading();var _shellLd=document.getElementById('loading');if(_shellLd){_shellLd.classList.add('hidden');_shellLd.style.display='none';}if(window.vProcessing)vProcessing.hide();/* Kill body pseudo-elements that cause yellow stripe (noise texture + vignette from valdoria-design.css) */
try{var _bs=document.body.style;_bs.setProperty('--_no-pseudo','1');var _killPseudo=document.createElement('style');_killPseudo.textContent='body::before,body::after{display:none!important;content:none!important}';document.head.appendChild(_killPseudo);}catch(e){console.warn('[EXPLORE] kill pseudo:',e);}
console.info('[EXPLORE] all loading force-hidden — map ready');const _lc=window._loadingCtrl;if(_lc&&_lc.forceHide)_lc.forceHide();if(_lc&&!restored){_lc.setProgress(100);_lc.hideLoading(()=>{if(S.dmIntro)showDMIntro(S.dmIntro);if(!S.travelActivity&&typeof showActivitySelection==='function'){const actDelay=S.dmIntro?4000:800;setTimeout(()=>{if(!S.travelActivity&&!_tutorialActive)showActivitySelection();},actDelay);}
if(S._hiddenDetected>0){const delay=S.dmIntro?2000:600;setTimeout(()=>{if(typeof showTerrainToast==='function'){showTerrainToast(`Percepção Passiva (${S._passivePerception})`,'ranger');}},delay);}});}else{if(_lc)_lc.hideQuick();else{var _ldEl=document.getElementById('loading');if(_ldEl)_ldEl.classList.add('hidden');}if(S.dmIntro&&!restored){setTimeout(()=>showDMIntro(S.dmIntro),400);}
if(!restored&&!S.travelActivity&&typeof showActivitySelection==='function'){const actDelay=S.dmIntro?4000:800;setTimeout(()=>{if(!S.travelActivity&&!_tutorialActive)showActivitySelection();},actDelay);}
if(S._hiddenDetected>0&&!restored){const delay=S.dmIntro?2000:600;setTimeout(()=>{if(typeof showTerrainToast==='function'){showTerrainToast(`Percepção Passiva (${S._passivePerception})`,'ranger');}},delay);}}
if(typeof checkServerTutorialFlag==='function')checkServerTutorialFlag(S.charData);if(typeof autoShowTutorial==='function')autoShowTutorial();}
/* Update top bar with biome, weather, danger */
function updateTopBar() {
  var topBiome = document.getElementById('top-biome');
  if (topBiome) {
    var biomeNames = {forest:'Floresta',plains:'Planície',desert:'Deserto',cave:'Caverna',mountain:'Montanha',snow:'Neve',swamp:'Pântano',graveyard:'Cemitério',volcanic:'Vulcânico',ruins:'Ruínas'};
    var biomeIcons = {forest:'🌲',plains:'🌾',desert:'🏜️',cave:'🕳️',mountain:'⛰️',snow:'❄️',swamp:'🌿',graveyard:'💀',volcanic:'🌋',ruins:'🏛️'};
    var b = S.biome || 'forest';
    topBiome.textContent = (biomeIcons[b] || '🌲') + ' ' + (biomeNames[b] || b);
  }
  var topWeather = document.getElementById('top-weather');
  if (topWeather) {
    var wInfo = {s:'☀️ Limpo',c:'☀️ Claro',r:'🌧️ Chuva',f:'🌫️ Névoa',t:'⛈️ Tempestade'};
    topWeather.textContent = wInfo[S.weather || 's'] || '☀️ Limpo';
  }
  var topDanger = document.getElementById('top-danger');
  if (topDanger) {
    var dl = S.dangerLevel || S.dl || 0;
    var pips = '';
    for (var i = 1; i <= 5; i++) pips += i <= dl ? '◆' : '◇';
    topDanger.textContent = pips;
  }
}
function setupHUD(){const c=S.charData;if(!c)return;var _hn=document.getElementById('hud-name');if(_hn)_hn.textContent=c.nm||'Aventureiro';var _hl=document.getElementById('hud-level');if(_hl)_hl.textContent='Nv '+(c.lv||1);var currentHP=Math.max(0,(c.hp||10)+(S.hpChange||0));var maxHP=c.mh||10;updateHP(currentHP,maxHP);updatePanelBars();updateRewards();updateTopBar();
/* A4 (hexmap FRICÇÃO-8): update Passive Perception permanent HUD badge */
var _ppBadge=document.getElementById('pp-badge');
if(_ppBadge&&S._passivePerception){_ppBadge.textContent='PP: '+S._passivePerception;_ppBadge.classList.toggle('pp-active',(S._hiddenDetected||0)>0);_ppBadge.title='Percepção Passiva '+S._passivePerception+' — detecta POIs ocultos'+((S._hiddenDetected||0)>0?' (algum detectado neste mapa)':'');}
}
function updatePanelBars(){var c=S.charData;if(!c)return;var currentHP=Math.max(0,(c.hp||10)+(S.hpChange||0));var maxHP=c.mh||10;var hpPct=Math.max(0,Math.min(100,(currentHP/maxHP)*100));var hpFill=document.getElementById('panel-hp-fill');if(hpFill){hpFill.style.width=hpPct+'%';hpFill.className='panel-bar-fill hp-panel-fill '+(hpPct>60?'hp-high':hpPct>25?'hp-mid':'hp-low');hpFill.style.background='';}var hpText=document.getElementById('panel-hp-text');if(hpText)hpText.textContent=currentHP+'/'+maxHP;var currentMP=Math.max(0,(c.mp||0)+(S.mpChange||0));var maxMP=c.mm||0;var mpPct=maxMP>0?Math.max(0,Math.min(100,(currentMP/maxMP)*100)):0;var mpFill=document.getElementById('panel-mp-fill');if(mpFill)mpFill.style.width=mpPct+'%';var mpText=document.getElementById('panel-mp-text');if(mpText)mpText.textContent=currentMP+'/'+maxMP;/* Floating HUD MP */var _mff=document.getElementById('mp-fill-float');if(_mff)_mff.style.width=mpPct+'%';var _mvf=document.getElementById('mp-val-float');if(_mvf)_mvf.textContent=currentMP+'/'+maxMP;}
function updateHP(current,max){/* BUG FIX 2026-04-11: defensive NaN check to prevent "NaN/13" in HUD */if(typeof current!=='number'||isNaN(current)){console.warn('[EXPLORE] updateHP called with invalid current=%s — defaulting to 0',current);current=0;}if(typeof max!=='number'||isNaN(max)||max<=0){console.warn('[EXPLORE] updateHP called with invalid max=%s — defaulting to 1',max);max=1;}if(window._dbg)console.debug("[EXPLORE] updateHP",{current:current,max:max});const pct=Math.max(0,Math.min(100,(current/max)*100));const fill=document.getElementById('hp-fill');if(fill){fill.style.transform='scaleX('+(pct/100)+')';fill.classList.remove('hp-high','hp-mid','hp-low');fill.classList.add(pct>60?'hp-high':pct>25?'hp-mid':'hp-low');}var _ht=document.getElementById('hp-text');if(_ht)_ht.textContent=current+'/'+max;/* Floating HUD */var _hff=document.getElementById('hp-fill-float');if(_hff)_hff.style.width=pct+'%';var _hvf=document.getElementById('hp-val-float');if(_hvf)_hvf.textContent=current+'/'+max;if(pct>25)S._lowHPAlertShown=false;updatePanelBars();}
function updateXPBar(){var row=document.getElementById('xp-bar-row');var fill=document.getElementById('xp-fill');var label=document.getElementById('xp-label');if(!row||!fill||!label||!S.charData)return;var xp=(S.charData.xp||0)+(S.xpEarned||0);var nxp=S.charData.nxp||300;var prevXp=S.charData.pxp||0;var range=nxp-prevXp;var progress=range>0?Math.min(100,((xp-prevXp)/range)*100):0;fill.style.transform='scaleX('+(progress/100)+')';label.textContent='Nv '+(S.charData.lv||1);row.style.display='flex';}
function updateRewards(){const xpBadge=document.getElementById('badge-xp');const goldBadge=document.getElementById('badge-gold');if(!xpBadge||!goldBadge)return;xpBadge.textContent='XP '+(Number(S.xpEarned)||0);goldBadge.innerHTML='<span class="vi vi-coin sm"></span> '+(Number(S.goldEarned)||0);[xpBadge,goldBadge].forEach(b=>{b.classList.remove('pop');void b.offsetHeight;b.classList.add('pop');});setTimeout(()=>{xpBadge.classList.remove('pop');goldBadge.classList.remove('pop');},800);updateStepCounter();updateXPBar();}
var _STEP_MILESTONES={5:'Você encontra seu ritmo na trilha.',10:'Seus passos ganham confiança nesta terra.',15:'O terreno se torna familiar aos seus olhos.',20:'Você sente a marca de um verdadeiro explorador.',25:'A paisagem revela seus segredos a você.',30:'Poucos se aventuram tão longe dos muros.',35:'O horizonte parece sem fim... e cheio de promessas.',40:'Cada passo ecoa com a história deste lugar.',50:'Poucos exploradores chegam tão longe.',60:'Você já é lenda entre os que cruzam estas terras.',75:'O próprio terreno parece reconhecer sua presença.',100:'Um feito digno dos grandes aventureiros de Valdoria.',};function updateStepCounter(){const el=document.getElementById('step-counter');if(el)el.textContent=S.visited.size;/* Floating HUD */var _sf=document.getElementById('badge-steps-float');if(_sf)_sf.textContent='\uD83D\uDC63 '+S.visited.size+'/'+(S.maxSteps||20);const msg=_STEP_MILESTONES[S.visited.size];if(msg&&typeof showTerrainToast==='function'){S._milestonesHit=S._milestonesHit||{};if(!S._milestonesHit[S.visited.size]){S._milestonesHit[S.visited.size]=true;showTerrainToast(msg,'flavor');}}}
function initBottomBar(){updateStepCounter();updateDangerPips();updateDangerTension();if(typeof initImmersive==='function')initImmersive();if(typeof initHexNavCenter==='function')initHexNavCenter();}
/* M5 — Center hex-nav button: toggles BFS reachable highlight on the map.
 * Uses existing findReachable / setReachableHighlight from explore-pathfinding.js. */
var _hexNavRangeShown=false;
function initHexNavCenter(){
  var btn=document.getElementById('hex-nav-center');
  if(!btn||btn._vBound)return;
  btn._vBound=true;
  btn.addEventListener('click',function(){
    if(typeof isMoving==='function'&&isMoving())return;
    if(typeof isEventActive==='function'&&isEventActive())return;
    _hexNavRangeShown=!_hexNavRangeShown;
    btn.classList.toggle('active',_hexNavRangeShown);
    console.info('[EXPLORE:HEXNAV] center_toggle range_shown=%s',_hexNavRangeShown);
    if(typeof _safeHaptic!=='undefined')_safeHaptic.impact('light');
    if(_hexNavRangeShown){
      if(typeof findReachable==='function'&&typeof setReachableHighlight==='function'){
        var reachable=findReachable(S.playerCol,S.playerRow,6);
        setReachableHighlight(reachable);
        if(typeof showTerrainToast==='function'){
          showTerrainToast('Alcance: '+(reachable?reachable.size-1:0)+' hex em 6 movimentos','flavor');
        }
      }else{
        console.warn('[EXPLORE:HEXNAV] findReachable not available');
      }
    }else{
      if(typeof setReachableHighlight==='function')setReachableHighlight(null);
      if(typeof clearPathfinding==='function')clearPathfinding();
    }
  });
}
function updateDangerTension(){var viewport=document.getElementById('map-viewport');if(!viewport)return;var dl=S.dangerLevel||1;viewport.classList.remove('danger-high','danger-extreme');if(dl>=4)viewport.classList.add('danger-extreme');else if(dl>=3)viewport.classList.add('danger-high');}
function isDifficultTerrain(tile,biome){if(tile==='m'||tile==='i')return true;if(tile==='s'&&biome==='desert')return true;if(S._weatherDifficultAll&&(tile==='.'||tile==='g'))return true;if(S._snowCoveredHexes&&S._snowCoveredHexes.has(tile))return true;return false;}
function isRanger(){return S.charData&&S.charData.ci==='🏹';}
function getClassAbility(){if(!S.charData||!S.charData.ci)return null;const ci=S.charData.ci;const abilities={'🏹':{name:'Explorador Natural',trapBonus:0,perBonus:0,stealthBonus:0},'🗡':{name:'Per\u00edcia com Armadilhas',trapBonus:2,perBonus:0,stealthBonus:0},'🛡':{name:'Sentido Marcial',trapBonus:0,perBonus:2,stealthBonus:0},'✨':{name:'Sentidos Arcanos',trapBonus:0,perBonus:0,stealthBonus:0,arcane:true},'⚔️':{name:'Sens. ao Perigo',trapBonus:0,perBonus:1,stealthBonus:0},'🎵':{name:'Passos Leves',trapBonus:0,perBonus:0,stealthBonus:2},'🌙':{name:'Vis\u00e3o na Escurid\u00e3o',trapBonus:0,perBonus:0,stealthBonus:0,darkvision:true},'✡️':{name:'Sentir Mortos-vivos',trapBonus:0,perBonus:0,stealthBonus:0,detectUndead:true},};return abilities[ci]||null;}
function getClassTrapBonus(){const a=getClassAbility();return a?a.trapBonus:0;}
function getClassPerceptionBonus(){const a=getClassAbility();return a?a.perBonus:0;}
function getClassStealthBonus(){const a=getClassAbility();return a?a.stealthBonus:0;}
function hasClassDarkvision(){const a=getClassAbility();return a&&a.darkvision;}
var SKILL_TO_ABILITY={atl:'st',acr:'dx',slh:'dx',ste:'dx',stl:'dx',arc:'it',his:'it',inv:'it',nat:'it',rel:'it',anh:'ws',ins:'ws',med:'ws',per:'ws',sur:'ws',dec:'ch',itm:'ch',prf:'ch',prs:'ch',};function getExhaustionSpeedMultiplier(){const lvl=S.exhaustion||0;if(lvl>=5)return 0;if(lvl>=2)return 2.0;return 1.0;}
function getAbilityMod(statKey){const abilityKey=SKILL_TO_ABILITY[statKey]||statKey;var raw=(S.charData&&S.charData[abilityKey]);var val=typeof raw==='number'&&!isNaN(raw)?raw:10;/* BUG FIX 2026-04-11: defensive against string values (e.g. 'cn'=class name) */ var mod=Math.floor((val-10)/2);if(isNaN(mod)){console.warn('[EXPLORE] getAbilityMod NaN statKey=%s abilityKey=%s raw=%s — defaulting to 0',statKey,abilityKey,raw);return 0;}return mod;}
function hasCondition(type){return S.conditions.some(c=>c.type===type);}
function getPassivePerception(){if(!S.charData)return 10;var _cacheKey=S._stepCount+'_'+S.travelPace+'_'+(S.conditions?S.conditions.length:0)+'_'+(S.exhaustion||0);if(S._ppCacheKey===_cacheKey&&typeof S._ppCached==='number')return S._ppCached;const wisMod=getAbilityMod('ws');const profInPerception=S.charData.sp&&S.charData.sp.includes('per');const profBonus=profInPerception?(S.charData.pb||2):0;let base=10+wisMod+profBonus;if(typeof conditionPPMod==='function')base+=conditionPPMod();if(typeof getClassPerceptionBonus==='function')base+=getClassPerceptionBonus();if(S.travelPace==='fast')base-=5;if(S.travelPace==='cautious')base+=5;S._ppCacheKey=_cacheKey;S._ppCached=base;return base;}
function tickConditions(){for(const c of S.conditions){if(c.type==='poisoned'&&c.stepsLeft>0){const dot=Math.floor(Math.random()*4)+1;S.hpChange-=dot;logMoveEvent([{type:'condition_tick',cond:'poisoned',dot:dot,hpDelta:S.hpChange}]);if(S.charData){const newHP=Math.max(0,S.charData.hp+S.hpChange);updateHP(newHP,S.charData.mh);}
flashScreen('rgba(60,180,60,0.2)');showTerrainToast('Dano de veneno! -'+dot+' HP','damage');if(typeof showBark==='function')showBark('low_hp');if(typeof checkDeath==='function'&&checkDeath())return;}}
S.conditions=S.conditions.filter(c=>{c.stepsLeft--;return c.stepsLeft>0;});updateConditionHUD();S._stepsWithoutRest=(S._stepsWithoutRest||0)+1;var steps=S._stepsWithoutRest;if(steps===8){showTerrainToast('Seus p\u00e9s come\u00e7am a pesar...','info');_setFatigueVisual(1);}else if(steps===11){showTerrainToast('Voc\u00ea precisa descansar em breve.','condition');_setFatigueVisual(2);}else if(steps===14){showTerrainToast('\u26a0\ufe0f Exaust\u00e3o se aproxima! Descanse agora!','damage');_setFatigueVisual(3);}
if(steps===12&&(S._fatigue||0)<1){S._fatigue=1;showTerrainToast('Fadiga: -1 em testes de habilidade','condition');updateFatigueHUD();}
if(steps>15){var extraSteps=steps-15;var dc=10+extraSteps;var conMod=getAbilityMod('co');/* BUG FIX 2026-04-11: 'cn' was class name key, not CON */ var rollResult=rollD20('normal');if(rollResult.roll+conMod<dc){if((S._fatigue||0)>0&&(S._fatigue||0)<2){S._fatigue=2;showTerrainToast('Fadiga severa! Descanse ou ganhar\u00e1 exaust\u00e3o.','damage');updateFatigueHUD();}else{addExhaustion(1,'Marcha for\u00e7ada');}}}
S._stepsForRation=(S._stepsForRation||0)+1;if(S._stepsForRation>=8){S._stepsForRation=0;_consumeRation();}
if(typeof updateCompass==='function')updateCompass();if(typeof updateQuestCompass==='function')updateQuestCompass();_checkHiddenNearby();if(typeof _tickAmbientFlavor==='function')_tickAmbientFlavor();if(typeof checkDeath==='function'&&checkDeath())return;}
/* Hidden POI proximity warning — subtle hint when 2 hexes from hidden POI */
function _checkHiddenNearby(){if(!S.pois||!S._passivePerception)return;var _hnShown=S._hiddenHintShown||(S._hiddenHintShown={});for(var i=0;i<S.pois.length;i++){var p=S.pois[i];if(!p.hidden||S.poisResolved.has(p.id))continue;if(_hnShown[p.id])continue;var d=typeof hexDist==='function'?hexDist(S.playerCol,S.playerRow,p.col,p.row):99;if(d===2&&S._passivePerception>=(p.hiddenDC||12)-3){_hnShown[p.id]=true;showTerrainToast('Algo te intriga nesta direcao...','flavor');break;}}}
function _consumeRation(){if(window._dbg)console.debug("[EXPLORE] consumeRation",{inv:S.inventory?S.inventory.length:0});if(!S.inventory)return;const foods=S.inventory.filter(i=>i.q>0&&i.t==='food');if(foods.length===0){S._noFoodPeriods=(S._noFoodPeriods||0)+1;if(S._noFoodPeriods>=2){S._noFoodPeriods=0;addExhaustion(1,'Fome (sem ra\u00e7\u00f5es)');}else{showTerrainToast('\u26a0\ufe0f Sem ra\u00e7\u00f5es! Encontre comida ou acampe.','condition');}
return;}
S._noFoodPeriods=0;foods.sort((a,b)=>(a.v||0)-(b.v||0));if(!foods[0]){console.error('[EXPLORE] ration_sort_empty foods_count=%d',foods.length);if(typeof showTerrainToast==='function')showTerrainToast('⚠️ Erro ao consumir ração','condition');return;}const ration=foods[0];ration.q--;showTerrainToast('\ud83c\udf56 Ra\u00e7\u00e3o consumida ('+ration.n+')','info');if(typeof showBark==='function'&&Math.random()<0.5)showBark('rest');saveState();}
var CONDITION_EFFECTS={poisoned:{icon:'\u2620',label:'Envenenado',css:'condition-poisoned',dis:['str','dx','cn','int','ws','cha','per','ste','sur','inv','atl','acr'],dot:true},prone:{icon:'🧎',label:'Ca\u00eddo',css:'condition-prone',dis:['atl','acr'],extraMove:true},frightened:{icon:'😨',label:'Amedrontado',css:'condition-frightened',dis:['str','dx','atl','acr','ste']},blinded:{icon:'👁',label:'Cego',css:'condition-blinded',dis:['per','inv'],ppMod:-5},restrained:{icon:'\u26d3',label:'Contido',css:'condition-restrained',dis:['dx','ste','acr'],speedZero:true},deafened:{icon:'👂',label:'Surdo',css:'condition-deafened',dis:['per']},charmed:{icon:'💜',label:'Encantado',css:'condition-charmed',dis:[]},stunned:{icon:'💫',label:'Atordoado',css:'condition-stunned',dis:['str','dx','cn','int','ws','cha'],speedZero:true},incapacitated:{icon:'\u274c',label:'Incapacitado',css:'condition-incapacitated',dis:[],speedZero:true},};function conditionGivesDisadvantage(stat){for(const c of S.conditions){const fx=CONDITION_EFFECTS[c.type];if(fx&&fx.dis&&fx.dis.includes(stat))return true;}
if(S.exhaustion>=1)return true;return false;}
function conditionPreventsMovement(){for(const c of S.conditions){const fx=CONDITION_EFFECTS[c.type];if(fx&&fx.speedZero)return true;}
return false;}
function conditionPPMod(){let mod=0;for(const c of S.conditions){const fx=CONDITION_EFFECTS[c.type];if(fx&&fx.ppMod)mod+=fx.ppMod;}
return mod;}
function addCondition(type,duration){const fx=CONDITION_EFFECTS[type];if(!fx){console.warn('[EXPLORE] Unknown condition:',type);return;}console.info('[EXPLORE] condition_added',{type:type,duration:duration,total:S.conditions?S.conditions.length+1:1});
const existing=S.conditions.find(c=>c.type===type);if(existing){existing.stepsLeft=Math.max(existing.stepsLeft,duration||5);updateConditionHUD();return;}
const defaultDurations={poisoned:8,prone:1,frightened:5,blinded:5,restrained:3,deafened:5,charmed:8,stunned:2,incapacitated:2,};const stepsLeft=duration||defaultDurations[type]||5;S.conditions.push({type:type,stepsLeft:stepsLeft});if(window._dbg)console.debug("[EXPLORE] addCondition",{type:type,duration:stepsLeft,total:S.conditions.length});updateConditionHUD();showTerrainToast(fx.icon+' '+fx.label+'! ('+stepsLeft+' passos)','condition');try{if(typeof tg!=='undefined'&&tg)tg.HapticFeedback.impactOccurred('medium');}catch(e){console.warn('[EXPLORE]',e);}
saveState();}
function removeCondition(type){console.info("[EXPLORE] condition_removed",{type:type,before:S.conditions?S.conditions.length:0});S.conditions=S.conditions.filter(c=>c.type!==type);logMoveEvent([{type:'condition_removed',cond:type}]);updateConditionHUD();saveState();}
function _setFatigueVisual(level){document.body.classList.remove('fatigue-1','fatigue-2','fatigue-3');if(level>0)document.body.classList.add('fatigue-'+level);}
function updateFatigueHUD(){var badge=document.getElementById('fatigue-badge');if(!badge)return;var f=S._fatigue||0;if(f<=0){badge.style.display='none';_setFatigueVisual(0);}else{badge.style.display='inline';badge.textContent=f===1?'Fadiga':'Fadiga Severa';badge.className='fatigue-badge fatigue-lv'+f;}}
function getFatigueMod(){return-(S._fatigue||0);}
function updateConditionHUD(){var bar=document.getElementById('condition-bar');if(bar){bar.innerHTML='';if(!S.conditions.length){bar.style.display='none';}else{bar.style.display='flex';for(var ci=0;ci<S.conditions.length;ci++){var c=S.conditions[ci];var fx=CONDITION_EFFECTS[c.type]||{icon:'❓',label:c.type,css:''};var tag=document.createElement('span');tag.className='condition-tag';if(fx.css)tag.classList.add(fx.css);if(c.stepsLeft<=2)tag.classList.add('condition-fading');tag.textContent=fx.icon+' '+fx.label+' ('+c.stepsLeft+')';bar.appendChild(tag);}}}var hudCond=document.getElementById('hud-conditions');if(hudCond){hudCond.innerHTML='';for(var hi=0;hi<Math.min(2,S.conditions.length);hi++){var hc=S.conditions[hi];var hfx=CONDITION_EFFECTS[hc.type]||{icon:'❓',label:hc.type};var pill=document.createElement('span');pill.className='condition-pill';if(hfx.css)pill.classList.add(hfx.css);pill.textContent=hfx.icon+' '+hfx.label;hudCond.appendChild(pill);}if(S.conditions.length>2){var more=document.createElement('span');more.className='condition-pill condition-more';more.textContent='+'+(S.conditions.length-2);hudCond.appendChild(more);}}}

var EXHAUSTION_EFFECTS=['','Desvantagem em testes de habilidade','Velocidade reduzida pela metade','Desvantagem em saves e ataques','HP m\u00e1ximo reduzido pela metade','Velocidade = 0','Morte',];function addExhaustion(levels,source){var _prevExh=S.exhaustion||0;const prev=S.exhaustion||0;S.exhaustion=Math.min(6,prev+levels);if(window._dbg)console.debug("[EXPLORE] addExhaustion",{levels:levels,source:source,prev:_prevExh,now:S.exhaustion});logMoveEvent([{type:'exhaustion_added',prev:_prevExh,now:S.exhaustion,src:source||''}]);if(S.exhaustion>prev){updateExhaustionHUD();const effect=EXHAUSTION_EFFECTS[S.exhaustion]||'';showTerrainToast(`\u26a0\ufe0f Exaust\u00e3o ${S.exhaustion}: ${effect}`,'condition');if(source)showTerrainToast(`Causa: ${source}`,'info');_showExhaustionModal(S.exhaustion,effect,source);if(S.exhaustion>=5){showTerrainToast('Voc\u00ea n\u00e3o consegue mais andar! Descanse imediatamente.','damage');}
if(S.exhaustion>=6&&typeof checkDeath==='function'){S.hpChange=-(S.charData?S.charData.mh:999);checkDeath();}
if(typeof updateCampButtonHint==='function')updateCampButtonHint();if(typeof _enforceExhaustionHP==='function')_enforceExhaustionHP();saveState();}}
function removeExhaustion(levels){var _pe=S.exhaustion||0;if(window._dbg)console.debug("[EXPLORE] removeExhaustion",{levels:levels,prev:_pe,now:Math.max(0,_pe-levels)});S.exhaustion=Math.max(0,(S.exhaustion||0)-levels);updateExhaustionHUD();if(typeof updateCampButtonHint==='function')updateCampButtonHint();saveState();}
function _showExhaustionModal(level,effect,source){if(typeof vPopup==='undefined')return;var effects=[];for(var i=1;i<=level;i++){var e=EXHAUSTION_EFFECTS[i];if(e)effects.push('<div class="exh-modal-effect'+(i===level?' current':'')+'">'+String.fromCharCode(8226)+' Nível '+i+': '+e+'</div>');}
var impactTips={1:'🎯 Todos os testes de habilidade têm desvantagem.',2:'💨 Sua velocidade no mapa foi reduzida pela metade.',3:'⚔️ Ataques e salvaguardas também têm desvantagem.',4:'❤️ Seu HP máximo foi cortado pela metade!',5:'🚫 Você não consegue se mover. Descanse!',6:'☠️ Morte por exaustão total.'};var impact=impactTips[level]||'';var recovTip='🔥 Toque no botão de fogueira para acampar.';if(level>=2)recovTip='🌙 Faça um Descanso Longo para reduzir 1 nível.';if(level>=4)recovTip='⚠️ Urgente! Faça um Descanso Longo imediatamente.';var bodyHtml='<div class="exh-modal-effects">'+effects.join('')+'</div>'+(source?'<div class="exh-modal-source">Causa: '+vEsc(source)+'</div>':'')+(impact?'<div class="exh-modal-impact">'+impact+'</div>':'')+'<div class="exh-modal-tip">'+recovTip+'</div>';vPopup.show({header:(level>=4?'☠️':'⚠️')+' Exaustão Nível '+level,headerClass:'v-popup-header--danger',body:bodyHtml,actions:[{label:'Entendido',action:'dismiss',cls:'v-popup-btn v-popup-btn--primary'}]});var dismissTime=level>=4?12000:level>=2?10000:8000;setTimeout(function(){if(typeof vPopup!=='undefined'&&vPopup.isOpen())vPopup.hide();},dismissTime);}
function resetStepsWithoutRest(){S._stepsWithoutRest=0;S._stepsForRation=0;S._noFoodPeriods=0;S._fatigue=0;S._fatiguePeriods=0;_setFatigueVisual(0);if(typeof updateFatigueHUD==='function')updateFatigueHUD();saveState();}
var _THREAT_NARR={2:'Sinais de vida selvagem aumentam...',3:'A sensacao de ser observado fica mais forte.',4:'Um pressagio escuro permeia a terra.',5:'O proprio ar parece hostil.'};function updateDangerPips(){var pips=document.querySelectorAll('.danger-pips .danger-pip');var lvl=Math.floor(S.dangerLevel||1);if(typeof updateDangerTension==='function')updateDangerTension();pips.forEach(function(pip,i){pip.className='danger-pip';if(i<lvl)pip.classList.add('filled-'+(i+1));});if(S._lastDangerLvl!==undefined&&lvl>S._lastDangerLvl&&_THREAT_NARR[lvl]&&typeof showTerrainToast==='function'){showTerrainToast(_THREAT_NARR[lvl],'danger');}S._lastDangerLvl=lvl;}
function updateCampButtonHint(){var btn=document.getElementById('btn-camp');if(!btn)return;btn.classList.toggle('has-exhaustion',S.exhaustion>0);var lowHP=typeof getHPPercent==='function'&&getHPPercent()<50;btn.classList.toggle('low-hp',lowHP);var viewport=document.getElementById('map-viewport');if(viewport){var criticalHP=typeof getHPPercent==='function'&&getHPPercent()<=25;viewport.classList.toggle('low-hp-active',criticalHP);}}
function getExhaustionPenalty(){const lvl=S.exhaustion||0;return{abilityDisadvantage:lvl>=1,halfSpeed:lvl>=2,saveDisadvantage:lvl>=3,halfMaxHP:lvl>=4,speedZero:lvl>=5,death:lvl>=6,};}
function getEffectiveMaxHP(){if(!S.charData)return 10;const baseMax=S.charData.mh||10;if((S.exhaustion||0)>=4)return Math.floor(baseMax/2);return baseMax;}
function _enforceExhaustionHP(){if(!S.charData)return;const effMax=getEffectiveMaxHP();const currentHP=S.charData.hp+(S.hpChange||0);if(currentHP>effMax){S.hpChange=effMax-S.charData.hp;updateHP(effMax,S.charData.mh);showTerrainToast('\u26a0\ufe0f HP m\u00e1ximo reduzido pela exaust\u00e3o!','condition');}}
function updateExhaustionHUD(){var panel=document.getElementById('exhaustion-panel');if(panel){var lvl=S.exhaustion||0;if(lvl===0){panel.style.display='none';panel.classList.remove('exh-high');}else{panel.style.display='flex';var _el=document.getElementById('exh-label-panel');if(_el)_el.textContent='💀 Exaustão '+lvl;var pips=panel.querySelectorAll('.exh-pip');pips.forEach(function(pip,i){pip.classList.remove('filled','critical');if(i<lvl){pip.classList.add('filled');if(i>=3)pip.classList.add('critical');}});var _exhEffects={1:'Desvant. testes',2:'Vel. reduzida',3:'Desvant. ataques',4:'HP max reduzido',5:'Imóvel'};var effectEl=document.getElementById('exh-effect');if(effectEl)effectEl.textContent=_exhEffects[lvl]||'';if(lvl>=3)panel.classList.add('exh-high');else panel.classList.remove('exh-high');console.info('[EXPLORE:HUD] exhaustion_update lvl=%d effect=%s pulse=%s',lvl,_exhEffects[lvl]||'none',lvl>=3?'on':'off');}}}

/* Auto-regenerate encounter pool when depleted (safety net — skills must use short codes per, atl; combat payload required for cmb_direct / cmb_on_fail) */
function _regenSkillMod(skillShort){if(!S.charData||typeof getAbilityMod!=='function')return 0;var ab=getAbilityMod(skillShort);var pb=S.charData.pb||2;var prof=S.charData.sp&&S.charData.sp.includes(skillShort);var expert=S.charData.ex&&S.charData.ex.includes(skillShort);if(expert)return ab+pb;if(prof)return ab+pb;return ab;}
function _regenPickEnemy(biome){var POOL={forest:[['Lobo','\u2694\ufe0f'],['Goblin','\u2694\ufe0f'],['Urso Negro','\u2694\ufe0f'],['Aranha Gigante','\u2694\ufe0f'],['Javali','\u2694\ufe0f']],plains:[['Bandido','\u2694\ufe0f'],['Javali','\u2694\ufe0f'],['Orc','\u2694\ufe0f']],swamp:[['Sapo Gigante','\u2694\ufe0f'],['Homem-Lagarto','\u2694\ufe0f'],['Limo Cinzento','\u2694\ufe0f']],cave:[['Rato Gigante','\u2694\ufe0f'],['Kobold','\u2694\ufe0f'],['Aranha Gigante','\u2694\ufe0f']],desert:[['Gnoll','\u2694\ufe0f'],['Bandido','\u2694\ufe0f'],['Cocatrice','\u2694\ufe0f']],mountain:[['Gnoll','\u2694\ufe0f'],['Ogro','\u2694\ufe0f'],['Bico de Machado','\u2694\ufe0f']],snow:[['Lobo','\u2694\ufe0f'],['Worg','\u2694\ufe0f'],['Urso Negro','\u2694\ufe0f']],volcanic:[['Kobold','\u2694\ufe0f'],['Ogro','\u2694\ufe0f'],['Grimlock','\u2694\ufe0f']],graveyard:[['Esqueleto Guerreiro','\u2694\ufe0f'],['Zumbi','\u2694\ufe0f'],['Espectro','\u2694\ufe0f']]};var p=POOL[biome]||POOL.forest;var pair=p[Math.floor(Math.random()*p.length)];return {en:pair[0],ei:pair[1],b:biome,d:S.dangerLevel||1};}
function _regenerateEncounterPool(){if(!S.randomEncounters)S.randomEncounters=[];if(S.randomEncounters.length>0)return;var dl=S.dangerLevel||1;var count=6+dl;
/* A2 (hexmap FRICÇÃO-4): DM bark when pool regenerates to inform player
 * that new dangers are being spawned in the region. */
var _poolBarks=['Novos perigos emergem nesta regiao...','Voce sente novas ameacas se aproximando.','O ar se torna pesado com nova inquietacao.','Algo novo desperta nas profundezas desta terra.'];
var _poolBark=_poolBarks[Math.floor(Math.random()*_poolBarks.length)];
if(typeof showTerrainToast==='function'){setTimeout(function(){showTerrainToast(_poolBark,'flavor');},200);}var types=['amb','amb','trp','hid','snd','amb','hid','snd'];var skPool=['per','sur','atl','acr','stl','inv'];var _FULL={amb:'ambush',trp:'trap',hid:'hidden',snd:'sound'};var _rn=function(a){return a[Math.floor(Math.random()*a.length)];};var biome=S.biome||'forest';for(var i=0;i<count;i++){var t=_rn(types);var sk=_rn(skPool);var dc=8+dl*2+Math.floor(Math.random()*4);var dmg=Math.max(1,dl+Math.floor(Math.random()*3));var xpOk=2+dl*2;var gpOk=dl*4;var cmb=Object.assign({},_regenPickEnemy(biome),{narrative:'Hostilidade revelada.'});if(t==='trp'){var trapSk=_rn(['dex','con']);var trapDmgSides=Math.min(12,4+dl*2);var trapMod=0;if(S.charData){var _scoreKey=trapSk==='dex'?'dx':'co';trapMod=Math.floor(((S.charData[_scoreKey]||10)-10)/2);}var trapPool=(typeof ENCOUNTER_NARRATIONS!=='undefined'&&ENCOUNTER_NARRATIONS.trap)?(ENCOUNTER_NARRATIONS.trap[biome]||ENCOUNTER_NARRATIONS.trap.forest||[]):[];var trapNarr=trapPool.length>0?trapPool[Math.floor(Math.random()*trapPool.length)]:'';S.randomEncounters.push({type:'trp',title:'Armadilha',tt:'Armadilha',narration:trapNarr,combat:cmb,autoSave:{s:trapSk,dc:dc,dmg:'1d'+trapDmgSides,dt:trapSk==='con'?'poison':'piercing',m:trapMod},ch:[]});}else if(t==='amb'){var fullN=_FULL[t];var nPool=(typeof ENCOUNTER_NARRATIONS!=='undefined'&&ENCOUNTER_NARRATIONS[fullN])?(ENCOUNTER_NARRATIONS[fullN][biome]||ENCOUNTER_NARRATIONS[fullN].forest||[]):[];var nAmb=nPool.length>0?nPool[Math.floor(Math.random()*nPool.length)]:'';var dcF=Math.max(8,dc-1);S.randomEncounters.push({type:'amb',title:'Emboscada',tt:'Emboscada',narration:nAmb,combat:cmb,choices:[{t:'Fugir',l:'Fugir',i:'\ud83c\udfc3',k:{s:'atl',dc:dcF,m:_regenSkillMod('atl')},o:{t:'Você rompe o cerco por um fio de tempo.',x:xpOk},f:{t:'O terreno trai seus passos; a ameaça se fecha.',x:1},cmb_on_fail:true},{t:'Atacar',l:'Atacar',i:'\u2694\ufe0f',cmb_direct:true,o:{t:'Combate.'}},{t:'Esquivar',l:'Esquivar',k:{s:'acr',dc:dc,m:_regenSkillMod('acr')},o:{t:'Você rola para fora do alcance no último instante.',x:xpOk},f:{t:'O impacto te atinge em cheio.',x:2,d:dmg}}]});}else{var full=_FULL[t]||'sound';var encNarrPool=(typeof ENCOUNTER_NARRATIONS!=='undefined'&&ENCOUNTER_NARRATIONS[full])?(ENCOUNTER_NARRATIONS[full][biome]||ENCOUNTER_NARRATIONS[full].forest||[]):[];var encNarr=encNarrPool.length>0?encNarrPool[Math.floor(Math.random()*encNarrPool.length)]:'';var ttl=t==='hid'?'Sinal oculto':'Ruído suspeito';S.randomEncounters.push({type:t,title:ttl,tt:ttl,narration:encNarr,combat:cmb,choices:[{t:'Investigar com cautela',l:'Investigar',i:'\ud83d\udd0d',k:{s:sk,dc:dc,m:_regenSkillMod(sk)},o:{t:'Você reúne pistas e evita o pior.',x:xpOk,g:gpOk},f:{t:'Era uma armadilha — ou você alertou quem não devia.',x:2,d:dmg},cmb_on_fail:true},{t:'Atacar de imediato',l:'Atacar',i:'\u2694\ufe0f',cmb_direct:true,o:{t:'Confronto.'}},{t:'Ignorar e seguir',l:'Ignorar',i:'\u27a1\ufe0f',o:{x:1}}]});}}console.info('[EXPLORE] regenerated '+count+' encounters (pool was depleted)');if(typeof traceExploreCombat==='function')traceExploreCombat('pool_regen',{generated:count,biome:biome,danger:dl});}
function updateCompass(){const el=document.getElementById('exit-compass');if(!el)return;if(S.exitCol==null||S.exitRow==null){el.style.display='none';return;}
el.style.display='flex';const dx=S.exitCol-S.playerCol;const dy=S.exitRow-S.playerRow;const dist=typeof hexDist==='function'?hexDist(S.playerCol,S.playerRow,S.exitCol,S.exitRow):Math.round(Math.sqrt(dx*dx+dy*dy));const angle=Math.atan2(dy,dx)*(180/Math.PI)-90;const arrow=document.getElementById('compass-arrow');const distEl=document.getElementById('compass-dist');if(!arrow||!distEl)return;arrow.style.transform=`rotate(${angle}deg)`;arrow.style.setProperty('--compass-angle',angle+'deg');distEl.textContent=dist+'h';el.classList.toggle('nearby',dist<=3);}
/* Quest compass — points to nearest unresolved quest POI (chainId) or NPC POI */
function updateQuestCompass(){var el=document.getElementById('quest-compass');if(!el)return;if(!S.pois||S.pois.length===0){el.style.display='none';return;}
var best=null;var bestDist=Infinity;for(var i=0;i<S.pois.length;i++){var p=S.pois[i];if(S.poisResolved&&S.poisResolved.has(p.id))continue;if(!p.chainId&&p.type!=='npc')continue;var d=typeof hexDist==='function'?hexDist(S.playerCol,S.playerRow,p.col,p.row):99;if(d<bestDist){bestDist=d;best=p;}}
if(!best||bestDist>8){el.style.display='none';return;}
el.style.display='flex';var qdx=best.col-S.playerCol;var qdy=best.row-S.playerRow;var qAngle=Math.atan2(qdy,qdx)*(180/Math.PI)-90;var qArrow=document.getElementById('quest-compass-arrow');var qLabel=document.getElementById('quest-compass-label');if(qArrow){qArrow.style.transform='rotate('+qAngle+'deg)';qArrow.style.setProperty('--quest-angle',qAngle+'deg');}
if(qLabel)qLabel.textContent=bestDist+'h';el.classList.toggle('nearby',bestDist<=5);if(window._dbg)console.debug('[EXPLORE] questCompass poi=%s dist=%d nearby=%s',best.id,bestDist,bestDist<=5);}
var _BIOME_NAMES={forest:'Floresta',plains:'Campos',swamp:'Pântano',cave:'Caverna',desert:'Deserto',mountain:'Montanha',snow:'Ermo Gelado',volcanic:'Vulcão',graveyard:'Cemitério'};var _TILE_NAMES={T:'Árvores',g:'Grama',w:'Água',r:'Rochedo',R:'Ruínas',p:'Trilha',s:'Areia',m:'Lama',i:'Gelo',v:'Cinzas',b:'Ponte',L:'Lava',};function updateLocationInfo(){const el=document.getElementById('location-info');if(!el)return;const baseBiome=(S.biome||'').replace(/^dungeon_/,'');const biomeName=_BIOME_NAMES[baseBiome]||S.biome||'';const tile=S.grid&&S.grid[S.playerRow]?(S.grid[S.playerRow][S.playerCol]||'.'):'.';const tileName=_TILE_NAMES[tile]||'';el.textContent=tileName?`${biomeName} \u2022 ${tileName}`:biomeName;}
var FLAVOR_TEXTS={forest:['Pássaros cantam nas copas distantes.','Uma brisa agita as folhas ao seu redor.','Raízes retorcidas formam padrões curiosos no chão.','Cogumelos brilhantes crescem na base de um tronco.','Algo se move entre as árvores — e desaparece.','Uma teia de aranha reluz com gotas de orvalho.','O aroma de pinheiro e terra úmida envolve o ar.','Um esquilo observa você de um galho alto.',],plains:['O vento faz ondas suaves no capim alto.','Uma ave de rapina circula lentamente no céu.','Flores silvestres colorem o campo ao longe.','Uma rajada de vento traz o cheiro de terra seca.','O canto dos grilos ecoa ritmicamente.','Nuvens projetam sombras que cruzam o campo.','Rastros de animais marcam o solo batido.','A luz dourada ilumina a paisagem aberta.',],swamp:['Bolhas sobem lentamente da água turva.','Um coaxar grave ecoa entre os troncos retorcidos.','Nuvens de insetos pairam sobre a água parada.','Um cheiro pútrido sobe da lama escura.','Névoa densa se agarra ao solo encharcado.','Algo se move sob a superfície da água.','Troncos apodrecidos formam pontes naturais instáveis.','Luzes pálidas piscam ao longe — fogos-fátuos.',],cave:['Gotas de água ecoam nas paredes distantes.','Asas agitam-se na escuridão acima.','Cristais refletem a luz fracamente nas paredes.','Uma corrente de ar frio vem de um túnel lateral.','Estalagmites projetam sombras alongadas.','Teias abandonadas pendem do teto rochoso.','Seus passos ecoam várias vezes antes de silenciar.','Marcas de picareta antigas cobrem a parede.',],desert:['O calor distorce o horizonte em miragens.','Um escorpião desliza rapidamente entre as pedras.','Uma rajada de areia agita-se em espiral.','O sol implacável castiga a areia sem fim.','Um lagarto observa imóvel sobre uma rocha quente.','Restos de cerâmica antiga emergem da areia.','Um cacto solitário projeta uma sombra minúscula.','Ossos esbranquiçados pontilham a paisagem árida.',],mountain:['O vento uiva entre as rochas expostas.','Uma águia plana majestosamente nas correntes de ar.','Pedras soltas rolam pelo declive abaixo.','A temperatura cai visivelmente a cada passo.','Uma cabra montanhesa observa de um penhasco.','Formações rochosas formam arcos naturais.','Nuvens baixas envolvem os picos ao redor.','Veios minerais brilham na rocha cortada.',],snow:['Flocos de neve dançam silenciosamente ao seu redor.','Pegadas no gelo se perdem na nevasca.','O vento gélido corta como uma lâmina.','Estalactites de gelo pendem das rochas acima.','Um uivo distante ecoa pelo ermo gelado.','O gelo sob seus pés range a cada passo.','Uma nevasca se forma no horizonte distante.','Rastros de um animal grande cruzam a neve fresca.',],volcanic:['O ar quente tremula sobre fissuras incandescentes.','Um tremor sutil faz o chão vibrar.','Jatos de vapor escapam de fendas na rocha.','Rocha derretida brilha em veios alaranjados.','O cheiro de enxofre arde nas narinas.','Cinzas flutuam no ar como neve negra.','O calor intenso faz a pele arder.','Obsidiana negra reluz entre as rochas vulcânicas.',],graveyard:['Lápides tortas emergem da névoa rasteira.','Uma coruja pia sombriamente ao longe.','O vento agita galhos secos como dedos esqueléticos.','Uma vela bruxuleante arde sobre um túmulo antigo.','Névoa fria se agarra às suas botas.','Morcegos irrompem de uma cripta entreaberta.','Uma lápide rachada revela inscrições ilegíveis.','Você sente um arrepio inexplicável na nuca.',],};function checkFlavorEvent(){var overlayIds=['dm-overlay','check-overlay','outcome-overlay','combat-overlay','portal-overlay','encounter-overlay','exit-risk-overlay','death-overlay','camp-overlay','camp-result-overlay','lowhp-overlay'];for(var i=0;i<overlayIds.length;i++){var el=document.getElementById(overlayIds[i]);if(el&&el.classList.contains('active'))return;}
S._flavorSteps++;var threshold=4+Math.floor(Math.random()*3);if(S._flavorSteps<threshold)return;S._flavorSteps=0;var pool=FLAVOR_TEXTS[S.biome]||FLAVOR_TEXTS.forest;var hpPct=typeof getHPPercent==='function'?getHPPercent():100;if(hpPct<=25&&Math.random()<0.4){var lowHPFlavors=['Seus ferimentos pulsam com cada passo. Voce precisa de descanso.','O sangue mancha suas roupas. Cada movimento e um esforco.','Sua visao escurece nas bordas. Quanto mais voce aguenta?','A dor e constante agora. Voce se apoia na parede para nao cair.',];pool=lowHPFlavors;}else if(S.exhaustion>=2&&Math.random()<0.3){var exhaustFlavors=['O cansaco pesa em cada musculo. Seus passos ficam mais lentos.','Voce precisa parar para recuperar o folego. A exaustao cobra seu preco.','Suas pernas tremem de fadiga. Quanto mais longe voce pode ir?',];pool=exhaustFlavors;}
var text=pool[Math.floor(Math.random()*pool.length)];showTerrainToast(text,'flavor');}
var _OVERLAY_CHILDREN={'dm-overlay':['dm-choices','dm-narration'],'encounter-overlay':['enc-choices','enc-narration'],'exit-risk-overlay':['exit-options','exit-hp-row','exit-info-row'],'camp-overlay':['camp-food-list'],};var TERRAIN_TRANSITION_NARRATIONS={'F':['Voc\u00ea adentra a floresta. Galhos se fecham sobre o caminho, filtrando a luz.','\u00c1rvores altas cercam voc\u00ea. O ar fica \u00famido e pesado entre a folhagem.'],'C':['As paredes de pedra se estreitam. Voc\u00ea entra nas profundezas de uma caverna.','A luz se esvai. O eco dos seus passos revela a vast\u00e3o subterr\u00e2nea.'],'S':['O solo se torna lamacento. O cheiro p\u00fatrido do p\u00e2ntano invade suas narinas.','\u00c1gua turva cobre seus tornozelos. O p\u00e2ntano n\u00e3o perdoa descuidos.'],'D':['Areia quente sob os p\u00e9s. O horizonte ondula com o calor implacvel do deserto.','O sol castiga sem piedade. A areia parece se estender infinitamente.'],'M':['Pedras \u00edngremes bloqueiam o caminho. A subida pela montanha exige esfor\u00e7o.','O ar se torna rarefeito. Cada passo na montanha pesa como dez.'],'N':['Neve cobre tudo \u00e0 sua volta. O sil\u00eancio do inverno \u00e9 absoluto.','O frio corta como l\u00e2mina. Seus passos deixam marcas profundas na neve.'],'V':['O calor se torna insuport\u00e1vel. Fissuras incandescentes cortam o terreno vulc\u00e2nico.','Lava borbulha nas fendas pr\u00f3ximas. O ar tremula com o calor infernal.'],'G':['L\u00e1pides e cruzes marcam o terreno. Uma atmosfera de morte permeia tudo.','O ar gela. Algo neste cemit\u00e9rio observa cada movimento seu.'],};var _lastTerrainType=null;function checkTerrainTransition(col,row){var terrain=S.grid[row]&&S.grid[row][col]?S.grid[row][col]:'.';if(_lastTerrainType&&terrain!==_lastTerrainType&&TERRAIN_TRANSITION_NARRATIONS[terrain]){var pool=TERRAIN_TRANSITION_NARRATIONS[terrain];var narr=pool[Math.floor(Math.random()*pool.length)];showTerrainToast(narr,'info');}
_lastTerrainType=terrain;}
var _EVENT_OVERLAY_IDS=['dm-overlay','check-overlay','outcome-overlay','combat-overlay','portal-overlay','encounter-overlay','exit-risk-overlay','death-overlay','camp-overlay','camp-result-overlay','lowhp-overlay','activity-overlay','heal-dice-overlay','camp-dice-overlay','return-journey-overlay',];function isEventActive(){for(let i=0;i<_EVENT_OVERLAY_IDS.length;i++){const el=document.getElementById(_EVENT_OVERLAY_IDS[i]);if(el&&el.classList.contains('active'))return true;}
return false;}
function setEventActive(val){}
var _overlayTimestamps={};var _overlayWatchdogTimer=null;function _startOverlayWatchdog(){if(_overlayWatchdogTimer)clearInterval(_overlayWatchdogTimer);_overlayWatchdogTimer=setInterval(function(){if(document.visibilityState==='hidden')return;var now=Date.now();for(var id in _overlayTimestamps){var el=document.getElementById(id);if(!el||!el.classList.contains('active')){delete _overlayTimestamps[id];continue;}/* Never dismiss overlays that have interactive buttons — player must choose */
var hasButtons=el.querySelector('button:not(.v-skip-btn)');if(hasButtons){continue;}
var maxAge=id==='combat-overlay'||id==='dm-overlay'?45000:60000;if(now-_overlayTimestamps[id]>maxAge){console.warn('[EXPLORE:WATCHDOG] Stuck overlay force-dismiss id=%s age=%ds (no buttons)',id,Math.round((now-_overlayTimestamps[id])/1000));deactivateOverlay(id);}}},15000);}
/*_TIMEOUT*/setTimeout(_startOverlayWatchdog,5000);
function activateOverlay(overlayId){console.info('[EXPLORE] overlay_on',overlayId);if(window._dbg)console.debug("[EXPLORE] overlay+",overlayId);_overlayTimestamps[overlayId]=Date.now();const children=_OVERLAY_CHILDREN[overlayId];if(children){for(const childId of children){const el=document.getElementById(childId);if(el)el.innerHTML='';}}
const overlay=document.getElementById(overlayId);if(overlay)overlay.removeAttribute('data-event');if(!overlay){console.error('[EXPLORE] activateOverlay: element not found:',overlayId);return null;}
overlay.classList.add('active');return overlay;}
function deactivateOverlay(overlayId){console.info('[EXPLORE] overlay_off',overlayId);if(window._dbg)console.debug("[EXPLORE] overlay-",overlayId);delete _overlayTimestamps[overlayId];const overlay=document.getElementById(overlayId);if(overlay)overlay.classList.remove('active');if(!isEventActive()&&typeof updateHexNav==='function')updateHexNav();}
function getNeighbors(col,row){const offsets=row%2===0?EVEN_OFFSETS:ODD_OFFSETS;return offsets.map(([dc,dr])=>[col+dc,row+dr]).filter(([c,r])=>c>=0&&c<COLS&&r>=0&&r<ROWS);}
function isAdjacent(c1,r1,c2,r2){return getNeighbors(c1,r1).some(([c,r])=>c===c2&&r===r2);}
function hexDist(c1,r1,c2,r2){function toCube(col,row){const x=col-(row-(row&1))/2;const z=row;const y=-x-z;return[x,y,z];}
const[x1,y1,z1]=toCube(c1,r1);const[x2,y2,z2]=toCube(c2,r2);return Math.max(Math.abs(x1-x2),Math.abs(y1-y2),Math.abs(z1-z2));}
function getCurrentHP(){return S.charData?S.charData.hp+S.hpChange:0;}
function getMaxHP(){return S.charData?S.charData.mh:1;}
function getHPPercent(){return(getCurrentHP()/getMaxHP())*100;}
function rollDiceFormula(formula){if(typeof formula==='number')return formula;if(!formula||formula==='0')return 0;const match=formula.match(/^(\d+)d(\d+)([+-]\d+)?$/);if(!match)return parseInt(formula,10)||0;const[,count,sides,bonus]=match;let total=0;for(let i=0;i<parseInt(count,10);i++){total+=Math.floor(Math.random()*parseInt(sides,10))+1;}
return total+(parseInt(bonus,10)||0);}
function bfsDistanceToExit(fromCol,fromRow){const target=`${S.exitCol},${S.exitRow}`;const start=`${fromCol},${fromRow}`;if(start===target)return 0;const visited=new Set([start]);const queue=[[fromCol,fromRow,0]];while(queue.length>0){const[col,row,dist]=queue.shift();const neighbors=getNeighbors(col,row);for(const[nc,nr]of neighbors){const key=`${nc},${nr}`;if(visited.has(key))continue;visited.add(key);const tile=S.grid[nr]&&S.grid[nr][nc]?S.grid[nr][nc]:'.';if(IMPASSABLE.has(tile))continue;if(key===target)return dist+1;queue.push([nc,nr,dist+1]);}}
return-1;}
function calculateExitRisk(distance){if(distance<=0)return{chance:5,label:'Seguro',color:'#4a8'};const chance=Math.min(80,15+distance*6+S.dangerLevel*4);if(chance<=25)return{chance,label:'Baixo',color:'#4a8'};if(chance<=50)return{chance,label:'Moderado',color:'#dca028'};if(chance<=65)return{chance,label:'Alto',color:'#c44'};return{chance,label:'Perigoso',color:'#a22'};}
var _hexFlashes=[];function flashHex(col,row){_hexFlashes.push({col,row,start:performance.now(),duration:700});scheduleRender();}
var _onPageHideWatchdog=function(){if(_overlayWatchdogTimer){clearInterval(_overlayWatchdogTimer);_overlayWatchdogTimer=null;}};window.addEventListener('pagehide',_onPageHideWatchdog);
var _onVisHideSave=function(){if(document.visibilityState==='hidden'){flushSaveState();}};document.addEventListener('visibilitychange',_onVisHideSave);if(!window._spaCleanupFns)window._spaCleanupFns=[];window._spaCleanupFns.push(function(){window.removeEventListener('pagehide',_onPageHideWatchdog);document.removeEventListener('visibilitychange',_onVisHideSave);if(_overlayWatchdogTimer){clearInterval(_overlayWatchdogTimer);_overlayWatchdogTimer=null;}});

var IMMERSIVE_KEY='valdoria_immersive';var _immersiveCollapsed=false;
function initImmersive(){var toggle=document.getElementById('immersive-toggle');var panel=document.getElementById('bottom-panel');var restore=document.getElementById('immersive-restore');if(!toggle||!panel||!restore)return;
function applyState(collapsed){_immersiveCollapsed=collapsed;panel.classList.toggle('immersive-collapsed',collapsed);toggle.style.display=collapsed?'none':'flex';restore.style.display=collapsed?'block':'none';panel.style.display='';toggle.setAttribute('aria-label',collapsed?'Expandir menu':'Recolher menu');}
try{_immersiveCollapsed=localStorage.getItem(IMMERSIVE_KEY)==='1';}catch(e){_immersiveCollapsed=false;}
applyState(_immersiveCollapsed);
toggle.addEventListener('click',function(){try{localStorage.setItem(IMMERSIVE_KEY,'1');}catch(e){console.warn('[EXPLORE]',e);}applyState(true);});
restore.addEventListener('click',function(){try{localStorage.setItem(IMMERSIVE_KEY,'0');}catch(e){console.warn('[EXPLORE]',e);}applyState(false);});}
var _explorePanelExpanded=false;
function toggleExplorePanel(){var panel=document.getElementById('explore-panel');if(!panel)return;_explorePanelExpanded=!_explorePanelExpanded;panel.classList.toggle('expanded',_explorePanelExpanded);var handle=document.getElementById('panel-handle');if(handle)handle.setAttribute('aria-label',_explorePanelExpanded?'Recolher painel':'Expandir painel');}
