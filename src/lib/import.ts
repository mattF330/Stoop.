// Spreadsheet import helpers. Everything runs in the browser; only rows the user confirms are saved.
export type Kind = "properties" | "units" | "expenses" | "maintenance" | "loans" | "vacancies" | "reminders" | "capital" | "rent_history";
export interface FieldDef { key: string; label: string; required?: boolean; type: "text" | "money" | "date"; words: RegExp; }
export const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
export function normBorough(s: string | null | undefined): string | null {
  const t = (s ?? "").trim().toLowerCase().replace(/\./g, ""); if (!t) return null;
  const m: Record<string, string> = { manhattan: "Manhattan", mn: "Manhattan", "new york": "Manhattan", ny: "Manhattan", brooklyn: "Brooklyn", bk: "Brooklyn", bklyn: "Brooklyn", queens: "Queens", qns: "Queens", bronx: "Bronx", "the bronx": "Bronx", bx: "Bronx", "staten island": "Staten Island", si: "Staten Island", statenisland: "Staten Island" };
  return m[t] ?? null;
}
export const FIELDS: Record<Kind, FieldDef[]> = {
  properties: [
    { key: "address", label: "Address", required: true, type: "text", words: /address|street|location/i },
    { key: "borough", label: "Borough", type: "text", words: /borough|boro/i },
    { key: "nickname", label: "Nickname", type: "text", words: /nick|name|label|building/i },
    { key: "units_residential", label: "Units", type: "money", words: /units|doors|apartments/i },
    { key: "purchase_price", label: "Purchase price", type: "money", words: /price|cost|paid/i },
    { key: "purchase_date", label: "Purchase date", type: "date", words: /date|bought|closed/i },
    { key: "current_value", label: "Current value", type: "money", words: /value|worth|current|market/i },
    { key: "property_type", label: "Property type", type: "text", words: /type|class|kind/i },
    { key: "year_built", label: "Year built", type: "money", words: /year|built/i },
    { key: "cash_invested", label: "Cash invested", type: "money", words: /invested|down|equity/i },
    { key: "vacancy_pct", label: "Vacancy %", type: "money", words: /vacan/i },
    { key: "notes", label: "Notes", type: "text", words: /note|comment/i },
  ],
  loans: [
    { key: "lender", label: "Lender", type: "text", words: /lender|bank|servicer/i },
    { key: "principal", label: "Loan amount", required: true, type: "money", words: /principal|amount|loan|original/i },
    { key: "rate_pct", label: "Rate %", required: true, type: "money", words: /rate|interest/i },
    { key: "term_years", label: "Term (years)", required: true, type: "money", words: /term|years/i },
    { key: "start_date", label: "Start date", required: true, type: "date", words: /start|date|origination|closed/i },
  ],
  vacancies: [
    { key: "unit", label: "Unit", required: true, type: "text", words: /unit|apt|apartment/i },
    { key: "start_date", label: "Vacant from", required: true, type: "date", words: /start|from|vacant|began/i },
    { key: "end_date", label: "Until", type: "date", words: /end|until|to|filled|rented/i },
    { key: "monthly_rent", label: "Rent / month", type: "money", words: /rent|amount/i },
    { key: "notes", label: "Notes", type: "text", words: /note|comment/i },
  ],
  reminders: [
    { key: "title", label: "Title", required: true, type: "text", words: /title|what|reminder|task|item|name/i },
    { key: "due_date", label: "Date", required: true, type: "date", words: /date|due|when/i },
    { key: "kind", label: "Type", type: "text", words: /type|kind|categor/i },
    { key: "repeat", label: "Repeats", type: "text", words: /repeat|recur|frequen/i },
    { key: "notes", label: "Notes", type: "text", words: /note|comment/i },
  ],
  capital: [
    { key: "name", label: "Item", required: true, type: "text", words: /item|name|system|what/i },
    { key: "installed_year", label: "Installed (year)", required: true, type: "money", words: /install|year|built/i },
    { key: "lifespan_years", label: "Expected life (yrs)", required: true, type: "money", words: /life|span|expected/i },
    { key: "replacement_cost", label: "Replacement cost", required: true, type: "money", words: /cost|replace|price/i },
    { key: "saved_so_far", label: "Already saved", type: "money", words: /saved|reserve|set aside/i },
  ],
  rent_history: [
    { key: "unit", label: "Unit", required: true, type: "text", words: /unit|apt|apartment/i },
    { key: "effective_date", label: "Effective date", required: true, type: "date", words: /effective|date|start|from/i },
    { key: "monthly_rent", label: "Rent / month", required: true, type: "money", words: /rent|amount/i },
    { key: "tenant_name", label: "Tenant", type: "text", words: /tenant|resident/i },
    { key: "lease_end", label: "Lease end", type: "date", words: /lease.*(end|exp)|expir/i },
    { key: "note", label: "Note", type: "text", words: /note|comment|reason/i },
  ],
  units: [
    { key: "label", label: "Unit", required: true, type: "text", words: /^(unit|apt|apartment|label|name|#|no\.?|number)\b|unit\s*(no|number|#)?$/i },
    { key: "tenant_name", label: "Tenant", type: "text", words: /tenant|resident|lessee|occupant/i },
    { key: "monthly_rent", label: "Rent / month", required: true, type: "money", words: /rent|monthly|amount|\$/i },
    { key: "lease_end", label: "Lease end", type: "date", words: /lease.*(end|exp|to)|expir|end\s*date|term/i },
    { key: "is_stabilized", label: "Rent stabilized? (yes/no)", type: "text", words: /stabili/i },
  ],
  expenses: [
    { key: "category", label: "Category", required: true, type: "text", words: /categor|type|expense|item|description|name/i },
    { key: "annual_amount", label: "Amount", required: true, type: "money", words: /annual|year|amount|total|cost|\$/i },
    { key: "is_estimate", label: "Estimate? (yes/no)", type: "text", words: /estimate/i },
  ],
  maintenance: [
    { key: "logged_on", label: "Date", required: true, type: "date", words: /date|when|day/i },
    { key: "title", label: "What was done", required: true, type: "text", words: /what|work|description|repair|item|title|job/i },
    { key: "contractor", label: "Contractor", type: "text", words: /contractor|vendor|company|plumber|paid to|who/i },
    { key: "cost", label: "Cost", required: true, type: "money", words: /cost|amount|price|paid|total|\$/i },
    { key: "category", label: "Category", type: "text", words: /categor|type/i },
  ],
};
// Every record type except properties can name its property in the file, so one sheet can cover several buildings.
export const PROPERTY_FIELD: FieldDef = { key: "property", label: "Property (address or nickname)", type: "text", words: /property|building|address|site/i };
for (const k of Object.keys(FIELDS) as Kind[]) if (k !== "properties") FIELDS[k].push(PROPERTY_FIELD);
export const yesNo = (s: unknown): boolean | null => { const t = String(s ?? "").trim().toLowerCase(); return ["y", "yes", "true", "1", "x"].includes(t) ? true : ["n", "no", "false", "0"].includes(t) ? false : null; };
export const normReminderKind = (s: string | null | undefined): "insurance" | "rate_reset" | "inspection" | "other" => { const t = (s ?? "").toLowerCase(); return /insur/.test(t) ? "insurance" : /rate|reset/.test(t) ? "rate_reset" : /inspect|boiler|facade|elevator|gas/.test(t) ? "inspection" : "other"; };
export const normRepeat = (s: string | null | undefined): "none" | "monthly" | "quarterly" | "yearly" => { const t = (s ?? "").toLowerCase(); return /month/.test(t) ? "monthly" : /quarter|3 ?mo/.test(t) ? "quarterly" : /year|annual/.test(t) ? "yearly" : "none"; };
// Columns that look like account numbers or IDs are never imported.
export const BLOCKED_HEADER = /account|routing|acct|ssn|social|card|iban|password|pin\b/i;

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = "", q = false;
  const t = text.replace(/^﻿/, "");
  const delim = (t.split("\n", 1)[0].match(/\t/g)?.length ?? 0) > (t.split("\n", 1)[0].match(/,/g)?.length ?? 0) ? "\t" : ",";
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ""));
}
export function parseMoney(s: string): number | null {
  const t = s.trim(); if (!t) return null; const neg = /^\(.*\)$/.test(t) || /^-/.test(t);
  const n = Number(t.replace(/[^0-9.]/g, "")); if (!isFinite(n) || !/\d/.test(t)) return null; return neg ? -n : n;
}
export function parseDate(s: string): string | null {
  const t = s.trim(); if (!t) return null; let m;
  if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return ok(+m[1], +m[2], +m[3]);
  if ((m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/))) return ok(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[1], +m[2]);
  const d = new Date(t + (/\d{4}/.test(t) ? "" : "")); if (!isNaN(+d) && /[a-z]/i.test(t) && /\d{4}/.test(t)) return ok(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return null;
}
function ok(y: number, m: number, d: number) { const dt = new Date(Date.UTC(y, m - 1, d)); return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null; }
// Strip spreadsheet-formula starters and long digit runs (possible account numbers) from free text.
export function cleanText(s: string): string { let t = s.trim().replace(/^[=+@\t\r]+/, "").trim(); if (/\d[\d\s-]{8,}\d/.test(t) && t.replace(/\D/g, "").length >= 9) t = t.replace(/\d[\d\s-]{8,}\d/g, "[removed]"); return t.slice(0, 200); }
export function guessMapping(kind: Kind, headers: string[]): (string | "")[] {
  const used = new Set<string>(); return headers.map(h => {
    if (BLOCKED_HEADER.test(h)) return ""; const f = FIELDS[kind].find(f => !used.has(f.key) && f.words.test(h.trim())); if (f) { used.add(f.key); return f.key; } return "";
  });
}
export function categoryFor(s: string, cats: string[]): string {
  const t = s.toLowerCase(); const map: [RegExp, string][] = [[/tax/, "Property tax"], [/insur/, "Insurance"], [/water|sewer/, "Water & sewer"], [/heat|fuel|oil|gas/, "Heat / fuel"], [/electric|con ?ed/, "Electric (common)"], [/repair|maint/, "Repairs & maintenance"], [/manage/, "Management"], [/super|payroll|porter/, "Super / payroll"], [/legal|account|attorney|cpa/, "Legal & accounting"]];
  for (const [re, c] of map) if (re.test(t) && cats.includes(c)) return c; return cats.includes("Other") ? "Other" : cats[0];
}
export interface Parsed { row: Record<string, any>; line: number; problems: string[]; }
export function buildRows(kind: Kind, data: string[][], mapping: string[], monthlyAmounts = false): Parsed[] {
  const out: Parsed[] = []; const defs = FIELDS[kind];
  data.forEach((cells, i) => {
    const row: Record<string, any> = {}; const problems: string[] = [];
    mapping.forEach((key, c) => { if (!key) return; const def = defs.find(d => d.key === key)!; const raw = cells[c] ?? "";
      if (def.type === "money") { const n = parseMoney(raw); if (n === null && raw.trim()) problems.push(`${def.label}: “${raw}” isn’t a number`); row[key] = n; }
      else if (def.type === "date") { const d = parseDate(raw); if (d === null && raw.trim()) problems.push(`${def.label}: “${raw}” isn’t a date`); row[key] = d; }
      else row[key] = cleanText(raw) || null; });
    for (const d of defs) if (d.required && (row[d.key] === null || row[d.key] === undefined || row[d.key] === "") && !problems.some(x => x.startsWith(d.label))) problems.push(`${d.label} is missing`);
    if (kind === "expenses" && row.annual_amount != null) { if (monthlyAmounts) row.annual_amount *= 12; if (row.annual_amount < 0) problems.push("Amount is negative"); if (row.category) row.category = categoryFor(row.category, ["Property tax", "Insurance", "Water & sewer", "Heat / fuel", "Electric (common)", "Repairs & maintenance", "Management", "Super / payroll", "Legal & accounting", "Other"]); }
    if (kind === "properties") { row.borough = normBorough(row.borough); for (const k of ["units_residential", "purchase_price", "current_value"]) if (row[k] != null && row[k] < 0) problems.push(`${k.replace("_", " ")} is negative`); if (row.units_residential != null) row.units_residential = Math.round(row.units_residential); }
    if (kind === "units" && row.monthly_rent != null && row.monthly_rent < 0) problems.push("Rent is negative");
    if (kind === "properties") { if (row.year_built != null) row.year_built = Math.round(row.year_built); if (row.vacancy_pct != null && (row.vacancy_pct < 0 || row.vacancy_pct > 100)) problems.push("Vacancy % must be 0–100"); }
    if (kind === "loans") { if (row.principal != null && row.principal < 0) problems.push("Loan amount is negative"); if (row.rate_pct != null && row.rate_pct < 0) problems.push("Rate is negative"); if (row.term_years != null && row.term_years <= 0) problems.push("Term must be more than 0"); }
    if (kind === "vacancies") { if (row.end_date && row.start_date && row.end_date < row.start_date) problems.push("“Until” is before “Vacant from”"); if (row.monthly_rent != null && row.monthly_rent < 0) problems.push("Rent is negative"); }
    if (kind === "reminders") { row.kind = normReminderKind(row.kind); row.repeat = normRepeat(row.repeat); }
    if (kind === "capital") { for (const k of ["installed_year", "lifespan_years"]) if (row[k] != null) row[k] = Math.round(row[k]); if (row.installed_year != null && (row.installed_year < 1850 || row.installed_year > 2100)) problems.push("Installed year looks wrong"); if (row.lifespan_years != null && (row.lifespan_years < 1 || row.lifespan_years > 150)) problems.push("Expected life should be 1–150 years"); if (row.replacement_cost != null && row.replacement_cost < 0) problems.push("Cost is negative"); }
    if (kind === "rent_history" && row.monthly_rent != null && row.monthly_rent < 0) problems.push("Rent is negative");
    if (kind === "maintenance" && row.cost != null) { row.cost = Math.abs(row.cost); }
    out.push({ row, line: i + 2, problems });
  });
  return out;
}
export const TEMPLATES: Record<Kind, string> = {
  properties: "Address,Borough,Nickname,Units,Purchase price,Purchase date,Current value,Property type,Year built,Cash invested,Vacancy %,Notes\n123 Atlantic Ave,Brooklyn,Atlantic,6,1500000,2019-05-01,2100000,Walk-up,1931,450000,5,\n45-10 Vernon Blvd,Queens,,4,,,,,,,,\n",
  units: "Property,Unit,Tenant,Rent,Lease end,Rent stabilized?\n123 Atlantic Ave,1A,Jane Doe,2500,2027-06-30,no\n123 Atlantic Ave,2A,,2800,,yes\n",
  loans: "Property,Lender,Loan amount,Rate %,Term (years),Start date\n123 Atlantic Ave,Chase,1000000,6.5,30,2022-01-01\n",
  vacancies: "Property,Unit,Vacant from,Until,Rent / month,Notes\n123 Atlantic Ave,2A,2026-09-01,2026-10-15,2800,Repainted\n",
  reminders: "Property,Title,Date,Type,Repeats,Notes\n123 Atlantic Ave,Renew building insurance,2027-03-01,Insurance,Yearly,\n,Pay estimated taxes,2027-01-15,Other,Quarterly,\n",
  capital: "Property,Item,Installed (year),Expected life (yrs),Replacement cost,Already saved\n123 Atlantic Ave,Roof,2008,20,48000,5000\n123 Atlantic Ave,Boiler,2001,30,35000,0\n",
  rent_history: "Property,Unit,Effective date,Rent / month,Tenant,Lease end,Note\n123 Atlantic Ave,1A,2025-07-01,2400,Jane Doe,2026-06-30,Original lease\n123 Atlantic Ave,1A,2026-07-01,2500,Jane Doe,2027-06-30,Renewed +4%\n",
  expenses: "Property,Category,Annual amount\n123 Atlantic Ave,Property tax,18000\n123 Atlantic Ave,Insurance,6000\n",
  maintenance: "Property,Date,What was done,Contractor,Cost\n123 Atlantic Ave,2026-10-05,Boiler repair,ABC Heating,1200\n",
};
