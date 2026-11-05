// Strict screen: keep only stories about NYC real estate. Pure rules, no AI, no imports (shared by Edge Functions and the app).
const STRONG = /\b(landlords?|tenants?|real[- ]estate|realty|housing|apartments?|condos?|co-?ops?|mortgages?|rezon(e|ing|ed)|zoning|evictions?|evicted|rent(s|al|als|ers?)?|rent[- ](stabiliz\w*|guidelines|control\w*|roll)|brownstones?|homeowners?|property tax(es)?|developers?|multifamily|walk-?ups?|leases?|leasing|HPD|DOB|Housing Court|Local Law|Good Cause|Section 8|NYCHA|421-?a|J-?51|landmarks? preservation)\b/i;
const WEAK = /\b(buildings?|propert(y|ies)|construction|tower|towers|development|sales?|listings?|housing market|inspection|violations?|facade|scaffold\w*)\b/i;
const NYC = /\b(NYC|New York City|New York|Brooklyn|Queens|Bronx|Manhattan|Staten Island|Harlem|Williamsburg|Bushwick|Astoria|Flushing|Jamaica|Long Island City|Park Slope|Bed-?Stuy|Hudson Yards|Lower East Side|East Village|Upper (East|West) Side)\b/i;
// Outlets that cover New York City, so a story from them counts as NYC even if it does not name the city.
export const NYC_SOURCES = ["Curbed NY / Vox", "Gothamist", "City Limits", "THE CITY"];

export function isRelevant(title: string, excerpt: string | null | undefined, source?: string): boolean {
  const text = `${title} ${excerpt ?? ""}`;
  const weak = new Set((text.match(new RegExp(WEAK.source, "gi")) ?? []).map(s => s.toLowerCase())).size;
  const realEstate = STRONG.test(text) || weak >= 2;
  const nyc = NYC.test(text) || (source ? NYC_SOURCES.includes(source) : false);
  return realEstate && nyc;
}
