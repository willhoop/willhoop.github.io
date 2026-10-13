# Portfolio — Technical Documentation

**Version 1.9 · Last updated 2026-10-13**

*Written in ASD-STE100 Simplified Technical English. Sentences are short. The voice is
active. Organised by the Diátaxis model.*

---

# PART 1 - TUTORIAL

## Open the site
1. Open `portfolio/index.html` in a browser. No server is necessary.
2. The project list builds from the `PROJECTS` array in the script block.

---

# PART 2 - HOW-TO

## Add a project
1. Open `index.html`.
2. Find `const PROJECTS = [`.
3. Add one object. Give a `name`, a `status`, `live`, a `desc`, a `keywords` list, and a
   `docs` map.
4. Write `desc` as one or two plain sentences about the whole project. Use 200 characters or
   fewer. Do not put figures in it. Figures go in the project's white paper.
5. Give three or more `keywords`. Use the terms a person or an agent types to find the project.
6. Give a value for each of the five slots: `open`, `paper`, `deck`, `docs`, `source`.
   Use an empty string for a document that does not exist. Do not remove the key.
   A private project sets `slots: ["open"]` and gives `open` only.
7. Run `node build/build_agent_files.js`.
8. Run `node tests/test-projects.js`. All tests must pass.

## Remove a project
1. Delete its object from `PROJECTS`.
2. Run `node build/build_agent_files.js`. The script removes the project from the static rows,
   the JSON-LD, `llms.txt` and `sitemap.xml`.
3. Run `node tests/test-projects.js`.

## Update the agent-readable files
1. Run `node build/build_agent_files.js`. The script writes only the files that changed.
2. To check without a write, run `node build/build_agent_files.js --check`. The script exits 1
   if a file is stale.
3. `PUSH-TO-GITHUB.bat` runs the check before it pushes. If a file is stale, the batch file
   rebuilds it and stops. Commit the files, then run the batch file again.

## Move a project to GitHub
1. Put the repository base URL in one constant near the top of the script block.
2. Build each document link from that constant.
3. Do not write full URLs into each link.

## Publish
1. Run `python3 build/check_projects.py`. Correct any gap it reports.
2. Run `node build/build_agent_files.js`, then `node tests/test-projects.js`.
3. Run `python3 build/build_docs.py` to render the local documents.
4. Push. See `docs/DEPLOYMENT.md`.

## Audit the project standard
Run `python3 build/check_projects.py`. The script prints a table of every project against the
seven required artefacts. The script exits non-zero if an artefact is absent.

The script then compares the newest version in the live changelog with the version stamp on the
project's primary artefact. The live changelog is `CHANGELOG.md`. If the header of `CHANGELOG.md`
has a line marker with `closed=` (for example `<!-- LINE: id=abra/regmb; closed=7.0.0 -->`), the
live changelog is the one `CHANGELOG-*.md` file that is not closed. If no such file is open, or if
more than one is open, the script reports a gap. `CHANGELOG.md` must still exist for every project.

The script compares the major and minor versions. A project can declare `docs=major` in the line
marker of its live changelog, for example
`<!-- LINE: id=abra/regmc; ...; docs=major -->`. Use this only when the project re-stamps its
documents at a major release and at no other release. The script then compares the major version
only. Any other `docs=` value is a gap. The marker must be on a line of its own.

---

# PART 3 - REFERENCE

## Folder structure
| Path | Contents |
|---|---|
| `index.html` | The complete site. One file. Contains generated static rows and JSON-LD between `AGENT:` markers. |
| `build/build_agent_files.js` | Writes the static rows, JSON-LD, `llms.txt`, `sitemap.xml` and `robots.txt` from `PROJECTS`. |
| `build/build_docs.py` | Renders project markdown to HTML in `docs/`. |
| `build/check_projects.py` | Audits every project against the standard. |
| `tests/test-projects.js` | Assertions on the project data, the layout and the generated files. |
| `llms.txt`, `sitemap.xml`, `robots.txt` | Generated. Do not edit. |
| `docs/` | Rendered documents, and this documentation. |

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
| `desc` | Yes | Yes |
| `keywords` | No | Yes |
| `status` | No | `llms.txt` only |
| `docs` | Yes | Yes |

---

# PART 4 - EXPLANATION

## Why missing documents are dimmed, not hidden
Two reasons. Variable-length lists do not align down the page. And a visible gap is honest:
it tells the reader what is not written yet. See the white paper, section 3.

## Why there are no cards
Bordered cards with tag chips add visual weight and no information. The description already
carries what the chips repeated. Rules between rows separate the projects at a much lower
cost.

## Why the site has generated copies
The page builds its rows with JavaScript. Many crawlers and agents do not run JavaScript. The
generated copies give them the same content. One script makes every copy from `PROJECTS`, and a
test fails if a copy is stale. For the design and the sources, see the white paper, section 5.

## Why the tests read the shipped file
The test file slices the project array out of `index.html` instead of holding a copy. A copy
can disagree with the code. A slice cannot.
