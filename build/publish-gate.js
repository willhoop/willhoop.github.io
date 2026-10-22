#!/usr/bin/env node
/* publish-gate.js — decides whether a repository is safe to auto-publish.
 *
 * Usage: node build/publish-gate.js <repo-dir>   (run from portfolio/)
 *        exit 0 = safe to push,  exit 1 = do not push (reason on stdout)
 *
 * WHY THIS EXISTS
 * ---------------
 * auto-publish.bat runs `git add -A && git commit && git push` across several repositories every
 * ten minutes. It was written because Claude Cowork would not push to GitHub itself, so the timer
 * was the only way work reached the live sites. That is a real problem and the script solves it.
 *
 * What it had no way to do was tell the difference between finished work and a half-finished edit.
 * The HoopaDex architecture review of 2026-08-03 watched it commit and push that review's own
 * in-progress changes twice. Worse, a previous session left app/index.html a syntax error — a
 * completely blank page — and the timer published it, with all 18 test suites still green, because
 * the suites slice text out of the file and text slices fine when it cannot run.
 *
 * So the timer stays; publishing on a timer is the point. This adds the gate it never had.
 *
 * Two checks, both cheap, both skipped when they do not apply:
 *
 *   1. If the repo has tests/test-*.js, every one must pass.
 *   2. If the repo has app/index.html, its inline <script> blocks must parse. This is checked
 *      separately from the suites precisely because a green suite does not imply a page that runs.
 *
 * A repo with neither is published exactly as before, so adding this cannot stop a project that
 * never had tests from shipping.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repo = process.argv[2];
if (!repo) { console.log('usage: node build/publish-gate.js <repo-dir>'); process.exit(2); }
if (!fs.existsSync(repo)) { console.log('no such directory: ' + repo); process.exit(2); }

const reasons = [];

// --- 1. the page must parse -------------------------------------------------------------------
const appFile = path.join(repo, 'app', 'index.html');
if (fs.existsSync(appFile)) {
  const src = fs.readFileSync(appFile, 'utf8');
  const blocks = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (!blocks.length) reasons.push('app/index.html has no inline script — is it truncated?');
  for (const m of blocks) {
    try { new Function(m[1]); }
    catch (e) { reasons.push('app/index.html does not parse: ' + e.message); break; }
  }
}

// --- 2. the suites must pass ------------------------------------------------------------------
const testDir = path.join(repo, 'tests');
if (fs.existsSync(testDir)) {
  const suites = fs.readdirSync(testDir).filter(f => /^test-.*\.js$/.test(f));
  for (const s of suites) {
    try {
      execFileSync(process.execPath, [path.join(testDir, s)], { cwd: repo, stdio: 'pipe', timeout: 180000 });
    } catch (e) {
      reasons.push('suite failed: tests/' + s);
    }
  }
}

if (reasons.length) {
  console.log(reasons.slice(0, 6).join(' | '));
  process.exit(1);
}
process.exit(0);
