import openpyxl
import pathlib
path = pathlib.Path('Coffee Grounds Data.xlsx')
wb = openpyxl.load_workbook(path, data_only=False)
sheet = wb['Collection DB']
rows = list(sheet.iter_rows(max_row=15, values_only=False))
for i, row in enumerate(rows):
    if i == 0:
        print('HEADER:', [cell.value for cell in row])
    else:
        values = []
        formulas = []
        for cell in row:
            values.append(cell.value)
            formulas.append(cell.value if isinstance(cell.value, str) and cell.value.startswith('=') else None)
        print(i, values)
        if any(formulas):
            print('FORMULAS:', formulas)
