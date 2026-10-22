/* Publish gate — tests.  Run: node tests/test-publish-gate.js
 * Runs the shipped build/publish-gate.js against throwaway repos built in a temp folder.
 * Every expected exit code and message is set by hand from the gate's contract:
 *   exit 0 = safe to push, exit 1 = do not push (reason on stdout), exit 2 = bad usage. */
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const GATE = path.join(__dirname, '..', 'build', 'publish-gate.js');

let pass = 0, fail = 0;
const chk = (c, m) => { if (c) { pass++; console.log('pass  ' + m); }
                        else   { fail++; console.log('FAIL  ' + m); } };

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-gate-'));
// Build a repo from {relative path: contents}.
const repo = (name, files) => {
  const dir = path.join(TMP, name);
  fs.mkdirSync(dir);
  for (const [f, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), body);
  }
  return dir;
};
const gate = (...args) => {
  const r = spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout.trim() };
};

const GOOD_PAGE = '<html><script>const a = 1; function f() { return a; }</script></html>';
const BAD_PAGE  = '<html><script>function f( { return 1; }</script></html>';
const NO_SCRIPT = '<html><body>truncated</body></html>';
const OK_SUITE  = 'process.exit(0);';
const BAD_SUITE = 'process.exit(1);';

try {
  // Usage errors
  let r = gate();
  chk(r.code === 2, 'no argument: exit 2');
  r = gate(path.join(TMP, 'does-not-exist'));
  chk(r.code === 2 && r.out.startsWith('no such directory'), 'missing directory: exit 2');

  // A repo with neither app/index.html nor tests/ publishes as before
  r = gate(repo('empty', { 'README.md': '# x' }));
  chk(r.code === 0 && r.out === '', 'no page, no tests: exit 0');

  // Check 1: the page must parse
  r = gate(repo('page-ok', { 'app/index.html': GOOD_PAGE }));
  chk(r.code === 0, 'page that parses: exit 0');
  r = gate(repo('page-bad', { 'app/index.html': BAD_PAGE }));
  chk(r.code === 1 && r.out.startsWith('app/index.html does not parse:'), 'syntax error in page: exit 1');
  r = gate(repo('page-empty', { 'app/index.html': NO_SCRIPT }));
  chk(r.code === 1 && r.out === 'app/index.html has no inline script — is it truncated?',
      'page with no inline script: exit 1');

  // Check 2: every tests/test-*.js must pass; other files in tests/ are ignored
  r = gate(repo('suite-ok', { 'tests/test-a.js': OK_SUITE, 'tests/helper.js': BAD_SUITE }));
  chk(r.code === 0, 'passing suite, failing non-suite file ignored: exit 0');
  r = gate(repo('suite-bad', { 'tests/test-a.js': OK_SUITE, 'tests/test-b.js': BAD_SUITE }));
  chk(r.code === 1 && r.out === 'suite failed: tests/test-b.js', 'one failing suite: exit 1, names it');

  // The blank-page case from the gate's history: suites green, page broken
  r = gate(repo('green-but-blank', { 'app/index.html': BAD_PAGE, 'tests/test-a.js': OK_SUITE }));
  chk(r.code === 1 && r.out.startsWith('app/index.html does not parse:'), 'green suites do not excuse a broken page');

  // Both checks fail: both reasons, joined by " | "
  r = gate(repo('both-bad', { 'app/index.html': NO_SCRIPT, 'tests/test-b.js': BAD_SUITE }));
  chk(r.code === 1 && r.out.split(' | ').length === 2, 'two failures: both reasons reported');
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
