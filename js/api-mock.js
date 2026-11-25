import { fail, today, deliveredMonth, safeUrl, safeName } from './util.js';
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const ago = (days) => new Date(Date.now() - days * 86400000).toISOString();
const role = new URLSearchParams(location.search).get('papel') || 'admin';
const userId = 'demo-user';
const listeners = new Set();
const image =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="220"><rect width="360" height="220" fill="#182838"/><path d="M0 190L120 70l80 80 60-60 100 100" fill="#38D5FF" opacity=".4"/><circle cx="280" cy="54" r="24" fill="#B8FF3B"/><text x="22" y="200" font-family="sans-serif" fill="white" font-size="18">Luz natural · referência de cena</text></svg>',
  );
const clients = [
  {
    id: 'aurora',
    name: 'Clínica Aurora',
    accent: '#B8FF3B',
    drive_folder_id: 'demo-aurora',
    drive_folder_url: 'https://drive.google.com/drive/folders/demo-aurora',
    drive_synced_at: new Date(Date.now() - 180000).toISOString(),
    next_number: 53,
    archived_at: null,
    created_at: ago(40),
  },
  {
    id: 'norte',
    name: 'Loja Norte',
    accent: '#38D5FF',
    drive_folder_id: 'demo-norte',
    drive_folder_url: 'https://drive.google.com/drive/folders/demo-norte',
    drive_synced_at: ago(0),
    next_number: 25,
    archived_at: null,
    created_at: ago(30),
  },
];
const portrait =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="320" height="320" fill="#1d3246"/><path d="M52 320c0-66 48-112 108-112s108 46 108 112z" fill="#38D5FF"/><circle cx="160" cy="130" r="58" fill="#f1c9a5"/><path d="M100 124c0-42 26-66 60-66s60 24 60 66c-20-6-32-18-38-34-14 22-46 32-82 34z" fill="#3a2a20"/></svg>',
  );
// A pessoa dentro de um cliente (ou a conta de admin). `accounts` faz o papel de people_private: nunca sai daqui.
let people = [
  {
    id: 'p-me',
    client_id: role === 'admin' ? null : 'aurora',
    name: role === 'admin' ? 'Editor demo' : role === 'social' ? 'Lia (demo)' : 'Clara (demo)',
    role_label: role === 'admin' ? 'editor' : role === 'social' ? 'social' : 'cliente',
    role_text: null,
    avatar_path: null,
    created_at: ago(10),
    last_seen_at: ago(2),
  },
  {
    id: 'p-gorilarec',
    client_id: null,
    name: 'GORILAREC',
    role_label: 'editor',
    role_text: null,
    avatar_path: null,
    created_at: ago(40),
    last_seen_at: ago(0),
  },
  {
    id: 'p-lia',
    client_id: 'aurora',
    name: 'Lia Monteiro',
    role_label: 'social',
    role_text: null,
    avatar_path: portrait,
    created_at: ago(10),
    last_seen_at: ago(1),
  },
  {
    id: 'p-clara',
    client_id: 'aurora',
    name: 'Clara Duarte',
    role_label: 'cliente',
    role_text: null,
    avatar_path: null,
    created_at: ago(10),
    last_seen_at: ago(0),
  },
  {
    id: 'p-bruno',
    client_id: 'norte',
    name: 'Bruno Sales',
    role_label: 'outro',
    role_text: 'Sócio',
    avatar_path: null,
    created_at: ago(8),
    last_seen_at: ago(3),
  },
];
const accounts = {
  'p-me': { email: 'voce@demo.example', password: 'demo1234', reset: false },
  'p-gorilarec': { email: 'estudio@demo.example', password: id(), reset: false },
  'p-lia': { email: 'lia@aurora.example', password: id(), reset: false },
  'p-clara': { email: 'clara@aurora.example', password: id(), reset: false },
  'p-bruno': { email: 'bruno@lojanorte.example', password: id(), reset: false },
};
let attempts = [];
const device = (mid, user, person) => ({
  id: mid,
  user_id: user,
  person_id: person.id,
  client_id: person.client_id,
  kind: person.client_id ? 'client' : 'admin',
  role_label: person.role_label,
  role_text: person.role_text,
  name: person.name,
  last_seen_at: person.last_seen_at,
  created_at: person.created_at,
});
// Um vínculo por aparelho: a Lia entrou pelo celular e pelo computador.
let members = [
  device('me', userId, people[0]),
  device('lia', 'lia', people[2]),
  device('lia-pc', 'lia-pc', people[2]),
  device('clara', 'clara', people[3]),
  device('bruno', 'bruno', people[4]),
];
// Dois blocos de gravação por cliente: o de hoje e o da semana passada, cada um com um link só.
const dayAgo = (n) => {
  const d = new Date(Date.now() - n * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const shoots = clients.flatMap((c) => [
  { id: `shoot-${c.id}`, client_id: c.id, shot_on: today(), title: null, link_url: 'https://docs.google.com/document/d/roteiros-desta-semana', created_at: now() },
  { id: `shoot-next-${c.id}`, client_id: c.id, shot_on: dayAgo(-2), title: null, link_url: null, created_at: now() },
  { id: `shoot-old-${c.id}`, client_id: c.id, shot_on: dayAgo(8), title: null, link_url: 'https://docs.google.com/document/d/roteiros-da-semana-passada', notes: 'Roteiros dos orgânicos: https://docs.google.com/document/d/roteiros-organicos', created_at: now() },
]);
const titles = [
  'O cuidado começa na primeira conversa',
  'Três mitos sobre cuidar da pele',
  'Por dentro da nossa clínica',
  'Sua rotina merece uma pausa',
  'Dúvidas que chegam por aqui',
  'Conheça quem cuida de você',
  'Um novo jeito de vestir o dia',
  'Os detalhes fazem a diferença',
  'Bastidores da coleção de verão',
  'Uma peça, três combinações',
  'Seu próximo favorito está aqui',
  'Feito para acompanhar você',
];
const seedStatus = ['editing', 'recorded', 'requested', 'delivered', 'adjust', 'approved'];
const demands = titles.map((title, i) => ({
  id: `d${i + 1}`,
  client_id: i < 6 ? 'aurora' : 'norte',
  number: i < 6 ? 47 + i : 19 + i - 6,
  title,
  kind: i % 6 === 2 ? 'request' : 'recorded',
  status: seedStatus[i % 6],
  script:
    i % 3
      ? 'Abrir com uma pergunta direta para a câmera.\n\nMostrar os detalhes em planos próximos, com luz natural.\n\nFechar com um convite para saber mais.'
      : 'CENA 01 / ABERTURA\nUma conversa leve, olhando para a câmera.\n\nCENA 02 / CONTEÚDO\nMostrar a experiência e os pequenos detalhes.\n\nCENA 03 / FECHAMENTO\nConvite para conhecer de perto.',
  script_url: null,
  notes: i % 2 ? 'O take 3 ficou mais natural. Usar este na abertura.' : '',
  camera_clips: i % 6 === 2 ? '' : `C${4116 + i * 4} a C${4119 + i * 4}`,
  format: 'vertical',
  needs_shoot: i % 6 === 2 ? true : false,
  priority: i === 4 ? 'urgent' : 'normal',
  due_date: i === 4 ? ago(1).slice(0, 10) : i % 3 === 0 ? new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) : null,
  expected_files: i === 0 ? 6 : i % 6 === 3 ? 2 : 1,
  // Os pedidos (a gravar) estão numa gravação marcada para depois de amanhã: é o que abre no teleprompter.
  shoot_id: `shoot-${i % 6 === 2 ? 'next-' : i % 6 > 2 ? 'old-' : ''}${i < 6 ? 'aurora' : 'norte'}`,
  created_by: i % 2 ? 'lia' : userId,
  created_by_name: 'Lia Monteiro',
  created_by_kind: 'client',
  created_at: ago(4),
  updated_at: ago(i % 3),
  recorded_at: i % 6 !== 2 ? now() : null,
  delivered_at: [3, 4, 5].includes(i % 6) ? now() : null,
  approved_at: i % 6 === 5 ? now() : null,
  adjust_requested_at: i % 6 === 4 ? ago(1) : null,
  archived_at: null,
}));
let refs = [
  {
    id: 'r1',
    demand_id: 'd1',
    client_id: 'aurora',
    kind: 'link',
    url: 'https://www.instagram.com/',
    note: 'Ritmo de cortes e enquadramento',
    created_by: userId,
    created_by_name: 'Clara Duarte',
    created_at: ago(2),
  },
  {
    id: 'r2',
    demand_id: 'd1',
    client_id: 'aurora',
    kind: 'file',
    storage_path: 'demo-image',
    file_name: 'luz-natural.svg',
    mime: 'image/svg+xml',
    size_bytes: 440,
    created_by: userId,
    created_by_name: 'Lia Monteiro',
    created_at: ago(2),
  },
];
let events = demands.flatMap((d) => [
  {
    id: id(),
    demand_id: d.id,
    client_id: d.client_id,
    kind: 'created',
    body: d.kind === 'request' ? 'Pedido enviado' : 'Gravação anotada',
    meta: {},
    author_name: d.created_by_name,
    author_kind: 'client',
    author_id: 'lia',
    author_person_id: 'p-lia',
    created_at: d.created_at,
  },
  ...(d.status === 'adjust'
    ? [
        {
          id: id(),
          demand_id: d.id,
          client_id: d.client_id,
          kind: 'adjust',
          body: 'Podemos deixar a abertura mais curta e aumentar um pouco as legendas?',
          meta: {},
          author_name: 'Clara Duarte',
          author_kind: 'client',
          author_id: 'clara',
          author_person_id: 'p-clara',
          created_at: ago(1),
        },
      ]
    : []),
]);
events.push({
  id: id(),
  demand_id: 'd1',
  client_id: 'aurora',
  kind: 'comment',
  body: 'As duas primeiras versões já estão no Drive. Estou finalizando as próximas.',
  author_name: 'GORILAREC',
  author_kind: 'admin',
  author_person_id: 'p-gorilarec',
  created_at: ago(0),
  meta: {},
});
let files = demands.flatMap((d) =>
  ['delivered', 'approved', 'adjust'].includes(d.status) || d.id === 'd1'
    ? Array.from({ length: d.id === 'd1' ? 2 : d.expected_files }, (_, i) => ({
        id: id(),
        client_id: d.client_id,
        drive_id: `demo-${d.id}-${i}`,
        name: `${d.number} - ${d.title} - Gancho ${i + 1}.mp4`,
        demand_id: d.id,
        match_kind: 'auto_number',
        size_bytes: 24000000,
        first_seen_at: ago(2),
        modified_at: ago(2),
        removed_at: null,
        ignored: false,
      }))
    : [],
);
files.push(
  ...clients.flatMap((c) =>
    ['Resumo da campanha.mp4', '12 - Coleção de histórias - Gancho 1.mp4', '12 - Coleção de histórias - Gancho 2.mp4'].map(
      (name) => ({
        id: id(),
        client_id: c.id,
        drive_id: `demo-${id()}`,
        name,
        demand_id: null,
        first_seen_at: now(),
        modified_at: now(),
        removed_at: null,
        ignored: false,
        size_bytes: 18200000,
      }),
    ),
  ),
);
const codes = { aurora: 'demo-aurora', norte: 'demo-norte' };
const blobUrls = new Map([['demo-image', image]]);
const clone = (x) => (x === undefined ? undefined : structuredClone(x));
const links = () => members.filter((m) => m.user_id === userId);
const me = () => links().find((m) => m.kind === 'admin') || links()[0];
const admin = () => {
  if (me()?.kind !== 'admin') throw fail('forbidden');
};
const access = (cid) => {
  if (!members.some((m) => m.user_id === userId && (m.kind === 'admin' || m.client_id === cid))) throw fail('forbidden');
};
const ownPeople = () => people.filter((p) => members.some((m) => m.user_id === userId && m.person_id === p.id));
const validEmail = (v) => v.length >= 5 && v.length <= 120 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
const validPassword = (v) => typeof v === 'string' && v.length >= 8 && v.length <= 72;
const cleanEmail = (v) =>
  String(v || '')
    .trim()
    .toLowerCase();
const locked = (email) => attempts.filter((a) => a.email === email && Date.now() - a.at < 600000).length >= 12;
function wrong(email) {
  attempts.push({ email, at: Date.now() });
  return { ok: false, error: 'invalid_credentials' };
}
// "Ligar o aparelho": o vínculo copia nome e função da pessoa.
function link(person) {
  let m = members.find((m) => m.user_id === userId && m.client_id === person.client_id);
  if (!m) {
    m = {
      id: id(),
      user_id: userId,
      client_id: person.client_id,
      kind: person.client_id ? 'client' : 'admin',
      created_at: now(),
    };
    members.push(m);
  }
  person.last_seen_at = now();
  Object.assign(m, {
    person_id: person.id,
    name: person.name,
    role_label: person.role_label,
    role_text: person.role_text,
    last_seen_at: now(),
  });
}
function profilePatch(patch) {
  const mine = ownPeople();
  if (!mine.length) throw fail('forbidden');
  const name = typeof patch.name === 'string' ? patch.name.trim() : null;
  if ('name' in patch && (!name || name.length > 60)) throw fail('invalid_input');
  const text = patch.role_label === 'outro' ? String(patch.role_text || '').trim() : null;
  if (
    'role_label' in patch &&
    (!['cliente', 'social', 'trafego', 'outro'].includes(patch.role_label) ||
      (patch.role_label === 'outro' && (text.length < 2 || text.length > 40)))
  )
    throw fail('invalid_input');
  for (const person of mine) {
    if (name) person.name = name;
    if ('role_label' in patch && person.client_id) Object.assign(person, { role_label: patch.role_label, role_text: text });
    for (const m of members.filter((m) => m.person_id === person.id))
      Object.assign(m, { name: person.name, role_label: person.role_label, role_text: person.role_text });
  }
}
const demand = (did) => {
  const d = demands.find((d) => d.id === did && !d.archived_at);
  if (!d) throw fail('not_found');
  access(d.client_id);
  return d;
};
const client = (cid) => {
  access(cid);
  const c = clients.find((c) => c.id === cid);
  if (!c) throw fail('not_found');
  return c;
};
const file = (fid) => {
  admin();
  const f = files.find((f) => f.id === fid);
  if (!f) throw fail('not_found');
  return f;
};
function emit() {
  listeners.forEach((fn) => fn());
}
function event(d, kind, body, meta = {}) {
  const e = {
    id: id(),
    demand_id: d.id,
    client_id: d.client_id,
    kind,
    body,
    meta,
    author_id: userId,
    author_person_id: me()?.person_id || null,
    author_name: me()?.name || 'GORILAREC',
    author_kind: me()?.kind || 'admin',
    created_at: now(),
  };
  events.push(e);
  d.updated_at = now();
  return e;
}
function valid(p, creation = false) {
  if ((creation || 'title' in p) && (typeof p.title !== 'string' || !p.title.trim() || p.title.length > 160))
    throw fail('invalid_input');
  for (const [key, max] of Object.entries({ script: 20000, notes: 4000, camera_clips: 200 }))
    if (p[key]?.length > max) throw fail('invalid_input');
  if (p.expected_files != null && (!Number.isInteger(p.expected_files) || p.expected_files < 1 || p.expected_files > 30))
    throw fail('invalid_input');
  if (
    (p.kind && !['recorded', 'request'].includes(p.kind)) ||
    (p.format && !['vertical', 'horizontal', 'quadrado', 'outro'].includes(p.format)) ||
    (p.priority && !['normal', 'urgent'].includes(p.priority))
  )
    throw fail('invalid_input');
  if ((p.script_url && !safeUrl(p.script_url)) || p.links?.some((l) => !safeUrl(l.url) || l.url.length > 2000))
    throw fail('invalid_input');
}
function shoot(cid, day) {
  if (!day) return null;
  let s = shoots.find((s) => s.client_id === cid && s.shot_on === day);
  if (!s) {
    s = { id: id(), client_id: cid, shot_on: day, title: null, notes: null, link_url: null, created_at: now() };
    shoots.push(s);
  }
  return s.id;
}
// Teleprompter (demonstração): o estado vale entre abas do mesmo navegador, para ver tela + controle funcionando.
// (o último estado de cada dia fica no armazenamento do navegador, para a aba que abrir depois enxergar a tela já aberta)
const tpStore = 'gd-demo-tp';
const tpRows = {
  all() {
    try {
      return JSON.parse(localStorage.getItem(tpStore)) || {};
    } catch {
      return {};
    }
  },
  get(key) {
    return this.all()[key];
  },
  set(key, row) {
    try {
      localStorage.setItem(tpStore, JSON.stringify({ ...this.all(), [key]: row }));
    } catch {
      /* Sem armazenamento: o controle entre abas só funciona com as duas abertas. */
    }
  },
};
const tpSubs = new Set();
const tpBus = typeof BroadcastChannel === 'function' ? new BroadcastChannel('gd-demo-tp') : null;
const tpKey = (cid, day) => `${cid}|${day}`;
if (tpBus)
  tpBus.onmessage = (e) => {
    tpSubs.forEach((fn) => fn(e.data));
  };
function tpSet(cid, day, p) {
  client(cid);
  const rules = { playing: 'boolean', mirror: 'boolean', flip: 'boolean', screen: 'boolean', speed: [1, 40], font: [20, 240], width: [30, 100] };
  for (const [k, v] of Object.entries(p)) {
    if (k === 'cmd') {
      if (!['none', 'back', 'forward', 'top'].includes(v)) throw fail('invalid_input');
    } else if (k === 'demand') {
      if (v !== null && !demands.some((d) => d.id === v && d.client_id === cid)) throw fail('invalid_input');
    } else if (!(k in rules)) throw fail('invalid_input');
    else if (Array.isArray(rules[k]) ? typeof v !== 'number' || v < rules[k][0] || v > rules[k][1] : typeof v !== rules[k]) throw fail('invalid_input');
  }
  const old = tpRows.get(tpKey(cid, day)) || { id: id(), client_id: cid, shot_on: day, state: {}, seq: 0, screen_at: null };
  const { screen, ...rest } = p;
  // seq cresce com o relógio para valer entre abas que abriram em momentos diferentes.
  const row = { ...old, state: { ...old.state, ...rest, cmd: p.cmd || 'none' }, seq: Math.max(old.seq + 1, Date.now()), screen_at: screen ? now() : old.screen_at, updated_at: now() };
  tpRows.set(tpKey(cid, day), row);
  tpBus?.postMessage(row);
  setTimeout(() => tpSubs.forEach((fn) => fn(row)), 0);
  return row;
}
function updateShoot(cid, day, patch) {
  client(cid);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '') || Object.keys(patch).some((k) => !['link_url', 'title', 'notes'].includes(k)))
    throw fail('invalid_input');
  if (patch.link_url != null && (!safeUrl(patch.link_url) || patch.link_url.length > 2000)) throw fail('invalid_input');
  const s = shoots.find((x) => x.id === shoot(cid, day));
  Object.assign(s, patch);
  return s;
}
function change(d, status, comment, day) {
  const from = d.status;
  d.status = status;
  if (status === 'recorded') {
    d.recorded_at = now();
    if (day) d.shoot_id = shoot(d.client_id, day);
  }
  if (status === 'delivered') d.delivered_at ||= now();
  if (status === 'approved') d.approved_at = now();
  if (status === 'adjust') d.adjust_requested_at = now();
  event(d, status === 'adjust' ? 'adjust' : status === 'approved' ? 'approved' : 'status', comment || '', { from, to: status });
}
const norm = (s) =>
  s
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
function match(cid) {
  const list = demands.filter((d) => d.client_id === cid && !d.archived_at);
  for (const f of files.filter(
    (f) => f.client_id === cid && !f.demand_id && !f.ignored && !f.removed_at && /\.(mp4|mov|m4v|webm|mkv)$/i.test(f.name),
  )) {
    const n = f.name.match(/^\s*#?0*(\d{1,4})\s*[-–—_. ]/);
    let d = n && list.find((d) => d.number === Number(n[1]));
    let kind = 'auto_number';
    if (!d) {
      d = list
        .filter((d) => norm(d.title).length >= 6 && norm(f.name).includes(norm(d.title)))
        .sort((a, b) => norm(b.title).length - norm(a.title).length)[0];
      kind = 'auto_title';
    }
    if (d) {
      f.demand_id = d.id;
      f.match_kind = kind;
    }
  }
  for (const d of list) {
    const linked = files.filter((f) => f.demand_id === d.id && !f.removed_at);
    const n = linked.length;
    let next;
    if (['requested', 'recorded', 'editing'].includes(d.status) && n >= d.expected_files) next = 'delivered';
    else if (['requested', 'recorded'].includes(d.status) && n > 0) next = 'editing';
    else if (
      d.status === 'adjust' &&
      linked.some((f) => f.first_seen_at > d.adjust_requested_at || f.modified_at > d.adjust_requested_at)
    )
      next = 'delivered';
    if (next) {
      d.status = next;
      if (next === 'delivered') d.delivered_at ||= now();
      event(d, 'drive', next === 'delivered' ? 'Vídeo no Drive' : `${n}/${d.expected_files} no Drive`);
    }
  }
}
function create(cid, p) {
  const c = client(cid);
  valid(p, true);
  if (!['request', 'recorded'].includes(p.kind)) throw fail('invalid_input');
  const { links = [], shoot_date, shoot_link, ...fields } = p;
  if (shoot_link && shoot_date) updateShoot(cid, shoot_date, { link_url: shoot_link });
  const d = {
    id: id(),
    client_id: cid,
    number: c.next_number++,
    script: '',
    notes: '',
    camera_clips: '',
    format: 'vertical',
    priority: 'normal',
    expected_files: 1,
    needs_shoot: null,
    ...fields,
    title: p.title.trim(),
    status: p.kind === 'recorded' ? 'recorded' : 'requested',
    shoot_id: shoot(cid, shoot_date),
    created_at: now(),
    updated_at: now(),
    recorded_at: p.kind === 'recorded' ? now() : null,
    delivered_at: null,
    archived_at: null,
    created_by: userId,
    created_by_name: me().name,
    created_by_kind: me().kind,
  };
  demands.push(d);
  event(d, 'created', p.kind === 'request' ? 'Pedido enviado' : 'Gravação anotada');
  for (const l of links) addLink(d.id, l.url, l.note);
  match(cid);
  return d;
}
function addLink(did, url, note) {
  const d = demand(did);
  if (!safeUrl(url) || url.length > 2000) throw fail('invalid_input');
  const r = {
    id: id(),
    demand_id: did,
    client_id: d.client_id,
    kind: 'link',
    url,
    note,
    created_by: userId,
    created_by_name: me().name,
    created_at: now(),
  };
  refs.push(r);
  return r;
}
function fromFile(fid, group = null) {
  const f = file(fid);
  const c = client(f.client_id);
  const n = f.name.match(/^\s*#?0*(\d{1,4})\s*[-–—_. ]/);
  const title =
    f.name
      .replace(/^\s*#?\d+\s*[-–—_. ]\s*/, '')
      .replace(/\.[^.]+$/, '')
      .replace(/\s*-\s*Gancho\s*\d+$/i, '')
      .trim() || 'Vídeo do Drive';
  const preferred = n && +n[1];
  const d = create(c.id, { kind: 'recorded', title, expected_files: group?.length || 1 });
  if (preferred && !demands.some((x) => x.id !== d.id && x.client_id === c.id && x.number === preferred)) d.number = preferred;
  c.next_number = Math.max(c.next_number, d.number + 1);
  for (const ff of group || [f]) {
    ff.demand_id = d.id;
    ff.match_kind = 'manual';
  }
  change(d, 'delivered');
  return d;
}
const methods = {
  init() {
    return { userId };
  },
  peekCode(code) {
    const cid = Object.keys(codes).find((k) => codes[k] === code);
    if (code === 'demo-admin') return { kind: 'admin', client_name: null };
    if (!cid) throw fail('invalid_code');
    return { kind: 'client', client_name: clients.find((c) => c.id === cid)?.name };
  },
  // Mesmo contrato do banco: falha de login devolve { ok: false, error } e não lança erro.
  enter(code, emailRaw, password, profile = null) {
    const email = cleanEmail(emailRaw);
    if (!validEmail(email) || !validPassword(password)) return { ok: false, error: 'invalid_input' };
    const cid = Object.keys(codes).find((k) => codes[k] === code) || null;
    if (!cid && code !== 'demo-admin') return { ok: false, error: 'invalid_code' };
    if (locked(email)) return { ok: false, error: 'too_many_attempts' };
    let person = people.find((p) => p.client_id === cid && accounts[p.id]?.email === email);
    const created = !person;
    if (!person) {
      const name = String(profile?.name || '').trim();
      if (!name) return { ok: false, error: 'profile_required' };
      const label = cid ? profile.roleLabel : 'editor';
      const text = label === 'outro' ? String(profile.roleText || '').trim() : null;
      if (
        name.length > 60 ||
        !['cliente', 'social', 'trafego', 'outro', 'editor'].includes(label) ||
        (cid && label === 'editor') ||
        (label === 'outro' && (text.length < 2 || text.length > 40))
      )
        return { ok: false, error: 'invalid_input' };
      person = {
        id: id(),
        client_id: cid,
        name,
        role_label: label,
        role_text: text,
        avatar_path: null,
        created_at: now(),
        last_seen_at: null,
      };
      people.push(person);
      accounts[person.id] = { email, password, reset: false };
    } else if (accounts[person.id].reset) Object.assign(accounts[person.id], { password, reset: false });
    else if (accounts[person.id].password !== password) return wrong(email);
    link(person);
    return {
      ok: true,
      kind: cid ? 'client' : 'admin',
      client_id: cid,
      client_name: clients.find((c) => c.id === cid)?.name || null,
      person_id: person.id,
      created,
    };
  },
  signIn(emailRaw, password) {
    const email = cleanEmail(emailRaw);
    if (!validEmail(email) || !validPassword(password)) return { ok: false, error: 'invalid_input' };
    if (locked(email)) return { ok: false, error: 'too_many_attempts' };
    const found = people.filter(
      (p) => accounts[p.id]?.email === email && !accounts[p.id].reset && accounts[p.id].password === password,
    );
    if (!found.length) return wrong(email);
    found.forEach(link);
    return { ok: true, count: found.length };
  },
  loadContext() {
    return {
      memberships: members.filter((m) => m.user_id === userId),
      clients: clients.filter(
        (c) => !c.archived_at && members.some((m) => m.user_id === userId && (m.kind === 'admin' || m.client_id === c.id)),
      ),
      people: ownPeople(),
    };
  },
  loadClient(cid) {
    access(cid);
    return {
      demands: demands.filter((d) => d.client_id === cid && !d.archived_at),
      refs: refs.filter((r) => r.client_id === cid),
      events: events.filter((e) => e.client_id === cid),
      files: files.filter((f) => f.client_id === cid),
      shoots: shoots.filter((s) => s.client_id === cid),
      people: people.filter((p) => p.client_id === cid || p.client_id === null),
    };
  },
  loadQueue() {
    admin();
    return demands.filter(
      (d) =>
        !d.archived_at &&
        !clients.find((c) => c.id === d.client_id)?.archived_at &&
        (['recorded', 'editing', 'adjust', 'requested'].includes(d.status) || deliveredMonth(d)),
    );
  },
  touchSeen(cid) {
    access(cid);
    const m = members.find((m) => m.user_id === userId && (m.kind === 'admin' || m.client_id === cid));
    const previous = m.last_seen_at;
    m.last_seen_at = now();
    return previous;
  },
  renameMe(name) {
    profilePatch({ name });
  },
  updateProfile(patch) {
    profilePatch(patch);
  },
  uploadAvatar(person, blob) {
    const mine = ownPeople().find((p) => p.id === person.id);
    if (!mine) throw fail('forbidden');
    if (!['image/webp', 'image/jpeg', 'image/png'].includes(blob.type) || blob.size > 2 * 1024 * 1024)
      throw fail('invalid_input');
    if (mine.avatar_path?.startsWith('blob:')) URL.revokeObjectURL(mine.avatar_path);
    mine.avatar_path = URL.createObjectURL(blob);
    return mine.avatar_path;
  },
  removeAvatar(person) {
    const mine = ownPeople().find((p) => p.id === person.id);
    if (!mine) throw fail('forbidden');
    if (mine.avatar_path?.startsWith('blob:')) URL.revokeObjectURL(mine.avatar_path);
    mine.avatar_path = null;
  },
  changePassword(oldPassword, newPassword) {
    if (!validPassword(newPassword)) return { ok: false, error: 'invalid_input' };
    const found = ownPeople().filter((p) => accounts[p.id]?.password === oldPassword);
    if (!found.length) return { ok: false, error: 'invalid_credentials' };
    for (const person of found) accounts[person.id].password = newPassword;
    return { ok: true };
  },
  createDemand: create,
  updateShoot,
  tpSet,
  tpGet: (cid, day) => tpRows.get(tpKey(cid, day)) || null,
  subscribeTp(cid, day, fn) {
    const handler = (row) => row.client_id === cid && row.shot_on === day && fn(row);
    tpSubs.add(handler);
    return () => tpSubs.delete(handler);
  },
  updateDemand(did, p) {
    const d = demand(did);
    if (me().kind !== 'admin' && (!['requested', 'recorded'].includes(d.status) || 'number' in p || 'kind' in p))
      throw fail('forbidden');
    valid(p);
    if (
      'number' in p &&
      (!Number.isInteger(p.number) ||
        p.number < 1 ||
        demands.some((x) => x.id !== did && x.client_id === d.client_id && x.number === p.number))
    )
      throw fail('invalid_input');
    Object.assign(d, p);
    client(d.client_id).next_number = Math.max(client(d.client_id).next_number, d.number + 1);
    event(d, 'edit', 'Informações atualizadas', { fields: Object.keys(p) });
    match(d.client_id);
    return d;
  },
  setStatus(did, status, comment, day) {
    const d = demand(did);
    if (!seedStatus.includes(status)) throw fail('invalid_input');
    if (
      me().kind !== 'admin' &&
      !(
        (d.status === 'requested' && status === 'recorded') ||
        (d.status === 'delivered' && status === 'approved') ||
        (['delivered', 'approved'].includes(d.status) && status === 'adjust')
      )
    )
      throw fail('invalid_transition');
    if (status === 'adjust' && !comment?.trim()) throw fail('comment_required');
    change(d, status, comment, day);
    return d;
  },
  addComment(did, body) {
    const d = demand(did);
    if (!body.trim() || body.length > 4000) throw fail('invalid_input');
    return event(d, 'comment', body.trim());
  },
  addRefLink: addLink,
  async uploadRefFile(d, file, onProgress = () => {}) {
    demand(d.id);
    if (file.size > 50 * 1024 * 1024) throw fail('invalid_input');
    const path = `${d.client_id}/${d.id}/${id()}-${safeName(file.name)}`;
    const url = URL.createObjectURL(file);
    blobUrls.set(path, url);
    onProgress(100);
    const r = {
      id: id(),
      demand_id: d.id,
      client_id: d.client_id,
      kind: 'file',
      storage_path: path,
      file_name: file.name,
      mime: file.type,
      size_bytes: file.size,
      created_by: userId,
      created_by_name: me().name,
      created_at: now(),
    };
    refs.push(r);
    return r;
  },
  removeRef(ref) {
    demand(ref.demand_id);
    if (me().kind !== 'admin' && ref.created_by !== userId) throw fail('forbidden');
    refs = refs.filter((r) => r.id !== ref.id);
  },
  signedUrl(path) {
    if (!blobUrls.has(path)) throw fail('not_found');
    return blobUrls.get(path);
  },
  archiveDemand(did) {
    const d = demand(did);
    if (me().kind !== 'admin' && d.status !== 'requested') throw fail('forbidden');
    d.archived_at = now();
  },
  adminCreateClient({ name, accent, driveUrl, nextNumber }) {
    admin();
    if (!name.trim() || name.length > 80 || !/^#[\da-f]{6}$/i.test(accent) || !Number.isInteger(nextNumber) || nextNumber < 1)
      throw fail('invalid_input');
    const c = {
      id: id(),
      name: name.trim(),
      accent,
      next_number: nextNumber,
      drive_folder_url: driveUrl || null,
      drive_folder_id: driveUrl || null,
      created_at: now(),
      archived_at: null,
    };
    clients.push(c);
    codes[c.id] = id().replaceAll('-', '').slice(0, 24);
    return { client: c, code: codes[c.id] };
  },
  adminUpdateClient(cid, p) {
    admin();
    const c = client(cid);
    if (
      (p.name !== undefined && (!p.name.trim() || p.name.length > 80)) ||
      (p.accent && !/^#[\da-f]{6}$/i.test(p.accent)) ||
      (p.next_number !== undefined && (!Number.isInteger(p.next_number) || p.next_number < 1))
    )
      throw fail('invalid_input');
    for (const key of ['name', 'accent', 'next_number']) if (key in p) c[key] = p[key];
    if ('drive_url' in p) {
      c.drive_folder_url = p.drive_url;
      c.drive_folder_id = p.drive_url;
    }
    if ('archived' in p) c.archived_at = p.archived ? now() : null;
    return c;
  },
  adminGetLink(cid) {
    admin();
    client(cid);
    return codes[cid];
  },
  adminRotateLink(cid, removeMembers = true) {
    admin();
    client(cid);
    codes[cid] = id().replaceAll('-', '').slice(0, 24);
    // Derruba os aparelhos; as pessoas (nome, foto, senha) continuam e entram de novo pelo link novo.
    if (removeMembers) members = members.filter((m) => m.client_id !== cid);
    return codes[cid];
  },
  adminListPeople(cid) {
    admin();
    client(cid);
    return people
      .filter((p) => p.client_id === cid)
      .map((p) => ({
        person_id: p.id,
        name: p.name,
        email: accounts[p.id]?.email || '',
        role_label: p.role_label,
        role_text: p.role_text,
        avatar_path: p.avatar_path,
        last_seen_at: p.last_seen_at,
        created_at: p.created_at,
        reset_allowed: !!accounts[p.id]?.reset,
        devices: members.filter((m) => m.person_id === p.id).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  },
  adminResetPassword(pid) {
    admin();
    if (!people.some((p) => p.id === pid && p.client_id)) throw fail('not_found');
    accounts[pid].reset = true;
  },
  adminRemovePerson(pid) {
    admin();
    if (!people.some((p) => p.id === pid && p.client_id)) throw fail('not_found');
    people = people.filter((p) => p.id !== pid);
    members = members.filter((m) => m.person_id !== pid);
    delete accounts[pid];
    for (const e of events) if (e.author_person_id === pid) e.author_person_id = null;
  },
  adminDeleteClient(cid, name) {
    admin();
    const c = client(cid);
    if (c.name !== name) throw fail('invalid_input');
    clients.splice(clients.indexOf(c), 1);
    for (let i = demands.length - 1; i >= 0; i--) if (demands[i].client_id === cid) demands.splice(i, 1);
    refs = refs.filter((r) => r.client_id !== cid);
    events = events.filter((e) => e.client_id !== cid);
    files = files.filter((f) => f.client_id !== cid);
    members = members.filter((m) => m.client_id !== cid);
    for (const person of people.filter((p) => p.client_id === cid)) delete accounts[person.id];
    people = people.filter((p) => p.client_id !== cid);
    delete codes[cid];
  },
  adminLinkFile(fid, did) {
    const f = file(fid);
    if (did && demand(did).client_id !== f.client_id) throw fail('invalid_input');
    f.demand_id = did;
    f.match_kind = did ? 'manual' : null;
    if (did) match(f.client_id);
  },
  adminIgnoreFile(fid, ignored) {
    const f = file(fid);
    f.ignored = ignored;
    if (!ignored) match(f.client_id);
  },
  adminDemandFromFile: fromFile,
  adminImportHistory(cid) {
    admin();
    const unlinked = files.filter((f) => f.client_id === cid && !f.demand_id && !f.ignored && !f.removed_at);
    const groups = new Map();
    for (const f of unlinked) {
      const n = f.name.match(/^\s*#?0*(\d{1,4})\s*[-–—_. ]/);
      const key = n ? n[1] : f.id;
      groups.set(key, [...(groups.get(key) || []), f]);
    }
    for (const group of groups.values()) fromFile(group[0].id, group);
    client(cid).next_number = Math.max(0, ...demands.filter((d) => d.client_id === cid).map((d) => d.number)) + 1;
    return { demands: groups.size, files: unlinked.length };
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  signOutDevice() {
    members = members.filter((m) => m.user_id !== userId);
  },
};
const reads = new Set([
  'init',
  'peekCode',
  'loadContext',
  'loadClient',
  'loadQueue',
  'adminListPeople',
  'signedUrl',
  'subscribe',
  'tpSet',
  'tpGet',
  'subscribeTp',
  'touchSeen',
  'adminGetLink',
]);
const api = Object.fromEntries(
  Object.entries(methods).map(([key, fn]) => [
    key,
    async (...args) => {
      if (!navigator.onLine && key !== 'subscribe') throw fail('network');
      const value = await fn(...args);
      if (!reads.has(key)) emit();
      return typeof value === 'function' ? value : clone(value);
    },
  ]),
);
export default api;
export { api };
