import { describe, it, expect } from "vitest";
import { parseCsv, parseMoney, parseDate, cleanText, guessMapping, buildRows } from "../src/lib/import";
import { guessReceipt } from "../src/lib/receipt";
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
  it("guesses receipt fields", () => {
    const g = guessReceipt("ABC Plumbing Inc\nInvoice #12\nDate: 10/05/2026\nLabor 300.00\nSubtotal 300.00\nTax 26.63\nTotal Due $326.63");
    expect(g).toEqual({ date: "2026-10-05", total: 326.63, vendor: "ABC Plumbing Inc" });
  });
});
