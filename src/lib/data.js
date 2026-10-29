import { TABLES, TABLE_NAME, fromRow, companyFromRow } from './mapping.js';

const PAGE = 1000;

async function fetchAll(sb, table) {
  let out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from(TABLE_NAME[table]).select('*').order('seq', { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw error;
    out = out.concat(data || []);
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export function accountFromUser(user) {
  const md = (user && user.user_metadata) || {};
  const provider = (user && user.app_metadata && user.app_metadata.provider) || 'email';
  return { provider, email: (user && user.email) || '', owner: md.full_name || md.name || '' };
}

export function memberFromRow(r) {
  return { id: r.user_id, name: r.name, email: r.email, created: r.created_at || '' };
}

// Loads everything the signed-in user can see. Row-level security limits it to one company:
// the user's own (owner) or their employer's (employee). role / ownerId tell the two apart.
export async function loadAll(sb, user) {
  const [co, mem, ...rows] = await Promise.all([
    sb.from(TABLE_NAME.companies).select('*').maybeSingle(),
    sb.from('cr_members').select('*').order('created_at', { ascending: true }),
    ...TABLES.map((t) => fetchAll(sb, t))
  ]);
  if (co.error) throw co.error;
  if (mem.error) throw mem.error;
  const members = (mem.data || []).map(memberFromRow);
  const ownerId = co.data ? co.data.owner_id : user.id;
  const role = ownerId === user.id ? 'owner' : 'staff';
  const acct = accountFromUser(user);
  if (role === 'staff') {
    const me = members.find((m) => m.id === user.id);
    if (me) acct.owner = me.name;
  }
  const data = { acct, company: companyFromRow(co.data), members: role === 'owner' ? members : [], role, ownerId };
  TABLES.forEach((t, i) => { data[t] = rows[i].map(fromRow[t]); });
  return data;
}
