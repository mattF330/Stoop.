import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { insertMany, listProperties, listFor, PropertyRow, UnitRow } from "../lib/data";
import { searchAddress } from "../lib/api";
import { boroughOf } from "../lib/lines";
import { supabase } from "../lib/supabase";
import { FIELDS, Kind, parseCsv, guessMapping, buildRows, TEMPLATES, BLOCKED_HEADER, BOROUGHS } from "../lib/import";

const uid = async () => (await supabase.auth.getUser()).data.user!.id;
const KIND_LABEL: Record<Kind, string> = { properties: "Properties (several buildings at once)", units: "Units & rents (rent roll)", expenses: "Yearly operating expenses", maintenance: "Maintenance / repair records" };
const MAX_ROWS = 500; const MAX_PROPS = 100;
interface Resolved { line: number; input: string; label: string; bbl: string | null; bin: string | null; borough: string | null; matched: boolean; row: Record<string, any>; note: string; ok: boolean; }

export function ImportPage() {
  const [props, setProps] = useState<PropertyRow[]>([]); const [units, setUnits] = useState<UnitRow[]>([]); const [target, setTarget] = useState("");
  const [resolved, setResolved] = useState<Resolved[] | null>(null); const [prog, setProg] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { Promise.all([listProperties(), listFor<UnitRow>("units")]).then(([p, u]) => { setProps(p); setUnits(u); if (p[0]) setTarget(p[0].id); }).catch(x => setErr((x as Error).message)); }, []);
  const propertyId = target; const existingUnits = units.filter(u => u.property_id === target).map(u => u.label.toLowerCase());
  const run = async (f: () => Promise<unknown>) => { setErr(""); setBusy(true); try { await f(); } catch (x) { setErr((x as Error).message); } setBusy(false); };
  const [kind, setKind] = useState<Kind>("properties"); const [grid, setGrid] = useState<string[][] | null>(null); const [header, setHeader] = useState(true);
  const [map, setMap] = useState<string[]>([]); const [paste, setPaste] = useState(""); const [err, setErr] = useState(""); const [msg, setMsg] = useState("");
  const [off, setOff] = useState<Set<number>>(new Set()); const [monthly, setMonthly] = useState(false);
  const reset = () => { setResolved(null); setProg(""); setGrid(null); setMap([]); setOff(new Set()); setPaste(""); };
  const load = (g: string[][]) => { if (g.length < 1) { setErr("That file is empty."); return; } if (g.length > MAX_ROWS + 1) { setErr(`Too many rows (${MAX_ROWS} max).`); return; } setErr(""); setMsg(""); setGrid(g); setOff(new Set()); setMap(guessMapping(kind, g[0])); };
  const onFile = async (f: File | undefined) => {
    if (!f) return; setErr(""); if (f.size > 2 * 1024 * 1024) return setErr("File is too large (2 MB max).");
    try {
      if (/\.xlsx$/i.test(f.name)) { const { default: readXlsx } = await import("read-excel-file"); const rows = await readXlsx(f); load(rows.map(r => r.map(c => c instanceof Date ? c.toISOString().slice(0, 10) : c == null ? "" : String(c)))); }
      else if (/\.(csv|tsv|txt)$/i.test(f.name)) load(parseCsv(await f.text()));
      else setErr("Use a .csv, .tsv or .xlsx file. (Older .xls: open it and Save As .csv first.)");
    } catch (x) { setErr("Couldn’t read that file. Check that it’s a valid spreadsheet or CSV. If it came from another program, open it in Excel or Sheets and save it as .csv. (" + ((x as Error).message || "unknown error").slice(0, 120) + ")"); }
  };
  const body = grid ? (header ? grid.slice(1) : grid) : []; const heads = grid ? (header ? grid[0] : grid[0].map((_, i) => "Column " + (i + 1))) : [];
  useEffect(() => { if (grid && header) setMap(guessMapping(kind, grid[0])); }, [kind, header]);
  const parsed = grid ? buildRows(kind, body, map, monthly) : [];
  const chosen = parsed.filter((p, i) => !off.has(i) && p.problems.length === 0);
  const dupUnits = kind === "units" ? chosen.filter(p => existingUnits.includes(String(p.row.label).toLowerCase())) : [];
  const toSave = chosen.filter(p => !dupUnits.includes(p));
  const missingRequired = FIELDS[kind].filter(f => f.required && !map.includes(f.key));
  const lookup = () => run(async () => {
    const existing = await listProperties(); const seenBbl = new Set(existing.map(p => p.bbl).filter(Boolean)); const seenAddr = new Set(existing.map(p => p.address.toLowerCase()));
    const rows = toSave.slice(0, MAX_PROPS); const out: Resolved[] = new Array(rows.length); let done = 0, next = 0;
    const work = async () => { while (next < rows.length) { const i = next++; const r = rows[i].row; const q = r.address + (r.borough && !r.address.toLowerCase().includes(r.borough.toLowerCase()) ? `, ${r.borough}` : "");
      let res: Resolved = { line: rows[i].line, input: r.address, label: r.address, bbl: null, bin: null, borough: r.borough ?? boroughOf(null, r.address), matched: false, row: r, note: "", ok: true };
      try { const c = (await searchAddress(q)).candidates[0]; if (c) res = { ...res, label: c.label, bbl: c.bbl, bin: c.bin, borough: c.borough ?? res.borough, matched: true }; } catch { /* fall back to manual below */ }
      if (!res.matched) { res.note = res.borough ? "No city match; will be added as typed" : "No city match. Choose a borough to add it"; res.ok = Boolean(res.borough); }
      else if ((res.bbl && seenBbl.has(res.bbl)) || seenAddr.has(res.label.toLowerCase())) { res.note = "Already in your portfolio, skipping"; res.ok = false; }
      else { if (res.bbl) seenBbl.add(res.bbl); seenAddr.add(res.label.toLowerCase()); }
      out[i] = res; setProg(`Looking up addresses… ${++done} of ${rows.length}`); } };
    await Promise.all([work(), work(), work(), work()]); setProg(""); setResolved(out);
  });
  const addProps = () => run(async () => {
    const u = await uid(); const list = (resolved ?? []).filter(r => r.ok);
    await insertMany("properties", list.map(r => ({ user_id: u, address: r.label, nickname: r.row.nickname ?? null, borough: r.borough, bbl: r.bbl, bin: r.bin, units_residential: r.row.units_residential ?? null, purchase_price: r.row.purchase_price ?? null, purchase_date: r.row.purchase_date ?? null, current_value: r.row.current_value ?? null })));
    setMsg(`Added ${list.length} propert${list.length === 1 ? "y" : "ies"} to your portfolio. City data fills in when you open each one.`); reset();
  });
  const save = () => run(async () => {
    const u = await uid(); const base = { user_id: u, property_id: propertyId };
    const rows = toSave.map(p => {
      const r = p.row;
      if (kind === "units") return { ...base, label: r.label, tenant_name: r.tenant_name ?? null, monthly_rent: r.monthly_rent, lease_end: r.lease_end ?? null };
      if (kind === "expenses") return { ...base, category: r.category, annual_amount: r.annual_amount, is_estimate: false };
      return { ...base, logged_on: r.logged_on, title: r.title, contractor: r.contractor ?? null, cost: r.cost, counts_in_costs: true };
    });
    await insertMany(kind === "units" ? "units" : kind === "expenses" ? "expenses" : "maintenance_log", rows);
    setMsg(`Imported ${rows.length} row${rows.length === 1 ? "" : "s"}${dupUnits.length ? `; skipped ${dupUnits.length} unit${dupUnits.length === 1 ? "" : "s"} that already exist` : ""}. Nothing else from the file was kept.`); reset();
  });
  return (<><h1>Import from a spreadsheet</h1><div className="card">
    <p className="note">Rambl reads your file <b>in your browser</b> and saves only the rows you confirm below. The file itself is never uploaded or stored. Use your own records, and leave out account numbers, SSNs and anything else sensitive.</p>
    {msg && <p className="note" style={{ color: "var(--good)" }}>{msg}</p>}{err && <p className="err">{err}</p>}
    <div className="row"><div><label>What are you importing?<select value={kind} onChange={e => { setKind(e.target.value as Kind); reset(); }}>{(Object.keys(KIND_LABEL) as Kind[]).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></label></div>
      <div><label>Spreadsheet or CSV file<input type="file" accept=".csv,.tsv,.txt,.xlsx" onChange={e => { onFile(e.target.files?.[0]); e.target.value = ""; }} /></label></div>
      {kind !== "properties" && <div><label>For which property?<select value={target} onChange={e => setTarget(e.target.value)}>{props.map(p => <option key={p.id} value={p.id}>{p.nickname || p.address}</option>)}</select></label></div>}
      <button className="ghost" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([TEMPLATES[kind]], { type: "text/csv" })); a.download = `rambl-${kind}-template.csv`; a.click(); }}>Download template</button></div>
    {kind !== "properties" && !props.length && <p className="note">Add a property first, then import its units, expenses or maintenance records here.</p>}
    {!grid && <><label style={{ marginTop: 12, display: "block" }}>…or paste rows copied from a spreadsheet<textarea rows={4} value={paste} onChange={e => setPaste(e.target.value)} placeholder={kind === "properties" ? "Address	Borough	Units&#10;123 Atlantic Ave	Brooklyn	6" : "Unit	Tenant	Rent&#10;1A	Jane	2500"} /></label>
      <p><button disabled={!paste.trim()} onClick={() => load(parseCsv(paste))}>Preview pasted rows</button></p></>}
    {grid && <>
      <div className="row" style={{ marginTop: 14 }}><label style={{ display: "flex", gap: 6 }}><input type="checkbox" style={{ width: "auto" }} checked={header} onChange={e => setHeader(e.target.checked)} />First row is column headings</label>
        {kind === "expenses" && <label style={{ display: "flex", gap: 6 }}><input type="checkbox" style={{ width: "auto" }} checked={monthly} onChange={e => setMonthly(e.target.checked)} />Amounts are monthly (×12)</label>}
        <button className="ghost" onClick={reset}>Start over</button></div>
      <p className="note">Match each column to a field. Columns that look like account numbers are skipped automatically.</p>
      <div style={{ overflowX: "auto" }}><table><thead><tr><th />{heads.map((h, c) => <th key={c}>{h || `Column ${c + 1}`}<select value={map[c] ?? ""} disabled={BLOCKED_HEADER.test(h)} onChange={e => setMap(map.map((m, i) => (i === c ? e.target.value : m === e.target.value && e.target.value ? "" : m)))}><option value="">— skip —</option>{FIELDS[kind].map(f => <option key={f.key} value={f.key}>{f.label}</option>)}</select></th>)}<th>Check</th></tr></thead>
        <tbody>{parsed.slice(0, 60).map((p, i) => <tr key={i} style={{ opacity: p.problems.length ? 0.55 : 1 }}>
          <td><input type="checkbox" style={{ width: "auto" }} disabled={p.problems.length > 0} checked={p.problems.length === 0 && !off.has(i)} onChange={e => setOff(s => { const n = new Set(s); e.target.checked ? n.delete(i) : n.add(i); return n; })} aria-label={`Include row ${p.line}`} /></td>
          {body[i].map((c, ci) => <td key={ci}>{ci < heads.length ? c : null}</td>)}<td className="note" style={{ margin: 0 }}>{p.problems.length ? p.problems.join("; ") : dupUnits.includes(p) ? "Already exists, will skip" : "OK"}</td></tr>)}</tbody></table></div>
      {parsed.length > 60 && <p className="note">Showing the first 60 of {parsed.length} rows. All rows without problems will be imported.</p>}
      {missingRequired.length > 0 && <p className="err">Match a column to: {missingRequired.map(f => f.label).join(", ")}.</p>}
      {kind === "properties" && resolved && <ResolvedTable list={resolved} setList={setResolved} />}
      {kind === "properties" && !resolved && <p><button disabled={busy || !toSave.length || missingRequired.length > 0} onClick={lookup}>Look up {Math.min(toSave.length, MAX_PROPS)} address{toSave.length === 1 ? "" : "es"}</button> {prog && <span className="note">{prog}</span>}</p>}
      {kind === "properties" && resolved && <p><button disabled={busy || !resolved.some(r => r.ok)} onClick={addProps}>Add {resolved.filter(r => r.ok).length} to my portfolio</button> <button className="ghost" onClick={() => setResolved(null)}>Back</button></p>}
      {kind !== "properties" && <p><button disabled={busy || !toSave.length || missingRequired.length > 0 || !target} onClick={save}>Import {toSave.length} row{toSave.length === 1 ? "" : "s"}</button> <span className="note">Rows with problems are left out; fix the file or edit the values and try again.</span></p>}</>}
    <p className="note">Imported figures are whatever your file says. Rambl doesn’t verify them. {kind === "properties" && "Addresses are matched to NYC records by GeoSearch, which can pick the wrong lot, so check each match before adding. "}{kind === "expenses" && "Categories are matched by keyword; check them on the Costs tab."}</p></div></>);
}
function ResolvedTable({ list, setList }: { list: Resolved[]; setList: (l: Resolved[]) => void }) {
  return (<div style={{ overflowX: "auto", marginTop: 12 }}><p className="note">Check each match. Untick anything that looks wrong; you can also add it by hand later.</p>
    <table><thead><tr><th /><th>You entered</th><th>Matched to</th><th>Borough</th><th>Status</th></tr></thead><tbody>{list.map((r, i) => <tr key={i} style={{ opacity: r.ok ? 1 : 0.55 }}>
      <td><input type="checkbox" style={{ width: "auto" }} checked={r.ok} disabled={r.note.startsWith("Already") || (!r.matched && !r.borough)} onChange={e => setList(list.map((x, j) => (j === i ? { ...x, ok: e.target.checked } : x)))} aria-label={`Include ${r.input}`} /></td>
      <td>{r.input}</td><td>{r.matched ? r.label : "—"}</td><td>{r.matched ? r.borough ?? "—" : <select aria-label={`Borough for ${r.input}`} value={r.borough ?? ""} onChange={e => { const b = e.target.value || null; setList(list.map((x, j) => (j === i ? { ...x, borough: b, ok: Boolean(b), note: b ? "No city match; will be added as typed" : "No city match. Choose a borough to add it" } : x))); }}><option value="">Choose borough</option>{BOROUGHS.map(b => <option key={b}>{b}</option>)}</select>}</td><td className="note" style={{ margin: 0 }}>{r.note || (r.matched ? "City record found" : "")}</td></tr>)}</tbody></table></div>);
}
