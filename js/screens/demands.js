import { html, useState } from '../../vendor/preact-htm.js';
import { PageHead, Stats, Empty } from '../components/common.js';
import { Search } from '../components/fields.js';
import { Card } from '../components/card.js';
import { Icon } from '../icons.js';
import { columns, counts, sortDemands, deliveredMonth, relative } from '../util.js';
export default function Demands({ client, bundle, state, admin }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const list = bundle.demands;
  const totals = counts(list);
  const filtered = list
    .filter(
      (d) =>
        (filter === 'all' || d.status === filter) &&
        `${d.title} ${d.number} #${String(d.number).padStart(3, '0')}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort(sortDemands);
  const seen = state.seen[admin ? 'admin' : client.id];
  return html`<section>
<${PageHead} eyebrow="PAINEL DO CLIENTE" title=${client.name} description=${client.drive_synced_at ? `DRIVE · conferido ${relative(client.drive_synced_at)}` : 'Da ideia ao vídeo. Tudo por aqui.'}><a class="button secondary desktop-action" href=${`#/c/${client.id}/gravacao`}><${Icon} name="camera"/>Anotar gravação</a><a class="button primary desktop-action" href=${`#/c/${client.id}/pedir`}><${Icon} name="plus"/>Pedir vídeo</a><//>
<${Stats} items=${[
    [totals.requested + totals.recorded, 'Na fila'],
    [totals.editing + totals.adjust, 'Editando'],
    [list.filter(deliveredMonth).length, 'Entregues no mês'],
  ]}/>
${!admin && totals.delivered > 0 && html`<button class="attention" onClick=${() => setFilter('delivered')}><${Icon} name="play"/><span><b>${totals.delivered} ${totals.delivered === 1 ? 'vídeo' : 'vídeos'}</b> esperando sua aprovação</span><${Icon} name="arrow"/></button>`}
<div class="filter-toolbar"><div class="filters" aria-label="Filtrar por etapa">${[
    ['all', 'Tudo'],
    ['requested', 'A gravar'],
    ['recorded', 'Gravados'],
    ['editing', 'Editando'],
    ['delivered', 'Entregues'],
    ['adjust', 'Ajustes'],
    ['approved', 'Aprovados'],
  ].map(
    ([key, label]) =>
      html`<button class=${`filter ${filter === key ? 'selected' : ''}`} aria-pressed=${filter === key} onClick=${() => setFilter(key)}>${label}<span>${key === 'all' ? list.length : totals[key]}</span></button>`,
  )}</div><${Search} value=${query} onInput=${(e) => setQuery(e.target.value)}/></div>
${
  !filtered.length
    ? html`<${Empty} clientId=${client.id} title=${list.length ? 'Nenhum vídeo neste filtro' : 'Nada por aqui ainda'} description=${list.length ? 'Experimente outra etapa ou outra busca.' : undefined}/>`
    : html`<div class=${`demand-board ${filter !== 'all' ? 'filtered-board' : ''}`}>${Object.entries(columns)
        .filter(([key]) => filter === 'all' || filter === key)
        .map(
          ([key, label]) =>
            html`<div class="board-column"><div class="column-title"><span style=${`--status:var(--st-${key})`}><i></i>${label}</span><b>${filtered.filter((d) => d.status === key).length}</b></div><div class="column-cards">${filtered.filter((d) => d.status === key).map((d) => html`<${Card} key=${d.id} demand=${d} bundle=${bundle} seen=${seen}/>`)}${!filtered.some((d) => d.status === key) && html`<div class="column-empty">Nenhum vídeo</div>`}</div></div>`,
        )}</div><div class="mobile-cards">${filtered.map((d) => html`<${Card} key=${d.id} demand=${d} bundle=${bundle} seen=${seen}/>`)} </div>`
}
<div class="page-foot"><span class="live-dot"></span> ${state.demo ? 'Demonstração · dados fictícios' : 'Atualização automática'}<span>GORILAREC / PRODUÇÃO</span></div>
</section>`;
}
