import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { SourceTag } from "../components/Disclaimers";
interface Item { id: string; url: string; title: string; source_name: string; published_at: string | null; excerpt: string | null; topics: string[]; score: number; fetched_at: string; }
const STALE_MS = 6 * 3600 * 1000;

export default function News() {
  const [items, setItems] = useState<Item[] | null>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [sources, setSources] = useState<Record<string, string> | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await supabase.from("news_items").select("*").gte("published_at", new Date(Date.now() - 14 * 864e5).toISOString()).order("score", { ascending: false }).limit(40);
    if (error) { setErr(error.message); return null; } setErr(""); setItems(data as Item[]); return data as Item[];
  }, []);
  const refresh = useCallback(async () => {
    setBusy(true);
    try { const { data, error } = await supabase.functions.invoke("news-ingest", { body: {} }); if (!error && (data as any)?.status) setSources((data as any).status); } catch { /* shown as empty state */ }
    await load(); setBusy(false);
  }, [load]);
  useEffect(() => { (async () => { const rows = await load(); const newest = rows?.reduce((m, r) => Math.max(m, new Date(r.fetched_at).getTime()), 0) ?? 0; if (!rows || rows.length === 0 || Date.now() - newest > STALE_MS) refresh(); })(); }, [load, refresh]);
  const failed = sources ? Object.entries(sources).filter(([, v]) => v.startsWith("failed")) : [];
  const newest = items?.length ? new Date(Math.max(...items.map(i => new Date(i.fetched_at).getTime()))) : null;
  return (<><div className="row" style={{ alignItems: "center" }}><div><p className="eyebrow">NYC real estate</p><h1>News</h1></div><button className="ghost" onClick={refresh} disabled={busy}>{busy ? "Refreshing…" : "Refresh"}</button></div>
    <SourceTag id="news" asOf={newest ? newest.toISOString() : null} />
    {err && <p className="err">{err}</p>}
    {failed.length > 0 && <p className="note">{sources && Object.keys(sources).length - failed.length} of {sources && Object.keys(sources).length} sources responded. Unavailable: {failed.map(([k]) => k).join(", ")}.</p>}
    {items && items.length === 0 && !busy && <div className="card">No news yet. The sources may be unreachable right now. Nothing is invented here.</div>}
    <div style={{ marginTop: 20, borderTop: "1px solid var(--line)" }}>{items?.map(i => <div className="news" key={i.id}><a className="t" href={i.url} target="_blank" rel="noopener noreferrer">{i.title}</a>
      <div className="note" style={{ margin: "6px 0" }}>{i.source_name}{i.published_at && ` · ${new Date(i.published_at).toLocaleDateString()}`}</div>
      {i.excerpt && <p style={{ margin: "6px 0" }}>{i.excerpt}</p>}{i.topics.map(t => <span className="pill" key={t}>{t}</span>)}</div>)}</div></>);
}
