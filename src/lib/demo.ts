// Local demo backend: mimics the small slice of the Supabase client Rambl uses, persisted in localStorage.
// ALL data here is fictional sample data and is labeled as such in the UI.
const KEY = "stoop-demo-db-v1";
type Row = Record<string, any>;
type DB = Record<string, Row[]>;
const DEFAULTS: Record<string, Row> = { properties: { vacancy_pct: 5, is_condo_coop: false }, units: { monthly_rent: 0 }, expenses: { is_estimate: false }, maintenance_log: { cost: 0, counts_in_costs: true }, reminders: { done: false } };
const DEMO_USER = { id: "demo-user", email: "demo@stoop.local", created_at: "2026-11-04T12:00:00Z", user_metadata: {} };

function seed(): DB {
  const now = Date.now(), d = (h: number) => new Date(now - h * 36e5).toISOString();
  return {
    profiles: [], terms_acceptances: [], properties: [], loans: [], expenses: [], units: [], property_snapshots: [], reminders: [], maintenance_log: [], vacancies: [], rent_history: [], public_records_cache: [],
    news_items: [
      { id: "n1", url: "https://example.com/sample-1", title: "[Sample] Rent Guidelines Board schedules preliminary vote", source_name: "Sample feed", published_at: d(5), excerpt: "Placeholder headline for previewing the news page. Not a real article.", topics: ["rent-stabilization", "regulation"], score: 9, fetched_at: d(1) },
      { id: "n2", url: "https://example.com/sample-2", title: "[Sample] Brooklyn multifamily sales tick up in latest quarter", source_name: "Sample feed", published_at: d(30), excerpt: "Placeholder headline. Not a real article.", topics: ["market"], score: 6, fetched_at: d(1) },
      { id: "n3", url: "https://example.com/sample-3", title: "[Sample] HPD announces inspection sweep of heat complaints", source_name: "Sample feed", published_at: d(60), excerpt: "Placeholder headline. Not a real article.", topics: ["safety"], score: 5, fetched_at: d(1) },
    ],
  };
}
function load(): DB { try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch { /* ignore */ } return seed(); }
let db: DB = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ } };
export const resetDemo = () => { db = seed(); save(); };

const CASCADE: Record<string, string[]> = { properties: ["loans", "expenses", "units", "property_snapshots", "reminders", "maintenance_log", "vacancies", "rent_history"] };
const UNIT_CHILDREN = ["vacancies", "rent_history"];

class Query implements PromiseLike<{ data: any; error: { message: string } | null }> {
  private op: "select" | "insert" | "update" | "delete" = "select";
  private filters: ((r: Row) => boolean)[] = []; private payload: any = null; private ord: { col: string; asc: boolean } | null = null; private lim = Infinity;
  private mode: "many" | "single" | "maybe" = "many"; private returnRows = false;
  constructor(private table: string) {}
  select() { this.returnRows = true; return this; }
  insert(p: any) { this.op = "insert"; this.payload = p; return this; }
  update(p: any) { this.op = "update"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c: string, v: any) { this.filters.push(r => r[c] === v); return this; }
  gte(c: string, v: any) { this.filters.push(r => String(r[c] ?? "") >= String(v)); return this; }
  order(c: string, o?: { ascending?: boolean }) { this.ord = { col: c, asc: o?.ascending !== false }; return this; }
  limit(n: number) { this.lim = n; return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  private run() {
    const t = (db[this.table] ??= []);
    const match = (r: Row) => this.filters.every(f => f(r));
    let out: Row[] = [];
    if (this.op === "insert") {
      const items = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((p: Row) => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...(DEFAULTS[this.table] ?? {}), ...p }));
      if (this.table === "terms_acceptances" && items.some((i: Row) => t.some(x => x.user_id === i.user_id && x.terms_version === i.terms_version))) return { data: null, error: { message: "duplicate key" } };
      t.push(...items); out = items;
    } else if (this.op === "update") { t.filter(match).forEach(r => Object.assign(r, this.payload)); out = t.filter(match); }
    else if (this.op === "delete") {
      const gone = t.filter(match).map(r => r.id); db[this.table] = t.filter(r => !gone.includes(r.id));
      for (const child of CASCADE[this.table] ?? []) db[child] = (db[child] ?? []).filter(r => !gone.includes(r.property_id));
      if (this.table === "units") for (const child of UNIT_CHILDREN) db[child] = (db[child] ?? []).filter(r => !gone.includes(r.unit_id));
    } else out = t.filter(match);
    save();
    if (this.op === "delete" || (this.op !== "select" && !this.returnRows)) return { data: null, error: null };
    if (this.ord) { const { col, asc } = this.ord; out = [...out].sort((a, b) => (String(a[col] ?? "") < String(b[col] ?? "") ? -1 : 1) * (asc ? 1 : -1)); if (col === "score") out.sort((a, b) => (Number(a.score) - Number(b.score)) * (asc ? 1 : -1)); }
    out = out.slice(0, this.lim);
    if (this.mode === "single") return out[0] ? { data: out[0], error: null } : { data: null, error: { message: "Row not found" } };
    if (this.mode === "maybe") return { data: out[0] ?? null, error: null };
    return { data: out, error: null };
  }
  then<A, B>(ok?: ((v: any) => A | PromiseLike<A>) | null, bad?: ((e: any) => B | PromiseLike<B>) | null) { return Promise.resolve().then(() => this.run()).then(ok, bad); }
}

function invoke(_name: string, opts: { body: any }) {
  const b = opts.body ?? {};
  if (b.mode === "search") {
    const t = String(b.text ?? "").trim();
    return Promise.resolve({ data: { candidates: [
      { label: `${t} (DEMO match), Brooklyn, NY`, bbl: "3000010001", borough: "Brooklyn", bin: "3000001", lat: 40.69, lng: -73.99 },
      { label: `${t} (DEMO match), Queens, NY`, bbl: "4000010002", borough: "Queens", bin: "4000002", lat: 40.73, lng: -73.8 }], fetchedAt: new Date().toISOString() }, error: null });
  }
  if (b.mode === "lookup") {
    return Promise.resolve({ data: {
      bbl: b.bbl, errors: {}, fetchedAt: new Date().toISOString(), demo: true,
      pluto: { address: "DEMO", bldgClass: "C1", unitsRes: 6, unitsTotal: 6, floors: 4, yearBuilt: 1931, lotArea: 2500, bldgArea: 6200, zoning: "R6B", owner: "SAMPLE OWNER LLC", assessLand: 210000, assessTotal: 640000, isCondoOrCoop: false },
      acris: [{ documentId: "d1", type: "MTGE", amount: 1200000, recorded: "2019-06-12T00:00:00", docDate: "2019-06-01" }, { documentId: "d2", type: "DEED", amount: 1650000, recorded: "2019-06-12T00:00:00", docDate: "2019-06-01" }],
      hpd: { sampled: 14, open: 3, byClass: { A: 1, B: 2 } },
    }, error: null });
  }
  return Promise.resolve({ data: null, error: { message: "not available in demo" } });
}

export function createDemoClient(): any {
  let listeners: ((e: string, s: any) => void)[] = [];
  const session = { user: DEMO_USER };
  return {
    from: (t: string) => new Query(t),
    functions: { invoke },
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: DEMO_USER }, error: null }),
      onAuthStateChange: (cb: any) => { listeners.push(cb); return { data: { subscription: { unsubscribe() { listeners = listeners.filter(l => l !== cb); } } } }; },
      signInWithPassword: async () => ({ data: { session }, error: null }),
      signUp: async () => ({ data: { session }, error: null }),
      updateUser: async (a: any) => { if (a?.data) Object.assign(DEMO_USER.user_metadata, a.data); const sess = { user: { ...DEMO_USER, user_metadata: { ...DEMO_USER.user_metadata } } }; listeners.forEach(l => l("USER_UPDATED", sess)); return { data: { user: DEMO_USER }, error: null }; },
      signOut: async () => { resetDemo(); location.reload(); return { error: null }; },
    },
  };
}
