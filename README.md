# Portfolio

A static site that presents each project with its evidence, its written work, and a link to the
running app. Each card plays a 3-second silent preview of the app doing its main job.

**Live:** <https://willhoop.github.io/> · **Results, method and sources:** the
[white paper](docs/PORTFOLIO-whitepaper.md).

## Components

| Component | What it does |
|---|---|
| `index.html` | The whole site. The `PROJECTS` array is the one source for every card. |
| `build/build_agent_files.js` | Writes the static rows, JSON-LD, `llms.txt`, `sitemap.xml` and `robots.txt` from `PROJECTS`. |
| `build/record_previews.js`, `build/preview_scenes.js` | Record each card's preview from a scripted scene in Chrome. |
| `build/check_projects.py` | Audits every project's artefacts and versions, every card's version, and every published URL. |
| `build/build_docs.py`, `build/doc_links.py` | Render project Markdown into `docs/` and repair its links. |
| `build/publish-gate.js` | Decides whether a repository is safe to auto-publish. |
| `tests/` | `test-projects.js`, `test_check_cards.py`, `test_check_projects.py`, `test-publish-gate.js`. CI runs all four. |
| [White paper](docs/PORTFOLIO-whitepaper.md) · [Deck](docs/PORTFOLIO-deck-plain-english.md) · [Technical docs](docs/PORTFOLIO-technical-docs.md) | The project's documents. |

## Add a project
Append one object to the `PROJECTS` array at the bottom of `index.html`:

```js
{
  name: "Project name",
  status: "Live", version: "1.0.0", live: true,        // version = newest CHANGELOG release
  preview: { slug: "project-name", alt: "What the 3-second clip shows" },
  desc: "One or two plain sentences about the whole project.",
  keywords: ["Term an agent would search for", "Another term", "A third"],
  docs: { open: "https://...", paper: "...", deck: "...", docs: "...", source: "https://github.com/..." }
}
```

Then add a scene for `project-name` to `build/preview_scenes.js`, run
`node build/record_previews.js project-name`, and run `node build/build_agent_files.js`.
`PUSH-TO-GITHUB.bat` runs the last one for you.

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
Open `index.html` in a browser. The site has no runtime dependencies. `npm install` is needed
only to record previews (`playwright-core`, `ffmpeg-static`; it uses your installed Chrome).

## Hosting
Static. Deploys unchanged to GitHub Pages or Cloudflare Pages. For public hosting, the relative
document links must point at published copies of those files. See `docs/DEPLOYMENT.md`.
