"""Build a versioned, self-contained unpacked-extension ZIP using Python stdlib."""
import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'manifest.json').read_text())
version = manifest['version']
assert re.fullmatch(r'\d+\.\d+\.\d+', version)
files = ['manifest.json', 'background.js', 'content.js', 'options.html', 'options.js', 'README.md', 'AUDIT.md']
references = [manifest['background']['service_worker'], manifest['options_page'], manifest['action']['default_popup']]
references += [name for entry in manifest['content_scripts'] for name in entry['js']]
assert all(name in files and (root / name).is_file() for name in references)
assert all((root / name).is_file() for name in files)
assert not manifest.get('optional_host_permissions'), 'Unexpected broad optional permissions'
output = root.parent / 'downloads' / f'xunci-extension-{version}.zip'
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for name in files:
        archive.write(root / name, 'xunci-extension/' + name)
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert json.loads(archive.read('xunci-extension/manifest.json'))['version'] == version
print(f'Package verified: {output.name} ({len(files)} files, version {version})')
