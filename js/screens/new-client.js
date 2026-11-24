import { html } from '../../vendor/preact-htm.js';
import { PageHead } from '../components/common.js';
import { ClientForm } from '../components/client-form.js';
import { api, action, navigate } from '../store.js';
export default function NewClient() {
  return html`<section class="narrow-page"><${PageHead} eyebrow="ESTÚDIO / NOVO PAINEL" title="Novo cliente" description="Um espaço para cada parceria."/><${ClientForm} onSave=${async (
    data,
  ) => {
    const r = await action(() => api.adminCreateClient(data), 'Cliente criado. O link já está pronto.');
    if (r.ok) navigate(`/c/${r.value.client.id}/ajustes`);
  }}/></section>`;
}
