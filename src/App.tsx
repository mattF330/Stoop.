import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { demo } from "./lib/supabase";
import { DisclaimerGate, Footer } from "./components/Disclaimers";
import AuthPage from "./pages/AuthPage";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import AddProperty from "./pages/AddProperty";
import UpdateBar from "./components/UpdateBar";
import { SideStats, SideAccount } from "./components/SideExtras";
import PropertyDetail from "./pages/PropertyDetail";
import Calculators from "./pages/Calculators";
import News from "./pages/News";
import Settings from "./pages/Settings";
import MapPage from "./map/MapPage";
import Legal from "./pages/Legal";

const BULLET = ["#B933AD", "#00A1DE", "#00933C", "#EE352E", "#0039A6", "#FCCC0A"];
const LETTER = ["P", "Sp", "M", "N", "C", "S"];

export default function App() {
  const { session, loading } = useAuth();
  const loc = useLocation();
  // Legal pages are readable by anyone, including before signing in or accepting the terms.
  if (loc.pathname.startsWith("/legal/")) return <><Routes><Route path="/legal/:doc" element={<Legal />} /></Routes><Footer /></>;
  if (loading) return <div className="wrap">Loading…</div>;
  if (!session) return (<Routes>
    <Route path="/signin" element={<><AuthPage initial="in" /><Footer /></>} />
    <Route path="/signup" element={<><AuthPage initial="up" /><Footer /></>} />
    <Route path="*" element={<Landing />} />
  </Routes>);
  const link = (to: string, n: number, label: string, end = false) => <NavLink to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")}><em className="nb" style={{ background: BULLET[n - 1], color: n === 6 ? "#111" : undefined }}>{LETTER[n - 1]}</em>{label}</NavLink>;
  return (<DisclaimerGate>
    <div className="app">
      <aside>
        <div className="logo"><i>R</i>Rambl</div><div className="logo-sub">NYC rental portfolio</div>
        {link("/", 1, "Portfolio", true)}{link("/map", 3, "Map")}{link("/news", 4, "News")}{link("/calculators", 5, "Calculators")}{link("/settings", 6, "Settings")}
        <SideStats />
        <div className="spacer" />
        <SideAccount />
        {demo && <div className="note" style={{ margin: 0, padding: "0 12px" }}><strong>Demo mode</strong>: fictional sample data stored in this browser only.</div>}
      </aside>
      <div><UpdateBar /><main className="wrap"><Routes>
        <Route path="/" element={<Dashboard />} /><Route path="/add" element={<AddProperty />} /><Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/map" element={<MapPage />} /><Route path="/news" element={<News />} /><Route path="/calculators" element={<Calculators />} /><Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" />} /></Routes></main></div>
    </div><Footer />
  </DisclaimerGate>);
}
