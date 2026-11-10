"""Merge new province (and nation) rows into the data tables, with checks.

Usage: python3 scripts/merge-provinces.py DIR [--apply]
DIR holds <region>.txt files of province rows and optional <region>_nations.txt files.
Without --apply it only reports problems. Rows that clash (duplicate id, bad owner or good,
or closer than MIN_GAP degrees to another seed) are dropped and listed.
"""
import math, re, sys, glob, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROV = os.path.join(ROOT, 'src/data/provinces.ts')
NAT = os.path.join(ROOT, 'src/data/nations.ts')
GOODS = {'grain', 'fish', 'meat', 'produce', 'wood', 'iron', 'coal', 'leather', 'fibres', 'dyes', 'saltpetre', 'gold', 'spices'}
REGIONS = {'europe', 'north_africa', 'middle_east', 'atlantic', 'russia', 'central_asia', 'china', 'east_indies', 'india', 'west_africa',
           'central_africa', 'east_africa', 'southern_africa', 'north_america', 'mexico', 'caribbean', 'andes', 'brazil', 'plata', 'siberia', 'oceania'}
MIN_GAP = 0.8
EXTRA_OWNERS = {'castile', 'portugal', 'aragon', 'natives', 'tribes', 'bedouins'}

src = open(PROV).read()
rows = [l.split(';') for l in src.split('\n') if re.match(r'^[a-z_0-9]+;', l) and len(l.split(';')) >= 9]
seeds = [(r[0], float(r[5]), float(r[6])) for r in rows]
ids = {r[0] for r in rows}
nsrc = open(NAT).read()
nations = {l.split(';')[0] for l in nsrc.split('\n') if re.match(r'^[a-z_0-9]+;[^;]+;[^;]+;#', l)} | EXTRA_OWNERS

d = sys.argv[1]
new_nat, nat_lines = set(), []
for f in sorted(glob.glob(os.path.join(d, '*_nations.txt'))):
    for l in open(f).read().split('\n'):
        l = l.strip()
        if not l: continue
        p = l.split(';')
        if len(p) != 10 or p[0] in nations or not p[3].startswith('#'):
            print('DROP nation', os.path.basename(f), l); continue
        new_nat.add(p[0]); nat_lines.append(l)
nations |= new_nat

def gap(lon, lat, pts):
    best = 99
    for _, x, y in pts:
        dx = (lon - x) * math.cos(math.radians((lat + y) / 2))
        best = min(best, math.hypot(dx, lat - y))
    return best

added, dropped = [], []
for f in sorted(glob.glob(os.path.join(d, '*.txt'))):
    if f.endswith('_nations.txt'): continue
    for l in open(f).read().split('\n'):
        l = l.strip()
        if not l: continue
        p = l.split(';')
        why = None
        if len(p) not in (9, 10): why = 'fields'
        elif not re.match(r'^[a-z_0-9]+$', p[0]) or p[0] in ids: why = 'id'
        elif p[2] not in nations: why = 'owner ' + p[2]
        elif p[7] not in GOODS: why = 'good ' + p[7]
        elif p[8] not in REGIONS: why = 'region ' + p[8]
        else:
            try:
                dev, fort, lon, lat = int(p[3]), int(p[4]), float(p[5]), float(p[6])
                if not (1 <= dev <= 8 and 0 <= fort <= 3 and -180 <= lon <= 180 and -60 <= lat <= 76): why = 'numbers'
                elif gap(lon, lat, seeds) < MIN_GAP: why = f'too close ({gap(lon, lat, seeds):.2f})'
            except ValueError: why = 'numbers'
        if why: dropped.append((os.path.basename(f), p[0], why)); continue
        ids.add(p[0]); seeds.append((p[0], float(p[5]), float(p[6]))); added.append(l)

print(f'{len(added)} provinces to add, {len(dropped)} dropped, {len(nat_lines)} nations')
for x in dropped: print('DROP', *x)
used = {l.split(';')[2] for l in added}
for n in new_nat - used: print('WARN nation without provinces', n)
for l in nat_lines:
    cap = l.split(';')[6]
    if cap not in ids: print('WARN capital not a province', l.split(';')[0], cap)

if '--apply' in sys.argv:
    end = src.rindex('`;', 0, src.index('export interface ProvinceSeed'))
    src = src[:end] + '\n'.join(added) + '\n' + src[end:]
    open(PROV, 'w').write(src)
    if nat_lines:
        i = nsrc.index('const NATION_TABLE = `')
        j = nsrc.index('`;', i)
        nsrc = nsrc[:j] + '\n'.join(nat_lines) + '\n' + nsrc[j:]
        open(NAT, 'w').write(nsrc)
    print('applied')
