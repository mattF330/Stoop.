import { useState } from "react";
import { insertRow, deleteRow, updateRow } from "../lib/data";
import { supabase } from "../lib/supabase";
import { CapItem, PRESETS, plan, totals } from "../lib/reserves";
import { fmtMoney } from "../lib/finance";
import { EstimateBadge } from "./Disclaimers";

const uid = async () => (await supabase.auth.getUser()).data.user!.id;
export function ReservesTab({ propertyId, items, run }: { propertyId: string; items: CapItem[]; run: (f: () => Promise<unknown>) => void }) {
  const [v, s] = useState({ preset: PRESETS[0].name, name: PRESETS[0].name, installed: String(new Date().getFullYear() - 10), life: String(PRESETS[0].years), cost: "", saved: "0" });
  const t = totals(items); const now = new Date().getFullYear();
  const sorted = [...items].sort((a, b) => plan(a).replaceYear - plan(b).replaceYear);
  const pick = (name: string) => { const p = PRESETS.find(x => x.name === name)!; s({ ...v, preset: name, name: name === "Other" ? "" : name, life: String(p.years) }); };
  return (<div className="card"><h2>Capital reserves <EstimateBadge /></h2>
    <p className="note">Big systems wear out on their own schedule. Enter what’s in the building, when it was installed, how long you expect it to last and what replacing it would cost. Rambl divides the remaining cost by the months left, so you can see roughly what to set aside each month.</p>
    <div className="grid" style={{ marginBottom: 12 }}>
      <div className="card stat"><div className="l">Suggested set-aside / month</div><div className="v">{fmtMoney(t.monthly)}</div></div>
      <div className="card stat"><div className="l">Replacement cost, next 5 years</div><div className="v">{fmtMoney(t.within5)}</div></div>
      <div className="card stat"><div className="l">Saved so far</div><div className="v">{fmtMoney(t.saved)}</div></div>
      <div className="card stat"><div className="l">Past expected life</div><div className="v">{t.overdue}</div></div></div>
    <table><thead><tr><th>Item</th><th>Installed</th><th>Expected life</th><th>Replace around</th><th>Cost</th><th>Saved</th><th>Set aside / mo</th><th /></tr></thead><tbody>
      {sorted.map(i => { const p = plan(i); return <tr key={i.id}><td>{i.name}</td><td>{i.installed_year}</td><td>{i.lifespan_years} yrs</td>
        <td style={{ color: p.overdue ? "var(--bad)" : undefined }}>{p.replaceYear}{p.overdue ? " (past expected life)" : p.replaceYear - now <= 2 ? " (soon)" : ""}</td>
        <td>{fmtMoney(Number(i.replacement_cost))}</td>
        <td><input type="number" min="0" style={{ width: 100 }} defaultValue={Number(i.saved_so_far)} aria-label={`Saved for ${i.name}`} onBlur={e => { const n = Number(e.target.value); if (n !== Number(i.saved_so_far) && n >= 0) run(() => updateRow("capital_items", i.id, { saved_so_far: n })); }} /></td>
        <td>{fmtMoney(p.monthly)}</td><td><button className="ghost" onClick={() => run(() => deleteRow("capital_items", i.id))}>×</button></td></tr>; })}</tbody></table>
    {!sorted.length && <p className="note">Nothing added yet. Start with the roof, boiler and water heater.</p>}
    <form className="row" style={{ marginTop: 12, alignItems: "flex-end" }} onSubmit={e => { e.preventDefault(); run(async () => insertRow("capital_items", { user_id: await uid(), property_id: propertyId, name: v.name, installed_year: Number(v.installed), lifespan_years: Number(v.life), replacement_cost: Number(v.cost), saved_so_far: Number(v.saved || 0) })); s({ ...v, cost: "", saved: "0" }); }}>
      <div><label>Type<select value={v.preset} onChange={e => pick(e.target.value)}>{PRESETS.map(p => <option key={p.name}>{p.name}</option>)}</select></label></div>
      <div><label>Name<input required value={v.name} onChange={e => s({ ...v, name: e.target.value })} /></label></div>
      <div><label>Installed (year)<input type="number" min="1850" max="2100" required value={v.installed} onChange={e => s({ ...v, installed: e.target.value })} /></label></div>
      <div><label>Expected life (yrs)<input type="number" min="1" max="150" required value={v.life} onChange={e => s({ ...v, life: e.target.value })} /></label></div>
      <div><label>Replacement cost $<input type="number" min="0" required value={v.cost} onChange={e => s({ ...v, cost: e.target.value })} /></label></div>
      <div><label>Already saved $<input type="number" min="0" value={v.saved} onChange={e => s({ ...v, saved: e.target.value })} /></label></div>
      <button>Add</button></form>
    <p className="note">The expected lives filled in are rough rule-of-thumb averages; change them to match what you know about the building. Actual life depends on condition, maintenance and use, and an item can fail sooner or last longer. Costs are your own estimate, so get contractor quotes. If an item is past its expected life, the plan spreads the remaining cost over the next 12 months. This is plain division, not a prediction or advice, and it is not included in your cash flow figures.</p></div>);
}
