// Deno Edge Function (verify_jwt = true). Returns today's NYC real estate briefing, generated once per day and shared.
// Rule-based briefing only. No AI service and no paid API is called.
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildRulesBrief, type BriefItem } from "./brief.ts";
import { isRelevant } from "./relevance.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!, svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const uc = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: u } = await uc.auth.getUser(); if (!u?.user) return json({ error: "unauthorized" }, 401);

  const date = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const admin = createClient(url, svc);
  const { data: cached } = await admin.from("daily_briefs").select("body").eq("brief_date", date).maybeSingle();
  if (cached) return json(cached.body);

  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { data: rows } = await admin.from("news_items").select("title,url,source_name,excerpt,topics,published_at").gte("published_at", since).order("score", { ascending: false }).limit(60);
  const items = ((rows ?? []) as BriefItem[]).filter(i => isRelevant(i.title, i.excerpt, i.source_name)).slice(0, 25);
  if (!items.length) return json(buildRulesBrief([], date)); // nothing to summarize yet: do not cache an empty day

  const brief = buildRulesBrief(items, date);
  await admin.from("daily_briefs").upsert({ brief_date: date, source: brief.source, body: brief });
  return json(brief);
});
