// Helpers for the owner's own records: vacancies, maintenance log, reminders, rent history.
export interface VacancyRow { id: string; property_id: string; unit_id: string; start_date: string; end_date: string | null; monthly_rent: number; notes: string | null; }
export interface MaintRow { id: string; property_id: string; logged_on: string; title: string; contractor: string | null; category: string | null; cost: number; counts_in_costs: boolean; notes: string | null; }
export interface ReminderRow { id: string; property_id: string | null; kind: "insurance" | "rate_reset" | "inspection" | "other"; title: string; due_date: string; notes: string | null; done: boolean; }
export interface RentHistRow { id: string; property_id: string; unit_id: string; effective_date: string; monthly_rent: number; tenant_name: string | null; lease_end: string | null; note: string | null; created_at?: string; }

export const REMINDER_KINDS: Record<ReminderRow["kind"], string> = { insurance: "Insurance renewal", rate_reset: "Loan rate reset", inspection: "Inspection", other: "Other" };
export const today = () => new Date().toISOString().slice(0, 10);
const day = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 864e5;
export const daysBetween = (a: string, b: string) => Math.round(day(b) - day(a));
export const yearRange = (y: number): [string, string] => [`${y}-01-01`, `${y + 1}-01-01`];

// Days a vacancy overlaps [from, to). Open vacancies run through `asOf`.
export function vacancyDays(v: VacancyRow, from: string, to: string, asOf = today()) {
  const end = v.end_date ?? asOf; const s = Math.max(day(v.start_date), day(from)); const e = Math.min(day(end), day(to));
  return Math.max(0, e - s);
}
export const lostRent = (v: VacancyRow, from: string, to: string, asOf = today()) => vacancyDays(v, from, to, asOf) * Number(v.monthly_rent) * 12 / 365;
export function vacancyTotals(list: VacancyRow[], from: string, to: string, asOf = today()) {
  return list.reduce((a, v) => ({ days: a.days + vacancyDays(v, from, to, asOf), lost: a.lost + lostRent(v, from, to, asOf) }), { days: 0, lost: 0 });
}
export const inRange = (iso: string, from: string, to: string) => iso >= from && iso < to;
export function maintenanceTotal(log: MaintRow[], from: string, to: string, onlyCounted = true) {
  return log.filter(m => inRange(m.logged_on, from, to) && (!onlyCounted || m.counts_in_costs)).reduce((s, m) => s + Number(m.cost), 0);
}
// Maintenance entries marked "count in costs" over the 12 months ending today feed the operating-cost totals.
export function trailingMaintenance(log: MaintRow[], propertyId: string | null, asOf = today()) {
  const from = `${Number(asOf.slice(0, 4)) - 1}${asOf.slice(4)}`; const to = new Date(day(asOf) * 864e5 + 864e5).toISOString().slice(0, 10);
  return maintenanceTotal(log.filter(m => propertyId === null || m.property_id === propertyId), from, to);
}
export function upcoming(list: ReminderRow[], withinDays: number, asOf = today()) {
  return list.filter(r => !r.done && daysBetween(asOf, r.due_date) <= withinDays).sort((a, b) => a.due_date.localeCompare(b.due_date));
}
export const dueText = (iso: string, asOf = today()) => { const d = daysBetween(asOf, iso); return d < 0 ? `${-d} day${d === -1 ? "" : "s"} overdue` : d === 0 ? "today" : `in ${d} day${d === 1 ? "" : "s"}`; };

// Scheduled rent for a calendar year from rent history. Months before the first entry use that entry's rent.
export function scheduledRent(history: RentHistRow[], currentRent: number, year: number) {
  const h = [...history].sort((a, b) => a.effective_date.localeCompare(b.effective_date));
  if (!h.length) return currentRent * 12;
  let total = 0;
  for (let m = 1; m <= 12; m++) {
    const first = `${year}-${String(m).padStart(2, "0")}-01`;
    const entry = [...h].reverse().find(x => x.effective_date <= first) ?? h[0];
    total += Number(entry.monthly_rent);
  }
  return total;
}

type Terms = { monthly_rent: number; tenant_name: string | null; lease_end: string | null };
// Plain-language list of what changed on a unit, used to auto-note the rent history.
export function describeChange(prev: Terms, next: Terms): string[] {
  const out: string[] = []; const m = (n: number) => "$" + Math.round(Number(n)).toLocaleString("en-US");
  if (Number(prev.monthly_rent) !== Number(next.monthly_rent)) out.push(`Rent ${m(prev.monthly_rent)} → ${m(next.monthly_rent)}`);
  if ((prev.tenant_name ?? "") !== (next.tenant_name ?? "")) out.push(`Tenant ${prev.tenant_name || "none"} → ${next.tenant_name || "none"}`);
  if ((prev.lease_end ?? "") !== (next.lease_end ?? "")) out.push(`Lease end ${prev.lease_end || "none"} → ${next.lease_end || "none"}`);
  return out;
}
