import { html } from '../../vendor/preact-htm.js';
import { Icon } from '../icons.js';
export function Toast({ toast }) {
  return (
    toast &&
    html`<div class=${`toast ${toast.tone}`} role=${toast.tone === 'error' ? 'alert' : 'status'}><${Icon} name=${toast.tone === 'error' ? 'offline' : 'check'}/>${toast.message}</div>`
  );
}
