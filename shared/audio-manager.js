const ValdoriaAudio=(()=>{'use strict';const STORAGE_KEY='valdoria_audio_muted';const VOLUME_KEY='valdoria_audio_volume';const MUSIC_MUTED_KEY='valdoria_audio_music_muted';const SFX_MUTED_KEY='valdoria_audio_sfx_muted';const SFX_VOLUME_KEY='valdoria_audio_sfx_volume';const CROSSFADE_MS=1200;const DEFAULT_VOLUME=0.15;const NO_LOOP_TRACKS=['victory','defeat','levelup','sfx_hit','sfx_crit','sfx_miss','sfx_fire','sfx_cold','sfx_lightning','sfx_thunder','sfx_poison','sfx_radiant','sfx_necrotic','sfx_psychic','sfx_heal','sfx_enemy_death'];const AUDIO_BASE=(function(){if(window.__spaRouteName)return'shared/audio/';return'../shared/audio/';})();const TRACKS={tavern:['tavern_ambient.mp3','tavern_ambient_2.mp3','tavern_ambient_3.mp3','tavern_ambient_4.mp3','tavern_ambient_5.mp3','tavern_ambient_6.mp3','tavern_ambient_7.mp3','tavern_ambient_8.mp3'],city:['city_day.mp3','city_day_2.mp3','city_day_3.mp3','city_day_4.mp3','city_day_5.mp3','city_day_6.mp3','city_day_7.mp3','city_day_8.mp3'],forest:['forest_explore.mp3','forest_explore_2.mp3','forest_explore_3.mp3','forest_explore_4.mp3','forest_explore_5.mp3','forest_explore_6.mp3','forest_explore_7.mp3','forest_explore_8.mp3'],combat:['combat_tense.mp3','combat_tense_2.mp3','combat_tense_3.mp3','combat_tense_4.mp3','combat_tense_5.mp3','combat_tense_6.mp3','combat_tense_7.mp3','combat_tense_8.mp3'],desert:['desert_wind.mp3','desert_wind_2.mp3','desert_wind_3.mp3','desert_wind_4.mp3','desert_wind_5.mp3','desert_wind_6.mp3','desert_wind_7.mp3','desert_wind_8.mp3'],dungeon:['dungeon_dark.mp3','dungeon_dark_2.mp3','dungeon_dark_3.mp3','dungeon_dark_4.mp3','dungeon_dark_5.mp3','dungeon_dark_6.mp3','dungeon_dark_7.mp3','dungeon_dark_8.mp3'],swamp:['swamp_mist.mp3','swamp_mist_2.mp3','swamp_mist_3.mp3','swamp_mist_4.mp3','swamp_mist_5.mp3','swamp_mist_6.mp3','swamp_mist_7.mp3','swamp_mist_8.mp3'],mountain:['mountain_wind.mp3','mountain_wind_2.mp3','mountain_wind_3.mp3','mountain_wind_4.mp3','mountain_wind_5.mp3','mountain_wind_6.mp3','mountain_wind_7.mp3','mountain_wind_8.mp3'],snow:['snow_silence.mp3','snow_silence_2.mp3','snow_silence_3.mp3','snow_silence_4.mp3','snow_silence_5.mp3','snow_silence_6.mp3','snow_silence_7.mp3','snow_silence_8.mp3'],victory:['victory_fanfare.mp3','victory_fanfare_2.mp3','victory_fanfare_3.mp3','victory_fanfare_4.mp3','victory_fanfare_5.mp3','victory_fanfare_6.mp3','victory_fanfare_7.mp3','victory_fanfare_8.mp3'],defeat:['defeat_somber.mp3','defeat_somber_2.mp3','defeat_somber_3.mp3','defeat_somber_4.mp3','defeat_somber_5.mp3','defeat_somber_6.mp3','defeat_somber_7.mp3','defeat_somber_8.mp3'],levelup:['levelup_theme.mp3','levelup_theme_2.mp3','levelup_theme_3.mp3','levelup_theme_4.mp3','levelup_theme_5.mp3','levelup_theme_6.mp3','levelup_theme_7.mp3','levelup_theme_8.mp3'],prologue:['prologue_theme.mp3','prologue_theme_2.mp3','prologue_theme_3.mp3','prologue_theme_4.mp3','prologue_theme_5.mp3','prologue_theme_6.mp3','prologue_theme_7.mp3','prologue_theme_8.mp3'],boss:['boss_battle.mp3','boss_battle_2.mp3','boss_battle_3.mp3','boss_battle_4.mp3','boss_battle_5.mp3','boss_battle_6.mp3','boss_battle_7.mp3','boss_battle_8.mp3'],sfx_click:['sfx_click.wav','sfx_click_02.wav'],sfx_nav:['sfx_nav.wav','sfx_nav_02.wav'],sfx_coins:['sfx_coins.wav','sfx_coins_02.wav'],sfx_equip:['sfx_equip.wav','sfx_equip_02.wav'],sfx_levelup:['sfx_levelup.wav'],sfx_quest:['sfx_quest.wav','sfx_quest_02.wav'],sfx_error:['sfx_error.wav'],sfx_reward:['sfx_reward.wav','sfx_reward_02.wav'],sfx_open:['sfx_open.wav','sfx_open_02.wav'],sfx_dice:['sfx_dice.wav','sfx_dice_02.wav'],sfx_hit:['sfx_hit.mp3','sfx_hit_02.mp3'],sfx_crit:['sfx_crit.mp3','sfx_crit_2.mp3'],sfx_miss:['sfx_miss.mp3','sfx_miss_2.mp3'],sfx_fire:['sfx_fire.mp3','sfx_fire_2.mp3'],sfx_cold:['sfx_cold.mp3','sfx_cold_2.mp3'],sfx_lightning:['sfx_lightning.mp3','sfx_lightning_2.mp3'],sfx_thunder:['sfx_thunder.wav','sfx_thunder_2.wav'],sfx_poison:['sfx_poison.wav','sfx_poison_2.wav'],sfx_radiant:['sfx_radiant.wav','sfx_radiant_2.wav'],sfx_necrotic:['sfx_necrotic.wav','sfx_necrotic_2.wav'],sfx_psychic:['sfx_psychic.wav','sfx_psychic_2.wav'],sfx_heal:['sfx_heal.mp3','sfx_heal_2.mp3'],sfx_enemy_death:['sfx_enemy_death.wav','sfx_enemy_death_2.wav'],};let _lastVariant={};function _pickVariant(trackKey){const variants=TRACKS[trackKey];if(!variants||variants.length===0)return null;if(variants.length===1)return variants[0];let pick;do{pick=variants[Math.floor(Math.random()*variants.length)];}
while(pick===_lastVariant[trackKey]);_lastVariant[trackKey]=pick;return pick;}
let _audio=null;let _fadeAudio=null;let _currentTrack='';let _muted=false;let _volume=DEFAULT_VOLUME;let _musicMuted=false;let _sfxMuted=false;let _sfxVolume=DEFAULT_VOLUME;let _unlocked=false;let _pendingTrack='';let _looping=false;let _fading=false;let _mutedAutoplay=false;let _uiInjected=false;const _UNLOCK_EVENTS=['click','touchstart','keydown'];const _MAX_UNLOCK_ATTEMPTS=5;let _unlockAttempts=0;let _unlockListenersActive=false;let _audioCtxWarmed=false;let _retryTimer=null;function _warmUpAudioContext(){if(_audioCtxWarmed)return;try{const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;const ctx=new AudioCtx();if(ctx.state==='suspended')ctx.resume();const buf=ctx.createBuffer(1,1,22050);const src=ctx.createBufferSource();src.buffer=buf;src.connect(ctx.destination);src.start(0);_audioCtxWarmed=true;setTimeout(()=>{try{ctx.close();}catch(e){console.warn('[AUDIO_MANAGER]',e);}},1000);}catch(e){console.debug('[AUDIO] AudioContext warmup failed:',e.message);}}
function _unlockHandler(){_unlocked=true;_unlockAttempts=0;_removeUnlockListeners();_warmUpAudioContext();if(_mutedAutoplay&&_audio&&!_muted&&!_musicMuted){_audio.muted=false;_audio.volume=0;_crossfadeIn(_audio);_mutedAutoplay=false;console.debug('[AUDIO] Unmuted autoplay on gesture');_syncUI();return;}
_mutedAutoplay=false;if(_pendingTrack&&!_muted&&!_musicMuted){console.debug('[AUDIO] Playing pending track on gesture:',_pendingTrack);_playTrack(_pendingTrack);return;}
console.debug('[AUDIO] Unlock fired but no pending track, re-registering');_unlocked=false;_registerUnlockListeners();}
function _registerUnlockListeners(){if(_unlockListenersActive)return;_unlockListenersActive=true;_UNLOCK_EVENTS.forEach(e=>document.addEventListener(e,_unlockHandler,{capture:true}));}
function _removeUnlockListeners(){if(!_unlockListenersActive)return;_unlockListenersActive=false;_UNLOCK_EVENTS.forEach(e=>document.removeEventListener(e,_unlockHandler,{capture:true}));}
function _tryMutedAutoplay(trackKey){if(_mutedAutoplay)return;const file=_pickVariant(trackKey);if(!file)return;const audio=new Audio(AUDIO_BASE+file);audio.muted=true;audio.preload='auto';audio.play().then(()=>{_audio=audio;_currentTrack=trackKey;_mutedAutoplay=true;if(!NO_LOOP_TRACKS.includes(trackKey)){audio.addEventListener('timeupdate',_onTimeUpdate);}
console.debug('[AUDIO] Muted autoplay started for:',trackKey,'— will unmute on first interaction');}).catch(()=>{console.debug('[AUDIO] Even muted autoplay blocked — waiting for user interaction');});}
function init(){_muted=localStorage.getItem(STORAGE_KEY)==='1';const savedVol=parseFloat(localStorage.getItem(VOLUME_KEY));if(!isNaN(savedVol)&&savedVol>=0&&savedVol<=1){_volume=savedVol;}
_musicMuted=localStorage.getItem(MUSIC_MUTED_KEY)==='1';_sfxMuted=localStorage.getItem(SFX_MUTED_KEY)==='1';const savedSfxVol=parseFloat(localStorage.getItem(SFX_VOLUME_KEY));if(!isNaN(savedSfxVol)&&savedSfxVol>=0&&savedSfxVol<=1){_sfxVolume=savedSfxVol;}
if(_muted)_musicMuted=true;if(_volume===0&&!_muted&&!_musicMuted){_volume=DEFAULT_VOLUME;localStorage.setItem(VOLUME_KEY,_volume.toString());}
_registerUnlockListeners();try{if(window.Telegram&&Telegram.WebApp){Telegram.WebApp.ready();Telegram.WebApp.onEvent('viewportChanged',function _tgUnlock(){Telegram.WebApp.offEvent('viewportChanged',_tgUnlock);if(!_unlocked)_unlockHandler();});}}catch(e){console.warn('[AUDIO_MANAGER]',e);}
_injectUI();if(_pendingTrack&&!_muted&&!_musicMuted){play(_pendingTrack);}}
function play(trackKey){if(_retryTimer){clearTimeout(_retryTimer);_retryTimer=null;}if(!trackKey||!TRACKS[trackKey]||TRACKS[trackKey].length===0){console.warn('[AUDIO] Unknown track:',trackKey);return;}
console.debug('[AUDIO] play()',trackKey,'unlocked:',_unlocked,'muted:',_muted,'musicMuted:',_musicMuted,'current:',_currentTrack);
if(trackKey===_currentTrack&&_audio&&!_audio.paused){return;}
_pendingTrack=trackKey;if(_muted||_musicMuted)return;if(_unlocked){_playTrack(trackKey);return;}
_tryMutedAutoplay(trackKey);}
function _playTrack(trackKey){const file=_pickVariant(trackKey);if(!file)return;const url=AUDIO_BASE+file;if(_fadeAudio&&!_fadeAudio.paused){try{_fadeAudio.volume=0;_fadeAudio.pause();_fadeAudio.removeEventListener('timeupdate',_onTimeUpdate);_fadeAudio.src='';}catch(e){console.warn('[AUDIO_MANAGER]',e);}_fadeAudio=null;}if(_audio&&!_audio.paused){_crossfadeOut(_audio);}
_looping=false;const audio=new Audio(url);audio.volume=0;audio.preload='auto';_audio=audio;_currentTrack=trackKey;if(!NO_LOOP_TRACKS.includes(trackKey)){audio.addEventListener('timeupdate',_onTimeUpdate);}
var _vh=function(){if(audio!==_audio||_fading)return;var newVol=audio.volume;if(Math.abs(newVol-_volume)>0.01&&!_muted){_volume=Math.max(0,Math.min(1,newVol));try{localStorage.setItem(VOLUME_KEY,_volume.toString());}catch(e){console.warn('[AUDIO_MANAGER]',e);}_syncUI();}};audio._volHandler=_vh;audio.addEventListener('volumechange',_vh);audio.play().then(()=>{_unlockAttempts=0;_crossfadeIn(audio);_syncUI();}).catch(e=>{_pendingTrack=trackKey;if(e.name==='NotAllowedError'){console.debug('[AUDIO] Autoplay blocked for:',trackKey,'- awaiting gesture');_unlocked=false;_pendingTrack=trackKey;_registerUnlockListeners();_tryMutedAutoplay(trackKey);}else if(e.name==='AbortError'){console.debug('[AUDIO] Play interrupted (AbortError) for:',trackKey);}else{console.warn('[AUDIO] Play error:',e.name,e.message);if(_retryTimer)clearTimeout(_retryTimer);var _rc=(audio._retryCount||0)+1;if(_rc<=3){_retryTimer=setTimeout(function(){_retryTimer=null;if(_pendingTrack===trackKey&&!_muted&&!_musicMuted){_playTrack(trackKey);}},Math.min(500*Math.pow(2,_rc-1),2000));}}});}
function _onTimeUpdate(){const audio=_audio;if(!audio||_looping)return;const remaining=audio.duration-audio.currentTime;if(!isFinite(remaining))return;const fadeSeconds=CROSSFADE_MS/1000;if(remaining<=fadeSeconds+0.1){_looping=true;_loopCrossfade(audio);}}
function _loopCrossfade(oldAudio){const trackKey=_currentTrack;const file=_pickVariant(trackKey);if(!file)return;const url=AUDIO_BASE+file;const newAudio=new Audio(url);newAudio.volume=0;newAudio.preload='auto';if(!NO_LOOP_TRACKS.includes(trackKey)){newAudio.addEventListener('timeupdate',_onTimeUpdate);}
newAudio.play().then(()=>{_crossfadeOut(oldAudio);_crossfadeIn(newAudio);_audio=newAudio;_looping=false;}).catch(()=>{oldAudio.currentTime=0;oldAudio.play().catch(function(e){console.debug('[AUDIO]',e.message||e);});_looping=false;});}
function _crossfadeIn(audio){if(!audio)return;_fading=true;const target=_volume;const steps=20;const stepMs=CROSSFADE_MS/steps;const increment=target/steps;let current=0;const timer=setInterval(()=>{current+=increment;if(current>=target||audio!==_audio){try{audio.volume=(audio===_audio)?target:0;}catch(e){console.warn('[AUDIO_MANAGER]',e);}
_fading=false;clearInterval(timer);}else{try{audio.volume=current;}catch(e){clearInterval(timer);}}},stepMs);}
function _crossfadeOut(audio){if(!audio)return;_fadeAudio=audio;const startVol=audio.volume;const steps=15;const stepMs=CROSSFADE_MS/steps;const decrement=startVol/steps;let current=startVol;const timer=setInterval(()=>{current-=decrement;if(current<=0){try{audio.volume=0;audio.pause();audio.removeEventListener('timeupdate',_onTimeUpdate);if(audio._volHandler)audio.removeEventListener('volumechange',audio._volHandler);audio.src='';}catch(e){console.warn('[AUDIO_MANAGER]',e);}
clearInterval(timer);if(_fadeAudio===audio)_fadeAudio=null;}else{try{audio.volume=current;}catch(e){clearInterval(timer);}}},stepMs);}
function stop(){if(_audio){_crossfadeOut(_audio);_audio=null;}
_currentTrack='';_pendingTrack='';_looping=false;_syncUI();}
const _SFX_POOL_SIZE=3;const _MAX_SFX_POOLS=30;const _sfxPool={};function _getSfxAudio(url){if(!_sfxPool[url]){var _ks=Object.keys(_sfxPool);if(_ks.length>=_MAX_SFX_POOLS){var _oldUrl=_ks[0];var _oldPool=_sfxPool[_oldUrl];if(_oldPool){_oldPool.forEach(function(a){try{a.pause();a.onended=null;a.onerror=null;a.src="";}catch(e){console.warn('[AUDIO_MANAGER]',e);}});}delete _sfxPool[_oldUrl];}_sfxPool[url]=[];for(let i=0;i<_SFX_POOL_SIZE;i++){const a=new Audio();a.preload='auto';a.src=url;_sfxPool[url].push(a);}}
const pool=_sfxPool[url];for(let i=0;i<pool.length;i++){const a=pool[i];if(a.paused||a.ended){a.currentTime=0;return a;}}
const a=pool[0];try{a.pause();a.currentTime=0;}catch(e){console.warn('[AUDIO_MANAGER]',e);}return a;}
function playSFX(trackKey){if(_muted||_sfxMuted||!_unlocked)return;if(window.vReducedMotion)return;const file=_pickVariant(trackKey);if(!file)return;const url=AUDIO_BASE+file;const sfx=_getSfxAudio(url);sfx.volume=Math.min(1,_sfxVolume*1.5);sfx.play().catch(function(e){console.debug('[AUDIO]',e.message||e);});}
function toggleMute(){_muted=!_muted;try{localStorage.setItem(STORAGE_KEY,_muted?'1':'0');}catch(e){console.warn('[AUDIO_MANAGER]',e);}_musicMuted=_muted;try{localStorage.setItem(MUSIC_MUTED_KEY,_musicMuted?'1':'0');}catch(e){console.warn('[AUDIO_MANAGER]',e);}if(_muted){if(_audio)_audio.volume=0;}else{if(_audio&&!_audio.paused){_audio.volume=_volume;}else if(_pendingTrack||_currentTrack){_playTrack(_pendingTrack||_currentTrack);}}
_syncUI();return _muted;}
function isMuted(){return _muted;}
function setVolume(val){_volume=Math.max(0,Math.min(1,val));try{localStorage.setItem(VOLUME_KEY,_volume.toString());}catch(e){console.warn('[AUDIO_MANAGER]',e);}if(_volume===0&&!_muted){_muted=true;_musicMuted=true;try{localStorage.setItem(STORAGE_KEY,'1');}catch(e){console.warn('[AUDIO_MANAGER]',e);}try{localStorage.setItem(MUSIC_MUTED_KEY,'1');}catch(e){console.warn('[AUDIO_MANAGER]',e);}if(_audio){try{_audio.volume=0;}catch(e){console.warn('[AUDIO_MANAGER]',e);}}_syncUI();return;}if(_audio&&!_muted){_smoothVol(_audio,_volume);}
if(_volume>0&&(_muted||_musicMuted)){_muted=false;_musicMuted=false;try{localStorage.setItem(STORAGE_KEY,'0');}catch(e){console.warn('[AUDIO_MANAGER]',e);}try{localStorage.setItem(MUSIC_MUTED_KEY,'0');}catch(e){console.warn('[AUDIO_MANAGER]',e);}if(_audio&&!_audio.paused){_audio.volume=_volume;}else if(_pendingTrack||_currentTrack){_playTrack(_pendingTrack||_currentTrack);}}
_syncUI();}
function getVolume(){return _volume;}
function playBiome(biome){const biomeMap={'plains':'city','forest':'forest','swamp':'swamp','mountain':'mountain','cave':'dungeon','desert':'desert','snow':'snow','volcanic':'dungeon','city_gates':'city',};const track=biomeMap[biome]||'forest';play(track);}
const HINT_KEY='valdoria_audio_hint_seen';const _TRACK_NAMES={tavern:'Taverna',city:'Cidade',forest:'Floresta',combat:'Combate',desert:'Deserto',dungeon:'Masmorra',swamp:'Pântano',mountain:'Montanha',snow:'Neve',victory:'Vitória',defeat:'Derrota',levelup:'Nível',prologue:'Prólogo',boss:'Chefe',};const _SVG_MUTED='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';const _SVG_LOW='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';const _SVG_HIGH='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';let _popupOpen=false;let _closeTimer=null;function _injectUI(){if(_uiInjected)return;_uiInjected=true;_injectCSS();_tryEmbedInFooter();}
function _injectCSS(){const style=document.createElement('style');style.textContent=`
            /* ── Volume popup (appears above footer/button) ── */
            .va-popup {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: var(--v-z-critical, 10000);
                display: flex;
                flex-direction: column;
                align-items: center;
                pointer-events: none;
                opacity: 0;
                transform: translateY(8px);
                transition: opacity var(--v-transition), transform var(--v-transition);
            }
            .va-popup.open {
                opacity: 1;
                transform: translateY(0);
                pointer-events: auto;
            }
            .va-popup-card {
                display: flex;
                flex-direction: column;
                gap: 6px;
                background: var(--v-bg-raised, #332a22);
                border: 1px solid var(--v-border, #4a3828);
                border-radius: 12px;
                padding: 10px 14px;
                box-shadow: 0 -4px 16px rgba(0,0,0,0.5);
                max-width: 300px;
                width: calc(100% - 32px);
            }
            .va-popup-icon {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                border: 1px solid var(--v-border, #4a3828);
                background: transparent;
                color: var(--v-text-dim, #8a7a68);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                flex-shrink: 0;
                padding: 0;
                font-size: 14px;
                transition: color var(--v-transition), border-color var(--v-transition);
                -webkit-tap-highlight-color: transparent;
            }
            .va-popup-icon.unmuted {
                color: var(--v-gold, #c4953a);
                border-color: rgba(196,149,58,0.4);
            }
            .va-popup-icon:active {
                transform: scale(0.9);
            }
            /* Popup row layout (music + sfx) */
            .va-popup-row {
                display: flex;
                align-items: center;
                gap: 8px;
                width: 100%;
            }
            .va-popup-slider {
                -webkit-appearance: none;
                appearance: none;
                flex: 1;
                height: 36px;
                background: transparent;
                outline: none;
                margin: 0;
                padding: 0;
                cursor: pointer;
                border-radius: 4px;
            }
            .va-popup-slider::-webkit-slider-runnable-track {
                height: 6px;
                border-radius: 3px;
                background: linear-gradient(to right, var(--v-gold, #c4953a) var(--fill, 0%), rgba(112,66,20,0.3) var(--fill, 0%));
            }
            .va-popup-slider::-moz-range-track {
                height: 6px;
                border-radius: 3px;
                background: linear-gradient(to right, var(--v-gold, #c4953a) var(--fill, 0%), rgba(112,66,20,0.3) var(--fill, 0%));
            }
            .va-popup-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: var(--v-gold, #c4953a);
                border: 2px solid var(--v-border, #4a3828);
                cursor: pointer;
                margin-top: -8px;
            }
            .va-popup-slider::-moz-range-thumb {
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: var(--v-gold, #c4953a);
                border: 2px solid var(--v-border, #4a3828);
                cursor: pointer;
            }
            .va-popup-pct {
                font-family: var(--v-font, 'MedievalSharp', serif);
                font-size: 13px;
                color: var(--v-text-dim, #8a7a68);
                min-width: 32px;
                text-align: right;
                flex-shrink: 0;
            }
            /* Backdrop to close popup on outside tap */
            .va-backdrop {
                position: fixed;
                inset: 0;
                z-index: calc(var(--v-z-critical, 10000) - 1);
                display: none;
            }
            .va-backdrop.open {
                display: block;
            }
            /* ── Footer audio button (matches .btn-action) ── */
            .va-footer-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--v-bg-raised, #332a22);
                border: 1px solid var(--v-border, #4a3828);
                border-radius: 8px;
                color: var(--v-text-dim, #8a7a68);
                cursor: pointer;
                padding: 8px 3px;
                min-height: 40px;
                font-size: 14px;
                flex: 0 0 40px;
                transition: color var(--v-transition), border-color var(--v-transition);
            }
            .va-footer-btn.va-playing {
                color: var(--v-gold, #c4953a);
                border-color: rgba(196,149,58,0.3);
            }
            .va-footer-btn:active {
                transform: scale(0.95);
            }
            /* ── Floating fallback (non-footer webapps) ── */
            .va-float {
                position: fixed;
                bottom: var(--va-bottom-offset, 8px);
                right: 8px;
                z-index: var(--v-z-dropdown, 200);
                transition: bottom var(--v-transition-base);
            }
            .va-float-btn {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border: 1px solid var(--v-border, #4a3828);
                background: var(--v-bg-raised, #332a22);
                color: var(--v-text-dim, #8a7a68);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                padding: 0;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                transition: color var(--v-transition), border-color var(--v-transition), transform var(--v-transition-fast);
            }
            .va-float-btn.va-playing {
                color: var(--v-gold, #c4953a);
                border-color: rgba(196,149,58,0.3);
            }
            .va-float-btn:active {
                transform: scale(0.9);
            }
            /* Hide during loading/overlays */
            .loading:not(.hidden) ~ .va-float,
            .dm-overlay.active ~ .va-float,
            .outcome-overlay.active ~ .va-float {
                opacity: 0;
                pointer-events: none;
            }
            /* ── Row label ── */
            .va-popup-label {
                font-family: var(--v-font, 'MedievalSharp', serif);
                font-size: 11px;
                color: var(--v-text-dim, #8a7a68);
                min-width: 44px;
                text-align: center;
                flex-shrink: 0;
                line-height: 1;
            }
            /* ── Track indicator ── */
            .va-popup-track {
                font-family: var(--v-font, 'MedievalSharp', serif);
                font-size: 11px;
                color: var(--v-text-dim, #8a7a68);
                text-align: center;
                padding: 0 4px 2px;
                opacity: 0.7;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            /* ── First-time hint ── */
            .va-hint-pulse {
                animation: vaGlowPulse 1.5s ease infinite !important;
            }
            @keyframes vaGlowPulse {
                0%,100% { box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
                50% { box-shadow: 0 0 0 6px rgba(196,149,58,0.25), 0 0 12px rgba(196,149,58,0.15); }
            }
            /* Breathing glow when music is playing */
            @keyframes vaBreathing {
                0%, 100% { filter: brightness(0.9); }
                50% { filter: brightness(1.2); }
            }
            .va-footer-btn.va-playing,
            .va-float-btn.va-playing {
                animation: vaBreathing 3s ease-in-out infinite;
            }
            body.perf-lite .va-footer-btn.va-playing,body.perf-lite .va-float-btn.va-playing{animation:none !important;}
            body.perf-lite .va-hint-pulse{animation:none !important;}
        `;document.head.appendChild(style);}
let _isEmbedded=false;let _footerObserver=null;let _embedObserver=null;function _tryEmbedInFooter(){const footerEl=document.getElementById('footer-quick');if(footerEl&&footerEl.children.length>0){_embedInFooter(footerEl);return;}
if(_footerObserver){_footerObserver.disconnect();_footerObserver=null;}const observer=new MutationObserver(()=>{const el=document.getElementById('footer-quick');if(el&&el.children.length>0&&!_isEmbedded){const floatEl=document.getElementById('va-float');if(floatEl)floatEl.remove();const oldBtn=document.getElementById('va-btn');if(oldBtn)oldBtn.remove();_embedInFooter(el);}});observer.observe(document.body,{childList:true,subtree:true});_footerObserver=observer;setTimeout(()=>{if(!document.getElementById('va-btn')){_createFloatingBtn();}},3000);}
function _embedInFooter(footerEl){_isEmbedded=true;const btn=document.createElement('button');btn.className='va-footer-btn';btn.id='va-btn';btn.setAttribute('aria-label','Ajustar volume');_updateBtnIcon(btn);const buttons=footerEl.querySelectorAll('.btn-action');let settingsBtn=null;for(const b of buttons){if(b.textContent.includes('⚙')||b.textContent.includes('\u2699')){settingsBtn=b;break;}}
if(settingsBtn&&settingsBtn.nextSibling){footerEl.insertBefore(btn,settingsBtn.nextSibling);}else if(settingsBtn){footerEl.appendChild(btn);}else{footerEl.appendChild(btn);}
btn.addEventListener('click',(e)=>{e.stopPropagation();_dismissHint(btn);_togglePopup();});_createPopup();if(_footerObserver){_footerObserver.disconnect();_footerObserver=null;}if(_embedObserver){_embedObserver.disconnect();_embedObserver=null;}const mo=new MutationObserver(()=>{_closePopup();if(!document.getElementById('va-btn')&&_isEmbedded){const el=document.getElementById('footer-quick');if(el&&el.children.length>0){_isEmbedded=false;_embedInFooter(el);}}});mo.observe(footerEl,{childList:true});_embedObserver=mo;_showFirstTimeHint(btn);}
function _createFloatingBtn(){const wrap=document.createElement('div');wrap.className='va-float';wrap.id='va-float';const btn=document.createElement('button');btn.className='va-float-btn';btn.id='va-btn';btn.setAttribute('aria-label','Ajustar volume');_updateBtnIcon(btn);wrap.appendChild(btn);document.body.appendChild(wrap);btn.addEventListener('click',(e)=>{e.stopPropagation();_dismissHint(btn);_togglePopup();});_createPopup();function _updateOffset(){var bar=document.getElementById('bottom-panel')||document.getElementById('bottom-bar');if(bar&&bar.offsetHeight>0){document.documentElement.style.setProperty('--va-bottom-offset',(bar.offsetHeight+8)+'px');}}
setTimeout(_updateOffset,300);setTimeout(_updateOffset,1000);var _audioResizeDebounce;window.addEventListener('resize',function(){clearTimeout(_audioResizeDebounce);_audioResizeDebounce=setTimeout(_updateOffset,150);});const oldBtn=document.querySelector('.audio-mute-btn');if(oldBtn)oldBtn.remove();_showFirstTimeHint(btn);}
function _haptic(type){try{var tg=window.Telegram&&window.Telegram.WebApp;if(tg&&tg.HapticFeedback)tg.HapticFeedback.impactOccurred(type||'light');}catch(e){console.warn('[AUDIO_MANAGER]',e);}}
let _volRafId=null;function _smoothVol(audio,target){if(_volRafId)cancelAnimationFrame(_volRafId);var current=audio.volume;var diff=target-current;if(Math.abs(diff)<0.01){try{audio.volume=target;}catch(e){console.warn('[AUDIO_MANAGER]',e);}return;}
var step=diff*0.3;function tick(){current+=step;step*=0.7;if(Math.abs(target-current)<0.005){try{audio.volume=target;}catch(e){console.warn('[AUDIO_MANAGER]',e);}
_volRafId=null;return;}
try{audio.volume=Math.max(0,Math.min(1,current));}catch(e){_volRafId=null;return;}
_volRafId=requestAnimationFrame(tick);}
_volRafId=requestAnimationFrame(tick);}
function _updateSliderFill(slider,pct){if(slider)slider.style.setProperty('--fill',pct+'%');}
let _previewCtx=null;let _previewTimer=null;function _sfxPreviewTick(){if(_sfxMuted||_previewTimer)return;_previewTimer=setTimeout(function(){_previewTimer=null;},250);try{if(!_previewCtx)_previewCtx=new(window.AudioContext||window.webkitAudioContext)();var osc=_previewCtx.createOscillator();var gain=_previewCtx.createGain();osc.type='sine';osc.frequency.value=440;gain.gain.setValueAtTime(Math.min(0.15,_sfxVolume*0.3),_previewCtx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,_previewCtx.currentTime+0.08);osc.connect(gain);gain.connect(_previewCtx.destination);osc.start();osc.stop(_previewCtx.currentTime+0.08);}catch(e){console.warn('[AUDIO_MANAGER]',e);}}
function _createPopupRow(emoji,label,prefix,enabled,volume,onToggle,onVolume){var row=document.createElement('div');row.className='va-popup-row';var icon=document.createElement('button');icon.className='va-popup-icon'+(enabled?' unmuted':'');icon.id=prefix+'-icon';icon.textContent=emoji;icon.addEventListener('click',function(e){e.stopPropagation();_haptic('light');onToggle();});var lbl=document.createElement('span');lbl.className='va-popup-label';lbl.textContent=label;var slider=document.createElement('input');slider.type='range';slider.className='va-popup-slider';slider.id=prefix+'-slider';slider.min='0';slider.max='100';slider.value=String(enabled?volume:0);slider.addEventListener('input',function(e){e.stopPropagation();var val=parseInt(e.target.value,10);_updateSliderFill(slider,val);var pctEl=document.getElementById(prefix+'-pct');if(pctEl)pctEl.textContent=val+'%';onVolume(val);});slider.addEventListener('touchstart',function(e){e.stopPropagation();_resetCloseTimer();});slider.addEventListener('touchmove',function(e){e.stopPropagation();});slider.addEventListener('pointerdown',function(e){e.stopPropagation();_resetCloseTimer();});_updateSliderFill(slider,enabled?volume:0);var pct=document.createElement('span');pct.className='va-popup-pct';pct.id=prefix+'-pct';pct.textContent=(enabled?volume:0)+'%';row.appendChild(icon);row.appendChild(lbl);row.appendChild(slider);row.appendChild(pct);return row;}
function _createPopup(){if(document.getElementById('va-popup'))return;const backdrop=document.createElement('div');backdrop.className='va-backdrop';backdrop.id='va-backdrop';backdrop.addEventListener('click',()=>_closePopup());document.body.appendChild(backdrop);const popup=document.createElement('div');popup.className='va-popup';popup.id='va-popup';const card=document.createElement('div');card.className='va-popup-card';const trackEl=document.createElement('div');trackEl.className='va-popup-track';trackEl.id='va-track-name';trackEl.textContent=_currentTrack?('♫ '+(_TRACK_NAMES[_currentTrack]||_currentTrack)):'';card.appendChild(trackEl);const musicVol=(_muted||_musicMuted)?0:Math.round(_volume*100);card.appendChild(_createPopupRow('♫','Música','va-music',!_musicMuted&&!_muted,musicVol,()=>{toggleMusic();_updatePopupUI();_resetCloseTimer();},(val)=>{setVolume(val/100);_updatePopupUI();_resetCloseTimer();}));const sfxVol=_sfxMuted?0:Math.round(_sfxVolume*100);card.appendChild(_createPopupRow('⚔','Efeitos','va-sfx',!_sfxMuted,sfxVol,()=>{toggleSFX();_updatePopupUI();_resetCloseTimer();},(val)=>{setSFXVolume(val/100);_sfxPreviewTick();_updatePopupUI();_resetCloseTimer();}));popup.appendChild(card);document.body.appendChild(popup);_positionPopup();}
function _positionPopup(){const popup=document.getElementById('va-popup');if(!popup)return;const panel=document.getElementById('bottom-panel')||document.getElementById('bottom-bar');if(panel){popup.style.bottom=panel.offsetHeight+'px';}else{popup.style.bottom='52px';}}
function _togglePopup(){_popupOpen=!_popupOpen;const popup=document.getElementById('va-popup');const backdrop=document.getElementById('va-backdrop');if(popup){popup.classList.toggle('open',_popupOpen);_positionPopup();}
if(backdrop)backdrop.classList.toggle('open',_popupOpen);if(_popupOpen){_updatePopupUI();_resetCloseTimer();}else{if(_closeTimer){clearTimeout(_closeTimer);_closeTimer=null;}}}
function _closePopup(){if(!_popupOpen)return;_popupOpen=false;const popup=document.getElementById('va-popup');const backdrop=document.getElementById('va-backdrop');if(popup)popup.classList.remove('open');if(backdrop)backdrop.classList.remove('open');if(_closeTimer){clearTimeout(_closeTimer);_closeTimer=null;}}
function _resetCloseTimer(){if(_closeTimer)clearTimeout(_closeTimer);_closeTimer=setTimeout(_closePopup,5000);}
function _updatePopupUI(){const tn=document.getElementById('va-track-name');if(tn)tn.textContent=_currentTrack?('♫ '+(_TRACK_NAMES[_currentTrack]||_currentTrack)):'';const mi=document.getElementById('va-music-icon');const ms=document.getElementById('va-music-slider');const mp=document.getElementById('va-music-pct');const mv=(_muted||_musicMuted)?0:Math.round(_volume*100);if(mi)mi.classList.toggle('unmuted',!_musicMuted&&!_muted);if(ms){ms.value=String(mv);_updateSliderFill(ms,mv);}
if(mp)mp.textContent=mv+'%';const si=document.getElementById('va-sfx-icon');const ss=document.getElementById('va-sfx-slider');const sp=document.getElementById('va-sfx-pct');const sv=_sfxMuted?0:Math.round(_sfxVolume*100);if(si)si.classList.toggle('unmuted',!_sfxMuted);if(ss){ss.value=String(sv);_updateSliderFill(ss,sv);}
if(sp)sp.textContent=sv+'%';}
let _hintDismissed=false;function _showFirstTimeHint(btn){try{if(localStorage.getItem(HINT_KEY))return;}catch(e){return;}
const _tryShow=()=>{const loading=document.querySelector('.loading:not(.hidden), .loading-overlay:not(.hidden), #loading:not([style*="display: none"]), #v-err-overlay:not([style*="display: none"])');if(loading){setTimeout(_tryShow,1000);return;}
if(_hintDismissed)return;if(btn)btn.classList.add('va-hint-pulse');setTimeout(()=>{_dismissHint(btn);},5000);};setTimeout(_tryShow,1500);}
function _dismissHint(btn){if(_hintDismissed)return;_hintDismissed=true;try{localStorage.setItem(HINT_KEY,'1');}catch(e){console.warn('[AUDIO_MANAGER]',e);}
if(btn)btn.classList.remove('va-hint-pulse');}
function _updateBtnIcon(btn){if(!btn)return;if(_muted||_musicMuted||_volume===0){btn.innerHTML=_SVG_MUTED;btn.title='Som desativado';btn.classList.remove('va-playing');}else if(_volume<0.5){btn.innerHTML=_SVG_LOW;btn.title='Volume: '+Math.round(_volume*100)+'%';btn.classList.toggle('va-playing',!!(_audio&&!_audio.paused));}else{btn.innerHTML=_SVG_HIGH;btn.title='Volume: '+Math.round(_volume*100)+'%';btn.classList.toggle('va-playing',!!(_audio&&!_audio.paused));}}
function _syncUI(){const btn=document.getElementById('va-btn');_updateBtnIcon(btn);if(_popupOpen)_updatePopupUI();}
function createMuteButton(){const span=document.createElement('span');span.style.display='none';return span;}
function toggleMusic(){_musicMuted=!_musicMuted;try{localStorage.setItem(MUSIC_MUTED_KEY,_musicMuted?'1':'0');}catch(e){console.warn('[AUDIO_MANAGER]',e);}if(_musicMuted){if(_audio)_audio.volume=0;_muted=true;try{localStorage.setItem(STORAGE_KEY,'1');}catch(e){console.warn('[AUDIO_MANAGER]',e);}}else{_muted=false;try{localStorage.setItem(STORAGE_KEY,'0');}catch(e){console.warn('[AUDIO_MANAGER]',e);}if(_audio&&!_audio.paused){_audio.volume=_volume;}else if(_pendingTrack||_currentTrack){_playTrack(_pendingTrack||_currentTrack);}}
_syncUI();return _musicMuted;}
function toggleSFX(){_sfxMuted=!_sfxMuted;try{localStorage.setItem(SFX_MUTED_KEY,_sfxMuted?'1':'0');}catch(e){console.warn('[AUDIO_MANAGER]',e);}return _sfxMuted;}
function isMusicMuted(){return _musicMuted;}
function isSFXMuted(){return _sfxMuted;}
function setSFXVolume(val){_sfxVolume=Math.max(0,Math.min(1,val));try{localStorage.setItem(SFX_VOLUME_KEY,_sfxVolume.toString());}catch(e){console.warn('[AUDIO_MANAGER]',e);}if(_sfxVolume===0&&!_sfxMuted){_sfxMuted=true;try{localStorage.setItem(SFX_MUTED_KEY,'1');}catch(e){console.warn('[AUDIO_MANAGER]',e);}}
if(_sfxVolume>0&&_sfxMuted){_sfxMuted=false;try{localStorage.setItem(SFX_MUTED_KEY,'0');}catch(e){console.warn('[AUDIO_MANAGER]',e);}}}
function getSFXVolume(){return _sfxVolume;}
return{init,_warmUp:_warmUpAudioContext,play,playBiome,playSFX,stop,toggleMute,isMuted,setVolume,getVolume,toggleMusic,toggleSFX,isMusicMuted,isSFXMuted,setSFXVolume,getSFXVolume,createMuteButton,previewSFX:_sfxPreviewTick,getCurrentTrack:function(){return _currentTrack;},TRACKS,};})();if(typeof document!=='undefined'){if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',ValdoriaAudio.init);}else{ValdoriaAudio.init();}
window.addEventListener('pagehide',function(){try{var ct=(typeof ValdoriaAudio.getCurrentTrack==='function')?ValdoriaAudio.getCurrentTrack():'';if(ct){try{localStorage.setItem('valdoria_audio_resume',ct);}catch(e){console.warn('[AUDIO_MANAGER]',e);}try{localStorage.setItem('valdoria_audio_resume_ts',String(Date.now()));}catch(e){console.warn('[AUDIO_MANAGER]',e);}}}catch(e){console.warn('[AUDIO_MANAGER]',e);}});}
(function _tryResumeAudio(){try{var resumeTrack=localStorage.getItem('valdoria_audio_resume');var resumeTs=parseInt(localStorage.getItem('valdoria_audio_resume_ts')||'0',10);if(resumeTrack&&Date.now()-resumeTs<120000){localStorage.removeItem('valdoria_audio_resume');localStorage.removeItem('valdoria_audio_resume_ts');var _doResume=function(){if(typeof ValdoriaAudio!=='undefined'&&ValdoriaAudio.play){ValdoriaAudio.play(resumeTrack);}};if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){setTimeout(_doResume,100);});}else{setTimeout(_doResume,100);}}}catch(e){console.warn('[AUDIO_MANAGER]',e);}})();