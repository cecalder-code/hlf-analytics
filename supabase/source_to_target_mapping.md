# Source-to-Target Mapping: Coffee Grounds Data

This document maps current legacy Excel fields and Tableau/Alteryx-derived metrics to the Supabase schema and SQL views.

## Summary

- Raw Excel source data is stored in `public.pickups` and normalized store metadata is stored in `public.stores`.
- Derived business metrics are implemented in SQL views under `public.vw_*`.
- Reporting-only helper fields are either removed or computed at query/report time.
- All Tableau metrics identified in the workbook can be produced by the current schema and SQL views.

## Raw Excel Fields

Excel Field Name | Alteryx Source | Tableau Usage | Destination Table | Destination Column | Future Calculation Location | Notes
--- | --- | --- | --- | --- | --- | ---
Store | Raw Excel column | Used to derive store number/name and lookup store metadata | `public.pickups` / `public.stores` | `raw_store_name` (pickups), `store_id` via lookup | Stored / SQL View | Raw input preserved for auditing; normalized into `stores` using store mapping rules.
Date | Raw Excel column | Primary collection date for Tableau date filters & week grouping | `public.pickups` | `pickup_date` | Stored | Primary date dimension for all downstream calculations.
Week # | Raw Excel column | Used to construct weekly labels and validate week grouping | `public.pickups` | `week_number` | Stored | Should map directly to `week_number`.
SCG mass lbs | Raw Excel column | Used as raw collection weight and business metric input | `public.pickups` | `scg_mass_lbs` | Stored | Equivalent to `scg_mass_lbs`.
Who initiated pickup? | Raw Excel column | Displayed in detail views and pickup audit logs | `public.pickups` | `pickup_initiated_by` | Stored | Raw data field.
# of Days between collections | Raw Excel column | Input for `Per Day (lbs)` and interval trend metrics | `public.pickups` | `raw_days_between_collections` | Stored | Keep raw value for validation; also recompute in SQL view if needed.
Days Since 1st Collection | Raw Excel column | Used for time-since-first-pickup reporting and validation | `public.pickups` | `raw_days_since_first_collection` | Stored | Preserve raw source; view derives actual value from `pickup_date` sequence.
SBUX FY Week # | Raw Excel/report helper | Tableau fiscal week label or helper | _Reporting-only_ | _none_ | Frontend / SQL View | Reporting helper; not needed in core normalized schema.
FY Week # Helper | Raw Excel/report helper | Intermediate week label for Tableau calculations | _Reporting-only_ | _none_ | Frontend / SQL View | Reporting-only; compute from `pickup_date` instead.
Day of the week | Raw Excel/report helper | Tableau weekday grouping and labels | _Reporting-only_ | _none_ | SQL View / Frontend | Derived from `pickup_date` when needed.

### Exact Excel Header Variants (from source workbook)

The table below lists the exact header strings present in the source `Collection DB` sheet and the canonical mapping used by the generator and the Supabase schema/views.

Excel Header | Mapped To | Destination Column / Location | Notes
:--- | :--- | :--- | :---
Week # | `week_number` | `public.pickups.week_number` | Stored in pickups; used for weekly grouping/validation.
SBUX FY Week # | `reporting_only` | _none_ | Fiscal-week helper; compute from `pickup_date` in views or frontend.
FY Week # Helper | `reporting_only` | _none_ | Reporting helper; not persisted.
Date | `pickup_date` | `public.pickups.pickup_date` | Primary date field.
Day of the week | `reporting_only` | _none_ | Reporting helper; derive from `pickup_date`.
Store | `raw_store_name` | `public.pickups.raw_store_name` | Raw store label; normalize into `public.stores`.
SCG mass lbs | `scg_mass_lbs` | `public.pickups.scg_mass_lbs` | Raw collection weight.
Net lbs | `net_lbs` | `public.pickups.net_lbs` | Net pounds used in metrics.
# of Days between collections | `raw_days_between_collections` | `public.pickups.raw_days_between_collections` | Raw interval value; used to compute `per_day_lbs`.
Days Since 1st Collection | `raw_days_since_first_collection` | `public.pickups.raw_days_since_first_collection` | Reporting helper preserved from source.
Who initiated pickup? | `pickup_initiated_by` | `public.pickups.pickup_initiated_by` | Collector identifier/name.
Per Day (lbs) | `per_day_lbs` | `public.vw_pickup_base.per_day_lbs` | Derived metric: `net_lbs / NULLIF(raw_days_between_collections, 0)`.
Running Total | `running_total` | `public.vw_pickup_base.running_total` | Derived rolling sum of `net_lbs`.
Master Gardener | `master_gardener` | `public.pickups.master_gardener` | Raw numeric contribution.
MG Deposit Date | `mg_deposit_date` | `public.pickups.mg_deposit_date` | Raw date.
Cardboard (lbs) | `cardboard_lbs` | `public.pickups.cardboard_lbs` | Raw weight.
Food Waste (lbs) | `food_waste_lbs` | `public.pickups.food_waste_lbs` | Raw weight.
Route | `route` | `public.pickups.route` | Raw route label.
Miles Driven | `miles_driven` | `public.pickups.miles_driven` | Distance used for transportation CO2e.
Truck Odometer | `truck_odometer` | `public.pickups.truck_odometer` | Raw odometer reading.
Notes | `notes` | `public.pickups.notes` | Freeform notes.

## Standardized Field Mapping

Excel Field Name | Known Mapping | Destination Table | Destination Column | Notes
--- | --- | --- | --- | ---
Store Number | `store_number` | `public.stores` | `store_number` | Normalized store key.
Store Name | `raw_store_name` | `public.pickups` | `raw_store_name` | Raw store label; join to `stores` for canonical metadata.
Pickup Date | `pickup_date` | `public.pickups` | `pickup_date` | Primary date.
SCG mass (lbs) | `scg_mass_lbs` | `public.pickups` | `scg_mass_lbs` | Raw collected weight.
Net lbs | `net_lbs` | `public.pickups` | `net_lbs` | Raw net pounds.
Pickup initiated by | `pickup_initiated_by` | `public.pickups` | `pickup_initiated_by` | Raw collector field.
Master gardener | `master_gardener` | `public.pickups` | `master_gardener` | Raw numeric field.
MG deposit date | `mg_deposit_date` | `public.pickups` | `mg_deposit_date` | Raw date field.
Cardboard (lbs) | `cardboard_lbs` | `public.pickups` | `cardboard_lbs` | Raw weight.
Food waste (lbs) | `food_waste_lbs` | `public.pickups` | `food_waste_lbs` | Raw weight.
Route | `route` | `public.pickups` | `route` | Raw route.
Miles driven | `miles_driven` | `public.pickups` | `miles_driven` | Raw travel distance.
Truck odometer | `truck_odometer` | `public.pickups` | `truck_odometer` | Raw odometer reading.
Notes | `notes` | `public.pickups` | `notes` | Raw notes.

## Derived Business Metrics and SQL View Mapping

Legacy Metric | Exact Formula | SQL View | Destination Column | Recommended Calculation Location | Notes
--- | --- | --- | --- | --- | ---
CO2e (lbs) | `net_lbs * 0.154` | `public.vw_pickup_base` | `co2e_lbs` | SQL View | Matches current Alteryx formula.
Transportation CO2e | `miles_driven * 0.89` | `public.vw_pickup_base` | `transportation_co2e` | SQL View | Tableau KPI.
SCG lbs per mile driven | `net_lbs / NULLIF(miles_driven, 0)` | `public.vw_pickup_base` | `scg_lbs_per_mile` | SQL View | Avoid divide-by-zero.
CO2e Avoided per Mile | `co2e_lbs / NULLIF(miles_driven, 0)` | `public.vw_pickup_base` | `co2e_avoided_per_mile` | SQL View | Derived from CO2e and distance.
Per Day (lbs) | `net_lbs / NULLIF(raw_days_between_collections, 0)` | `public.vw_pickup_base` | `per_day_lbs` | SQL View | Derived metric used in Tableau.
Rubicon Period | `CASE WHEN pickup_date > '2026-01-06' THEN 'Rubicon Hauling' ELSE 'Pre-Rubicon' END` | `public.vw_pickup_base` | `rubicon_period` | SQL View | Hard-coded threshold preserved.
Year and Week # | `TO_CHAR(pickup_date, 'YYYY IW')` | `public.vw_pickup_base` | `year_and_week` | SQL View | Equivalent to Tableau `STR(YEAR([Date])) + ' ' + STR([Week #])`.
Days since first collection | `date_part('day', pickup_date - first_value(pickup_date) OVER (PARTITION BY store_id ORDER BY pickup_date))` | `public.vw_pickup_base` | `days_since_first_collection` | SQL View | More reliable than raw helper column.
Days between collections | `date_part('day', pickup_date - lag(pickup_date) OVER (PARTITION BY store_id ORDER BY pickup_date))` | `public.vw_pickup_base` | `days_between_collections` | SQL View | Computed from ordered pickups.
Running Total | `SUM(net_lbs) OVER (ORDER BY pickup_date, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` | `public.vw_pickup_base` | `running_total` | SQL View | Rolling cumulative total.
YTD Net Lbs | `SUM(net_lbs) FILTER (WHERE date_part('year', pickup_date) = date_part('year', current_date) AND pickup_date <= current_date)` | `public.vw_ytd_metrics` | `ytd_net_lbs` | SQL View | Current-year total.
Methane Avoided (lbs) | `SUM(co2e_lbs) / 28` | `public.vw_dashboard_metrics` | `methane_avoided_lbs` | SQL View | Tableau KPI.
Avg Weekly SCG | `SUM(net_lbs) / COUNT(DISTINCT year_and_week)` | `public.vw_dashboard_metrics` | `avg_weekly_scg_lbs` | SQL View | Weekly performance metric.
Total CO2e Diverted | `SUM(co2e_lbs)` | `public.vw_dashboard_metrics` | `total_co2e_lbs_diverted` | SQL View | KPI.
Total Transportation CO2e | `SUM(transportation_co2e)` | `public.vw_dashboard_metrics` | `total_transportation_co2e_lbs` | SQL View | KPI.

## Tableau Calculated Field Captions and Mappings

This section captures exact Tableau field captions from `HLF SCG Reporting.twb` and maps them to the Supabase schema or reporting layer.

Tableau Caption | Tableau Formula | Mapped To | Notes
--- | --- | --- | ---
Avg Weekly SCG | `SUM([Net lbs])/COUNTD([Calculation_1577948745586528257])` | `public.vw_dashboard_metrics.avg_weekly_scg_lbs` | Equivalent to average weekly SCG by distinct week grouping.
Year and Week # | `STR(YEAR([Date]))+" "+STR([Week #])` | `public.vw_pickup_base.year_and_week` | Computed from `pickup_date` and ISO week.
YTD Net Lbs | `SUM(IF DATEDIFF(('year'),[Date],TODAY()) = 0 AND [Date] <= TODAY() THEN [Net lbs] END)` | `public.vw_ytd_metrics.ytd_net_lbs` | Current-year net pounds.
Methane Avoided (lbs) | `[CO2e (lbs)]/28` | `public.vw_dashboard_metrics.methane_avoided_lbs` | Derived from `co2e_lbs`.
Store Shortened | `if CONTAINS([Store], "Stanton") then "Stanton" elseif CONTAINS([Store], "Red Banks") then "Red Banks" ELSEIF CONTAINS([Store], "100 East 10th Street") then "10th St" else [Store] END` | `public.stores.short_name` or frontend | Store alias logic; normalize in `stores`.
Store Number and Name | `[Calculation_3751217044297113600]+" ("+ ([Calculation_2853030399312756738])+")"` | Reporting-only | Presentation label composed from store number/name.
Store Latitude | `if [Calculation_3751217044297113600]="8582" then 35.582703208531186 elseif ... END` | `public.stores.latitude` | Store lookup mapping.
Store Number | `if CONTAINS([Store], "Stanton") then "8962" elseif ... END` | `public.stores.store_number` | Raw store lookup should be normalized in `stores`.
STDEV Days between collections | `STDEV([# of Days between collections])` | `public.vw_store_metrics.pickup_interval_variance` | Summary variance of interval values.
Window_Max | `if SUM([Net lbs])=WINDOW_MAX(SUM([Net lbs])) then "Max" else "Other" END` | Reporting-only | Chart label logic only.
Transportation CO2e | `[Miles Driven]*.89` | `public.vw_pickup_base.transportation_co2e` | Direct metric.
SCG lbs per mile driven | `[Net lbs]/[Miles Driven]` | `public.vw_pickup_base.scg_lbs_per_mile` | Direct metric.
CO2e Avoided per Mile | `[CO2e (lbs)]/[Miles Driven]` | `public.vw_pickup_base.co2e_avoided_per_mile` | Direct metric.
Icon Placeholder | `MIN(10)` | Reporting-only | UI placeholder.
Rubicon Period | `if [Date]> #2026-01-06# THEN "Rubicon Hauling" ELSE "Pre-Rubicon" END` | `public.vw_pickup_base.rubicon_period` | Same threshold logic.
Store Longitude | `if [Calculation_3751217044297113600]="8582" then -77.37319866266577 elseif ... END` | `public.stores.longitude` | Store lookup mapping.

## Tableau and Reporting-Only Fields

Field | Role | Recommended Treatment | Notes
--- | --- | --- | ---
SBUX FY Week # | Fiscal-week reporting helper | Compute from `pickup_date` in view/query or frontend | Not necessary in normalized storage.
FY Week # Helper | Helper label | Remove from core load; recompute on demand | Reporting-only intermediate field.
Day of the week | Weekday label | Compute in SQL view or frontend from `pickup_date` | Useful for charts/filters.
Store Number and Name | Display label | Build in SQL view or frontend from `stores` values | Presentation-only.
Store Shortened | Display label | Store as `stores.short_name` or derive in SQL view | Store metadata field.
Window_Max | Report highlight | Frontend or chart-specific analytics | UI-only, not stored.
Icon Placeholder | UI placeholder | Frontend | Not part of data model.

## Store Metadata and Normalization

The workbook currently derives store metadata from the raw `Store` column using Tableau logic such as:
- `Store Number` via `CONTAINS([Store], "Stanton") ...`
- `Store Shortened` via string matching
- Latitude / Longitude via store number mapping

In the Supabase design, this should be normalized into `public.stores`:
- `store_number` stores the canonical ID
- `store_name` stores the canonical name
- `short_name` stores the display label
- `latitude` / `longitude` store coordinates
- `active` indicates whether the store is currently active

The `public.pickups` table keeps `raw_store_name` and `store_id`.

## Validation of Tableau Metrics Against Proposed Schema

All identified Tableau metrics can be produced from the current schema and view design:

- `Avg Weekly SCG`: `vw_dashboard_metrics.avg_weekly_scg_lbs`
- `Year and Week #`: `vw_pickup_base.year_and_week` or `vw_weekly_trend.year_and_week`
- `YTD Net Lbs`: `vw_ytd_metrics.ytd_net_lbs`
- `Methane Avoided (lbs)`: `vw_dashboard_metrics.methane_avoided_lbs`
- `Transportation CO2e`: `vw_pickup_base.transportation_co2e`
- `SCG lbs per mile driven`: `vw_pickup_base.scg_lbs_per_mile`
- `CO2e Avoided per Mile`: `vw_pickup_base.co2e_avoided_per_mile`
- `Rubicon Period`: `vw_pickup_base.rubicon_period`
- `Store Number`: `stores.store_number` joined from `raw_store_name`
- `Store Latitude` / `Store Longitude`: `stores.latitude` / `stores.longitude`
- `Total Net lbs`, `Total CO2e`, `Avg Net lbs`, `Collection Count`: available from `vw_dashboard_metrics` and `vw_store_metrics`
- `Weekly trend` and `Monthly heatmap`: available from `vw_weekly_trend` and `vw_monthly_heatmap`
- `Pickup interval variance`: available from `vw_store_metrics.pickup_interval_variance`

### Recommendation

- Derived business metrics should remain in SQL views, not stored physically.
- Store metadata should be normalized in `public.stores` and joined as needed.
- Reporting-only helper fields should not be persisted unless they are required for a specific business rule.

## Action Items

1. Update the field catalog generator so label variants map consistently:
   - `Week #` → `week_number`
   - `Date` → `pickup_date`
   - `Store` → `raw_store_name`
   - `SCG mass lbs` → `scg_mass_lbs`
   - `Who initiated pickup?` → `pickup_initiated_by`
   - `# of Days between collections` → `raw_days_between_collections`
   - `Days Since 1st Collection` → `raw_days_since_first_collection`
2. Preserve raw helper fields only for validation if needed.
3. Keep all derived field formulas in SQL views to ensure a single source of truth.
4. Normalize store labels using explicit `stores` metadata rather than Tableau string logic.
