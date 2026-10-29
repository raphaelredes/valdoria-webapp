/**
 * ValdoriaTransitionLoader & ValdoriaScreenLoader v2.0
 *
 * Padrão canônico unificado em todo o projeto para carregamento prévio de novas telas
 * e avisos de instabilidade/reconexão:
 * - Fundo escuro radial (#261c14 -> #1a1510 -> #0d0a08), sem caixas/cards e sem emojis
 * - Anel externo contínuo dourado girando em sentido horário (cityRingCW 7s)
 * - Anel interno tracejado dourado girando em sentido anti-horário (cityRingCCW 4.5s)
 * - Losango central (◆) pulsante (cityCorePulse 2.8s)
 * - 3 fagulhas douradas ascendentes (cityEmberFloat)
 * - Título em Cinzel (14px, dourado com cityTextShimmer) + Subtítulo em Marcellus itálico (12px)
 * - Suporte integrado a estado de instabilidade mantendo a animação ativa no centro
 */
(function(global){
    'use strict';

    var _hidden = false;
    var _showActive = false;
    var _slowTimer = null;
    var _instabilityTimer = null;

    var _flavorTips = [
        'Preparando sua aventura…',
        'Reunindo a comitiva…',
        'Consultando os pergaminhos…',
        'Sincronizando os caminhos de Valdória…',
        'Abrindo os portões do reino…'
    ];

    function _ensureStyles() {
        if (typeof document === 'undefined' || !document.head) return;
        if (document.getElementById('vld-std-ring-loader-css')) return;
        var st = document.createElement('style');
        st.id = 'vld-std-ring-loader-css';
        st.textContent = [
            '@keyframes cityRingCW{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}',
            '@keyframes cityRingCCW{0%{transform:rotate(0deg)}100%{transform:rotate(-360deg)}}',
            '@keyframes cityCorePulse{0%,100%{transform:scale(.92);opacity:.7}50%{transform:scale(1.1);opacity:1}}',
            '@keyframes cityTextShimmer{0%,100%{opacity:.75}50%{opacity:1}}',
            '@keyframes cityEmberFloat{0%{transform:translate3d(0,0,0);opacity:0}20%{opacity:.8}80%{opacity:.4}100%{transform:translate3d(var(--ex,8px),-45px,0);opacity:0}}',
            '.vld-std-loader-bg{background:radial-gradient(ellipse at center,#261c14 0%,#1a1510 60%,#0d0a08 100%) !important;}',
            '.vld-std-loader-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 24px;text-align:center;max-width:340px;width:100%;margin:0 auto;box-sizing:border-box;user-select:none;}',
            '.vld-std-emblem{position:relative;width:68px;height:68px;margin:0 auto 20px;flex-shrink:0;}',
            '.vld-std-emblem-glow{position:absolute;inset:-16px;border-radius:50%;background:radial-gradient(circle,rgba(196,149,58,.15) 0%,transparent 70%);pointer-events:none;}',
            '.vld-std-ring-cw{position:absolute;inset:0;border-radius:50%;border:1.5px solid rgba(196,149,58,.28);border-top-color:#e8c868;border-right-color:rgba(196,149,58,.65);box-shadow:0 0 14px rgba(196,149,58,.18);animation:cityRingCW 7s linear infinite;}',
            '.vld-std-ring-ccw{position:absolute;inset:9px;border-radius:50%;border:1px dashed rgba(196,149,58,.45);border-bottom-color:#c4953a;animation:cityRingCCW 4.5s linear infinite;}',
            '.vld-std-core{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#e8c868;font-size:16px;text-shadow:0 0 10px rgba(232,200,104,.85);animation:cityCorePulse 2.8s ease-in-out infinite;line-height:1;}',
            '.vld-std-ember-1{position:absolute;bottom:8px;left:20%;width:2.5px;height:2.5px;border-radius:50%;background:#e8c868;box-shadow:0 0 6px #e8c868;--ex:-9px;animation:cityEmberFloat 2.6s ease-out infinite .2s;pointer-events:none;}',
            '.vld-std-ember-2{position:absolute;bottom:6px;left:50%;width:2px;height:2px;border-radius:50%;background:#f3dc92;box-shadow:0 0 5px #f3dc92;--ex:5px;animation:cityEmberFloat 3.1s ease-out infinite 1.1s;pointer-events:none;}',
            '.vld-std-ember-3{position:absolute;bottom:10px;left:76%;width:2.5px;height:2.5px;border-radius:50%;background:#c4953a;box-shadow:0 0 6px #c4953a;--ex:11px;animation:cityEmberFloat 2.8s ease-out infinite .6s;pointer-events:none;}',
            '.vld-std-title{font-family:"Cinzel",Georgia,serif;font-size:14px;font-weight:700;color:#c4953a;letter-spacing:3px;text-transform:uppercase;text-shadow:0 2px 10px rgba(0,0,0,.85),0 0 18px rgba(196,149,58,.25);animation:cityTextShimmer 2.5s ease-in-out infinite;line-height:1.45;}',
            '.vld-std-sub{margin-top:8px;font-family:"Marcellus",Georgia,serif;font-size:12px;color:rgba(196,149,58,.75);letter-spacing:1px;font-style:italic;line-height:1.55;max-width:300px;}',
            '.vld-std-hint{margin-top:8px;font-family:"Marcellus",Georgia,serif;font-size:12px;color:#d4a843;letter-spacing:0.6px;font-style:italic;line-height:1.5;max-width:300px;}',
            '.vld-std-actions{margin-top:22px;display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;max-width:220px;}',
            '.vld-std-btn-primary{width:100%;padding:10px 20px;border-radius:6px;border:1px solid rgba(196,149,58,.45);background:linear-gradient(180deg,rgba(196,149,58,.2) 0%,rgba(196,149,58,.08) 100%);color:#e8c868;font-family:"Cinzel",Georgia,serif;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;cursor:pointer;}',
            '.vld-std-btn-secondary{width:100%;padding:8px 18px;border-radius:6px;border:1px solid rgba(196,149,58,.22);background:transparent;color:#a89880;font-family:"Cinzel",Georgia,serif;font-size:11.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;cursor:pointer;}'
        ].join('\n');
        document.head.appendChild(st);
    }

    function _esc(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function buildEmblemHTML() {
        return (
            '<div class="vld-std-emblem" aria-hidden="true">' +
                '<div class="vld-std-emblem-glow"></div>' +
                '<div class="vld-std-ring-cw"></div>' +
                '<div class="vld-std-ring-ccw"></div>' +
                '<div class="vld-std-core">&#9670;</div>' +
                '<div class="vld-std-ember-1"></div>' +
                '<div class="vld-std-ember-2"></div>' +
                '<div class="vld-std-ember-3"></div>' +
            '</div>'
        );
    }

    function buildContentHTML(opts) {
        opts = opts || {};
        var title = opts.title || 'Entrando em Valdória…';
        var subtitle = opts.subtitle != null ? opts.subtitle : 'Preparando sua aventura…';
        var hint = opts.hint || '';
        var showActions = !!opts.showActions;
        var retryLabel = opts.retryLabel || 'Tentar Novamente';
        var closeLabel = opts.closeLabel || 'Fechar';
        var canClose = opts.showClose != null ? !!opts.showClose : !!(global.Telegram && global.Telegram.WebApp && typeof global.Telegram.WebApp.close === 'function');

        var html = '<div class="vld-std-loader-wrap">' +
            buildEmblemHTML() +
            '<div class="vld-std-title loading-stage" id="vld-std-title">' + _esc(title) + '</div>' +
            (subtitle ? '<div class="vld-std-sub loading-tip" id="vld-std-sub">' + _esc(subtitle) + '</div>' : '<div class="vld-std-sub loading-tip" id="vld-std-sub" style="display:none"></div>') +
            (hint ? '<div class="vld-std-hint" id="vld-std-hint">' + _esc(hint) + '</div>' : '<div class="vld-std-hint" id="vld-std-hint" style="display:none"></div>');

        if (showActions) {
            html += '<div class="vld-std-actions" id="vld-std-actions">' +
                '<button type="button" class="vld-std-btn-primary" id="vld-std-retry-btn">' + _esc(retryLabel) + '</button>' +
                (canClose ? '<button type="button" class="vld-std-btn-secondary" id="vld-std-close-btn">' + _esc(closeLabel) + '</button>' : '') +
            '</div>';
        } else {
            html += '<div class="vld-std-actions" id="vld-std-actions" style="display:none"></div>';
        }
        html += '</div>';
        return html;
    }

    function renderInto(container, opts) {
        if (!container) return null;
        _ensureStyles();
        opts = opts || {};
        container.classList.add('vld-std-loader-bg');
        container.style.cssText = 'position:fixed;inset:0;z-index:' + (opts.zIndex || 99999) + ';display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#261c14 0%,#1a1510 60%,#0d0a08 100%);padding:24px;box-sizing:border-box;opacity:1;pointer-events:auto;';
        container.innerHTML = buildContentHTML(opts);

        var retryBtn = container.querySelector('#vld-std-retry-btn');
        if (retryBtn) {
            retryBtn.onclick = function() {
                if (typeof opts.onRetry === 'function') {
                    opts.onRetry();
                } else {
                    try {
                        var u = new URL(global.location.href);
                        u.searchParams.set('_cb', String(Date.now()));
                        global.location.replace(u.toString());
                    } catch (_e) {
                        global.location.reload();
                    }
                }
            };
        }
        var closeBtn = container.querySelector('#vld-std-close-btn');
        if (closeBtn) {
            closeBtn.onclick = function() {
                if (typeof opts.onClose === 'function') {
                    opts.onClose();
                } else if (global.Telegram && global.Telegram.WebApp && typeof global.Telegram.WebApp.close === 'function') {
                    global.Telegram.WebApp.close();
                }
            };
        }
        return container;
    }

    function _clearTimers() {
        if (_slowTimer) { clearTimeout(_slowTimer); _slowTimer = null; }
        if (_instabilityTimer) { clearTimeout(_instabilityTimer); _instabilityTimer = null; }
    }

    function _getOrCreateOverlay() {
        var ld = document.getElementById('loading');
        if (!ld && document.body) {
            ld = document.createElement('div');
            ld.id = 'loading';
            ld.className = 'loading-overlay';
            document.body.appendChild(ld);
        }
        return ld;
    }

    function _populate(label, subtitle) {
        if (typeof document === 'undefined') return false;
        var ld = _getOrCreateOverlay();
        if (!ld) return false;
        var tip = subtitle || _flavorTips[Math.floor(Math.random() * _flavorTips.length)];
        renderInto(ld, {
            title: label || 'Entrando em Valdória…',
            subtitle: tip,
            showActions: false,
            zIndex: 99995
        });
        _hidden = false;
        return true;
    }

    function show(label, subtitle) {
        _showActive = true;
        _clearTimers();
        function _try(retries) {
            if (!_showActive) return;
            if (_populate(label, subtitle)) {
                _slowTimer = setTimeout(function() {
                    if (!_showActive || _hidden) return;
                    var subEl = document.getElementById('vld-std-sub');
                    if (subEl) {
                        subEl.textContent = 'Conexão lenta detectada. Sincronizando com o servidor…';
                        subEl.style.display = 'block';
                    }
                }, 7000);
                _instabilityTimer = setTimeout(function() {
                    if (!_showActive || _hidden) return;
                    showInstability({
                        title: 'Instabilidade na Conexão',
                        subtitle: 'O servidor está demorando mais que o esperado para responder.',
                        hint: 'Aguarde alguns minutos e tente novamente.'
                    });
                }, 15000);
                return;
            }
            if (retries <= 0) return;
            setTimeout(function(){ _try(retries - 1); }, 60);
        }
        _try(15);
    }

    function showInstability(opts) {
        opts = opts || {};
        _clearTimers();
        var ld = _getOrCreateOverlay();
        if (!ld) return;
        renderInto(ld, {
            title: opts.title || 'Não foi possível carregar o jogo',
            subtitle: opts.subtitle || 'Instabilidade momentânea na conexão com o servidor.',
            hint: opts.hint != null ? opts.hint : 'Aguarde alguns minutos e tente novamente.',
            showActions: opts.showActions != null ? opts.showActions : true,
            retryLabel: opts.retryLabel || 'Tentar Novamente',
            closeLabel: opts.closeLabel || 'Fechar',
            onRetry: opts.onRetry,
            onClose: opts.onClose,
            zIndex: 99999
        });
        _hidden = false;
    }

    function hide() {
        _showActive = false;
        _clearTimers();
        if (_hidden) return;
        _hidden = true;
        var ld = document.getElementById('loading');
        if (ld) ld.style.display = 'none';
    }

    global.ValdoriaScreenLoader = {
        ensureStyles: _ensureStyles,
        buildEmblemHTML: buildEmblemHTML,
        buildContentHTML: buildContentHTML,
        renderInto: renderInto,
        show: show,
        showInstability: showInstability,
        hide: hide
    };

    global._vTransitionLoader = {
        show: show,
        hide: hide,
        showInstability: showInstability
    };

    global.addEventListener('load', function(){
        setTimeout(function(){
            if (global.__vTransitionLoaderShownAtBoot && global._vTransitionLoader) {
                global._vTransitionLoader.hide();
            }
        }, 600);
    });
})(typeof window !== 'undefined' ? window : globalThis);
