/* Portfolio — agent-readable files.  Run: node build/build_agent_files.js [--check]
 *
 * The page draws its project rows with JavaScript. Crawlers and AI agents often read the
 * raw HTML without running scripts, so they saw no projects at all. This script reads the
 * PROJECTS array from index.html (the one source) and writes, from it:
 *   - a static copy of the rows inside index.html (AGENT:ROWS markers)
 *   - schema.org JSON-LD inside index.html (AGENT:JSONLD markers)
 *   - llms.txt     a plain-text summary for language-model agents (llmstxt.org)
 *   - sitemap.xml  every page and document URL
 *   - robots.txt   allows all crawlers and names the sitemap
 * --check writes nothing and exits 1 if any output is stale. CI runs it. */
const fs = require('fs'), path = require('path'), vm = require('vm');

const SITE = 'https://willhoop.github.io/';
const ROOT = path.join(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');

/* Run the page's own script with a stub document, so the build uses the page's renderer. */
function load(html) {
  const block = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const store = {};
  const document = { getElementById: id => (store[id] = store[id] || {}) };
  return vm.runInNewContext(block + ';({PROJECTS,SLOTS,LABEL,renderRows})', { document });
}

const abs = u => /^https?:/.test(u) ? u : SITE + u;
const slotsOf = (p, S) => (p.slots || S).filter(k => p.docs[k]);

function jsonld(P, S, L) {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Person', '@id': SITE + '#will', name: 'Will Hooper', url: SITE,
        sameAs: ['https://github.com/willhoop'] },
      { '@type': 'WebSite', '@id': SITE + '#site', url: SITE, name: 'Will Hooper — Projects',
        author: { '@id': SITE + '#will' } },
      { '@type': 'ItemList', name: 'Projects', numberOfItems: P.length,
        itemListElement: P.map((p, i) => {
          const item = { '@type': 'SoftwareApplication', name: p.name, description: p.desc,
            url: abs(p.docs.open), keywords: p.keywords.join(', '),
            creator: { '@id': SITE + '#will' } };
          if (p.docs.source) item.codeRepository = p.docs.source;
          const rel = slotsOf(p, S).filter(k => k !== 'open' && k !== 'source');
          if (rel.length) item.subjectOf = rel.map(k =>
            ({ '@type': 'CreativeWork', name: p.name + ' ' + L[k].toLowerCase(), url: abs(p.docs[k]) }));
          return { '@type': 'ListItem', position: i + 1, item };
        }) }
    ]
  };
  /* "<" is escaped so no string in the data can close the script tag. */
  return '<script type="application/ld+json">\n' +
    JSON.stringify(data, null, 1).replace(/</g, '\\u003c') + '\n</script>';
}

function llms(P, S, L) {
  const out = ['# Will Hooper — Projects', '',
    '> Applied modelling and tooling projects by Will Hooper. Each project ships with a white paper ' +
    '(results, math, sources), a plain-English deck and technical documentation.', '',
    `Site: ${SITE}`, 'Contact: willjhooper@msn.com', '', '## Projects', ''];
  P.forEach(p => {
    out.push(`### ${p.name}`, '', p.desc, '', `Status: ${p.status}`,
             `Keywords: ${p.keywords.join(', ')}`, '');
    slotsOf(p, S).forEach(k => out.push(`- [${L[k]}](${abs(p.docs[k])})`));
    out.push('');
  });
  return out.join('\n');
}

function sitemap(P, S) {
  /* Only URLs on this site belong in its sitemap. */
  const urls = [SITE, SITE + 'llms.txt'];
  P.forEach(p => slotsOf(p, S).forEach(k => {
    const u = abs(p.docs[k]);
    if (u.startsWith(SITE) && !urls.includes(u)) urls.push(u);
  }));
  const esc = s => s.replace(/&/g, '&amp;');
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => `  <url><loc>${esc(u)}</loc></url>`).join('\n') + '\n</urlset>\n';
}

const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`;

function between(html, tag, body) {
  const re = new RegExp(`(<!-- AGENT:${tag}:START[^>]*-->)[\\s\\S]*?(<!-- AGENT:${tag}:END -->)`);
  if (!re.test(html)) throw new Error(`index.html is missing the AGENT:${tag} markers`);
  return html.replace(re, (_, a, b) => `${a}\n${body}\n${b}`);
}

function build() {
  const html = fs.readFileSync(INDEX, 'utf8');
  const { PROJECTS: P, SLOTS: S, LABEL: L, renderRows } = load(html);
  let page = between(html, 'ROWS', renderRows(P).trim());
  page = between(page, 'JSONLD', jsonld(P, S, L));
  /* Keep the page's own line endings; the inserted blocks are LF. */
  if (html.includes('\r\n')) page = page.replace(/\r?\n/g, '\r\n');
  return {
    'index.html': page,
    'llms.txt': llms(P, S, L),
    'sitemap.xml': sitemap(P, S),
    'robots.txt': robots()
  };
}

module.exports = { build, load, SITE };

if (require.main === module) {
  const check = process.argv.includes('--check');
  const stale = [];
  for (const [name, body] of Object.entries(build())) {
    const file = path.join(ROOT, name);
    const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : null;
    if (old === body.replace(/\r\n/g, '\n')) continue;
    stale.push(name);
    if (!check) fs.writeFileSync(file, body);
  }
  if (check && stale.length) {
    console.log('STALE  ' + stale.join(', ') + '\nRun: node build/build_agent_files.js');
    process.exit(1);
  }
  console.log(stale.length ? (check ? '' : 'wrote  ' + stale.join(', ')) : 'agent files up to date');
}
