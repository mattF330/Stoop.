// Local (per-browser) display preferences. Account-level settings live in Supabase.
export interface Prefs { theme: "light" | "dark" | "system"; accent: string; density: "comfortable" | "compact"; cf: "monthly" | "annual"; showNoi: boolean; showCap: boolean; }
export const DEFAULT_PREFS: Prefs = { theme: "light", accent: "#0039A6", density: "comfortable", cf: "monthly", showNoi: true, showCap: true };
const KEY = "stoop-prefs-v1";
export function loadPrefs(): Prefs { try { const v = { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; if (v.accent === "#2F5BFF") v.accent = DEFAULT_PREFS.accent; return v; } catch { return DEFAULT_PREFS; } }
export function savePrefs(p: Prefs) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ } applyPrefs(p); window.dispatchEvent(new Event("stoop-prefs")); }
export function applyPrefs(p: Prefs) {
  const r = document.documentElement;
  const dark = p.theme === "system" ? matchMedia("(prefers-color-scheme: dark)").matches : p.theme === "dark";
  r.dataset.theme = dark ? "dark" : "light";
  r.style.setProperty("--accent", p.accent);
  r.style.setProperty("--accent-soft", `color-mix(in srgb, ${p.accent} 14%, transparent)`);
  document.body.classList.toggle("dens-c", p.density === "compact");
}
export const ACCENTS = ["#0039A6", "#EE352E", "#00933C", "#FF6319", "#B933AD", "#111111"];
