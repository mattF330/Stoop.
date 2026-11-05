import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchAddress, lookupBBL, Candidate, Bundle } from "../lib/api";
import { insertRow, listProperties } from "../lib/data";
import { supabase } from "../lib/supabase";
import { SourceTag, SectionNote } from "../components/Disclaimers";

export default function AddProperty() {
  const nav = useNavigate();
  const [q, setQ] = useState(""); const [cands, setCands] = useState<Candidate[] | null>(null); const [sel, setSel] = useState<Candidate | null>(null);
  const [bundle, setBundle] = useState<Bundle | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [own, setOwn] = useState(false); const [nick, setNick] = useState(""); const [manualAddr, setManualAddr] = useState(false);

  const search = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setErr(""); setCands(null); setSel(null); setBundle(null);
    try { setCands((await searchAddress(q)).candidates); } catch (x) { setErr((x as Error).message); } setBusy(false); };
  const pick = async (c: Candidate) => { window.scrollTo(0, 0); setSel(c); setBundle(null); setErr(""); if (!c.bbl) return; setBusy(true);
    try { setBundle(await lookupBBL(c.bbl)); } catch (x) { setErr(`Couldn’t load public records (${(x as Error).message}). You can still add the property manually.`); } setBusy(false); };

  const save = async () => {
    if (!sel || !own) return; setBusy(true); setErr("");
    try {
      const existing = sel.bbl ? (await listProperties()).find(p => p.bbl === sel.bbl) : null;
      if (existing && !bundle?.pluto?.isCondoOrCoop) throw new Error("You already added this lot.");
      const { data: u } = await supabase.auth.getUser();
      const pl = bundle?.pluto;
      const row = await insertRow("properties", { user_id: u.user!.id, address: sel.label, nickname: nick || null, borough: sel.borough, bbl: sel.bbl, bin: sel.bin,
        property_type: pl?.bldgClass ?? null, is_condo_coop: Boolean(pl?.isCondoOrCoop), units_residential: pl?.unitsRes ?? null, year_built: pl?.yearBuilt ?? null });
      nav(`/property/${row.id}`);
    } catch (x) { setErr((x as Error).message); setBusy(false); }
  };

  return (<><h1>Add a property</h1>
    {sel && <div className="card"><div className="row" style={{ alignItems: "center" }}><h2 style={{ margin: 0 }}>{sel.label}</h2><button className="ghost sm" type="button" onClick={() => { setSel(null); setBundle(null); }}>Change address</button></div>
      {busy && !bundle && <p>Loading public records…</p>}
      {bundle?.pluto && <><table><tbody>
        <tr><th>Tax lot (BBL)</th><td>{sel.bbl}</td></tr><tr><th>Building class</th><td>{bundle.pluto.bldgClass ?? "—"}</td></tr>
        <tr><th>Residential units</th><td>{bundle.pluto.unitsRes ?? "—"}</td></tr><tr><th>Year built</th><td>{bundle.pluto.yearBuilt ?? "—"}</td></tr>
        <tr><th>Floors</th><td>{bundle.pluto.floors ?? "—"}</td></tr><tr><th>Zoning</th><td>{bundle.pluto.zoning ?? "—"}</td></tr></tbody></table>
        <SourceTag id="pluto" asOf={bundle.fetchedAt} /><SectionNote id="pluto" />
        {bundle.pluto.isCondoOrCoop && <p className="note">This looks like a condo or co-op building. The lot may contain many separately owned units — confirm your unit before adding.</p>}</>}
      {bundle && !bundle.pluto && <p className="note">No PLUTO record was found for this lot. You can still add it manually.</p>}
      <label>Nickname (optional)<input value={nick} onChange={e => setNick(e.target.value)} /></label>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" style={{ width: "auto" }} checked={own} onChange={e => setOwn(e.target.checked)} />I own or manage this property. Rambl does not verify ownership.</label>
      <p><button onClick={save} disabled={!own || busy}>Add to portfolio</button></p></div>}
    {!sel && <form className="card" onSubmit={search}><label>Street address (any NYC borough)</label>
      <div className="row"><input aria-label="Street address" value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. 123 Atlantic Ave Brooklyn" minLength={3} required /><button disabled={busy}>Search</button></div>
      <SourceTag id="geosearch" /></form>}
    {err && <p className="err">{err}</p>}
    {!sel && cands && cands.length === 0 && <div className="card">No matches. Check the spelling or add the borough. Long Island addresses aren’t covered.</div>}
    {!sel && cands && cands.map((c, i) => <div key={i} className="card row"><div>{c.label}{!c.bbl && <div className="note">No tax-lot ID returned for this match.</div>}</div><button className="ghost" onClick={() => pick(c)}>Select</button></div>)}
    {!sel && !manualAddr && <p><a href="#" onClick={e => { e.preventDefault(); setManualAddr(true); setSel({ label: q, bbl: null, borough: null, bin: null, lat: null, lng: null }); }}>Can’t find it? Add manually</a></p>}
  </>);
}
