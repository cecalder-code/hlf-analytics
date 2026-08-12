import openpyxl
import re
import html
import unicodedata
from pathlib import Path

source_excel = Path('Coffee Grounds Data.xlsx')
source_twb = Path('HLF SCG Reporting.twb')
output_catalog = Path('field_catalog.xlsx')
verification_report = Path('field_catalog_verification.txt')

if not source_excel.exists():
    raise FileNotFoundError(f'{source_excel} not found')
if not source_twb.exists():
    raise FileNotFoundError(f'{source_twb} not found')

wb = openpyxl.load_workbook(source_excel, data_only=False)
if 'Collection DB' not in wb.sheetnames:
    raise ValueError('Collection DB sheet not found in workbook')
sheet = wb['Collection DB']

header_row = next(sheet.iter_rows(min_row=1, max_row=1, values_only=False))
headers = [cell.value for cell in header_row]

formula_columns = set()
formula_examples = {}
for row in sheet.iter_rows(min_row=2, max_row=60, values_only=False):
    for idx, cell in enumerate(row):
        if isinstance(cell.value, str) and cell.value.startswith('='):
            formula_columns.add(idx)
            if idx not in formula_examples:
                formula_examples[idx] = cell.value

# Primary excel field mapping
field_name_map = {
    'store number': 'store_number',
    'store name': 'raw_store_name',
    'store': 'raw_store_name',
    'pickup date': 'pickup_date',
    'date': 'pickup_date',
    'week number': 'week_number',
    'week #': 'week_number',
    'sbux fy week #': 'reporting_only',
    'fy week # helper': 'reporting_only',
    'day of the week': 'reporting_only',
    'scg mass (lbs)': 'scg_mass_lbs',
    'scg mass lbs': 'scg_mass_lbs',
    'net lbs': 'net_lbs',
    'pickup initiated by': 'pickup_initiated_by',
    'who initiated pickup?': 'pickup_initiated_by',
    'master gardener': 'master_gardener',
    'mg deposit date': 'mg_deposit_date',
    'cardboard (lbs)': 'cardboard_lbs',
    'food waste (lbs)': 'food_waste_lbs',
    'route': 'route',
    'miles driven': 'miles_driven',
    'truck odometer': 'truck_odometer',
    'notes': 'notes',
    '# of days between collections': 'raw_days_between_collections',
    'days since 1st collection': 'raw_days_since_first_collection',
    'raw days between collections': 'raw_days_between_collections',
    'raw days since first collection': 'raw_days_since_first_collection',
    'per day (lbs)': 'per_day_lbs',
    'running total': 'running_total',
}

def normalize_key(s: str) -> str:
    s = unicodedata.normalize('NFKC', s)
    s = s.replace('\xa0', ' ')
    s = s.lower().strip()
    s = re.sub(r"\s+", ' ', s)
    s = re.sub(r"[^0-9a-z# ]+", '', s)
    return s

normalized_field_map = {normalize_key(k): v for k, v in field_name_map.items()}

derived_fields = {
    'co2e_lbs': 'alteryx',
    'transportation_co2e': 'tableau',
    'scg_lbs_per_mile': 'tableau',
    'co2e_avoided_per_mile': 'tableau',
    'per_day_lbs': 'tableau',
    'rubicon_period': 'tableau',
    'year_and_week': 'tableau',
    'days_since_first_collection': 'tableau',
    'days_between_collections': 'tableau',
    'running_total': 'tableau',
}

def infer_target_field_name(label):
    if label is None:
        return None
    def normalize_key(s: str) -> str:
        s = unicodedata.normalize('NFKC', s)
        s = s.replace('\xa0', ' ')
        s = s.lower().strip()
        s = re.sub(r"\s+", ' ', s)
        s = re.sub(r"[^0-9a-z# ]+", '', s)
        return s

    key = str(label)
    nkey = normalize_key(key)

    # Build a normalized lookup map once
    try:
        normalized_field_map
    except NameError:
        normalized_field_map = {normalize_key(k): v for k, v in field_name_map.items()}

    # direct normalized lookup
    if nkey in normalized_field_map:
        return normalized_field_map[nkey]

    # fallback heuristics
    if 'week' in nkey:
        return 'week_number'
    if nkey in ('date', 'pickup date'):
        return 'pickup_date'
    if 'store' == nkey or nkey.startswith('store '):
        return 'raw_store_name'
    if 'scg' in nkey and 'lbs' in nkey:
        return 'scg_mass_lbs'
    if 'days' in nkey and 'collection' in nkey:
        return 'raw_days_between_collections'

    return None

field_descriptions = {
    'store_number': 'Normalized store identifier; stored in public.stores.store_number',
    'raw_store_name': 'Original store name from Excel source; stored in pickups.raw_store_name',
    'pickup_date': 'Collection date; stored in pickups.pickup_date',
    'week_number': 'Week number from legacy source; stored in pickups.week_number',
    'scg_mass_lbs': 'Raw SCG mass in pounds; stored in pickups.scg_mass_lbs',
    'net_lbs': 'Net pounds after adjustments; stored in pickups.net_lbs',
    'pickup_initiated_by': 'Collector name or identifier; stored in pickups.pickup_initiated_by',
    'master_gardener': 'Master Gardener contribution in pounds; stored in pickups.master_gardener',
    'mg_deposit_date': 'Deposit date for Master Gardener contributions; stored in pickups.mg_deposit_date',
    'cardboard_lbs': 'Cardboard weight in pounds; stored in pickups.cardboard_lbs',
    'food_waste_lbs': 'Food waste weight in pounds; stored in pickups.food_waste_lbs',
    'route': 'Collection route; stored in pickups.route',
    'miles_driven': 'Miles driven for collection; stored in pickups.miles_driven',
    'truck_odometer': 'Truck odometer reading; stored in pickups.truck_odometer',
    'notes': 'Legacy notes field; stored in pickups.notes',
    'raw_days_between_collections': 'Raw days between collections from source Excel; stored in pickups.raw_days_between_collections',
    'raw_days_since_first_collection': 'Raw days since first collection from source Excel; stored in pickups.raw_days_since_first_collection',
    'co2e_lbs': 'Calculated CO2e in pounds; derived in vw_pickup_base.co2e_lbs',
    'transportation_co2e': 'Calculated transportation CO2e; derived in vw_pickup_base.transportation_co2e',
    'scg_lbs_per_mile': 'SCG pounds per mile; derived in vw_pickup_base.scg_lbs_per_mile',
    'co2e_avoided_per_mile': 'CO2e avoided per mile; derived in vw_pickup_base.co2e_avoided_per_mile',
    'per_day_lbs': 'Average SCG pounds per day; derived in vw_pickup_base.per_day_lbs',
    'rubicon_period': 'Rubicon transition label; derived in vw_pickup_base.rubicon_period',
    'year_and_week': 'Year and ISO week string; derived in vw_pickup_base.year_and_week',
    'days_since_first_collection': 'Days since first recorded collection; derived in vw_pickup_base.days_since_first_collection',
    'days_between_collections': 'Days between collections; derived in vw_pickup_base.days_between_collections',
    'running_total': 'Cumulative net pounds; derived in vw_pickup_base.running_total',
}

records = []
unknown_excel_fields = []
for idx, header in enumerate(headers):
    if header is None:
        continue
    target = infer_target_field_name(header)
    calculated = idx in formula_columns
    records.append({
        'legacy_field_name': str(header).strip(),
        'source_sheet': 'Collection DB',
        'source_system': 'excel',
        'target_database_field_name': target or 'unknown',
        'database_field_description': field_descriptions.get(target, ''),
        'calculated_field': calculated,
        'formula_text': formula_examples.get(idx, ''),
        'source_column_index': idx + 1,
    })
    if target is None:
        unknown_excel_fields.append(str(header).strip())

for field_name, origin in derived_fields.items():
    records.append({
        'legacy_field_name': field_name,
        'source_sheet': 'derived',
        'source_system': origin,
        'target_database_field_name': field_name,
        'database_field_description': field_descriptions.get(field_name, ''),
        'calculated_field': True,
        'formula_text': '',
        'source_column_index': None,
    })

# Parse Tableau formulas from the workbook
text = source_twb.read_text(encoding='utf-8')
pattern = re.compile(r"<column[^>]*caption='([^']*)'[^>]*>\s*<calculation[^>]*formula='([^']*)'", re.MULTILINE)
twb_calcs = []
for m in pattern.finditer(text):
    caption = m.group(1)
    formula = html.unescape(m.group(2)).replace('&#13;&#10;', ' ').replace('&#39;', "'")
    twb_calcs.append({'caption': caption, 'formula': formula})

# Write catalog with openpyxl
out_wb = openpyxl.Workbook()
out_sheet = out_wb.active
out_sheet.title = 'Field Catalog'
headers_out = [
    'legacy_field_name',
    'source_sheet',
    'source_system',
    'target_database_field_name',
    'database_field_description',
    'calculated_field',
    'formula_text',
    'source_column_index',
]
out_sheet.append(headers_out)
for record in records:
    out_sheet.append([
        record['legacy_field_name'],
        record['source_sheet'],
        record['source_system'],
        record['target_database_field_name'],
        record['database_field_description'],
        'TRUE' if record['calculated_field'] else 'FALSE',
        record['formula_text'],
        record['source_column_index'],
    ])
out_wb.save(output_catalog)

# Write verification report
lines = [
    f'Source workbook: {source_excel}',
    f'Source Tableau workbook: {source_twb}',
    f'Output catalog: {output_catalog}',
    '',
    f'Excel header count: {len(headers)}',
    f'Excel formula columns detected: {sorted(list(formula_columns))}',
    f'Generated catalog rows: {len(records)}',
    '',
]
if unknown_excel_fields:
    lines.append('Unknown Excel headers with no target mapping:')
    lines.extend(f' - {field}' for field in unknown_excel_fields)
else:
    lines.append('All Excel headers were mapped to target database fields.')

lines.append('')
if twb_calcs:
    lines.append(f'Tableau calculated fields extracted: {len(twb_calcs)}')
    for item in twb_calcs:
        lines.append(f" - {item['caption']}: {item['formula']}")
else:
    lines.append('No Tableau calculated fields were extracted from the TWB file.')

verification_report.write_text('\n'.join(lines), encoding='utf-8')
print(f'Written catalog to {output_catalog}')
print(f'Written verification report to {verification_report}')
print('Unknown Excel fields:', unknown_excel_fields)
print('Tableau calc count:', len(twb_calcs))
