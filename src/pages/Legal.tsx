import { Link, Navigate, useParams } from "react-router-dom";
import { GLOBAL_DISCLAIMER, SOURCES } from "../lib/sources";

// Set to your real support address before launch. Shown in the Terms and Privacy Policy.
export const CONTACT_EMAIL = "[add support email]";
const UPDATED = "November 4, 2026";

type Doc = { title: string; body: JSX.Element };

const Terms = (<>
  <h3>1. Agreement</h3>
  <p>These Terms of Service ("Terms") are an agreement between you and Rambl ("Rambl", "we", "us"). By creating an account or using Rambl you agree to them and to the Privacy Policy. If you don’t agree, don’t use Rambl.</p>
  <h3>2. What Rambl is</h3>
  <p>Rambl is a tool for landlords and property owners to organize their own properties, loans, costs and rents, and to view public records, news and maps. It is an organizing and information tool only.</p>
  <h3>3. Not advice</h3>
  <p>Nothing in Rambl is financial, investment, legal, tax, accounting, insurance or real-estate advice. Calculations (such as NOI, cap rate, cash flow, equity, loan balances and debt-service coverage) are estimates produced from numbers you enter and simple formulas. Talk to a qualified professional before making decisions.</p>
  <h3>4. Outside data may be wrong</h3>
  <p>{GLOBAL_DISCLAIMER}</p>
  <p>Rambl displays information from outside sources, including NYC government open-data portals, third-party news publishers and map providers. We do not create or control this information. It can be incomplete, delayed, mismatched to the wrong property or simply incorrect, and we do not guarantee its accuracy, completeness or timeliness. Always verify with the original source before relying on it. See <Link to="/legal/data-sources">Data sources and disclaimers</Link>.</p>
  <h3>5. Your account</h3>
  <p>You must be at least 18 and able to form a binding contract. Give accurate information, keep your password secure, and tell us if you suspect unauthorized use. You are responsible for activity under your account.</p>
  <h3>6. Your content</h3>
  <p>You own the information you enter (properties, loans, expenses, rents, notes). You give us permission to store and process it only to run Rambl for you. You are responsible for having the right to enter it. Don’t enter other people’s sensitive personal data (for example tenants’ government ID or financial account numbers) into free-text fields. When you upload a spreadsheet, photo or receipt, you confirm that it is your own information or that you have the right to use it, and that it does not contain government ID numbers or financial account numbers. Upload only JPEG, PNG or WebP images and spreadsheet or CSV files; Rambl may reject or remove anything else.</p>
  <h3>7. Acceptable use</h3>
  <p>Don’t misuse Rambl. In particular, don’t: break the law; attempt to access other users’ data; probe, scrape or overload the service or its data sources; reverse engineer it; upload malware; or use Rambl to harass, discriminate against, or unlawfully screen tenants or applicants.</p>
  <h3>8. Third-party services</h3>
  <p>Rambl relies on third parties (such as hosting, database, authentication, map-tile and public-data providers). Their availability and terms are outside our control, and Rambl may be interrupted or change if they do.</p>
  <h3>9. Paid plans</h3>
  <p>Rambl may offer paid features in the future. If so, prices, billing, renewal, cancellation and refunds will be shown before you pay and will be added to these Terms.</p>
  <h3>10. Availability and changes</h3>
  <p>Rambl is provided as is, may contain errors, and may change or be discontinued. We may update these Terms; if the changes are material we will ask you to accept the new version before you continue.</p>
  <h3>11. Ending your account</h3>
  <p>You can stop using Rambl and request deletion of your account and data at any time (see the Privacy Policy). We may suspend or end accounts that violate these Terms or put the service at risk.</p>
  <h3>12. Disclaimer of warranties</h3>
  <p>To the fullest extent permitted by law, Rambl and all data in it are provided "as is" and "as available", without warranties of any kind, express or implied, including accuracy, fitness for a particular purpose, merchantability and non-infringement.</p>
  <h3>13. Limitation of liability</h3>
  <p>To the fullest extent permitted by law, Rambl and its owners will not be liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, lost data, or losses from decisions you make using Rambl or data shown in it. Our total liability for any claim is limited to the greater of the amount you paid Rambl in the 12 months before the claim or US $100. Some places don’t allow these limits, so they may not apply to you.</p>
  <h3>14. Governing law</h3>
  <p>These Terms are governed by the laws of the State of New York, without regard to conflict-of-law rules. Disputes will be brought in the state or federal courts located in New York, and you consent to their jurisdiction, except where the law of your location requires otherwise.</p>
  <h3>15. Contact</h3>
  <p>Questions: {CONTACT_EMAIL}.</p>
</>);

const Privacy = (<>
  <h3>What we collect</h3>
  <ul>
    <li><strong>Account:</strong> your email address and login credentials (passwords are handled by our authentication provider; we never see them in plain text).</li>
    <li><strong>What you enter:</strong> properties, addresses, loans, expenses, rent roll entries, notes and preferences, and map pin locations you place.</li>
    <li><strong>Agreements:</strong> a record that you accepted our Terms and which version.</li>
    <li><strong>Technical data:</strong> basic logs kept by our hosting and database providers (such as IP address and request times) for security and reliability.</li>
  </ul>
  <h3>What we do not do</h3>
  <p>We do not sell your personal information, and we do not use your property data for advertising. Rambl does not currently use your data to train AI models.</p>
  <h3>How we use it</h3>
  <p>To run Rambl for you: show your portfolio, compute estimates, look up public information for the addresses you add, keep the service secure, and contact you about your account.</p>
  <h3>Files you upload</h3>
  <p>Spreadsheets, CSV files and receipt or invoice files are read on your device. Rambl saves only the rows or values you confirm, not the file itself. Receipt text is read by software running in your browser; the reader downloads its program files from a public content-delivery network the first time you use it, but your file’s contents are not sent there. Property photos are re-encoded on your device (which removes embedded location data), stored privately in your account, and can be deleted by you at any time; deleting a property deletes its photos.</p>
  <h3>Who handles it</h3>
  <p>We use service providers to operate Rambl: a database and authentication provider (Supabase), web hosting (GitHub Pages), a map-tile provider (OpenFreeMap, which receives the map area your browser requests), and NYC’s public GeoSearch and Open Data services (which receive the addresses or tax-lot numbers you search for). They process data only as needed to provide their services. We may also disclose information if required by law.</p>
  <h3>Your browser</h3>
  <p>Rambl stores display preferences and some cached map positions in your browser’s local storage. You can clear this in your browser settings.</p>
  <h3>Security</h3>
  <p>Each user’s data is protected by access rules so that accounts can only read their own records. No system is perfectly secure, and we cannot guarantee absolute security.</p>
  <h3>Retention and deletion</h3>
  <p>We keep your data while your account is active. You can delete individual properties in the app. To delete your whole account and its data, contact {CONTACT_EMAIL}; in-app account deletion is planned.</p>
  <h3>Your choices and rights</h3>
  <p>You can access, correct and export your data in the app (including CSV export where available) and ask us to delete it. Depending on where you live (for example California or other US states with privacy laws), you may have additional rights, which you can exercise by contacting us.</p>
  <h3>Children</h3>
  <p>Rambl is not intended for people under 18, and we do not knowingly collect their information.</p>
  <h3>Changes and contact</h3>
  <p>We will update this policy as Rambl changes and note the date below. Questions: {CONTACT_EMAIL}.</p>
</>);

const DataSources = (<>
  <p><strong>{GLOBAL_DISCLAIMER}</strong></p>
  <p>Rambl does not create the public data it shows. It is pulled from the outside sources below, may lag behind the originals, and can contain errors or be matched to the wrong property. This page is not an official record. Always confirm with the original source before making financial, legal or tax decisions.</p>
  <h3>Sources used</h3>
  {Object.values(SOURCES).filter(s => !["user", "estimate"].includes(s.id)).map(s => <div key={s.id} className="card">
    <strong>{s.name}</strong> <span className="note" style={{ margin: 0 }}>{s.publisher} · updated {s.cadence}</span>
    <div className="note">{s.caveat}</div>
    <a href={s.url} target="_blank" rel="noreferrer noopener">Original source</a>
  </div>)}
  <div className="card"><strong>Map</strong><div className="note">Map tiles © OpenStreetMap contributors via OpenFreeMap. Pin positions are approximate and may not match the exact building or lot.</div></div>
  <h3>Your numbers and estimates</h3>
  <p>Values you enter are shown as entered. Figures marked "Estimate" are calculated from your inputs and simple assumptions (for example a vacancy rate you set). They are not appraisals, valuations or predictions.</p>
</>);

export const DOCS: Record<string, Doc> = {
  terms: { title: "Terms of Service", body: Terms },
  privacy: { title: "Privacy Policy", body: Privacy },
  "data-sources": { title: "Data sources and disclaimers", body: DataSources },
};

export default function Legal() {
  const { doc } = useParams(); const d = doc ? DOCS[doc] : undefined;
  if (!d) return <Navigate to="/legal/terms" replace />;
  return (<div className="legalpage">
    <header className="legalhead"><Link to="/" className="lg-logo"><i>R</i>Rambl</Link><Link to="/" className="lg-back">← Back to Rambl</Link></header>
    <div className="legal">
      <h1>{d.title}</h1>
      <p className="lg-upd">Last updated {UPDATED}</p>
      <nav className="lg-tabs">{Object.entries(DOCS).map(([k, v]) => <Link key={k} to={`/legal/${k}`} className={k === doc ? "on" : ""}>{v.title}</Link>)}</nav>
      <div className="lg-body">{d.body}</div>
    </div>
  </div>);
}
