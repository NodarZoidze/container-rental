// cr-team — employee management for the container-rental app.
// Only a company owner (a user with a cr_companies row) may call it.
// Actions: list | add {name, email, password} | password {user_id, password} | remove {user_id}
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: ud, error: ue } = await admin.auth.getUser(token);
  if (ue || !ud?.user) return json({ error: 'საჭიროა ავტორიზაცია' }, 401);
  const caller = ud.user;

  const { data: company } = await admin.from('cr_companies').select('owner_id').eq('owner_id', caller.id).maybeSingle();
  if (!company) return json({ error: 'თანამშრომლებს მხოლოდ კომპანიის მფლობელი მართავს' }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: 'არასწორი მოთხოვნა' }, 400); }
  const action = String(body.action || '');

  const memberOf = async (userId: string) => {
    const { data } = await admin.from('cr_members').select('*').eq('user_id', userId).eq('company_owner_id', caller.id).maybeSingle();
    return data;
  };

  if (action === 'list') {
    const { data, error } = await admin.from('cr_members').select('*').eq('company_owner_id', caller.id).order('created_at');
    if (error) return json({ error: error.message });
    return json({ members: data });
  }

  if (action === 'add') {
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!name) return json({ error: 'მიუთითეთ თანამშრომლის სახელი' });
    if (!EMAIL.test(email)) return json({ error: 'მიუთითეთ სწორი ელფოსტა' });
    if (password.length < 8) return json({ error: 'პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო' });
    const { data: created, error: ce } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: name, cr_role: 'staff', cr_company: caller.id }
    });
    if (ce || !created?.user) {
      const msg = ce?.message || '';
      if (/already|exists|registered/i.test(msg)) return json({ error: 'ამ ელფოსტით ანგარიში უკვე არსებობს' });
      if (/password/i.test(msg)) return json({ error: 'პაროლი ძალიან მარტივია — გამოიყენეთ ასოები და ციფრები' });
      return json({ error: msg || 'ანგარიშის შექმნა ვერ მოხერხდა' });
    }
    const { data: member, error: me } = await admin.from('cr_members')
      .insert({ user_id: created.user.id, company_owner_id: caller.id, name, email }).select().single();
    if (me) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: me.message });
    }
    return json({ member });
  }

  if (action === 'password') {
    const userId = String(body.user_id || '');
    const password = String(body.password || '');
    if (password.length < 8) return json({ error: 'პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო' });
    if (!(await memberOf(userId))) return json({ error: 'თანამშრომელი ვერ მოიძებნა' }, 404);
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) return json({ error: error.message });
    return json({ ok: true });
  }

  if (action === 'remove') {
    const userId = String(body.user_id || '');
    if (!(await memberOf(userId))) return json({ error: 'თანამშრომელი ვერ მოიძებნა' }, 404);
    const { data: target } = await admin.auth.admin.getUserById(userId);
    const createdHere = target?.user?.user_metadata?.cr_company === caller.id;
    if (createdHere) {
      const { error } = await admin.auth.admin.deleteUser(userId); // membership row is removed by cascade
      if (error) return json({ error: error.message });
    } else {
      const { error } = await admin.from('cr_members').delete().eq('user_id', userId).eq('company_owner_id', caller.id);
      if (error) return json({ error: error.message });
    }
    return json({ ok: true });
  }

  return json({ error: 'უცნობი მოქმედება' }, 400);
});
