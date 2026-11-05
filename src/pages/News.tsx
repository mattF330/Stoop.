import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { SourceTag } from "../components/Disclaimers";
interface Item { id: string; url: string; title: string; source_name: string; published_at: string | null; excerpt: string | null; topics: string[]; score: number; }
export default function News() {
  const [items, setItems] = useState<Item[] | null>(null); const [err, setErr] = useState("");
  useEffect(() => { supabase.from("news_items").select("*").gte("published_at", new Date(Date.now() - 14 * 864e5).toISOString()).order("score", { ascending: false }).limit(40)
    .then(({ data, error }) => { if (error) setErr(error.message); else setItems(data as Item[]); }); }, []);
  return (<><h1>NYC real estate news</h1><SourceTag id="news" />
    {err && <p className="err">{err}</p>}
    {items && items.length === 0 && <div className="card">No news yet. The daily update hasn’t run, or no feed was reachable. Nothing is invented here.</div>}
    {items?.map(i => <div className="news" key={i.id}><a className="t" href={i.url} target="_blank" rel="noopener noreferrer">{i.title}</a>
      <div style={{ color: "var(--muted)", fontSize: ".82rem" }}>{i.source_name}{i.published_at && ` · ${new Date(i.published_at).toLocaleDateString()}`}</div>
      {i.excerpt && <p>{i.excerpt}</p>}{i.topics.map(t => <span className="pill" key={t}>{t}</span>)}</div>)}</>);
}
