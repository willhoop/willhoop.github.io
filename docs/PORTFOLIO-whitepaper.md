# A Portfolio as an Index, Not a Brochure

### Design and verification of the project index

**Version 1.0 · Last updated 2026-07-22**
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

Everything renders from one array. A project is an object with a name, a status, two prose
fields, and a `docs` map keyed by a fixed set of slots:

```
SLOTS = ["open", "paper", "deck", "docs", "source"]
```

Adding a project is appending one object. There is no other edit, and no HTML is written by
hand. This is the same principle applied across the other projects: anything that changes
lives in exactly one place.

## 3. The layout rule, and why it is a rule

**Every project renders the same five document slots in the same order.** A document that does
not exist yet is rendered dimmed rather than omitted.

Omitting it would be easier and would look tidier. It is rejected for two reasons. First,
variable-length link lists do not align down the page, which was the original visual defect —
lists of four and five items wrapped differently and the column looked ragged. Second, and
more importantly, **a gap you can see is better than a gap you cannot.** A missing white paper
is a fact about the project. Hiding it makes the page prettier and the reader less informed.

This rule also makes the standard enforceable, which section 5 covers.

## 4. Document links and the drift problem

A project with its own repository has its documents linked at that repository, not copied into
this one. Copies require re-copying on every update, and in practice they drift. The cost is
that the links leave the site; the benefit is that they cannot go stale.

Each external repository is referenced through a single constant, so moving a repository is
one edit.

## 5. Verification

Two scripts.

`tests/test-projects.js` (22 assertions) reads the project array out of the shipped
`index.html` rather than copying it, and asserts that every project defines every slot, that
no link renders `undefined`, that every link column has an identical number of rows, that
every title is a link, and that the removed chrome — card boxes, tag chips — stays removed.

`build/check_projects.py` audits every project folder on disk for the seven required
artefacts: white paper, deck, technical documentation, README, changelog, agent notes, tests.
It exits non-zero on any gap.

The second script exists because of an observed failure: HoopaDex shipped without a white
paper or a deck, and nothing caught it. The standard was written down but not enforced, so it
was followed unevenly. The audit converts the standard from a stated intention into a check
that fails.

## 6. Limitations

1. No automated rendering check. The layout is verified by reasoning about the CSS and by
   inspection, not by a headless browser.
2. Link targets are verified by hand at publish time, not on a schedule. A repository rename
   would break links silently.
3. The site is static. Project descriptions are written prose and can fall behind the project.

## 7. References

1. Diátaxis documentation framework. <https://diataxis.fr/>
2. ASD-STE100 Simplified Technical English specification.
