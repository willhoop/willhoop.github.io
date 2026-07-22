# Portfolio

A static site that presents each project with its evidence, its written work, and — where the
project runs in a browser — a live demo.

## Add a project
Edit the `PROJECTS` array at the bottom of `index.html`. Append one object. Nothing else changes.

```js
{
  name: "Project name",
  status: "live" | "doc" | "plan",
  statusLabel: "In daily use",
  what: "One paragraph in plain English.",
  evidence: { k: "74%", v: "what that number means, stated honestly" },
  tags: ["Tag", "Tag"],
  links: [ { label: "White paper", href: "../Project/docs/WHITEPAPER.md" } ]
}
```

## Preview locally
Open `index.html` in a browser. No build step and no dependencies.

## Hosting
Static. Deploys unchanged to GitHub Pages or Cloudflare Pages. For public hosting, the relative
document links must point at published copies of those files. See `docs/DEPLOYMENT.md`.
