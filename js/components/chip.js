import { html } from '../../vendor/preact-htm.js';
import { statuses } from '../util.js';
export function Chip({ status, count }) {
  return html`<span class="status-chip" style=${`--status:var(--st-${status})`}><span class="status-dot"></span>${statuses[status]}${count != null && html`<b>${count}</b>`}</span>`;
}
export function Progress({ count, expected }) {
  return html`<div class="drive-progress" aria-label=${`${count} de ${expected} vídeos no Drive`}><div class="segments">${Array.from({ length: expected }, (_, i) => html`<i class=${i < count ? 'filled' : ''}></i>`)}</div><span>${count}/${expected} no Drive</span></div>`;
}
