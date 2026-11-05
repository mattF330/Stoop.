import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createDemoClient } from "./demo";
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const configured = Boolean(url && key);
// With no Supabase env vars the app runs against a local, fictional demo backend (see demo.ts).
export const demo = !configured;
// Only the publishable (anon) key ever ships to the browser. Never put a service-role key here.
export const supabase: SupabaseClient = configured ? createClient(url!, key!) : (createDemoClient() as SupabaseClient);
