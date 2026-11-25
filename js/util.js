export const statuses = {
  requested: 'Pedido',
  recorded: 'Gravado',
  editing: 'Editando',
  delivered: 'Entregue',
  adjust: 'Ajuste',
  approved: 'Aprovado',
};
export const columns = {
  requested: 'A gravar',
  recorded: 'Gravado',
  editing: 'Editando',
  delivered: 'Entregue',
  adjust: 'Ajuste',
  approved: 'Aprovado',
};
export const roles = {
  cliente: 'Cliente',
  social: 'Social media',
  trafego: 'Gestor de tráfego',
  outro: 'Outro',
  editor: 'Editor',
};
export const roleName = (m) => (m?.role_label === 'outro' ? m.role_text || 'Outro' : roles[m?.role_label] || 'Cliente');
export const formats = { vertical: 'Vertical 9:16', horizontal: 'Horizontal 16:9', quadrado: 'Quadrado', outro: 'Outro' };
export const errors = {
  invalid_code: 'Link inválido ou trocado. Peça um novo ao GORILAREC.',
  forbidden: 'Você não tem acesso a esta ação.',
  invalid_transition: 'Não é possível mudar para essa etapa agora.',
  comment_required: 'Conte o que precisa mudar.',
  too_many_attempts: 'Muitas tentativas erradas. Espere 10 minutos.',
  invalid_credentials: 'E-mail ou senha não conferem.',
  weak_password: 'Senha fácil demais. Escolha uma menos óbvia.',
  invalid_input: 'Confira os campos e tente novamente.',
  invalid_image: 'Não foi possível ler esta imagem. Escolha outra foto.',
  not_found: 'Este item não está mais disponível.',
  network: 'Sem conexão. Tentando de novo…',
};
export const errorText = (e) => errors[e?.code] || 'Não foi possível concluir. Tente novamente.';
export function fail(code) {
  const e = new Error(code);
  e.code = code;
  return e;
}
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const number = (n) => `#${String(n).padStart(3, '0')}`;
export const date = (v) =>
  v ? new Date(v.length === 10 ? `${v}T12:00:00` : v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';
export function relative(v) {
  if (!v) return 'ainda não acessou';
  const seconds = Math.max(0, (Date.now() - new Date(v)) / 1000);
  if (seconds < 60) return 'agora';
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `há ${Math.floor(seconds / 3600)} h`;
  if (seconds < 172800) return 'ontem';
  return date(v);
}
// "Hoje", "Amanhã", "sex, 28/11": o dia de uma gravação do jeito que se fala.
export function dayName(day) {
  const noon = (v) => new Date(`${v}T12:00:00`);
  const diff = Math.round((noon(day) - noon(today())) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  const week = noon(day).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return `${week[0].toUpperCase()}${week.slice(1)}, ${date(day)}`;
}
// Dias de gravação com roteiro em texto (o que o teleprompter lê), do mais antigo ao mais novo.
// `todo` = roteiros que ainda não foram gravados.
export function scriptDays(bundle) {
  return (bundle?.shoots || [])
    .map((s) => {
      const scripts = bundle.demands.filter((d) => d.shoot_id === s.id && d.script?.trim()).sort((a, b) => a.number - b.number);
      return { day: s.shot_on, scripts, todo: scripts.filter((d) => d.status === 'requested').length };
    })
    .filter((x) => x.scripts.length)
    .sort((a, b) => a.day.localeCompare(b.day));
}
// A gravação que interessa agora: a de hoje ou a próxima que ainda tem roteiro para gravar.
export const nextShoot = (bundle) => scriptDays(bundle).find((x) => x.day >= today() && x.todo > 0) || null;
export const thisMonth = (v) =>
  !!v && new Date(v).getMonth() === new Date().getMonth() && new Date(v).getFullYear() === new Date().getFullYear();
export const deliveredMonth = (d) => ['delivered', 'approved'].includes(d.status) && thisMonth(d.delivered_at);
export const overdue = (d) => d.due_date && d.due_date < today() && !['delivered', 'approved'].includes(d.status);
export const driveUrl = (f) => `https://drive.google.com/file/d/${encodeURIComponent(f.drive_id)}/view`;
export const inviteUrl = (code) => `${location.origin}${location.pathname}#/entrar/${code}`;
export function safeUrl(value) {
  try {
    const u = new URL(value);
    return ['https:', 'http:'].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
export function domain(value) {
  try {
    const h = new URL(value).hostname.replace(/^www\./, '');
    return /instagram/.test(h) ? 'Instagram' : /tiktok/.test(h) ? 'TikTok' : /youtu/.test(h) ? 'YouTube' : h;
  } catch {
    return 'Referência';
  }
}
export const fileSize = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.ceil((n || 0) / 1024)} KB`);
export const safeName = (name) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/^[^a-zA-Z0-9]+/, '')
    .slice(0, 80) || 'arquivo';
export const sortDemands = (a, b) =>
  (b.priority === 'urgent') - (a.priority === 'urgent') ||
  ['adjust', 'editing', 'recorded', 'requested', 'delivered', 'approved'].indexOf(a.status) -
    ['adjust', 'editing', 'recorded', 'requested', 'delivered', 'approved'].indexOf(b.status) ||
  b.number - a.number;
export const getFiles = (bundle, id) => (bundle?.files || []).filter((f) => f.demand_id === id && !f.removed_at && !f.ignored);
export const counts = (list) =>
  Object.fromEntries(Object.keys(statuses).map((s) => [s, list.filter((d) => d.status === s).length]));
export function readLocal(key, fallback = null) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
export async function copy(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const el = document.createElement('textarea');
  el.value = text;
  document.body.append(el);
  el.select();
  const ok = document.execCommand('copy');
  el.remove();
  if (!ok) throw fail('invalid_input');
}
export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
// Foto de perfil: o bucket `avatars` é público. No modo demo o caminho já é uma URL local (blob: ou data:).
export const avatarUrl = (path) =>
  !path
    ? null
    : /^(blob:|data:)/.test(path)
      ? path
      : `${(window.APP_CONFIG?.supabaseUrl || '').replace(/\/$/, '')}/storage/v1/object/public/avatars/${path}`;
const canvasBlob = (canvas, type) => new Promise((resolve) => canvas.toBlob(resolve, type, 0.86));
async function decodeImage(file) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* Falls back to <img>, which decodes formats createImageBitmap refuses in some browsers. */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
// Reduz a foto para 320x320 com corte central. WebP; se o navegador não gerar WebP, JPEG.
export async function shrinkAvatar(file) {
  const size = 320;
  let source;
  try {
    source = await decodeImage(file);
  } catch {
    throw fail('invalid_image');
  }
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  if (!width || !height) throw fail('invalid_image');
  const side = Math.min(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, (width - side) / 2, (height - side) / 2, side, side, 0, 0, size, size);
  source.close?.();
  let blob = await canvasBlob(canvas, 'image/webp');
  if (blob?.type !== 'image/webp') blob = await canvasBlob(canvas, 'image/jpeg');
  if (!blob || !['image/webp', 'image/jpeg'].includes(blob.type)) throw fail('invalid_image');
  return blob;
}
