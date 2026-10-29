// Converts between the app's in-memory objects and database rows.

export const TABLES = ['clients', 'containers', 'trips', 'payments'];

export const toRow = {
  clients: (c) => ({
    id: c.id, name: c.name, kind: c.kind || 'company',
    code: c.code || null, phone: c.phone || null, address: c.address || null
  }),
  containers: (c) => ({ id: c.id, code: c.code, vol: Number(c.vol), added: c.added || null }),
  trips: (t) => ({
    id: t.id, date: t.date, type: t.type, client_id: t.client, cont: t.cont,
    new_cont: t.newCont || null, address: t.address || null, driver: t.driver || null,
    price: Number(t.price) || 0
  }),
  payments: (p) => ({
    id: p.id, date: p.date, client_id: p.client, amount: Number(p.amount), method: p.method,
    trip_id: p.trip || null, trip_ids: p.trips && p.trips.length ? p.trips : null
  })
};

export const fromRow = {
  clients: (r) => ({ id: r.id, name: r.name, kind: r.kind, code: r.code || '', phone: r.phone || '', address: r.address || '' }),
  containers: (r) => ({ id: r.id, code: r.code, vol: Number(r.vol), added: r.added }),
  trips: (r) => ({
    id: r.id, date: r.date, type: r.type, client: r.client_id, cont: r.cont, newCont: r.new_cont || '',
    address: r.address || '', driver: r.driver || '', price: Number(r.price) || 0
  }),
  payments: (r) => {
    const p = { id: r.id, date: r.date, client: r.client_id, amount: Number(r.amount), method: r.method, trip: r.trip_id || '' };
    if (r.trip_ids && r.trip_ids.length) p.trips = r.trip_ids;
    return p;
  }
};

export function companyToRow(co, prices) {
  return {
    name: co.name, form: co.form || 'შპს', code: co.code || null, phone: co.phone || null,
    city: co.city || null, owner_name: co.owner || null, provider: co.provider || null,
    email: co.email || null, logo: co.logo || null, prices: prices || {}
  };
}

export function companyFromRow(r) {
  if (!r) return null;
  return {
    name: r.name, form: r.form, code: r.code || '', phone: r.phone || '', city: r.city || '',
    owner: r.owner_name || '', provider: r.provider || '', email: r.email || '', logo: r.logo || '',
    prices: r.prices || {}
  };
}
