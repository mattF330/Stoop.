// Single registry of every outside data source. UI tags and disclaimers read from here.
export type SourceId = "geosearch" | "pluto" | "acris" | "hpd" | "news" | "user" | "estimate";

export interface Source { id: SourceId; name: string; publisher: string; url: string; cadence: string; caveat: string; }

export const SOURCES: Record<SourceId, Source> = {
  geosearch: { id: "geosearch", name: "NYC GeoSearch", publisher: "NYC Dept. of City Planning", url: "https://geosearch.planninglabs.nyc", cadence: "Updated with PLUTO", caveat: "Address matches can be ambiguous; confirm the borough and lot." },
  pluto: { id: "pluto", name: "PLUTO", publisher: "NYC Dept. of City Planning", url: "https://www.nyc.gov/site/planning/data-maps/open-data/dwn-pluto-mappluto.page", cadence: "Monthly", caveat: "Lot data is compiled from several agencies and can be out of date or wrong." },
  acris: { id: "acris", name: "ACRIS", publisher: "NYC Dept. of Finance", url: "https://data.cityofnewyork.us/City-Government/ACRIS-Real-Property-Master/bnx9-e6tj", cadence: "Monthly", caveat: "Recordings lag weeks to months. Mortgage amounts are original principal, not current balance." },
  hpd: { id: "hpd", name: "HPD", publisher: "NYC Housing Preservation & Development", url: "https://data.cityofnewyork.us/Housing-Development/Housing-Maintenance-Code-Violations/wvxf-dwi5", cadence: "Daily", caveat: "Violation status may not reflect work already completed." },
  news: { id: "news", name: "News feeds", publisher: "Third-party publishers", url: "", cadence: "Daily", caveat: "Headlines link to the original publisher. Rambl does not verify articles." },
  user: { id: "user", name: "You", publisher: "Entered by you", url: "", cadence: "-", caveat: "" },
  estimate: { id: "estimate", name: "Rambl estimate", publisher: "Calculated by Rambl", url: "", cadence: "-", caveat: "Estimates use your inputs and assumptions. Not a quote or appraisal." },
};

export const GLOBAL_DISCLAIMER =
  "Rambl shows public records and third-party data. It may be incomplete, delayed or wrong. Verify with the original source before making financial or legal decisions. Not financial, legal or tax advice.";

export const TERMS_VERSION = "2026-11-v3";

export function sourceTag(id: SourceId, asOf?: string | Date | null): string {
  const s = SOURCES[id];
  const d = asOf ? new Date(asOf) : null;
  const when = d && !isNaN(d.getTime()) ? ` · as of ${d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}` : "";
  return `${s.name}${when} · may not be 100% accurate`;
}
