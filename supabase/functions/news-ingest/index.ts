// Deno Edge Function. Callable by cron (x-cron-secret) only. Stores headline/source/link/short excerpt, never full articles.
import { createClient } from "npm:@supabase/supabase-js@2";
import { parseFeed, dedupe } from "../_shared/news.ts";

// Verify each feed URL before relying on it; edit freely.
const FEEDS: { name: string; url: string }[] = [
  { name: "The Real Deal", url: "https://therealdeal.com/feed/" },
  { name: "Curbed NY / Vox", url: "https://www.curbed.com/rss/index.xml" },
  { name: "Gothamist", url: "https://gothamist.com/feed" },
  { name: "City Limits", url: "https://citylimits.org/feed/" },
  { name: "THE CITY", url: "https://www.thecity.nyc/feed/" },
];

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return new Response("forbidden", { status: 403 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const all = [] as ReturnType<typeof parseFeed>; const status: Record<string, string> = {};
  await Promise.all(FEEDS.map(async f => {
    try { const r = await fetch(f.url, { signal: AbortSignal.timeout(12000), headers: { "User-Agent": "StoopNewsBot/1.0" } });
      if (!r.ok) throw new Error(String(r.status)); const items = parseFeed(await r.text(), f.name); all.push(...items); status[f.name] = `ok:${items.length}`;
    } catch (e) { status[f.name] = `failed:${(e as Error).message}`; }
  }));
  const fresh = dedupe(all.filter(i => i.score > 0)).slice(0, 200);
  if (fresh.length) await admin.from("news_items").upsert(fresh, { onConflict: "url", ignoreDuplicates: false });
  await admin.from("news_items").delete().lt("fetched_at", new Date(Date.now() - 30 * 864e5).toISOString());
  return new Response(JSON.stringify({ stored: fresh.length, status }), { headers: { "Content-Type": "application/json" } });
});
