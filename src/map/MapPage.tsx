// Self-contained map feature. To remove: delete src/map/, the "/map" route + nav link in App.tsx, and `npm rm maplibre-gl`.
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import { listProperties, type PropertyRow } from "../lib/data";
import { searchAddress } from "../lib/api";

const STYLE = "https://tiles.openfreemap.org/styles/positron"; // free vector tiles, no API key
const NYC: [number, number] = [-73.95, 40.72];
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

type Pt = { lng: number; lat: number };
const cacheKey = (p: PropertyRow) => `stoop.geo.${p.id}.${p.address}`;
function cached(p: PropertyRow): Pt | null { try { const v = localStorage.getItem(cacheKey(p)); return v ? JSON.parse(v) : null; } catch { return null; } }
async function locate(p: PropertyRow): Promise<Pt | null> {
  const c = cached(p); if (c) return c;
  const r = await searchAddress(p.address);
  const m = r.candidates.find(x => x.lat != null && x.lng != null && (!p.bbl || x.bbl === p.bbl)) ?? r.candidates.find(x => x.lat != null && x.lng != null);
  if (!m) return null;
  const pt = { lng: m.lng!, lat: m.lat! };
  try { localStorage.setItem(cacheKey(p), JSON.stringify(pt)); } catch { /* ignore */ }
  return pt;
}

export default function MapPage() {
  const el = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading properties…");
  const [missed, setMissed] = useState<string[]>([]);

  useEffect(() => {
    if (!el.current) return;
    const map = new maplibregl.Map({ container: el.current, style: STYLE, center: NYC, zoom: 10.5, attributionControl: { compact: true } });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    let dead = false;
    (async () => {
      try {
        const props = await listProperties();
        if (!props.length) { setStatus("No properties yet. Add one and it will appear here."); return; }
        const bounds = new maplibregl.LngLatBounds(); const miss: string[] = [];
        for (const p of props) {
          let pt: Pt | null = null; try { pt = await locate(p); } catch { /* treated as not found */ }
          if (dead) return;
          if (!pt) { miss.push(p.nickname || p.address); continue; }
          const pop = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(`<strong>${esc(p.nickname || p.address)}</strong><br/><span style="color:#667">${esc(p.address)}</span><br/><a href="#/property/${encodeURIComponent(p.id)}">Open property →</a>`);
          new maplibregl.Marker({ color: "#2F5BFF" }).setLngLat([pt.lng, pt.lat]).setPopup(pop).addTo(map);
          bounds.extend([pt.lng, pt.lat]);
        }
        setMissed(miss);
        if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 80, maxZoom: 16, duration: 0 });
        setStatus(`${props.length - miss.length} of ${props.length} properties placed`);
      } catch (e) { setStatus(`Couldn’t load properties: ${(e as Error).message}`); }
    })();
    return () => { dead = true; map.remove(); };
  }, []);

  return (<div>
    <div className="row"><h1>Map</h1><span className="note" style={{ margin: 0 }}>{status}</span></div>
    <div ref={el} className="stoop-map" />
    {missed.length > 0 && <p className="note">Couldn’t place: {missed.join(", ")}. The address may not be matched by NYC GeoSearch.</p>}
    <p className="note">Map tiles © OpenStreetMap contributors via OpenFreeMap. Pin positions come from NYC GeoSearch and are approximate; they may not match the exact building or lot.</p>
  </div>);
}
