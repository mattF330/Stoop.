// Pulls a likely date, total and vendor out of text read from a receipt or invoice. These are guesses for the user to confirm.
import { parseDate, parseMoney } from "./import";
export interface ReceiptGuess { date: string | null; total: number | null; vendor: string | null; }
export function guessReceipt(text: string): ReceiptGuess {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const money = (l: string) => [...l.matchAll(/\$?\s?(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})\b/g)].map(m => parseMoney(m[0])!).filter(n => n !== null);
  let total: number | null = null;
  const key = /(grand\s*total|amount\s*due|balance\s*due|total\s*due|^total\b|\btotal\b)/i, skip = /(sub\s*total|tax|tip|discount)/i;
  for (const l of lines) if (key.test(l) && !skip.test(l)) { const m = money(l); if (m.length) total = m[m.length - 1]; }
  if (total === null) { const all = lines.flatMap(money); if (all.length) total = Math.max(...all); }
  let date: string | null = null;
  for (const l of lines) { const m = l.match(/\b(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|[A-Z][a-z]{2,8}\.? \d{1,2},? \d{4})\b/); if (m) { const d = parseDate(m[1].replace(/\./g, m[1].includes("/") ? "/" : ".")); if (d) { date = d; break; } } }
  const vendor = lines.find(l => /[A-Za-z]{3}/.test(l) && !/invoice|receipt|bill to|date|total|page \d/i.test(l))?.slice(0, 80) ?? null;
  return { date, total, vendor };
}
