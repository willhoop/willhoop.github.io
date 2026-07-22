# Deployment — Portfolio

**Version 1.0 · Last updated 2026-07-22**
Written in ASD-STE100 Simplified Technical English.

## 1. What this site is
The site is one static HTML file. It has no build step and no dependencies. Any static host can
serve it.

## 2. How to publish with GitHub Pages
1. Create a repository. Use the name `<username>.github.io` for the root domain.
2. Copy `index.html` into the repository.
3. Commit the file. Push it.
4. Open the repository settings. Open the Pages section.
5. Set the source to the `main` branch and the root folder.
6. Wait for the deployment. The site is then public.

## 3. How to publish with Cloudflare Pages
1. Push the repository to GitHub.
2. Create a new Pages project in Cloudflare. Connect the repository.
3. Leave the build command empty. Set the output directory to the repository root.
4. Deploy.

## 4. How to add a custom domain
1. Buy the domain.
2. Add the domain in the host's settings.
3. Create the DNS records that the host shows you.
4. Wait for the certificate. The host issues it automatically.

## 5. Important — document links
The project cards use relative links such as `../Pokemon/CHOMP/docs/CHOMP-whitepaper.md`. These
links work on your computer. They do **not** work on a public host unless you publish those files
too.

Choose one of these options before you publish:
- **Option A.** Publish each project as its own public repository. Change the links to the
  repository URLs.
- **Option B.** Publish everything in one repository. Keep the relative links.
- **Option C.** Publish the site only. Remove the document links from the cards.

Do not publish with broken links. Check every link after the first deployment.

### What this site does now
This site uses **Option A** for any project that has its own repository.

| Project | Documents are served from |
|---|---|
| CHOMP | Local rendered HTML in `docs/CHOMP/`. Move to a repository URL when published. |
| HoopaDex | The published site and repository, `willhoop/hoopadex`. |
| Event Desks | The repository `willhoop/event-desk`, through the `EVENTDESK` constant. |

To move a project to Option A, put its repository base URL in one constant at the top of the
script block, then build each document link from that constant. Do not write full URLs into each
link. One constant keeps a repository move to one edit.

### Warning — do not publish into `willhoop/event-desk`
The root `index.html` of that repository **is** the live site at elitefourcapital.com. If you push
this portfolio into that repository root, you replace the live site and it goes down. Publish this
portfolio to its own repository.

## 6. Live demos
Two files run in the browser with no server:
- `CHOMP/app/chomp-replay-app.html`
- `CHOMP/app/calc/champions-damage-lab.html`

Copy them next to `index.html` to serve them as demos. The replay analyzer reads a public API. It
sends no personal data.
