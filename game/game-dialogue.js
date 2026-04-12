/* game-dialogue.js -- Shared mood constants and ambient functions */
/* Inline renderDialogue() REMOVED -- popup is mandatory (game-dialogue-popup.js) */

var MOOD_ICONS={happy:'\u2728',angry:'\u2694\uFE0F',sad:'\u{1F56F}\uFE0F',busy:'\u{1F4DC}',neutral:'\u{1F5E3}'};
var MOOD_LABELS={happy:'Amig\u00e1vel',angry:'Irritado',sad:'Melanc\u00f3lico',busy:'Ocupado',neutral:''};
var MOOD_GRADIENTS={happy:'radial-gradient(ellipse at 50% 0%, #3a3225 0%, var(--v-bg) 70%)',angry:'radial-gradient(ellipse at 50% 0%, #4a2818 0%, var(--v-bg) 70%)',sad:'radial-gradient(ellipse at 50% 0%, #2e2a24 0%, var(--v-bg) 70%)',busy:'radial-gradient(ellipse at 50% 0%, #342e26 0%, var(--v-bg) 70%)',neutral:'radial-gradient(ellipse at 50% 0%, #3a3028 0%, var(--v-bg) 70%)'};

function extractDialogueText(rawText){var lines=rawText.split('\n');var bodyStart=0;for(var i=0;i<lines.length&&i<8;i++){var raw=lines[i].trim();raw=raw.replace(/[\u200B-\u200D\uFEFF]/g,'').trim();var t=raw.replace(/<[^>]+>/g,'').trim();if(!t||/^[═━⚜💎\u2550\u2501\s\uFE0F]+$/.test(t)){bodyStart=i+1;continue;}
if(/\d{2}:\d{2}\s*\|/.test(t)||(t.includes('Ano ')&&t.includes('|'))||/°C/.test(t)){bodyStart=i+1;continue;}
var stripped=t.replace(/[\[\]\(\)⭐✨💀⚔️🛡️⚜\uFE0F\s]/g,'');if(stripped.length>2&&stripped===stripped.toUpperCase()&&!/[a-z]/.test(stripped)){bodyStart=i+1;continue;}break;}
var body=lines.slice(bodyStart);while(body.length>0){var last=body[body.length-1].replace(/<[^>]+>/g,'').trim();if(!last||/^[═━⚜💎\u2550\u2501\s\uFE0F\u2800]+$/.test(last)){body.pop();continue;}break;}
return body.join('\n').trim();}

function applyMoodAmbient(mood){var g=MOOD_GRADIENTS[mood]||MOOD_GRADIENTS.neutral;document.body.style.background=g;document.body.style.backgroundAttachment='fixed';}
function clearMoodAmbient(){document.body.style.background='';document.body.style.backgroundAttachment='';}
