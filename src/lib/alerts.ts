// Rule-based relevance: which news items matter to a given property. No AI.
export interface NewsLite { id: string; title: string; excerpt: string | null; topics: string[]; published_at: string | null; url: string; source_name: string; }
export interface PropLite { borough: string | null; address: string; isStabilizedPossible?: boolean; units?: number | null; hasLoans?: boolean; }
const BORO: Record<string, RegExp> = { Brooklyn: /brooklyn/i, Queens: /queens/i, Manhattan: /manhattan/i, Bronx: /bronx/i, "Staten Island": /staten island/i };
export function whyItMatters(p: PropLite, n: NewsLite): string | null {
  const text = `${n.title} ${n.excerpt ?? ""}`;
  const reasons: string[] = [];
  if (p.borough && BORO[p.borough]?.test(text)) reasons.push(`mentions ${p.borough}`);
  if (p.isStabilizedPossible && n.topics.includes("rent-stabilization")) reasons.push("rent stabilization may apply to this building");
  if ((p.units ?? 0) >= 6 && n.topics.includes("safety")) reasons.push("larger buildings face more HPD/DOB activity");
  if (p.hasLoans && /mortgage|rates?/i.test(text)) reasons.push("you have loans on this property");
  if (n.topics.includes("taxes")) reasons.push("may affect property taxes");
  return reasons.length ? reasons[0][0].toUpperCase() + reasons.join("; ").slice(1) : null;
}
export function relevantNews(p: PropLite, items: NewsLite[], max = 5) {
  return items.map(n => ({ n, why: whyItMatters(p, n) })).filter(x => x.why).slice(0, max);
}
