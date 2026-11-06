import { Link } from "react-router-dom";
import "../landing.css";
import { GLOBAL_DISCLAIMER } from "../lib/sources";

const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
const Bul = ({ c, t, dark }: { c: string; t: string; dark?: boolean }) => <span className="lp-bul" style={{ background: c, color: dark ? "#111" : "#fff" }}>{t}</span>;

const FEATURES = [
  { l: "P", c: "#B933AD", t: "Your whole portfolio at a glance", d: "Every property, its borough line, value, debt and cash flow on one clean screen. Search and filter in a tap." },
  { l: "D", c: "#EE352E", t: "Debt, broken down", d: "Track each loan: balance, rate, payment and debt-service coverage, so you know where you stand on every building." },
  { l: "$", c: "#00933C", t: "Costs and returns", d: "Log operating costs and see NOI, cap rate and cash-on-cash update as your numbers change." },
  { l: "U", c: "#FF6319", t: "Units, rents and leases", d: "A simple rent roll per building: tenant, rent, lease end and rent-stabilization status for each unit." },
  { l: "M", c: "#00A1DE", t: "A map of your NYC", d: "See your properties pinned across the five boroughs. Drag a pin to the exact spot if you want it perfect." },
  { l: "N", c: "#EE352E", t: "NYC real-estate news, filtered", d: "Headlines about New York rentals, rules and the market, with the noise screened out, plus a live updates bar." },
  { l: "C", c: "#0039A6", t: "Calculators", d: "Try a purchase before you make it: price, down payment, rate, rent, vacancy and costs, all in one place." },
  { l: "↓", c: "#FCCC0A", t: "Your data, exportable", d: "Download your portfolio as a spreadsheet (CSV) any time. It is your information.", dark: true },
];
const STEPS = [
  { n: "1", c: "#B933AD", t: "Find your address", d: "Search any NYC address. Rambl uses the city's free address search to place it in the right borough." },
  { n: "2", c: "#00933C", t: "Add what you know", d: "Enter loans, costs, units and rents. Nothing is guessed for you, and every estimate is labeled." },
  { n: "3", c: "#0039A6", t: "Stay on top of it", d: "Watch totals, lease reminders and local news in one place, on every page." },
];
const WHO = [
  { c: "#FF6319", l: "K", t: "Small-building owners", d: "Own a two-to-six family in Brooklyn or Queens? Get out of the spreadsheet maze without paying for a property-management suite." },
  { c: "#EE352E", l: "M", t: "Owners with stabilized units", d: "Mark each unit's stabilization status next to its rent and lease dates, so the details live with the unit." },
  { c: "#00933C", l: "Bx", t: "Growing investors", d: "Adding a building every year? Keep every property's debt, costs and cash flow comparable in one portfolio." },
  { c: "#B933AD", l: "Q", t: "House-hackers", d: "Live in one unit and rent the rest? Track what the building really costs and earns." },
];
const TRUST = [
  { t: "Built on free NYC open data", d: "Address lookup uses the city's public GeoSearch service. We use free public sources, with no paid data in the middle." },
  { t: "Your numbers stay yours", d: "Accounts can only read their own records. We don't sell your information or show ads." },
  { t: "Honest about estimates", d: "Calculations come from numbers you enter and are labeled as estimates. Rambl is a tool, not financial or legal advice." },
];
const FAQ = [
  ["Is Rambl free?", "Yes, it is free during early access. Paid plans are planned for later, and nothing about pricing is final yet."],
  ["Is it only for New York City?", "Yes. Rambl is built for the five boroughs: addresses, maps, news and tools are all NYC-focused."],
  ["Where does the data come from?", "Addresses come from the city's free GeoSearch service and news comes from public news feeds. Everything else is what you enter yourself. Outside data can be incomplete, delayed or wrong, so verify before making decisions."],
  ["Does Rambl connect to my bank or mortgage?", "No. You enter your own loan, cost and rent numbers, and Rambl does the math. Nothing is pulled from your accounts."],
  ["Is my information private?", "Your records are protected so only your account can read them. We don't sell your information. See the Privacy Policy for details."],
  ["Is this financial or legal advice?", "No. Rambl is an organizing and information tool. Talk to a qualified professional before making financial, legal or tax decisions."],
  ["Can I take my data with me?", "Yes. You can export your portfolio as a CSV file whenever you like."],
] as const;

export default function Landing() {
  return (<div className="lp">
    <header className="lp-nav"><div className="lp-in">
      <button className="lp-logo" onClick={() => window.scrollTo({ top: 0 })} aria-label="Rambl home"><i>R</i>Rambl</button>
      <nav className="lp-links" aria-label="Sections">{[["features", "Features"], ["how", "How it works"], ["who", "Who it's for"], ["pricing", "Pricing"], ["faq", "FAQ"]].map(([id, l]) => <button key={id} onClick={() => go(id)}>{l}</button>)}</nav>
      <div className="lp-cta"><Link to="/signin" className="lp-ghost">Sign in</Link><Link to="/signup" className="lp-btn">Create account</Link></div>
    </div></header>

    <section className="lp-hero"><div className="lp-in lp-herogrid">
      <div>
        <div className="lp-pill"><span />Free early access · NYC only</div>
        <h1>Every stop on your portfolio, in one place.</h1>
        <p className="lp-sub">Rambl is the portfolio tracker built for New York landlords. Properties, debt, costs, leases, a map and local real-estate news, all in one clean, fast place.</p>
        <div className="lp-btns"><Link to="/signup" className="lp-btn lg">Create free account</Link><button className="lp-ghost lg" onClick={() => go("how")}>See how it works</button></div>
        <p className="lp-fine">No credit card. Free while in early access.</p>
      </div>
      <div className="lp-mock" aria-hidden="true">
        <div className="lp-mockside"><div className="lp-mlogo"><i>R</i>Rambl</div>
          {[["P", "#B933AD", "Portfolio", 1], ["M", "#00933C", "Map", 0], ["N", "#EE352E", "News", 0], ["C", "#0039A6", "Calculators", 0]].map(([l, c, t, a]) => <div key={t as string} className={"lp-mnav" + (a ? " on" : "")}><Bul c={c as string} t={l as string} />{t}</div>)}
        </div>
        <div className="lp-mockmain">
          <div className="lp-mbar"><b>Updates</b><span>Sample headline: rent board vote scheduled &nbsp;·&nbsp; Sample: lease ends in 45 days</span></div>
          <div className="lp-mhead"><small>Your portfolio</small><strong>Portfolio</strong></div>
          <div className="lp-mstats">{[["Value", "$4.2M"], ["Debt", "$2.6M"], ["Cash flow", "$3.1k/mo"]].map(([a, b]) => <div key={a}><small>{a}</small><strong>{b}</strong></div>)}</div>
          {[["#FF6319", "K", "Sample · Atlantic Ave", "Brooklyn · 6 units"], ["#B933AD", "Q", "Sample · 30th Ave", "Queens · 4 units"], ["#EE352E", "M", "Sample · E 88th St", "Manhattan · 12 units"]].map(([c, l, n, a]) => <div className="lp-mrow" key={n}><Bul c={c} t={l} /><div><b>{n}</b><span>{a}</span></div></div>)}
          <div className="lp-msample">Sample data</div>
        </div>
      </div>
    </div>
      <div className="lp-route" aria-hidden="true">{["#EE352E", "#FF6319", "#FCCC0A", "#00933C", "#00A1DE", "#0039A6", "#B933AD"].map(c => <span key={c} style={{ background: c }} />)}</div>
    </section>

    <div className="lp-ticker" aria-hidden="true"><div className="lp-trk">{Array.from({ length: 2 }).map((_, k) => <span key={k}>{["Portfolio", "Debt", "Costs", "Units & leases", "Map", "News", "Calculators", "Export"].map((w, i) => <em key={w}><Bul c={["#B933AD", "#EE352E", "#00933C", "#FF6319", "#00A1DE", "#EE352E", "#0039A6", "#111"][i]} t={w[0]} />{w}</em>)}</span>)}</div></div>

    <section id="features" className="lp-sec"><div className="lp-in">
      <p className="lp-eyebrow">What you get</p><h2>Everything for your NYC rentals, nothing you don't need.</h2>
      <p className="lp-lead">No giant property-management suite. Just the tools a New York owner uses week to week.</p>
      <div className="lp-grid">{FEATURES.map(f => <article key={f.t} className="lp-card"><Bul c={f.c} t={f.l} dark={f.dark} /><h3>{f.t}</h3><p>{f.d}</p></article>)}</div>
    </div></section>

    <section id="how" className="lp-sec lp-dark"><div className="lp-in">
      <p className="lp-eyebrow">How it works</p><h2>From address to full picture in three stops.</h2>
      <ol className="lp-steps">{STEPS.map(s => <li key={s.n}><Bul c={s.c} t={s.n} /><h3>{s.t}</h3><p>{s.d}</p></li>)}</ol>
    </div></section>

    <section id="who" className="lp-sec"><div className="lp-in">
      <p className="lp-eyebrow">Who it's for</p><h2>Made for how New York owners actually operate.</h2>
      <div className="lp-who">{WHO.map(w => <article key={w.t}><Bul c={w.c} t={w.l} /><div><h3>{w.t}</h3><p>{w.d}</p></div></article>)}</div>
    </div></section>

    <section className="lp-sec lp-gray"><div className="lp-in">
      <p className="lp-eyebrow">Why people can trust it</p><h2>Clear about where numbers come from.</h2>
      <div className="lp-trust">{TRUST.map(t => <div key={t.t}><h3>{t.t}</h3><p>{t.d}</p></div>)}</div>
      <p className="lp-warn"><strong>Important:</strong> {GLOBAL_DISCLAIMER} Information from outside sources may not be 100% accurate.</p>
    </div></section>

    <section id="pricing" className="lp-sec"><div className="lp-in">
      <p className="lp-eyebrow">Pricing</p><h2>Free now. Paid plans coming soon.</h2>
      <p className="lp-lead">Rambl is in early access, so everything is free to use today. Plans and prices are not final.</p>
      <div className="lp-plans">
        <article className="lp-plan now"><div className="lp-tag go">Available now</div><h3>Early access</h3><div className="lp-price">Free</div><p>Everything in Rambl today.</p><ul><li>Portfolio, debt, costs and rent roll</li><li>Map, news and updates bar</li><li>Calculators and CSV export</li></ul><Link to="/signup" className="lp-btn block">Create free account</Link></article>
        <article className="lp-plan"><div className="lp-tag">Coming soon</div><h3>Plus</h3><div className="lp-price dim">To be announced</div><p>More tools for growing owners.</p><ul><li>Details coming soon</li></ul><button className="lp-ghost block" disabled>Coming soon</button></article>
        <article className="lp-plan"><div className="lp-tag">Coming soon</div><h3>Portfolio</h3><div className="lp-price dim">To be announced</div><p>For larger portfolios and teams.</p><ul><li>Details coming soon</li></ul><button className="lp-ghost block" disabled>Coming soon</button></article>
      </div>
    </div></section>

    <section id="faq" className="lp-sec lp-gray"><div className="lp-in lp-narrow">
      <p className="lp-eyebrow">FAQ</p><h2>Questions, answered.</h2>
      <div className="lp-faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
    </div></section>

    <section className="lp-final"><div className="lp-in">
      <h2>Ready to ride?</h2><p>Put your NYC portfolio on one line. Adding your first property is quick.</p>
      <Link to="/signup" className="lp-btn lg inv">Create free account</Link>
    </div></section>

    <footer className="lp-foot"><div className="lp-in">
      <div className="lp-fcols"><div><div className="lp-flogo"><i>R</i>Rambl</div><p>NYC rental portfolio</p></div>
        <div><b>Product</b><button onClick={() => go("features")}>Features</button><button onClick={() => go("pricing")}>Pricing</button><button onClick={() => go("faq")}>FAQ</button></div>
        <div><b>Account</b><Link to="/signin">Sign in</Link><Link to="/signup">Create account</Link></div>
        <div><b>Legal</b><Link to="/legal/terms">Terms of Service</Link><Link to="/legal/privacy">Privacy Policy</Link><Link to="/legal/data-sources">Data sources</Link></div></div>
      <p className="lp-small">{GLOBAL_DISCLAIMER} Rambl is an independent tool. It is not affiliated with the MTA, the City of New York or any government agency, and it does not provide financial, legal or tax advice.</p>
      <p className="lp-small">© {new Date().getFullYear()} Rambl</p>
    </div></footer>
  </div>);
}
