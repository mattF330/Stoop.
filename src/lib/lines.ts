import type { PropertyRow } from "./data";
// Subway-style borough "lines" and property search matching.
const LINE: Record<string, [string, string]> = { manhattan: ["M", "#EE352E"], brooklyn: ["K", "#FF6319"], queens: ["Q", "#B933AD"], bronx: ["Bx", "#00933C"], "staten island": ["S", "#0039A6"] };
export const lineFor = (b: string | null): [string, string] => LINE[(b ?? "").toLowerCase()] ?? ["•", "#6D6E71"];
export const matchProps = (props: PropertyRow[], q: string) => {
  const t = q.trim().toLowerCase(); if (!t) return props;
  return props.filter(p => `${p.nickname ?? ""} ${p.address} ${p.borough ?? ""}`.toLowerCase().includes(t));
};
