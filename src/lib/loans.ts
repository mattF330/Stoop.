// Plain math on numbers the user enters. Estimates only; the lender's statement is the source of truth.
import { calcMonthlyPayment } from "./finance";

export function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const t = (m - 1) + n; const yy = y + Math.floor(t / 12); const mm = ((t % 12) + 12) % 12;
  const dim = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
  return `${String(yy).padStart(4, "0")}-${String(mm + 1).padStart(2, "0")}-${String(Math.min(d, dim)).padStart(2, "0")}`;
}

export interface SchedRow { n: number; date: string; payment: number; interest: number; principal: number; balance: number; }
// Payment #1 falls one month after the start date.
export function amortSchedule(principal: number, ratePct: number, years: number, startISO: string): SchedRow[] {
  const n = Math.round(years * 12); const pay = calcMonthlyPayment(principal, ratePct, years); const r = ratePct / 100 / 12;
  const rows: SchedRow[] = []; let bal = principal;
  for (let i = 1; i <= n && bal > 0.005; i++) {
    const interest = bal * r; const princ = i === n ? bal : Math.min(bal, pay - interest); bal = Math.max(0, bal - princ);
    rows.push({ n: i, date: addMonths(startISO, i), payment: interest + princ, interest, principal: princ, balance: bal });
  }
  return rows;
}
export const payoffDate = (startISO: string, years: number) => addMonths(startISO, Math.round(years * 12));
export function yearly(rows: SchedRow[]) {
  const by = new Map<number, { year: number; interest: number; principal: number; endBalance: number }>();
  for (const r of rows) { const y = Number(r.date.slice(0, 4)); const e = by.get(y) ?? { year: y, interest: 0, principal: 0, endBalance: 0 }; e.interest += r.interest; e.principal += r.principal; e.endBalance = r.balance; by.set(y, e); }
  return [...by.values()];
}
export function interestInYear(rows: SchedRow[], year: number) {
  return rows.filter(r => Number(r.date.slice(0, 4)) === year).reduce((a, r) => ({ interest: a.interest + r.interest, principal: a.principal + r.principal }), { interest: 0, principal: 0 });
}

export interface RefiInput { balance: number; currentPayment: number; remainingMonths: number; }
export interface RefiOffer { ratePct: number; termYears: number; closingCosts: number; rollInCosts: boolean; cashOut: number; }
export function refinance(cur: RefiInput, o: RefiOffer) {
  const principal = cur.balance + o.cashOut + (o.rollInCosts ? o.closingCosts : 0);
  const months = Math.round(o.termYears * 12);
  const newPayment = calcMonthlyPayment(principal, o.ratePct, o.termYears);
  const monthlySavings = cur.currentPayment - newPayment;
  const upfront = o.rollInCosts ? 0 : o.closingCosts;
  const breakEvenMonths = monthlySavings > 0 && upfront > 0 ? Math.ceil(upfront / monthlySavings) : null;
  const oldRemainingInterest = Math.max(0, cur.currentPayment * cur.remainingMonths - cur.balance);
  const newInterest = Math.max(0, newPayment * months - principal);
  return { principal, newPayment, monthlySavings, breakEvenMonths, months, oldRemainingInterest, newInterest, interestDifference: oldRemainingInterest - newInterest, upfront };
}
