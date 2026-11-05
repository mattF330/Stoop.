// Deno Edge Function (verify_jwt = false; it authenticates itself).
// Callable by (a) cron with the x-cron-secret header, or (b) any signed-in user, rate-limited by freshness.
// Stores headline/source/link/short excerpt only, never full articles.
import { createClient } from "npm:@supabase/supabase-js@2";
import { parseFeed, dedupe } from "./news.ts";

// Edit freely. The response reports which feeds worked.
const FEEDS: { name: string; url: string }[] = [
  { name: "Curbed NY / Vox", url: "https://www.curbed.com/rss/index.xml" },
  { name: "Gothamist", url: "https://gothamist.com/feed" },
  { name: "City Limits", url: "https://citylimits.org/feed/" },
  { name: "THE CITY", url: "https://www.thecity.nyc/feed/" },
];
const FRESH_MS = 30 * 60 * 1000;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!, svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const secret = Deno.env.get("CRON_SECRET");
  const cronOk = Boolean(secret) && req.headers.get("x-cron-secret") === secret;
  let userOk = false;
  if (!cronOk) {
    const uc = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data } = await uc.auth.getUser(); userOk = Boolean(data?.user);
  }
  if (!cronOk && !userOk) return json({ error: "forbidden" }, 403);

  const admin = createClient(url, svc);
  if (!cronOk) {
    const { data: last } = await admin.from("news_items").select("fetched_at").order("fetched_at", { ascending: false }).limit(1);
    if (last?.[0] && Date.now() - new Date(last[0].fetched_at).getTime() < FRESH_MS) return json({ skipped: "fresh", lastFetched: last[0].fetched_at });
  }
  const all = [] as ReturnType<typeof parseFeed>; const status: Record<string, string> = {};
  await Promise.all(FEEDS.map(async f => {
    try {
      const r = await fetch(f.url, { signal: AbortSignal.timeout(12000), headers: { "User-Agent": "Mozilla/5.0 (compatible; StoopNewsBot/1.0)", Accept: "application/rss+xml, application/xml, text/xml, */*" } });
      if (!r.ok) throw new Error(String(r.status));
      const items = parseFeed(await r.text(), f.name); all.push(...items); status[f.name] = `ok:${items.length}`;
    } catch (e) { status[f.name] = `failed:${(e as Error).message}`; }
  }));
  const fresh = dedupe(all.filter(i => i.score > 0)).slice(0, 200);
  let dbError: string | null = null;
  if (fresh.length) { const { error } = await admin.from("news_items").upsert(fresh, { onConflict: "url", ignoreDuplicates: false }); if (error) dbError = error.message; }
  await admin.from("news_items").delete().lt("fetched_at", new Date(Date.now() - 30 * 864e5).toISOString());
  return json({ stored: dbError ? 0 : fresh.length, status, dbError });
});
