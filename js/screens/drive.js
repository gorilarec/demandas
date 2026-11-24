import { html, useState } from '../../vendor/preact-htm.js';
import { PageHead, Empty } from '../components/common.js';
import { Search } from '../components/fields.js';
import { Sheet } from '../components/sheet.js';
import { Icon } from '../icons.js';
import { api, action } from '../store.js';
import { number, date, relative, driveUrl } from '../util.js';
export default function Drive({ client, bundle }) {
  const [linkFile, setLinkFile] = useState(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const files = bundle.files.filter((f) => !f.removed_at);
  const unlinked = files.filter((f) => !f.demand_id && !f.ignored);
  const linked = files.filter((f) => f.demand_id && !f.ignored);
  const ignored = files.filter((f) => f.ignored);
  async function run(fn, msg) {
    setBusy(true);
    const r = await action(fn, msg);
    setBusy(false);
    return r;
  }
  function fileCard(f, type) {
    const d = bundle.demands.find((d) => d.id === f.demand_id);
    return html`<div class="drive-card"><div class="drive-card-title"><span class="file-icon"><${Icon} name="play"/></span><div><a href=${driveUrl(f)} target="_blank" rel="noopener noreferrer">${f.name}<${Icon} name="external" size=${14}/></a><small>${date(f.modified_at || f.first_seen_at)}${d && ` · ${number(d.number)} ${d.title}`}</small></div></div><div class="button-row">${
      type === 'unlinked'
        ? html`<button class="button secondary" disabled=${busy} onClick=${() => {
            setLinkFile(f);
            setQ('');
          }}><${Icon} name="link"/>Ligar a uma demanda</button><button class="button secondary" disabled=${busy} onClick=${() => run(() => api.adminDemandFromFile(f.id), 'Demanda entregue criada')}><${Icon} name="plus"/>Criar demanda entregue</button><button class="text-button muted" disabled=${busy} onClick=${() => run(() => api.adminIgnoreFile(f.id, true), 'Arquivo ignorado')}>Ignorar</button>`
        : type === 'linked'
          ? html`<button class="button secondary" disabled=${busy} onClick=${() => run(() => api.adminLinkFile(f.id, null), 'Arquivo desligado')}>Desligar</button>`
          : html`<button class="button secondary" disabled=${busy} onClick=${() => run(() => api.adminIgnoreFile(f.id, false), 'Arquivo restaurado')}>Voltar</button>`
    }</div></div>`;
  }
  return html`<section><${PageHead} eyebrow="ARQUIVOS / ENTREGA" title="Drive" description=${client.drive_folder_id ? `${files.length} arquivos · ${client.drive_synced_at ? `conferido ${relative(client.drive_synced_at)}` : 'aguardando primeira conferência'}` : 'Drive não ligado. Adicione a pasta nos ajustes do cliente.'}/><div class="notice drive-notice"><${Icon} name="drive"/><span>O vídeo chega no Drive. A entrega aparece aqui.</span>${client.drive_folder_url && html`<a class="text-button" href=${/^https?:/.test(client.drive_folder_url) ? client.drive_folder_url : `https://drive.google.com/drive/folders/${encodeURIComponent(client.drive_folder_id)}`} target="_blank" rel="noopener noreferrer">Abrir pasta<${Icon} name="external" size=${16}/></a>`}</div><div class="section-head"><h2>Sem demanda <span class="count-badge">${unlinked.length}</span></h2><span class="eyebrow">PRECISAM DE UM DESTINO</span></div>${unlinked.map((f) => fileCard(f, 'unlinked'))}${!unlinked.length && html`<${Empty} title="Tudo no lugar" description="Não há arquivos esperando uma demanda."/>`}<details class="disclosure"><summary>Ligados <span>${linked.length}</span></summary>${linked.map((f) => fileCard(f, 'linked'))}</details><details class="disclosure"><summary>Ignorados <span>${ignored.length}</span></summary>${ignored.map((f) => fileCard(f, 'ignored'))}</details>${
    linkFile &&
    html`<${Sheet} title="Ligar a uma demanda" onClose=${() => setLinkFile(null)}><p class="muted break">${linkFile.name}</p><${Search} value=${q} onInput=${(e) => setQ(e.target.value)}/><div class="link-options">${bundle.demands
      .filter((d) => `${d.title} ${d.number}`.toLowerCase().includes(q.toLowerCase()))
      .map(
        (d) =>
          html`<button disabled=${busy} onClick=${async () => {
            const r = await run(() => api.adminLinkFile(linkFile.id, d.id), 'Arquivo ligado');
            if (r.ok) setLinkFile(null);
          }}><span class="mono accent">${number(d.number)}</span><span>${d.title}</span><${Icon} name="plus"/></button>`,
      )}</div><//>`
  }</section>`;
}
