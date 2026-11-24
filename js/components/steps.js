import { html } from '../../vendor/preact-htm.js';
import { statuses } from '../util.js';
export function Steps({ status }) {
  const list = ['requested', 'recorded', 'editing', 'delivered', 'approved'];
  const current = status === 'adjust' ? 2 : list.indexOf(status);
  return html`<ol class="steps" aria-label="Etapas do vídeo">${list.map((s, i) => html`<li class=${`${i < current ? 'done' : ''} ${i === current ? 'current' : ''}`} aria-current=${i === current ? 'step' : undefined}><i></i><span>${statuses[s]}</span></li>`)}</ol>`;
}
