import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import { PageHead, Block } from '../components/common.js';
import { Field, Textarea, Counter, Submit } from '../components/fields.js';
import { Card } from '../components/card.js';
import { api, action, record, recordMany, refresh, retryEntry, toast, setState } from '../store.js';
import { today, readLocal, writeLocal, number, date, safeUrl, errorText } from '../util.js';
import { Icon } from '../icons.js';
// Um bloco = um dia de gravação: a data, UM link (roteiros ou pasta do material) e os vídeos gravados.
const blank = () => ({
  title: '',
  script: '',
  script_url: '',
  camera_clips: '',
  notes: '',
  expected_files: 1,
  shoot_date: today(),
  link: null, // null = mostra o link já salvo do bloco; texto = alteração ainda não salva
  many: false,
  bulk: '',
  more: false,
});
const MAX_BATCH = 40;
// Rascunho de outro dia sem nada digitado abre no dia de hoje (ninguém anota no bloco errado sem querer).
function loadDraft(key) {
  const d = { ...blank(), ...readLocal(key, {}) };
  const typed = d.title || d.bulk || d.script || d.camera_clips || d.notes || d.link;
  return d.saved_on === today() || typed ? d : { ...blank(), more: !!d.more, many: !!d.many };
}
// "docs.google.com/…" colado sem o começo ganha https:// sozinho.
const fixLink = (text) => {
  const v = (text || '').trim();
  return v && !/^https?:\/\//i.test(v) && /^[\w-]+(\.[\w-]+)+(\/|$)/.test(v) ? `https://${v}` : v;
};
const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
// Lista colada: um nome por linha. Tira marcador de lista ("- ", "• ", "1. ", "2) ") e linhas repetidas.
export function parseNames(text) {
  const names = [];
  for (const line of (text || '').split(/\r?\n/)) {
    const name = line
      .replace(/^\s*(?:[-•*–—]\s+|\d{1,2}[.)]\s+)/, '')
      .trim()
      .slice(0, 160);
    if (name && !names.some((n) => same(n, name))) names.push(name);
  }
  return names;
}
export default function Recording({ client, bundle, state }) {
  const key = `gd-draft-record-${state.demo ? 'demo' : 'live'}-${state.userId}-${client.id}`;
  const [form, setForm] = useState(() => loadDraft(key));
  const [busy, setBusy] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [clipId, setClipId] = useState(null);
  const [clips, setClips] = useState('');
  const formRef = useRef();
  useEffect(() => {
    try {
      writeLocal(key, { ...form, saved_on: today() });
    } catch {
      /* The live form remains available when storage is full. */
    }
  }, [form]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const on = (key) => (e) => set(key, e.target.value);
  const day = form.shoot_date;
  const pending = state.pending.filter((p) => p.clientId === client.id);
  const shoot = bundle.shoots.find((s) => s.shot_on === day);
  const recorded = bundle.demands.filter((d) => shoot && d.shoot_id === shoot.id).sort((a, b) => a.number - b.number);
  const savedLink = shoot?.link_url || '';
  const link = form.link ?? savedLink;
  const linkDirty = form.link != null && form.link.trim() !== savedLink;
  const linkBad = !!link.trim() && !safeUrl(link.trim());
  const names = form.many ? parseNames(form.bulk) : [];
  const blocks = bundle.shoots
    .map((s) => {
      const list = bundle.demands.filter((d) => d.shoot_id === s.id);
      return { ...s, total: list.length, done: list.filter((d) => ['delivered', 'approved'].includes(d.status)).length };
    })
    .filter((b) => b.total || b.link_url)
    .sort((a, b) => b.shot_on.localeCompare(a.shot_on));
  const focusName = () => formRef.current?.querySelector('[data-name-input]')?.focus();
  function openDay(value) {
    setForm((f) => ({ ...f, shoot_date: value, link: null }));
  }
  async function saveLink() {
    if (form.link == null || savingLink || !day) return;
    const value = fixLink(form.link);
    if (value !== form.link) set('link', value);
    if (value === savedLink || (value && !safeUrl(value))) return;
    setSavingLink(true);
    try {
      await api.updateShoot(client.id, day, { link_url: value || null });
      await refresh();
      set('link', null);
      toast(value ? 'Link do bloco salvo' : 'Link do bloco removido');
    } catch (e) {
      // Sem sinal: o link fica no rascunho e vai junto com a próxima anotação.
      if (e.code === 'network') setState({ offline: true });
      else toast(errorText(e), 'error');
    }
    setSavingLink(false);
  }
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    const typedLink = form.link == null ? '' : fixLink(form.link);
    if (typedLink && !safeUrl(typedLink)) return toast('O link do bloco precisa ser um endereço completo (https://…)', 'error');
    const already = (name) => recorded.some((d) => same(d.title, name)) || pending.some((p) => p.payload.shoot_date === day && same(p.payload.title, name));
    const shootLink = typedLink && typedLink !== savedLink ? { shoot_link: typedLink } : {};
    setBusy(true);
    if (form.many) {
      const fresh = names.filter((n) => !already(n));
      const skipped = names.length - fresh.length;
      if (names.length > MAX_BATCH) toast(`No máximo ${MAX_BATCH} vídeos por vez. Divida a lista em duas.`, 'error');
      else if (!fresh.length) toast(names.length ? 'Esses vídeos já estão anotados neste dia' : 'Escreva um nome por linha', 'error');
      else {
        const r = await recordMany(
          client.id,
          fresh.map((title, i) => ({ kind: 'recorded', title, shoot_date: day, ...(i === 0 ? shootLink : {}) })),
        );
        const left = r.failed.map((p) => p.title);
        if (r.sent || r.kept) setForm((f) => ({ ...f, bulk: left.join('\n'), link: r.sent ? null : f.link }));
        if (skipped && !left.length) toast(`${r.sent + r.kept} anotados. ${skipped} já estavam neste dia.`);
      }
    } else if (already(form.title)) toast('Esse vídeo já está anotado neste dia', 'error');
    else {
      const sent = await record(client.id, {
        kind: 'recorded',
        title: form.title.trim(),
        script: form.script,
        script_url: form.script_url || null,
        camera_clips: form.camera_clips,
        notes: form.notes,
        expected_files: form.expected_files,
        shoot_date: day,
        ...shootLink,
      });
      if (sent) {
        setForm((f) => ({ ...blank(), shoot_date: f.shoot_date, more: f.more, link: sent === 'sent' ? null : f.link }));
        focusName();
      }
    }
    setBusy(false);
  }
  return html`<section class="recording-layout"><div><${PageHead} eyebrow="NO SET / BLOCO DE GRAVAÇÃO" title="Gravação" description="Um bloco por dia: a data, um link só e os vídeos gravados."/>
${pending.length > 0 && html`<div class="notice pending" role="status"><${Icon} name="offline"/><div><b>${pending.length} ${pending.length === 1 ? 'anotação guardada' : 'anotações guardadas'}, envio quando voltar o sinal</b>${pending.map((p) => html`<div class="pending-item">${p.payload.title}${p.error && html`<p class="danger">${p.error}<button type="button" class="text-button" onClick=${() => retryEntry(p.id)}>Tentar de novo</button></p>`}</div>`)}</div></div>`}
<form class="form-panel" ref=${formRef} onSubmit=${save}>
<div class="block-step"><span class="step-number">1</span><b>O bloco</b></div>
<${Field} label="Dia da gravação" type="date" required value=${day} onInput=${(e) => openDay(e.target.value)}/>
${day && day !== today() && html`<div class="notice other-day" role="status"><span>Você está no bloco de <b>${date(day)}</b>, que não é hoje.</span><button type="button" class="text-button" onClick=${() => openDay(today())}>Ir para hoje</button></div>`}
<div class="block-link"><${Field} label="Link do bloco" hint=${linkBad ? null : 'Um link só para o dia todo: o documento dos roteiros ou a pasta do material. Cada vídeo é achado ali pelo nome.'}><input type="url" inputmode="url" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="2000" value=${link} onInput=${on('link')} onBlur=${saveLink} placeholder="https://docs.google.com/… ou pasta do Drive" aria-invalid=${linkBad}/></${Field}>
${linkBad && html`<p class="field-error">Cole o endereço completo, começando com https://</p>`}
${!linkBad && (linkDirty || savedLink) && html`<div class="link-state">${linkDirty ? html`<button type="button" class="button secondary" disabled=${savingLink} onClick=${saveLink}><${Icon} name="check" size=${16}/>${savingLink ? 'Salvando…' : 'Salvar link'}</button>` : html`<span class="saved"><${Icon} name="check" size=${15}/>Link salvo neste bloco</span><a class="text-button" href=${safeUrl(savedLink)} target="_blank" rel="noopener noreferrer"><${Icon} name="external" size=${15}/>Abrir</a>`}</div>`}</div>
<div class="block-step"><span class="step-number">2</span><b>Os vídeos gravados</b></div>
<div class="choice-row mode-row" role="group" aria-label="Como anotar"><button type="button" aria-pressed=${!form.many} class=${!form.many ? 'selected' : ''} onClick=${() => set('many', false)}>Um por vez</button><button type="button" aria-pressed=${form.many} class=${form.many ? 'selected' : ''} onClick=${() => set('many', true)}>Vários de uma vez</button></div>
${
  form.many
    ? html`<${Field} label="Nomes dos vídeos (um por linha)" hint="Use o mesmo nome do roteiro. O vídeo pronto que subir no Drive com esse nome é marcado como entregue sozinho."><textarea data-name-input rows="7" maxlength="8000" value=${form.bulk} onInput=${on('bulk')} placeholder=${'Roteiro 6\nCTA 1\nCTA 2'}/></${Field}><${Submit} busy=${busy} disabled=${busy || !names.length}>${names.length > 1 ? `Anotar ${names.length} vídeos` : names.length === 1 ? 'Anotar 1 vídeo' : 'Anotar vídeos'}<//>`
    : html`<${Field} label="Nome do vídeo *" hint="Use o mesmo nome do roteiro. O vídeo pronto que subir no Drive com esse nome é marcado como entregue sozinho."><input data-name-input value=${form.title} onInput=${on('title')} required maxlength="160" placeholder="O que acabamos de gravar?"/></${Field}><${Field} label="Clipes da câmera" value=${form.camera_clips} onInput=${on('camera_clips')} maxlength="200" placeholder="ex.: C4116 a C4119" class="mono"/>
<button type="button" class="text-button details-toggle" aria-expanded=${form.more} onClick=${() => set('more', !form.more)}><${Icon} name=${form.more ? 'minus' : 'plus'} size=${16}/>${form.more ? 'Menos detalhes' : 'Mais detalhes (roteiro, ganchos, observações)'}</button>
${form.more && html`<div class="more-fields"><${Textarea} label="Roteiro" rows="6" maxlength="20000" placeholder="Cole o roteiro aqui, se quiser" value=${form.script} onInput=${on('script')}/><${Field} label="Link só deste vídeo" type="url" value=${form.script_url} onInput=${on('script_url')} placeholder="Só se for diferente do link do bloco"/><${Counter} value=${form.expected_files} onChange=${(v) => set('expected_files', v)}/><${Textarea} label="Observações" value=${form.notes} onInput=${on('notes')} maxlength="4000" rows="3" placeholder="ex.: o take 3 é o bom"/></div>`}
<${Submit} busy=${busy}>Anotar e ir para o próximo<//>`
}
<p class="form-hint"><${Icon} name="check" size=${15}/>Seu rascunho fica guardado neste aparelho.</p></form></div>
<aside class="recording-side"><${Block} title=${`VÍDEOS DESTE BLOCO · ${date(day)} (${recorded.length})`}>${recorded.length ? recorded.map((d) => html`<${Card} key=${d.id} demand=${d} bundle=${bundle}/>`) : html`<p class="muted">O primeiro vídeo anotado neste dia aparece aqui.</p>`}<//>
${blocks.length > 0 && html`<${Block} title="BLOCOS DE GRAVAÇÃO"><div class="block-list">${blocks.map((b) => html`<button type="button" key=${b.id} class=${`block-row ${b.shot_on === day ? 'selected' : ''}`} aria-pressed=${b.shot_on === day} onClick=${() => openDay(b.shot_on)}><span class="mono block-date">${date(b.shot_on)}<small>${b.shot_on.slice(0, 4)}</small></span><span class="block-info"><b>${b.total} ${b.total === 1 ? 'vídeo' : 'vídeos'}</b><small>${b.done} ${b.done === 1 ? 'entregue' : 'entregues'}${b.link_url ? ' · com link' : ' · sem link'}</small></span><${Icon} name="chevron" size=${16}/></button>`)}</div><//>`}
<${Block} title="PEDIDOS ESPERANDO GRAVAÇÃO">${bundle.demands
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
                const r = await action(() => api.setStatus(d.id, 'recorded', null, day), 'Gravação marcada');
                if (r.ok) {
                  setClipId(d.id);
                  setClips(d.camera_clips || '');
                }
                setBusy(false);
              }}><${Icon} name="check"/>${day === today() ? 'Gravamos hoje' : `Gravamos em ${date(day)}`}</button>`
        }</div>`,
    )}${!bundle.demands.some((d) => d.status === 'requested') && !clipId && html`<p class="muted">Nenhum pedido esperando gravação.</p>`}<//></aside></section>`;
}
