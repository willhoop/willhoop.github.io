/* Portfolio — project data tests.  Run: node tests/test-projects.js
 * Pins the rules the page depends on, so a new project cannot break the layout:
 * every project fills the same document slots, and no link renders undefined.
 * Also pins the agent-readable copies (static rows, JSON-LD, llms.txt, sitemap)
 * to the PROJECTS array, so they cannot drift from what the page shows. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const src = read('index.html');
const A = require('../build/build_agent_files.js');
const H = A.load(src);
H.html = H.renderRows(H.PROJECTS);

let pass = 0, fail = 0;
const chk = (c, m) => { if (c) { pass++; console.log('pass  ' + m); }
                        else   { fail++; console.log('FAIL  ' + m); } };

chk(H.PROJECTS.length >= 1, 'at least one project');
chk(H.SLOTS.length === Object.keys(H.LABEL).length, 'every slot has a label');

H.PROJECTS.forEach(p => {
  chk(!!p.name && !!p.desc && !!p.status, p.name + ': has name, status, description');
  chk(!!p.docs && typeof p.docs === 'object', p.name + ': has a docs object');
  chk((p.slots || H.SLOTS).every(k => k in p.docs), p.name + ': defines every document slot');
  chk(!!p.docs.open, p.name + ': has a primary destination');
  chk(!(p.slots || H.SLOTS).some(k => String(p.docs[k]).includes('undefined')),
      p.name + ': no undefined in any link');
  // Short and sweet: the card is a summary, the white paper holds the detail.
  // Limit set by hand: 200 characters is two plain sentences.
  chk(p.desc.length <= 200, p.name + ': description is 200 characters or fewer');
  chk(Array.isArray(p.keywords) && p.keywords.length >= 3, p.name + ': has at least 3 keywords');
});

// The layout promise: identical link column on every row.
const cols = [...H.html.matchAll(/class="links">([\s\S]*?)<\/div>/g)]
               .map(m => (m[1].match(/<(a|span) /g) || []).length);
chk(cols.length === H.PROJECTS.length, 'one link column per project');
chk(H.PROJECTS.every((p, i) => cols[i] === (p.slots || H.SLOTS).length),
    'every column has the rows its project declares');

// Whole row must be clickable.
chk((H.html.match(/<h3 class="name"><a href=/g) || []).length === H.PROJECTS.length,
    'every project title is a link');

// The chrome that was deliberately removed must stay removed.
chk(!/class="card"/.test(H.html), 'no card boxes');
chk(!/class="tags"/.test(H.html), 'no tag chips');

// Agent-readable copies match the PROJECTS array.
const built = A.build();
for (const f of Object.keys(built))
  chk(fs.existsSync(path.join(ROOT, f)) && read(f) === built[f].replace(/\r\n/g, '\n'),
      f + ': up to date (else run node build/build_agent_files.js)');
const static_ = src.match(/<!-- AGENT:ROWS:START[^>]*-->([\s\S]*?)<!-- AGENT:ROWS:END -->/)[1];
H.PROJECTS.forEach(p => {
  chk(static_.includes(p.desc), p.name + ': description is in the static HTML');
  chk(read('llms.txt').includes('### ' + p.name), p.name + ': listed in llms.txt');
});
const ld = JSON.parse(src.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const list = ld['@graph'].find(n => n['@type'] === 'ItemList');
chk(list.itemListElement.length === H.PROJECTS.length, 'JSON-LD lists every project');
chk(read('robots.txt').includes('Sitemap: ' + A.SITE + 'sitemap.xml'), 'robots.txt names the sitemap');

// Event Desks is private: only its site link may be published anywhere.
const ed = H.PROJECTS.find(p => p.name === 'Event Desks');
if (ed) chk(Object.keys(ed.docs).join() === 'open', 'Event Desks publishes its site link only');

// ---- fixes from the 2026-10-22 audit. Each test fails on the site as it was. ----

// Contrast. --faint text was 2.68:1 on the page background, under WCAG AA's 4.5:1.
// Every token used for text must reach 4.5:1 on both the page and the hover panel.
// The formula is WCAG 2.x relative luminance; its own anchor values are checked first.
const tok = Object.fromEntries([...src.match(/:root\{([\s\S]*?)\}/)[1].matchAll(/--([a-z0-9]+):(#[0-9a-f]{6})/gi)]
                               .map(m => [m[1], m[2]]));
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
  .map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
chk(Math.abs(ratio('#000000', '#ffffff') - 21) < 1e-9, 'contrast formula: black on white is 21:1');
chk(Math.abs(ratio('#777777', '#ffffff') - 4.48) < 0.01, 'contrast formula: #777 on white is 4.48:1');
for (const t of ['ink', 'ink2', 'mute', 'faint', 'accent'])
  for (const bg of ['bg', 'panel'])
    chk(ratio(tok[t], tok[bg]) >= 4.5, `contrast: --${t} on --${bg} is ${ratio(tok[t], tok[bg]).toFixed(2)}:1 (needs 4.5)`);

// Landmarks, favicon, social card, description length.
chk(/<main>[\s\S]*id="rows"[\s\S]*<\/main>/.test(src), 'the project list sits inside a <main> landmark');
const icon = (src.match(/<link rel="icon" href="([^"]+)"/) || [])[1];
chk(!!icon && fs.existsSync(path.join(ROOT, icon)), 'favicon is linked and the file exists (was a 404)');
const og = (src.match(/<meta property="og:image" content="https:\/\/willhoop\.github\.io\/([^"]+)"/) || [])[1];
chk(!!og && fs.existsSync(path.join(ROOT, og)), 'og:image is set and the file exists');
chk(/<meta property="og:image:alt" content="[^"]{10,}"/.test(src), 'og:image has alt text');
const desc = src.match(/<meta name="description" content="([^"]+)"/)[1];
chk(desc.length >= 70 && desc.length <= 160, `meta description is 70-160 characters (is ${desc.length}; search results cut at about 160)`);
chk(/<title>[^<]{10,60}<\/title>/.test(src), 'title is 10-60 characters');

// Every card shows its status and its version. They were in the data and never drawn.
H.PROJECTS.forEach(p => {
  chk(/^\d+\.\d+(\.\d+)?$/.test(p.version || ''), p.name + ': has a plain version number');
  chk(!/v\d/.test(p.status), p.name + ': status carries no version of its own (one source)');
  chk(H.html.includes(`${p.status} · v${p.version}</p>`), p.name + ': card shows status and version');
});

// "Updated" is the release date, not the visitor's clock. It printed the current year.
const top = read('CHANGELOG.md').match(/^## \[([^\]]+)\] — (\d{4}-\d{2}-\d{2})/m);
chk(H.UPDATED === top[2], `UPDATED (${H.UPDATED}) equals the newest CHANGELOG date (${top[2]})`);
chk(!/new Date\(\)/.test(src), "the page never prints the visitor's clock as a date");

// Changelog: one heading per version. 1.9.7 was published twice on 2026-10-13; that
// pair is history and stays, so it is the one allowed repeat.
const heads = [...read('CHANGELOG.md').matchAll(/^## \[([^\]]+)\]/gm)].map(m => m[1]);
const dupes = heads.filter((v, i) => heads.indexOf(v) !== i);
chk(dupes.join() === '1.9.7', `no repeated changelog version except the recorded 1.9.7 pair (found: ${dupes.join(', ') || 'none'})`);

// Relative links. 26 links in the rendered docs pointed at .md files never published.
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? (['node_modules', '.git'].includes(e.name) ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
const broken = [];
for (const f of walk(ROOT).filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(f, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  for (const m of html.matchAll(/(?:href|src|poster|data-poster)="([^"#?]+)/g)) {
    const u = m[1];
    if (/^(?:[a-z]+:|\/\/)/i.test(u)) continue;
    if (!fs.existsSync(path.resolve(path.dirname(f), decodeURIComponent(u))))
      broken.push(path.relative(ROOT, f) + ' -> ' + u);
  }
}
chk(broken.length === 0, `every relative link in every page resolves (${broken.length} broken${broken.length ? ': ' + broken.slice(0, 3).join('; ') : ''})`);
chk(/def fix_html/.test(read('build/doc_links.py')) && /doc_links\.fix_html/.test(read('build/build_docs.py')),
    'build_docs.py repairs links on every render, so the fix survives the next render');

// Previews. One clip per card, three files each, matching the recorder's manifest.
const manifest = fs.existsSync(path.join(ROOT, 'assets/previews/manifest.json'))
  ? JSON.parse(read('assets/previews/manifest.json')) : {};
const crypto = require('crypto');
/* The duration of an MP4, read from its movie header box (ISO/IEC 14496-12, 8.2.2 mvhd).
   After the 4-byte type: version (1), flags (3), then creation and modification times,
   timescale (4) and duration. Version 0 has 4-byte times and duration, so timescale sits
   at type+16 and duration at type+20; version 1 has 8-byte ones: type+24 and type+28. */
const mp4Seconds = buf => { const i = buf.indexOf('mvhd'); const v = buf[i + 4];
  return v === 0 ? buf.readUInt32BE(i + 20) / buf.readUInt32BE(i + 16)
                 : Number(buf.readBigUInt64BE(i + 28)) / buf.readUInt32BE(i + 24); };
// the reader itself, on a hand-built version-0 box: timescale 1000, duration 3000 -> 3 s
{ const box = Buffer.alloc(28); box.write('mvhd', 0); box.writeUInt32BE(1000, 16); box.writeUInt32BE(3000, 20);
  chk(mp4Seconds(Buffer.concat([Buffer.alloc(4), box])) === 3, 'mp4 duration reader: hand-built mvhd reads 3 s'); }
let clipBytes = 0;
H.PROJECTS.forEach(p => {
  const pv = p.preview || {};
  chk(!!pv.slug && !!pv.alt && pv.alt.length >= 20, p.name + ': has a preview with alt text');
  const m = manifest[pv.slug];
  chk(!!m, p.name + ': preview is in the recorder manifest');
  if (!m) return;
  for (const ext of ['webm', 'mp4', 'jpg']) {
    const f = path.join(ROOT, 'assets', 'previews', `${pv.slug}.${ext}`);
    const ok = fs.existsSync(f);
    const buf = ok ? fs.readFileSync(f) : Buffer.alloc(0);
    chk(ok && crypto.createHash('sha256').update(buf).digest('hex') === m.files[ext].sha256,
        `${p.name}: ${ext} matches the manifest hash (recorded by script, not edited)`);
    if (ext === 'webm') {
      clipBytes += buf.length;
      chk(buf.length <= 400 * 1024, `${p.name}: webm is 400 KB or less (${(buf.length / 1024).toFixed(0)} KB)`);
    }
    if (ext === 'mp4' && ok) {
      const s = mp4Seconds(buf);
      chk(Math.abs(s - 3) <= 0.1, `${p.name}: mp4 runs 3 s (${s.toFixed(2)} s)`);
    }
  }
  chk(H.html.includes(`aria-label="${pv.alt}"`), p.name + ': preview video carries its alt text');
});
chk(clipBytes <= 2.5 * 1024 * 1024, `all clips together are 2.5 MB or less (${(clipBytes / 1048576).toFixed(2)} MB)`);
chk((H.html.match(/<video muted loop playsinline preload="none"/g) || []).length === H.PROJECTS.length,
    'every preview is muted, loops, plays inline and loads nothing until on screen');
chk(/prefers-reduced-motion: reduce/.test(src) && /!still/.test(src), 'previews do not play for reduced-motion visitors');
// Page weight: all seven posters (141 KB) loaded on a phone that shows one card.
const eager = (H.html.match(/ poster="/g) || []).length, lazy = (H.html.match(/ data-poster="/g) || []).length;
chk(eager === 2 && eager + lazy === H.PROJECTS.length, `two posters load at once, the rest as they near the screen (${eager} eager, ${lazy} lazy)`);
chk(!/opsz/.test(src), 'the font request carries no optical-size axis (it doubled the font download)');
chk(fs.existsSync(path.join(ROOT, 'build', 'record_previews.js')) && fs.existsSync(path.join(ROOT, 'build', 'preview_scenes.js')),
    'previews are recorded by build/record_previews.js from scripted scenes');

// No italic is drawn, so none is requested. (This alone saved nothing: browsers skip unused faces.)
chk(!/ital/.test((src.match(/fonts\.googleapis\.com\/css2\?([^"]+)"/) || [])[1] || 'ital') && !/italic|font-style/.test(src.replace(/<script[\s\S]*?<\/script>/g, '')),
    'no italic font is requested, and none is used');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
