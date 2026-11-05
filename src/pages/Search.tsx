import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProperties, PropertyRow } from "../lib/data";
import { lineFor, matchProps } from "../lib/lines";

export default function Search() {
  const [q, setQ] = useState(""); const [props, setProps] = useState<PropertyRow[] | null>(null); const [err, setErr] = useState("");
  useEffect(() => { listProperties().then(setProps).catch(e => setErr((e as Error).message)); }, []);
  const hits = props ? matchProps(props, q) : [];
  return (<>
    <p className="eyebrow">Your portfolio</p><h1>Search properties</h1>
    <input autoFocus aria-label="Search your properties" placeholder="Name, address or borough" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 420, marginTop: 8 }} />
    {err && <p className="err">{err}</p>}
    {props && props.length === 0 && <div className="card">No properties yet. <Link to="/add">Add one</Link>.</div>}
    {props && props.length > 0 && hits.length === 0 && <p className="note">No properties match “{q}”.</p>}
    <div className="list" style={{ marginTop: 18 }}>{hits.map(p => { const [l, c] = lineFor(p.borough);
      return <Link key={p.id} to={`/property/${p.id}`} className="item" style={{ gridTemplateColumns: "48px 1fr 16px" }}>
        <div className="bul" style={{ background: c }}>{l}</div><div><div className="name">{p.nickname || p.address}</div><div className="addr">{p.nickname ? p.address : p.borough}</div></div><span style={{ color: "var(--muted)" }}>›</span></Link>; })}</div></>);
}
