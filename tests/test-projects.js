/* Portfolio — project data tests.  Run: node tests/test-projects.js
 * Pins the rules the page depends on, so a new project cannot break the layout:
 * every project fills the same document slots, and no link renders undefined. */
const fs = require('fs'), path = require('path'), os = require('os');
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const block = src.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];

const tmp = path.join(os.tmpdir(), 'portfolio-harness.js');
fs.writeFileSync(tmp, `
const store={};
const document={getElementById:id=>(store[id]=store[id]||{})};
${block}
module.exports={PROJECTS,SLOTS,LABEL,html:store['rows'].innerHTML};
`);
const H = require(tmp);

let pass = 0, fail = 0;
const chk = (c, m) => { if (c) { pass++; console.log('pass  ' + m); }
                        else   { fail++; console.log('FAIL  ' + m); } };

chk(H.PROJECTS.length >= 1, 'at least one project');
chk(H.SLOTS.length === Object.keys(H.LABEL).length, 'every slot has a label');

H.PROJECTS.forEach(p => {
  chk(!!p.name && !!p.desc && !!p.status, p.name + ': has name, status, description');
  chk(!!p.docs && typeof p.docs === 'object', p.name + ': has a docs object');
  chk(H.SLOTS.every(k => k in p.docs), p.name + ': defines every document slot');
  chk(!!p.docs.open, p.name + ': has a primary destination');
  chk(!H.SLOTS.some(k => String(p.docs[k]).includes('undefined')),
      p.name + ': no undefined in any link');
});

// The layout promise: identical link column on every row.
const cols = [...H.html.matchAll(/class="links">([\s\S]*?)<\/div>/g)]
               .map(m => (m[1].match(/<(a|span) /g) || []).length);
chk(cols.length === H.PROJECTS.length, 'one link column per project');
chk(cols.every(c => c === H.SLOTS.length), 'every column has the same number of rows');

// Whole row must be clickable.
chk((H.html.match(/<h3 class="name"><a href=/g) || []).length === H.PROJECTS.length,
    'every project title is a link');

// The chrome that was deliberately removed must stay removed.
chk(!/class="card"/.test(H.html), 'no card boxes');
chk(!/class="tags"/.test(H.html), 'no tag chips');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
