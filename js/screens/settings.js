import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { PageHead, Block } from '../components/common.js';
import { ClientForm } from '../components/client-form.js';
import { api, action, navigate, toast } from '../store.js';
import { Icon } from '../icons.js';
import { Avatar } from '../components/avatar.js';
import { inviteUrl, copy, relative, errorText, roleName } from '../util.js';
export default function Settings({ client }) {
  const [code, setCode] = useState('');
  const [people, setPeople] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function load() {
    try {
      const [c, list] = await Promise.all([api.adminGetLink(client.id), api.adminListPeople(client.id)]);
      setCode(c);
      setPeople(list || []);
      setError('');
    } catch (e) {
      setError(errorText(e));
    }
  }
  useEffect(() => {
    load();
  }, [client.id]);
  const link = code ? inviteUrl(code) : '';
  async function run(fn, msg) {
    setBusy(true);
    const r = await action(fn, msg);
    setBusy(false);
    return r;
  }
  return html`<section class="settings-layout"><div><${PageHead} eyebrow="CLIENTE / CONFIGURAÇÃO" title="Ajustes" description=${client.name}/><${ClientForm} key=${client.id} client=${client} onSave=${(data) => action(() => api.adminUpdateClient(client.id, { name: data.name, accent: data.accent, drive_url: data.driveUrl, next_number: data.nextNumber }), 'Ajustes salvos')}/></div><aside class="settings-side"><${Block} title="LINK DE ACESSO"><p>Um só link para toda a equipe do cliente. Cada pessoa entra com o próprio e-mail e senha.</p>${error && html`<div class="notice error">${error}<button class="text-button" onClick=${load}>Tentar de novo</button></div>`}<code class="invite-link">${link || 'Preparando link…'}</code><div class="button-row"><button class="button primary" disabled=${!code || busy} onClick=${async () => {
    try {
      await copy(link);
      toast('Link copiado');
    } catch {
      toast('Selecione o link para copiar.', 'error');
    }
  }}><${Icon} name="copy"/>Copiar</button>${code && html`<a class="button secondary" href=${`https://wa.me/?text=${encodeURIComponent(`Olá! Este é o painel de vídeos de ${client.name}. Entre pelo link: ${link}`)}`} target="_blank" rel="noopener noreferrer">Mandar no WhatsApp<${Icon} name="external" size=${16}/></a>`}</div><button class="text-button danger" disabled=${busy} onClick=${async () => {
    if (
      confirm(
        'Gerar link novo? O link antigo para de funcionar e todo mundo sai. Quem já tem conta entra de novo pelo link novo, com o mesmo e-mail e senha.',
      )
    ) {
      const r = await run(() => api.adminRotateLink(client.id, true), 'Novo link gerado');
      if (r.ok) {
        setCode(r.value);
        load();
      }
    }
  }}>Gerar link novo</button><//><${Block} title="QUEM TEM ACESSO">${people.map(
    (p) =>
      html`<div class="member-row person-row" key=${p.person_id}><${Avatar} person=${p} class="small"/><div><b>${p.name}</b><small>${roleName(p)} · ${relative(p.last_seen_at)} · ${p.devices === 1 ? '1 aparelho' : `${p.devices || 0} aparelhos`}</small><small class="mono">${p.email}</small>${p.reset_allowed && html`<small class="accent">Senha liberada: vale a que a pessoa digitar na próxima entrada pelo link.</small>`}</div><div class="person-actions"><button class="text-button" disabled=${busy || p.reset_allowed} onClick=${async () => {
        if (
          confirm(
            `Redefinir a senha de ${p.name}? Na próxima vez que entrar pelo link, a senha que a pessoa digitar passa a valer.`,
          )
        ) {
          const r = await run(() => api.adminResetPassword(p.person_id), 'Senha liberada. Avise a pessoa para entrar pelo link.');
          if (r.ok) load();
        }
      }}>Redefinir senha</button><button class="text-button danger" disabled=${busy} onClick=${async () => {
        if (confirm(`Remover ${p.name}? A pessoa sai de todos os aparelhos e perde o acesso a este painel.`)) {
          const r = await run(() => api.adminRemovePerson(p.person_id, p.avatar_path), 'Acesso removido');
          if (r.ok) load();
        }
      }}>Remover</button></div></div>`,
  )}${!people.length && html`<p class="muted">As pessoas aparecem aqui quando entrarem pelo link com e-mail e senha.</p>`}<//><${Block} title="HISTÓRICO DO DRIVE"><p class="muted">Transforme os arquivos sem demanda em vídeos entregues. Versões com o mesmo número ficam juntas.</p><button class="button secondary" disabled=${busy} onClick=${async () => {
    if (confirm('Importar o que já está no Drive? Os arquivos sem demanda serão organizados como vídeos entregues.')) {
      const r = await run(() => api.adminImportHistory(client.id));
      if (r.ok) toast(`${r.value.demands} demandas e ${r.value.files} arquivos importados`);
    }
  }}><${Icon} name="download"/>Importar o que já está no Drive</button><//><${Block} title="ARQUIVAR CLIENTE"><p class="muted">O painel sai da lista de clientes ativos.</p><button class="button danger-button" disabled=${busy} onClick=${async () => {
    if (confirm(`Arquivar ${client.name}? O painel sairá da lista de clientes ativos.`)) {
      const r = await run(() => api.adminUpdateClient(client.id, { archived: true }), 'Cliente arquivado');
      if (r.ok) navigate('/');
    }
  }}>Arquivar cliente</button><//></aside></section>`;
}
