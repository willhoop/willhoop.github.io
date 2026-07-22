# CHANGELOG — portfolio
Newest first.

## 2026-07-22
- Created the site. Single static file, no dependencies, no build step.
- Added project cards for CHOMP, HoopaDex, and Political forecasting.
- Added a "How these are built" section describing the documentation and testing standard.

## 2026-07-22 — v1.2: Event Desks added; document links made host-safe
**Added** the Event Desks prediction-market project. It replaces the "Prediction Market"
placeholder card, which described the same project as undocumented. Two cards for one project would
have been wrong, so the placeholder was replaced and not kept.

**Card order.** Event Desks is placed second, between CHOMP and HoopaDex. The house rule is to rank
by real-world importance. Event Desks is deployed on its own public domain and carries 42 hand-derived
unit tests. CHOMP stays first because it carries a measured validation report. HoopaDex is a
reference utility and moves to third. Order is a judgement, not a fact; change the array to change it.

**Document links (DEPLOYMENT.md §5, Option A).** Event Desks lives in `willhoop/event-desk`, a
separate repository. Its white paper, deck and technical documentation are linked at GitHub through
a single `EVENTDESK` constant, not copied into this repository. Copies would need re-copying on
every update and would drift. All four external links were fetched and confirmed to resolve.

**Defect fixed — horizontal overflow on narrow phones.** The card grid used
`repeat(auto-fit,minmax(330px,1fr))`. The 330px minimum is a floor, not a suggestion, so any
viewport under about 386px overflowed sideways. This was pre-existing and unrelated to Event Desks.
Changed to `minmax(min(330px,100%),1fr)`, which lets a single column shrink below 330px.

## 2026-07-22 — v1.3: cards are clickable; evidence made consistent; chrome removed
- **Whole card is a click target.** The title is an anchor whose `::after` covers the card, so a
  click anywhere opens that project's primary destination. The links keep their own targets on a
  higher layer. Keyboard focus is visible.
- **Evidence made consistent across cards.** All three now report the same kind of number: a count
  of tests, each with hand-derived expected values. CHOMP 36, Event Desks 42, HoopaDex 9.
- **Removed the CHOMP agreement statistic** from the card. 74% agreement over 50 games is a real
  measurement but the sample is too small to headline, and the win-rate result inside it was already
  reported as not statistically significant. The full result stays in `VALIDATION-REPORT.md`, which
  the card still links. Nothing was deleted, only moved off the headline.
- **Removed the tag chips.** They wrapped to two lines and added no information the description did
  not already carry. The `tags` arrays are kept in the data for a future filter.
- **Removed the box around the evidence number.** The number now sits on the card and is larger.
