import { html, useState } from '../../vendor/preact-htm.js';
import { PageHead, Empty } from '../components/common.js';
import { Search } from '../components/fields.js';
import { Card } from '../components/card.js';
export default function Queue({ state }) {
  const [q, setQ] = useState('');
  const list = state.queue
    .filter((d) => ['recorded', 'editing', 'adjust'].includes(d.status))
    .filter((d) =>
      `${d.title} ${d.number} ${state.clients.find((c) => c.id === d.client_id)?.name}`.toLowerCase().includes(q.toLowerCase()),
    )
    .sort(
      (a, b) =>
        (b.status === 'adjust') - (a.status === 'adjust') ||
        (b.priority === 'urgent') - (a.priority === 'urgent') ||
        (a.due_date || '9999').localeCompare(b.due_date || '9999') ||
        a.created_at.localeCompare(b.created_at),
    );
  return html`<section><${PageHead} eyebrow="PRODUÇÃO / PRIORIDADES" title="Fila de edição" description="O próximo corte começa aqui."/><div class="section-head"><span class="eyebrow">${list.length} VÍDEOS PARA EDITAR</span><${Search} value=${q} onInput=${(e) => setQ(e.target.value)} placeholder="Buscar vídeo ou cliente"/></div><div class="queue-grid">${list.map((d) => html`<${Card} key=${d.id} demand=${d} client=${state.clients.find((c) => c.id === d.client_id)} bundle=${state.bundles[d.client_id]} seen=${state.seen.admin}/>`)}</div>${!list.length && html`<${Empty} title="Fila em dia" description="Os próximos vídeos aparecem aqui assim que forem gravados."/>`}</section>`;
}
