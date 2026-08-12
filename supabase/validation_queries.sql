-- Validation queries to compare Supabase SQL results against Tableau outputs.

-- 1. Row counts
select
  (select count(*) from public.pickups) as pickups_count,
  (select count(*) from public.pickups) as excel_row_count;

-- 2. Total Net lbs
select
  sum(net_lbs) as total_net_lbs
from public.pickups;

-- 3. Total CO2e Diverted
select
  sum(coalesce(net_lbs * 0.154, 0)) as total_co2e_lbs
from public.pickups;

-- 4. Avg Weekly SCG
select
  sum(net_lbs) / nullif(count(distinct to_char(pickup_date, 'YYYY IW')), 0) as avg_weekly_scg_lbs
from public.pickups;

-- 5. YTD Net lbs
select
  sum(case when date_part('year', pickup_date) = date_part('year', current_date) and pickup_date <= current_date then net_lbs else 0 end) as ytd_net_lbs
from public.pickups;

-- 6. Methane Avoided
select
  sum(coalesce(net_lbs * 0.154, 0)) / 28 as methane_avoided_lbs
from public.pickups;

-- 7. Avg SCG mass per collection
select
  avg(net_lbs) as avg_scg_mass_per_collection_lbs
from public.pickups;

-- 8. Avg SCG generated per day
select
  avg(coalesce(net_lbs / nullif(raw_days_between_collections, 0), 0)) as avg_scg_generated_per_day_lbs
from public.pickups;

-- 9. Total CO2e Generated from Driving
select
  sum(coalesce(miles_driven * 0.89, 0)) as total_transportation_co2e_lbs
from public.pickups;

-- 10. Active stores count
select
  count(distinct store_id) as active_store_count
from public.pickups p
join public.stores s on s.id = p.store_id
where s.active;

-- 11. Pickup interval variance
select
  stddev_samp(raw_days_between_collections) as pickup_interval_variance
from public.pickups;

-- 12. Weekly trend
select
  to_char(pickup_date, 'YYYY IW') as year_and_week,
  sum(net_lbs) as total_net_lbs,
  sum(coalesce(net_lbs * 0.154, 0)) as total_co2e_lbs,
  avg(coalesce(net_lbs / nullif(raw_days_between_collections, 0), 0)) as avg_per_day_lbs
from public.pickups
where pickup_date is not null
group by to_char(pickup_date, 'YYYY IW')
order by min(pickup_date);

-- 13. Store performance ranking
select
  s.store_number,
  s.store_name,
  sum(p.net_lbs) as total_net_lbs
from public.pickups p
join public.stores s on s.id = p.store_id
group by s.store_number, s.store_name
order by total_net_lbs desc;
