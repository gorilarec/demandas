import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { api, action, uploadFiles, navigate, toast } from '../store.js';
import { Icon } from '../icons.js';
import { number, date, relative, statuses, formats, getFiles, driveUrl, copy, today, safeUrl } from '../util.js';
import { Chip, Progress } from '../components/chip.js';
import { Steps } from '../components/steps.js';
import { Block, Empty } from '../components/common.js';
import { Sheet } from '../components/sheet.js';
import { EditDemand } from '../components/edit-demand.js';
import { Field, Textarea, Submit } from '../components/fields.js';
import { Reference } from '../components/reference.js';
export default function Detail({ client, bundle, demandId, state, admin }) {
  const d = bundle.demands.find((d) => d.id === demandId);
  const [sheet, setSheet] = useState(null);
  const [text, setText] = useState('');
  const [comment, setComment] = useState('');
  const [day, setDay] = useState(today());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  useEffect(() => {
    document.body.classList.add('detail-open');
    return () => document.body.classList.remove('detail-open');
  }, []);
  if (!d)
    return html`<div class="detail-panel"><a class="button secondary" href=${`#/c/${client.id}`}>Voltar</a><${Empty} title="Vídeo indisponível"/></div>`;
  const refs = bundle.refs.filter((r) => r.demand_id === d.id);
  const files = getFiles(bundle, d.id);
  const events = bundle.events.filter((e) => e.demand_id === d.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const adjust = events.filter((e) => e.kind === 'adjust').at(-1);
  const shoot = bundle.shoots.find((s) => s.id === d.shoot_id);
  const canEdit = admin || ['requested', 'recorded'].includes(d.status);
  const canArchive = admin || d.status === 'requested';
  const retries = state.uploadRetries[d.id] || [];
  async function status(next, body = null, shot = null) {
    setBusy(true);
    const r = await action(() => api.setStatus(d.id, next, body, shot), 'Etapa atualizada');
    setBusy(false);
    if (r.ok) {
      setSheet(null);
      setText('');
    }
  }
  async function upload(list) {
    const valid = [...list].filter((f) => f.size <= 50 * 1024 * 1024);
    if (valid.length !== list.length) toast('Arquivo grande, cole o link. O limite é 50 MB.', 'error');
    setBusy(true);
    await uploadFiles(d, valid, (name, p) => setProgress({ name, p }));
    setProgress(null);
    setBusy(false);
  }
  async function clipboard(value) {
    try {
      await copy(value);
      toast('Copiado');
    } catch {
      toast('Não foi possível copiar. Selecione o texto para copiar.', 'error');
    }
  }
  function eventBody(e) {
    if (e.body) return e.body;
    if (e.kind === 'status') return `${statuses[e.meta?.from] || 'Etapa anterior'} → ${statuses[e.meta?.to] || 'Nova etapa'}`;
    return (
      { created: 'Vídeo criado', approved: 'Vídeo aprovado', edit: 'Informações atualizadas', drive: 'Vídeo no Drive' }[e.kind] ||
      'Etapa atualizada'
    );
  }
  return html`<div class="detail-scrim" onClick=${(e) => {
    if (e.target === e.currentTarget) navigate(`/c/${client.id}`);
  }}><article class="detail-panel"><div class="detail-top"><a class="icon-button" href=${`#/c/${client.id}`} aria-label="Voltar às demandas"><${Icon} name="back"/></a><span class="demand-number">${number(d.number)}</span><${Chip} status=${d.status}/>${(canEdit || canArchive) && html`<button class="icon-button" aria-label="Opções do vídeo" onClick=${() => setSheet('menu')}><${Icon} name="more"/></button>`}</div><div class="detail-content"><div class="eyebrow">${client.name}</div><h1>${d.title}</h1><${Steps} status=${d.status}/>${d.status === 'adjust' && html`<div class="adjust-box"><b>Ajuste pedido</b><p>${adjust?.body || 'Confira as orientações na atividade.'}</p><small>${adjust?.author_name} · ${relative(adjust?.created_at)}</small></div>`}
<div class="detail-actions">${
    admin
      ? html`<div class="status-options" aria-label="Mudar etapa">${Object.entries(statuses).map(
          ([s, label]) =>
            html`<button disabled=${busy || s === d.status} class=${s === d.status ? 'selected' : ''} style=${`--status:var(--st-${s})`} onClick=${() => {
              if (s === 'adjust') {
                setText('');
                setSheet('adjust');
              } else status(s);
            }}><i></i>${label}</button>`,
        )}</div><button class="button secondary" onClick=${() => setSheet('edit')}><${Icon} name="edit"/>Editar</button>`
      : html`${d.status === 'requested' && html`<button class="button primary" onClick=${() => setSheet('recorded')}><${Icon} name="camera"/>Já gravamos este</button>`}${d.status === 'delivered' && html`<button class="button primary" disabled=${busy} onClick=${() => status('approved')}><${Icon} name="check"/>Aprovar</button>`}${
          ['delivered', 'approved'].includes(d.status) &&
          html`<button class="button secondary" onClick=${() => {
            setText('');
            setSheet('adjust');
          }}>Pedir ajuste</button>`
        }`
  }</div>
${(d.script || d.script_url) && html`<${Block} title="ROTEIRO" action=${d.script && html`<button class="text-button" onClick=${() => clipboard(d.script)}><${Icon} name="copy" size=${16}/>Copiar</button>`}>${d.script && html`<p class="preserve script-text">${d.script}</p>`}${safeUrl(d.script_url) && html`<a class="button secondary" href=${safeUrl(d.script_url)} target="_blank" rel="noopener noreferrer"><${Icon} name="external"/>Abrir roteiro</a>`}<//>`}
${(shoot || d.camera_clips || d.notes) && html`<${Block} title="GRAVAÇÃO">${shoot && html`<p class="metadata"><${Icon} name="calendar"/>${date(shoot.shot_on)}</p>`}${d.camera_clips && html`<p class="camera-clips mono"><${Icon} name="camera"/>${d.camera_clips}</p>`}${d.notes && html`<p class="preserve">${d.notes}</p>`}<//>`}
<${Block} title="DETALHES"><dl class="detail-facts"><div><dt>Formato</dt><dd>${formats[d.format]}</dd></div><div><dt>Precisa gravar?</dt><dd>${d.needs_shoot === null ? 'Não sei' : d.needs_shoot ? 'Sim' : 'Não, só edição'}</dd></div>${d.due_date && html`<div><dt>Prazo</dt><dd>${date(d.due_date)}</dd></div>`}<div><dt>Vídeos finais</dt><dd>${d.expected_files}</dd></div>${d.priority === 'urgent' && html`<div><dt>Prioridade</dt><dd class="danger">Urgente</dd></div>`}</dl><//>
<${Block} title="REFERÊNCIAS">${refs.map((r) => html`<${Reference} key=${r.id} refItem=${r} canRemove=${admin || r.created_by === state.userId}/>`)}${!refs.length && html`<p class="muted">Adicione uma inspiração para este vídeo.</p>`}<div class="button-row"><button class="button secondary" disabled=${busy} onClick=${() => {
    setText('');
    setSheet('link');
  }}><${Icon} name="link"/>Adicionar link</button><label class="button secondary file-label"><${Icon} name="upload"/>Adicionar arquivo<input type="file" multiple accept="image/*,video/*,audio/*,application/pdf" disabled=${busy} onChange=${(
    e,
  ) => {
    upload(e.target.files);
    e.target.value = '';
  }}/></label></div>${progress && html`<div class="upload-progress" role="status"><span>${progress.name} · ${progress.p}%</span><progress max="100" value=${progress.p}></progress></div>`}${retries.length > 0 && html`<div class="notice error"><b>Pedido salvo. Falta enviar:</b>${retries.map((f) => html`<p>${f.name}</p>`)}<button class="button secondary" disabled=${busy} onClick=${() => upload(retries)}>Tentar enviar de novo</button><small>Mantenha esta tela aberta até concluir o envio.</small></div>`}<//>
${files.length > 0 && html`<${Block} title="VÍDEOS ENTREGUES"><${Progress} count=${files.length} expected=${d.expected_files}/>${files.map((f) => html`<a class="drive-file-link" href=${driveUrl(f)} target="_blank" rel="noopener noreferrer"><${Icon} name="play"/><span>${f.name}<small>Abrir no Drive</small></span><${Icon} name="external" size=${16}/></a>`)}<//>`}
${admin && html`<${Block} title="NOME PARA EXPORTAR"><div class="export-name"><code>${d.number} - ${d.title}</code><button class="icon-button" aria-label="Copiar nome para exportar" onClick=${() => clipboard(`${d.number} - ${d.title}`)}><${Icon} name="copy"/></button></div><//>`}
<${Block} title="ATIVIDADE"><ol class="timeline">${events.map((e) => html`<li class=${['comment', 'adjust'].includes(e.kind) ? 'comment-event' : 'system-event'}><span class="timeline-dot"></span><div>${['comment', 'adjust'].includes(e.kind) && html`<b>${e.author_name}</b>`}<p class="preserve">${eventBody(e)}</p><small>${!['comment', 'adjust'].includes(e.kind) && `${e.author_name} · `}${relative(e.created_at)}</small></div></li>`)}</ol><form class="comment-form" onSubmit=${async (
    e,
  ) => {
    e.preventDefault();
    setBusy(true);
    const r = await action(() => api.addComment(d.id, comment), 'Comentário enviado');
    if (r.ok) setComment('');
    setBusy(false);
  }}><${Textarea} label="Escrever comentário" rows="3" required maxlength="4000" value=${comment} onInput=${(e) => setComment(e.target.value)} placeholder="Escreva para a equipe…"/><${Submit} busy=${busy}>Enviar comentário<//></form><//>
</div></article>${
    sheet &&
    html`<${Sheet} title=${{ menu: 'Opções do vídeo', edit: 'Editar vídeo', adjust: 'Pedir ajuste', recorded: 'Já gravamos este', link: 'Adicionar referência' }[sheet]} onClose=${() => !busy && setSheet(null)}>${
      sheet === 'menu'
        ? html`<div class="menu-list">${canEdit && html`<button onClick=${() => setSheet('edit')}><${Icon} name="edit"/>Editar vídeo</button>`}${
            canArchive &&
            html`<button class="danger" onClick=${async () => {
              if (confirm('Arquivar este vídeo? Ele sai da lista.')) {
                const r = await action(() => api.archiveDemand(d.id), 'Vídeo arquivado');
                if (r.ok) navigate(`/c/${client.id}`);
              }
            }}><${Icon} name="trash"/>Arquivar vídeo</button>`
          }</div>`
        : sheet === 'edit'
          ? html`<${EditDemand} demand=${d} admin=${admin} onDone=${() => setSheet(null)}/>`
          : html`<form onSubmit=${async (e) => {
              e.preventDefault();
              if (sheet === 'adjust') return status('adjust', text);
              if (sheet === 'recorded') return status('recorded', null, day);
              setBusy(true);
              const r = await action(() => api.addRefLink(d.id, text), 'Referência adicionada');
              setBusy(false);
              if (r.ok) setSheet(null);
            }}>${sheet === 'adjust' ? html`<${Textarea} label="O que precisa mudar?" required maxlength="4000" rows="6" value=${text} onInput=${(e) => setText(e.target.value)} placeholder="Conte os ajustes para a edição…"/>` : sheet === 'recorded' ? html`<${Field} label="Dia da gravação" type="date" required value=${day} onInput=${(e) => setDay(e.target.value)}/>` : html`<${Field} label="Link da referência" type="url" required maxlength="2000" value=${text} onInput=${(e) => setText(e.target.value)} placeholder="https://…"/>`}<${Submit} busy=${busy}>${sheet === 'adjust' ? 'Enviar ajuste' : sheet === 'recorded' ? 'Confirmar gravação' : 'Adicionar link'}<//></form>`
    }<//>`
  }</div>`;
}
