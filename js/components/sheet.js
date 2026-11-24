import { html, useEffect, useRef } from '../../vendor/preact-htm.js';
import { Icon } from '../icons.js';
export function Sheet({ title, onClose, children }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      [...ref.current.querySelectorAll('button, input, textarea, select, a[href], [tabindex="0"]')].filter((e) => !e.disabled);
    (focusable()[0] || ref.current).focus();
    const key = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const items = focusable();
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, []);
  return html`<div class="sheet-overlay" onClick=${(e) => {
    if (e.target === e.currentTarget) onClose();
  }}><section ref=${ref} class="sheet" role="dialog" aria-modal="true" aria-label=${title} tabindex="-1"><div class="sheet-handle"></div><div class="section-head"><h2>${title}</h2><button class="icon-button" onClick=${onClose} aria-label="Fechar"><${Icon} name="close"/></button></div>${children}</section></div>`;
}
