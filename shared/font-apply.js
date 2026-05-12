/* X-6.5.51AT (2026-05-08): font picker REMOVIDO. User adotou Marcellus
   como fonte canonical. Este script agora limpa qualquer estado legacy
   de localStorage['valdoria_font'] / data-font / --user-font / inline
   font-family pra garantir que o token --v-font (Marcellus) do
   valdoria-design.css prevaleca. Mantido como shim por compat. */
(function () {
  try { localStorage.removeItem('valdoria_font'); } catch (e) { /* noop */ }
  function clean() {
    if (!document.body) return;
    if (document.body.dataset && document.body.dataset.font) {
      try { delete document.body.dataset.font; } catch (e) { document.body.removeAttribute('data-font'); }
    }
    try { document.body.style.removeProperty('--user-font'); } catch (e) { /* noop */ }
    try { document.body.style.removeProperty('font-family'); } catch (e) { /* noop */ }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', clean);
  } else {
    clean();
  }
})();
