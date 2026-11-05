import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GLOBAL_DISCLAIMER, SOURCES, SourceId, TERMS_VERSION, sourceTag } from "../lib/sources";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export function SourceTag({ id, asOf }: { id: SourceId; asOf?: string | null }) { return <span className="tag" title={SOURCES[id].caveat}>{sourceTag(id, asOf)}</span>; }
export function EstimateBadge() { return <span className="tag est" title={SOURCES.estimate.caveat}>Estimate</span>; }
export function SectionNote({ id }: { id: SourceId }) { const c = SOURCES[id].caveat; return c ? <div className="note">{c}</div> : null; }
export function Footer() { return <footer className="disc">{GLOBAL_DISCLAIMER}<div className="legal-links"><Link to="/legal/terms">Terms</Link> · <Link to="/legal/privacy">Privacy</Link> · <Link to="/legal/data-sources">Data sources</Link></div></footer>; }

// First-use acknowledgment, stored per user per terms version.
export function DisclaimerGate({ children }: { children: React.ReactNode }) {
  const { session } = useAuth(); const [state, setState] = useState<"loading" | "needed" | "ok">("loading"); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  useEffect(() => {
    if (!session) return;
    supabase.from("terms_acceptances").select("id").eq("user_id", session.user.id).eq("terms_version", TERMS_VERSION).maybeSingle()
      .then(({ data, error }) => { if (error) { setErr(error.message); setState("needed"); } else setState(data ? "ok" : "needed"); });
  }, [session]);
  if (state === "loading") return <div className="wrap">Loading…</div>;
  if (state === "ok") return <>{children}</>;
  const accept = async () => {
    setBusy(true); setErr("");
    const { error } = await supabase.from("terms_acceptances").insert({ user_id: session!.user.id, terms_version: TERMS_VERSION });
    setBusy(false); if (error && !/duplicate/i.test(error.message)) setErr(error.message); else setState("ok");
  };
  return (<div className="modal"><div className="card"><h2>Before you start</h2>
    <p>{GLOBAL_DISCLAIMER}</p>
    <p className="note">Property data comes from NYC agencies (City Planning, Finance, HPD, DOB) and news publishers. Rambl labels every outside figure with its source and date. Values marked “Estimate” are calculated from your inputs.</p>
    {err && <p className="err">{err}</p>}
    <p className="note">By continuing you agree to the <Link to="/legal/terms" target="_blank">Terms of Service</Link> and <Link to="/legal/privacy" target="_blank">Privacy Policy</Link>, and understand the <Link to="/legal/data-sources" target="_blank">data-source disclaimers</Link>.</p>
    <button onClick={accept} disabled={busy}>I agree and understand</button></div></div>);
}
