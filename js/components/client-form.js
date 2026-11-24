import { html, useState } from '../../vendor/preact-htm.js';
import { Field, Textarea, Submit } from './fields.js';
const colors = ['#B8FF3B', '#38D5FF', '#A78BFA', '#FFB224', '#FF5C5C', '#2EE6A6', '#F472B6', '#EEF2F7'];
export function ClientForm({ client, onSave }) {
  const [name, setName] = useState(client?.name || '');
  const [accent, setAccent] = useState(client?.accent || colors[0]);
  const [driveUrl, setDriveUrl] = useState(client?.drive_folder_url || '');
  const [nextNumber, setNextNumber] = useState(client?.next_number || 1);
  const [busy, setBusy] = useState(false);
  const folders = driveUrl.split(/[\s,;]+/).filter(Boolean);
  const recognized =
    folders.length > 0 && folders.every((f) => /\/folders\/([\w-]+)|[?&]id=([\w-]+)/.test(f) || /^[\w-]{10,}$/.test(f));
  return html`<form class="form-panel" onSubmit=${async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({ name: name.trim(), accent, driveUrl, nextNumber });
    } finally {
      setBusy(false);
    }
  }}><${Field} label="Nome do cliente *" required maxlength="80" value=${name} onInput=${(e) => setName(e.target.value)} placeholder="Nome do negócio"/><fieldset class="choice-field"><legend>Cor do cliente</legend><div class="color-options">${colors.map((color) => html`<button type="button" style=${`--swatch:${color}`} class=${accent.toUpperCase() === color ? 'selected' : ''} aria-label=${`Cor ${color}`} aria-pressed=${accent.toUpperCase() === color} onClick=${() => setAccent(color)}></button>`)}</div></fieldset><${Field} label="Cor em hexadecimal" required pattern="#[a-fA-F0-9]{6}" maxlength="7" value=${accent} onInput=${(e) => setAccent(e.target.value)} placeholder="#B8FF3B"/><${Textarea} label="Pasta do Drive" rows="3" value=${driveUrl} onInput=${(e) => setDriveUrl(e.target.value)} placeholder="Cole o link da pasta (uma por linha, se houver mais de uma)" hint=${!driveUrl.trim() ? 'Opcional. É onde os vídeos prontos são entregues.' : recognized ? (folders.length > 1 ? `${folders.length} pastas reconhecidas` : 'Pasta reconhecida') : 'Use o link da pasta do Google Drive.'}/><${Field} label="Próximo número" type="number" min="1" step="1" required value=${nextNumber} onInput=${(e) => setNextNumber(Number(e.target.value))} hint="A numeração continua a partir daqui."/><${Submit} busy=${busy}>${client ? 'Salvar ajustes' : 'Criar cliente'}<//></form>`;
}
