import { html } from '../../vendor/preact-htm.js';
import { Icon } from '../icons.js';
import { Field } from './fields.js';
export const roleOptions = [
  ['cliente', 'bulb', 'Cliente'],
  ['social', 'camera', 'Social media'],
  ['trafego', 'chart', 'Gestor de tráfego'],
  ['outro', 'edit', 'Outro'],
];
// Bloco "Quem eu sou": quatro opções; "Outro" abre o campo para escrever a função.
export function RolePicker({ role, roleText, onRole, onRoleText }) {
  return html`<fieldset class="choice-field role-field"><legend>Quem eu sou</legend><div class="role-picker">${roleOptions.map(([key, icon, label]) => html`<button type="button" class=${role === key ? 'selected' : ''} aria-pressed=${role === key} onClick=${() => onRole(key)}><${Icon} name=${icon}/>${label}</button>`)}</div></fieldset>${role === 'outro' && html`<${Field} label="Qual é a sua função?" value=${roleText} onInput=${(e) => onRoleText(e.target.value)} required minlength="2" maxlength="40" placeholder="Ex.: sócio, vendedor, designer"/>`}`;
}
