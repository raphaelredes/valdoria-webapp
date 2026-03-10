/* ═══════════════════════════════════════════════
   COMBAT-DATA — Constants, Narration & Helpers
   Lendas de Valdoria Combat WebApp
   ═══════════════════════════════════════════════ */

// ─── FEATURE 3: PARTICLE EFFECTS ───
const _PARTICLE_COLORS = {
    slashing: ['#e0e0e0', '#d4c060'],
    piercing: ['#b0c8e0', '#d4c060'],
    bludgeoning: ['#c0b080', '#e0d080'],
    fire: ['#ff6020', '#ff9020', '#ffd040'],
    cold: ['#80c0ff', '#c0e8ff'],
    lightning: ['#e0e060', '#ffffff'],
    necrotic: ['#9040c0', '#604080'],
    radiant: ['#ffe080', '#ffffff'],
    psychic: ['#e080ff', '#c060d0'],
    thunder: ['#a0a0e0', '#ffffff'],
    poison: ['#60c040', '#80e040'],
    acid: ['#60d040', '#c0ff40'],
    force: ['#60c0ff', '#a0e0ff'],
    magic: ['#c060ff', '#60c0ff'],
};

function spawnParticles(isCrit, damageType) {
    const colors = _PARTICLE_COLORS[damageType] || _PARTICLE_COLORS['slashing'];
    const count = isCrit ? 12 : 7;
    // Use viewport center (overlay mode — no inline dice2)
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'hit-particle';
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
        const dist = 30 + Math.random() * (isCrit ? 60 : 40);
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist - 20;
        const dur = 0.4 + Math.random() * 0.3;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = isCrit ? 8 : 5;
        p.style.cssText = `left:${cx}px;top:${cy}px;background:${color};--p-tx:${tx}px;--p-ty:${ty}px;--p-dur:${dur}s;width:${size}px;height:${size}px;`;
        document.body.appendChild(p);
        setTimeout(() => p.remove(), dur * 1000 + 100);
    }
}


// ─── FEATURE 7: DM NARRATION ───
const _NARR_CRIT = [
    'A lâmina encontra uma brecha mortal!',
    'Golpe devastador! O inimigo recua.',
    'Perfeito! Um acerto certeiro e brutal.',
    'A armadura não resiste ao impacto!',
    'Um golpe magistral! Impressionante.',
    'Com precisão letal, o golpe atinge em cheio!',
    'Nenhum escudo poderia parar esse golpe.',
    'O inimigo não tinha como evitar.',
    'Atingido com força avassaladora!',
    'Vulnerabilidade exposta — golpe crítico!',
];
const _NARR_NAT1 = [
    'O golpe passa vergonhosamente longe!',
    'Tropeça e perde o equilíbrio por um instante.',
    'A arma escorrega da mão por um segundo.',
    'Uma distração fatal arruína o ataque.',
    'O inimigo se esquiva com facilidade.',
    'Um erro de julgamento custoso.',
    'O golpe raspa o ar sem causar dano.',
    'Uma falha imperdoável no momento crucial.',
    'O peso da arma desequilibra o atacante.',
    'Nem perto — o inimigo mal precisou se mover.',
];
const _NARR_MISS = [
    'O inimigo desvia no último instante.',
    'O ataque é bloqueado pela armadura.',
    'Rápido demais — o golpe não conecta.',
    'A defesa do inimigo resiste.',
    'Sem efeito — o inimigo esquiva com destreza.',
    'O golpe resvala na defesa sem causar dano.',
    'Quase! Mas o inimigo recua a tempo.',
    'A lâmina corta apenas o ar.',
    'O escudo absorve o impacto por completo.',
    'Reflexos ágeis salvam o oponente.',
    'O ataque pega de raspão — sem dano real.',
    'A distância era grande demais para conectar.',
];
// P1-E: Kill narrations with enemy name template ({name} is replaced at call site)
const _NARR_KILL = [
    '{name} tomba derrotado!',
    'Sem mais vida — {name} cai.',
    'O golpe final abate {name}.',
    'Derrota inevitável — {name} sucumbe.',
    '{name} não se levanta mais.',
    'O último suspiro de {name} ecoa no campo.',
    '{name} desmorona sob o peso da derrota.',
    'Vitória! {name} é eliminado.',
    'Com um golpe decisivo, {name} é vencido.',
    '{name} cai de joelhos e não se ergue mais.',
    'O combate termina — {name} jaz imóvel.',
    '{name} sucumbe ao golpe final sem resistência.',
];
// Heal narrations (shown when player or ally uses healing)
const _NARR_HEAL = [
    'Energia curativa flui e fecha ferimentos.',
    'Luz restauradora envolve o corpo ferido.',
    'As feridas se fecham com um brilho quente.',
    'Vigor renovado percorre as veias.',
    'A dor recua diante do poder restaurador.',
    'Cura divina acalma corpo e espírito.',
    'Músculos se regeneram com calor reconfortante.',
    'O brilho da cura dissipa a exaustão.',
];
const _NARR_BUFF = [
    '{name} ativado — poder reforçado!',
    'Uma aura dourada envolve o corpo — {name}!',
    '{name} concedido — prepare-se para a batalha!',
    'Energia mágica se concentra — {name}!',
    'O poder de {name} flui pelas veias!',
];
// Enemy attack narrations (used during enemy turns)
const _NARR_ENEMY_HIT = [
    'O golpe acerta em cheio!',
    'Sem tempo para reagir — o ataque conecta.',
    'A defesa não foi suficiente.',
    'Um impacto doloroso atravessa a guarda.',
    'O inimigo encontra uma abertura!',
    'O ataque rompe a defesa com força bruta.',
    'Um golpe certeiro atravessa a armadura.',
    'Dor aguda — o ataque passou direto.',
    'A criatura ataca com precisão mortal.',
    'O impacto faz seus joelhos fraquejarem.',
];
const _NARR_ENEMY_CRIT = [
    'Golpe devastador do inimigo!',
    'Um acerto brutal — impossível ignorar a dor!',
    'Ataque certeiro atinge um ponto vital!',
    'O inimigo desfere um golpe avassalador!',
    'Sem defesa possível contra esse ataque!',
    'O inimigo explora uma brecha fatal na guarda!',
    'Um golpe que faria veteranos recuarem!',
    'Ataque devastador — a dor é insuportável!',
    'O inimigo concentra toda a fúria em um único golpe!',
    'Um acerto brutal que ecoa pelo campo de batalha!',
];
const _NARR_ENEMY_MISS = [
    'Desvio no último instante!',
    'A esquiva foi perfeita!',
    'O ataque passa sem causar dano.',
    'Reflexos rápidos evitam o golpe.',
    'O inimigo erra por pouco!',
    'A lâmina corta o ar — nada mais.',
    'Instinto puro salva você do golpe.',
    'O ataque passa de raspão pela armadura.',
    'Uma abertura — mas o inimigo não a encontra.',
    'O golpe se perde no vazio.',
];
const _NARR_ALLY_ACTION = [
    '{name} entra em ação!',
    '{name} se posiciona e ataca!',
    '{name} não hesita e avança!',
    '{name} desfere seu golpe!',
    '{name} luta ao seu lado!',
    '{name} ergue a arma e investe!',
    '{name} se lança contra o inimigo!',
    '{name} aproveita o momento e ataca!',
    '{name} avança com determinação!',
    '{name} cobre seu flanco e contra-ataca!',
];
const _NARR_ALLY_HIT = [
    '{name} acerta o inimigo!',
    '{name} conecta um belo golpe!',
    'Excelente! {name} causa dano!',
    '{name} encontra uma abertura!',
    'O ataque de {name} é preciso!',
    '{name} desfere um golpe certeiro!',
    'Direto no alvo! {name} não falha!',
    '{name} acerta a criatura com força!',
    'Boa! O golpe de {name} conecta!',
    '{name} atinge o ponto fraco do inimigo!',
];
const _NARR_ALLY_CRIT = [
    '{name} desfere um golpe devastador!',
    'Golpe perfeito de {name}!',
    '{name} acerta um ponto vital!',
    'Incrível! {name} causa dano massivo!',
    '{name} libera todo o seu poder!',
    '{name} atinge com fúria incontrolável!',
    'Magistral! {name} supera todas as expectativas!',
    '{name} canaliza toda a força em um único golpe!',
    'O ataque de {name} é absolutamente devastador!',
    '{name} explora uma brecha com precisão mortal!',
];
const _NARR_ALLY_MISS = [
    '{name} erra o alvo!',
    'O ataque de {name} passa de raspão.',
    '{name} não consegue conectar.',
    'O inimigo desvia do golpe de {name}.',
    '{name} precisa de mais precisão.',
    'O golpe de {name} não encontra o alvo.',
    '{name} ataca, mas o inimigo é ágil demais.',
    'A lâmina de {name} corta apenas o ar.',
    '{name} hesita — e perde a chance.',
    'O inimigo antecipa o golpe de {name}.',
];

function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function showNarration(text, cssClass) {
    const el = document.getElementById('diceNarration');
    if (!el) return;
    el.textContent = text;
    el.className = 'dice-narration ' + (cssClass || '');
    void el.offsetWidth;
    el.classList.add('visible');
}


function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Weather label → CSS class mapping
function _weatherClass(label) {
    if (!label) return 'w-clear';
    const l = label.toLowerCase();
    if (l.includes('chuva') || l.includes('garoa')) return 'w-rain';
    if (l.includes('tempest') || l.includes('raio') || l.includes('trovão')) return 'w-storm';
    if (l.includes('neve') || l.includes('gelo') || l.includes('granizo')) return 'w-snow';
    if (l.includes('névoa') || l.includes('neblina') || l.includes('bruma') || l.includes('nevoeiro')) return 'w-fog';
    if (l.includes('calor') || l.includes('seca') || l.includes('escaldante')) return 'w-hot';
    return 'w-clear';
}

// Classify feed entry text for colored left-border accent
function _classifyFeed(f) {
    if (!f) return '';
    const t = f.toLowerCase();
    if (t.includes('derrotou') || t.includes('abateu') || t.includes('caiu')) return 'feed-kill';
    if (t.includes('crítico') || t.includes('crit')) return 'feed-crit';
    if (t.includes('curou') || t.includes('cura') || t.includes('recuperou')) return 'feed-heal';
    if (t.includes('errou') || t.includes('falhou') || t.includes('resistiu') || t.includes('miss')) return 'feed-miss';
    if (t.includes('acertou') || t.includes('causou') || t.includes('dano')) return 'feed-hit';
    if (t.includes('salvaguarda') || t.includes('teste de')) return 'feed-save';
    if (t.includes('efeito') || t.includes('status') || t.includes('envenenad') || t.includes('atordoad') || t.includes('ceg')) return 'feed-status';
    if (t.includes('usou') || t.includes('ativou') || t.includes('lançou')) return 'feed-self';
    return '';
}

