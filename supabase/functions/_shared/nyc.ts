// Pure helpers shared by Edge Functions and tests. No Deno-only APIs.
// Field names come from NYC Open Data docs and are parsed defensively; verify against live responses.
export const SODA = "https://data.cityofnewyork.us/resource";
export const DATASETS = { pluto: "64uk-42ks", acrisLegals: "8h5j-fqxa", acrisMaster: "bnx9-e6tj", hpdViolations: "wvxf-dwi5" } as const;
export const MORTGAGE_TYPES = ["MTGE", "AGMT", "ASST", "SAT", "SATF"];

export interface Candidate { label: string; bbl: string | null; borough: string | null; bin: string | null; lat: number | null; lng: number | null; }

export function parseGeoSearch(json: any): Candidate[] {
  const feats = Array.isArray(json?.features) ? json.features : [];
  return feats.map((f: any): Candidate => {
    const p = f?.properties ?? {};
    const pad = p?.addendum?.pad ?? {};
    const c = f?.geometry?.coordinates;
    return {
      label: String(p.label ?? p.name ?? "Unknown address"),
      bbl: pad.bbl ? String(pad.bbl) : null,
      borough: p.borough ? String(p.borough) : null,
      bin: pad.bin ? String(pad.bin) : null,
      lng: Array.isArray(c) ? Number(c[0]) : null,
      lat: Array.isArray(c) ? Number(c[1]) : null,
    };
  }).filter((c: Candidate) => c.label);
}

export function isValidBBL(b: unknown): b is string { return typeof b === "string" && /^[1-5]\d{9}$/.test(b); }
export function splitBBL(bbl: string) { return { borough: bbl[0], block: String(Number(bbl.slice(1, 6))), lot: String(Number(bbl.slice(6))) }; }

export function parsePluto(rows: any[]) {
  const r = rows?.[0];
  if (!r) return null;
  const n = (v: any) => (v === undefined || v === null || v === "" ? null : Number(v));
  return {
    address: r.address ?? null, landUse: r.landuse ?? null, bldgClass: r.bldgclass ?? null,
    unitsRes: n(r.unitsres), unitsTotal: n(r.unitstotal), floors: n(r.numfloors), yearBuilt: n(r.yearbuilt),
    lotArea: n(r.lotarea), bldgArea: n(r.bldgarea), zoning: r.zonedist1 ?? null, owner: r.ownername ?? null,
    assessLand: n(r.assessland), assessTotal: n(r.assesstot),
    isCondoOrCoop: typeof r.bldgclass === "string" && /^(R|C6|C8|D0|D4)/.test(r.bldgclass),
  };
}

export const DOC_LABELS: Record<string, string> = { DEED: "Deed", DEEDO: "Deed (other)", MTGE: "Mortgage", ASST: "Assignment of mortgage", SAT: "Satisfaction of mortgage", SATF: "Satisfaction (filed)", AGMT: "Agreement", "AL&R": "Assignment of leases & rents" };
export interface AcrisDoc { documentId: string; type: string; label: string; amount: number | null; recorded: string | null; docDate: string | null; }
export function parseAcrisMaster(rows: any[]): AcrisDoc[] {
  return (rows ?? []).map((r: any) => ({
    documentId: String(r.document_id), type: String(r.doc_type ?? ""), label: DOC_LABELS[String(r.doc_type ?? "")] ?? String(r.doc_type ?? ""),
    amount: r.document_amt === undefined || r.document_amt === null ? null : Number(r.document_amt),
    recorded: r.recorded_datetime ?? null, docDate: r.document_date ?? null,
  })).sort((a, b) => String(b.recorded ?? "").localeCompare(String(a.recorded ?? "")));
}

// Rows are either raw violations (each counts 1) or grouped rows {violationstatus, class, n}.
export function summarizeHpd(rows: any[]) {
  const n = (r: any) => { const v = Number(r?.n); return Number.isFinite(v) && r?.n !== undefined ? v : 1; };
  const all = rows ?? [];
  const open = all.filter((r: any) => String(r.violationstatus ?? "").toLowerCase() === "open");
  const cls: Record<string, number> = {};
  for (const r of open) { const k = String(r.class ?? "?"); cls[k] = (cls[k] ?? 0) + n(r); }
  return { sampled: all.reduce((a: number, r: any) => a + n(r), 0), open: open.reduce((a: number, r: any) => a + n(r), 0), byClass: cls };
}

export function sodaUrl(ds: string, params: Record<string, string>) {
  const u = new URL(`${SODA}/${ds}.json`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}
export const soql = (v: string) => v.replace(/'/g, "''");

// Flag datasets (rent stabilization, LL97). Dataset IDs/BBL field names are NOT hardcoded because they must be
// verified against live NYC Open Data; set them as Edge Function secrets, e.g. STAB_DATASET=xxxx-xxxx STAB_BBL_FIELD=ucbbl
export interface FlagResult { checked: boolean; listed: boolean; evidence: string | null; }
export function parseFlag(rows: any[] | null | undefined, checked: boolean, label: string): FlagResult {
  if (!checked) return { checked: false, listed: false, evidence: null };
  const hit = Array.isArray(rows) && rows.length > 0;
  return { checked: true, listed: hit, evidence: hit ? `Appears on ${label}` : `Not found on ${label}` };
}
export function flagQuery(bblField: string, bbl: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(bblField)) throw new Error("bad_field");
  return { $where: `${bblField}='${soql(bbl)}'`, $limit: "1" };
}
