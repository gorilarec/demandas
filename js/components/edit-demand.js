import { html, useState } from '../../vendor/preact-htm.js';
import { Field, Textarea, Counter, Submit } from './fields.js';
import { api, action } from '../store.js';
import { formats } from '../util.js';
export function EditDemand({ demand: d, admin, onDone }) {
  const [f, setF] = useState({
    title: d.title,
    script: d.script || '',
    script_url: d.script_url || '',
    notes: d.notes || '',
    camera_clips: d.camera_clips || '',
    format: d.format,
    needs_shoot: d.needs_shoot,
    priority: d.priority,
    due_date: d.due_date || '',
    expected_files: d.expected_files,
    ...(admin ? { number: d.number, kind: d.kind } : {}),
  });
  const [busy, setBusy] = useState(false);
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return html`<form onSubmit=${async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await action(
      () => api.updateDemand(d.id, { ...f, script_url: f.script_url || null, due_date: f.due_date || null }),
      'Vídeo atualizado',
    );
    setBusy(false);
    if (r.ok) onDone();
  }}><${Field} label="Nome do vídeo *" required maxlength="160" value=${f.title} onInput=${on('title')}/>${admin && html`<div class="form-two"><${Field} label="Número" type="number" min="1" required value=${f.number} onInput=${(e) => setF({ ...f, number: Number(e.target.value) })}/><${Field} label="Origem"><select value=${f.kind} onChange=${on('kind')}><option value="recorded">Anotado no set</option><option value="request">Pedido</option></select><//></div>`}<${Textarea} label="Roteiro" value=${f.script} maxlength="20000" rows="6" onInput=${on('script')}/><${Field} label="Link do roteiro" type="url" value=${f.script_url} onInput=${on('script_url')}/><${Field} label="Clipes da câmera" value=${f.camera_clips} maxlength="200" onInput=${on('camera_clips')}/><${Textarea} label="Observações" value=${f.notes} maxlength="4000" rows="3" onInput=${on('notes')}/><${Field} label="Formato"><select value=${f.format} onChange=${on('format')}>${Object.entries(formats).map(([k, v]) => html`<option value=${k}>${v}</option>`)}</select><//><${Field} label="Precisa gravar?"><select value=${f.needs_shoot === null ? 'unknown' : String(f.needs_shoot)} onChange=${(e) => setF({ ...f, needs_shoot: e.target.value === 'unknown' ? null : e.target.value === 'true' })}><option value="unknown">Não sei</option><option value="true">Sim</option><option value="false">Não, só edição</option></select><//><${Field} label="Prazo" type="date" value=${f.due_date} onInput=${on('due_date')}/><label class="switch-field"><span>Urgente</span><input type="checkbox" checked=${f.priority === 'urgent'} onChange=${(e) => setF({ ...f, priority: e.target.checked ? 'urgent' : 'normal' })}/></label><${Counter} value=${f.expected_files} onChange=${(v) => setF({ ...f, expected_files: v })}/><${Submit} busy=${busy}>Salvar alterações<//></form>`;
}
