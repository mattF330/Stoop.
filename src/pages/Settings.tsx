import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { SOURCES, GLOBAL_DISCLAIMER } from "../lib/sources";
import { ACCENTS, loadPrefs, savePrefs, Prefs } from "../lib/prefs";
import { listProperties, listFor, deleteRow, PropertyRow } from "../lib/data";

const SECTIONS = ["Account", "Subscription & billing", "Portfolio preferences", "Notifications", "Appearance", "Privacy & security", "Legal & support", "Danger zone"];
const VERSION = "0.2.0";

function Row({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return <div className="srow"><div><div className="t">{title}</div>{desc && <div className="d">{desc}</div>}</div><div>{children}</div></div>;
}
function Switch({ checked, onChange, disabled }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return <label className="sw"><input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange?.(e.target.checked)} /><i /></label>;
}
function Soon({ children }: { children: React.ReactNode }) { return <div className="card"><span className="est" style={{ marginLeft: 0 }}>Not connected yet</span><p className="note" style={{ marginBottom: 0 }}>{children}</p></div>; }

function TypedConfirm({ word = "DELETE", label, onConfirm }: { word?: string; label: string; onConfirm: () => Promise<void> }) {
  const [v, setV] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  return <div style={{ marginTop: 12 }}><label>Type {word} to confirm</label>
    <div className="row"><input value={v} onChange={e => setV(e.target.value)} autoComplete="off" />
      <button className="danger" disabled={v !== word || busy} onClick={async () => { setBusy(true); setErr(""); try { await onConfirm(); setV(""); } catch (e) { setErr((e as Error).message); } setBusy(false); }}>{label}</button></div>
    {err && <p className="err">{err}</p>}</div>;
}

export default function Settings() {
  const { session } = useAuth(); const user = session!.user;
  const [i, setI] = useState(0); const [prefs, setPrefs] = useState<Prefs>(loadPrefs()); const [msg, setMsg] = useState("");
  const [name, setName] = useState(""); const [phone, setPhone] = useState<string>(String(user.user_metadata?.phone ?? ""));
  const [pw, setPw] = useState({ a: "", b: "" }); const [email, setEmail] = useState(user.email ?? "");
  const [props, setProps] = useState<PropertyRow[]>([]); const [pick, setPick] = useState("");
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3500); };
  useEffect(() => { supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle().then(({ data }) => setName((data as any)?.display_name ?? "")); listProperties().then(p => { setProps(p); setPick(p[0]?.id ?? ""); }).catch(() => {}); }, [user.id]);
  const setP = (patch: Partial<Prefs>) => { const n = { ...prefs, ...patch }; setPrefs(n); savePrefs(n); if (patch.theme && patch.theme !== "system") supabase.from("profiles").update({ theme: patch.theme }).eq("id", user.id).then(() => {}); };

  const saveProfile = async () => {
    const a = await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);
    const b = await supabase.auth.updateUser({ data: { phone } });
    flash(a.error || b.error ? (a.error || b.error)!.message : "Profile saved");
  };
  const changeEmail = async () => { const { error } = await supabase.auth.updateUser({ email }); flash(error ? error.message : "Check both inboxes to confirm the email change"); };
  const changePassword = async () => {
    if (pw.a.length < 8) return flash("Use at least 8 characters"); if (pw.a !== pw.b) return flash("Passwords don’t match");
    const { error } = await supabase.auth.updateUser({ password: pw.a }); if (!error) setPw({ a: "", b: "" }); flash(error ? error.message : "Password updated");
  };
  const downloadData = async () => {
    const [p, l, e, u] = await Promise.all([listProperties(), listFor("loans"), listFor("expenses"), listFor("units")]);
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), email: user.email, properties: p, loans: l, expenses: e, units: u }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "stoop-account-data.json"; a.click(); flash("Downloaded");
  };
  const delOne = async () => { await deleteRow("properties", pick); const p = await listProperties(); setProps(p); setPick(p[0]?.id ?? ""); flash("Property data deleted"); };
  const delAll = async () => { for (const p of props) await deleteRow("properties", p.id); setProps([]); setPick(""); flash("Portfolio deleted"); };

  const LEGAL: Record<string, string> = { "Terms of Service": "terms", "Privacy Policy": "privacy", "Data sources & disclaimers": "data-sources" };

  const pane = [
    <>{/* Account */}
      <Row title="Full name"><input value={name} onChange={e => setName(e.target.value)} /></Row>
      <Row title="Phone number" desc="Optional"><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555" /></Row>
      <Row title="Email address" desc="Changing it requires confirming from your inbox"><div className="row"><input type="email" value={email} onChange={e => setEmail(e.target.value)} /><button className="ghost sm" onClick={changeEmail} disabled={email === user.email}>Change</button></div></Row>
      <Row title="Account created">{new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</Row>
      <Row title="Profile picture" desc="Needs file storage, which isn’t set up yet"><button className="ghost sm" disabled>Upload</button></Row>
      <p><button onClick={saveProfile}>Save changes</button></p>
      <div className="card"><h2>Change password</h2><label>New password</label><input type="password" value={pw.a} onChange={e => setPw({ ...pw, a: e.target.value })} /><label>Confirm</label><input type="password" value={pw.b} onChange={e => setPw({ ...pw, b: e.target.value })} /><p><button onClick={changePassword}>Update password</button></p></div></>,
    <><Soon>Billing and plans aren’t connected yet. Plan changes, payment methods, invoices, cancellation and restore purchases will appear here once a payment provider is set up. Tar Beach is free while in beta.</Soon>
      <Row title="Current plan">Free (beta)</Row></>,
    <><Row title="Cash-flow display" desc="Applies to the portfolio page"><select value={prefs.cf} onChange={e => setP({ cf: e.target.value as Prefs["cf"] })}><option value="monthly">Monthly</option><option value="annual">Annual</option></select></Row>
      <Row title="Currency" desc="More currencies may come later"><select disabled><option>USD</option></select></Row>
      <Row title="Show NOI on portfolio list"><Switch checked={prefs.showNoi} onChange={v => setP({ showNoi: v })} /></Row>
      <Row title="Show cap rate on portfolio list"><Switch checked={prefs.showCap} onChange={v => setP({ showCap: v })} /></Row>
      <p className="note">Saved in this browser.</p></>,
    <><Soon>Email notifications need an email service, which isn’t connected yet. Preferences for value updates, mortgage, expense and rent reminders, performance updates, opportunities and announcements will be saved here.</Soon>
      {["Email notifications", "Property value updates", "Mortgage reminders", "Expense reminders", "Rent payment reminders", "Portfolio performance updates", "New property opportunities", "Product announcements"].map(t => <Row key={t} title={t}><Switch checked={false} disabled /></Row>)}</>,
    <><Row title="Theme"><div className="seg" style={{ margin: 0 }}>{(["light", "dark", "system"] as const).map(t => <button key={t} className={prefs.theme === t ? "on" : ""} onClick={() => setP({ theme: t })}>{t === "system" ? "System default" : t[0].toUpperCase() + t.slice(1)}</button>)}</div></Row>
      <Row title="Accent color"><div className="swatches">{ACCENTS.map(c => <button key={c} aria-label={c} className={prefs.accent === c ? "on" : ""} style={{ background: c }} onClick={() => setP({ accent: c })} />)}</div></Row>
      <Row title="Dashboard density"><select value={prefs.density} onChange={e => setP({ density: e.target.value as Prefs["density"] })}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></Row></>,
    <><Row title="Password"><button className="ghost sm" onClick={() => setI(0)}>Change password</button></Row>
      <Row title="Two-factor authentication" desc="Not connected yet"><Switch checked={false} disabled /></Row>
      <Row title="Active sessions" desc="Session lists aren’t available yet. You can end all of them below."><span /></Row>
      <Row title="Log out of all devices" desc="Ends every session, including this one"><button className="ghost sm" onClick={() => supabase.auth.signOut({ scope: "global" })}>Log out everywhere</button></Row>
      <Row title="Download account data" desc="Your profile, properties, loans, costs and units as JSON"><button className="ghost sm" onClick={downloadData}>Download</button></Row>
      <Row title="Delete account" desc="See Danger zone"><button className="ghost sm" onClick={() => setI(7)}>Go to Danger zone</button></Row></>,
    <>{Object.keys(LEGAL).map(k => <Row key={k} title={k}><Link to={`/legal/${LEGAL[k]}`}><button className="ghost sm">Read</button></Link></Row>)}
      <Row title="Contact support" desc="Placeholder"><button className="ghost sm" disabled>Contact</button></Row>
      <Row title="Report a problem" desc="Placeholder"><button className="ghost sm" disabled>Report</button></Row>
      <Row title="App version">Tar Beach {VERSION}</Row>
      <div className="card"><h2>Data sources</h2><table><thead><tr><th>Source</th><th>Updates</th><th>Caveat</th></tr></thead><tbody>{Object.values(SOURCES).filter(s => s.url).map(s => <tr key={s.id}><td><a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a></td><td>{s.cadence}</td><td>{s.caveat}</td></tr>)}</tbody></table></div></>,
    <><p className="note" style={{ marginTop: 0 }}>These can’t be undone.</p><div className="dz2">
      <Row title="Delete individual property data" desc="Removes one property with its loans, costs and units">{props.length ? <select value={pick} onChange={e => setPick(e.target.value)}>{props.map(p => <option key={p.id} value={p.id}>{p.nickname || p.address}</option>)}</select> : "No properties"}</Row>
      {props.length > 0 && <TypedConfirm label="Delete property" onConfirm={delOne} />}
      <Row title="Delete entire portfolio" desc={`Removes all ${props.length} properties`}><span /></Row>
      {props.length > 0 && <TypedConfirm label="Delete portfolio" onConfirm={delAll} />}
      <Row title="Delete account permanently" desc="Self-serve account deletion needs a server function that isn’t built yet. Delete your portfolio and log out; account removal will be handled on request."><span /></Row></div></>,
  ];

  return (<><p className="eyebrow">Account</p><h1>Settings</h1>
    <div className="setwrap" style={{ marginTop: 28 }}>
      <nav className="snav">{SECTIONS.map((s, k) => <button key={s} className={(k === i ? "on " : "") + (k === 7 ? "dz" : "")} onClick={() => setI(k)}>{s}</button>)}</nav>
      <div><h2 style={{ marginBottom: 6 }}>{SECTIONS[i]}</h2>{msg && <p className="ok" role="status">{msg}</p>}{pane[i]}</div></div></>);
}
