// Capital reserve planning: plain division on numbers the owner enters. Not a prediction of when anything will fail.
export interface CapItem { id: string; property_id: string; name: string; installed_year: number; lifespan_years: number; replacement_cost: number; saved_so_far: number; notes: string | null; }
export const PRESETS: { name: string; years: number }[] = [
  { name: "Roof (flat / membrane)", years: 20 }, { name: "Roof (pitched)", years: 25 }, { name: "Boiler", years: 30 }, { name: "Water heater", years: 12 },
  { name: "Elevator modernization", years: 25 }, { name: "Windows", years: 25 }, { name: "Facade / brick repointing", years: 30 }, { name: "Plumbing risers", years: 50 }, { name: "Other", years: 20 },
];
export interface Plan { replaceYear: number; monthsLeft: number; overdue: boolean; remainingCost: number; monthly: number; }
// Months until January of the expected replacement year. Past that, the plan spreads the remaining cost over the next 12 months.
export function plan(i: Pick<CapItem, "installed_year" | "lifespan_years" | "replacement_cost" | "saved_so_far">, now = new Date()): Plan {
  const replaceYear = Number(i.installed_year) + Number(i.lifespan_years);
  const monthsLeft = (replaceYear - now.getFullYear()) * 12 - now.getMonth();
  const overdue = monthsLeft <= 0; const remainingCost = Math.max(0, Number(i.replacement_cost) - Number(i.saved_so_far));
  return { replaceYear, monthsLeft: Math.max(0, monthsLeft), overdue, remainingCost, monthly: remainingCost / (overdue ? 12 : monthsLeft) };
}
export function totals(items: CapItem[], now = new Date()) {
  return items.reduce((a, i) => { const p = plan(i, now); return { monthly: a.monthly + p.monthly, cost: a.cost + Number(i.replacement_cost), saved: a.saved + Number(i.saved_so_far), overdue: a.overdue + (p.overdue ? 1 : 0), within5: a.within5 + (p.monthsLeft <= 60 ? Number(i.replacement_cost) : 0) }; }, { monthly: 0, cost: 0, saved: 0, overdue: 0, within5: 0 });
}
