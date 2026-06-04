from pathlib import Path
root = Path('.')
pattern = 'http://localhost:3002'
replacement = 'https://agent.lakala.space'
changed = []
for path in root.rglob('*'):
    if path.is_file() and path.suffix in ['.js', '.json', '.wxss', '.wxml', '.html']:
        text = path.read_text(encoding='utf-8', errors='replace')
        if pattern in text:
            new_text = text.replace(pattern, replacement)
            path.write_text(new_text, encoding='utf-8')
            changed.append(str(path.relative_to(root)))
server_pattern = 'http://localhost:3002/merchant-registration'
server_replacement = 'https://agent.lakala.space/merchant-registration'
for path in [root / 'server.js', root / '上线备份-server.js']:
    if path.exists():
        text = path.read_text(encoding='utf-8', errors='replace')
        if server_pattern in text:
            path.write_text(text.replace(server_pattern, server_replacement), encoding='utf-8')
            changed.append(str(path.relative_to(root)) + ' (merchant-registration URL)')
print('changed files:')
for c in changed:
    print(c)
