import { describe, it, expect } from "vitest";
import { calcMonthlyPayment, amortize, propertyMetrics } from "../src/lib/finance";
import { sourceTag, GLOBAL_DISCLAIMER } from "../src/lib/sources";

describe("finance", () => {
  it("monthly payment 300k @6% 30y ≈ 1798.65", () => expect(calcMonthlyPayment(300000, 6, 30)).toBeCloseTo(1798.65, 2));
  it("zero rate divides evenly", () => expect(calcMonthlyPayment(120000, 0, 10)).toBe(1000));
  it("balance hits 0 at term", () => expect(amortize(200000, 5, 15, 180).balance).toBe(0));
  it("balance decreases", () => expect(amortize(200000, 5, 30, 60).balance).toBeLessThan(200000));
  it("metrics", () => {
    const m = propertyMetrics({ value: 1000000, monthlyRent: 6000, vacancyPct: 5, annualExpenses: 20000, loans: [], cashInvested: 1000000 });
    expect(m.noi).toBeCloseTo(48400, 0); expect(m.capRate).toBeCloseTo(4.84, 2); expect(m.dscr).toBeNull();
  });
});
describe("disclaimers", () => {
  it("tag always includes accuracy warning", () => expect(sourceTag("acris", "2026-10-08")).toContain("may not be 100% accurate"));
  it("global disclaimer present", () => expect(GLOBAL_DISCLAIMER).toContain("Not financial, legal or tax advice"));
});

describe("robustness", () => {
  it("NaN inputs never produce NaN outputs", () => {
    const m = propertyMetrics({ value: NaN, monthlyRent: 3200, vacancyPct: NaN, annualExpenses: NaN, loans: [], cashInvested: NaN });
    expect(Object.values(m).every(v => v === null || Number.isFinite(v))).toBe(true);
  });
});
