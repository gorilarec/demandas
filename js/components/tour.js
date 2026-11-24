import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import { Icon } from '../icons.js';

// Tutorial guiado: escurece a tela, destaca um elemento e aponta para ele com uma seta.
// steps = [{ target: 'seletor CSS' (o primeiro VISÍVEL é usado), title, text }]
const isVisible = (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
};
// Os seletores valem na ordem em que foram escritos: o primeiro que tiver um elemento visível ganha.
function findTarget(selector) {
  for (const one of (selector || '').split(',')) {
    const el = one.trim() && [...document.querySelectorAll(one)].find(isVisible);
    if (el) return el;
  }
  return null;
}

export function Tour({ steps, onClose }) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState(null);
  const next = useRef();
  const bubbleRef = useRef();
  const [bubbleHeight, setBubbleHeight] = useState(250);
  const step = steps[index];
  const last = index === steps.length - 1;

  useEffect(() => {
    const el = findTarget(step.target);
    // Elemento alto vai para o topo, para sobrar espaço para o balão embaixo.
    if (el) el.scrollIntoView({ block: el.getBoundingClientRect().height > window.innerHeight * 0.3 ? 'start' : 'center', inline: 'nearest' });
    const measure = () => {
      const target = findTarget(step.target);
      if (!target) return setBox(null);
      const r = target.getBoundingClientRect();
      setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    setBox(null);
    const timer = setTimeout(measure, 80);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [index]);

  useEffect(() => {
    next.current?.focus({ preventScroll: true });
  }, [index, !!box]);

  // Mede o balão de verdade para decidir se ele cabe em cima ou embaixo do alvo.
  useEffect(() => {
    const h = bubbleRef.current?.offsetHeight;
    if (h && Math.abs(h - bubbleHeight) > 2) setBubbleHeight(h);
  });

  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(340, vw - 24);
  const pad = 6;
  let bubble = `width:${width}px;left:${(vw - width) / 2}px;top:50%;transform:translateY(-50%)`;
  let arrow = null;
  let hole = null;
  if (box) {
    const cx = box.left + box.width / 2;
    const left = Math.max(12, Math.min(cx - width / 2, vw - width - 12));
    // Fica do lado com mais espaço; sem espaço dos dois lados, o balão vai para o centro, sem seta.
    const spaceAbove = box.top;
    const spaceBelow = vh - (box.top + box.height);
    const need = bubbleHeight + 58;
    const place = spaceBelow >= need && (spaceBelow >= spaceAbove || spaceAbove < need) ? 'below' : spaceAbove >= need ? 'above' : 'center';
    const arrowLeft = Math.max(12, Math.min(cx - 14, vw - 40));
    if (place === 'above') {
      bubble = `width:${width}px;left:${left}px;bottom:${vh - box.top + pad + 40}px`;
      arrow = { style: `left:${arrowLeft}px;top:${box.top - pad - 36}px`, dir: 'down' };
    } else if (place === 'below') {
      bubble = `width:${width}px;left:${left}px;top:${box.top + box.height + pad + 40}px`;
      arrow = { style: `left:${arrowLeft}px;top:${box.top + box.height + pad + 6}px`, dir: 'up' };
    }
    hole = `top:${box.top - pad}px;left:${box.left - pad}px;width:${box.width + pad * 2}px;height:${box.height + pad * 2}px`;
  }
  return html`<div class="tour" role="dialog" aria-modal="true" aria-label="Tutorial">
${hole ? html`<div class="tour-hole" style=${hole}></div>` : html`<div class="tour-dim"></div>`}
${arrow && html`<div class=${`tour-arrow ${arrow.dir}`} style=${arrow.style} aria-hidden="true"><svg viewBox="0 0 28 30" width="28" height="30"><path d="M14 2v24M4 16l10 11 10-11" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`}
<div ref=${bubbleRef} class="tour-bubble" style=${bubble} aria-live="polite">
<div class="tour-count">${index + 1} DE ${steps.length}</div>
<h2>${step.title}</h2>
<p>${step.text}</p>
<div class="tour-actions">${!last ? html`<button class="text-button" onClick=${onClose}>Pular</button>` : html`<span></span>`}<div>${index > 0 && html`<button class="button secondary" onClick=${() => setIndex(index - 1)}>Voltar</button>`}<button ref=${next} class="button primary" onClick=${() => (last ? onClose() : setIndex(index + 1))}>${last ? 'Entendi' : 'Próximo'}<${Icon} name=${last ? 'check' : 'arrow'} size=${18}/></button></div></div>
</div></div>`;
}
