import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Brief } from "../../supabase/functions/_shared/brief";

const key = (d: string) => `rambl.brief.closed.${d}`;
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

// Pops open at the top of the News page once per day; can be closed and reopened.
export default function DailyBrief() {
  const [b, setB] = useState<Brief | null>(null); const [err, setErr] = useState(""); const [open, setOpen] = useState(false); const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("news-brief", { body: {} });
      if (error || !data) throw new Error(error?.message ?? "no data");
      setB(data as Brief);
      let closed = false; try { closed = localStorage.getItem(key(today())) === "1"; } catch { /* ignore */ }
      setOpen(!closed && ((data as Brief).sections?.length ?? 0) > 0);
    } catch (e) { setErr((e as Error).message); }
    setLoading(false);
  })(); }, []);
  const close = () => { setOpen(false); try { localStorage.setItem(key(today()), "1"); } catch { /* ignore */ } };
  const reopen = () => { setOpen(true); try { localStorage.removeItem(key(today())); } catch { /* ignore */ } };
  if (loading) return <p className="note">Preparing today’s briefing…</p>;
  if (err || !b) return <p className="note">Today’s briefing isn’t available right now.</p>;
  if (!open) return <p style={{ margin: "14px 0" }}><button className="ghost sm" onClick={reopen}>Show today’s briefing</button></p>;
  const ai = b.source === "ai";
  return (<section className="brief" aria-label="Daily briefing">
    <div className="brief-top"><span className="brief-badge">{ai ? "AI summary" : "Automated summary"}</span><span className="brief-date">{new Date(b.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
      <button className="brief-x" onClick={close} aria-label="Close briefing">×</button></div>
    <h2 className="brief-h">{b.headline}</h2>
    <p>{b.summary}</p>
    {b.sections.map(s => <div key={s.title} className="brief-sec"><h3>{s.title}</h3><ul>{s.bullets.map(x => <li key={x.url}><a href={x.url} target="_blank" rel="noopener noreferrer">{x.text}</a> <span className="brief-src">{x.source}</span></li>)}</ul></div>)}
    {b.takeaways.length > 0 && <div className="brief-sec"><h3>What it may mean for you</h3><ul>{b.takeaways.map(t => <li key={t}>{t}</li>)}</ul></div>}
    <p className="note" style={{ marginBottom: 0 }}>{ai ? "Written by AI from today’s headlines and excerpts only. " : "Built from today’s headlines. "}It can be incomplete or wrong and is not legal, tax or financial advice. Open the original articles to verify.</p>
  </section>);
}
