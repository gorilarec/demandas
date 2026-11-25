import { fail, safeName } from './util.js';
let db;
const known =
  /\b(invalid_code|forbidden|invalid_transition|comment_required|too_many_attempts|invalid_credentials|invalid_input|not_found)\b/;
function normalize(error) {
  const message = error?.message || String(error);
  const match = message.match(known);
  return fail(
    match
      ? match[1]
      : /fetch|network|offline|connection|timeout|load failed/i.test(message) || error instanceof TypeError
        ? 'network'
        : 'invalid_input',
  );
}
async function result(query) {
  try {
    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (e) {
    throw normalize(e);
  }
}
const rpc = (name, args = {}) => result(db.rpc(name, args));
// Apagar foto antiga é faxina: se falhar, sobra só um arquivo solto no bucket (ninguém aponta mais para ele).
async function dropAvatar(path) {
  try {
    if (path) await db.storage.from('avatars').remove([path]);
  } catch {
    /* A troca ou remoção já valeu no banco. */
  }
}
const api = {
  async init() {
    const c = window.APP_CONFIG;
    db ||= window.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'gd-auth' },
    });
    let data = await result(db.auth.getSession());
    if (!data.session) data = await result(db.auth.signInAnonymously());
    return { userId: data.session.user.id };
  },
  async peekCode(code) {
    return rpc('peek_code', { p_code: code });
  },
  // Entrada pelo link. Falha de login NÃO lança erro: devolve { ok: false, error } como a função do banco.
  async enter(code, email, password, profile = null) {
    return rpc('enter', {
      p_code: code,
      p_email: email,
      p_password: password,
      p_name: profile?.name || null,
      p_role_label: profile?.roleLabel || null,
      p_role_text: profile?.roleText || null,
    });
  },
  // Entrada sem link (aparelho novo de quem já tem conta). Também devolve { ok: false, error } sem lançar.
  async signIn(email, password) {
    return rpc('sign_in', { p_email: email, p_password: password });
  },
  async loadContext() {
    const session = await result(db.auth.getSession());
    const [memberships, clients] = await Promise.all([
      result(db.from('members').select('*').eq('user_id', session.session.user.id)),
      result(db.from('clients').select('*').is('archived_at', null).order('name')),
    ]);
    const personIds = [...new Set(memberships.map((m) => m.person_id).filter(Boolean))];
    const people = personIds.length ? await result(db.from('people').select('*').in('id', personIds)) : [];
    return { memberships, clients, people };
  },
  async loadClient(clientId) {
    const tables = ['demands', 'demand_refs', 'demand_events', 'drive_files', 'shoots'];
    const values = await Promise.all([
      ...tables.map((t) => {
        let q = db.from(t).select('*').eq('client_id', clientId);
        if (t === 'demands') q = q.is('archived_at', null);
        return result(q);
      }),
      // Pessoas deste cliente + contas de admin (para nome e foto do editor nos comentários).
      result(db.from('people').select('*').or(`client_id.eq.${clientId},client_id.is.null`)),
    ]);
    return Object.fromEntries(['demands', 'refs', 'events', 'files', 'shoots', 'people'].map((k, i) => [k, values[i]]));
  },
  async loadQueue() {
    const month = new Date();
    month.setDate(1);
    month.setHours(0, 0, 0, 0);
    return result(
      db
        .from('demands')
        .select('*')
        .is('archived_at', null)
        .or(
          `status.in.(recorded,editing,adjust,requested),and(status.in.(delivered,approved),delivered_at.gte.${month.toISOString()})`,
        ),
    );
  },
  async touchSeen(clientId) {
    return rpc('touch_seen', { p_client: clientId || null });
  },
  async renameMe(name) {
    return rpc('rename_me', { p_name: name });
  },
  // patch: { name, role_label, role_text } (as chaves que vierem). Vale para todas as contas deste aparelho.
  async updateProfile(patch) {
    return rpc('update_profile', { p: patch });
  },
  async uploadAvatar(person, blob) {
    if (blob.size > 2 * 1024 * 1024) throw fail('invalid_input');
    const ext = { 'image/webp': 'webp', 'image/png': 'png' }[blob.type] || 'jpg';
    const path = `${person.id}/${crypto.randomUUID()}.${ext}`;
    // O caminho muda a cada foto, então o arquivo pode ficar em cache por muito tempo.
    await result(
      db.storage.from('avatars').upload(path, blob, { contentType: blob.type, upsert: false, cacheControl: '31536000' }),
    );
    try {
      await rpc('set_avatar', { p_person: person.id, p_path: path });
    } catch (e) {
      await dropAvatar(path);
      throw e;
    }
    if (person.avatar_path !== path) await dropAvatar(person.avatar_path);
    return path;
  },
  async removeAvatar(person) {
    await rpc('set_avatar', { p_person: person.id, p_path: null });
    await dropAvatar(person.avatar_path);
  },
  // Devolve { ok: true } ou { ok: false, error } (senha atual errada não lança erro).
  async changePassword(oldPassword, newPassword) {
    return rpc('change_password', { p_old: oldPassword, p_new: newPassword });
  },
  // shoot_link = link do bloco de gravação digitado junto com a anotação. Vai antes da demanda;
  // se cair o sinal no meio, a anotação inteira fica guardada no aparelho e é reenviada.
  async createDemand(clientId, payload) {
    const { shoot_link, ...rest } = payload;
    if (shoot_link && rest.shoot_date) await api.updateShoot(clientId, rest.shoot_date, { link_url: shoot_link });
    return rpc('create_demand', { p_client: clientId, p: rest });
  },
  // Bloco de gravação do dia: { link_url, title, notes } (as chaves que vierem; null apaga).
  async updateShoot(clientId, day, patch) {
    return rpc('update_shoot', { p_client: clientId, p_date: day, p: patch });
  },
  async updateDemand(id, patch) {
    return rpc('update_demand', { p_id: id, p: patch });
  },
  async setStatus(id, status, comment = null, shootDate = null) {
    return rpc('set_status', { p_id: id, p_status: status, p_comment: comment, p_shoot_date: shootDate });
  },
  async addComment(id, body) {
    return rpc('add_comment', { p_id: id, p_body: body });
  },
  async addRefLink(demandId, url, note = null) {
    return rpc('add_ref_link', { p_demand: demandId, p_url: url, p_note: note });
  },
  async uploadRefFile(demand, file, onProgress = () => {}) {
    if (file.size > 50 * 1024 * 1024) throw fail('invalid_input');
    const { session } = await result(db.auth.getSession());
    const path = `${demand.client_id}/${demand.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const c = window.APP_CONFIG;
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${c.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/refs/${path}`);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.setRequestHeader('apikey', c.supabaseAnonKey);
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onerror = () => reject(fail('network'));
      xhr.ontimeout = () => reject(fail('network'));
      xhr.timeout = 120000;
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(xhr.status >= 500 ? fail('network') : normalize({ message: xhr.responseText }));
      xhr.send(file);
    });
    try {
      const ref = await rpc('add_ref_file', {
        p_demand: demand.id,
        p_storage_path: path,
        p_file_name: file.name,
        p_mime: file.type || 'application/octet-stream',
        p_size: file.size,
      });
      onProgress(100);
      return ref;
    } catch (e) {
      await db.storage.from('refs').remove([path]);
      throw e;
    }
  },
  async removeRef(ref) {
    if (ref.kind === 'file') await result(db.storage.from('refs').remove([ref.storage_path]));
    return rpc('remove_ref', { p_id: ref.id });
  },
  async signedUrl(path) {
    const data = await result(db.storage.from('refs').createSignedUrl(path, 3600));
    return data.signedUrl;
  },
  async archiveDemand(id) {
    return rpc('archive_demand', { p_id: id });
  },
  async adminCreateClient({ name, accent, driveUrl, nextNumber }) {
    return rpc('admin_create_client', { p_name: name, p_accent: accent, p_drive_url: driveUrl, p_next_number: nextNumber });
  },
  async adminUpdateClient(id, patch) {
    return rpc('admin_update_client', { p_id: id, p: patch });
  },
  async adminGetLink(clientId) {
    return rpc('admin_get_link', { p_client: clientId });
  },
  async adminRotateLink(clientId, removeMembers = true) {
    return rpc('admin_rotate_link', { p_client: clientId, p_remove_members: removeMembers });
  },
  async adminListPeople(clientId) {
    return rpc('admin_list_people', { p_client: clientId });
  },
  async adminResetPassword(personId) {
    return rpc('admin_reset_password', { p_person: personId });
  },
  // avatarPath (opcional): a foto não cai junto com a pessoa no banco, então a tela manda apagar o arquivo também.
  async adminRemovePerson(personId, avatarPath = null) {
    await rpc('admin_remove_person', { p_person: personId });
    await dropAvatar(avatarPath);
  },
  async adminDeleteClient(id, confirmName) {
    return rpc('admin_delete_client', { p_id: id, p_confirm_name: confirmName });
  },
  async adminLinkFile(fileId, demandId) {
    return rpc('admin_link_file', { p_file: fileId, p_demand: demandId });
  },
  async adminIgnoreFile(fileId, ignored) {
    return rpc('admin_ignore_file', { p_file: fileId, p_ignored: ignored });
  },
  async adminDemandFromFile(fileId) {
    return rpc('admin_demand_from_file', { p_file: fileId });
  },
  async adminImportHistory(clientId) {
    return rpc('admin_import_history', { p_client: clientId });
  },
  async subscribe(onChange) {
    const channel = db.channel('gd-changes');
    for (const table of ['demands', 'demand_events', 'demand_refs', 'drive_files', 'clients', 'people', 'shoots'])
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange);
    channel.subscribe();
    return () => db.removeChannel(channel);
  },
  // Teleprompter: comando para a tela daquele dia (tocar, pausar, velocidade, letra, qual roteiro). Devolve o estado novo.
  async tpSet(clientId, day, patch) {
    return rpc('tp_set', { p_client: clientId, p_date: day, p: patch });
  },
  async tpGet(clientId, day) {
    return (await result(db.from('tp_sessions').select('*').eq('client_id', clientId).eq('shot_on', day)))[0] || null;
  },
  // Avisa cada mudança do teleprompter daquele dia (não recarrega o painel). Devolve a função que desliga.
  subscribeTp(clientId, day, onRow) {
    const channel = db.channel(`gd-tp-${clientId}-${day}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'tp_sessions', filter: `client_id=eq.${clientId}` }, (payload) => {
      if (payload.new?.shot_on === day) onRow(payload.new);
    });
    channel.subscribe();
    return () => db.removeChannel(channel);
  },
  // Sair de verdade: apaga o vínculo deste aparelho no banco e descarta a sessão anônima.
  async signOutDevice() {
    await rpc('sign_out_device');
    try {
      await db.auth.signOut();
    } catch {
      /* O vínculo já foi apagado; a sessão anônima que sobrar não enxerga nada. */
    }
  },
};
export default api;
export { api };
