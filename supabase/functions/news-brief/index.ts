// Deno Edge Function (verify_jwt = true). Returns today's NYC real estate briefing, generated once per day and shared.
// Uses the Anthropic API ONLY if the ANTHROPIC_API_KEY secret is set; otherwise (or on any failure) it builds a rule-based briefing.
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildRulesBrief, parseAiBrief, aiPrompt, AI_SYSTEM, type BriefItem } from "./brief.ts";
import { isRelevant } from "./relevance.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const MODEL = Deno.env.get("BRIEF_MODEL") ?? "claude-haiku-5-5";

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

  let brief = null as ReturnType<typeof buildRulesBrief> | null;
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (key) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", signal: AbortSignal.timeout(30000),
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: MODEL, max_tokens: 1200, system: AI_SYSTEM, messages: [{ role: "user", content: aiPrompt(items) }] }) });
      if (r.ok) { const j = await r.json(); brief = parseAiBrief(String(j?.content?.[0]?.text ?? ""), items, date); }
    } catch { /* fall back to rules */ }
  }
  brief ??= buildRulesBrief(items, date);
  await admin.from("daily_briefs").upsert({ brief_date: date, source: brief.source, body: brief });
  return json(brief);
});
