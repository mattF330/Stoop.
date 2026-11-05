// Daily briefing helpers. Pure functions shared by the Edge Function and tests. Rule-based only (no AI).
export interface BriefItem { title: string; url: string; source_name: string; excerpt: string | null; topics: string[]; published_at: string | null; }
export interface BriefBullet { text: string; url: string; source: string; }
export interface Brief { date: string; source: "rules"; headline: string; summary: string; sections: { title: string; bullets: BriefBullet[] }[]; takeaways: string[]; }

const TOPIC_TITLES: Record<string, string> = { "rent-stabilization": "Rent stabilization", regulation: "Rules and regulation", taxes: "Taxes", safety: "Safety and violations", market: "Market" };
const TAKEAWAYS: Record<string, string> = {
  "rent-stabilization": "Rent stabilization news may affect what you can charge in regulated units.",
  regulation: "New or proposed rules may change your obligations as a landlord. Check the original reports.",
  taxes: "Tax or abatement changes may affect your operating costs.",
  safety: "Inspection and violation activity is a reminder to keep HPD/DOB items current.",
  market: "Sales, rate and market news may affect property values and refinancing.",
};
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export function buildRulesBrief(items: BriefItem[], date: string): Brief {
  const groups = new Map<string, BriefItem[]>();
  for (const i of items) { const k = i.topics.find(t => TOPIC_TITLES[t]) ?? "other"; groups.set(k, [...(groups.get(k) ?? []), i]); }
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  const sections = ordered.slice(0, 4).map(([k, list]) => ({ title: TOPIC_TITLES[k] ?? "Other stories", bullets: list.slice(0, 3).map(i => ({ text: clip(i.title, 140), url: i.url, source: i.source_name })) }));
  const top = ordered.filter(([k]) => k !== "other").slice(0, 2).map(([k, l]) => `${TOPIC_TITLES[k].toLowerCase()} (${l.length})`);
  return {
    date, source: "rules",
    headline: items.length ? `${items.length} NYC real estate ${items.length === 1 ? "story" : "stories"} to know today` : "No NYC real estate stories yet today",
    summary: items.length ? (top.length ? `Most coverage is on ${top.join(" and ")}.` : "A mix of stories across the market.") : "Check back after the next news refresh.",
    sections, takeaways: ordered.map(([k]) => TAKEAWAYS[k]).filter(Boolean).slice(0, 3),
  };
}
