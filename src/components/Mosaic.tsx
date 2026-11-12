import { useEffect, useRef } from "react";

// A skyline drawn tile by tile, in the spirit of the glass-tile mosaics in NYC subway stations.
// Seeded, so it looks the same on every load. Decorative only.
function rng(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rgb = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const shade = (c: string, k: number) => `rgb(${rgb(c).map(v => Math.max(0, Math.min(255, Math.round(v * k)))).join(",")})`;

function paint(cv: HTMLCanvasElement, night: boolean) {
  const box = cv.parentElement!.getBoundingClientRect();
  const w = Math.max(120, Math.round(box.width)), h = Math.max(120, Math.round(box.height));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext("2d"); if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const T = Math.max(8, Math.round(w / (night ? 72 : 64))), cols = Math.ceil(w / T), rows = Math.ceil(h / T), R = rng(night ? 7 : 21);
  const sky = night ? ["#0B1630", "#10224A", "#16316A", "#1E4586", "#2A5A9A", "#3F72AA"] : ["#2C5C77", "#3A7388", "#4E8C98", "#7FB3B5", "#BFD8C9", "#E9E3C8"];
  const bld = night ? ["#0A0D18", "#101523", "#161C2E"] : ["#4E2D15", "#6A3C1B", "#7A4723", "#9B5E26"];
  const lit = night ? ["#FCCC0A", "#F2C45A", "#FFE08A"] : ["#F0C063", "#E6B55C", "#F5D28A"];
  const water = night ? ["#0F2A4A", "#16406A", "#1E4F7E"] : ["#2F6F7B", "#3F8794", "#4E9AA5"];
  const border = ["#3F7F6F", "#6AA08E", "#F1ECDD"];
  const grid: string[][] = Array.from({ length: rows }, () => Array<string>(cols).fill("#000000"));
  const wr = Math.round(rows * 0.86);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = Math.min(sky.length - 1, Math.max(0, Math.floor((r / wr) * sky.length + (R() - 0.5) * 1.3)));
    grid[r][c] = sky[i];
  }
  const sx = Math.round(cols * 0.72), sy = Math.round(wr * (night ? 0.26 : 0.62)), sr = Math.round(cols * (night ? 0.07 : 0.11));
  const orb = night ? ["#F4EFD8", "#E9E3C8", "#FFF6D6"] : ["#FCCC0A", "#F5B90B", "#FDD94A"];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const d = Math.hypot(c - sx, r - sy);
    if (d <= sr) grid[r][c] = orb[Math.floor(R() * 3)]; else if (!night && d <= sr + 2 && R() < 0.5) grid[r][c] = "#F6E08A";
  }
  let x = 1, tallest = -1;
  while (x < cols - 1) {
    let bw = 3 + Math.floor(R() * 4), bh = Math.floor(rows * (0.18 + R() * 0.34));
    if (x > cols * 0.36 && tallest < 0) { bw = 7; bh = Math.floor(rows * 0.68); tallest = x; }
    for (let cc = x; cc < Math.min(cols - 1, x + bw); cc++) {
      let top = wr - bh;
      if (tallest === x) top = wr - bh + Math.abs(cc - x - 3) * 3;
      for (let r = Math.max(0, top); r < wr; r++) {
        const on = (r + cc) % 3 === 0 && r - top > 1 && (cc - x) % 2 === 1 && R() < (night ? 0.7 : 0.5);
        grid[r][cc] = on ? lit[Math.floor(R() * 3)] : bld[Math.floor(R() * bld.length)];
      }
    }
    if (tallest === x) for (let r = Math.max(0, wr - bh - 8); r < wr - bh; r++) grid[r][x + 3] = bld[0];
    x += bw + (R() < 0.3 ? 1 : 0);
  }
  for (let r = wr; r < rows; r++) for (let c = 0; c < cols; c++) grid[r][c] = water[Math.floor(((r - wr) + R() * 2) / 1.6) % 3];
  if (!night) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const e = Math.min(r, c, rows - 1 - r, cols - 1 - c);
    if (e < 2) grid[r][c] = border[(r + c + e) % 3 === 0 ? 2 : e ? 1 : 0];
  }
  g.fillStyle = night ? "#03060d" : "#1a1510"; g.fillRect(0, 0, w, h);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    g.fillStyle = shade(grid[r][c], 0.88 + R() * 0.22);
    const px = c * T, py = r * T, s = T - 1.6;
    g.beginPath(); g.roundRect ? g.roundRect(px + 0.8, py + 0.8, s, s, Math.max(1.5, T * 0.14)) : g.rect(px + 0.8, py + 0.8, s, s); g.fill();
    g.fillStyle = "rgba(255,255,255,.16)"; g.fillRect(px + 1.2, py + 1.2, s - 1.2, 1);
  }
}

export default function Mosaic({ night = false, label }: { night?: boolean; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv?.parentElement) return;
    let t = 0;
    const go = () => { window.clearTimeout(t); t = window.setTimeout(() => paint(cv, night), 120); };
    paint(cv, night);
    const ro = new ResizeObserver(go); ro.observe(cv.parentElement);
    return () => { ro.disconnect(); window.clearTimeout(t); };
  }, [night]);
  return <canvas ref={ref} role="img" aria-label={label} />;
}
