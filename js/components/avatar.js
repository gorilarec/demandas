import { html, useState } from '../../vendor/preact-htm.js';
import { avatarUrl } from '../util.js';
// Foto redonda da pessoa; sem foto (ou se a foto não carregar), a inicial do nome.
// `size` em px (padrão: o tamanho da classe .avatar). Com onClick vira botão.
export function Avatar({ person, size, class: extra = '', ...props }) {
  const [broken, setBroken] = useState(null);
  const path = person?.avatar_path || null;
  const initial = (person?.name || '').trim()[0]?.toUpperCase() || '?';
  const Tag = props.onClick ? 'button' : 'span';
  return html`<${Tag} class=${`avatar ${size ? 'sized' : ''} ${extra}`} style=${size ? `--avatar-size:${size}px` : undefined} ...${props}>${
    path && broken !== path
      ? html`<img src=${avatarUrl(path)} alt="" loading="lazy" decoding="async" onError=${() => setBroken(path)}/>`
      : initial
  }<//>`;
}
