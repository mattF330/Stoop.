import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { demo } from "./lib/supabase";
import { DisclaimerGate, Footer } from "./components/Disclaimers";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import AddProperty from "./pages/AddProperty";
import PropertyDetail from "./pages/PropertyDetail";
import Calculators from "./pages/Calculators";
import News from "./pages/News";
import Settings from "./pages/Settings";
import MapPage from "./map/MapPage";

const I = (d: string) => <svg viewBox="0 0 24 24"><path d={d} /></svg>;
const ICON = {
  home: I("M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"),
  news: I("M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5"),
  calc: I("M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 7h8M8 12h2M12 12h2M8 16h2M12 16h2"),
  map: I("M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"),
  gear: I("M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"),
};

export default function App() {
  const { session, loading } = useAuth();
  if (loading) return <div className="wrap">Loading…</div>;
  if (!session) return <><AuthPage /><Footer /></>;
  const link = (to: string, icon: JSX.Element, label: string, end = false) => <NavLink to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")}>{icon}{label}</NavLink>;
  return (<DisclaimerGate>
    <div className="app">
      <aside>
        <div className="logo">Stoop</div>
        {link("/", ICON.home, "Portfolio", true)}{link("/map", ICON.map, "Map")}{link("/news", ICON.news, "News")}{link("/calculators", ICON.calc, "Calculators")}{link("/settings", ICON.gear, "Settings")}
        <div className="spacer" />
        {demo && <div className="note" style={{ margin: 0, padding: "0 12px" }}><strong>Demo mode</strong>: fictional sample data stored in this browser only.</div>}
      </aside>
      <div><main className="wrap"><Routes>
        <Route path="/" element={<Dashboard />} /><Route path="/add" element={<AddProperty />} /><Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/map" element={<MapPage />} /><Route path="/news" element={<News />} /><Route path="/calculators" element={<Calculators />} /><Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" />} /></Routes></main></div>
    </div><Footer />
  </DisclaimerGate>);
}
