-- Supabase deployment script
-- Combines schema, indexes, foreign keys, RLS policies, and views
-- Run this as a privileged user (owner) against the target database

-- 1) extensions
create extension if not exists "pgcrypto";

-- 2) tables
-- stores
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  store_number text not null unique,
  store_name text not null,
  short_name text,
  city text,
  state text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- pickups (depends on stores)
create table if not exists public.pickups (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  raw_store_name text not null,
  pickup_date date not null,
  week_number integer,
  scg_mass_lbs numeric(10,2) not null default 0,
  net_lbs numeric(10,2) not null default 0,
  pickup_initiated_by text,
  master_gardener numeric(10,2) default 0,
  mg_deposit_date date,
  cardboard_lbs numeric(10,2) default 0,
  food_waste_lbs numeric(10,2) default 0,
  route text,
  miles_driven numeric(10,2) default 0,
  truck_odometer numeric(10,2),
  notes text,
  raw_days_between_collections integer,
  raw_days_since_first_collection integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) foreign keys
alter table if exists public.pickups
  add constraint fk_pickups_store_id foreign key (store_id) references public.stores(id) on delete restrict;

-- 4) indexes
create index if not exists idx_pickups_store_id on public.pickups(store_id);
create index if not exists idx_pickups_pickup_date on public.pickups(pickup_date);
create index if not exists idx_pickups_store_date on public.pickups(store_id, pickup_date);
create index if not exists idx_pickups_week_number on public.pickups(week_number);
create index if not exists idx_stores_store_number on public.stores(store_number);
create index if not exists idx_stores_active on public.stores(active);

-- 5) row level security policies
-- Enable RLS and add policies. Adjust `auth.role()` checks to your auth setup if needed.
alter table if exists public.stores enable row level security;
alter table if exists public.pickups enable row level security;

create policy if not exists "Allow public reads on stores" on public.stores for select using (true);
create policy if not exists "Allow public reads on pickups" on public.pickups for select using (true);

create policy if not exists "Allow authenticated inserts on pickups" on public.pickups for insert using (auth.role() = 'authenticated');
create policy if not exists "Allow authenticated updates on pickups" on public.pickups for update using (auth.role() = 'authenticated');
create policy if not exists "Allow authenticated deletes on pickups" on public.pickups for delete using (auth.role() = 'authenticated');

create policy if not exists "Allow authenticated inserts on stores" on public.stores for insert using (auth.role() = 'authenticated');
create policy if not exists "Allow authenticated updates on stores" on public.stores for update using (auth.role() = 'authenticated');
create policy if not exists "Allow authenticated deletes on stores" on public.stores for delete using (auth.role() = 'authenticated');

-- 6) grants (minimal set)
grant select on public.stores to public;
grant select on public.pickups to public;

-- 7) views (create after tables exist)
-- vw_pickup_base
create or replace view public.vw_pickup_base as
select
  p.id,
  p.pickup_date,
  p.store_id,
  s.store_number,
  s.store_name,
  s.short_name as store_shortened,
  s.latitude,
  s.longitude,
  p.raw_store_name,
  p.scg_mass_lbs,
  p.net_lbs,
  p.pickup_initiated_by,
  p.master_gardener,
  p.mg_deposit_date,
  p.cardboard_lbs,
  p.food_waste_lbs,
  p.route,
  p.miles_driven,
  p.truck_odometer,
  p.notes,
  p.raw_days_between_collections,
  p.raw_days_since_first_collection,
  coalesce(p.net_lbs * 0.154, 0) as co2e_lbs,
  coalesce(p.miles_driven * 0.89, 0) as transportation_co2e,
  coalesce(p.net_lbs / nullif(p.miles_driven, 0), 0) as scg_lbs_per_mile,
  coalesce(coalesce(p.net_lbs * 0.154, 0) / nullif(p.miles_driven, 0), 0) as co2e_avoided_per_mile,
  coalesce(p.net_lbs / nullif(p.raw_days_between_collections, 0), 0) as per_day_lbs,
  case when p.pickup_date > date '2026-01-06' then 'Rubicon Hauling' else 'Pre-Rubicon' end as rubicon_period,
  to_char(p.pickup_date, 'YYYY IW') as year_and_week,
  lag(p.pickup_date) over (partition by p.store_id order by p.pickup_date) as prev_pickup_date,
  date_part('day', p.pickup_date - first_value(p.pickup_date) over (partition by p.store_id order by p.pickup_date)) as days_since_first_collection,
  date_part('day', p.pickup_date - lag(p.pickup_date) over (partition by p.store_id order by p.pickup_date)) as days_between_collections,
  sum(p.net_lbs) over (order by p.pickup_date, p.id rows between unbounded preceding and current row) as running_total
from public.pickups p
join public.stores s on s.id = p.store_id;

-- vw_store_metrics
create or replace view public.vw_store_metrics as
select
  s.id as store_id,
  s.store_number,
  s.store_name,
  s.short_name as store_shortened,
  s.latitude,
  s.longitude,
  s.active,
  count(p.id) as collection_count,
  sum(p.net_lbs) as total_net_lbs,
  avg(p.net_lbs) as avg_net_lbs,
  sum(coalesce(p.net_lbs * 0.154, 0)) as total_co2e_lbs,
  avg(coalesce(p.net_lbs / nullif(p.miles_driven, 0), 0)) as avg_scg_lbs_per_mile,
  avg(p.raw_days_between_collections) as avg_days_between_collections,
  stddev_samp(p.raw_days_between_collections) as pickup_interval_variance
from public.stores s
left join public.pickups p on p.store_id = s.id
group by s.id, s.store_number, s.store_name, s.short_name, s.latitude, s.longitude, s.active;

-- vw_dashboard_metrics
create or replace view public.vw_dashboard_metrics as
select
  count(*) as no_of_collections,
  sum(net_lbs) as total_net_lbs,
  avg(net_lbs) as avg_scg_mass_per_collection_lbs,
  avg(per_day_lbs) as avg_scg_generated_per_day_lbs,
  sum(co2e_lbs) as total_co2e_lbs_diverted,
  sum(co2e_lbs) / 28 as methane_avoided_lbs,
  sum(transportation_co2e) as total_transportation_co2e_lbs,
  count(distinct store_id) filter (where s.active) as active_stores,
  sum(master_gardener) as scg_donated_to_pitt_county_arboretum_lbs,
  sum(net_lbs) / nullif(count(distinct year_and_week), 0) as avg_weekly_scg_lbs
from public.vw_pickup_base pb
join public.stores s on s.id = pb.store_id;

-- vw_ytd_metrics
create or replace view public.vw_ytd_metrics as
select
  date_part('year', current_date) as year,
  sum(case when date_part('year', pickup_date) = date_part('year', current_date) and pickup_date <= current_date then net_lbs else 0 end) as ytd_net_lbs,
  sum(case when date_part('year', pickup_date) = date_part('year', current_date) and pickup_date <= current_date then co2e_lbs else 0 end) as ytd_co2e_lbs
from public.vw_pickup_base;

-- vw_weekly_trend
create or replace view public.vw_weekly_trend as
select
  year_and_week,
  min(pickup_date) as week_start,
  max(pickup_date) as week_end,
  sum(net_lbs) as total_net_lbs,
  sum(co2e_lbs) as total_co2e_lbs,
  avg(per_day_lbs) as avg_per_day_lbs,
  count(*) as collection_count
from public.vw_pickup_base
group by year_and_week
order by min(pickup_date);

-- vw_monthly_heatmap
create or replace view public.vw_monthly_heatmap as
select
  date_part('year', pickup_date)::int as year,
  date_part('month', pickup_date)::int as month,
  sum(net_lbs) as total_net_lbs,
  sum(co2e_lbs) as total_co2e_lbs,
  count(*) as collection_count
from public.vw_pickup_base
group by date_part('year', pickup_date), date_part('month', pickup_date)
order by year, month;

-- vw_store_performance_ranking
create or replace view public.vw_store_performance_ranking as
select
  s.store_id,
  s.store_number,
  s.store_name,
  s.store_shortened,
  s.total_net_lbs,
  s.total_co2e_lbs,
  s.avg_net_lbs,
  s.collection_count
from public.vw_store_metrics s
order by s.total_net_lbs desc;

-- end of deployment script
