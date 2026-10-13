# The portfolio — the deck

**Version 1.9 · Last updated 2026-10-13**

> Plain words. The detail is in the [white paper](PORTFOLIO-whitepaper.md).

## Slide 1 — What it is

One page listing everything I've built, with a link to the actual thing and the actual
writing behind it.

## Slide 2 — Who it's for

Someone who doesn't know me and has about thirty seconds.

## Slide 3 — The rule it follows

**It's an index, not an advert.**

It doesn't say the work is good. It links to the work and lets you check.

## Slide 4 — Every project looks identical

Same five links, same order, every time:

**Open · White paper · Slide deck · Technical docs · Source**

## Slide 5 — Missing things stay visible

If a project doesn't have a white paper yet, the link is greyed out — not hidden.

Hiding it would look tidier. It would also be a small lie. A gap you can see is better than
a gap you can't.

## Slide 6 — Adding a project

Add one entry to a list: a name, one or two sentences about it, and the links. Then press the
push button. No HTML.

## Slide 7 — Short on the page, detail in the paper

Each project gets one or two plain sentences. The numbers live in that project's white paper,
where they can be checked.

## Slide 8 — Machines can read it too

Search engines and AI assistants often read a page without running it. So the page also
carries a plain copy of the list, a summary file written for AI (`llms.txt`), and a map of
every page. All of it is generated from the same list, so it can't fall out of date.

## Slide 9 — How it's checked

Two scripts run before publishing:

- one checks the page itself — no broken links, every column the same length, and the
  machine-readable copies match the page
- one checks every project folder actually has all its documents

The second exists because HoopaDex once shipped without a white paper and nothing noticed.
Now something notices.

## Slide 10 — What it can't do

It's a plain static page. It can't check that a link still works next month, and the
descriptions and version labels are written by hand so they can fall behind.

## Slide 11 — Read more

The full detail and the sources are in the [white paper](PORTFOLIO-whitepaper.md).
