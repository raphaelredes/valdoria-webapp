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

    function _renderCharList(chars, emptyText) {
        if (!chars || !chars.length) {
            return '<div style="font-size:12px;color:var(--v-text-dim,#a09484);font-style:italic;padding:4px 0">' + (emptyText || 'Nenhum personagem registrado.') + '</div>';
        }
        var h = '<ul style="margin:4px 0 0;padding-left:18px;font-size:12.5px;color:var(--v-text,#d4c8b0);line-height:1.4">';
        for (var i = 0; i < chars.length; i++) {
            var c = chars[i];
            var cName = (c && c.name) ? c.name : 'Aventureiro';
            var cLvl = (c && c.level) ? ('Nv. ' + c.level) : '';
            h += '<li><b>' + cName + '</b> ' + (cLvl ? ('(' + cLvl + ')') : '') + '</li>';
        }
        h += '</ul>';
        return h;
    }

    function _showConfirm(cfg, opt, overlay) {
        var card = overlay.querySelector('.merge-card-body');
        if (!card) return;
        card.innerHTML = '';

        card.appendChild(_el('h3', 'margin:0 0 var(--v-space-sm,8px);color:var(--v-gold,#c4953a);'
            + 'font-family:var(--v-font-display,serif)', 'Confirmar Resolução'));

        var infoBox = _el('div', 'background:rgba(15,12,8,0.6);border:1px solid var(--v-border,#4a3828);'
            + 'border-radius:6px;padding:10px 12px;margin:8px 0;font-size:13px;line-height:1.45');
        infoBox.innerHTML = '<div style="color:#ffd700;font-weight:700;margin-bottom:4px">O Que Está Sendo Escolhido:</div>'
            + '<div>' + (opt.label || '') + '</div>'
            + '<div style="color:var(--v-text-dim,#a09484);font-size:12px;margin-top:6px">'
            + '<b>Consequência:</b> ' + (opt.result || '') + '<br>'
            + '🛡 <i>Um backup completo do estado de ambas as contas é gravado automaticamente antes da operação.</i>'
            + '</div>';
        card.appendChild(infoBox);

        var btnConfirm = _el('button', 'display:block;width:100%;margin:12px 0 6px;'
            + 'padding:12px;background:linear-gradient(180deg,#8b2616,#5e1a0e);border:1px solid #d45b45;'
            + 'border-radius:6px;color:#fff;font-weight:700;cursor:pointer;font-family:inherit;font-size:14px',
            '✔ Confirmar e Prosseguir');
        btnConfirm.addEventListener('click', function () {
            _exec(cfg, opt.id, overlay);
        });
        card.appendChild(btnConfirm);

        var btnBack = _el('button', 'display:block;width:100%;margin-top:6px;'
            + 'padding:10px;background:transparent;border:1px solid var(--v-border,#4a3828);'
            + 'border-radius:6px;color:var(--v-text-dim,#a09484);cursor:pointer;font-family:inherit;font-size:13px',
            '← Voltar às opções');
        btnBack.addEventListener('click', function () {
            _renderOptions(cfg, overlay);
        });
        card.appendChild(btnBack);
    }

    function _renderOptions(cfg, overlay) {
        var merge = cfg.mergeData || {};
        var opts = merge.options || [];
        var a = merge.account_a || {}, b = merge.account_b || {};

        var card = overlay.querySelector('.merge-card-body');
        if (!card) return;
        card.innerHTML = '';

        card.appendChild(_el('h3', 'margin:0 0 var(--v-space-sm,8px);color:var(--v-gold,#c4953a);'
            + 'font-family:var(--v-font-display,serif)', 'Vincular Contas Existentes'));

        card.appendChild(_el('p', 'font-size:var(--v-font-body,13.5px);line-height:1.45;margin:0 0 10px',
            'A credencial informada já está associada a outra conta em Valdoria. '
            + 'Revise os personagens de cada conta e selecione como deseja resolver a unificação:'));

        var summary = _el('div', 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px');

        var boxA = _el('div', 'background:rgba(15,12,8,0.5);border:1px solid var(--v-border,#4a3828);'
            + 'border-radius:6px;padding:8px 10px');
        boxA.innerHTML = '<div style="color:var(--v-gold,#c4953a);font-weight:700;font-size:12px;margin-bottom:2px">Esta Conta (' + (a.char_count || 0) + ')</div>'
            + _renderCharList(a.chars, 'Nenhum ativo');
        summary.appendChild(boxA);

        var boxB = _el('div', 'background:rgba(15,12,8,0.5);border:1px solid var(--v-border,#4a3828);'
            + 'border-radius:6px;padding:8px 10px');
        boxB.innerHTML = '<div style="color:#d4a040;font-weight:700;font-size:12px;margin-bottom:2px">Outra Conta (' + (b.char_count || 0) + ')</div>'
            + _renderCharList(b.chars, 'Nenhum ativo');
        summary.appendChild(boxB);

        card.appendChild(summary);

        opts.forEach(function (opt) {
            var btn = _el('button', 'display:block;width:100%;margin:var(--v-space-sm,6px) 0;text-align:left;'
                + 'white-space:normal;padding:var(--v-space-md,10px);background:var(--v-bg-raised,#332a22);'
                + 'border:1px solid var(--v-border,#4a3828);border-radius:var(--v-radius-sm,6px);'
                + 'color:var(--v-text,#d4c8b0);cursor:pointer;font-family:inherit;transition:border-color .15s');
            btn.onmouseenter = function () { btn.style.borderColor = '#c4953a'; };
            btn.onmouseleave = function () { btn.style.borderColor = 'var(--v-border,#4a3828)'; };

            var bold = document.createElement('b');
            bold.style.cssText = 'color:#ffd700;display:block;margin-bottom:2px;font-size:13px';
            bold.textContent = opt.label || '';
            var span = document.createElement('span');
            span.style.cssText = 'opacity:.85;font-size:11.5px;color:var(--v-text-dim,#a09484);display:block';
            span.textContent = opt.result || '';
            btn.appendChild(bold);
            btn.appendChild(span);
            btn.addEventListener('click', function () { _showConfirm(cfg, opt, overlay); });
            card.appendChild(btn);
        });

        var cancel = _el('button', 'display:block;width:100%;margin-top:var(--v-space-sm,8px);'
            + 'padding:var(--v-space-sm,8px);background:transparent;border:1px solid var(--v-border,#4a3828);'
            + 'border-radius:var(--v-radius-sm,6px);color:var(--v-text-dim,#a09484);cursor:pointer;'
            + 'font-family:inherit;font-size:13px', 'Cancelar e Fechar');
        cancel.addEventListener('click', function () { _close(overlay); });
        card.appendChild(cancel);
    }

    function show(cfg) {
        var overlay = _el('div', 'position:fixed;inset:0;z-index:var(--v-z-loading,1000);'
            + 'background:var(--v-overlay-bg,rgba(15,12,8,0.9));display:flex;align-items:center;'
            + 'justify-content:center;padding:var(--v-space-lg,16px)');
        var card = _el('div', 'background:var(--v-bg-card,#2e2520);border:1px solid var(--v-border,#4a3828);'
            + 'border-radius:var(--v-radius,10px);max-width:440px;width:100%;max-height:92vh;'
            + 'overflow-y:auto;padding:var(--v-space-xl,18px);color:var(--v-text,#d4c8b0);'
            + 'font-family:var(--v-font,serif);box-shadow:0 12px 32px rgba(0,0,0,0.8)');
        card.className = 'merge-card-body';
        overlay.appendChild(card);

        if (root.vOverlay && root.vOverlay.add) root.vOverlay.add(overlay);
        else document.body.appendChild(overlay);

        _renderOptions(cfg, overlay);
    }

    root.vMergeDialog = { show: show };
})(typeof window !== 'undefined' ? window : this);
