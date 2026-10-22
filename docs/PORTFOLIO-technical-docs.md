# Portfolio — Technical Documentation

**Version 1.11 · Last updated 2026-10-22**

*Written in ASD-STE100 Simplified Technical English. Sentences are short. The voice is
active. Organised by the Diátaxis model. For results and figures, see the
[white paper](PORTFOLIO-whitepaper.md). This document does not repeat them.*

---

# PART 1 - TUTORIAL

## Open the site
1. Open `portfolio/index.html` in a browser. No server is necessary.
2. The project list builds from the `PROJECTS` array in the script block.
3. Each card shows a preview clip, the project name, its status and version, a description,
   and its document links.

## Set up the tools
The site has no runtime dependencies. The tools need these:
1. Install Node.js 20 or later, Python 3.10 or later, and Google Chrome.
2. In `portfolio/`, run `npm install`. This installs `playwright-core` and `ffmpeg-static`.
   Only `build/record_previews.js` uses them.

---

# PART 2 - HOW-TO

## Add a project
1. Open `index.html`.
2. Find `const PROJECTS = [`.
3. Add one object. Give a `name`, a `status`, a `version`, `live`, a `preview`, a `desc`, a
   `keywords` list, and a `docs` map.
4. Set `version` to the newest version in the project's live changelog. Use the full string,
   for example `1.4.0`. Do not write a version in `status`.
5. Set `preview` to `{ slug: "<file name>", alt: "<what the clip shows>" }`.
6. Write `desc` as one or two plain sentences about the whole project. Use 200 characters or
   fewer. Do not put figures in it. Figures go in the project's white paper.
7. Give three or more `keywords`. Use the terms a person or an agent types to find the project.
8. Give a value for each of the five slots: `open`, `paper`, `deck`, `docs`, `source`.
   Use an empty string for a document that does not exist. Do not remove the key.
   A private project sets `slots: ["open"]` and gives `open` only.
9. In `build/check_projects.py`, add the project folder to `PROJECTS`. If the card name and the
   project key are different, add the pair to `CARD_PROJECT`.
10. Record the preview. See "Record a preview".
11. Run `node build/build_agent_files.js`.
12. Run `node tests/test-projects.js`. All tests must pass.

## Record a preview
1. Open `build/preview_scenes.js`.
2. Add one scene with the same `slug` as the card. Give `url`, `prepare(page)` and `act(page)`.
   - `prepare` brings the app to its start state. The clip does not show it.
   - `act` does the one visible action. It must finish in 3 seconds.
   - Use selectors from the app's source. Do not use screen positions.
3. Run `node build/record_previews.js <slug>`.
4. The script writes `assets/previews/<slug>.webm`, `.mp4` and `.jpg`, and updates
   `assets/previews/manifest.json`. It also writes `assets/og-image.png`.
5. Look at the `.jpg`. It is the last frame before the loop fades. It must show the result.
6. Run `node tests/test-projects.js`. The tests compare each file with its hash in the manifest.
   Do not edit a clip by hand. Record it again.

If an app is down, its scene fails and the script keeps the old clip. A scene can start the app
locally with `serve`. The Guardian Chess scene does this.

## Mark a project offline
1. Set `status: "Offline"` and `live: false`.
2. Keep `docs.open`. `check_projects.py` then reports the link as down, but not as a gap.
3. When the link returns 200 again, set `status: "Live"` and `live: true`.

## Remove a project
1. Delete its object from `PROJECTS`.
2. Delete its entry from `PROJECTS` in `build/check_projects.py`, and from `build/build_docs.py`
   and `build/doc_links.py` if it has rendered documents.
3. Run `node build/build_agent_files.js`. The script removes the project from the static rows,
   the JSON-LD, `llms.txt` and `sitemap.xml`.
4. Run `node tests/test-projects.js`.

## Update the agent-readable files
1. Run `node build/build_agent_files.js`. The script writes only the files that changed.
2. To check without a write, run `node build/build_agent_files.js --check`. The script exits 1
   if a file is stale.
3. `PUSH-TO-GITHUB.bat` runs the check before it pushes. If a file is stale, the batch file
   rebuilds it and stops. Commit the files, then run the batch file again.

## Render the project documents
1. Run `python build/build_docs.py`. It renders each project's Markdown into `docs/<Project>/`.
2. The script repairs the links in each page with `build/doc_links.py`.
3. To repair the pages that are already in `docs/` without a new render, run
   `python build/doc_links.py`.

## Publish
1. Run `python build/check_projects.py`. Correct any gap it reports.
2. Run `node build/build_agent_files.js`, then all four test files (see Part 3).
3. Push to `main`. See `docs/DEPLOYMENT.md`.
4. Run `python build/check_projects.py` again. Every card must show `ok` in "Live site against
   local files". `NOT DEPLOYED` means that GitHub Pages has not finished. Wait one minute.

## Audit the project standard
Run `python build/check_projects.py`. The script prints five tables:

1. **Artefacts.** Every project against the artefacts its tier requires. A project is full
   unless its own `CLAUDE.md` has `<!-- TIER: joke -->` on a line of its own in the first 25
   lines. A joke project needs `docs/explainer.md` in place of the white paper, the deck, the
   technical documentation, `SECURITY.md` and `CONTRIBUTING.md`. An unknown tier is a gap.
2. **Version consistency.** The newest version in the live changelog against the version stamp
   on the primary artefact (the white paper, or the explainer for a joke project).
3. **Card versions.** Each card's `version` against its project's live changelog. The full
   string must be equal.
4. **Live URLs.** Every URL the site publishes. Each must return 200 after redirects. The script
   tries a failed URL again with a longer timeout, because a sleeping host can take one minute
   to start. A card with `live: false` does not need its Open link to answer.
5. **Live site against local files.** The cards on the live page against `index.html`.

Use `--offline` to skip tables 4 and 5.

The live changelog is `CHANGELOG.md`. If the header of `CHANGELOG.md` has a line marker with
`closed=` (for example `<!-- LINE: id=abra/regmb; closed=7.0.0 -->`), the live changelog is the
one `CHANGELOG-*.md` file that is not closed. If no such file is open, or if more than one is
open, the script reports a gap. `CHANGELOG.md` must still exist for every project.

Table 2 compares the major and minor versions. A project can declare `docs=major` in the line
marker of its live changelog. Use this only when the project re-stamps its documents at a major
release and at no other release. The script then compares the major version only. Any other
`docs=` value is a gap. The marker must be on a line of its own.

---

# PART 3 - REFERENCE

## Folder structure
| Path | Contents |
|---|---|
| `index.html` | The complete site. Contains generated static rows and JSON-LD between `AGENT:` markers. |
| `assets/favicon.svg`, `assets/og-image.png` | The tab icon and the social card. |
| `assets/previews/` | One `.webm`, `.mp4` and `.jpg` per card, and `manifest.json`. Generated. |
| `build/build_agent_files.js` | Writes the static rows, JSON-LD, `llms.txt`, `sitemap.xml` and `robots.txt` from `PROJECTS`. |
| `build/record_previews.js` | Records the previews and the social card. |
| `build/preview_scenes.js` | One scripted scene per card. |
| `build/scenes/chomp.html` | Draws one CHOMP solve for its preview. CHOMP has no web page of its own. |
| `build/build_docs.py`, `build/doc_links.py` | Render project Markdown to HTML in `docs/`, and repair its links. |
| `build/check_projects.py` | Audits every project, every card and every published URL. |
| `build/publish-gate.js` | Decides if a repository is safe to publish automatically. See below. |
| `build/agent_dashboard.js` | Shows free RAM and the running processes per project. Run `build/dashboard.bat`. It advises only. It does not stop processes. |
| `data/chomp-preview-solve.json` | The CHOMP solve that the CHOMP preview draws, with its command and ABRA commit. |
| `data/agent-budget.json` | The dashboard's state. Not tracked by git. |
| `tests/` | The four test files below. |
| `llms.txt`, `sitemap.xml`, `robots.txt` | Generated. Do not edit. |
| `docs/` | Rendered documents, and this documentation. |

## Tests
CI runs all four on every push and pull request (`.github/workflows/tests.yml`).

| File | Run | What it checks |
|---|---|---|
| `tests/test-projects.js` | `node tests/test-projects.js` | The project data, the layout, the generated files, contrast, SEO tags, every relative link, the previews against their manifest. |
| `tests/test_check_cards.py` | `python tests/test_check_cards.py` | The card-version, live-URL and deployed checks, on fake folders and a local server. |
| `tests/test_check_projects.py` | `python tests/test_check_projects.py` | The artefact tiers. |
| `tests/test-publish-gate.js` | `node tests/test-publish-gate.js` | The publish gate. |

## `build/publish-gate.js`
Run `node build/publish-gate.js <repository folder>`. The script exits 0 if the repository is
safe to publish automatically, and 1 if it is not. It requires two things: the inline scripts
of each page parse, and every `tests/test-*.js` file passes. Nothing calls it at this time.

## Document slots
| Slot | Label |
|---|---|
| `open` | Open |
| `paper` | White paper |
| `deck` | Slide deck |
| `docs` | Technical docs |
| `source` | Source |

`docs.open` is the primary destination. The whole row links to it.

## Project fields
| Field | Shown on card | Published in JSON-LD and `llms.txt` |
|---|---|---|
| `name` | Yes | Yes |
| `status` | Yes | `llms.txt` only |
| `version` | Yes | Yes (`softwareVersion`) |
| `live` | Yes (the status dot) | No |
| `preview` | Yes (the clip; `alt` is its label) | JSON-LD only (`screenshot`, the poster) |
| `desc` | Yes | Yes |
| `keywords` | No | Yes |
| `docs` | Yes | Yes |

## Preview format
| Property | Value |
|---|---|
| Length | 3.0 s, looped. The last 0.3 s fades into the first frame. |
| Size | 528 × 330 pixels, from a 1280 × 800 browser window |
| Frame rate | 15 per second |
| Files | VP9 `.webm` first, H.264 `.mp4` for Safari, `.jpg` poster |
| Sound | None. The files have no audio track. |
| Playback | Muted, inline, looped. It loads nothing until the card is on the screen. It does not play when the visitor asks for reduced motion. |
| Poster | The first two cards (`EAGER` in `index.html`) load it at once. The others load it 600 px before they reach the screen. |

The size and time limits are in `CLIP` at the top of `build/record_previews.js`. The test limits
are in `tests/test-projects.js`.

---

# PART 4 - EXPLANATION

## Why missing documents are dimmed, not hidden
Two reasons. Variable-length lists do not align down the page. And a visible gap is honest:
it tells the reader what is not written yet. See the white paper, section 3.

## Why there are no cards
Bordered cards with tag chips add visual weight and no information. The description already
carries what the chips repeated. Rules between rows separate the projects at a much lower
cost.

## Why each card has a preview
A visitor reads the name and the description only after they decide to stop. A moving picture
of the app tells them what the project is before that. The clips are recorded by a script, so a
new version of an app gets a new clip with one command. For what this does not prove, see the
white paper, section 9.

## Why the recorder cuts dead time
Some apps freeze the page while they calculate. Jeopardy Wagering's Final Jeopardy solve is one.
A clip of a frozen page shows nothing. The recorder shortens any time with no new frame to
0.35 s. It does not remove a frame that the page drew. It does not add one.

## Why the card version comes from the changelog
A version typed on a card goes stale. Three did before version 1.10.0. The changelog is the
record of each release, so the card must equal it, and `check_projects.py` fails when it does
not.

## Why the site has generated copies
The page builds its rows with JavaScript. Many crawlers and agents do not run JavaScript. The
generated copies give them the same content. One script makes every copy from `PROJECTS`, and a
test fails if a copy is stale. For the design and the sources, see the white paper, section 5.

## Why the tests read the shipped file
The test file slices the project array out of `index.html` instead of holding a copy. A copy
can disagree with the code. A slice cannot. The preview tests hash the shipped clips for the
same reason.
