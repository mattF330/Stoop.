import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { listFor, listProperties, toLoan, UnitRow, LoanRow, ExpenseRow } from "../lib/data";
import { propertyMetrics, portfolioTotals } from "../lib/finance";
import { loadPrefs } from "../lib/prefs";

const money = (n: number) => (n < 0 ? "−" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");

export function SideStats() {
  const loc = useLocation();
  const [s, setS] = useState<{ props: number; units: number; rent: number; value: number; debt: number; cash: number; next: { days: number; label: string } | null } | null>(null);
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const [p, u, loans, exp] = await Promise.all([listProperties(), listFor<UnitRow>("units"), listFor<LoanRow>("loans"), listFor<ExpenseRow>("expenses")]);
        const ms = p.map(pr => propertyMetrics({ value: Number(pr.current_value ?? pr.purchase_price ?? 0), monthlyRent: u.filter(x => x.property_id === pr.id).reduce((a, x) => a + Number(x.monthly_rent), 0), vacancyPct: Number(pr.vacancy_pct ?? 5), annualExpenses: exp.filter(e => e.property_id === pr.id).reduce((a, e) => a + Number(e.annual_amount), 0), loans: loans.filter(l => l.property_id === pr.id).map(toLoan), cashInvested: Number(pr.cash_invested ?? 0) }));
        const t = portfolioTotals(ms, p.map(pr => Number(pr.current_value ?? pr.purchase_price ?? 0)));
        const now = Date.now(); let next: { days: number; label: string } | null = null;
        for (const x of u) {
          if (!x.lease_end) continue; const days = Math.ceil((new Date(x.lease_end).getTime() - now) / 864e5);
          if (days >= 0 && (!next || days < next.days)) next = { days, label: x.label };
        }
        if (!off) setS({ props: p.length, units: u.length, rent: u.reduce((a, x) => a + Number(x.monthly_rent || 0), 0), value: t.value, debt: t.debt, cash: t.cashFlow, next });
      } catch { if (!off) setS(null); }
    })();
    return () => { off = true; };
  }, [loc.pathname]);
  const cfm = loadPrefs().cf === "monthly";
  return (<div className="sx">
    <Link to="/add" className="sx-add">+ Add property</Link>
    {s && <div className="sx-card"><div className="sx-h">Your portfolio</div>
      <div className="sx-r"><span>Property value</span><b>{money(s.value)}</b></div>
      <div className="sx-r"><span>Debt</span><b>{money(s.debt)}</b></div>
      <div className="sx-r"><span>Cash flow{cfm ? " /mo" : " /yr"}</span><b>{money(cfm ? s.cash / 12 : s.cash)}</b></div>
      <div className="sx-r"><span>Properties</span><b>{s.props}</b></div>
      <div className="sx-r"><span>Units</span><b>{s.units}</b></div>
      <div className="sx-r"><span>Monthly rent</span><b>{money(s.rent)}</b></div>
      <div className="sx-r"><span>Next lease ends</span><b>{s.next ? (s.next.days === 0 ? "today" : `${s.next.days}d`) : "none set"}</b></div>
      <div className="sx-n">Calculated from numbers you entered. May not be exact.</div></div>}
  </div>);
}

export function SideAccount() {
  const { session } = useAuth(); const email = session?.user?.email ?? ""; const uname = String(session?.user?.user_metadata?.username ?? "").trim();
  return (<div className="sx-acct">
    <div className="sx-who"><i>{(uname[0] || "?").toUpperCase()}</i><div><div className="sx-em">{uname || "Add a username"}</div><Link to="/settings">{uname ? "Account settings" : "Set it in Settings"}</Link></div></div>
    <div className="sx-links"><button type="button" onClick={() => supabase.auth.signOut()}>Sign out</button><span><Link to="/legal/terms">Terms</Link> · <Link to="/legal/privacy">Privacy</Link></span></div>
  </div>);
}
