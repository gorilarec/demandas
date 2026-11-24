import { fail, safeName } from './util.js';
let db;
const known = /\b(invalid_code|forbidden|invalid_transition|comment_required|too_many_attempts|invalid_input|not_found)\b/;
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
  async joinWithCode(code, name, roleLabel, roleText = null) {
    return rpc('join_with_code', { p_code: code, p_name: name, p_role_label: roleLabel, p_role_text: roleText || null });
  },
  async loadContext() {
    const session = await result(db.auth.getSession());
    const [memberships, clients] = await Promise.all([
      result(db.from('members').select('*').eq('user_id', session.session.user.id)),
      result(db.from('clients').select('*').is('archived_at', null).order('name')),
    ]);
    return { memberships, clients };
  },
  async loadClient(clientId) {
    const tables = ['demands', 'demand_refs', 'demand_events', 'drive_files', 'shoots'];
    const values = await Promise.all(
      tables.map((t) => {
        let q = db.from(t).select('*').eq('client_id', clientId);
        if (t === 'demands') q = q.is('archived_at', null);
        return result(q);
      }),
    );
    return Object.fromEntries(['demands', 'refs', 'events', 'files', 'shoots'].map((k, i) => [k, values[i]]));
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
  async listMembers(clientId) {
    return result(
      db.from('members').select('*').eq('client_id', clientId).order('last_seen_at', { ascending: false, nullsFirst: false }),
    );
  },
  async touchSeen(clientId) {
    return rpc('touch_seen', { p_client: clientId || null });
  },
  async renameMe(name) {
    return rpc('rename_me', { p_name: name });
  },
  async createDemand(clientId, payload) {
    return rpc('create_demand', { p_client: clientId, p: payload });
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
  async adminRemoveMember(memberId) {
    return rpc('admin_remove_member', { p_member: memberId });
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
    for (const table of ['demands', 'demand_events', 'demand_refs', 'drive_files', 'clients'])
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange);
    channel.subscribe();
    return () => db.removeChannel(channel);
  },
  async signOut() {
    await result(db.auth.signOut());
  },
};
export default api;
export { api };
