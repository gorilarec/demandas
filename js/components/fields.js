import { html } from '../../vendor/preact-htm.js';
import { Icon } from '../icons.js';
export function Field({ label, hint, children, ...props }) {
  return html`<label class="field"><span>${label}</span>${children || html`<input ...${props}/>`}${hint && html`<small>${hint}</small>`}</label>`;
}
export function Textarea({ label, hint, ...props }) {
  return html`<${Field} label=${label} hint=${hint}><textarea ...${props}/><//>`;
}
export function Counter({ value, onChange }) {
  return html`<div class="field"><span>Vídeos finais</span><div class="counter"><button type="button" class="icon-button" aria-label="Menos um vídeo" disabled=${value <= 1} onClick=${() => onChange(value - 1)}><${Icon} name="minus"/></button><output>${value}</output><button type="button" class="icon-button" aria-label="Mais um vídeo" disabled=${value >= 30} onClick=${() => onChange(value + 1)}><${Icon} name="plus"/></button><small>ganchos ou versões</small></div></div>`;
}
export function Submit({ busy, children, ...props }) {
  return html`<button class="button primary" type="submit" disabled=${busy} ...${props}>${busy ? 'Salvando…' : children}<${Icon} name=${busy ? 'clock' : 'arrow'}/></button>`;
}
export function Search({ value, onInput, placeholder = 'Buscar por título ou número' }) {
  return html`<label class="search"><${Icon} name="search"/><input type="search" value=${value} onInput=${onInput} placeholder=${placeholder} aria-label=${placeholder}/></label>`;
}
