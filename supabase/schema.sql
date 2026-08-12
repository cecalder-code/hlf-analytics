-- Supabase schema for coffee diversion tracking

create extension if not exists "pgcrypto";

-- Normalized store dimension table for stable store metadata and map attributes.
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

-- Raw pickups table stores base source fields from Excel.
create table if not exists public.pickups (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
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

-- Indexes to support filtering and joins for analytics.
create index if not exists idx_pickups_store_id on public.pickups(store_id);
create index if not exists idx_pickups_pickup_date on public.pickups(pickup_date);
create index if not exists idx_pickups_store_date on public.pickups(store_id, pickup_date);
create index if not exists idx_pickups_week_number on public.pickups(week_number);
create index if not exists idx_stores_store_number on public.stores(store_number);
create index if not exists idx_stores_active on public.stores(active);
