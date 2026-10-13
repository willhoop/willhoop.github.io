# A Portfolio as an Index, Not a Brochure

### Design and verification of the project index

**Version 1.9 · Last updated 2026-10-13**
**Will Hooper**

> Living document. Updated in the same pass as any change to the site.

## Abstract

This paper describes the portfolio site: what it is for, the one data structure it is built
on, the layout rule that makes it verifiable, and what it does not attempt.

## 1. Purpose

The site answers one question for a stranger: *what has this person built, and is the claim
credible?* It is therefore an index, not a sales page. Every row leads to primary evidence —
the running application, the white paper, the validation report, the source — because the
argument the site makes is that the work is checkable, and a site that asserts quality without
linking to evidence contradicts its own thesis.

## 2. The data structure

Everything renders from one array. A project is an object with a name, a status, a short
description, a list of search keywords, and a `docs` map keyed by a fixed set of slots:

```
SLOTS = ["open", "paper", "deck", "docs", "source"]
```

Adding a project is appending one object and running one generator (section 5). No HTML is
written by hand.

The description is one or two plain sentences about the whole project, capped at 200
characters by a test. Figures do not appear on the card. They belong in each project's own
white paper, where a validation report backs them. This is the same principle applied across the other projects: anything that changes
lives in exactly one place.

## 3. The layout rule, and why it is a rule

**Every project renders the same five document slots in the same order.** A document that does
not exist yet is rendered dimmed rather than omitted.

Omitting it would be easier and would look tidier. It is rejected for two reasons. First,
variable-length link lists do not align down the page, which was the original visual defect —
lists of four and five items wrapped differently and the column looked ragged. Second, and
more importantly, **a gap you can see is better than a gap you cannot.** A missing white paper
is a fact about the project. Hiding it makes the page prettier and the reader less informed.

This rule also makes the standard enforceable, which section 6 covers.

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

## 6. Verification

Two scripts.

`tests/test-projects.js` (77 assertions with the current seven projects) reads the project
array out of the shipped `index.html` rather than copying it, and asserts that every project
defines every slot it declares, that no link renders `undefined`, that every link column has
the rows its project declares, that every title is a link, that the removed chrome — card
boxes, tag chips — stays removed, that each description is 200 characters or fewer with at
least three keywords, and that every generated file in section 5 matches the array. A stale
generated file fails the suite, and CI runs the suite on every push.

`build/check_projects.py` audits every project folder on disk for the seven required
artefacts: white paper, deck, technical documentation, README, changelog, agent notes, tests.
It exits non-zero on any gap.

The second script exists because of an observed failure: HoopaDex shipped without a white
paper or a deck, and nothing caught it. The standard was written down but not enforced, so it
was followed unevenly. The audit converts the standard from a stated intention into a check
that fails.

## 7. Limitations

1. No automated rendering check. The layout is verified by reasoning about the CSS and by
   inspection, not by a headless browser.
2. Link targets are verified by hand at publish time, not on a schedule. A repository rename
   would break links silently.
3. Project descriptions and statuses are written by hand and can fall behind the project. In
   October 2026 two statuses were found stale (HoopaDex v1.93 against a live v5.54, Fourth Down
   v1.1.0 against a live v1.2.5). CI checks out only this repository, so it cannot read another
   project's version stamp.
4. Nothing measures whether agents or search engines actually use the generated files. The
   files follow published formats; their effect on discovery is not measured.

## 8. References

1. Diátaxis documentation framework. <https://diataxis.fr/>
2. ASD-STE100 Simplified Technical English specification.
3. Schema.org vocabulary, `SoftwareApplication` and `ItemList`. <https://schema.org/>
4. The /llms.txt file proposal. <https://llmstxt.org/>
5. Sitemaps XML format. <https://www.sitemaps.org/protocol.html>
