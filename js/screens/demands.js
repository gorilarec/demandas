import { html, useState } from '../../vendor/preact-htm.js';
import { PageHead, Stats, Empty } from '../components/common.js';
import { Search } from '../components/fields.js';
import { Card } from '../components/card.js';
import { Icon } from '../icons.js';
import { columns, counts, sortDemands, deliveredMonth, relative, nextShoot, today } from '../util.js';
import { ShootBanner } from '../components/shoot-banner.js';
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
  const social = state.memberships.find((m) => m.client_id === client.id)?.role_label === 'social';
  // Histórico não esconde o que está em andamento: em "Tudo" aparecem só os 5 aprovados mais recentes.
  const approved = filtered.filter((d) => d.status === 'approved');
  const hidden = filter === 'all' && !query ? Math.max(0, approved.length - 5) : 0;
  const keep = new Set(approved.slice(0, 5).map((d) => d.id));
  const shown = hidden ? filtered.filter((d) => d.status !== 'approved' || keep.has(d.id)) : filtered;
  const quick = {
    pedir: ['pedir', 'plus', 'Pedir vídeo', 'Mande a ideia e as referências'],
    gravar: ['gravacao', 'camera', 'Gravação', 'Marcar o dia e mandar os roteiros'],
    tp: ['tp', 'prompter', 'Teleprompter', 'Ler os roteiros na hora de gravar'],
  };
  // Gravação de hoje (ou a próxima) com roteiro: vira o primeiro botão da tela, direto no teleprompter.
  const shoot = nextShoot(bundle);
  const order = [...(social ? ['gravar', 'pedir'] : ['pedir', 'gravar']), ...(shoot ? [] : ['tp'])];
  return html`<section>
<${PageHead} eyebrow="PAINEL DO CLIENTE" title=${client.name} description=${client.drive_synced_at ? `DRIVE · conferido ${relative(client.drive_synced_at)}` : 'Da ideia ao vídeo. Tudo por aqui.'}><a class="button secondary desktop-action" data-tour="tp" href=${`#/c/${client.id}/tp`}><${Icon} name="prompter"/>Teleprompter</a><a class="button secondary desktop-action" data-tour="gravar" href=${`#/c/${client.id}/gravacao`}><${Icon} name="camera"/>Gravação</a><a class="button primary desktop-action" data-tour="pedir" href=${`#/c/${client.id}/pedir`}><${Icon} name="plus"/>Pedir vídeo</a><//>
${shoot && html`<${ShootBanner} client=${client} shoot=${shoot} tour=${true}/>`}
<div class="quick-actions">${order.map(
    (key, i) =>
      html`<a class=${`quick ${i === 0 && shoot?.day !== today() ? 'main' : ''}`} data-tour=${key} href=${`#/c/${client.id}/${quick[key][0]}`}><span class="quick-icon"><${Icon} name=${quick[key][1]}/></span><span class="quick-text"><b>${quick[key][2]}</b><small>${quick[key][3]}</small></span><${Icon} name="chevron" size=${16}/></a>`,
  )}</div>
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
            html`<div class="board-column"><div class="column-title"><span style=${`--status:var(--st-${key})`}><i></i>${label}</span><b>${filtered.filter((d) => d.status === key).length}</b></div><div class="column-cards">${shown.filter((d) => d.status === key).map((d) => html`<${Card} key=${d.id} demand=${d} bundle=${bundle} seen=${seen}/>`)}${key === 'approved' && hidden > 0 && html`<button class="more-button" onClick=${() => setFilter('approved')}>Ver mais ${hidden} aprovados</button>`}${!filtered.some((d) => d.status === key) && html`<div class="column-empty">Nenhum vídeo</div>`}</div></div>`,
        )}</div><div class="mobile-cards">${shown.map((d) => html`<${Card} key=${d.id} demand=${d} bundle=${bundle} seen=${seen}/>`)}${hidden > 0 && html`<button class="more-button" onClick=${() => setFilter('approved')}>Ver mais ${hidden} aprovados</button>`}</div>`
}
<div class="page-foot"><span class="live-dot"></span> ${state.demo ? 'Demonstração · dados fictícios' : 'Atualização automática'}<span>GORILAREC / PRODUÇÃO</span></div>
</section>`;
}
