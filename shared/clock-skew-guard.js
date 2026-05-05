/**
 * clock-skew-guard.js — Detecta relógio errado no device.
 *
 * USER REQUEST 2026-05-04: jogador estava com NET::ERR_CERT_DATE_INVALID
 * em mobile (relógio do celular fora do range válido do cert TLS). Esta
 * função detecta o problema PROATIVAMENTE quando o app carrega — antes que
 * outras requests falhem por cert.
 *
 * Como funciona:
 *   1. Quando app carrega, faz HEAD request a qualquer endpoint API
 *   2. Lê header `Date:` da response (servidor envia hora UTC correta)
 *   3. Compara com `Date.now()` local
 *   4. Se skew > 12h → mostra overlay medieval com instruções de fix
 *
 * Limitação: só funciona se o app conseguiu carregar (TLS handshake OK).
 * Quando o cert falha, o user vê tela do sistema (NET::ERR_CERT_DATE_INVALID)
 * — esse caso é tratado pelo bot via comando /ajuda (curativo).
 *
 * Uso: include via document.write ou import em qualquer WebApp.
 *
 * MAPA_IA:
 *   ~25  config (THRESHOLD, TEXTS)
 *   ~60  init() — fetch API + compare clocks
 *   ~120 _showOverlay() — DOM medieval AAA
 *   ~250 styles (CSS injetado)
 */

(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (window.ValdoriaClockGuard) return;

  // ── Config ────────────────────────────────────────────────────────
  var SKEW_THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12h — só alerta se MUITO errado
  var SUPPRESS_KEY = 'valdoria_clock_skew_dismissed';
  var SUPPRESS_TTL_MS = 24 * 60 * 60 * 1000; // 24h após dismissão

  // ── State ─────────────────────────────────────────────────────────
  var _checked = false;

  /**
   * Inicia o check. Chama API discovery + compara relógio.
   * @param {Object} [opts]
   * @param {string} [opts.apiBase] — base URL pra HEAD request
   * @param {function} [opts.onSkew] — callback(skewMs) se detectado
   */
  function init(opts) {
    if (_checked) return;
    _checked = true;
    opts = opts || {};

    // Suppress se user já dispensou recentemente
    try {
      var dismissedTs = parseInt(localStorage.getItem(SUPPRESS_KEY) || '0', 10);
      if (Date.now() - dismissedTs < SUPPRESS_TTL_MS) {
        console.info('[CLOCK-GUARD] suppressed (dismissed recently)');
        return;
      }
    } catch (_e) { /* localStorage indispo */ }

    // Resolver API base — várias formas
    var apiBase = opts.apiBase
      || window.__EXPLORE_API_BASE
      || window.__GAME_API_BASE
      || (window.ValdoriaApi && window.ValdoriaApi.base)
      || 'https://api.lendasdevaldoria.com.br';

    // Strip trailing slash
    apiBase = String(apiBase).replace(/\/+$/, '');

    // HEAD request — mínimo overhead
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var tid = ctrl ? setTimeout(function () { ctrl.abort(); }, 7000) : null;

    fetch(apiBase + '/api/game/health', {
      method: 'HEAD',
      cache: 'no-store',
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (r) {
      if (tid) clearTimeout(tid);
      if (!r) return;
      var serverDate = r.headers.get('date');
      if (!serverDate) return;
      var serverMs = Date.parse(serverDate);
      if (isNaN(serverMs)) return;
      var deviceMs = Date.now();
      var skew = deviceMs - serverMs; // positivo = device adiantado

      // Compensa latência: assumir 200ms RTT — ignorável vs 12h threshold
      console.info('[CLOCK-GUARD] server=' + new Date(serverMs).toISOString()
        + ' device=' + new Date(deviceMs).toISOString()
        + ' skew=' + Math.round(skew / 1000 / 60) + 'min');

      if (Math.abs(skew) > SKEW_THRESHOLD_MS) {
        console.warn('[CLOCK-GUARD] skew detected: ' + Math.round(skew / 1000 / 60 / 60) + 'h');
        if (typeof opts.onSkew === 'function') opts.onSkew(skew);
        _showOverlay(skew, serverMs);
      }
    }).catch(function (e) {
      if (tid) clearTimeout(tid);
      // Network error — silencioso (pode ser offline, não cert error)
      console.debug('[CLOCK-GUARD] check failed:', e && e.message);
    });
  }

  /**
   * Mostra overlay medieval AAA com instruções de fix.
   * Não-bloqueante — user pode dispensar e tentar jogar mesmo assim.
   */
  function _showOverlay(skewMs, serverMs) {
    if (document.getElementById('valdoria-clock-skew-overlay')) return;
    _injectCSS();

    var skewHours = Math.abs(Math.round(skewMs / 1000 / 60 / 60));
    var skewDays = Math.round(skewHours / 24);
    var ahead = skewMs > 0;

    var skewText;
    if (skewHours < 48) {
      skewText = skewHours + ' hora' + (skewHours !== 1 ? 's' : '');
    } else {
      skewText = skewDays + ' dia' + (skewDays !== 1 ? 's' : '');
    }
    skewText += ahead ? ' adiantado' : ' atrasado';

    var serverDateBR = new Date(serverMs).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    var deviceDateBR = new Date().toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    var ov = document.createElement('div');
    ov.id = 'valdoria-clock-skew-overlay';
    ov.className = 'vcsg-overlay';
    ov.innerHTML = ''
      + '<div class="vcsg-card">'
      + '  <div class="vcsg-icon">⏳</div>'
      + '  <h2 class="vcsg-title">Relógio Desalinhado</h2>'
      + '  <p class="vcsg-flavor">Aventureiro, o tempo do seu dispositivo'
      + '     está fora de sincronia com o reino.</p>'
      + '  <div class="vcsg-info">'
      + '    <div class="vcsg-info-row"><span>📱 Seu aparelho:</span><b>' + deviceDateBR + '</b></div>'
      + '    <div class="vcsg-info-row"><span>🏰 Reino:</span><b>' + serverDateBR + '</b></div>'
      + '    <div class="vcsg-info-row vcsg-skew"><span>Diferença:</span><b>' + skewText + '</b></div>'
      + '  </div>'
      + '  <div class="vcsg-instructions">'
      + '    <p class="vcsg-step-title">⚙️ Como corrigir:</p>'
      + '    <p class="vcsg-step"><b>Android:</b> Configurações → Sistema → Data e hora → ative <b>"Definir hora automaticamente"</b></p>'
      + '    <p class="vcsg-step"><b>iPhone:</b> Ajustes → Geral → Data e Hora → ative <b>"Definir Automaticamente"</b></p>'
      + '  </div>'
      + '  <p class="vcsg-warning">⚠️ Se ignorar, pode ter erros de "conexão não privada" e não conseguir abrir áreas do jogo.</p>'
      + '  <div class="vcsg-actions">'
      + '    <button class="vcsg-btn vcsg-btn-primary" id="vcsg-fixed">Já ajustei</button>'
      + '    <button class="vcsg-btn vcsg-btn-secondary" id="vcsg-dismiss">Continuar mesmo assim</button>'
      + '  </div>'
      + '</div>';

    document.body.appendChild(ov);

    document.getElementById('vcsg-fixed').addEventListener('click', function () {
      // User diz que ajustou — recheck imediato
      ov.remove();
      _checked = false;
      setTimeout(function () { init(); }, 100);
    });

    document.getElementById('vcsg-dismiss').addEventListener('click', function () {
      try { localStorage.setItem(SUPPRESS_KEY, String(Date.now())); } catch (_e) {}
      ov.remove();
    });
  }

  /**
   * Injeta CSS medieval AAA. Idempotente.
   */
  function _injectCSS() {
    if (document.getElementById('vcsg-style')) return;
    var st = document.createElement('style');
    st.id = 'vcsg-style';
    st.textContent = ''
      + '.vcsg-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;'
      + '  background:radial-gradient(ellipse at 50% 35%,#352818 0%,#1a1510 60%,#0a0805 100%);'
      + '  font-family:var(--v-font,"MedievalSharp","Cinzel",serif);color:var(--v-text,#d4c8b0);padding:16px;'
      + '  animation:vcsgFadeIn 0.4s ease-out}'
      + '@keyframes vcsgFadeIn{from{opacity:0}to{opacity:1}}'
      + '.vcsg-card{background:linear-gradient(180deg,#3a2e22 0%,#2a2218 100%);'
      + '  border:1px solid rgba(196,149,58,0.6);border-radius:12px;padding:20px;'
      + '  max-width:400px;width:100%;max-height:90vh;overflow-y:auto;'
      + '  box-shadow:0 8px 32px rgba(0,0,0,0.7),0 0 24px rgba(196,149,58,0.15)}'
      + '.vcsg-icon{font-size:42px;text-align:center;margin-bottom:8px;'
      + '  filter:drop-shadow(0 2px 8px rgba(196,149,58,0.4))}'
      + '.vcsg-title{font-family:var(--v-font-display,"Cinzel",serif);font-weight:700;'
      + '  color:#c4953a;font-size:22px;text-align:center;margin:0 0 12px;letter-spacing:2px;'
      + '  text-shadow:0 0 16px rgba(196,149,58,0.3)}'
      + '.vcsg-flavor{font-style:italic;text-align:center;color:#a09484;font-size:13px;'
      + '  line-height:1.5;margin:0 0 16px}'
      + '.vcsg-info{background:rgba(15,12,8,0.6);border:1px solid rgba(196,149,58,0.25);'
      + '  border-radius:6px;padding:12px;margin-bottom:14px}'
      + '.vcsg-info-row{display:flex;justify-content:space-between;font-size:12px;padding:3px 0}'
      + '.vcsg-info-row span{color:#a09484}'
      + '.vcsg-info-row b{color:#d4c8b0;font-weight:600}'
      + '.vcsg-info-row.vcsg-skew{margin-top:4px;padding-top:8px;border-top:1px solid rgba(196,149,58,0.2)}'
      + '.vcsg-info-row.vcsg-skew b{color:#e87474}'
      + '.vcsg-instructions{background:rgba(74,56,40,0.3);border-left:3px solid #c4953a;'
      + '  padding:10px 12px;margin-bottom:12px;border-radius:0 6px 6px 0}'
      + '.vcsg-step-title{font-family:var(--v-font-display,"Cinzel",serif);color:#c4953a;'
      + '  font-size:12px;letter-spacing:1px;margin:0 0 6px;font-weight:700}'
      + '.vcsg-step{font-size:11px;color:#d4c8b0;line-height:1.5;margin:4px 0}'
      + '.vcsg-step b{color:#e8c45a}'
      + '.vcsg-warning{font-size:11px;color:#e87474;font-style:italic;text-align:center;'
      + '  margin:8px 0 14px;line-height:1.4}'
      + '.vcsg-actions{display:flex;flex-direction:column;gap:8px}'
      + '.vcsg-btn{padding:10px 18px;border-radius:8px;font-family:var(--v-font-display,"Cinzel",serif);'
      + '  font-size:13px;font-weight:600;cursor:pointer;letter-spacing:1px;text-transform:uppercase;'
      + '  transition:transform 0.1s,border-color 0.15s,background 0.15s;min-height:42px}'
      + '.vcsg-btn:active{transform:scale(0.96)}'
      + '.vcsg-btn-primary{background:linear-gradient(180deg,#c4953a,#9a7530);color:#1a1510;'
      + '  border:1px solid #c4953a;box-shadow:0 2px 8px rgba(196,149,58,0.35)}'
      + '.vcsg-btn-primary:hover{background:linear-gradient(180deg,#d4a54a,#a78540)}'
      + '.vcsg-btn-secondary{background:transparent;color:#a09484;border:1px solid rgba(196,149,58,0.35)}'
      + '.vcsg-btn-secondary:hover{border-color:#c4953a;color:#c4953a}';
    document.head.appendChild(st);
  }

  // Public API
  window.ValdoriaClockGuard = {
    init: init,
  };

  // Auto-init quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () { init(); }, 1500); // pequeno delay pra app carregar primeiro
    });
  } else {
    setTimeout(function () { init(); }, 1500);
  }
})();
