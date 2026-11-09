"""Merges province, nation and culture rows written per region into the data files.
usage: python3 scripts/merge-regions.py <dir> <name>[:region,region] ...
A name with regions replaces every row of those regions; without, rows are added or replace rows with the same id."""
import re, sys, os
d = sys.argv[1]
prov = open('src/data/provinces.ts').read()
nat = open('src/data/nations.ts').read()
names = open('src/data/names.ts').read()
soc = open('src/engine/society.ts').read()

def rows(path):
    if not os.path.exists(path): return []
    return [l.strip() for l in open(path) if l.strip() and not l.startswith('#')]

for arg in sys.argv[2:]:
    name, _, regs = arg.partition(':')
    regions = [r for r in regs.split(',') if r]
    new = rows(f'{d}/{name}.provinces.txt')
    ids = {r.split(';')[0] for r in new}
    out = []
    for line in prov.split('\n'):
        parts = line.split(';')
        if len(parts) >= 9 and re.match(r'^[a-z0-9_]+$', parts[0]):
            if parts[0] in ids or parts[8].strip() in regions: continue
        out.append(line)
    prov = '\n'.join(out)
    i = prov.index('const TABLE_WORLD = `') + len('const TABLE_WORLD = `')
    prov = prov[:i] + '\n# ' + name + '\n' + '\n'.join(new) + prov[i:]
    nrows = rows(f'{d}/{name}.nations.txt')
    existing = set(re.findall(r'^([a-z0-9_]+);', nat, re.M))
    add = [r for r in nrows if r.split(';')[0] not in existing]
    j = nat.index('natives;Native peoples')
    nat = nat[:j] + '\n'.join(add) + '\n' + nat[j:]
    for r in rows(f'{d}/{name}.cultures.txt'):
        c, pool, disp = (r.split(';') + ['', ''])[:3]
        if f"\n  {c}: '" not in names and f" {c}: '" not in names:
            names = names.replace("export const CULTURE_POOL: Record<string, string> = {", f"export const CULTURE_POOL: Record<string, string> = {{\n  {c}: '{pool}',", 1)
        if disp and f" {c}: '" not in soc.split('const NAMED')[1].split('};')[0]:
            soc = soc.replace("const NAMED: Record<string, string> = {", f"const NAMED: Record<string, string> = {{\n  {c}: '{disp}',", 1)
    print(name, len(new), 'provinces', len(add), 'nations')
open('src/data/provinces.ts', 'w').write(prov)
open('src/data/nations.ts', 'w').write(nat)
open('src/data/names.ts', 'w').write(names)
open('src/engine/society.ts', 'w').write(soc)
