import { html } from '../../vendor/preact-htm.js';
import { Icon } from '../icons.js';
import { Chip, Progress } from './chip.js';
import { number, date, overdue, getFiles } from '../util.js';
export function Card({ demand: d, bundle, client, seen }) {
  const refs = (bundle?.refs || []).filter((r) => r.demand_id === d.id).length;
  const comments = (bundle?.events || []).filter((e) => e.demand_id === d.id && ['comment', 'adjust'].includes(e.kind)).length;
  const files = getFiles(bundle, d.id).length;
  return html`<a class="demand-card" href=${`#/c/${d.client_id}/d/${d.id}`} style=${`--status:var(--st-${d.status})`}>
  ${client && html`<div class="client-tag" style=${`--client-accent:${client.accent}`}><i></i>${client.name}</div>`}
  <div class="card-top"><span class="demand-number">${number(d.number)}</span>${seen && d.updated_at > seen && html`<span class="new-dot">novo</span>`}<${Icon} name="chevron" size=${16}/></div>
  <h3>${d.title}</h3><${Chip} status=${d.status}/>
  <div class="card-meta"><span title=${d.kind === 'recorded' ? 'Anotado no set' : 'Pedido de vídeo'}><${Icon} name=${d.kind === 'recorded' ? 'camera' : 'bulb'} size=${15}/>${d.kind === 'recorded' ? 'No set' : 'Pedido'}</span>${d.due_date && html`<span class=${overdue(d) ? 'danger' : ''}><${Icon} name="calendar" size=${15}/>até ${date(d.due_date)}</span>`}${d.priority === 'urgent' && html`<span class="urgent">URGENTE</span>`}</div>
  ${(d.camera_clips || refs || comments) > 0 || d.camera_clips ? html`<div class="card-meta card-bottom">${d.camera_clips && html`<span class="mono clips"><${Icon} name="camera" size=${14}/>${d.camera_clips}</span>`}${refs > 0 && html`<span aria-label=${`${refs} referências`}><${Icon} name="link" size=${14}/>${refs}</span>`}${comments > 0 && html`<span aria-label=${`${comments} comentários`}><${Icon} name="message" size=${14}/>${comments}</span>`}</div>` : null}
  ${(d.expected_files > 1 || (files > 0 && files < d.expected_files)) && html`<${Progress} count=${files} expected=${d.expected_files}/>`}
</a>`;
}
