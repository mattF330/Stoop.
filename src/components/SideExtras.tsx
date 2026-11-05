import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { listFor, listProperties, UnitRow } from "../lib/data";

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export function SideStats() {
  const loc = useLocation();
  const [s, setS] = useState<{ props: number; units: number; rent: number; next: { days: number; label: string } | null } | null>(null);
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const [p, u] = await Promise.all([listProperties(), listFor<UnitRow>("units")]);
        const now = Date.now(); let next: { days: number; label: string } | null = null;
        for (const x of u) {
          if (!x.lease_end) continue; const days = Math.ceil((new Date(x.lease_end).getTime() - now) / 864e5);
          if (days >= 0 && (!next || days < next.days)) next = { days, label: x.label };
        }
        if (!off) setS({ props: p.length, units: u.length, rent: u.reduce((a, x) => a + Number(x.monthly_rent || 0), 0), next });
      } catch { if (!off) setS(null); }
    })();
    return () => { off = true; };
  }, [loc.pathname]);
  return (<div className="sx">
    <Link to="/add" className="sx-add">+ Add property</Link>
    {s && <div className="sx-card"><div className="sx-h">Your portfolio</div>
      <div className="sx-r"><span>Properties</span><b>{s.props}</b></div>
      <div className="sx-r"><span>Units</span><b>{s.units}</b></div>
      <div className="sx-r"><span>Monthly rent</span><b>{money(s.rent)}</b></div>
      <div className="sx-r"><span>Next lease ends</span><b>{s.next ? (s.next.days === 0 ? "today" : `${s.next.days}d`) : "none set"}</b></div>
      <div className="sx-n">From numbers you entered.</div></div>}
  </div>);
}

export function SideAccount() {
  const { session } = useAuth(); const email = session?.user?.email ?? "";
  return (<div className="sx-acct">
    <div className="sx-who"><i>{(email[0] || "?").toUpperCase()}</i><div><div className="sx-em" title={email}>{email || "Signed in"}</div><Link to="/settings">Account settings</Link></div></div>
    <div className="sx-links"><button type="button" onClick={() => supabase.auth.signOut()}>Sign out</button><span><Link to="/legal/terms">Terms</Link> · <Link to="/legal/privacy">Privacy</Link></span></div>
  </div>);
}
