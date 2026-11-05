import { useState } from "react";
import { supabase } from "../lib/supabase";
export default function AuthPage() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [mode, setMode] = useState<"in" | "up">("in");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg("");
    const r = mode === "in" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (r.error) setMsg(r.error.message); else if (mode === "up" && !r.data.session) setMsg("Check your email to confirm your account, then sign in.");
  };
  return (<div className="wrap" style={{ maxWidth: 420 }}><h1>Stoop</h1><p>Your NYC rental portfolio, with the public record alongside.</p>
    <form className="card" onSubmit={submit}><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required /></label>
      {msg && <p className="note">{msg}</p>}<p><button disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</button>{" "}
      <button type="button" className="ghost" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "Need an account?" : "Have an account?"}</button></p></form></div>);
}
