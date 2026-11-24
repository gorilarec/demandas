import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import { api, refresh, markSeen, navigate, toast } from '../store.js';
import { readLocal, writeLocal, errorText } from '../util.js';
import { Field, Submit } from '../components/fields.js';
import { Icon } from '../icons.js';
const roleOptions = [
  ['cliente', 'bulb', 'Cliente'],
  ['social', 'camera', 'Social media'],
  ['trafego', 'chart', 'Gestor de tráfego'],
  ['outro', 'edit', 'Outro'],
];
export default function Login({ code }) {
  const saved = readLocal('gd-profile', {});
  const [name, setName] = useState(saved.name || '');
  const [role, setRole] = useState(roleOptions.some(([key]) => key === saved.role) ? saved.role : 'cliente');
  const [roleText, setRoleText] = useState(saved.roleText || '');
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!code);
  const entered = useRef(false);
  async function join(details) {
    if (entered.current) return;
    entered.current = true;
    setBusy(true);
    setError('');
    try {
      const other = role === 'outro' ? roleText.trim() : null;
      const joined = await api.joinWithCode(code, name.trim(), details?.kind === 'admin' ? 'editor' : role, other);
      writeLocal('gd-profile', { name: name.trim(), role, roleText: other || '', code });
      await refresh();
      await markSeen();
      navigate(joined.kind === 'admin' ? '/' : `/c/${joined.client_id}`);
      toast('Você está no painel');
    } catch (e) {
      setError(errorText(e));
      entered.current = false;
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let mounted = true;
    if (!code) return;
    setLoading(true);
    api
      .init()
      .then(() => api.peekCode(code))
      .then((data) => {
        if (!mounted) return;
        setInfo(data);
        if (saved.code === code && saved.name) join(data);
      })
      .catch((e) => mounted && setError(errorText(e)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [code]);
  return html`<main class="login"><div class="login-brand"><img src="icons/icon.svg" alt=""/><div>GORILAREC<span>DEMANDAS</span></div></div><div class="login-card"><div class="eyebrow">ACESSO AO PAINEL</div>${
    !code
      ? html`<h1>Você precisa do link de acesso<span class="heading-dot">.</span></h1><p>Peça seu link ao GORILAREC para entrar no painel da sua equipe.</p>`
      : loading
        ? html`<div class="skeleton" style="height:180px"></div>`
        : html`<h1>${info?.kind === 'admin' ? 'Acesso do editor' : info ? html`Painel de <span>${info.client_name}</span>` : 'Vamos conferir seu acesso'}</h1>${
            info &&
            html`<p>Da ideia ao vídeo, a gente acompanha junto.</p><form onSubmit=${(e) => {
              e.preventDefault();
              join(info);
            }}><${Field} label="Seu nome" value=${name} onInput=${(e) => setName(e.target.value)} autocomplete="name" required maxlength="60" placeholder="Como podemos chamar você?"/>${info.kind === 'client' && html`<fieldset class="choice-field role-field"><legend>Quem eu sou</legend><div class="role-picker">${roleOptions.map(([key, icon, label]) => html`<button type="button" class=${role === key ? 'selected' : ''} aria-pressed=${role === key} onClick=${() => setRole(key)}><${Icon} name=${icon}/>${label}</button>`)}</div></fieldset>${role === 'outro' && html`<${Field} label="Qual é a sua função?" value=${roleText} onInput=${(e) => setRoleText(e.target.value)} required minlength="2" maxlength="40" placeholder="Ex.: sócio, vendedor, designer"/>`}`}<${Submit} busy=${busy}>Entrar<//></form>`
          }`
  }${error && html`<p class="notice error" role="alert">${error}</p>`}</div><p class="login-footer mono">IDEIA · GRAVAÇÃO · EDIÇÃO · ENTREGA</p></main>`;
}
