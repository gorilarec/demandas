import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import { api, refresh, markSeen, navigate, toast, getState, setState } from '../store.js';
import { readLocal, writeLocal, errorText, errors } from '../util.js';
import { Field, PasswordField, Submit } from '../components/fields.js';
import { RolePicker, roleOptions } from '../components/role-picker.js';
// Entrada em dois passos: e-mail + senha; se a conta ainda não existe neste painel, nome + "Quem eu sou".
// O link decide o painel; a conta decide quem é a pessoa. A senha nunca é guardada no aparelho.
const messages = {
  invalid_credentials: errors.invalid_credentials,
  too_many_attempts: errors.too_many_attempts,
  invalid_code: errors.invalid_code,
  invalid_input: 'Confira o e-mail e use uma senha de 8 caracteres ou mais.',
};
// Este aparelho já está ligado ao painel do link? Então abre direto, sem pedir a senha de novo.
function linkedPanel(info) {
  const { memberships, clients } = getState();
  if (info.kind === 'admin') return memberships.some((m) => m.kind === 'admin') ? '/' : null;
  const client = clients.find((c) => c.name === info.client_name && memberships.some((m) => m.client_id === c.id));
  return client ? `/c/${client.id}` : null;
}
export default function Login({ code }) {
  const saved = readLocal('gd-profile', {});
  const [email, setEmail] = useState(saved.email || '');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('account');
  const [name, setName] = useState(saved.name || '');
  const [role, setRole] = useState(roleOptions.some(([key]) => key === saved.role) ? saved.role : 'cliente');
  const [roleText, setRoleText] = useState(saved.roleText || '');
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!code);
  const sending = useRef(false);
  const form = useRef();
  const admin = info?.kind === 'admin';
  const mail = email.trim().toLowerCase();
  useEffect(() => {
    let mounted = true;
    // Aparelho de antes das contas: guardou o código do link, mas ainda não tem e-mail. Leva direto ao painel dele
    // para criar a conta, sem precisar achar o link de novo.
    if (!code && saved.code && !saved.email && !getState().demo) navigate(`/entrar/${saved.code}`);
    if (!code) return;
    setLoading(true);
    (async () => {
      try {
        await api.init();
        const data = await api.peekCode(code);
        if (!mounted) return;
        const panel = linkedPanel(data);
        if (panel) return navigate(panel);
        setInfo(data);
      } catch (e) {
        if (!mounted) return;
        setError(e.code === 'too_many_attempts' ? 'Muitas tentativas. Aguarde 15 minutos e tente de novo.' : errorText(e));
        // Link trocado: esquece o código guardado, para a entrada sem link (e-mail e senha) continuar disponível.
        if (e.code === 'invalid_code' && saved.code === code) {
          try {
            writeLocal('gd-profile', { ...saved, code: null });
          } catch {
            /* Sem espaço no aparelho: o aviso de link inválido já está na tela. */
          }
        }
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [code]);
  useEffect(() => {
    if (step === 'profile') form.current?.querySelector('input')?.focus();
  }, [step]);
  async function finish(entered) {
    await refresh();
    const state = getState();
    if (!state.memberships.length) return setError(errorText(state.error));
    try {
      await markSeen();
    } catch {
      /* Marcar a visita pode esperar o próximo carregamento. */
    }
    try {
      // Só e-mail, nome e código. A senha nunca vai para o aparelho.
      const me = state.people[0] || state.memberships[0];
      writeLocal('gd-profile', { email: mail, name: me?.name || name.trim(), code: code || saved.code || null });
    } catch {
      /* Sem espaço no aparelho: a entrada continua valendo. */
    }
    setPassword('');
    // Pelo link: o painel do link. Sem link: o editor vai para os clientes; os demais, para o primeiro painel.
    const first = state.memberships.some((m) => m.kind === 'admin') ? null : state.clients[0];
    navigate(entered.kind === 'client' && entered.client_id ? `/c/${entered.client_id}` : first ? `/c/${first.id}` : '/');
    toast('Você está no painel');
  }
  async function submit(e) {
    e.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      const { userId } = await api.init();
      setState({ userId });
      const other = !admin && role === 'outro' ? roleText.trim() : null;
      const profile = step === 'profile' ? { name: name.trim(), roleLabel: admin ? 'editor' : role, roleText: other } : null;
      const entered = code ? await api.enter(code, mail, password, profile) : await api.signIn(mail, password);
      if (entered?.ok) await finish(entered);
      else if (entered?.error === 'profile_required') setStep('profile');
      else if (entered?.error === 'invalid_input' && step === 'profile') setError(errors.invalid_input);
      else setError(messages[entered?.error] || errorText({ code: entered?.error }));
    } catch (e) {
      setError((step === 'account' && messages[e.code]) || errorText(e));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  const account = html`<${Field} key="email" label="E-mail" type="email" name="email" value=${email} onInput=${(e) => setEmail(e.target.value)} autocomplete="email" inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false" required maxlength="120" placeholder="voce@exemplo.com"/><${PasswordField} key="password" label="Senha" name="password" value=${password} onInput=${(e) => setPassword(e.target.value)} autocomplete="current-password" required minlength="8" maxlength="72" placeholder="Mínimo de 8 caracteres"/><p class="login-hint">${code ? 'Primeira vez? É só escolher uma senha (mínimo 8 caracteres). Já tem conta? Use a mesma.' : 'Primeira vez? Abra o link que o GORILAREC te mandou.'}</p>${!code && getState().demo && html`<p class="login-hint">Modo demonstração: entre com voce@demo.example e a senha demo1234.</p>`}<${Submit} busy=${busy} busyLabel="Entrando…">Entrar<//>`;
  const profile = html`<div key="note" class="account-note"><span>Conta nova para <b>${mail}</b></span><button type="button" class="text-button" disabled=${busy} onClick=${() => {
    setError('');
    setStep('account');
  }}>Usar outro e-mail</button></div><${Field} key="name" label="Seu nome" name="name" value=${name} onInput=${(e) => setName(e.target.value)} autocomplete="name" required maxlength="60" placeholder="Como podemos chamar você?"/>${!admin && html`<${RolePicker} role=${role} roleText=${roleText} onRole=${setRole} onRoleText=${setRoleText}/>`}<${Submit} busy=${busy} busyLabel="Criando sua conta…">Criar minha conta<//>`;
  const ready = !code || info;
  return html`<main class="login"><div class="login-brand"><img src="icons/icon.svg" alt=""/><div>GORILAREC<span>DEMANDAS</span></div></div><div class="login-card"><div class="eyebrow">ACESSO AO PAINEL</div>${
    loading
      ? html`<div class="skeleton" style="height:240px"></div>`
      : html`<h1>${!code ? html`Entrar com sua conta<span class="heading-dot">.</span>` : admin ? 'Acesso do editor' : info ? html`Painel de <span>${info.client_name}</span>` : 'Vamos conferir seu acesso'}</h1>${
          ready &&
          html`<p>${step === 'profile' ? 'Primeira vez por aqui. Diga quem é você para a equipe reconhecer seus pedidos e comentários.' : code ? 'Da ideia ao vídeo, a gente acompanha junto.' : 'Use o e-mail e a senha que você criou no link de acesso.'}</p><form ref=${form} onSubmit=${submit}>${step === 'profile' ? profile : account}</form>`
        }`
  }${error && html`<p class="notice error" role="alert">${error}</p>`}${code && !info && !loading && html`<a class="button secondary login-alt" href="#/">Entrar com e-mail e senha</a>`}</div><p class="login-footer mono">IDEIA · GRAVAÇÃO · EDIÇÃO · ENTREGA</p></main>`;
}
