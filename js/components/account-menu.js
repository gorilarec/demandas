import { html, useState } from '../../vendor/preact-htm.js';
import { api, action, refresh, setState, navigate, toast } from '../store.js';
import { Icon } from '../icons.js';
import { Sheet } from './sheet.js';
import { Avatar } from './avatar.js';
import { Field, PasswordField, Submit } from './fields.js';
import { RolePicker, roleOptions } from './role-picker.js';
import { readLocal, writeLocal, errorText, errors, roleName, shrinkAvatar } from '../util.js';
const passwordErrors = {
  invalid_credentials: 'A senha atual não confere.',
  invalid_input: 'A nova senha precisa ter de 8 a 72 caracteres.',
  too_many_attempts: errors.too_many_attempts,
  weak_password: errors.weak_password,
};
// Menu do avatar ("Seu acesso"): foto, nome, "Quem eu sou", senha e os atalhos de sempre.
// `person` é a pessoa deste aparelho no painel aberto; foto, nome e função valem para todas as contas do aparelho.
export function AccountMenu({ state, person, admin, onClose, onTour }) {
  const saved = readLocal('gd-profile', {});
  const own = state.people.length ? state.people : person.id ? [person] : [];
  const [name, setName] = useState(person.name || '');
  const [role, setRole] = useState(roleOptions.some(([key]) => key === person.role_label) ? person.role_label : 'cliente');
  const [roleText, setRoleText] = useState(person.role_text || '');
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  async function choosePhoto(file) {
    if (!file || !own.length) return;
    setBusy(true);
    try {
      setPhoto('Preparando a foto…');
      const blob = await shrinkAvatar(file);
      setPhoto('Enviando a foto…');
      for (const one of own) await api.uploadAvatar(one, blob);
      await refresh();
      toast('Foto atualizada');
    } catch (e) {
      toast(errorText(e), 'error');
    }
    setPhoto(null);
    setBusy(false);
  }
  async function removePhoto() {
    if (!confirm('Remover sua foto? Volta a aparecer a inicial do seu nome.')) return;
    setBusy(true);
    try {
      for (const one of own.filter((p) => p.avatar_path)) await api.removeAvatar(one);
      await refresh();
      toast('Foto removida');
    } catch (e) {
      toast(errorText(e), 'error');
    }
    setBusy(false);
  }
  async function saveProfile(e) {
    e.preventDefault();
    setBusy(true);
    const clean = name.trim();
    const patch = admin
      ? { name: clean }
      : { name: clean, role_label: role, role_text: role === 'outro' ? roleText.trim() : null };
    const r = await action(() => api.updateProfile(patch), 'Perfil atualizado');
    if (r.ok) {
      try {
        writeLocal('gd-profile', { ...readLocal('gd-profile', {}), name: clean });
      } catch {
        /* O nome já foi salvo no banco. */
      }
      onClose();
    }
    setBusy(false);
  }
  async function changePassword(e) {
    e.preventDefault();
    setBusy(true);
    setPasswordError('');
    try {
      const r = await api.changePassword(oldPassword, newPassword);
      if (r?.ok) {
        setOldPassword('');
        setNewPassword('');
        setPasswordOpen(false);
        toast('Senha trocada');
      } else setPasswordError(passwordErrors[r?.error] || errorText({ code: r?.error }));
    } catch (e) {
      setPasswordError(passwordErrors[e.code] || errorText(e));
    }
    setBusy(false);
  }
  async function signOut() {
    const pending = state.pending.length;
    if (
      !confirm(
        pending
          ? `Há ${pending} anotações guardadas neste aparelho. Envie antes de sair para não perder o acesso a elas. Sair mesmo assim?`
          : 'Sair deste aparelho? Para voltar, entre com seu e-mail e senha.',
      )
    )
      return;
    setBusy(true);
    try {
      await api.signOutDevice();
      try {
        localStorage.removeItem('gd-profile');
        // Roteiros guardados para o teleprompter ler sem sinal saem junto com a conta.
        for (const key of Object.keys(localStorage)) if (/^gd-tp-[0-9a-f-]{36}-\d{4}-\d{2}-\d{2}$/.test(key)) localStorage.removeItem(key);
      } catch {
        /* Armazenamento bloqueado: nada a limpar. */
      }
      setState({ memberships: [], clients: [], people: [], bundles: {}, queue: [], pending: [], seen: {} });
      onClose();
      navigate('/');
    } catch (e) {
      toast(errorText(e), 'error');
    }
    setBusy(false);
  }
  return html`<${Sheet} title="Seu acesso" onClose=${() => !busy && onClose()}><div class="profile-head"><${Avatar} person=${person} size=${88}/><div class="profile-id"><b>${person.name}</b><small>${admin ? 'Editor' : roleName(person)}</small>${saved.email && html`<small class="mono">${saved.email}</small>`}</div></div><div class="button-row profile-photo-actions"><label class="button secondary file-label"><${Icon} name="image"/>${person.avatar_path ? 'Trocar foto' : 'Escolher foto'}<input type="file" accept="image/*" disabled=${busy || !own.length} onChange=${(
    e,
  ) => {
    choosePhoto(e.target.files[0]);
    e.target.value = '';
  }}/></label>${person.avatar_path && html`<button type="button" class="button secondary" disabled=${busy} onClick=${removePhoto}><${Icon} name="trash"/>Remover foto</button>`}</div>${photo && html`<div class="upload-progress" role="status"><span>${photo}</span><progress></progress></div>`}<form class="profile-form" onSubmit=${saveProfile}><${Field} label="Seu nome" value=${name} onInput=${(e) => setName(e.target.value)} autocomplete="name" required maxlength="60"/>${!admin && html`<${RolePicker} role=${role} roleText=${roleText} onRole=${setRole} onRoleText=${setRoleText}/>`}<${Submit} busy=${busy}>${admin ? 'Salvar nome' : 'Salvar perfil'}<//></form><div class="menu-list"><button type="button" aria-expanded=${passwordOpen} onClick=${() => {
    setPasswordError('');
    setPasswordOpen(!passwordOpen);
  }}><${Icon} name="lock"/>Trocar senha</button></div>${
    passwordOpen &&
    html`<form class="password-form" onSubmit=${changePassword}><${PasswordField} label="Senha atual" value=${oldPassword} onInput=${(e) => setOldPassword(e.target.value)} autocomplete="current-password" required maxlength="72"/><${PasswordField} label="Nova senha" value=${newPassword} onInput=${(e) => setNewPassword(e.target.value)} autocomplete="new-password" required minlength="8" maxlength="72" hint="Mínimo de 8 caracteres. Vale para todos os seus aparelhos."/>${passwordError && html`<p class="notice error" role="alert">${passwordError}</p>`}<${Submit} busy=${busy}>Trocar senha<//></form>`
  }${
    !admin &&
    state.clients.length > 1 &&
    html`<div class="menu-list plain"><span class="eyebrow">SEUS PAINÉIS</span>${state.clients.map((c) => html`<a href=${`#/c/${c.id}`} onClick=${onClose}><i class="client-dot" style=${`background:${c.accent}`}></i>${c.name}</a>`)}</div>`
  }<div class="menu-list plain"><a href="#/instalar" onClick=${onClose}><${Icon} name="download"/>Pôr na tela inicial</a><button type="button" onClick=${onTour}><${Icon} name="play"/>Ver tutorial</button><button type="button" class="danger" disabled=${busy} onClick=${signOut}><${Icon} name="exit"/>Sair deste aparelho</button></div><//>`;
}
