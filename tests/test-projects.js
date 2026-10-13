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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
