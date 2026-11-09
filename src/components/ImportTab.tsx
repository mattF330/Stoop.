import { useEffect, useState } from "react";
import { insertMany, listProperties, listFor, PropertyRow, UnitRow } from "../lib/data";
import { searchAddress } from "../lib/api";
import { boroughOf } from "../lib/lines";
import { supabase } from "../lib/supabase";
import { FIELDS, Kind, parseCsv, guessMapping, buildRows, TEMPLATES, BLOCKED_HEADER, BOROUGHS, yesNo } from "../lib/import";

const uid = async () => (await supabase.auth.getUser()).data.user!.id;
const KIND_LABEL: Record<Kind, string> = {
  properties: "Properties (several buildings at once)", units: "Units & rents (rent roll)", loans: "Loans", expenses: "Yearly operating expenses", maintenance: "Maintenance / repair records",
  vacancies: "Vacancies", reminders: "Reminders & dates", capital: "Capital reserve items", rent_history: "Rent history (past rents per unit)" };
const TABLE: Record<Exclude<Kind, "properties">, string> = { units: "units", loans: "loans", expenses: "expenses", maintenance: "maintenance_log", vacancies: "vacancies", reminders: "reminders", capital: "capital_items", rent_history: "rent_history" };
const MAX_ROWS = 500; const MAX_PROPS = 100;
interface Resolved { line: number; input: string; label: string; bbl: string | null; bin: string | null; borough: string | null; matched: boolean; row: Record<string, any>; note: string; ok: boolean; }

// Finds the property a row belongs to: exact nickname/address first, then a single partial match on the address.
function findProperty(props: PropertyRow[], name: string): PropertyRow | "ambiguous" | null {
  const t = name.trim().toLowerCase(); if (!t) return null;
  const exact = props.filter(p => (p.nickname ?? "").toLowerCase() === t || p.address.toLowerCase() === t); if (exact.length === 1) return exact[0];
  const part = props.filter(p => p.address.toLowerCase().startsWith(t) || (p.nickname ?? "").toLowerCase().includes(t) || p.address.toLowerCase().includes(t));
  return part.length === 1 ? part[0] : part.length > 1 ? "ambiguous" : null;
}

export function ImportPage() {
  const [props, setProps] = useState<PropertyRow[]>([]); const [units, setUnits] = useState<UnitRow[]>([]);
  const [resolved, setResolved] = useState<Resolved[] | null>(null); const [prog, setProg] = useState(""); const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<Kind>("properties"); const [grid, setGrid] = useState<string[][] | null>(null); const [header, setHeader] = useState(true);
  const [map, setMap] = useState<string[]>([]); const [paste, setPaste] = useState(""); const [err, setErr] = useState(""); const [msg, setMsg] = useState("");
  const [off, setOff] = useState<Set<number>>(new Set()); const [monthly, setMonthly] = useState(false); const [assign, setAssign] = useState<Record<number, string>>({});
  const loadAll = () => Promise.all([listProperties(), listFor<UnitRow>("units")]).then(([p, u]) => { setProps(p); setUnits(u); }).catch(x => setErr((x as Error).message));
  useEffect(() => { loadAll(); }, []);
  const run = async (f: () => Promise<unknown>) => { setErr(""); setBusy(true); try { await f(); } catch (x) { setErr((x as Error).message); } setBusy(false); };
  const reset = () => { setAssign({}); setResolved(null); setProg(""); setGrid(null); setMap([]); setOff(new Set()); setPaste(""); };
  const load = (g: string[][]) => { if (g.length < 1) { setErr("That file is empty."); return; } if (g.length > MAX_ROWS + 1) { setErr(`Too many rows (${MAX_ROWS} max).`); return; } setErr(""); setMsg(""); setGrid(g); setAssign({}); setOff(new Set()); setMap(guessMapping(kind, g[0])); };
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

  // Work out which property (and unit) each row belongs to, and flag rows that can't be placed.
  const placed = parsed.map((p, i) => {
    if (kind === "properties") return { pid: null as string | null, unit: null as UnitRow | null, extra: [] as string[], pname: "", portfolio: false, needsPick: false };
    const extra: string[] = []; let prop: PropertyRow | null = null; let portfolio = false; let needsPick = false;
    const named = String(p.row.property ?? "").trim(); const picked = assign[i];
    if (picked === "portfolio" && kind === "reminders") portfolio = true;
    else if (picked) { prop = props.find(x => x.id === picked) ?? null; }
    else if (named) { const f = findProperty(props, named); if (f === "ambiguous") { extra.push(`“${named}” matches more than one property. Pick one`); needsPick = true; } else if (!f) { extra.push(`“${named}” isn’t in your portfolio. Pick a property`); needsPick = true; } else prop = f; }
    else if (kind === "reminders") portfolio = true;
    else { extra.push("No address. Pick a property"); needsPick = true; }
    if (kind === "reminders" && !prop) needsPick = true; // reminders can always be re-pointed
    let unit: UnitRow | null = null;
    if (prop && (kind === "vacancies" || kind === "rent_history") && p.row.unit) { unit = units.find(u => u.property_id === prop!.id && u.label.toLowerCase() === String(p.row.unit).toLowerCase()) ?? null; if (!unit) extra.push(`Unit “${p.row.unit}” isn’t on that property`); }
    return { pid: prop?.id ?? null, unit, extra, pname: prop ? (prop.nickname || prop.address) : portfolio ? "whole portfolio" : "", portfolio, needsPick };
  });
  const problemsOf = (i: number) => [...(parsed[i]?.problems ?? []), ...(placed[i]?.extra ?? [])];
  const chosenIdx = parsed.map((_, i) => i).filter(i => !off.has(i) && problemsOf(i).length === 0);
  const isDup = (i: number) => kind === "units" && units.some(u => u.property_id === placed[i].pid && u.label.toLowerCase() === String(parsed[i].row.label).toLowerCase());
  const toSave = chosenIdx.filter(i => !isDup(i));
  const dupCount = chosenIdx.length - toSave.length;
  const missingRequired = FIELDS[kind].filter(f => f.required && !map.includes(f.key));

  const lookup = () => run(async () => {
    const existing = await listProperties(); const seenBbl = new Set(existing.map(p => p.bbl).filter(Boolean)); const seenAddr = new Set(existing.map(p => p.address.toLowerCase()));
    const rows = toSave.slice(0, MAX_PROPS).map(i => parsed[i]); const out: Resolved[] = new Array(rows.length); let done = 0, next = 0;
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
    await insertMany("properties", list.map(r => ({ user_id: u, address: r.label, nickname: r.row.nickname ?? null, borough: r.borough, bbl: r.bbl, bin: r.bin, units_residential: r.row.units_residential ?? null, purchase_price: r.row.purchase_price ?? null, purchase_date: r.row.purchase_date ?? null, current_value: r.row.current_value ?? null,
      property_type: r.row.property_type ?? null, year_built: r.row.year_built ?? null, cash_invested: r.row.cash_invested ?? null, ...(r.row.vacancy_pct != null ? { vacancy_pct: r.row.vacancy_pct } : {}), notes: r.row.notes ?? null })));
    setMsg(`Added ${list.length} propert${list.length === 1 ? "y" : "ies"} to your portfolio. City data fills in when you open each one.`); reset(); loadAll();
  });
  const save = () => run(async () => {
    const u = await uid(); const k = kind as Exclude<Kind, "properties">;
    const rows = toSave.map(i => {
      const r = parsed[i].row; const pl = placed[i]; const base = { user_id: u, property_id: pl.pid };
      switch (k) {
        case "units": return { ...base, label: r.label, tenant_name: r.tenant_name ?? null, monthly_rent: r.monthly_rent, lease_end: r.lease_end ?? null, is_stabilized: yesNo(r.is_stabilized) };
        case "loans": return { ...base, lender: r.lender ?? null, principal: r.principal, rate_pct: r.rate_pct, term_years: r.term_years, start_date: r.start_date };
        case "expenses": return { ...base, category: r.category, annual_amount: r.annual_amount, is_estimate: yesNo(r.is_estimate) ?? false };
        case "maintenance": return { ...base, logged_on: r.logged_on, title: r.title, contractor: r.contractor ?? null, category: r.category ?? null, cost: r.cost, counts_in_costs: true };
        case "vacancies": return { ...base, unit_id: pl.unit!.id, start_date: r.start_date, end_date: r.end_date ?? null, monthly_rent: r.monthly_rent ?? Number(pl.unit!.monthly_rent), notes: r.notes ?? null };
        case "reminders": return { user_id: u, property_id: pl.pid, kind: r.kind, title: r.title, due_date: r.due_date, notes: r.notes ?? null, repeat: r.repeat };
        case "capital": return { ...base, name: r.name, installed_year: r.installed_year, lifespan_years: r.lifespan_years, replacement_cost: r.replacement_cost, saved_so_far: r.saved_so_far ?? 0 };
        case "rent_history": return { ...base, unit_id: pl.unit!.id, effective_date: r.effective_date, monthly_rent: r.monthly_rent, tenant_name: r.tenant_name ?? null, lease_end: r.lease_end ?? null, note: r.note ?? null };
      }
    });
    await insertMany(TABLE[k], rows);
    setMsg(`Imported ${rows.length} row${rows.length === 1 ? "" : "s"}${dupCount ? `; skipped ${dupCount} unit${dupCount === 1 ? "" : "s"} that already exist` : ""}. Nothing else from the file was kept.`); reset(); loadAll();
  });
  const shown = parsed.slice(0, 60);
  return (<><h1>Import from a spreadsheet</h1><div className="card">
    <p className="note">Rambl reads your file <b>in your browser</b> and saves only the rows you confirm below. The file itself is never uploaded or stored. Use your own records, and leave out account numbers, SSNs and anything else sensitive.</p>
    <p className="note">Every row needs an <b>Address</b> column (your property’s address or nickname), so one file can cover several buildings. If a row’s address isn’t found, pick the property from the dropdown in that row. Import <b>Properties</b> first, then everything else. For reminders, leave Address blank for a whole-portfolio reminder.</p>
    {msg && <p className="note" style={{ color: "var(--good)" }}>{msg}</p>}{err && <p className="err">{err}</p>}
    <div className="row"><div><label>What are you importing?<select value={kind} onChange={e => { setKind(e.target.value as Kind); reset(); }}>{(Object.keys(KIND_LABEL) as Kind[]).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></label></div>
      <div><label>Spreadsheet or CSV file<input type="file" accept=".csv,.tsv,.txt,.xlsx" onChange={e => { onFile(e.target.files?.[0]); e.target.value = ""; }} /></label></div>
      <button className="ghost" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([TEMPLATES[kind]], { type: "text/csv" })); a.download = `rambl-${kind}-template.csv`; a.click(); }}>Download template</button></div>
    {kind !== "properties" && !props.length && <p className="note">Add or import a property first, then bring in everything else.</p>}
    {!grid && <><label style={{ marginTop: 12, display: "block" }}>…or paste rows copied from a spreadsheet<textarea rows={4} value={paste} onChange={e => setPaste(e.target.value)} placeholder="Copy rows (with the heading row) from your spreadsheet and paste here" /></label>
      <p><button disabled={!paste.trim()} onClick={() => load(parseCsv(paste))}>Preview pasted rows</button></p></>}
    {grid && <>
      <div className="row" style={{ marginTop: 14 }}><label style={{ display: "flex", gap: 6 }}><input type="checkbox" style={{ width: "auto" }} checked={header} onChange={e => setHeader(e.target.checked)} />First row is column headings</label>
        {kind === "expenses" && <label style={{ display: "flex", gap: 6 }}><input type="checkbox" style={{ width: "auto" }} checked={monthly} onChange={e => setMonthly(e.target.checked)} />Amounts are monthly (×12)</label>}
        <button className="ghost" onClick={reset}>Start over</button></div>
      <p className="note">Match each column to a field. Columns that look like account numbers are skipped automatically.</p>
      <div style={{ overflowX: "auto" }}><table><thead><tr><th />{heads.map((h, c) => <th key={c}>{h || `Column ${c + 1}`}<select value={map[c] ?? ""} disabled={BLOCKED_HEADER.test(h)} onChange={e => setMap(map.map((m, i) => (i === c ? e.target.value : m === e.target.value && e.target.value ? "" : m)))}><option value="">— skip —</option>{FIELDS[kind].map(f => <option key={f.key} value={f.key}>{f.label}</option>)}</select></th>)}<th>Check</th></tr></thead>
        <tbody>{shown.map((p, i) => { const pr = problemsOf(i); return <tr key={i} style={{ opacity: pr.length ? 0.55 : 1 }}>
          <td><input type="checkbox" style={{ width: "auto" }} disabled={pr.length > 0} checked={pr.length === 0 && !off.has(i)} onChange={e => setOff(s => { const n = new Set(s); e.target.checked ? n.delete(i) : n.add(i); return n; })} aria-label={`Include row ${p.line}`} /></td>
          {body[i].map((c, ci) => <td key={ci}>{ci < heads.length ? c : null}</td>)}<td className="note" style={{ margin: 0 }}>{kind !== "properties" && props.length > 0 && <select aria-label={`Property for row ${p.line}`} value={assign[i] ?? ""} onChange={e => setAssign(a => { const n = { ...a }; if (e.target.value) n[i] = e.target.value; else delete n[i]; return n; })}><option value="">{placed[i].pid || placed[i].portfolio ? "Change property…" : "Choose property…"}</option>{kind === "reminders" && <option value="portfolio">Whole portfolio</option>}{props.map(x => <option key={x.id} value={x.id}>{x.nickname || x.address}</option>)}</select>} {pr.length ? pr.join("; ") : isDup(i) ? "Already exists, will skip" : kind === "properties" ? "OK" : `OK → ${placed[i].pname}`}</td></tr>; })}</tbody></table></div>
      {kind !== "properties" && props.length > 0 && parsed.length > 0 && <p className="note">Assign every row to one property: <select aria-label="Assign all rows to a property" value="" onChange={e => { const v = e.target.value; if (v) setAssign(Object.fromEntries(parsed.map((_, i) => [i, v]))); }}><option value="">Choose property…</option>{kind === "reminders" && <option value="portfolio">Whole portfolio</option>}{props.map(x => <option key={x.id} value={x.id}>{x.nickname || x.address}</option>)}</select></p>}
      {parsed.length > 60 && <p className="note">Showing the first 60 of {parsed.length} rows. All rows without problems will be imported.</p>}
      {missingRequired.length > 0 && <p className="err">Match a column to: {missingRequired.map(f => f.label).join(", ")}.</p>}
      {kind === "properties" && resolved && <ResolvedTable list={resolved} setList={setResolved} />}
      {kind === "properties" && !resolved && <p><button disabled={busy || !toSave.length || missingRequired.length > 0} onClick={lookup}>Look up {Math.min(toSave.length, MAX_PROPS)} address{toSave.length === 1 ? "" : "es"}</button> {prog && <span className="note">{prog}</span>}</p>}
      {kind === "properties" && resolved && <p><button disabled={busy || !resolved.some(r => r.ok)} onClick={addProps}>Add {resolved.filter(r => r.ok).length} to my portfolio</button> <button className="ghost" onClick={() => setResolved(null)}>Back</button></p>}
      {kind !== "properties" && <p><button disabled={busy || !toSave.length || missingRequired.length > 0} onClick={save}>Import {toSave.length} row{toSave.length === 1 ? "" : "s"}</button> <span className="note">Rows with problems are left out; fix the file or edit the values and try again.</span></p>}</>}
    <p className="note">Imported figures are whatever your file says. Rambl doesn’t verify them. {kind === "properties" && "Addresses are matched to NYC records by GeoSearch, which can pick the wrong lot, so check each match before adding. "}{kind === "expenses" && "Categories are matched by keyword; check them on the Costs tab. "}{(kind === "loans" || kind === "capital" || kind === "reminders") && "Calculations and reminders use only the numbers and dates you provide."}</p></div></>);
}
function ResolvedTable({ list, setList }: { list: Resolved[]; setList: (l: Resolved[]) => void }) {
  return (<div style={{ overflowX: "auto", marginTop: 12 }}><p className="note">Check each match. Untick anything that looks wrong; you can also add it by hand later.</p>
    <table><thead><tr><th /><th>You entered</th><th>Matched to</th><th>Borough</th><th>Status</th></tr></thead><tbody>{list.map((r, i) => <tr key={i} style={{ opacity: r.ok ? 1 : 0.55 }}>
      <td><input type="checkbox" style={{ width: "auto" }} checked={r.ok} disabled={r.note.startsWith("Already") || (!r.matched && !r.borough)} onChange={e => setList(list.map((x, j) => (j === i ? { ...x, ok: e.target.checked } : x)))} aria-label={`Include ${r.input}`} /></td>
      <td>{r.input}</td><td>{r.matched ? r.label : "—"}</td><td>{r.matched ? r.borough ?? "—" : <select aria-label={`Borough for ${r.input}`} value={r.borough ?? ""} onChange={e => { const b = e.target.value || null; setList(list.map((x, j) => (j === i ? { ...x, borough: b, ok: Boolean(b), note: b ? "No city match; will be added as typed" : "No city match. Choose a borough to add it" } : x))); }}><option value="">Choose borough</option>{BOROUGHS.map(b => <option key={b}>{b}</option>)}</select>}</td><td className="note" style={{ margin: 0 }}>{r.note || (r.matched ? "City record found" : "")}</td></tr>)}</tbody></table></div>);
}
