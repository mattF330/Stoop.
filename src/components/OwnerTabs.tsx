import { useEffect, useMemo, useState } from "react";
import { insertRow, deleteRow, updateRow, listFor, listProperties, PropertyRow, UnitRow, LoanRow } from "../lib/data";
import { fmtMoney, loanStatus } from "../lib/finance";
import { toLoan } from "../lib/data";
import { amortSchedule, payoffDate, yearly, refinance, SchedRow } from "../lib/loans";
import { MaintRow, VacancyRow, ReminderRow, RentHistRow, REMINDER_KINDS, today, vacancyDays, lostRent, vacancyTotals, yearRange, maintenanceTotal, trailingMaintenance, upcoming, dueText, describeChange, daysBetween } from "../lib/owner";
import { downloadCsv } from "../lib/csv";
import { NYC_TEMPLATES } from "../lib/nycTemplates";
import { addMonths } from "../lib/loans";
import { supabase } from "../lib/supabase";
import { EstimateBadge } from "./Disclaimers";

const uid = async () => (await supabase.auth.getUser()).data.user!.id;
const num = (v: string) => (v === "" ? 0 : Number(v));
type Run = (f: () => Promise<unknown>) => void;
function Form({ children, onSubmit, label = "Add" }: { children: React.ReactNode; onSubmit: () => void; label?: string }) { return <form onSubmit={e => { e.preventDefault(); onSubmit(); }} className="row" style={{ marginTop: 12, alignItems: "flex-end" }}>{children}<button>{label}</button></form>; }
const Field = ({ l, children }: { l: string; children: React.ReactNode }) => <div><label>{l}{children}</label></div>;

/* ---------- Maintenance log ---------- */
export function MaintenanceTab({ propertyId, log, run }: { propertyId: string; log: MaintRow[]; run: Run }) {
  const [v, s] = useState({ logged_on: today(), title: "", contractor: "", category: "Repairs & maintenance", cost: "", counts: true, notes: "" });
  const year = Number(today().slice(0, 4)); const [a, b] = yearRange(year);
  const sorted = [...log].sort((x, y) => y.logged_on.localeCompare(x.logged_on));
  const byContractor = useMemo(() => { const m = new Map<string, number>(); for (const e of log.filter(x => x.logged_on >= a && x.logged_on < b)) { const k = e.contractor?.trim() || "(no name)"; m.set(k, (m.get(k) ?? 0) + Number(e.cost)); } return [...m.entries()].sort((x, y) => y[1] - x[1]); }, [log, a, b]);
  return (<div className="card"><h2>Maintenance log</h2>
    <div className="grid" style={{ marginBottom: 12 }}>
      <div className="card stat"><div className="l">Spent in {year}</div><div className="v">{fmtMoney(maintenanceTotal(log, a, b, false))}</div></div>
      <div className="card stat"><div className="l">Counted in operating costs (last 12 mo)</div><div className="v">{fmtMoney(trailingMaintenance(log, propertyId))}</div></div></div>
    <table><thead><tr><th>Date</th><th>What</th><th>Contractor</th><th>Cost</th><th>In costs?</th><th /></tr></thead><tbody>
      {sorted.map(e => <tr key={e.id}><td>{e.logged_on}</td><td>{e.title}{e.notes && <div className="note" style={{ margin: 0 }}>{e.notes}</div>}</td><td>{e.contractor || "—"}</td><td>{fmtMoney(Number(e.cost))}</td>
        <td><input type="checkbox" style={{ width: "auto" }} checked={e.counts_in_costs} aria-label="Counts in operating costs" onChange={x => run(() => updateRow("maintenance_log", e.id, { counts_in_costs: x.target.checked }))} /></td>
        <td><button className="sm ghost" title="Add the same entry again, dated today" onClick={() => run(async () => insertRow("maintenance_log", { user_id: await uid(), property_id: propertyId, logged_on: today(), title: e.title, contractor: e.contractor, category: e.category, cost: e.cost, counts_in_costs: e.counts_in_costs, notes: e.notes }))}>Log again</button><button className="ghost" onClick={() => run(() => deleteRow("maintenance_log", e.id))}>×</button></td></tr>)}</tbody></table>
    {!sorted.length && <p className="note">No entries yet. Log repairs, who did the work, and what it cost.</p>}
    <Form onSubmit={() => { run(async () => insertRow("maintenance_log", { user_id: await uid(), property_id: propertyId, logged_on: v.logged_on, title: v.title, contractor: v.contractor || null, category: v.category || null, cost: num(v.cost), counts_in_costs: v.counts, notes: v.notes || null })); s({ ...v, title: "", contractor: "", cost: "", notes: "" }); }}>
      <Field l="Date"><input type="date" required value={v.logged_on} onChange={e => s({ ...v, logged_on: e.target.value })} /></Field>
      <Field l="What was done"><input required value={v.title} onChange={e => s({ ...v, title: e.target.value })} /></Field>
      <Field l="Contractor"><input value={v.contractor} onChange={e => s({ ...v, contractor: e.target.value })} /></Field>
      <Field l="Cost $"><input type="number" min="0" step="0.01" required value={v.cost} onChange={e => s({ ...v, cost: e.target.value })} /></Field>
      <Field l="Notes"><input value={v.notes} onChange={e => s({ ...v, notes: e.target.value })} /></Field>
      <label style={{ display: "flex", gap: 6 }}><input type="checkbox" style={{ width: "auto" }} checked={v.counts} onChange={e => s({ ...v, counts: e.target.checked })} />Count in operating costs</label></Form>
    <p className="note">Entries marked “count” from the last 12 months are added to this property’s operating costs in NOI and cash flow. Untick an entry if you already included it in the Repairs line on the Costs tab, so it isn’t counted twice.</p>
    {byContractor.length > 0 && <><h3 style={{ marginBottom: 4 }}>Paid out in {year}, by contractor</h3><table><tbody>{byContractor.map(([k, n]) => <tr key={k}><td>{k}</td><td>{fmtMoney(n)}</td></tr>)}</tbody></table></>}
    {sorted.length > 0 && <p><button className="ghost" onClick={() => downloadCsv("maintenance-log.csv", sorted.map(e => ({ date: e.logged_on, what: e.title, contractor: e.contractor, category: e.category, cost: e.cost, counted_in_costs: e.counts_in_costs, notes: e.notes })))}>Export CSV</button></p>}
  </div>);
}

/* ---------- Vacancy & turnover ---------- */
export function VacancyTab({ propertyId, units, vacs, run }: { propertyId: string; units: UnitRow[]; vacs: VacancyRow[]; run: Run }) {
  const [v, s] = useState({ unit_id: units[0]?.id ?? "", start_date: today(), end_date: "", monthly_rent: "", notes: "" });
  const year = Number(today().slice(0, 4)); const [a, b] = yearRange(year); const tot = vacancyTotals(vacs, a, b);
  const turnovers = vacs.filter(x => x.end_date && x.end_date >= a && x.end_date < b).length;
  const label = (id: string) => units.find(u => u.id === id)?.label ?? "—";
  const sorted = [...vacs].sort((x, y) => y.start_date.localeCompare(x.start_date));
  if (!units.length) return <div className="card"><h2>Vacancy &amp; turnover</h2><p className="note">Add a unit on the Units tab first, then track its vacancies here.</p></div>;
  const unit = units.find(u => u.id === v.unit_id);
  return (<div className="card"><h2>Vacancy &amp; turnover <EstimateBadge /></h2>
    <div className="grid" style={{ marginBottom: 12 }}>
      <div className="card stat"><div className="l">Days vacant in {year}</div><div className="v">{Math.round(tot.days)}</div></div>
      <div className="card stat"><div className="l">Lost rent in {year}</div><div className="v">{fmtMoney(tot.lost)}</div></div>
      <div className="card stat"><div className="l">Turnovers in {year}</div><div className="v">{turnovers}</div></div>
      <div className="card stat"><div className="l">Currently vacant</div><div className="v">{vacs.filter(x => !x.end_date).length}</div></div></div>
    <table><thead><tr><th>Unit</th><th>Vacant from</th><th>Until</th><th>Days</th><th>Rent/mo</th><th>Lost rent</th><th /></tr></thead><tbody>
      {sorted.map(x => <tr key={x.id}><td>{label(x.unit_id)}</td><td>{x.start_date}</td><td>{x.end_date ?? "still vacant"}</td><td>{Math.round(vacancyDays(x, "0000-01-01", "9999-01-01"))}</td><td>{fmtMoney(Number(x.monthly_rent))}</td><td>{fmtMoney(lostRent(x, "0000-01-01", "9999-01-01"))}</td>
        <td>{!x.end_date && <button className="sm" onClick={() => run(() => updateRow("vacancies", x.id, { end_date: today() < x.start_date ? x.start_date : today() }))}>Mark rented today</button>}<button className="ghost" onClick={() => run(() => deleteRow("vacancies", x.id))}>×</button></td></tr>)}</tbody></table>
    {!sorted.length && <p className="note">No vacancies logged. Add one when a unit empties; leave “until” blank while it’s still vacant.</p>}
    <Form onSubmit={() => { run(async () => insertRow("vacancies", { user_id: await uid(), property_id: propertyId, unit_id: v.unit_id, start_date: v.start_date, end_date: v.end_date || null, monthly_rent: v.monthly_rent === "" ? Number(unit?.monthly_rent ?? 0) : num(v.monthly_rent), notes: v.notes || null })); s({ ...v, end_date: "", monthly_rent: "", notes: "" }); }}>
      <Field l="Unit"><select value={v.unit_id} onChange={e => s({ ...v, unit_id: e.target.value })}>{units.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}</select></Field>
      <Field l="Vacant from"><input type="date" required value={v.start_date} onChange={e => s({ ...v, start_date: e.target.value })} /></Field>
      <Field l="Until (blank = still vacant)"><input type="date" min={v.start_date} value={v.end_date} onChange={e => s({ ...v, end_date: e.target.value })} /></Field>
      <Field l="Rent/mo (blank = unit rent)"><input type="number" min="0" placeholder={String(unit?.monthly_rent ?? "")} value={v.monthly_rent} onChange={e => s({ ...v, monthly_rent: e.target.value })} /></Field></Form>
    <p className="note">Lost rent = days vacant × monthly rent × 12 ÷ 365. It’s an estimate from the dates and rent you enter; it doesn’t include concessions, turnover costs or back rent.</p>
  </div>);
}

/* ---------- Reminders (dates the owner sets) ---------- */
export function RemindersPanel({ propertyId, title = "Reminders" }: { propertyId?: string; title?: string }) {
  const [list, setList] = useState<ReminderRow[] | null>(null); const [props, setProps] = useState<PropertyRow[]>([]); const [err, setErr] = useState("");
  const [v, s] = useState({ kind: "other" as ReminderRow["kind"], title: "", due_date: "", notes: "", property_id: propertyId ?? "", repeat: "none" as ReminderRow["repeat"] });
  const [units, setUnits] = useState<UnitRow[]>([]);
  const load = async () => { try { const [r, p, u] = await Promise.all([listFor<ReminderRow>("reminders", propertyId), listProperties(), listFor<UnitRow>("units", propertyId)]); setList(r); setProps(p); setUnits(u); } catch (x) { setErr((x as Error).message); } };
  useEffect(() => { load(); }, [propertyId]);
  const act = async (f: () => Promise<unknown>) => { setErr(""); try { await f(); await load(); window.dispatchEvent(new Event("stoop-reminders")); } catch (x) { setErr((x as Error).message); } };
  if (!list) return <div className="card"><h2>{title}</h2>{err ? <p className="err">{err}</p> : "Loading…"}</div>;
  const name = (id: string | null) => { const p = props.find(x => x.id === id); return p ? (p.nickname || p.address) : "Portfolio"; };
  const leases = units.filter(u => u.lease_end && daysBetween(today(), u.lease_end) >= 0 && daysBetween(today(), u.lease_end) <= 365).map(u => ({ id: "lease" + u.id, label: `${props.find(p => p.id === u.property_id)?.nickname || props.find(p => p.id === u.property_id)?.address || ""} · ${u.label}: lease ends`, due: u.lease_end! }));
  const open = list.filter(r => !r.done).sort((x, y) => x.due_date.localeCompare(y.due_date)); const done = list.filter(r => r.done);
  return (<div className="card"><h2>{title}</h2>
    {err && <p className="err">{err}</p>}
    <table><tbody>
      {open.map(r => { const late = r.due_date < today(); return <tr key={r.id}><td><b>{r.title}</b><div className="note" style={{ margin: 0 }}>{REMINDER_KINDS[r.kind]}{r.repeat && r.repeat !== "none" ? ` · repeats ${r.repeat}` : ""}{!propertyId && " · " + name(r.property_id)}{r.notes && " · " + r.notes}</div></td>
        <td style={{ color: late ? "var(--bad)" : undefined }}>{r.due_date}<div className="note" style={{ margin: 0, color: "inherit" }}>{dueText(r.due_date)}</div></td>
        <td><button className="sm" onClick={() => act(async () => { await updateRow("reminders", r.id, { done: true }); if (r.repeat && r.repeat !== "none") await insertRow("reminders", { user_id: await uid(), property_id: r.property_id, kind: r.kind, title: r.title, due_date: addMonths(r.due_date, r.repeat === "monthly" ? 1 : r.repeat === "quarterly" ? 3 : 12), notes: r.notes, repeat: r.repeat }); })}>Done</button><button className="ghost" onClick={() => act(() => deleteRow("reminders", r.id))}>×</button></td></tr>; })}
      {leases.sort((x, y) => x.due.localeCompare(y.due)).map(l => <tr key={l.id}><td>{l.label}<div className="note" style={{ margin: 0 }}>From your rent roll (leases ending within a year)</div></td><td>{l.due}<div className="note" style={{ margin: 0 }}>{dueText(l.due)}</div></td><td /></tr>)}</tbody></table>
    {!open.length && !leases.length && <p className="note">Nothing set. Add dates you want to be reminded about, like an insurance renewal or an inspection.</p>}
    <Form onSubmit={() => { act(async () => insertRow("reminders", { user_id: await uid(), property_id: (propertyId ?? v.property_id) || null, kind: v.kind, title: v.title, due_date: v.due_date, notes: v.notes || null, repeat: v.repeat })); s({ ...v, title: "", due_date: "", notes: "", repeat: "none", kind: "other" }); }}>
      <Field l="Start from a common item"><select value="" onChange={e => { const t = NYC_TEMPLATES.find(x => x.id === e.target.value); if (t) s({ ...v, title: t.title, kind: t.kind, repeat: t.repeat, notes: t.hint }); }}><option value="">— choose (optional) —</option>{NYC_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></Field>
      <Field l="Type"><select value={v.kind} onChange={e => s({ ...v, kind: e.target.value as ReminderRow["kind"] })}>{Object.entries(REMINDER_KINDS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></Field>
      <Field l="Title"><input required value={v.title} placeholder="e.g. Renew building insurance" onChange={e => s({ ...v, title: e.target.value })} /></Field>
      <Field l="Date"><input type="date" required value={v.due_date} onChange={e => s({ ...v, due_date: e.target.value })} /></Field>
      {!propertyId && <Field l="Property"><select value={v.property_id} onChange={e => s({ ...v, property_id: e.target.value })}><option value="">Whole portfolio</option>{props.map(p => <option key={p.id} value={p.id}>{p.nickname || p.address}</option>)}</select></Field>}
      <Field l="Repeats"><select value={v.repeat} onChange={e => s({ ...v, repeat: e.target.value as ReminderRow["repeat"] })}><option value="none">Doesn’t repeat</option><option value="monthly">Monthly</option><option value="quarterly">Every 3 months</option><option value="yearly">Yearly</option></select></Field>
      <Field l="Notes"><input value={v.notes} onChange={e => s({ ...v, notes: e.target.value })} /></Field></Form>
    <p className="note">The “common item” list only fills in a name and a note. <b>It does not know your deadlines</b>: you enter every date, and you should confirm what applies to your building with your attorney, accountant or the agency (<a href="https://www.nyc.gov/site/hpd/index.page" target="_blank" rel="noreferrer">HPD</a>, <a href="https://hcr.ny.gov/rent-registration" target="_blank" rel="noreferrer">DHCR</a>). When you mark a repeating reminder done, the next one is created for you to check. Rambl only reminds you of dates <b>you</b> enter. It doesn’t know which deadlines or filings apply to you or the law’s requirements; check with your attorney, accountant, lender or insurer.</p>
    {done.length > 0 && <details><summary className="note">Completed ({done.length})</summary><table><tbody>{done.map(r => <tr key={r.id}><td>{r.title}</td><td>{r.due_date}</td><td><button className="ghost sm" onClick={() => act(() => updateRow("reminders", r.id, { done: false }))}>Reopen</button><button className="ghost" onClick={() => act(() => deleteRow("reminders", r.id))}>×</button></td></tr>)}</tbody></table></details>}
  </div>);
}
export { upcoming };

/* ---------- Rent roll history ---------- */
export function UnitEditor({ unit, run, onClose }: { unit: UnitRow; run: Run; onClose: () => void }) {
  const [v, s] = useState({ tenant_name: unit.tenant_name ?? "", monthly_rent: String(unit.monthly_rent), lease_end: unit.lease_end ?? "", effective: today(), note: "" });
  return <tr><td colSpan={6}><Form label="Save change" onSubmit={() => { run(async () => {
    const next = { monthly_rent: num(v.monthly_rent), tenant_name: v.tenant_name || null, lease_end: v.lease_end || null };
    const changes = describeChange({ monthly_rent: Number(unit.monthly_rent), tenant_name: unit.tenant_name, lease_end: unit.lease_end }, next);
    await updateRow("units", unit.id, next);
    if (changes.length || v.note) await insertRow("rent_history", { user_id: await uid(), property_id: unit.property_id, unit_id: unit.id, effective_date: v.effective, ...next, note: [changes.join("; "), v.note].filter(Boolean).join(" — ") });
  }); onClose(); }}>
    <Field l={`Edit ${unit.label}: tenant`}><input value={v.tenant_name} onChange={e => s({ ...v, tenant_name: e.target.value })} /></Field>
    <Field l="Rent/mo"><input type="number" min="0" required value={v.monthly_rent} onChange={e => s({ ...v, monthly_rent: e.target.value })} /></Field>
    <Field l="Lease end"><input type="date" value={v.lease_end} onChange={e => s({ ...v, lease_end: e.target.value })} /></Field>
    <Field l="Effective date"><input type="date" required value={v.effective} onChange={e => s({ ...v, effective: e.target.value })} /></Field>
    <Field l="Note (optional)"><input value={v.note} onChange={e => s({ ...v, note: e.target.value })} placeholder="e.g. renewed 1 year" /></Field>
    <button type="button" className="ghost" onClick={onClose}>Cancel</button></Form></td></tr>;
}
export function UnitHistory({ unit, hist, run }: { unit: UnitRow; hist: RentHistRow[]; run: Run }) {
  const rows = hist.filter(h => h.unit_id === unit.id).sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  return <tr><td colSpan={6}><div className="note" style={{ margin: "4px 0" }}><b>Rent history for {unit.label}</b></div>
    {rows.length ? <table><thead><tr><th>Effective</th><th>Rent/mo</th><th>Tenant</th><th>Lease end</th><th>Note</th><th /></tr></thead><tbody>
      {rows.map(h => <tr key={h.id}><td>{h.effective_date}</td><td>{fmtMoney(Number(h.monthly_rent))}</td><td>{h.tenant_name || "—"}</td><td>{h.lease_end || "—"}</td><td>{h.note || "—"}</td><td><button className="ghost" onClick={() => run(() => deleteRow("rent_history", h.id))}>×</button></td></tr>)}</tbody></table>
      : <p className="note">No history yet. It’s recorded automatically when you edit a unit’s rent, tenant or lease end.</p>}</td></tr>;
}

/* ---------- Loan tools ---------- */
export function ScheduleView({ rows, name }: { rows: SchedRow[]; name: string }) {
  const [full, setFull] = useState(false); const now = today();
  if (!rows.length) return <p className="note">Enter a principal, rate and term to see the schedule.</p>;
  const past = rows.filter(r => r.date <= now); const bal = past.length ? past[past.length - 1].balance : rows[0].balance + rows[0].principal;
  const remInterest = rows.filter(r => r.date > now).reduce((a, r) => a + r.interest, 0);
  return (<div>
    <div className="grid"><div className="card stat"><div className="l">Monthly payment</div><div className="v">{fmtMoney(rows[0].payment)}</div></div>
      <div className="card stat"><div className="l">Payoff date</div><div className="v">{rows[rows.length - 1].date}</div></div>
      <div className="card stat"><div className="l">Balance today</div><div className="v">{fmtMoney(bal)}</div></div>
      <div className="card stat"><div className="l">Interest still to pay</div><div className="v">{fmtMoney(remInterest)}</div></div>
      <div className="card stat"><div className="l">Total interest, full term</div><div className="v">{fmtMoney(rows.reduce((a, r) => a + r.interest, 0))}</div></div></div>
    <table><thead><tr><th>Year</th><th>Interest</th><th>Principal</th><th>Ending balance</th></tr></thead><tbody>
      {yearly(rows).map(y => <tr key={y.year}><td>{y.year}</td><td>{fmtMoney(y.interest)}</td><td>{fmtMoney(y.principal)}</td><td>{fmtMoney(y.endBalance)}</td></tr>)}</tbody></table>
    <div className="row" style={{ marginTop: 10 }}><button className="ghost" onClick={() => setFull(!full)}>{full ? "Hide" : "Show"} monthly schedule</button><button className="ghost" onClick={() => downloadCsv(name + "-amortization.csv", rows.map(r => ({ payment_no: r.n, date: r.date, payment: r.payment.toFixed(2), interest: r.interest.toFixed(2), principal: r.principal.toFixed(2), balance: r.balance.toFixed(2) })))}>Export CSV</button></div>
    {full && <div style={{ maxHeight: 320, overflow: "auto", marginTop: 8 }}><table><thead><tr><th>#</th><th>Date</th><th>Payment</th><th>Interest</th><th>Principal</th><th>Balance</th></tr></thead><tbody>
      {rows.map(r => <tr key={r.n}><td>{r.n}</td><td>{r.date}</td><td>{fmtMoney(r.payment)}</td><td>{fmtMoney(r.interest)}</td><td>{fmtMoney(r.principal)}</td><td>{fmtMoney(r.balance)}</td></tr>)}</tbody></table></div>}
    <p className="note">Estimate: assumes a fixed rate, level payments, on-time payments and the first payment one month after the start date. Your lender’s statement is the source of truth.</p>
  </div>);
}
export function LoanSchedule({ loan }: { loan: LoanRow }) {
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => (open ? amortSchedule(Number(loan.principal), Number(loan.rate_pct), Number(loan.term_years), loan.start_date) : []), [open, loan]);
  return <tr><td colSpan={7}><button className="ghost sm" onClick={() => setOpen(!open)}>{open ? "Hide" : "Schedule, payoff date & refinance what-if"}: {loan.lender || "loan"}</button>
    {open && <div style={{ marginTop: 10 }}><ScheduleView rows={rows} name={(loan.lender || "loan").replace(/\W+/g, "-")} />
      <h3 style={{ marginBottom: 4 }}>Refinance what-if <EstimateBadge /></h3><RefiBox start={{ balance: Math.round(loanStatus(toLoan(loan)).balance), payment: Math.round(loanStatus(toLoan(loan)).payment), months: Math.max(0, Math.round(Number(loan.term_years) * 12) - Math.max(0, Math.floor((Date.now() - new Date(loan.start_date).getTime()) / (30.4375 * 864e5)))) }} /></div>}</td></tr>;
}
export function RefiBox({ start }: { start: { balance: number; payment: number; months: number } }) {
  const [v, s] = useState({ balance: String(start.balance), payment: String(start.payment), months: String(start.months), rate: "6", term: "30", costs: "5000", roll: false, cash: "0" });
  const n = (k: keyof typeof v) => Number(v[k]);
  const r = refinance({ balance: n("balance"), currentPayment: n("payment"), remainingMonths: n("months") }, { ratePct: n("rate"), termYears: n("term"), closingCosts: n("costs"), rollInCosts: v.roll, cashOut: n("cash") });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => s({ ...v, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  return (<div>
    <div className="grid"><Field l="Current balance"><input type="number" value={v.balance} onChange={set("balance")} /></Field><Field l="Current payment / mo"><input type="number" value={v.payment} onChange={set("payment")} /></Field><Field l="Months left"><input type="number" value={v.months} onChange={set("months")} /></Field>
      <Field l="New rate %"><input type="number" step="0.01" value={v.rate} onChange={set("rate")} /></Field><Field l="New term (yrs)"><input type="number" value={v.term} onChange={set("term")} /></Field><Field l="Closing costs"><input type="number" value={v.costs} onChange={set("costs")} /></Field>
      <Field l="Cash taken out"><input type="number" value={v.cash} onChange={set("cash")} /></Field><label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" style={{ width: "auto" }} checked={v.roll} onChange={set("roll")} />Roll closing costs into the loan</label></div>
    <div className="grid" style={{ marginTop: 10 }}>
      <div className="card stat"><div className="l">New loan amount</div><div className="v">{fmtMoney(r.principal)}</div></div>
      <div className="card stat"><div className="l">New payment / mo</div><div className="v">{fmtMoney(r.newPayment)}</div></div>
      <div className="card stat"><div className="l">Monthly change</div><div className="v">{r.monthlySavings >= 0 ? "saves " : "costs "}{fmtMoney(Math.abs(r.monthlySavings))}</div></div>
      <div className="card stat"><div className="l">Break-even on closing costs</div><div className="v">{r.breakEvenMonths ? r.breakEvenMonths + " mo" : "—"}</div></div>
      <div className="card stat"><div className="l">Total interest, new vs. old</div><div className="v">{r.interestDifference >= 0 ? "−" : "+"}{fmtMoney(Math.abs(r.interestDifference))}</div></div></div>
    <p className="note">Plain math on the numbers above, not an offer or a quote. Real refinances involve fees, taxes, prepayment terms and underwriting that aren’t modeled here. Break-even is closing costs ÷ monthly savings. Total interest compares the new loan’s full term with the rest of your current one, so a longer term can show less monthly cost but more total interest.</p></div>);
}
export function AmortCalc() {
  const [v, s] = useState({ principal: "400000", rate: "6.5", term: "30", start: today() });
  const rows = useMemo(() => (Number(v.principal) > 0 && Number(v.term) > 0 && v.start ? amortSchedule(Number(v.principal), Number(v.rate), Number(v.term), v.start) : []), [v]);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => s({ ...v, [k]: e.target.value });
  return (<div className="card"><h2>Amortization &amp; payoff date <EstimateBadge /></h2>
    <div className="grid"><Field l="Loan amount"><input type="number" value={v.principal} onChange={set("principal")} /></Field><Field l="Rate %"><input type="number" step="0.01" value={v.rate} onChange={set("rate")} /></Field><Field l="Term (yrs)"><input type="number" value={v.term} onChange={set("term")} /></Field><Field l="Start date"><input type="date" value={v.start} onChange={set("start")} /></Field></div>
    <div style={{ marginTop: 12 }}><ScheduleView rows={rows} name="loan" /></div></div>);
}
export { payoffDate };
