import { useEffect, useState } from '../vendor/preact-htm.js';
import { readLocal, writeLocal, errorText, number } from './util.js';
const demo = new URLSearchParams(location.search).get('demo') === '1' || !window.APP_CONFIG?.supabaseUrl;
export const api = (await import(demo ? './api-mock.js' : './api.js')).default;
let state = {
  demo,
  ready: false,
  loading: true,
  userId: null,
  memberships: [],
  clients: [],
  people: [],
  bundles: {},
  queue: [],
  seen: {},
  offline: !navigator.onLine,
  error: null,
  toast: null,
  pending: [],
  uploadRetries: {},
  installPrompt: null,
};
const listeners = new Set();
export const getState = () => state;
export function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn(state));
}
export function useStore() {
  const [value, setValue] = useState(state);
  useEffect(() => {
    listeners.add(setValue);
    return () => listeners.delete(setValue);
  }, []);
  return value;
}
export const isAdmin = () => state.memberships.some((m) => m.kind === 'admin');
let toastTimer;
export function toast(message, tone = 'success') {
  clearTimeout(toastTimer);
  setState({ toast: { message, tone } });
  toastTimer = setTimeout(() => setState({ toast: null }), 3000);
}
export async function action(fn, message) {
  try {
    const value = await fn();
    await refresh();
    if (message) toast(message);
    return { ok: true, value };
  } catch (e) {
    if (e.code === 'network') setState({ offline: true });
    toast(errorText(e), 'error');
    return { ok: false, error: e };
  }
}
let refreshPromise;
export async function refresh() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const context = await api.loadContext();
      const bundles = {};
      const queue = isAdminContext(context) ? await api.loadQueue() : [];
      await Promise.all(
        context.clients.map(async (c) => {
          bundles[c.id] = await api.loadClient(c.id);
        }),
      );
      setState({ ...context, bundles, queue, offline: false, error: null });
    } catch (e) {
      setState({ offline: e.code === 'network', error: e });
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}
const isAdminContext = (context) => context.memberships.some((m) => m.kind === 'admin');
let startup;
export async function boot() {
  if (startup) return startup;
  startup = (async () => {
    setState({ loading: true, error: null });
    try {
      const { userId } = await api.init();
      setState({ userId });
      await refresh();
      const pending = readLocal(pendingKey(), []);
      setState({ pending });
      await markSeen();
      setState({ ready: true });
      await api.subscribe(() => {
        clearTimeout(changeTimer);
        changeTimer = setTimeout(refresh, 200);
      });
      retryPending();
    } catch (e) {
      setState({ error: e, offline: e.code === 'network' });
    } finally {
      setState({ loading: false });
      startup = null;
    }
  })();
  return startup;
}
let changeTimer;
export async function markSeen() {
  const seen = { ...state.seen };
  if (isAdmin()) {
    if (!('admin' in seen)) seen.admin = await api.touchSeen(null);
  } else for (const c of state.clients) if (!(c.id in seen)) seen[c.id] = await api.touchSeen(c.id);
  setState({ seen });
}
const pendingKey = () => `gd-pending-${demo ? 'demo' : 'live'}-${state.userId}`;
function persistPending(pending) {
  writeLocal(pendingKey(), pending);
  setState({ pending });
}
export function savePending(clientId, payload) {
  const entry = { id: crypto.randomUUID(), clientId, payload, createdAt: new Date().toISOString(), error: null };
  persistPending([...state.pending, entry]);
  return entry;
}
let sending = false;
export async function retryPending() {
  if (sending || !state.ready || !navigator.onLine || !state.memberships.length) return;
  sending = true;
  try {
    for (const entry of [...state.pending]) {
      if (entry.error) continue;
      try {
        const d = await api.createDemand(entry.clientId, entry.payload);
        persistPending(state.pending.filter((p) => p.id !== entry.id));
        toast(`${number(d.number)} enviado`);
      } catch (e) {
        if (e.code === 'network') {
          setState({ offline: true });
          break;
        }
        persistPending(state.pending.map((p) => (p.id === entry.id ? { ...p, error: errorText(e) } : p)));
      }
    }
    await refresh();
  } finally {
    sending = false;
  }
}
export function retryEntry(id) {
  persistPending(state.pending.map((p) => (p.id === id ? { ...p, error: null } : p)));
  retryPending();
}
export async function record(clientId, payload, done = 'anotado') {
  try {
    const d = await api.createDemand(clientId, payload);
    await refresh();
    toast(`${number(d.number)} ${done}`);
    return 'sent';
  } catch (e) {
    if (e.code === 'network') {
      try {
        savePending(clientId, payload);
        setState({ offline: true });
        toast('Anotação guardada neste aparelho');
        return 'kept';
      } catch {
        toast('Não foi possível guardar no aparelho. Mantenha esta tela aberta e tente de novo.', 'error');
        return false;
      }
    }
    toast(errorText(e), 'error');
    return false;
  }
}
// Anota vários vídeos de um bloco de gravação, um atrás do outro. Sem sinal, o que faltou fica guardado no aparelho.
// Devolve { sent, kept, failed }: enviados, guardados e os que o servidor recusou (com o resto da lista).
export async function recordMany(clientId, payloads) {
  let sent = 0;
  let kept = 0;
  let failed = [];
  for (let i = 0; i < payloads.length; i++) {
    try {
      await api.createDemand(clientId, payloads[i]);
      sent++;
    } catch (e) {
      const rest = payloads.slice(i);
      if (e.code === 'network') {
        try {
          for (const p of rest) savePending(clientId, p);
          kept = rest.length;
          setState({ offline: true });
        } catch {
          failed = rest;
          toast('Não foi possível guardar no aparelho. Mantenha esta tela aberta e tente de novo.', 'error');
        }
      } else {
        failed = rest;
        toast(errorText(e), 'error');
      }
      break;
    }
  }
  if (sent) await refresh();
  if (!failed.length) {
    const plural = (n) => `${n} ${n === 1 ? 'vídeo' : 'vídeos'}`;
    toast(kept ? `${sent ? `${plural(sent)} no ar, ` : ''}${plural(kept)} guardado${kept === 1 ? '' : 's'} neste aparelho` : `${plural(sent)} anotado${sent === 1 ? '' : 's'}`);
  }
  return { sent, kept, failed };
}
export function setRetries(demandId, files) {
  setState({ uploadRetries: { ...state.uploadRetries, [demandId]: files } });
}
export async function uploadFiles(demand, files, onProgress) {
  const failed = [];
  for (const file of files) {
    try {
      await api.uploadRefFile(demand, file, (p) => onProgress?.(file.name, p));
    } catch (e) {
      failed.push(file);
      toast(`${file.name}: ${errorText(e)}`, 'error');
    }
  }
  setRetries(demand.id, failed);
  await refresh();
  return failed;
}
export const navigate = (path) => {
  location.hash = path;
};
window.addEventListener('online', () => {
  setState({ offline: false });
  retryPending();
  refresh();
  if (!state.ready) boot();
});
window.addEventListener('offline', () => setState({ offline: true }));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.ready) {
    refresh();
    retryPending();
  }
});
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  setState({ installPrompt: e });
});
window.addEventListener('appinstalled', () => setState({ installPrompt: null }));
setInterval(() => {
  if (state.ready && document.visibilityState === 'visible') refresh();
}, 60000);
setInterval(retryPending, 20000);
