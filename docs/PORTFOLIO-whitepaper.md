# A Portfolio as an Index, Not a Brochure

### Design and verification of the project index

**Version 1.11 · Last updated 2026-10-22**
**Will Hooper**

> Living document. Updated in the same pass as any change to the site.

## Abstract

This paper describes the portfolio site: what it is for, the one data structure it is built
on, the layout rule that makes it verifiable, the scripted previews on each card, the checks that
hold every card to its project, the audit of 2026-10-22, and what it does not attempt.

## 1. Purpose

The site answers one question for a stranger: *what has this person built, and is the claim
credible?* It is therefore an index, not a sales page. Every row leads to primary evidence —
the running application, the white paper, the validation report, the source — because the
argument the site makes is that the work is checkable, and a site that asserts quality without
linking to evidence contradicts its own thesis.

## 2. The data structure

Everything renders from one array. A project is an object with a name, a status, a version, a
preview, a short description, a list of search keywords, and a `docs` map keyed by a fixed set of
slots:

```
SLOTS = ["open", "paper", "deck", "docs", "source"]
```

Adding a project is appending one object and running one generator (section 5). No HTML is
written by hand.

The description is one or two plain sentences about the whole project, capped at 200
characters by a test. Figures do not appear on the card. They belong in each project's own
white paper, where a validation report backs them. This is the same principle applied across the other projects: anything that changes
lives in exactly one place.

The version is the newest release in the project's own live changelog, as a whole string. It is
not typed from memory: `build/check_projects.py` fails when the two differ (section 7). The site
lists seven projects; six are live.

## 3. The layout rule, and why it is a rule

**Every project renders the same five document slots in the same order.** A document that does
not exist yet is rendered dimmed rather than omitted.

Omitting it would be easier and would look tidier. It is rejected for two reasons. First,
variable-length link lists do not align down the page, which was the original visual defect —
lists of four and five items wrapped differently and the column looked ragged. Second, and
more importantly, **a gap you can see is better than a gap you cannot.** A missing white paper
is a fact about the project. Hiding it makes the page prettier and the reader less informed.

This rule also makes the standard enforceable, which section 7 covers.

## 4. Document links and the drift problem

A project with its own repository has its documents linked at that repository, not copied into
this one. Copies require re-copying on every update, and in practice they drift. The cost is
that the links leave the site; the benefit is that they cannot go stale.

Each external repository is referenced through a single constant, so moving a repository is
one edit.

## 5. Readable by agents

The page draws its rows with JavaScript. Search crawlers and AI agents often read the raw HTML
without running scripts. Before version 1.8.4 such a reader saw no projects at all.

`build/build_agent_files.js` runs the page's own script against a stub document and writes,
from the same array:

| Output | For |
|---|---|
| Static rows inside `index.html` | Any reader that does not run JavaScript |
| schema.org JSON-LD inside `index.html` | Search engines: name, description, keywords, links per project [3] |
| `llms.txt` | Language-model agents, in the llms.txt format [4] |
| `sitemap.xml`, `robots.txt` | Crawlers [5] |

The static rows come from the same render function the browser uses, so the two cannot
differ. Keywords appear in the JSON-LD and `llms.txt` only. They are not shown on the card,
because the tag chips they would become were removed deliberately (Technical documentation,
Part 4).

## 6. Previews

### 6.1 Goal

A visitor decides whether to read a card before reading it. Each card therefore opens with a
3-second, silent, looping clip of the app doing the one thing that explains it. The design goal
is that a visitor understands each project with the sound off in under two seconds. **That goal
is not measured** (section 9).

### 6.2 Method

Each clip is recorded by `build/record_previews.js` from a scripted scene in
`build/preview_scenes.js`. No clip is made by hand.

1. Chrome opens the app at 1280 × 800. The scene's `prepare` step brings it to its starting
   state. That part is not captured.
2. The DevTools screencast [6] captures every painted frame, with its paint time, while the
   scene's `act` step runs and for 1.5 s after it settles.
3. **Dead time is cut, nothing else.** A gap longer than 0.35 s between two painted frames
   counts as 0.35 s. Inside such a gap the page drew nothing, so nothing is dropped and nothing
   is added. Jeopardy's Final Jeopardy solve freezes the page for about 2 s and is shown in
   0.35 s.
4. **One scene is sped up.** ABRA's real 400-game playout takes about 4.1 s while its
   background keeps animating, so the page is not frozen and rule 3 does not apply. The ABRA
   clip plays at 1.6× and the manifest records the speed.
5. The frames are resampled to 15 per second over 3.3 s. The last 0.3 s fades into the first
   0.3 s, so the 3.0 s loop has no jump.
6. ffmpeg [7] writes a VP9 `.webm`, an H.264 `.mp4` for Safari, and a `.jpg` poster taken at
   2.6 s, the last frame before the fade. `manifest.json` records each file's size and SHA-256.

The page shows the poster at once and loads the video only when the card is 40 % on screen. A
visitor who asks for reduced motion [8] sees the poster only.

Two scenes do not record the public app:

- **Guardian Chess** is recorded from the app run locally from its own folder, because its host
  did not answer (section 8).
- **CHOMP** has no page of its own: it runs inside ABRA at team preview. Its clip draws one real
  solve, `data/chomp-preview-solve.json`, produced by the command in CHOMP's technical
  documentation (Part 1.2) on ABRA commit `b8de8517`, release `eaa5becc54eb`. The page draws the
  numbers; it authors none.

### 6.3 What the clips cost

Sizes in KB (1 KB = 1,024 bytes), read from `assets/previews/manifest.json`. Each clip is 3.0 s, 528 × 330, 15 frames per second, no audio.

| Clip | Speed | WebM | MP4 | Poster | Recorded |
|---|---|---|---|---|---|
| chomp | 1× | 16 | 17 | 17 | 2026-10-22 |
| jeopardy-wagering | 1× | 34 | 48 | 20 | 2026-10-22 |
| fourth-down | 1× | 20 | 21 | 15 | 2026-10-22 |
| abra | 1.6× | 82 | 57 | 34 | 2026-10-22 |
| guardian-chess | 1× | 18 | 21 | 23 | 2026-10-22 |
| event-desks | 1× | 42 | 41 | 24 | 2026-10-22 |
| hoopadex | 1× | 30 | 28 | 6 | 2026-10-22 |
| **All seven** | | **242** | **233** | **140** | |

A browser downloads one of the two video formats, not both. A visitor who scrolls past every card therefore adds about 381 KB (WebM and posters) to the page; one who never scrolls adds only the posters of the cards on screen. The test limits are 400 KB per clip and 2.5 MB for all seven together. Measured in Chrome with an empty cache at 375 px, as encoded bytes (DevTools network events):

| Version | First view | Every card scrolled into view | Of which fonts |
|---|---|---|---|
| 1.9.9, before previews | 175 KB | 169 KB | 160 KB |
| 1.10.0 | 151 KB (fonts not yet loaded) | 556 KB | 160 KB |
| 1.11.0 | 263 KB | 514 KB | 88 KB |

The 1.11.0 row was measured on a local static server, whose HTML is not compressed (40 KB
against 9 KB from GitHub Pages), so the live figures are about 31 KB lower. "First view" counts
what loads before the network is idle, so it includes the clips that start playing on screen and
varies with timing; the scrolled figure is the stable one. The previews add about 345 KB to a
visit that scrolls past every card.

## 7. Verification

Four test files, all run by CI on every push and pull request.

`tests/test-projects.js` reads the project array out of the shipped `index.html` rather than
copying it. It asserts the layout rules of section 3, that every generated file of section 5
matches the array, and the fixes of section 8: every text colour reaches 4.5:1 [9]; the list
sits in a `<main>` landmark; the favicon and social image exist; the meta description is 70 to
160 characters; every card shows its status and version; "Updated" equals the newest changelog
date; no changelog version repeats except the recorded 1.9.7 pair; every relative link on every
page resolves; each clip matches its manifest hash, runs 3 s [10] and stays inside the size
limits.

`tests/test_check_cards.py` tests the new checks of `build/check_projects.py` against fake
project folders and a local HTTP server. `tests/test_check_projects.py` tests the artefact tiers.
`tests/test-publish-gate.js` tests the publish gate.

`build/check_projects.py` is the pre-publish audit. It prints five tables: the artefacts of every
project folder; each project's changelog against its document stamp; **each card's version
against its project's live changelog**; **every URL the site publishes, which must return 200**;
and **the cards on the live page against the local file**, which is how the three places of the
project rule (local, GitHub, live) are checked to agree. It exits non-zero on any gap.

It exists because of observed failures. HoopaDex once shipped without a white paper or a deck,
and nothing caught it. On 2026-10-22 three card versions were wrong and an app was down, and
every existing check passed.

## 8. The audit of 2026-10-22

The site was reviewed for broken links, dead apps, version drift, phone layout, page weight,
accessibility and search basics. Every finding below was fixed in version 1.10.0 unless the
first column says otherwise, and each fix has a test.

| Finding | Measured | Fix |
|---|---|---|
| Card versions disagreed with the projects' changelogs | ABRA showed v2.3.0, a version its live Reg M-C line does not have (it is at 1.78.2). HoopaDex v5.55 against 5.61. Fourth Down v1.3.0 against 1.4.0 | Cards carry `version`, checked against the live changelog |
| Status and version were never shown | Both were in the data; the renderer drew neither | Shown on every card |
| A dead app | `guardian-chess.onrender.com` returned no bytes to three requests of up to 150 s | Card set to Offline; live projects 7 → 6 |
| Broken links | 26 of 64 relative links in the rendered documents pointed at `.md` files that were never published | Repaired on every render by `build/doc_links.py` |
| Contrast below WCAG AA [9] | `--faint` text 2.68:1 on the page; `--mute` 4.54:1 | 4.75:1 and 6.14:1 |
| Missing search and share basics | No favicon (a 404 on every view), no social image, no `<main>`; meta description 221 characters | Added; description 149 characters |
| "Updated" was the visitor's clock | It printed the current year | Prints the release date |
| A repeated changelog version | Two releases published as 1.9.7 | Kept as published; a test refuses any other repeat |
| Phone layout at 375 px | No element wider than the viewport | No change needed |
| Keyboard | Tab order follows reading order; every link shows a focus ring | Document links gained an explicit focus ring |
| Page weight | 175 KB at 375 px with an empty cache; web fonts 160 KB of it | Fonts 88 KB without the optical-size axis (1.11.0). Removing the unused italic (1.10.0) saved nothing: browsers skip unused faces. Section 6.3 |
| Not fixed: Event Desks | Its white paper is stamped 1.6.0 against its changelog 1.8.0 | Outside this repository; the checker still fails on it |
| Not fixed: four `apps/` demos | Served, working, linked from nowhere | Left as they are |

## 9. Limitations

1. **The preview goal is not measured.** No visitor study was run, so nothing here shows that a
   clip makes a project understood in under two seconds, or faster than the description alone.
2. **Clips are a snapshot.** Each shows the app on the day it was recorded. Nothing re-records a
   clip when an app changes; a scene whose selectors break fails loudly the next time it runs.
3. **Two clips are not plain real-time recordings of the public app**: ABRA plays at 1.6×, and
   Jeopardy's frozen 2 s is cut to 0.35 s (section 6.2). Guardian Chess is recorded locally.
4. **The live checks run when someone runs them.** Nothing watches the links on a schedule, and
   CI cannot run `check_projects.py`, because CI checks out only this repository.
5. **The checker treats a slow host as dead after two tries** (30 s, then 90 s). A host that takes
   longer to wake is reported as down.
6. Nothing measures whether agents or search engines actually use the generated files of
   section 5.

## 10. References

1. Diátaxis documentation framework. <https://diataxis.fr/>
2. ASD-STE100 Simplified Technical English specification.
3. Schema.org vocabulary, `SoftwareApplication` and `ItemList`. <https://schema.org/>
4. The /llms.txt file proposal. <https://llmstxt.org/>
5. Sitemaps XML format. <https://www.sitemaps.org/protocol.html>
6. Chrome DevTools Protocol, `Page.startScreencast`. <https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-startScreencast>
7. FFmpeg documentation, filters `xfade` and `scale`. <https://ffmpeg.org/ffmpeg-filters.html>
8. W3C, Media Queries Level 5, `prefers-reduced-motion`. <https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion>
9. W3C, WCAG 2.2, Success Criterion 1.4.3 Contrast (Minimum), and the relative-luminance definition. <https://www.w3.org/TR/WCAG22/#contrast-minimum>
10. ISO/IEC 14496-12, ISO base media file format, section 8.2.2 (Movie Header Box).
