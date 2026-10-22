"""Tier rules in build/check_projects.py.  Run: python tests/test_check_projects.py

Builds fake project folders in a temp dir and points the shipped checker at them
through PROJECTS_ROOT. Every expected value is set by hand from the rule:
a joke project needs an explainer, README, CHANGELOG, CLAUDE.md, tests, LICENSE,
.gitignore and CI; it does not need a white paper, deck, tech docs, SECURITY or
CONTRIBUTING. No marker means full. An unknown tier is a gap.
"""
import importlib.util, io, os, sys, tempfile

tmp = tempfile.mkdtemp()
os.environ['PROJECTS_ROOT'] = tmp
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('cp', os.path.join(here, '..', 'build', 'check_projects.py'))
cp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cp)   # main() is guarded, so importing runs nothing

passed = failed = 0
def chk(cond, msg):
    global passed, failed
    if cond: passed += 1; print('pass  ' + msg)
    else:    failed += 1; print('FAIL  ' + msg)

def make(name, files):
    for rel, text in files.items():
        p = os.path.join(tmp, name, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        io.open(p, 'w', encoding='utf-8').write(text)

JOKE_SET = {
    'CLAUDE.md': '# CLAUDE.md\n<!-- TIER: joke -->\n',
    'README.md': 'x', 'CHANGELOG.md': '## [1.2.0] — 2026-10-22\n', 'LICENSE': 'x',
    '.gitignore': 'x', 'tests/t.js': 'x', '.github/workflows/ci.yml': 'x',
    'docs/explainer.md': '# Explainer\n\nVersion 1.2.0\n',
}

# 1. complete joke project: no gaps, the five full-only columns are n/a
make('joke', JOKE_SET)
tier, cols = cp.artefact_gaps('joke')
chk(tier == 'joke', 'marker in CLAUDE.md sets tier joke')
chk([k for k, v in cols.items() if v is False] == [], 'complete joke project has no gaps')
chk(sorted(k for k, v in cols.items() if v is None) ==
    sorted(['white paper', 'deck', 'tech docs', 'SECURITY', 'CONTRIBUTING']),
    'joke tier does not require white paper, deck, tech docs, SECURITY, CONTRIBUTING')
chk(cp.find_stamp('joke') == ('docs/explainer.md', '1.2.0'), 'joke stamp comes from the explainer masthead')

# 2. joke project without explainer or CI: exactly those two gaps
make('joke-gaps', {k: v for k, v in JOKE_SET.items()
                   if k not in ('docs/explainer.md', '.github/workflows/ci.yml')})
_, cols = cp.artefact_gaps('joke-gaps')
chk(sorted(k for k, v in cols.items() if v is False) == ['CI', 'explainer'], 'missing explainer and CI are gaps')
chk(cp.find_stamp('joke-gaps')[0] is None, 'no explainer means no stamp')

# 3. no marker: full tier, so the same files leave five gaps and explainer is n/a
make('plain', {k: v for k, v in JOKE_SET.items() if k != 'CLAUDE.md'})
make('plain', {'CLAUDE.md': '# CLAUDE.md\n'})
tier, cols = cp.artefact_gaps('plain')
chk(tier == 'full', 'no marker means full')
chk(sorted(k for k, v in cols.items() if v is False) ==
    sorted(['white paper', 'deck', 'tech docs', 'SECURITY', 'CONTRIBUTING']), 'full tier requires the five')
chk(cols['explainer'] is None, 'full tier does not require an explainer')

# 4. unknown tier is reported, not defaulted
make('odd', {'CLAUDE.md': '<!-- TIER: Serious -->\n'})
chk(cp.artefact_gaps('odd') == ('serious', None), 'unknown tier returns no columns')

# 5. a marker quoted inside prose does not count; one past line 25 does not count
make('quoted', {'CLAUDE.md': 'Write `<!-- TIER: joke -->` to opt in.\n'})
chk(cp.project_tier('quoted') == 'full', 'marker quoted in prose is ignored')
make('late', {'CLAUDE.md': '\n' * 25 + '<!-- TIER: joke -->\n'})
chk(cp.project_tier('late') == 'full', 'marker after line 25 is ignored')

print(f'\n{passed} passed, {failed} failed')
sys.exit(1 if failed else 0)
