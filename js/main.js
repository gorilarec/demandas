import { html, render, useState, useEffect } from '../vendor/preact-htm.js';
import { useStore, boot, navigate } from './store.js';
import { Icon } from './icons.js';
import { Toast } from './components/toast.js';
import { Avatar } from './components/avatar.js';
import { AccountMenu } from './components/account-menu.js';
import { Skeleton, Empty } from './components/common.js';
import { readLocal, writeLocal, errorText, roleName } from './util.js';
import Login from './screens/login.js';
import Clients from './screens/clients.js';
import Demands from './screens/demands.js';
import Detail from './screens/detail.js';
import Recording from './screens/recording.js';
import Request from './screens/request.js';
import Queue from './screens/queue.js';
import NewClient from './screens/new-client.js';
import Settings from './screens/settings.js';
import Drive from './screens/drive.js';
import Install from './screens/install.js';
import Teleprompter, { tpCacheKey } from './screens/teleprompter.js';
import { Tour } from './components/tour.js';
import { tourSteps } from './tours.js';
function App() {
  const state = useStore();
  const [hash, setHash] = useState(location.hash || '#/');
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const fn = () => {
      setHash(location.hash || '#/');
      document.querySelector('.content')?.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', fn);
    boot();
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  const parts = hash.replace(/^#\/?/, '').split('/');
  const admin = state.memberships.some((m) => m.kind === 'admin');
  const client = parts[0] === 'c' ? state.clients.find((c) => c.id === parts[1]) : null;
  // O vínculo deste aparelho no painel aberto e a pessoa (conta) por trás dele: nome, função e foto.
  const member = (client && state.memberships.find((m) => m.client_id === client.id)) || state.memberships[0];
  const me = (member && state.people.find((p) => p.id === member.person_id)) || member;
  const bundle = client && state.bundles[client.id];
  const section = parts[2] || 'demands';
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', client?.accent || '#B8FF3B');
    document.title = `${client?.name || 'GORILAREC'} · Demandas`;
  }, [client?.id, client?.accent]);
  useEffect(() => {
    if (state.ready && parts[0] === '' && !admin && state.clients.length) navigate(`/c/${state.clients[0].id}`);
  }, [state.ready, state.clients.length, hash]);
  // Tutorial de primeira entrada (uma vez por aparelho e por contexto).
  const [tour, setTour] = useState(null);
  const onBoard = !!client && !!bundle && section === 'demands';
  const tourName =
    !state.ready || !member || parts[0] === 'entrar'
      ? null
      : admin
        ? onBoard
          ? 'admin-cliente'
          : parts[0] === ''
            ? 'admin-inicio'
            : null
        : onBoard
          ? 'cliente'
          : null;
  useEffect(() => {
    if (tour && tourName !== tour) setTour(null);
    if (!tourName || tour) return;
    const forced = new URLSearchParams(location.search).get('tour') === '1';
    if (state.demo ? !forced : readLocal(`gd-tour-${tourName}`, false)) return;
    if (tourName === 'admin-inicio' && !state.clients.length) return;
    const timer = setTimeout(() => setTour(tourName), 600);
    return () => clearTimeout(timer);
  }, [tourName, state.ready, state.clients.length]);
  function closeTour() {
    if (!state.demo) {
      try {
        writeLocal(`gd-tour-${tour}`, true);
      } catch {}
    }
    setTour(null);
  }
  // Teleprompter: #/c/ID/tp/AAAA-MM-DD[/DEMANDA]. Ocupa a tela toda, sem menu.
  const tpDay = parts[0] === 'c' && parts[2] === 'tp' && /^\d{4}-\d{2}-\d{2}$/.test(parts[3] || '') ? parts[3] : null;
  // Abriu sem sinal: o painel não carregou. Não é para cair na tela de entrada (parece que a conta saiu).
  const down = (state.offline || state.error?.code === 'network') && !(client && bundle);
  // Sem sinal no set: o teleprompter abre com os roteiros que ficaram guardados neste aparelho.
  const kept = tpDay && down ? readLocal(tpCacheKey(parts[1], tpDay), null) : null;
  if (kept?.demands?.length)
    return html`<${Teleprompter} key=${`${parts[1]}-${tpDay}`} offline=${true} client=${kept.client} bundle=${{ shoots: [{ id: 'guardado', shot_on: tpDay }], demands: kept.demands.map((d) => ({ ...d, shoot_id: 'guardado' })) }} admin=${false} day=${tpDay} demandId=${parts[4] || null}/><${Toast} toast=${state.toast}/>`;
  if (!state.ready || (down && !member && parts[0] !== 'entrar')) {
    return html`<div class="boot"><div class="login-brand"><img src="icons/icon.svg" alt=""/><div>GORILAREC<span>DEMANDAS</span></div></div>${state.error ? html`<div class="notice error">${errorText(state.error)}</div><button class="button primary" onClick=${boot}>Tentar novamente</button>` : html`<${Skeleton}/>`}</div>`;
  }
  if (parts[0] === 'entrar' || !member)
    return html`<${Login} key=${parts[1] || 'no-code'} code=${parts[0] === 'entrar' ? parts[1] : null}/><${Toast} toast=${state.toast}/>`;
  if (tpDay && client && bundle)
    return html`<${Teleprompter} key=${`${client.id}-${tpDay}`} client=${client} bundle=${bundle} admin=${admin} day=${tpDay} demandId=${parts[4] || null}/><${Toast} toast=${state.toast}/>`;
  const rootNav = [
    ['/', 'grid', 'Clientes'],
    ['/fila', 'queue', 'Fila'],
    ['/clientes/novo', 'plus', 'Novo cliente'],
  ];
  const cid = client?.id || state.clients[0]?.id;
  const clientNav = [
    [`/c/${cid}`, 'grid', 'Demandas'],
    [`/c/${cid}/gravacao`, 'camera', 'Gravação'],
    [`/c/${cid}/pedir`, 'plus', admin ? 'Pedir' : 'Pedir vídeo'],
  ];
  const unmatched = bundle?.files.filter((f) => !f.demand_id && !f.ignored && !f.removed_at).length || 0;
  const nav = client
    ? [
        ...clientNav,
        ...(admin
          ? [
              [`/c/${cid}/drive`, 'drive', 'Drive', unmatched],
              [`/c/${cid}/ajustes`, 'settings', 'Ajustes'],
            ]
          : []),
      ]
    : admin
      ? rootNav
      : clientNav;
  function navItem([path, icon, label, badge], bottom = false) {
    const active = hash === `#${path}` || hash === `#${path}/` || (path === `/c/${cid}` && section === 'd');
    return html`<a class=${`${active ? 'active' : ''} ${icon === 'plus' ? 'nav-create' : ''}`} href=${`#${path}`} aria-current=${active ? 'page' : undefined}><span class="nav-icon"><${Icon} name=${icon}/>${badge > 0 && html`<b>${badge}</b>`}</span><span>${label}</span></a>`;
  }
  let page;
  if (parts[0] === 'instalar') page = html`<${Install} state=${state}/>`;
  else if (client && bundle) {
    if (['drive', 'ajustes'].includes(section) && !admin)
      page = html`<${Empty} title="Acesso restrito" description="Esta área é do editor."/>`;
    else if (section === 'gravacao')
      page = html`<${Recording} key=${client.id} client=${client} bundle=${bundle} state=${state}/>`;
    else if (section === 'pedir') page = html`<${Request} key=${client.id} client=${client} state=${state}/>`;
    else if (section === 'drive') page = html`<${Drive} client=${client} bundle=${bundle}/>`;
    else if (section === 'ajustes') page = html`<${Settings} client=${client}/>`;
    else
      page = html`<${Demands} key=${client.id} client=${client} bundle=${bundle} state=${state} admin=${admin}/>${section === 'd' && html`<${Detail} key=${parts[3]} client=${client} bundle=${bundle} demandId=${parts[3]} state=${state} admin=${admin}/>`}`;
  } else if (admin && parts[0] === 'fila') page = html`<${Queue} state=${state}/>`;
  else if (admin && parts[0] === 'clientes' && parts[1] === 'novo') page = html`<${NewClient}/>`;
  else if (admin && parts[0] === '') page = html`<${Clients} state=${state}/>`;
  else page = html`<${Empty} title="Painel indisponível" description="Este link não está disponível para seu acesso."/>`;
  return html`<div class="app-shell"><aside class="sidebar"><a class="brand" href="#/"><img src="icons/icon.svg" alt=""/><div>GORILAREC<span>DEMANDAS</span></div></a><div class="rail-label">${admin ? 'CONTROLE DO ESTÚDIO' : 'SEU PAINEL'}</div><nav class="side-nav">${(admin ? rootNav : clientNav).map((item) => navItem(item))}</nav>${
    admin &&
    html`<div class="rail-label">CLIENTES <span>${state.clients.length}</span></div><nav class="side-clients">${state.clients.map((c) => html`<a href=${`#/c/${c.id}`} class=${c.id === client?.id ? 'active' : ''}><i style=${`background:${c.accent}`}></i>${c.name}<${Icon} name="chevron" size=${14}/></a>`)}</nav>${
      client &&
      html`<div class="rail-label">NESTE CLIENTE</div><nav class="side-nav client-side-nav">${clientNav
        .slice(1)
        .concat([
          [`/c/${cid}/drive`, 'drive', 'Drive', unmatched],
          [`/c/${cid}/ajustes`, 'settings', 'Ajustes'],
        ])
        .map((item) => navItem(item))}</nav>`
    }`
  }<div class="sidebar-bottom"><a href="#/instalar"><${Icon} name="download" size=${18}/>Pôr na tela inicial</a><div><span class="live-dot"></span>${state.demo ? 'MODO DEMONSTRAÇÃO' : 'ESTÚDIO CONECTADO'}</div><span class="mono">GORILAREC © ${new Date().getFullYear()}</span></div></aside>
<div class="workspace"><header class="topbar"><div class="topbar-breadcrumb">${client && admin ? html`<a class="icon-button mobile-back" href="#/" aria-label="Voltar aos clientes"><${Icon} name="back"/></a>` : html`<img class="mobile-logo" src="icons/icon.svg" alt="GORILAREC"/>`}<span class="eyebrow desktop-breadcrumb">GORILAREC <span>/</span></span><b>${client?.name || 'Controle de produção'}</b></div><div class="topbar-right">${state.demo && html`<span class="demo-badge">DEMO</span>`}<span class="topbar-name">${me.name}<small>${admin ? 'Editor' : roleName(me)}</small></span><${Avatar} person=${me} aria-label="Abrir menu do perfil" onClick=${() => setMenu(true)}/></div></header>
${state.offline && html`<div class="network-banner" role="status"><${Icon} name="offline" size=${17}/>Sem conexão. Tentando de novo…</div>`}${state.error && !state.offline && html`<div class="notice error" role="alert">${errorText(state.error)}</div>`}<main class="content" id="main">${page}</main><nav class=${`bottom-nav ${nav.length === 5 ? 'five-items' : ''}`} aria-label="Navegação principal">${nav.map((item) => navItem(item, true))}</nav></div><${Toast} toast=${state.toast}/>
${tour && html`<${Tour} key=${tour} steps=${tourSteps(tour, member.role_label)} onClose=${closeTour}/>`}
${
  menu &&
  html`<${AccountMenu} state=${state} person=${me} admin=${admin} onClose=${() => setMenu(false)} onTour=${() => {
    setMenu(false);
    const name = admin ? (client ? 'admin-cliente' : 'admin-inicio') : 'cliente';
    navigate(admin ? (client ? `/c/${client.id}` : '/') : `/c/${cid}`);
    setTimeout(() => setTour(name), 400);
  }}/>`
}</div>`;
}
render(html`<${App}/>`, document.getElementById('app'));
// Este módulo termina de carregar depois do evento "load" (o store espera um import), então esperar só pelo
// evento nunca registrava o service worker: sem ele o app não abre sem sinal.
if ('serviceWorker' in navigator) {
  const register = () =>
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* Browsing still works when installation is unavailable. */
    });
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);
}
