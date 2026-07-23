#!/usr/bin/env python3
"""Audit every project against the standard. Run before publishing.

The rule: every project gets the same treatment. White paper, plain-English
deck, technical documentation, README, changelog, agent notes, tests.

Exits non-zero when anything is missing, so it can gate a publish step.
"""
import os, sys, glob, io, re

ROOT = '/sessions/kind-fervent-sagan/mnt/Projects'

PROJECTS = {
    'CHOMP':      'Pokemon/CHOMP',
    'HoopaDex':   'Pokemon/HoopaDex',
    'Event Desks':'prediction-market',
    'KaizoDex':    'Pokemon/KaizoDex',
    'Portfolio':  'portfolio',
}

def has(base, *patterns):
    for pat in patterns:
        if glob.glob(os.path.join(ROOT, base, pat)):
            return True
    return False

CHECKS = [
    ('white paper', lambda b: has(b, 'docs/*whitepaper*', 'docs/*white-paper*')),
    ('deck',        lambda b: has(b, 'docs/*deck*')),
    ('tech docs',   lambda b: has(b, 'docs/*technical-docs*', 'docs/README.md')),
    ('README',      lambda b: has(b, 'README.md')),
    ('CHANGELOG',   lambda b: has(b, 'CHANGELOG.md')),
    ('CLAUDE.md',   lambda b: has(b, 'CLAUDE.md')),
    ('tests',       lambda b: has(b, 'tests/*', 'src/**/*.test.*')),
    ('LICENSE',     lambda b: has(b, 'LICENSE', 'LICENSE.md', 'LICENSE.txt')),
    ('SECURITY',    lambda b: has(b, 'SECURITY.md')),
    ('CONTRIBUTING',lambda b: has(b, 'CONTRIBUTING.md')),
    ('.gitignore',  lambda b: has(b, '.gitignore')),
    ('CI',          lambda b: has(b, '.github/workflows/*.yml', '.github/workflows/*.yaml')),
]

names = [c[0] for c in CHECKS]
w = max(len(p) for p in PROJECTS) + 2
print('\nProject standard audit\n' + '=' * (w + len(names) * 13))
print(' ' * w + ''.join(n.ljust(13) for n in names))

gaps = []
for proj, base in PROJECTS.items():
    if not os.path.isdir(os.path.join(ROOT, base)):
        print(proj.ljust(w) + 'FOLDER NOT FOUND'); gaps.append((proj, 'folder')); continue
    row = proj.ljust(w)
    for label, fn in CHECKS:
        ok = fn(base)
        row += ('yes' if ok else 'MISSING').ljust(13)
        if not ok:
            gaps.append((proj, label))
    print(row)

print()
if gaps:
    print(f'{len(gaps)} gap(s):')
    for proj, label in gaps:
        print(f'  - {proj}: no {label}')
    sys.exit(1)
print('All projects meet the standard.')


# ---- changelog / version consistency ----
def newest_changelog_version(base):
    f = os.path.join(ROOT, base, 'CHANGELOG.md')
    if not os.path.exists(f): return None
    for line in io.open(f, encoding='utf-8'):
        m = re.match(r'##\s*\[([^\]]+)\]', line)
        if m: return m.group(1)
    return None

def stamped_version(base, relpath, pattern):
    f = os.path.join(ROOT, base, relpath)
    if not os.path.exists(f): return None
    m = re.search(pattern, io.open(f, encoding='utf-8', errors='ignore').read())
    return m.group(1) if m else None

# (project, file, regex) — the artifact whose stamp must match the changelog top version.
STAMPS = {
    'Pokemon/CHOMP':    ('app/plugin/chomp-bring4.user.js', r'@version\s+([0-9.]+)'),
    'Pokemon/HoopaDex': ('app/index.html',                  r'HOOPADEX VERSION:\s*([0-9.]+)'),
}
def norm(v): return None if v is None else '.'.join(v.split('.')[:2])  # compare major.minor

print('\nVersion consistency')
print('=' * 60)
vgaps = []
for proj, base in PROJECTS.items():
    cv = newest_changelog_version(base)
    if base in STAMPS:
        rel, pat = STAMPS[base]
        sv = stamped_version(base, rel, pat)
        ok = norm(cv) == norm(sv) and cv is not None
        print(f'{proj.ljust(14)} changelog={cv}  file={sv}  {"ok" if ok else "MISMATCH"}')
        if not ok: vgaps.append((proj, f'changelog {cv} vs file {sv}'))
    else:
        print(f'{proj.ljust(14)} changelog={cv}  (no stamped artifact to compare)')
if vgaps:
    for p_, m_ in vgaps: print(f'  - {p_}: {m_}')
    sys.exit(1)

print('\nAll versions consistent.')
