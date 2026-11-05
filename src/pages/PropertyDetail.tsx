import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProperty, listFor, insertRow, deleteRow, updateRow, toLoan, EXPENSE_CATEGORIES, PropertyRow, LoanRow, ExpenseRow, UnitRow } from "../lib/data";
import { lookupBBL, Bundle } from "../lib/api";
import { propertyMetrics, loanStatus, fmtMoney } from "../lib/finance";
import { supabase } from "../lib/supabase";
import { relevantNews, NewsLite } from "../lib/alerts";
import { SourceTag, SectionNote, EstimateBadge } from "../components/Disclaimers";

type Tab = "overview" | "records" | "debt" | "costs" | "units";
const uid = async () => (await supabase.auth.getUser()).data.user!.id;

export default function PropertyDetail() {
  const { id } = useParams(); const nav = useNavigate();
  const [p, setP] = useState<PropertyRow | null>(null); const [loans, setLoans] = useState<LoanRow[]>([]); const [exp, setExp] = useState<ExpenseRow[]>([]); const [units, setUnits] = useState<UnitRow[]>([]);
  const [tab, setTab] = useState<Tab>("overview"); const [err, setErr] = useState("");
  const load = useCallback(async () => { try { const [a, l, e, u] = await Promise.all([getProperty(id!), listFor<LoanRow>("loans", id), listFor<ExpenseRow>("expenses", id), listFor<UnitRow>("units", id)]); setP(a); setLoans(l); setExp(e); setUnits(u); } catch (x) { setErr((x as Error).message); } }, [id]);
  useEffect(() => { load(); }, [load]);
  const run = async (f: () => Promise<unknown>) => { setErr(""); try { await f(); await load(); } catch (x) { setErr((x as Error).message); } };
  if (err && !p) return <p className="err">{err}</p>; if (!p) return <p>Loading…</p>;

  const rent = units.reduce((s, u) => s + Number(u.monthly_rent), 0);
  const m = propertyMetrics({ value: Number(p.current_value ?? p.purchase_price ?? 0), monthlyRent: rent, vacancyPct: Number(p.vacancy_pct ?? 5), annualExpenses: exp.reduce((s, e) => s + Number(e.annual_amount), 0), loans: loans.map(toLoan), cashInvested: Number(p.cash_invested ?? 0) });

  return (<>
    <h1>{p.nickname || p.address}</h1><div className="sub" style={{ marginTop: 0 }}>{p.address}{p.bbl && ` · BBL ${p.bbl}`}</div>
    <div className="seg">{(["overview", "records", "debt", "costs", "units"] as Tab[]).map(t => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t === "records" ? "Public records" : t[0].toUpperCase() + t.slice(1)}</button>)}</div>
    {err && <p className="err">{err}</p>}

    {tab === "overview" && <>
      <div className="card"><h2>Your numbers</h2>
        <div className="row"><div><label>Current value (your estimate)<input type="number" defaultValue={p.current_value ?? ""} onBlur={e => run(() => updateRow("properties", p.id, { current_value: e.target.value === "" ? null : Number(e.target.value) }))} /></label></div>
          <div><label>Purchase price<input type="number" defaultValue={p.purchase_price ?? ""} onBlur={e => run(() => updateRow("properties", p.id, { purchase_price: e.target.value === "" ? null : Number(e.target.value) }))} /></label></div>
          <div><label>Cash invested<input type="number" defaultValue={p.cash_invested ?? ""} onBlur={e => run(() => updateRow("properties", p.id, { cash_invested: e.target.value === "" ? null : Number(e.target.value) }))} /></label></div>
          <div><label>Vacancy %<input type="number" defaultValue={p.vacancy_pct} onBlur={e => run(() => updateRow("properties", p.id, { vacancy_pct: Number(e.target.value) || 0 }))} /></label></div></div>
        <p className="note">Value is whatever you enter; Stoop does not appraise. For reference, the city’s assessed value is on the Public records tab.</p></div>
      <div className="grid">{([["NOI", fmtMoney(m.noi)], ["Cash flow", fmtMoney(m.cashFlow)], ["Cap rate", m.capRate.toFixed(2) + "%"], ["Cash-on-cash", m.cashOnCash.toFixed(2) + "%"], ["Equity", fmtMoney(m.equity)], ["LTV", m.ltv.toFixed(1) + "%"], ["DSCR", m.dscr ? m.dscr.toFixed(2) : "—"]] as [string, string][]).map(([l, v]) => <div className="card stat" key={l}><div className="l">{l}</div><div className="v">{v}</div></div>)}</div>
      <p className="note">Calculated from your inputs. <EstimateBadge /></p>
      <RelatedNews p={p} units={units.length} hasLoans={loans.length > 0} />
      <RemoveProperty onRemove={() => run(async () => { await deleteRow("properties", p.id); nav("/"); })} /></>}

    {tab === "records" && <Records p={p} />}

    {tab === "debt" && <div className="card"><h2>Debt <EstimateBadge /></h2>
      <p className="note">Balances are calculated from the terms you enter, assuming on-time payments. Your lender’s statement is the source of truth.</p>
      <table><thead><tr><th>Lender</th><th>Principal</th><th>Rate</th><th>Term</th><th>Payment/mo</th><th>Est. balance</th><th /></tr></thead><tbody>
        {loans.map(l => { const s = loanStatus(toLoan(l)); return <tr key={l.id}><td>{l.lender || "—"}</td><td>{fmtMoney(Number(l.principal))}</td><td>{l.rate_pct}%</td><td>{l.term_years}y</td><td>{fmtMoney(s.payment)}</td><td>{fmtMoney(s.balance)}</td><td><button className="ghost" onClick={() => run(() => deleteRow("loans", l.id))}>×</button></td></tr>; })}</tbody></table>
      <LoanForm onAdd={v => run(async () => insertRow("loans", { ...v, user_id: await uid(), property_id: p.id }))} /></div>}

    {tab === "costs" && <div className="card"><h2>Operating costs</h2>
      <table><thead><tr><th>Category</th><th>Annual</th><th /><th /></tr></thead><tbody>
        {exp.map(e => <tr key={e.id}><td>{e.category}</td><td>{fmtMoney(Number(e.annual_amount))}</td><td>{e.is_estimate && <EstimateBadge />}</td><td><button className="ghost" onClick={() => run(() => deleteRow("expenses", e.id))}>×</button></td></tr>)}</tbody></table>
      <ExpenseForm onAdd={v => run(async () => insertRow("expenses", { ...v, user_id: await uid(), property_id: p.id }))} /></div>}

    {tab === "units" && <div className="card"><h2>Rent roll</h2>
      <table><thead><tr><th>Unit</th><th>Tenant</th><th>Rent/mo</th><th>Lease end</th><th>Stabilized</th><th /></tr></thead><tbody>
        {units.map(u => <tr key={u.id}><td>{u.label}</td><td>{u.tenant_name || "—"}</td><td>{fmtMoney(Number(u.monthly_rent))}</td><td>{u.lease_end || "—"}</td><td>{u.is_stabilized === null ? "Unknown" : u.is_stabilized ? "Yes" : "No"}</td><td><button className="ghost" onClick={() => run(() => deleteRow("units", u.id))}>×</button></td></tr>)}</tbody></table>
      <UnitForm onAdd={v => run(async () => insertRow("units", { ...v, user_id: await uid(), property_id: p.id }))} /></div>}
  </>);
}

function Records({ p }: { p: PropertyRow }) {
  const [b, setB] = useState<Bundle | null>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const go = useCallback(async (refresh = false) => { if (!p.bbl) return; setBusy(true); setErr(""); try { setB(await lookupBBL(p.bbl, refresh)); } catch (x) { setErr((x as Error).message); } setBusy(false); }, [p.bbl]);
  useEffect(() => { go(); }, [go]);
  if (!p.bbl) return <div className="card">This property was added manually, so no tax-lot records are linked.</div>;
  return (<>
    <div className="row"><span /> <button className="ghost" onClick={() => go(true)} disabled={busy}>{busy ? "Loading…" : "Refresh"}</button></div>
    {err && <p className="err">Couldn’t load public records: {err}</p>}
    {b && Object.entries(b.errors ?? {}).map(([k, v]) => <p key={k} className="note">{k.toUpperCase()} unavailable right now ({v}).</p>)}
    {b?.pluto && <div className="card"><h2>Assessed value</h2>
      <table><tbody><tr><th>Total assessed</th><td>{b.pluto.assessTotal ? fmtMoney(b.pluto.assessTotal) : "—"}</td></tr><tr><th>Land assessed</th><td>{b.pluto.assessLand ? fmtMoney(b.pluto.assessLand) : "—"}</td></tr><tr><th>Owner of record (PLUTO)</th><td>{b.pluto.owner ?? "—"}</td></tr></tbody></table>
      <SourceTag id="dof" asOf={b.fetchedAt} /><SectionNote id="dof" /></div>}
    {b?.acris && <div className="card"><h2>Deeds & mortgages (ACRIS)</h2>
      {b.acris.length === 0 ? <p>No matching documents found.</p> : <table><thead><tr><th>Recorded</th><th>Type</th><th>Amount</th></tr></thead><tbody>
        {b.acris.map(d => <tr key={d.documentId}><td>{d.recorded?.slice(0, 10) ?? "—"}</td><td>{(d as any).label ?? d.type}</td><td>{d.amount ? fmtMoney(d.amount) : "—"}</td></tr>)}</tbody></table>}
      <SourceTag id="acris" asOf={b.fetchedAt} /><SectionNote id="acris" /></div>}
    {b?.flags && <div className="card"><h2>Regulatory flags</h2>
      {(["stabilization", "ll97"] as const).map(k => { const f = b.flags![k]; const title = k === "stabilization" ? "Rent stabilization" : "Local Law 97";
        const hit = f && (f.listed || f.covered); const checked = f && f.checked !== false;
        return <p key={k}><strong>{title}:</strong> {!checked ? "Not checked (data source not configured)." : hit ? (k === "stabilization" ? "Possible — building appears on a list. Not confirmed for any unit." : "May apply — building appears on a list.") : "Not found on the list used."} <span style={{ color: "var(--muted)" }}>{f?.evidence}</span></p>; })}
      <SourceTag id="stabilization" asOf={b.fetchedAt} /><SectionNote id="stabilization" /><SectionNote id="ll97" /></div>}
    {b?.hpd && <div className="card"><h2>HPD violations</h2>
      <p><strong>{b.hpd.open}</strong> open of {b.hpd.sampled} total{Object.keys(b.hpd.byClass).length > 0 && ` (${Object.entries(b.hpd.byClass).map(([c, n]) => `Class ${c}: ${n}`).join(", ")})`}</p>
      <SourceTag id="hpd" asOf={b.fetchedAt} /><SectionNote id="hpd" /></div>}
  </>);
}

function Mini({ children, onSubmit }: { children: React.ReactNode; onSubmit: () => void }) { return <form onSubmit={e => { e.preventDefault(); onSubmit(); }} className="row" style={{ marginTop: 12, alignItems: "flex-end" }}>{children}<button>Add</button></form>; }
function LoanForm({ onAdd }: { onAdd: (v: any) => void }) {
  const [v, s] = useState({ lender: "", principal: "", rate_pct: "", term_years: "30", start_date: "" });
  return <Mini onSubmit={() => { onAdd({ lender: v.lender || null, principal: Number(v.principal), rate_pct: Number(v.rate_pct), term_years: Number(v.term_years), start_date: v.start_date }); s({ ...v, principal: "", rate_pct: "" }); }}>
    <div><label>Lender<input value={v.lender} onChange={e => s({ ...v, lender: e.target.value })} /></label></div><div><label>Principal<input type="number" required value={v.principal} onChange={e => s({ ...v, principal: e.target.value })} /></label></div>
    <div><label>Rate %<input type="number" step="0.01" required value={v.rate_pct} onChange={e => s({ ...v, rate_pct: e.target.value })} /></label></div><div><label>Term (yrs)<input type="number" required value={v.term_years} onChange={e => s({ ...v, term_years: e.target.value })} /></label></div>
    <div><label>Start date<input type="date" required value={v.start_date} onChange={e => s({ ...v, start_date: e.target.value })} /></label></div></Mini>;
}
function ExpenseForm({ onAdd }: { onAdd: (v: any) => void }) {
  const [c, setC] = useState(EXPENSE_CATEGORIES[0]); const [a, setA] = useState(""); const [est, setEst] = useState(false);
  return <Mini onSubmit={() => { onAdd({ category: c, annual_amount: Number(a), is_estimate: est }); setA(""); }}>
    <div><label>Category<select value={c} onChange={e => setC(e.target.value)}>{EXPENSE_CATEGORIES.map(x => <option key={x}>{x}</option>)}</select></label></div>
    <div><label>Annual $<input type="number" required min="0" value={a} onChange={e => setA(e.target.value)} /></label></div>
    <label style={{ display: "flex", gap: 6 }}><input type="checkbox" style={{ width: "auto" }} checked={est} onChange={e => setEst(e.target.checked)} />My estimate</label></Mini>;
}
function UnitForm({ onAdd }: { onAdd: (v: any) => void }) {
  const [v, s] = useState({ label: "", tenant_name: "", monthly_rent: "", lease_end: "", stab: "unknown" });
  return <Mini onSubmit={() => { onAdd({ label: v.label, tenant_name: v.tenant_name || null, monthly_rent: Number(v.monthly_rent), lease_end: v.lease_end || null, is_stabilized: v.stab === "unknown" ? null : v.stab === "yes" }); s({ label: "", tenant_name: "", monthly_rent: "", lease_end: "", stab: "unknown" }); }}>
    <div><label>Unit<input required value={v.label} onChange={e => s({ ...v, label: e.target.value })} /></label></div><div><label>Tenant<input value={v.tenant_name} onChange={e => s({ ...v, tenant_name: e.target.value })} /></label></div>
    <div><label>Rent/mo<input type="number" required min="0" value={v.monthly_rent} onChange={e => s({ ...v, monthly_rent: e.target.value })} /></label></div><div><label>Lease end<input type="date" value={v.lease_end} onChange={e => s({ ...v, lease_end: e.target.value })} /></label></div>
    <div><label>Stabilized?<select value={v.stab} onChange={e => s({ ...v, stab: e.target.value })}><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></label></div></Mini>;
}

function RelatedNews({ p, units, hasLoans }: { p: PropertyRow; units: number; hasLoans: boolean }) {
  const [items, setItems] = useState<NewsLite[]>([]);
  useEffect(() => { supabase.from("news_items").select("*").order("published_at", { ascending: false }).limit(60).then(({ data }) => setItems((data as NewsLite[]) ?? [])); }, []);
  const rel = relevantNews({ borough: p.borough, address: p.address, units: p.units_residential ?? units, hasLoans }, items);
  if (!rel.length) return null;
  return <div className="card"><h2>News that may matter here</h2>{rel.map(({ n, why }) => <p key={n.id}><a href={n.url} target="_blank" rel="noopener noreferrer">{n.title}</a><br /><span style={{ color: "var(--muted)", fontSize: ".82rem" }}>{n.source_name} · {why}</span></p>)}
    <SourceTag id="news" /><div className="note">Matches use simple keyword rules and can miss or over-match.</div></div>;
}

function RemoveProperty({ onRemove }: { onRemove: () => void }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button className="ghost" onClick={() => setAsk(true)}>Remove property</button>;
  return <div className="card"><p style={{ marginTop: 0 }}>Remove this property and its loans, costs and units? This can’t be undone.</p><div className="row"><button className="danger" onClick={onRemove}>Yes, remove it</button><button className="ghost" onClick={() => setAsk(false)}>Cancel</button></div></div>;
}
