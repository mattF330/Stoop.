import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
export default function AuthPage() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [mode, setMode] = useState<"in" | "up">("in");
  const [sent, setSent] = useState(false); const [note, setNote] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg("");
    const r = mode === "in" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (r.error) setMsg(r.error.message); else if (mode === "up" && !r.data.session) setSent(true);
  };
  const resend = async () => { setBusy(true); setNote("");
    try { const r = await (supabase.auth as any).resend({ type: "signup", email }); setNote(r?.error ? r.error.message : "Sent again. It can take a minute to arrive."); } catch { setNote("Couldn't resend right now. Try again in a minute."); }
    setBusy(false); };
  if (sent) return (<div className="authwrap"><div className="authbox"><div className="authlogo"><i>R</i>Rambl</div><p className="authsub">NYC rental portfolio</p>
    <div className="card"><h2 style={{ marginTop: 0 }}>Check your email</h2>
      <p>We sent a confirmation link to <b>{email}</b>. Open it to activate your account, then come back here and sign in.</p>
      <ul className="note" style={{ paddingLeft: 18 }}><li>It can take a minute or two to arrive.</li><li>Check your spam or junk folder if you don’t see it.</li><li>Make sure the address above is spelled correctly.</li></ul>
      {note && <p className="note">{note}</p>}
      <p><button type="button" onClick={() => { setSent(false); setMode("in"); setPassword(""); setMsg(""); }}>Back to sign in</button>{" "}<button type="button" className="ghost" disabled={busy} onClick={resend}>Resend email</button></p></div></div></div>);
  return (<div className="authwrap"><div className="authbox"><div className="authlogo"><i>R</i>Rambl</div><p className="authsub">NYC rental portfolio</p>
    <form className="card" onSubmit={submit}><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required /></label>
      {mode === "up" && <p className="note">By creating an account you agree to the <Link to="/legal/terms">Terms of Service</Link> and <Link to="/legal/privacy">Privacy Policy</Link>.</p>}
      {msg && <p className="note">{msg}</p>}<p><button disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</button>{" "}
      <button type="button" className="ghost" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "Need an account?" : "Have an account?"}</button></p></form></div></div>);
}
