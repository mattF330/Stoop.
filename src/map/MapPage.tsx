// Self-contained map feature. To remove: delete src/map/, the "/map" route + nav link in App.tsx, and `npm rm maplibre-gl`.
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import { listProperties, updateRow, type PropertyRow } from "../lib/data";
import { searchAddress } from "../lib/api";

const STYLE = "https://tiles.openfreemap.org/styles/positron"; // free vector tiles, no API key
const NYC: [number, number] = [-73.95, 40.72];
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

type Pt = { lng: number; lat: number };
const cacheKey = (p: PropertyRow) => `stoop.geo.${p.id}.${p.address}`;
function cached(p: PropertyRow): Pt | null { try { const v = localStorage.getItem(cacheKey(p)); return v ? JSON.parse(v) : null; } catch { return null; } }
async function locate(p: PropertyRow): Promise<Pt | null> {
  if (p.lat != null && p.lng != null) return { lat: p.lat, lng: p.lng }; // pin the user placed
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
  const mapRef = useRef<maplibregl.Map | null>(null);
  const placing = useRef<PropertyRow | null>(null);
  const addPin = useRef<(p: PropertyRow, pt: Pt) => void>(() => {});
  const [status, setStatus] = useState("Loading properties…");
  const [missed, setMissed] = useState<PropertyRow[]>([]);
  const [armed, setArmed] = useState<PropertyRow | null>(null);
  const arm = (p: PropertyRow | null) => { placing.current = p; setArmed(p); if (el.current) el.current.style.cursor = p ? "crosshair" : ""; };

  useEffect(() => {
    if (!el.current) return;
    const map = new maplibregl.Map({ container: el.current, style: STYLE, center: NYC, zoom: 10.5, attributionControl: { compact: true } });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    let dead = false;
    const save = async (p: PropertyRow, pt: Pt) => {
      try { await updateRow("properties", p.id, { lat: pt.lat, lng: pt.lng }); try { localStorage.removeItem(cacheKey(p)); } catch { /* ignore */ } setStatus(`Saved pin for ${p.nickname || p.address}`); }
      catch (e) { setStatus(`Couldn’t save pin: ${(e as Error).message}`); }
    };
    addPin.current = (p, pt) => {
      const pop = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(`<strong>${esc(p.nickname || p.address)}</strong><br/><span style="color:#667">${esc(p.address)}</span><br/><a href="#/property/${encodeURIComponent(p.id)}">Open property →</a><br/><span style="color:#667">Drag the pin to move it.</span>`);
      const m = new maplibregl.Marker({ color: "#2F5BFF", draggable: true }).setLngLat([pt.lng, pt.lat]).setPopup(pop).addTo(map);
      m.on("dragend", () => { const l = m.getLngLat(); save(p, { lng: l.lng, lat: l.lat }); });
    };
    map.on("click", e => {
      const p = placing.current; if (!p) return;
      const pt = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      addPin.current(p, pt); save(p, pt); setMissed(m => m.filter(x => x.id !== p.id)); arm(null);
    });
    (async () => {
      try {
        const props = await listProperties();
        if (!props.length) { setStatus("No properties yet. Add one and it will appear here."); return; }
        const bounds = new maplibregl.LngLatBounds(); const miss: PropertyRow[] = [];
        for (const p of props) {
          let pt: Pt | null = null; try { pt = await locate(p); } catch { /* treated as not found */ }
          if (dead) return;
          if (!pt) { miss.push(p); continue; }
          addPin.current(p, pt); bounds.extend([pt.lng, pt.lat]);
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
    {armed && <p className="note">Click the map where <strong>{armed.nickname || armed.address}</strong> is. <a href="#" onClick={e => { e.preventDefault(); arm(null); }}>Cancel</a></p>}
    <div ref={el} className="stoop-map" />
    {missed.length > 0 && <div className="card"><strong>Not placed yet</strong><p className="note">NYC GeoSearch couldn’t match these. Pick one, then click the map to drop its pin.</p>
      {missed.map(p => <div key={p.id} className="row"><span>{p.nickname || p.address}</span><button className="ghost" onClick={() => arm(p)}>Drop pin</button></div>)}</div>}
    <p className="note">Tip: drag any pin to correct its position. Your placement is saved to your account.</p>
    <p className="note">Map tiles © OpenStreetMap contributors via OpenFreeMap. Automatic pin positions come from NYC GeoSearch and are approximate; they may not match the exact building or lot.</p>
  </div>);
}
