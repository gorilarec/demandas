import { html } from '../../vendor/preact-htm.js';
import { PageHead, Stats, Empty } from '../components/common.js';
import { Chip } from '../components/chip.js';
import { Icon } from '../icons.js';
import { counts, deliveredMonth, relative, nextShoot } from '../util.js';
import { ShootBanner } from '../components/shoot-banner.js';
export default function Clients({ state }) {
  const all = state.queue;
  // Gravações marcadas (hoje ou adiante) com roteiro: um toque e o teleprompter abre.
  const shoots = state.clients
    .map((client) => ({ client, shoot: nextShoot(state.bundles[client.id]) }))
    .filter((x) => x.shoot)
    .sort((a, b) => a.shoot.day.localeCompare(b.shoot.day));
  return html`<section><${PageHead} eyebrow="VISÃO GERAL / ESTÚDIO" title="Clientes" description="Cada produção no seu ritmo. Tudo sob controle."><a class="button primary" href="#/clientes/novo"><${Icon} name="plus"/>Novo cliente</a><//><${Stats} items=${[
    [all.filter((d) => ['recorded', 'editing', 'adjust'].includes(d.status)).length, 'Para editar'],
    [all.filter((d) => d.status === 'requested').length, 'Aguardando gravação'],
    [all.filter(deliveredMonth).length, 'Entregues no mês'],
  ]}/>${shoots.length > 0 && html`<div class="section-head overview-label"><h2 class="eyebrow">GRAVAÇÕES MARCADAS</h2><a class="mono muted" href="#/tp">VER TODAS</a></div><div class="shoot-rows">${shoots.map(({ client, shoot }) => html`<${ShootBanner} key=${client.id} client=${client} shoot=${shoot} named=${true}/>`)}</div>`}<div class="section-head overview-label"><h2 class="eyebrow">CLIENTES ATIVOS</h2><span class="mono muted">${String(state.clients.length).padStart(2, '0')} PAINÉIS</span></div><div class="client-grid">${state.clients.map(
    (c) => {
      const b = state.bundles[c.id];
      const totals = counts(b?.demands || []);
      const unmatched = b?.files.filter((f) => !f.demand_id && !f.ignored && !f.removed_at).length || 0;
      const fresh =
        state.seen.admin &&
        b?.events.some(
          (e) => ['created', 'adjust'].includes(e.kind) && e.author_kind === 'client' && e.created_at > state.seen.admin,
        );
      return html`<a class="client-card" href=${`#/c/${c.id}`} style=${`--client-accent:${c.accent}`}><div class="client-card-header"><span class="client-monogram">${c.name
        .split(' ')
        .map((s) => s[0])
        .slice(0, 2)
        .join(
          '',
        )}</span><span class="eyebrow">PAINEL ${String(state.clients.indexOf(c) + 1).padStart(2, '0')}</span>${fresh && html`<span class="new-dot">novo</span>`}<${Icon} name="arrow"/></div><h2>${c.name}</h2><div class="mini-chips">${Object.entries(
        totals,
      )
        .filter(([, n]) => n > 0)
        .map(
          ([status, count]) => html`<${Chip} status=${status} count=${count}/>`,
        )}</div><div class="client-card-footer"><span><${Icon} name="drive" size=${16}/>${c.drive_folder_id ? (c.drive_synced_at ? `Conferido ${relative(c.drive_synced_at)}` : 'Aguardando conferência') : 'Drive não ligado'}</span>${unmatched > 0 && html`<span class="badge amber">${unmatched} sem demanda</span>`}</div></a>`;
    },
  )}</div>${!state.clients.length && html`<${Empty} title="Seu estúdio começa aqui" description="Adicione o primeiro cliente para organizar a produção."/>`}</section>`;
}
