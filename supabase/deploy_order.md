Deployment order for Supabase schema and views

1) Pre-checks
   - Ensure you have a DB owner role or supabase project SQL editor access.
   - Backup existing schema and data.

2) Run `supabase/deploy.sql` as a single script (recommended) or apply sections in order:
   a) Extensions: `create extension if not exists "pgcrypto";`
   b) Tables: create `public.stores` then `public.pickups`.
   c) Foreign keys: add FK from `pickups.store_id` -> `stores.id`.
   d) Indexes: create indexes on `pickups` and `stores` to support joins/filters.
   e) Row Level Security: enable RLS on `stores` and `pickups`, then create policies.
   f) Grants: minimal `SELECT` grants (or adjust to your roles).
   g) Views: create `vw_pickup_base`, dependent metric views (`vw_store_metrics`, `vw_dashboard_metrics`, `vw_ytd_metrics`, `vw_weekly_trend`, `vw_monthly_heatmap`, `vw_store_performance_ranking`).

3) Post-deploy
   - Verify indexes exist and run `ANALYZE` on tables for planner statistics.
   - Run show queries against views to validate expected results.
   - If using Supabase Auth, confirm `auth.role()` semantics and adjust RLS policies as needed.

Notes
 - The script includes `IF NOT EXISTS` guards where practical to make re-runs idempotent.
 - For zero-downtime deployments, create new objects with temporary names, migrate data, then rename.
