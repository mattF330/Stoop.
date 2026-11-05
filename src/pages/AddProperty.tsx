import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchAddress, Candidate } from "../lib/api";
import { insertRow, listProperties } from "../lib/data";
import { supabase } from "../lib/supabase";
import { SourceTag } from "../components/Disclaimers";

export default function AddProperty() {
  const nav = useNavigate();
  const [q, setQ] = useState(""); const [cands, setCands] = useState<Candidate[] | null>(null); const [sel, setSel] = useState<Candidate | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [own, setOwn] = useState(false); const [nick, setNick] = useState(""); const [manualAddr, setManualAddr] = useState(false);

  const search = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setErr(""); setCands(null); setSel(null);
    try { setCands((await searchAddress(q)).candidates); } catch (x) { setErr((x as Error).message); } setBusy(false); };
  const pick = (c: Candidate) => { window.scrollTo(0, 0); setSel(c); setErr(""); };

  const save = async () => {
    if (!sel || !own || !sel.label.trim() || (manualAddr && !sel.borough)) return; setBusy(true); setErr("");
    try {
      const existing = sel.bbl ? (await listProperties()).find(p => p.bbl === sel.bbl) : null;
      if (existing) throw new Error("You already added this property.");
      const { data: u } = await supabase.auth.getUser();
      const row = await insertRow("properties", { user_id: u.user!.id, address: sel.label, nickname: nick || null, borough: sel.borough, bbl: sel.bbl, bin: sel.bin, });
      nav(`/property/${row.id}`);
    } catch (x) { setErr((x as Error).message); setBusy(false); }
  };

  return (<><h1>Search properties</h1><p className="muted">Find an NYC address to add to your portfolio.</p>
    {sel && <div className="card"><div className="row" style={{ alignItems: "center" }}><h2 style={{ margin: 0 }}>{sel.label || "New property"}</h2><button className="ghost sm" type="button" onClick={() => { setSel(null); setManualAddr(false); }}>Change address</button></div>
      {manualAddr && <><label>Street address<input value={sel.label} onChange={e => setSel({ ...sel, label: e.target.value })} placeholder="e.g. 123 Atlantic Ave, Brooklyn, NY" /></label>
      <label>Borough (required)<select required value={sel.borough ?? ""} onChange={e => setSel({ ...sel, borough: e.target.value || null })}><option value="">Select borough</option>{["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"].map(b => <option key={b}>{b}</option>)}</select></label></>}
      <label>Nickname (optional)<input value={nick} onChange={e => setNick(e.target.value)} /></label>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" style={{ width: "auto" }} checked={own} onChange={e => setOwn(e.target.checked)} />I own or manage this property. Rambl does not verify ownership.</label>
      {manualAddr && !sel.borough && <p className="note">Choose the borough to continue.</p>}
      <p><button onClick={save} disabled={!own || busy || !sel?.label.trim() || (manualAddr && !sel?.borough)}>Add to portfolio</button></p></div>}
    {!sel && <form className="card" onSubmit={search}><label>Street address (any NYC borough)</label>
      <div className="row"><input aria-label="Street address" value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. 123 Atlantic Ave Brooklyn" minLength={3} required /><button disabled={busy}>Search</button></div>
      <SourceTag id="geosearch" /></form>}
    {err && <p className="err">{err}</p>}
    {!sel && cands && cands.length === 0 && <div className="card">No matches. Check the spelling or add the borough. Long Island addresses aren’t covered.</div>}
    {!sel && cands && cands.map((c, i) => <div key={i} className="card row"><div>{c.label}{!c.bbl && <div className="note">No tax-lot ID returned for this match.</div>}</div><button className="ghost" onClick={() => pick(c)}>Select</button></div>)}
    {!sel && !manualAddr && <p><a href="#" onClick={e => { e.preventDefault(); setManualAddr(true); setSel({ label: q, bbl: null, borough: null, bin: null, lat: null, lng: null }); }}>Can’t find it? Add manually</a></p>}
  </>);
}
