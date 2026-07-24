# CLAUDE.md — portfolio
Universal rules live in my global Claude Instructions. This file is project-specific only.

**Goal.** Present projects to engineers and investors. Evidence first, marketing never.

**Rules.**
- Project cards are plain-English and readable — not a spec sheet. They do NOT need to lead with a number.
- Measured numbers and performance claims live in the white paper (backed by that project's validation report), not on the card.
- Adding a project must stay a one-object edit in the `PROJECTS` array.
- No emoji, no stock imagery, no filler copy.

## Rule: three places must agree

Every change must land in all three places in the same pass. A change that lands in one place only
is not finished.

| Place | What it is |
|---|---|
| Local files | `C:\Users\willj\Projects\...` — the working copy |
| GitHub | The repository that holds the source |
| The live site | The deployed page a visitor sees |

Procedure for any change:
1. Change the local file.
2. Update the documentation in the same pass: white paper, deck, technical documentation.
3. Add a CHANGELOG entry. Increase the version. Change the "last updated" date.
4. Push to GitHub.
5. Confirm the live site shows the change.
6. State which of the three places are updated and which are not.

If a step cannot be done, say so immediately and name the step. Do not report a change as complete
when it exists only on disk. "Written locally, not yet pushed" is the correct wording in that case.

Repository map:
| Project | Repository | Live at |
|---|---|---|
| Portfolio | not yet created | not yet published |
| HoopaDex | `willhoop/hoopadex` | `willhoop.github.io/hoopadex` |
| Event Desks | `willhoop/event-desk` | `elitefourcapital.com` |
| CHOMP | not yet created | runs locally in the browser |

Warning: the root `index.html` of `willhoop/event-desk` IS the live site at elitefourcapital.com.
Never push another project into that repository root.


## Rule: identical treatment, enforced by a check

Every project gets the same seven artefacts. No exceptions, no "this one is small".

| Artefact | Path |
|---|---|
| White paper | `docs/*whitepaper*` |
| Plain-English deck | `docs/*deck*` |
| Technical documentation | `docs/*technical-docs*` |
| README | `README.md` |
| Changelog | `CHANGELOG.md` |
| Agent notes | `CLAUDE.md` |
| Tests | `tests/` |

Run `python3 portfolio/build/check_projects.py` before any publish. It prints every project
against every artefact and exits non-zero on a gap.

This check exists because the standard was written down and then followed unevenly: HoopaDex
shipped without a white paper or a deck and nothing caught it. A standard that is not checked
is a preference. Do not rely on remembering it.


## Rule: one changelog format for every project

Every project keeps a `CHANGELOG.md` in this exact shape. It is the standard; do not invent a
per-project variant.

```
# Changelog — <Project>

All notable changes to <project> are recorded here, newest first.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Rule.** Every change is logged here in the same pass as the code, together with the matching
updates to the white paper, the deck, and the technical documentation. A prior conclusion is
never silently rewritten; what changed and why is stated.

---

## [MAJOR.MINOR.PATCH] — YYYY-MM-DD
### Added
### Changed
### Fixed
### Removed
### Notes
- Use only the sections that apply. Newest release on top.
```

Rules:
- Newest release first. One `## [version] — date` heading per release.
- ISO dates (YYYY-MM-DD). Sentence case. State the reason, not just the change.
- The top version MUST equal the version stamped on the projects primary artifact
  (a file header, an `@version` line, or a document version block).
- `portfolio/build/check_projects.py` verifies the file exists AND that its newest version
  matches the artifact stamp. Run it before publishing.
