import { useEffect, useState, useCallback, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProperty, listFor, insertRow, deleteRow, updateRow, toLoan, EXPENSE_CATEGORIES, PropertyRow, LoanRow, ExpenseRow, UnitRow } from "../lib/data";
import { propertyMetrics, loanStatus, fmtMoney } from "../lib/finance";
import { supabase } from "../lib/supabase";
import { relevantNews, NewsLite } from "../lib/alerts";
import { isRelevant } from "../../supabase/functions/_shared/relevance";
import { ReservesTab } from "../components/Reserves";
import { ImportTab } from "../components/ImportTab";
import { CapItem } from "../lib/reserves";
import { MaintenanceTab, VacancyTab, RemindersPanel, LoanSchedule, UnitEditor, UnitHistory } from "../components/OwnerTabs";
import { MaintRow, VacancyRow, RentHistRow, trailingMaintenance } from "../lib/owner";
import { Link } from "react-router-dom";
import { SourceTag, SectionNote, EstimateBadge } from "../components/Disclaimers";

type Tab = "overview" | "debt" | "costs" | "units" | "maintenance" | "vacancy" | "reminders" | "reserves" | "import";
const TAB_LABEL: Record<Tab, string> = { overview: "Overview", debt: "Debt", costs: "Costs", units: "Units", maintenance: "Maintenance", vacancy: "Vacancy", reminders: "Reminders", reserves: "Reserves", import: "Import" };
const uid = async () => (await supabase.auth.getUser()).data.user!.id;

export default function PropertyDetail() {
  const { id } = useParams(); const nav = useNavigate();
  const [p, setP] = useState<PropertyRow | null>(null); const [loans, setLoans] = useState<LoanRow[]>([]); const [exp, setExp] = useState<ExpenseRow[]>([]); const [units, setUnits] = useState<UnitRow[]>([]);
  const [caps, setCaps] = useState<CapItem[]>([]); const [maint, setMaint] = useState<MaintRow[]>([]); const [vacs, setVacs] = useState<VacancyRow[]>([]); const [hist, setHist] = useState<RentHistRow[]>([]); const [editing, setEditing] = useState<string | null>(null); const [showHist, setShowHist] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview"); const [err, setErr] = useState("");
  const load = useCallback(async () => { try { const [a, l, e, u, mt, vc, hs, cp] = await Promise.all([getProperty(id!), listFor<LoanRow>("loans", id), listFor<ExpenseRow>("expenses", id), listFor<UnitRow>("units", id), listFor<MaintRow>("maintenance_log", id), listFor<VacancyRow>("vacancies", id), listFor<RentHistRow>("rent_history", id), listFor<CapItem>("capital_items", id)]); setP(a); setLoans(l); setExp(e); setUnits(u); setMaint(mt); setVacs(vc); setHist(hs); setCaps(cp); } catch (x) { setErr((x as Error).message); } }, [id]);
  useEffect(() => { load(); }, [load]);
  const run = async (f: () => Promise<unknown>) => { setErr(""); try { await f(); await load(); } catch (x) { setErr((x as Error).message); } };
  if (err && !p) return <p className="err">{err}</p>; if (!p) return <p>Loading…</p>;

  const rent = units.reduce((s, u) => s + Number(u.monthly_rent), 0);
  const m = propertyMetrics({ value: Number(p.current_value ?? p.purchase_price ?? 0), monthlyRent: rent, vacancyPct: Number(p.vacancy_pct ?? 5), annualExpenses: exp.reduce((s, e) => s + Number(e.annual_amount), 0) + trailingMaintenance(maint, p.id), loans: loans.map(toLoan), cashInvested: Number(p.cash_invested ?? 0) });

  return (<>
    <h1>{p.nickname || p.address}</h1><div className="sub" style={{ marginTop: 0 }}>{p.address}{p.bbl && ` · BBL ${p.bbl}`}</div>
    <div className="seg">{(Object.keys(TAB_LABEL) as Tab[]).map(t => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{TAB_LABEL[t]}</button>)}<Link to={`/reports?property=${p.id}`} className="ghost-link">Report</Link></div>
    {err && <p className="err">{err}</p>}

    {tab === "overview" && <>
      <div className="card"><h2>Your numbers</h2>
        <div className="row"><div><label>Current value (your estimate)<input type="number" defaultValue={p.current_value ?? ""} onBlur={e => run(() => updateRow("properties", p.id, { current_value: e.target.value === "" ? null : Number(e.target.value) }))} /></label></div>
          <div><label>Purchase price<input type="number" defaultValue={p.purchase_price ?? ""} onBlur={e => run(() => updateRow("properties", p.id, { purchase_price: e.target.value === "" ? null : Number(e.target.value) }))} /></label></div>
          <div><label>Cash invested<input type="number" defaultValue={p.cash_invested ?? ""} onBlur={e => run(() => updateRow("properties", p.id, { cash_invested: e.target.value === "" ? null : Number(e.target.value) }))} /></label></div>
          <div><label>Vacancy %<input type="number" defaultValue={p.vacancy_pct} onBlur={e => run(() => updateRow("properties", p.id, { vacancy_pct: Number(e.target.value) || 0 }))} /></label></div></div>
        <p className="note">Value is whatever you enter; Rambl does not appraise.</p></div>
      <div className="grid">{([["NOI", fmtMoney(m.noi)], ["Cash flow", fmtMoney(m.cashFlow)], ["Cap rate", m.capRate.toFixed(2) + "%"], ["Cash-on-cash", m.cashOnCash.toFixed(2) + "%"], ["Equity", fmtMoney(m.equity)], ["LTV", m.ltv.toFixed(1) + "%"], ["DSCR", m.dscr ? m.dscr.toFixed(2) : "—"]] as [string, string][]).map(([l, v]) => <div className="card stat" key={l}><div className="l">{l}</div><div className="v">{v}</div></div>)}</div>
      <p className="note">Calculated from your inputs. <EstimateBadge /></p>
      <p className="note">Records you keep here — maintenance, vacancies, rent history and reminders — are your own notes. <Link to={`/reports?property=${p.id}`}>Build a one-page report for this property</Link> to share with a lender or partner.</p>
      <RelatedNews p={p} units={units.length} hasLoans={loans.length > 0} />
      <RemoveProperty onRemove={() => run(async () => { await deleteRow("properties", p.id); nav("/"); })} /></>}


    {tab === "debt" && <div className="card"><h2>Debt <EstimateBadge /></h2>
      <p className="note">Balances are calculated from the terms you enter, assuming on-time payments. Your lender’s statement is the source of truth.</p>
      <table><thead><tr><th>Lender</th><th>Principal</th><th>Rate</th><th>Term</th><th>Payment/mo</th><th>Est. balance</th><th /></tr></thead><tbody>
        {loans.map(l => { const s = loanStatus(toLoan(l)); return <tr key={l.id}><td>{l.lender || "—"}</td><td>{fmtMoney(Number(l.principal))}</td><td>{l.rate_pct}%</td><td>{l.term_years}y</td><td>{fmtMoney(s.payment)}</td><td>{fmtMoney(s.balance)}</td><td><button className="ghost" onClick={() => run(() => deleteRow("loans", l.id))}>×</button></td></tr>; })}</tbody></table>
      {loans.map(l => <table key={"s" + l.id}><tbody><LoanSchedule loan={l} /></tbody></table>)}
      <LoanForm onAdd={v => run(async () => insertRow("loans", { ...v, user_id: await uid(), property_id: p.id }))} /></div>}

    {tab === "costs" && <div className="card"><h2>Operating costs</h2>
      <table><thead><tr><th>Category</th><th>Annual</th><th /><th /></tr></thead><tbody>
        {exp.map(e => <tr key={e.id}><td>{e.category}</td><td>{fmtMoney(Number(e.annual_amount))}</td><td>{e.is_estimate && <EstimateBadge />}</td><td><button className="ghost" onClick={() => run(() => deleteRow("expenses", e.id))}>×</button></td></tr>)}</tbody></table>
      {trailingMaintenance(maint, p.id) > 0 && <p className="note">Plus {fmtMoney(trailingMaintenance(maint, p.id))} from your maintenance log (last 12 months), added to NOI automatically. <button className="ghost sm" onClick={() => setTab("maintenance")}>Open log</button></p>}
      <ExpenseForm onAdd={v => run(async () => insertRow("expenses", { ...v, user_id: await uid(), property_id: p.id }))} /></div>}

    {tab === "units" && <div className="card"><h2>Rent roll</h2>
      <table><thead><tr><th>Unit</th><th>Tenant</th><th>Rent/mo</th><th>Lease end</th><th>Stabilized</th><th /></tr></thead><tbody>
        {units.map(u => <Fragment key={u.id}><tr><td>{u.label}</td><td>{u.tenant_name || "—"}</td><td>{fmtMoney(Number(u.monthly_rent))}</td><td>{u.lease_end || "—"}</td><td>{u.is_stabilized === null ? "Unknown" : u.is_stabilized ? "Yes" : "No"}</td><td><button className="sm ghost" onClick={() => setEditing(editing === u.id ? null : u.id)}>Edit</button><button className="sm ghost" onClick={() => setShowHist(showHist === u.id ? null : u.id)}>History</button><button className="ghost" onClick={() => run(() => deleteRow("units", u.id))}>×</button></td></tr>
          {editing === u.id && <UnitEditor unit={u} run={run} onClose={() => setEditing(null)} />}{showHist === u.id && <UnitHistory unit={u} hist={hist} run={run} />}</Fragment>)}</tbody></table>
      <UnitForm onAdd={v => run(async () => { const u = await insertRow("units", { ...v, user_id: await uid(), property_id: p.id }); await insertRow("rent_history", { user_id: await uid(), property_id: p.id, unit_id: u.id, effective_date: new Date().toISOString().slice(0, 10), monthly_rent: v.monthly_rent, tenant_name: v.tenant_name, lease_end: v.lease_end, note: "Added to rent roll" }); })} />
      <p className="note">Edit a unit to change its rent, tenant or lease end; each change is saved to its History with a note.</p></div>}

    {tab === "maintenance" && <MaintenanceTab propertyId={p.id} log={maint} run={run} />}
    {tab === "vacancy" && <VacancyTab propertyId={p.id} units={units} vacs={vacs} run={run} />}
    {tab === "reserves" && <ReservesTab propertyId={p.id} items={caps} run={run} />}
    {tab === "import" && <ImportTab propertyId={p.id} existingUnits={units.map(u => u.label.toLowerCase())} run={run} />}
    {tab === "reminders" && <RemindersPanel propertyId={p.id} title="Reminders for this property" />}
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
  useEffect(() => { supabase.from("news_items").select("*").order("published_at", { ascending: false }).limit(120).then(({ data }) => setItems(((data as NewsLite[]) ?? []).filter(n => isRelevant(n.title, n.excerpt, n.source_name)))); }, []);
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
