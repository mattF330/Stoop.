import { XMLParser } from "fast-xml-parser";
export interface NewsItem { url: string; title: string; source_name: string; published_at: string | null; excerpt: string | null; topics: string[]; score: number; }

const TOPICS: Record<string, RegExp> = {
  "rent-stabilization": /rent[- ]?(stabiliz|guidelines|control)|RGB|DHCR/i,
  "regulation": /local law|LL ?97|good cause|city council|housing court|eviction/i,
  "market": /sales?|prices?|mortgage|rates?|cap rate|buyers?|listings?/i,
  "taxes": /property tax|421-a|J-51|assessment|DOF/i,
  "safety": /violation|HPD|DOB|inspection|fire|collapse/i,
};
const STRONG = /landlord|rent|housing|real estate|property|tenant|building|mortgage|NYC|New York|Brooklyn|Queens|Bronx|Manhattan|Staten Island/i;

export function strip(s: string) { return s.replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim(); }
export function topicsFor(text: string) { return Object.entries(TOPICS).filter(([, re]) => re.test(text)).map(([k]) => k); }
export function scoreItem(title: string, excerpt: string, published: string | null, now = Date.now()) {
  const text = `${title} ${excerpt}`;
  let s = (STRONG.test(text) ? 2 : 0) + topicsFor(text).length * 1.5;
  if (published) { const h = (now - new Date(published).getTime()) / 36e5; s += h < 24 ? 3 : h < 72 ? 1.5 : h < 168 ? 0.5 : -2; }
  return s;
}
export function canonicalUrl(u: string) { try { const x = new URL(u); x.hash = ""; ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"].forEach(k => x.searchParams.delete(k)); return x.toString(); } catch { return u; } }

export function parseFeed(xml: string, sourceName: string, now = Date.now()): NewsItem[] {
  const p = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  let doc: any; try { doc = p.parse(xml); } catch { return []; }
  const rssItems = doc?.rss?.channel?.item; const atomItems = doc?.feed?.entry;
  const arr = (x: any) => (x === undefined ? [] : Array.isArray(x) ? x : [x]);
  const out: NewsItem[] = [];
  for (const it of arr(rssItems)) {
    const url = typeof it.link === "string" ? it.link : it.link?.["#text"]; if (!url || !it.title) continue;
    const title = strip(String(it.title?.["#text"] ?? it.title)); const ex = strip(String(it.description ?? "")).slice(0, 280);
    const pub = it.pubDate ? new Date(it.pubDate).toISOString() : null;
    out.push({ url: canonicalUrl(url), title, source_name: sourceName, published_at: pub, excerpt: ex || null, topics: topicsFor(`${title} ${ex}`), score: scoreItem(title, ex, pub, now) });
  }
  for (const it of arr(atomItems)) {
    const l = arr(it.link)[0]; const url = l?.["@_href"]; if (!url || !it.title) continue;
    const title = strip(String(it.title?.["#text"] ?? it.title)); const ex = strip(String(it.summary?.["#text"] ?? it.summary ?? "")).slice(0, 280);
    const raw = it.updated ?? it.published; const pub = raw ? new Date(raw).toISOString() : null;
    out.push({ url: canonicalUrl(url), title, source_name: sourceName, published_at: pub, excerpt: ex || null, topics: topicsFor(`${title} ${ex}`), score: scoreItem(title, ex, pub, now) });
  }
  return out;
}
export function dedupe(items: NewsItem[]) {
  const seenU = new Set<string>(), seenT = new Set<string>(), out: NewsItem[] = [];
  for (const i of items) { const t = i.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); if (seenU.has(i.url) || seenT.has(t)) continue; seenU.add(i.url); seenT.add(t); out.push(i); }
  return out;
}
