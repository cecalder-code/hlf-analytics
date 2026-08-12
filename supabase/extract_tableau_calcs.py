import re
import html
from pathlib import Path

source = Path('..') / 'HLF SCG Reporting.twb'
text = source.read_text(encoding='utf-8')
pattern = re.compile(r"<column[^>]*caption='([^']*)'[^>]*>\s*<calculation[^>]*formula='([^']*)'", re.MULTILINE)
seen = {}
for m in pattern.finditer(text):
    caption = html.unescape(m.group(1)).strip()
    formula = html.unescape(m.group(2)).replace('&#13;&#10;', ' ').replace('&#39;', "'").strip()
    if caption not in seen:
        seen[caption] = formula
out = Path('tableau_calcs.txt')
with out.open('w', encoding='utf-8') as f:
    f.write(f'COUNT: {len(seen)}\n')
    for caption, formula in seen.items():
        f.write('CAPTION: ' + caption + '\n')
        f.write('FORMULA: ' + formula + '\n')
        f.write('---\n')
print('wrote', out.resolve())
