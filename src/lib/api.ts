import { supabase } from "./supabase";
export interface Candidate { label: string; bbl: string | null; borough: string | null; bin: string | null; lat: number | null; lng: number | null; }
async function call<T>(body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke("nyc-property", { body });
  if (error) throw new Error(error.message || "Lookup failed");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}
export const searchAddress = (text: string) => call<{ candidates: Candidate[]; fetchedAt: string }>({ mode: "search", text });
export interface Bundle { bbl: string; pluto: any | null; acris?: { documentId: string; type: string; label?: string; amount: number | null; recorded: string | null }[]; hpd?: { open: number; sampled: number; byClass: Record<string, number> }; flags?: Record<string, { checked?: boolean; listed?: boolean; covered?: boolean; evidence: string | null }>; errors: Record<string, string>; fetchedAt: string; cached?: boolean; }
export const lookupBBL = (bbl: string, refresh = false) => call<Bundle>({ mode: "lookup", bbl, refresh });
