import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { PageHead } from '../components/common.js';
import { Field, Textarea, Counter, Submit } from '../components/fields.js';
import { Icon } from '../icons.js';
import { api, action, uploadFiles, navigate, toast } from '../store.js';
import { safeUrl, domain, formats, readLocal, writeLocal } from '../util.js';
const blank = {
  title: '',
  script: '',
  format: 'vertical',
  needs_shoot: null,
  due_date: '',
  priority: 'normal',
  expected_files: 1,
  links: [],
};
export default function Request({ client, state }) {
  const key = `gd-draft-request-${state.demo ? 'demo' : 'live'}-${state.userId}-${client.id}`;
  const [form, setForm] = useState(() => readLocal(key, blank));
  const [url, setUrl] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  useEffect(() => {
    try {
      writeLocal(key, form);
    } catch {}
  }, [form]);
  const set = (k, v) => setForm({ ...form, [k]: v });
  function add() {
    if (!safeUrl(url) || url.length > 2000) {
      toast('Cole um link que comece com https://', 'error');
      return;
    }
    set('links', [...form.links, { url: url.trim(), note: '' }]);
    setUrl('');
  }
  function choose(e) {
    const chosen = [...e.target.files];
    const valid = chosen.filter((f) => f.size <= 50 * 1024 * 1024);
    if (valid.length !== chosen.length) toast('Arquivo grande, cole o link. O limite é 50 MB.', 'error');
    setFiles([...files, ...valid]);
    e.target.value = '';
  }
  async function send(e) {
    e.preventDefault();
    if (url.trim()) {
      toast('Adicione o link à lista antes de enviar.', 'error');
      return;
    }
    setBusy(true);
    const r = await action(() =>
      api.createDemand(client.id, { ...form, title: form.title.trim(), kind: 'request', due_date: form.due_date || null }),
    );
    if (r.ok) {
      const failed = await uploadFiles(r.value, files, (name, p) => setProgress({ name, p }));
      try {
        localStorage.removeItem(key);
      } catch {}
      toast(
        failed.length ? 'Pedido salvo. Tente enviar os arquivos pendentes no detalhe.' : 'Pedido enviado',
        failed.length ? 'error' : 'success',
      );
      navigate(`/c/${client.id}/d/${r.value.id}`);
    }
    setBusy(false);
  }
  return html`<section class="request-page"><${PageHead} eyebrow="DA IDEIA À PRODUÇÃO" title="Pedir vídeo" description="Conte a ideia. A gente dá o próximo passo."/><form class="form-panel" onSubmit=${send}><div class="form-section-label"><span>01</span> A IDEIA</div><${Field} label="Título *" required maxlength="160" placeholder="Ex.: Vídeo sobre o novo recurso" value=${form.title} onInput=${(e) => set('title', e.target.value)}/><${Textarea} label="O que você quer?" rows="7" maxlength="20000" placeholder="Sua ideia, roteiro e o que não pode faltar…" value=${form.script} onInput=${(e) => set('script', e.target.value)}/><div class="form-section-label"><span>02</span> REFERÊNCIAS</div><div class="inline-field"><${Field} label="Link de referência" type="url" placeholder="Instagram, TikTok, YouTube…" value=${url} onInput=${(e) => setUrl(e.target.value)}/><button class="button secondary" type="button" onClick=${add}>Adicionar</button></div><div class="reference-list">${form.links.map(
    (l, i) =>
      html`<div class="attachment"><${Icon} name="link"/><span><b>${domain(l.url)}</b><small>${l.url}</small></span><button type="button" class="icon-button" aria-label="Remover link" onClick=${() =>
        set(
          'links',
          form.links.filter((_, j) => j !== i),
        )}><${Icon} name="close"/></button></div>`,
  )}</div><label class="upload-button"><${Icon} name="upload"/><span>Enviar arquivo<small>Imagem, vídeo, áudio ou PDF · até 50 MB</small></span><input type="file" multiple accept="image/*,video/*,audio/*,application/pdf" onChange=${choose} disabled=${busy}/></label>${files.map((f, i) => html`<div class="attachment"><${Icon} name="file"/><span>${f.name}</span><button type="button" class="icon-button" aria-label=${`Remover ${f.name}`} onClick=${() => setFiles(files.filter((_, j) => i !== j))}><${Icon} name="close"/></button></div>`)}<div class="form-section-label"><span>03</span> PARA ORGANIZAR</div><${Field} label="Formato"><select value=${form.format} onChange=${(e) => set('format', e.target.value)}>${Object.entries(formats).map(([k, v]) => html`<option value=${k}>${v}</option>`)}</select><//><fieldset class="choice-field"><legend>Precisa gravar?</legend><div class="choice-row">${[
    [true, 'Sim'],
    [false, 'Não, só edição'],
    [null, 'Não sei'],
  ].map(
    ([v, label]) =>
      html`<button type="button" aria-pressed=${form.needs_shoot === v} class=${form.needs_shoot === v ? 'selected' : ''} onClick=${() => set('needs_shoot', v)}>${label}</button>`,
  )}</div></fieldset><div class="form-two"><${Field} label="Prazo (opcional)" type="date" value=${form.due_date} onInput=${(e) => set('due_date', e.target.value)}/><label class="switch-field"><span>Urgente<small>Precisa de atenção especial</small></span><input type="checkbox" role="switch" checked=${form.priority === 'urgent'} onChange=${(e) => set('priority', e.target.checked ? 'urgent' : 'normal')}/></label></div><${Counter} value=${form.expected_files} onChange=${(v) => set('expected_files', v)}/>${progress && html`<div class="upload-progress" role="status"><span>Enviando ${progress.name} · ${progress.p}%</span><progress value=${progress.p} max="100"></progress></div>`}<${Submit} busy=${busy}>Enviar pedido<//></form></section>`;
}
