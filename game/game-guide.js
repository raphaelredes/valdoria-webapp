(function(){'use strict';
var _overlay,_built=false,_index=[],_topicMap={},_cardRefs={},_activeCat='todos',_searchTerm='',_searchWords=[],_debounceTimer=null,_openCardId=null,_priorCat=null;
var _crossRefs={};

function _buildIndex(){
 if(!window.GUIDE_TOPICS)return;
 _index=[];_topicMap={};_crossRefs={};
 for(var i=0;i<GUIDE_TOPICS.length;i++){
  var t=GUIDE_TOPICS[i];
  _topicMap[t.id]=t;
  var txt=(t.title+' '+t.body).toLowerCase();
  _index.push({id:t.id,cat:t.cat,text:txt});
 }
 for(var j=0;j<GUIDE_TOPICS.length;j++){
  var tp=GUIDE_TOPICS[j];
  if(!tp.body)continue;
  var m=tp.body.match(/data-topic="([^"]+)"/g);
  if(m){
   for(var k=0;k<m.length;k++){
    var ref=m[k].replace('data-topic="','').replace('"','');
    if(!_crossRefs[tp.id])_crossRefs[tp.id]=[];
    _crossRefs[tp.id].push(ref);
   }
  }
 }
}

function _buildGuide(){
 if(_built)return;
 _buildIndex();
 _overlay=document.getElementById('guide-overlay');
 if(!_overlay)return;

 var html='<div class="guide-header">';
 html+='<div class="guide-title">GUIA DE VALDÓRIA</div>';
 html+='<div class="guide-ornament">✦ ✦ ✦</div>';
 html+='<div class="guide-search-wrap">';
 html+='<span class="guide-search-icon">🔍</span>';
 html+='<input class="guide-search-input" type="text" placeholder="Buscar no guia..." autocomplete="off" autocorrect="off" spellcheck="false">';
 html+='<button class="guide-search-clear">×</button>';
 html+='</div>';
 html+='<div class="guide-result-count"></div>';
 html+='<div class="guide-cat-filters">';
 if(window.GUIDE_CATEGORIES){
  var cats=Object.keys(GUIDE_CATEGORIES);
  for(var c=0;c<cats.length;c++){
   var key=cats[c],lbl=GUIDE_CATEGORIES[key];
   html+='<button class="guide-cat-pill'+(key==='todos'?' active':'')+'" data-cat="'+key+'">'+lbl+'</button>';
  }
 }
 html+='</div></div>';
 html+='<div class="guide-no-results"><span class="nr-icon">🔍</span>Nenhum resultado encontrado.</div>';
 html+='<div class="guide-topics">';
 if(window.GUIDE_TOPICS){
  for(var i=0;i<GUIDE_TOPICS.length;i++){
   var t=GUIDE_TOPICS[i];
   html+='<div class="guide-topic-card" data-id="'+t.id+'" data-cat="'+t.cat+'">';
   html+='<div class="guide-topic-header"><span class="guide-topic-name">'+t.icon+' '+t.title+'</span><span class="guide-topic-arrow">▶</span></div>';
   html+='<div class="guide-topic-body"><div class="guide-topic-body-inner"><div class="guide-topic-content">'+t.body;
   if(_crossRefs[t.id]&&_crossRefs[t.id].length>0){
    html+='<div class="guide-topic-related">Ver também: ';
    for(var r=0;r<_crossRefs[t.id].length;r++){
     var rid=_crossRefs[t.id][r],rt=_topicMap[rid];
     if(rt){
      if(r>0)html+=', ';
      html+='<a onclick="window._guideOpenTopic(\''+rid+'\')">'+rt.icon+' '+rt.title+'</a>';
     }
    }
    html+='</div>';
   }
   html+='</div></div></div></div>';
  }
 }
 html+='</div>';
 html+='<button class="guide-close-btn">Fechar</button>';
 _overlay.innerHTML=html;

 var searchInput=_overlay.querySelector('.guide-search-input');
 var searchClear=_overlay.querySelector('.guide-search-clear');
 var closeBtn=_overlay.querySelector('.guide-close-btn');
 var pills=_overlay.querySelectorAll('.guide-cat-pill');
 var cards=_overlay.querySelectorAll('.guide-topic-card');

 for(var ci=0;ci<cards.length;ci++){
  var card=cards[ci];
  _cardRefs[card.getAttribute('data-id')]=card;
  (function(c){
   c.querySelector('.guide-topic-header').addEventListener('click',function(){_toggleCard(c,c.getAttribute('data-id'));});
  })(card);
 }
 for(var pi=0;pi<pills.length;pi++){
  (function(p){
   p.addEventListener('click',function(){_selectCategory(p.getAttribute('data-cat'));});
  })(pills[pi]);
 }
 searchInput.addEventListener('input',function(){
  clearTimeout(_debounceTimer);
  _debounceTimer=setTimeout(function(){_onSearch();},200);
  var cl=searchClear;
  if(searchInput.value.length>0)cl.classList.add('visible');else cl.classList.remove('visible');
 });
 searchClear.addEventListener('click',function(){_clearSearch();});
 closeBtn.addEventListener('click',function(){window.hideGuidePopup();});
 _built=true;
}

function _selectCategory(cat){
 _activeCat=cat;
 var pills=_overlay.querySelectorAll('.guide-cat-pill');
 for(var i=0;i<pills.length;i++){
  if(pills[i].getAttribute('data-cat')===cat)pills[i].classList.add('active');
  else pills[i].classList.remove('active');
 }
 _filterTopics();
}

function _toggleCard(card,topicId){
 if(card.classList.contains('open')){
  card.classList.remove('open');
  if(_openCardId===topicId)_openCardId=null;
 }else{
  if(_openCardId&&_cardRefs[_openCardId]){
   _cardRefs[_openCardId].classList.remove('open');
  }
  card.classList.add('open');
  _openCardId=topicId;
  setTimeout(function(){card.scrollIntoView({behavior:'smooth',block:'nearest'});},280);
 }
}

function _onSearch(){
 var input=_overlay.querySelector('.guide-search-input');
 _searchTerm=input.value.trim().toLowerCase();
 if(_searchTerm.length>0){
  _searchWords=_searchTerm.split(/\s+/).filter(function(w){return w.length>1;});
  if(_priorCat===null)_priorCat=_activeCat;
  _activeCat='todos';
  var pills=_overlay.querySelectorAll('.guide-cat-pill');
  for(var i=0;i<pills.length;i++){
   if(pills[i].getAttribute('data-cat')==='todos')pills[i].classList.add('active');
   else pills[i].classList.remove('active');
  }
 }else{
  _searchWords=[];
  if(_priorCat!==null){_activeCat=_priorCat;_priorCat=null;}
  var pills2=_overlay.querySelectorAll('.guide-cat-pill');
  for(var j=0;j<pills2.length;j++){
   if(pills2[j].getAttribute('data-cat')===_activeCat)pills2[j].classList.add('active');
   else pills2[j].classList.remove('active');
  }
 }
 _filterTopics();
}

function _clearSearch(){
 var input=_overlay.querySelector('.guide-search-input');
 var clear=_overlay.querySelector('.guide-search-clear');
 input.value='';
 clear.classList.remove('visible');
 _searchTerm='';_searchWords=[];
 if(_priorCat!==null){_activeCat=_priorCat;_priorCat=null;}
 var pills=_overlay.querySelectorAll('.guide-cat-pill');
 for(var i=0;i<pills.length;i++){
  if(pills[i].getAttribute('data-cat')===_activeCat)pills[i].classList.add('active');
  else pills[i].classList.remove('active');
 }
 _filterTopics();
}

function _filterTopics(){
 var matchCount=0,totalVisible=0;
 var noResults=_overlay.querySelector('.guide-no-results');
 var resultCount=_overlay.querySelector('.guide-result-count');
 for(var i=0;i<_index.length;i++){
  var entry=_index[i];
  var card=_cardRefs[entry.id];
  if(!card)continue;
  var catMatch=(_activeCat==='todos'||entry.cat===_activeCat);
  var searchMatch=true;
  if(_searchWords.length>0){
   for(var w=0;w<_searchWords.length;w++){
    if(entry.text.indexOf(_searchWords[w])===-1){searchMatch=false;break;}
   }
  }
  if(catMatch&&searchMatch){
   card.classList.remove('hidden');
   totalVisible++;
   if(_searchWords.length>0){
    matchCount++;
    card.classList.add('search-match');
    var content=card.querySelector('.guide-topic-content');
    var t=_topicMap[entry.id];
    if(t)content.innerHTML=_highlightText(t.body,_searchWords);
   }else{
    card.classList.remove('search-match');
    var content2=card.querySelector('.guide-topic-content');
    var t2=_topicMap[entry.id];
    if(t2)content2.innerHTML=t2.body;
   }
  }else{
   card.classList.add('hidden');
   card.classList.remove('search-match');
  }
 }
 if(_searchWords.length>0&&matchCount>0){
  resultCount.textContent=matchCount+' resultado'+(matchCount>1?'s':'');
  resultCount.classList.add('visible');
 }else{
  resultCount.classList.remove('visible');
 }
 if(totalVisible===0){noResults.classList.add('visible');}
 else{noResults.classList.remove('visible');}
}

function _highlightText(html,words){
 var result=html;
 for(var i=0;i<words.length;i++){
  var w=words[i].replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  var re=new RegExp('('+w+')','gi');
  result=result.replace(re,'<mark class="search-hl">$1</mark>');
 }
 return result;
}

function _openAndScrollTo(topicId){
 var card=_cardRefs[topicId];
 if(!card)return;
 if(card.classList.contains('hidden')){_selectCategory('todos');}
 if(_openCardId&&_cardRefs[_openCardId])_cardRefs[_openCardId].classList.remove('open');
 card.classList.add('open');
 _openCardId=topicId;
 setTimeout(function(){card.scrollIntoView({behavior:'smooth',block:'start'});},100);
}

function _findTopicForCtx(ctx){
 if(!ctx)return null;
 var map={
  'city':'cidade_hub','combat':'combate','explore':'exploracao',
  'inventory':'inventario','quest':'missoes','character':'personagem',
  'market':'mercado','navigate':'mapa','status':'atributos',
  'skills':'habilidades','rest':'descanso','arena':'arena',
  'crafting':'forja','levelup':'nivel','social':'social',
  'prologue':'prologo','tavern':'taverna','temple':'templo',
  'guild':'guilda','general':'cidade_hub'
 };
 return map[ctx]||null;
}

window.showGuidePopup=function(ctx){
 _buildGuide();
 if(!_overlay)return;
 var bp=document.getElementById('bottom-panel');
 var it=document.getElementById('immersive-toggle');
 var ir=document.getElementById('immersive-restore');
 if(bp)bp.style.display='none';
 if(it)it.style.display='none';
 if(ir)ir.style.display='none';
 _overlay.classList.add('active');
 _overlay.style.display='flex';
 requestAnimationFrame(function(){_overlay.style.opacity='1';});
 if(ctx){
  var tid=_findTopicForCtx(ctx);
  if(tid)setTimeout(function(){_openAndScrollTo(tid);},300);
 }

};

window.hideGuidePopup=function(){
 if(!_overlay)return;
 _overlay.style.opacity='0';
 _overlay.classList.add('hiding');
 setTimeout(function(){
  _overlay.classList.remove('active','hiding');
  _overlay.style.display='none';
  var bp=document.getElementById('bottom-panel');
  var it=document.getElementById('immersive-toggle');
  var ir=document.getElementById('immersive-restore');
  if(bp)bp.style.display='';
  if(it)it.style.display='';
  if(ir)ir.style.display='';
 },220);

};

window.isGuidePopupOpen=function(){
 return _overlay&&_overlay.classList.contains('active');
};

window._guideOpenTopic=function(tid){
 _openAndScrollTo(tid);
};
if(typeof vEscapeKey!=='undefined'){vEscapeKey.register(function(){return typeof window.isGuidePopupOpen==='function'&&window.isGuidePopupOpen();},function(){if(typeof window.hideGuidePopup==='function')window.hideGuidePopup();});}
})();