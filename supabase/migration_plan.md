# Supabase Migration Plan

## Goal
Replace the current Excel + Alteryx + Tableau pipeline with a centralized Supabase data layer and SQL views.

## Source-to-target mapping

### Current State
- Raw source: `Coffee Grounds Data.xlsx` (`Collection DB` sheet)
- Alteryx output: `Coffee Grounds Data - Alteryx Output.xlsx`
  - cleans null values
  - drops unused fields
  - computes `CO2e (lbs)` = `Net lbs * 0.154`
- Tableau workbook: `HLF SCG Reporting.twb`
  - computes weekly and YTD metrics
  - maps store names to store numbers and coordinates
  - generates derived KPI metrics and dashboard filters

### Future State
- Raw source ingested into Supabase tables
  - `stores`
  - `pickups`
- SQL views compute derived metrics
  - `vw_pickup_base`
  - `vw_store_metrics`
  - `vw_dashboard_metrics`
  - `vw_weekly_trend`
  - `vw_monthly_heatmap`
- Frontend uses these views for dashboard charts, filters, and export

## Physical columns (stored in tables)

### `stores`
- `store_number`
- `store_name`
- `short_name`
- `city`
- `state`
- `latitude`
- `longitude`
- `active`

### `pickups`
- `raw_store_name`
- `pickup_date`
- `week_number`
- `scg_mass_lbs`
- `net_lbs`
- `pickup_initiated_by`
- `master_gardener`
- `mg_deposit_date`
- `cardboard_lbs`
- `food_waste_lbs`
- `route`
- `miles_driven`
- `truck_odometer`
- `notes`
- `raw_days_between_collections`
- `raw_days_since_first_collection`

## SQL-derived fields
- `co2e_lbs`
- `transportation_co2e`
- `scg_lbs_per_mile`
- `co2e_avoided_per_mile`
- `per_day_lbs`
- `rubicon_period`
- `year_and_week`
- `days_since_first_collection`
- `days_between_collections`
- `running_total`
- `avg_weekly_scg_lbs`
- `ytd_net_lbs`
- `methane_avoided_lbs`
- `pickup_interval_variance`

## Frontend-calculated fields
- display formatting for store labels
- chart-specific highlight markers such as `Window_Max`
- URL state and dashboard filter persistence
- export formatting for CSV/Excel

## Migration strategy

1. Create Supabase schema and necessary extensions.
2. Create store metadata rows for each store in the dataset.
3. Load `pickups` from the raw Excel sheet, mapping store names to `store_id`.
4. Validate imported results against `Coffee Grounds Data - Alteryx Output.xlsx`.
5. Deploy SQL views and verify metric calculations.
6. Replace Tableau dashboards with frontend queries on Supabase views.

## Historical data import plan

### Step 1: standardize store metadata
- create `stores` with canonical `store_number`, `store_name`, `short_name`, and coordinates
- include any new store names from the Excel dataset

### Step 2: import pickups
- map each Excel row to a `pickups` row
- preserve `raw_store_name` for auditing
- populate all raw numeric fields and dates
- preserve existing `raw_days_between_collections` and `raw_days_since_first_collection` for validation

### Step 3: validate import
- compare counts and aggregated totals against the current Alteryx output
- compare calculated `co2e_lbs` and `vw_dashboard_metrics`

### Step 4: replace the Alteryx file(s)
- disable the manual workflow once the Supabase layer is validated
- keep raw Excel source for archival only
