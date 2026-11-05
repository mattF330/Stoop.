// Deno Edge Function. Auth required. No API keys needed; optional NYC_APP_TOKEN raises Socrata rate limits.
import { createClient } from "npm:@supabase/supabase-js@2";
import { parseGeoSearch, isValidBBL, splitBBL, parsePluto, parseAcrisMaster, summarizeHpd, parseFlag, flagQuery, sodaUrl, soql, DATASETS, MORTGAGE_TYPES } from "./nyc.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const TTL_MS = 24 * 3600 * 1000;

async function get(url: string) {
  const h: Record<string, string> = {}; const t = Deno.env.get("NYC_APP_TOKEN"); if (t) h["X-App-Token"] = t;
  const r = await fetch(url, { headers: h, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  return r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!, svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authz = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authz } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "unauthorized" }, 401);

  let body: any; try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  try {
    if (body.mode === "search") {
      const text = String(body.text ?? "").trim();
      if (text.length < 3 || text.length > 200) return json({ error: "bad_text" }, 400);
      const g = await get(`https://geosearch.planninglabs.nyc/v2/search?size=8&text=${encodeURIComponent(text)}`);
      return json({ candidates: parseGeoSearch(g), fetchedAt: new Date().toISOString() });
    }
    if (body.mode === "lookup") {
      if (!isValidBBL(body.bbl)) return json({ error: "bad_bbl" }, 400);
      const admin = createClient(url, svc);
      const { data: cached } = await admin.from("public_records_cache").select("*").eq("bbl", body.bbl).eq("source", "bundle").maybeSingle();
      if (cached && !body.refresh && Date.now() - new Date(cached.fetched_at).getTime() < TTL_MS) return json({ ...cached.payload, cached: true, fetchedAt: cached.fetched_at });

      const { borough, block, lot } = splitBBL(body.bbl);
      const result: any = { bbl: body.bbl, errors: {} as Record<string, string> };
      const tasks: Promise<void>[] = [];
      tasks.push(get(sodaUrl(DATASETS.pluto, { $where: `bbl like '${soql(body.bbl)}%'`, $limit: "1" })).then(r => { result.pluto = parsePluto(r); }).catch(e => { result.errors.pluto = String(e.message); }));
      tasks.push((async () => {
        const legals = await get(sodaUrl(DATASETS.acrisLegals, { $where: `borough='${borough}' AND block='${block}' AND lot='${lot}'`, $select: "document_id", $limit: "500" }));
        const ids = [...new Set(legals.map((l: any) => l.document_id))].slice(0, 200);
        if (!ids.length) { result.acris = []; return; }
        const inList = ids.map((i: any) => `'${soql(String(i))}'`).join(",");
        const master = await get(sodaUrl(DATASETS.acrisMaster, { $where: `document_id in(${inList})`, $limit: "200" }));
        result.acris = parseAcrisMaster(master).filter(d => MORTGAGE_TYPES.includes(d.type) || ["DEED", "DEEDO", "RPTT&RET"].includes(d.type)).slice(0, 25);
      })().catch(e => { result.errors.acris = String(e.message); }));
      tasks.push(get(sodaUrl(DATASETS.hpdViolations, { $select: "violationstatus,class,count(*) as n", $where: `bbl='${soql(body.bbl)}'`, $group: "violationstatus,class", $limit: "100" })).then(r => { result.hpd = summarizeHpd(r); }).catch(e => { result.errors.hpd = String(e.message); }));
      for (const [key, env, label] of [["stabilization", "STAB", "a rent-stabilization building list"], ["ll97", "LL97", "an LL97 covered-buildings list"]] as const) {
        const ds = Deno.env.get(`${env}_DATASET`), field = Deno.env.get(`${env}_BBL_FIELD`) ?? "bbl";
        result.flags ??= {};
        if (!ds) { result.flags[key] = parseFlag(null, false, label); continue; }
        tasks.push(get(sodaUrl(ds, flagQuery(field, body.bbl))).then(r => { result.flags[key] = parseFlag(r, true, label); }).catch(e => { result.errors[key] = String(e.message); }));
      }
      await Promise.all(tasks);
      result.fetchedAt = new Date().toISOString();
      if (!Object.keys(result.errors).length) await admin.from("public_records_cache").upsert({ bbl: body.bbl, source: "bundle", payload: result, fetched_at: result.fetchedAt });
      return json(result);
    }
    return json({ error: "bad_mode" }, 400);
  } catch (e) {
    return json({ error: "upstream_failed", detail: String((e as Error).message) }, 502);
  }
});
