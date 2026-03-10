// BUILD-ONLY: Epic map decorations for pre-rendered static image
// Too expensive for phone runtime but FREE in a pre-rendered image.


function renderOceanWaves(svg) {
    var wG = _el('g', { class: 'ocean-waves', 'pointer-events': 'none' });
    for (var ring = 0; ring < 4; ring++) {
        var offset = 8 + ring * 12, opacity = 0.12 - ring * 0.02;
        var pts = LANDMASS_POINTS;
        var cx = pts.reduce(function(s,p){return s+p[0];},0)/pts.length;
        var cy = pts.reduce(function(s,p){return s+p[1];},0)/pts.length;
        var waveD = '';
        for (var i = 0; i < pts.length; i++) {
            var px=pts[i][0],py=pts[i][1],dx=px-cx,dy=py-cy;
            var len=Math.sqrt(dx*dx+dy*dy)||1;
            var ox=px+(dx/len)*offset,oy=py+(dy/len)*offset;
            var wobX=(srand(i*47+ring*200)-0.5)*6,wobY=(srand(i*53+ring*200)-0.5)*6;
            if(i===0) waveD='M'+(ox+wobX)+','+(oy+wobY);
            else {
                var ppx=pts[i-1][0],ppy=pts[i-1][1],pdx=ppx-cx,pdy=ppy-cy;
                var plen=Math.sqrt(pdx*pdx+pdy*pdy)||1;
                var pox=ppx+(pdx/plen)*offset,poy=ppy+(pdy/plen)*offset;
                waveD+=' Q'+((pox+ox)/2+wobX)+','+((poy+oy)/2+wobY)+' '+(ox+wobX)+','+(oy+wobY);
            }
        }
        waveD += ' Z';
        wG.appendChild(_el('path',{d:waveD,fill:'none',stroke:INK,'stroke-width':0.4-ring*0.05,'stroke-opacity':opacity,'stroke-dasharray':ring%2===0?'none':'3 4'}));
    }
    for(var i=0;i<60;i++){var wx=20+srand(i*71)*(SVG_W-40),wy=20+srand(i*73+1)*(SVG_H-40);if(_pointInLandmass(wx,wy))continue;var wLen=4+srand(i*73+2)*8,wAmp=1+srand(i*73+3)*2;wG.appendChild(_el('path',{d:'M'+(wx-wLen)+','+wy+'Q'+wx+','+(wy-wAmp)+' '+(wx+wLen)+','+wy,fill:'none',stroke:INK,'stroke-width':0.3,'stroke-opacity':0.06+srand(i*73+4)*0.06}));}
    svg.appendChild(wG);
}

function renderTitleCartouche(svg) {
    var cG=_el('g',{class:'title-cartouche','pointer-events':'none'});
    var tx=SVG_W/2,ty=55,fw=180,fh=36;
    var ribbonD='M'+(tx-fw)+','+(ty-fh/2+4)+' Q'+(tx-fw-12)+','+(ty-fh/2-2)+' '+(tx-fw-8)+','+(ty+fh/2+2)+' L'+(tx-fw+10)+','+(ty+fh/2-2)+' L'+(tx+fw-10)+','+(ty+fh/2-2)+' Q'+(tx+fw+12)+','+(ty+fh/2+2)+' '+(tx+fw)+','+(ty-fh/2+4)+' Q'+(tx+fw+8)+','+(ty-fh/2-6)+' '+(tx+fw-10)+','+(ty-fh/2)+' L'+(tx-fw+10)+','+(ty-fh/2)+' Q'+(tx-fw-8)+','+(ty-fh/2-6)+' '+(tx-fw)+','+(ty-fh/2+4)+' Z';
    cG.appendChild(_el('path',{d:ribbonD,fill:PARCHMENT,'fill-opacity':0.7,stroke:'none'}));
    cG.appendChild(_el('path',{d:ribbonD,fill:'none',stroke:INK_DARK,'stroke-width':1.2,'stroke-opacity':0.5}));
    var innerD='M'+(tx-fw+14)+','+(ty-fh/2+4)+'L'+(tx+fw-14)+','+(ty-fh/2+4)+'L'+(tx+fw-14)+','+(ty+fh/2-6)+'L'+(tx-fw+14)+','+(ty+fh/2-6)+'Z';
    cG.appendChild(_el('path',{d:innerD,fill:'none',stroke:INK,'stroke-width':0.4,'stroke-opacity':0.3}));
    [-1,1].forEach(function(side){var sx=tx+side*fw;cG.appendChild(_el('path',{d:'M'+(sx+side*2)+','+(ty-10)+'Q'+(sx+side*15)+','+ty+' '+(sx+side*2)+','+(ty+10),fill:'none',stroke:INK_DARK,'stroke-width':0.6,'stroke-opacity':0.3}));});
    var title=_el('text',{x:tx,y:ty+3,'text-anchor':'middle','font-size':'16px','font-family':'Cinzel Decorative, Cinzel, serif','font-weight':'700',fill:INK_DARK,'fill-opacity':0.7,'letter-spacing':'3px'});
    title.textContent='TERRAS DE VALDORIA';cG.appendChild(title);svg.appendChild(cG);
}

function renderBorderOrnaments(svg) {
    var oG=_el('g',{class:'border-ornaments','pointer-events':'none'});var m=10;
    [{x:m,y:m,sx:1,sy:1},{x:SVG_W-m,y:m,sx:-1,sy:1},{x:m,y:SVG_H-m,sx:1,sy:-1},{x:SVG_W-m,y:SVG_H-m,sx:-1,sy:-1}].forEach(function(c){
        var g=_el('g',{transform:'translate('+c.x+','+c.y+') scale('+c.sx+','+c.sy+')'});
        g.appendChild(_el('path',{d:'M0,0 L35,0 Q30,5 25,3 Q18,8 12,5 Q8,10 5,8 Q3,15 0,12 Z',fill:INK_DARK,'fill-opacity':0.06,stroke:INK_DARK,'stroke-width':0.6,'stroke-opacity':0.25}));
        g.appendChild(_el('path',{d:'M3,3 Q8,0 10,5 Q12,10 8,12 Q4,14 3,10',fill:'none',stroke:INK_DARK,'stroke-width':0.5,'stroke-opacity':0.2}));
        g.appendChild(_el('circle',{cx:5,cy:5,r:1.2,fill:INK_DARK,'fill-opacity':0.15}));oG.appendChild(g);});
    [{x:SVG_W/2,y:6,rot:0},{x:SVG_W/2,y:SVG_H-6,rot:180},{x:6,y:SVG_H/2,rot:270},{x:SVG_W-6,y:SVG_H/2,rot:90}].forEach(function(mp){
        var mg=_el('g',{transform:'translate('+mp.x+','+mp.y+') rotate('+mp.rot+')'});
        mg.appendChild(_el('path',{d:'M0,-6 L4,0 L0,6 L-4,0 Z',fill:INK_DARK,'fill-opacity':0.08,stroke:INK_DARK,'stroke-width':0.5,'stroke-opacity':0.2}));
        mg.appendChild(_el('circle',{cx:-7,cy:0,r:0.8,fill:INK_DARK,'fill-opacity':0.12}));
        mg.appendChild(_el('circle',{cx:7,cy:0,r:0.8,fill:INK_DARK,'fill-opacity':0.12}));oG.appendChild(mg);});
    svg.appendChild(oG);
}

function renderScaleBar(svg) {
    var sG=_el('g',{class:'scale-bar','pointer-events':'none'});var bx=SVG_W-160,by=SVG_H-40,barW=80,barH=4;
    for(var i=0;i<4;i++){var segW=barW/4;sG.appendChild(_el('rect',{x:bx+i*segW,y:by,width:segW,height:barH,fill:i%2===0?INK_DARK:'none','fill-opacity':0.3,stroke:INK_DARK,'stroke-width':0.5,'stroke-opacity':0.35}));}
    for(var i=0;i<=4;i++){sG.appendChild(_el('line',{x1:bx+(i/4)*barW,y1:by-2,x2:bx+(i/4)*barW,y2:by+barH+2,stroke:INK_DARK,'stroke-width':0.6,'stroke-opacity':0.35}));}
    [{text:'0',x:bx},{text:'50',x:bx+barW/2},{text:'100 leguas',x:bx+barW}].forEach(function(l){var t=_el('text',{x:l.x,y:by-4,'text-anchor':'middle','font-size':'7px','font-family':'Cinzel, serif',fill:INK_DARK,'fill-opacity':0.4});t.textContent=l.text;sG.appendChild(t);});
    svg.appendChild(sG);
}

function renderSeaCreatures(svg) {
    var cG=_el('g',{class:'sea-creatures','pointer-events':'none'});
    _drawWhaleEpic(cG,55,95);_drawKrakenTentacle(cG,40,SVG_H-70);_drawFishSchool(cG,SVG_W/2+80,22);
    _drawSeaTurtle(cG,SVG_W-45,SVG_H/2+30);_drawJellyfish(cG,30,SVG_H/2-60);
    _drawSailingShip(cG,SVG_W-65,80);_drawSmallBoat(cG,SVG_W/2-100,SVG_H-35);svg.appendChild(cG);
}
function _drawWhaleEpic(g,x,y){var wg=_el('g',{opacity:0.12});wg.appendChild(_el('path',{d:'M'+x+','+y+' C'+(x+8)+','+(y-8)+' '+(x+22)+','+(y-10)+' '+(x+30)+','+(y-4)+' C'+(x+36)+','+y+' '+(x+32)+','+(y+6)+' '+(x+24)+','+(y+8)+' C'+(x+16)+','+(y+10)+' '+(x+6)+','+(y+6)+' '+x+','+y,fill:INK_DARK,'fill-opacity':0.4,stroke:INK,'stroke-width':1.2}));wg.appendChild(_el('path',{d:'M'+(x-2)+','+(y+1)+' C'+(x-8)+','+(y-6)+' '+(x-12)+','+(y-2)+' '+(x-10)+','+(y+2)+' C'+(x-12)+','+(y+6)+' '+(x-8)+','+(y+8)+' '+(x-2)+','+(y+1),fill:INK_DARK,'fill-opacity':0.3,stroke:INK,'stroke-width':0.8}));wg.appendChild(_el('path',{d:'M'+(x+20)+','+(y-8)+' Q'+(x+18)+','+(y-16)+' '+(x+22)+','+(y-18)+' M'+(x+20)+','+(y-8)+' Q'+(x+22)+','+(y-16)+' '+(x+18)+','+(y-18),fill:'none',stroke:INK,'stroke-width':0.6}));wg.appendChild(_el('circle',{cx:x+26,cy:y-2,r:1,fill:INK_DARK}));g.appendChild(wg);}
function _drawKrakenTentacle(g,x,y){var kg=_el('g',{opacity:0.1});['M'+x+','+y+' Q'+(x+15)+','+(y-8)+' '+(x+25)+','+(y-15)+' Q'+(x+30)+','+(y-20)+' '+(x+28)+','+(y-28),'M'+(x-5)+','+(y+5)+' Q'+(x+8)+','+y+' '+(x+18)+','+(y-5)+' Q'+(x+24)+','+(y-8)+' '+(x+20)+','+(y-14),'M'+(x+3)+','+(y+8)+' Q'+(x+12)+','+(y+5)+' '+(x+22)+','+(y+2)+' Q'+(x+28)+','+y+' '+(x+26)+','+(y-6)].forEach(function(d,i){kg.appendChild(_el('path',{d:d,fill:'none',stroke:INK,'stroke-width':2.5-i*0.5,'stroke-linecap':'round'}));for(var j=0;j<4;j++){var t=0.25+j*0.2;kg.appendChild(_el('circle',{cx:x+t*25+(srand(i*100+j*17)-0.5)*4,cy:y-t*15+i*5+(srand(i*100+j*23)-0.5)*3,r:0.8-j*0.1,fill:INK,'fill-opacity':0.5}));}});g.appendChild(kg);}
function _drawFishSchool(g,x,y){var fg=_el('g',{opacity:0.1});for(var i=0;i<6;i++){var fx=x+(srand(i*37)-0.5)*30,fy=y+(srand(i*41)-0.5)*12,sz=2.5+srand(i*43)*2,dir=srand(i*47)>0.5?1:-1;fg.appendChild(_el('path',{d:'M'+(fx-sz*dir)+','+fy+' Q'+fx+','+(fy-sz*0.4)+' '+(fx+sz*dir)+','+fy+' Q'+fx+','+(fy+sz*0.4)+' '+(fx-sz*dir)+','+fy,fill:INK,'fill-opacity':0.4,stroke:INK,'stroke-width':0.3}));fg.appendChild(_el('path',{d:'M'+(fx-sz*dir)+','+fy+'L'+(fx-sz*1.5*dir)+','+(fy-sz*0.3)+' M'+(fx-sz*dir)+','+fy+'L'+(fx-sz*1.5*dir)+','+(fy+sz*0.3),fill:'none',stroke:INK,'stroke-width':0.4}));fg.appendChild(_el('circle',{cx:fx+sz*0.4*dir,cy:fy-sz*0.1,r:0.4,fill:INK_DARK}));}g.appendChild(fg);}
function _drawSeaTurtle(g,x,y){var tg=_el('g',{opacity:0.1});tg.appendChild(_el('ellipse',{cx:x,cy:y,rx:8,ry:6,fill:INK,'fill-opacity':0.3,stroke:INK,'stroke-width':0.8}));for(var i=0;i<5;i++){var a=(i/5)*Math.PI*2;tg.appendChild(_el('line',{x1:x,y1:y,x2:x+Math.cos(a)*4,y2:y+Math.sin(a)*3,stroke:INK,'stroke-width':0.3,'stroke-opacity':0.4}));}tg.appendChild(_el('ellipse',{cx:x+9,cy:y-1,rx:3,ry:2,fill:INK,'fill-opacity':0.25,stroke:INK,'stroke-width':0.5}));[[-6,-5,-30],[-6,5,30],[5,-4,-50],[5,4,50]].forEach(function(f){tg.appendChild(_el('ellipse',{cx:x+f[0],cy:y+f[1],rx:4,ry:1.5,transform:'rotate('+f[2]+', '+(x+f[0])+', '+(y+f[1])+')',fill:INK,'fill-opacity':0.2,stroke:INK,'stroke-width':0.3}));});g.appendChild(tg);}
function _drawJellyfish(g,x,y){var jg=_el('g',{opacity:0.09});jg.appendChild(_el('path',{d:'M'+(x-7)+','+y+' Q'+(x-7)+','+(y-10)+' '+x+','+(y-12)+' Q'+(x+7)+','+(y-10)+' '+(x+7)+','+y+' Z',fill:INK,'fill-opacity':0.25,stroke:INK,'stroke-width':0.6}));for(var i=0;i<5;i++){var tx=x-5+i*2.5;jg.appendChild(_el('path',{d:'M'+tx+','+y+' Q'+(tx+(srand(i*37)-0.5)*4)+','+(y+8)+' '+(tx+(srand(i*41)-0.5)*6)+','+(y+16),fill:'none',stroke:INK,'stroke-width':0.4,'stroke-linecap':'round'}));}g.appendChild(jg);}
function _drawSailingShip(g,x,y){var sg=_el('g',{opacity:0.12});sg.appendChild(_el('path',{d:'M'+(x-14)+','+(y+2)+' L'+(x-10)+','+(y+6)+' L'+(x+10)+','+(y+6)+' L'+(x+14)+','+(y+2),fill:INK,'fill-opacity':0.2,stroke:INK,'stroke-width':0.8}));sg.appendChild(_el('line',{x1:x,y1:y+4,x2:x,y2:y-16,stroke:INK,'stroke-width':0.8}));sg.appendChild(_el('path',{d:'M'+x+','+(y-14)+' Q'+(x+10)+','+(y-8)+' '+x+','+(y-2),fill:INK,'fill-opacity':0.15,stroke:INK,'stroke-width':0.5}));sg.appendChild(_el('path',{d:'M'+x+','+(y-12)+' Q'+(x-7)+','+(y-7)+' '+x+','+(y-2),fill:INK,'fill-opacity':0.1,stroke:INK,'stroke-width':0.4}));sg.appendChild(_el('path',{d:'M'+x+','+(y-16)+' L'+(x+5)+','+(y-14)+' L'+x+','+(y-12),fill:INK,'fill-opacity':0.3,stroke:'none'}));sg.appendChild(_el('path',{d:'M'+(x-18)+','+(y+6)+' Q'+(x-8)+','+(y+4)+' '+x+','+(y+6)+' Q'+(x+8)+','+(y+8)+' '+(x+18)+','+(y+6),fill:'none',stroke:INK,'stroke-width':0.4,'stroke-opacity':0.6}));g.appendChild(sg);}
function _drawSmallBoat(g,x,y){var bg=_el('g',{opacity:0.1});bg.appendChild(_el('path',{d:'M'+(x-8)+','+y+' L'+(x-6)+','+(y+3)+' L'+(x+6)+','+(y+3)+' L'+(x+8)+','+y,fill:INK,'fill-opacity':0.2,stroke:INK,'stroke-width':0.6}));bg.appendChild(_el('line',{x1:x,y1:y+2,x2:x,y2:y-8,stroke:INK,'stroke-width':0.6}));bg.appendChild(_el('path',{d:'M'+x+','+(y-7)+' Q'+(x+5)+','+(y-4)+' '+x+','+(y-1),fill:INK,'fill-opacity':0.12,stroke:INK,'stroke-width':0.3}));g.appendChild(bg);}

function renderExtraRivers(svg) {
    var rG=_el('g',{class:'extra-rivers','pointer-events':'none','clip-path':'url(#land-clip)'});
    var rivers=[{pts:[[180,140],[195,180],[210,220],[220,255]],w:0.8},{pts:[[520,150],[510,200],[505,250],[510,290]],w:0.9},{pts:[[280,400],[310,430],[350,450],[380,440]],w:0.7},{pts:[[420,350],[430,370],[435,395]],w:0.5},{pts:[[350,80],[340,120],[330,155]],w:0.6}];
    for(var ri=0;ri<rivers.length;ri++){var river=rivers[ri],p=river.pts;var d='M'+p[0][0]+','+p[0][1];for(var i=1;i<p.length;i++){d+=' Q'+((p[i-1][0]+p[i][0])/2+(srand(i*43+p[0][0])-0.5)*6)+','+((p[i-1][1]+p[i][1])/2+(srand(i*47+p[0][1])-0.5)*5)+' '+p[i][0]+','+p[i][1];}rG.appendChild(_el('path',{d:d,fill:'none',stroke:INK,'stroke-width':river.w*0.5,'stroke-opacity':0.3,'stroke-linecap':'round'}));for(var si=0;si<2;si++){var side=si===0?-1:1,dSide='';for(var i2=0;i2<p.length;i2++){var prev=i2>0?p[i2-1]:p[0],curr=p[i2];var dx=i2<p.length-1?p[i2+1][0]-curr[0]:curr[0]-prev[0],dy=i2<p.length-1?p[i2+1][1]-curr[1]:curr[1]-prev[1];var len=Math.sqrt(dx*dx+dy*dy)||1,nx=-dy/len*side*1.2,ny=dx/len*side*1.2;if(i2===0)dSide='M'+(curr[0]+nx)+','+(curr[1]+ny);else dSide+=' Q'+((prev[0]+curr[0])/2+nx+(srand(i2*37+p[0][0]+side*200)-0.5)*4)+','+((prev[1]+curr[1])/2+ny+(srand(i2*41+p[0][1]+side*200)-0.5)*3)+' '+(curr[0]+nx)+','+(curr[1]+ny);}rG.appendChild(_el('path',{d:dSide,fill:'none',stroke:INK,'stroke-width':0.25,'stroke-opacity':0.18,'stroke-linecap':'round'}));}}
    svg.appendChild(rG);
}

function renderLakes(svg) {
    var lG=_el('g',{class:'lakes','pointer-events':'none','clip-path':'url(#land-clip)'});
    [{x:260,y:290,rx:18,ry:12,seed:100},{x:480,y:420,rx:12,ry:8,seed:200},{x:160,y:380,rx:14,ry:10,seed:300}].forEach(function(lake){
        var lakeD=_organicBlob(lake.x,lake.y,lake.rx,lake.ry,lake.seed,10);
        lG.appendChild(_el('path',{d:lakeD,fill:INK_DARK,'fill-opacity':0.06,stroke:INK,'stroke-width':0.5,'stroke-opacity':0.25}));
        for(var r=0;r<3;r++){var rw=lake.rx*(0.3+r*0.2),ry2=lake.y+(r-1)*3;lG.appendChild(_el('path',{d:'M'+(lake.x-rw)+','+ry2+'Q'+lake.x+','+(ry2-1.5)+' '+(lake.x+rw)+','+ry2,fill:'none',stroke:INK,'stroke-width':0.3,'stroke-opacity':0.15}));}
        for(var i=0;i<12;i++){var a=(i/12)*Math.PI*2,sx=lake.x+Math.cos(a)*(lake.rx+3+srand(lake.seed+i*13)*4),sy=lake.y+Math.sin(a)*(lake.ry+3+srand(lake.seed+i*17)*3);if(!_pointInLandmass(sx,sy))continue;lG.appendChild(_el('circle',{cx:sx,cy:sy,r:0.3+srand(lake.seed+i*19)*0.3,fill:INK,'fill-opacity':0.12}));}});
    svg.appendChild(lG);
}

function renderRegionNames(svg) {
    var tG=_el('g',{class:'region-names','pointer-events':'none','clip-path':'url(#land-clip)'});
    [{text:'Floresta dos Sussurros',x:210,y:210,size:9,rot:-5,op:0.18},{text:'Picos de Pedra',x:530,y:190,size:8,rot:12,op:0.16},{text:'Pantanos Nebulosos',x:170,y:340,size:8,rot:-3,op:0.15},{text:'Areias Douradas',x:400,y:380,size:8,rot:7,op:0.16},{text:'Campos Verdes',x:340,y:150,size:8,rot:2,op:0.14},{text:'Deserto Profundo',x:450,y:320,size:7,rot:-8,op:0.14},{text:'Vale Congelado',x:280,y:520,size:8,rot:4,op:0.15},{text:'Cratera Ardente',x:560,y:500,size:7,rot:-6,op:0.14}].forEach(function(r){
        var t=_el('text',{x:r.x,y:r.y,'text-anchor':'middle','font-size':r.size+'px','font-family':'Cinzel, serif','font-style':'italic',fill:INK,'fill-opacity':r.op,'letter-spacing':'1.5px',transform:'rotate('+r.rot+', '+r.x+', '+r.y+')'});
        t.textContent=r.text;tG.appendChild(t);});
    svg.appendChild(tG);
}

function renderCrossHatching(svg) {
    var hG=_el('g',{class:'cross-hatching','pointer-events':'none','clip-path':'url(#land-clip)'});
    var allHexes=_getAllHexes(),hatchD='';
    for(var hi=0;hi<allHexes.length;hi++){var col=allHexes[hi][0],row=allHexes[hi][1],biome=allHexes[hi][2];if(biome!=='mountain'&&biome!=='cave'&&biome!=='volcanic')continue;var pos=hexToPixel(col,row);if(!_pointInLandmass(pos.x,pos.y))continue;var seed=col*137+row*89;if(srand(seed)>0.4)continue;var density=biome==='cave'?5:biome==='volcanic'?4:3;for(var i=0;i<density;i++){var hx=pos.x+(srand(seed+i*11)-0.5)*HEX_W*0.8,hy=pos.y+(srand(seed+i*13)-0.5)*ROW_H*0.8,hLen=3+srand(seed+i*17)*5,angle=45+(srand(seed+i*19)-0.5)*30,rad=angle*Math.PI/180;hatchD+='M'+hx+','+hy+'L'+(hx+Math.cos(rad)*hLen)+','+(hy+Math.sin(rad)*hLen);}}
    if(hatchD)hG.appendChild(_el('path',{d:hatchD,fill:'none',stroke:INK_DARK,'stroke-width':0.25,'stroke-opacity':0.1}));
    svg.appendChild(hG);
}

function renderScatteredRocks(svg) {
    var rG=_el('g',{class:'scattered-rocks','pointer-events':'none','clip-path':'url(#land-clip)'}),rockD='',shadowD='';
    for(var i=0;i<25;i++){var rx=40+srand(i*97)*(SVG_W-80),ry=40+srand(i*101)*(SVG_H-80);if(!_pointInLandmass(rx,ry))continue;var seed=i*1000,count=1+Math.floor(srand(seed)*3);for(var j=0;j<count;j++){var bx=rx+(srand(seed+j*7)-0.5)*10,by=ry+(srand(seed+j*11)-0.5)*6,bsz=1.5+srand(seed+j*13)*2;rockD+=_organicBlob(bx,by,bsz,bsz*0.7,seed+j*100,5);shadowD+='M'+(bx+bsz*0.3)+','+(by+bsz*0.5)+'a'+(bsz*0.4)+','+(bsz*0.2)+' 0 1,0 '+(bsz*0.6)+',0';}}
    if(rockD)rG.appendChild(_el('path',{d:rockD,fill:INK_DARK,'fill-opacity':0.06,stroke:INK_DARK,'stroke-width':0.25,'stroke-opacity':0.15}));
    if(shadowD)rG.appendChild(_el('path',{d:shadowD,fill:INK_DARK,'fill-opacity':0.08,stroke:'none'}));svg.appendChild(rG);
}

function renderWindLines(svg) {
    var wG=_el('g',{class:'wind-lines','pointer-events':'none','clip-path':'url(#land-clip)'}),windD='';
    for(var i=0;i<30;i++){var wx=50+srand(i*67)*(SVG_W-100),wy=50+srand(i*71)*(SVG_H-100);if(!_pointInLandmass(wx,wy))continue;var wLen=15+srand(i*73)*25,wAmp=(srand(i*79)-0.5)*3;windD+='M'+wx+','+wy+'Q'+(wx+wLen*0.5)+','+(wy+wAmp)+' '+(wx+wLen)+','+(wy+wAmp*0.3);}
    if(windD)wG.appendChild(_el('path',{d:windD,fill:'none',stroke:INK_LIGHT,'stroke-width':0.2,'stroke-opacity':0.08,'stroke-dasharray':'6 4'}));svg.appendChild(wG);
}

function renderEdgeStippling(svg) {
    var sG=_el('g',{class:'edge-stipple','pointer-events':'none','clip-path':'url(#land-clip)'}),stippleD='';
    for(var i=0;i<LANDMASS_POINTS.length;i++){var px=LANDMASS_POINTS[i][0],py=LANDMASS_POINTS[i][1],count=3+Math.floor(srand(i*67)*3);for(var j=0;j<count;j++){var sx=px+(srand(i*67+j*11)-0.5)*20,sy=py+(srand(i*67+j*13)-0.5)*20;if(!_pointInLandmass(sx,sy))continue;var r=0.3+srand(i*67+j*17)*0.5;stippleD+='M'+(sx-r)+','+sy+'a'+r+','+r+' 0 1,0 '+(r*2)+',0a'+r+','+r+' 0 1,0 '+(-r*2)+',0';}}
    if(stippleD)sG.appendChild(_el('path',{d:stippleD,fill:INK,'fill-opacity':0.06,stroke:'none'}));svg.appendChild(sG);
}

function renderLatLongGrid(svg) {
    var gG=_el('g',{class:'lat-long-grid','pointer-events':'none'});
    for(var y=100;y<SVG_H-50;y+=120){var d='M30,'+y;for(var x=60;x<SVG_W-30;x+=20)d+=' L'+x+','+(y+(srand(x*7+y*3)-0.5)*1.5);gG.appendChild(_el('path',{d:d,fill:'none',stroke:INK,'stroke-width':0.15,'stroke-opacity':0.05,'stroke-dasharray':'8 12'}));}
    for(var x=120;x<SVG_W-50;x+=130){var d='M'+x+',30';for(var y=60;y<SVG_H-30;y+=20)d+=' L'+(x+(srand(x*3+y*7)-0.5)*1.5)+','+y;gG.appendChild(_el('path',{d:d,fill:'none',stroke:INK,'stroke-width':0.15,'stroke-opacity':0.05,'stroke-dasharray':'8 12'}));}
    svg.appendChild(gG);
}

function renderExtraParchmentTexture(svg) {
    var tG=_el('g',{class:'extra-texture','pointer-events':'none','clip-path':'url(#land-clip)'});
    [{x:180,y:250,r:35,op:0.03},{x:480,y:380,r:28,op:0.025},{x:350,y:550,r:32,op:0.02},{x:100,y:450,r:25,op:0.025},{x:580,y:150,r:22,op:0.02}].forEach(function(s){tG.appendChild(_el('circle',{cx:s.x,cy:s.y,r:s.r,fill:INK,'fill-opacity':s.op,stroke:INK,'stroke-width':0.3,'stroke-opacity':s.op*2}));});
    ['M80,100 L'+(SVG_W-120)+','+(SVG_H-80),'M'+(SVG_W-100)+',120 L100,'+(SVG_H-100),'M'+(SVG_W/2-50)+',40 L'+(SVG_W/2+30)+','+(SVG_H-40)].forEach(function(d){tG.appendChild(_el('path',{d:d,fill:'none',stroke:INK_LIGHT,'stroke-width':0.3,'stroke-opacity':0.04}));});
    var spotsD='';for(var i=0;i<15;i++){var sx=50+srand(i*113)*(SVG_W-100),sy=50+srand(i*127)*(SVG_H-100);if(!_pointInLandmass(sx,sy))continue;var r=1+srand(i*131)*2;spotsD+=_organicBlob(sx,sy,r,r*0.8,i*500,5);}
    if(spotsD)tG.appendChild(_el('path',{d:spotsD,fill:INK_DARK,'fill-opacity':0.04,stroke:'none'}));svg.appendChild(tG);
}

function renderEpicExtras(svg) {
    renderLatLongGrid(svg);renderOceanWaves(svg);renderEdgeStippling(svg);
    renderExtraRivers(svg);renderLakes(svg);renderCrossHatching(svg);
    renderScatteredRocks(svg);renderWindLines(svg);renderExtraParchmentTexture(svg);
    renderSeaCreatures(svg);renderRegionNames(svg);renderTitleCartouche(svg);
    renderBorderOrnaments(svg);renderScaleBar(svg);
}
