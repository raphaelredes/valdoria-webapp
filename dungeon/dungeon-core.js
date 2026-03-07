// ═══════════════════════════════════════════════════════════════
// DUNGEON CORE — State management, API, initialization
// ═══════════════════════════════════════════════════════════════

let tg = null;
let _actionSent = false;

const S = {
    token: '',
    api: '',
    uid: 0,
    dungeonId: '',
    dungeonName: '',
    floor: 1,
    currentNode: 0,
    nodes: [],       // [{id, type, label, visited, current, available, x?, y?}]
    paths: [],       // [[fromId, toId]]
    biome: 'cave',   // cave, swamp, volcanic, crypt, ruins
};

// Room type icons
const NODE_ICONS = {
    combat:   '\u2694\uFE0F',  // ⚔️
    treasure: '\uD83D\uDC8E',  // 💎 (using direct emoji is fine)
    campfire: '\uD83D\uDD25',  // 🔥
    boss:     '\uD83D\uDC80',  // 💀
    mystery:  '\u2753',        // ❓
    trap:     '\u26A0\uFE0F',  // ⚠️
    shrine:   '\u2728',        // ✨
    entrance: '\uD83D\uDEAA',  // 🚪
    lore:     '\uD83D\uDCDC',  // 📜
    empty:    '\u00B7',        // ·
};

async function initDungeon() {
    try {
        tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand();
            try { tg.disableVerticalSwipes(); } catch (e) { }
            if (tg.BackButton) {
                tg.BackButton.show();
                tg.BackButton.onClick(() => handleRetreat());
            }
        }

        const params = new URLSearchParams(window.location.search);
        S.token = params.get('token') || '';
        S.api = params.get('api') || '';
        S.uid = parseInt(params.get('uid') || '0');
        S.returnTo = params.get('return') || 'game';
        const dataB64 = params.get('data') || '';

        if (!dataB64) {
            showError('Dados da masmorra nao encontrados');
            return;
        }

        const data = await decompressPayload(dataB64);
        if (!data) {
            showError('Falha ao carregar masmorra');
            return;
        }

        // Load state
        S.dungeonId = data.id || '';
        S.dungeonName = data.name || 'Masmorra';
        S.floor = data.floor || 1;
        S.currentNode = data.current || 0;
        S.nodes = data.nodes || [];
        S.paths = data.paths || [];
        S.biome = data.biome || 'cave';

        // Update HUD
        document.getElementById('hud-name').textContent = S.dungeonName;
        document.getElementById('hud-floor').textContent = `Andar ${S.floor}`;

        // Render map
        renderDungeonMap();

        // Start ambient particles
        initDungeonParticles();

        // Hide loading
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
        }, 300);

    } catch (e) {
        showError('Erro ao inicializar masmorra', e);
    }
}

// ── Payload decompression (same as navigate) ──
async function decompressPayload(b64) {
    try {
        const std = b64.replace(/-/g, '+').replace(/_/g, '/');
        const binary = atob(std);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const ds = new DecompressionStream('deflate');
        const writer = ds.writable.getWriter();
        writer.write(bytes);
        writer.close();
        const reader = ds.readable.getReader();
        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }
        const totalLen = chunks.reduce((s, c) => s + c.length, 0);
        const merged = new Uint8Array(totalLen);
        let offset = 0;
        for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
        return JSON.parse(new TextDecoder().decode(merged));
    } catch (e) {
        console.error('[DUNGEON] Decompress failed:', e);
        return null;
    }
}

// ── Actions ──
function handleNodeTap(nodeId) {
    const node = S.nodes.find(n => n.id === nodeId);
    if (!node || !node.available) return;

    try { tg?.HapticFeedback?.impactOccurred('light'); } catch (e) { }

    if (node.type === 'boss') {
        showBossReveal(node);
        return;
    }

    showEvent(node);
}

function sendAction(action, nodeId) {
    if (_actionSent) return;
    _actionSent = true;

    if (!S.api) {
        showError('API nao configurada');
        setTimeout(() => { _actionSent = false; }, 2000);
        return;
    }

    const payload = {
        action: 'dungeon_action',
        token: S.token,
        uid: S.uid,
        dungeon_id: S.dungeonId,
        node_id: nodeId,
        type: action,
    };

    const h = { 'Content-Type': 'application/json' };
    if (window.Telegram?.WebApp?.initData) h['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
    h['ngrok-skip-browser-warning'] = '1';

    fetchT(S.api + '/api/dungeon/action', {
        method: 'POST', headers: h,
        body: JSON.stringify(payload),
    })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(d => {
        if (d.url) { window.location.replace(d.url); return; }
        if (d.nodes) {
            S.nodes = d.nodes;
            S.paths = d.paths || S.paths;
            S.currentNode = d.current || S.currentNode;
            S.floor = d.floor || S.floor;
            document.getElementById('hud-floor').textContent = `Andar ${S.floor}`;
            renderDungeonMap();
        }
        _actionSent = false;
        closeEvent();
    })
    .catch(e => {
        console.error('[DUNGEON] Action error:', e);
        showError('Erro: ' + e.message);
        _actionSent = false;
    });
}

function handleRetreat() {
    if (!S.api || !S.token) {
        try { tg?.close(); } catch (e) { }
        return;
    }
    _transitionToGame();
}

async function _transitionToGame() {
    const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + S.token };
    if (window.Telegram?.WebApp?.initData) h['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
    h['ngrok-skip-browser-warning'] = '1';
    h['X-Idempotency-Key'] = crypto.randomUUID();
    try {
        const r = await fetchT(S.api + '/api/webapp/transition', {
            method: 'POST', headers: h,
            body: JSON.stringify({ from: 'dungeon', to: (S.returnTo || 'game'), user_id: S.uid, payload: {} })
        });
        const d = await r.json();
        if (d.url) { window.location.replace(d.url); return; }
    } catch (e) { console.error('[DUNGEON] transition error:', e); }
    try { tg?.close(); } catch (e) { }
}

// ── Error handling ──
function showError(msg, err = null) {
    console.error('[DUNGEON]', msg, err || '');
    const toast = document.createElement('div');
    toast.className = 'v-toast-error';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
    document.getElementById('loading').classList.add('hidden');
}

// ── Button handlers ──
document.getElementById('btn-inventory')?.addEventListener('click', () => {
    // Future: open inventory overlay
    try { tg?.HapticFeedback?.impactOccurred('light'); } catch (e) { }
});
document.getElementById('btn-retreat')?.addEventListener('click', handleRetreat);

// ── Boot ──
document.addEventListener('DOMContentLoaded', initDungeon);
