import { TABLES, fromRow, companyFromRow } from './mapping.js';

const PAGE = 1000;

async function fetchAll(sb, table) {
  let out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from(table).select('*').order('seq', { ascending: true }).range(from, from + PAGE - 1);
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

// Loads everything the signed-in owner can see (row-level security limits it to their own rows).
export async function loadAll(sb, user) {
  const [co, ...rows] = await Promise.all([
    sb.from('companies').select('*').maybeSingle(),
    ...TABLES.map((t) => fetchAll(sb, t))
  ]);
  if (co.error) throw co.error;
  const data = { acct: accountFromUser(user), company: companyFromRow(co.data) };
  TABLES.forEach((t, i) => { data[t] = rows[i].map(fromRow[t]); });
  return data;
}
