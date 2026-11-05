import { describe, it, expect } from "vitest";
import { relevantNews } from "../src/lib/alerts";
import { toCsv } from "../src/lib/csv";
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
import { isRelevant } from "../supabase/functions/_shared/relevance";
describe("news relevance screen", () => {
  it("keeps NYC real estate", () => {
    expect(isRelevant("Rent board schedules vote on stabilized increases", "", "City Limits")).toBe(true);
    expect(isRelevant("Brooklyn landlord fined over heat violations", null)).toBe(true);
    expect(isRelevant("New developer plans tower on Hudson Yards site", "Zoning approved", "Gothamist")).toBe(true);
  });
  it("drops unrelated or non-NYC stories", () => {
    expect(isRelevant("Mets fall in extra innings", "Baseball recap", "Gothamist")).toBe(false);
    expect(isRelevant("Subway delays on the L train", "", "THE CITY")).toBe(false);
    expect(isRelevant("Chicago landlord sued by tenants", "", "Other Outlet")).toBe(false);
    expect(isRelevant("Current parent company different plan", "", "Gothamist")).toBe(false);
  });
});
describe("relevance edge", () => { it("'a lot of' is not real estate", () => expect(isRelevant("A lot of people ride the bus", "", "Gothamist")).toBe(false)); });
import { buildRulesBrief } from "../supabase/functions/_shared/brief";
const bi = (o: any) => ({ title: "t", url: "https://x.com/" + Math.random(), source_name: "S", excerpt: null, topics: [], published_at: null, ...o });
describe("daily brief", () => {
  it("rules brief groups by topic and caps bullets", () => {
    const b = buildRulesBrief([bi({ title: "A", topics: ["regulation"] }), bi({ title: "B", topics: ["regulation"] }), bi({ title: "C", topics: ["market"] }), bi({ title: "D" })], "2026-11-05");
    expect(b.source).toBe("rules"); expect(b.sections[0].title).toBe("Rules and regulation"); expect(b.headline).toContain("4"); expect(b.takeaways.length).toBeGreaterThan(0);
  });
  it("empty day is honest", () => { const b = buildRulesBrief([], "2026-11-05"); expect(b.sections).toEqual([]); expect(b.headline).toMatch(/No NYC/); });
});
