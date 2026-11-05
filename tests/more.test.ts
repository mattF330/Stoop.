import { describe, it, expect } from "vitest";
import { relevantNews } from "../src/lib/alerts";
import { toCsv } from "../src/lib/csv";
import { parseFlag, flagQuery } from "../supabase/functions/_shared/nyc";
import { createDemoClient } from "../src/lib/demo";

const n = (o: any) => ({ id: "1", title: "", excerpt: "", topics: [], published_at: null, url: "u", source_name: "s", ...o });
describe("alerts", () => {
  it("matches borough and stabilization", () => {
    const r = relevantNews({ borough: "Brooklyn", address: "x", isStabilizedPossible: true }, [n({ title: "Brooklyn sales up" }), n({ title: "RGB vote", topics: ["rent-stabilization"] }), n({ title: "Unrelated" })]);
    expect(r.length).toBe(2);
  });
  it("no match → empty", () => expect(relevantNews({ borough: null, address: "x" }, [n({ title: "zzz" })])).toEqual([]));
});
describe("csv", () => {
  it("escapes and neutralizes formulas", () => { const c = toCsv([{ a: "x,y", b: "=SUM(A1)", c: 'q"t' }]); expect(c).toContain('"x,y"'); expect(c).toContain("'=SUM(A1)"); expect(c).toContain('"q""t"'); });
});
describe("flags", () => {
  it("unchecked is not 'not listed'", () => expect(parseFlag(null, false, "L")).toEqual({ checked: false, listed: false, evidence: null }));
  it("hit/miss", () => { expect(parseFlag([{}], true, "L").listed).toBe(true); expect(parseFlag([], true, "L").listed).toBe(false); });
  it("rejects injection in field", () => expect(() => flagQuery("a;drop", "3000010001")).toThrow());
});
describe("demo client", () => {
  const store: Record<string, string> = {}; (globalThis as any).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } };
  it("crud + cascade", async () => {
    const c = createDemoClient();
    const p = await c.from("properties").insert({ address: "1 A St", user_id: "demo-user" }).select().single();
    expect(p.data.id).toBeTruthy();
    await c.from("loans").insert({ property_id: p.data.id, principal: 1 });
    await c.from("properties").update({ nickname: "N" }).eq("id", p.data.id);
    expect((await c.from("properties").select("*").eq("id", p.data.id).single()).data.nickname).toBe("N");
    await c.from("properties").delete().eq("id", p.data.id);
    expect((await c.from("loans").select("*")).data.length).toBe(0);
  });
  it("duplicate terms rejected", async () => { const c = createDemoClient(); const row = { user_id: "u", terms_version: "v" }; await c.from("terms_acceptances").insert(row); expect((await c.from("terms_acceptances").insert(row)).error).toBeTruthy(); });
});
