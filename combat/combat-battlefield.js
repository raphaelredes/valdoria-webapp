/* Rank-based battlefield grid (Darkest Dungeon-style 4-rank) */
/* Ranks: 0=Player Front, 1=Player Back, 2=Enemy Front, 3=Enemy Back */
var _RANK_LABELS={0:'Frente',1:'Retaguarda',2:'Frente',3:'Retaguarda'};

function renderBattlefieldGrid(s){
  var pos=s.positions;if(!pos)return '';
  var enemies=s.e||[];var allies=s.a||[];var p=s.p;
  var ranks={0:[],1:[],2:[],3:[]};
  var pRank=pos['player']!=null?pos['player']:0;
  if(ranks[pRank])ranks[pRank].push({n:p?p.n:'Você',ico:'⚔️',hp:p?p.hp:1,mhp:p?p.mhp:1,type:'player'});
  allies.forEach(function(a,i){
    var r=pos['ally_'+i]!=null?pos['ally_'+i]:1;
    if(ranks[r])ranks[r].push({n:a.n,ico:a.ico||'🛡',hp:a.hp,mhp:a.mhp,type:'ally',dead:a.hp<=0});
  });
  enemies.forEach(function(e,i){
    var r=pos['enemy_'+i]!=null?pos['enemy_'+i]:2;
    if(ranks[r])ranks[r].push({n:e.n,ico:e.ico||'👹',hp:e.hp,mhp:e.mhp,type:'enemy',dead:e.hp<=0});
  });
  var canMove=s.can_move;
  var html='<div class="bf-grid">';
  html+='<div class="bf-side bf-side-enemy">';
  html+=_renderRankCol(ranks[3],_RANK_LABELS[3],'enemy');
  html+=_renderRankCol(ranks[2],_RANK_LABELS[2],'enemy');
  html+='</div>';
  html+='<div class="bf-divider"></div>';
  html+='<div class="bf-side bf-side-player">';
  html+=_renderRankCol(ranks[0],_RANK_LABELS[0],'player');
  html+=_renderRankCol(ranks[1],_RANK_LABELS[1],'player');
  html+='</div>';
  html+='</div>';
  if(canMove){
    html+='<div class="bf-move-row">';
    html+='<button class="bf-move-btn" data-bf-dir="forward">◀ Avançar</button>';
    html+='<button class="bf-move-btn" data-bf-dir="backward">Recuar ▶</button>';
    html+='</div>';
  }
  return html;
}

function _renderRankCol(occupants,label,side){
  var html='<div class="bf-rank">';
  html+='<div class="bf-rank-label">'+label+'</div>';
  if(occupants.length===0){
    html+='<div class="bf-token" style="opacity:0.2"><span class="bf-token-icon">·</span></div>';
  }else{
    occupants.forEach(function(o){
      var pct=o.mhp>0?o.hp/o.mhp:0;
      var hpCls=pct>THRESHOLDS.HP_HIGH?'hp-high':pct>THRESHOLDS.HP_LOW?'hp-mid':'hp-low';
      var deadCls=o.dead?' bf-token-dead':'';
      var typeCls=' bf-token-'+o.type;
      html+='<div class="bf-token'+typeCls+deadCls+'">';
      html+='<span class="bf-token-icon">'+o.ico+'</span>';
      html+='<span class="bf-token-name">'+escHtml(o.n)+'</span>';
      html+='<span class="bf-token-hp"><span class="bf-token-hp-fill '+hpCls+'" style="width:'+(pct*100)+'%"></span></span>';
      html+='</div>';
    });
  }
  html+='</div>';
  return html;
}

var _bfDelegated=false;
function _bindBattlefieldActions(){
  if(_bfDelegated)return;
  _bfDelegated=true;
  document.body.addEventListener('click',function(ev){
    var btn=ev.target.closest('.bf-move-btn');
    if(!btn)return;
    var dir=btn.getAttribute('data-bf-dir');
    if(dir&&typeof sendAction==='function'){
      sendAction({type:'reposition',direction:dir});
    }
  });
}
