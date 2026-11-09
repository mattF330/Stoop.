import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProperties, listFor, toLoan, PropertyRow, LoanRow, ExpenseRow, UnitRow } from "../lib/data";
import { propertyMetrics, portfolioTotals, fmtMoney } from "../lib/finance";
import { toCsv } from "../lib/csv";
import { loadPrefs, Prefs } from "../lib/prefs";
import { RemindersPanel } from "../components/OwnerTabs";
import { EstimateBadge } from "../components/Disclaimers";
import { trailingMaintenance, MaintRow } from "../lib/owner";
import { matchProps, lineFor } from "../lib/lines";

const short = (n: number) => { const a = Math.abs(n); const s = a >= 1e6 ? (a / 1e6).toFixed(2) + "M" : a >= 1e3 ? Math.round(a / 1e3) + "k" : String(Math.round(a)); return (n < 0 ? "−" : "") + "$" + s; };

export default function Dashboard() {
  const [props, setProps] = useState<PropertyRow[] | null>(null); const [err, setErr] = useState("");
  const [rows, setRows] = useState<{ p: PropertyRow; m: ReturnType<typeof propertyMetrics> }[]>([]);
  const [filter, setFilter] = useState(""); const [prefs, setPrefs] = useState<Prefs>(loadPrefs());
  useEffect(() => { const f = () => setPrefs(loadPrefs()); window.addEventListener("stoop-prefs", f); return () => window.removeEventListener("stoop-prefs", f); }, []);
  useEffect(() => { (async () => {
    try {
      const [p, loans, exp, units, maint] = await Promise.all([listProperties(), listFor<LoanRow>("loans"), listFor<ExpenseRow>("expenses"), listFor<UnitRow>("units"), listFor<MaintRow>("maintenance_log")]);
      setProps(p);
      setRows(p.map(pr => ({ p: pr, m: propertyMetrics({
        value: Number(pr.current_value ?? pr.purchase_price ?? 0),
        monthlyRent: units.filter(u => u.property_id === pr.id).reduce((s, u) => s + Number(u.monthly_rent), 0),
        vacancyPct: Number(pr.vacancy_pct ?? 5), annualExpenses: exp.filter(e => e.property_id === pr.id).reduce((s, e) => s + Number(e.annual_amount), 0) + trailingMaintenance(maint, pr.id),
        loans: loans.filter(l => l.property_id === pr.id).map(toLoan), cashInvested: Number(pr.cash_invested ?? 0) }) })));
    } catch (e) { setErr((e as Error).message); }
  })(); }, []);
  if (err) return <p className="err">{err}</p>; if (!props) return <p>Loading…</p>;
  const t = portfolioTotals(rows.map(r => r.m), rows.map(r => Number(r.p.current_value ?? r.p.purchase_price ?? 0)));
  const monthly = prefs.cf === "monthly"; const cf = (n: number) => (monthly ? n / 12 : n);
  const exportCsv = () => { const csv = toCsv(rows.map(({ p, m }) => ({ address: p.address, bbl: p.bbl, noi: Math.round(m.noi), cash_flow: Math.round(m.cashFlow), debt_balance_est: Math.round(m.balance), equity_est: Math.round(m.equity), cap_rate_pct: m.capRate.toFixed(2) })));
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "stoop-portfolio.csv"; a.click(); };
  return (<>
    <div className="band"><div className="lbl">Estimated equity</div>
    <p className="hero">{fmtMoney(t.equity)}</p>
    <p className="sub">{props.length === 0 ? "No properties yet. Add one you own." : <>Across {props.length} propert{props.length === 1 ? "y" : "ies"} · calculated from numbers you entered<EstimateBadge /></>}</p></div>
    {props.length > 0 && <div className="stats">
      <div className="s"><div className="l">Property value</div><div className="v">{short(t.value)}</div></div>
      <div className="s"><div className="l">Debt (calculated)</div><div className="v">{short(t.debt)}</div></div>
      <div className="s"><div className="l">Annual NOI</div><div className="v">{short(t.noi)}</div></div>
      <div className="s"><div className="l">Cash flow / {monthly ? "mo" : "yr"}</div><div className={"v " + (t.cashFlow >= 0 ? "good" : "bad")}>{t.cashFlow > 0 ? "+" : ""}{short(cf(t.cashFlow))}</div></div>
    </div>}
    <div className="row" style={{ alignItems: "center", marginTop: props.length ? 0 : 40 }}><h2 className="lines" style={{ margin: 0 }}>Your lines</h2>
      {props.length > 0 && <Link to="/reports" className="btn ghost" style={{ textDecoration: "none" }}>Reports</Link>}{props.length > 0 && <button className="ghost" onClick={exportCsv}>Export CSV</button>}<Link to="/import" className="btn ghost" style={{ textDecoration: "none" }}>Import spreadsheet</Link><Link to="/add" className="btn" style={{ textDecoration: "none" }}>Add property</Link></div>
    {props.length > 0 && <input className="lsearch" aria-label="Search your properties" placeholder="Search your properties" value={filter} onChange={e => setFilter(e.target.value)} />}
    {filter.trim() && matchProps(props, filter).length === 0 && <p className="note">No properties match “{filter}”.</p>}
    <div className="list" style={{ marginTop: 14 }}>{rows.filter(({ p }) => !filter.trim() || matchProps([p], filter).length > 0).map(({ p, m }) => <Link key={p.id} to={`/property/${p.id}`} className="item">
      <div className="bul" style={{ background: lineFor(p.borough, p.address)[1] }}>{lineFor(p.borough, p.address)[0]}</div><div><div className="name">{p.nickname || p.address}</div><div className="addr">{p.address}</div></div>
      <div className="n h">{prefs.showNoi ? <>{fmtMoney(m.noi)}<small>NOI</small></> : null}</div>
      <div className="n h">{prefs.showCap ? <>{m.capRate.toFixed(1)}%<small>Cap rate</small></> : null}</div>
      <div className={"n " + (m.cashFlow >= 0 ? "good" : "bad")}>{m.cashFlow > 0 ? "+" : ""}{fmtMoney(cf(m.cashFlow))}<small>Cash flow / {monthly ? "mo" : "yr"}</small></div><span style={{ color: "var(--muted)" }}>›</span></Link>)}</div>
    <div style={{ marginTop: 28 }}><RemindersPanel title="Reminders &amp; dates" /></div>
    <p className="note">Totals use the values, rents and loan terms you entered. Rambl doesn’t appraise properties.</p></>);
}
