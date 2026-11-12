import { Link } from "react-router-dom";
import "../landing.css";
import { GLOBAL_DISCLAIMER } from "../lib/sources";
import Mosaic from "../components/Mosaic";

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
      <nav className="lp-links" aria-label="Sections">{[["features", "Features"], ["boroughs", "Boroughs"], ["how", "How it works"], ["who", "Who it's for"], ["pricing", "Pricing"], ["faq", "FAQ"]].map(([id, l]) => <button key={id} onClick={() => go(id)}>{l}</button>)}</nav>
      <div className="lp-cta"><Link to="/signin" className="lp-ghost">Sign in</Link><Link to="/signup" className="lp-btn">Create account</Link></div>
    </div></header>

    <section className="lp-hero"><div className="lp-in lp-herogrid">
      <div className="lp-copy">
        <p className="lp-eyebrow">NYC rental portfolio</p>
        <h1>Every stop on your portfolio, in one place.</h1>
        <p className="lp-sub">Rambl is the portfolio tracker built for New York landlords. Properties, debt, costs, leases, a map and local real-estate news, all in one clean, fast place.</p>
        <div className="lp-btns"><Link to="/signup" className="lp-btn lg">Create free account</Link><button className="lp-ghost lg" onClick={() => go("how")}>See how it works</button></div>
        <div className="lp-fine"><div className="lp-rt" aria-hidden="true">{[["P", "#B933AD"], ["R", "#EE352E"], ["M", "#00933C"], ["N", "#FCCC0A"], ["C", "#0039A6"]].map(([l, c]) => <Bul key={l} c={c} t={l} dark={l === "N"} />)}</div><span>Free while in early access.</span></div>
      </div>
      <div className="lp-art lp-hero-art"><Mosaic label="Mosaic of the New York skyline at dusk, made of small glazed tiles, with a tall stepped tower and a low sun" /></div>
    </div></section>

    <section id="features" className="lp-sec"><div className="lp-in">
      <p className="lp-eyebrow">What you get</p><h2>Everything for your NYC rentals, nothing you don't need.</h2>
      <p className="lp-lead">No giant property-management suite. Just the tools a New York owner uses week to week.</p>
      <div className="lp-grid">{FEATURES.map(f => <article key={f.t} className="lp-card"><Bul c={f.c} t={f.l} dark={f.dark} /><h3>{f.t}</h3><p>{f.d}</p></article>)}</div>
    </div></section>

    <section id="boroughs" className="lp-sec lp-gray"><div className="lp-in">
      <p className="lp-eyebrow">Boroughs</p><h2>Five boroughs, one line.</h2>
      <p className="lp-lead">Brooklyn brownstones, Queens walk-ups, a Bronx six-family, a Staten Island house. Every building rides in the same portfolio.</p>
      <div className="lp-boros">{[["M", "#EE352E", "Manhattan"], ["K", "#FF6319", "Brooklyn"], ["Q", "#B933AD", "Queens"], ["Bx", "#00933C", "Bronx"], ["S", "#0039A6", "Staten Island"]].map(([l, c, n]) => <span key={n}><Bul c={c} t={l} />{n}</span>)}</div>
      <svg className="lp-train" viewBox="0 0 1200 270" role="img" aria-label="A subway car with five windows, each showing a different borough skyline">
        <defs>
          <clipPath id="lpwc"><rect width="180" height="80" rx="6" /></clipPath>
          <linearGradient id="lpsteel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E9ECEE" /><stop offset=".45" stopColor="#C3C8CC" /><stop offset="1" stopColor="#8C9298" /></linearGradient>
          <linearGradient id="lpglass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset=".4" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".18" /></linearGradient>
          <linearGradient id="lpstripe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F26A2E" /><stop offset="1" stopColor="#C9501A" /></linearGradient>
          {[["a", "#5E8FA6", "#D9D3B8"], ["b", "#8DB3C4", "#F0D9A8"], ["c", "#6D9DB5", "#E6DDBE"], ["d", "#7AA3C0", "#EFD6B0"], ["e", "#6FA0B8", "#DCE3C8"]].map(([k, a, b]) => <linearGradient key={k} id={"lps" + k} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>)}
          <filter id="lpsoft"><feGaussianBlur stdDeviation="14" /></filter>
        </defs>
        <ellipse cx="600" cy="262" rx="560" ry="10" fill="#000" opacity=".25" filter="url(#lpsoft)" />
        <rect x="10" y="30" width="1180" height="190" rx="22" fill="url(#lpsteel)" stroke="#6a7076" strokeWidth="1.5" />
        <rect x="10" y="150" width="1180" height="20" fill="url(#lpstripe)" />
        <path d="M250 38V210M470 38V210M690 38V210M910 38V210M1120 38V210" stroke="#7b8187" strokeWidth="1.2" opacity=".8" />
        <g fill="#7b8187" opacity=".7"><circle cx="26" cy="46" r="2" /><circle cx="1174" cy="46" r="2" /><circle cx="26" cy="204" r="2" /><circle cx="1174" cy="204" r="2" /></g>
        {[60, 270, 480, 690, 900].map((x, i) => <g key={x} transform={`translate(${x},58)`}>
          <rect x="-6" y="-6" width="192" height="92" rx="10" fill="#3b4147" /><rect width="180" height="80" rx="6" fill={`url(#lps${"abcde"[i]})`} />
          <g clipPath="url(#lpwc)">
            {i === 0 && <g fill="#2c333a"><rect x="8" y="34" width="22" height="60" /><rect x="36" y="14" width="26" height="80" /><rect x="47" y="0" width="2" height="16" /><rect x="70" y="42" width="20" height="50" /><rect x="96" y="22" width="30" height="70" /><rect x="132" y="36" width="22" height="56" /><rect x="160" y="52" width="16" height="40" /></g>}
            {i === 1 && <g><g fill="#6B3E22"><rect x="2" y="34" width="56" height="60" /><rect x="62" y="28" width="52" height="70" /><rect x="118" y="38" width="60" height="60" /></g><g fill="#432615"><rect x="0" y="30" width="60" height="6" /><rect x="60" y="24" width="56" height="6" /><rect x="116" y="34" width="64" height="6" /></g></g>}
            {i === 2 && <g fill="#4D4036"><rect x="4" y="46" width="62" height="46" /><rect x="72" y="40" width="50" height="52" /><rect x="138" y="24" width="26" height="20" /><rect x="142" y="44" width="2" height="18" /><rect x="158" y="44" width="2" height="18" /><rect x="128" y="62" width="50" height="30" /></g>}
            {i === 3 && <g fill="#3D342D"><polygon points="8,92 8,40 30,40 30,24 56,24 56,40 78,40 78,92" /><polygon points="96,92 96,52 120,52 120,34 150,34 150,92" /></g>}
            {i === 4 && <g><polygon points="14,92 14,54 50,28 86,54 86,92" fill="#5A3E2C" /><polygon points="104,92 104,62 134,40 164,62 164,92" fill="#3E2C20" /><rect x="0" y="76" width="180" height="6" fill="#4C6B3A" opacity=".8" /></g>}
            <g fill="#F2D488" opacity=".85">{[[16 + i * 3, 50], [40, 50], [84, 56], [112, 46], [140, 58]].map(([a, b], k) => <rect key={k} x={a} y={b} width="6" height="8" />)}</g>
          </g>
          <rect width="180" height="80" rx="6" fill="url(#lpglass)" />
        </g>)}
        <path d="M10 218 H1190 V206 a22 22 0 0 1 -22 12 H32 a22 22 0 0 1 -22 -12Z" fill="#7b8187" opacity=".5" />
        <g fill="#20252a">{[150, 350, 850, 1050].map(x => <circle key={x} cx={x} cy="238" r="14" />)}</g><g fill="#8a9096">{[150, 350, 850, 1050].map(x => <circle key={x} cx={x} cy="238" r="5" />)}</g>
        <rect x="0" y="252" width="1200" height="5" fill="#2a2520" opacity=".85" />
      </svg>
    </div></section>

    <section id="how" className="lp-sec lp-dark"><div className="lp-in">
      <p className="lp-eyebrow">How it works</p><h2>From address to full picture in three stops.</h2>
      <ol className="lp-steps">{STEPS.map(s => <li key={s.n}><Bul c={s.c} t={s.n} /><h3>{s.t}</h3><p>{s.d}</p></li>)}</ol>
    </div></section>

    <section id="who" className="lp-sec"><div className="lp-in">
      <p className="lp-eyebrow">Who it's for</p><h2>Made for how New York owners actually operate.</h2>
      <div className="lp-who">{WHO.map(w => <article key={w.t}><Bul c={w.c} t={w.l} /><div><h3>{w.t}</h3><p>{w.d}</p></div></article>)}</div>
    </div></section>

    <section className="lp-sec lp-gray"><div className="lp-in lp-trustgrid">
      <div className="lp-art lp-panel" aria-hidden="true">
        <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice">
          <defs>
            <filter id="lpglaze" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="n" /><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .22 0" /><feComposite in2="SourceGraphic" operator="in" /></filter>
            {[["g1", "#3F8794", "#4A93A0", "#2D6C78"], ["g2", "#1d1710", "#B3721F", ""], ["g3", "#cfc9b8", "#F1ECDD", ""], ["g4", "#3a2e10", "#E9B81A", ""]].map(([k, grout, face]) => <pattern key={k} id={"lp" + k} width="12.5" height="12.5" patternUnits="userSpaceOnUse"><rect width="12.5" height="12.5" fill={grout} /><rect x=".6" y=".6" width="11.3" height="11.3" rx="1.5" fill={face} /><rect x=".6" y=".6" width="11.3" height="3" rx="1.5" fill="#fff" opacity=".16" /></pattern>)}
            <linearGradient id="lpgl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".25" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".25" /></linearGradient>
          </defs>
          <rect width="300" height="400" fill="url(#lpg1)" />
          <rect x="12" y="12" width="276" height="376" fill="none" stroke="url(#lpg3)" strokeWidth="12" />
          <polygon points="150,78 234,126 234,274 150,322 66,274 66,126" fill="url(#lpg3)" stroke="#1d1710" strokeWidth="1.2" />
          <polygon points="150,100 214,137 214,263 150,300 86,263 86,137" fill="url(#lpg2)" />
          <g fill="url(#lpg4)" stroke="#1d1710" strokeWidth="1"><polygon points="150,42 166,62 150,80 134,62" /><polygon points="150,320 166,340 150,358 134,340" /><polygon points="42,200 62,184 80,200 62,216" /><polygon points="220,200 238,184 258,200 238,216" /></g>
          <text x="150" y="236" textAnchor="middle" fontFamily="Georgia,serif" fontSize="132" fill="#F1ECDD" stroke="#1d1710" strokeWidth="1.5" paintOrder="stroke">R</text>
          <rect width="300" height="400" fill="url(#lpgl)" /><rect width="300" height="400" fill="#000" filter="url(#lpglaze)" />
        </svg>
      </div>
      <div>
        <p className="lp-eyebrow">Why people can trust it</p><h2>Clear about where numbers come from.</h2>
        <div className="lp-trust">{TRUST.map(t => <div key={t.t}><h3>{t.t}</h3><p>{t.d}</p></div>)}</div>
        <p className="lp-warn"><strong>Important:</strong> {GLOBAL_DISCLAIMER} Information from outside sources may not be 100% accurate.</p>
      </div>
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
