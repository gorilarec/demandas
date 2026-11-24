import { html } from '../../vendor/preact-htm.js';
import { Icon } from '../icons.js';
export function PageHead({ eyebrow, title, description, children }) {
  return html`<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}<span class="heading-dot">.</span></h1>${description && html`<p>${description}</p>`}</div>${children && html`<div class="head-actions">${children}</div>`}</div>`;
}
export function Stats({ items }) {
  return html`<div class="stats">${items.map(([value, label]) => html`<div class="stat"><strong>${String(value).padStart(2, '0')}</strong><span>${label}</span></div>`)}</div>`;
}
export function Empty({ clientId, title = 'Nada por aqui ainda', description = 'Uma boa produção começa com uma ideia.' }) {
  return html`<div class="empty"><div class="empty-art"><${Icon} name="camera" size=${46}/><i></i><i></i></div><h2>${title}</h2><p>${description}</p>${clientId && html`<div class="button-row"><a class="button secondary" href=${`#/c/${clientId}/gravacao`}>Anotar gravação</a><a class="button primary" href=${`#/c/${clientId}/pedir`}>Pedir vídeo</a></div>`}</div>`;
}
export function Skeleton() {
  return html`<div class="loading-grid" aria-label="Carregando"><div class="skeleton skeleton-heading"></div><div class="skeleton skeleton-stats"></div>${[1, 2, 3].map(() => html`<div class="skeleton skeleton-card"></div>`)}</div>`;
}
export function Block({ title, children, action }) {
  return html`<section class="detail-block"><div class="section-head"><h2 class="eyebrow">${title}</h2>${action}</div>${children}</section>`;
}
