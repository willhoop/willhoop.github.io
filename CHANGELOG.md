# Changelog — portfolio

All notable changes to the portfolio site are recorded here, newest first.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Rule.** Every change is logged here in the same pass as the code, together with the matching
updates to the white paper, the deck, and the technical documentation. A prior conclusion is never
silently rewritten; what changed and why is stated.

---

## [1.8.2] — 2026-10-08

### Added
- **Fourth Down Engine** (`fourth-down`) is in the audited project list: an NFL 4th-down decision
  engine with coach and kicker grades.

### Record
- **Measured.** No portfolio figure changed.
- **Basis.** unchanged
- **Supersedes.** Nothing.
- **Owed to the next major.** The portfolio white paper and deck do not yet list Fourth Down Engine.

## [1.8.1] — 2026-10-06

### Added
- **Move Advisor** (`Pokemon/ironmon-move-engine`, private repo `willhoop/ironmon-move-engine`) is in
  the audited project list. It meets all twelve artefacts and its changelog matches its white paper.

### Notes
- The portfolio's own version check was already failing before this entry: `CHANGELOG.md` is 1.8.0
  (now 1.8.1) while `docs/PORTFOLIO-whitepaper.md` is stamped 1.0. Not changed here; flagged.

## [1.8.0] — 2026-10-01

### Added
- **A changelog line can declare `docs=major`** in its `<!-- LINE: ... -->` marker. The version check
  then compares the MAJOR version only against the white paper's stamp, instead of major.minor. *Why:*
  ABRA re-stamps its documents only at an `X.0.0` release by its own rule, so `CHANGELOG-REGMC.md`
  1.52.0 against a white paper stamped 1.0.0 was a MISMATCH by design. The project declares this in its
  own changelog; no project is named in the script. Any other `docs=` value is reported as a gap.
  Approved by Will, 2026-10-01.

### Fixed
- **The LINE marker must stand on its own line.** In 1.7.1 the marker was matched anywhere in the first
  25 lines, so this changelog's own 1.7.1 entry, which quotes the marker in prose, made the portfolio's
  `CHANGELOG.md` read as a CLOSED line and its version went unchecked. Found while testing this change.

### Notes
- ABRA passes only once its `CHANGELOG-REGMC.md` marker carries `docs=major`. That edit belongs to the
  ABRA repository and is not made here.
- Existing mismatches for CHOMP, Event Desks, KaizoDex and Portfolio are left as they are.

## [1.7.1] — 2026-10-01

### Fixed
- **`build/check_projects.py` reads a project's LIVE changelog, not always `CHANGELOG.md`.** ABRA
  closed its Reg M-B line at 7.0.0 and runs Reg M-C in `CHANGELOG-REGMC.md`, so the check compared
  the closed 7.0.0 with the Reg M-C white paper's 1.0.0 — two different version series. The live
  changelog is now chosen from the `<!-- LINE: ...; closed=X.Y.Z -->` marker the changelog writes in
  its own header: `CHANGELOG.md` unless it is closed, then the one open `CHANGELOG-*.md`. No project
  name is hardcoded. None open, or more than one, is reported as a gap. `CHANGELOG.md` is still
  required for every project. Approved by Will, 2026-10-01.
- The version section no longer runs only when the artefact table passes, and a project with no
  stamp override has its white paper's masthead version derived instead of being skipped as
  "no stamped artifact to compare". *Why:* ABRA was unchecked while the table looked complete. This
  work was found uncommitted in the working tree (dated 2026-09-06 in its comments) and is released
  here with the fix above.

### Notes
- ABRA still reports a MISMATCH after the fix: `CHANGELOG-REGMC.md` 1.51.0 against the white paper's
  1.0.0. ABRA re-stamps its white paper only at a MAJOR release, by its own rule, so the umbrella rule
  "top version MUST equal the stamp" (compared at major.minor) cannot be met without bumping ABRA's
  documents. Not changed here; a rule change is proposed to Will.
- Pre-existing and untouched: version mismatches for CHOMP, Event Desks, KaizoDex and Portfolio, and
  three red checks in `tests/test-projects.js` (Event Desks document slots, since 1.7.0).

## [1.7.0] — 2026-09-19

### Changed
- **Event Desks is private.** Its card now shows the site link only, elitefourcapital.com.
  The white paper, deck, technical documentation and source links are removed, and the
  rendered documents in `docs/EventDesks/` are deleted. *Why:* the owner made the project's
  source and documentation private.
- A project can set `slots` to draw only some link rows. Event Desks uses `slots: ["open"]`,
  so the empty rows are not drawn as dimmed placeholders.
- `build/build_docs.py` no longer renders Event Desks documents.

## [1.6.0] — 2026-08-15

### Added
- **Guardian Chess** project card, inserted as the 5th project so the numbering of
  Kaizo Dex and Jeopardy Wagering moves down one. Links the live site on Render, the
  white paper, the plain-English deck, the technical documentation, and the source
  repository `willhoop/guardian-chess`.
- `Guardian Chess` registered in `build/check_projects.py`. It was added to the audit
  in the same pass as the card, rather than after, so the standard could not be met
  unevenly the way HoopaDex once was. It passes all twelve artefact checks.

### Notes
- The project credits the variant itself to Alex Hooper; the card and the documents
  say so. What is mine is the implementation.
- Pre-existing and untouched: the audit reports a CHOMP version mismatch
  (changelog 2.5.0 against file 2.9). Not introduced by this change and not fixed
  here.

---

## [1.5.0] — 2026-07-23

### Added
- **Jeopardy Wagering** project card (the 5th project), linking its live app, white paper (PDF),
  slide deck, documentation index, and source repository `willhoop/jeopardy-wagering`. Follows the
  same Option-A pattern as the other own-repo projects (HoopaDex, Kaizo Dex): the app is served
  from `.../jeopardy-wagering/app/`, not the repo root.
- The project is wired into the shared publish scripts (`../auto-publish.bat`, `../publish.bat`),
  so it auto-pushes on the same 2-minute background cadence as every other project once its GitHub
  repository exists.

## [1.4.0] — 2026-07-22

### Added
- **Governance and delivery files** to meet the portfolio's public-company documentation bar:
  `LICENSE` (MIT), `SECURITY.md`, `CONTRIBUTING.md`, `.gitignore`, and a GitHub Actions CI
  workflow that runs the test suite on every push and pull request.


## [1.3.0] — 2026-07-22

### Changed
- **Whole card is a click target.** The title is an anchor whose `::after` covers the card, so a
  click anywhere opens that project's primary destination. The document links keep their own targets
  on a higher layer, and keyboard focus is visible.
- **Evidence made consistent across cards.** All projects now report the same kind of number: a count
  of tests with hand-derived expected values.

### Removed
- **The CHOMP agreement statistic** from the card. 74% agreement over 50 games is a real measurement,
  but the sample is too small to headline and the win-rate result was already reported as not
  statistically significant. The full result stays in `VALIDATION-REPORT.md`, which the card links —
  it was moved off the headline, not deleted.
- **The tag chips.** They wrapped to two lines and added no information the description did not carry.
  The `tags` arrays remain in the data for a future filter.
- **The box around the evidence number.** The number now sits on the card and is larger.

---

## [1.2.0] — 2026-07-22

### Added
- **The Event Desks prediction-market project.** It replaced the "Prediction Market" placeholder,
  which described the same project as undocumented; two cards for one project would have been wrong.
  Placed second, between CHOMP and HoopaDex, ranked by real-world importance.

### Changed
- **Document links made host-safe.** Event Desks lives in `willhoop/event-desk`; its white paper,
  deck and technical documentation are linked at GitHub through a single `EVENTDESK` constant, not
  copied here. Copies would drift. All four external links were fetched and confirmed to resolve.

### Fixed
- **Horizontal overflow on narrow phones.** The card grid used `repeat(auto-fit,minmax(330px,1fr))`;
  the 330px floor overflowed any viewport under about 386px. Changed to `minmax(min(330px,100%),1fr)`.
  Pre-existing and unrelated to Event Desks.

---

## [1.0.0] — 2026-07-22

### Added
- Created the site: a single static file, no dependencies, no build step.
- Project cards for CHOMP, HoopaDex, and the political-forecasting project.
- A "How these are built" section describing the documentation and testing standard.
