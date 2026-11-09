import { describe, it, expect } from "vitest";
import { normBorough, parseCsv, parseMoney, parseDate, cleanText, guessMapping, buildRows } from "../src/lib/import";
describe("import", () => {
  it("parses quoted CSV and tabs", () => { expect(parseCsv('a,b\n"x, y","he said ""hi"""\n')).toEqual([["a", "b"], ["x, y", 'he said "hi"']]); expect(parseCsv("a\tb\n1\t2")).toEqual([["a", "b"], ["1", "2"]]); });
  it("money and dates", () => { expect(parseMoney("$2,500.50")).toBe(2500.5); expect(parseMoney("(300)")).toBe(-300); expect(parseMoney("abc")).toBeNull(); expect(parseDate("6/30/27")).toBe("2027-06-30"); expect(parseDate("2026-02-30")).toBeNull(); expect(parseDate("Mar 5, 2026")).toBe("2026-03-05"); });
  it("cleans formulas and long digit runs", () => { expect(cleanText('=HYPERLINK("x")')).toBe('HYPERLINK("x")'); expect(cleanText("acct 123456789012")).toContain("[removed]"); });
  it("maps headers and blocks account columns", () => { expect(guessMapping("units", ["Apt", "Tenant Name", "Monthly Rent", "Lease Expires", "Account Number"])).toEqual(["label", "tenant_name", "monthly_rent", "lease_end", ""]); });
  it("builds rows with problems flagged", () => {
    const r = buildRows("units", [["1A", "Jo", "$2,000", "7/1/2027"], ["", "X", "abc", "zzz"]], ["label", "tenant_name", "monthly_rent", "lease_end"]);
    expect(r[0].problems).toEqual([]); expect(r[0].row.monthly_rent).toBe(2000); expect(r[0].row.lease_end).toBe("2027-07-01"); expect(r[1].problems.length).toBe(3);
    const e = buildRows("expenses", [["Con Edison", "100"]], ["category", "annual_amount"], true); expect(e[0].row).toEqual({ category: "Electric (common)", annual_amount: 1200 });
  });
  it("maps property columns and normalizes boroughs", () => {
    expect(guessMapping("properties", ["Street Address", "Boro", "Building Name", "# Units", "Purchase Price", "Purchase Date", "Current Value"])).toEqual(["address", "borough", "nickname", "units_residential", "purchase_price", "purchase_date", "current_value"]);
    expect(normBorough("BK")).toBe("Brooklyn"); expect(normBorough("S.I.")).toBe("Staten Island"); expect(normBorough("Hoboken")).toBeNull();
    const r = buildRows("properties", [["1 Main St", "qns", "", "6.4", "$1,000,000", "", ""]], ["address", "borough", "nickname", "units_residential", "purchase_price", "purchase_date", "current_value"]);
    expect(r[0].problems).toEqual([]); expect(r[0].row.borough).toBe("Queens"); expect(r[0].row.units_residential).toBe(6); expect(r[0].row.purchase_price).toBe(1000000);
  });
});
