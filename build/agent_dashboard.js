/* agent_dashboard.js — what is running across ALL projects, what it costs, and what it may cost.
 *
 *   node portfolio/build/agent_dashboard.js            serve on http://localhost:7333
 *   node portfolio/build/agent_dashboard.js --port=N   somewhere else
 *   node portfolio/build/agent_dashboard.js --once     print one sample as JSON and exit
 *
 * WHY THIS EXISTS
 * ---------------
 * On 2026-08-05 a 40-minute measurement in ABRA was killed by the operating system. Nothing crashed
 * and nothing reported a failure: free RAM fell 4.03 GB -> 1.73 GB -> 0.62 GB while concurrent
 * agents held the box, and node exited 1 with no stack, no stderr and no dump. The work simply
 * stopped existing, and the loss was only reconstructible afterwards from a memory log.
 *
 * The dispatcher had been pacing on the WRONG NUMBER. ABRA's own docs cap concurrency at six
 * processes in one file and four in another, and both are COUNTS. A count cannot see that two
 * playout runs want 3.4 GB between them while five document scans want 200 MB — so the cap reads
 * green at the exact moment the machine is about to start killing work. The scarce resource is
 * memory, and nothing was measuring it.
 *
 * WHY IT LIVES IN portfolio/ AND NOT IN ABRA
 * ------------------------------------------
 * Because the machine is not ABRA's. Agents run in HoopaDex, CHOMP, the portfolio itself
 * and anywhere else, and they contend for ONE pool of RAM. A monitor that can only see one project
 * reports "all clear" while a different project is eating the box — which is the same blindness one
 * level up. `portfolio/build/` is already where cross-project tooling lives (`check_projects.py`),
 * so the umbrella tool goes with the umbrella tools.
 *
 * IT MEASURES, IT DOES NOT ENFORCE, AND THAT IS DELIBERATE. A dashboard that kills processes will
 * eventually kill a measurement mid-flight — the exact event it was built because of. The budget in
 * `portfolio/data/agent-budget.json` is advisory state for whoever dispatches. The one honest thing
 * this page can do is put the number in front of the decision instead of in the post-mortem.
 *
 * ATTRIBUTION IS NEVER GUESSED. A process is assigned to a project only when its command line
 * carries that project's path, or when exactly one project on disk contains the relative script it
 * names. Two candidates report AMBIGUOUS and none reports UNKNOWN. A dashboard that invents an
 * attribution is worse than a blank one, because a blank invites a question and a wrong label
 * closes it.
 *
 * NO DEPENDENCIES. Sampling shells out to PowerShell because a process's COMMAND LINE is the only
 * thing that says which job it is, and node cannot read another process's argv on Windows.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const HERE = __dirname;                                   // .../Projects/portfolio/build
const PROJECTS_ROOT = path.resolve(HERE, '..', '..');     // .../Projects
const BUDGET = path.join(PROJECTS_ROOT, 'portfolio', 'data', 'agent-budget.json');
const PORT = +((process.argv.find(a => a.startsWith('--port=')) || '--port=7333').slice(7));

/* THE THREE MODES ARE THE POINT OF THE PAGE.
 * Will asked for exactly this: take the machine back when he wants it, hand it over at night. Raw
 * sliders answer that badly — they need him to know what 2.0 GB means for a rollout run. A mode is
 * one click and it says who the box belongs to right now.
 *
 * MINE is sized so a browser, a game and a Showdown tab stay smooth. OVERNIGHT is sized from the
 * failure that caused this file: the run died at 0.62 GB free, so 1.0 GB is the floor below which
 * work stops being safe even when nobody is watching. */
const MODES = {
  mine:      { reserve_gb: 6.0, max_heavy: 1, heavy_mb: 400, label: "Will's machine — stay out of the way" },
  shared:    { reserve_gb: 3.0, max_heavy: 2, heavy_mb: 400, label: 'Shared — work, but leave room' },
  overnight: { reserve_gb: 1.0, max_heavy: 6, heavy_mb: 400, label: 'Overnight — take the box' },
};
const DEFAULT_BUDGET = {
  mode: 'shared', ...MODES.shared,
  panic_gb: 0.9,
  note: 'reserve_gb is the free-RAM floor a dispatcher should leave. A process resident above ' +
        'heavy_mb counts as HEAVY; max_heavy is how many of those may run at once. Below panic_gb ' +
        'the emergency panel opens. Nothing is ever killed automatically.',
};

/* ---- EMERGENCY PROTOCOL -----------------------------------------------------------------------
 * Will: "with emergency protocols if something runs out of memory it can take".
 *
 * That is the right reading of what happened. The 40-minute run did not overreach — it ASKED for
 * memory and the operating system killed it, because the OS has no idea that one of those node
 * processes was 40 minutes into a measurement and the others were scanning markdown. Every process
 * looked identical to the thing doing the killing.
 *
 * So the protocol is: rank the processes by what they cost to lose, and when the box gets tight,
 * make it possible to spend the CHEAP ones to save the EXPENSIVE one. Two rules, both hard:
 *
 *   PROTECTED IS NEVER KILLED — not by this tool, not automatically, not by a click, not by a
 *   stray fetch. A fit, a rollout, a self-play run, an exploitability search or an interaction
 *   matrix represents hours that cannot be recovered, and a monitor that can end one is a monitor
 *   that eventually ends one at minute 39.
 *
 *   NOTHING IS EVER AUTOMATIC. The panel opens itself; it does not act by itself. An automatic
 *   reclaimer fires during the one minute you stepped away and you find out from a gap in a log.
 *
 * The pattern list is here rather than in the budget file on purpose: it is a safety rule, not a
 * preference, and a safety rule that is editable from a web form is a safety rule with an off
 * switch. Anything unrecognised is treated as PROTECTED — the default has to be "do not touch it".
 */
const PROTECTED = /(rollout|exploit|miltank|mew|selfplay|self_play|fit_|train_|interaction_matrix|backtest|em_validation|sprt|wobbuffet|machamp)/i;
const SACRIFICIAL = /(docs_scan|build_|check_|status\.js|conformance|provenance|agent_dashboard|test-docs|test-web|md_to_pdf|http\.server)/i;
function costOfLoss(job) {
  if (PROTECTED.test(job)) return { tier: 'protected', why: 'a measurement or a fit — hours that cannot be recovered' };
  if (SACRIFICIAL.test(job)) return { tier: 'sacrificial', why: 'a scan or a build — cheap to re-run' };
  return { tier: 'protected', why: 'unrecognised, so treated as protected — the default must be do-not-touch' };
}

/* ---- AM I AT THE KEYBOARD ----------------------------------------------------------------------
 * Will: "if im afk for like 30 mins you can take the whole thing."
 *
 * Windows tracks the last mouse/keyboard event globally via GetLastInputInfo, which is the only
 * honest answer — a browser tab only knows about ITSELF, so a page-level idle timer would hand the
 * box over while he was working in another window.
 *
 * Probed every 15 s rather than every 3 s: the P/Invoke shim has to be compiled by Add-Type on each
 * call (~300 ms), and spending that every tick to answer a question that changes on a 30-minute
 * scale would make the monitor a load of its own. Cached in between.
 *
 * ON FAILURE IT RETURNS null AND null MEANS "DO NOT HAND OVER". An idle probe that fails open would
 * quietly take the machine from someone sitting at it, which is the one outcome worth engineering
 * against here. */
let idleCache = { ms: null, at: 0 };
function idleMs() {
  if (Date.now() - idleCache.at < 15000) return idleCache.ms;
  try {
    const ps = "Add-Type @'\nusing System;using System.Runtime.InteropServices;\n" +
      "public class I{[DllImport(\"user32.dll\")]static extern bool GetLastInputInfo(ref L p);" +
      "[StructLayout(LayoutKind.Sequential)]struct L{public uint cbSize;public uint dwTime;}" +
      "public static uint M(){L l=new L();l.cbSize=(uint)Marshal.SizeOf(l);GetLastInputInfo(ref l);" +
      "return (uint)Environment.TickCount-l.dwTime;}}\n'@\n[I]::M()";
    const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps],
      { encoding: 'utf8', timeout: 12000 });
    const ms = parseInt(String(out).trim(), 10);
    idleCache = { ms: Number.isFinite(ms) ? ms : null, at: Date.now() };
  } catch (e) {
    console.error('  idle probe failed (' + String(e.message || e).split('\n')[0] + ') — treating as PRESENT, no handover');
    idleCache = { ms: null, at: Date.now() };
  }
  return idleCache.ms;
}

function readBudget() {
  try { return { ...DEFAULT_BUDGET, ...JSON.parse(fs.readFileSync(BUDGET, 'utf8')) }; }
  catch (e) {
    /* ENOENT is the ordinary first run and needs no noise. Anything else means the file exists and
     * is unreadable, which is a different fact and must not be silently replaced by defaults. */
    if (e.code !== 'ENOENT') console.error('  agent-budget.json unreadable, using defaults: ' + e.message);
    return { ...DEFAULT_BUDGET };
  }
}

/* ---- WHICH PROJECTS EXIST ---------------------------------------------------------------------
 * Discovered, never typed. A hand-written project list is the thing this whole codebase keeps
 * getting caught by, and a new project would silently report as UNKNOWN forever. A directory is a
 * project if it carries any of the markers a project here actually has. `pokemon-showdown` is a
 * vendored dependency rather than one of Will's projects and is labelled as such, not hidden —
 * it runs node, it can eat the box, and a monitor that hides a real consumer is lying. */
const MARKERS = ['.git', 'CLAUDE.md', 'package.json'];
function discoverProjects() {
  const out = [];
  const scan = (dir, group) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('.') || e.name === 'node_modules') continue;
      const abs = path.join(dir, e.name);
      if (MARKERS.some(m => fs.existsSync(path.join(abs, m)))) {
        out.push({ name: e.name, abs, group, vendor: e.name === 'pokemon-showdown' });
      }
    }
  };
  scan(PROJECTS_ROOT, null);
  scan(path.join(PROJECTS_ROOT, 'Pokemon'), 'Pokemon');
  /* Longest path first, so Pokemon/ABRA wins over any shorter prefix that also matches. */
  return out.sort((a, b) => b.abs.length - a.abs.length);
}

const norm = s => String(s || '').replace(/\\/g, '/').toLowerCase();

function attribute(cmd, projects) {
  const c = norm(cmd);
  /* 1. An absolute path inside a project is decisive. */
  for (const p of projects) if (c.includes(norm(p.abs) + '/')) return { project: p.name, how: 'path' };

  /* 2. Otherwise the command names a RELATIVE script and we do not know the process's cwd — Windows
   *    does not expose it. So try every project root as a candidate cwd, resolve, and ask which
   *    project the result LANDS IN.
   *
   *    Attributing by "which project CONTAINS this relative path" was the obvious first version and
   *    it is wrong: a path with `..` escapes its own root, so `../../portfolio/build/x.js` resolves
   *    to the same real file from half the projects on disk and every one of them counted as a
   *    separate hit. It reported AMBIGUOUS for a file with exactly one home. Resolving first and
   *    then asking where it ended up collapses those candidates to the one true answer, and keeps
   *    AMBIGUOUS for the case it was meant for: the same relative path existing in two projects. */
  const m = c.match(/(?:^|[\s"])([\w./-]+\.(?:js|py|mjs|cjs))(?:[\s"]|$)/);
  if (m) {
    const rel = m[1];
    const landed = new Set();
    /* PROJECTS_ROOT is a candidate cwd but NOT a project. Things get launched from the parent
     * folder — this tool was, and reported itself as unknown until the root was added. Leaving it
     * out of `projects` keeps it from ever becoming an attribution of its own. */
    for (const cwd of [...projects, { abs: PROJECTS_ROOT }]) {
      let abs;
      try { abs = path.resolve(cwd.abs, rel); if (!fs.existsSync(abs)) continue; } catch (e) { continue; }
      const owner = projects.find(p => norm(abs).startsWith(norm(p.abs) + '/'));
      if (owner) landed.add(owner.name);
    }
    if (landed.size === 1) return { project: [...landed][0], how: 'script resolved' };
    if (landed.size > 1) return { project: 'ambiguous', how: rel + ' resolves into ' + [...landed].join(' and ') };
  }
  return { project: 'unknown', how: 'no project path in the command line' };
}

/* The job is the script, not the pid. A pid is not an answer to "what is running". */
function jobOf(cmd) {
  const m = norm(cmd).match(/(?:^|[\s"])([\w./-]+\.(?:js|py|mjs|cjs))(?:[\s"]|$)/);
  if (!m) return norm(cmd).includes('--version') ? 'node --version' : 'unknown';
  const rel = m[1];
  const i = rel.search(/(engine|tests|build|web|apps|scripts)\//);
  return i >= 0 ? rel.slice(i) : rel.split('/').slice(-2).join('/');
}

function sample() {
  const projects = discoverProjects();
  let rows = [];
  try {
    /* NO DOUBLE QUOTES ANYWHERE IN THIS STRING. The first version wrote the WQL filter in double
     * quotes, which works when typed at a prompt and fails through execFileSync — Windows mangles
     * embedded quotes on the way to the child, and the tool reported "could not sample" against a
     * filter that is provably correct when run by hand. PowerShell's single-quoted string escapes
     * an inner quote by doubling it, so the whole command survives argument passing untouched. */
    /* claude.exe IS COUNTED, and leaving it out was the tool flattering its own side.
     * It tracked node and python — the things agents run — and filed Claude Code's own 17
     * processes under "everything else", where they read as the user's browser. Measured: 1.74 GB
     * of what the dashboard was calling other-people's-memory was mine. A monitor that excludes
     * its own author is not a monitor. */
    const ps = "Get-CimInstance Win32_Process -Filter 'Name=''node.exe'' OR Name=''python.exe'' OR Name=''python3.exe'' OR Name=''claude.exe''' | " +
      'Select-Object ProcessId,Name,WorkingSetSize,CommandLine | ConvertTo-Json -Compress -Depth 2';
    const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps],
      { encoding: 'utf8', maxBuffer: 1 << 24, timeout: 20000 });
    const parsed = JSON.parse(out.trim() || '[]');
    rows = (Array.isArray(parsed) ? parsed : [parsed]).filter(Boolean);
  } catch (e) {
    /* Announced, not swallowed. An empty process list and a failed sample look identical on screen
     * and mean opposite things — one is an idle box, the other is a blind dashboard. */
    return { error: String(e.message || e).split('\n')[0], at: new Date().toISOString(), procs: [], mem: null };
  }

  const procs = rows.map(r => {
    const cmd = r.CommandLine || '';
    /* Claude Code's own processes carry no project script, so the generic resolver would call them
     * unknown. They are not unknown — they are the assistant itself, and they belong on the bill. */
    if (/^claude\.exe$/i.test(r.Name || '')) {
      return { pid: r.ProcessId, runtime: 'claude', mb: Math.round((r.WorkingSetSize || 0) / 1048576),
               job: 'Claude Code', project: 'Claude', how: 'the assistant itself',
               tier: 'sacrificial', tier_why: 'the assistant — restartable, but stopping it ends this session' };
    }
    const { project, how } = attribute(cmd, projects);
    const job = jobOf(cmd);
    const { tier, why } = costOfLoss(job);
    return {
      pid: r.ProcessId, runtime: (r.Name || '').replace(/\.exe$/i, ''),
      mb: Math.round((r.WorkingSetSize || 0) / 1048576),
      job, project, how, tier, tier_why: why,
    };
  }).sort((a, b) => b.mb - a.mb);

  const byProject = {};
  for (const p of procs) {
    (byProject[p.project] = byProject[p.project] || { mb: 0, n: 0 });
    byProject[p.project].mb += p.mb; byProject[p.project].n++;
  }

  /* WHAT IS IN "ALREADY GONE". Will: "the already gone sorta includes my brave, so it should be a
   * part of my browser, please show the allocation of the others too."
   *
   * Correct — a single grey block labelled gone is just a shrug. It is also where the tool's own
   * bias hid: Claude Code's 17 processes sat in there reading as somebody else's browser. So the
   * region is itemised by application, and the itemisation is what makes a claim checkable. Grouped
   * by NAME because a browser is not one process — Brave was 12 of them and none individually big
   * enough to notice, which is exactly why "one YouTube tab is 7 GB?" was a reasonable guess and
   * wrong. */
  let spentBy = [];
  try {
    const ps2 = 'Get-Process | Group-Object ProcessName | ForEach-Object { [pscustomobject]@{ ' +
      'app=$_.Name; n=$_.Count; mb=[math]::Round((($_.Group|Measure-Object WorkingSet64 -Sum).Sum)/1MB) } } ' +
      '| Sort-Object mb -Descending | Select-Object -First 12 | ConvertTo-Json -Compress';
    const o2 = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps2],
      { encoding: 'utf8', maxBuffer: 1 << 24, timeout: 20000 });
    const p2 = JSON.parse(String(o2).trim() || '[]');
    /* THREE SIDES, NOT TWO. Will: "show at the top the useable ram that we can allocate between us,
     * and include all optional things like brave there."
     *
     * Right — the earlier split was wrong. It treated everything not-an-agent as a fixed cost, so a
     * browser he could close in one second sat in the same untouchable block as the Windows kernel.
     * Those are completely different kinds of thing:
     *
     *   OS       Windows itself. Not a choice, not negotiable, not part of the argument.
     *   YOURS    Brave, Steam, Discord — his, and optional. Closing one gives memory back.
     *   MINE     node and Claude Code.
     *
     * The allocatable pool is therefore total − OS, and his browser is part of HIS share rather than
     * a deduction from both of ours. That is the honest shape: what we are dividing is what either
     * of us could actually free. */
    const OS = /^(svchost|System|Registry|Memory Compression|MsMpEng|csrss|wininit|services|lsass|smss|dwm|fontdrvhost|winlogon|spoolsv|WmiPrvSE|audiodg|SecurityHealthService|SecurityHealthSystray|ctfmon|TextInputHost|SearchHost|SearchIndexer|RuntimeBroker|ShellExperienceHost|StartMenuExperienceHost|dllhost|conhost|sihost|taskhostw|explorer|Idle|LsaIso|NisSrv|WUDFHost|igfxCUIService|RtkAudUService|AMD.*|AggregatorHost|CompPkgSrv|ApplicationFrameHost)$/i;
    spentBy = (Array.isArray(p2) ? p2 : [p2]).filter(Boolean)
      .filter(r => !/^(node|python|python3|claude)$/i.test(r.app))   // mine, itemised separately
      .map(r => ({ app: r.app, n: r.n, mb: r.mb, side: OS.test(r.app) ? 'os' : 'yours' }));
  } catch (e) { spentBy = []; }

  const freeGb = os.freemem() / 1073741824, totalGb = os.totalmem() / 1073741824;
  const b = readBudget();
  const heavy = procs.filter(p => p.mb >= b.heavy_mb);
  return {
    at: new Date().toISOString(), error: null, procs,
    projects: projects.map(p => ({ name: p.name, group: p.group, vendor: p.vendor })),
    by_project: Object.entries(byProject).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.mb - a.mb),
    mem: { free_gb: +freeGb.toFixed(2), total_gb: +totalGb.toFixed(2), tracked_mb: procs.reduce((s, p) => s + p.mb, 0) },
    spent_by: spentBy,
    budget: b, modes: MODES,
    verdict: {
      heavy: heavy.length, over_heavy: heavy.length > b.max_heavy,
      under_reserve: freeGb < b.reserve_gb, headroom_gb: +(freeGb - b.reserve_gb).toFixed(2),
      /* PANIC is a fact about the MACHINE, not about the budget. Will's floor is a preference he
       * can drag to zero; the panic line is where the OS starts killing things regardless of what
       * anyone prefers, and it is set just above the 0.62 GB at which the real run died. */
      panic: freeGb < (b.panic_gb || 0.9),
      panic_gb: b.panic_gb || 0.9,
      reclaimable_mb: procs.filter(p => p.tier === 'sacrificial').reduce((s, p) => s + p.mb, 0),
      protected_mb: procs.filter(p => p.tier === 'protected').reduce((s, p) => s + p.mb, 0),
    },
  };
}

if (process.argv.includes('--once')) { console.log(JSON.stringify(sample(), null, 2)); process.exit(0); }

/* ---- --watch : THE SAME DASHBOARD, IN A TERMINAL -----------------------------------------------
 * Will asked for this without a browser. A native window would mean Electron or Tauri — a build
 * toolchain and a dependency tree to display five numbers, on a machine whose spare memory is the
 * very thing being measured. A terminal window is native, starts instantly, costs ~40 MB, and
 * Windows Terminal can pin it always-on-top in a corner.
 *
 * 1/2/3 switch mode and write the same file the web page writes, so the two views cannot disagree.
 */
if (process.argv.includes('--watch')) {
  const C = { r:'\x1b[0m', b:'\x1b[1m', dim:'\x1b[2m', ok:'\x1b[32m', warn:'\x1b[33m', bad:'\x1b[31m',
              cy:'\x1b[36m', mg:'\x1b[35m', bl:'\x1b[34m', ye:'\x1b[33m', gy:'\x1b[90m' };
  const PAL = [C.cy, C.mg, C.ok, C.ye, C.bl, C.warn];
  const seen = {};
  const col = n => (n === 'unknown' || n === 'ambiguous') ? C.gy
    : (seen[n] = seen[n] || PAL[Object.keys(seen).length % PAL.length]);
  const bar = (frac, w, ch) => ch.repeat(Math.max(0, Math.min(w, Math.round(frac * w))));

  /* THE SPARKLINE IS THE WHOLE POINT OF THE TERMINAL VERSION.
   * A single free-memory number tells you where you are. It does not tell you which way you are
   * going, and "which way" is the entire question — the run that died fell 4.03 -> 1.73 -> 0.62 GB
   * over about forty minutes, and every individual reading in that slide looked survivable. Sixty
   * samples of history turns three fine numbers into a visible slope. */
  const HIST = [], HIST_MAX = 60;
  const SPARK = '▁▂▃▄▅▆▇█';
  const sparkline = (vals, lo, hi) => vals.map(x => {
    const t = hi === lo ? 0.5 : (x - lo) / (hi - lo);
    return SPARK[Math.max(0, Math.min(7, Math.round(t * 7)))];
  }).join('');

  const draw = () => {
    const d = sample();
    const L = [];
    if (d.error) { L.push(C.bad + 'could not sample: ' + d.error + C.r); }
    else {
      const { mem: m, verdict: v, budget: b } = d;
      const state = v.under_reserve ? C.bad : v.headroom_gb < 1 ? C.warn : C.ok;
      HIST.push(m.free_gb); if (HIST.length > HIST_MAX) HIST.shift();
      /* Trend over the last minute, not since launch — the useful question is "is it falling NOW". */
      const win = HIST.slice(-20);
      const slope = win.length > 3 ? win[win.length - 1] - win[0] : 0;
      const arrow = slope < -0.25 ? C.bad + ' ▼ falling ' + slope.toFixed(2) + ' GB/min'
                  : slope > 0.25  ? C.ok  + ' ▲ freeing +' + slope.toFixed(2) + ' GB/min'
                  : C.dim + ' ▬ steady';
      L.push('');
      L.push('  ' + C.b + "WHO'S USING THE BOX" + C.r + C.dim + '   ' + new Date(d.at).toLocaleTimeString()
             + '   ' + d.projects.length + ' projects' + C.r);
      L.push('');
      L.push('  ' + state + C.b + m.free_gb.toFixed(2) + ' GB free' + C.r + '   ' + C.dim
             + (v.under_reserve ? 'BELOW the ' + b.reserve_gb + ' GB floor — nothing new should start'
                                : v.headroom_gb.toFixed(2) + ' GB above the ' + b.reserve_gb + ' GB floor') + C.r);
      if (HIST.length > 1) {
        const lo = Math.min(...HIST), hi = Math.max(...HIST);
        L.push('  ' + state + sparkline(HIST, lo, hi) + C.r + C.dim + '  ' + lo.toFixed(1) + '–' + hi.toFixed(1) + ' GB' + C.r + arrow + C.r);
      }
      /* one stacked bar: each project's share, then everything else, then free */
      const W = 54; let line = '  ';
      for (const p of d.by_project) line += col(p.name) + bar(p.mb / 1024 / m.total_gb, W, '█') + C.r;
      const otherGb = Math.max(0, (m.total_gb - m.free_gb) - m.tracked_mb / 1024);
      line += C.gy + bar(otherGb / m.total_gb, W, '▒') + C.r + C.dim + bar(m.free_gb / m.total_gb, W, '·') + C.r;
      L.push(line);
      L.push('  ' + C.dim + d.by_project.map(p => col(p.name) + p.name + ' ' + (p.mb / 1024).toFixed(2) + C.dim).join('  ')
             + '  ' + C.gy + 'other ' + otherGb.toFixed(2) + C.r);
      L.push('');
      const on = k => b.mode === k ? C.ok + C.b : C.dim;
      L.push('  ' + on('mine') + '[1] mine' + C.r + '   ' + on('shared') + '[2] shared' + C.r + '   '
             + on('overnight') + '[3] overnight' + C.r + C.dim + '    keep ' + b.reserve_gb + ' GB free · max '
             + b.max_heavy + ' heavy' + C.r);
      L.push('');
      if (!d.procs.length) L.push('  ' + C.dim + 'nothing running — the box is yours' + C.r);
      else for (const p of d.procs.slice(0, 14)) {
        const heavy = p.mb >= b.heavy_mb;
        L.push('  ' + col(p.project) + '●' + C.r + ' '
          + (heavy ? C.warn : '') + String(p.mb).padStart(5) + ' MB' + C.r + '  '
          + C.dim + p.project.padEnd(14).slice(0, 14) + C.r + p.job);
      }
      L.push('');
      L.push('  ' + C.dim + d.procs.length + ' tracked · ' + v.heavy + ' heavy'
             + (v.over_heavy ? C.warn + ' — OVER the limit of ' + b.max_heavy : '') + C.r
             + C.dim + '   q to quit' + C.r);
    }
    process.stdout.write('\x1b[H\x1b[2J' + L.join('\n') + '\n');
  };

  const setMode = mode => {
    const next = { ...readBudget(), ...MODES[mode], mode, updated: new Date().toISOString() };
    fs.mkdirSync(path.dirname(BUDGET), { recursive: true });
    fs.writeFileSync(BUDGET, JSON.stringify(next, null, 2) + '\n');
    draw();
  };
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
    process.stdin.on('data', k => {
      if (k === '1') setMode('mine'); else if (k === '2') setMode('shared'); else if (k === '3') setMode('overnight');
      else if (k === 'q' || k === '') { process.stdout.write('\x1b[?25h\n'); process.exit(0); }
    });
  }
  process.stdout.write('\x1b[?25l');                       // hide the cursor; restored on quit
  draw(); setInterval(draw, 3000);
  return;
}

/* READ THE PAGE PER REQUEST, NOT ONCE AT STARTUP.
 * The first version cached it in a const, so every edit to the HTML needed a server restart —
 * and the failure mode was silent: the browser reloaded, showed the OLD page, and looked like the
 * edit had not worked. Will hit exactly that. It is a 12 KB file on a dev tool; reading it per
 * request costs nothing and removes a class of confusion entirely. */
const page = () => {
  try { return fs.readFileSync(path.join(HERE, 'agent_dashboard.html'), 'utf8'); }
  catch (e) { return '<pre style="color:#f85149;font:14px monospace;padding:24px">'
    + 'agent_dashboard.html could not be read:\n\n' + String(e.message || e) + '</pre>'; }
};

/* SAMPLE ON A TIMER, SERVE FROM CACHE.
 *
 * sample() makes two execFileSync calls to PowerShell. That is SYNCHRONOUS, and node is single
 * threaded, so every one of them froze the entire server for a second or more — including the
 * request for the page itself. The browser would sit on a blank tab waiting for an HTML file that
 * was already on disk, because the process was busy asking Windows about processes. Will hit this
 * as "it aint loading", and it got worse the more the page polled, since each poll blocked the next.
 *
 * Now a background interval refreshes the snapshot and every request answers instantly from it. The
 * data is at most one tick old, which is the right trade for a monitor: slightly stale and always
 * available beats current and unreachable. */
let snapshot = { at: new Date().toISOString(), error: 'starting…', procs: [], mem: null };
const refresh = () => { try { snapshot = sample(); } catch (e) { snapshot = { at: new Date().toISOString(), error: String(e.message || e), procs: [], mem: null }; } };
refresh();
setInterval(refresh, 3000).unref?.();

http.createServer((req, res) => {
  const send = (code, type, body) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body); };
  if (req.url === '/api/load') return send(200, 'application/json', JSON.stringify(snapshot));

  /* THE ONLY ENDPOINT THAT ENDS A PROCESS, AND IT RE-DERIVES THE VERDICT ITSELF.
   * The page already knows which rows are sacrificial and could send only those — and that is
   * exactly why this does not trust it. A UI that decides what is safe to kill is one stale render
   * away from killing the wrong thing; the page can be old, a pid can be reused, a fetch can be
   * replayed. So the tier is recomputed HERE from a fresh sample, and a pid that is protected,
   * unknown, or no longer the process it was is refused. */
  if (req.url === '/api/reclaim' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e4) req.destroy(); });
    req.on('end', () => {
      let pid;
      try { pid = +JSON.parse(body).pid; } catch (e) { return send(400, 'application/json', JSON.stringify({ error: 'bad request' })); }
      const now = sample();
      const target = (now.procs || []).find(p => p.pid === pid);
      if (!target) return send(409, 'application/json', JSON.stringify({ error: 'that pid is not running now — refusing' }));
      if (target.tier !== 'sacrificial') {
        return send(403, 'application/json', JSON.stringify({ error: 'REFUSED — ' + target.job + ' is ' + target.tier + ': ' + target.tier_why }));
      }
      try {
        process.kill(pid);
        console.log('  reclaimed ' + target.mb + ' MB from ' + target.job + ' (pid ' + pid + ')');
        send(200, 'application/json', JSON.stringify({ ok: true, freed_mb: target.mb, job: target.job }));
      } catch (e) { send(500, 'application/json', JSON.stringify({ error: String(e.message || e) })); }
    });
    return;
  }
  if (req.url === '/api/budget' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        const next = { ...readBudget() };
        if (incoming.mode && MODES[incoming.mode]) { Object.assign(next, MODES[incoming.mode]); next.mode = incoming.mode; }
        /* Only the three knobs are writable and each is clamped. A dashboard that accepts an
         * arbitrary object writes whatever a stray fetch sends into the file a dispatcher trusts.
         * A hand-tweaked knob marks the mode `custom` rather than leaving a preset label sitting
         * above numbers that no longer match it. */
        let tweaked = false;
        if (Number.isFinite(+incoming.reserve_gb)) { next.reserve_gb = Math.min(12, Math.max(0, +incoming.reserve_gb)); tweaked = true; }
        if (Number.isFinite(+incoming.max_heavy))  { next.max_heavy  = Math.min(12, Math.max(0, Math.round(+incoming.max_heavy))); tweaked = true; }
        if (Number.isFinite(+incoming.heavy_mb))   { next.heavy_mb   = Math.min(8000, Math.max(50, Math.ceil(+incoming.heavy_mb))); tweaked = true; }
        if (tweaked && !incoming.mode) next.mode = 'custom';
        next.updated = new Date().toISOString();
        fs.mkdirSync(path.dirname(BUDGET), { recursive: true });
        fs.writeFileSync(BUDGET, JSON.stringify(next, null, 2) + '\n');
        send(200, 'application/json', JSON.stringify(next));
      } catch (e) { send(400, 'application/json', JSON.stringify({ error: String(e.message || e) })); }
    });
    return;
  }
  send(200, 'text/html; charset=utf-8', page());
}).listen(PORT, () => console.log('agent dashboard on http://localhost:' + PORT + '  (budget: ' + BUDGET + ')'));
