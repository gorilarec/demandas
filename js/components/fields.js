import { html, useState } from '../../vendor/preact-htm.js';
import { Icon } from '../icons.js';
export function Field({ label, hint, children, ...props }) {
  return html`<label class="field"><span>${label}</span>${children || html`<input ...${props}/>`}${hint && html`<small>${hint}</small>`}</label>`;
}
export function Textarea({ label, hint, ...props }) {
  return html`<${Field} label=${label} hint=${hint}><textarea ...${props}/><//>`;
}
// Campo de senha com botão de mostrar/ocultar. O botão fica fora do <label> para não roubar o toque do campo.
export function PasswordField({ label, hint, ...props }) {
  const [shown, setShown] = useState(false);
  return html`<div class="password-field"><${Field} label=${label} hint=${hint} type=${shown ? 'text' : 'password'} autocapitalize="none" autocorrect="off" spellcheck="false" ...${props}/><button type="button" class="icon-button password-toggle" aria-label=${shown ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed=${shown} onClick=${() => setShown(!shown)}><${Icon} name=${shown ? 'eyeOff' : 'eye'}/></button></div>`;
}
export function Counter({ value, onChange }) {
  return html`<div class="field"><span>Vídeos finais</span><div class="counter"><button type="button" class="icon-button" aria-label="Menos um vídeo" disabled=${value <= 1} onClick=${() => onChange(value - 1)}><${Icon} name="minus"/></button><output>${value}</output><button type="button" class="icon-button" aria-label="Mais um vídeo" disabled=${value >= 30} onClick=${() => onChange(value + 1)}><${Icon} name="plus"/></button><small>ganchos ou versões</small></div></div>`;
}
export function Submit({ busy, busyLabel = 'Salvando…', children, ...props }) {
  return html`<button class="button primary" type="submit" disabled=${busy} ...${props}>${busy ? busyLabel : children}<${Icon} name=${busy ? 'clock' : 'arrow'}/></button>`;
}
export function Search({ value, onInput, placeholder = 'Buscar por título ou número' }) {
  return html`<label class="search"><${Icon} name="search"/><input type="search" value=${value} onInput=${onInput} placeholder=${placeholder} aria-label=${placeholder}/></label>`;
}
