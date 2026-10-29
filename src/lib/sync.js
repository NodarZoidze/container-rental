// Persists app state to Supabase by diffing snapshots: every change the UI makes
// (new trip, payment, client, cancelled trip, profile, prices) is written as
// upserts / deletes. Runs one batch at a time; on failure the change is kept for retry.
import { TABLES, TABLE_NAME, toRow, companyToRow } from './mapping.js';

function index(snap, ownerId, opts) {
  const out = { company: null, tables: {} };
  if (snap.registered && snap.company && opts.company) {
    const row = Object.assign({ owner_id: ownerId }, companyToRow(snap.company, snap.prices));
    out.company = { row, json: JSON.stringify(row) };
  }
  TABLES.forEach((t) => {
    const m = new Map();
    (snap[t] || []).forEach((item) => {
      const row = Object.assign({ owner_id: ownerId }, toRow[t](item));
      m.set(row.id, { row, json: JSON.stringify(row) });
    });
    out.tables[t] = m;
  });
  return out;
}

async function apply(sb, base, next) {
  if (next.company && (!base.company || base.company.json !== next.company.json)) {
    const { error } = await sb.from(TABLE_NAME.companies).upsert(next.company.row, { onConflict: 'owner_id' });
    if (error) throw error;
  }
  // deletes first (children before parents), then upserts (parents before children)
  for (const t of TABLES.slice().reverse()) {
    const gone = [];
    base.tables[t].forEach((v, id) => { if (!next.tables[t].has(id)) gone.push(id); });
    if (gone.length) {
      const { error } = await sb.from(TABLE_NAME[t]).delete().in('id', gone);
      if (error) throw error;
    }
  }
  for (const t of TABLES) {
    const up = [];
    next.tables[t].forEach((v, id) => {
      const old = base.tables[t].get(id);
      if (!old || old.json !== v.json) up.push(v.row);
    });
    if (up.length) {
      const { error } = await sb.from(TABLE_NAME[t]).upsert(up, { onConflict: 'id' });
      if (error) throw error;
    }
  }
}

// ownerId: the company's owner (an employee writes rows under their employer's id).
// opts.company: false for employees — only the owner edits the company profile and prices.
export function createSync(sb, ownerId, initialSnap, onStatus, opts = { company: true }) {
  let base = index(initialSnap, ownerId, opts);
  let pending = null;
  let running = false;

  async function run() {
    if (running) return;
    running = true;
    onStatus({ state: 'saving' });
    while (pending) {
      const target = pending;
      pending = null;
      try {
        await apply(sb, base, target);
        base = target;
      } catch (error) {
        pending = pending || target;
        running = false;
        onStatus({ state: 'error', error, retry: () => run() });
        return;
      }
    }
    running = false;
    onStatus({ state: 'saved' });
  }

  return {
    push(snap) {
      const next = index(snap, ownerId, opts);
      pending = next;
      run();
    },
    hasPending() { return running || !!pending; }
  };
}
