# Deployment — Portfolio

**Version 1.10 · Last updated 2026-10-22**
Written in ASD-STE100 Simplified Technical English.

## 1. What this site is
The site is one static HTML file with its assets (`assets/`) and rendered documents (`docs/`). It
has no runtime dependencies. Any static host can serve it. GitHub Pages serves it from
`willhoop/willhoop.github.io`, branch `main`, root folder.

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

## 5. Document links
Each card links to published documents only. A project with its own public repository links to
that repository. CHOMP and HoopaDex link to rendered HTML copies in `docs/`, made by
`build/build_docs.py`. Event Desks is private: its card links to the live site only
(`slots: ["open"]`).

`build/doc_links.py` repairs the links inside the rendered copies. A link to a page in the same
folder goes to that page. Another link goes to the file in the project's repository.
`tests/test-projects.js` fails if any relative link on the site does not resolve.

## 6. Check the live site
1. Push to `main`. GitHub Pages deploys in about one minute.
2. Run `python build/check_projects.py`. It requests every published URL and fails on any
   status that is not 200. It also compares each card on the live page with `index.html`, and
   reports `NOT DEPLOYED` until the live page matches.
