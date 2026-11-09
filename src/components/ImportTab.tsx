import { useEffect, useState } from "react";
import { insertMany } from "../lib/data";
import { supabase } from "../lib/supabase";
import { FIELDS, Kind, parseCsv, guessMapping, buildRows, TEMPLATES, BLOCKED_HEADER } from "../lib/import";

const uid = async () => (await supabase.auth.getUser()).data.user!.id;
const KIND_LABEL: Record<Kind, string> = { units: "Units & rents (rent roll)", expenses: "Yearly operating expenses", maintenance: "Maintenance / repair records" };
const MAX_ROWS = 500;

export function ImportTab({ propertyId, existingUnits, run }: { propertyId: string; existingUnits: string[]; run: (f: () => Promise<unknown>) => void }) {
  const [kind, setKind] = useState<Kind>("units"); const [grid, setGrid] = useState<string[][] | null>(null); const [header, setHeader] = useState(true);
  const [map, setMap] = useState<string[]>([]); const [paste, setPaste] = useState(""); const [err, setErr] = useState(""); const [msg, setMsg] = useState("");
  const [off, setOff] = useState<Set<number>>(new Set()); const [monthly, setMonthly] = useState(false);
  const reset = () => { setGrid(null); setMap([]); setOff(new Set()); setPaste(""); };
  const load = (g: string[][]) => { if (g.length < 1) { setErr("That file is empty."); return; } if (g.length > MAX_ROWS + 1) { setErr(`Too many rows (${MAX_ROWS} max).`); return; } setErr(""); setMsg(""); setGrid(g); setOff(new Set()); setMap(guessMapping(kind, g[0])); };
  const onFile = async (f: File | undefined) => {
    if (!f) return; setErr(""); if (f.size > 2 * 1024 * 1024) return setErr("File is too large (2 MB max).");
    try {
      if (/\.xlsx$/i.test(f.name)) { const { default: readXlsx } = await import("read-excel-file"); const rows = await readXlsx(f); load(rows.map(r => r.map(c => c instanceof Date ? c.toISOString().slice(0, 10) : c == null ? "" : String(c)))); }
      else if (/\.(csv|tsv|txt)$/i.test(f.name)) load(parseCsv(await f.text()));
      else setErr("Use a .csv, .tsv or .xlsx file. (Older .xls: open it and Save As .csv first.)");
    } catch { setErr("Couldn’t read that file. Check that it’s a valid spreadsheet or CSV."); }
  };
  const body = grid ? (header ? grid.slice(1) : grid) : []; const heads = grid ? (header ? grid[0] : grid[0].map((_, i) => "Column " + (i + 1))) : [];
  useEffect(() => { if (grid && header) setMap(guessMapping(kind, grid[0])); }, [kind, header]);
  const parsed = grid ? buildRows(kind, body, map, monthly) : [];
  const chosen = parsed.filter((p, i) => !off.has(i) && p.problems.length === 0);
  const dupUnits = kind === "units" ? chosen.filter(p => existingUnits.includes(String(p.row.label).toLowerCase())) : [];
  const toSave = chosen.filter(p => !dupUnits.includes(p));
  const missingRequired = FIELDS[kind].filter(f => f.required && !map.includes(f.key));
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
  return (<div className="card"><h2>Import from a spreadsheet</h2>
    <p className="note">Rambl reads your file <b>in your browser</b> and saves only the rows you confirm below. The file itself is never uploaded or stored. Use your own records, and leave out account numbers, SSNs and anything else sensitive.</p>
    {msg && <p className="note" style={{ color: "var(--good)" }}>{msg}</p>}{err && <p className="err">{err}</p>}
    <div className="row"><div><label>What are you importing?<select value={kind} onChange={e => { setKind(e.target.value as Kind); reset(); }}>{(Object.keys(KIND_LABEL) as Kind[]).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></label></div>
      <div><label>Spreadsheet or CSV file<input type="file" accept=".csv,.tsv,.txt,.xlsx" onChange={e => { onFile(e.target.files?.[0]); e.target.value = ""; }} /></label></div>
      <button className="ghost" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([TEMPLATES[kind]], { type: "text/csv" })); a.download = `rambl-${kind}-template.csv`; a.click(); }}>Download template</button></div>
    {!grid && <><label style={{ marginTop: 12, display: "block" }}>…or paste rows copied from a spreadsheet<textarea rows={4} value={paste} onChange={e => setPaste(e.target.value)} placeholder="Unit	Tenant	Rent&#10;1A	Jane	2500" /></label>
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
      <p><button disabled={!toSave.length || missingRequired.length > 0} onClick={save}>Import {toSave.length} row{toSave.length === 1 ? "" : "s"}</button> <span className="note">Rows with problems are left out; fix the file or edit the values and try again.</span></p></>}
    <p className="note">Imported figures are whatever your file says. Rambl doesn’t verify them. {kind === "expenses" && "Categories are matched by keyword; check them on the Costs tab."}</p></div>);
}

