// Year-end summary math. Everything comes from numbers the owner entered; nothing here is a tax calculation.
import { amortSchedule, interestInYear } from "./loans";
import { MaintRow, VacancyRow, RentHistRow, vacancyTotals, scheduledRent, yearRange, maintenanceTotal } from "./owner";
import type { LoanRow, ExpenseRow, UnitRow, PropertyRow } from "./data";

export interface YearEnd {
  scheduledRent: number; lostRent: number; vacantDays: number; collected: number;
  expenses: { item: string; amount: number }[]; repairs: { item: string; amount: number }[];
  expenseTotal: number; repairsTotal: number; opexTotal: number; noi: number; interest: number; principal: number; afterDebt: number;
}
export function yearEnd(a: { loans: LoanRow[]; expenses: ExpenseRow[]; units: UnitRow[]; vacancies: VacancyRow[]; history: RentHistRow[]; maint: MaintRow[] }, year: number): YearEnd {
  const [from, to] = yearRange(year);
  const sched = a.units.reduce((s, u) => s + scheduledRent(a.history.filter(h => h.unit_id === u.id), Number(u.monthly_rent), year), 0);
  const vt = vacancyTotals(a.vacancies, from, to, (() => { const t = new Date().toISOString().slice(0, 10), e = `${year}-12-31`; return t < e ? t : e; })());
  const lost = Math.min(vt.lost, sched);
  const expenses = a.expenses.map(e => ({ item: e.category + (e.is_estimate ? " (my estimate)" : ""), amount: Number(e.annual_amount) }));
  const repairs = a.maint.filter(m => m.counts_in_costs && m.logged_on >= from && m.logged_on < to).sort((x, y) => x.logged_on.localeCompare(y.logged_on)).map(m => ({ item: `${m.logged_on} ${m.title}${m.contractor ? " — " + m.contractor : ""}`, amount: Number(m.cost) }));
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0); const repairsTotal = maintenanceTotal(a.maint, from, to, true);
  let interest = 0, principal = 0;
  for (const l of a.loans) { const r = interestInYear(amortSchedule(Number(l.principal), Number(l.rate_pct), Number(l.term_years), l.start_date), year); interest += r.interest; principal += r.principal; }
  const collected = sched - lost; const opexTotal = expenseTotal + repairsTotal; const noi = collected - opexTotal;
  return { scheduledRent: sched, lostRent: lost, vacantDays: vt.days, collected, expenses, repairs, expenseTotal, repairsTotal, opexTotal, noi, interest, principal, afterDebt: noi - interest - principal };
}
export const propName = (p: PropertyRow) => p.nickname || p.address;
