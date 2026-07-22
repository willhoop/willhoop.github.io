#!/usr/bin/env python3
"""Audit every project against the standard. Run before publishing.

The rule: every project gets the same treatment. White paper, plain-English
deck, technical documentation, README, changelog, agent notes, tests.

Exits non-zero when anything is missing, so it can gate a publish step.
"""
import os, sys, glob

ROOT = '/sessions/kind-fervent-sagan/mnt/Projects'

PROJECTS = {
    'CHOMP':      'Pokemon/CHOMP',
    'HoopaDex':   'Pokemon/HoopaDex',
    'Event Desks':'prediction-market',
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
