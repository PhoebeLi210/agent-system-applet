from pathlib import Path
import difflib
from difflib import SequenceMatcher

root = Path('.')
# Build a map of basename->paths for non-backup files
files = [p for p in root.rglob('*') if p.is_file() and '上线备份-' not in p.name]
basename_map = {}
for p in files:
    basename_map.setdefault(p.name, []).append(p)

backups = sorted([p for p in root.rglob('上线备份-*') if p.is_file()])

for b in backups:
    name = b.name.replace('上线备份-', '')
    matches = basename_map.get(name, [])
    print(f'BACKUP: {b.relative_to(root)}')
    if not matches:
        print(f'  -> no original counterpart found for basename: {name}')
        continue
    if len(matches) > 1:
        print(f'  -> multiple original candidates for {name}:')
        for m in matches:
            print(f'      {m.relative_to(root)}')
    orig = matches[0]
    print(f'  -> matched original: {orig.relative_to(root)}')
    f1 = b.read_text(encoding='utf-8', errors='replace').splitlines()
    f2 = orig.read_text(encoding='utf-8', errors='replace').splitlines()
    ratio = SequenceMatcher(None, f1, f2).ratio()
    diff = list(difflib.unified_diff(f2, f1, fromfile=str(orig.relative_to(root)), tofile=str(b.relative_to(root)), n=0, lineterm=''))
    print(f'  -> similarity: {ratio:.4f}, diff lines: {len(diff)}, backup lines={len(f1)}, orig lines={len(f2)}')
    if diff:
        for d in diff[:80]:
            print('    ' + d)
        if len(diff) > 80:
            print('    ... more diff lines omitted ...')
    print()