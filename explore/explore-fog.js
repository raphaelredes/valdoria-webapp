var _fogCanvas=null;var _fogCtx=null;var _fogReveals=[];var _fogFadeTiles={};var FOG_COLOR=(function(){try{return getComputedStyle(document.documentElement).getPropertyValue('--v-bg').trim()||'#2a2420';}catch(e){return '#2a2420';}})();function _fogSrand(seed){let x=Math.sin(seed*9301+49297)*49297;return x-Math.floor(x);}
function hasFogFading(){return Object.keys(_fogFadeTiles).length>0;}
function initFog(width,height){_fogCanvas=document.createElement('canvas');_fogCanvas.width=width;_fogCanvas.height=height;_fogCtx=_fogCanvas.getContext('2d');}
function resizeFog(width,height){if(_fogCanvas){_fogCanvas.width=width;_fogCanvas.height=height;}}
function revealFogAt(cx,cy,radius,fogState,grid,animate){if(window._dbg)console.debug("[EXPLORE] revealFogAt",{center:[cx,cy],radius:radius,animate:!!animate});var _canFade=typeof _renderDetail!=='undefined'&&_renderDetail>=1;for(let r=0;r<ROWS;r++){for(let c=0;c<COLS;c++){const dist=hexDist(c,r,cx,cy);const key=`${c},${r}`;if(dist<=radius){var _prev=fogState[key];if(_prev!=='visible'){if(animate){const center=hexToScreen(c,r);_fogReveals.push({x:center.x,y:center.y,progress:0,maxRadius:HEX_W*0.6,});}
if(_canFade&&(_prev==='hidden'||_prev==='dim'||!_prev)){_fogFadeTiles[key]={start:performance.now(),duration:200};if(window._dbg)console.debug('[EXPLORE] fog fade start',{key:key,duration:200,active:Object.keys(_fogFadeTiles).length});}}
fogState[key]='visible';}else if(dist<=radius+1&&fogState[key]!=='visible'){fogState[key]='dim';}}}}
function updateFogAnimations(dt){if(_fogReveals.length===0)return false;for(let i=_fogReveals.length-1;i>=0;i--){_fogReveals[i].progress+=dt*1.4;if(_fogReveals[i].progress>=1){_fogReveals.splice(i,1);}}
return _fogReveals.length>0;}
/* ── Low-Res Upscale Fog (Riot Games / LoL technique) ──
 * 1. Tiny canvas (1px per hex) with alpha = fog opacity
 * 2. Upscale with bilinear smoothing → naturally smooth edges
 * 3. Tint with fog color via source-in compositing
 */
var _fogMaskCanvas=null;var _fogMaskCtx=null;
function drawFogOverlay(mainCtx,canvasW,canvasH,fogState){if(!_fogCtx)return;
var _visR=typeof getFogVisibilityRadius==='function'?getFogVisibilityRadius():3;
var _now=performance.now();var _fadeKeys=Object.keys(_fogFadeTiles);for(var _fi=_fadeKeys.length-1;_fi>=0;_fi--){var _fe=_fogFadeTiles[_fadeKeys[_fi]];if(_now-_fe.start>=_fe.duration)delete _fogFadeTiles[_fadeKeys[_fi]];}
/* Step 1: Tiny mask — 1 pixel per hex cell */
var mW=COLS+4,mH=ROWS+4;/* +4 for 2px border padding */
if(!_fogMaskCanvas||_fogMaskCanvas.width!==mW||_fogMaskCanvas.height!==mH){_fogMaskCanvas=document.createElement('canvas');_fogMaskCanvas.width=mW;_fogMaskCanvas.height=mH;_fogMaskCtx=_fogMaskCanvas.getContext('2d');}
var imgData=_fogMaskCtx.createImageData(mW,mH);var pC=S.playerCol,pR=S.playerRow;
/* Fill border padding with full fog */
for(var i=0;i<imgData.data.length;i+=4){imgData.data[i]=0;imgData.data[i+1]=0;imgData.data[i+2]=0;imgData.data[i+3]=255;}
/* Write per-tile visibility */
/* A3 (hexmap FRICÇÃO-6): dim vs hidden must be visually distinguishable.
 * Previous: dim=210, hidden=255 — only 45 alpha difference, barely visible.
 * New: dim=175 (memory of explored tile), hidden=255 (completely unknown).
 * The 80-point gap makes "already been here" tiles clearly distinct. */
for(var r=0;r<ROWS;r++){for(var c=0;c<COLS;c++){var key=c+','+r;var state=fogState[key];var dist=hexDist(c,r,pC,pR);var alpha;if(state==='visible'){if(dist===0)alpha=0;else if(dist===1)alpha=5;else if(dist===2)alpha=80;else if(dist<=_visR)alpha=140;else alpha=200;}else if(state==='dim'){alpha=175;}else{alpha=255;}
/* Apply fade-in animation */
var _fade=_fogFadeTiles[key];if(_fade){var _elapsed=_now-_fade.start;var _fp=Math.min(1,_elapsed/_fade.duration);alpha=Math.round(255-(255-alpha)*_fp);}
var idx=((r+2)*mW+(c+2))*4;/* +2 for border padding */
imgData.data[idx]=0;imgData.data[idx+1]=0;imgData.data[idx+2]=0;imgData.data[idx+3]=alpha;}}
_fogMaskCtx.putImageData(imgData,0,0);
/* Step 2: Upscale with bilinear smoothing onto fog canvas */
_fogCtx.setTransform(1,0,0,1,0,0);_fogCtx.clearRect(0,0,_fogCanvas.width,_fogCanvas.height);_fogCtx.scale(_dpr,_dpr);
_fogCtx.imageSmoothingEnabled=true;_fogCtx.imageSmoothingQuality='high';
/* Map mask pixels to hex grid screen positions */
var gridLeft=MAP_OFFSET_X-HEX_W*0.5;var gridTop=MAP_OFFSET_Y-HEX_H*0.5;var gridW=COLS*HEX_W+HEX_W;var gridH=ROWS*ROW_STEP+HEX_H;
/* Expand draw area to cover border padding */
var padX=2*gridW/COLS;var padY=2*gridH/ROWS;
_fogCtx.drawImage(_fogMaskCanvas,0,0,mW,mH,gridLeft-padX,gridTop-padY,gridW+padX*2,gridH+padY*2);
/* Step 3: Tint alpha mask with fog color */
_fogCtx.globalCompositeOperation='source-in';_fogCtx.fillStyle=FOG_COLOR;_fogCtx.fillRect(0,0,canvasW,canvasH);
/* Step 4: Fill edges outside the grid that the mask doesn't cover */
_fogCtx.globalCompositeOperation='source-over';_fogCtx.fillStyle=FOG_COLOR;
var edgeL=gridLeft-padX;var edgeT=gridTop-padY;var edgeR2=gridLeft+gridW+padX;var edgeB=gridTop+gridH+padY;
if(edgeL>0)_fogCtx.fillRect(0,0,edgeL,canvasH);if(edgeT>0)_fogCtx.fillRect(0,0,canvasW,edgeT);if(edgeR2<canvasW)_fogCtx.fillRect(edgeR2,0,canvasW-edgeR2,canvasH);if(edgeB<canvasH)_fogCtx.fillRect(0,edgeB,canvasW,canvasH-edgeB);
/* Step 5: Torch glow reveals (additive, destination-out on fog) */
var _fogRD=(typeof _renderDetail!=='undefined'?_renderDetail:(typeof _tileDetail!=='undefined'?_tileDetail:2));
if(typeof S!=='undefined'&&S.torches&&S.torches.length>0){_fogCtx.globalCompositeOperation='destination-out';var _torchTier=_fogRD;for(var ti=0;ti<S.torches.length;ti++){var torch=S.torches[ti];var tKey=torch.col+','+torch.row;if(fogState[tKey]!=='visible'&&fogState[tKey]!=='dim')continue;var tCenter=hexToScreen(torch.col,torch.row);var tRad=HEX_W*((torch.radius||2)*0.7+0.3);if(_torchTier>=1){var tGrad=_fogCtx.createRadialGradient(tCenter.x,tCenter.y,0,tCenter.x,tCenter.y,tRad);tGrad.addColorStop(0,'rgba(0,0,0,0.7)');tGrad.addColorStop(0.5,'rgba(0,0,0,0.3)');tGrad.addColorStop(1,'rgba(0,0,0,0)');_fogCtx.fillStyle=tGrad;}else{/* lite: flat circle approximation, no gradient */_fogCtx.fillStyle='rgba(0,0,0,0.4)';}_fogCtx.beginPath();_fogCtx.arc(tCenter.x,tCenter.y,tRad,0,Math.PI*2);_fogCtx.fill();}}
/* Composite onto main canvas */
_fogCtx.globalCompositeOperation='source-over';mainCtx.save();mainCtx.setTransform(1,0,0,1,0,0);mainCtx.drawImage(_fogCanvas,0,0);mainCtx.restore();}