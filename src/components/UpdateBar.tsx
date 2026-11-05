import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { listFor, listProperties, UnitRow } from "../lib/data";
import { loadPrefs, savePrefs } from "../lib/prefs";
import { lineFor } from "../lib/lines";
import { isRelevant } from "../../supabase/functions/_shared/relevance";

interface Entry { key: string; letter: string; color: string; text: string; href?: string; to?: string; }
const DAY = 864e5;

export default function UpdateBar() {
  const [show, setShow] = useState(loadPrefs().showBar);
  const [items, setItems] = useState<Entry[]>([]);
  useEffect(() => { const f = () => setShow(loadPrefs().showBar); window.addEventListener("stoop-prefs", f); return () => window.removeEventListener("stoop-prefs", f); }, []);
  useEffect(() => {
    if (!show) return; let off = false;
    (async () => {
      const out: Entry[] = [];
      try {
        const [props, units] = await Promise.all([listProperties(), listFor<UnitRow>("units")]);
        const now = Date.now();
        for (const u of units) {
          if (!u.lease_end) continue; const days = Math.ceil((new Date(u.lease_end).getTime() - now) / DAY);
          if (days < 0 || days > 60) continue;
          const p = props.find(x => x.id === u.property_id); if (!p) continue;
          const [l, c] = lineFor(p.borough, p.address);
          out.push({ key: "u" + u.id, letter: l, color: c, text: `${p.nickname || p.address}, ${u.label}: lease ends in ${days} day${days === 1 ? "" : "s"}`, to: `/property/${p.id}` });
        }
      } catch { /* property alerts are optional */ }
      try {
        const { data } = await supabase.from("news_items").select("id,title,url,excerpt,source_name").gte("published_at", new Date(Date.now() - 7 * DAY).toISOString()).order("score", { ascending: false }).limit(60);
        for (const n of ((data as any[]) ?? []).filter(i => isRelevant(i.title, i.excerpt, i.source_name)).slice(0, 8)) out.push({ key: "n" + n.id, letter: "N", color: "#EE352E", text: n.title, href: n.url });
      } catch { /* news is optional */ }
      if (!off) setItems(out);
    })();
    return () => { off = true; };
  }, [show]);
  if (!show || items.length === 0) return null;
  const reps = Math.ceil(6 / items.length);
  const row = (suffix: string) => Array.from({ length: reps }, (_, r) => items.map(i => ({ ...i, key: i.key + r }))).flat().map(i => {
    const inner = <><b style={{ background: i.color }}>{i.letter}</b>{i.text}</>;
    return i.to ? <Link key={i.key + suffix} className="it" to={i.to}>{inner}</Link> : <a key={i.key + suffix} className="it" href={i.href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  });
  return (<div className="ubar" role="region" aria-label="Updates">
    <div className="lab" title="Headlines come from public news feeds and may be incomplete or inaccurate. Verify with the original source.">Updates</div>
    <div className="win"><div className="trk">{row("a")}<span aria-hidden="true" className="gap" />{row("b")}</div></div>
    <button className="x" aria-label="Hide updates bar" title="Hide (turn back on in Settings, Appearance)" onClick={() => savePrefs({ ...loadPrefs(), showBar: false })}>×</button>
  </div>);
}
