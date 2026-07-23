# Changelog — portfolio

All notable changes to the portfolio site are recorded here, newest first.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Rule.** Every change is logged here in the same pass as the code, together with the matching
updates to the white paper, the deck, and the technical documentation. A prior conclusion is never
silently rewritten; what changed and why is stated.

---

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
