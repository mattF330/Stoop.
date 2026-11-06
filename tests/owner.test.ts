import { describe, it, expect } from "vitest";
import { amortSchedule, addMonths, payoffDate, yearly, interestInYear, refinance } from "../src/lib/loans";
import { calcMonthlyPayment } from "../src/lib/finance";
import { vacancyDays, lostRent, vacancyTotals, scheduledRent, trailingMaintenance, upcoming, dueText, daysBetween } from "../src/lib/owner";

describe("loan tools", () => {
  it("adds months with end-of-month clamp", () => { expect(addMonths("2024-01-31", 1)).toBe("2024-02-29"); expect(addMonths("2023-11-15", 3)).toBe("2024-02-15"); expect(payoffDate("2020-03-01", 30)).toBe("2050-03-01"); });
  it("schedule pays off to zero and matches payment", () => {
    const s = amortSchedule(300000, 6, 30, "2020-01-01"); expect(s.length).toBe(360); expect(s[359].balance).toBeCloseTo(0, 2);
    expect(s[0].payment).toBeCloseTo(calcMonthlyPayment(300000, 6, 30), 2); expect(s.reduce((a, r) => a + r.principal, 0)).toBeCloseTo(300000, 2);
  });
  it("zero-rate loans work", () => { const s = amortSchedule(12000, 0, 1, "2024-01-01"); expect(s.length).toBe(12); expect(s[0].interest).toBe(0); expect(s[0].principal).toBeCloseTo(1000, 6); });
  it("yearly and per-year interest add up", () => { const s = amortSchedule(200000, 5, 15, "2021-06-15"); const y = yearly(s); expect(y.reduce((a, r) => a + r.interest, 0)).toBeCloseTo(s.reduce((a, r) => a + r.interest, 0), 4); expect(interestInYear(s, 2022).interest).toBeCloseTo(y.find(r => r.year === 2022)!.interest, 6); });
  it("refinance: lower rate saves monthly and breaks even", () => {
    const cur = { balance: 400000, currentPayment: calcMonthlyPayment(400000, 7, 30), remainingMonths: 360 };
    const r = refinance(cur, { ratePct: 6, termYears: 30, closingCosts: 6000, rollInCosts: false, cashOut: 0 });
    expect(r.monthlySavings).toBeGreaterThan(0); expect(r.breakEvenMonths).toBe(Math.ceil(6000 / r.monthlySavings));
    const rolled = refinance(cur, { ratePct: 6, termYears: 30, closingCosts: 6000, rollInCosts: true, cashOut: 0 }); expect(rolled.principal).toBe(406000); expect(rolled.breakEvenMonths).toBeNull();
  });
  it("refinance: higher rate has no break-even", () => { const cur = { balance: 100000, currentPayment: 500, remainingMonths: 240 }; expect(refinance(cur, { ratePct: 9, termYears: 30, closingCosts: 3000, rollInCosts: false, cashOut: 0 }).breakEvenMonths).toBeNull(); });
});
describe("owner records", () => {
  const v = { id: "1", property_id: "p", unit_id: "u", start_date: "2025-12-20", end_date: "2026-01-10", monthly_rent: 3000, notes: null };
  it("vacancy days clip to the year", () => { expect(vacancyDays(v, "2026-01-01", "2027-01-01")).toBe(9); expect(vacancyDays(v, "2025-01-01", "2026-01-01")).toBe(12); expect(lostRent(v, "2026-01-01", "2027-01-01")).toBeCloseTo(9 * 3000 * 12 / 365, 6); });
  it("open vacancy runs to as-of date", () => { const o = { ...v, end_date: null, start_date: "2026-03-01" }; expect(vacancyDays(o, "2026-01-01", "2027-01-01", "2026-03-11")).toBe(10); expect(vacancyTotals([o, v], "2026-01-01", "2027-01-01", "2026-03-11").days).toBe(19); });
  it("scheduled rent follows history", () => {
    expect(scheduledRent([], 2000, 2026)).toBe(24000);
    const h = [{ id: "a", property_id: "p", unit_id: "u", effective_date: "2025-06-01", monthly_rent: 2000, tenant_name: null, lease_end: null, note: null }, { id: "b", property_id: "p", unit_id: "u", effective_date: "2026-07-01", monthly_rent: 2200, tenant_name: null, lease_end: null, note: null }];
    expect(scheduledRent(h, 2200, 2026)).toBe(6 * 2000 + 6 * 2200); expect(scheduledRent(h, 2200, 2024)).toBe(24000);
  });
  it("trailing maintenance counts only flagged, recent entries", () => {
    const m = (d: string, c: number, f = true) => ({ id: d, property_id: "p", logged_on: d, title: "x", contractor: null, category: null, cost: c, counts_in_costs: f, notes: null });
    expect(trailingMaintenance([m("2026-02-01", 500), m("2026-03-01", 250, false), m("2024-01-01", 900), m("2025-11-20", 100)], "p", "2026-11-06")).toBe(600);
  });
  it("reminders: upcoming, overdue wording", () => {
    const r = (d: string, done = false) => ({ id: d, property_id: null, kind: "other" as const, title: d, due_date: d, notes: null, done });
    expect(upcoming([r("2026-11-20"), r("2027-03-01"), r("2026-11-01"), r("2026-11-10", true)], 30, "2026-11-06").map(x => x.id)).toEqual(["2026-11-01", "2026-11-20"]);
    expect(dueText("2026-11-01", "2026-11-06")).toBe("5 days overdue"); expect(dueText("2026-11-06", "2026-11-06")).toBe("today"); expect(daysBetween("2026-11-06", "2026-11-07")).toBe(1);
  });
});
import { describeChange } from "../src/lib/owner";
describe("rent history notes", () => {
  it("describes changes and ignores none", () => {
    const a = { monthly_rent: 2000, tenant_name: "A", lease_end: "2026-01-01" };
    expect(describeChange(a, a)).toEqual([]);
    expect(describeChange(a, { monthly_rent: 2200, tenant_name: "B", lease_end: null })).toEqual(["Rent $2,000 → $2,200", "Tenant A → B", "Lease end 2026-01-01 → none"]);
  });
});
import { yearEnd } from "../src/lib/reports";
describe("year-end summary", () => {
  it("adds up rent, vacancy, costs and interest", () => {
    const loan: any = { id: "l", property_id: "p", lender: "B", principal: 100000, rate_pct: 6, term_years: 30, start_date: "2020-01-01" };
    const unit: any = { id: "u", property_id: "p", label: "1A", monthly_rent: 2000, tenant_name: null, lease_end: null, is_stabilized: null };
    const r = yearEnd({ loans: [loan], expenses: [{ id: "e", property_id: "p", category: "Insurance", annual_amount: 3000, is_estimate: false }], units: [unit],
      vacancies: [{ id: "v", property_id: "p", unit_id: "u", start_date: "2024-03-01", end_date: "2024-03-31", monthly_rent: 2000, notes: null }], history: [],
      maint: [{ id: "m", property_id: "p", logged_on: "2024-05-01", title: "Boiler", contractor: "Joe", category: null, cost: 800, counts_in_costs: true, notes: null }, { id: "m2", property_id: "p", logged_on: "2024-06-01", title: "Dup", contractor: null, category: null, cost: 100, counts_in_costs: false, notes: null }] }, 2024);
    expect(r.scheduledRent).toBe(24000); expect(r.vacantDays).toBe(30); expect(r.lostRent).toBeCloseTo(30 * 2000 * 12 / 365, 4);
    expect(r.repairsTotal).toBe(800); expect(r.opexTotal).toBe(3800); expect(r.noi).toBeCloseTo(24000 - r.lostRent - 3800, 4);
    expect(r.interest).toBeGreaterThan(5000); expect(r.interest).toBeLessThan(6100); expect(r.afterDebt).toBeCloseTo(r.noi - r.interest - r.principal, 6);
  });
});
