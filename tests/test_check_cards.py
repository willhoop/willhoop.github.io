"""Card-version and live-URL checks in build/check_projects.py.
Run: python tests/test_check_cards.py

Builds fake project folders in a temp dir (through PROJECTS_ROOT) and serves fixed HTTP
statuses from a local server, so no expected value comes from the real projects or the
real internet. Every expected value is set by hand from the rule:
  - a card's version must equal its project's newest live CHANGELOG version, whole string
  - every published URL must return 200; a card's Open link only while the card says live
  - the live page's cards must equal the local ones
"""
import importlib.util, io, os, sys, tempfile, threading
from http.server import BaseHTTPRequestHandler, HTTPServer

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

def make(base, files):
    for rel, text in files.items():
        p = os.path.join(tmp, base, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        io.open(p, 'w', encoding='utf-8').write(text)

CL = '# Changelog\n\n## [{v}] — 2026-10-22\n### Changed\n- x\n\n## [0.1.0] — 2026-01-01\n'
make('alpha', {'CHANGELOG.md': CL.format(v='1.4.0')})
make('beta',  {'CHANGELOG.md': CL.format(v='5.61')})
# a closed line: the live changelog is the open sibling, as ABRA's is
make('gamma', {'CHANGELOG.md': '# C\n<!-- LINE: id=g/old; closed=7.0.0 -->\n\n## [7.0.0] — 2026-09-20\n',
               'CHANGELOG-NEW.md': '# C\n<!-- LINE: id=g/new -->\n\n## [1.78.2] — 2026-10-13\n'})
cp.PROJECTS = {'Alpha': 'alpha', 'Beta': 'beta', 'Gamma': 'gamma'}
cp.CARD_PROJECT = {'Alpha Engine': 'Alpha'}

def card(name, version, live=True, docs=None):
    return {'name': name, 'version': version, 'status': 'Live', 'live': live,
            'docs': docs or {'open': 'https://example.test/' + name}}

# ---- card_table ----
g = cp.card_table([card('Alpha Engine', '1.4.0'), card('Beta', '5.61'), card('Gamma', '1.78.2')])
chk(g == [], 'cards equal to their changelogs pass, through CARD_PROJECT and a closed line')
g = cp.card_table([card('Alpha Engine', '1.3.0')])
chk(len(g) == 1 and '1.3.0' in g[0][1] and '1.4.0' in g[0][1], 'a stale card (1.3.0 vs 1.4.0) is a gap naming both')
g = cp.card_table([card('Gamma', '7.0.0')])
chk(len(g) == 1, 'a card showing the CLOSED line (7.0.0) is a gap; the live line is 1.78.2')
g = cp.card_table([card('Beta', '5.61.0')])
chk(len(g) == 1, 'the whole string is compared: 5.61.0 is not 5.61')
g = cp.card_table([card('Beta', None)])
chk(len(g) == 1, 'a card with no version is a gap')
g = cp.card_table([card('Delta', '1.0.0')])
chk(len(g) == 1 and 'no project' in g[0][1], 'a card with no project folder mapping is a gap, not skipped')

# ---- live_table, against a local server with fixed statuses ----
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        code = {'/ok': 200, '/gone': 404, '/err': 500}.get(self.path)
        if self.path == '/moved':
            self.send_response(301); self.send_header('Location', '/ok'); self.end_headers(); return
        if self.path == '/flaky':
            H.hits = getattr(H, 'hits', 0) + 1
            code = 200 if H.hits > 1 else 503
        self.send_response(code or 404); self.end_headers(); self.wfile.write(b'x')
    def log_message(self, *a): pass

srv = HTTPServer(('127.0.0.1', 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
B = f'http://127.0.0.1:{srv.server_port}'

chk(cp.fetch_status(B + '/ok', 5) == 200, 'fetch_status: 200')
chk(cp.fetch_status(B + '/gone', 5) == 404, 'fetch_status: 404 is reported, not raised')
chk(cp.fetch_status(B + '/moved', 5) == 200, 'fetch_status: follows a redirect to the final status')
chk(cp.fetch_status('http://127.0.0.1:9/', 2) == 0, 'fetch_status: a host that does not answer is 0')

urls = [(B + '/ok', True, 'a'), (B + '/moved', True, 'b')]
chk(cp.live_table(urls) == [], 'all 200 (one after a redirect): no gap')
g = cp.live_table([(B + '/gone', True, 'paper'), (B + '/err', True, 'deck')], retry_timeout=2)
chk([x[0] for x in g] == ['paper', 'deck'], 'a 404 and a 500 on required URLs are two gaps')
g = cp.live_table([(B + '/gone', False, 'open')], retry_timeout=2)
chk(g == [], 'a dead Open link on a card marked not live is printed, not a gap')
g = cp.live_table([(B + '/flaky', True, 'open')])
chk(g == [], 'a host that fails once and then answers (a sleeping host waking) passes on the retry')

# ---- site_urls ----
c_live = card('A', '1', True, {'open': 'https://x.test/app', 'paper': 'docs/p.html', 'deck': ''})
c_off = card('B', '1', False, {'open': 'https://y.test/'})
c_live['preview'] = {'slug': 'a', 'alt': 'x'}
u = {x[0]: x[1] for x in cp.site_urls([c_live, c_off])}
chk(u.get('https://x.test/app') is True, 'site_urls: a live card\'s Open link is required')
chk(u.get('https://y.test/') is False, 'site_urls: an offline card\'s Open link is not required')
chk(u.get(cp.SITE + 'docs/p.html') is True, 'site_urls: a relative document link is made absolute on the site')
chk('' not in u and cp.SITE not in [k for k in u if k.endswith('/deck')], 'site_urls: an empty slot is not probed')
chk(all(cp.SITE + f'assets/previews/a.{e}' in u for e in ('webm', 'mp4', 'jpg')), 'site_urls: every preview file is probed')
chk(all(cp.SITE + f in u for f in ('', 'llms.txt', 'sitemap.xml', 'robots.txt')), 'site_urls: the site and its agent files are probed')

# ---- deployed_table, with the real page loader on a hand-written page ----
page = lambda cards: '<script>const PROJECTS = %s;</script>' % cards
local = [{'name': 'A', 'version': '1.4.0', 'status': 'Live'}]
same = page('[{name:"A",version:"1.4.0",status:"Live",docs:{}}]')
old = page('[{name:"A",version:"1.3.0",status:"Live",docs:{}}]')
extra = page('[{name:"A",version:"1.4.0",status:"Live",docs:{}},{name:"Z",version:"1",status:"Live",docs:{}}]')
# load() evaluates the page script and reads PROJECTS, SLOTS, LABEL, renderRows and UPDATED
stub = ';const SLOTS=[],LABEL={},UPDATED="",renderRows=()=>"";'
fix = lambda html: html.replace('</script>', stub + '</script>')
chk(cp.deployed_table(local, lambda u: fix(same)) == [], 'deployed: live page equal to local passes')
g = cp.deployed_table(local, lambda u: fix(old))
chk(len(g) == 1 and g[0][0] == 'A', 'deployed: a live page still on 1.3.0 is NOT DEPLOYED')
g = cp.deployed_table(local, lambda u: fix(extra))
chk(len(g) == 1 and g[0][0] == 'Z', 'deployed: a card only on the live page is a gap')
def boom(u): raise OSError('offline')
chk(len(cp.deployed_table(local, boom)) == 1, 'deployed: an unreadable live page is a gap, not a pass')

srv.shutdown()
print(f'\n{passed} passed, {failed} failed')
sys.exit(1 if failed else 0)
