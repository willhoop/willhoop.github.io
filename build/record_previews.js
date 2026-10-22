/* Portfolio — card previews.  Run: node build/record_previews.js [slug ...]
 *
 * Records a 3-second silent loop of each project doing its most visual thing, so a
 * visitor understands the card with the sound off before reading a word. Nothing is
 * recorded by hand: each clip is a scripted scene below, replayed in real Chrome.
 *
 * For each scene:
 *   1. Playwright opens the app at 1280x800 in Chrome.
 *   2. prepare() brings the app to its starting state. Nothing is captured yet.
 *   3. Chrome's screencast (DevTools Page.startScreencast) captures every painted frame with
 *      its time while act() runs the visible action, and for 1.5 s after it settles.
 *      DEAD TIME IS CUT, NOTHING ELSE: a gap longer than 0.35 s between two painted frames
 *      is shortened to 0.35 s. Such a gap is the page frozen (a simulation blocking the main
 *      thread) or idle; no frame inside it is dropped, because none was painted. Jeopardy's
 *      Final Jeopardy solve freezes the page for about 2 s, and is shown in 0.35 s.
 *      A scene may set speed > 1 when its one real action outlasts 3 s; the clip then plays
 *      that much faster, and the manifest records the speed. ABRA's 400-game playout takes
 *      about 4 s and plays at 1.6x.
 *      The result is resampled to a steady 15 frames per second over 3.3 s: each output
 *      instant shows the last frame painted at or before it.
 *   4. ffmpeg crossfades the last 0.3 s into the first 0.3 s, so the 3.0 s loop has no
 *      jump, and writes <slug>.webm (VP9), <slug>.mp4 (H.264, for Safari) and
 *      <slug>.jpg (the poster: the result frame, shown before playback and to anyone
 *      who asked for reduced motion).
 *   5. assets/previews/manifest.json records size, hash, source URL and date per clip.
 *      tests/test-projects.js checks the files against it.
 * Then it composes assets/og-image.png (1200x630), the social card, from the posters.
 *
 * Needs: npm install (playwright-core, ffmpeg-static) and Google Chrome installed.
 * A scene whose app is down fails loudly; its old clip is kept, not deleted. */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { execFileSync, spawn } = require('child_process');
const { chromium } = require('playwright-core');
const FFMPEG = require('ffmpeg-static');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'previews');
const VIEW = { width: 1280, height: 800 };
const CLIP = { seconds: 3.0, fade: 0.3, fps: 15, width: 528, height: 330, poster: 2.6, maxGap: 0.35 };

const wait = ms => new Promise(r => setTimeout(r, ms));

/* One object per card, keyed by the card's preview.slug in index.html.
   url      what is recorded
   prepare  page -> reach the starting state (cut from the clip)
   act      page -> the visible action, must finish inside 3 s
   serve    optional: a local command to start first, for an app whose host is down */
const SCENES = require('./preview_scenes.js');

function ffmpeg(args) { execFileSync(FFMPEG, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' }); }

function encode(frameDir, slug) {
  const { seconds: S, fade: F, fps, width: W, height: H } = CLIP;
  const base = `trim=0:${S + F},setpts=PTS-STARTPTS,fps=${fps},scale=${W}:${H}:flags=lanczos,split[a][b];` +
    `[a]trim=${F}:${S + F},setpts=PTS-STARTPTS[main];[b]trim=0:${F},setpts=PTS-STARTPTS[head];` +
    `[main][head]xfade=transition=fade:duration=${F}:offset=${S - F},format=yuv420p[v]`;
  const input = ['-framerate', String(fps), '-i', path.join(frameDir, '%04d.jpg'),
                 '-filter_complex', '[0:v]' + base, '-map', '[v]', '-an'];
  const o = f => path.join(OUT, `${slug}.${f}`);
  ffmpeg([...input, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '42', '-row-mt', '1', '-deadline', 'good', o('webm')]);
  ffmpeg([...input, '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart', '-profile:v', 'main', o('mp4')]);
  ffmpeg(['-ss', String(CLIP.poster), '-i', o('mp4'), '-frames:v', '1', '-q:v', '5', o('jpg')]);
}

async function startServer(serve) {
  if (!serve) return null;
  // no shell: the child is the server itself, so kill() stops it rather than orphaning it
  const p = spawn(serve.cmd, serve.args, { cwd: serve.cwd, env: { ...process.env, ...serve.env }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(serve.ready); if (r.ok) return p; } catch {}
    await wait(500);
  }
  p.kill(); throw new Error('server did not start: ' + serve.ready);
}

async function record(browser, scene) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-'));
  const server = await startServer(scene.serve);
  try {
    const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1, colorScheme: 'light',
      reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await page.goto(scene.url, { waitUntil: 'networkidle', timeout: 90000 });
    await scene.prepare(page);
    await wait(400);
    const cdp = await ctx.newCDPSession(page), frames = [];
    cdp.on('Page.screencastFrame', f => {
      frames.push({ t: f.metadata.timestamp, data: f.data });
      cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: VIEW.width, maxHeight: VIEW.height });
    await wait(300);                                     // the first frame: the starting state
    const start = Date.now() / 1000;
    const span = CLIP.seconds + CLIP.fade;
    const speed = scene.speed || 1;
    await Promise.all([scene.act(page).then(() => wait(1500)), wait(span * speed * 1000 + 300)]);
    await cdp.send('Page.stopScreencast');
    await ctx.close();
    if (!frames.length) throw new Error('the screencast captured no frames');
    // the clip's own clock: real time, except that a gap with no painted frame counts at most maxGap
    let clock = 0, prev = start;
    frames.sort((a, b) => a.t - b.t);           // DevTools can deliver frames out of order
    const timed = frames.map(f => {
      const real = Math.max(f.t, start);
      clock += Math.min(real - prev, CLIP.maxGap) / speed; prev = real;
      return { at: clock, data: f.data };
    });
    // PV_DEBUG=1 prints each painted frame as real seconds -> clip seconds
    if (process.env.PV_DEBUG) console.log('\n' + frames.map((f, i) => (f.t - start).toFixed(2) + '->' + timed[i].at.toFixed(2)).join(' '));
    // resample to a steady rate: each instant shows the last frame painted at or before it
    const n = Math.round(span * CLIP.fps);
    for (let i = 0; i < n; i++) {
      const t = i / CLIP.fps;
      const f = timed.filter(x => x.at <= t).pop() || timed[0];
      fs.writeFileSync(path.join(tmp, String(i).padStart(4, '0') + '.jpg'), Buffer.from(f.data, 'base64'));
    }
    encode(tmp, scene.slug);
  } finally {
    if (server) server.kill();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function manifestEntry(scene) {
  const e = { url: scene.url, recorded: new Date().toISOString().slice(0, 10), seconds: CLIP.seconds,
              speed: scene.speed || 1, maxGap: CLIP.maxGap,
              fps: CLIP.fps, width: CLIP.width, height: CLIP.height, files: {} };
  for (const ext of ['webm', 'mp4', 'jpg']) {
    const buf = fs.readFileSync(path.join(OUT, `${scene.slug}.${ext}`));
    e.files[ext] = { bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') };
  }
  return e;
}

async function ogImage(browser, slugs) {
  const tiles = slugs.map(s => `<img src="data:image/jpeg;base64,${
    fs.readFileSync(path.join(OUT, s + '.jpg')).toString('base64')}">`).join('');
  const html = `<html><body style="margin:0;width:1200px;height:630px;background:#f2efe8;font-family:Georgia,serif;
    display:flex;flex-direction:column;padding:44px 52px;box-sizing:border-box">
    <div style="font:500 64px Georgia,serif;color:#211e18;letter-spacing:-1px">Will Hooper</div>
    <div style="font:24px Georgia,serif;color:#433d33;margin:6px 0 26px">Projects — measured, documented, open.</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px">${tiles}</div>
    <style>img{width:100%;aspect-ratio:16/10;object-fit:cover;border:1px solid #ddd6c8}</style></body></html>`;
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html);
  await page.screenshot({ path: path.join(ROOT, 'assets', 'og-image.png') });
  await page.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv.slice(2);
  const mfile = path.join(OUT, 'manifest.json');
  const manifest = fs.existsSync(mfile) ? JSON.parse(fs.readFileSync(mfile, 'utf8')) : {};
  const browser = await chromium.launch({ channel: 'chrome' });
  let failed = 0;
  for (const scene of SCENES.filter(s => !only.length || only.includes(s.slug))) {
    process.stdout.write(scene.slug.padEnd(20));
    try {
      await record(browser, scene);
      manifest[scene.slug] = manifestEntry(scene);
      const f = manifest[scene.slug].files;
      console.log(`ok  webm ${(f.webm.bytes / 1024).toFixed(0)} KB  mp4 ${(f.mp4.bytes / 1024).toFixed(0)} KB`);
    } catch (e) {
      failed++; console.log('FAILED  ' + e.message.split('\n')[0]);
    }
  }
  fs.writeFileSync(mfile, JSON.stringify(manifest, null, 1) + '\n');
  await ogImage(browser, SCENES.map(s => s.slug).filter(s => fs.existsSync(path.join(OUT, s + '.jpg'))).slice(0, 8));
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
