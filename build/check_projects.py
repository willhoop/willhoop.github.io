#!/usr/bin/env python3
"""Audit every project against the standard. Run before publishing.

The rule: every project of a tier gets the same treatment. A full project ships
a white paper, a plain-English deck, technical documentation, README, changelog,
agent notes, tests. A joke project declares itself (see TIERS) and ships a
one-page explainer in place of the white paper, deck and technical docs.

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
    'ABRA':           'Pokemon/ABRA',
    'Portfolio':      'portfolio',
    'Jeopardy Wager': 'jeopardy-wagering',
    'Guardian Chess': 'Guardian Chess',
    'Move Advisor':   'Pokemon/ironmon-move-engine',
    'Fourth Down':    'fourth-down',
    'Every Last Grain': 'every-last-grain',
    'NFL data':       'nfl-data',
    'Monger Compass': 'monger-compass',
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

# ---- tiers ----
# A joke project needs no in-depth white paper. It declares itself in its OWN
# CLAUDE.md with a marker on its own line, `<!-- TIER: joke -->`, within the first
# 25 lines. No marker means full. Never decided by name here, same rule as the LINE
# marker below. An unknown tier is a gap, not a silent default.
TIER_RE = re.compile(r'^[ \t]*<!--\s*TIER:\s*([A-Za-z-]+)\s*-->[ \t]*$', re.M)
TIER_HEAD = 25

EXPLAINER = ('explainer', lambda b: has(b, 'docs/*explainer*'))
JOKE_KEEPS = ('README', 'CHANGELOG', 'CLAUDE.md', 'tests', 'LICENSE', '.gitignore', 'CI')
TIERS = {
    'full': CHECKS,
    'joke': [EXPLAINER] + [c for c in CHECKS if c[0] in JOKE_KEEPS],
}
COLUMNS = [c[0] for c in CHECKS] + [EXPLAINER[0]]

def project_tier(base):
    """The tier a project declares in its CLAUDE.md, lower-cased; 'full' when it has none."""
    f = os.path.join(ROOT, base, 'CLAUDE.md')
    if not os.path.exists(f):
        return 'full'
    head = ''.join(io.open(f, encoding='utf-8', errors='ignore').readlines()[:TIER_HEAD])
    m = TIER_RE.search(head)
    return m.group(1).lower() if m else 'full'

def artefact_gaps(base):
    """(tier, {column: True/False/None}). None means the tier does not require that
    column. The dict itself is None when the tier is unknown."""
    tier = project_tier(base)
    checks = TIERS.get(tier)
    if checks is None:
        return tier, None
    req = dict(checks)
    return tier, {col: (req[col](base) if col in req else None) for col in COLUMNS}

def artefact_table():
    """Print every project against every artefact column. Returns the gaps."""
    w = max(len(p) for p in PROJECTS) + 2
    print('\nProject standard audit\n' + '=' * (w + 6 + len(COLUMNS) * 13))
    print(' ' * w + 'tier  ' + ''.join(n.ljust(13) for n in COLUMNS))
    gaps = []
    for proj, base in PROJECTS.items():
        if not os.path.isdir(os.path.join(ROOT, base)):
            print(proj.ljust(w) + 'FOLDER NOT FOUND'); gaps.append((proj, 'folder')); continue
        tier, cols = artefact_gaps(base)
        if cols is None:
            print(proj.ljust(w) + 'UNKNOWN TIER %r (allowed: %s)' % (tier, ', '.join(TIERS)))
            gaps.append((proj, 'unknown tier %s' % tier)); continue
        row = proj.ljust(w) + tier.ljust(6)
        for col in COLUMNS:
            ok = cols[col]
            row += ('n/a' if ok is None else 'yes' if ok else 'MISSING').ljust(13)
            if ok is False:
                gaps.append((proj, col))
        print(row)
    print()
    if gaps:
        print(f'{len(gaps)} gap(s):')
        for proj, label in gaps:
            print(f'  - {proj}: no {label}')
        # NOT AN EARLY EXIT. Until 2026-09-06 this exited immediately, so the whole
        # version-consistency section below was UNREACHABLE whenever any project was
        # missing a LICENSE or a SECURITY.md. A check that only runs when everything
        # else already passes is unchecked, not verified. Both sections now always
        # run and main() still exits non-zero if either failed.
    else:
        print('All projects meet the standard.')
    return gaps


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

    A joke-tier project has no white paper; its explainer carries the masthead.

    A project can hold several white papers — ABRA/docs has ABRA-whitepaper.md
    alongside MEW-whitepaper.md and SLOWKING-whitepaper.md, which carry their own
    component version schemes. Picking the first glob hit would compare the project
    CHANGELOG against a component's stamp and accuse a correct document. So the file
    is chosen by NAME AGAINST THE PROJECT FOLDER, and an ambiguous set is reported
    as ambiguous rather than guessed at.
    """
    doc = 'explainer' if project_tier(base) == 'joke' else 'white paper'
    pats = (('docs/*explainer*.md',) if doc == 'explainer'
            else ('docs/*whitepaper*.md', 'docs/*white-paper*.md'))
    cands = []
    for pat in pats:
        cands += sorted(glob.glob(os.path.join(ROOT, base, pat)))
    cands = [c for c in cands if masthead_version(c)]
    if not cands:
        return None, 'no %s carries a masthead version' % doc
    proj = _slug(os.path.basename(base.rstrip('/\\')))
    named = [c for c in cands if _slug(os.path.basename(c)).startswith(proj)]
    # a single generically named document is unambiguous on its own
    generic = [c for c in cands if re.fullmatch(r'(white-?paper|explainer)\.md', os.path.basename(c), re.I)]
    pick = named or generic or (cands if len(cands) == 1 else [])
    if not pick:
        return None, 'AMBIGUOUS — %d %ss, none named for the project' % (len(cands), doc)
    p = pick[0]
    return os.path.relpath(p, os.path.join(ROOT, base)).replace(os.sep, '/'), masthead_version(p)

def norm(v, parts=2): return None if v is None else '.'.join(v.split('.')[:parts])  # default major.minor

def version_table():
    """Print each live changelog against its stamped artifact. Returns the gaps."""
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
    return vgaps


# ---- the portfolio cards ----
# The cards on willhoop.github.io are the public face of the table above, and they drifted
# while it passed: on 2026-10-22 ABRA's card said v2.3.0 (no such release; its live line was
# 1.78.2), HoopaDex's v5.55 (changelog 5.61) and Fourth Down's v1.3.0 (changelog 1.4.0).
# A card version is now checked against the project's LIVE changelog, the whole string.
#
# The cards are read by running the page's own script (build/build_agent_files.js load()),
# never by pattern-matching the JavaScript, so the checker sees what a visitor sees.
HERE = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(HERE, '..', 'index.html')
SITE = 'https://willhoop.github.io/'

# Card name -> PROJECTS key, only where they differ. A card with no project is a gap.
CARD_PROJECT = {
    'Jeopardy Wagering':  'Jeopardy Wager',
    'Fourth Down Engine': 'Fourth Down',
}

_LOAD_JS = (
    "const A=require(process.argv[1]);let s='';process.stdin.on('data',d=>s+=d)"
    ".on('end',()=>process.stdout.write(JSON.stringify(A.load(s).PROJECTS)))"
)

def load_cards(html=None):
    """The PROJECTS array of an index.html (the local one by default), as a list of dicts."""
    import json, subprocess
    if html is None:
        html = io.open(INDEX, encoding='utf-8').read()
    out = subprocess.run(['node', '-e', _LOAD_JS, os.path.join(HERE, 'build_agent_files.js')],
                         input=html.encode('utf-8'), capture_output=True, check=True)
    return json.loads(out.stdout.decode('utf-8'))

def card_table(cards):
    """Print each card's version against its project's live changelog. Returns the gaps."""
    print('\nCard versions (index.html against each CHANGELOG)')
    print('=' * 60)
    cgaps = []
    for c in cards:
        name = c['name']
        proj = CARD_PROJECT.get(name, name)
        base = PROJECTS.get(proj)
        if base is None:
            print(f'{name.ljust(20)} NO PROJECT — add it to PROJECTS or CARD_PROJECT')
            cgaps.append((name, 'card has no project in PROJECTS')); continue
        if not os.path.isdir(os.path.join(ROOT, base)):
            print(f'{name.ljust(20)} FOLDER NOT FOUND'); cgaps.append((name, 'folder')); continue
        clog, cv = newest_changelog_version(base)
        card_v = c.get('version')
        ok = clog is not None and card_v is not None and card_v == cv
        print(f'{name.ljust(20)} card={card_v}  {clog or "changelog"}={cv}  {"ok" if ok else "MISMATCH"}')
        if not ok:
            cgaps.append((name, f'card {card_v} vs {clog} {cv}'))
    for p_, m_ in cgaps: print(f'  - {p_}: {m_}')
    if not cgaps: print('\nEvery card matches its changelog.')
    return cgaps


# ---- live URLs ----
# Every URL the site publishes must answer 200, after redirects. A card's "Open" link is
# required only while the card claims the project is live; a card marked live:false is
# printed with its status but is not a gap, because the page no longer claims it works.
# Guardian Chess's host stopped answering on 2026-10-22 while its card said "Live".
UA = 'willhoop-portfolio-check/1.0 (+https://willhoop.github.io/)'

def fetch_status(url, timeout):
    """HTTP status after redirects, or 0 when the host does not answer."""
    import urllib.request, urllib.error
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 0

def site_urls(cards, previews=True):
    """[(url, required, label)] for every URL the site publishes."""
    abs_ = lambda u: u if re.match(r'^https?:', u) else SITE + u
    urls = [(SITE, True, 'site'), (SITE + 'llms.txt', True, 'site'),
            (SITE + 'sitemap.xml', True, 'site'), (SITE + 'robots.txt', True, 'site')]
    for c in cards:
        for slot, u in c['docs'].items():
            if u:
                urls.append((abs_(u), slot != 'open' or bool(c.get('live')), f"{c['name']} {slot}"))
        if previews and c.get('preview'):
            for ext in ('webm', 'mp4', 'jpg'):
                urls.append((abs_(f"assets/previews/{c['preview']['slug']}.{ext}"), True,
                             f"{c['name']} preview .{ext}"))
    seen, out = set(), []
    for u in urls:
        if u[0] not in seen:
            seen.add(u[0]); out.append(u)
    return out

def live_table(urls, fetch=fetch_status, timeout=30, retry_timeout=90):
    """Print every URL with its status. Returns the gaps.

    A failure is retried once with a longer timeout: a free-tier host that sleeps
    (Render) takes up to a minute to wake, and a sleeping host is not a dead one."""
    from concurrent.futures import ThreadPoolExecutor
    print('\nLive URLs (every link the site publishes must return 200)')
    print('=' * 60)
    def probe(u):
        s = fetch(u, timeout)
        return s if s == 200 else fetch(u, retry_timeout)
    with ThreadPoolExecutor(max_workers=6) as ex:
        statuses = list(ex.map(probe, [u for u, _, _ in urls]))
    lgaps = []
    for (u, required, label), s in zip(urls, statuses):
        tag = 'ok' if s == 200 else ('FAIL' if required else 'down (card says not live)')
        print(f'{str(s or "---").ljust(4)} {tag.ljust(26)} {label.ljust(28)} {u}')
        if s != 200 and required:
            lgaps.append((label, f'{u} returned {s or "no answer"}'))
    for p_, m_ in lgaps: print(f'  - {p_}: {m_}')
    if not lgaps: print('\nEvery published URL returns 200.')
    return lgaps

def deployed_table(local_cards, fetch_text=None):
    """Compare the cards on the live page with the local ones. Returns the gaps.
    The local files and the live site must agree; this is the check that they do."""
    import urllib.request
    print('\nLive site against local files')
    print('=' * 60)
    if fetch_text is None:
        def fetch_text(u):
            req = urllib.request.Request(u, headers={'User-Agent': UA, 'Cache-Control': 'no-cache'})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode('utf-8')
    try:
        live = {c['name']: c for c in load_cards(fetch_text(SITE))}
    except Exception as e:
        print(f'could not read the live page: {e}')
        return [('live site', f'could not read {SITE}: {e}')]
    dgaps = []
    for c in local_cards:
        lc = live.get(c['name'])
        got = None if lc is None else (lc.get('version'), lc.get('status'))
        want = (c.get('version'), c.get('status'))
        ok = got == want
        print(f"{c['name'].ljust(20)} local={want}  live={got}  {'ok' if ok else 'NOT DEPLOYED'}")
        if not ok:
            dgaps.append((c['name'], f'live {got} vs local {want}'))
    for n in set(live) - {c['name'] for c in local_cards}:
        print(f'{n.ljust(20)} on the live page only  NOT DEPLOYED')
        dgaps.append((n, 'card is live but not in the local index.html'))
    return dgaps


def main(argv=None):
    """--offline skips every network check (the artefact, version and card tables still run)."""
    argv = sys.argv[1:] if argv is None else argv
    gaps = artefact_table()
    vgaps = version_table()
    cards = load_cards()
    cgaps = card_table(cards)
    lgaps = dgaps = []
    if '--offline' not in argv:
        lgaps = live_table(site_urls(cards))
        dgaps = deployed_table(cards)
    return 1 if gaps or vgaps or cgaps or lgaps or dgaps else 0


if __name__ == '__main__':
    sys.exit(main())
