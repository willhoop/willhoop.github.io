#!/usr/bin/env python3
"""Audit every project against the standard. Run before publishing.

The rule: every project gets the same treatment. White paper, plain-English
deck, technical documentation, README, changelog, agent notes, tests.

Exits non-zero when anything is missing, so it can gate a publish step.
"""
import os, sys, glob, io, re

# ROOT resolves to the Projects folder that contains this repo, derived from
# this script's own location (Projects/portfolio/build/check_projects.py ->
# Projects/). Override with the PROJECTS_ROOT env var if the layout differs.
# This replaces a previously hardcoded absolute sandbox path that only
# resolved in one environment.
ROOT = os.environ.get(
    'PROJECTS_ROOT',
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
)

PROJECTS = {
    'CHOMP':          'Pokemon/CHOMP',
    'HoopaDex':       'Pokemon/HoopaDex',
    'Event Desks':    'prediction-market',
    'KaizoDex':       'Pokemon/KaizoDex',
    'ABRA':           'Pokemon/ABRA',
    'Portfolio':      'portfolio',
    'Jeopardy Wager': 'jeopardy-wagering',
    'Guardian Chess': 'Guardian Chess',
    'Move Advisor':   'Pokemon/ironmon-move-engine',
    'Fourth Down':    'fourth-down',
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
    # NOT sys.exit HERE. Until 2026-09-06 this exited immediately, so the whole
    # version-consistency section below was UNREACHABLE whenever any project was
    # missing a LICENSE or a SECURITY.md. A check that only runs when everything
    # else already passes is unchecked, not verified. Both sections now always
    # run and the process still exits non-zero at the end if either failed.
else:
    print('All projects meet the standard.')


# ---- changelog / version consistency ----
# WHICH CHANGELOG IS LIVE. A project normally has one, CHANGELOG.md, and that is
# still the rule: the artefact table above requires CHANGELOG.md to exist for every
# project. But a project can close a version line and open another — ABRA closed its
# Reg M-B line at 7.0.0 and runs Reg M-C in CHANGELOG-REGMC.md. Comparing the closed
# file's top version (7.0.0) with the current white paper (1.0.0) compared two
# different series.
#
# Nothing is hardcoded per project. A changelog declares itself closed in its own
# header with a line marker, `<!-- LINE: id=...; closed=X.Y.Z -->`. The live changelog
# is CHANGELOG.md unless it is closed; then it is the ONE open CHANGELOG-*.md sibling.
# None open, or more than one, is reported as a gap rather than guessed at.
# The marker must stand on its OWN line. Unanchored, a changelog entry that merely QUOTES
# the marker in prose (portfolio's own 1.7.1 entry does) read as a closed line.
LINE_RE = re.compile(r'^[ \t]*<!--\s*LINE:([^\n]*?)-->[ \t]*$', re.M)
LINE_HEAD = 25

def line_params(path):
    """The `key=value` pairs of a changelog's LINE marker, or {} when it has none."""
    head = ''.join(io.open(path, encoding='utf-8', errors='ignore').readlines()[:LINE_HEAD])
    m = LINE_RE.search(head)
    if not m:
        return {}
    out = {}
    for part in m.group(1).split(';'):
        if '=' in part:
            k, v = part.split('=', 1)
            out[k.strip().lower()] = v.strip()
    return out

def _line_closed(path):
    return 'closed' in line_params(path)

# HOW MUCH OF THE VERSION THE STAMP MUST MATCH. Default: major.minor. A line can declare
# `docs=major` in its LINE marker when its documents are re-stamped only at a MAJOR
# release by that project's own rule (ABRA's living-docs rule: a notes row every change,
# the documents every X.0.0). Then only the major is compared, so 1.51.0 against a paper
# stamped 1.0.0 passes and 2.0.0 against 1.0.0 still fails. Declared by the project in its
# own file, never by name here. Any other `docs=` value is a gap, not a silent default.
DOCS_GRAIN = {None: 2, 'major': 1}

def active_changelog(base):
    """(relpath, None) for the live changelog, or (None, reason)."""
    main = os.path.join(ROOT, base, 'CHANGELOG.md')
    if not os.path.exists(main):
        return None, 'no CHANGELOG.md'
    if not _line_closed(main):
        return 'CHANGELOG.md', None
    sibs = sorted(glob.glob(os.path.join(ROOT, base, 'CHANGELOG-*.md')))
    live = [s for s in sibs if not _line_closed(s)]
    if len(live) == 1:
        return os.path.basename(live[0]), None
    if not live:
        return None, 'CHANGELOG.md is closed and no open CHANGELOG-*.md line exists'
    return None, 'AMBIGUOUS — CHANGELOG.md is closed and %d CHANGELOG-*.md lines are open' % len(live)

def newest_changelog_version(base):
    """(relpath, version) of the live changelog's newest release, or (None, reason)."""
    rel, why = active_changelog(base)
    if rel is None:
        return None, why
    for line in io.open(os.path.join(ROOT, base, rel), encoding='utf-8'):
        m = re.match(r'##\s*\[([^\]]+)\]', line)
        if m: return rel, m.group(1)
    return rel, None

def stamped_version(base, relpath, pattern):
    f = os.path.join(ROOT, base, relpath)
    if not os.path.exists(f): return None
    m = re.search(pattern, io.open(f, encoding='utf-8', errors='ignore').read())
    return m.group(1) if m else None

# OVERRIDES ONLY. Every project not named here is DERIVED by find_stamp() below.
#
# This dict used to be the whole mechanism, and a hand-typed list of three is how a
# project goes unchecked while looking checked: a project with no entry printed
# "(no stamped artifact to compare)" and was counted as fine. ABRA sat in that state
# — unchecked, not verified — which is the same hand-maintained-list failure ABRA's
# own CLAUDE.md is written about. An entry belongs here ONLY when the stamp lives in
# a place no shape rule can find: a userscript header or a deployed HTML comment.
STAMPS = {
    # the published artifact is the userscript itself, not a document
    'Pokemon/CHOMP':    ('app/plugin/chomp-bring4.user.js', r'@version\s+([0-9.]+)'),
    # the stamp is a comment inside the deployed page
    'Pokemon/HoopaDex': ('app/index.html',                  r'HOOPADEX VERSION:\s*([0-9.]+)'),
}

# ---- the derived half ----
# A version stamp is a MASTHEAD: it sits in the opening block of the document, under
# the title, before the first section. Searching the whole file would credit a document
# that merely mentions "retracted in 2.7.0" with a header. Same rule, same 25-line
# window, as ABRA's own Pokemon/ABRA/engine/docs_scan.js versionHeader().
MASTHEAD_LINES = 25
MASTHEAD_RE = re.compile(r'\bversion\b\s*:?\s*\*{0,2}\s*(\d+\.\d+(?:\.\d+)?)', re.I)

def _slug(s): return re.sub(r'[^a-z0-9]', '', s.lower())

def masthead_version(path):
    try:
        head = ''.join(io.open(path, encoding='utf-8', errors='ignore').readlines()[:MASTHEAD_LINES])
    except OSError:
        return None
    m = MASTHEAD_RE.search(head)
    return m.group(1) if m else None

def find_stamp(base):
    """(relpath, version) for the project's own white paper, or (None, reason).

    A project can hold several white papers — ABRA/docs has ABRA-whitepaper.md
    alongside MEW-whitepaper.md and SLOWKING-whitepaper.md, which carry their own
    component version schemes. Picking the first glob hit would compare the project
    CHANGELOG against a component's stamp and accuse a correct document. So the file
    is chosen by NAME AGAINST THE PROJECT FOLDER, and an ambiguous set is reported
    as ambiguous rather than guessed at.
    """
    cands = []
    for pat in ('docs/*whitepaper*.md', 'docs/*white-paper*.md'):
        cands += sorted(glob.glob(os.path.join(ROOT, base, pat)))
    cands = [c for c in cands if masthead_version(c)]
    if not cands:
        return None, 'no white paper carries a masthead version'
    proj = _slug(os.path.basename(base.rstrip('/\\')))
    named = [c for c in cands if _slug(os.path.basename(c)).startswith(proj)]
    # a single generically named white paper is unambiguous on its own
    generic = [c for c in cands if re.fullmatch(r'white-?paper\.md', os.path.basename(c), re.I)]
    pick = named or generic or (cands if len(cands) == 1 else [])
    if not pick:
        return None, 'AMBIGUOUS — %d white papers, none named for the project' % len(cands)
    p = pick[0]
    return os.path.relpath(p, os.path.join(ROOT, base)).replace(os.sep, '/'), masthead_version(p)

def norm(v, parts=2): return None if v is None else '.'.join(v.split('.')[:parts])  # default major.minor

print('\nVersion consistency')
print('=' * 60)
vgaps = []
for proj, base in PROJECTS.items():
    if not os.path.isdir(os.path.join(ROOT, base)):
        print(f'{proj.ljust(14)} FOLDER NOT FOUND'); vgaps.append((proj, 'folder')); continue
    clog, cv = newest_changelog_version(base)
    if clog is None:
        # cv carries the reason: no CHANGELOG.md, or no live line to compare
        print(f'{proj.ljust(14)} UNCHECKED — {cv}')
        vgaps.append((proj, f'no live changelog ({cv})')); continue
    # name the file only when it is not the default, so a non-default line is visible
    cl = 'changelog' if clog == 'CHANGELOG.md' else clog
    docs = line_params(os.path.join(ROOT, base, clog)).get('docs')
    if docs not in DOCS_GRAIN:
        print(f'{proj.ljust(14)} {cl}={cv}  UNCHECKED — unknown docs={docs} in LINE marker')
        vgaps.append((proj, f'unknown docs={docs} in {clog} LINE marker (allowed: major)')); continue
    grain = DOCS_GRAIN[docs]
    if base in STAMPS:
        rel, pat = STAMPS[base]
        sv = stamped_version(base, rel, pat)
        src = rel + ' (override)'
    else:
        rel, sv = find_stamp(base)
        if rel is None:
            # sv carries the reason. UNCHECKED IS ITS OWN ROW, and it is a gap:
            # printing "nothing to compare" and moving on is what left ABRA
            # unverified while the table looked complete.
            print(f'{proj.ljust(14)} {cl}={cv}  UNCHECKED — {sv}')
            vgaps.append((proj, f'no version stamp found ({sv})'))
            continue
        src = rel + ' (derived)'
    ok = norm(cv, grain) == norm(sv, grain) and cv is not None
    if docs: src += f'; docs={docs}, major compared'
    print(f'{proj.ljust(14)} {cl}={cv}  file={sv}  {"ok" if ok else "MISMATCH"}  <- {src}')
    if not ok: vgaps.append((proj, f'{clog} {cv} vs {rel} {sv}'))
if vgaps:
    for p_, m_ in vgaps: print(f'  - {p_}: {m_}')
else:
    print('\nAll versions consistent.')

if gaps or vgaps:
    sys.exit(1)
