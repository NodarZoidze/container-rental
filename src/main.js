import { createElement as h, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import templateSrc from './app/template.html?raw';
import Logic from './app/logic.js';
import { compileTemplate, DCView } from './runtime/dc.js';
import { supabase, hasSupabase } from './lib/supabase.js';
import { loadAll } from './lib/data.js';
import { createSync } from './lib/sync.js';

const compiled = compileTemplate(templateSrc);
const root = createRoot(document.getElementById('app'));
const params = new URLSearchParams(window.location.search);
const DEMO = !hasSupabase || params.has('demo');
const home = window.location.origin + window.location.pathname;

const KEYS = ['clients', 'containers', 'trips', 'payments', 'company', 'prices', 'registered'];
function snapshot(inst) {
  const s = inst.S();
  const out = {};
  KEYS.forEach((k) => { out[k] = s[k]; });
  return out;
}
function changed(a, b) { return KEYS.some((k) => a[k] !== b[k]); }

function Banner({ status }) {
  if (!status || status.state !== 'error') return null;
  const msg = (status.error && status.error.message) || 'უცნობი შეცდომა';
  return h('div', { role: 'alert', style: {
    position: 'fixed', left: '50%', transform: 'translateX(-50%)', top: 12, zIndex: 50, width: 'min(448px, calc(100% - 32px))',
    boxSizing: 'border-box', padding: '12px 14px', borderRadius: 16, background: '#FFF5F4', border: '1px solid #F7C3BD',
    color: '#14141E', font: "500 14px 'Noto Sans Georgian', 'Inter', system-ui, sans-serif", display: 'flex', gap: 10, alignItems: 'center'
  } },
  h('span', { style: { flex: '1 1 auto', minWidth: 0 } }, 'ცვლილება ვერ შეინახა: ', h('span', { style: { color: '#6B7280', fontWeight: 400 } }, msg)),
  h('button', { type: 'button', onClick: status.retry, style: {
    flex: 'none', minHeight: 40, padding: '0 14px', border: '1px solid #C2362A', borderRadius: 9999, background: '#FFFFFF',
    color: '#C2362A', font: 'inherit', fontWeight: 600, cursor: 'pointer'
  } }, 'ხელახლა'));
}

function App({ instance, sync }) {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    if (!sync) return undefined;
    sync.onStatus = setStatus;
    return () => { sync.onStatus = null; };
  }, [sync]);
  return h('div', { style: { height: '100%' } }, h(DCView, { instance, compiled }), h(Banner, { status }));
}

function Loading({ text }) {
  return h('div', { style: {
    height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12,
    color: '#6B7280', font: "500 15px 'Noto Sans Georgian', 'Inter', system-ui, sans-serif"
  } }, h('span', { 'aria-hidden': true, style: { width: 28, height: 28, borderRadius: 9999, border: '3px solid #E2E8F0', borderTopColor: '#145AFF', animation: 'spin 0.9s linear infinite' } }), text);
}

function Fatal({ error }) {
  return h('div', { role: 'alert', style: { maxWidth: 420, margin: '20vh auto', padding: 24, font: "15px 'Noto Sans Georgian', system-ui, sans-serif", color: '#14141E' } },
    h('h1', { style: { fontSize: 20, margin: '0 0 8px' } }, 'მონაცემების ჩატვირთვა ვერ მოხერხდა'),
    h('p', { style: { color: '#6B7280', margin: '0 0 16px' } }, (error && error.message) || String(error)),
    h('button', { type: 'button', onClick: () => window.location.reload(), style: { minHeight: 44, padding: '0 18px', borderRadius: 9999, border: '1px solid #145AFF', background: '#fff', color: '#145AFF', font: 'inherit', fontWeight: 600, cursor: 'pointer' } }, 'ხელახლა ცდა'));
}

const api = hasSupabase ? {
  signIn: (provider) => supabase.auth.signInWithOAuth({ provider, options: { redirectTo: home } })
    .then(({ error }) => { if (error) throw error; }),
  signInEmail: (email) => supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: home } })
    .then(({ error }) => { if (error) throw error; }),
  signOut: () => supabase.auth.signOut().finally(() => window.location.replace(home))
} : null;

async function boot() {
  if (DEMO) {
    const instance = new Logic({ start: params.get('start') || 'home' });
    root.render(h(App, { instance, sync: null }));
    return;
  }
  root.render(h(Loading, { text: 'იტვირთება…' }));
  const { data: { session } } = await supabase.auth.getSession();
  const bootUser = session ? session.user.id : null;
  supabase.auth.onAuthStateChange((_event, sess) => {
    const uid = sess ? sess.user.id : null;
    if (uid !== bootUser) window.location.replace(home);
  });

  if (!session) {
    const instance = new Logic({ start: 'login', api, data: { clients: [], containers: [], trips: [], payments: [], company: null, acct: {} } });
    root.render(h(App, { instance, sync: null }));
    return;
  }

  let data;
  try {
    data = await loadAll(supabase, session.user);
  } catch (error) {
    root.render(h(Fatal, { error }));
    return;
  }
  const instance = new Logic({ start: data.company ? 'home' : 'onboard', api, data });
  let last = snapshot(instance);
  const sync = createSync(supabase, session.user.id, last, (st) => { if (sync && sync.onStatus) sync.onStatus(st); });
  instance.subscribe(() => {
    const now = snapshot(instance);
    if (changed(last, now)) { last = now; sync.push(now); }
  });
  window.addEventListener('beforeunload', (e) => { if (sync.hasPending()) { e.preventDefault(); e.returnValue = ''; } });
  root.render(h(App, { instance, sync }));
}

boot();
