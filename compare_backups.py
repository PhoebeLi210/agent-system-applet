from pathlib import Path
import difflib
from difflib import SequenceMatcher

root = Path('.')
backups = sorted([p for p in root.glob('上线备份-*') if p.is_file()])

for b in backups:
    orig = root / b.name.replace('上线备份-', '')
    print(f'BACKUP: {b.name}')
    if not orig.exists():
        print(f'  -> no original counterpart found: {orig.name}')
        continue
    f1 = b.read_text(encoding='utf-8', errors='replace').splitlines()
    f2 = orig.read_text(encoding='utf-8', errors='replace').splitlines()
    ratio = SequenceMatcher(None, f1, f2).ratio()
    diff = list(difflib.unified_diff(f2, f1, fromfile=orig.name, tofile=b.name, n=0, lineterm=''))
    print(f'  -> original: {orig.name}, similarity: {ratio:.4f}, diff lines: {len(diff)}, backup lines={len(f1)}, orig lines={len(f2)}')
    if diff:
        for d in diff[:60]:
            print('    ' + d)
        if len(diff) > 60:
            print('    ... more diff lines omitted ...')
    print()