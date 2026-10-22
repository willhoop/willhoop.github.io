# The portfolio — the deck

**Version 1.10 · Last updated 2026-10-22**

> Plain words. The detail is in the [white paper](PORTFOLIO-whitepaper.md).

## Slide 1 — What it is

One page listing everything I've built, with a link to the actual thing and the actual
writing behind it.

## Slide 2 — Who it's for

Someone who doesn't know me and has about thirty seconds.

## Slide 3 — The rule it follows

**It's an index, not an advert.**

It doesn't say the work is good. It links to the work and lets you check.

## Slide 4 — See it before you read it

Every project has a three-second clip of the app doing its main job: the Pokémon AI playing out
a battle, the fourth-down engine making a call, the Jeopardy trainer picking a bet. No sound, and
it loops. You can tell what each project is before reading a word.

The clips are recorded by a script, not by hand, so they stay true to the current app.

## Slide 5 — Every project looks identical

Same five links, same order, every time:

**Open · White paper · Slide deck · Technical docs · Source**

## Slide 6 — Missing things stay visible

If a project doesn't have a white paper yet, the link is greyed out — not hidden.

Hiding it would look tidier. It would also be a small lie. A gap you can see is better than
a gap you can't.

The same goes for a project that's down: its card says "Offline" instead of pretending.

## Slide 7 — Adding a project

Add one entry to a list: a name, one or two sentences about it, its version, and the links.
Record its clip with one command. No HTML.

## Slide 8 — Short on the page, detail in the paper

Each project gets one or two plain sentences. The numbers live in that project's white paper,
where they can be checked.

## Slide 9 — Machines can read it too

Search engines and AI assistants often read a page without running it. So the page also
carries a plain copy of the list, a summary file written for AI (`llms.txt`), and a map of
every page. All of it is generated from the same list, so it can't fall out of date.

## Slide 10 — How it's checked

Before publishing, a script now checks:

- every project folder has all its documents
- every card's version matches that project's own change log
- every link on the site actually opens
- the live site shows the same cards as the files on my machine

It found real problems the first time it ran: three cards showed the wrong version, one app
was down, and 26 links inside the documents went nowhere. All fixed.

## Slide 11 — What it can't do

It only checks when someone runs it — nothing watches the links overnight. And nobody has
measured whether the clips actually help a visitor understand faster; that's the goal, not a
result.

## Slide 12 — Read more

The full detail and the sources are in the [white paper](PORTFOLIO-whitepaper.md).
