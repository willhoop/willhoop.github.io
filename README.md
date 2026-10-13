# Portfolio

A static site that presents each project with its evidence, its written work, and — where the
project runs in a browser — a live demo.

## Add a project
Append one object to the `PROJECTS` array at the bottom of `index.html`:

```js
{
  name: "Project name",
  status: "Live — v1.0.0", live: true,
  desc: "One or two plain sentences about the whole project.",
  keywords: ["Term an agent would search for", "Another term", "A third"],
  docs: { open: "https://...", paper: "...", deck: "...", docs: "...", source: "https://github.com/..." }
}
```

Then run `node build/build_agent_files.js`. `PUSH-TO-GITHUB.bat` runs it for you.

## Agent-readable files
The page draws its rows with JavaScript. Agents and crawlers that do not run scripts read these
instead. All are generated from `PROJECTS`; do not edit them by hand.

| File | Purpose |
|---|---|
| Static rows in `index.html` | The project list in plain HTML |
| JSON-LD in `index.html` | schema.org data: each project's name, description, keywords and links |
| `llms.txt` | Plain-text summary for language-model agents ([llmstxt.org](https://llmstxt.org)) |
| `sitemap.xml`, `robots.txt` | Crawl list and crawl permission |

`node tests/test-projects.js` fails when any of them is stale. CI runs it on every push.

## Preview locally
Open `index.html` in a browser. No dependencies.

## Hosting
Static. Deploys unchanged to GitHub Pages or Cloudflare Pages. For public hosting, the relative
document links must point at published copies of those files. See `docs/DEPLOYMENT.md`.
