-- OPTIONAL: daily news ingestion. Run AFTER deploying the news-ingest function.
-- Replace <PROJECT_REF> and <CRON_SECRET>. Do not commit real values.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('stoop-news-daily', '0 11 * * *', $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/news-ingest',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','<CRON_SECRET>'),
    body := '{}'::jsonb);
$$);
