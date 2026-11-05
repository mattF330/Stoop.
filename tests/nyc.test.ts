import { describe, it, expect } from "vitest";
import { parseGeoSearch, isValidBBL, splitBBL, parsePluto, parseAcrisMaster, summarizeHpd } from "../supabase/functions/_shared/nyc";
import { parseFeed, dedupe, canonicalUrl } from "../supabase/functions/_shared/news";

describe("nyc", () => {
  it("parses geosearch incl. empty/garbage", () => {
    const c = parseGeoSearch({ features: [{ properties: { label: "1 Main St, Brooklyn", borough: "Brooklyn", addendum: { pad: { bbl: "3000010001", bin: "3000001" } } }, geometry: { coordinates: [-73.9, 40.7] } }] });
    expect(c[0].bbl).toBe("3000010001"); expect(c[0].lat).toBe(40.7);
    expect(parseGeoSearch(null)).toEqual([]); expect(parseGeoSearch({})).toEqual([]);
  });
  it("bbl validation + split", () => { expect(isValidBBL("3000010001")).toBe(true); expect(isValidBBL("9000010001")).toBe(false); expect(isValidBBL("3' OR 1=1")).toBe(false); expect(splitBBL("3000010001")).toEqual({ borough: "3", block: "1", lot: "1" }); });
  it("pluto null-safe", () => { expect(parsePluto([])).toBeNull(); expect(parsePluto([{ unitsres: "6", bldgclass: "C1" }])?.unitsRes).toBe(6); expect(parsePluto([{ bldgclass: "R4" }])?.isCondoOrCoop).toBe(true); });
  it("acris sorted newest first", () => { const d = parseAcrisMaster([{ document_id: "a", doc_type: "DEED", recorded_datetime: "2010-01-01" }, { document_id: "b", doc_type: "MTGE", document_amt: "500000", recorded_datetime: "2020-01-01" }]); expect(d[0].documentId).toBe("b"); expect(d[0].amount).toBe(500000); });
  it("hpd summary raw rows", () => expect(summarizeHpd([{ violationstatus: "Open", class: "B" }, { violationstatus: "Close", class: "A" }])).toEqual({ sampled: 2, open: 1, byClass: { B: 1 } }));
  it("hpd summary grouped rows (real shape)", () => expect(summarizeHpd([{ violationstatus: "Close", class: "C", n: "6" }, { violationstatus: "Open", class: "A", n: "1" }, { violationstatus: "Open", class: "B", n: "3" }])).toEqual({ sampled: 10, open: 4, byClass: { A: 1, B: 3 } }));
  it("acris real shapes + labels", () => { const d = parseAcrisMaster([{ document_id: "x", doc_type: "AL&R", document_amt: "5775000.00", recorded_datetime: "2019-10-21T00:00:00.000" }]); expect(d[0].label).toBe("Assignment of leases & rents"); expect(d[0].amount).toBe(5775000); });
  it("pluto real shape", () => { const p = parsePluto([{ bbl: "3006650025.00000000", bldgclass: "C2", unitsres: "6", numfloors: "3.0000000", yearbuilt: "1920", assesstot: "439650.00000", ownername: "200 28TH STREET LLC", zonedist1: "M1-1D" }]); expect(p?.floors).toBe(3); expect(p?.assessTotal).toBe(439650); expect(p?.isCondoOrCoop).toBe(false); });
});
describe("news", () => {
  const rss = `<rss><channel><item><title>NYC rent guidelines vote</title><link>https://x.com/a?utm_source=t</link><description>&lt;p&gt;Board votes&lt;/p&gt;</description><pubDate>${new Date().toUTCString()}</pubDate></item><item><title>NYC rent guidelines vote</title><link>https://y.com/b</link></item></channel></rss>`;
  it("parses, strips, tags", () => { const i = parseFeed(rss, "T"); expect(i[0].url).toBe("https://x.com/a"); expect(i[0].excerpt).toBe("Board votes"); expect(i[0].topics).toContain("rent-stabilization"); });
  it("dedupes by title", () => expect(dedupe(parseFeed(rss, "T")).length).toBe(1));
  it("bad xml safe", () => expect(parseFeed("not xml", "T")).toEqual([]));
  it("canonical", () => expect(canonicalUrl("https://a.com/p?utm_medium=x&id=1#h")).toBe("https://a.com/p?id=1"));
});
