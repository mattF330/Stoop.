import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listProperties, listFor, toLoan, PropertyRow, LoanRow, ExpenseRow, UnitRow } from "../lib/data";
import { propertyMetrics, loanStatus, fmtMoney } from "../lib/finance";
import { MaintRow, VacancyRow, RentHistRow, trailingMaintenance, vacancyTotals, yearRange, today } from "../lib/owner";
import { yearEnd, propName, YearEnd } from "../lib/reports";
import { downloadCsv } from "../lib/csv";
import { EstimateBadge } from "../components/Disclaimers";

interface All { props: PropertyRow[]; loans: LoanRow[]; exp: ExpenseRow[]; units: UnitRow[]; maint: MaintRow[]; vacs: VacancyRow[]; hist: RentHistRow[]; }
const by = <T extends { property_id: string }>(l: T[], id: string) => l.filter(x => x.property_id === id);
const money = (n: number) => fmtMoney(n);

export default function Reports() {
  const [q] = useSearchParams(); const [d, setD] = useState<All | null>(null); const [err, setErr] = useState("");
  const [mode, setMode] = useState<"accountant" | "onepager">(q.get("property") ? "onepager" : "accountant");
  const [year, setYear] = useState(new Date().getFullYear() - (new Date().getMonth() < 3 ? 1 : 0));
  const [sel, setSel] = useState(q.get("property") ?? "all"); const [forWho, setForWho] = useState(""); const [tenants, setTenants] = useState(false);
  useEffect(() => { (async () => { try {
    const [props, loans, exp, units, maint, vacs, hist] = await Promise.all([listProperties(), listFor<LoanRow>("loans"), listFor<ExpenseRow>("expenses"), listFor<UnitRow>("units"), listFor<MaintRow>("maintenance_log"), listFor<VacancyRow>("vacancies"), listFor<RentHistRow>("rent_history")]);
    setD({ props, loans, exp, units, maint, vacs, hist }); } catch (e) { setErr((e as Error).message); } })(); }, []);
  const ye = useMemo(() => d ? d.props.map(p => ({ p, y: yearEnd({ loans: by(d.loans, p.id), expenses: by(d.exp, p.id), units: by(d.units, p.id), vacancies: by(d.vacs, p.id), history: by(d.hist, p.id), maint: by(d.maint, p.id) }, year) })) : [], [d, year]);
  if (err) return <p className="err">{err}</p>; if (!d) return <p>Loading…</p>;
  const thisYear = new Date().getFullYear(); const years = [thisYear, thisYear - 1, thisYear - 2, thisYear - 3];
  if (!d.props.length) return <><h1>Reports</h1><p className="note">Add a property to build reports.</p></>;

  const csvItems = () => {
    const rows: Record<string, unknown>[] = [];
    for (const { p, y } of ye) { const n = propName(p); const add = (section: string, item: string, amount: number) => rows.push({ year, property: n, address: p.address, section, item, amount: Math.round(amount * 100) / 100 });
      add("Income", "Scheduled rent (from your rent roll and rent history)", y.scheduledRent); add("Income", "Less: vacancy (from your vacancy log)", -y.lostRent);
      y.expenses.forEach(e => add("Operating expenses", e.item, e.amount)); y.repairs.forEach(e => add("Repairs & maintenance (log)", e.item, e.amount));
      add("Debt (estimate)", "Mortgage interest, calculated from loan terms", y.interest); add("Debt (estimate)", "Principal paid, calculated from loan terms", y.principal);
      add("Result", "Net operating income", y.noi); add("Result", "Cash flow after debt payments", y.afterDebt); }
    downloadCsv(`rambl-${year}-for-your-accountant.csv`, rows);
  };
  const shown = sel === "all" ? d.props : d.props.filter(p => p.id === sel);
  return (<>
    <div className="noprint">
      <h1>Reports</h1>
      <div className="seg"><button className={mode === "accountant" ? "on" : ""} onClick={() => setMode("accountant")}>For your accountant</button><button className={mode === "onepager" ? "on" : ""} onClick={() => setMode("onepager")}>Property one-pager</button></div>
      <div className="card"><div className="row">
        {mode === "accountant" && <div><label>Year<select value={year} onChange={e => setYear(Number(e.target.value))}>{years.map(y => <option key={y}>{y}</option>)}</select></label></div>}
        {mode === "onepager" && <><div><label>Property<select value={sel} onChange={e => setSel(e.target.value)}><option value="all">All properties (one page each)</option>{d.props.map(p => <option key={p.id} value={p.id}>{propName(p)}</option>)}</select></label></div>
          <div><label>Prepared for (optional)<input value={forWho} onChange={e => setForWho(e.target.value)} placeholder="e.g. lender or partner name" /></label></div>
          <label style={{ display: "flex", gap: 6 }}><input type="checkbox" style={{ width: "auto" }} checked={tenants} onChange={e => setTenants(e.target.checked)} />Include tenant names</label></>}
        {mode === "accountant" && <button className="ghost" onClick={csvItems}>Download spreadsheet (CSV)</button>}
        <button onClick={() => window.print()}>Print / save as PDF</button></div>
        <p className="note">{mode === "onepager" ? "Rambl doesn’t send anything. Save the PDF and share it with whoever you choose. Tenant names are left out unless you tick the box." : "Opens your browser’s print dialog; choose “Save as PDF” to keep a copy. Nothing is sent anywhere."}</p></div>
    </div>

    {mode === "accountant" && <div className="rep">
      <h1 className="rep-h">Year-end summary, {year} <span className="tag">for your accountant</span></h1>
      <p className="note">Prepared from figures the owner entered in Rambl. <b>This is an informational summary, not a tax form, a financial statement or tax advice.</b> Rent comes from your rent roll and rent history; vacancy from your vacancy log; operating costs are the annual amounts you entered plus repairs you logged in {year} (repairs marked “don’t count” are excluded); interest and principal are <b>calculated</b> from your loan terms and may differ from your lender’s statements. Your accountant decides what is deductible and how it is reported.</p>
      {ye.map(({ p, y }) => <Summary key={p.id} p={p} y={y} year={year} />)}
      {ye.length > 1 && <div className="card"><h2>All properties</h2><Table rows={[["Scheduled rent", sum(ye, "scheduledRent")], ["Less vacancy", -sum(ye, "lostRent")], ["Operating expenses", -sum(ye, "expenseTotal")], ["Repairs (logged)", -sum(ye, "repairsTotal")], ["Net operating income", sum(ye, "noi"), true], ["Mortgage interest (est.)", sum(ye, "interest")], ["Principal paid (est.)", sum(ye, "principal")], ["Cash flow after debt payments", sum(ye, "afterDebt"), true]]} /></div>}
    </div>}

    {mode === "onepager" && shown.map(p => <OnePager key={p.id} p={p} d={d} forWho={forWho} tenants={tenants} />)}
  </>);
}
const sum = (ye: { y: YearEnd }[], k: keyof YearEnd) => ye.reduce((s, r) => s + Number(r.y[k]), 0);
function Table({ rows }: { rows: [string, number, boolean?][] }) { return <table><tbody>{rows.map(([l, n, b]) => <tr key={l} style={b ? { fontWeight: 600 } : undefined}><td>{l}</td><td style={{ textAlign: "right" }}>{money(n)}</td></tr>)}</tbody></table>; }
function Summary({ p, y, year }: { p: PropertyRow; y: YearEnd; year: number }) {
  return <div className="card rep-page"><h2>{propName(p)} <span className="tag">{p.address}</span></h2>
    <Table rows={[["Scheduled rent", y.scheduledRent], ["Less vacancy (" + Math.round(y.vacantDays) + " days logged)", -y.lostRent], ["Rent after vacancy", y.collected, true]]} />
    <h3>Operating expenses</h3>{y.expenses.length ? <Table rows={y.expenses.map(e => [e.item, e.amount])} /> : <p className="note">None entered.</p>}
    {y.repairs.length > 0 && <><h3>Repairs &amp; maintenance logged in {year}</h3><Table rows={y.repairs.map(e => [e.item, e.amount])} /></>}
    <Table rows={[["Total operating expenses", y.opexTotal, true], ["Net operating income", y.noi, true]]} />
    <h3>Debt <EstimateBadge /></h3><Table rows={[["Mortgage interest (calculated)", y.interest], ["Principal paid (calculated)", y.principal], ["Cash flow after debt payments", y.afterDebt, true]]} />
  </div>;
}
function OnePager({ p, d, forWho, tenants }: { p: PropertyRow; d: All; forWho: string; tenants: boolean }) {
  const loans = by(d.loans, p.id), units = by(d.units, p.id), exp = by(d.exp, p.id), maint = by(d.maint, p.id), vacs = by(d.vacs, p.id);
  const yr = new Date().getFullYear(); const [a, b] = yearRange(yr); const vt = vacancyTotals(vacs, a, b);
  const m = propertyMetrics({ value: Number(p.current_value ?? p.purchase_price ?? 0), monthlyRent: units.reduce((s, u) => s + Number(u.monthly_rent), 0), vacancyPct: Number(p.vacancy_pct ?? 5), annualExpenses: exp.reduce((s, e) => s + Number(e.annual_amount), 0) + trailingMaintenance(maint, p.id), loans: loans.map(toLoan), cashInvested: Number(p.cash_invested ?? 0) });
  const stat = (l: string, v: string) => <div className="rep-stat" key={l}><div className="l">{l}</div><div className="v">{v}</div></div>;
  return (<div className="rep rep-page onepager">
    <div className="rep-top"><div><h1 className="rep-h">{propName(p)}</h1><div>{p.address}{p.borough ? `, ${p.borough}` : ""}{p.bbl ? ` · BBL ${p.bbl}` : ""}</div>
      <div className="note" style={{ margin: "4px 0" }}>{[p.property_type, p.year_built && `built ${p.year_built}`, p.units_residential != null && `${p.units_residential} residential units (NYC records)`].filter(Boolean).join(" · ")}</div></div>
      <div style={{ textAlign: "right" }}><b>Rambl</b> property summary<div className="note" style={{ margin: 0 }}>{today()}{forWho && <><br />Prepared for: {forWho}</>}</div></div></div>
    <div className="rep-stats">{[["Value (owner’s estimate)", money(Number(p.current_value ?? p.purchase_price ?? 0))], ["Debt (calculated)", money(m.balance)], ["Equity", money(m.equity)], ["LTV", m.ltv.toFixed(1) + "%"], ["NOI", money(m.noi)], ["Cap rate", m.capRate.toFixed(2) + "%"], ["DSCR", m.dscr ? m.dscr.toFixed(2) : "—"], ["Cash flow / yr", money(m.cashFlow)]].map(([l, v]) => stat(l, v))}</div>
    <h3>Rent roll</h3>
    <table><thead><tr><th>Unit</th>{tenants && <th>Tenant</th>}<th>Rent/mo</th><th>Lease end</th></tr></thead><tbody>{units.map(u => <tr key={u.id}><td>{u.label}</td>{tenants && <td>{u.tenant_name || "—"}</td>}<td>{money(Number(u.monthly_rent))}</td><td>{u.lease_end || "—"}</td></tr>)}
      <tr style={{ fontWeight: 600 }}><td>Total ({units.length} units)</td>{tenants && <td />}<td>{money(units.reduce((s, u) => s + Number(u.monthly_rent), 0))}</td><td /></tr></tbody></table>
    <div className="rep-cols"><div><h3>Loans (calculated)</h3>{loans.length ? <table><thead><tr><th>Lender</th><th>Rate</th><th>Est. balance</th><th>Pmt/mo</th></tr></thead><tbody>{loans.map(l => { const s = loanStatus(toLoan(l)); return <tr key={l.id}><td>{l.lender || "—"}</td><td>{l.rate_pct}%</td><td>{money(s.balance)}</td><td>{money(s.payment)}</td></tr>; })}</tbody></table> : <p className="note">No loans entered.</p>}</div>
      <div><h3>Operating costs / yr</h3><table><tbody>{exp.map(e => <tr key={e.id}><td>{e.category}</td><td>{money(Number(e.annual_amount))}</td></tr>)}{trailingMaintenance(maint, p.id) > 0 && <tr><td>Repairs logged (last 12 mo)</td><td>{money(trailingMaintenance(maint, p.id))}</td></tr>}</tbody></table></div></div>
    <p className="note">Vacancy logged in {yr}: {Math.round(vt.days)} days, about {money(vt.lost)} in lost rent (estimate).</p>
    <p className="note rep-disc">Prepared by the property owner using Rambl from figures the owner entered. Values, balances and metrics are owner-entered or calculated estimates, not an appraisal, audit, financial statement or tax document. NYC public-record details come from city agencies and may not be 100% accurate. Verify before relying on this summary.</p>
  </div>);
}
