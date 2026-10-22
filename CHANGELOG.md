# Changelog — portfolio

All notable changes to the portfolio site are recorded here, newest first.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Rule.** Every change is logged here in the same pass as the code, together with the matching
updates to the white paper, the deck, and the technical documentation. A prior conclusion is never
silently rewritten; what changed and why is stated.

---

## [1.10.0] — 2026-10-22

### Added
- **A 3-second silent preview on every card.** Each clip shows the app doing the one thing that explains it:
  ABRA's win meter after a 400-game playout, CHOMP's mixed strategy, Event Desks' market tape, HoopaDex stacking
  three filters, a Guardian Chess Guardian leap, Jeopardy's two Final Jeopardy wagers, Fourth Down's call.
  *Why:* a visitor should know what a project is before reading a word. Muted, looped, inline; nothing loads
  until the card is on screen; a still poster for visitors who ask for reduced motion.
- **`build/record_previews.js` and `build/preview_scenes.js`** record the clips from scripted scenes in Chrome
  (DevTools screencast, then ffmpeg: VP9 `.webm`, H.264 `.mp4`, `.jpg` poster) and write
  `assets/previews/manifest.json`. *Why:* clips made by hand go stale; these re-record with one command.
  Two disclosed rules: a gap with no painted frame counts at most 0.35 s (Jeopardy's solve freezes the page),
  and ABRA's clip plays at 1.6x because its real playout takes about 4 s.
- **CHOMP's preview draws one real solve** (`data/chomp-preview-solve.json`: the CHOMP technical docs' Part 1.2
  command on ABRA `b8de8517`, release `eaa5becc54eb`). *Why:* CHOMP runs inside ABRA and has no page of its own.
- **`build/check_projects.py`: card versions, live URLs, deployed site.** Every card's `version` must equal its
  project's live CHANGELOG; every URL the site publishes must return 200 (a card marked `live: false` is
  exempt for its Open link only); the cards on the live page must equal `index.html`. `--offline` skips the
  network. *Why:* the three drifted cards below passed every existing check.
- **`tests/test_check_cards.py`** (24 cases, fake folders and a local HTTP server, hand-set expectations), in CI.
- **`build/doc_links.py`**, called by `build/build_docs.py` on every render, repairs links in rendered documents.
- Favicon, Open Graph image (`assets/og-image.png`, composed from the posters), `twitter:card`, `<main>`.
- `package.json` with the two recording tools as dev dependencies. The site has no runtime dependency.

### Changed
- **Cards show status and version** (`Live · v5.61`). Both were in the data and never drawn. `version` is now
  its own field; `status` carries no version.
- **Guardian Chess: "Offline", `live: false`.** Its Render host returned nothing to three requests of up to
  150 s on 2026-10-22, so the card no longer claims it works. Its preview is recorded from the app run locally.
- Contrast: `--faint` #9a9283 → #6f695c, `--mute` #726c60 → #5e584d, so every text colour passes WCAG AA.
- Web fonts: the italic Newsreader is no longer requested; the page never draws italic. Fonts were 160 of the
  page's 175 KB.
- Meta description shortened to fit search results. "Updated" shows the release date, not the visitor's year.
- Row layout gains a preview column; on a phone the preview sits above the title.
- `README.md` gains a component table; `docs/DEPLOYMENT.md` sections 5 and 6 rewritten (they described relative
  links and demos the site no longer has).

### Fixed
- **Card versions that disagreed with their CHANGELOG:** ABRA v2.3.0 (no such release on its live Reg M-C line,
  which is at 1.78.2), HoopaDex v5.55 (5.61), Fourth Down v1.3.0 (1.4.0). Jeopardy's "v2.2" is now the full
  version. Four projects released during this pass; their cards were set to the pushed releases (HoopaDex 5.62,
  Guardian Chess 1.0.1, Jeopardy 2.2.1, Fourth Down 1.4.1), which the new card check caught before publishing.
- **26 broken relative links** in the rendered documents under `docs/` (links to `.md` sources never published).
- Favicon request returned 404 on every page view.

### Removed
- **KaizoDex**, retired 2026-10-22 and merged into HoopaDex: `docs/KaizoDex/`, and its entries in
  `check_projects.py`, `build_docs.py` and the `agent_dashboard.js` comment. It had no card.

### Notes
- Two releases were published as 1.9.7 on 2026-10-13 (CHOMP, then Jeopardy). Both headings stay as published;
  `tests/test-projects.js` now allows that one repeat and fails on any other.
- The technical documentation folds in what 1.9.8 and 1.9.9 owed: the publish gate and the tier marker.
- Not fixed here, outside this repository: Event Desks' white paper is stamped 1.6.0 against its CHANGELOG
  1.8.0, so `check_projects.py` still fails on it; the four `apps/` demos are unlinked from the page.

### Record
- **Measured.** Live projects 7 → 6 (Guardian Chess offline; `check_projects.py` live table). Card versions
  ABRA 1.78.2, HoopaDex 5.62, Guardian Chess 1.0.1, Jeopardy 2.2.1, Fourth Down 1.4.1 (each project's live
  CHANGELOG, each pushed). Preview sizes:
  `assets/previews/manifest.json`. Contrast, link and SEO figures: white paper section 8.
- **Basis.** unchanged
- **Supersedes.** ~~7 live~~ → 6. ~~ABRA v2.3.0~~ retracted. ~~HoopaDex v5.55~~ → 5.62. ~~Guardian Chess v1.0.0~~ →
  1.0.1. ~~Jeopardy v2.2~~ → 2.2.1. ~~Fourth Down v1.3.0~~ → 1.4.1.
- **Owed to the next major.** Nothing. The white paper, deck and technical documentation are updated in this pass.

## [1.9.9] — 2026-10-22

### Added
- **Project tiers in `build/check_projects.py`.** A project that puts `<!-- TIER: joke -->` in its own
  CLAUDE.md is checked for a one-page `docs/explainer.md` in place of the white paper, deck, technical docs,
  SECURITY and CONTRIBUTING, and its version stamp is read from the explainer. No marker means full; an unknown
  tier is a gap. *Why:* joke projects do not need an in-depth white paper, and a rule the checker does not
  know about would fail them forever or be ignored.
- **Monger Compass** added to the checked projects, as the first joke-tier project.
- **`tests/test_check_projects.py`**, 12 cases with hand-set expectations against fake project folders, run in
  CI. *Why:* the checker gates every publish and had no tests.

### Changed
- The checker's two sections now live in `artefact_table()` and `version_table()` behind `main()`, so the test
  can import it without running the audit. Output is unchanged except for the new tier column and explainer
  column.

### Record
- **Measured.** No portfolio figure changed.
- **Basis.** unchanged
- **Supersedes.** Nothing.
- **Owed to the next major.** Technical documentation: document the tier marker and the explainer artefact.

## [1.9.8] — 2026-10-22

### Added
- **`build/publish-gate.js`**, moved here from the loose `Projects/publish-gate.js`. It decides whether a repo is
  safe to auto-publish: inline page scripts must parse and every `tests/test-*.js` must pass. *Why:* it sat at the
  top of `Projects/` with no home and no tests; portfolio already holds the cross-project tools.
- **`tests/test-publish-gate.js`**, 10 cases with hand-set expected exit codes, run in CI. *Why:* untested-in-CI
  code is untested.

### Notes
- Nothing calls the gate today: its caller, `auto-publish.bat`, no longer exists. It is kept for any future
  auto-publish job.

### Record
- **Measured.** No portfolio figure changed.
- **Basis.** unchanged
- **Supersedes.** Nothing.
- **Owed to the next major.** Technical documentation: add a reference entry for `build/publish-gate.js`.

---

## [1.9.7] — 2026-10-13

### Changed
- **CHOMP card: the Reg M-C team-preview solver inside ABRA**, status "Live in ABRA — v3.0.0", new description and
  keywords; `llms.txt` and the JSON-LD regenerated by `build/build_agent_files.js`. *Why:* chomp 3.0.0 replaces the
  retired Reg M-B userscript with the solver built in ABRA.
- **CHOMP documents re-rendered** (`docs/CHOMP/`: white paper, technical docs, executive summary, validation report,
  README, CHANGELOG) and the **deck PDF re-exported** to `docs/CHOMP/` and `docs/Pokemon/`. Slide 6 now carries three
  measured figures instead of three that did not measure the tool. Only CHOMP was rendered: `build/build_docs.py`
  re-renders every project and calls LibreOffice, which this machine does not have, so the PDF was exported with
  PowerPoint (`chomp/build/export_deck_pdf.ps1`).

### Record
- **Measured.** No portfolio figure changed. CHOMP's figures live in its white paper.
- **Basis.** unchanged
- **Supersedes.** Nothing.
- **Owed to the next major.** Nothing.

## [1.9.7] — 2026-10-13

### Changed
- **Jeopardy Wagering card: status "Live — v2.2".** *Why:* jeopardy-wagering 2.2.0 is live. Among
  wagers with equal win chance, Smart Bet now picks the one with the highest average earnings.
  Checked on the live app before the change. The description is unchanged.

### Record
- **Measured.** No portfolio figure changed.
- **Basis.** unchanged
- **Supersedes.** Nothing.
- **Owed to the next major.** Nothing.

## [1.9.6] — 2026-10-13

### Changed
- **Jeopardy Wagering card: status "Live — v2.1".** *Why:* jeopardy-wagering 2.1.0 is live, with its
  simulated rivals calibrated to modern-era play. Checked on the live app before the change. The
  description is unchanged.

### Record
- **Measured.** No portfolio figure changed.
- **Basis.** unchanged
- **Supersedes.** Nothing.
- **Owed to the next major.** Nothing.

## [1.9.5] — 2026-10-13

### Added
- **NFL data (`nfl-data`) is in the `check_projects.py` audit.** A local Parquet mirror of nflverse
  data, built alongside Fourth Down Engine. It meets all twelve artefacts. The repository is private,
  so it has no card.

### Record
- **Measured.** No portfolio figure changed.
- **Basis.** unchanged
- **Supersedes.** Nothing.
- **Owed to the next major.** Nothing.

## [1.9.4] — 2026-10-13

### Changed
- **Jeopardy Wagering card: status "Live — v2.0"**, and "simulated opponents" added to its keywords.
  *Why:* jeopardy-wagering 2.0.0 is live; Smart Bet now plays against simulated contestants. Checked on
  the live app (footer "Wager Trainer v2.0.0") before the change. The description is unchanged.

### Record
- **Measured.** No portfolio figure changed.
- **Basis.** unchanged
- **Supersedes.** Nothing.
- **Owed to the next major.** Nothing.

## [1.9.3] — 2026-10-13

### Changed
- Fourth Down Engine's card shows **Live — v1.3.0** (redesign, Games tab grading every
  team in every game, a "Since 2021" coach view, short share links).

### Record
- **Measured.** No portfolio figure changed.
- **Basis.** unchanged
- **Supersedes.** Live — v1.2.5.
- **Owed to the next major.** Nothing new.

## [1.9.2] — 2026-10-13

### Changed
- **HoopaDex card: status "Live — v5.55" and a new description** that names its ROM-hack section.
  *Why:* HoopaDex 5.55 shipped that section, covering six ROM hacks including Emerald Kaizo, which is
  what replaced the Kaizo Dex card in 1.9.0. Checked on the live app before the change. Keywords add
  Pokémon Champions, ROM hacks, Renegade Platinum, Emerald Kaizo and nuzlocke.

### Record
- **Measured.** No portfolio figure changed.
- **Basis.** unchanged
- **Supersedes.** Nothing.
- **Owed to the next major.** Nothing.

## [1.9.1] — 2026-10-13

### Added
- **`build/agent_dashboard.js`, `build/agent_dashboard.html` and `build/dashboard.bat`** are now
  tracked. *Why:* they were written on 2026-08-05 and never committed. The dashboard shows free RAM
  and which project each running process belongs to, so concurrent agents do not run the machine out
  of memory. Its state file, `data/agent-budget.json`, changes as it runs and is now in `.gitignore`.
- **Every Last Grain is in the `check_projects.py` audit.** This one-line change was also uncommitted.

### Notes
- **Guardian Chess's repository is now public.** Its card linked the source, white paper, deck and
  technical docs on GitHub while the repository was private, so every visitor got a 404. Will chose
  to make it public; its history was checked first for committed secrets and none were found.

### Record
- **Measured.** No portfolio figure changed.
- **Basis.** unchanged
- **Supersedes.** Nothing.
- **Owed to the next major.** Nothing. The technical documentation lists the dashboard in this pass.

## [1.9.0] — 2026-10-13

### Removed
- **The Kaizo Dex card.** *Why:* Will retired it. HoopaDex's ROM-hack section is to replace it.
  That section is not live yet, so the HoopaDex card does not claim it. The `kaizodex` repository,
  its app and the rendered copies in `docs/KaizoDex/` are unchanged; only the card is gone.

### Changed
- **The white paper, deck and technical documentation are brought up to date and stamped 1.9.**
  They now describe the short descriptions, the `keywords` field and `build/build_agent_files.js`.
  The deck ends with a link to the white paper.

### Record
- **Measured.** Project count on the site: 8 became 7 (`index.html`, `PROJECTS`). Test count: 77
  assertions (`node tests/test-projects.js`).
- **Basis.** unchanged
- **Supersedes.** ~~8 projects~~. The white paper's ~~22 assertions~~ is replaced by 77; it had been
  stale since the suite grew.
- **Owed to the next major.** Nothing. The 1.8.2–1.8.4 records are folded in. The white paper does
  not list projects by name, so "list Fourth Down Engine" needs no text. The portfolio's own documents
  have no PDFs to rebuild; they ship as Markdown.

## [1.8.4] — 2026-10-13

### Changed
- **Every project description is one or two short sentences about the whole project.** *Why:* the old
  paragraphs were spec sheets. Detail and figures belong in each white paper, per this project's rule.
  The unused `blurb` field is removed.
- **HoopaDex status reads "Live — v5.54".** *Why:* the card said v1.93, a superseded version. The
  HoopaDex session reported it; `app/index.html` line 2 and the live app both read 5.54.
- **Fourth Down Engine status reads "Live — v1.2.5"**, its pushed version. The card said v1.1.0.

### Added
- **The site is readable by agents and crawlers that do not run JavaScript.** *Why:* the rows were
  drawn by script, so the raw HTML held no project text. `build/build_agent_files.js` now writes,
  from the `PROJECTS` array: a static copy of the rows, schema.org JSON-LD, `llms.txt`,
  `sitemap.xml` and `robots.txt`. `PUSH-TO-GITHUB.bat` runs it before each push.
- **Each project has a `keywords` list**, published in JSON-LD and `llms.txt`, not on the card.
- **Tests:** descriptions are 200 characters or fewer; each project has three or more keywords; every
  generated file matches `PROJECTS` (CI fails when one is stale); Event Desks publishes its site link
  only.

### Fixed
- **The test suite passes again.** It required all five document slots on Event Desks, which
  declares only `open` by design, so it failed 3 checks. It now checks the slots a project declares.

### Record
- **Measured.** No portfolio figure changed. Card text no longer repeats project figures (for
  example CHOMP's response time); those figures stay in each project's white paper.
- **Basis.** unchanged
- **Supersedes.** Nothing.
- **Owed to the next major.** The technical documentation must describe `build/build_agent_files.js`
  and the agent-readable files. The white paper and deck must use the new short descriptions and
  list Fourth Down Engine (carried from 1.8.2).

## [1.8.3] — 2026-10-08

### Added
- **Fourth Down Engine** is listed on the site, with links to the live app
  (https://willhoop.github.io/fourth-down/), its white paper, deck, technical
  documentation and source.

### Record
- **Measured.** No portfolio figure changed.
- **Basis.** unchanged
- **Supersedes.** Nothing.
- **Owed to the next major.** The portfolio white paper and deck do not yet
  describe Fourth Down Engine (carried from 1.8.2).

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
