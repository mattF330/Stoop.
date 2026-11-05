# Tar Beach

NYC-only landlord app. Portfolio of properties you own, free NYC public records (GeoSearch, PLUTO, ACRIS, HPD), daily NYC real-estate news, debt and cost breakdowns. No paid data APIs. No AI features in v1.

**Every outside figure is labeled with its source and date and carries "may not be 100% accurate". Users acknowledge a data disclaimer on first use (stored in `terms_acceptances`).** Copy lives in `src/lib/sources.ts`.

## Try it now (no accounts needed)
`npm install && npm run dev`. With no `.env`, Tar Beach runs in **demo mode**: a local, fictional backend in your browser (sample address matches, sample public records, sample news). Banner says DEMO MODE. Add `.env` to switch to real Supabase.

## Status of the live Supabase project ("Stoop.", ref bbgrgoagwcfqxhzwidlm)
- Done: schema + RLS migration applied; signup-trigger function locked down; Edge Functions `nyc-property` (JWT required) and `news-ingest` (secret header) deployed.
- NYC field names were checked against live data (GeoSearch, PLUTO, ACRIS Legals/Master, HPD) and the parsers fixed to match.
- **You still need to:**
  1. Push this folder to the GitHub repo (`git init && git add . && git commit -m "Stoop v0.2" && git remote add origin https://github.com/mattF330/Stoop..git && git push -u origin main`; note the repo name ends with a period). `.env` is gitignored.
  2. Supabase dashboard > Edge Functions > Secrets: add `CRON_SECRET` (any long random string). Until then `news-ingest` rejects every call.
  3. Optional daily news: run `supabase/optional/news_cron.sql` with your project ref and that same secret. Or call the function once by hand to fill the news page.
  4. Authentication > URL Configuration: set Site URL to where you host the app.
- `.env` already holds the project URL and publishable key. Run `npm install && npm run dev`.

## Checks
`npm run typecheck`, `npm test` (finance, NYC parsers, news parser), `npm run build`.

## Must verify against live data (not testable from the build sandbox)
- Socrata dataset IDs and field names in `supabase/functions/_shared/nyc.ts` (PLUTO `64uk-42ks`, ACRIS Legals `8h5j-fqxa`, ACRIS Master `bnx9-e6tj`, HPD violations `wvxf-dwi5`). Parsers are null-safe, so a wrong name shows "—" or an "unavailable" note instead of crashing, but check one real address.
- RSS feed URLs in `news-ingest/index.ts`; failed feeds are reported in the function response.
- Condo/co-op detection is by PLUTO building class (heuristic).

## Not built yet
Monthly snapshot job (table exists), AI assistant (parked).
