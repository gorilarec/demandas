import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import { PageHead, Block } from '../components/common.js';
import { Field, Textarea, Counter, Submit } from '../components/fields.js';
import { Card } from '../components/card.js';
import { api, action, record, retryEntry, toast } from '../store.js';
import { today, readLocal, writeLocal, number } from '../util.js';
import { Icon } from '../icons.js';
const blank = () => ({
  title: '',
  script: '',
  script_url: '',
  camera_clips: '',
  notes: '',
  expected_files: 1,
  shoot_date: today(),
});
export default function Recording({ client, bundle, state }) {
  const key = `gd-draft-record-${state.demo ? 'demo' : 'live'}-${state.userId}-${client.id}`;
  const [form, setForm] = useState(() => readLocal(key, blank()));
  const [busy, setBusy] = useState(false);
  const [clipId, setClipId] = useState(null);
  const [clips, setClips] = useState('');
  const formRef = useRef();
  useEffect(() => {
    try {
      writeLocal(key, form);
    } catch {
      /* The live form remains available when storage is full. */
    }
  }, [form]);
  const set = (k, v) => setForm({ ...form, [k]: v });
  const on = (key) => (e) => set(key, e.target.value);
  const pending = state.pending.filter((p) => p.clientId === client.id);
  const shotIds = bundle.shoots.filter((s) => s.shot_on === form.shoot_date).map((s) => s.id);
  const recorded = bundle.demands.filter((d) => shotIds.includes(d.shoot_id));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    const ok = await record(client.id, {
      ...form,
      title: form.title.trim(),
      kind: 'recorded',
      script_url: form.script_url || null,
    });
    if (ok) {
      const next = { ...blank(), shoot_date: form.shoot_date };
      setForm(next);
      try {
        writeLocal(key, next);
      } catch {}
      formRef.current?.querySelector('input[maxlength="160"]')?.focus();
    }
    setBusy(false);
  }
  return html`<section class="recording-layout"><div><${PageHead} eyebrow="NO SET / ANOTAÇÃO RÁPIDA" title="Gravação" description="Gravou. Anotou. Pode rodar o próximo."/>
${pending.length > 0 && html`<div class="notice pending" role="status"><${Icon} name="offline"/><div><b>${pending.length} ${pending.length === 1 ? 'anotação guardada' : 'anotações guardadas'}, envio quando voltar o sinal</b>${pending.map((p) => html`<div class="pending-item">${p.payload.title}${p.error && html`<p class="danger">${p.error}<button type="button" class="text-button" onClick=${() => retryEntry(p.id)}>Tentar de novo</button></p>`}</div>`)}</div></div>`}
<form class="form-panel" ref=${formRef} onSubmit=${save}><${Field} label="Dia da gravação" type="date" required value=${form.shoot_date} onInput=${on('shoot_date')}/><${Field} label="Nome do vídeo *" value=${form.title} onInput=${on('title')} required maxlength="160" placeholder="O que acabamos de gravar?"><input value=${form.title} onInput=${on('title')} required maxlength="160" placeholder="O que acabamos de gravar?"/></${Field}><${Textarea} label="Roteiro" rows="7" maxlength="20000" placeholder="Cole o roteiro aqui" value=${form.script} onInput=${on('script')}/><${Field} label="Link do roteiro" type="url" value=${form.script_url} onInput=${on('script_url')} placeholder="https://docs.google.com/…"/><${Field} label="Clipes da câmera" value=${form.camera_clips} onInput=${on('camera_clips')} maxlength="200" placeholder="ex.: C4116 a C4119" class="mono"/><${Counter} value=${form.expected_files} onChange=${(v) => set('expected_files', v)}/><${Textarea} label="Observações" value=${form.notes} onInput=${on('notes')} maxlength="4000" rows="3" placeholder="ex.: o take 3 é o bom"/><${Submit} busy=${busy}>Salvar e anotar o próximo<//><p class="form-hint"><${Icon} name="check" size=${15}/>Seu rascunho fica guardado neste aparelho.</p></form></div>
<aside class="recording-side"><${Block} title=${`ANOTADOS NESTE DIA (${recorded.length})`}>${recorded.length ? recorded.map((d) => html`<${Card} key=${d.id} demand=${d} bundle=${bundle}/>`) : html`<p class="muted">A primeira anotação do dia aparece aqui.</p>`}<//><${Block} title="PEDIDOS ESPERANDO GRAVAÇÃO">${bundle.demands
    .filter((d) => d.status === 'requested' || d.id === clipId)
    .map(
      (d) =>
        html`<div class="requested-record"><span class="mono accent">${number(d.number)}</span><h3>${d.title}</h3>${
          clipId === d.id
            ? html`<form onSubmit=${async (e) => {
                e.preventDefault();
                setBusy(true);
                const r = await action(() => api.updateDemand(d.id, { camera_clips: clips }), 'Clipes anotados');
                if (r.ok) {
                  setClipId(null);
                  setClips('');
                }
                setBusy(false);
              }}><${Field} label="Clipes da câmera" value=${clips} onInput=${(e) => setClips(e.target.value)} maxlength="200" placeholder="ex.: C4116 a C4119"/><${Submit} busy=${busy}>Salvar clipes<//></form>`
            : html`<button class="button secondary" disabled=${busy} onClick=${async () => {
                setBusy(true);
                const r = await action(() => api.setStatus(d.id, 'recorded', null, form.shoot_date), 'Gravação marcada');
                if (r.ok) {
                  setClipId(d.id);
                  setClips(d.camera_clips || '');
                }
                setBusy(false);
              }}><${Icon} name="check"/>Gravamos hoje</button>`
        }</div>`,
    )}${!bundle.demands.some((d) => d.status === 'requested') && !clipId && html`<p class="muted">Nenhum pedido esperando gravação.</p>`}<//></aside></section>`;
}
