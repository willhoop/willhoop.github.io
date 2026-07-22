# Portfolio — Technical Documentation

**Version 1.0 · Last updated 2026-07-22**

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
3. Add one object. Give a `name`, a `status`, `live`, a `desc`, a `note`, and a `docs` map.
4. Give a value for each of the five slots: `open`, `paper`, `deck`, `docs`, `source`.
   Use an empty string for a document that does not exist. Do not remove the key.
5. Run `node tests/test-projects.js`. All tests must pass.

## Move a project to GitHub
1. Put the repository base URL in one constant near the top of the script block.
2. Build each document link from that constant.
3. Do not write full URLs into each link.

## Publish
1. Run `python3 build/check_projects.py`. Correct any gap it reports.
2. Run `node tests/test-projects.js`.
3. Run `python3 build/build_docs.py` to render the local documents.
4. Push. See `docs/DEPLOYMENT.md`.

## Audit the project standard
Run `python3 build/check_projects.py`. The script prints a table of every project against the
seven required artefacts. The script exits non-zero if an artefact is absent.

---

# PART 3 - REFERENCE

## Folder structure
| Path | Contents |
|---|---|
| `index.html` | The complete site. One file. |
| `build/build_docs.py` | Renders project markdown to HTML in `docs/`. |
| `build/check_projects.py` | Audits every project against the standard. |
| `tests/test-projects.js` | 22 assertions on the project data and the layout. |
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

---

# PART 4 - EXPLANATION

## Why missing documents are dimmed, not hidden
Two reasons. Variable-length lists do not align down the page. And a visible gap is honest:
it tells the reader what is not written yet. See the white paper, section 3.

## Why there are no cards
Bordered cards with tag chips add visual weight and no information. The description already
carries what the chips repeated. Rules between rows separate the projects at a much lower
cost.

## Why the tests read the shipped file
The test file slices the project array out of `index.html` instead of holding a copy. A copy
can disagree with the code. A slice cannot.
