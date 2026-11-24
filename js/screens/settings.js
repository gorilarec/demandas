import { html, useState, useEffect } from '../../vendor/preact-htm.js';
import { PageHead, Block } from '../components/common.js';
import { ClientForm } from '../components/client-form.js';
import { api, action, navigate, toast } from '../store.js';
import { Icon } from '../icons.js';
import { inviteUrl, copy, relative, errorText, roleName } from '../util.js';
export default function Settings({ client }) {
  const [code, setCode] = useState('');
  const [members, setMembers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function load() {
    try {
      const [c, m] = await Promise.all([api.adminGetLink(client.id), api.listMembers(client.id)]);
      setCode(c);
      setMembers(m);
      setError('');
    } catch (e) {
      setError(errorText(e));
    }
  }
  useEffect(() => {
    load();
  }, [client.id]);
  const grouped = [...members]
    .sort((a, b) => (b.last_seen_at || b.created_at || '').localeCompare(a.last_seen_at || a.created_at || ''))
    .filter((m, i, list) => list.findIndex((x) => x.name.trim().toLowerCase() === m.name.trim().toLowerCase()) === i);
  const link = code ? inviteUrl(code) : '';
  async function run(fn, msg) {
    setBusy(true);
    const r = await action(fn, msg);
    setBusy(false);
    return r;
  }
  return html`<section class="settings-layout"><div><${PageHead} eyebrow="CLIENTE / CONFIGURAÇÃO" title="Ajustes" description=${client.name}/><${ClientForm} key=${client.id} client=${client} onSave=${(data) => action(() => api.adminUpdateClient(client.id, { name: data.name, accent: data.accent, drive_url: data.driveUrl, next_number: data.nextNumber }), 'Ajustes salvos')}/></div><aside class="settings-side"><${Block} title="LINK DE ACESSO"><p>Um só link para o cliente e a social media.</p>${error && html`<div class="notice error">${error}<button class="text-button" onClick=${load}>Tentar de novo</button></div>`}<code class="invite-link">${link || 'Preparando link…'}</code><div class="button-row"><button class="button primary" disabled=${!code || busy} onClick=${async () => {
    try {
      await copy(link);
      toast('Link copiado');
    } catch {
      toast('Selecione o link para copiar.', 'error');
    }
  }}><${Icon} name="copy"/>Copiar</button>${code && html`<a class="button secondary" href=${`https://wa.me/?text=${encodeURIComponent(`Olá! Este é o painel de vídeos de ${client.name}. Entre pelo link: ${link}`)}`} target="_blank" rel="noopener noreferrer">Mandar no WhatsApp<${Icon} name="external" size=${16}/></a>`}</div><button class="text-button danger" disabled=${busy} onClick=${async () => {
    if (confirm('Gerar link novo? O link antigo para de funcionar e todo mundo sai.')) {
      const r = await run(() => api.adminRotateLink(client.id, true), 'Novo link gerado');
      if (r.ok) {
        setCode(r.value);
        load();
      }
    }
  }}>Gerar link novo</button><//><${Block} title="QUEM TEM ACESSO">${grouped.map(
    (m) =>
      html`<div class="member-row"><span class="avatar small">${m.name[0]}</span><div><b>${m.name}</b><small>${roleName(m)} · ${relative(m.last_seen_at)}</small></div><button class="text-button danger" disabled=${busy} onClick=${async () => {
        if (confirm(`Remover o acesso de ${m.name} neste aparelho?`)) {
          const r = await run(() => api.adminRemoveMember(m.id), 'Acesso removido');
          if (r.ok) load();
        }
      }}>Remover</button></div>`,
  )}${!grouped.length && html`<p class="muted">Os nomes aparecem aqui quando a equipe entrar pelo link.</p>`}<//><${Block} title="HISTÓRICO DO DRIVE"><p class="muted">Transforme os arquivos sem demanda em vídeos entregues. Versões com o mesmo número ficam juntas.</p><button class="button secondary" disabled=${busy} onClick=${async () => {
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
