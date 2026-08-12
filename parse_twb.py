import pathlib
import re
from html import unescape
path = pathlib.Path('HLF SCG Reporting.twb')
text = path.read_text(encoding='utf-8')
pattern = re.compile(r"<column[^>]*caption='([^']*)'[^>]*>\s*<calculation[^>]*formula='([^']*)'", re.MULTILINE)
results = pattern.findall(text)
for caption, formula in results:
    formula = unescape(formula).replace('&#13;&#10;', ' ').replace('&#39;', "'")
    print('Caption:', caption)
    print('Formula:', formula)
    print('---')
print('Total =', len(results))
