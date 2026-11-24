import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { api, action, toast } from '../store.js';
import { domain, fileSize, safeUrl, errorText } from '../util.js';
import { Icon } from '../icons.js';
export function Reference({ refItem: r, canRemove }) {
  const [url, setUrl] = useState(r.kind === 'link' ? safeUrl(r.url) : null);
  const [failed, setFailed] = useState(false);
  async function load() {
    try {
      setUrl(await api.signedUrl(r.storage_path));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }
  useEffect(() => {
    if (r.kind !== 'file') return;
    load();
    const timer = setInterval(load, 50 * 60000);
    return () => clearInterval(timer);
  }, [r.storage_path]);
  return html`<div class="reference-item">${r.kind === 'file' && r.mime?.startsWith('image/') && url ? html`<a href=${url} target="_blank" rel="noopener noreferrer"><img class="reference-image" src=${url} alt=${r.note || r.file_name}/></a>` : html`<${Icon} name=${r.kind === 'link' ? 'link' : 'file'}/>`}<div><a href=${url || undefined} target="_blank" rel="noopener noreferrer">${r.kind === 'link' ? domain(r.url) : r.file_name}<${Icon} name="external" size=${14}/></a><small>${r.note || (r.kind === 'link' ? r.url : fileSize(r.size_bytes))}</small>${failed && html`<button class="text-button" onClick=${load}>Carregar arquivo novamente</button>`}</div>${
    canRemove &&
    html`<button class="icon-button" aria-label="Remover referência" onClick=${() => {
      if (confirm('Remover esta referência?')) action(() => api.removeRef(r), 'Referência removida');
    }}><${Icon} name="trash" size=${17}/></button>`
  }</div>`;
}
