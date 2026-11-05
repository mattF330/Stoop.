// Ported from Ledgerstone, typed. Pure functions; no I/O.
export function calcMonthlyPayment(principal: number, annualRatePct: number, years: number): number {
  const r = annualRatePct / 100 / 12;
  const n = Math.round(years * 12);
  if (n <= 0 || principal <= 0) return 0;
  if (r === 0) return principal / n;
  const pow = Math.pow(1 + r, n);
  return (principal * r * pow) / (pow - 1);
}

export interface Amortization { payment: number; balance: number; interestPaid: number; principalPaid: number; }

export function amortize(principal: number, annualRatePct: number, years: number, monthsElapsed: number): Amortization {
  const payment = calcMonthlyPayment(principal, annualRatePct, years);
  const n = Math.round(years * 12);
  const m = Math.max(0, Math.min(Math.floor(monthsElapsed), n));
  const r = annualRatePct / 100 / 12;
  let balance = principal, interestPaid = 0;
  for (let i = 0; i < m; i++) {
    const interest = balance * r;
    interestPaid += interest;
    balance = Math.max(0, balance - (payment - interest));
  }
  if (m >= n) balance = 0;
  return { payment, balance, interestPaid, principalPaid: principal - balance };
}

export interface Loan { principal: number; ratePct: number; termYears: number; startDate: string; }
export function monthsSince(startISO: string, now = new Date()): number {
  const s = new Date(startISO);
  return Math.max(0, (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth()));
}
export function loanStatus(l: Loan, now = new Date()) { return amortize(l.principal, l.ratePct, l.termYears, monthsSince(l.startDate, now)); }

export interface PropertyInputs {
  value: number; monthlyRent: number; vacancyPct: number; annualExpenses: number; loans: Loan[]; cashInvested: number;
}
export function propertyMetrics(p: PropertyInputs, now = new Date()) {
  const fin = (n: number) => (Number.isFinite(n) ? n : 0);
  p = { ...p, value: fin(p.value), monthlyRent: fin(p.monthlyRent), vacancyPct: fin(p.vacancyPct), annualExpenses: fin(p.annualExpenses), cashInvested: fin(p.cashInvested) };
  const grossIncome = p.monthlyRent * 12;
  const effectiveIncome = grossIncome * (1 - p.vacancyPct / 100);
  const noi = effectiveIncome - p.annualExpenses;
  const statuses = p.loans.map(l => loanStatus(l, now));
  const debtService = statuses.reduce((s, x) => s + x.payment * 12, 0);
  const balance = statuses.reduce((s, x) => s + x.balance, 0);
  const cashFlow = noi - debtService;
  return {
    noi, debtService, balance, cashFlow,
    equity: p.value - balance,
    ltv: p.value > 0 ? (balance / p.value) * 100 : 0,
    capRate: p.value > 0 ? (noi / p.value) * 100 : 0,
    cashOnCash: p.cashInvested > 0 ? (cashFlow / p.cashInvested) * 100 : 0,
    dscr: debtService > 0 ? noi / debtService : null,
  };
}
export function portfolioTotals(list: ReturnType<typeof propertyMetrics>[], values: number[]) {
  const sum = (f: (m: ReturnType<typeof propertyMetrics>) => number) => list.reduce((s, m) => s + f(m), 0);
  const value = values.reduce((a, b) => a + b, 0);
  return { value, debt: sum(m => m.balance), equity: sum(m => m.equity), noi: sum(m => m.noi), cashFlow: sum(m => m.cashFlow), debtService: sum(m => m.debtService) };
}
export const fmtMoney = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
