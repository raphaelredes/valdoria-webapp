// fetch-utils.js — wrappers de fetch com timeout, retry e detecção de maintenance.
// Maintenance detection é via vMaintenance (carregado por maintenance-overlay.js).
async function fetchT(url,opts={},timeoutMs=15000){if(!navigator.onLine)throw new Error('Sem conexão com a internet.');const ac=new AbortController();const tid=setTimeout(()=>ac.abort(),timeoutMs);try{const r=await fetch(url,{...opts,signal:ac.signal});clearTimeout(tid);return r;}catch(e){clearTimeout(tid);if(e.name==='AbortError')throw new Error('Tempo limite excedido ('+timeoutMs+'ms)');throw e;}}
function _isTransient(e,httpStatus){if(!httpStatus)return true;if(httpStatus===429||httpStatus>=500)return true;if(e&&e.message&&(e.message.includes('content_type_html_not_json')||e.message.includes('HTML ao inv')))return true;return false;}
function _checkMaintenancePayload(data){if(window.vMaintenance&&window.vMaintenance.checkResponse){return window.vMaintenance.checkResponse(data);}return false;}
async function fetchJSON(url,opts={},timeoutMs=15000){const r=await fetchT(url,opts,timeoutMs);
// 503 com maintenance JSON — trigger overlay e propaga erro pra abortar fluxo
if(r.status===503){try{const data=await r.clone().json();if(data&&data.maintenance&&(data.maintenance===true||data.maintenance.active)){_checkMaintenancePayload(data);throw new Error('maintenance_active');}}catch(e){if(e.message==='maintenance_active')throw e;}}
if(!r.ok)throw new Error('HTTP '+r.status);const text=await r.text();if(text.trimStart().startsWith('<')){throw new Error('content_type_html_not_json');}
let data;try{data=JSON.parse(text);}
catch(e){throw new Error('Resposta JSON inválida');}
// 200 com flag maintenance (caso especial /api/game/health) — trigger overlay
if(_checkMaintenancePayload(data)){throw new Error('maintenance_active');}
return data;}
async function fetchJSONRetry(url,opts={},retryCfg={}){const maxRetries=retryCfg.maxRetries||3;const timeoutMs=retryCfg.timeoutMs||15000;let lastErr;for(let attempt=0;attempt<=maxRetries;attempt++){try{return await fetchJSON(url,opts,timeoutMs);}catch(e){lastErr=e;
// NUNCA retry em maintenance — manda direto pra UI
if(e&&e.message==='maintenance_active')throw e;
const status=e.message&&e.message.match(/HTTP (\d+)/);const code=status?parseInt(status[1],10):0;if(attempt<maxRetries&&_isTransient(e,code)){const delay=Math.min(1000*Math.pow(2,attempt),8000);const jitter=Math.random()*500;await new Promise(r=>setTimeout(r,delay+jitter));continue;}
throw e;}}
throw lastErr;}
