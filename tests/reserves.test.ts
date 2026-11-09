import { describe, it, expect } from "vitest";
import { plan, totals } from "../src/lib/reserves";
import { NYC_TEMPLATES } from "../src/lib/nycTemplates";
const now = new Date(2026, 10, 8); // Nov 8 2026 (month index 10)
describe("capital reserves", () => {
  it("spreads remaining cost over months until the replacement year", () => {
    const p = plan({ installed_year: 2006, lifespan_years: 25, replacement_cost: 60000, saved_so_far: 0 }, now); // replace 2031 => (5*12)-10 = 50 months
    expect(p.replaceYear).toBe(2031); expect(p.monthsLeft).toBe(50); expect(p.overdue).toBe(false); expect(p.monthly).toBeCloseTo(1200, 6);
  });
  it("subtracts money already saved", () => { expect(plan({ installed_year: 2006, lifespan_years: 25, replacement_cost: 60000, saved_so_far: 10000 }, now).monthly).toBeCloseTo(1000, 6); });
  it("overdue items spread over 12 months", () => { const p = plan({ installed_year: 1990, lifespan_years: 30, replacement_cost: 12000, saved_so_far: 0 }, now); expect(p.overdue).toBe(true); expect(p.monthly).toBe(1000); });
  it("never goes negative when fully funded", () => { expect(plan({ installed_year: 2020, lifespan_years: 12, replacement_cost: 1000, saved_so_far: 5000 }, now).monthly).toBe(0); });
  it("totals add up", () => { const t = totals([{ id: "a", property_id: "p", name: "x", installed_year: 2006, lifespan_years: 25, replacement_cost: 60000, saved_so_far: 0, notes: null }, { id: "b", property_id: "p", name: "y", installed_year: 1990, lifespan_years: 30, replacement_cost: 12000, saved_so_far: 0, notes: null }], now); expect(t.monthly).toBeCloseTo(2200, 6); expect(t.overdue).toBe(1); expect(t.within5).toBe(72000); });
  it("templates carry no dates", () => { for (const t of NYC_TEMPLATES) expect(JSON.stringify(t)).not.toMatch(/\b20\d\d-\d\d-\d\d\b/); });
});
