import { supabase } from "./supabase";
import type { Loan } from "./finance";
export interface PropertyRow { id: string; nickname: string | null; address: string; borough: string | null; bbl: string | null; property_type: string | null; is_condo_coop: boolean; units_residential: number | null; year_built: number | null; purchase_price: number | null; purchase_date: string | null; current_value: number | null; current_value_note: string | null; cash_invested: number | null; vacancy_pct: number; notes: string | null; }
export interface LoanRow { id: string; property_id: string; lender: string | null; principal: number; rate_pct: number; term_years: number; start_date: string; }
export interface ExpenseRow { id: string; property_id: string; category: string; annual_amount: number; is_estimate: boolean; }
export interface UnitRow { id: string; property_id: string; label: string; tenant_name: string | null; monthly_rent: number; lease_end: string | null; is_stabilized: boolean | null; }
export const EXPENSE_CATEGORIES = ["Property tax", "Insurance", "Water & sewer", "Heat / fuel", "Electric (common)", "Repairs & maintenance", "Management", "Super / payroll", "Legal & accounting", "Other"];
export const toLoan = (l: LoanRow): Loan => ({ principal: Number(l.principal), ratePct: Number(l.rate_pct), termYears: Number(l.term_years), startDate: l.start_date });
const must = <T,>(r: { data: T | null; error: { message: string } | null }): T => { if (r.error) throw new Error(r.error.message); return r.data as T; };
export const listProperties = async () => must(await supabase.from("properties").select("*").order("created_at")) as PropertyRow[];
export const getProperty = async (id: string) => must(await supabase.from("properties").select("*").eq("id", id).single()) as PropertyRow;
export const listFor = async <T,>(table: "loans" | "expenses" | "units", propertyId?: string) => {
  let q = supabase.from(table).select("*"); if (propertyId) q = q.eq("property_id", propertyId); return must(await q) as T[];
};
export async function insertRow(table: string, row: object) { const r = await supabase.from(table).insert(row).select().single(); return must(r) as any; }
export async function deleteRow(table: string, id: string) { const r = await supabase.from(table).delete().eq("id", id); if (r.error) throw new Error(r.error.message); }
export async function updateRow(table: string, id: string, patch: object) { const r = await supabase.from(table).update(patch).eq("id", id); if (r.error) throw new Error(r.error.message); }
