/* vMergeDialog — Fase 4 do vínculo de contas (Sessão #68, 2026-06-01).
 *
 * Renderiza as >=3 opções de resolução de conflito (user #55) que o backend
 * devolve no 409 `linked_to_another_account` (campo `merge` = get_merge_options),
 * e executa a escolha via POST /api/auth/merge-accounts (dual-auth: re-passa a
 * credencial que o usuário acabou de provar).
 *
 * Self-contained (não depende do vPopup da cidade nem do /web/) para servir os
 * DOIS fluxos de conflito: Telegram (cidade) e Google (/web/). Usa design tokens
 * com fallback (regra No Hardcoded Values) + vOverlay quando disponível (SPA
 * cleanup) com fallback pra document.body.
 *
 * API:
 *   vMergeDialog.show({ api, token, credentialBody, mergeData, onMerged })
 *     - api: base URL da API
 *     - token: Bearer da sessão atual (conta A)
 *     - credentialBody: { provider, credential | initData | telegram_data } — re-prova B
 *     - mergeData: o objeto `merge` do 409 (options[], account_a, account_b, cap, total)
 *     - onMerged(data): callback após merge OK (recebe {account_id, token, characters})
 *
 * Cross-ref: docs/sistemas/account-linking-design.md §F, account_merge.py.
 */
(function (root) {
    'use strict';

    function _el(tag, css, html) {
        var e = document.createElement(tag);
        if (css) e.style.cssText = css;
        if (html != null) e.innerHTML = html;
        return e;
    }

    function _close(overlay) {
        try {
            if (root.vOverlay && root.vOverlay.remove) root.vOverlay.remove(overlay);
            else overlay.remove();
        } catch (_e) { try { overlay.remove(); } catch (_e2) { /* noqa: preflight */ } }
    }

    function _toast(msg) {
        if (root.vToast) root.vToast(msg);
    }

    function _exec(cfg, strategy, overlay) {
        if (root.vProcessing && root.vProcessing.show) root.vProcessing.show({ text: 'Mesclando contas…' });
        var payload = {};
        var cb = cfg.credentialBody || {};
        for (var k in cb) { if (Object.prototype.hasOwnProperty.call(cb, k)) payload[k] = cb[k]; }
        payload.strategy = strategy;
        // discard_one_side: por padrão mantém ESTA conta (a). Picker de >5 chars é futuro.
        if (strategy === 'discard_one_side') payload.keep_account = 'a';
        fetch(cfg.api + '/api/auth/merge-accounts', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + cfg.token, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }).then(function (r) {
            return r.json().then(function (data) {
                if (root.vProcessing && root.vProcessing.hide) root.vProcessing.hide();
                _close(overlay);
                if (r.ok && data.merged !== false) {
                    _toast('✓ Contas vinculadas!');
                    if (typeof cfg.onMerged === 'function') cfg.onMerged(data);
                } else {
                    _toast((data && data.error) ? data.error : 'Falha ao mesclar contas.');
                }
            });
        }).catch(function (err) {
            if (root.vProcessing && root.vProcessing.hide) root.vProcessing.hide();
            console.error('[MERGE-DIALOG] exec failed', err);
            _toast('⚠️ Erro de rede ao mesclar.');
        });
    }

    function show(cfg) {
        var merge = cfg.mergeData || {};
        var opts = merge.options || [];
        var a = merge.account_a || {}, b = merge.account_b || {};
        var overlay = _el('div', 'position:fixed;inset:0;z-index:var(--v-z-loading,1000);'
            + 'background:var(--v-overlay-bg,rgba(15,12,8,0.9));display:flex;align-items:center;'
            + 'justify-content:center;padding:var(--v-space-lg,16px)');
        var card = _el('div', 'background:var(--v-bg-card,#2e2520);border:1px solid var(--v-border,#4a3828);'
            + 'border-radius:var(--v-radius,10px);max-width:400px;width:100%;max-height:92vh;'
            + 'overflow-y:auto;padding:var(--v-space-xl,18px);color:var(--v-text,#d4c8b0);'
            + 'font-family:var(--v-font,serif)');
        card.appendChild(_el('h3', 'margin:0 0 var(--v-space-sm,8px);color:var(--v-gold,#c4953a);'
            + 'font-family:var(--v-font-display,serif)', 'Vincular contas'));
        card.appendChild(_el('p', 'font-size:var(--v-font-body,14px);line-height:1.5',
            'Esta credencial já tem personagens em outra conta. Como você quer resolver?<br>'
            + '<b>Esta conta:</b> ' + (a.char_count || 0) + ' · <b>A outra:</b> '
            + (b.char_count || 0) + ' personagem(ns).'));
        opts.forEach(function (opt) {
            var btn = _el('button', 'display:block;width:100%;margin:var(--v-space-sm,8px) 0;text-align:left;'
                + 'white-space:normal;padding:var(--v-space-md,10px);background:var(--v-bg-raised,#332a22);'
                + 'border:1px solid var(--v-border,#4a3828);border-radius:var(--v-radius-sm,6px);'
                + 'color:var(--v-text,#d4c8b0);cursor:pointer;font-family:inherit');
            // textContent (NÃO innerHTML) — defesa contra XSS caso label/result um dia
            // carregue dado controlado pelo jogador (ex: nome de personagem). Review F6.
            var bold = document.createElement('b');
            bold.textContent = opt.label || '';
            var span = document.createElement('span');
            span.style.cssText = 'opacity:.8;font-size:.85em';
            span.textContent = opt.result || '';
            btn.appendChild(bold);
            btn.appendChild(document.createElement('br'));
            btn.appendChild(span);
            btn.addEventListener('click', function () { _exec(cfg, opt.id, overlay); });
            card.appendChild(btn);
        });
        var cancel = _el('button', 'display:block;width:100%;margin-top:var(--v-space-xs,4px);'
            + 'padding:var(--v-space-sm,8px);background:transparent;border:1px solid var(--v-border,#4a3828);'
            + 'border-radius:var(--v-radius-sm,6px);color:var(--v-text-dim,#a09484);cursor:pointer;'
            + 'font-family:inherit', 'Cancelar');
        cancel.addEventListener('click', function () { _close(overlay); });
        card.appendChild(cancel);
        overlay.appendChild(card);
        if (root.vOverlay && root.vOverlay.add) root.vOverlay.add(overlay);
        else document.body.appendChild(overlay);
    }

    root.vMergeDialog = { show: show };
})(typeof window !== 'undefined' ? window : this);
