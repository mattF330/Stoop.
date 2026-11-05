import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listProperties, PropertyRow } from "../lib/data";

// Search your own portfolio by nickname, address or borough.
export const matchProps = (props: PropertyRow[], q: string) => {
  const t = q.trim().toLowerCase(); if (!t) return [];
  return props.filter(p => `${p.nickname ?? ""} ${p.address} ${p.borough ?? ""}`.toLowerCase().includes(t));
};

export default function PropertySearch() {
  const nav = useNavigate(); const [q, setQ] = useState(""); const [props, setProps] = useState<PropertyRow[]>([]); const [open, setOpen] = useState(false); const box = useRef<HTMLDivElement>(null);
  const load = () => listProperties().then(setProps).catch(() => setProps([]));
  useEffect(() => { load(); }, []);
  useEffect(() => { const f = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f); }, []);
  const hits = matchProps(props, q).slice(0, 6);
  const go = (p: PropertyRow) => { setQ(""); setOpen(false); nav(`/property/${p.id}`); };
  return (<div className="psearch" ref={box}>
    <input aria-label="Search your properties" placeholder="Search properties" value={q}
      onFocus={() => { load(); setOpen(true); }} onChange={e => { setQ(e.target.value); setOpen(true); }}
      onKeyDown={e => { if (e.key === "Enter" && hits[0]) go(hits[0]); if (e.key === "Escape") setOpen(false); }} />
    {open && q.trim() && <div className="pres">
      {hits.map(p => <button key={p.id} type="button" onClick={() => go(p)}><b>{p.nickname || p.address}</b><span>{p.nickname ? p.address : p.borough}</span></button>)}
      {hits.length === 0 && <div className="pnone">No match in your portfolio.<br /><Link to="/add" onClick={() => { setOpen(false); setQ(""); }}>Add a property</Link></div>}
    </div>}
  </div>);
}
